# DMB deployment: players/CMS, screen specs, encoding, German/EU law, Ko kitchen brand

Research date: 2026-09-29. All facts sourced; `[uncertain]` = not verified. Text in **[brackets bold]** is my synthesis/recommendation, not a sourced fact.

---

## 1. Players & CMS

### 1.1 Comparison

| Option | Type / cost | Video | HTML5 / JS / WebGL | Remote update | Offline | Runs custom JS/WebGL natively? |
|---|---|---|---|---|---|---|
| **Anthias** (ex-Screenly OSE) | Free, open source (AGPLv3); runs on Pi 2–5, 64-bit x86 PC, 64-bit ARM SBC (Armbian) | Photos, videos, web pages, YouTube, live streams; 1080p output | Web content rendered in embedded browser; **no WebGL claim in docs** | Web dashboard on device (port 80); REST API; balena OTA images | Yes — content local, plays with no network | **Yes for HTML/JS via Chromium-rendered web page; WebGL [uncertain]** |
| **Screenly** (commercial) | $15 / $24 / $38 per screen/month billed annually (Starter/Business/Enterprise) | Up to 1080p (Starter), 4K (Business) | Images, video, streams, apps, web pages; "Build custom apps with Screenly Apps"; Cloud API | Cloud dashboard | Yes — content caching/offline playback | **Yes for HTML/JS apps; WebGL [uncertain]** |
| **Xibo** | Open source CMS (self-host or cloud); Windows player free (AGPLv3); perpetual commercial licences for Android, LG webOS, Samsung Tizen | Any media widget; video widget | **Embedded** widget (HTML + JS, jQuery auto-added, `EmbedInit()` hook), **HTML Package** widget (whole HTML structure, local `index.html` served from player web server port 9696, Chromium engine), **Webpage** widget (external hosting) | CMS scheduling, layouts, campaigns, dayparting | Yes — HTML Package is local, works when network drops | **Yes — the most explicit JS story of the set. WebGL [uncertain but Chromium engine → likely]** |
| **Yodeck** | Cloud CMS; free forever for 1st screen; annual plans include free player hardware | Any video (auto-adapted); HLS/RTP/MPEG-TS live | Web page display, preload, zoom, auto-refresh; **"Webpage Automation & Custom JS Implementation — run custom code inside the page and do whatever you want"**; custom apps | Cloud dashboard; auto firmware updates | Yes — locally stored, **≥1 month, up to 35 days offline** | **Yes — custom JS inside a page/app** |
| **PiSignage** | ~$1.70 / screen / month (homepage) | Natively MP4 (H.264); server auto-converts others; up to 1080p | "HD content support for images, html, web links"; **plain HTML and HTML repos (.zip with index.html)**; **SVG animation**; CSS tickers | Cloud; REST API; Swagger docs | Yes — "players can work offline" | **Yes for HTML/SVG/CSS; WebGL not documented [uncertain]** |
| **BrightSign** | Hardware players (LS/HD/XD/XT/XS series) + BrightAuthor:connected or third-party CMS (Yodeck/Navori manage BrightSign) | XS6/HD6/XD6: H.264/H.265/VP9, 4K60. XD5/LS5: H.265 4K, H.264 4K max 30p. Containers MP4/MOV/MKV/WEBM/TS. **HD max recommended 25 Mbps** | HTML5 via Chromium (BrightSign "HTML Best Practices" wiki); needs a CMS or local authoring | Varies by CMS; BrightSign has its own network management | Local content plays offline | **Yes — Chromium HTML5; WebGL [uncertain]** |
| **Samsung Tizen SSSP / Smart Signage** | Built into commercial displays (SoC); MagicINFO 9 CMS; Tizen Enterprise Platform + Business Manager for zero-touch | Up to 8K video by model; MPEG-DASH/HLS | **HTML5, DOM3, CSS3, Chromium web engine, WebAssembly (C/C++ near-native)**; app distribution via TV Seller Office | Remote Web Inspector; Tizen Business Manager; MagicINFO | Depends on app design | **Yes — best first-class WebGL/WebAssembly story (Chromium + WASM). Confirm WebGL per model year** |
| **LG webOS Signage** | Built into SM-series and higher commercial displays (SoC); SuperSign CMS | Native media player embedded | **HTML5, JavaScript, CSS, "cross browser"**; partner apps install on the display | Remote device management, screenshots, power | App can be **fully offline with onboard storage** | **Yes for HTML5/JS; WebGL [uncertain]** |
| **ChromeOS kiosk** | ChromeOS device + **management licence**; cloud Admin console | Browser-played video | **PWA is the recommended model**; service workers + Cache API/IndexedDB for offline video; Project Fugu capabilities | Google Admin console: policies, app deploy, OS updates, screenshots, status | Yes via service worker caching (design work required) | **Yes — full Chromium, so WebGL well supported** |
| **Raspberry Pi 4 / 5** (as host) | Pi 5 launch price **$60 (4GB) / $80 (8GB)** + tax, SD, PSU, case; Pi 4 similar | H.264/H.265 hardware decode; Pi 5 adds VP9/AV1 | Pi 4 ships Chromium 91, Pi 3 WebKit 78 (signageOS list) — **pin your Chromium target** | Only via the CMS you layer on it (Anthias/Yodeck/PiSignage) | Yes | **Yes for WebGL if you target the pinned Chromium; Pi 5 safest** |
| **Android signage stick** (e.g. Amazon Signage Stick) | **Amazon Signage Stick $99.99 (launched Oct 2024)**, quad-core SoC, 4K; OptiSigns OptiStick etc. | 4K H.264/H.265 typically | Android WebView (Chromium), updatable | Vendor CMS/portal | Yes with vendor CMS | **Yes for WebGL (Chromium WebView); check WebView version** |

