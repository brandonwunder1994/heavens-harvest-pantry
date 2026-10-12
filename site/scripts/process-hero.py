"""Cut hero plates, jars, lid and flakes, then bake the still posters."""

from collections import deque
from io import BytesIO
from pathlib import Path

import numpy as np
from PIL import Image, ImageFilter

ASSETS = Path(r"C:\Users\brand\.cursor\projects\c-Users-brand-Desktop-Heaven-s-Harvest-Pantry\assets")
OUT = Path(r"C:\Users\brand\Desktop\Heaven's Harvest Pantry\site\public\hero")
STILL = Path(r"C:\Users\brand\Desktop\Heaven's Harvest Pantry\site\public\still")
LQIP = Path(r"C:\Users\brand\Desktop\Heaven's Harvest Pantry\site\components\hero\lqip.css")

JAR_CANVAS = (720, 1000)
PAD = 20
EDGE_TOL = 36
FLOOD_TOL = 44


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


def fade_foot(im: Image.Image) -> Image.Image:
    """The studio glass-bottom bounce reads as a white sticker on wood."""
    arr = np.asarray(im).copy()
    h, w = arr.shape[:2]
    rgb = arr[:, :, :3].astype(np.float32)
    luma = 0.299 * rgb[:, :, 0] + 0.587 * rgb[:, :, 1] + 0.114 * rgb[:, :, 2]
    chroma = rgb.max(axis=2) - rgb.min(axis=2)
    yy = np.arange(h)[:, None]
    pale = (yy >= int(h * 0.905)) & (arr[:, :, 3] > 8) & (luma > 132) & (chroma < 62)
    arr[:, :, 3] = np.where(pale, 0, arr[:, :, 3])
    y0 = int(h * 0.93)
    for y in range(y0, h):
        t = (y - y0) / max(1, h - 1 - y0)
        arr[y, :, 3] = (arr[y, :, 3].astype(np.float32) * (1 - t) ** 1.6).astype(np.uint8)
    return Image.fromarray(arr, "RGBA")


def wipe_floor(im: Image.Image) -> Image.Image:
    arr = np.asarray(im).copy()
    h, w = arr.shape[:2]
    rgb = arr[:, :, :3].astype(np.float32)
    luma = 0.299 * rgb[:, :, 0] + 0.587 * rgb[:, :, 1] + 0.114 * rgb[:, :, 2]
    chroma = rgb.max(axis=2) - rgb.min(axis=2)
    band = np.zeros((h, w), dtype=bool)
    band[int(h * 0.84) :, :] = True
    puddle = band & (arr[:, :, 3] > 0) & (luma > 198) & (chroma < 40)
    arr[:, :, 3] = np.where(puddle, 0, arr[:, :, 3])
    return Image.fromarray(arr, "RGBA")


def cutout(path: Path, holes: bool) -> Image.Image:
    src = Image.open(path).convert("RGB")
    rgb = np.asarray(src)
    dist = dist_white(rgb)
    fg = morph_close(~flood_background(dist, EDGE_TOL, FLOOD_TOL), 2)
    if holes:
        fg = fill_holes(fg)
    alpha = Image.fromarray((fg.astype(np.uint8) * 255), "L").filter(ImageFilter.GaussianBlur(0.8))
    im = Image.fromarray(np.dstack([rgb, np.asarray(alpha)]), "RGBA")
    bbox = im.getbbox()
    if bbox:
        im = im.crop(bbox)
    im = wipe_floor(im)
    bbox = im.getbbox()
    return im.crop(bbox) if bbox else im


