# Troubleshooting

Failures seen while building this skill, with the fix. Check `work/checks.json` and
`report.json` first - both name the offending element and the measured value.

## Browser

**`TimeoutError: Timed out after 30000 ms while waiting for the WS endpoint URL to appear in stdout!`**
Not a browser bug. Chromium needs to fork and start; on a loaded machine (load average
17-31 on 2 vCPUs, measured here) that exceeds 30 s. `render-frames.mjs` passes
`timeout: 120000`. If it still times out, check `uptime` - a machine at load 30 is the
cause, not the code.

**`Could not find a browser`** - `doctor.mjs` lists the search order:
`PUPPETEER_EXECUTABLE_PATH` -> `~/.cache/ms-playwright/chromium-*/chrome-linux/chrome` ->
`google-chrome` / `chromium` on `PATH`. Set `PUPPETEER_EXECUTABLE_PATH` to the binary.

**`window.__timeline` never appeared** - the scene HTML or the plan is broken. Open
`work/scene/scene.html` directly in a browser and read the console. Common causes: a
placeholder was not substituted, or `plan.json` failed `validatePlan`.

## Rendering

**Everything renders at 16 px and the board is unstyled.** A CSS parse error swallowed the
`:root` rule, so no custom properties resolved. This happened for real: the generated
`tokens.css` wrapped its contrast audit in `/* ... */` with inner `/* ... */`, and CSS
comments do not nest - the first inner `*/` closed the outer comment and the parser then
ate the `:root` block. `tokensToCss` now emits one flat comment per concern, and
`tests/tokens.test.mjs` asserts no nested comments and that every `var(--x)` used in any
stylesheet is defined.

**A font weight looks the same as every other weight.** The Google Fonts CSS2 endpoint
serves a single variable woff2 for all weights and Chromium renders 400-800 identically
(measured: 677.91 px at every weight for an `inline-block` span at 100 px). The vendored
fonts are the Fontsource static per-weight instances, which render 677.91 / 688.00 /
699.81 / 712.41 / 726.31 px. `tests/vendor.test.mjs` asserts the five widths are
strictly increasing. When measuring text, use an `inline-block` span - a block `<div>`
is viewport-width - and wait for layout, not `document.fonts.ready` (it resolves before
pending loads start).

**Two builds of the same inputs produce different MP4s.** Chromium's raster, not ffmpeg:
encode the same frames twice and the md5 matches, with or without `-threads 1`. The fix is
the two animation frames `render-frames.mjs` waits between `seek()` and the screenshot
(D32). If it comes back, first check that the frames themselves still match - render the
same `scene.html` twice and `cmp` the two `frames/` directories. Do not reach for the
raster flags (`--disable-partial-raster`, `--num-raster-threads=1`,
`--run-all-compositor-stages-before-draw`): they also remove the variance but they took a
render from 49 s to past the 300 s `protocolTimeout`, and the last pair hung the very
first screenshot.

**The loop seam fails.** A base-scene beat used an in/out preset, so the board is not
settled at t=0, or the overlay's `fadeOut` finishes after `duration`. See
`references/timeline-model.md`. Re-check without re-rendering:
`SCREEN_AD_SEAM_DIR=out/<name>/work/frames node --test tests/loop-seam.test.mjs`.

**Frames render but the video stutters on the screen.** Check the profile: `-g 50`
(2 s GOP) and `+faststart` matter on cheap players. Also confirm the file is H.264
Main / yuv420p - `scripts/validate-video.sh` asserts it.

**Frame 0 differs from every other frame / the loop seam fails at 93%.** The overlay was
visible at `t=0`. GSAP does not render a zero-duration `.set()` that sits exactly at the
playhead on the initial render, so the start state has to be applied with `gsap.set()` as
well - see `src/timeline.mjs` and `tests/scene-runtime.test.mjs`. If you change the
runtime, run that test.

**The legal strip prints `<span class="legal-strip__key">ALLERGENE</span>` as text.**
`renderTemplate` leaves a value raw only when its key ends in `Html`. Name the context
field `bodyHtml`, not `html`.

**The promo panel is empty (just the glow).** The promo photo was not processed. It is not
a menu item, so it needs `promo.image` in the manifest; check
`work/images/<promo stem>/flat.jpg` exists and that `work/scene/assets/<promo stem>/` was
copied.

**`encode: ffmpeg failed:` with empty stderr and exit 141.** SIGPIPE: `ls … | head -1`
under `set -o pipefail`. The script uses a bash array glob now. Exit 141 is always a
pipe problem, not an ffmpeg problem.

**`palette: The "path" argument must be of type string. Received undefined`.** The image
report directory was not set. `adkit` sets `__dir`; the standalone CLI sets `__path`.

## Content

**`missing required field "allergens"`** - an empty array is a valid declaration ("none"),
a missing array is not. Ask the operator; do not add `[]` on their behalf.

**`matches banned claim`** - the copy contains a health claim. Regulation (EC) 1924/2006
allows health claims only from the authorised list. Remove the word.

**`placeholder text`** - `€ –,–`, `TODO`, `XXX`, `TBD` or `lorem ipsum` reached the
content. Get the real value; this check exists because placeholder prices have shipped to
real screens.

**`photo not found`** - `items[].image` is resolved against `--photos`, not against the
content file. Check the filename and the directory.

## Images

**`coverage 0.01, expected 0.05-0.95`** - the matte is empty or the subject fills the
frame. Look at `work/images/<id>/preview.png`. A subject touching the border cannot be
fixed downstream; the promo falls back to the flat frame when `touchesBorder` is true.

**`--matting alpha needs a real alpha channel in every photo`** - some inputs are JPEGs
or PNGs with a fully opaque alpha. The message names them. Ask for those as PNG with the
background removed, or use `--matting none` (no cutout) / `--matting rembg` (local model).
A file only counts as a cutout when its alpha has both transparent and opaque pixels, so
an opaque PNG exported by mistake is caught here rather than becoming a full-frame
"cutout".

**The promo shows the flat frame instead of a cutout** - the matte was unusable
(`touchesBorder`, or coverage outside 0.05-0.95), or `--matting none` was used. Check
`work/images/<id>/preview.png`.

**rembg is slow** - ~70 s per image on 2 vCPU when the box is idle, and it degrades badly
under load (359 s and 1479 s per image were measured on a contended machine). Use
`--matting alpha` with cutout PNGs (0.1 s/image) or `--matting none`.

**rembg not importable** - `--matting none` still produces the full output layout, with
unmatted subjects. Install `requirements.txt` in a venv for matting.

**The model download fails** - `doctor.mjs` reports the cache path. Set
`SCREEN_AD_MODEL_CACHE` to a writable directory. The checkpoint is never committed here
(see `docs/DECISIONS.md`, UNCERTAIN-1).

## Encoding

**`ffprobe: command not found`** - `apt-get install -y ffmpeg` (or `brew install ffmpeg`).
Confirm `libx264` with `ffmpeg -hide_banner -encoders | grep libx264`.

**`expected 375 frames, found 300`** - the render was interrupted. Re-run with
`--keep-frames` and count the PNGs; the renderer is idempotent per frame.

**`moov atom not found before mdat`** - `+faststart` was lost. Use
`scripts/encode-video.sh` rather than calling ffmpeg by hand.
