"""LLM calls for the recruiter: classify/extract with Haiku, draft with Sonnet.

Deliberately not an open-ended tool loop — recruiting replies must be
predictable, so each step is a single structured call that returns JSON.
"""

from __future__ import annotations

import json
import re
from typing import Any

import anthropic

from . import store

HAIKU = "claude-haiku-4-5"
SONNET = "claude-sonnet-4-6"

CLASSIFY_PROMPT = """You classify and extract data from emails sent by Indeed to an employer's inbox.

Respond ONLY with minified JSON, no prose, matching:
{"kind": "application" | "candidate_message" | "other",
 "candidate": {"first_name": "", "last_name": "", "email": "", "phone": "", "job_title": ""},
 "summary": ""}

kind rules:
- "application": a new job application notification (e.g. "New application", "applied to", resume attached/summarized).
- "candidate_message": a candidate wrote or replied to us through Indeed messaging or by email.
- "other": digests, sponsorship/billing promos, performance reports, alerts, anything not tied to one specific candidate.

Extract whatever candidate fields appear in the email; leave missing ones as "".
"job_title" is the position they applied to. "summary" is 1-2 sentences of what the email says."""

DRAFT_PROMPT = """You are the recruiting assistant for {company}, drafting replies to job candidates who applied or messaged via Indeed. Team: {team_name}.

Voice: {tone}

Hard rules — never violate these:
- NEVER state or imply a hiring decision (no "you got the job", no rejections). A human makes all decisions.
- NEVER ask about or mention age, race, religion, national origin, disability, family status, or any protected characteristic.
- NEVER promise specific pay, benefits, or start dates unless they appear in the team notes below.
- If the candidate raises anything sensitive (legal threats, discrimination claims, requests for accommodation, pay disputes), do not answer it — escalate with action "flag_human".
- Keep replies short: 3-7 sentences plus the question list when screening.

Respond ONLY with minified JSON, no prose, matching:
{{"action": "reply" | "handoff" | "flag_human",
  "subject": "",
  "body": "",
  "reason": ""}}

action rules:
- "reply": normal case — body is the email to send the candidate.
- "handoff": the candidate has substantively answered the screening questions and looks viable; body is a short reply telling them the hiring team will reach out, and "reason" summarizes their answers for the hiring manager.
- "flag_human": anything a bot should not handle; "reason" explains why.

End the body with this signature exactly:
{signature}"""


def _client() -> anthropic.Anthropic:
    return anthropic.Anthropic()


def _parse_json(text: str) -> dict[str, Any] | None:
    text = text.strip()
    text = re.sub(r"^```(?:json)?\s*|\s*```$", "", text)
    match = re.search(r"\{.*\}", text, re.DOTALL)
    if not match:
        return None
    try:
        return json.loads(match.group(0))
    except json.JSONDecodeError:
        return None


def _text_of(resp: Any) -> str:
    return "".join(b.text for b in resp.content if b.type == "text")


def classify(sender: str, subject: str, body: str) -> dict[str, Any] | None:
    resp = _client().messages.create(
        model=HAIKU,
        max_tokens=500,
        system=CLASSIFY_PROMPT,
        messages=[
            {
                "role": "user",
                "content": f"From: {sender}\nSubject: {subject}\n\n{body}",
            }
        ],
    )
    out = _parse_json(_text_of(resp))
    if out is None:
        store.journal({"type": "classify_parse_error", "subject": subject})
    return out


def draft(
    cfg: dict[str, Any],
    team: dict[str, Any],
    questions: list[str],
    candidate: dict[str, Any],
    kind: str,
    email_body: str,
    history: list[dict[str, Any]],
) -> dict[str, Any] | None:
    brand = cfg["brand"]
    system = DRAFT_PROMPT.format(
        company=brand.get("company", "the company"),
        team_name=team.get("name", "General"),
        tone=brand.get("tone", "warm and professional"),
        signature=brand.get("signature", "").strip(),
    )

    context = {
        "situation": (
            "new application — welcome them, thank them for applying, and ask the "
            "screening questions"
            if kind == "application"
            else "candidate message — answer naturally, and if their screening "
            "answers are now complete, use action handoff"
        ),
        "candidate": candidate,
        "screening_questions": questions,
        "team_notes": team.get("notes", ""),
        "conversation_so_far": [
            f"[{h['direction']}] {h['summary']}" for h in history[-10:]
        ],
        "their_latest_email": email_body[:4000],
    }

    resp = _client().messages.create(
        model=SONNET,
        max_tokens=1200,
        system=[
            {
                "type": "text",
                "text": system,
                "cache_control": {"type": "ephemeral"},
            }
        ],
        messages=[{"role": "user", "content": json.dumps(context, indent=2)}],
    )
    out = _parse_json(_text_of(resp))
    if out is None:
        store.journal({"type": "draft_parse_error", "candidate": candidate.get("email", "")})
    return out
