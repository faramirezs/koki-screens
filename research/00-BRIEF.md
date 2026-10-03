# DMB motion-graphics brief — Ko Kitchen, Berlin
Consolidation of 4 research reports (2026-09-29). Every claim traces to a source in the underlying reports.
Sources: `dmb-references.md` (R), `dmb-js-stacks.md` (J), `dmb-ai-skills.md` (A), `dmb-deploy-legal-brand.md` (D).

---

## 1. Decisions (recommended stack)

| Job | Choice | Why | Evidence |
|---|---|---|---|
| Menu + price motion, live | **DOM text + CSS/WAAPI driven by GSAP** | Browser text rasteriser = crisp large type, best AI-authorability, compositor-only cost | J §2.1, §5 |
| Effect-heavy promo scenes | **PixiJS (WebGL1 path)**, typography stays in a DOM overlay | Sprites/filters/particles without rasterising headlines | J §2.2 |
| Hero promo loops (highest stakes) | **Remotion → H.264 MP4**, 1920×1080 | No live player, no memory growth, plays on every signage platform, deterministic frames | J §2.10, §8 |
| Fallback if libraries bite | raw **Canvas 2D + Web Animations API**, zero deps | Works on frozen Chromium (SSSP2/3 = Chromium 32) | J §2.13 |
| Rejected as primary | Three.js/Babylon (3D overkill, manual dispose), Rive (binary `.riv` — agents cannot author), Theatre.js (stale, v0.7.0 2023), anime.js (v3→v4 drift) | J §2.3–2.8 |

**AI skills to install**
- `npx skills add https://github.com/greensock/gsap-skills` — official GSAP skills (core, timeline, plugins, performance). Free, MIT. GSAP itself free for all commercial use since 2025-04-30 (A §1.1).
- `npx skills add remotion-dev/skills` — Remotion skills for React → MP4 render (A §1.2). Confirm Remotion company licence before delivery; free ≤3 staff (J §2.10).
- No motion-graphics skill exists in this omp environment; author a local `dmb-motion` skill pinning palette, type scale, safe area, loop length (A §1.7).

---

## 2. Playback: do not over-engineer

- **Author for 1920×1080.** SoC signage players render HTML5/canvas at Full HD only (signageOS). Do not plan 4K web content (J §4, D §1.2).
- **Chromium is frozen per device.** BrightSign OS8 = Chromium 65; BrightSign 9.1 = 120; Tizen SSSP2/3 ≈ 32; webOS 6 = 79; Pi 4 = 91. Target WebGL1 + ES5-safe build; feature-detect WebGPU, never require it (J §4, §2.11).
- **Player + CMS shortlist** (D §1.1): **Xibo self-hosted (free) + Pi 5 / x86 mini-PC**, content shipped as an *HTML Package* widget (`index.html` served locally on port 9696 → runs offline); or **Yodeck / Screenly** if a cloud bill is preferred (custom JS supported, offline ≥ 1 month on Yodeck). Samsung Tizen / LG webOS only if the panel's own SoC is the player.
- **Screen:** 43″–55″ commercial panel, 500 nit, non-glare/haze, 24/7 rated, landscape or portrait (D §2). Nits ≥ 2× ambient lux (window-facing needs 700–1000 nit).
- **Reliability, mandatory and stack-agnostic** (J §6): nightly watchdog reload; animate only `transform`/`opacity`/`filter`/`clip-path`; fixed-timeline (elapsed-time) animation, no wall-clock deltas; preload once, dispose on teardown, handle `webglcontextlost`; active cooling + high-endurance SD/NVMe (SD wear ≈ 70 % of field failures); Pi 5 throttles at 80–85 °C.

**MP4 encode (if using the Remotion path)** (D §3):
```
ffmpeg -i in.mov -c:v libx264 -profile:v high -level 4.1 -pix_fmt yuv420p \
  -b:v 10M -maxrate 12M -bufsize 24M -g 60 -keyint_min 60 -sc_threshold 0 \
  -r 30 -s 1920x1080 -c:a aac -b:a 128k -movflags +faststart out.mp4
```
1920×1080, 25/30 fps, 8–12 Mbps (25 Mbps cap on BrightSign), GOP = 2 s, `+faststart`, sound-off, seamless loop (frame 0 = last frame, no black tail, no audio pop).

---

## 3. Craft rules (from the sector research)

**Structure:** the menu stays static. Motion lives in exactly one promo/LTO panel, an ambient hero-food loop, or an order-confirmation surface (R Part A — consistent across McDonald's, Wendy's, Pret, Starbucks, DACH installs).
**Spot:** 10–15 s promo slot; 15 s is the DOOH default. Sound-off by design. First/last frame = brand lockup. Safe area = inner 80 %.

| Viewing distance | Min body text (1080p) | Headline (2×) | Comfortable cap height | Contrast | Dwell |
|---|---|---|---|---|---|
| 2 m (counter) | ~28 pt | ~56 pt | 17 mm | ≥4.5:1 (7:1 preferred) | 5–15 s |
| 5 m (queue) | ~51 pt | ~102 pt | 42 mm | ≥4.5:1 (7:1 preferred) | 3–5 s |
| 10 m (door/street) | ~91 pt | ~182 pt | 83 mm | ≥7:1 | 1–3 s |

