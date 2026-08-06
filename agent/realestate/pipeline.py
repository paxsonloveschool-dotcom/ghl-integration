"""Pipeline stage management and nurture logic."""
from __future__ import annotations

from datetime import datetime, timezone
from typing import Any

STAGES = [
    "new_lead", "contacted", "engaged", "qualified",
    "appointment_set", "active_search", "under_contract", "closed",
]

NURTURE_SCHEDULE = {
    "new_lead":        [0, 1, 3],
    "contacted":       [1, 3, 7],
    "engaged":         [2, 5, 10],
    "qualified":       [1, 3, 7],
    "appointment_set": [0, 1],
    "active_search":   [3, 7, 14],
    "under_contract":  [2, 5],
    "closed":          [30, 90],
}

SMS_TEMPLATES = {
    "new_lead_buyer": (
        "Hi {first_name}! I'm {agent_name} with {company}. "
        "I saw you're interested in buying a home — I'd love to help! "
        "What area and price range are you thinking? \U0001f3e1"
    ),
    "new_lead_seller": (
        "Hi {first_name}! I'm {agent_name} with {company}. "
        "Thinking about selling? I can give you a free market analysis — takes 10 min. "
        "When works for a quick call?"
    ),
    "follow_up_no_response": (
        "Hey {first_name}, just following up! Happy to answer any questions about "
        "the {market} market. What's the best time for a quick chat?"
    ),
    "value_add_buyer": (
        "Hi {first_name}! New listings in {area} this week that match what you're looking for. "
        "Want me to send details? Also — are you pre-approved yet? That puts you first in line."
    ),
    "value_add_seller": (
        "Hi {first_name}! Homes in your area are moving fast this month. "
        "Your home could be worth more than you think — want a free estimate?"
    ),
    "appointment_reminder": (
        "Hi {first_name}! Just a reminder about our {appointment_type} tomorrow. "
        "Looking forward to it! Reply if you need to reschedule."
    ),
    "under_contract_checkin": (
        "Hi {first_name}! Everything's moving along — inspection scheduled, title is clear. "
        "Any questions before the closing table? \U0001f511"
    ),
    "closed_referral": (
        "Hi {first_name}! Congrats again on your {sale_type}! \U0001f389 "
        "Do you know anyone else thinking about buying or selling? "
        "I'd love to help them too."
    ),
}

EMAIL_TEMPLATES = {
    "new_lead_buyer": {
        "subject": "Your Home Search Starts Here — {agent_name}",
        "html": """<p>Hi {first_name},</p>
<p>Thank you for your interest! I'm {agent_name} with {company}, and I specialize in helping buyers find their perfect home in {market}.</p>
<p>Here's what I can do for you:</p>
<ul>
  <li>\U0001f3e1 Set up custom listing alerts so you never miss a new home</li>
  <li>\U0001f4ca Give you a full market analysis so you know exactly what to offer</li>
  <li>\U0001f4b0 Connect you with a trusted lender for pre-approval (takes 20 minutes)</li>
  <li>\U0001f511 Schedule private showings of any home you like</li>
</ul>
<p>What area and price range are you targeting? Just reply and I'll set up your custom search right away.</p>
<p>Best,<br>{agent_name}<br>{company}<br>{phone}</p>""",
    },
    "new_lead_seller": {
        "subject": "What Is Your Home Worth Right Now? — {agent_name}",
        "html": """<p>Hi {first_name},</p>
<p>I'm {agent_name} with {company}. I help homeowners in {market} get top dollar — and I'd love to help you too.</p>
<p>My free seller consultation includes:</p>
<ul>
  <li>\U0001f4c8 A precise market analysis of what your home is worth RIGHT NOW</li>
  <li>\U0001f4f8 Professional photography + listing copy that excites buyers</li>
  <li>\U0001f4e2 Marketing on Zillow, Realtor.com, MLS, social media, and my buyer database</li>
  <li>\U0001f91d My average seller nets {avg_above_list}% above list price</li>
</ul>
<p>Can we schedule a 15-minute call this week? Just reply with a day that works for you.</p>
<p>Best,<br>{agent_name}<br>{company}<br>{phone}</p>""",
    },
    "market_report": {
        "subject": "{market} Market Update — {month} {year}",
        "html": """<p>Hi {first_name},</p>
<p>Here's what's happening in the {market} real estate market this month:</p>
<ul>
  <li>\U0001f4ca Median sale price: <strong>{median_price}</strong></li>
  <li>\U0001f4c5 Average days on market: <strong>{avg_dom} days</strong></li>
  <li>\U0001f3e1 Homes sold this month: <strong>{homes_sold}</strong></li>
  <li>\U0001f4e6 Active inventory: <strong>{inventory} homes</strong></li>
</ul>
<p>It's currently a {market_type} market — {market_insight}</p>
<p>Want to know what this means for you personally? Reply and I'll give you a tailored breakdown.</p>
<p>Best,<br>{agent_name}<br>{company}<br>{phone}</p>""",
    },
}


