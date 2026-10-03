# banner-lab v2 — status

**Open the gallery: <http://100.103.106.114:7788/>** (Tailscale). Pick a Mode, vote, then
`node analyze.mjs --min 4 --min-pair 2` and read `report.md`.

Server runs as the supervised proc `labserve` on port 7788. If it is down:
`node serve.mjs --port 7788`.

v1 is archived in `v1-archive/` — renders plus `banners-v1.json`. It was rejected as too
static, and it was: its "motion" was a yoyo assemble/disassemble with no background of its
own, so between elements moving the frame barely changed.

## What v2 is

2050 animated 1920×1080 banners in `banners.json`, in four **Modes**. The brief was: a
high-impact background first, elements that slam in, keep breathing while you read, then leave
hard. That is now the literal timeline.

```
node build.mjs --per-seed 160 --seeds 1,2,3,4,5,6
  composition  960 banners  varies: paletteName layout type badge cta product decor
  background    40 banners  varies: bg bgEnergy                 (all 40)
  motion        90 banners  varies: motion roleMotion           (all 90)
  scene        960 banners  varies: everything
node audit.mjs   ->  2050 banners / no defects
node motions.mjs ->  22 combinations, 0 failures  (every loop seam clean)
node gtest.mjs   ->  all gallery checks passed
```

## Modes

The scene deck varies thirteen axes at once, which finds a Banner you like but cannot tell you
*why*. A **Mode** is the question a deck asks, expressed as the axes it varies; everything else is
pinned to the **Reference Scene**, so two Banners in one deck differ in the axis under study and
nothing else. One renderer serves all four — a Mode decides only whether a Timeline is built and
whether the background sheets run. See `docs/adr/0003`.

| Mode | Timeline | sheets | foreground | varies |
|---|---|---|---|---|
| `composition` | none | held | still | 7 axes |
| `background` | none | running | still | 2 axes |
| `motion` | built | running | moving | 2 axes |
| `scene` | built | running | moving | 13 axes |

Composition mode is a still for free: every Element already sits at its settled pose in CSS and the
Timeline is only what moves it away, so not building one *is* the settled Composition.

**Votes are never pooled across Modes.** They answer different questions. `report.md` has one
section per Mode.

**The Reference Scene is a placeholder** — declared in `space.mjs`, not derived, because no Votes
exist yet. Re-point it at the winner of Composition mode once that Mode has Votes.

## The loop

12 seconds, one direction, no yoyo. The exit ends on the same off-canvas pose the entrance
started from, so `t=0` and `t=12` are visually identical and the loop closes with no jump.

The loop is told in five **Phases**, declared once in `space.mjs` as `PHASES`. Both the GSAP
timeline and the background-energy curves are derived from that one object, so a curve cannot
drift away from the timeline it is meant to follow.

| Phase | t | what |
|---|---|---|
| **Intro** | 0.0 – 1.5 | background alone. Three oversized gradient sheets sliding past each other on an `alternate` ease, never settling |
| **Reveal** | 1.5 – 3.9 | copy panel wipes in, then every element slams onto it, staggered, overshooting (`back.out(2.2)`) |
| **Hold** | 3.9 – 9.5 | **settled and readable.** Every element breathes on alternating half-cycles of a few px, landing back on the settled pose each time |
| **Exit** | 9.5 – 11.1 | thrown off the canvas the other way from the way they came in (`expo.in`), reverse order |
| **Tail** | 11.1 – 12.0 | background alone again, which is what the loop opens on |

The Reveal and Exit boundaries move with the size of the cast (25 ± 4 elements), so the two
interior numbers above are the timeline's own, not the design's. The five `PHASES` boundaries
are the design's, and those are what the energy curves are drawn against.

The background is the user's own reference snippet, verbatim: `left:-50%; right:-50%`, an
`alternate` animation on `translateX(-25%) → translateX(25%)`. Layer durations are drawn from
**2/3/4/6 s only** — an `alternate` animation returns to its start after twice its duration, so
every layer must divide 6 s to close its own loop inside the 12 s banner loop. How *far* each
sheet travels is now scaled by `--energy`, which follows the Phase.

`node shots.mjs strip --id s1-b0003 --n 12 --cols 4` renders the whole loop as 12 frames.

## Design space

