"""Tool definitions and dispatch for the real estate agent."""
from __future__ import annotations

import json
import os
from datetime import datetime, timezone
from typing import Any

from .. import memory
from ..ghl import GHLError
from .ghl_re import REGHLClient
from .scorer import score_lead, sort_by_score
from .pipeline import (
    get_current_stage,
    days_since_last_contact,
    is_followup_due,
    get_next_action,
)

RE_TOOLS: list[dict[str, Any]] = [
    {
        "name": "write_note",
        "description": "Save a note to long-term memory. Use constantly to record decisions, actions, and outcomes.",
        "input_schema": {
            "type": "object",
            "properties": {
                "text": {"type": "string"},
                "tag": {"type": "string", "default": "general"},
            },
            "required": ["text"],
        },
    },
    {
        "name": "add_task",
        "description": "Add a task to your backlog for a future cycle.",
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
        "name": "request_human_approval",
        "description": "Gate a high-stakes action on human review before proceeding.",
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
        "name": "finish_cycle",
        "description": "Signal end of work cycle. Call when done or blocked.",
        "input_schema": {
            "type": "object",
            "properties": {"summary": {"type": "string"}},
            "required": ["summary"],
        },
    },
    {
        "name": "re_get_pipeline_status",
        "description": (
            "Get a full overview of the real estate pipeline: all active leads, "
            "their scores, stages, and which ones are due for follow-up. "
            "Call this first at the start of each cycle."
        ),
        "input_schema": {
            "type": "object",
            "properties": {
                "limit": {"type": "integer", "default": 50},
                "stage_filter": {
                    "type": "string",
                    "enum": ["new_lead", "contacted", "engaged", "qualified",
                             "appointment_set", "active_search", "under_contract", "closed", "all"],
                    "default": "all",
                },
            },
        },
    },
    {
        "name": "re_get_leads_due_for_followup",
        "description": "Get all leads that are past their nurture schedule and need a touchpoint now.",
        "input_schema": {
            "type": "object",
            "properties": {"limit": {"type": "integer", "default": 20}},
        },
    },
    {
        "name": "re_score_lead",
        "description": "Score a specific lead and get a recommended next action.",
        "input_schema": {
            "type": "object",
            "properties": {"contact_id": {"type": "string"}},
            "required": ["contact_id"],
        },
    },
    {
        "name": "re_create_lead",
        "description": "Create a new buyer or seller lead in GHL with the correct tags.",
        "input_schema": {
            "type": "object",
            "properties": {
                "first_name": {"type": "string"},
                "last_name": {"type": "string"},
                "email": {"type": "string"},
                "phone": {"type": "string"},
                "lead_type": {"type": "string", "enum": ["buyer", "seller"]},
                "source": {"type": "string"},
                "notes": {"type": "string"},
            },
            "required": ["lead_type"],
        },
    },
    {
        "name": "re_send_nurture_sms",
        "description": "Send a personalized nurture SMS to a lead (keep under 160 chars).",
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
        "name": "re_send_nurture_email",
        "description": "Send a personalized nurture email to a lead.",
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
        "name": "re_advance_stage",
        "description": "Advance a lead to the next pipeline stage by adding the appropriate tag.",
        "input_schema": {
            "type": "object",
            "properties": {
                "contact_id": {"type": "string"},
                "new_stage": {
                    "type": "string",
                    "enum": ["contacted", "engaged", "qualified", "appointment_set",
                             "active_search", "under_contract", "closed"],
                },
                "note": {"type": "string"},
            },
            "required": ["contact_id", "new_stage"],
        },
    },
    {
        "name": "re_get_conversation_history",
        "description": "Get the SMS/email conversation history with a lead.",
        "input_schema": {
            "type": "object",
            "properties": {"contact_id": {"type": "string"}},
            "required": ["contact_id"],
        },
    },
    {
        "name": "re_log_activity",
        "description": "Log an activity (showing, call, meeting) to a contact in GHL.",
        "input_schema": {
            "type": "object",
            "properties": {
                "contact_id": {"type": "string"},
                "activity_type": {
                    "type": "string",
                    "enum": ["showing", "call", "meeting", "email", "sms", "other"],
                },
                "notes": {"type": "string"},
            },
            "required": ["contact_id", "activity_type", "notes"],
        },
    },
    {
        "name": "re_update_pipeline_metrics",
        "description": "Update pipeline metrics in memory (call after counting leads by stage).",
        "input_schema": {
            "type": "object",
            "properties": {
                "new_leads": {"type": "integer"},
                "contacted": {"type": "integer"},
                "engaged": {"type": "integer"},
                "qualified": {"type": "integer"},
                "appointment_set": {"type": "integer"},
                "active_search": {"type": "integer"},
                "under_contract": {"type": "integer"},
                "closed_this_month": {"type": "integer"},
                "total_pipeline_value_usd": {"type": "number"},
            },
        },
    },
]

