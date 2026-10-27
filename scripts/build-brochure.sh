#!/bin/sh
# Render the brochures to PDF: group (default) -> assets/smith-adams-group-brochure.pdf,
# pm -> assets/sa-property-management-brochure.pdf.
# Needs the local dev server (scripts/dev-server.mjs) on :5199 so /fonts, /assets work.
set -e
cd "$(dirname "$0")/.."
curl -sf -o /dev/null http://localhost:5199/ || { echo "dev server not running on :5199 (scripts/dev-server.mjs)" >&2; exit 1; }
PROFILE=$(mktemp -d)
SRC=group-brochure.html; OUT=assets/smith-adams-group-brochure.pdf
if [ "$1" = pm ]; then SRC=pm-brochure.html; OUT=assets/sa-property-management-brochure.pdf; fi
"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" --headless=new --disable-gpu \
  --no-pdf-header-footer --user-data-dir="$PROFILE" --virtual-time-budget=8000 \
  --print-to-pdf="$OUT" \
  "http://localhost:5199/docs/brochure/$SRC" 2>/dev/null
rm -rf "$PROFILE"
ls -la "$OUT"
