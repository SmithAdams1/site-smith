#!/bin/bash
# Re-encode the site's hero videos for web delivery.
# Ambient background loops: no audio, capped resolution, CRF-based.
# Produces WebM/VP9 (primary) + MP4/H.264 (fallback, +faststart) + poster.
set -u
cd "$(dirname "$0")/.." || exit 1
OUT=media

log() { printf '\n=== %s\n' "$1"; }

# ---- 1. Desktop hero: 1920x802 wide, from the 53MB 21Mbps master ----
SRC_D="urban-collections/Smith_e_Adams_Site_20s_Wide803_h264_03.mp4"
log "desktop hero (from $(du -h "$SRC_D" | cut -f1))"
# MP4/H.264 fallback — CRF 27 is transparent enough for overlaid background footage
ffmpeg -y -v error -i "$SRC_D" -an \
  -c:v libx264 -crf 27 -preset slow -profile:v main -pix_fmt yuv420p \
  -movflags +faststart "$OUT/hero-desktop.mp4"
# WebM/VP9 primary
ffmpeg -y -v error -i "$SRC_D" -an \
  -c:v libvpx-vp9 -crf 36 -b:v 0 -row-mt 1 -deadline good -cpu-used 3 \
  "$OUT/hero-desktop.webm"
# Poster from a representative frame (2s in, not black frame 0)
ffmpeg -y -v error -ss 2 -i "$SRC_D" -frames:v 1 -q:v 3 "$OUT/hero-desktop-poster.jpg"

# ---- 2. Mobile hero: 1080x1200 portrait, from the 39MB 15.6Mbps master ----
SRC_M="Smith_e_Adams_Site_20s_1080x1200_h264_03.mp4"
log "mobile hero (from $(du -h "$SRC_M" | cut -f1))"
# Mobile gets a tighter budget: cap width at 720 (displayed small, on cellular)
ffmpeg -y -v error -i "$SRC_M" -an -vf "scale=720:-2" \
  -c:v libx264 -crf 28 -preset slow -profile:v main -pix_fmt yuv420p \
  -movflags +faststart "$OUT/hero-mobile.mp4"
ffmpeg -y -v error -i "$SRC_M" -an -vf "scale=720:-2" \
  -c:v libvpx-vp9 -crf 38 -b:v 0 -row-mt 1 -deadline good -cpu-used 3 \
  "$OUT/hero-mobile.webm"
ffmpeg -y -v error -ss 2 -i "$SRC_M" -frames:v 1 -q:v 4 -vf "scale=720:-2" \
  "$OUT/hero-mobile-poster.jpg"

# ---- 3. Real Estate hero: already lean (2.8MB), just add WebM + poster ----
SRC_R="real-estate-hero.mp4"
log "real estate hero (from $(du -h "$SRC_R" | cut -f1))"
ffmpeg -y -v error -i "$SRC_R" -an \
  -c:v libvpx-vp9 -crf 37 -b:v 0 -row-mt 1 -deadline good -cpu-used 3 \
  "$OUT/real-estate-hero.webm"
# Keep a faststart-ed mp4 copy too (the original may lack the moov-first flag)
ffmpeg -y -v error -i "$SRC_R" -an -c:v copy -movflags +faststart \
  "$OUT/real-estate-hero.mp4"

log "results"
ls -lh "$OUT"/*.mp4 "$OUT"/*.webm "$OUT"/*.jpg 2>/dev/null | awk '{printf "  %-8s %s\n", $5, $9}'
