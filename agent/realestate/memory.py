"""Real estate agent persistent state (separate from Ron agent state)."""
from __future__ import annotations

import json
import os
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

STATE_DIR = Path(os.environ.get("RE_STATE_DIR", "state"))
MEMORY_FILE = STATE_DIR / "re_memory.json"
JOURNAL_FILE = STATE_DIR / "re_journal.jsonl"


def _default_state() -> dict[str, Any]:
    now = datetime.now(timezone.utc).isoformat()
    return {
        "version": 1,
        "created_at": now,
        "cycle_count": 0,
        "agent_config": {
            "agent_name": os.environ.get("AGENT_NAME", "Alex"),
            "company": os.environ.get("COMPANY_NAME", "Premier Realty"),
            "market": os.environ.get("MARKET_AREA", "your area"),
            "phone": os.environ.get("AGENT_PHONE", ""),
            "avg_above_list": "2.5",
        },
        "pipeline_metrics": {
            "total_leads": 0,
            "by_stage": {},
            "followup_due": 0,
            "last_updated": None,
        },
        "kpis": {
            "leads_added_this_month": 0,
            "messages_sent_this_month": 0,
            "appointments_set_this_month": 0,
            "closings_this_month": 0,
            "total_commission_ytd_usd": 0.0,
        },
        "notes": [],
        "tasks": [
            {"id": 1, "text": "Call re_get_pipeline_status to see all active leads", "status": "open", "created_at": now},
            {"id": 2, "text": "Find all new_lead contacts and send initial SMS + email outreach", "status": "open", "created_at": now},
            {"id": 3, "text": "Call re_get_leads_due_for_followup and action every overdue contact", "status": "open", "created_at": now},
            {"id": 4, "text": "Use web_search to pull current local market stats for value-add messages", "status": "open", "created_at": now},
            {"id": 5, "text": "Log all actions with write_note for the team audit trail", "status": "open", "created_at": now},
        ],
        "approvals_needed": [],
        "cycle_summaries": [],
        "last_cycle": None,
    }


def load() -> dict[str, Any]:
    STATE_DIR.mkdir(parents=True, exist_ok=True)
    if not MEMORY_FILE.exists():
        state = _default_state()
        save(state)
        return state
    with MEMORY_FILE.open() as f:
        return json.load(f)


def save(state: dict[str, Any]) -> None:
    STATE_DIR.mkdir(parents=True, exist_ok=True)
    state["last_cycle"] = datetime.now(timezone.utc).isoformat()
    tmp = MEMORY_FILE.with_suffix(".json.tmp")
    with tmp.open("w") as f:
        json.dump(state, f, indent=2, sort_keys=True)
    tmp.replace(MEMORY_FILE)


def journal(entry: dict[str, Any]) -> None:
    STATE_DIR.mkdir(parents=True, exist_ok=True)
    entry = {"ts": datetime.now(timezone.utc).isoformat(), **entry}
    with JOURNAL_FILE.open("a") as f:
        f.write(json.dumps(entry, sort_keys=True) + "\n")


def add_note(state: dict[str, Any], text: str, tag: str = "general") -> None:
    state.setdefault("notes", []).append({
        "ts": datetime.now(timezone.utc).isoformat(),
        "tag": tag,
        "text": text,
    })
    state["notes"] = state["notes"][-200:]


def add_task(state: dict[str, Any], text: str) -> None:
    state.setdefault("tasks", []).append({
        "id": len(state.get("tasks", [])) + 1,
        "text": text,
        "status": "open",
        "created_at": datetime.now(timezone.utc).isoformat(),
    })


def complete_task(state: dict[str, Any], task_id: int) -> bool:
    for t in state.get("tasks", []):
        if t["id"] == task_id:
            t["status"] = "done"
            t["completed_at"] = datetime.now(timezone.utc).isoformat()
            return True
    return False
