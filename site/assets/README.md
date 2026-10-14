# site/assets

Real H&P Landscaping photos and logo go here. The pages reference these exact
paths; until a file exists, its image slot falls back to a branded gradient +
caption (nothing looks broken), so you can ship and backfill.

## How to get the real assets (run on your own machine)

This repo's Claude environment can't reach `hplandscapingllc.com` (egress is
GitHub-only), so pull the assets locally with the toolkit:

```bash
cd tools/extract-site
./extract.sh https://www.hplandscapingllc.com/
```

That mirrors the site into `extract-www.hplandscapingllc.com/site/` — copy the
real photos and logo out of there into the filenames below (rename to match),
then commit `site/assets/`.

> H&P is the client, so their own photos/logo are theirs to use. (The Kingswood
> page was layout reference only — none of its images are used here.)

## Expected files

Custom Pools & Outdoor Structures page (`site/services/custom-pools-outdoor-structures.html`):

| Path | Used for | Suggested crop |
| --- | --- | --- |
| `pools/hero.jpg` | Hero — flagship pool/outdoor-living build | wide, 16:9 |
| `pools/structure.jpg` | Pergola / cabana / outdoor kitchen | tall, 3:4 |
| `pools/gallery-1.jpg` | Geometric pool & travertine deck | 4:3 |
| `pools/gallery-2.jpg` | Freeform pool with waterfall | 4:3 |
| `pools/gallery-3.jpg` | Outdoor kitchen & pergola | 4:3 |
| `pools/gallery-4.jpg` | Fire feature & lounge | 4:3 |
| `pools/gallery-5.jpg` | Covered patio & cabana | 4:3 |
| `pools/gallery-6.jpg` | Night lighting around pool | 4:3 |
| `logo.svg` *(or `logo.png`)* | Header/footer brand (optional — emoji used until added) | — |

### Landscape Design page (`services/landscape-design.html`)

| Path | Used for |
| --- | --- |
| `landscape-design/hero.jpg` | Hero — a designed landscape |
| `landscape-design/plan.jpg` | 2D/3D plan or model (tall) |
| `landscape-design/gallery-1.jpg` | Front-yard design |
| `landscape-design/gallery-2.jpg` | Planting beds & borders |
| `landscape-design/gallery-3.jpg` | Backyard master plan |

### Hardscaping page (`services/hardscaping.html`)

| Path | Used for |
| --- | --- |
| `hardscaping/hero.jpg` | Hero — paver patio build |
| `hardscaping/materials.jpg` | Natural stone / retaining wall (tall) |
| `hardscaping/gallery-1.jpg` | Paver patio |
| `hardscaping/gallery-2.jpg` | Retaining wall & terrace |
| `hardscaping/gallery-3.jpg` | Natural stone walkway |

### Outdoor Kitchens page (`services/outdoor-kitchens.html`)

| Path | Used for |
| --- | --- |
| `outdoor-kitchens/hero.jpg` | Hero — built-in outdoor kitchen |
| `outdoor-kitchens/integration.jpg` | Kitchen with patio & pool (tall) |
| `outdoor-kitchens/gallery-1.jpg` | Built-in grill & counter |
| `outdoor-kitchens/gallery-2.jpg` | Covered dining area |
| `outdoor-kitchens/gallery-3.jpg` | Kitchen with pizza oven |

Keep images web-sized (long edge ≤ 2000px, JPG quality ~80). Track anything
over 100 MB with [Git LFS](https://git-lfs.com) — but web-sized photos won't
come close.
