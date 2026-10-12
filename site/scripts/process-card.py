"""Size the Grok Imagine punch-card stock for the shop."""

from pathlib import Path
from PIL import Image

ASSETS = Path(r"C:\Users\brand\.cursor\projects\c-Users-brand-Desktop-Heaven-s-Harvest-Pantry\assets")
OUT = Path(__file__).resolve().parent.parent / "public" / "rewards"

OUT.mkdir(parents=True, exist_ok=True)

src = Image.open(ASSETS / "pantry-rewards-stock.png")
print("source", src.size, src.mode, (ASSETS / "pantry-rewards-stock.png").stat().st_size)

card = src.convert("RGB")
card.thumbnail((1600, 900), Image.Resampling.LANCZOS)
dest = OUT / "card-stock.jpg"
card.save(dest, "JPEG", quality=90, optimize=True, progressive=True)
print("card", card.size, dest.stat().st_size)

# Keep the crushed paper lip; throw the cream away so the hole can sit on the card.
hole = Image.open(ASSETS / "pantry-punch-hole.png").convert("RGBA")
arr = __import__("numpy").asarray(hole).copy()
r, g, b, a = arr[:, :, 0].astype("float32"), arr[:, :, 1].astype("float32"), arr[:, :, 2].astype("float32"), arr[:, :, 3]
luma = 0.299 * r + 0.587 * g + 0.114 * b
chroma = arr[:, :, :3].max(axis=2).astype("float32") - arr[:, :, :3].min(axis=2).astype("float32")
paper = (luma > 200) & (chroma < 42)
void = luma < 90
a = a.astype("float32")
a[paper] = 0
a[void] = 0
arr[:, :, 3] = a.astype("uint8")
lip = Image.fromarray(arr, "RGBA")
bbox = lip.getbbox()
if bbox:
    lip = lip.crop(bbox)
lip.thumbnail((220, 220), Image.Resampling.LANCZOS)
lip_path = OUT / "punch-lip.png"
lip.save(lip_path)
print("lip", lip.size, lip_path.stat().st_size)
