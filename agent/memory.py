"""Agent state persistence.

Stored as JSON on disk. In GitHub Actions, the workflow commits the file
back to the branch, giving the agent a durable audit log of its decisions.
"""

from __future__ import annotations

import json
import os
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

STATE_DIR = Path(os.environ.get("AGENT_STATE_DIR", "state"))
MEMORY_FILE = STATE_DIR / "memory.json"
JOURNAL_FILE = STATE_DIR / "journal.jsonl"


def _default_state() -> dict[str, Any]:
    return {
        "version": 1,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "cycle_count": 0,
        "budget": {"starting_usd": 200.0, "spent_usd": 0.0},
        "kpis": {"mrr_usd": 0.0, "leads": 0, "customers": 0},
        "notes": [],
        "tasks": [],
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
    """Append a one-line audit record. Append-only; never overwritten."""
    STATE_DIR.mkdir(parents=True, exist_ok=True)
    entry = {"ts": datetime.now(timezone.utc).isoformat(), **entry}
    with JOURNAL_FILE.open("a") as f:
        f.write(json.dumps(entry, sort_keys=True) + "\n")


def add_note(state: dict[str, Any], text: str, tag: str = "general") -> None:
    state.setdefault("notes", []).append(
        {
            "ts": datetime.now(timezone.utc).isoformat(),
            "tag": tag,
            "text": text,
        }
    )
    # keep last 200 notes to stay cache-friendly
    state["notes"] = state["notes"][-200:]


def add_task(state: dict[str, Any], text: str) -> None:
    state.setdefault("tasks", []).append(
        {
            "id": len(state.get("tasks", [])) + 1,
            "text": text,
            "status": "open",
            "created_at": datetime.now(timezone.utc).isoformat(),
        }
    )


def complete_task(state: dict[str, Any], task_id: int) -> bool:
    for t in state.get("tasks", []):
        if t["id"] == task_id:
            t["status"] = "done"
            t["completed_at"] = datetime.now(timezone.utc).isoformat()
            return True
    return False
