# Video spec

## Master output profile — `profiles/landscape-1080p.json`

| property | value | why |
| --- | --- | --- |
| resolution | 1920×1080 | Full HD only. Signage SoCs (and the browsers they run) decode 1080p in hardware; 4K usually falls back to software. |
| fps | 25 | The source is authored at 25 fps; 30 or 60 adds nothing for a menu board and costs bitrate. |
| duration | 15 s | Inside the 10–15 s loop window for a board a customer reads while queueing. |
| codec | H.264 / `libx264` | Universally decodable. |
| profile / level | Main / 4.0 | Baseline lacks B-frames and costs bitrate; High is fine on modern sticks but Main is the safe intersection. High 10 and HEVC are rejected — cheap Android signage players choke on them. |
| pix_fmt | `yuv420p` | 4:2:0 is what hardware decoders expect. |
| audio | none (`-an`) | Screens are muted; a silent audio track trips some players. |
| faststart | `+movflags faststart` | moov atom first, so playback starts before the file is fully read (slow SD cards). |
| GOP | 2 s (`-g 50 -keyint_min 50 -sc_threshold 0`) | Regular keyframes make seeking and looping predictable. |
| CRF | 18 | Visually lossless for flat graphics with text; a signage loop is not a size problem. |

Encode:

```sh
scripts/encode-video.sh --frames work/frames --out out/board.mp4 --fps 25 --crf 18 --preset medium
```

## Artifacts per run

- `<name>.mp4` — the deliverable.
- `<name>.jpg` — poster (frame 0), for players that show a still instead of a video.
- `report.json` — every stage, every warning, every uncertainty.
- `work/` — `scene.html`, `plan.json`, `tokens.css`, `palette.json`, `checks.json`,
  and (with `--keep-frames`) the frames plus the seam frame.

## Frame capture

`scripts/render-frames.mjs` builds the GSAP timeline **paused**, then for each frame n
calls `seek(n / fps)`, waits two animation frames, and takes a screenshot. Nothing depends
on wall-clock time, so runs are reproducible: the same inputs produce the same frame bytes
on a 2-vCPU box and on a 32-core box. MediaRecorder is deliberately not used — it drops
frames under load and its output is not reproducible.

Waiting the two animation frames is not optional. Seeking and screenshotting in the same
task let the capture run against a state the raster threads had not finished: 7 of 375
frames differed inside one 256x245 tile, max delta 19/255, and two builds of the same
inputs produced different MP4s. Measured after the fix: 375/375 frames byte-identical
between two renders, and two full `adkit build` runs produce the same MP4 md5. It costs
about 33 ms per frame (42 s to 54 s for 375 frames). See D32 in `docs/DECISIONS.md`.

The capture also runs an audit at three moments (frame 0, the promo peak, just before
the loop restarts) and writes `checks.json`:

| check | severity |
| --- | --- |
| text overflows its box (`scrollWidth/Height > clientWidth/Height`) | error |
| text breaks the 5% safe area | error |
| text below the 32 px floor | error |
| effective contrast below 4.5:1 | error |
| contrast between 4.5:1 and 7:1 | warning (7:1 is preferred for body copy) |
| text over a photo or gradient | warning — cannot be checked automatically, a human looks at the frame |

## Validation assertions

`scripts/validate-video.sh` asserts with `ffprobe` and a byte scan: 1920×1080, h264,
Main, yuv420p, 25/1, exactly `fps × duration` frames, duration within one frame, zero
audio streams, and moov before mdat.

## Loop seam

The first frame and the frame at `t = duration` must be the same picture. The menu-board
scene is the base layer and is fully settled at t=0 (a customer can walk up mid-loop and
read the menu); the promo is an overlay that always fades back to opacity 0 before the
loop restarts. `adkit build` compares the two frames pixel by pixel and fails the build
above 0.5% of samples differing by more than 2/255.

## Other profiles

`profiles/portrait-1080x1920.json` and `profiles/google-html5.json` are **documented
stubs**. `adkit build --profile <stub>` fails immediately with the recorded blockers
instead of producing a broken file.
