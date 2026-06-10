# Restore Recruiter — autonomous Indeed responder

An hourly agent that watches the recruiting inbox for Indeed activity and
responds to every applicant automatically: welcomes new applications, asks
each team's screening questions, holds the follow-up conversation, hands
qualified candidates to the right hiring manager, and mirrors everyone into
GoHighLevel.

## Why email, not "inside Indeed"

Indeed has **no public employer API** — their Job Sync / Disposition APIs are
only available to approved ATS partners, and scraping the employer dashboard
violates Indeed's terms of service (and gets accounts banned). The supported
surface is email: Indeed notifies your inbox on every application and
candidate message, and replies are relayed back to the candidate. So the
agent lives in GitHub Actions, polls Gmail hourly, and works the inbox.

We evaluated adopting an existing open-source HR agent first; nothing
reputable and maintained exists for employer-side Indeed response automation
(what's out there is job-seeker tooling or abandoned ATS projects), so this
is built in-house on the same brain/CRM stack as Ron.

## What a cycle does (every hour, at :20)

1. **Poll Gmail** for unprocessed mail from `indeed.com` / `indeedemail.com`.
2. **Classify & extract** with Haiku: new application, candidate message, or
   noise (digests/promos are skipped). Pulls name, email, phone, job title.
3. **Route to a team** by matching the job title against `recruiter/teams.yml`
   keywords — each team has its own questions, notes, and hiring manager.
   Unmatched roles fall to the Restore catch-all.
4. **Draft the reply** with Sonnet in the brand voice: applications get a
   welcome + screening questions; replies get a natural follow-up. When a
   candidate has answered the screening questions, the bot tells them the
   hiring team will reach out and **emails the hiring manager a summary**.
5. **Send or queue.** With `RECRUITER_AUTOSEND=false` (the default) nothing
   is sent — drafts pile up in `state/recruiter/outbox.json` for you to
   review. Flip the repo variable to `true` when you trust it.
6. **Sync to GoHighLevel**: contact created/tagged `indeed-applicant`,
   `team-<id>` so GHL workflows (SMS follow-up, pipelines) can take over.
7. **Commit state back** to the repo — `git log state/recruiter/` is the
   audit trail of every candidate touch.

## Guardrails

- The bot **never communicates a hiring decision** — no offers, no
  rejections. Humans decide; the bot screens and schedules the conversation.
- It never asks about protected characteristics (EEOC), and anything
  sensitive (accommodations, pay disputes, legal language) is escalated to
  a human instead of answered.
- `RECRUITER_DAILY_SEND_CAP` (default 50) hard-limits outbound volume.
- After `max_bot_followups` exchanges (default 3) the conversation is
  flagged for a human rather than looping forever.
- Candidates with no reachable reply address are marked `needs_human`
  (answer those in the Indeed dashboard).

## Setup

### 1. Gmail credentials (one-time, ~10 min)

The recruiter reads/sends through the Gmail account that receives your
Indeed notifications (paxsonloveschool@gmail.com or a dedicated
recruiting inbox — a dedicated one is cleaner).

1. In [Google Cloud Console](https://console.cloud.google.com): create a
   project → enable **Gmail API** → create an **OAuth client ID (Desktop
   app)** → add the inbox as a test user on the consent screen.
2. Locally: `GMAIL_CLIENT_ID=... GMAIL_CLIENT_SECRET=... python scripts/gmail_auth.py`
   and approve in the browser. It prints `GMAIL_REFRESH_TOKEN`.

### 2. Indeed notification settings

In Indeed employer settings, make sure **email notifications are ON** for
new applications and candidate messages, delivered to that inbox,
**individually (not daily digest)** — the agent can only see what Indeed
emails it.

### 3. GitHub secrets & variables

Settings → Secrets and variables → Actions:

| Secret | Required |
| --- | --- |
| `ANTHROPIC_API_KEY` | yes (already set for Ron) |
| `GMAIL_CLIENT_ID` / `GMAIL_CLIENT_SECRET` / `GMAIL_REFRESH_TOKEN` | yes |
| `GHL_API_TOKEN` / `GHL_LOCATION_ID` | optional — skips CRM sync if absent |

Variables:

| Variable | Default | Meaning |
| --- | --- | --- |
| `RECRUITER_AUTOSEND` | `false` | `true` = actually send replies |
| `RECRUITER_DAILY_SEND_CAP` | `50` | max outbound emails per day |

### 4. Configure your teams

Edit `recruiter/teams.yml`: company voice, per-team keywords, screening
questions, and **hiring manager emails** (currently blank — handoff
notifications are skipped until filled in).

### 5. Turn it on

The workflow (`.github/workflows/recruiter.yml`) runs hourly at :20 and can
be triggered manually from the Actions tab. Recommended rollout:

1. Run a few cycles with autosend off; read `state/recruiter/outbox.json`.
2. Tune `teams.yml` tone/questions until the drafts read right.
3. Set `RECRUITER_AUTOSEND=true`.

## Layout

```
recruiter/
  main.py          # entrypoint: --mode scheduled|forever
  pipeline.py      # the hourly cycle (poll -> classify -> draft -> send -> sync)
  llm.py           # Haiku classification + Sonnet drafting (structured JSON)
  gmail_client.py  # minimal Gmail REST client (OAuth refresh token)
  config.py        # teams.yml loader + job-title routing
  store.py         # candidate state, journal, outbox, send caps
  teams.yml        # brand voice + per-team bots  <-- EDIT ME
scripts/gmail_auth.py            # one-time refresh-token mint
state/recruiter/                 # candidates.json, journal.jsonl, outbox.json
.github/workflows/recruiter.yml  # hourly cron
```