16 palettes × 10 layouts × 10 backgrounds × 4 background energies × 10 type treatments ×
7 badges × 7 CTAs × 7 product treatments × 10 decoration sets × 18 motions × 5 role-motion
distributions × 14 copy sets × 225 photos ≈ 6.2 × 10¹³ combinations. `build.mjs` samples it
with a coverage-aware round-robin, so every value of every axis appears roughly equally often.

`space.mjs` exports `AXES`, and the build summary, the gallery filters and `analyze.mjs` all
import it, so an axis cannot be visible in one place and missing from another.

- **Palettes** are 16 hand-tuned sets built only from the KoKitchen tokens in
  `../brand/tokens.css`: `{mode, slide[3], panel, ink, accent, accent2, muted, onAccent}`.
  Every pair the deck can produce passes **4.5:1** — `ink`/`muted`/`accent`/`accent2` on
  `panel`, and `onAccent` on `accent`. `#FF7D00` is only ever a fill behind dark text, never
  text on a light ground. `mode` picks the vignette, so there is no luminance guesswork.
- **Backgrounds**: `triSlide`, `duoSlide`, `quadSlide`, `softSlide`, `boldSlide`, `blendSlide`,
  `raySlide`, `stripeSlide`, `dotSlide`, `meshSlide`.
- **Background energy** (4): `flat` (control), `swell`, `swellHard`, `breathe`. How far the
  sheets travel during each Phase. Measured on the deck: `swell` runs 1.00 → 0.50 → **0.22** →
  0.48 → 1.00 across Intro/Reveal/Hold/Exit/Tail, `swellHard` reaches **0.07** at Hold, and
  `breathe` recovers to 0.78 mid-Hold before dipping again. The sheets never stop; they stop
  competing with the copy.
- **Motions** (18) are the Motion family: one gesture applied to every Element at once. Each
  Element has three states — Enter, Idle, Exit.
- **Role motion** (5): `uniform` (control), `hierarchy`, `textLead`, `productLead`, `hush`.
  How much of the family each Role takes. Measured on `s1-b0001`: `hierarchy` gives the copy
  ×0.72 and the badge ×1.30, `hush` ×0.55 on the copy, `uniform` ×1.00 everywhere.
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
  something other than what was sampled. Also holds `PHASES`, `BG_ENERGY_CURVES`,
  `ROLE_MOTION` and `AXES` — the single source of truth for the timeline's boundaries, the
  energy curves, the per-Role shares and the list of axes.
- `GLOSSARY.md` — the language of this context. The shared terms (Banner, Scene, Element,
  Role, Placement, Motion family, Choreography, Preset, Blueprint) live in
  [`../GLOSSARY-MAP.md`](../GLOSSARY-MAP.md); this file only defines what is specific to the
  lab.
- `docs/adr/` — the two decisions a future reader would otherwise want to undo: why the
  background's energy follows the Phase, and why the Motion family is shared while its
  distribution across Roles is a separate axis.
- `gen.mjs` — the sampler. Re-exports `space.mjs`, adds `generate()` / `loadPhotos()`.
- `lab.js` — `renderBanner`, `buildMotion`, `settle`, `refit`, `measure`, `fitType`, `fitCopy`,
  `dodgeCopy`, `offPose`. The only place that touches the DOM.
- `lab.css` — the design system: `@font-face`, `.bn` shell, `--u` unit, sliding backgrounds,
  decor, product treatments, the copy panel, type, CTAs, badges, layouts.
- `build.mjs` — multi-seed, multi-Mode builder → `banners.json`. Prints, per Mode, what it varied
  and what it held, and flags any axis it claimed to hold that is not in fact constant.
- `gallery.{html,js,css}` — voting UI: mode bar, 120-card pages, lazy mount, deterministic shuffle,
  per-Mode axis filters, per-card note, motion pause, export.
- `analyze.mjs` — votes → `report.md`, one section per Mode, never pooled.
- `audit.mjs` / `audit.html` — renders every banner off-screen and measures text contrast
  against the surface it is actually painted on, overflow, safe area, copy/media collision and
  whether the background layers are animating at all. It never builds a Timeline, so it has always
  measured the settled Composition and needed no change for Modes.
- `motions.mjs` / `motions.html` — builds one banner per value of every axis that can change
  the motion, and asserts every element is either in the same pose at both ends of the loop or
  invisible at both, and that the background's energy curve closes on itself. Breaking one
  curve's final stop produces exactly the four failures you would expect, so the check has
  teeth.