def punch_interior(im: Image.Image) -> Image.Image:
    arr = np.asarray(im).copy()
    h, w = arr.shape[:2]
    rgb = arr[:, :, :3].astype(np.float32)
    luma = 0.299 * rgb[:, :, 0] + 0.587 * rgb[:, :, 1] + 0.114 * rgb[:, :, 2]
    chroma = rgb.max(axis=2) - rgb.min(axis=2)
    clear = (arr[:, :, 3] > 12) & (luma > 228) & (chroma < 22)
    cy, cx = int(h * 0.52), w // 2
    if not clear[cy, cx]:
        found = np.argwhere(clear)
        if not len(found):
            return im
        cy, cx = found[len(found) // 2]
    seen = np.zeros((h, w), dtype=bool)
    q: deque[tuple[int, int]] = deque([(cy, cx)])
    seen[cy, cx] = True
    hole = np.zeros((h, w), dtype=bool)
    while q:
        y, x = q.popleft()
        hole[y, x] = True
        for ny, nx in ((y - 1, x), (y + 1, x), (y, x - 1), (y, x + 1)):
            if ny < 0 or ny >= h or nx < 0 or nx >= w or seen[ny, nx]:
                continue
            seen[ny, nx] = True
            if clear[ny, nx]:
                q.append((ny, nx))
    # Keep a glass rim: erode the hole slightly so highlights on the wall stay.
    eroded = Image.fromarray((hole.astype(np.uint8) * 255), "L").filter(ImageFilter.MinFilter(5))
    hole = np.asarray(eroded) > 127
    fade = Image.fromarray((hole.astype(np.uint8) * 255), "L").filter(ImageFilter.GaussianBlur(1.4))
    knock = np.asarray(fade).astype(np.float32) / 255.0
    arr[:, :, 3] = (arr[:, :, 3].astype(np.float32) * (1.0 - knock)).astype(np.uint8)
    return Image.fromarray(arr, "RGBA")


def fit(im: Image.Image, canvas=JAR_CANVAS, pad=PAD) -> Image.Image:
    max_w = canvas[0] - pad * 2
    max_h = canvas[1] - pad * 2
    scale = min(max_w / im.width, max_h / im.height)
    size = (max(1, round(im.width * scale)), max(1, round(im.height * scale)))
    sized = im.resize(size, Image.Resampling.LANCZOS)
    out = Image.new("RGBA", canvas, (0, 0, 0, 0))
    x = (canvas[0] - sized.width) // 2
    y = canvas[1] - pad - sized.height
    out.paste(sized, (x, y), sized)
    return out


def split_flakes(path: Path) -> list[Image.Image]:
    src = Image.open(path).convert("RGB")
    rgb = np.asarray(src)
    dist = dist_white(rgb)
    fg = morph_close(~flood_background(dist, 28, 40), 1)
    h, w = fg.shape
    seen = np.zeros((h, w), dtype=bool)
    pieces: list[Image.Image] = []
    for y in range(h):
        for x in range(w):
            if not fg[y, x] or seen[y, x]:
                continue
            q: deque[tuple[int, int]] = deque([(y, x)])
            seen[y, x] = True
            cells: list[tuple[int, int]] = []
            minx = maxx = x
            miny = maxy = y
            while q:
                cy, cx = q.popleft()
                cells.append((cy, cx))
                if cx < minx:
                    minx = cx
                if cx > maxx:
                    maxx = cx
                if cy < miny:
                    miny = cy
                if cy > maxy:
                    maxy = cy
                for ny, nx in ((cy - 1, cx), (cy + 1, cx), (cy, cx - 1), (cy, cx + 1)):
                    if ny < 0 or ny >= h or nx < 0 or nx >= w or seen[ny, nx]:
                        continue
                    seen[ny, nx] = True
                    if fg[ny, nx]:
                        q.append((ny, nx))
            if len(cells) < 900:
                continue
            pw, ph = maxx - minx + 1, maxy - miny + 1
            cut = np.zeros((ph, pw, 4), dtype=np.uint8)
            for cy, cx in cells:
                cut[cy - miny, cx - minx, :3] = rgb[cy, cx]
                cut[cy - miny, cx - minx, 3] = 255
            im = Image.fromarray(cut, "RGBA")
            alpha = im.getchannel("A").filter(ImageFilter.GaussianBlur(0.6))
            im.putalpha(alpha)
            bbox = im.getbbox()
            if bbox:
                im = im.crop(bbox)
            pieces.append(im)
    pieces.sort(key=lambda p: -(p.width * p.height))
    return pieces


def save_webp(im: Image.Image, dest: Path, quality=86) -> None:
    dest.parent.mkdir(parents=True, exist_ok=True)
    im.save(dest, "WEBP", quality=quality, method=6)


def tiny_data_uri_b64(im: Image.Image, size: tuple[int, int]) -> str:
    import base64

    small = im.resize(size, Image.Resampling.BOX)
    buf = BytesIO()
    small.save(buf, "WEBP", quality=40, method=6)
    return "data:image/webp;base64," + base64.b64encode(buf.getvalue()).decode("ascii")


def place_jar(plate: Image.Image, jar: Image.Image, *, cx: float, bottom: float, jar_h: float) -> Image.Image:
    out = plate.convert("RGBA")
    scale = (plate.height * jar_h) / jar.height
    jw, jh = max(1, round(jar.width * scale)), max(1, round(jar.height * scale))
    jar_s = jar.resize((jw, jh), Image.Resampling.LANCZOS)
    x = int(plate.width * cx - jw / 2)
    y = int(plate.height * bottom - jh)
    shadow = Image.new("RGBA", out.size, (0, 0, 0, 0))
    sh = Image.new("RGBA", (int(jw * 0.86), int(jh * 0.08)), (40, 24, 10, 70))
    sh = sh.filter(ImageFilter.GaussianBlur(18))
    shadow.paste(sh, (x + int(jw * 0.07), y + jh - int(jh * 0.04)), sh)
    out = Image.alpha_composite(out, shadow)
    out.paste(jar_s, (x, y), jar_s)
    return out


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    flakes_dir = OUT / "flakes"
    flakes_dir.mkdir(parents=True, exist_ok=True)
    STILL.mkdir(parents=True, exist_ok=True)

    empty = punch_interior(cutout(ASSETS / "hero-jar-empty.png", holes=False))
    filled = cutout(ASSETS / "hero-jar-filled.png", holes=True)
    lid = cutout(ASSETS / "hero-lid.png", holes=True)

    # Same canvas, same scale — fill-reveal only works if these sit on top of each other.
    target_h = JAR_CANVAS[1] - PAD * 2
    empty_scale = target_h / empty.height
    empty_size = (max(1, round(empty.width * empty_scale)), target_h)
    empty = empty.resize(empty_size, Image.Resampling.LANCZOS)
    filled = filled.resize(empty_size, Image.Resampling.LANCZOS)
    empty = fade_foot(wipe_floor(fit(empty)))
    filled = fade_foot(wipe_floor(fit(filled)))

    empty.save(OUT / "jar-empty.png", "PNG", optimize=True)
    filled.save(OUT / "jar-filled.png", "PNG", optimize=True)

    lid_w = 420
    lid_h = max(1, round(lid.height * (lid_w / lid.width)))
    lid = lid.resize((lid_w, lid_h), Image.Resampling.LANCZOS)
    lid.save(OUT / "lid.png", "PNG", optimize=True)

    pieces: list[Image.Image] = []
    for name in ("hero-flakes-a.png", "hero-flakes-b.png"):
        pieces.extend(split_flakes(ASSETS / name))
    for i, piece in enumerate(pieces[:12]):
        side = 280
        scale = min(side / piece.width, side / piece.height, 1.0)
        sized = piece.resize(
            (max(1, round(piece.width * scale)), max(1, round(piece.height * scale))),
            Image.Resampling.LANCZOS,
        )
        dest = flakes_dir / f"{i:02d}.png"
        sized.save(dest, "PNG", optimize=True)
        print("flake", dest.name, sized.size)

    plate_wide = Image.open(ASSETS / "hero-plate-wide.png").convert("RGB")
    plate_tall = Image.open(ASSETS / "hero-plate-tall.png").convert("RGB")
    save_webp(plate_wide, OUT / "plate-wide.webp", 84)
    save_webp(plate_tall, OUT / "plate-tall.webp", 84)

    still_wide = place_jar(plate_wide, filled, cx=0.74, bottom=0.905, jar_h=0.60)
    still_tall = place_jar(plate_tall, filled, cx=0.50, bottom=0.72, jar_h=0.40)
    save_webp(still_wide.convert("RGB"), STILL / "counter-wide.webp", 86)
    save_webp(still_tall.convert("RGB"), STILL / "counter-tall.webp", 86)
    save_webp(still_wide.convert("RGB"), OUT / "still-wide.webp", 86)
    save_webp(still_tall.convert("RGB"), OUT / "still-tall.webp", 86)

    LQIP.write_text(
        "/* Written by process-hero.py. Twenty pixels of the settled scene. */\n"
        ":root {\n"
        f'  --still-blur-wide: url("{tiny_data_uri_b64(still_wide.convert("RGB"), (20, 12))}");\n'
        f'  --still-blur-tall: url("{tiny_data_uri_b64(still_tall.convert("RGB"), (12, 20))}");\n'
        "}\n",
        encoding="utf-8",
    )
    print("empty", empty.size, "filled", filled.size, "lid", lid.size, "flakes", min(12, len(pieces)))


if __name__ == "__main__":
    main()
