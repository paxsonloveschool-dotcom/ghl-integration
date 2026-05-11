"""The agent's brain: model-routed Anthropic API loop.

Routes between Sonnet 4.6 (fast/cheap default) and Opus 4.7 (hard reasoning,
escalated by a tiny Haiku router or when the agent has been stuck).

Uses prompt caching: the system prompt + tool list are stable across cycles
and marked with cache_control so we pay ~0.1x on the cached prefix every cycle.
"""

from __future__ import annotations

import json
import os
import time
from typing import Any

import anthropic

from . import memory
from .prompts import COMMANDER_PROMPT, ROUTER_HINT, render_user_turn
from .tools import TOOLS, dispatch

OPUS = "claude-opus-4-7"
SONNET = "claude-sonnet-4-6"
HAIKU = "claude-haiku-4-5"

MAX_TOOL_TURNS = 20


def _route(state: dict[str, Any], client: anthropic.Anthropic) -> str:
    """Use Haiku to choose Opus vs Sonnet for this cycle. Cheap and fast.

    Heuristic fallback if Haiku call fails: Opus every 5th cycle, otherwise Sonnet.
    """
    cycle = state.get("cycle_count", 0)

    # First cycle and every 5th: lean Opus -- bigger picture decisions
    forced = (cycle == 0) or (cycle % 5 == 0)

    summary = json.dumps(
        {
            "cycle": cycle,
            "spent": state.get("budget", {}).get("spent_usd", 0),
            "kpis": state.get("kpis", {}),
            "open_tasks": [
                t["text"]
                for t in state.get("tasks", [])
                if t.get("status") == "open"
            ][:10],
            "recent_summaries": state.get("cycle_summaries", [])[-3:],
        },
        indent=2,
    )

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
        memory.journal({"type": "router_error", "error": str(e)})

    return OPUS if forced else SONNET


def run_cycle(state: dict[str, Any], mode: str = "scheduled") -> dict[str, Any]:
    """Run one work cycle. Mutates `state` in place; returns it."""
    if not os.environ.get("ANTHROPIC_API_KEY"):
        raise RuntimeError("ANTHROPIC_API_KEY not set")

    client = anthropic.Anthropic()
    model = _route(state, client)
    memory.journal({"type": "cycle_start", "cycle": state["cycle_count"] + 1, "model": model})

    # System prompt as a cacheable block. Stable across cycles -> cache hit.
    system_blocks = [
        {
            "type": "text",
            "text": COMMANDER_PROMPT,
            "cache_control": {"type": "ephemeral"},
        }
    ]

    # Server-hosted web search tool, alongside our local tools
    tools = TOOLS + [{"type": "web_search_20260209", "name": "web_search"}]

    messages: list[dict[str, Any]] = [
        {"role": "user", "content": render_user_turn(state, mode)}
    ]

    stopped = False
    for turn in range(MAX_TOOL_TURNS):
        resp = client.messages.create(
            model=model,
            max_tokens=8192,
            system=system_blocks,
            tools=tools,
            messages=messages,
        )

        # Track usage
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
            # Server tool (web search) hit iteration cap; just resend to continue.
            continue

        if resp.stop_reason != "tool_use":
            memory.journal({"type": "unexpected_stop", "reason": resp.stop_reason})
            break

        tool_results: list[dict[str, Any]] = []
        finish_signal = False
        for block in resp.content:
            if block.type != "tool_use":
                continue
            if block.name == "web_search":
                # Server-side tool: results come back automatically, skip.
                continue
            out = dispatch(block.name, dict(block.input), state)
            tool_results.append(
                {
                    "type": "tool_result",
                    "tool_use_id": block.id,
                    "content": str(out.get("result", "")),
                    **({"is_error": True} if out.get("is_error") else {}),
                }
            )
            if out.get("stop"):
                finish_signal = True

        if tool_results:
            messages.append({"role": "user", "content": tool_results})

        if finish_signal:
            stopped = True
            break

    if not stopped:
        memory.journal({"type": "cycle_truncated", "max_turns": MAX_TOOL_TURNS})

    state["cycle_count"] = state.get("cycle_count", 0) + 1
    memory.journal(
        {
            "type": "cycle_end",
            "cycle": state["cycle_count"],
            "model": model,
            "usage": state.get("usage", {}),
        }
    )
    return state


def sleep_with_jitter(seconds: int) -> None:
    """Used by forever-mode to sleep between cycles."""
    time.sleep(max(1, seconds))