- `gtest.mjs` — mounts the gallery, switches Mode, votes, and asserts both the Mode's behaviour
  (sheets held in `composition`, running in `background`, copy moving in `motion`) and the shape of
  the Vote that lands in `feedback.jsonl`. Run it as `node gtest.mjs && rm -f feedback.jsonl`.
- `sheet.html`, `one.html`, `strip.html` — contact sheet, single banner, motion arc. All three go
  through `animate()`, so a still Mode renders as a still.
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
- **The background's slide phase is not seekable.** `--energy` is driven by the timeline, so a
  frozen frame has the right *energy* for its Phase, but each sheet's `translateX` is still a
  CSS animation on the wall clock. A contact sheet therefore shows each card mid-slide at an
  arbitrary position. That is cosmetically harmless — every frame of a looping background is a
  valid frame — but it means two screenshots of the same banner are not pixel-comparable
  unless the slide animations are paused and seeked too, which `shots.mjs` does not do.
- **Screenshots on this box are not reproducible at all.** Two captures of a completely static
  page — one `linear-gradient` div, no animation anywhere — differ across **98.7%** of their
  pixels (mean 22/255) on this software rasterizer. Frame-to-frame pixel diffs therefore cannot
  decide whether anything moved, and the Mode behaviour above is asserted from DOM and animation
  state (`getComputedStyle().transform`, `Animation.playState`) instead, which is deterministic.
  Any earlier claim resting on a pixel diff should be treated as unsupported.
- **The Reference Scene is a placeholder.** Background and Motion mode hold it fixed, so their
  results are only as meaningful as that one composition — and it is declared, not derived,
  because no Votes exist yet. Re-point `REFERENCE` in `space.mjs` at the winner of Composition
  mode once that Mode has Votes. Nothing else changes; no Mode knows which values are in it.

## Bugs fixed in the v2 round (do not regress)

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
10. `lab.js` documented the loop as `0.0-0.3 / 0.3-1.7 / 1.7-8.3 / 8.3-9.6` while the constants
    underneath said `1.5 / 3.9 / 9.5 / 11.1` — the comment had drifted a whole revision behind
    the code. Both now derive from `PHASES`, so there is only one number to be wrong.
11. `AXES` was copy-pasted into `build.mjs`, `gallery.js` and `analyze.mjs`. Adding an axis to
    two of the three would have hidden it from the third with no error at all. It is now
    exported once from `space.mjs`.
12. The background energy was first built as a CSS `@keyframes` on `--energy`. That worked, and
    the seam check passed — but a CSS animation runs on the wall clock, so `seek(t)` could not
    freeze it, and every contact sheet and motion strip showed whatever energy the wall clock
    happened to be at rather than the energy of the Phase being illustrated. It is now a tween
    on the GSAP timeline, and `motions.mjs` asserts the curve closes on itself.

## Bugs fixed in the Modes round (do not regress)

13. **`gallery.js` kept its own hand-written copy of the axis list.** It was a fourth copy, after
    `build.mjs`, `gallery.js`'s filters and `analyze.mjs`, and it was the one that mattered: it
    feeds both the text on every card and the `axes` field of every Vote. When `bgEnergy` and
    `roleMotion` were added, `AXES` was updated and this list was not, so every card printed
    `bgEnergy undefined` and every Vote stored a vector missing two fields — and `gtest.mjs`
    passed the whole time, because it only checked that a Vote had been *written*, never what was
    in it. `axesOf()` now derives from `AXES`, and `gtest.mjs` asserts that a Vote carries every
    axis in `AXES`, no extras, and none of them `undefined`. Same class of bug as #11, one layer
    further out.
14. **A Mode switch could leave a card with no Timeline.** `mount()` registered its Timeline
    inside `settle(bn).then(...)`, which resolves a frame later. A grid rebuild in that window
    unmounted the card, and the pending callback then registered a Timeline animating a banner
    that was no longer in the DOM — while the card that *was* in the DOM, from the newer mount,
    was skipped. The guard now checks that this mount is still the one on screen
    (`stage.firstElementChild === inner`) and that no other mount has already claimed the id.
15. **Deduplicating across seeds needed the Mode in the key.** Background mode pins eleven of
    thirteen axes, so its whole space is 40 Banners and each seed re-emitted the same 40 — 240
    Banners, six copies of each, inflating `n` in the analysis without adding evidence. The key is
    now `mode | axis vector`: without the Mode, a Composition Banner whose seven varied axes all
    land on the Reference Scene has the *identical* vector to the Motion Banner for
    `slamLeft × hierarchy`, and one would have silently suppressed the other.
