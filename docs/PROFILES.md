# Profiles

A profile fixes the output geometry and encoder settings. `adkit build --profile <id>`
reads `profiles/<id>.json`. Profiles are never edited to make a variant - add a file.

| id | status | resolution | fps | duration | notes |
| --- | --- | --- | --- | --- | --- |
| `landscape-1080p` | **active** | 1920x1080 | 25 | 15 s | the shipping profile |
| `portrait-1080x1920` | stub | 1080x1920 | 25 | 15 s | fails fast, see below |
| `google-html5` | stub | 1920x1080 | - | - | fails fast, see below |

## landscape-1080p

```json
{
  "id": "landscape-1080p",
  "width": 1920, "height": 1080,
  "fps": 25, "duration": 15, "loop": true,
  "video": { "codec": "libx264", "profile": "Main", "level": "4.0", "pixFmt": "yuv420p",
             "crf": 18, "preset": "medium", "gop": 50, "keyintMin": 50, "scThreshold": 0,
             "faststart": true, "audio": false },
  "safeAreaPct": 0.05, "minTextPx": 32, "minItemTextPx": 48, "minContrast": 4.5,
  "preferredContrast": 7, "maxFlashingHz": 3,
  "scenes": { "base": "menu-board", "overlay": "promo" }
}
```

`duration` is 15 s: inside the 12-15 s loop window, and long enough for the promo overlay
(0.6 s in, 4.4 s held, 0.6 s out) to sit inside the loop without crowding the board.

## portrait-1080x1920 (stub)

`adkit build --profile portrait-1080x1920` exits immediately with
`notImplemented: true`. Blockers, recorded in the file itself:

1. The menu-board template is a fixed two-column 1920x1080 grid; a portrait board needs a
   stacked layout (header, hero, list) with its own type scale - reusing the landscape
   CSS would overflow the safe area.
2. Portrait signage is usually a **vertical** loop in a window or a totem, where a
   customer reads top-to-bottom; the 15 s / 4-item budget does not transfer.
3. Neither of those is a rendering problem - both need a designed template. Until then,
   a stub that fails loudly beats a stretched landscape frame.

## google-html5 (stub)

For Google Ads' HTML5 upload the deliverable is a ZIP of HTML+assets with a hard size
cap, not an MP4, and it forbids most external requests. Blockers:

1. The scene is ~113 KB of HTML before assets because fonts and GSAP are inlined as
   base64 - Google's cap (150 KB for the ZIP) is close enough that the font subsetting
   strategy would have to change first.
2. The upload path expects a `clickTag` and a fixed set of exit handlers.
3. It is a different deliverable type with different acceptance rules, so it needs its own
   validator rather than a flag on this one.

## Adding a profile

1. Copy `profiles/landscape-1080p.json` to `profiles/<id>.json`, change `id`,
   `width`/`height`/`fps`/`duration` and the video settings.
2. Check the templates support the aspect (a `menu-board` grid assumes ~16:9).
3. `node scripts/adkit.mjs build --profile <id> ...` and read `report.json`.
4. Add a row to the table above.
