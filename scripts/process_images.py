#!/usr/bin/env python3
"""Background removal + alpha analysis stage of the signage pipeline.

Reads a content manifest, runs a matting model over every referenced photo and
writes, per item, a trimmed RGBA cutout, its grayscale mask, the flat source
frame and a mid-gray preview, plus a machine-readable report.

CLI contract (frozen -- a Node orchestrator calls this):

    python3 scripts/process_images.py \
      --photos <dir> \
      --content <path to content.json> \
      --out <dir> \
      --model-cache <dir> \
      --matting auto|rembg|alpha|none \
      [--max-side 1600] [--flat-backdrop '#000000']

Exit codes: 0 ok, 2 missing dependency / missing checkpoint, 3 bad input.

`--matting none` never touches rembg/onnxruntime and needs only Pillow + numpy.
`--matting alpha` uses the alpha channel already in the photo, so a cutout PNG the
operator supplies needs no model at all; `auto` prefers it when every photo has one.
Model weights live outside the repository, in `--model-cache`.
"""

from __future__ import annotations

import argparse
import json
import os
import sys
import time
from pathlib import Path

# --------------------------------------------------------------------------- #
# constants
# --------------------------------------------------------------------------- #

SCHEMA_VERSION = 1

ALPHA_FLOOR = 8          # alpha <  ALPHA_FLOOR  -> 0
ALPHA_CEIL = 247         # alpha >  ALPHA_CEIL   -> 255
PAD_PX = 8               # padding added around the alpha bbox of the cutout
DEFAULT_MAX_SIDE = 1600
FLAT_JPEG_QUALITY = 92
PREVIEW_BACKGROUND = (128, 128, 128)  # #808080

EXIT_OK = 0
EXIT_DEPENDENCY = 2
EXIT_INPUT = 3

BIREFNET_SESSION = "birefnet-general"
# rembg stores the weights under <U2NET_HOME>/<session name>.onnx, whatever the
# upstream release asset is called.  Keep both names explicit.
BIREFNET_FILENAME = "birefnet-general.onnx"
BIREFNET_ASSET = "BiRefNet-general-epoch_244.onnx"
BIREFNET_URL = (
    "https://github.com/danielgatis/rembg/releases/download/v0.0.0/"
    + BIREFNET_ASSET
)
BIREFNET_MD5 = "7a35a0141cbbc80de11d9c9a28f52697"

MATTING_AUTO = "auto"
MATTING_REMBG = "rembg"
MATTING_ALPHA = "alpha"   # take the alpha channel that is already in the file
MATTING_NONE = "none"

# An input alpha channel only counts as a cutout when it actually has both
# transparent and opaque pixels. A fully opaque PNG (exported from an editor
# without transparency) must not silently become a full-frame "cutout".
ALPHA_USABLE_MIN = 5     # at least one pixel <= this  -> something is transparent
ALPHA_USABLE_MAX = 250   # at least one pixel >= this  -> something is opaque


# --------------------------------------------------------------------------- #
# errors
# --------------------------------------------------------------------------- #


class PipelineError(Exception):
    def __init__(self, code: int, message: str) -> None:
        super().__init__(message)
        self.code = code
        self.message = message


def die(code: int, message: str) -> "None":
    print(message, file=sys.stderr)
    raise SystemExit(code)


# --------------------------------------------------------------------------- #
# matting backend resolution
# --------------------------------------------------------------------------- #


def checkpoint_path(model_cache: Path) -> Path:
    return model_cache / BIREFNET_FILENAME


def download_command(model_cache: Path) -> str:
    return (
        'python3 -c "import hashlib,pathlib,urllib.request; '
        "p=pathlib.Path({cache!r})/{name!r}; "
        "p.parent.mkdir(parents=True, exist_ok=True); "
        "urllib.request.urlretrieve({url!r}, p); "
        "h=hashlib.md5(p.read_bytes()).hexdigest(); "
        "assert h == {md5!r}, 'checksum mismatch: ' + h; "
        'print(p, p.stat().st_size, h)"'
    ).format(
        cache=str(model_cache),
        name=BIREFNET_FILENAME,
        url=BIREFNET_URL,
        md5=BIREFNET_MD5,
    )


