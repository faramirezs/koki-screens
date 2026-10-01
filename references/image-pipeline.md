# Image pipeline

`scripts/process_images.py` turns `photos/` into matted subjects plus a machine-readable
report. It is the only stage that needs Python.

## Command

```sh
python3 scripts/process_images.py \
  --photos <dir> --content <content.json> --out <dir> \
  --model-cache <dir> --matting auto|rembg|alpha|none \
  [--max-side 1600] [--flat-backdrop '#282F23']
```

| backend | what it does | cost |
| --- | --- | --- |
| `alpha` | uses the alpha channel already in the file - a cutout the operator supplied | ~0.1 s/image |
| `rembg` | runs BiRefNet over the photo | ~70 s/image on 2 vCPU |
| `none` | no matting; the whole frame is the subject | ~1 s/image |
| `auto` | `alpha` when **every** photo has a usable alpha channel, else `rembg` when importable with a cached checkpoint, else `none` | - |

**Prefer `alpha`.** Hand the operator's retoucher a brief ("PNG, background removed,
subject not touching the frame edge") and the pipeline needs no model, no download and
no GPU. `auto` picks it up automatically when all photos qualify. A file only counts as
a cutout when its alpha channel actually has both transparent and opaque pixels
(`ALPHA_USABLE_MIN`/`ALPHA_USABLE_MAX`), so a fully opaque PNG exported by mistake is
not silently treated as one.

`none` is a pure Pillow/numpy path that still produces the full output layout, so the
pipeline runs on a machine without ML dependencies. The subjects are then not matted and
the promo template falls back to the flat frame.

`--flat-backdrop` is the colour a supplied cutout is flattened onto when writing
`flat.jpg` (the menu-board hero frame). `adkit` passes the declared brand `surface`
colour; the default is `#000000`.

## Matting

Primary backend: **rembg with a BiRefNet general checkpoint**. BiRefNet's code is MIT.
The **checkpoint's redistribution terms are UNCERTAIN** — therefore the weights are
never committed to this repository: they are downloaded into a model cache
(`~/.cache/screen-ad-generator/models` by default, override with `SCREEN_AD_MODEL_CACHE`)
the first time the pipeline runs, and `doctor` only reports whether they are already
there. Treat the weights as a runtime dependency, not as a vendored asset.

## Alpha sources in the report

`report.matting` is `alpha:input`, `rembg:birefnet-general` or `none`, and each item
carries `alphaSource` (`input` / `model` / `none`) so a consumer can tell a supplied
cutout from a computed one. `adkit` skips the `touchesBorder` and coverage warnings when
`alphaSource` is `none`, because there the whole frame is the subject by definition.

For a supplied cutout the file is treated as the author's ground truth: the alpha is
thresholded for cleanliness (`clean_alpha`) but the colour is **not** unpremultiplied or
defringed, and no backdrop is estimated. For `rembg` the halo the original backdrop would
leave is removed by `defringe`.

## Output layout

```
<out>/<id>/cutout.png    RGBA, trimmed to the alpha bbox + 8 px, longest side <= --max-side
<out>/<id>/mask.png      8-bit alpha, for inspection
<out>/<id>/flat.jpg      the full frame, no cutout, q92
<out>/<id>/preview.png   cutout on mid-grey, for a human to judge the matte
<out>/report.json
```

`report.json` carries, per item: `alpha.coverage`, `alpha.bbox`, `alpha.bboxNorm`,
`alpha.semiTransparentRatio`, `alpha.edge.touchesBorder`, `alpha.edge.haloPixels`,
`focal.{x,y,source}` and `warnings[]`.

## How the report is used

- `flat.jpg` → the menu-board hero (full frame, `object-fit: cover`).
- `cutout.png` → the promo subject, but only when the matte is usable: coverage above
  0.02 and the alpha bounding box not touching the image border. Otherwise the promo
  falls back to the flat frame, which is why `touchesBorder` is reported rather than
  silently ignored.
- `focal` → `object-position`. Order of precedence: `content.json focalPoint` →
  alpha centroid → 50%/50%.
- `coverage` outside 0.05–0.95 and `touchesBorder` become build warnings that name the
  item, because a subject cut off at the frame edge cannot be fixed by the renderer.

## Alpha cleanup

Before the cutout is written: alpha below 8 → 0, above 247 → 255, and the colour is
un-premultiplied so no white or dark halo survives compositing on the surface colour.
`edge.haloPixels` counts the pixels that still sit between opaque and transparent
neighbours, as a crude fringe proxy — a non-zero value is a hint to look at
`preview.png`, not a failure.

## Node-side image work

`sharp` (Apache-2.0) handles the Node side: palette sampling in `palette.mjs`, the
poster still, and the frame comparison in the loop-seam check. The matting itself stays
in Python because that is where rembg lives.
