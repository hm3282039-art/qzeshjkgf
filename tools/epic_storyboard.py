#!/usr/bin/env python3
"""
STORYBOARD DE LA SÉQUENCE S3 — rendu hors ligne
================================================

Ce n'est pas la scène jouée par le navigateur (celle-là, tu la vois à l'écran) :
c'est un rendu image par image, avec les MÊMES courbes et le MÊME squelette,
pour vérifier que les morceaux tombent juste et pour pouvoir regarder à froid
les moments clés.

    python3 tools/epic_storyboard.py  →  docs/storyboard-2.2.png
"""

from __future__ import annotations

import json
import math
import os

from PIL import Image, ImageDraw, ImageFilter, ImageFont

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA = json.load(open(os.path.join(ROOT, "spine", "kael", "kael_parts.json")))
ASSETS = os.path.join(ROOT, "game", "src", "assets")
FB = "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"
FR = "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"

W, H = 889, 557          # repère du dessin
FW, FH = 640, 400        # une vignette
HIT = 1860

# ── les os : (pivot absolu, parent) ────────────────────────────────────────
BONES = {
    "hero": ((455, 320), None),
    "cape": ((330, 175), "hero"),
    "legs": ((480, 326), "hero"),
    "pagne": ((462, 296), "hero"),
    "torso": ((455, 320), "hero"),
    "head": ((440, 148), "torso"),
    "shield": ((392, 292), "torso"),
    "arm": ((500, 152), "torso"),
    "sword": ((614, 292), "arm"),
}
PARTS = {p["os"]: p for p in DATA["morceaux"]}
OWNER = {
    "cape": ["cape"], "legs": ["jambe_g", "jambe_d"], "pagne": ["pagne"],
    "torso": ["torse"], "head": ["casque"], "shield": ["bouclier"],
    "arm": ["bras_d"], "sword": ["epee"],
}

# ── les courbes (copiées de src/ui/ultimate-epic.ts) ───────────────────────
T = {
    "camZoom": [(0, 1.3), (900, 1.42), (1500, 1.0), (HIT, 1.0), (HIT + 60, 1.34), (2300, 1.08), (2900, 1), (4600, 1)],
    "camRot": [(0, -3), (900, -6), (1500, 0), (HIT, -2), (HIT + 60, -5), (2200, 1.5), (2700, 0), (4600, 0)],
    "heroX": [(0, -40), (900, -170), (1500, 0), (4600, 0)],
    "heroY": [(0, 0), (1500, 0), (1620, -18), (HIT, 0), (4600, 0)],
    "heroRot": [(0, -2), (900, -5), (1500, 0), (HIT, -3), (2050, 2), (2700, 0), (4600, 0)],
    "heroS": [(0, 1), (1500, 1), (1620, 1.03), (HIT, 1.05), (2300, 1), (4600, 1)],
    "torso": [(0, 2), (900, 3), (1500, 4), (1620, 6), (HIT, -7), (2050, -4), (2500, 1), (4600, 0)],
    "head": [(0, 5), (900, 3), (1500, -3), (HIT, 6), (2150, 2), (2700, -2), (4600, 0)],
    "arm": [(1500, -6), (1620, -26), (HIT, 20), (2050, 14), (2500, -3), (4600, 0)],
    "sword": [(1620, 6), (HIT, -14), (2100, -5), (4600, 0)],
    "cape": [(0, 0), (900, -9), (1500, -4), (1620, -12), (HIT, -14), (2400, -6), (3100, 2), (4600, 2)],
    "shield": [(1500, 0), (HIT, -7), (2300, 0), (4600, 0)],
    "legs": [(1500, -2), (HIT, 1), (2300, 0), (4600, 0)],
    "pagne": [(0, 0), (1500, 0), (HIT, -5), (2200, 0), (4600, 0)],
}


def at(track: list[tuple[int, float]], t: float) -> float:
    if t <= track[0][0]:
        return track[0][1]
    for i in range(1, len(track)):
        t1, v1 = track[i]
        t0, v0 = track[i - 1]
        if t <= t1:
            p = (t - t0) / max(1e-6, t1 - t0)
            return v0 + (v1 - v0) * (p * p * (3 - 2 * p))
    return track[-1][1]


_pieces: dict[str, Image.Image] = {}


def piece(name: str) -> Image.Image:
    if name not in _pieces:
        p = PARTS[name]
        _pieces[name] = Image.open(os.path.join(ROOT, "spine", "kael", p["fichier"])).convert("RGBA")
    return _pieces[name]


def rot(v, deg):
    a = math.radians(deg)
    c, s = math.cos(a), math.sin(a)
    return (v[0] * c - v[1] * s, v[0] * s + v[1] * c)


def hero_frame(t: float) -> Image.Image:
    """Le personnage à l'instant t, dans son repère d'origine."""
    img = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    pos: dict[str, tuple[float, float]] = {}
    ang: dict[str, float] = {}

    # les os dans l'ordre : un parent toujours avant son enfant
    order: list[str] = []

    def add(name: str) -> None:
        parent = BONES[name][1]
        if parent:
            add(parent)
        if name not in order:
            order.append(name)

    for b in BONES:
        add(b)
    for name in order:
        pivot, parent = BONES[name]
        a = at(T[name], t) if name in T else 0.0
        if parent is None:
            pos[name], ang[name] = pivot, a
        else:
            pp = BONES[parent][0]
            d = rot((pivot[0] - pp[0], pivot[1] - pp[1]), ang[parent])
            pos[name] = (pos[parent][0] + d[0], pos[parent][1] + d[1])
            ang[name] = ang[parent] + a
        th = ang[name]
        for part_name in OWNER.get(name, []):
            p = PARTS[part_name]
            d = rot((p["x"] - pivot[0], p["y"] - pivot[1]), th)
            corner = (pos[name][0] + d[0], pos[name][1] + d[1])
            src = piece(part_name)
            r = src.rotate(-th, resample=Image.BICUBIC, center=(p["px"], p["py"]))
            img.alpha_composite(r, (int(round(corner[0])), int(round(corner[1]))))
    return img


