"""Export pipeline data to docs/re_leads.json for the web portal."""
from __future__ import annotations

import json
import os
from datetime import datetime, timezone
from pathlib import Path

from .ghl_re import REGHLClient
from ..ghl import GHLError
from .scorer import sort_by_score
from .pipeline import get_current_stage, days_since_last_contact, is_followup_due, get_next_action

DOCS_DIR = Path("docs")
OUTPUT_FILE = DOCS_DIR / "re_leads.json"

MOCK_LEADS = [
    {"id": "m1", "firstName": "Sarah", "lastName": "Johnson", "phone": "+15551234567",
     "email": "sarah@example.com", "tags": ["buyer", "hot", "pre-approved"], "source": "referral",
     "lastActivity": "2026-05-26T10:00:00Z"},
    {"id": "m2", "firstName": "Mike", "lastName": "Davis", "phone": "+15559876543",
     "email": "mike@example.com", "tags": ["seller", "qualified"], "source": "website",
     "lastActivity": "2026-05-25T15:30:00Z"},
    {"id": "m3", "firstName": "Emily", "lastName": "Chen", "phone": "+15553456789",
     "email": "emily@example.com", "tags": ["buyer", "new_lead"], "source": "zillow",
     "lastActivity": "2026-05-26T08:00:00Z"},
    {"id": "m4", "firstName": "James", "lastName": "Wilson", "phone": "+15557654321",
     "email": "james@example.com", "tags": ["buyer", "engaged", "replied"], "source": "inbound",
     "lastActivity": "2026-05-23T12:00:00Z"},
    {"id": "m5", "firstName": "Maria", "lastName": "Garcia", "phone": "+15552345678",
     "email": "maria@example.com", "tags": ["seller", "appointment-set", "motivated"], "source": "referral",
     "lastActivity": "2026-05-26T09:00:00Z"},
    {"id": "m6", "firstName": "Tom", "lastName": "Brown", "phone": "",
     "email": "tom@example.com", "tags": ["buyer", "contacted"], "source": "cold-outreach",
     "lastActivity": "2026-05-20T10:00:00Z"},
    {"id": "m7", "firstName": "Lisa", "lastName": "Martinez", "phone": "+15556543210",
     "email": "lisa@example.com", "tags": ["buyer", "under-contract"], "source": "website",
     "lastActivity": "2026-05-24T14:00:00Z"},
    {"id": "m8", "firstName": "David", "lastName": "Anderson", "phone": "+15554567890",
     "email": "david@example.com", "tags": ["seller", "new_lead"], "source": "open-house",
     "lastActivity": "2026-05-26T07:00:00Z"},
]


def export() -> None:
    DOCS_DIR.mkdir(parents=True, exist_ok=True)
    contacts = []
    using_mock = False

    if os.environ.get("GHL_API_TOKEN"):
        try:
            client = REGHLClient()
            result = client.search_contacts("", limit=100)
            contacts = result.get("contacts", [])
        except GHLError as e:
            print(f"[re-export] GHL error: {e} — using mock data")
            contacts = MOCK_LEADS
            using_mock = True
    else:
        print("[re-export] GHL_API_TOKEN not set — using mock data")
        contacts = MOCK_LEADS
        using_mock = True

    scored = sort_by_score(contacts)
    leads = [
        {
            "id": c.get("id", ""),
            "name": f"{c.get('firstName', '')} {c.get('lastName', '')}".strip(),
            "firstName": c.get("firstName", ""),
            "lastName": c.get("lastName", ""),
            "phone": c.get("phone", ""),
            "email": c.get("email", ""),
            "tags": c.get("tags", []),
            "source": c.get("source", ""),
            "stage": get_current_stage(c),
            "score": c["_score_info"]["score"],
            "temperature": c["_score_info"]["temperature"],
            "lead_type": c["_score_info"]["lead_type"],
            "days_since_contact": days_since_last_contact(c),
            "followup_due": is_followup_due(c),
            "next_action": get_next_action(c).get("action", "none"),
            "lastActivity": c.get("lastActivity") or c.get("dateAdded", ""),
        }
        for c in scored
    ]

    output = {
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "total": len(leads),
        "leads": leads,
        "using_mock": using_mock,
    }
    with OUTPUT_FILE.open("w") as f:
        json.dump(output, f, indent=2)
    print(f"[re-export] wrote {len(leads)} leads to {OUTPUT_FILE}")


if __name__ == "__main__":
    export()
