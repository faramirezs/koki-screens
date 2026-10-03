# banner-lab v2 — status

**Open the gallery: <http://100.103.106.114:7788/>** (Tailscale). Vote, then
`node analyze.mjs --min 4 --min-pair 2` and read `report.md`.

Server runs as the supervised proc `labserve` on port 7788. If it is down:
`node serve.mjs --port 7788`.

v1 is archived in `v1-archive/` — renders plus `banners-v1.json`. It was rejected as too
static, and it was: its "motion" was a yoyo assemble/disassemble with no background of its
own, so between elements moving the frame barely changed.

## What v2 is

960 animated 1920×1080 banners in `banners.json`, sampled from an 11-axis design space. The
brief was: a high-impact background first, elements that slam in, keep breathing while you
read, then leave hard. That is now the literal timeline.

```
node audit.mjs     ->  960 banners / no defects
node motions.mjs   ->  18 motions, 0 failures  (every loop seam clean)
```

## The loop

12 seconds, one direction, no yoyo. The exit ends on the same off-canvas pose the entrance
started from, so `t=0` and `t=12` are visually identical and the loop closes with no jump.

| t | what |
|---|---|
| 0.0 – 1.5 | **background alone.** Three oversized gradient sheets sliding past each other on an `alternate` ease, never settling |
| 1.5 – 3.5 | copy panel wipes in, then every element slams onto it, staggered, overshooting (`back.out(2.2)`) |
| 3.5 – 9.5 | **readable hold.** Every element breathes on alternating half-cycles of a few px, landing back on the settled pose each time |
| 9.5 – 11.0 | thrown off the canvas the other way from the way they came in (`expo.in`), reverse order |
| 11.0 – 12.0 | background alone again |

The background is the user's own reference snippet, verbatim: `left:-50%; right:-50%`, an
`alternate` animation on `translateX(-25%) → translateX(25%)`. Layer durations are drawn from
**2/3/4/6 s only** — an `alternate` animation returns to its start after twice its duration, so
every layer must divide 6 s to close its own loop inside the 12 s banner loop.

`node shots.mjs strip --id s1-b0003 --n 12 --cols 4` renders the whole loop as 12 frames.

## Design space

16 palettes × 10 layouts × 10 backgrounds × 10 type treatments × 7 badges × 7 CTAs ×
7 product treatments × 10 decoration sets × 18 motions × 14 copy sets × 225 photos
≈ 1.3 × 10¹⁰ combinations. `build.mjs` samples it with a coverage-aware round-robin, so every
value of every axis appears roughly equally often.

- **Palettes** are 16 hand-tuned sets built only from the KoKitchen tokens in
  `../brand/tokens.css`: `{mode, slide[3], panel, ink, accent, accent2, muted, onAccent}`.
  Every pair the deck can produce passes **4.5:1** — `ink`/`muted`/`accent`/`accent2` on
  `panel`, and `onAccent` on `accent`. `#FF7D00` is only ever a fill behind dark text, never
  text on a light ground. `mode` picks the vignette, so there is no luminance guesswork.
- **Backgrounds**: `triSlide`, `duoSlide`, `quadSlide`, `softSlide`, `boldSlide`, `blendSlide`,
  `raySlide`, `stripeSlide`, `dotSlide`, `meshSlide`.
- **Layouts**: `productLeft`, `productRight`, `centerStack`, `productBehind`, `bottomBand`,
  `diagonalSplit`, `circleMask`, `fullBleed`, `cornerScrim`, `topBanner`.
- **Type**: `whiteCaps`, `twoTone`, `outline`, `ribbonKicker`, `boxed`, `mixedBox`, `stacked`,
  `shadowPop`, `editorial`, `ticket`.
- **Copy** (14 sets) is paired to photo subjects by category 6 times out of 7; the seventh is
  free, so the copy–photo pairing stays a learnable axis instead of a constant.

The bold risk lives in the slide colours, not in the text contrast. Text is never asked to
survive a moving background.

## The one rule that makes a moving background safe

**Text only ever sits on `--panel`.** `.bn__copy` paints its own fully opaque background, so
every headline's contrast is a property of the palette and not of whatever colour happens to
be sliding past. The panel is deliberately not translucent: any show-through makes contrast a
function of the photo behind it, and over a high-contrast food shot it reads as a smudge
rather than as depth. Badges sit outside the panel, so each one paints its own opaque fill and
picks its own text colour against that fill.

## Photos

Openverse (`api.openverse.org`), filtered to **commercially usable** licences only, landscape,
at least 1400 px wide. `photos2.json` records title, creator, licence and source URL per file,
and every file is dropped or kept explicitly (`"keep": false` plus a `drop` reason), so the
pool is an argument rather than a pile. 259 candidates downloaded, 225 kept, 34 dropped as
off-subject, flat illustration or near-duplicate; the deck uses 221 of the 225. `node
contact.mjs` renders `photos2-sheet.jpg`.

Cutouts come from `rembg` (`isnet-general-use`; BiRefNet OOMs this 11 GB box), via
`../screen-ad-generator/.venv/bin/python cutout.py`. Two post-steps matter: alpha below ~9% is
zeroed (the model leaks a large low-alpha ghost, which the `cutoutFloat` drop-shadow amplifies
into a visible grey box), and the result is cropped to its alpha bounding box (the model keeps
the source framing, so a subject occupying a band of the photo would otherwise render as mostly
empty canvas and come out small). All 259 pool files were matted, so all **221** banners whose
product treatment needs alpha (`cutoutFloat`, `arch`) render with a real cutout and none falls
back to `framed`. Without a cutout the renderer degrades to `framed` rather than breaking, so a
pool with no cutouts quietly loses two of its seven product treatments instead of failing
loudly.