def install_command() -> str:
    here = Path(__file__).resolve().parent.parent
    return (
        "python3 -m venv {venv}\n"
        "  {venv}/bin/pip install -r {req}"
    ).format(venv=here / ".venv", req=here / "requirements.txt")


def probe_rembg() -> str | None:
    """Return None when rembg is importable, else a human readable reason."""
    try:
        import rembg  # noqa: F401
    except Exception as exc:  # pragma: no cover - depends on environment
        return "{}: {}".format(type(exc).__name__, exc)
    return None


def probe_input_alpha(path) -> bool:
    """True when the file carries an alpha channel that is an actual cutout.

    Cheap: only the alpha channel's extrema are read, no full decode of the RGB.
    """
    try:
        from PIL import Image

        with Image.open(path) as handle:
            if "A" not in handle.getbands():
                return False
            band = handle.getchannel("A")
            low, high = band.getextrema()
            return low <= ALPHA_USABLE_MIN and high >= ALPHA_USABLE_MAX
    except Exception:
        return False


def load_input_alpha(path):
    """Return the input's alpha channel as a uint8 array shaped like the RGB."""
    import numpy as np
    from PIL import Image

    with Image.open(path) as handle:
        handle.load()
        return np.asarray(handle.convert("RGBA").getchannel("A"), dtype=np.uint8)


def resolve_backend(mode: str, model_cache: Path, items) -> tuple[str, list[str]]:
    """Return (backend, report_warnings). backend is 'rembg', 'alpha' or 'none'."""
    ckpt = checkpoint_path(model_cache)

    if mode == MATTING_NONE:
        return MATTING_NONE, []

    with_alpha = [it for it in items if probe_input_alpha(it["path"])]

    if mode == MATTING_ALPHA:
        if len(with_alpha) != len(items):
            missing = [it["image"] for it in items if it not in with_alpha]
            die(
                EXIT_INPUT,
                "error: --matting alpha needs a real alpha channel in every photo\n"
                "  without one: {missing}\n"
                "Save those as PNG with the background removed, or use\n"
                "  --matting rembg (local model) or --matting none (no cutout).".format(
                    missing=", ".join(missing)
                ),
            )
        return MATTING_ALPHA, []

    import_error = probe_rembg()
    have_checkpoint = ckpt.is_file() and ckpt.stat().st_size > 0

    if mode == MATTING_REMBG:
        if import_error is not None:
            die(
                EXIT_DEPENDENCY,
                "error: rembg is not importable by {python}\n"
                "  reason: {reason}\n"
                "Install the python dependencies:\n"
                "  {install}".format(
                    python=sys.executable, reason=import_error, install=install_command()
                ),
            )
        if not have_checkpoint:
            die(
                EXIT_DEPENDENCY,
                "error: BiRefNet general checkpoint not found at {path}\n"
                "Download it:\n"
                "  {cmd}\n"
                "(the checkpoint is never committed to the repository)".format(
                    path=ckpt, cmd=download_command(model_cache)
                ),
            )
        return MATTING_REMBG, []

    # auto: an existing cutout costs nothing, so it wins over running a model.
    if with_alpha and len(with_alpha) == len(items):
        return MATTING_ALPHA, []
    if import_error is None and have_checkpoint:
        return MATTING_REMBG, []
    if import_error is not None:
        reason = "rembg is not importable ({})".format(import_error)
    else:
        reason = "checkpoint missing at {}".format(ckpt)
    return MATTING_NONE, [
        "rembg unavailable: {}; fell back to --matting none".format(reason)
    ]


def build_rembg_session(model_cache: Path):
    # rembg downloads and looks up weights under U2NET_HOME.
    os.environ["U2NET_HOME"] = str(model_cache)
    from rembg import new_session

    return new_session(BIREFNET_SESSION)


def run_rembg(pil_rgb, session):
    """Return the raw model mask as a uint8 numpy array shaped like pil_rgb.

    `session.predict` is used directly instead of `rembg.remove` because
    `remove` applies EXIF orientation fixes and optional post-processing, which
    would silently change the pixel geometry this stage reports on.
    """
    import numpy as np
    from PIL import Image

    masks = session.predict(pil_rgb)
    mask = masks[0]
    if getattr(mask, "mode", None) == "RGBA":
        mask = mask.getchannel("A")
    mask = mask.convert("L")
    if mask.size != pil_rgb.size:
        mask = mask.resize(pil_rgb.size, Image.LANCZOS)
    return np.asarray(mask, dtype=np.uint8)


