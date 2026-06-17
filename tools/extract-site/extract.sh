#!/usr/bin/env bash
#
# extract.sh — pull the front-end of a public web page (HTML/CSS/JS/images/fonts)
# and auto-summarize its platform, color palette, and fonts.
#
# Run this on a machine with open internet (NOT the Claude Code cloud
# container, whose egress is allowlisted to GitHub only).
#
# Usage:
#   ./extract.sh <url> [output-dir]
#   ./extract.sh https://www.kingswoodlandscape.com/services/custom-pools-outdoor-structures
#
# What it does:
#   1. Mirrors the page + every asset it references (CSS, JS, images, fonts),
#      rewriting links so it opens offline.
#   2. Fingerprints the likely platform/CMS (Wix, Squarespace, WordPress,
#      GoHighLevel, Webflow, Shopify, ...).
#   3. Extracts the color palette (hex) and font-family declarations from CSS.
#   4. Writes ./<output-dir>/REPORT.md with the findings.
#
# Front-end only. Server-side code never leaves their server and cannot be
# extracted. Use the captured design (layout, palette, fonts) as REFERENCE —
# do not reuse their copy, photos, or logo in a client rebuild.

set -euo pipefail

URL="${1:-}"
if [[ -z "$URL" ]]; then
  echo "usage: $0 <url> [output-dir]" >&2
  exit 1
fi

# Derive a default output dir from the host.
HOST="$(printf '%s' "$URL" | sed -E 's#https?://##; s#/.*##')"
OUT="${2:-extract-$HOST}"
UA='Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36'

mkdir -p "$OUT"
echo ">> Extracting $URL"
echo ">> Output: $OUT/"

# --- 1. Mirror page + assets ------------------------------------------------
# --span-hosts + a permissive domain list so CDN-hosted CSS/JS/fonts come along.
if command -v wget >/dev/null 2>&1; then
  wget -e robots=off \
       -U "$UA" \
       --page-requisites \
       --convert-links \
       --adjust-extension \
       --span-hosts \
       --no-check-certificate \
       --tries=3 --timeout=30 \
       -P "$OUT/site" \
       "$URL" || echo "!! wget returned non-zero (partial capture is normal if the site bot-walls assets)"
else
  echo "!! wget not found. Install it (brew install wget / apt install wget) or use the browser fallback:" >&2
  echo "   Open the page -> Ctrl+S -> 'Webpage, Complete'." >&2
fi

# Flatten the saved tree into a single text blob for grepping.
BLOB="$OUT/.allmarkup.txt"
: > "$BLOB"
find "$OUT/site" -type f \( -name '*.html' -o -name '*.htm' -o -name '*.css' -o -name '*.js' \) \
  -exec cat {} + >> "$BLOB" 2>/dev/null || true

# --- 2. Platform fingerprint ------------------------------------------------
detect() { grep -qiE "$1" "$BLOB" 2>/dev/null && echo "$2"; }
PLATFORMS="$(
  detect 'wixstatic|parastorage|wix\.com'                 'Wix'
  detect 'squarespace|sqsp|static1\.squarespace'          'Squarespace'
  detect 'wp-content|wp-json|wp-includes'                 'WordPress'
  detect 'msgsndr|leadconnector|gohighlevel|highlevel'    'GoHighLevel'
  detect 'webflow|assets\.website-files|wf-'              'Webflow'
  detect 'cdn\.shopify|shopify'                           'Shopify'
  detect 'hubspot|hs-scripts'                             'HubSpot'
  detect '_next/static|__NEXT_DATA__'                     'Next.js'
  detect 'gatsby'                                          'Gatsby'
)"
[[ -z "$PLATFORMS" ]] && PLATFORMS="(none of the known signatures matched — check DevTools > Sources manually, or run Wappalyzer)"

# --- 3. Colors + fonts ------------------------------------------------------
COLORS="$(grep -rhoE '#[0-9a-fA-F]{6}|#[0-9a-fA-F]{3}\b' "$OUT/site" 2>/dev/null \
          | tr 'A-F' 'a-f' | sort | uniq -c | sort -rn | head -25 || true)"
FONTS="$(grep -rhoE 'font-family:[^;}{"]+' "$OUT/site" 2>/dev/null \
         | sed -E 's/font-family:\s*//' | sort -u | head -40 || true)"
GFONTS="$(grep -rhoE 'fonts\.googleapis\.com/css[^"'\'' )]+' "$OUT/site" 2>/dev/null | sort -u || true)"

# --- 4. Report --------------------------------------------------------------
REPORT="$OUT/REPORT.md"
{
  echo "# Extraction report — $HOST"
  echo
  echo "- **Source URL:** $URL"
  echo "- **Captured:** $(date -u '+%Y-%m-%d %H:%M UTC')"
  echo "- **Files saved:** $(find "$OUT/site" -type f 2>/dev/null | wc -l | tr -d ' ')"
  echo "- **Total size:** $(du -sh "$OUT/site" 2>/dev/null | cut -f1)"
  echo
  echo "## Platform fingerprint"
  echo '```'
  echo "$PLATFORMS"
  echo '```'
  echo
  echo "## Color palette (most frequent hex)"
  echo '```'
  echo "${COLORS:-none found}"
  echo '```'
  echo
  echo "## Font families"
  echo '```'
  echo "${FONTS:-none found}"
  echo '```'
  echo
  echo "## Google Fonts requested"
  echo '```'
  echo "${GFONTS:-none found}"
  echo '```'
  echo
  echo "## Next step"
  echo "Commit this whole \`$OUT/\` folder to the repo (track media >100MB with Git LFS),"
  echo "then ask Claude to turn it into a design-token spec + rebuild scaffold."
} > "$REPORT"

echo
echo ">> Done. Report: $REPORT"
echo ">> Review it, then commit the '$OUT/' folder to the repo for the rebuild."
