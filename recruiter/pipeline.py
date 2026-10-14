"""The recruiter's hourly work cycle.

Flow per cycle:
1. Pull unprocessed Indeed emails from Gmail (applications + candidate messages).
2. Classify and extract candidate fields (Haiku).
3. Route to a team via teams.yml keywords.
4. Draft a reply (Sonnet): welcome + screening questions for new applications,
   conversational follow-up for candidate messages, handoff when screening is
   answered, flag_human for anything sensitive.
5. Deliver: send via Gmail when RECRUITER_AUTOSEND=true, otherwise queue the
   draft in state/recruiter/outbox.json for human review.
6. Sync the candidate into GoHighLevel (tagged by team), notify the hiring
   manager on handoff, label the email processed.

Indeed has no public employer API (Job Sync / Disposition are gated behind an
approved ATS partnership), so email is the supported integration surface:
Indeed notifies this inbox on every application/message, and replies reach
the candidate via their relay or direct address.
"""

from __future__ import annotations

import os
from typing import Any

from agent.ghl import GHLClient, GHLError

from . import config, llm, store
from .gmail_client import GmailClient, GmailError

PROCESSED_LABEL = "recruiter-processed"
GMAIL_QUERY = (
    "from:(indeed.com OR indeedemail.com) newer_than:3d -label:" + PROCESSED_LABEL
)


def _autosend() -> bool:
    return os.environ.get("RECRUITER_AUTOSEND", "").lower() in ("1", "true", "yes")


def _daily_cap() -> int:
    return int(os.environ.get("RECRUITER_DAILY_SEND_CAP", "50"))


def _max_followups(cfg: dict[str, Any]) -> int:
    return int(cfg["defaults"].get("max_bot_followups", 3))


def run_cycle(state: dict[str, Any]) -> dict[str, Any]:
    cfg = config.load()
    gmail = GmailClient()
    label_id = gmail.ensure_label(PROCESSED_LABEL)

    msg_ids = gmail.search(GMAIL_QUERY)
    seen = set(state.get("processed_message_ids", []))
    new_ids = [m for m in msg_ids if m not in seen]
    store.journal({"type": "cycle_start", "cycle": state["cycle_count"] + 1, "new_messages": len(new_ids)})

    handled = 0
    for msg_id in new_ids:
        try:
            _handle_message(state, cfg, gmail, msg_id)
            handled += 1
        except Exception as e:  # noqa: BLE001 - one bad email must not kill the cycle
            store.journal({"type": "message_error", "msg_id": msg_id, "error": repr(e)})
        finally:
            state.setdefault("processed_message_ids", []).append(msg_id)
            try:
                gmail.add_label(msg_id, label_id)
            except GmailError:
                pass

    state["cycle_count"] = state.get("cycle_count", 0) + 1
    store.journal({"type": "cycle_end", "cycle": state["cycle_count"], "handled": handled})
    return state


def _handle_message(
    state: dict[str, Any],
    cfg: dict[str, Any],
    gmail: GmailClient,
    msg_id: str,
) -> None:
    msg = gmail.get_message(msg_id)
    headers = gmail.headers(msg)
    sender = headers.get("from", "")
    subject = headers.get("subject", "")
    body = gmail.body_text(msg)

    parsed = llm.classify(sender, subject, body)
    if not parsed or parsed.get("kind") == "other":
        store.journal({"type": "skipped", "msg_id": msg_id, "subject": subject})
        return

    cand = parsed.get("candidate", {}) or {}
    kind = parsed["kind"]

    # Where a reply will land: the candidate's own email if Indeed exposed it,
    # else the Reply-To relay on this message. No address -> a human must
    # answer inside Indeed's dashboard.
    reply_to = (cand.get("email") or headers.get("reply-to") or "").strip()
    key = (reply_to or f"msg:{msg_id}").lower()

    rec = store.upsert_candidate(
        state,
        key,
        first_name=cand.get("first_name"),
        last_name=cand.get("last_name"),
        email=cand.get("email"),
        phone=cand.get("phone"),
        job_title=cand.get("job_title"),
        thread_id=msg.get("threadId"),
    )
    store.add_history(rec, "inbound", parsed.get("summary", subject))

    team = config.match_team(cfg, rec.get("job_title", ""))
    rec["team_id"] = team.get("id", "general")
    questions = config.screening_questions(cfg, team)

    if not reply_to:
        rec["status"] = "needs_human"
        store.journal({"type": "no_reply_address", "msg_id": msg_id, "candidate": key})
        return

    if kind == "candidate_message" and rec.get("bot_replies", 0) >= _max_followups(cfg):
        rec["status"] = "needs_human"
        _notify_manager(cfg, team, gmail, state, rec, "Bot follow-up limit reached; conversation needs a human.")
        return

    draft = llm.draft(cfg, team, questions, cand, kind, body, rec.get("history", []))
    if not draft:
        rec["status"] = "needs_human"
        return

    action = draft.get("action", "reply")
    if action == "flag_human":
        rec["status"] = "needs_human"
        _notify_manager(cfg, team, gmail, state, rec, f"Flagged by bot: {draft.get('reason', '')}")
        return

    _deliver(
        gmail,
        state,
        rec,
        to=reply_to,
        subject=draft.get("subject") or f"Re: {subject}",
        body=draft.get("body", ""),
        thread_id=msg.get("threadId"),
        in_reply_to=headers.get("message-id"),
        references=headers.get("references"),
    )

    if action == "handoff":
        rec["status"] = "handoff"
        _notify_manager(cfg, team, gmail, state, rec, f"Screening complete: {draft.get('reason', '')}")
    else:
        rec["status"] = "contacted" if kind == "application" else "in_conversation"

    _ghl_sync(rec, team)


