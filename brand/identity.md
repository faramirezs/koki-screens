# KoKitchen — brand identity extracted for 16:9 landscape screens

Sources (user-supplied, read in full):
- `brand examples/menu-minimax.html` — A4 portrait catering menu ("Herzhaftes Buffet"), Montserrat, green/orange on white.
- `brand examples/KoKitchen_Fingerfood_Schilder.html` — A4 portrait fingerfood cards, dark green / red-orange, Arial Black, centered wordmark.

Related, from the earlier site recon (`research/dmb-deploy-legal-brand.md` §5): logo cream `#FEFAE0`, print-menu sage `#B5BEA0 #778276 #65765A` on near-black `#202520`.

Every contrast number below is computed with the WCAG 2.x relative-luminance formula, not estimated.

---

## 1. Palette as found

The Schilder greens/oranges below document what the supplied files contain; **they are not adopted for the screens** (see §3).

| Token | Hex | Where | Role in that file |
|---|---|---|---|
| `--green` | `#5F6F52` | menu-minimax | Body text, title, rules, borders |
| `--orange` | `#FF7D00` | menu-minimax | Eyebrow, bullet dots, legend keys, "Allergene"/"Zusatzstoffe" labels |
| `--green-soft` | `rgba(95,111,82,.12)` | menu-minimax | Hairline separators, fade bar |
| `--green-mute` | `rgba(95,111,82,.78)` | menu-minimax | Italic fine print, "keine …" values |
| `--green` | `#063f32` | Schilder | Ground text colour on white |
| `--orange` | `#ff4a1f` | Schilder | Tags (Vegan/Halal), bold label text |
| `--line` | `#0b5a46` | Schilder | Item separator rule |
| `--paper` | `#ffffff` | both | Ground |

Two different greens and two different oranges are in use. The identity is therefore defined by **role**, not by one hex value. Both variants are legitimate; the screen picks the high-contrast branch (§3).

---

## 2. Contrast audit (computed)

Ground = the surface the colour actually sits on.

| Pair | Ratio | Verdict |
|---|---|---|
| `#063f32` on `#FFFFFF` | **11.90** | AAA — any text size |
| `#FFFFFF` on `#063f32` | **11.90** | AAA — any text size |
| `#FEFAE0` (logo cream) on `#063f32` | **11.31** | AAA |
| `#FEFAE0` on `#202520` | **14.82** | AAA |
| `#B5BEA0` (sage) on `#063f32` | **6.14** | AA body text |
| `#B5BEA0` on `#202520` | **8.05** | AAA |
| `#5F6F52` on `#FFFFFF` | **5.41** | AA body text |
| `#FF7D00` on `#063f32` | **4.64** | AA body text |
| `#FF7D00` on `#202520` | **6.08** | AA body text |
| `#ff4a1f` on `#202520` | **4.64** | AA body text |
| `#ff4a1f` on `#063f32` | **3.54** | AA **large text only** |
| `#ff4a1f` on `#FFFFFF` | **3.36** | AA **large text only** |
| `#FF7D00` on `#FFFFFF` | **2.57** | **FAIL** — not even large-text legal |
| `#FF7D00` on `#5F6F52` | **2.11** | **FAIL** |

**Consequence — this is a real defect in the source files, not a style choice:** the eyebrow (`9 pt`, orange `#FF7D00` on white) and the legend keys fail the minimum contrast for text at any size. On paper, at arm's length, it is survivable. On a 55″ screen read at 2–10 m, it is not.

**Orange-text fix for light grounds — adopted: `#C2410C`** = **5.18** on white, **4.92** on cream: it still reads as orange and passes even body-text contrast, so it is legal at any size. Rejected alternatives: `#B35A00` (4.80, visually brown), `#EA580C` (3.56 — legal only at ≥24 px, kept as an option when punch matters more than headroom), `#D9480F` (4.30, large-text only). `#FF7D00` / `#ff4a1f` stay graphics-only on light grounds, and `#FF7D00` stays legal as text on the dark ground it sits on.

