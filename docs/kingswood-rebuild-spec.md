# Kingswood Landscape — rebuild spec (reference)

Working spec for rebuilding the **Custom Pools & Outdoor Structures** page for a
client. Content below was reconstructed from public search indexing — the live
page and its assets could not be fetched from the Claude cloud environment
(egress is GitHub-only). Run `tools/extract-site/extract.sh` locally to capture
the real markup, palette, and fonts, then fill in the `TODO` tokens here.

> **IP guardrail:** use this for *structure and direction only*. Replace every
> headline, paragraph, photo, and the logo with the client's own original
> assets before shipping. Do not reuse Kingswood's copy or imagery.

## Source

- Reference URL: https://www.kingswoodlandscape.com/services/custom-pools-outdoor-structures
- Apparent business: luxury landscape design/build, Colleyville TX (DFW metro)
- NAP (reference only): 6600 Colleyville Blvd, Colleyville, TX 76034 ·
  info@kingswoodlandscape.com · (972) 800-2290

## Design tokens (fill from extraction)

| Token | Value |
| --- | --- |
| Primary color | `TODO` (from REPORT.md) |
| Accent color | `TODO` |
| Background / neutrals | `TODO` |
| Heading font | `TODO` |
| Body font | `TODO` |
| Platform of original | `TODO` (Wappalyzer / REPORT.md) |

## Page structure (section-by-section)

1. **Hero** — positioning line ("Luxury Outdoor Living, Redefined"), subhead on
   custom pools + integrated structures, primary CTA → "Begin Your Design
   Conversation". Full-bleed background image.
2. **Pool services grid** — cards:
   - Design & Planning — 2D layouts + 3D models
   - Custom Shapes & Sizes — geometric, freeform/natural, lap
   - Materials & Finishes — concrete / fiberglass / vinyl; tile / plaster / pebble
   - Outdoor Living Integration — patios, decks, fire pits, seating
   - Water Features & Lighting — waterfalls, fountains, LED
3. **Outdoor structures** — pergolas, cabanas, pavilions; travertine patios,
   retaining walls, walkways, stone garden beds.
4. **Process (3 steps)** —
   ① In-depth consultation (property, vision, lifestyle) →
   ② Customized design plan (planting layouts, travertine patios, pergolas) →
   ③ In-house build (site prep → material coordination → final install).
5. **Timeline / expectations** — large projects ≈ 10–20 weeks; reach out 2–4
   months ahead; team responds within 1–2 business days.
6. **Gallery / proof** — "The Kingswood Collection" style work showcase.
7. **CTA band** — "Begin Your Design Conversation" + contact.
8. **Footer** — NAP, service-area links, nav.

## Site IA (related pages, for nav + internal links)

```
/services
/services/custom-pools-outdoor-structures   <- this page
/services/landscape-design
/services/landscape-outdoor-living-remodels
/hardscaping-services
/our-works
/about-us
/faq
/begin-your-design-conversation
/service-area/{colleyville,southlake,park-cities,westlake}
```

## Rebuild target — decide before build

- [ ] **GoHighLevel page builder** — preferred if the client lives in GHL
      (matches `agent/ghl.py` lead-capture flow). Rebuild as builder sections.
- [ ] **Static in `site/`** — same approach as the H&P landing page; no build
      step, lead form POSTs to a GHL inbound webhook.

Lead form fields should match the agent's contact schema (`agent/ghl.py`):
`name`, `email`, `phone`, `service`, `message`, `source`, `submitted_at`.
