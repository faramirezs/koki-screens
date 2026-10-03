# banner-lab

A design-space search for 1920×1080 signage banners. It renders 960 animated banners from an
13-axis combinatorial system, shows them in a gallery you can vote on, and joins the votes
back to the axis values so we can agree on *which combinations* work — not just which
individual banner happens to be nice.

The deck, the photo pool and the cutouts are committed, so a fresh clone is runnable as-is.

```
npm install                                   # puppeteer-core + sharp, for the screenshot harnesses
python3 -m pip install Pillow rembg           # only if you re-fetch or re-cut photos
node serve.mjs                                # http://100.103.106.114:7788/  (Tailscale)
open gallery.html                             # vote: love / good / maybe / no
node analyze.mjs --min 4 --min-pair 2         # report.md: per-axis and per-pair win rates
```

`package.json` carries the same steps as npm scripts (`npm run build`, `npm run audit`,
`npm run motions`, …). The screenshot and audit harnesses drive an **already-installed**
Chromium through `puppeteer-core`; they do not download one, so set `CHROME_PATH` if yours is
not where `shots.mjs` expects it.

## The motion, in one paragraph

One loop is 12 seconds and it is a story, not a decoration. The background has the stage to
itself for the first 1.5 seconds — three oversized gradient sheets sliding past each other on
an `alternate` ease, never settling. Then the copy panel wipes in and every element slams onto
it, staggered, overshooting, until about 2.5s. For the next ~6 seconds the elements keep
breathing while you read: alternating half-cycles of a few pixels that always land back on the
settled pose. Then they are thrown off the canvas the other way from the way they came in, and
the background is alone again for the last second. The timeline is **not** a yoyo: it plays
forward once per loop and the exit ends on the same off-canvas pose the entrance started from,
so `t=0` and `t=LOOP` are visually identical and the loop closes without a jump.

## The pipeline

| step | command | output |
|---|---|---|
| fetch photos | `python3 fetch_photos.py` | `photos2/`, `photos2.json` |
| photo sheet | `node contact.mjs` | `photos2-sheet.jpg` |
| cut out subjects | `../screen-ad-generator/.venv/bin/python cutout.py` | `photos2/cut/*.png` |
| build the deck | `node build.mjs --per-seed 160 --seeds 1,2,3,4,5,6` | `banners.json` (2050 specs, all four Modes) |
| audit the deck | `node audit.mjs` | contrast / overflow / collide / safe-area counts |
| check the motion | `node motions.mjs` | loop seam + background energy, one per axis value |
| check the gallery | `node gtest.mjs && rm -f feedback.jsonl` | mount, Mode switch, Vote shape |
| screenshot | `node shots.mjs sheet --from 0 --to 12 --cols 3 --freeze 6` | `shots/*.png` |
| one banner, full size | `node singles.mjs s1-b0002` | `shots/s1-b0002.png` |
| motion arc | `node shots.mjs strip --id s1-b0001 --n 12 --cols 4` | 12 frames across the loop |
| serve + collect votes | `node serve.mjs --port 7788` | `feedback.jsonl` |
| analyse | `node analyze.mjs --min 4 --min-pair 2` | `report.md`, one section per Mode |

## Modes

The scene deck varies thirteen axes at once, which is the right instrument for finding a Banner you
like and the wrong one for finding out *why*. The deck is therefore split into four **Modes**, each
of which varies a subset of the axes and pins everything else to the **Reference Scene**:

| Mode | the question | varies | banners |
|---|---|---|---|
| `composition` | Does this design work as a still? | 7 axes | 960 |
| `background` | Does the background support the content, or compete with it? | `bg`, `bgEnergy` | 40 (all of them) |
| `motion` | Does the choreography read, and does it suit each Role? | `motion`, `roleMotion` | 90 (all of them) |
| `scene` | Does the whole thing work together? | all 13 | 960 |

The workflow is the order above: find a settled Composition, then a background that supports it,
then choreography that reads, then validate the whole Scene. The gallery opens on `composition` and
the mode bar shows what each Mode varies and how many Banners it has.

One renderer serves all four. A Mode decides two things — whether a Timeline is built, and whether
the background sheets run:

| Mode | Timeline | background sheets | foreground |
|---|---|---|---|
| `composition` | none | held | still |
| `background` | none | running | still |
| `motion` | built | running | moving |
| `scene` | built | running | moving |

Composition mode needs no special code to be a still: every Element already sits at its settled pose
in CSS, and the Timeline is only what moves it away from that pose. Not building one *is* the
settled Composition. See `docs/adr/0003`.

A Mode that pins most of its axes has a space small enough to cover completely, so it is covered
completely: `background` has 10 × 4 = 40 Banners and `motion` has 18 × 5 = 90. The two big Modes are
sampled by the coverage-aware round-robin below.

**A Vote in one Mode is not comparable with a Vote in another.** They answer different questions, so
`analyze.mjs` reports per Mode and never pools, and every Vote records the Mode it was cast in.

`--modes` limits a build: `node build.mjs --modes scene` reproduces the original single-mode deck.

## Design space