---

## 3. Adopted palette for the screens

**Decision (user, 2026-09-29): the Schilder palette (`#063f32` / `#ff4a1f`) is not adopted.** The screen family is built on the print identity's olive family instead:

- dark green **`#282F23`** — dark-theme ground
- near black **`#1D231A`** — deep surface (promo panel, chip ground)
- cream `#FEFAE0` / white for text on dark
- print green `#5F6F52` and sage `#B5BEA0` for secondary text on light
- orange `#FF7D00` for graphics and for text on dark; `#B35A00` where orange must be text on a light ground

Both themes are implemented in `tokens.css` and rendered by `dmb-16x9.html` via `body.theme-dark` / `body.theme-light`. Rendered proof: `preview-dark-16x9.png`, `preview-light-16x9.png`.

### Dark theme — `theme-dark` (board default)

| Token | Value | Use | Computed on `#282F23` |
|---|---|---|---|
| `--ground` | `#282F23` | Board background | — |
| `--panel` | `#1D231A` | Promo zone, deep surfaces | white on it = **16.06** |
| `--text` | `#FFFFFF` | Item names, prices, titles | **13.81** |
| `--text-hero` | `#FEFAE0` (cream) | Headline, rule bar, logo | **13.13** |
| `--text-2` | `#B5BEA0` (sage) | Descriptions, fine print, legend | **7.12** (AAA) |
| `--accent` | `#FF7D00` | Rules, dots, labels, prices, tags | **5.38** |
| `--on-accent` | `#1D231A` | Text on the orange chip | **6.26** |
| `--hairline` | `rgba(255,255,255,.12)` | Item separators | — |

### Light theme — `theme-light` (daylight / window-facing)

| Token | Value | Use | Computed on `#FFFFFF` |
|---|---|---|---|
| `--ground` | `#FFFFFF` | Board background | — |
| `--panel` | `#FEFAE0` (cream) | Promo zone | `#282F23` on it = **13.13** |
| `--text` | `#1D231A` | Item names, prices, titles | **16.06** |
| `--text-hero` | `#282F23` (olive) | Headline, rule bar | **13.81** |
| `--text-2` | `#5F6F52` (print green) | Descriptions, fine print, legend | **5.41** (**5.14** on the cream panel) |
| `--accent` | `#C2410C` | Text accents (labels, prices, eyebrow) | **5.18** (**4.92** on cream) |
| `--accent-fill` | `#FF7D00` | Chip fill, bars, dots only — as text it is **2.57**, a fail | graphics only |
| `--on-accent` | `#1D231A` | Text on the orange chip | **6.26** |
| `--hairline` | `rgba(29,35,26,.14)` | Item separators | — |

The dark ground `#282F23` measures better than the Schilder green it replaces: sage secondary text rises from 6.14 to **7.12** (AAA), and orange rises from 4.64 to **5.38**.

---

## 4. Typography

| Role | Family | Weight | Case | Tracking |
|---|---|---|---|---|
| Eyebrow / kicker | Montserrat | 600 | UPPER | `0.32em` (menu-minimax) |
| Title / headline | Montserrat | 800 | Sentence case (menu-minimax) or UPPER (Schilder) | `-0.01em` |
| Subtitle | Montserrat | 300 *italic* | Sentence case | 0 |
| Item name / price | Montserrat | 500 / 700 | Sentence case | 0 |
| Tag (Vegan / Halal) | Montserrat | 800 | UPPER | `0.06em` |
| Allergen / additive label | Montserrat | 700 | UPPER | `0.08em` |
| Legend key | Montserrat | 700 | — | 0 |
| Footer / legend note | Montserrat | 500 / 400 *italic* | UPPER letterspaced / italic | `0.16em` |

One family only. The Schilder's `Arial Black` is replaced by **Montserrat 800**, which is the same visual class (geometric grotesque, heavy) and keeps the two source identities compatible.

**Operational note:** the signage player may be offline. Self-host the Montserrat `woff2` files (or base64-inline them) — do not depend on `fonts.googleapis.com` at the screen.

