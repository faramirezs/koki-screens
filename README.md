# koki-screens

The KoKitchen screen-design workspace. Everything that decides what appears on a KoKitchen
screen lives here: the brand definition, the research behind it, the generator that produces
finished screen ads, and the lab that searches the banner design space.

## Layout

| path | what it is |
|---|---|
| `brand/` | The source of truth. `identity.md` (voice, palette, type, rules) and `tokens.css` (the CSS custom properties every other project imports). Preview renders and the logo live here too. |
| `research/` | The brief and the background notes — references, the AI-skills survey, deploy/legal/brand constraints, JS stack choices. |
| `brand examples/` | Hand-written HTML studies of the brand in use: a menu, a fingerfood sign, a promo. |
| `screen-ad-generator/` | The generator. Takes a content spec plus a brand profile and emits a finished screen ad. Has its own `docs/`, `schemas/`, `templates/`, `profiles/`, `corpus/` and test suite. |
| `banner-lab/` | The design-space search. Renders 960 animated 1920×1080 banners from an 11-axis combinatorial system, serves a gallery you can vote in, and joins the votes back to the axis values. |

`brand/tokens.css` is the seam between all of them: `banner-lab` and `screen-ad-generator` both
draw their palette from it, so a change there is a change everywhere.

## Running things

`banner-lab` is self-contained — the deck, the photo pool and the cutouts are committed, so a
clone renders as-is:

```
cd banner-lab
npm install
node serve.mjs          # then open http://127.0.0.1:7788/
```

`screen-ad-generator` is Python plus Node; see its own `README.md`.

## Not in the repo

`node_modules/`, `.venv/`, `out/`, `work/`, `corpus/*` and `__pycache__/` are ignored — build
and cache artifacts, all reproducible. Nothing here needs a secret to run.
