# Decisions

Every choice that shapes the pipeline, with the reason and the alternative that was
rejected. Items marked **UNCERTAIN-n** are unverified or unresolved - they are also
surfaced in every `report.json` under `uncertainties`.

## Rendering stack

**D1 - GSAP timeline inside headless Chromium, driven by `seek()`.**
Frames are captured by building the timeline paused and calling `tl.seek(n / fps)` for
each frame. This makes rendering deterministic: the same inputs produce the same frames
on any machine, at any CPU speed. Rejected: MediaRecorder (drops frames under load, not
reproducible), Remotion (a React toolchain and a licence question for a pipeline whose
scenes are already HTML), canvas/WebGL (worse text rendering, context-loss risk on 24/7
players).

**D2 - Plain HTML/CSS/SVG scenes, no canvas.**
DOM text keeps real kerning, hyphenation-free wrapping and font-feature support, and the
scene is inspectable - you can open `work/scene/scene.html` in a browser and see exactly
what will be encoded. A raster pipeline would have to reimplement typography.

**D3 - Templates are HTML with placeholders, not JavaScript.**
One small renderer (`compile-scene.mjs`) with explicit failures beats per-template code.
A new template is a folder with `scene.html`, `scene.css` and `template.json`, which is
what a future blueprint corpus needs.

**D4 - Fonts and GSAP are inlined into `scene.html`.**
The scene renders from a plain `file://` double-click - no server, no
`--allow-file-access-from-files`, no network. The cost is a ~113 KB HTML file before
assets; acceptable for a local artifact.

**D5 - Static per-weight Montserrat, not the Google CSS2 variable build.**
The CSS2 endpoint returns one variable woff2 for all weights and Chromium rendered
400-800 identically (measured 677.91 px at every weight for an `inline-block` span at
100 px). The Fontsource static instances render 677.91 / 688.00 / 699.81 / 712.41 /
726.31 px. `tests/vendor.test.mjs` asserts the widths are strictly increasing.

**D6 - 1920x1080, 25 fps, H.264 Main, yuv420p, no audio, faststart.**
The safe intersection for signage SoCs: hardware-decodable, B-frames allowed, 4:2:0 as
the decoders expect, silent, and playable before the file is fully read (slow SD cards).
High 10 and HEVC were rejected as too risky on cheap Android players.

## Composition

**D7 - The menu board is the base scene and is settled at t=0.**
A customer can walk up mid-loop and read the menu immediately; only decorative
micro-motion (photo `breath`, badge pulses) runs on the base scene. This also makes the
loop seam exact by construction.

**D8 - The promo is an overlay that fades back to zero before the loop restarts.**
`fadeIn 8.0 s`, `fadeOut 13.0 s`, `+0.6 s` = 13.6 s < 15 s. The alternative - the promo
as a second full scene - would require the board to fade out and back in, which reads as
a glitch on a loop.

**D9 - Only `opacity`, `transform` and `clip-path` are animated.**
Everything else forces layout every frame. `validatePlan` rejects other properties and
`tests/timeline.test.mjs` asserts the runtime never mentions them.

**D10 - `sweep` uses `scaleX` from the left edge and is never applied to text.**
`scale` cannot be anchored, so a sweep has to be `scaleX`; a scaled text run looks like a
rendering fault. Rules and dividers only.

**D11 - Legally readable elements never animate.**
Item names, prices, allergen codes and the legal strip are excluded from presets and from
the audit's tolerance.

## Colour

**D12 - Declared brand colours are used verbatim; only missing ones are extracted.**
Extraction (CIELAB k-means over the photos, `sharp` sampling) fills gaps when `brand.json`
declares nothing, which is the case for `examples/coffee-menu`. A declared colour is never
silently replaced.

**D13 - Contrast repairs move lightness only, in CIELAB.**
Hue and chroma are preserved so the food and the brand never shift colour. Every repair
is reported in the token audit (`repaired from X:1`).

**D14 - Two themes, never mixed.**
`dark` for indoor screens, `light` for daylight/window-facing. Ko Kitchen dark:
`bg #282F23`, `surface #1D231A`, `accent/accentFill/price #FF7D00`, `text #FFFFFF`,
`textHero #FEFAE0`, `textMuted/legal #B5BEA0`, `onAccent #1D231A`; light accent
`#C2410C`. The Schilder colours (`#063f32`, `#ff4a1f`, `#0b5a46`) are deliberately not
used - they belong to a different brand.

## Content and law

**D15 - The validator is the last line of defence, and it is strict.**
Closed schemas (an unknown field is an error - a typo like `allergenes` would otherwise
silently drop the declaration), banned health claims, banned discount wording, rejected
placeholders, duplicate ids, missing photos. Placeholder prices have reached real screens
in the wild; that check is not theoretical.