### 1.2 Notes that matter for a JS/WebGL authoring workflow

- **Xibo is the clearest "ship a web build" path.** The HTML Package widget puts your whole bundle on the player and serves `index.html` locally (port 9696), so it works offline. Gotcha: XHR from that origin is cross-origin (CORS); "if this is not acceptable … the only option is a Web Page Widget and external hosting." The Embedded widget injects Xibo's own libraries (jQuery) — avoid for a self-contained WebGL app.
- **Yodeck and Xibo both allow running custom JS inside a hosted page**, which is the lowest-friction way to reuse one WebGL build across screens.
- **"Instant transitions (no black screens between Media)"** is an explicit Yodeck feature; this is exactly what a menu board loop needs at the seam.
- **Legacy-device sunset to plan around:** Xibo Cloud **ends HTTPS support for legacy Android, webOS and Tizen devices on 30 June 2028**. Chrome Apps in kiosk mode (the old ChromeOS signage route) are deprecated and **unsupported after April 2027** — use a PWA instead.
- **HTML rendering resolution limit:** on SoC signage platforms, HTML5/canvas is typically Full HD only (UHD browser rendering needs desktop-class CPUs). Plan WebGL at 1920×1080.

**[Recommendation]** For a single café with 2–4 screens and an existing JS/WebGL pipeline: **Xibo self-hosted (free) + a Pi 5 or x86 mini-PC per screen**, shipping the animation as an Xibo HTML Package. If you want zero-ops and a monthly bill, **Yodeck or Screenly** do the same job in the cloud with offline fallback. If you buy commercial panels anyway, **Samsung Tizen (MagicINFO) or LG webOS** run the app on the panel's own SoC, removing the external player — at the cost of per-model WebGL testing.

---

## 2. Screen specs for a café