def get_current_stage(contact: dict[str, Any]) -> str:
    """Infer pipeline stage from contact tags."""
    tags = {t.lower() for t in (contact.get("tags") or [])}
    stage_tag_map = [
        ("closed",          {"closed", "sold", "purchased"}),
        ("under_contract",  {"under-contract", "in-escrow", "pending"}),
        ("active_search",   {"active-search", "showing", "offer-submitted"}),
        ("appointment_set", {"appointment-set", "consultation-scheduled", "showing-scheduled"}),
        ("qualified",       {"qualified", "pre-approved", "ready"}),
        ("engaged",         {"engaged", "replied", "interested", "callback-requested"}),
        ("contacted",       {"contacted", "outreach-sent", "emailed", "texted"}),
    ]
    for stage, stage_tags in stage_tag_map:
        if tags & stage_tags:
            return stage
    return "new_lead"


def days_since_last_contact(contact: dict[str, Any]) -> int:
    last = contact.get("lastActivity") or contact.get("dateAdded") or ""
    if not last:
        return 999
    try:
        ts = datetime.fromisoformat(last.replace("Z", "+00:00"))
        return (datetime.now(timezone.utc) - ts).days
    except (ValueError, TypeError):
        return 999


def is_followup_due(contact: dict[str, Any]) -> bool:
    stage = get_current_stage(contact)
    days = days_since_last_contact(contact)
    schedule = NURTURE_SCHEDULE.get(stage, [7])
    return any(days >= d for d in schedule)


def get_next_action(contact: dict[str, Any]) -> dict[str, Any]:
    """Recommend the next action for this contact."""
    from .scorer import _detect_lead_type

    stage = get_current_stage(contact)
    days = days_since_last_contact(contact)
    lead_type = _detect_lead_type(contact)

    if stage == "new_lead" and days == 0:
        return {"action": "send_initial_outreach", "channel": "both",
                "sms_template": f"new_lead_{lead_type}",
                "email_template": f"new_lead_{lead_type}", "priority": "high"}

    if days >= 7 and stage in ("contacted", "engaged"):
        return {"action": "follow_up", "channel": "sms",
                "sms_template": "follow_up_no_response", "priority": "medium"}

    if days >= 3 and stage in ("new_lead", "contacted"):
        return {"action": "value_add", "channel": "both",
                "sms_template": f"value_add_{lead_type}",
                "email_template": "market_report", "priority": "medium"}

    if stage == "qualified" and days >= 1:
        return {"action": "book_appointment", "channel": "sms",
                "sms_template": "follow_up_no_response", "priority": "high"}

    if stage == "under_contract" and days >= 2:
        return {"action": "check_in", "channel": "sms",
                "sms_template": "under_contract_checkin", "priority": "high"}

    if stage == "closed" and days >= 30:
        return {"action": "referral_request", "channel": "sms",
                "sms_template": "closed_referral", "priority": "low"}

    return {"action": "none", "reason": f"stage={stage}, days_since_contact={days}"}
