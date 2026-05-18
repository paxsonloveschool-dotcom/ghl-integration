"""Tool definitions and dispatch for the agent.

The agent's "hands". Each tool gets a JSON schema (for the model) and a
Python handler. Tools that touch external systems (GHL) are gated by
GHL credentials being present; otherwise they no-op and report stub data
so the agent can still reason about its plan.
"""

from __future__ import annotations

import json
import os
from typing import Any, Callable

from . import memory
from .ghl import GHLClient, GHLError


# --- Tool schemas exposed to the model ---------------------------------------

TOOLS: list[dict[str, Any]] = [
    {
        "name": "write_note",
        "description": (
            "Save a short observation, decision, or learning to long-term memory. "
            "Use this constantly to record what you tried, what worked, and what to do next. "
            "Notes persist across cycles."
        ),
        "input_schema": {
            "type": "object",
            "properties": {
                "text": {"type": "string", "description": "The note content"},
                "tag": {
                    "type": "string",
                    "description": "Category: research|decision|outcome|risk|idea|general",
                    "default": "general",
                },
            },
            "required": ["text"],
        },
    },
    {
        "name": "add_task",
        "description": "Add a task to your own backlog for a future cycle.",
        "input_schema": {
            "type": "object",
            "properties": {"text": {"type": "string"}},
            "required": ["text"],
        },
    },
    {
        "name": "complete_task",
        "description": "Mark a task done by id.",
        "input_schema": {
            "type": "object",
            "properties": {"task_id": {"type": "integer"}},
            "required": ["task_id"],
        },
    },
    {
        "name": "update_kpis",
        "description": (
            "Update business KPIs you can measure. Pass only the fields that changed."
        ),
        "input_schema": {
            "type": "object",
            "properties": {
                "mrr_usd": {"type": "number"},
                "leads": {"type": "integer"},
                "customers": {"type": "integer"},
                "spent_usd": {"type": "number"},
            },
        },
    },
    {
        "name": "ghl_create_contact",
        "description": "Create a contact (lead) in GoHighLevel.",
        "input_schema": {
            "type": "object",
            "properties": {
                "first_name": {"type": "string"},
                "last_name": {"type": "string"},
                "email": {"type": "string"},
                "phone": {"type": "string"},
                "tags": {"type": "array", "items": {"type": "string"}},
                "source": {"type": "string"},
            },
            "required": ["email"],
        },
    },
    {
        "name": "ghl_search_contacts",
        "description": "Search contacts in GoHighLevel by name, email, or phone.",
        "input_schema": {
            "type": "object",
            "properties": {
                "query": {"type": "string"},
                "limit": {"type": "integer", "default": 20},
            },
            "required": ["query"],
        },
    },
    {
        "name": "ghl_send_email",
        "description": (
            "Send an email to an existing GHL contact. Use sparingly; outbound "
            "messages have real-world consequences. Get human approval for first batch."
        ),
        "input_schema": {
            "type": "object",
            "properties": {
                "contact_id": {"type": "string"},
                "subject": {"type": "string"},
                "html": {"type": "string"},
            },
            "required": ["contact_id", "subject", "html"],
        },
    },
    {
        "name": "ghl_send_sms",
        "description": (
            "Send an SMS to an existing GHL contact. Requires explicit human approval "
            "before the first outbound batch."
        ),
        "input_schema": {
            "type": "object",
            "properties": {
                "contact_id": {"type": "string"},
                "message": {"type": "string"},
            },
            "required": ["contact_id", "message"],
        },
    },
    {
        "name": "request_human_approval",
        "description": (
            "Pause and request human approval for a high-stakes action you cannot "
            "take autonomously (new spend, first outbound batch, legal/financial decisions). "
            "Written to the approval queue; agent moves on."
        ),
        "input_schema": {
            "type": "object",
            "properties": {
                "summary": {"type": "string"},
                "reason": {"type": "string"},
                "action": {"type": "string"},
            },
            "required": ["summary", "action"],
        },
    },
    {
        "name": "ghl_create_opportunity",
        "description": (
            "Create a sales opportunity (deal) in a GHL pipeline for a contact. "
            "Use this whenever you add a prospect to track them through the sales process."
        ),
        "input_schema": {
            "type": "object",
            "properties": {
                "pipeline_id": {"type": "string", "description": "GHL pipeline ID"},
                "stage_id": {"type": "string", "description": "GHL pipeline stage ID"},
                "name": {"type": "string", "description": "Opportunity name, e.g. 'Riverside Plumbing - Website'"},
                "contact_id": {"type": "string", "description": "GHL contact ID"},
                "monetary_value": {"type": "number", "description": "Expected deal value in USD", "default": 997},
                "status": {"type": "string", "enum": ["open", "won", "lost", "abandoned"], "default": "open"},
            },
            "required": ["pipeline_id", "stage_id", "name", "contact_id"],
        },
    },
    {
        "name": "ghl_list_pipelines",
        "description": "List all sales pipelines and their stages in GHL. Call this once to get pipeline_id and stage_id values for ghl_create_opportunity.",
        "input_schema": {"type": "object", "properties": {}},
    },
    {
        "name": "ghl_list_funnels",
        "description": "List all funnels and websites in GHL for this location.",
        "input_schema": {
            "type": "object",
            "properties": {
                "limit": {"type": "integer", "default": 20},
            },
        },
    },
    {
        "name": "ghl_get_funnel",
        "description": "Get details of a specific GHL funnel/website by ID.",
        "input_schema": {
            "type": "object",
            "properties": {
                "funnel_id": {"type": "string"},
            },
            "required": ["funnel_id"],
        },
    },
    {
        "name": "finish_cycle",
        "description": (
            "Signal that this work cycle is complete. The agent will save state "
            "and exit (scheduled mode) or sleep (forever mode). "
            "Call when you've made meaningful progress or are blocked waiting on humans."
        ),
        "input_schema": {
            "type": "object",
            "properties": {
                "summary": {
                    "type": "string",
                    "description": "1-3 sentence summary of what you did this cycle.",
                }
            },
            "required": ["summary"],
        },
    },
]


