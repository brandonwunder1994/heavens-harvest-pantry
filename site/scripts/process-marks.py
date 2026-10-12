"""Knock cream paper off Grok Imagine marks and size them for the granola label."""

from pathlib import Path
from PIL import Image
import numpy as np

ASSETS = Path(r"C:\Users\brand\.cursor\projects\c-Users-brand-Desktop-Heaven-s-Harvest-Pantry\assets")
SITE = Path(r"C:\Users\brand\Desktop\Heaven's Harvest Pantry\site")
MARKS_OUT = SITE / "public" / "flavor-marks"
PUBLIC = SITE / "public"

IDS = [
    "apple",
    "maple",
    "pecan",
    "chocolate",
    "coconut",
    "cashew",
    "vanilla",
    "blueberry",
    "almond",
    "honey",
    "cinnamon",
    "walnut",
    "cranberry",
    "pumpkin",
    "banana",
    "coffee",
    "lemon",
    "cherry",
    "pistachio",
    "hazelnut",
    "macadamia",
    "peanut",
    "salt",
    "candied",
    "pineapple",
    "berry",
    "fig",
    "oat",
]


def knock_paper(im: Image.Image) -> Image.Image:
    im = im.convert("RGBA")
    arr = np.asarray(im).copy()
    r, g, b, a = arr[:, :, 0].astype(np.float32), arr[:, :, 1].astype(np.float32), arr[:, :, 2].astype(np.float32), arr[:, :, 3]
    luma = 0.299 * r + 0.587 * g + 0.114 * b
    chroma = np.maximum(np.maximum(r, g), b) - np.minimum(np.minimum(r, g), b)
    hard = (luma > 228) & (chroma < 38)
    soft = (luma > 214) & (chroma < 28) & ~hard
    fade = np.clip((luma - 214) / 20, 0, 1)
    a = np.where(hard, 0, a)
    a = np.where(soft, (a * (1 - fade)).astype(np.uint8), a)
    arr[:, :, 3] = a
    return Image.fromarray(arr, "RGBA")


def trim(im: Image.Image, pad: int, size: int) -> Image.Image:
    bbox = im.getbbox()
    if not bbox:
        return im.resize((size, size), Image.Resampling.LANCZOS)
    left, top, right, bottom = bbox
    side = max(right - left, bottom - top)
    cx = (left + right) / 2
    cy = (top + bottom) / 2
    half = side / 2 + pad
    box = (
        int(cx - half),
        int(cy - half),
        int(cx + half),
        int(cy + half),
    )
    canvas = Image.new("RGBA", (int(half * 2), int(half * 2)), (0, 0, 0, 0))
    cropped = im.crop(
        (
            max(0, box[0]),
            max(0, box[1]),
            min(im.width, box[2]),
            min(im.height, box[3]),
        )
    )
    ox = max(0, -box[0])
    oy = max(0, -box[1])
    canvas.paste(cropped, (ox, oy))
    return canvas.resize((size, size), Image.Resampling.LANCZOS)


def ink_black(im: Image.Image) -> Image.Image:
    arr = np.asarray(im.convert("RGBA")).copy()
    a = arr[:, :, 3]
    arr[:, :, 0] = np.where(a < 8, 0, 26)
    arr[:, :, 1] = np.where(a < 8, 0, 18)
    arr[:, :, 2] = np.where(a < 8, 0, 8)
    arr[:, :, 3] = np.where(a < 8, 0, a)
    return Image.fromarray(arr, "RGBA")


def shrink(im: Image.Image, longest: int = 512) -> Image.Image:
    w, h = im.size
    if max(w, h) <= longest:
        return im
    scale = longest / max(w, h)
    return im.resize((max(1, int(w * scale)), max(1, int(h * scale))), Image.Resampling.LANCZOS)


def process_mark(src: Path, dest: Path, crop_top: float = 0) -> None:
    im = Image.open(src)
    if crop_top:
        im = im.crop((0, int(im.height * crop_top), im.width, im.height))
    dest.parent.mkdir(parents=True, exist_ok=True)
    trim(knock_paper(shrink(im)), pad=28, size=256).save(dest, "PNG")
    print(f"wrote {dest.name}")


def main() -> None:
    missing = []
    for mark_id in IDS:
        src = ASSETS / f"mark-{mark_id}.png"
        if not src.exists():
            missing.append(mark_id)
            continue
        crop = 0.2 if mark_id == "oat" else 0
        process_mark(src, MARKS_OUT / f"{mark_id}.png", crop_top=crop)
    if missing:
        raise SystemExit(f"missing marks: {', '.join(missing)}")

    jesus = ASSETS / "qr-cross-jesus.png"
    gold = ASSETS / "qr-cross-gold.png"
    src = jesus if jesus.exists() else gold
    cross = trim(knock_paper(shrink(Image.open(src), 640)), pad=8, size=256)
    cross.save(PUBLIC / "qr-cross.png", "PNG")
    ink_black(cross).save(PUBLIC / "qr-cross-print.png", "PNG")
    print("wrote qr-cross.png and qr-cross-print.png")


if __name__ == "__main__":
    main()