def opaque_mask(shape) -> "object":
    import numpy as np

    return np.full(shape, 255, dtype=np.uint8)


# --------------------------------------------------------------------------- #
# image helpers (numpy + Pillow only)
# --------------------------------------------------------------------------- #


def fit_size(size: tuple[int, int], max_side: int) -> tuple[int, int]:
    w, h = size
    longest = max(w, h)
    if max_side <= 0 or longest <= max_side:
        return (w, h)
    scale = max_side / float(longest)
    return (max(1, int(round(w * scale))), max(1, int(round(h * scale))))


def _resize_float(channel, size: tuple[int, int]):
    import numpy as np
    from PIL import Image

    img = Image.fromarray(np.ascontiguousarray(channel, dtype=np.float32), mode="F")
    return np.asarray(img.resize(size, Image.BILINEAR), dtype=np.float32)


def resize_rgba_premultiplied(rgba, size: tuple[int, int]):
    """Resize RGBA in premultiplied space so transparent pixels cannot bleed."""
    import numpy as np

    arr = np.asarray(rgba, dtype=np.float32)
    if (arr.shape[1], arr.shape[0]) == size:
        return np.asarray(rgba, dtype=np.uint8)

    alpha = arr[..., 3]
    af = alpha / 255.0
    out = np.empty((size[1], size[0], 4), dtype=np.float32)
    for c in range(3):
        out[..., c] = _resize_float(arr[..., c] * af, size)
    out[..., 3] = _resize_float(alpha, size)

    an = out[..., 3] / 255.0
    safe = an > 1e-6
    rgb = np.zeros_like(out[..., :3])
    np.divide(
        out[..., :3],
        np.where(safe, an, 1.0)[..., None],
        out=rgb,
        where=safe[..., None],
    )
    out[..., :3] = np.clip(rgb, 0.0, 255.0)
    return np.rint(np.clip(out, 0.0, 255.0)).astype(np.uint8)


def clean_alpha(alpha):
    """Threshold the matte: < 8 -> 0, > 247 -> 255."""
    import numpy as np

    out = alpha.copy()
    out[alpha < ALPHA_FLOOR] = 0
    out[alpha > ALPHA_CEIL] = 255
    return out


def estimate_backdrop(rgb, alpha):
    """Median colour of the fully transparent region = the original backdrop."""
    import numpy as np

    flat = alpha.reshape(-1) == 0
    if int(flat.sum()) < 16:
        return None
    pixels = rgb.reshape(-1, 3)[flat]
    return np.median(pixels.astype(np.float64), axis=0).astype(np.float32)


def defringe(rgb, alpha, backdrop):
    """Unpremultiply the colour by the alpha.

    The observed pixel of a soft matte edge is a blend of the foreground and the
    original backdrop:  C_obs = a * C_fg + (1 - a) * C_bg.  Solving for the
    foreground and dividing by the alpha removes the halo the backdrop would
    otherwise leave when the cutout is composited on a new background.  With no
    backdrop estimate (C_bg = 0) this degenerates to the plain C_obs / a
    unpremultiply.
    """
    import numpy as np

    out = rgb.astype(np.float32)
    edge = (alpha > 0) & (alpha < 255)
    if not bool(edge.any()):
        return np.clip(out, 0.0, 255.0)

    a = (alpha.astype(np.float32) / 255.0)[..., None]
    a_safe = np.maximum(a, 1.0 / 255.0)
    if backdrop is None:
        corrected = out / a_safe
    else:
        corrected = (out - (1.0 - a) * backdrop[None, None, :]) / a_safe
    corrected = np.clip(corrected, 0.0, 255.0)
    return np.where(edge[..., None], corrected, out)


def alpha_bbox(alpha):
    """Bounding box of non-zero alpha as (x, y, w, h); None when empty."""
    import numpy as np

    ys, xs = np.nonzero(alpha > 0)
    if xs.size == 0:
        return None
    x0, x1 = int(xs.min()), int(xs.max())
    y0, y1 = int(ys.min()), int(ys.max())
    return (x0, y0, x1 - x0 + 1, y1 - y0 + 1)


