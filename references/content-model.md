# Content model

`content.json` and `brand.json` are the only sources of on-screen facts. The generator
never invents, derives, rounds or guesses a price, an allergen, a diet label, an
opening hour or a contract term. If a mandatory value is missing the build fails with
the exact field to fix.

Schemas: `schemas/content.schema.json`, `schemas/brand.schema.json` (Ajv, closed — an
unknown field is an error, because a typo like `allergenes` would otherwise silently
drop the declaration from the screen).

## content.json

| field | required | notes |
| --- | --- | --- |
| `language` | yes | `de` or `en`. Drives number formatting and the built-in copy strings. |
| `title`, `subtitle`, `badge`, `hours` | no | Board header. `hours` is only printed when supplied. |
| `items[]` | yes | 1–5. The landscape template is designed for 4 at full type size. |
| `promo` | no | Adds the full-frame promo overlay scene. |
| `legal` | yes | `vatNote` is mandatory (PAngV), the rest is optional. |

### items[]

| field | required | notes |
| --- | --- | --- |
| `id` | yes | `^[a-z0-9][a-z0-9-]{1,31}$`, unique. Names the image output folder. |
| `name` | yes | Shown verbatim. |
| `price` | yes | Number, EUR, **final consumer price incl. VAT and service** (PAngV §§ 3(1), 13(5)). |
| `allergens` | yes | Array of EU-14 codes (`A`–`N`). An **empty array is a declaration** ("no allergens"), a missing array is an error. |
| `image` | yes | Filename resolved against `--photos`. |
| `description` | no | Ingredient line. Max 96 chars. |
| `promo` | no | Short ribbon, max 24 chars. |
| `diet` | no | `vegan`, `vegetarisch`, `halal`, `glutenfrei`, `laktosefrei`. Only what the operator confirmed. |
| `focalPoint` | no | `[x, y]` in 0..1. Overrides the alpha-centroid fallback. |

EU-14 codes (LMIV Annex II): A Gluten · B Krebstiere · C Ei · D Fisch · E Erdnuss ·
F Soja · G Milch · H Schalenfrüchte · I Sellerie · J Senf · K Sesam · L Schwefeldioxid ·
M Lupine · N Weichtiere.

### promo

`kind`, `headline`, `tiers[]` (1–3, each `label` + `price`, optional `unit` and
`highlight`) are required. `kicker`, `cta`, `image` and `terms` are optional.

`terms` is where a minimum contract term, notice period or validity goes. Leaving it
out is safe; inventing it is not, so the generator renders the terms line only when the
field is present and never fills it with a default.

## brand.json

`name` is required, everything else is optional and derived when absent:

- `colors` — any subset of `bg`, `surface`, `accent`, `accentFill`, `price`, `text`,
  `textMuted`, `legal`. Declared values are used verbatim (and contrast-checked);
  missing ones are extracted from the photos (see `image-pipeline.md`).
- `theme` — `dark` (default, for indoor screens) or `light` (daylight/window-facing).
  Never mix both themes on one wall.
- `logo`, `logoDarkOnLight` — `logoDarkOnLight: true` inverts the artwork on dark.
- `rules` — `safeAreaPct` (default 0.05), `minContrast` (4.5), `minTextPx` (32),
  `maxFlashingHz` (3).

## What the validator rejects (policy, not schema)

| rule | why |
| --- | --- |
| Health claims: `superfood`, `detox`, `entgiftet`, `heilt`, `immun`, `antioxidant`, `abnehmen`, `boost`, `cures`, `heals`, … | Regulation (EC) 1924/2006 — no health claim without an authorised one. |
| Discount wording: `statt`, `war 9,90`, `% Rabatt`, `now only`, `save` | UWG § 5(5) — a "was/now" price may only run when the old price genuinely ran. |
| Placeholders: `€ –,–`, `TODO`, `XXX`, `FIXME`, `lorem ipsum`, `TBD` | Placeholder prices have reached screens in the real world. This is the guard. |
| Unknown fields | A typo must not silently delete a declaration. |
| Duplicate item ids | The id names the image folder and the frame checks. |
| `price <= 0` | Not a publishable price. |
| Photo file missing | A board with an empty photo frame is worse than a failed build. |

## Warnings (build continues, a human should look)

- `allergens: []` — confirm with the operator; it is a legal declaration.
- No `hours`, no `allergenNote`, no `promo.terms` — something is simply absent.
- More than 4 items — check the rendered frame.
- Name longer than 34 characters — check the wrap.
