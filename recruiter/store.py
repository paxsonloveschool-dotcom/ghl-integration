"""Recruiter state persistence.

Same shape as agent.memory but namespaced under state/recruiter/ so the
two agents never clobber each other. The GitHub Actions workflow commits
this directory back to the branch after every cycle, which doubles as the
audit trail of every candidate touch.
"""

from __future__ import annotations

import json
import os
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

STATE_DIR = Path(os.environ.get("RECRUITER_STATE_DIR", "state/recruiter"))
STATE_FILE = STATE_DIR / "candidates.json"
JOURNAL_FILE = STATE_DIR / "journal.jsonl"
OUTBOX_FILE = STATE_DIR / "outbox.json"


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


def _default_state() -> dict[str, Any]:
    return {
        "version": 1,
        "created_at": _now(),
        "cycle_count": 0,
        "candidates": {},
        "processed_message_ids": [],
        "sends_by_day": {},
        "last_cycle": None,
    }


def load() -> dict[str, Any]:
    STATE_DIR.mkdir(parents=True, exist_ok=True)
    if not STATE_FILE.exists():
        state = _default_state()
        save(state)
        return state
    with STATE_FILE.open() as f:
        return json.load(f)


def save(state: dict[str, Any]) -> None:
    STATE_DIR.mkdir(parents=True, exist_ok=True)
    state["last_cycle"] = _now()
    # Keep the processed-id ring bounded so the file stays small forever.
    state["processed_message_ids"] = state.get("processed_message_ids", [])[-2000:]
    tmp = STATE_FILE.with_suffix(".json.tmp")
    with tmp.open("w") as f:
        json.dump(state, f, indent=2, sort_keys=True)
    tmp.replace(STATE_FILE)


def journal(entry: dict[str, Any]) -> None:
    STATE_DIR.mkdir(parents=True, exist_ok=True)
    entry = {"ts": _now(), **entry}
    with JOURNAL_FILE.open("a") as f:
        f.write(json.dumps(entry, sort_keys=True) + "\n")


# --- Candidates ---------------------------------------------------------------


def upsert_candidate(state: dict[str, Any], key: str, **fields: Any) -> dict[str, Any]:
    """Create or update a candidate record keyed by lowercase email/relay address."""
    candidates = state.setdefault("candidates", {})
    rec = candidates.get(key)
    if rec is None:
        rec = {
            "key": key,
            "status": "new",
            "bot_replies": 0,
            "history": [],
            "created_at": _now(),
        }
        candidates[key] = rec
    for k, v in fields.items():
        if v:
            rec[k] = v
    rec["updated_at"] = _now()
    return rec


def add_history(rec: dict[str, Any], direction: str, summary: str) -> None:
    rec.setdefault("history", []).append(
        {"ts": _now(), "direction": direction, "summary": summary[:500]}
    )
    rec["history"] = rec["history"][-30:]


# --- Outbox (drafts awaiting human review when autosend is off) ----------------


def queue_outbox(item: dict[str, Any]) -> None:
    STATE_DIR.mkdir(parents=True, exist_ok=True)
    items = []
    if OUTBOX_FILE.exists():
        with OUTBOX_FILE.open() as f:
            items = json.load(f)
    items.append({"ts": _now(), **item})
    with OUTBOX_FILE.open("w") as f:
        json.dump(items, f, indent=2)


# --- Daily send cap -------------------------------------------------------------


def sends_today(state: dict[str, Any]) -> int:
    day = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    return state.get("sends_by_day", {}).get(day, 0)


def record_send(state: dict[str, Any]) -> None:
    day = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    by_day = state.setdefault("sends_by_day", {})
    by_day[day] = by_day.get(day, 0) + 1
    # Keep only the last 14 days of counters.
    for old in sorted(by_day)[:-14]:
        del by_day[old]
