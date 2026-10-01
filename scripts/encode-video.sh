#!/usr/bin/env bash
# encode-video.sh — PNG frame sequence -> H.264 MP4 for signage players.
#
#   scripts/encode-video.sh --frames DIR --out FILE [--fps 25] [--crf 18] [--preset medium]
#
# The settings are deliberately conservative. Cheap Android signage sticks and older
# SoC players (the kind that run a 24/7 menu board) decode H.264 Main / yuv420p / level
# 4.0 without falling back to software; High 10 and HEVC do not survive that trip.
# `-an` because screens are muted anyway and a silent audio track trips some players.
# `+faststart` moves the moov atom to the front so the file can start playing before it
# is fully read — relevant for players that stream from a slow SD card.
set -euo pipefail

FRAMES=""; OUT=""; FPS=25; CRF=18; PRESET=medium; LEVEL=4.0
while [ $# -gt 0 ]; do
  case "$1" in
    --frames) FRAMES="$2"; shift 2 ;;
    --out) OUT="$2"; shift 2 ;;
    --fps) FPS="$2"; shift 2 ;;
    --crf) CRF="$2"; shift 2 ;;
    --preset) PRESET="$2"; shift 2 ;;
    --level) LEVEL="$2"; shift 2 ;;
    *) echo "unknown option: $1" >&2; exit 3 ;;
  esac
done

if [ -z "$FRAMES" ] || [ -z "$OUT" ]; then
  echo "usage: encode-video.sh --frames DIR --out FILE [--fps 25] [--crf 18] [--preset medium]" >&2
  exit 3
fi
if ! command -v ffmpeg >/dev/null 2>&1; then
  echo "ffmpeg not found. Install it:  sudo apt-get install -y ffmpeg   (or: brew install ffmpeg)" >&2
  exit 2
fi
if ! ls "$FRAMES"/frame-*.png >/dev/null 2>&1; then
  echo "no frames in $FRAMES (expected frame-0000.png ...)" >&2
  exit 3
fi

FRAME_FILES=("$FRAMES"/frame-*.png)
FIRST="${FRAME_FILES[0]}"
FRAME_COUNT=${#FRAME_FILES[@]}
echo "encoding $FRAME_COUNT frames from $FRAMES at ${FPS}fps -> $OUT"

ffmpeg -hide_banner -loglevel error -stats -y \
  -framerate "$FPS" -start_number 0 -i "$FRAMES/frame-%04d.png" \
  -c:v libx264 -profile:v main -level:v "$LEVEL" -pix_fmt yuv420p \
  -crf "$CRF" -preset "$PRESET" -g $((FPS * 2)) -keyint_min $((FPS * 2)) -sc_threshold 0 \
  -movflags +faststart -an -r "$FPS" \
  "$OUT"

# Poster: frame 0 as a still, for players that show an image instead of a video.
if [ -n "${POSTER:-}" ]; then
  ffmpeg -hide_banner -loglevel error -y -i "$FIRST" -q:v 3 "$POSTER"
  echo "poster written to $POSTER"
fi

echo "wrote $OUT ($(du -h "$OUT" | cut -f1))"
