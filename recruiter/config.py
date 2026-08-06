"""Team/brand configuration for the recruiter.

Loaded from teams.yml next to this module (override path with
RECRUITER_TEAMS_FILE). Applications are routed to a team by substring
matching the job title against each team's keywords, first match wins;
a team with no keywords is the catch-all.
"""

from __future__ import annotations

import os
import re
from pathlib import Path
from typing import Any

import yaml

TEAMS_FILE = Path(
    os.environ.get("RECRUITER_TEAMS_FILE", Path(__file__).parent / "teams.yml")
)


def load() -> dict[str, Any]:
    with TEAMS_FILE.open() as f:
        cfg = yaml.safe_load(f)
    cfg.setdefault("brand", {})
    cfg.setdefault("defaults", {})
    cfg.setdefault("teams", [])
    return cfg


def match_team(cfg: dict[str, Any], job_title: str) -> dict[str, Any]:
    """Route a job title to a team. First keyword hit wins (whole-word match,
    so "rn" doesn't fire on "intern"); otherwise the first team with no
    keywords; otherwise a minimal stub."""
    title = (job_title or "").lower()
    catch_all = None
    for team in cfg["teams"]:
        keywords = team.get("keywords") or []
        if not keywords and catch_all is None:
            catch_all = team
        if any(
            re.search(rf"\b{re.escape(k.lower())}\b", title) for k in keywords
        ):
            return team
    return catch_all or {"id": "general", "name": cfg["brand"].get("company", "General")}


def screening_questions(cfg: dict[str, Any], team: dict[str, Any]) -> list[str]:
    return team.get("screening_questions") or cfg["defaults"].get(
        "screening_questions", []
    )


def notify_email(cfg: dict[str, Any], team: dict[str, Any]) -> str:
    return team.get("hiring_manager_email") or cfg["brand"].get("notify_email", "")
