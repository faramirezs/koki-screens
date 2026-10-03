# Timeline model

An LLM writes a **plan** (plain JSON). `src/timeline.mjs` compiles that plan into a GSAP
timeline that runs inside headless Chromium. No raw GSAP is ever hand-written.

## Plan

```json
{
  "schemaVersion": 1,
  "fps": 25,
  "duration": 15,
  "loop": true,
  "baseScene": "board",
  "scenes": [
    {
      "id": "board",
      "selector": "#scene-board",
      "beats": [
        { "selector": ".hero-frame__img", "preset": "breath", "at": 1.6, "duration": 2.6 }
      ]
    },
    {
      "id": "promo",
      "selector": "#scene-promo",
      "fadeIn":  { "at": 8.0,  "duration": 0.6 },
      "fadeOut": { "at": 13.0, "duration": 0.6 },
      "beats": [
        { "selector": ".promo-ribbon__headline", "preset": "riseIn", "at": 9.0, "duration": 0.55 }
      ]
    }
  ]
}
```

- **The first scene is the base layer.** It is on screen from t=0 and must be settled at
  t=0 — no in/out presets — otherwise the loop seam breaks and a customer who walks up
  mid-loop sees a half-built board.
- **Every later scene is an overlay** and must declare `fadeIn`. Its `fadeOut` must
  finish before `duration`, so the overlay is invisible again when the loop restarts.
- Beat times are absolute seconds. `templates/promo/template.json` writes them as
  `offset` relative to the overlay start; `compile-scene.mjs` converts.
- `stagger` delays each matched element by n × stagger.

## Presets

| preset | kind | from → to |
| --- | --- | --- |
| `none` | — | no-op, for documenting a hold |
| `fadeIn` | in | opacity 0 → 1 |
| `riseIn` | in | opacity 0, y 28 → y 0 |
| `dropIn` | in | opacity 0, y −24 → y 0 |
| `slideInLeft` / `slideInRight` | in | opacity 0, x ∓56 → x 0 |
| `popIn` | in | opacity 0, scale 0.94 → 1 |
| `wipeIn` | in | `clip-path: inset(0 100% 0 0)` → `inset(0 0 0 0)` |
| `sweep` | in | scaleX 0 → 1 from the left edge (rules, dividers) |
| `breath` | pulse | scale 1 → 1.022 → 1 |
| `driftUp` | pulse | y 0 → −10 → 0 |
| `fadeOut` | out | opacity → 0 |

An "in" preset writes its start state at t=0 with `tl.set()`, so an element is hidden
from the beginning of the loop even though its beat happens seconds later.

## Hard rules

1. **Compositor-only properties.** `opacity`, `x`, `y`, `scale`, `scaleX`, `rotation`,
   `clipPath`, `transformOrigin`. Animating width/height/top/left/font-size forces layout
   every frame and is rejected by `validatePlan` and asserted in `tests/timeline.test.mjs`.
2. **Deterministic.** No `Math.random`, no `Date.now`, no `requestAnimationFrame`-driven
   state. The timeline is built paused and driven by `seek(t)`, so frames are identical
   across machines and CPU speeds.
3. **No flashing faster than 3 Hz** on any element (photosensitivity). `validatePlan`
   counts opacity transitions per second per element.
4. **Nothing animates that must stay legally readable.** Item names, prices, allergen
   codes and the legal strip are never hidden, faded or moved by a preset; the compiler's
   base-scene rule and the `checks.json` audit enforce it.

## Why not the alternatives

| stack | verdict |
| --- | --- |
| GSAP in headless Chromium | **chosen** — DOM text keeps real kerning and variable-font rendering, the timeline is seekable (deterministic frames), and the licence permits commercial use. |
| Remotion | good for React authors; adds a React toolchain and a licence question for company use, for a pipeline whose scenes are already HTML. |
| Canvas / WebGL (PixiJS, Three.js) | text has to be rasterised or SDF-rendered; more work, worse typography, and a context-loss risk on 24/7 players. |
| MediaRecorder | drops frames under load, not reproducible. |
| Lottie / Rive | binary authoring formats — an LLM cannot author or diff them. |
