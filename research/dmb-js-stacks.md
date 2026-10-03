# JavaScript / WebGL Animation Stack Feasibility for 24/7 Digital Menu Board Playback

**Context:** Ko Kitchen coffee/deli, Berlin. In-store DMB screens showing menu + looping promo ads. Target authoring: JavaScript/WebGL (web tech), not hand-authored After Effects. Craft target: high contrast, very large legible type, clean food imagery.

**Report date:** 2026-09-29. Version/build info is flagged where it may go stale.

**Method:** Claims below are sourced; each non-obvious claim links its source. Items that could not be verified from a primary/vendor source are marked **[uncertain]**. Recommendations are the author's synthesis and are labelled as such.

---

## 1. Executive summary

**Live-render (browser-based player):** the most reliable, AI-authorable, and cheapest path is **DOM + CSS/Web Animations API driven by GSAP** (transforms/opacity only), with **PixiJS** as the performance-heavy option if we need many moving sprites, particles, or shader effects. Raw **Canvas 2D** is the deterministic fallback.

**Pre-rendered MP4:** **Remotion** is the strongest primary (React-authored, deterministic frame-by-frame, license free for our size), with **Puppeteer + headless Chromium capture → ffmpeg/H.264** as the fallback/DIY pipeline.

**Why not WebGL-first for text:** the task is *large highly-legible type* + *clean food imagery*. That is exactly the workload where the browser's own text rasteriser (DOM/CSS) and `<img>`/video decoding beat re-implementing text in a WebGL scene (MSDF/SDF). Reserve WebGL for ornament/transition/effect layers, not for the primary typography.

**Single biggest operational risk (independent of stack):** the Raspberry Pi player itself — Chromium kiosk memory growth over days, SD-card wear, and thermal throttling above ~80 °C. Mitigations are mandatory and stack-agnostic (see §6).

---

## 2. Tool-by-tool assessment

### 2.1 GSAP (GreenSock Animation Platform)

