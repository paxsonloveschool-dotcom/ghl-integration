# RON // NEXUS — Orchestration Demo Dashboard

A Jarvis-style, galaxy-themed command HUD that showcases what the Ron system
looks like running at scale: **100 messenger agents** doing sales-rep
recruitment, organized into 10 specialist squads orbiting a central
orchestrator core (RON-PRIME).

This is a **demo / showcase surface** — all telemetry is simulated in the
browser. No API keys, no backend, no build step.

## Run it

It's a single static file. Either:

```bash
# open directly
open dashboard/index.html        # macOS
xdg-open dashboard/index.html    # Linux

# or serve it (avoids any font-loading quirks)
python3 -m http.server 8080
# then visit http://localhost:8080/dashboard/
```

## What's in the demo

- **Boot sequence** — kernel-style ignition animation before the HUD loads.
- **Orchestration galaxy** — 10 concentric squad rings, 100 orbiting agent
  nodes, message pulses travelling between agents and the core.
  Hover a node for telemetry, click for a full dossier (stats + live
  conversation thread), drag to rotate the field.
- **Squad manifest** — the 10 squads (Sourcing, First-Touch, Engage, Qualify,
  Objection, Scheduler, Follow-Up, Nurture, Revival, Analytics). Click a
  squad to focus its ring in the galaxy.
- **Live comms intercept** — simulated recruitment DM/SMS traffic between
  agents and leads in real time.
- **KPIs** — active conversations, messages/min, calls booked, reps placed.
- **Recruitment funnel** — reached → replied → qualified → booked → showed → hired.
- **Throughput chart + kernel log** — rolling 60s message volume and a
  scrolling system log.

## Demo script suggestion

1. Let the boot sequence play (~3s) — sets the tone.
2. Point at the galaxy: "every dot is an agent, every pulse is a live
   message routed through the orchestrator."
3. Click a squad (e.g. SCHEDULER) to focus its ring, then click an agent
   node to open its dossier and show a live conversation thread.
4. End on the funnel + "reps placed" counter ticking up.

## Wiring it to real data later

The simulation lives in the `tickEvent` / `kpi` section of `index.html`.
To drive it from the real agent, replace those with a poll of
`state/memory.json` (or an SSE/websocket bridge) — the render layer doesn't
care where events come from.