Formula (vendor guidance, 1080p): body pt = 12 + 7.9 × metres(ft form: 12 + 2.4 × ft); headline = 2×; fine print = ⅔ body.
**Type:** sans-serif only, mixed case, weight ≥400, no condensed/script; stroke width 10–30 % of cap height; line spacing 135–170 % (ADA 703.5 / Section 508 402.4).
**Motion:** transitions 0.3–0.5 s, entrances 0.2–0.3 s, ease-in-out/ease-out, never linear; no flashing >3 Hz; never move two elements at once.
**Contrast:** design luminance contrast, not hue (red-on-green and blue-on-red fail CVD). DOOH daylight floor 7:1 for text under 60 % of frame height.
**Rules (R Part B/D):** 3×5 rule (≤3 lines, ≤5 words/line); price directly after the item name, one size step below; no dot-leader price columns; dayparts = separate layouts, not swapped items.

**Brand application (D §5, observed from assets — not an official guide):** type colour `#FEFAE0` (cream, the logo fill) on near-black/olive ground `#202520`–`#65765A` → ≈15:1 contrast. Accents `#B5BEA0`, `#778276`. Typeface on the current menu: Lato / Aptos / Arial (sans). Use the operator's own dish photography.

---

## 4. Legal must-do (Germany/EU) — binds the animation content

1. Every on-screen price = **final consumer price incl. VAT and service charge** (PAngV §§ 3(1), 13(5)).
2. **Grundpreis** (per kg/l) required for goods sold by weight/volume (beans, loose deli) unless a § 4(3) exception clearly applies.
3. Price must sit **directly with the image/description** of the item — PAngV § 10(4) names screens ("auf Bildschirmen") explicitly.
4. Screen must be **legible from the ordering position and from the entrance**; the entrance price-list duty (§ 13(2)) still applies.
5. **Allergens on the board** for every non-prepacked item, readable before purchase, never obscured by motion (LMIV Art. 44(1)(a); LMIDV § 4(3) Nr. 2/4). Existing menu letters A, F, G, N… are the data source.
6. **No unauthorised health claims** — "superfood", "detox", "boosts immunity", "cleanses" are not authorised (Reg. (EC) 1924/2006; non-authorised claims banned since 2012-12-14).
7. **Promo imagery must be the real dish** — misleading pictures count as statements (UWG § 5(2) Nr. 1 + § 5(4)).
8. No "was/now" animation unless the old price genuinely ran (UWG § 5(5), burden of proof on the advertiser).
9. If AI-generated video of realistic scenes is used: **visible AI disclosure** at first exposure (EU AI Act Art. 50(4), deployer duty; enforcement from 2026-08-02, grace to 2026-12-02 for pre-existing systems). Keep C2PA marks intact.
10. Shopping-window/facade screens may need a permit (BauO Bln §§ 61, 63a) — resolve with the district Bauamt before mounting anything facing the street. Indoor screens: very unlikely to require a permit.

---

## 5. Ko Kitchen facts (verified from the operator's own site/assets)

- ko kitchen, **Harzer Str. 39, 12059 Berlin (Neukölln)**; operator Nico Borchert; VAT DE368760326.
- Site kokitchen.berlin; Instagram **@kokitchencatering**; Deli + Catering; Mon–Fri 12:00–15:00 per header.
  **Conflict:** the Deli page's own hours table says Mon–Thu 12:00–15:00, Fri–Sun closed. Verify with the owner before scheduling dayparts.
- **Weekly rotating lunch board**, published as printable HTML (`faramirezs.github.io/ko-kitchen-menu/kk-print-menu.html`), current edition KW40 (28.09.–01.10.26): signature red curry daily (+ halal chicken option), Mon–Thu changing mains, allergen letters already present.
- **Prices are not published anywhere** — must come from the owner; this is the first data gap for price animation.

---

## 6. Open gaps

1. **No published prices** and no formal brand guide — needed for real content.
2. Opening-hours conflict (§ 5).
3. Chain loop lengths / menu:promo ratios are not public — industry norms used throughout (R Part A).
4. WebGPU on Pi 5 / Tizen kiosk Chromium is unverified — test on-device if ever needed.
5. Remotion company-licence terms and Envato/Motion Array prices were not verified first-hand (A §3, §6).
6. Whether ADA/Section 508 applies to a Berlin deli's screen — not researched (R Part B3); the German rules in § 4 above are the binding set.

---

## 7. Next build step

Thin slice, one promo panel, one screen:
1. Build a single 1080p GSAP page: static menu region (type scale from § 3) + one animated promo panel (10–15 s, seamless loop, sound-off).
2. Render the same composition via Remotion to MP4; compare on the actual screen at 2 m and 5 m.
3. Ship as an Xibo HTML Package (live menu/price variant) or MP4 (hero loop variant) on a Pi 5.
4. Gate every future promo on the § 4 checklist.
