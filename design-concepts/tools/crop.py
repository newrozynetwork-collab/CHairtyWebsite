"""Crop/resize jobs for the deck. Reads a JSON list of jobs on stdin:
[{"src": "...jpg", "out": "...jpg", "box": [x0, y0, x1, y1] (device px) or null, "width": optional resize width, "quality": 85}]"""
import json, sys
from PIL import Image
Image.MAX_IMAGE_PIXELS = None
jobs = json.load(sys.stdin)
cache = {}
for j in jobs:
    src = j["src"]
    if src not in cache:
        cache.clear()
        cache[src] = Image.open(src).convert("RGB")
    im = cache[src]
    if j.get("box"):
        x0, y0, x1, y1 = [int(round(v)) for v in j["box"]]
        x1 = min(x1, im.width); y1 = min(y1, im.height)
        im2 = im.crop((x0, y0, x1, y1))
    else:
        im2 = im
    if j.get("width") and im2.width != j["width"]:
        h = round(im2.height * j["width"] / im2.width)
        im2 = im2.resize((j["width"], h), Image.LANCZOS)
    if j["out"].endswith(".png"):
        im2.save(j["out"], optimize=True)
    else:
        im2.save(j["out"], quality=j.get("quality", 85), optimize=True, progressive=True, subsampling=0 if j.get("hq") else 2)
print(f"cropped {len(jobs)} images")