def _neighbour_any(mask):
    import numpy as np

    out = np.zeros_like(mask)
    out[1:, :] |= mask[:-1, :]
    out[:-1, :] |= mask[1:, :]
    out[:, 1:] |= mask[:, :-1]
    out[:, :-1] |= mask[:, 1:]
    return out


def alpha_stats(cutout, src_size, crop_origin, scale):
    """All alpha metrics for the written cutout (uint8 RGBA numpy array)."""
    import numpy as np

    alpha = cutout[..., 3]
    total = int(alpha.shape[0] * alpha.shape[1])
    opaque = int(np.count_nonzero(alpha == 255))
    semi = int(np.count_nonzero((alpha > 0) & (alpha < 255)))

    box = alpha_bbox(alpha)
    if box is None:
        box = (0, 0, 0, 0)
        centroid = None
    else:
        a64 = alpha.astype(np.float64)
        ys, xs = np.mgrid[0 : alpha.shape[0], 0 : alpha.shape[1]]
        weight = float(a64.sum())
        if weight > 0:
            cx = float((a64 * xs).sum()) / weight
            cy = float((a64 * ys).sum()) / weight
            centroid = (
                (crop_origin[0] + (cx + 0.5) / scale) / float(src_size[0]),
                (crop_origin[1] + (cy + 0.5) / scale) / float(src_size[1]),
            )
        else:
            centroid = None

    semi_mask = (alpha > 0) & (alpha < 255)
    opaque_mask_ = alpha == 255
    transparent_mask = alpha == 0
    halo = int(
        np.count_nonzero(
            semi_mask & _neighbour_any(opaque_mask_) & _neighbour_any(transparent_mask)
        )
    )

    return {
        "total": total,
        "opaque": opaque,
        "semi": semi,
        "bbox": box,
        "centroid": centroid,
        "haloPixels": halo,
    }


def normalise_focal(raw):
    """Accept [x, y] or {"x": .., "y": ..}; return (x, y) in 0..1 or None."""
    if isinstance(raw, dict):
        x, y = raw.get("x"), raw.get("y")
    elif isinstance(raw, (list, tuple)) and len(raw) == 2:
        x, y = raw[0], raw[1]
    else:
        return None
    try:
        xf, yf = float(x), float(y)
    except (TypeError, ValueError):
        return None
    if not (0.0 <= xf <= 1.0 and 0.0 <= yf <= 1.0):
        return None
    return (xf, yf)


def round6(value: float) -> float:
    return float(round(value, 6))


# --------------------------------------------------------------------------- #
# manifest
# --------------------------------------------------------------------------- #