16 palettes × 10 layouts × 10 backgrounds × 4 background energies × 10 type treatments ×
7 badges × 7 CTAs × 7 product treatments × 10 decor sets × 18 motions × 5 role-motion
distributions × 14 copy sets × 225 photos = 6.2 × 10¹³ combinations. The two big Modes are
sampled from it with a coverage-aware round-robin, so every value of every axis appears roughly
equally often; the two small Modes are covered completely.

`space.mjs` exports the axis list as `AXES`, and the build summary, the gallery's filters and
`analyze.mjs` all import it — an axis cannot be visible in one and missing from another. That is
not a tidiness point: `gallery.js` used to keep its own hand-written copy of the list, and when
two axes were added that copy silently dropped them from every card and every Vote, and nothing
failed. `gtest.mjs` now asserts the shape of a Vote, so the next one fails loudly.

- **Palettes** are 16 hand-tuned sets built only from the KoKitchen tokens in
  `../brand/tokens.css`: `{mode, slide[3], panel, ink, accent, accent2, muted, onAccent}`.
  Every one passes **4.5:1** for `ink`/`muted`/`accent`/`accent2` on `panel` and
  `onAccent` on `accent`. `mode` picks the vignette, so there is no luminance guesswork.
- **Backgrounds** are 10 sliding-gradient recipes (`triSlide`, `duoSlide`, `quadSlide`,
  `softSlide`, `boldSlide`, `blendSlide`, `raySlide`, `stripeSlide`, `dotSlide`, `meshSlide`),
  each defined as a layer count, an angle, an opacity and a set of durations. Every duration
  divides 6s, because an `alternate` animation returns to its start after twice its duration —
  that is what lets the background close its own loop inside the 12s banner loop.
- **Background energy** (4 values) scales how *far* those sheets travel during each Phase, so
  the background stays loud at the Intro and Tail and goes quiet while the copy is being read.
  The sheets never stop moving; they stop competing. `flat` is the control and keeps v2's
  constant speed. The curve is a list of `[seconds, energy]` stops in `space.mjs` and is
  driven by the same GSAP timeline as the elements — a curve on the CSS clock could not be
  frozen with `seek(t)`, so every contact sheet and motion strip would show whatever energy
  the wall clock happened to be at.
- **Motions** (18) are the Motion family: one gesture — a direction, a travel and an ease —
  applied to every Element in the Scene at once, so the board reads as a single move. Each
  Element has three states: **Enter**, **Idle**, **Exit**. A family is not a Preset: a Preset
  moves one Element, a family moves the whole Scene.
- **Role motion** (5 values) decides how much of that family each Role takes. `uniform` is the
  control — every Role takes it whole, which is what v2 shipped. `hierarchy` quiets the copy to
  0.72 and pushes the badge to 1.30 and the decor to 1.40, so the board gets its energy from
  the things that are not being read. A Role can take *more* of the family, never a different
  one: a Scene with four unrelated gestures has no gesture at all.
- **Layouts**: `productLeft`, `productRight`, `centerStack`, `productBehind`, `bottomBand`,
  `diagonalSplit`, `circleMask`, `fullBleed`, `cornerScrim`, `topBanner`.
- **Type**: `whiteCaps`, `twoTone`, `outline`, `ribbonKicker`, `boxed`, `mixedBox`, `stacked`,
  `shadowPop`, `editorial`, `ticket`.
- **Copy** (14 sets) is paired to photo subjects by category 6 times out of 7; the seventh is
  free, so the copy–photo pairing stays a learnable axis instead of a constant. A treatment
  that needs a cutout prefers a cutout *within* the allowed category, so a "SWEET" headline
  never ends up over a rack of ribs.

## The one rule that makes a moving background safe

**Text only ever sits on `--panel`.** `.bn__copy` paints its own opaque background, so the
contrast of every headline is a property of the palette, not of whatever colour happens to be
sliding past at that moment. The panel is deliberately not translucent: any show-through makes
the contrast a function of the photo behind it, and over a high-contrast food shot it reads as
a smudge rather than as depth. Badges sit outside the panel, so each one paints its own opaque
fill and picks its own text colour against that fill.

## Photos

Openverse (`api.openverse.org`), filtered to **commercially usable** licences only, landscape,
at least 1400px wide. `photos2.json` records title, creator, licence and source URL per file,
and every file is dropped or kept explicitly (`"keep": false` plus a `drop` reason) so the pool
is an argument, not a pile. 259 candidates downloaded, 225 kept, 34 dropped as off-subject,
flat illustration or near-duplicate. `node contact.mjs` renders `photos2-sheet.jpg`.

**Why not Unsplash.** Unsplash's API needs an access key, their web app sits behind a bot
check, and their CDN only serves ids you already know. Discovering those ids through Bing
image search was tried and does not work: every query returns the same seven generic
"about Unsplash" images, so the pool it produced was not food at all. If you have an Unsplash
access key, `fetch_photos.py` is the only file that has to change.