---

## 5. Type scale at 1920×1080 (landscape)

Derived from the signage legibility research (`research/dmb-references.md` §B1: body pt = 12 + 7.9 × metres; 1 pt ≈ 1.333 px at 1080p).

| Token | px | pt (≈) | Compliant reading distance |
|---|---|---|---|
| `--fs-hero` | 128 | 96 | ≥10 m |
| `--fs-title` | 84 | 63 | ≥6 m |
| `--fs-category` | 56 | 42 | ≥4 m |
| `--fs-item` | 48 | 36 | ~2.7 m (covers the counter) |
| `--fs-price` | 48 | 36 | one visual step below the item name |
| `--fs-tag` | 40 | 30 | ≥2 m |
| `--fs-allergen` | 32 | 24 | **≤1.5 m only** (counter/legend) |
| `--fs-legend` | 24 | 18 | ≤1 m, legend strip |
| `--fs-eyebrow` | 28 | 21 | title block |
| `--fs-subtitle` | 36 | 27 | 2.7 m |
| `--fs-footer` | 22 | 16.5 | ≤1 m |

Rules that follow from the numbers: menu items are read at the counter → 48 px is the floor. Allergen lines are **not** readable at 5 m — they belong on the board at the counter or in a printed/QR legend, never as the only channel at distance. Never drop below 32 px for anything a customer must act on.

Layout geometry from the two files, converted to 1080p landscape:
- Outer safe margin 96 px; critical text inside the inner 80 % (≤1536×864 centred) per DOOH guidance.
- Hairline separators: 1 px (paper used 0.3 mm — 1 px is the screen equivalent at 1 m viewing).
- Accent bars: 24 px green/cream + 12 px orange + 1 px fade (the menu-minimax 24/12/0.5 mm rule, scaled ×~2).
- Item bullet dot: 20 px circle, accent, optically aligned to the first line's cap height.
- Logo lockup: 140 px square, top-left (never re-coloured; the PNG carries its own colour).

---

## 6. Diagramation patterns extracted

From `menu-minimax.html`:
1. **Header lockup** — logo left, then eyebrow (orange, letterspaced) → title (2 lines max, 800, line-height 1.0) → subtitle (300 italic).
2. **Rule** — three bars: brand + accent + fade. Use once, under the header.
3. **Item block** — dot bullet, item text, then allergen line, then additive line; hairline between items, none after the last.
4. **Label/value pair** — label in accent, uppercase, letterspaced, small; value in brand colour, weight 600. The `.none` variant switches the value to the mute colour ("keine deklarationspflichtigen Zusatzstoffe").
5. **Legend** — hairline top border, uppercase accent section title, 2-column grid, key in accent, muted italic footnote.
6. **Footer** — dot + uppercase letterspaced label.

From `KoKitchen_Fingerfood_Schilder.html`:
1. **Centered wordmark** — `KoKitchen` 900, tight tracking, over a letterspaced uppercase kicker (`FINGERFOOD BUFFET`).
2. **Item title in UPPER, 900, line-height 1.02** — the poster voice for single-item screens.
3. **Tag line** in orange under the title (`Vegan`, `Halal`) — reuse this as the diet/allergen tag on menu items.
4. **Allergen line** — `Allergene:` bold in orange, values in body colour.
5. **Thick separator** between items (0.45 mm ≈ 2 px) — stronger rhythm, for few-item screens.
6. **Footer** — `Ko Kitchen Team · kokitchen.berlin`.

---

## 7. 16:9 landscape board map (1920×1080)