def read_manifest(content_path: Path, photos_dir: Path):
    if not content_path.is_file():
        raise PipelineError(
            EXIT_INPUT, "error: content file not found: {}".format(content_path)
        )
    try:
        raw = json.loads(content_path.read_text(encoding="utf-8"))
    except (ValueError, OSError) as exc:
        raise PipelineError(
            EXIT_INPUT, "error: cannot read content file {}: {}".format(content_path, exc)
        )
    items = raw.get("items") if isinstance(raw, dict) else None
    if not isinstance(items, list):
        raise PipelineError(
            EXIT_INPUT, "error: {}: 'items' must be a list".format(content_path)
        )

    photos_root = photos_dir.resolve()
    parsed = []
    seen = set()
    for index, item in enumerate(items):
        if not isinstance(item, dict):
            raise PipelineError(
                EXIT_INPUT, "error: items[{}] must be an object".format(index)
            )
        item_id = item.get("id")
        if not isinstance(item_id, str) or not item_id.strip():
            raise PipelineError(
                EXIT_INPUT, "error: items[{}] has a missing or empty 'id'".format(index)
            )
        if item_id in seen:
            raise PipelineError(
                EXIT_INPUT, "error: unknown/duplicate item id: {!r}".format(item_id)
            )
        seen.add(item_id)
        if "/" in item_id or "\\" in item_id or item_id in (".", ".."):
            raise PipelineError(
                EXIT_INPUT,
                "error: item id {!r} is not a safe directory name".format(item_id),
            )

        image = item.get("image")
        if not isinstance(image, str) or not image.strip():
            raise PipelineError(
                EXIT_INPUT,
                "error: item {!r} has a missing or empty 'image'".format(item_id),
            )
        image_path = (photos_root / image).resolve()
        if not image_path.is_file():
            raise PipelineError(
                EXIT_INPUT,
                "error: item {!r}: image not found: {}".format(item_id, image_path),
            )
        try:
            image_path.relative_to(photos_root)
        except ValueError:
            raise PipelineError(
                EXIT_INPUT,
                "error: item {!r}: image path escapes --photos: {}".format(
                    item_id, image
                ),
            )
        parsed.append(
            {
                "id": item_id,
                "image": image,
                "path": image_path,
                "focalPoint": item.get("focalPoint"),
                "role": "item",
            }
        )

    # The promo overlay shows its own photo (promo.image), which is not one of the menu
    # items. Without this the promo template would reference an asset nobody produced.
    promo = raw.get("promo")
    if isinstance(promo, dict):
        promo_image = promo.get("image")
        if isinstance(promo_image, str) and promo_image.strip():
            promo_id = Path(promo_image).stem
            if not promo_id or "/" in promo_id or "\\" in promo_id or promo_id in (".", ".."):
                raise PipelineError(
                    EXIT_INPUT,
                    "error: promo.image {!r} is not a usable file name".format(promo_image),
                )
            if promo_id not in seen:
                promo_path = (photos_root / promo_image).resolve()
                if not promo_path.is_file():
                    raise PipelineError(
                        EXIT_INPUT,
                        "error: promo.image not found: {}".format(promo_path),
                    )
                try:
                    promo_path.relative_to(photos_root)
                except ValueError:
                    raise PipelineError(
                        EXIT_INPUT,
                        "error: promo.image escapes --photos: {}".format(promo_image),
                    )
                seen.add(promo_id)
                parsed.append(
                    {
                        "id": promo_id,
                        "image": promo_image,
                        "path": promo_path,
                        "focalPoint": promo.get("focalPoint"),
                        "role": "promo",
                    }
                )
    return parsed


# --------------------------------------------------------------------------- #
# per-item processing
# --------------------------------------------------------------------------- #


def parse_hex_color(text: str) -> tuple:
    raw = str(text).strip().lstrip("#")
    if len(raw) == 3:
        raw = "".join(ch * 2 for ch in raw)
    if len(raw) != 6:
        die(EXIT_INPUT, "error: --flat-backdrop must be #rrggbb, got {!r}".format(text))
    try:
        return tuple(int(raw[i : i + 2], 16) for i in (0, 2, 4))
    except ValueError:
        die(EXIT_INPUT, "error: --flat-backdrop must be #rrggbb, got {!r}".format(text))


def composite_over(source, alpha, backdrop_rgb):
    """Flatten an RGBA subject onto a solid colour (used for the flat frame)."""
    import numpy as np
    from PIL import Image

    a = (alpha.astype(np.float32) / 255.0)[..., None]
    rgb = np.asarray(source, dtype=np.float32)
    bg = np.asarray(backdrop_rgb, dtype=np.float32)[None, None, :]
    out = rgb * a + bg * (1.0 - a)
    return Image.fromarray(np.clip(out, 0.0, 255.0).astype(np.uint8), "RGB")


