"""Lead refresh + scoring for the portal.

Each cycle, pull contacts from GoHighLevel (if credentials are set) or fall
back to a deterministic mock list, score each one, and write the result to
`docs/leads.json` so the static portal can render it.

Scoring is intentionally simple and transparent — recency, engagement
signals, and contactability. Tweak the weights below to taste.
"""

from __future__ import annotations

import hashlib
import json
import os
import random
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Any

PORTAL_DIR = Path(os.environ.get("PORTAL_DIR", "docs"))
LEADS_FILE = PORTAL_DIR / "leads.json"


def _now() -> datetime:
    return datetime.now(timezone.utc)


def _score(lead: dict[str, Any]) -> int:
    """0-100. Higher = call this one first."""
    score = 0

    last = lead.get("last_activity_at")
    if last:
        try:
            days = (_now() - datetime.fromisoformat(last.replace("Z", "+00:00"))).days
            if days <= 1:
                score += 40
            elif days <= 7:
                score += 25
            elif days <= 30:
                score += 10
        except ValueError:
            pass

    if lead.get("phone"):
        score += 20
    if lead.get("email"):
        score += 10

    tags = {t.lower() for t in lead.get("tags", [])}
    if "hot" in tags or "qualified" in tags:
        score += 25
    if "replied" in tags or "engaged" in tags:
        score += 15
    if "do-not-call" in tags or "dnc" in tags:
        score = 0

    if lead.get("source") in {"referral", "inbound"}:
        score += 10

    return max(0, min(100, score))


def _normalize_ghl(contact: dict[str, Any]) -> dict[str, Any]:
    first = contact.get("firstName") or contact.get("firstNameLowerCase") or ""
    last = contact.get("lastName") or contact.get("lastNameLowerCase") or ""
    name = (first + " " + last).strip() or contact.get("contactName") or "Unknown"
    return {
        "id": contact.get("id", ""),
        "name": name,
        "phone": contact.get("phone", ""),
        "email": contact.get("email", ""),
        "source": contact.get("source", ""),
        "tags": contact.get("tags", []) or [],
        "status": contact.get("status", ""),
        "last_activity_at": contact.get("lastActivity")
        or contact.get("dateUpdated")
        or contact.get("dateAdded", ""),
    }


def _mock_leads(n: int = 50) -> list[dict[str, Any]]:
    rng = random.Random(42)
    first_names = [
        "Aaron", "Becca", "Carlos", "Dana", "Evan", "Fiona", "Greg", "Hana",
        "Ivan", "Jen", "Kyle", "Lara", "Mike", "Nora", "Owen", "Priya",
        "Quincy", "Rita", "Sam", "Tia", "Uma", "Vince", "Wendy", "Xavier",
        "Yara", "Zane",
    ]
    last_names = [
        "Adams", "Bell", "Cruz", "Diaz", "Evans", "Ford", "Gomez", "Hill",
        "Iyer", "Jones", "Khan", "Lopez", "Moore", "Nguyen", "Ortiz",
        "Patel", "Quinn", "Reed", "Stone", "Tran",
    ]
    sources = ["facebook-ad", "referral", "inbound", "google-ad", "scraper", "webinar"]
    tag_pool = ["hot", "qualified", "replied", "engaged", "cold", "follow-up", "vip"]
    statuses = ["new", "contacted", "qualified", "nurture"]

    out: list[dict[str, Any]] = []
    for i in range(n):
        fn = rng.choice(first_names)
        ln = rng.choice(last_names)
        digits = "".join(str(rng.randint(0, 9)) for _ in range(10))
        phone = f"+1{digits}"
        days_ago = rng.choice([0, 1, 2, 3, 5, 7, 14, 21, 45, 90])
        last = _now() - timedelta(days=days_ago, hours=rng.randint(0, 23))
        tag_count = rng.randint(0, 3)
        tags = rng.sample(tag_pool, k=tag_count)
        out.append(
            {
                "id": hashlib.md5(f"{fn}{ln}{i}".encode()).hexdigest()[:12],
                "name": f"{fn} {ln}",
                "phone": phone,
                "email": f"{fn.lower()}.{ln.lower()}@example.com",
                "source": rng.choice(sources),
                "tags": tags,
                "status": rng.choice(statuses),
                "last_activity_at": last.isoformat().replace("+00:00", "Z"),
            }
        )
    return out


def _fetch_ghl_leads(limit: int = 200) -> list[dict[str, Any]] | None:
    """Returns None if credentials are missing or the call fails."""
    if not os.environ.get("GHL_API_TOKEN"):
        return None
    try:
        from .ghl import GHLClient
        client = GHLClient()
        # GHL's search returns up to `limit` per page; portal v1 shows the first page.
        resp = client.search_contacts(query="", limit=limit)
        contacts = resp.get("contacts") or resp.get("data") or []
        return [_normalize_ghl(c) for c in contacts]
    except Exception:
        return None


def refresh(source: str = "auto") -> dict[str, Any]:
    """Refresh the portal's leads snapshot. Returns a small summary dict."""
    PORTAL_DIR.mkdir(parents=True, exist_ok=True)

    leads = _fetch_ghl_leads() if source in ("auto", "ghl") else None
    used_mock = leads is None
    if used_mock:
        leads = _mock_leads()

    for lead in leads:
        lead["score"] = _score(lead)

    leads.sort(key=lambda l: l["score"], reverse=True)

    snapshot = {
        "generated_at": _now().isoformat().replace("+00:00", "Z"),
        "source": "mock" if used_mock else "ghl",
        "count": len(leads),
        "leads": leads,
    }

    tmp = LEADS_FILE.with_suffix(".json.tmp")
    tmp.write_text(json.dumps(snapshot, indent=2))
    tmp.replace(LEADS_FILE)

    return {"count": len(leads), "source": snapshot["source"]}


if __name__ == "__main__":
    print(refresh())