def _deliver(
    gmail: GmailClient,
    state: dict[str, Any],
    rec: dict[str, Any],
    **send_args: Any,
) -> None:
    """Send the drafted reply, or queue it for review when autosend is off
    or the daily cap is hit."""
    capped = store.sends_today(state) >= _daily_cap()
    if _autosend() and not capped:
        gmail.send(**send_args)
        store.record_send(state)
        rec["bot_replies"] = rec.get("bot_replies", 0) + 1
        store.add_history(rec, "outbound", send_args["body"][:300])
        store.journal({"type": "sent", "to": send_args["to"], "subject": send_args["subject"]})
    else:
        store.queue_outbox({"candidate": rec["key"], **send_args})
        store.add_history(rec, "queued", send_args["body"][:300])
        store.journal(
            {
                "type": "queued_outbox",
                "to": send_args["to"],
                "reason": "daily_cap" if capped else "autosend_off",
            }
        )


def _notify_manager(
    cfg: dict[str, Any],
    team: dict[str, Any],
    gmail: GmailClient,
    state: dict[str, Any],
    rec: dict[str, Any],
    reason: str,
) -> None:
    to = config.notify_email(cfg, team)
    if not to:
        store.journal({"type": "no_notify_email", "team": team.get("id"), "candidate": rec["key"]})
        return
    name = f"{rec.get('first_name', '')} {rec.get('last_name', '')}".strip() or rec["key"]
    body = (
        f"Candidate: {name}\n"
        f"Role: {rec.get('job_title', 'unknown')}\n"
        f"Email: {rec.get('email', '')}  Phone: {rec.get('phone', '')}\n"
        f"Status: {rec.get('status', '')}\n\n"
        f"{reason}\n\n"
        "Recent conversation:\n"
        + "\n".join(f"- [{h['direction']}] {h['summary']}" for h in rec.get("history", [])[-8:])
    )
    _deliver(
        gmail,
        state,
        rec,
        to=to,
        subject=f"[Recruiter] {name} — {team.get('name', '')}",
        body=body,
    )


def _ghl_sync(rec: dict[str, Any], team: dict[str, Any]) -> None:
    """Best-effort: mirror the candidate into GoHighLevel. No-op without creds."""
    if not os.environ.get("GHL_API_TOKEN") or not rec.get("email"):
        return
    if rec.get("ghl_contact_id"):
        return
    try:
        client = GHLClient()
        existing = client.search_contacts(rec["email"], limit=1).get("contacts", [])
        if existing:
            rec["ghl_contact_id"] = existing[0].get("id", "")
            return
        created = client.create_contact(
            first_name=rec.get("first_name", ""),
            last_name=rec.get("last_name", ""),
            email=rec["email"],
            phone=rec.get("phone", ""),
            tags=["indeed-applicant", f"team-{team.get('id', 'general')}"],
            source="indeed-recruiter",
        )
        rec["ghl_contact_id"] = created.get("contact", {}).get("id", "")
        store.journal({"type": "ghl_synced", "candidate": rec["key"]})
    except GHLError as e:
        store.journal({"type": "ghl_error", "candidate": rec["key"], "error": str(e)})