**D16 - Missing mandatory data is a hard failure, never a default.**
Prices, allergens, the VAT note and the photo are mandatory. `allergens: []` is a legal
declaration ("none"), a missing array is not - so it errors and an empty array warns.

**D17 - The membership promo carries no contract terms.**
The Ko Kitchen offer (47 EUR / 6 dishes, 69 EUR / 10 dishes per month, "An der Theke
anmelden") is confirmed. Minimum term, notice period and validity were never confirmed,
so `promo.terms` is absent and the template renders no terms line. **UNCERTAIN-8.**

## Pipeline

**D18 - Three matting backends, and the cheap one wins.**
`alpha` (use the alpha channel already in the file), `rembg` (BiRefNet), `none` (no
matting). All three produce the identical output layout. `auto` prefers `alpha`, then
`rembg`, then `none`. Measured on the 2-vCPU build box: **0.1 s/image** for `alpha`,
**70 s/image** for `rembg` (idle; 360-1479 s under load), ~1 s/image for `none`. Asking
the operator's retoucher for cutout PNGs therefore removes the model, the 972 MB
checkpoint and essentially all of the cost - so `alpha` is the recommended path and the
promo only falls back to the flat frame when the matte is unusable.

**D22 - A supplied cutout is trusted, not re-processed.**
For `alpha`, the alpha is thresholded for cleanliness (`clean_alpha`) but the colour is
never unpremultiplied or defringed and no backdrop is estimated - the retoucher's file is
the ground truth. For `rembg`, `defringe` removes the halo the original backdrop leaves.
`flat.jpg` (the menu-board hero) is the cutout flattened onto the declared brand
`surface`, passed by `adkit` as `--flat-backdrop`; the default is black.

**D19 - The matte quality gate is `coverage 0.05-0.95` and `touchesBorder === false`.**
A subject cut off at the frame edge cannot be fixed downstream, so it is reported rather
than silently used.

**D20 - `validate-video.sh` runs as a build stage, not as a `node:test` case.**
Asserting it in the test suite would double the encode time for no extra coverage; the
build already runs it and `report.json` records the result.

**D21 - Model weights are a runtime download, never committed.**
See UNCERTAIN-1. `doctor.mjs` reports whether the cache is populated and where.

## Defects the first end-to-end build exposed

None of these were visible from reading the code; every one of them needed a real run.

**D23 - GSAP does not render a zero-duration `.set()` that sits exactly at the playhead.**
The overlay's start state was written only as `tl.set(root, {opacity: 0}, 0)`. On the
first render at exactly `t=0` that set had not been applied, so frame 0 showed the promo
overlay at full opacity while every later frame was correct - the loop seam failed with
93% of samples differing. Measured: `stateAt(0).promo.opacity === 1` but
`stateAt(0.001).promo.opacity === 0`. The runtime now also calls `gsap.set()` at build
time, which writes the start state immediately. `tests/scene-runtime.test.mjs` guards it.

**D24 - The overflow check was measuring the wrong thing.**
`scrollHeight > clientHeight` is not a clipping test. Montserrat's ink box is 1.22em, so
any element with a tighter `line-height` (a display heading at `line-height: 1`) reports
an overflow even though nothing is hidden - it fired on every heading in the frame. The
audit now reports overflow only when the element clips its own content or a line box
escapes the nearest clipping ancestor, and reports a *warning* when the line box is
tighter than the font's ink box (a real typographic risk, but not a failure).

**D25 - The legal strip rendered its own markup as text.**
`renderTemplate` leaves a value unescaped only when its key ends in `Html`; the context
field was named `html`, so `<span class="legal-strip__key">ALLERGENE</span>` was printed
literally on the screen. Renamed to `bodyHtml`.

**D26 - The promo photo was never processed.**
`process_images.py` walked `items[]` only, so `promo.image` (the membership photo) had no
`cutout.png`/`flat.jpg` and the promo scene referenced a file that did not exist - the
promo rendered as an empty panel with a glow. The manifest now also accepts the promo
image (report `role: "promo"`), the validator checks that it exists, and `compile-scene`
copies it.

**D27 - `ls … | head -1` under `set -o pipefail` aborts the encoder.**
`FIRST=$(ls "$FRAMES"/frame-*.png | head -1)` makes `ls` take SIGPIPE once `head` exits,
so the pipeline returns 141 and `set -e` kills the script. It passed on a 5-frame test
directory and failed on the real 375-frame run - a race on the pipe buffer. Replaced with
a bash array glob. `tests/encode.test.mjs` covers the encode path.

**D28 - The palette could not find the image report.**
`adkit` sets `report.__dir`; `palette.mjs` read `report.__path` and called `path.dirname`
on `undefined`. Both keys are now accepted, and a missing directory warns instead of
throwing.

**D29 - A Node error code reached `process.exit`.**
`process.exit(failed[0].code || EXIT.RENDER)` - when a stage failed with a Node error the
code was the string `ERR_INVALID_ARG_TYPE`, which crashed the reporter itself and hid the
real failure. Non-integer codes now fall back to `EXIT.RENDER`.

**D30 - The photosensitivity check counted the average, not the gap.**
It divided the number of opacity beats by the loop duration, so a 5 Hz flicker in one
second averaged out to 0.33 Hz and passed. It now measures the shortest gap between
consecutive opacity transitions on the same element, and only presets that actually
change opacity count (the pulses and the clip/scale presets do not).

**D31 - The fixture generator was not reproducible.**
`tests/make-fixtures.py` seeded from Python's `hash(name)`, which is randomised per
process, so every regeneration produced different photos despite the docstring promising
reproducibility. Now seeded from `zlib.crc32`.

## UNCERTAIN

**UNCERTAIN-1 - BiRefNet checkpoint redistribution terms.**
BiRefNet's code is MIT, but the checkpoint's licence for redistribution is not clearly
stated. The weights are therefore downloaded into a cache
(`SCREEN_AD_MODEL_CACHE`, default `~/.cache/screen-ad-generator/models`) and are not
committed. If the intent is to ship this skill as an offline package, the checkpoint
licence must be confirmed first, or the matting backend must change. The `alpha` backend
exists partly so this question can be deferred: with supplied cutouts the checkpoint is
never needed. Verified: the cached file is 972,666,916 bytes, md5
`7a35a0141cbbc80de11d9c9a28f52697`, which matches the checksum rembg itself expects.

**UNCERTAIN-14 - rembg throughput on a contended box.**
70 s/image when idle, but 359 s and 1479 s per image while other work ran on the same
2-vCPU machine. A single-item measurement is therefore not a reliable budget; `alpha`
avoids the question entirely. The per-image cost is independent of source resolution
(rembg's BiRefNet input is a fixed 1024x1024), so a bigger photo is not slower.

**UNCERTAIN-15 - `report.matting` gained a third value.**
The frozen CLI spec listed `rembg:birefnet-general` and `none`; `alpha:input` was added
for the supplied-cutout backend, together with the per-item `alphaSource` field and the
`--flat-backdrop` flag. A consumer that switches on the old two-value enum must be
updated. Nothing else in the report schema changed.

**UNCERTAIN-2 - GSAP redistribution inside a published skill package.**
The GSAP standard licence permits commercial use but forbids redistribution "as part of
a competing tool". A skill package that vendors `gsap.min.js` sits close to that line.
GSAP is vendored rather than fetched from a CDN so rendering never touches the network.
If the package is published, either confirm with GreenSock or switch the vendored copy to
a documented first-run fetch.

**UNCERTAIN-3 - Example photography.**
`examples/*/photos/*.jpg` are synthetic images generated by `tests/make-fixtures.py`
(known subject boxes, deterministic). They are stand-ins, not photographs, and carry no
rights. Replacing them with real photography is a prerequisite for publishing anything
built from these examples.

**UNCERTAIN-4 - Prices in `examples/ko-kitchen/content.json`.**
The dish names and allergen codes reproduce the real printed board; the prices are
illustrative. The membership tiers (47 EUR / 6 dishes, 69 EUR / 10 dishes) are the real
offer. Do not treat the item prices as current.

**UNCERTAIN-5 - Contrast is measured on the rendered DOM, not on the encoded video.**
`checks.json` computes the effective contrast in the browser (with composited alpha over
the background). The encoder's 4:2:0 chroma subsampling can shift a thin glyph edge
slightly. Not measured here; the 4.5:1 floor has headroom over the 3:1 the WCAG large-text
rule requires.

**UNCERTAIN-6 - Text legibility over a photo is not verifiable automatically.**
The audit emits a warning when text sits over a photo or gradient. Whether a scrim is
strong enough is a judgement call on the rendered frame, and the build says so instead of
asserting a pass.

**UNCERTAIN-7 - Performance figures are from one machine.**
144 ms/frame on a 2-vCPU/11 GB box (375 frames = 54 s, whole build = 85 s, both measured
with two runs). A 32-core machine will be faster, but the figure is not measured there.
Frame output is deterministic (D32: 375/375 frames byte-identical between two renders, and
two full builds produce the same MP4 md5), so this is a throughput question, not a
correctness one. The per-frame figure is dominated by the 33 ms paint barrier; a machine
that does not need it would be about a third faster.

**UNCERTAIN-8 - Ko Kitchen membership contract terms.**
See D17. Minimum term, notice period and validity are unknown and deliberately absent.

**UNCERTAIN-9 - No real signage hardware was tested.**
The output passes ffprobe assertions and plays in Chromium, VLC and ffplay. It has not
been played on a physical signage player (BrightSign, Samsung Tizen SSSP, Android stick).
The profile is chosen to be maximally conservative, but "runs on the actual screen" is
unverified.

**UNCERTAIN-10 - Puppeteer-core version against the system Chromium.**
`puppeteer-core@25.12.0` drives Chromium 151 from the Playwright cache. The CDP protocol
is compatible at this pairing (verified: the timeline loads, frames render, screenshots
are correct), but a different Chromium major version is not tested. `doctor.mjs` reports
the version it found.

**UNCERTAIN-11 - Portrait and Google HTML5 profiles are stubs.**
Documented blockers in `docs/PROFILES.md`. `adkit build` fails immediately on them rather
than producing a broken file.

**UNCERTAIN-12 - The blueprint corpus is not implemented.**
`references/corpus-roadmap.md` records the intended steps and why they are deferred: a
blueprint library is only worth deriving from real creatives, and shipping unvalidated
blueprints would mean shipping guesses.

**UNCERTAIN-13 - Legal review.**
The generator enforces the mechanics it can check (price incl. VAT, a VAT note, an
allergen declaration, no health claims, no unsubstantiated "was/now" pricing). It is not
legal advice. The operator remains responsible for the correctness of the allergen data
and the price display under PAngV/LMIV.

**D32 - Frames are captured after a paint barrier, and that is what makes them deterministic.**
Two runs of the same `scene.html` produced MP4s with different md5s. The encoder was
exonerated first: the same frames encode to the same md5, with or without `-threads 1`.
The variance was Chromium raster: with identical `scene.html` (sha256
`62e061532e3f1144be23ba75a4500374`) and identical `plan.json`/`tokens.css`, 7 of 375
frames differed, always inside one 256x245 raster tile (x 1388..1644, y 563..808), max
delta 19/255. `page.evaluate` seeked the timeline and the next statement took the
screenshot, so the capture could run against a state the raster threads had not finished.
The capture loop now waits two `requestAnimationFrame` callbacks (with a 500 ms escape
hatch in case the compositor stops producing frames) between the seek and the screenshot.
Measured: 375/375 frames byte-identical, twice over, and two full builds produce the same
MP4 md5. Cost: 42 s to 54 s for 375 frames, which is exactly the 2 x 16.7 ms the two
animation frames cost.

**D32b - Photos are NOT pre-scaled to their display size. Tried, reverted.**
The first hypothesis was Skia's resampling of the downscaled hero photo (1400x1050 into a
720x624 box, scale 0.51). `compile-scene` was changed to write `hero.jpg` and
`subject-flat.jpg` at exactly the box size, cropping around the focal point, so that
`object-fit: cover` resolves to a 1:1 blit. It did not fix the determinism (still 7 of 375
frames, though the differing area shrank from a 256x245 tile to a few hundred pixels), and
a later run proved the paint barrier alone fixes it: with the raw full-resolution photo
referenced again, the barrier still gives 375/375. Meanwhile the pre-crop changed the
rendered photo visibly (lanczos3 instead of Chromium's downscale: 277,831 of the hero's
449,280 pixels differ, max delta 33/255) and saved no measurable time (54 s either way), so
it was reverted rather than kept as unrequested visual drift.
Also rejected: `--disable-partial-raster --disable-threaded-animation
--disable-checker-imaging --num-raster-threads=1`. They removed the variance but took a
375-frame render from 49 s to past the 300 s `protocolTimeout`. Adding
`--run-all-compositor-stages-before-draw` with `--disable-new-content-rendering-timeout`
then hung the very first screenshot for the full 300 s, so `launchArgs` is back to the
original set and the barrier does the work in userspace.

**D33 - The audit findings and the uncertainty list are deduplicated and populated.**
`summariseChecks` collected findings at three moments in the loop, so the same element was
reported up to three times with a different `t=` prefix: 49 warnings for 17 real problems.
It now deduplicates on the message and keeps the earliest time, and sorts by time.
`report.uncertainties` was declared in the report shape but never filled; `adkit build`
now populates it from what the run actually did (matting backend, DOM-vs-encoded contrast,
text over a photo, synthetic example photos) instead of leaving a consumer to guess which
statements in the report are verified facts.
