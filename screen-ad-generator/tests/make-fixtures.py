#!/usr/bin/env python3
"""Generate deterministic SYNTHETIC photos for tests and examples.

These are not food photography. They are labelled stand-ins that exercise the three
asset classes the pipeline must handle (plated dish, glass drink, flat-lay) and give
the tests a known subject position so alpha bounding boxes and focal points can be
asserted. Every generated image is reproducible from this file.

Replace them with real, retouched photography before publishing anything on a screen.

Run:  python3 tests/make-fixtures.py
"""
import math
import pathlib
import random
import zlib

from PIL import Image, ImageChops, ImageDraw, ImageFilter

ROOT = pathlib.Path(__file__).resolve().parent.parent

# palette variants so items are visually distinguishable in the examples
PLATE = (238, 236, 228)
FOODS = [
    ((196, 92, 40), (150, 158, 96), (232, 206, 120)),   # curry / rice / greens
    ((122, 76, 44), (208, 148, 60), (232, 226, 208)),   # pasta
    ((96, 132, 72), (212, 96, 72), (240, 232, 210)),    # salad
    ((172, 96, 60), (226, 198, 128), (140, 150, 92)),   # bowl
]
DRINKS = [(150, 78, 30), (86, 52, 30), (196, 150, 74), (58, 40, 28)]

OUTPUTS = {
    "tests/fixtures": [
        ("dish-plate.jpg", (1400, 1050), (330, 190, 1070, 860), "plate", 0),
        ("drink-glass.jpg", (1000, 1400), (300, 180, 700, 1240), "glass", 0),
        ("flatlay-board.jpg", (1400, 1400), (250, 250, 1150, 1150), "flatlay", 0),
    ],
    "examples/coffee-menu/photos": [
        ("flat-white.jpg", (1200, 1400), (360, 300, 840, 1240), "glass", 2),
        ("filter.jpg", (1200, 1400), (330, 280, 870, 1260), "glass", 0),
        ("banana-bread.jpg", (1400, 1100), (300, 200, 1100, 900), "plate", 1),
        ("cold-brew.jpg", (1200, 1400), (350, 260, 850, 1250), "glass", 3),
    ],
    "examples/ko-kitchen/photos": [
        ("curry.jpg", (1400, 1050), (300, 180, 1100, 880), "plate", 0),
        ("bowl.jpg", (1400, 1050), (320, 200, 1080, 860), "plate", 3),
        ("pasta.jpg", (1400, 1050), (300, 190, 1090, 870), "plate", 1),
        ("salad.jpg", (1400, 1050), (310, 200, 1090, 860), "plate", 2),
        ("membership.jpg", (1600, 900), (420, 120, 1180, 800), "flatlay", 0),
    ],
}


# Cutouts: the same subjects, but with the backdrop removed, so the `--matting alpha`
# backend can be tested without a model. The alpha channel is derived from the exact
# difference against the bare backdrop, so the subject box is known.
CUTOUTS = {
    "tests/fixtures/cutouts": [
        ("dish-plate.png", (1400, 1050), (330, 190, 1070, 860), "plate", 0),
        ("drink-glass.png", (1000, 1400), (300, 180, 700, 1240), "glass", 0),
    ],
}


def fixture_seed(name, variant):
    """Stable across processes and Python versions (str.__hash__ is randomised per run)."""
    return (zlib.crc32(name.encode("utf-8")) + variant) % 9999


def backdrop(size, seed):
    """Plain, slightly vignetted backdrop: a matting model should separate it easily."""
    w, h = size
    rnd = random.Random(seed)
    img = Image.new("RGB", size, (168, 170, 164))
    px = img.load()
    cx, cy = w / 2, h / 2
    maxd = math.hypot(cx, cy)
    for y in range(h):
        for x in range(0, w, 2):
            d = math.hypot(x - cx, y - cy) / maxd
            v = 168 - int(26 * d * d) + rnd.randint(-4, 4)
            px[x, y] = (v, v + 2, v - 4)
            if x + 1 < w:
                px[x + 1, y] = (v, v + 2, v - 4)
    return img.filter(ImageFilter.GaussianBlur(0.6))


def blob(draw, box, color, seed, wobble=18):
    """Rounded organic blob inside box, for food-like masses."""
    rnd = random.Random(seed)
    x0, y0, x1, y1 = box
    pts = []
    steps = 26
    for i in range(steps):
        a = 2 * math.pi * i / steps
        rx, ry = (x1 - x0) / 2, (y1 - y0) / 2
        wob = 1 + rnd.uniform(-wobble, wobble) / 100
        pts.append(((x0 + x1) / 2 + math.cos(a) * rx * wob, (y0 + y1) / 2 + math.sin(a) * ry * wob))
    draw.polygon(pts, fill=color)