| Field | Finding |
|---|---|
| License / cost | **Free for all commercial use**, including formerly members-only plugins (SplitText, MorphSVG), since the Webflow acquisition. Standard "No Charge" license, effective **2025-04-30**, last modified 2025-05-30. Sole restriction: you may not use GSAP inside a *visual no-code animation builder that competes with Webflow*; AI-generated GSAP code is explicitly permitted. Source: <https://gsap.com/community/standard-license/> |
| Output | JS runtime bundled into an HTML/JS app (no server render). |
| Player support | Plain DOM/CSS engine — works anywhere a browser runs. Confirmed rendering-feature support on Samsung Tizen (rAF, Web Animations API, WebGL all "Yes" in Samsung's graphics table): <https://developer.samsung.com/smarttv/develop/specifications/web-engine-specifications.html> |
| Authoring workflow | Code-only (JS API). Visual editing only via Webflow's builder. |
| Perf at 1920×1080 looping | GSAP animates on the **main thread** via requestAnimationFrame; if you animate only `transform`/`opacity`/`filter`/`clip-path` the *render* cost is compositor-only, but the ticks themselves are main-thread. For a looping menu board with a handful of moving elements this is trivial. Source on compositor properties and main-thread JS libs: <https://motion.dev/magazine/web-animation-performance-tier-list> |
| Large type quality | Best-in-class because text stays as **real DOM text** → browser subpixel/grayscale AA, correct kerning, variable-font support, crisp at 1080p with no texture-atlas compromise. `SplitText` plugin enables per-character/line staggering. |
| AI-authorability | **Very high.** Mature docs (now v3.15 per docs), enormous example base, deterministic API, and GSAP officially blesses AI-generated code (source above). A coding agent can author a full timeline from a text brief. |

### 2.2 PixiJS

| Field | Finding |
|---|---|
| License / cost | **MIT**. <https://github.com/pixijs/pixijs> (repo licence: MIT). |
| Version | v8.x line; latest listed release **v8.20.1**; v8 introduced a **WebGPU renderer alongside WebGL**, experimental Canvas fallback in v8.16. Sources: <https://github.com/pixijs/pixijs/releases>, <https://pixijs.com/blog/8.16.0> |
| Output | JS runtime; own WebGL/WebGPU renderer into a `<canvas>`. |
| Player support | Any WebGL-capable Chromium. BrightSign runs Chromium (65 on OS8, **120 on firmware 9.1+** — <https://docs.brightsign.biz/releases/91>); Tizen supports WebGL; want the WebGL1 path for old Tizen/webOS Chromium 32–56. |
| Authoring | Code-only (scene graph, sprites, filters, particles). |
| Perf at 1080p | Excellent for **2D sprite/filter/particle** workloads; batching is its core strength. Heavier than DOM for pure text. |
| Type quality | Text is **rasterised into texture atlases**. Large type works but you must generate at the right resolution / use bitmap or MSDF text; sharpness depends on atlas scale. Less forgiving than DOM text for variable fonts and dynamic reflow. |
| AI-authorability | High. Clean, well-documented API; deterministic. Slightly more setup than GSAP for someone drafting from scratch. |

### 2.3 Three.js

| Field | Finding |
|---|---|
| License | MIT (three.js is MIT). |
| Output | JS runtime, WebGLRenderer (WebGPU renderer also available). |
| Authoring | Code-only; 3D scene graph, cameras, lights, materials. |
| Perf / risk | Powerful but a full 3D engine. Its own manual warns that apps "use lots of memory" and requires **manual disposal** of geometries/textures/materials/render targets to avoid leaks: <https://threejs.org/manual/en/cleanup.html> and <https://threejs.org/manual/en/how-to-dispose-of-objects.html>. WebGL **context loss** is a real failure mode on constrained GPUs: <https://discourse.threejs.org/t/webgl-context-lost/35842>. |
| Type quality | Text must be built via SDF/MSDF (`troika-three-text`, `three-msdf-text-utils`) — sharp and scalable but re-implements typography outside the browser rasteriser. |
| AI-authorability | High (huge ecosystem) but overkill: a menu board rarely needs 3D. Recommend only for hero 3D product shots / shader transitions. |

### 2.4 Babylon.js

| Field | Finding |
|---|---|
| License | Apache-2.0. |
| Output | JS runtime, WebGL/WebGPU engine. |
| Authoring | Code-only (+ node editor). |
| Perf | Comparable class to Three.js; there are community claims of Babylon being slower than Three in some micro-benchmarks, but these are old and contested: <https://forum.babylonjs.com/t/babylonjs-vs-threejs-performance-comparison/45704> **[uncertain — no fresh vendor benchmark].** |
| Type quality | First-class **MSDF text** renderer documented: <https://doc.babylonjs.com/addons/msdfText>. |
| AI-authorability | High (strong docs) but same overkill caveat as Three.js. |

### 2.5 Rive

| Field | Finding |
|---|---|
| License / cost | **Runtimes are MIT** (web: `@rive-app/canvas`, `@rive-app/webgl2`). Editor: Free; **Cadet $9/seat/mo (max 3 seats)** to export `.riv` for shipping; Voyager $32; Enterprise $120. Sources: <https://rive.app/runtimes>, <https://rive.app/docs/runtimes/getting-started>, <https://rive.app/pricing> |
| Output | `.riv` file + MIT JS runtime; also SVG-CSS-ish embedding/URL hosting on paid tiers. |
| Player support | Web runtime runs in any modern browser with Canvas2D or WebGL2. |
| Authoring | **Visual editor** (plus code control at runtime). This is the key mismatch: **an AI coding agent cannot author `.riv` files** — they are a binary editor format. Rive does ship its own "Agent" feature, but that is inside the Rive product, not something a generic LLM can emit. |
| Perf | Very light runtime (files "a fraction of the size" of video/GIF/Lottie, ~43 KB runtime claim on marketing page). Good for icons/illustrations/state-machine UI. |
| AI-authorability | **Low for asset creation** (visual, binary format); medium for integration code. |

### 2.6 Lottie (lottie-web / dotLottie)

| Field | Finding |
|---|---|
| License / cost | `lottie-web` **MIT** (v5.13.0 latest): <https://github.com/airbnb/lottie-web>. `dotlottie-web` **MIT** (Rust+WASM player): <https://github.com/LottieFiles/dotlottie-web>. LottieFiles cloud/editor itself is paid (Individual ~$19.99/user/mo) — the *runtimes* are free. |
| Output | JSON (Lottie) or `.lottie` (zipped) + JS runtime; SVG, Canvas, or HTML renderer. |
| Player support | Any browser. Desktop-AE-authored content. |
| Authoring | Traditionally from After Effects (Bodymovin); now also Lottie Creator. **AI can emit Lottie JSON**, but it is verbose and awkward to hand-author reliably. |
| Perf | SVG renderer = best fidelity; Canvas renderer faster for very complex scenes: <https://imagetosvg.com/how-to/svg-animation-lottie-web>. `dotlottie-web` documents memory/preload tuning and lazy-loading — evidence that animation memory must be managed: <https://docs.lottiefiles.com/en/runtimes/distributions/js/v0.x/advanced/performance> |
| Type quality | Text-as-vector-paths by default (not live font) → sharp, but not selectable/reflowable, and large hero type means big path data. |
| AI-authorability | Medium. JSON is machine-writable but low-level; better as an *output target* for a generator than something an agent hand-crafts. |

### 2.7 Theatre.js

| Field | Finding |
|---|---|
| License | **Apache-2.0**: <https://github.com/theatre-js/theatre/blob/main/LICENSE> |
| Output | JS runtime + studio editor overlay; drives DOM/Three.js/etc. |
| Version / staleness | Latest release **v0.7.0, 2023-08-10** — **~3 years old as of this report; flag as likely stale / low activity.** <https://www.theatrejs.com/docs/latest/releases> |
| Authoring | Visual timeline editor with code-defined "sheet" objects. |
| AI-authorability | Medium. Deterministic API, but the *point* is the GUI editor; a code-only agent gets less value, and docs/updates are thin. |

### 2.8 anime.js

| Field | Finding |
|---|---|
| License | **MIT**: <https://github.com/juliangarnier/anime> |
| Version | v4 line, latest listed **4.5.0** (<https://www.npmjs.com/package/animejs>); v4 was a full rewrite. |
| Output | JS runtime; animates CSS props, SVG, DOM attributes, JS objects. |
| Authoring | Code-only; simple, small API. |
| AI-authorability | High for simple sequences; docs/example base smaller than GSAP, and the v4 rewrite means older training-data examples may be v3 syntax → **risk of the agent emitting stale API**. |

### 2.9 Motion (formerly Framer Motion / motion.dev)

| Field | Finding |
|---|---|
| License | **MIT** (Motion is open-source; the paid add-ons are Motion+, MotionScore, Studio). |
| Output | JS runtime; React and vanilla-JS APIs; can drive Three.js. |
| Authoring | Code-only, plus **Motion Studio** (visual timeline, paid/AI-kit tied) and an "AI Kit" of agent skills. <https://motion.dev/docs> |
| Perf | Motion's own tier list is the clearest public write-up: **S-Tier = pure compositor** (`transform`, `opacity`, `filter`, `clip-path`) via CSS/WAAPI; **A-Tier = same properties but main-thread JS**. It notes `will-change`/layer bloat can blow GPU memory and warns about huge marquee layers — directly relevant to scrolling menu tickers. <https://motion.dev/magazine/web-animation-performance-tier-list> |
| AI-authorability | High; docs explicitly target agents (AI Kit, MotionScore for agents). |

### 2.10 Remotion

| Field | Finding |
|---|---|
| License / cost | **Free** for individuals, orgs **≤3 employees**, non-profits, and evaluation. Company License: **"Creators" $25/mo per person**, or **"Automators" $0.01/render, min $100/mo**. Enterprise min $500/mo. AI/LLM code generation explicitly allowed. Sources: <https://www.remotion.dev/docs/license/faq>, <https://github.com/remotion-dev/remotion/blob/main/LICENSE.md> |
| Output | **Pre-rendered MP4/WebM/GIF/still** via headless-Chromium renderer: `renderMedia()` combines frame render + stitch (ffmpeg) — <https://www.remotion.dev/docs/renderer/render-media>. SSR/Node API: <https://www.remotion.dev/docs/ssr> |
| Player support | None needed at playback — output is a video file, playable by *every* signage platform (BrightSign, Tizen, webOS, Anthias, Xibo, RPi). |
| Authoring | **Code-only, React/TS** — the most naturally AI-authorable video tool here (it is React components + frame math). tscoded "Studio" preview. |
| Perf at 1080p | Rendering is deterministic frame-by-frame (not wall-clock), so **no frame drift and no long-run memory growth in the player**, because there is no long-running player. |
| Type quality | Full browser typography (renders real DOM/CSS in Chromium) → identical fidelity to the live DOM path. |

### 2.11 WebGPU (status for signage)

| Field | Finding |
|---|---|
| Standard status | W3C Candidate Recommendation draft dated **2026-09-15**: <https://www.w3.org/TR/webgpu/> |
| Browser support | **"Available in all major browsers (Chromium/Firefox/Safari) on many platforms."** Chromium added **Linux Intel Gen12+ in 2026-01**; Firefox Windows 2025-07 / Mac Apple Silicon 2025-11; Safari "everywhere" 2025-09. Khronos/GDC-2026 talk: <https://www.khronos.org/assets/uploads/developers/presentations/3D_on_the_Web_2026_-_GDC_2026_WebGL+WebGPU_Update.pdf> |
| MDN caveat | Still marked **"Limited availability / not Baseline."** <https://developer.mozilla.org/en-US/docs/Web/API/WebGPU_API> |
| Signage reality | **Not usable as a baseline today.** Signage players pin old Chromium: BrightSign OS8 = **Chromium 65** (WebGPU did not exist), Tizen SSSP2/3 = **Chromium 32**; even current BrightSign 9.1 = Chromium 120 which *does* ship WebGPU but only on Vulkan/D3D12-capable GPUs. Raspberry Pi 5 has **Vulkan 1.3 via Mesa V3DV** (Mesa 24.3; shipped by default in Raspberry Pi OS — <https://www.phoronix.com/news/Mesa-24.3-V3DV-Vulkan-1.3>, <https://www.phoronix.com/news/Raspberry-Pi-OS-Default-V3DV>), but Chrome's WebGPU enablement on Linux is Intel-Gen12+-targeted, so **WebGPU-on-Pi-5 in kiosk Chromium is [uncertain] and must be tested on-device**, not assumed. **WebGL 2.0 remains the safe floor: >96% of browsers** (Khronos). |
| Verdict for Ko Kitchen | Author against **WebGL/Canvas2D/DOM** now; treat WebGPU as a progressive enhancement behind feature detection. |

### 2.12 Konva

| Field | Finding |
|---|---|
| License | **MIT** (<https://github.com/konvajs/konva/blob/master/LICENSE>). |
| Output | 2D Canvas scene graph (canvas-based, no WebGL requirement). |
| Authoring | Code-only; declarative node tree; good docs. |
| Perf | Canvas 2D — GPU-accelerated only for compositing; heavy per-frame redraw of many objects costs CPU. Fine for menu-board-level object counts. |
| Type quality | `Konva.Text` renders via Canvas2D filled paths → crisp with correct font; you must load webfonts before draw. |
| AI-authorability | High — simple, deterministic API, popular. |

### 2.13 Raw Canvas 2D API / CSS + Web Animations API

| Field | Finding |
|---|---|
| License | **Web platform** — no license, no dependency, no supply-chain risk. |
| Output | Direct render into `<canvas>` (Canvas2D) or declarative CSS/WAAPI animations on DOM. |
| Player support | Universal — Tizen's spec table lists Canvas API and Web Animations API as supported: <https://developer.samsung.com/smarttv/develop/specifications/web-engine-specifications.html> |
| Perf | Canvas2D draw calls are **main-thread**; CSS/WAAPI on `transform`/`opacity` are **compositor-thread** (S-Tier) per Motion's tier list. WAAPI via `element.animate()` is native and needs no library. MDN: <https://developer.mozilla.org/en-US/docs/Web/API/Web_Animations_API> |
| Type quality | Canvas2D `fillText` uses the browser text stack → excellent for large type, but you control wrapping/kerning manually. DOM text needs no work at all. |
| AI-authorability | **Maximum** — zero API surface to misremember; a model can write correct vanilla canvas/CSS from first principles, and there is no version drift. |

---

## 3. Comparison table

Ratings: **AI-authorability** = how reliably a coding agent can produce correct, working first draft. **Risk** = operational risk in 24/7 signage playback (memory/GPU/thermals/portability). Output: *live* = HTML/JS bundle that renders at play time; *file* = pre-rendered media.

| Tool | License | Output | Player support (RPi kiosk / BrightSign / Tizen / webOS / Anthias / Xibo) | AI-authorability | Risk (24/7 signage) |
|---|---|---|---|---|---|
| **GSAP** | Free (Webflow standard licence; commercial OK) | live (JS/DOM) | All — DOM/CSS | **Very high** | **Low** (compositor props) |
| **PixiJS** | MIT | live (WebGL/WebGPU canvas) | All WebGL-capable; use WebGL1 for old Chromium | High | Low–medium (GPU memory, context loss) |
| **Three.js** | MIT | live (WebGL) | WebGL-capable only | High | **Medium–high** (manual dispose, context loss) |
| **Babylon.js** | Apache-2.0 | live (WebGL/WebGPU) | WebGL-capable only | High | Medium–high |
| **Rive** | MIT runtime; editor $9/seat/mo to ship | live (.riv + runtime) | Browser (Canvas2D/WebGL2) | **Low** (binary/visual asset) | Low (tiny runtime) |
| **Lottie-web / dotLottie** | MIT runtimes | live (JSON + runtime) | All browsers | Medium (JSON generation) | Low–medium (memory tuning needed) |
| **Theatre.js** | Apache-2.0 | live (JS + editor) | All browsers | Medium (**stale**, v0.7.0 2023) | Low but **maintenance risk** |
| **anime.js** | MIT | live (JS) | All browsers | High (watch v3→v4 drift) | Low |
| **Motion** | MIT | live (JS/React) | All browsers | High | **Low** (compositor-first) |
| **Remotion** | Free ≤3 staff; else $25/mo seat or $0.01/render | **file (MP4)** | **All** (video file) | **Very high** (React/TS) | **Very low** (no live player) |
| **WebGPU** | W3C standard (CR 2026-09-15) | — (API) | **Not baseline**; BrightSign OS8/Tizen SSSP lack it | High (but portability traps) | **High if relied upon now** |
| **Konva** | MIT | live (Canvas2D) | All browsers | High | Low–medium (CPU draw) |
| **Canvas 2D (raw)** | Web platform | live (canvas) | Universal | **Maximum** | Low–medium (main-thread draw) |
| **CSS / WAAPI** | Web platform | live (DOM) | Universal (Tizen-confirmed) | **Maximum** | **Lowest** (S-Tier compositor) |

---

## 4. Player / platform support notes (sourced)

- **Chromium version is the real constraint**, and it is usually frozen:
  - BrightSign OS8 = **Chromium 65** (HTML5 performance matrix PDF, 2023): <https://www.brightsign.biz/wp-content/uploads/2023/04/Series4-html-comparison.pdf>. BrightSign **firmware 9.1 unifies on Chromium 120** across Series 3–6: <https://docs.brightsign.biz/releases/91>.
  - Samsung: **Tizen 10.0 (2026) = Chromium M130**, 9.0 = M120, 8.0 = M108, 7.0 = M94, 6.5 = M85, 5.0 = M63: <https://developer.samsung.com/smarttv/develop/specifications/web-engine-specifications.html>
  - signageOS table: **SSSP2/3 ≈ Chromium 32**, Tizen 2.4 ≈ 32, Tizen 4.0 = 56, Tizen 5.0 = 63, **webOS 6 = Chromium 79**, Raspberry Pi 3 = WebKit 78, Raspberry Pi 4 = Chromium 91. It advises compiling to ES5 + polyfills and testing with the *same* Chromium build: <https://developers.signageos.io/devices/device-guides/general-information/browser-webkit-and-chromium-versions-by-each-platform>
- **Resolution ceiling:** signageOS states "most devices only support HTML5 only in FullHD resolution due to HW performance limitations… this limitation applies to any SoC device." UHD HTML5 is limited to x86 i5+/similar. **Plan for 1920×1080, not 4K.** (Same source.)
- **Anthias** (formerly Screenly OSE) plays "photos, videos, web pages, YouTube, live streams"; **1080p** output with auto-refresh web pages; runs on **Pi 2–5 and 64-bit x86**; recommends Pi 4+. <https://anthias.screenly.io/features/>
- **Xibo** supports an embedded **HTML package** widget and an "interactive control" JS library for controlling widget duration — i.e. our custom HTML/JS app runs as a widget. <https://docs.xibosignage.com/developer/player-control/player-control>
- **WebGL performance classes on BrightSign** (LS4 "Ok" → XT4 "Best") confirm WebGL is supported everywhere but graded by player tier. (HTML5 matrix PDF, above.)

---

## 5. Large-type text rendering quality

Three viable paths, ranked for this craft spec:

1. **DOM text + CSS/WAAPI/GSAP (recommended).** Real browser text rasteriser: correct kerning, hinting, variable-font `font-variation-settings`, crisp subpixel AA at 1080p, no texture artefacts. No re-implementation needed.
2. **Canvas 2D `fillText`.** Same font stack, crisp, but you own line-breaking and per-glyph animation.
3. **WebGL text via bitmap/SDF/MSDF.** Needed only if the type itself must live inside a 3D/shader scene. MSDF preserves sharp corners when scaled (Babylon doc: <https://doc.babylonjs.com/addons/msdfText>; three.js util: <https://github.com/leochocolat/three-msdf-text-utils>). Downside: build-time font atlas generation, kerning handled by the packer, and it is the highest-effort path for a mostly-2D menu board.

**Synthesis:** for "large, highly legible type," the DOM path wins on both quality and AI-authorability. Keep WebGL for transitions, ambient motion, particles, and photo treatment — not for the headline price text.

---

## 6. Long-run reliability (days → weeks of continuous playback)

This is the highest-severity area and is largely stack-independent.

**Documented pitfalls**
- **Chromium kiosk memory growth.** Raspberry Pi forum reports Chromium "within 2-3 days it consumes all available RAM" in kiosk mode: <https://forums.raspberrypi.com/viewtopic.php?t=384545>; and ~6 GB consumed after hours on an 8 GB box: <https://forums.raspberrypi.com/viewtopic.php?t=326222>. Kiosk-mode guidance assumes **≥1 GB RAM minimum** and Pi 3+: <https://www.raspberrypi.com/tutorials/how-to-use-a-raspberry-pi-in-kiosk-mode>
- **WebGL context loss / GPU memory.** Repeatedly creating assets without `dispose()` leaks GPU memory and can trigger context loss: <https://threejs.org/manual/en/cleanup.html>, <https://discourse.threejs.org/t/webgl-context-lost/35842>. Treat context loss as an expected event and re-init the renderer.
- **Poor WebGL on Pi 5 in containerised browser setups.** balena browser module issue documents poor WebGL perf on an 8 GB Pi 5 at 1080p: <https://github.com/balena-io-experimental/browser/issues/172>
- **Thermals.** Pi 5 throttles ARM cores between **80–85 °C**, and GPU+ARM above 85 °C: <https://forums.raspberrypi.com/viewtopic.php?t=368073>. Heavy sustained video/WebGL pushes boards to 75–80 °C: <https://blog.pisignage.com/how-to-optimize-raspberry-pi-for-24-7-digital-signage-complete-guide>
- **SD-card failure dominates field failures** (~70% of failures per that guide); high-endurance cards / NVMe boot are the fix.
- **Frame drift.** Any wall-clock loop (`setTimeout`-based) drifts. `requestAnimationFrame` + a monotonic clock, or a **fixed-timeline** design, is required. For pre-rendered output Remotion's deterministic frame model removes the problem entirely (<https://www.remotion.dev/docs/ssr>).
- **4K vs 1080p headroom.** SoC players are effectively 1080p HTML5 devices (signageOS, §4). Even where a panel is 4K, the browser canvas is FullHD — do not design 4K-native HTML.

**Mitigations (recommended)**
1. **Watchdog auto-reload** — reload the page/browser on a schedule (e.g. nightly) or on a memory threshold, so any leak resets. Cheap, effective, stack-agnostic.
2. **Compositor-only animation** — restrict animated properties to `transform`/`opacity`/`filter`/`clip-path` (Motion S-Tier) to minimise paint/main-thread cost.
3. **Fixed-timeline rendering** — drive animation from an elapsed-time value, not accumulated per-frame deltas; guarantees identical output on every loop and removes drift.
4. **Deterministic asset lifecycle** — preload once, never allocate textures/geometries inside the loop; `dispose()` on every teardown; handle `webglcontextlost`.
5. **Pause when hidden** — use the Page Visibility API / `IntersectionObserver` to stop work off-screen (Motion documents this as the way to keep long-running animations battery/CPU friendly).
6. **Hardware hygiene** — official PSU (5 V/5 A on Pi 5), active cooling, high-endurance SD or NVMe boot, eMMC/NVMe where possible.
7. **Prefer the MP4 path for the highest-stakes screens** — a video file has no long-run memory profile at all.

---

## 7. AI-authorability summary

- **Best:** Remotion (React/TS, LLM-friendly, docs explicitly permit LLM generation), GSAP (mature docs + officially permits AI code), Motion (agents-first docs), raw Canvas2D/CSS/WAAPI (no API to misremember).
- **Good:** PixiJS, Three.js, Babylon.js, Konva — large, stable, well-documented APIs.
- **Watch out:** anime.js (v3→v4 syntax drift in training data), Theatre.js (stale release).
- **Poor for asset creation:** Rive (binary `.riv`, visual editor), Lottie (JSON is an output format, not an authoring surface).

---

## 8. Recommendations

### (a) Code-authored animation running LIVE in a browser-based player

**Primary #1 — DOM + GSAP (or CSS/WAAPI), Canvas2D for photo treatments.**
- Free, MIT-class licensing, universal player support, **best text quality**, highest AI-authorability, lowest operational risk.
- Restrict animated props to `transform`/`opacity`; use `SplitText` for large-type reveals.
- Expected fit: menu composition, price/type motion, simple photo transitions at 1080p.

**Primary #2 — PixiJS (WebGL1 path) for effect-heavy promos.**
- When you need sprites/particles/filters/shader transitions at scale, PixiJS is the right tool; MIT, v8, WebGL+WebGPU.
- Keep the *typography layer* in DOM (overlay) and the *effect layer* in PixiJS, so large text is never rasterised into an atlas.
- Expected fit: sizzle reels, drips/steam/splash effects, texture-mapped promo visuals.

**Fallback — raw Canvas 2D + WAAPI, no library.**
- If library churn or player quirks bite, a dependency-free canvas/CSS app is the most portable and the easiest for an agent to regenerate from scratch. Also the safest for the oldest frozen Chromium (SSSP2/3 ≈ Chromium 32, BrightSign OS8 Chromium 65) if we must support those.

### (b) Pre-rendered MP4 pipeline

**Primary — Remotion.**
- React/TS authored, deterministic frame rendering, `renderMedia()` → MP4/H.264 via headless Chromium + ffmpeg.
- **Licensing:** free at Ko Kitchen's size (individual/≤3 staff); a Company License only if headcount or automation scale requires it ($25/mo seat, or $0.01/render min $100/mo).
- Output plays on **every** signage platform with zero player-compatibility work and no long-run memory profile.
- Best AI-authorability of any video tool.

**Fallback — DIY Puppeteer capture → ffmpeg.**
- Drive our own HTML/GSAP page with headless Chromium and capture frames deterministically, then encode H.264. Puppeteer's `HeadlessExperimental` frame capture is the documented basis for deterministic capture: <https://github.com/CMU-CREATE-Lab/puppeteer-capture-frames>, <https://github.com/alexey-pelykh/puppeteer-capture>.
- Zero licence cost and full control, but you own the encode pipeline, timing correctness, and encoding/pixel-format edge cases. Use only if Remotion's licence or React requirement is a blocker.

### Suggested operating model for Ko Kitchen
1. Author promos **twice-friendly**: Remotion (MP4) for the fixed, high-stakes loop; live GSAP/DOM page for the always-current menu and last-minute price changes.
2. Every live screen gets a **nightly watchdog reload** and a compositor-only animation policy.
3. Standardise output at **1920×1080**; do not plan 4K HTML5 on SoC players.
4. Feature-detect WebGPU; never require it.

---

## 9. Sources (verified, primary/vendor where possible)

1. GSAP standard licence (free commercial, effective 2025-04-30) — <https://gsap.com/community/standard-license/>
2. Remotion license FAQ & pricing — <https://www.remotion.dev/docs/license/faq>
3. Rive runtimes (MIT) — <https://rive.app/runtimes>
4. Samsung Web Engine Specifications (Tizen/Chromium versions per year; WebGL/Canvas/WAAPI support) — <https://developer.samsung.com/smarttv/develop/specifications/web-engine-specifications.html>
5. signageOS browser/Chromium versions by platform + FullHD HTML5 limitation — <https://developers.signageos.io/devices/device-guides/general-information/browser-webkit-and-chromium-versions-by-each-platform>
6. BrightSign HTML5 Performance Matrix (OS8 = Chromium 65; WebGL tiers) — <https://www.brightsign.biz/wp-content/uploads/2023/04/Series4-html-comparison.pdf>
7. BrightSign release 9.1 (Chromium 120 across Series 3–6) — <https://docs.brightsign.biz/releases/91>
8. Khronos "WebGL & WebGPU Updates" GDC 2026 (WebGPU all major browsers; Chromium Linux Gen12+ 2026-01; WebGL2 >96%) — <https://www.khronos.org/assets/uploads/developers/presentations/3D_on_the_Web_2026_-_GDC_2026_WebGL+WebGPU_Update.pdf>
9. WebGPU W3C Candidate Recommendation 2026-09-15 — <https://www.w3.org/TR/webgpu/>
10. WebGPU API MDN (limited availability) — <https://developer.mozilla.org/en-US/docs/Web/API/WebGPU_API>
11. Motion web-animation performance tier list (compositor vs main thread; layer/GPU memory warnings) — <https://motion.dev/magazine/web-animation-performance-tier-list>
12. three.js Cleanup / How to dispose of objects (memory leaks) — <https://threejs.org/manual/en/cleanup.html>
13. Raspberry Pi forum: Chromium kiosk consumes all RAM within 2–3 days — <https://forums.raspberrypi.com/viewtopic.php?t=384545>
14. Raspberry Pi 5 thermal throttling 80–85 °C — <https://forums.raspberrypi.com/viewtopic.php?t=368073>
15. piSignage 24/7 optimization guide (thermals, SD wear, watchdog) — <https://blog.pisignage.com/how-to-optimize-raspberry-pi-for-24-7-digital-signage-complete-guide>
16. balena browser issue: poor WebGL on Pi 5 at 1080p — <https://github.com/balena-io-experimental/browser/issues/172>
17. Anthias features (web pages, 1080p, Pi/x86) — <https://anthias.screenly.io/features/>
18. Xibo player control / HTML package — <https://docs.xibosignage.com/developer/player-control/player-control>
19. PixiJS repo (MIT) and releases (v8.20.1; WebGPU) — <https://github.com/pixijs/pixijs/releases>
20. lottie-web (MIT, v5.13.0) — <https://github.com/airbnb/lottie-web>; dotlottie-web (MIT) — <https://github.com/LottieFiles/dotlottie-web>
21. Theatre.js Apache-2.0 + v0.7.0 (2023-08-10, stale) — <https://www.theatrejs.com/docs/latest/releases>
22. anime.js MIT v4.5.0 — <https://www.npmjs.com/package/animejs>; Konva MIT — <https://github.com/konvajs/konva/blob/master/LICENSE>
23. Mesa V3DV Vulkan 1.3 for RPi 4/5 — <https://www.phoronix.com/news/Mesa-24.3-V3DV-Vulkan-1.3>; Raspberry Pi OS ships V3DV by default — <https://www.phoronix.com/news/Raspberry-Pi-OS-Default-V3DV>
24. Deterministic headless capture (Puppeteer HeadlessExperimental) — <https://github.com/CMU-CREATE-Lab/puppeteer-capture-frames>

**[uncertain] items flagged:** Babylon-vs-Three performance delta (old, contested community data); WebGPU availability in kiosk Chromium specifically on Raspberry Pi 5 / Tizen 10 signage hardware (must be tested on-device); current LG webOS Chromium version beyond webOS 6 (signageOS table stops there).
