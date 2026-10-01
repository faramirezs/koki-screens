#!/usr/bin/env bash
# validate-video.sh — ffprobe assertions on the encoded MP4.
#
#   scripts/validate-video.sh --video out/x.mp4 [--width 1920] [--height 1080] [--fps 25] [--duration 15]
#
# Every assertion is a hard requirement of the master output profile. Exit 0 = the file
# is shippable, 1 = an assertion failed, 2 = ffprobe missing.
set -uo pipefail

VIDEO=""; W=1920; H=1080; FPS=25; DUR=15
while [ $# -gt 0 ]; do
  case "$1" in
    --video) VIDEO="$2"; shift 2 ;;
    --width) W="$2"; shift 2 ;;
    --height) H="$2"; shift 2 ;;
    --fps) FPS="$2"; shift 2 ;;
    --duration) DUR="$2"; shift 2 ;;
    *) echo "unknown option: $1" >&2; exit 3 ;;
  esac
done
[ -z "$VIDEO" ] && { echo "usage: validate-video.sh --video FILE" >&2; exit 3; }
command -v ffprobe >/dev/null 2>&1 || { echo "ffprobe not found (apt-get install -y ffmpeg)" >&2; exit 2; }
[ -f "$VIDEO" ] || { echo "no such file: $VIDEO" >&2; exit 3; }

fail=0
ok()   { printf '  ok  %s\n' "$1"; }
bad()  { printf '  FAIL %s\n' "$1"; fail=1; }

probe() { ffprobe -v error -select_streams "$1" -show_entries "$2" -of default=noprint_wrappers=1:nokey=1 "$VIDEO"; }

V_W=$(probe v:0 stream=width)
V_H=$(probe v:0 stream=height)
V_CODEC=$(probe v:0 stream=codec_name)
V_PROFILE=$(probe v:0 stream=profile)
V_PIX=$(probe v:0 stream=pix_fmt)
V_RATE=$(probe v:0 stream=r_frame_rate)
V_FRAMES=$(probe v:0 stream=nb_frames)
V_DUR=$(ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "$VIDEO")
A_STREAMS=$(ffprobe -v error -select_streams a -show_entries stream=index -of csv=p=0 "$VIDEO" | wc -l | tr -d ' ')

[ "$V_W" = "$W" ] && [ "$V_H" = "$H" ] && ok "resolution ${V_W}x${V_H}" || bad "resolution ${V_W}x${V_H}, expected ${W}x${H}"
[ "$V_CODEC" = "h264" ] && ok "codec h264" || bad "codec $V_CODEC, expected h264"
[ "$V_PROFILE" = "Main" ] && ok "profile Main" || bad "profile $V_PROFILE, expected Main"
[ "$V_PIX" = "yuv420p" ] && ok "pix_fmt yuv420p" || bad "pix_fmt $V_PIX, expected yuv420p"
[ "$V_RATE" = "${FPS}/1" ] && ok "frame rate ${V_RATE}" || bad "frame rate ${V_RATE}, expected ${FPS}/1"
[ "$A_STREAMS" = "0" ] && ok "no audio stream" || bad "$A_STREAMS audio stream(s), the profile is silent"

EXPECTED_FRAMES=$((FPS * DUR))
if [ "$V_FRAMES" = "$EXPECTED_FRAMES" ]; then
  ok "frame count ${V_FRAMES}"
else
  bad "frame count ${V_FRAMES}, expected ${EXPECTED_FRAMES} (${DUR}s x ${FPS}fps)"
fi

DUR_OK=$(python3 - "$V_DUR" "$DUR" <<'PY'
import sys
d, want = float(sys.argv[1]), float(sys.argv[2])
tol = 1.0 / 25 + 1e-6
print("yes" if abs(d - want) <= tol else "no")
PY
)
[ "$DUR_OK" = "yes" ] && ok "duration ${V_DUR}s (±1 frame of ${DUR}s)" || bad "duration ${V_DUR}s, expected ${DUR}s ±1 frame"

# faststart: the moov atom must appear before mdat.
FAST=$(python3 - "$VIDEO" <<'PY'
import sys
data = open(sys.argv[1], "rb").read(200000)
moov, mdat = data.find(b"moov"), data.find(b"mdat")
print("yes" if moov != -1 and (mdat == -1 or moov < mdat) else "no")
PY
)
[ "$FAST" = "yes" ] && ok "faststart (moov before mdat)" || bad "moov atom is not at the front — the player must read the whole file first"

if [ "$fail" = "0" ]; then
  echo "  -> $VIDEO passes the landscape-1080p profile"
else
  echo "  -> $VIDEO FAILS the profile"
fi
exit $fail