_STAGE_TAGS = {
    "contacted":       "contacted",
    "engaged":         "engaged",
    "qualified":       "qualified",
    "appointment_set": "appointment-set",
    "active_search":   "active-search",
    "under_contract":  "under-contract",
    "closed":          "closed",
}


def _ghl() -> REGHLClient | None:
    if not os.environ.get("GHL_API_TOKEN"):
        return None
    try:
        return REGHLClient()
    except GHLError:
        return None


def dispatch_re(name: str, args: dict[str, Any], state: dict[str, Any]) -> dict[str, Any]:
    """Public entrypoint. Returns {result, stop?, is_error?}."""
    if name == "write_note":
        memory.add_note(state, args["text"], args.get("tag", "general"))
        return {"result": "note saved"}

    if name == "add_task":
        memory.add_task(state, args["text"])
        return {"result": f"task added (id={len(state['tasks'])})"}

    if name == "complete_task":
        ok = memory.complete_task(state, args["task_id"])
        return {"result": "done" if ok else "no such task"}

    if name == "request_human_approval":
        state.setdefault("approvals_needed", []).append(args)
        memory.journal({"type": "approval_request", **args})
        return {"result": "queued for human review"}

    if name == "finish_cycle":
        state.setdefault("cycle_summaries", []).append(args.get("summary", ""))
        state["cycle_summaries"] = state["cycle_summaries"][-50:]
        return {"result": "cycle finished", "stop": True}

    if name == "re_update_pipeline_metrics":
        state["pipeline_metrics"] = {**state.get("pipeline_metrics", {}), **args}
        return {"result": "pipeline metrics updated"}

    client = _ghl()
    if client is None:
        return _mock_response(name, args)

    try:
        if name == "re_get_pipeline_status":
            return _get_pipeline_status(client, args, state)

        if name == "re_get_leads_due_for_followup":
            return _get_leads_due(client, args)

        if name == "re_score_lead":
            r = client.get_contact(args["contact_id"])
            contact = r.get("contact", r)
            info = score_lead(contact)
            action = get_next_action(contact)
            return {"result": json.dumps({"score_info": info, "next_action": action})}

        if name == "re_create_lead":
            tags = [args["lead_type"], "new_lead"]
            if args.get("source"):
                tags.append(args["source"])
            r = client.create_contact(
                first_name=args.get("first_name", ""),
                last_name=args.get("last_name", ""),
                email=args.get("email", ""),
                phone=args.get("phone", ""),
                tags=tags,
                source=args.get("source", "agent"),
            )
            cid = (r.get("contact") or {}).get("id") or r.get("id", "")
            if args.get("notes") and cid:
                client.create_note(cid, args["notes"])
            memory.journal({"type": "re_lead_created", **{k: v for k, v in args.items() if k != "notes"}})
            return {"result": json.dumps(r)[:1000]}

        if name == "re_send_nurture_sms":
            r = client.send_sms(args["contact_id"], args["message"])
            memory.journal({
                "type": "re_sms_sent",
                "contact_id": args["contact_id"],
                "message_preview": args["message"][:80],
            })
            return {"result": json.dumps(r)[:500]}

        if name == "re_send_nurture_email":
            r = client.send_email(args["contact_id"], args["subject"], args["html"])
            memory.journal({
                "type": "re_email_sent",
                "contact_id": args["contact_id"],
                "subject": args["subject"],
            })
            return {"result": json.dumps(r)[:500]}

        if name == "re_advance_stage":
            stage_tag = _STAGE_TAGS.get(args["new_stage"])
            if not stage_tag:
                return {"result": f"unknown stage: {args['new_stage']}", "is_error": True}
            client.add_tag(args["contact_id"], [stage_tag])
            if args.get("note"):
                client.create_note(
                    args["contact_id"],
                    f"Stage advanced to {args['new_stage']}: {args['note']}",
                )
            memory.journal({
                "type": "re_stage_advanced",
                "contact_id": args["contact_id"],
                "new_stage": args["new_stage"],
            })
            return {"result": f"advanced to {args['new_stage']}"}

        if name == "re_get_conversation_history":
            r = client.get_conversation_by_contact(args["contact_id"])
            conversations = r.get("conversations", [])
            if not conversations:
                return {"result": "no conversation history found"}
            return {"result": json.dumps(conversations[0])[:2000]}

        if name == "re_log_activity":
            body = f"[{args['activity_type'].upper()}] {args['notes']}"
            client.create_note(args["contact_id"], body)
            memory.journal({
                "type": "re_activity_logged",
                "contact_id": args["contact_id"],
                "activity_type": args["activity_type"],
            })
            return {"result": "activity logged"}

    except GHLError as e:
        return {"result": f"GHL error: {e}", "is_error": True}

    return {"result": f"unknown tool: {name}", "is_error": True}