def process_item(item, backend, session, out_dir, photos_dir, max_side, flat_backdrop):
    import numpy as np
    from PIL import Image

    with Image.open(item["path"]) as handle:
        handle.load()
        source = handle.convert("RGB")
    src_size = (source.width, source.height)
    src_arr = np.asarray(source, dtype=np.uint8)

    warnings: list[str] = []

    if backend == MATTING_ALPHA:
        # The supplied cutout is the author's ground truth: threshold the alpha
        # for cleanliness, but never unpremultiply or defringe the colour.
        raw_alpha = load_input_alpha(item["path"])
        alpha = clean_alpha(raw_alpha)
        rgb = src_arr
        flat_source = composite_over(source, alpha, flat_backdrop)
    elif backend == MATTING_REMBG:
        raw_alpha = run_rembg(source, session)
        alpha = clean_alpha(raw_alpha)
        backdrop = estimate_backdrop(src_arr, alpha)
        rgb = defringe(src_arr, alpha, backdrop)
        flat_source = source
    else:
        raw_alpha = opaque_mask((src_size[1], src_size[0]))
        warnings.append("matting-disabled")
        alpha = clean_alpha(raw_alpha)
        rgb = src_arr
        flat_source = source

    full_box = alpha_bbox(alpha)
    if full_box is None:
        full_box = (0, 0, src_size[0], src_size[1])
        warnings.append("empty-matte")

    fx, fy, fw, fh = full_box
    crop_x0 = max(0, fx - PAD_PX)
    crop_y0 = max(0, fy - PAD_PX)
    crop_x1 = min(src_size[0], fx + fw + PAD_PX)
    crop_y1 = min(src_size[1], fy + fh + PAD_PX)

    rgba = np.rint(np.dstack([rgb, alpha.astype(np.float32)])).astype(np.uint8)
    cropped = rgba[crop_y0:crop_y1, crop_x0:crop_x1, :]

    crop_size = (cropped.shape[1], cropped.shape[0])
    target = fit_size(crop_size, max_side)
    scale = target[0] / float(crop_size[0])
    if target != crop_size:
        cropped = resize_rgba_premultiplied(cropped, target)
    else:
        scale = 1.0

    item_dir = out_dir / item["id"]
    item_dir.mkdir(parents=True, exist_ok=True)

    cutout_img = Image.fromarray(cropped, "RGBA")
    cutout_img.save(item_dir / "cutout.png", format="PNG", optimize=False)

    Image.fromarray(cropped[..., 3], "L").save(
        item_dir / "mask.png", format="PNG", optimize=False
    )

    flat = flat_source
    flat_size = fit_size(src_size, max_side)
    if flat_size != src_size:
        flat = flat_source.resize(flat_size, Image.LANCZOS)
    flat.save(
        item_dir / "flat.jpg",
        format="JPEG",
        quality=FLAT_JPEG_QUALITY,
        subsampling=0,
        optimize=False,
    )

    preview_bg = Image.new("RGBA", cutout_img.size, PREVIEW_BACKGROUND + (255,))
    Image.alpha_composite(preview_bg, cutout_img).convert("RGB").save(
        item_dir / "preview.png", format="PNG", optimize=False
    )

    stats = alpha_stats(cropped, src_size, (crop_x0, crop_y0), scale)
    total = max(1, stats["total"])

    bbox = stats["bbox"]
    bbox_norm = [
        round6(fx / float(src_size[0])),
        round6(fy / float(src_size[1])),
        round6(fw / float(src_size[0])),
        round6(fh / float(src_size[1])),
    ]

    focal_raw = normalise_focal(item["focalPoint"])
    if focal_raw is not None:
        focal = {"x": round6(focal_raw[0]), "y": round6(focal_raw[1]), "source": "content"}
    elif stats["centroid"] is not None:
        focal = {
            "x": round6(stats["centroid"][0]),
            "y": round6(stats["centroid"][1]),
            "source": "alpha-centroid",
        }
    else:
        focal = {"x": 0.5, "y": 0.5, "source": "alpha-centroid"}
        warnings.append("no-focal-estimate")

    touches_border = (
        fx <= 0 or fy <= 0 or (fx + fw) >= src_size[0] or (fy + fh) >= src_size[1]
    )

    photos_name = Path(photos_dir).name
    source_label = "/".join(
        [photos_name] + Path(item["image"]).as_posix().lstrip("/").split("/")
    )

    return {
        "id": item["id"],
        "role": item.get("role", "item"),
        "source": source_label,
        "alphaSource": {
            MATTING_ALPHA: "input",
            MATTING_REMBG: "model",
            MATTING_NONE: "none",
        }.get(backend, "none"),
        "sourceSize": [src_size[0], src_size[1]],
        "cutout": "{}/cutout.png".format(item["id"]),
        "mask": "{}/mask.png".format(item["id"]),
        "flat": "{}/flat.jpg".format(item["id"]),
        "preview": "{}/preview.png".format(item["id"]),
        "alpha": {
            "coverage": round6(stats["opaque"] / float(total)),
            "bbox": [int(v) for v in bbox],
            "bboxNorm": bbox_norm,
            "semiTransparentRatio": round6(stats["semi"] / float(total)),
            "opaquePixels": int(stats["opaque"]),
            "edge": {
                "haloPixels": int(stats["haloPixels"]),
                "touchesBorder": bool(touches_border),
            },
        },
        "focal": focal,
        "warnings": warnings,
    }


