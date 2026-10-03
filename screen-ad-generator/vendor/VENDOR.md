# Vendored assets

These files are checked into the repo so that the MP4 render pipeline can load
them from `file://` in headless Chromium **with no network access at render
time**. Nothing here is fetched at runtime.

Layout:

```
vendor/
  gsap.min.js                       # GSAP 3.15.0 (UMD browser build)
  fonts.css                         # @font-face rules for Montserrat (latin)
  fonts/
    montserrat-latin-400.woff2
    montserrat-latin-500.woff2
    montserrat-latin-600.woff2
    montserrat-latin-700.woff2
    montserrat-latin-800.woff2
```

---

## gsap.min.js

| field | value |
| --- | --- |
| Asset | GSAP core, minified UMD browser build |
| Version | **3.15.0** (banner: `GSAP 3.15.0`; `gsap.version === "3.15.0"`) |
| Upstream URL | https://cdn.jsdelivr.net/npm/gsap@3.15.0/dist/gsap.min.js |
| Also published at | https://unpkg.com/gsap@3.15.0/dist/gsap.min.js (npm package `gsap@3.15.0`, file `dist/gsap.min.js`) |
| Size | 72,927 bytes |
| sha256 | `92bb9a96476f983d212a2bc4f54c889039c1696dd4461d40a736860938570fbb` |
| Licence | **GSAP Standard "no charge" License** — https://gsap.com/standard-license |
| Copyright | Copyright 2026, GreenSock. All rights reserved. |

### Licence summary

The GSAP Standard License is a **no-charge** licence. It **permits commercial
use** of GSAP in your own products and client work at no cost. It **forbids
reselling, sublicensing, or redistributing the GSAP library itself** (or a
wrapper/derivative whose main value is GSAP) as a product. Bundling the file
inside this application to render its own animations is permitted use; shipping
it as a standalone "GSAP" product is not. If a use case ever requires
redistribution of the library itself, a GreenSock "Business Green" membership /
commercial licence is required.

### Verification

```sh
cd vendor
# 1. size + sanity
wc -c gsap.min.js                     # -> 72927

# 2. file is intact and identifies as GSAP
node -e "const s=require('fs').readFileSync('gsap.min.js','utf8'); if(!/gsap/i.test(s)) process.exit(1); console.log(s.length)"

# 3. exact version string present
grep -o 'GSAP 3\.15\.0' gsap.min.js   # -> GSAP 3.15.0
grep -o 'version:"3\.15\.0"' gsap.min.js

# 4. checksum
sha256sum gsap.min.js                 # -> 92bb9a96...570fbb
```

Runtime check (headless Chromium, loads the file from disk, no network):

```sh
cat > /tmp/gsap-check.html <<'EOF'
<!doctype html><html><head><meta charset="utf-8"><title>pending</title></head><body>
<script src="file:///ABS/PATH/TO/vendor/gsap.min.js"></script>
<script>document.title=(window.gsap&&window.gsap.version)||'NO_GSAP';</script>
</body></html>
EOF
~/.cache/ms-playwright/chromium-1234/chrome-linux/chrome \
  --headless=new --no-sandbox --disable-gpu --virtual-time-budget=5000 \
  --dump-dom file:///tmp/gsap-check.html | grep -o '<title>[^<]*</title>'
# -> <title>3.15.0</title>
```

---

## fonts/montserrat-latin-<weight>.woff2

| field | value |
| --- | --- |
| Asset | Montserrat, **latin** subset, woff2, one static instance per weight |
| Version | `@fontsource/montserrat@5.2.6` (built from Montserrat upstream) |
| Weights | 400, 500, 600, 700, 800 |
| Upstream | `https://cdn.jsdelivr.net/npm/@fontsource/montserrat@5.2.6/files/montserrat-latin-<weight>-normal.woff2` |
| Licence | **SIL Open Font License 1.1** - https://scripts.sil.org/OFL |
| Copyright | Copyright 2011 The Montserrat Project Authors (https://github.com/JulietaUla/Montserrat) |

| file | bytes | sha256 |
| --- | --- | --- |
| `montserrat-latin-400.woff2` | 18,792 | `1c9c85d0b73b7321eb8ed22e0b6bcd577478dd5f99d1379a5d4cea10884033ac` |
| `montserrat-latin-500.woff2` | 18,740 | `7ea11ae0c63fa6b6504e77a15d057a53cef496d1401cb96c6c30eadf6e881aea` |
| `montserrat-latin-600.woff2` | 18,684 | `8adb87ca2ec37af37dfb66aacc7f841b279b0420299491f5371225a4dc8fb3ba` |
| `montserrat-latin-700.woff2` | 18,844 | `1c162da32d36f79b447183d7c9d7b3888c2e4d44abf36c63550898f8f32bcb88` |
| `montserrat-latin-800.woff2` | 19,036 | `4f28aff12bce09a4e64ff4b615a399e45b99cf9d85d5a555f61cc87eb23bb042` |

### Why not the Google Fonts CSS2 build

The first attempt vendored the latin woff2 served by
`https://fonts.googleapis.com/css2?family=Montserrat:wght@400;500;600;700;800`.
That API returns **one and the same file for every requested weight**, and Chromium
then renders 400, 500, 600, 700 and 800 **identically** from it: measured on an
inline-block span at `font-size: 100px`, the text "Wochenkarte" was 677.91 px wide
at *every* weight. Five `@font-face` blocks pinning five different weights did not
change that.

The Fontsource files are true static instances and do render distinctly:

| weight | measured width at 100 px |
| --- | --- |
| 400 | 677.91 px |
| 500 | 688.00 px |
| 600 | 699.81 px |
| 700 | 712.41 px |
| 800 | 726.31 px |

`tests/vendor.test.mjs` asserts that these five values are strictly increasing, so a
future font swap that silently collapses the weights fails the test suite.

Only the **latin** subset is vendored. Text outside the `unicode-range` in
`fonts.css` (e.g. Cyrillic, Vietnamese) falls back to a system font.

### How the fonts reach the render

`scripts/compile-scene.mjs` inlines the weights a template declares as base64
`data:font/woff2` URLs inside the generated `scene.html`. That makes the scene a
single self-contained file: it renders correctly when opened from disk with a plain
double-click (no server, no `--allow-file-access-from-files`, no network), which is
also what the frame-capture step relies on.

### Verification

```sh
cd vendor/fonts
for f in *.woff2; do printf '%s ' "$f"; head -c4 "$f"; echo; done   # -> wOF2
stat -c '%n %s' *.woff2
sha256sum *.woff2
grep -o "fonts/[^')]*\.woff2" ../fonts.css | while read p; do test -f "$p" || echo "MISSING $p"; done
node --test tests/vendor.test.mjs    # asserts the five weights render distinctly
```

---

## fonts.css

| field | value |
| --- | --- |
| Purpose | `@font-face` declarations for the five vendored Montserrat weights |
| Licence | CSS is original to this repo; embedded font data is SIL OFL 1.1 |

Five blocks, one per weight, each pointing at its own file, `font-display: block`
(no fallback flash during capture) and `unicode-range` copied from Google's latin
block. Relative `url('fonts/...')` paths mean the CSS must be resolved from a page
whose base URL is `vendor/` — the compiler does not use this file directly, it reads
the woff2 files and inlines them (see above).