- **Panel size / resolution:** 43"–55" is the normal menu-board range. Commercial panels are 3840×2160 (e.g. Samsung QM43B: 3840×2160, 42.5" measured) with 1920×1080 still common on lower tiers. **Design at 1920×1080** — HTML rendering on SoC players is Full HD-limited anyway.
- **Brightness (nits):** Samsung QM43B/QM55B commercial panels are **500 nit, non-glare ("Haze"), 24/7 rated, landscape or portrait**. Industry guidance: 250–400 nits = standard indoor; **500–700 nits = bright indoor / near windows**; 700–1000 nits = window-facing; >1500 = outdoor. Rule of thumb from Signagelive: **screen nits ≥ 2× ambient illuminance in lux.** Hard surface: 92 % DCI-P3, 4000:1 contrast (VA).
- **Matte vs glossy:** commercial signage panels are typically **non-glare/haze**; that is the right choice for a café with windows and spot lights. Avoid glossy consumer TVs for window-facing positions.
- **Landscape vs portrait:** commercial models support both orientations natively (QM43B lists Landscape/Portrait). Landscape for a counter-wide menu; portrait for a narrow end-cap or drinks-only board. **[Recommendation]** pick one orientation and design for it; do not rotate a layout at runtime.
- **Viewing distance / type size:** menu text is read at roughly **6–15 ft (2–4.5 m)**; a common sign rule is **1 inch of letter height per ~10 ft** of reading distance, and item names read at 10–15 ft should render ~**1.5 inches tall** on the physical screen. Contrast floor: **WCAG 4.5:1 minimum** for normal text, 3:1 for large text; treat 4.5:1 as the floor for menu type to leave headroom for glare. Two typefaces maximum; sans-serif; item names and prices stay static (motion only in the promo zone).

---

## 3. Recommended MP4 encoding for signage

Target: 1920×1080, sound-off, seamless loop, cheap hardware decode.

| Parameter | Value | Source |
|---|---|---|
| Container | **MP4 (.mp4)** — best quality/compatibility/streaming combination | MediaSignage content-formats doc |
| Video codec | **H.264/AVC** (universal hardware decode). H.265/HEVC gives ~50 % smaller files but needs 2015+ decoders | MediaSignage; BrightSign |
| Profile / level | **High profile, level 4.1** at 1080p (4.1 = 1080p60 ceiling; use 4.0 if you must) | MediaSignage encoding params |
| Chroma / bit depth | **YUV 4:2:0, 8-bit** (`-pix_fmt yuv420p`) | MediaSignage; BrightSign |
| Resolution / fps | 1920×1080 at **25 or 30 fps** (match source; 60 fps only if you truly animate at 60) | MediaSignage |
| Bitrate | **8–12 Mbps** (efficient) to **15–25 Mbps** (quality). **Cap 25 Mbps** — that is BrightSign's maximum recommended HD bitrate | MediaSignage; BrightSign |
| Keyframe interval | **2 seconds** (GOP = 2 × fps) | MediaSignage |
| Fast start | **`-movflags +faststart`** — strongly recommended by BrightSign, especially for large files and synchronised playback | BrightSign |
| Audio | Sound-off: keep a silent AAC track or omit it. BrightSign rates **AAC up to 288 kbps**. (Legacy HD600 *required* an audio layer even if silent.) | BrightSign |

Command:

```
ffmpeg -i in.mov -c:v libx264 -profile:v high -level 4.1 -pix_fmt yuv420p \
  -b:v 10M -maxrate 12M -bufsize 24M -g 60 -keyint_min 60 -sc_threshold 0 \
  -r 30 -s 1920x1080 -c:a aac -b:a 128k -movflags +faststart out.mp4
```

**Loop-safe rendering** **[synthesis, engineering rules]**
- Make frame 0 identical to the last frame; no fade-to-black and no fade-in at the head.
- Avoid burned-in black at the end of the clip — a black tail shows up as a flash at every loop. Sourced anchor: player-side "instant transitions (no black screens between Media)" is an explicit Yodeck feature, but do not rely on it across all players.
- If audio is present at all, cut on a zero crossing and make the tail read into the head; better still, ship silent. **Never** let a music sting end abruptly — an audio pop on 30 s loop is the classic signage bug.
- For a menu board, prefer a **static menu region + one animated promo region**; animate at most one element per screen and keep item names/prices static.

---

## 4. German / EU legal checklist for menu-board advertising

Which rules **bind animated price/promo content**: everything below applies to the *content* on screen (prices, allergen info, claims, imagery), plus the Berlin building rules apply to the *physical installation*.

### 4.1 Preisangabenverordnung (PAngV), version of 12.11.2021, last amended 12.05.2026

| Rule | Text of rule | Binds on screen? |
|---|---|---|
| **§ 1(1), (3)** | Scope: prices for goods/services of traders to consumers. Prices must be **clearly associated with the offer/advert**, and **easily recognisable and clearly legible or otherwise well perceivable**; price information must match price clarity and price truth. | **Yes** — this is the legibility clause that a screen must satisfy (min type size, contrast, dwell time). |
| **§ 3(1)** | Anyone offering goods/services to consumers, or **advertising with prices**, must state the **total price incl. VAT and all price components**. | **Yes** — every animated price must be the final consumer price. |
| **§ 3(3)** | If a price is broken down, the **total price must be highlighted**. | **Yes** — do not let a "from €X" or a breakdown dominate over the total. |
| **§ 4** | **Base price (Grundpreis) per kg/l/m/m²** required alongside the total for goods sold in packs/open packs/by weight/volume/length/area; for loose goods sold by weight/volume etc., **only the base price** is required. | **Sometimes.** For coffee beans / loose deli goods sold by weight, base price applies. Spring exceptions in **§ 4(3)**, notably **Nr. 3** (small retail/kiosks with counter service, e.g. kiosks, market stalls — but not if the range comes from a distribution system) and **Nr. 4** (goods offered "im Rahmen einer Dienstleistung", i.e. as part of a service). **[Assessment]** A café/deli preparing and serving food is largely a service; pre-packed beans sold at the counter are the case where Grundpreis is realistically required — check per SKU. |
| **§ 10(4)** | Goods offered **"nach Katalogen oder Warenlisten oder auf Bildschirmen"** must be priced **directly with the images or descriptions** of the goods. | **Yes, directly on point.** A screen listing goods is a price-display medium; each pictured/described item needs its price next to it. |
| **§ 13(1)** | Gastronomy: prices for food and drink must be given in a **price list (Preisverzeichnis)**. Visible displayed food/drink must be price-labelled (or the price list can substitute). | **Yes** — the screen can serve as the Preisverzeichnis **[inference; § 13 does not prescribe paper]**. |
| **§ 13(2)** | Price lists must be **clearly readable at the time of offer**, laid on tables or presented to each guest before ordering; **a price list must also be posted by the entrance** showing the essential items. | **Yes** — if the screen is the only price list, it must be readable from the ordering position *and* the entrance requirement still applies. |
| **§ 13(5)** | Prices in the price list must **include service charge and all other surcharges**. | **Yes.** |
| **§ 11** | 30-day lowest-price rule for advertised reductions (per § 11(1)). | **No for gastronomy** — § 13(1) sentence 3 expressly disapplies § 11 to price reductions in gastronomy/bars. |

Source: PAngV full text, gesetze-im-internet.de (`pangv_2022`); § 13 confirms the gastronomy carve-out from § 11.

### 4.2 LMIV / Regulation (EU) No 1169/2011 + German LMIDV

| Rule | Text | Consequence |
|---|---|---|
| **Art. 9(1)** | Mandatory particulars list (name, ingredients, **allergens**, quantity, net quantity, durability date, storage, operator name/address, origin, instructions, alcohol, nutrition declaration). | Sets what would be "full" labelling. |
| **Art. 44(1)(a)** | For food sold **non-prepacked** (or packed at the consumer's request / pre-packed for direct sale), **only Art. 9(1)(c) — the allergen information — is mandatory**; the other Art. 9/10 particulars are not, unless a member state says so. | The minimum legal payload on a deli board is **allergens**, not the full ingredient list. |
| **Art. 44(2)** | Member states may set how and in what form that information is given. | Germany did, in the LMIDV. |
| **LMIDV § 4(2)** | Non-prepacked food may only be placed on the market if the ingredients/processing aids under Art. 9(1)(c) (allergens) are declared per Art. 12(2) LMIV. | Duty lands on the operator. |
| **LMIDV § 4(3)** | The information must be **clearly visible, distinct and legible for the specific food**, and may be given: (1) on a **sign on or near the food**; (2) **on menus and drinks lists or in price lists**; (3) by a **notice in the sales room**; (4) by **other written or electronic information offerings** provided by the operator, if directly and easily accessible. It must be available **before conclusion of purchase and before handover**, and must not be hidden or obscured by other information or pictorial symbols. | **Directly relevant:** an on-screen allergen panel is a permitted "electronic information offering" under **Nr. 4**, and a screen-borne menu/price list is **Nr. 2** — provided it is readable before purchase and not obscured by promo animation. |
| **LMIDV § 4(4)** | Alternatively, staff may give the information **verbally**, provided (a) it is given immediately on request before purchase/handover, (b) a written/electronic record of the ingredients exists, (c) the record is immediately and easily accessible to the authority and on request to consumers — **and** a clearly visible, legible notice at the food or in the shop says the information is provided verbally and that a record is available on request. | The "ask staff" route needs the notice. An on-screen allergen legend removes that burden. |
| **LMIDV § 4b** | Origin labelling for non-prepacked fresh/chilled/frozen pork, sheep, goat and poultry. | Applies if the deli sells such meat. |

Source: LMIV Art 44 (gesetze.legal / EUR-Lex CELEX 32011R1169); LMIDV full text, gesetze-im-internet.de (`lmidv`, §§ 4, 5).

### 4.3 Health Claims Regulation (EC) No 1924/2006

- **Nutrition claims** are only allowed if they meet the conditions in the Annex (e.g. "energy-reduced" requires ≥30 % energy reduction).
- **Health claims** require an **authorisation procedure**: they are assessed by EFSA and adopted by the Commission into a **positive list** (Commission Regulation (EU) No 432/2012 and later). **All non-authorised health claims have been prohibited on food since 14 December 2012.** Authorised claims are in the EU Union Register.
- If any nutrition or health claim is used, a **nutrition declaration is mandatory**.
- **Health claims are in principle prohibited on drinks >1.2 % alcohol.**
- Separately, **LMIV Art. 7(3)** forbids food information attributing disease prevention/treatment/cure properties.

**Practical consequence for animations:** **"superfood", "detox", "boosts immunity", "cleanses", "anti-inflammatory", "good for your gut"** are **not authorised health claims** and must be treated as prohibited when they attribute a health effect to a food. Only use wordings that appear in the EU Register of authorised health claims, and only if the item actually meets the claim's conditions. [Uncertain: I did not find a per-string ruling from a court on the exact words "superfood"/"detox"; the prohibition follows from the register/authorisation architecture, not from a single named case.]

Source: BMLEH (Federal Ministry of Agriculture, Food and Regional Identity) page "Nährwert- und gesundheitsbezogene Angaben bei Lebensmitteln – die Health Claims-Verordnung", updated 10.03.2026; EU Union Register of nutrition and health claims (ec.europa.eu).

### 4.4 UWG § 5 — misleading advertising

- **§ 5(1):** unfair if a misleading commercial act is likely to cause the consumer to take a decision he would not otherwise have taken.
- **§ 5(2) Nr. 1:** misleading as to **essential characteristics** — availability, type, **composition**, quantity, quality, **place of origin**, results to be expected.
- **§ 5(2) Nr. 2:** misleading as to **price** or the manner of its calculation.
- **§ 5(4):** **"Angaben" includes pictorial representations and other events aimed at and suitable for replacing such statements** — i.e. **misleading food imagery counts as a misleading statement.**
- **§ 5(5):** advertising a price reduction is **presumed misleading** if the price was only charged for an unreasonably short period; the advertiser bears the burden of proof.
- **§ 5a:** misleading by omission (relevant information withheld).

**Consequence:** stock photography that shows a portion, ingredient or garnish the kitchen does not actually serve is a **§ 5(2) Nr. 1 / § 5(4)** risk. Use only real photography of the real dish.

Source: UWG § 5, buzer.de (consolidated, current version in force from 27.09.2026); cross-checked against juraforum/brennecke summaries.

### 4.5 Berlin-specific (physical installation)

- **BauO Bln § 61(1) Nr. 12** exempts certain *Werbeanlagen* from a permit; those not exempt need the **simplified building permit under § 63a BauO Bln**, applied for at the district Bauaufsichtsbehörde. Required documents include a **drawing/description or colour photo/photomontage of the Werbeanlage** (BauVorlV § 4).
- **[Assessment]** A screen mounted **inside** the sales room, advertising the operator's own menu, is very unlikely to be a permit-requiring *Werbeanlage*; a screen mounted **in/behind the shop window or on the facade facing the street** is much closer to the regulated case. **[Uncertain]** — I did not find a Berlin authority page specifically addressing indoor screens; resolve with the district Bauamt (Neukölln for Harzer Str. 39) before mounting anything in a window.
- No Berlin-specific in-store *advertising content* ordinance was found. **[Not found — flag]**

Source: Service Berlin "Baugenehmigung für Werbeanlagen im vereinfachten Baugenehmigungsverfahren beantragen" (service.berlin.de, Dienstleistung 350896), citing BauO Bln §§ 59, 61, 63a and BauVorlV § 4.

### 4.6 Compliance checklist for the animation pipeline **[synthesis]**

1. Every price on screen = **final consumer price incl. VAT and service charge** (PAngV §§ 3(1), 13(5)).
2. Add **Grundpreis** for any goods sold by weight/volume (coffee beans, loose deli) unless an exception in § 4(3) clearly applies.
3. Price sits **directly with the image/description** of the item (§ 10(4)).
4. Screen text is **legible from the ordering position and from the entrance**; entrance price list still required (§§ 1(3), 13(2)).
5. **Allergens visible on the board (or a clearly signposted electronic offering)** for every non-prepacked item, readable **before purchase**, never obscured by motion (§ 44(1)(a) LMIV; LMIDV § 4(3) Nr. 2/4).
6. If you use the verbal-allergen route, show the **permanent notice** (LMIDV § 4(4)).
7. **No unregistered health claims.** Build a whitelist from the EU Register; ban "superfood", "detox", "boost", "cleanse" as free text.
8. **Promo imagery must be the real dish.** § 5(2) Nr. 1 + § 5(4).
9. **No "was/now" price animation** unless the previous price genuinely ran for a reasonable period — § 5(5) presumption and burden of proof.
10. Build a **"stale content" kill switch**: out-of-stock items and expired promos must be removable in seconds.

---

## 5. Ko kitchen — brand recon

**Found — all details below are from the operator's own site/assets unless noted.**

| Field | Value | Source |
|---|---|---|
| Name | **ko kitchen / Ko Kitchen** ("Ko Kitchen – Catering Berlin – Neukölln") | kokitchen.berlin |
| Address | **Harzer Str. 39, 12059 Berlin** (Neukölln) | kokitchen.berlin (header + Google Maps link on site) |
| Legal operator | **Nico Borchert** | kokitchen.berlin/en/legal-notice |
| VAT ID | **DE368760326**; Steuernummer 16/236/03495 | legal notice |
| Website | kokitchen.berlin — WordPress 7.1.2, DE/EN, two main areas: **Deli** (lunch) and **Catering** | site meta |
| Instagram | **@kokitchencatering** — bio: "Catering \| Events \| privat & business. Personal. Reliable. Delicious. Berlin, Neukölln." (263 followers, 45 posts at crawl time) | instagram.com/kokitchencatering |
| Opening hours | Site header: **Mon–Fri 12:00–15:00**. The Deli page's hours table contradicts this: **Mon–Thu 12:00–15:00, Fri–Sun "Closed"**. **Conflict — verify with the owner.** | kokitchen.berlin/en/deli |
| Positioning | "From Neukölln for Berlin"; "Good Food, Made with Heart"; fresh, seasonal, comfort + creativity; catering across Berlin, invoice payment, orders up to 48 h ahead; vegan & gluten-free on request; **halal chicken** option on the deli menu | kokitchen.berlin |
| Loyalty / partnerships | "42 student" membership programme, loyalty card via take.cards; also listed on NeoTaste | kokitchen.berlin/en/deli |
| Menu | **Weekly rotating lunch board**, published as a printable A4 HTML page (`faramirezs.github.io/ko-kitchen-menu/kk-print-menu.html`), current edition "KW40, 28.09.26–01.10.26" | linked from the Deli page |
| Dishes (KW40) | **Daily: KoKitchen Signature Curry** – red curry, coconut milk, pineapple, seasonal vegetables, marinated sunflower protein, basmati rice, crunchy topping; also with marinated **halal chicken**. · **Mon:** creamy mashed potato + sunflower protein *or* chicken, sour cream, oven vegetables, pickled onions, salad. · **Tue:** oven sweet potato with chili **sin**/*con* carne, pico de gallo, salad, raspberry vinaigrette. · **Wed:** babaganoush, falafel *or* shawarma chicken, oven vegetables, couscous, salad, tahini. · **Thu:** pasta with vegetable *or* beef bolognese, root vegetables, vegan grated cheese *or* mozzarella, béchamel, leaf salad. | print menu |
| Allergens | The menu already carries allergen letters per dish (e.g. A, F, G, N, AN, AG) — legal allergen data exists and is published | print menu |
| Prices | **Not found.** The public weekly menu page carries no prices. | — |
| Brand colours | Logo asset is a **single-colour cream/cornsilk mark, flat fill `#FEFAE0`** (file name "…Logo_Cornsilk"). The current print menu uses an olive/sage + near-black palette: `#B5BEA0`, `#778276`, `#65765A` with `#2D2D2D`, `#202520`, `#1F241F`. | downloaded SVG + menu HTML **[observed from assets, not an official brand guide]** |
| Typography | Menu uses **Lato, Aptos, Arial, sans-serif**. Website headings are a serif/"N-logo" wordmark. | menu HTML `font-family` |
| Logo files | `N-Logo-w…png`, `N-logo.png`, `KoKitchen_Short_Logo_Cornsilk.svg` (used as the MS tile/favicon) | site head + uploads |

**Not found:** published prices, a formal brand colour/typography guide, a Google Business *description* (the Maps listing link exists on the site but the listing page is not fetchable — findit.city returned HTTP 403). No claim here is invented.

**[Recommendation for the graphics]** Use `#FEFAE0` cream as the type/foreground colour on the olive/near-black ground (`#202520`–`#65765A`) — that combination gives ~15:1 contrast, far above the 4.5:1 floor, and matches both the logo and the printed menu. Keep the animated promo zone in brand cream/olive; keep item names and prices in cream on near-black. Food photography should be the operator's own (the site has a large library of real dish photos).

---

## 6. Source list (strongest)

1. PAngV (Preisangabenverordnung) full text — https://www.gesetze-im-internet.de/pangv_2022/BJNR492110021.html
2. LMIDV (German national rules, incl. how non-prepacked allergen info is given) — https://www.gesetze-im-internet.de/lmidv/BJNR227210017.html
3. LMIV Art. 44 and Art. 7 — https://gesetze.legal/eu/vo_eu_2011_1169/44 and …/7
4. BMLEH on the Health Claims Regulation — https://www.bmleh.de/DE/themen/ernaehrung/lebensmittel-kennzeichnung/pflichtangaben/naehrwertinformationen-health-claims.html
5. UWG § 5 — https://www.buzer.de/5_UWG.htm
6. Xibo HTML Package widget docs — https://docs.xibosignage.com/developer/widgets/html-package
7. Xibo Embedded widget manual — https://account.xibosignage.com/manual/en/media_module_embedded
8. Anthias features + supported hardware — https://anthias.screenly.io/features and /get-started
9. Yodeck feature list (offline duration, custom JS, instant transitions, BrightSign/Tizen/webOS/Pi 5 support) — https://www.yodeck.com/features-list
10. PiSignage datasheet — https://pisignage.com/homepage/docs/pisignage-datasheet.pdf
11. BrightSign video formats & codecs (25 Mbps HD cap, faststart) — https://docs.brightsign.biz/technical/video-formats-and-codecs
12. Samsung Smart Signage developer page (HTML5, WebAssembly, Tizen Enterprise) — https://developer.samsung.com/smarttv/signage
13. LG webOS Signage platform PDF — https://www.lg.com/us/business/commercial-display/resources-hub/pdfs/LG20_DS_webOSArticle_PlatformofPossibilities-final.pdf
14. ChromeOS kiosk docs (PWA + service workers) — https://chromeos.dev/en/kiosk
15. Samsung QM43B/QM55B commercial display datasheet (500 nit, non-glare, 24/7) — https://objects.eanixter.com/PD648327.PDF
16. MediaSignage content formats / encoding guide — https://digitalsignage.com/digital_signage/docs/standards/content-formats/
17. signageOS browser/Chromium versions per platform — https://developers.signageos.io/devices/device-guides/general-information/browser-webkit-and-chromium-versions-by-each-platform
18. Screenly pricing — https://www.screenly.io/pricing
19. Service Berlin: permit for Werbeanlagen (§ 63a BauO Bln) — https://service.berlin.de/dienstleistung/350896/
20. Ko kitchen — https://kokitchen.berlin/en/deli, /en/legal-notice, and the weekly menu at https://faramirezs.github.io/ko-kitchen-menu/kk-print-menu.html

## 7. Stale-information flags

- **Screenly, Screenly/Anthias, PiSignage, BrightSign, Yodeck** all copy their own pricing/feature pages; treat prices as of 2026-09-29 and re-check before budgeting.
- **Xibo** originally announced cloud CMS, self-hosting and paid players in the 2019 "subscription pricing is here" post — that post is archived. Use the current pricing page.
- **Chrome Apps in kiosk mode:** deprecated, unsupported after April 2027. PWA only.
- **Xibo Cloud legacy device HTTPS:** ends 30 June 2028 for legacy Android/webOS/Tizen.
- **Raspberry Pi 5** $60/$80 are the *launch* prices (Oct 2023); retail prices vary by region and RAM.
- The **PAngV** and **UWG** texts consulted are the consolidated versions currently in force (PAngV last amended 12.05.2026; UWG § 5 current version in force from 27.09.2026).