# --------------------------------------------------------------------------- #
# entry point
# --------------------------------------------------------------------------- #


def parse_args(argv):
    parser = argparse.ArgumentParser(
        prog="process_images.py",
        description="Background removal + alpha analysis for signage items.",
    )
    parser.add_argument("--photos", required=True, help="directory holding the photos")
    parser.add_argument("--content", required=True, help="path to content.json")
    parser.add_argument("--out", required=True, help="output directory")
    parser.add_argument("--model-cache", required=True, help="model weights directory")
    parser.add_argument(
        "--matting",
        required=True,
        choices=[MATTING_AUTO, MATTING_REMBG, MATTING_ALPHA, MATTING_NONE],
        help="matting backend (alpha = use the alpha channel already in the file)",
    )
    parser.add_argument(
        "--max-side",
        type=int,
        default=DEFAULT_MAX_SIDE,
        help="longest side of every written image (default: %(default)s)",
    )
    parser.add_argument(
        "--flat-backdrop",
        default="#000000",
        help=(
            "colour the transparent area of a supplied cutout is flattened onto "
            "when writing flat.jpg (default: %(default)s)"
        ),
    )
    return parser.parse_args(argv)


def main(argv=None) -> int:
    args = parse_args(sys.argv[1:] if argv is None else argv)

    import numpy as np

    np.random.seed(0)
    try:  # deterministic if torch happens to be installed via rembg extras
        import torch

        torch.manual_seed(0)
        torch.use_deterministic_algorithms(False)
    except Exception:
        pass

    photos_dir = Path(args.photos).expanduser()
    content_path = Path(args.content).expanduser()
    out_dir = Path(args.out).expanduser()
    model_cache = Path(args.model_cache).expanduser().resolve()

    if not photos_dir.is_dir():
        die(EXIT_INPUT, "error: --photos is not a directory: {}".format(photos_dir))
    if args.max_side < 1:
        die(EXIT_INPUT, "error: --max-side must be >= 1")

    try:
        items = read_manifest(content_path, photos_dir)
    except PipelineError as exc:
        die(exc.code, exc.message)

    backend, report_warnings = resolve_backend(args.matting, model_cache, items)
    flat_backdrop = parse_hex_color(args.flat_backdrop)

    session = None
    if backend == MATTING_REMBG:
        model_cache.mkdir(parents=True, exist_ok=True)
        session = build_rembg_session(model_cache)

    try:
        out_dir.mkdir(parents=True, exist_ok=True)
    except OSError as exc:
        die(EXIT_INPUT, "error: cannot create --out {}: {}".format(out_dir, exc))

    results = []
    for index, item in enumerate(items, start=1):
        started = time.perf_counter()
        print(
            "[process_images] {}/{} {}".format(index, len(items), item["id"]),
            file=sys.stderr,
            flush=True,
        )
        result = process_item(
            item, backend, session, out_dir, photos_dir, args.max_side, flat_backdrop
        )
        print(
            "[process_images] {}/{} {} done in {:.1f}s".format(
                index, len(items), item["id"], time.perf_counter() - started
            ),
            file=sys.stderr,
            flush=True,
        )
        results.append(result)

    report = {
        "schemaVersion": SCHEMA_VERSION,
        "matting": {
            MATTING_REMBG: "rembg:{}".format(BIREFNET_SESSION),
            MATTING_ALPHA: "alpha:input",
        }.get(backend, "none"),
        "modelCache": str(model_cache),
        "flatBackdrop": "#%02x%02x%02x" % flat_backdrop,
        "items": results,
        "warnings": report_warnings,
    }

    (out_dir / "report.json").write_text(
        json.dumps(report, indent=2, ensure_ascii=False) + "\n", encoding="utf-8"
    )
    return EXIT_OK


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except SystemExit:
        raise
    except KeyboardInterrupt:
        raise SystemExit(130)