Cutouts come from `rembg` (`isnet-general-use`; BiRefNet OOMs this 11 GB box). Each one is
then cropped to its alpha bounding box: the matting model keeps the source framing, so a
subject that occupies a band of the photo would otherwise be rendered as mostly empty canvas
(`cutoutFloat` and `arch` size the image with `object-fit: contain`) and come out small. Without
a cutout, `cutoutFloat` and `arch` fall back to `framed`, so a pool with no cutouts quietly
loses two of its seven product treatments.

## Feedback model

A vote is not stored against a banner id alone. `POST /feedback` writes the verdict *plus the
banner's full axis vector* **and the Mode it was cast in** to `feedback.jsonl`. `analyze.mjs` then
joins votes to axis values and ranks by the Wilson lower bound of the win rate (love = 1, good =
0.6, maybe = 0.3, no = 0), which keeps a 5-vote 100 % combination from outranking a 40-vote 80 % one.

**Votes are reported per Mode and never pooled.** A vote in `composition` answers "does this design
work as a still?" and a vote in `motion` answers "does the choreography read?"; averaging the two
produces a number that answers neither. `report.md` therefore has one section per Mode, each with
only that Mode's axes, its own coverage table, and its own loved/rejected list.

Output: `report.md` — best and worst single axis values, best and worst pairs, ranked by
lower bound, with `--min` / `--min-pair` sample-size floors.

## Files

- `space.mjs` — every axis value and nothing else, plus `MODES`, `REFERENCE` and `variesIn()`.
  No filesystem, so the browser imports the same constants the sampler used; if these two ever
  disagreed, a banner would render as something other than what was sampled.
- `gen.mjs` — the sampler. Re-exports `space.mjs` and adds `generate()` / `loadPhotos()`.
  Mode-aware: it deals only the axes a Mode varies and pins the rest to the Reference Scene.
- `lab.js` — `renderBanner(spec)`, `animate(root, spec)`, `freezeBackground(root)`, `measure()`,
  `fitType()`, `fitCopy()`, `dodgeCopy()`. The only place that touches the DOM. `animate()` is the
  Mode-aware entry point: it returns `null` for a Mode with no Timeline, and freezes the sheets for
  a Mode with a frozen background.
- `lab.css` — the design system: `@font-face`, `.bn` shell, `--u` unit, sliding backgrounds,
  decor, product treatments, the copy panel, type, CTAs, badges, layouts.
- `build.mjs` — multi-seed, multi-Mode builder → `banners.json`. Prints, per Mode, what it varied
  and what it held, and flags any axis it claimed to hold that is not in fact constant.
- `gallery.{html,js,css}` — voting UI: mode bar, 120-card pages, deterministic shuffle, per-Mode
  axis filters, per-card note, motion pause, export.
- `analyze.mjs` — votes → `report.md`, segmented by Mode.
- `audit.mjs` / `audit.html` — renders every banner off-screen and measures text contrast
  against the surface it is actually painted on, overflow, safe area, copy/media collision,
  and whether the background layers are animating at all. It never builds a Timeline, so it has
  always measured the settled Composition and needed no change for Modes.
- `motions.mjs` / `motions.html` — builds all 18 motions and asserts every element is either in
  the same pose at both ends of the loop or invisible at both.
- `gtest.mjs` — mounts the gallery, switches Mode, votes, and asserts the Mode's behaviour and the
  shape of the Vote that lands in `feedback.jsonl`.
- `sheet.html`, `one.html`, `strip.html` — contact sheet, single banner, motion arc. All three go
  through `animate()`, so a still Mode renders as a still.
- `serve.mjs` — static server + `POST /feedback` + `GET /feedback`.

## Known limits

- **The cutout mattes are imperfect.** `isnet-general-use` on a busy food photo leaves a faint
  rectangular halo around the subject. It reads as a soft shadow at gallery size and is
  visible at 100% on a flat background. `arch` and `circleMask` hide it better than
  `cutoutFloat` does.
- The audit measures text against the surfaces it can see in the DOM, so text over a photo
  (`fullBleed`, `cornerScrim`, `productBehind`) is judged against its panel, not against the
  photo pixels underneath.
- Decorations that are gradients report a transparent `backgroundColor`, so the audit
  composites them at zero. `dodgeCopy` still keeps them clear of the copy.
- **Screenshots on this box are not reproducible.** Two captures of a completely static page
  differ across 98 % of their pixels (mean 22/255) on the software rasterizer here, so
  frame-to-frame pixel diffs cannot be used to decide whether something moved. Mode behaviour is
  therefore asserted from DOM and animation state (`getComputedStyle().transform`, the sheets'
  `Animation.playState`), which is deterministic, and not from screenshots.
- **The background's slide phase is not seekable.** `--energy` is timeline-driven, but each
  sheet's `translateX` is still a CSS animation on the wall clock, so a contact sheet shows each
  card mid-slide at an arbitrary position unless the sheets are paused. Composition mode pauses
  them; the other Modes do not.
- **The Reference Scene is a placeholder.** Background and Motion mode hold it fixed, so their
  results are only as meaningful as that one composition. It is declared in `space.mjs` and should
  be re-pointed at the winner of Composition mode once that Mode has votes.
