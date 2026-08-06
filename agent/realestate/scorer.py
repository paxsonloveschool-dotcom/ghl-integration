"""Lead scoring for real estate prospects."""
from __future__ import annotations

from datetime import datetime, timezone
from typing import Any

HOT_TAGS = {"hot", "qualified", "motivated", "urgent", "ready-to-buy", "ready-to-sell", "pre-approved"}
WARM_TAGS = {"replied", "engaged", "interested", "follow-up", "callback-requested"}
DEAD_TAGS = {"do-not-call", "dnc", "unsubscribed", "dead"}

HIGH_INTENT_SOURCES = {"referral", "inbound", "website", "direct", "open-house", "zillow", "realtor.com"}
LOW_INTENT_SOURCES = {"cold-outreach", "cold-call", "list"}


def score_lead(contact: dict[str, Any]) -> dict[str, Any]:
    """Score a lead 0-100 and classify temperature + lead_type."""
    score = 0
    breakdown: list[str] = []
    tags = {t.lower() for t in (contact.get("tags") or [])}

    if tags & DEAD_TAGS:
        return {
            "score": 0,
            "temperature": "dead",
            "lead_type": _detect_lead_type(contact),
            "score_breakdown": ["DNC/dead tag → score 0"],
        }

    last_activity = contact.get("lastActivity") or contact.get("dateAdded") or ""
    if last_activity:
        try:
            ts = datetime.fromisoformat(last_activity.replace("Z", "+00:00"))
            age_days = (datetime.now(timezone.utc) - ts).days
            recency_score = max(0, 40 - age_days * 2)
            score += recency_score
            breakdown.append(f"recency ({age_days}d old) +{recency_score}")
        except (ValueError, TypeError):
            pass

    if contact.get("phone"):
        score += 20
        breakdown.append("phone present +20")
    if contact.get("email"):
        score += 10
        breakdown.append("email present +10")

    hot_matches = tags & HOT_TAGS
    if hot_matches:
        score += 25
        breakdown.append(f"hot tags {hot_matches} +25")
    elif tags & WARM_TAGS:
        warm_matches = tags & WARM_TAGS
        score += 15
        breakdown.append(f"warm tags {warm_matches} +15")

    source = (contact.get("source") or "").lower()
    if source in HIGH_INTENT_SOURCES:
        score += 10
        breakdown.append(f"high-intent source '{source}' +10")
    elif source in LOW_INTENT_SOURCES:
        score -= 5
        breakdown.append(f"low-intent source '{source}' -5")

    score = max(0, min(100, score))

    if score >= 75:
        temperature = "urgent"
    elif score >= 55:
        temperature = "hot"
    elif score >= 30:
        temperature = "warm"
    else:
        temperature = "cold"

    return {
        "score": score,
        "temperature": temperature,
        "lead_type": _detect_lead_type(contact),
        "score_breakdown": breakdown,
    }


def _detect_lead_type(contact: dict[str, Any]) -> str:
    tags = {t.lower() for t in (contact.get("tags") or [])}
    if "seller" in tags or "listing" in tags or "selling" in tags:
        return "seller"
    return "buyer"


def sort_by_score(leads: list[dict[str, Any]]) -> list[dict[str, Any]]:
    """Sort leads by score descending, attaching _score_info to each."""
    scored = [{**lead, "_score_info": score_lead(lead)} for lead in leads]
    return sorted(scored, key=lambda x: x["_score_info"]["score"], reverse=True)
