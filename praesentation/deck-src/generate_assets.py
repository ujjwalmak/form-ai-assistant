#!/usr/bin/env python3
"""Renders Aurora-Glass assets for the FormAssist reflexion deck.
Matches praesentation/reflexion.html: bg #0b0712, blobs violet/fuchsia/pink/indigo,
glass cards (blur + lighten + border + violet glow), film grain, gradient logo."""
import numpy as np
from PIL import Image, ImageDraw, ImageFilter, ImageEnhance

import os
OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "assets")
os.makedirs(OUT, exist_ok=True)

W, H = 1920, 1080
BG = (11, 7, 18)
VIOLET, FUCHSIA, PINK, INDIGO = (139, 92, 246), (217, 70, 239), (244, 114, 182), (99, 102, 241)

def aurora():
    img = np.zeros((H, W, 3), dtype=np.float64)
    img[:, :] = BG
    y, x = np.mgrid[0:H, 0:W].astype(np.float64)
    vmax = max(W, H) / 100.0
    blobs = [  # (cx%, cy%, r in vmax, color, alpha) — from body::before
        (12, 8, 38, VIOLET, 0.40),
        (88, 12, 34, FUCHSIA, 0.34),
        (70, 92, 40, PINK, 0.28),
        (20, 90, 30, INDIGO, 0.30),
    ]
    for cxp, cyp, rv, col, am in blobs:
        cx, cy, r = W * cxp / 100, H * cyp / 100, rv * vmax
        d = np.sqrt((x - cx) ** 2 + (y - cy) ** 2) / r
        a = np.clip(1 - d, 0, 1) ** 1.8 * am
        for c in range(3):
            img[:, :, c] = img[:, :, c] * (1 - a) + col[c] * a
    pil = Image.fromarray(np.clip(img, 0, 255).astype(np.uint8))
    pil = pil.filter(ImageFilter.GaussianBlur(8))
    pil = ImageEnhance.Color(pil).enhance(1.35)
    # film grain (body::after, opacity .04)
    rng = np.random.default_rng(42)
    n = rng.integers(0, 256, (H, W, 1))
    arr = np.array(pil).astype(np.float64)
    arr = arr * 0.955 + np.repeat(n, 3, axis=2) * 0.045
    return Image.fromarray(np.clip(arr, 0, 255).astype(np.uint8))

def rounded_mask(w, h, r, ss=4):
    m = Image.new("L", (w * ss, h * ss), 0)
    ImageDraw.Draw(m).rounded_rectangle([0, 0, w * ss - 1, h * ss - 1], radius=r * ss, fill=255)
    return m.resize((w, h), Image.LANCZOS)

def bake_card(bg, x, y, w, h, r=36, clean=None):
    """True glassmorphism baked into the bitmap."""
    clean = clean if clean is not None else bg.copy()
    # 1. violet glow shadow (box-shadow 0 40px 90px -50px rgba(139,92,246,.7))
    glow = Image.new("RGBA", bg.size, (0, 0, 0, 0))
    gd = ImageDraw.Draw(glow)
    gd.rounded_rectangle([x + 50, y + 90, x + w - 50, y + h + 30], radius=r, fill=VIOLET + (110,))
    glow = glow.filter(ImageFilter.GaussianBlur(55))
    bg.paste(Image.alpha_composite(bg.convert("RGBA"), glow).convert("RGB"), (0, 0))
    # 2. blurred, saturated backdrop clipped to card — from the PRISTINE aurora
    pad = 80
    region = clean.crop((max(0, x - pad), max(0, y - pad), min(W, x + w + pad), min(H, y + h + pad)))
    region = region.filter(ImageFilter.GaussianBlur(26))
    region = ImageEnhance.Color(region).enhance(1.5)
    ox, oy = x - max(0, x - pad), y - max(0, y - pad)
    card = region.crop((ox, oy, ox + w, oy + h))
    # white overlay rgba(255,255,255,~.04) + top sheen
    ov = Image.new("RGBA", (w, h), (255, 255, 255, 10))
    sheen = np.zeros((h, w), dtype=np.uint8)
    sh = int(h * 0.28)
    sheen[:sh, :] = np.linspace(18, 0, sh)[:, None].astype(np.uint8)
    ov2 = Image.new("RGBA", (w, h), (255, 255, 255, 0))
    ov2.putalpha(Image.fromarray(sheen))
    card = Image.alpha_composite(Image.alpha_composite(card.convert("RGBA"), ov), ov2).convert("RGB")
    bg.paste(card, (x, y), rounded_mask(w, h, r))
    # 3. 1.5px border rgba(255,255,255,.10) — supersampled ring
    ss = 4
    ring = Image.new("RGBA", (w * ss, h * ss), (0, 0, 0, 0))
    ImageDraw.Draw(ring).rounded_rectangle([ss, ss, w * ss - ss, h * ss - ss], radius=r * ss,
                                           outline=(255, 255, 255, 34), width=2 * ss)
    ring = ring.resize((w, h), Image.LANCZOS)
    base = bg.crop((x, y, x + w, y + h)).convert("RGBA")
    bg.paste(Image.alpha_composite(base, ring).convert("RGB"), (x, y))

