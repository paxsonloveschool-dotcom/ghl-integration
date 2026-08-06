"""Real estate agent brain: model-routed Anthropic API loop."""
from __future__ import annotations

import json
import os
import time
from typing import Any

import anthropic

from .. import memory
from .prompts import RE_AGENT_PROMPT, ROUTER_HINT, render_re_turn
from .tools import RE_TOOLS, dispatch_re

OPUS = "claude-opus-4-7"
SONNET = "claude-sonnet-4-6"
HAIKU = "claude-haiku-4-5-20251001"

MAX_TOOL_TURNS = 25


def _route(state: dict[str, Any], client: anthropic.Anthropic) -> str:
    cycle = state.get("cycle_count", 0)
    forced = (cycle == 0) or (cycle % 5 == 0)
    summary = json.dumps({
        "cycle": cycle,
        "pipeline": state.get("pipeline_metrics", {}),
        "approvals_pending": len(state.get("approvals_needed", [])),
        "open_tasks": len([t for t in state.get("tasks", []) if t.get("status") == "open"]),
    })
    try:
        r = client.messages.create(
            model=HAIKU,
            max_tokens=10,
            system=ROUTER_HINT,
            messages=[{"role": "user", "content": summary}],
        )
        word = "".join(b.text for b in r.content if b.type == "text").strip().lower()
        if "opus" in word:
            return OPUS
        if "sonnet" in word:
            return SONNET
    except Exception as e:
        memory.journal({"type": "re_router_error", "error": str(e)})
    return OPUS if forced else SONNET


def run_re_cycle(state: dict[str, Any], mode: str = "scheduled") -> dict[str, Any]:
    """Run one real estate agent cycle. Mutates state in place; returns it."""
    if not os.environ.get("ANTHROPIC_API_KEY"):
        raise RuntimeError("ANTHROPIC_API_KEY not set")

    client = anthropic.Anthropic()
    model = _route(state, client)
    memory.journal({"type": "re_cycle_start", "cycle": state.get("cycle_count", 0) + 1, "model": model})

    system_blocks = [
        {"type": "text", "text": RE_AGENT_PROMPT, "cache_control": {"type": "ephemeral"}}
    ]
    tools = RE_TOOLS + [{"type": "web_search_20260209", "name": "web_search"}]
    messages: list[dict[str, Any]] = [
        {"role": "user", "content": render_re_turn(state, mode)}
    ]

    stopped = False
    for _turn in range(MAX_TOOL_TURNS):
        resp = client.messages.create(
            model=model,
            max_tokens=8192,
            system=system_blocks,
            tools=tools,
            messages=messages,
        )

        u = resp.usage
        state.setdefault("usage", {"input": 0, "output": 0, "cache_read": 0, "cache_write": 0})
        state["usage"]["input"] += u.input_tokens
        state["usage"]["output"] += u.output_tokens
        state["usage"]["cache_read"] += getattr(u, "cache_read_input_tokens", 0) or 0
        state["usage"]["cache_write"] += getattr(u, "cache_creation_input_tokens", 0) or 0

        messages.append({"role": "assistant", "content": resp.content})

        if resp.stop_reason == "end_turn":
            stopped = True
            break
        if resp.stop_reason == "pause_turn":
            continue
        if resp.stop_reason != "tool_use":
            memory.journal({"type": "re_unexpected_stop", "reason": resp.stop_reason})
            break

        tool_results: list[dict[str, Any]] = []
        finish_signal = False
        for block in resp.content:
            if block.type != "tool_use":
                continue
            if block.name == "web_search":
                continue
            out = dispatch_re(block.name, dict(block.input), state)
            tool_results.append({
                "type": "tool_result",
                "tool_use_id": block.id,
                "content": str(out.get("result", "")),
                **(({"is_error": True}) if out.get("is_error") else {}),
            })
            if out.get("stop"):
                finish_signal = True

        if tool_results:
            messages.append({"role": "user", "content": tool_results})
        if finish_signal:
            stopped = True
            break

    if not stopped:
        memory.journal({"type": "re_cycle_truncated", "max_turns": MAX_TOOL_TURNS})

    state["cycle_count"] = state.get("cycle_count", 0) + 1
    memory.journal({
        "type": "re_cycle_end",
        "cycle": state["cycle_count"],
        "model": model,
        "usage": state.get("usage", {}),
    })
    return state


def sleep_with_jitter(seconds: int) -> None:
    time.sleep(max(1, seconds))
