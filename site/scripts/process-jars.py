"""Cut Grok Imagine mason jars off the studio white so they can float."""

from collections import deque
from pathlib import Path

import numpy as np
from PIL import Image, ImageFilter

ASSETS = Path(r"C:\Users\brand\.cursor\projects\c-Users-brand-Desktop-Heaven-s-Harvest-Pantry\assets")
OUT = Path(r"C:\Users\brand\Desktop\Heaven's Harvest Pantry\site\public\jars")

JARS = [
    "jar-honey-almond.png",
    "jar-maple-pecan.png",
    "jar-dark-chocolate.png",
    "jar-apple-maple-pecan.png",
    "jar-chocolate-coconut-cashew.png",
    "jar-vanilla-blueberry-almond.png",
    "jar-candied-almonds.png",
]

CANVAS = (720, 1000)
PAD = 28
EDGE_TOL = 38
FLOOD_TOL = 46


def dist_white(rgb: np.ndarray) -> np.ndarray:
    return np.sqrt(((rgb.astype(np.float32) - 255.0) ** 2).sum(axis=2))


def flood_background(dist: np.ndarray, edge_tol: float, flood_tol: float) -> np.ndarray:
    h, w = dist.shape
    bg = np.zeros((h, w), dtype=bool)
    seen = np.zeros((h, w), dtype=bool)
    q: deque[tuple[int, int]] = deque()

    def seed(y: int, x: int) -> None:
        if dist[y, x] <= edge_tol:
            q.append((y, x))
            seen[y, x] = True

    for x in range(w):
        seed(0, x)
        seed(h - 1, x)
    for y in range(h):
        seed(y, 0)
        seed(y, w - 1)

    while q:
        y, x = q.popleft()
        bg[y, x] = True
        for ny, nx in ((y - 1, x), (y + 1, x), (y, x - 1), (y, x + 1)):
            if ny < 0 or ny >= h or nx < 0 or nx >= w or seen[ny, nx]:
                continue
            if dist[ny, nx] <= flood_tol:
                seen[ny, nx] = True
                q.append((ny, nx))
    return bg


def fill_holes(foreground: np.ndarray) -> np.ndarray:
    h, w = foreground.shape
    outside = np.zeros((h, w), dtype=bool)
    seen = np.zeros((h, w), dtype=bool)
    q: deque[tuple[int, int]] = deque()

    def seed(y: int, x: int) -> None:
        if not foreground[y, x]:
            q.append((y, x))
            seen[y, x] = True

    for x in range(w):
        seed(0, x)
        seed(h - 1, x)
    for y in range(h):
        seed(y, 0)
        seed(y, w - 1)

    while q:
        y, x = q.popleft()
        outside[y, x] = True
        for ny, nx in ((y - 1, x), (y + 1, x), (y, x - 1), (y, x + 1)):
            if ny < 0 or ny >= h or nx < 0 or nx >= w or seen[ny, nx]:
                continue
            if not foreground[ny, nx]:
                seen[ny, nx] = True
                q.append((ny, nx))
    return ~outside


def morph_close(mask: np.ndarray, radius: int) -> np.ndarray:
    im = Image.fromarray((mask.astype(np.uint8) * 255), "L")
    im = im.filter(ImageFilter.MaxFilter(radius * 2 + 1))
    im = im.filter(ImageFilter.MinFilter(radius * 2 + 1))
    return np.asarray(im) > 127


def wipe_studio_floor(im: Image.Image) -> Image.Image:
    """Only the paper-white puddle under the glass, never the glass itself."""
    arr = np.asarray(im).copy()
    h, w = arr.shape[:2]
    rgb = arr[:, :, :3].astype(np.float32)
    luma = 0.299 * rgb[:, :, 0] + 0.587 * rgb[:, :, 1] + 0.114 * rgb[:, :, 2]
    chroma = rgb.max(axis=2) - rgb.min(axis=2)
    band = np.zeros((h, w), dtype=bool)
    band[int(h * 0.94) :, :] = True
    puddle = band & (arr[:, :, 3] > 0) & (luma > 236) & (chroma < 16)
    arr[:, :, 3] = np.where(puddle, 0, arr[:, :, 3])
    return Image.fromarray(arr, "RGBA")


def cutout(path: Path) -> Image.Image:
    src = Image.open(path).convert("RGB")
    rgb = np.asarray(src)
    dist = dist_white(rgb)
    fg = morph_close(~flood_background(dist, EDGE_TOL, FLOOD_TOL), 3)
    fg = fill_holes(fg)
    alpha = Image.fromarray((fg.astype(np.uint8) * 255), "L").filter(ImageFilter.GaussianBlur(1.2))
    im = Image.fromarray(np.dstack([rgb, np.asarray(alpha)]), "RGBA")
    bbox = im.getbbox()
    if bbox:
        im = im.crop(bbox)
    im = wipe_studio_floor(im)
    bbox = im.getbbox()
    return im.crop(bbox) if bbox else im


def fit(im: Image.Image) -> Image.Image:
    max_w = CANVAS[0] - PAD * 2
    max_h = CANVAS[1] - PAD * 2
    scale = min(max_w / im.width, max_h / im.height)
    size = (max(1, round(im.width * scale)), max(1, round(im.height * scale)))
    sized = im.resize(size, Image.Resampling.LANCZOS)
    canvas = Image.new("RGBA", CANVAS, (0, 0, 0, 0))
    x = (CANVAS[0] - sized.width) // 2
    y = CANVAS[1] - PAD - sized.height
    canvas.paste(sized, (x, y), sized)
    return canvas


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    for name in JARS:
        cut = fit(cutout(ASSETS / name))
        dest = OUT / name.replace("jar-", "")
        cut.save(dest, "PNG", optimize=True)
        print(dest.name, cut.size, "alpha", cut.getextrema()[3])


if __name__ == "__main__":
    main()