def finish(img):
    rng = np.random.default_rng(7)
    n = rng.integers(0, 256, (H, W, 1))
    arr = np.array(img).astype(np.float64)
    arr = arr * 0.978 + np.repeat(n, 3, axis=2) * 0.022
    return Image.fromarray(np.clip(arr, 0, 255).astype(np.uint8))

base = aurora()

bg_title = base.copy(); bake_card(bg_title, 310, 115, 1300, 850); finish(bg_title).save(f"{OUT}/bg_title.png")
bg_content = base.copy(); bake_card(bg_content, 150, 70, 1620, 940); finish(bg_content).save(f"{OUT}/bg_content.png")

# ---------- Logo (from the SVG in reflexion.html) ----------
s, ss = 16, 2  # viewBox 64 -> 1024px, supersample x2
S = 64 * s * ss
margin = 10 * s * ss // 4
CV = S + 2 * margin
logo = Image.new("RGBA", (CV, CV), (0, 0, 0, 0))

def vb(v):  # viewBox coord -> canvas px
    return int(v * s * ss) + margin

# gradient tile
tile = np.zeros((S, S, 4), dtype=np.uint8)
yy, xx = np.mgrid[0:S, 0:S].astype(np.float64)
x0, y0, x1, y1 = 6 * s * ss, 4 * s * ss, 58 * s * ss, 60 * s * ss
dx, dy = x1 - x0, y1 - y0
t = np.clip(((xx - x0) * dx + (yy - y0) * dy) / (dx * dx + dy * dy), 0, 1)
c0, c1, c2 = np.array(VIOLET), np.array(FUCHSIA), np.array(PINK)
for c in range(3):
    lo = c0[c] + (c1[c] - c0[c]) * (t / 0.52)
    hi = c1[c] + (c2[c] - c1[c]) * ((t - 0.52) / 0.48)
    tile[:, :, c] = np.where(t <= 0.52, lo, hi).astype(np.uint8)
tile[:, :, 3] = 255
tile_img = Image.fromarray(tile).crop((4 * s * ss, 4 * s * ss, 60 * s * ss, 60 * s * ss))
tmask = rounded_mask(56 * s * ss, 56 * s * ss, 17 * s * ss, ss=1)

# glow shadow behind tile
sil = Image.new("RGBA", (CV, CV), (0, 0, 0, 0))
ImageDraw.Draw(sil).rounded_rectangle([vb(4), vb(4) + 18 * ss * 4, vb(60), vb(60) + 18 * ss * 4],
                                      radius=17 * s * ss, fill=FUCHSIA + (140,))
logo = Image.alpha_composite(logo, sil.filter(ImageFilter.GaussianBlur(38 * ss)))
logo.paste(tile_img, (vb(4), vb(4)), tmask)

d = ImageDraw.Draw(logo)
# sheen (white .5 -> 0, y 4..40)
sheen = np.zeros((56 * s * ss, 56 * s * ss), dtype=np.uint8)
sh = 36 * s * ss
sheen[:sh, :] = (np.linspace(0.30, 0, sh)[:, None] * 255).astype(np.uint8)
sheen_img = Image.new("RGBA", (56 * s * ss, 56 * s * ss), (255, 255, 255, 0))
sheen_img.putalpha(Image.fromarray(sheen))
sheen_masked = Image.new("RGBA", (56 * s * ss, 56 * s * ss), (0, 0, 0, 0))
sheen_masked.paste(sheen_img, (0, 0), tmask)
logo.alpha_composite(sheen_masked, (vb(4), vb(4)))
# border stroke
d.rounded_rectangle([vb(4.75), vb(4.75), vb(59.25), vb(59.25)], radius=int(16.25 * s * ss),
                    outline=(255, 255, 255, 89), width=int(1.5 * s * ss))
# bars
for bx, by, bw, bh, op in [(15, 21, 26, 5, 245), (15, 32, 34, 5, 199), (15, 43, 17, 5, 148)]:
    d.rounded_rectangle([vb(bx), vb(by), vb(bx + bw), vb(by + bh)], radius=int(2.5 * s * ss),
                        fill=(255, 255, 255, op))
# sparkle (4-point star @ 46.5,43 r4.5)
cx, cy, ro, ri = 46.5, 43, 4.6, 1.35
pts = []
import math
for i in range(4):
    a = math.radians(90 * i - 90)
    pts.append((vb(cx + ro * math.cos(a)), vb(cy + ro * math.sin(a))))
    ai = a + math.radians(45)
    pts.append((vb(cx + ri * math.cos(ai)), vb(cy + ri * math.sin(ai))))
d.polygon(pts, fill=(255, 255, 255, 255))

logo = logo.resize((CV // ss, CV // ss), Image.LANCZOS)
logo.save(f"{OUT}/logo.png")
print("assets done:", os.listdir(OUT))
