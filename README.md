# ghl-integration

A cloud-resident autonomous agent ("Ron") that lives on GitHub Actions and
works toward a long-running business-building goal on top of GoHighLevel.

Inspired by the $200 / 13-day experiment. Same shape: a Commander prompt,
a small set of tools, durable memory, and a tight human-in-the-loop for
spend or outbound messaging.

## How it runs

Two modes, same entrypoint:

- `--mode scheduled` — one work cycle then exit. Default for GitHub Actions
  cron. Free, no idle compute. State is committed back to the repo so the
  next cycle picks up where the last one left off.
- `--mode forever` — long-running loop with `--interval` seconds between
  cycles. Use for Docker / Fly.io / Railway / any always-on host.

## Brain

A two-tier router:

- **Haiku 4.5** — decides each cycle whether to escalate to Opus, based on
  the current state. Cheap (~$0.001 / cycle).
- **Sonnet 4.6** (default) — routine execution: planning, drafting, GHL ops.
- **Opus 4.7** — escalated for hard reasoning (every 5th cycle, or when
  Haiku says so). Higher per-token cost; used sparingly.

The system prompt and tool list are stable across cycles, so prompt caching
kicks in after the first call — the cached prefix costs ~0.1× per read.

## Tools the agent has

| Tool | Purpose |
| --- | --- |
| `write_note`, `add_task`, `complete_task`, `update_kpis` | Mutate durable memory |
| `ghl_create_contact`, `ghl_search_contacts` | CRM ops |
| `ghl_send_email`, `ghl_send_sms` | Outbound (gated on human approval for first batch) |
| `request_human_approval` | Queue a high-stakes decision for the human |
| `web_search` | Server-hosted real-time research (Anthropic-managed) |
| `finish_cycle` | Cleanly end the work cycle |

GHL tools no-op if `GHL_API_TOKEN` isn't set — useful for dry runs.

## Setup

### 1. Local dry run (no real outbound, no GHL needed)

```bash
pip install -r requirements.txt
cp .env.example .env       # fill in ANTHROPIC_API_KEY at minimum
export $(cat .env | xargs)
python -m agent.main --mode scheduled
```

State is written to `state/memory.json` and an append-only `state/journal.jsonl`.

### 2. Deploy on GitHub Actions (free cron)

1. Push this repo to GitHub.
2. Go to **Settings → Secrets and variables → Actions** and add:
   - `ANTHROPIC_API_KEY` (required)
   - `GHL_API_TOKEN` (optional)
   - `GHL_LOCATION_ID` (optional)
3. Make sure **Settings → Actions → General → Workflow permissions** is set
   to *Read and write* so the workflow can commit state back.
4. The workflow runs every hour by default. Adjust the cron in
   `.github/workflows/agent.yml`. Trigger manually from the Actions tab.

State is committed back to the branch on every cycle — `git log state/` is
your audit trail of what Ron did and why.

### 3. Deploy as a long-running container (Docker)

```bash
docker build -t ron .
docker run -d \
  -e ANTHROPIC_API_KEY=sk-ant-... \
  -e GHL_API_TOKEN=... \
  -e GHL_LOCATION_ID=... \
  -e AGENT_MODE=forever \
  -e AGENT_INTERVAL_SECONDS=900 \
  -v ron-state:/state \
  --name ron \
  ron
```

Works on Fly.io, Railway, Render, Cloud Run, Fargate, or any Docker host.
The `/state` volume keeps memory across restarts.

## Layout

```
agent/
  main.py     # entrypoint: --mode scheduled|forever
  brain.py    # model-routed Anthropic loop with caching
  prompts.py  # Commander system prompt + per-cycle user turn builder
  tools.py    # tool schemas + dispatcher
  ghl.py      # GoHighLevel v2 REST client
  memory.py   # JSON state + append-only journal
state/        # durable memory (committed by Actions)
.github/workflows/agent.yml  # hourly cron + manual trigger
```

## Approving Ron's spending requests

Anything that costs money or sends a first outbound batch is queued via
`request_human_approval`. The pending requests live in
`state/memory.json` under `approvals_needed`. To approve:

1. Open `state/memory.json` and review the queued action.
2. Take whatever real-world step is needed (buy the domain, fund the ad
   account, etc.).
3. Remove the entry from `approvals_needed` and add a note describing what
   you authorized. Commit & push — Ron will see it next cycle.

## Lead Portal

A static, mobile-friendly portal at `docs/index.html` shows your leads with
search, filter, and click-to-call / SMS / email buttons. The agent refreshes
`docs/leads.json` at the start of every cycle — from real GoHighLevel data
when `GHL_API_TOKEN` is set, or from a deterministic mock list otherwise.

### How leads are scored

A simple 0-100 score so the highest-priority calls float to the top:

- **Recency** of last activity (up to +40)
- **Contactability** — has phone (+20), has email (+10)
- **Tags** — `hot`/`qualified` (+25), `replied`/`engaged` (+15),
  `do-not-call` zeroes the score
- **Source** — `referral` or `inbound` (+10)

Tweak the weights in `agent/leads.py::_score`.

### Open it from anywhere

The portal is plain HTML/JS so any of these work:

1. **GitHub Pages (recommended for team access).** In the repo, go to
   **Settings → Pages → Source: Deploy from a branch → main / `/docs`**.
   After a minute the portal is live at
   `https://<org>.github.io/ghl-integration/` — bookmark it on every device.
2. **Raw GitHub URL.** Browse to `docs/index.html` in the repo UI; the
   "raw" view won't render, but Pages or a local clone will.
3. **Local.** Clone the repo and open `docs/index.html` in a browser.

### Refresh cadence

Leads refresh whenever the agent runs (hourly cron in
`.github/workflows/agent.yml`). To force an immediate refresh, hit
**Actions → agent → Run workflow**. The workflow commits the updated
`docs/leads.json` back to the branch so the next page load shows it.

## Safety notes

- The agent cannot itself buy anything. It can only ask. Keep it that way
  until you trust it.
- Outbound SMS/email is on the "ask first" list deliberately.
- All GHL calls are logged in `state/journal.jsonl` — review periodically.