def draw_subject(img, box, kind, variant, seed):
    d = ImageDraw.Draw(img, "RGBA")
    x0, y0, x1, y1 = box
    w, h = x1 - x0, y1 - y0
    if kind == "plate":
        a, b, c = FOODS[variant % len(FOODS)]
        d.ellipse((x0, y0 + h * 0.30, x1, y1), fill=PLATE + (255,))
        d.ellipse((x0 + w * 0.06, y0 + h * 0.36, x1 - w * 0.06, y1 - h * 0.04), fill=(226, 224, 214, 255))
        blob(d, (x0 + w * 0.16, y0 + h * 0.44, x0 + w * 0.62, y0 + h * 0.80), a + (255,), seed + 1)
        blob(d, (x0 + w * 0.44, y0 + h * 0.50, x0 + w * 0.86, y0 + h * 0.86), b + (255,), seed + 2)
        d.ellipse((x0 + w * 0.30, y0 + h * 0.52, x0 + w * 0.44, y0 + h * 0.66), fill=c + (255,))
    elif kind == "glass":
        liquid = DRINKS[variant % len(DRINKS)]
        d.rounded_rectangle((x0 + w * 0.12, y0, x1 - w * 0.12, y1), radius=int(w * 0.12), fill=(210, 214, 212, 90))
        d.rounded_rectangle((x0 + w * 0.18, y0 + h * 0.18, x1 - w * 0.18, y1 - h * 0.03), radius=int(w * 0.10),
                            fill=liquid + (240,))
        d.rectangle((x0 + w * 0.58, y0 + h * 0.02, x0 + w * 0.70, y0 + h * 0.34), fill=(228, 226, 220, 255))
        d.rounded_rectangle((x0 + w * 0.12, y0, x1 - w * 0.12, y1), radius=int(w * 0.12),
                            outline=(246, 246, 244, 190), width=max(2, int(w * 0.02)))
    else:  # flatlay
        d.rounded_rectangle((x0, y0, x1, y1), radius=int(w * 0.06), fill=(206, 198, 182, 255))
        for i, c in enumerate([(196, 92, 40, 255), (150, 158, 96, 255), (232, 206, 120, 255), (120, 96, 72, 255)]):
            cx = x0 + w * (0.28 + 0.44 * (i % 2))
            cy = y0 + h * (0.28 + 0.44 * (i // 2))
            blob(d, (cx - w * 0.17, cy - h * 0.17, cx + w * 0.17, cy + h * 0.17), c, seed + i)
    return img


def make_cutout(size, box, kind, variant, seed):
    """Subject on a transparent background: alpha = where the subject changed the frame."""
    bg = backdrop(size, seed)
    subject = draw_subject(bg.copy(), box, kind, variant, seed)
    diff = ImageChops.difference(subject.convert("RGB"), bg.convert("RGB")).convert("L")
    mask = diff.point(lambda v: 255 if v > 10 else 0)
    mask = mask.filter(ImageFilter.MaxFilter(5)).filter(ImageFilter.GaussianBlur(0.8))
    mask = mask.point(lambda v: 255 if v > 128 else 0)
    rgba = subject.convert("RGBA")
    rgba.putalpha(mask)
    return rgba


def main():
    written = 0
    for rel, specs in CUTOUTS.items():
        out = ROOT / rel
        out.mkdir(parents=True, exist_ok=True)
        for name, size, box, kind, variant in specs:
            seed = fixture_seed(name, variant)
            make_cutout(size, box, kind, variant, seed).save(out / name, optimize=True)
            written += 1
            print(f"wrote {rel}/{name}  {size[0]}x{size[1]}  class={kind}  subject={box}  (RGBA)")
    for rel, specs in OUTPUTS.items():
        out = ROOT / rel
        out.mkdir(parents=True, exist_ok=True)
        for name, size, box, kind, variant in specs:
            seed = fixture_seed(name, variant)
            img = backdrop(size, seed)
            img = draw_subject(img, box, kind, variant, seed)
            img = img.filter(ImageFilter.GaussianBlur(0.4))
            img.save(out / name, quality=88, optimize=True)
            written += 1
            print(f"wrote {rel}/{name}  {size[0]}x{size[1]}  class={kind}  subject={box}")
    print(f"{written} synthetic images")


if __name__ == "__main__":
    main()