**Why not Unsplash.** The brief asked for Unsplash. Unsplash's API needs an access key, their
web app sits behind a bot check, and their CDN only serves ids you already know. Discovering
those ids through Bing image search was tried and does not work: every query returns the same
seven generic "about Unsplash" images, so the pool it produced was not food at all. Openverse
needs no key, returns real licences, and its results are nearly all Wikimedia Commons — the
same provenance as v1's pool, but with licence metadata that can be checked. **If you have an
Unsplash access key, `fetch_photos.py` is the only file that has to change.**

## Feedback model

A vote is not stored against a banner id alone. `POST /feedback` writes the verdict *plus the
banner's full axis vector* to `feedback.jsonl`. `analyze.mjs` joins votes to axis values and
ranks by the Wilson lower bound of the win rate (love = 1, good = 0.6, maybe = 0.3, no = 0),
which keeps a 5-vote 100 % combination from outranking a 40-vote 80 % one. Output: `report.md`
— best and worst single axis values and pairs, with `--min` / `--min-pair` sample floors.

`feedback.jsonl` currently holds **no votes**. `node gtest.mjs` writes test votes; delete the
file after running it.

## Files

- `space.mjs` — every axis value and nothing else. No filesystem, so the browser imports the
  same constants the sampler used; if these two ever disagreed, a banner would render as
  something other than what was sampled.
- `gen.mjs` — the sampler. Re-exports `space.mjs`, adds `generate()` / `loadPhotos()`.
- `lab.js` — `renderBanner`, `buildMotion`, `settle`, `refit`, `measure`, `fitType`, `fitCopy`,
  `dodgeCopy`, `offPose`. The only place that touches the DOM.
- `lab.css` — the design system: `@font-face`, `.bn` shell, `--u` unit, sliding backgrounds,
  decor, product treatments, the copy panel, type, CTAs, badges, layouts.
- `build.mjs` — multi-seed builder → `banners.json`.
- `gallery.{html,js,css}` — voting UI: 120-card pages, lazy mount, deterministic shuffle, axis
  filters, per-card note, motion pause, export.
- `analyze.mjs` — votes → `report.md`.
- `audit.mjs` / `audit.html` — renders every banner off-screen and measures text contrast
  against the surface it is actually painted on, overflow, safe area, copy/media collision and
  whether the background layers are animating at all.
- `motions.mjs` / `motions.html` — builds all 18 motions and asserts every element is either in
  the same pose at both ends of the loop or invisible at both.
- `sheet.html`, `one.html`, `strip.html` — contact sheet, single banner, motion arc.
- `shots.mjs`, `singles.mjs` — screenshot harnesses (Puppeteer).
- `serve.mjs` — static server + `POST /feedback` + `GET /feedback`.

## Known limits

- **The cutout mattes are imperfect.** `isnet-general-use` on a busy food photo can leave a few
  stray opaque specks away from the subject — a crumb the model kept, or a fragment of the
  plate. They read as crumbs at gallery size and as small smudges at 100%. Zeroing alpha below
  ~9% and cropping to a despeckled bounding box removed the large ghost rectangle that used to
  show up as a grey box behind `cutoutFloat`, but a connected-component pass would be needed to
  drop the last few specks. `arch` and `circleMask` hide them better than `cutoutFloat` does,
  because they crop to a shape.
- The audit measures text against the surfaces it can see in the DOM, so text over a photo
  (`fullBleed`, `cornerScrim`, `productBehind`) is judged against its panel, not against the
  photo pixels underneath.
- Decorations that are gradients report a transparent `backgroundColor`, so the audit
  composites them at zero. `dodgeCopy` still keeps them clear of the copy.
- `polaroid` and `tiltedCard` rotate the media. Any layout that also needs to offset the media
  must use the standalone `translate` property, not `transform` — same specificity, and the
  later rule silently wins.

## Bugs fixed this round (do not regress)

1. `getBoundingClientRect()` returns transform-**scaled** px while `getComputedStyle` padding is
   unscaled, so any banner previewed through `transform: scale()` (the sheet *and* the gallery)
   collapsed its type to a sliver. `stackHeight()` uses `offsetTop`/`offsetHeight`; `fitCopy`
   uses `bn.offsetHeight`.
2. The fit pass is shrink-only and ran twice (once before the webfont loaded), so the two runs
   compounded. `clearFit()` resets every inline size and `refit()` is the single entry point;
   `settle(bn)` awaits `document.fonts.ready` then refits.
3. A badge centres its label, so an over-wide label overflows both edges and `scrollWidth`
   reports the box plus half the overflow on each side — a number that never drops below the
   limit, so a shrink loop against it drove the type to the floor. Badges are measured with
   `measureText` against an inscribed `--fit` fraction.
4. `.bn--lay-circleMask .bn__media { transform: translateY(-50%) }` outranked
   `.bn--prod-polaroid { transform: rotate(2.6deg) }` — same specificity, later in the file —
   and silently un-rotated polaroid and tiltedCard on that one layout.
5. `.mjs` served as `application/octet-stream` → the module import failed silently and every
   Puppeteer script timed out at 120 s. `serve.mjs` now maps `.mjs` to `text/javascript`.
6. `parseFloat("47%")` on `getComputedStyle().maxHeight` gave `47px`, so `fitCopy` shrank every
   banner's type to a sliver.
7. The timeline was ~9.2 s, not 12, so `seek(12)` wrapped to frame 0 and the "background alone"
   tail never existed. Fixed with a 0.01 s spacer tween that pins the duration.
8. `measure()` flagged `display:none` elements as safe-area failures and `audit.html` counted
   `badge:none` as 16 contrast failures.
9. A cutout product override could put a "SWEET" headline over a rack of ribs; it now prefers a
   cutout inside the allowed category.