```
┌ 96 px margin ───────────────────────────────────────────────────────────────┐
│ [logo 140]  KO KÜCHE · DELI        ┌ daypart chip ┐            [clock]      │  header 180
│             Mittag                 │  MITTAG      │                        │
│             Mo–Fr 12–15 Uhr        └──────────────┘                        │
│ ▬▬▬▬▬▬▬▬ (24 px cream) ▬▬▬ (12 px orange) ▬▬ fade                           │  rule 40
│ ┌ menu (1024) ─────────────────┐  ┌ promo panel 640×360 + CTA (640) ─────┐  │
│ │ • item name        price     │  │  16:9 promo / hero video zone        │  │  main
│ │   description                │  │  (animated ad spot, 10–15 s)         │  │  888
│ │   ALLERGENE  A · C · G       │  │  Tag + one-line claim                │  │
│ │  ─────────────────────       │  └──────────────────────────────────────┘  │
│ │ • item …                     │                                            │
│ └──────────────────────────────┘                                            │
│ ALLERGENE  A · B · C · D · E …   (2-column legend grid, 24 px)              │  footer 140
│ ● Mo–Fr 12:00–15:00 · kokitchen.berlin · Preise inkl. MwSt.                 │
└─────────────────────────────────────────────────────────────────────────────┘
```

- **Verified geometry** (measured in headless Chromium at 1920×1080 for **both** themes; see `preview-dark-16x9.png` and `preview-light-16x9.png`):
  board 1920×1080 with 48 px top/bottom padding and 96 px side margins; rows header **180** / rule **24** / main **670** / footer **110**; menu column **1024** at x=96; promo zone **640×360** at x=1184 (exact 16:9); menu item block **159 px**, 4 items = 636 px with 34 px slack to the footer. No overflow at scroll height = client height.
- The promo zone hosts a self-contained 640×360 GSAP component (`promo-membership.html`): 10 s loop, sound-off, first frame = last frame, only `opacity`/`transform` animated, pauses on `visibilitychange`. The board hands its theme over as `?theme=dark|light`; swap the promo by changing the iframe `src`. Prices/menu are the only data that should change between promos.
- 4 items fit vertically. A 5th item needs a second screen, a second menu column, or day-driven rotation — do not shrink the type.
- The raster logo is a dark mark: `theme-dark` recolours it (`filter: brightness(0) invert(1)`), `theme-light` uses it unchanged. Replace it with the official cream logo on dark when available.
- Menu column count: 2 when >4 items, 1 when ≤4. Prices sit on the item's first line, right-aligned in the same 48 px scale, never in a dotted column (research §B4).
- Daypart chip: one per layout (Frühstück / Mittag / Nachmittag), never a mid-loop item swap (research §C).

---

## 8. Rules for the screens

1. `theme-dark` (olive `#282F23` ground, near-black `#1D231A` surfaces) is the board default; `theme-light` (white ground, cream panel) is for a daylight/window-facing screen. Never mix both on one wall.
2. Orange `#FF7D00` may carry text on the dark ground (5.38) but never on a light ground (2.57). The light theme therefore uses `#C2410C` (5.18 / 4.92 on cream) for text accents while bars, dots and chip fills stay `#FF7D00`. If a brighter orange is wanted at large sizes only, `#EA580C` (3.56) is the documented alternative — never below 24 px.
3. Text ≥32 px always; item prices ≥48 px; 48 px floor for anything the customer acts on.
4. Item names and prices stay static. Motion lives in the promo zone only (research §C) — that also keeps the allergen declaration legally unobscured.
5. Allergen codes come from the declaration only. Never invent a code, never round an ingredient.
6. Prices are always the final consumer price incl. VAT and service (PAngV §§ 3(1), 13(5)) — a placeholder price must never be published.
7. Loop-safe: 10–15 s promo, first frame = last frame, sound-off, no black tail.
8. Design at 1920×1080, 30 fps, WebGL1-safe. No 4K, no WebGPU dependency.

---

## 9. Open items

- **Logo cream `#FEFAE0`** comes from the site recon, not from these two files; the two files carry the logo as an embedded PNG (extracted to `brand/assets/logo-catering.png`, 598×598).
- **Prices are still unpublished** — the template uses `€ –,–` placeholders.
- **Allergen codes** in the template are placeholders; the real codes come from the operator's declaration (the weekly menu already carries letters).
- The two source files disagree on greens/oranges by design (print vs signage); the reconciliation in §3 is a decision, not a source fact.
