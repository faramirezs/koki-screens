# Digital Menu Board (DMB) motion graphics — sector references & legibility constraints
**Prepared for:** Ko Kitchen, Berlin (coffee/deli; in-store screens showing menu + looping promo ads)
**Date:** 2026-09-29
**Author:** research subagent
**Method:** `web_search` + direct source reads. Every factual claim below carries a link. Items I could not verify are marked **[uncertain]**.

> **Reading convention:** (a) *Sourced facts* are quoted/cited. (b) *Synthesis/recommendation* is written as such. Vendor guides (Yodeck, MediaSignage/DigitalSignage.com, Samsung VXT) are marketing content, not standards — flagged where used.

---

## Part A — Reference exemplars (DMB motion design)

Concrete, *publishable* motion specs (loop length, per-second tempo, exact content-mix %) are almost never disclosed by chains; vendors publish only stills and integration case studies. Where a numeric loop length is not published I say so rather than guess. The pattern below is what the disclosed sources support.

### A1. Quick-service chains

| # | Brand | Format / motion (as disclosed) | Loop / timing | Content mix | Legibility approach | Source |
|---|-------|-------------------------------|---------------|-------------|---------------------|--------|
| 1 | **McDonald's** | Indoor + outdoor DMBs; dynamic menu, real-time pricing; content pushed centrally | Not published **[uncertain]** | Menu + national/regional promos; "required / default / local" item tiers | 40,000 screens / 45 agencies forced a strict required-item structure; push (not pull) updates; white space collapses when a local slot is empty | Coates Group case study; Digital Signage Today (Rich/Rick Cook, 2017) |
| 2 | **Wendy's** | Drive-thru DMB since 2009; LTO and Twitter-fed dynamic content; "long shots" food photography as giant-font hero | Not published **[uncertain]** | LTO-led with balanced animation "so customers have sufficient time to read" | Explicit rule from coverage: "Animations if too quick annoy the viewers" — balance motion vs. read time; big type + a few words ("Fresh") | DotSignage; QSR Magazine 2024 ($20M DMB rollout) |
| 3 | **Taco Bell** | DMB animation + video used to highlight LTO ("Rolled Chicken Tacos"); designed/directed in-house (Global Brand Creative) | Not published **[uncertain]** | LTO product on menu-board real estate | LTO spot designed for the menu-board panel, not full screen | Cameron Davis portfolio (Taco Bell DMB project) |
| 4 | **KFC** | 1,000+ UK/IE stores: counter arrays, wall units, freestanding totems, drive-thru; "multi-day-part programming" | Dayparted **[uncertain]** on exact interval | Promo + pricing, LTOs, POS-synced accuracy | High-brightness, weatherproof drive-thru screens; separate in-store vs. drive-thru layouts; real-time promo push | TRISON KFC case study; LG/Pioneer KFC UK case study; PosterBooking KFC |
| 5 | **Pret A Manger** | First drive-thru (Oakwood Gate, Warrington): triple-screen menuboard; one panel converts to live *order-confirmation*; outdoor lane "high-impact brand messaging" screen; portrait menuboards + window displays inside | Not published **[uncertain]** | Menu (triple panel) + brand lane screen + order confirmation | Dedicated lane audio (drive-thru is *not* sound-off); a reserved order-confirmation surface keeps the menu static while confirmation updates | TRISON Pret case study |

### A2. Café / fast-casual / DACH-EU