# --- Tool handlers -----------------------------------------------------------


def _ghl() -> GHLClient | None:
    if not os.environ.get("GHL_API_TOKEN"):
        return None
    try:
        return GHLClient()
    except GHLError:
        return None


def _handle(name: str, args: dict[str, Any], state: dict[str, Any]) -> dict[str, Any]:
    """Returns {"result": str, "stop": bool}."""

    if name == "write_note":
        memory.add_note(state, args["text"], args.get("tag", "general"))
        return {"result": "note saved"}

    if name == "add_task":
        memory.add_task(state, args["text"])
        return {"result": f"task added (id={len(state['tasks'])})"}

    if name == "complete_task":
        ok = memory.complete_task(state, args["task_id"])
        return {"result": "done" if ok else "no such task"}

    if name == "update_kpis":
        kpis = state.setdefault("kpis", {})
        for k in ("mrr_usd", "leads", "customers"):
            if k in args:
                kpis[k] = args[k]
        if "spent_usd" in args:
            state.setdefault("budget", {})["spent_usd"] = args["spent_usd"]
        return {"result": f"kpis updated: {json.dumps(kpis)}"}

    if name == "request_human_approval":
        state.setdefault("approvals_needed", []).append(args)
        memory.journal({"type": "approval_request", **args})
        return {"result": "queued for human review"}

    if name == "finish_cycle":
        state.setdefault("cycle_summaries", []).append(args.get("summary", ""))
        state["cycle_summaries"] = state["cycle_summaries"][-50:]
        return {"result": "cycle finished", "stop": True}

    # GHL tools
    if name.startswith("ghl_"):
        client = _ghl()
        if client is None:
            return {
                "result": "GHL credentials not configured (GHL_API_TOKEN/GHL_LOCATION_ID). "
                "Action skipped; record the intent as a note instead."
            }
        try:
            if name == "ghl_create_contact":
                r = client.create_contact(**args)
            elif name == "ghl_search_contacts":
                r = client.search_contacts(args["query"], args.get("limit", 20))
            elif name == "ghl_send_email":
                r = client.send_email(args["contact_id"], args["subject"], args["html"])
            elif name == "ghl_send_sms":
                r = client.send_sms(args["contact_id"], args["message"])
            elif name == "ghl_create_opportunity":
                r = client.create_opportunity(
                    pipeline_id=args["pipeline_id"],
                    stage_id=args["stage_id"],
                    name=args["name"],
                    contact_id=args["contact_id"],
                    monetary_value=args.get("monetary_value", 997),
                    status=args.get("status", "open"),
                )
            elif name == "ghl_list_pipelines":
                r = client.list_pipelines()
            elif name == "ghl_list_funnels":
                r = client.list_funnels(limit=args.get("limit", 20))
            elif name == "ghl_get_funnel":
                r = client.get_funnel(args["funnel_id"])
            else:
                return {"result": f"unknown GHL tool: {name}", "is_error": True}
            memory.journal({"type": "ghl_call", "tool": name, "args": args})
            return {"result": json.dumps(r)[:2000]}
        except GHLError as e:
            return {"result": f"GHL error: {e}", "is_error": True}

    return {"result": f"unknown tool: {name}", "is_error": True}


def dispatch(name: str, args: dict[str, Any], state: dict[str, Any]) -> dict[str, Any]:
    """Public entrypoint. Returns dict with `result` (str) and optional `stop`/`is_error`."""
    return _handle(name, args, state)