def _get_pipeline_status(
    client: REGHLClient, args: dict[str, Any], state: dict[str, Any]
) -> dict[str, Any]:
    limit = args.get("limit", 50)
    stage_filter = args.get("stage_filter", "all")

    result = client.search_contacts("", limit=limit)
    contacts = result.get("contacts", [])
    scored = sort_by_score(contacts)

    by_stage: dict[str, list[dict]] = {}
    for contact in scored:
        stage = get_current_stage(contact)
        if stage_filter != "all" and stage != stage_filter:
            continue
        by_stage.setdefault(stage, []).append({
            "id": contact.get("id"),
            "name": f"{contact.get('firstName', '')} {contact.get('lastName', '')}".strip(),
            "phone": contact.get("phone", ""),
            "email": contact.get("email", ""),
            "score": contact["_score_info"]["score"],
            "temperature": contact["_score_info"]["temperature"],
            "lead_type": contact["_score_info"]["lead_type"],
            "stage": stage,
            "days_since_contact": days_since_last_contact(contact),
            "followup_due": is_followup_due(contact),
            "next_action": get_next_action(contact),
        })

    summary = {
        "total_leads": len(contacts),
        "by_stage": {k: len(v) for k, v in by_stage.items()},
        "urgent": [
            {
                "id": c.get("id"),
                "name": f"{c.get('firstName', '')} {c.get('lastName', '')}".strip(),
                "score": c["_score_info"]["score"],
                "stage": get_current_stage(c),
            }
            for c in scored if c["_score_info"]["temperature"] == "urgent"
        ][:5],
        "followup_due_count": sum(1 for c in scored if is_followup_due(c)),
        "pipeline": by_stage,
    }

    state["pipeline_metrics"] = {
        "total_leads": summary["total_leads"],
        "by_stage": summary["by_stage"],
        "followup_due": summary["followup_due_count"],
        "last_updated": datetime.now(timezone.utc).isoformat(),
    }

    return {"result": json.dumps(summary, default=str)[:4000]}


def _get_leads_due(client: REGHLClient, args: dict[str, Any]) -> dict[str, Any]:
    limit = args.get("limit", 20)
    result = client.search_contacts("", limit=100)
    contacts = result.get("contacts", [])
    due = [c for c in contacts if is_followup_due(c)]
    scored = sort_by_score(due)[:limit]

    formatted = [
        {
            "id": c.get("id"),
            "name": f"{c.get('firstName', '')} {c.get('lastName', '')}".strip(),
            "phone": c.get("phone", ""),
            "score": c["_score_info"]["score"],
            "temperature": c["_score_info"]["temperature"],
            "stage": get_current_stage(c),
            "days_since_contact": days_since_last_contact(c),
            "next_action": get_next_action(c),
        }
        for c in scored
    ]
    return {"result": json.dumps({"count": len(formatted), "leads": formatted}, default=str)[:3000]}


def _mock_response(name: str, args: dict[str, Any]) -> dict[str, Any]:
    if name == "re_get_pipeline_status":
        mock = {
            "total_leads": 15,
            "by_stage": {
                "new_lead": 3, "contacted": 4, "engaged": 3,
                "qualified": 2, "appointment_set": 1,
                "active_search": 1, "under_contract": 1,
            },
            "urgent": [{"id": "mock-1", "name": "Jane Smith", "score": 82,
                        "temperature": "urgent", "stage": "qualified"}],
            "followup_due_count": 6,
            "note": "GHL credentials not set — mock data. Set GHL_API_TOKEN + GHL_LOCATION_ID in GitHub Secrets.",
        }
        return {"result": json.dumps(mock)}
    return {
        "result": (
            "GHL credentials not configured (GHL_API_TOKEN/GHL_LOCATION_ID). "
            "Set these in GitHub Settings → Secrets and variables → Actions."
        )
    }
