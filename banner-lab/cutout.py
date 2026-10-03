#!/usr/bin/env python3
"""
Cut the product photos out of their backgrounds.

`cutoutFloat` and `arch` are the two treatments that show the product as a free-standing
object. They need a real alpha channel, and without one the renderer falls back to `framed`,
which is why a pool with no cutouts quietly loses two of its seven product treatments.

The matting model runs locally; there is no network call. Long side is capped at 1600px
because quality stops improving above that and the cost keeps rising.

    python3 cutout.py                     # every photo in photos2.json that has no cutout
    python3 cutout.py --limit 60          # stop after 60, so it can run in slices
    python3 cutout.py burger-00-abcd1234  # named slugs
"""
import json
import os
import pathlib
import sys
import time

HERE = pathlib.Path(__file__).resolve().parent
PHOTOS = HERE / "photos2"
CUT = PHOTOS / "cut"
MANIFEST = HERE / "photos2.json"
LONG_SIDE = 1600


def main():
    from PIL import Image, ImageFilter
    from rembg import new_session, remove

    argv = sys.argv[1:]
    limit = None
    if "--limit" in argv:
        limit = int(argv[argv.index("--limit") + 1])
        argv = [a for a in argv if a != "--limit" and a != str(limit)]

    manifest = json.loads(MANIFEST.read_text())
    slugs = argv or sorted(manifest)
    todo = [s for s in slugs if s in manifest and not (CUT / f"{s}.png").exists()]
    if limit:
        todo = todo[:limit]
    if not todo:
        print("nothing to do")
        return 0

    CUT.mkdir(parents=True, exist_ok=True)
    t0 = time.time()
    model = os.environ.get("CUTOUT_MODEL", "isnet-general-use")
    session = new_session(model)
    print(f"session ready in {time.time() - t0:.0f}s; {len(todo)} images", flush=True)

    for i, slug in enumerate(todo, 1):
        src = PHOTOS / manifest[slug]["file"]
        dst = CUT / f"{slug}.png"
        t = time.time()
        try:
            img = Image.open(src).convert("RGB")
            scale = min(1.0, LONG_SIDE / max(img.size))
            if scale < 1.0:
                img = img.resize((round(img.width * scale), round(img.height * scale)), Image.LANCZOS)
            out = remove(img, session=session, alpha_matting=False)
            # The model leaks a large, very-low-alpha ghost around the subject. It is nearly
            # invisible on its own, but `.bn--prod-cutoutFloat` puts a `drop-shadow` on the
            # image and the shadow filter reads the alpha channel directly, so the ghost is
            # amplified into a visible grey box. Drop anything under ~9% alpha.
            alpha = out.getchannel("A").point(lambda v: 0 if v < 24 else v)
            out.putalpha(alpha)
            # The model also keeps the source framing, so a subject that occupies a band of
            # the photo leaves most of the cutout transparent. `cutoutFloat` and `arch` size
            # the image with `object-fit: contain`, so that transparent padding is rendered as
            # empty canvas and the product comes out small. Crop to the alpha bounding box --
            # measured on an eroded mask, so a stray crumb near the frame edge cannot stretch
            # the box and shrink the subject.
            box = alpha.filter(ImageFilter.MinFilter(3)).getbbox() or alpha.getbbox()
            if box:
                out = out.crop(box)
            out.save(dst, optimize=True)
            manifest[slug]["cut"] = f"cut/{slug}.png"
            manifest[slug]["cutBytes"] = dst.stat().st_size
            print(f"  [{i}/{len(todo)}] {slug}  {out.size}  {time.time() - t:.0f}s", flush=True)
        except Exception as e:  # noqa: BLE001
            print(f"  ! {slug}: {e}", flush=True)
        if i % 10 == 0:  # keep the manifest usable if the run is interrupted
            MANIFEST.write_text(json.dumps(manifest, indent=2, ensure_ascii=False) + "\n")

    MANIFEST.write_text(json.dumps(manifest, indent=2, ensure_ascii=False) + "\n")
    print(f"done in {time.time() - t0:.0f}s", flush=True)
    return 0


if __name__ == "__main__":
    sys.exit(main())
