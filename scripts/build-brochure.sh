#!/bin/sh
# Render docs/brochure/group-brochure.html to assets/smith-adams-group-brochure.pdf.
# Needs the local dev server (scripts/dev-server.mjs) on :5199 so /fonts, /assets work.
set -e
cd "$(dirname "$0")/.."
PROFILE=$(mktemp -d)
"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" --headless=new --disable-gpu \
  --no-pdf-header-footer --user-data-dir="$PROFILE" --virtual-time-budget=8000 \
  --print-to-pdf=assets/smith-adams-group-brochure.pdf \
  http://localhost:5199/docs/brochure/group-brochure.html 2>/dev/null
rm -rf "$PROFILE"
ls -la assets/smith-adams-group-brochure.pdf