def scene(t: float) -> Image.Image:
    """Une vignette complète (décor + perso + effets)."""
    z = at(T["camZoom"], t)
    canvas = Image.new("RGBA", (W, H), (8, 9, 14, 255))

    if t < 900:  # le cut-in : l'illustration remplace le personnage
        art = Image.open(os.path.join(ASSETS, "ult_kael.webp")).convert("RGBA")
        s = max(W / art.width, H / art.height) * (1.05 + 0.1 * (t / 900))
        art = art.resize((int(art.width * s), int(art.height * s)))
        canvas.alpha_composite(art, ((W - art.width) // 2, (H - art.height) // 2))
        veille = Image.new("RGBA", (W, H), (0, 0, 0, 0))
        ImageDraw.Draw(veille).ellipse([W * 0.1, H * 0.1, W * 0.9, H * 0.9], fill=(0, 0, 0, 0))
        return canvas.convert("RGB")

    # halo de fond
    glow = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    gd = ImageDraw.Draw(glow)
    for i in range(18):
        r = 380 - i * 18
        gd.ellipse([W / 2 - r, H * 0.56 - r * 0.72, W / 2 + r, H * 0.56 + r * 0.72],
                   fill=(255, 120, 40, 9))
    canvas.alpha_composite(glow.filter(ImageFilter.GaussianBlur(18)))

    hero = hero_frame(t)
    k = (H * 0.98) / hero.height * z
    h2 = hero.resize((int(hero.width * k), int(hero.height * k)), Image.LANCZOS)
    hx = W / 2 - h2.width / 2 + at(T["heroX"], t) * k
    hy = H * 0.94 - h2.height
    canvas.alpha_composite(h2, (int(hx), int(hy)))

    d = ImageDraw.Draw(canvas, "RGBA")
    if 900 <= t < 1500:  # lignes de vitesse
        for i in range(26):
            y = int((i * 37) % H)
            d.line([(0, y), (W, y)], fill=(255, 255, 255, 26), width=1)
    if t >= HIT:  # arcs du coup + étincelles
        for j, (col, wid) in enumerate([((255, 255, 255, 235), 9), ((255, 120, 40, 200), 20)]):
            d.arc([-W * 0.1, -H * 0.35, W * 1.05, H * 1.1], -80 + j * 4, 25, fill=col, width=wid)
        for i in range(26):
            a = i / 26 * 6.283
            r0 = 90
            rr = 90 + 190 * min(1, (t - HIT) / 500)
            x, y = W / 2, H * 0.56
            d.line([(x + math.cos(a) * r0, y + math.sin(a) * r0 * 0.8),
                    (x + math.cos(a) * rr, y + math.sin(a) * rr * 0.8)],
                   fill=(255, 210, 140, max(0, 220 - int((t - HIT) / 2))), width=3)
    if t < HIT + 60:  # flash
        fl = Image.new("RGBA", (W, H), (255, 255, 255, 0))
        ImageDraw.Draw(fl).rectangle([0, 0, W, H], fill=(255, 255, 255, 90 if t >= HIT else 20))
        canvas.alpha_composite(fl)

    # vignettage
    vig = Image.new("L", (W, H), 0)
    ImageDraw.Draw(vig).ellipse([-W * 0.25, -H * 0.3, W * 1.25, H * 1.3], fill=255)
    vig = vig.filter(ImageFilter.GaussianBlur(60))
    dark = Image.new("RGBA", (W, H), (0, 0, 0, 210))
    canvas = Image.composite(canvas, Image.alpha_composite(canvas, dark), vig)
    return canvas.convert("RGB")


def main() -> None:
    moments = [(420, "cut-in 0,4 s"), (1150, "élan 1,15 s"), (1660, "armé 1,66 s"),
               (1900, "impact 1,9 s"), (2400, "onde 2,4 s"), (3500, "sortie 3,5 s")]
    cols, rows = 3, 2
    pad, label = 10, 30
    sheet = Image.new("RGB", (cols * (FW + pad) + pad, rows * (FH + label + pad) + pad + 54), (14, 16, 22))
    dd = ImageDraw.Draw(sheet)
    f1 = ImageFont.truetype(FB, 26)
    f2 = ImageFont.truetype(FR, 15)
    dd.text((pad + 6, 10), "Kael · séquence S3 — les 6 moments clés", font=f1, fill=(240, 244, 250))
    dd.text((pad + 6, 40), "rendu hors ligne avec les mêmes courbes que la scène réelle", font=f2, fill=(140, 154, 174))

    for i, (t, lab) in enumerate(moments):
        im = scene(float(t)).resize((FW, FH), Image.LANCZOS)
        x = pad + (i % cols) * (FW + pad)
        y = 54 + pad + (i // cols) * (FH + label + pad)
        sheet.paste(im, (x, y))
        dd.text((x + 4, y + FH + 4), f"{lab}  ·  {t} ms", font=f2, fill=(200, 210, 226))

    os.makedirs(os.path.join(ROOT, "docs"), exist_ok=True)
    out = os.path.join(ROOT, "docs", "storyboard-2.2.png")
    sheet.save(out)
    print(out, sheet.size)


if __name__ == "__main__":
    main()
