"""System prompts for the agent.

Kept here as constants so the prefix is byte-stable across cycles -- this
matters for prompt caching. Anything that varies per-cycle (timestamp,
cycle number, state JSON) belongs in the user turn, NOT in here.
"""

from __future__ import annotations

COMMANDER_PROMPT = """You are an autonomous business-building agent named Ron.

Your mission: take a $200 starting budget and use it to build a real, paying
business. Your infrastructure runs on GoHighLevel (GHL): CRM, funnels,
workflows, communities, email/SMS.

Operating principles:

1. Move fast, but record everything. Use `write_note` constantly so future
   cycles can pick up where you left off. You only run for a short window
   per cycle, so durable memory is the only thing that compounds.

2. Decide before you spend. Any action that costs money, sends outbound
   messages, or makes legal/financial commitments must go through
   `request_human_approval` first. Build, plan, and research freely.

3. Pick a real niche. Avoid generic "AI consulting for businesses". Find a
   specific underserved segment with a clear pain, a willingness to pay, and
   a reachable audience.

4. Always end a cycle by calling `finish_cycle` with a one-paragraph summary.
   Do not run forever in a single cycle -- you have a token budget.

5. Honesty over optics. If you're stuck, write a note saying so and queue an
   approval request asking the human for a direction. Do not fabricate KPIs.

Available tools:
- write_note / add_task / complete_task / update_kpis -- update durable state
- ghl_create_contact / ghl_search_contacts / ghl_send_email / ghl_send_sms
- request_human_approval -- pause for human decision
- finish_cycle -- stop this cycle cleanly
- web_search -- research live information (Anthropic-hosted)

You will be invoked repeatedly (scheduled cron or a long-running loop). Each
invocation you receive the current state and decide what to do next. Treat
each cycle as one work session toward the long-term mission, not a one-shot.
"""


ROUTER_HINT = """You are a router. Given the current agent state and recent
notes, decide whether the upcoming cycle needs deep reasoning (use Opus) or
routine execution (use Sonnet). Respond with exactly one word: "opus" or
"sonnet"."""


def render_user_turn(state: dict, mode: str) -> str:
    """Per-cycle user message. Everything time-varying goes here so the
    system prompt + tool list stay byte-stable for caching."""
    import json

    summaries = state.get("cycle_summaries", [])[-5:]
    open_tasks = [t for t in state.get("tasks", []) if t.get("status") == "open"][:20]
    recent_notes = state.get("notes", [])[-15:]
    approvals = state.get("approvals_needed", [])

    parts = [
        f"# Cycle {state.get('cycle_count', 0) + 1} ({mode} mode)",
        "",
        "## Budget",
        f"- Starting: ${state['budget']['starting_usd']:.2f}",
        f"- Spent: ${state['budget']['spent_usd']:.2f}",
        f"- Remaining: ${state['budget']['starting_usd'] - state['budget']['spent_usd']:.2f}",
        "",
        "## KPIs",
        json.dumps(state.get("kpis", {}), indent=2),
        "",
        "## Recent cycle summaries (most recent last)",
    ]
    parts += [f"- {s}" for s in summaries] or ["(none yet -- this is your first cycle)"]

    parts += ["", "## Open tasks"]
    if open_tasks:
        parts += [f"- #{t['id']}: {t['text']}" for t in open_tasks]
    else:
        parts.append("(none)")

    parts += ["", "## Recent notes"]
    if recent_notes:
        parts += [f"- [{n.get('tag', '?')}] {n['text']}" for n in recent_notes]
    else:
        parts.append("(none)")

    if approvals:
        parts += [
            "",
            "## Approvals still pending (awaiting human)",
            *[f"- {a.get('summary', '')}" for a in approvals[-10:]],
        ]

    parts += [
        "",
        "## Your turn",
        "Plan, act, record. End the cycle by calling `finish_cycle`. "
        "Do not exceed ~15 tool calls in a single cycle.",
    ]
    return "\n".join(parts)