| # | Brand | Format / motion (as disclosed) | Loop / timing | Content mix | Legibility approach | Source |
|---|-------|-------------------------------|---------------|-------------|---------------------|--------|
| 6 | **Starbucks** | Indoor + drive-thru boards at a NY Thruway travel plaza; automated dayparting (breakfast → lunch → afternoon beverage push) | Dayparted | Full menu rotated by daypart; "strategically positioned promotional visuals for LTOs" | Dayparting removes irrelevant items to *reduce decision time*; same CMS drives indoor and drive-thru layouts | OSM Solutions (Ulster Travel Plaza case study) |
| 7 | **Sweetgreen** | Dynamic menus + video walls; ingredient-origin / sustainability storytelling; live order-status screens | Ambient loops **[uncertain]** | Menu + brand/sustainability narrative (brand-heavy) | Seasonal ingredient storytelling in dedicated zones; dynamic menus separate from narrative screens | TRISON Sweetgreen case study |
| 8 | **Vapiano (DE)** | Digital menu boards as part of a full relaunch (menu, website, guest journey 3.0); daypart/time-controlled playback | Time-controlled | Menu + daily offers | Centralised, time-triggered menu (breakfast/lunch/evening) | Bütema AG (Vapiano reference install); food-service.de (2022 relaunch) |
| 9 | **L'Osteria (DE, 170+ outlets, 9 markets)** | DMBs + self-order kiosks rolled out DE/AT/PL/RU; strategy-led "digital ecosystem" | Not published **[uncertain]** | Menu + POS-driven pricing | Runs on standard software, not per-store customisation; comparable-KPI discipline | Apicbase interview, Peter Schimpl (VP Digital & IT) |
| 10 | **dean&david (DE)** | Kitchen + front-of-house screens; "In the morning, we can see the whole dean&david world on screen at a glance" | Not published **[uncertain]** | Menu + operations | Consolidates dispersed info onto screens rather than layering animation | Rational reference (dean&david, Munich) |
| 11 | **Bäckerei/Café DACH installs** — Le Crobag, Nordsee, Frittenwerk, MaryLou, Bäckerei Gasser, Tankstellen-Shops | Animated menu templates ("animiert und appetitanregend"), time-triggered Wochenthemen | Time-controlled | Menu + Tagesangebote | In-house graphic team builds animated templates "abgestimmt auf Ihre Marke & Produkte"; 24/7 screens | Bütema AG références & FAQ |
| 12 | **McCafé (McDonald's)** | Largest DMB project at rollout (Stratacache), >12,600 US units | Not published **[uncertain]** | Beverage-led menu | Beverage-led boards separate from the core food DMB | Fast Casual (NRA 2011) |

**Synthesis (recommendation, not sourced):** Across every disclosed case the *menu itself stays static*; motion is confined to (i) one promo/LTO panel, (ii) an ambient hero-food loop, or (iii) an order-confirmation surface. Fast-casual/café formats (Starbucks, Sweetgreen, dean&david) lean brand/sustainability-heavy; drive-thru QSR (Wendy's, KFC, Taco Bell) leans LTO/promo-heavy. Ko Kitchen (coffee/deli, order-at-counter) sits closest to the Starbucks-travel-plaza model: menu static + dayparted, one moving promo panel.

---

## Part B — Quantitative legibility constraints

### B1. Distance → type size

**The industry rule of thumb (not a standard):**
- **1 inch (25 mm) of letter height per 10 ft (3 m)** of viewing distance reads *comfortably*. Source: DigitalSignage.com typography guide; Pannier Graphics.
- **1 inch per 20 ft** is the *minimum* legible. Source: DigitalSignage.com.
- **1 inch per 40 ft (12 m)** is the *highway* rule of thumb in the FHWA MUTCD design guidelines — i.e. the "1:10" number is a signage-industry convention, **not** the MUTCD figure. The MUTCD only mandates letter heights for road signs (e.g. principal legend ≥6 in/150 mm on rural major routes; ≥4 in/100 mm on urban 25 mph/40 km/h streets). Source: MUTCD "Design Guidelines" (FHWA), p. 8-1.
- The underlying legibility research is NBS/FHWA *"Size of Letters Required for Visibility as a Function of Viewing Distance and Observer Visual Acuity"* (govinfo). **[uncertain]** — the PDF is image-only; I could not extract the plotted stroke-width/acuity numbers without OCR.

**Practical formula (vendor guidance, 1080p canvas):**
- Minimum body text (pt) = **12 + 2.4 × distance(ft)**; equivalently **12 + 7.9 × distance(m)**.
- Headline = **2 × body**; fine print = **body × 2/3**.
- Alternative short form: **text height (in) = distance(ft) ÷ 25** (minimum).
- Source: DigitalSignage.com typography guide; DigitalSignage.com content guide.

**Comfortable vs. maximum:** comfortable reading distance is **~30–50 % shorter** than maximum — design for the comfortable distance. Source: Pannier Graphics.

| Viewing distance | Min body text (formula, 1080p) | Headline (2×) | Comfortable cap height (1 in / 10 ft) | Min cap height (1 in / 20 ft) |
|---|---|---|---|---|
| **2 m (6.6 ft)** | ~28 pt | ~56 pt | ~0.66 in / 17 mm | ~0.33 in / 8 mm |
| **5 m (16.4 ft)** | ~51 pt | ~102 pt | ~1.6 in / 42 mm | ~0.8 in / 21 mm |
| **10 m (32.8 ft)** | ~91 pt | ~182 pt | ~3.3 in / 83 mm | ~1.6 in / 41 mm |

> Point sizes assume a **1080p canvas** (1 pt ≈ 1.33 px). Double pt on a native 4K canvas. Physical height also depends on display PPI (e.g. 55″ 1080p = 40 PPI → 84 pt = 2.8 in). Source: DigitalSignage.com.

### B2. Contrast

| Standard | Normal text | Large text | Notes |
|---|---|---|---|
| WCAG 2.2 SC 1.4.3 (AA) | ≥ **4.5:1** | ≥ **3:1** | "Large" = ≥18 pt (≈24 px) or ≥14 pt bold (≈18.66 px). Thresholds not rounded (4.499:1 fails). |
| WCAG 2.2 SC 1.4.6 (AAA) | ≥ **7:1** | ≥ **4.5:1** | Used as the DOOH daylight floor (see below). |
| DOOH daylight recommendation | ≥ **7:1** for text under 60 % of frame height | — | "Outdoor screens compete with direct sunlight." Source: DOOH Marketing specs. |
| Recommended signage practice | 4.5:1 min, **7:1 preferred** | — | Source: DigitalSignage.com. |

- The 3:1 baseline comes from **ISO 9241-3** and **ANSI/HFES 100-1988**; the 4.5:1 ratio compensates for contrast-sensitivity loss equivalent to 20/40 vision; 7:1 ≈ 20/80. Source: WCAG 2.2 Understanding SC 1.4.3.
- **Colour-blindness:** red-on-green and blue-on-red degrade; hue doesn't affect luminance contrast for CVD users — design for luminance contrast, not hue. Sources: WCAG; DigitalSignage.com.
- **Glare/daylight:** matte, non-glare finishes; test by viewing a phone at max brightness outdoors (free approximation of an outdoor LED). Sources: ADA 703.5.1 advisory; DOOH Marketing.

### B3. x-height, case, stroke width, spacing

- **Sans-serif** for all signage text; no italic, oblique, script, decorative, or unusual forms (ADA 703.2.3 / 703.5.3 for signs; Section 508 402.4 for display screens).
- **Mixed case** is more legible than all-caps for body text; all-caps slows reading. Source: DigitalSignage.com; Pannier Graphics.
- **Stroke width** of the uppercase "I": **10 % min, 30 % max** of character height (ADA 703.5.7). Section 508/ADA display-screen characters: **≥3/16 in (4.8 mm)** high based on uppercase "I" (≈16 pt in most typefaces).
- **Character spacing:** 10 % min – 35 % max of character height (ADA 703.5.8). **Line spacing:** 135 % – 170 % of character height (ADA 703.5.9).
- **Letter proportions:** uppercase "O" width 55 %–110 % of uppercase "I" height (ADA 703.2.4 / 703.5.4).
- Humanist/neutral sans hold up best (Helvetica, Frutiger, Arial, Roboto, Lato); avoid condensed, thin (<400 weight), and script faces. Sources: Pannier Graphics; DigitalSignage.com; Samsung VXT.

> **ADA scope caveat:** ADA Chapter 7 governs *architectural signs* (raised/tactile and visual characters on walls), not menus on screens. The **display-screen** rule (≥4.8 mm uppercase "I", sans-serif, light-on-dark or dark-on-light) is **ADA 707.7.2 / Section 508 402.4** — this is the closest federal analogue for a menu screen. **[uncertain]** whether ADA/Section 508 formally applies to a private Berlin deli's menu board (EU/German law may differ; not verified here).

### B4. Dwell time, loop length, text per frame

| Context | Attention / dwell | Max words | Source |
|---|---|---|---|
| Passing by / transit | 1–3 s | 7–10 words | DigitalSignage.com |
| Retail browsing / queue | 3–5 s | 15–20 words | DigitalSignage.com |
| Waiting area | 5–15 s | 30–50 words | DigitalSignage.com |
| Dedicated viewing | 15–30 s | 75–100 words | DigitalSignage.com |

- **3-second rule:** message understood in ~3 s or redesign. **3×5 rule:** max 3 lines, max 5 words/line, 3–5 s viewing. Source: DigitalSignage.com.
- **Reading speed:** comfortable 200–250 wpm (≈17–21 words per 5 s). Source: DigitalSignage.com.
- **Content rotation (vendor guidance):** simple message 5–8 s; product feature 8–12 s; **menu items 10–15 s**; video 15–30 s. Yodeck: **10 s floor** for any slide with more than a headline. Source: DigitalSignage.com; Yodeck.
- **OAAA (billboards):** digital billboards rotate static messages every **6–8 seconds**. Source: OAAA.
- **Animation timing:** transitions 0.3–0.5 s; fades/dissolves 0.5–1.0 s; text entrance 0.2–0.3 s; attention pulse 0.5–1.0 s. 30 fps recommended. Source: DigitalSignage.com motion-graphics guide.
- **Flashing:** no faster than **3 Hz** (US DOT requirement for roadside inventory / most municipal ordinances). Source: DOOH Marketing.
- **Text-per-frame limits (synthesis):** 3 lines × 5 words = 15 words max for a glance-read frame; at 5 m+ assume one line ≤7 words.

### B5. Safe area, margins, composition

- Keep critical text/logo/CTA inside the **inner 80 %** of the canvas (≈10 % margin each side); bleed background art to the full frame. Sources: DOOH Marketing; DigitalSignage.com.
- Brand lockup in the **upper-left or centre third** — least-cropped region across networks. Source: DOOH Marketing.
- **Broadsign/LED caveats:** some panels crop/rescale a few pixels (e.g. 1888×1062 vs 1920×1080); never place text across video-wall bezels. Source: DOOH Marketing.
- **Headline ≥8 % of frame height** (≈86 px on 1080p); body/legal ≥3 % (≈32 px) only in long-dwell venues. Source: DOOH Marketing.

### B6. Colour & environment

- Neutral/cool backgrounds; reserve vivid hues for accents and borders; keep text black-on-white or white-on-black; let food photography supply the colour. Source: QSR Magazine.
- Avoid: red-on-green, blue-on-red, light-grey-on-white, yellow-on-white, any colour on a busy image. Source: DigitalSignage.com.
- **Content mix (vendor guidance):** 40 % primary message/promo, 20 % brand/image, 20 % information/utility, 15 % engagement, 5 % CTA. Source: DigitalSignage.com. (Yodeck's menu-specific ratio: ~2/3 text+structure, 1/3 imagery.)

---

## Part C — Typical promo/ad formats on DMB

**Spot lengths.** Accepted DOOH spot lengths are **8, 10, 15, 20 and 30 seconds**; 15 s is the common default. Source: DOOH Marketing (portal section + page title); IAB DOOH glossary ("a unit interval (e.g., 10-second, 15-second, 20-second, 30-second…)").

**Sound-off design.** Treat DOOH as **sound-off by default**; every message must work muted. Supply a parallel muted master alongside any audio version. Audio is permitted only in a minority of venues (gyms, some bars, select EV, some malls). Source: DOOH Marketing. *(Exception: drive-thru lane audio — Pret/KFC use a lane audio system; a counter-service café is sound-off.)*

**Loop structure.**
- First and last frames = brand lockup; many networks freeze the last frame between loops.
- Loops must be **seamless** if played back-to-back (in-store, pump-top).
- Avoid full-screen white flashes.
- Subtle motion (one animated element) outperforms full-motion video in glance-only environments. Sources: DOOH Marketing; Yodeck ("one moving element per screen, and never the menu itself").

**Menu-plus-promo-strip layouts.**
- Standard DMB template: category header → item list (name…price, short description) → **featured-item/promo panel at the bottom**. Source: DigitalSignage.com menu-board layout.
- Promo panel gets its *own zone*; never interrupt a menu a customer is reading. Source: Yodeck.
- 60/30/10 colour rule: 60 % background, 30 % secondary elements, 10 % accent/CTA. Source: DigitalSignage.com.

**Dayparting (breakfast / lunch / afternoon).**
- Dayparting is "a design decision first and a software feature second" — each daypart gets its own *layout*, not just swapped items. Source: Yodeck.
- McDonald's historically hand-cranked the breakfast→lunch switch; digital boards made it instant. Source: SmarterSign.
- KFC: "multi-day-part programming" pushes promo/pricing automatically. Source: TRISON.
- Starbucks travel plaza: breakfast dominates early, lunch combos at midday, promoted beverages in the afternoon slump. Source: OSM Solutions.
- Vendor daypart table (morning/midday/afternoon/evening/late-night) with audience + content focus. Source: DigitalSignage.com.
- Transition handling: use a subtle interlude (countdown / rotating image) to signal a menu change. Source: SmarterSign.

**Hero-food closeups vs. animated price callouts.**
- Food photography drives appetite/impulse ("photographs could do 50 % of the selling"); use quality *and* quantity, one strong image per category, honest to portion/size. Sources: QSR Magazine; Yodeck; Samsung VXT.
- Faces/gaze can *distract* from brand message; point gaze/body toward the key info, or use arrows. Source: Vistar Media DOOH whitepaper.
- Price animation techniques: count-up (accumulation), flip/roll (live updates), scale pulse (emphasising a discount), strike-through (old→new price). Keep prices static while the item is being read. Sources: DigitalSignage.com motion guide; Yodeck.
- Pricing display: price size one step below the item name; price tight after the item name (not a right-aligned dotted column); removing currency symbols increased spend ~8 % in a Cornell study. Source: Yodeck (citing Cornell).

---

## Part D — Do / Don't for Ko Kitchen (Berlin coffee/deli)

Assuming a counter-service deli/café: primary viewer 1–3 m at the counter, 3–6 m in the queue/entrance, up to ~10 m from the street/door.

### At ~2 m (counter, decision point)
**Do**
- Item names ≥ **28 pt** on 1080p (≈17 mm cap height); prices same or one step smaller, immediately after the name.
- One line of description max; use dietary/allergen **icons + a legend** instead of prose.
- Keep the menu static; animate at most one promo panel.
- Contrast ≥ 4.5:1 (7:1 preferred).

**Don't**
- Don't run letter-by-letter or rotating item names — a price that slides away forces the customer to start over.
- Don't exceed ~15 words on any single glance-frame (3×5 rule).
- Don't use dot leaders / right-aligned price columns (invites down-column price comparison).

### At ~5 m (queue / entrance)
**Do**
- Item names ≥ **50 pt** (≈42 mm cap); headlines ~2× body.
- Category headers large + colour-blocked; 6–10 items per screen maximum.
- One strong hero photo per category; ~2/3 text, 1/3 imagery.
- Give each screen/slide ≥10 s if it carries more than a headline.

**Don't**
- Don't shrink type to fit a 40-item all-day menu — split across screens or dayparts instead.
- Don't let two elements move at once (eye bounces, nothing is read).
- Don't use thin (<400) or condensed/script faces.

### At ~10 m (door / street / back of a long queue)
**Do**
- Headline-scale only: ≥ **90 pt** (≈83 mm cap); 1 line, ≤5–7 words (e.g. one daily offer).
- Highest possible luminance contrast; brand lockup in upper-left/centre third.
- Test at real distance in real lighting before publishing.

**Don't**
- Don't expect menu detail to read at 10 m — treat it as a brand/offer surface, not the menu.
- Don't rely on hue alone (colour-blind viewers); don't use low-contrast or busy-photo backgrounds.
- Don't flash faster than 3 Hz.

### Cross-cutting
- **Do** design dayparts as separate layouts (Frühstück / Mittag / Nachmittag), scheduled to switch automatically.
- **Do** keep one safe margin of 10 % and a fixed layout structure (regulars learn where things live).
- **Do** plan a muted master (sound-off) and a seamless loop with brand frames first/last.
- **Don't** put long descriptions or nutrition tables on the board — those belong on an interactive/QR surface.
- **Don't** design on a laptop and approve from a chair; preview at actual size and actual viewing distance.

---

## Part E — Implementation notes for JS/WebGL authoring (brief)

*(Context only; the Change scope is references/legibility/formats. Flagged as synthesis.)*
- Vendor guidance converges on **30 fps** (60 fps for heavy motion), constant frame rate, H.264/MP4 for delivery; sRGB colour; headline ≥8 % of frame height. Sources: DigitalSignage.com motion guide; DOOH Marketing specs.
- 0.3–0.5 s eased transitions; ease-in-out for general motion, ease-out for entrances. Never linear. Source: DigitalSignage.com motion guide.
- For a browser-rendered (WebGL/Canvas) loop, implement the promo panel as an isolated render surface so the menu layer can stay fully static; drive dayparts from a time schedule, not user interaction. *(Synthesis — not sourced.)*
- No source verified a specific JS/WebGL DMB library; treat library choice as an engineering decision, not a sector norm.

---

## Sources (strongest linked)

1. DigitalSignage.com — *Typography & Viewing Distance Guide* (2026): https://digitalsignage.com/digital_signage/docs/guides/typography-viewing-distance/
2. W3C — *Understanding SC 1.4.3 Contrast (Minimum)* (WCAG 2.2, REC 2024-12-12): https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum
3. U.S. Access Board — *ADA Chapter 7 Signs* (703.2, 703.5, 707.7.2): https://www.access-board.gov/ada/chapter/ch07
4. FHWA — *MUTCD Design Guidelines* (letter height, 1 in/40 ft): https://mutcd.fhwa.dot.gov/shse/design.pdf
5. DOOH Marketing — *DOOH Creative Specs Guide 2026* (spot lengths, safe area, sound-off, 3 Hz): https://doohmarketing.com/dooh-creative-specs-guide
6. Yodeck — *Digital menu board design* (motion rules, dayparts, pricing, Cornell): https://www.yodeck.com/use-cases/how-to-design-digital-menu-board/
7. Pannier Graphics — *Letter Height Visibility Chart* (comfortable vs. max): https://www.panniergraphics.com/blog/letter-height-visibility-chart-for-outdoor-sign-readability
8. TRISON — *KFC* (1,000+ stores, multi-daypart) / *Pret* (drive-thru triple screens) / *Sweetgreen*: https://trisonworld.com/projects/kfc/ · https://trisonworld.com/projects/pret-oakwood-gate/ · https://trisonworld.com/projects/sweetgreen/
9. Coates Group — *McDonald's ANZ* (+15 % order accuracy): https://coatesgroup.com/case-studies/mcdonalds-anz-digital-signage-for-order-accuracy
10. OSM Solutions — *Starbucks travel plaza* (dayparting): https://osmsolutions.com/how-a-travel-plaza-starbucks-transformed-its-digital-menu-boards-for-speed-and-revenue/
11. QSR Magazine — *How to Design an Engaging Digital Menu Board* (2025-01-27): https://www.qsrmagazine.com/growth/fast-casual/how-to-design-an-engaging-digital-menu-board/
12. Samsung VXT — *9 Digital Menu Board Design Tips* (2024-03-15): https://vxt.samsung.com/blog/restaurant/restaurants-digital-menu-board-design-tips
13. Section508.gov — *Accessible Fonts & Typography* (3/16 in rule; ADA/508): https://www.section508.gov/develop/fonts-typography/
14. OAAA — *Digital Billboards* (6–8 s rotation): https://oaaa.org/resources/digital-billboards
15. Vistar Media — *The Art of DOOH* whitepaper (faces/gaze, contrast, 13 ms image processing): https://www.vistarmedia.com/hubfs/VM%20-%20Creative%20Studio%20collateral%20(Martine)/Vistar%20Media_The%20Art%20of%20DOOH%20Whitepaper_Refresh%202025.pdf

---

## Open uncertainties (explicit)

- **[uncertain]** Exact loop lengths / animation tempos at each named chain — not publicly disclosed; vendor pages show stills only.
- **[uncertain]** Chain-specific menu:promo ratios — none published; industry norms used instead (DigitalSignage.com 40/20/20/15/5; Yodeck 2/3 text, 1/3 imagery).
- **[uncertain]** NBS/FHWA letter-size/acuity study numbers (image-only PDF; needs OCR).
- **[uncertain]** Whether US ADA/Section 508 applies to a private Berlin deli's on-screen menu (German/EU accessibility law not researched in this pass).
- **[uncertain]** Loop/dwell data for the DACH bakery/café installs (Bütema, Le Crobag, Nordsee) — only qualitative claims published.
