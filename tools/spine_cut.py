#!/usr/bin/env python3
"""
DÉCOUPE « À LA MAIN » POUR SPINE — Kael
=======================================

La découpe automatique (tools/spine_export.py) coupe en tranches horizontales :
elle ne sait pas distinguer une épée d'un bras. Ici, les morceaux sont tracés
à la main, polygone par polygone, sur le dessin :

    cape      (derrière)   bouclier / bras gauche
    casque    torse        bras droit      épée
    pagne     jambe G      jambe D

Chaque morceau sort en PNG transparent, à la résolution d'origine, avec son
pivot (le point où l'os doit être posé).

    python3 tools/spine_cut.py            → écrit spine/kael_main/
    python3 tools/spine_cut.py --check    → écrit seulement le contrôle couleur
"""

from __future__ import annotations

import json
import os
import sys

import numpy as np
from PIL import Image, ImageDraw, ImageFilter, ImageFont

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(ROOT, "game", "src", "assets", "hero_kael.webp")
OUT = os.path.join(ROOT, "spine", "kael")
FONT = "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"

# ── les morceaux, du fond vers l'avant ───────────────────────────────────────
# (x, y) dans le repère du personnage complet.
PIECES = [
    {
        "os": "cape", "pivot": (330, 175), "feather": 6,
        "poly": [(0, 130), (345, 130), (345, 300), (300, 395), (240, 458),
                 (150, 472), (60, 440), (0, 400)],
        "under": ["bouclier", "torse", "bras_d", "casque", "jambe_g", "pagne"],
    },
    {
        "os": "bouclier", "pivot": (392, 292), "feather": 4,
        "poly": [(392, 148), (438, 192), (432, 292), (400, 362), (352, 421),
                 (308, 380), (266, 300), (264, 208), (330, 160)],
    },
    {
        "os": "casque", "pivot": (440, 148), "feather": 5,
        "poly": [(394, 4), (486, 4), (492, 118), (470, 152), (404, 152), (392, 118)],
        "under": ["torse"],
    },
    {
        "os": "torse", "pivot": (455, 320), "feather": 5,
        "poly": [(400, 110), (578, 110), (588, 332), (436, 332), (416, 186)],
        "under": ["bouclier", "bras_d"],
    },
    {
        "os": "bras_d", "pivot": (500, 152), "feather": 5,
        "poly": [(492, 140), (582, 148), (604, 232), (628, 292), (598, 322),
                 (556, 300), (536, 232)],
    },
    {
        "os": "epee", "pivot": (614, 292), "feather": 4,
        "poly": [(592, 258), (652, 276), (886, 402), (886, 476), (700, 424),
                 (636, 344), (598, 318)],
    },
    {
        "os": "pagne", "pivot": (462, 296), "feather": 4,
        "poly": [(424, 288), (502, 288), (508, 428), (472, 448), (428, 400)],
        "under": [],
    },
    {
        "os": "jambe_g", "pivot": (432, 326), "feather": 5,
        "poly": [(376, 314), (486, 314), (486, 556), (376, 556)],
        "under": ["pagne", "torse"],
    },
    {
        "os": "jambe_d", "pivot": (528, 326), "feather": 5,
        "poly": [(486, 314), (584, 314), (584, 556), (486, 556)],
        "holes": [[(556, 310), (612, 310), (612, 372), (556, 372)]],
        "under": ["pagne", "torse", "bras_d", "epee"],
    },
]

TINT = [(70, 130, 255), (255, 90, 160), (255, 210, 60), (90, 230, 140),
        (255, 130, 40), (190, 120, 255), (60, 220, 240), (240, 240, 240), (150, 255, 90)]


def load() -> Image.Image:
    im = Image.open(SRC).convert("RGBA")
    bb = im.getbbox()
    return im.crop(bb) if bb else im


def raw_mask(im: Image.Image, poly, grow: int = 0) -> Image.Image:
    m = Image.new("L", im.size, 0)
    d = ImageDraw.Draw(m)
    d.polygon(poly, fill=255)
    if grow:
        # on épaissit de quelques pixels : les morceaux se chevauchent très
        # légèrement, sinon une couture blanche apparaît quand ça tourne
        m = m.filter(ImageFilter.MaxFilter(grow * 2 + 1))
    return m


def mask_for(im: Image.Image, poly, feather: float, under=()) -> np.ndarray:
    m = raw_mask(im, poly, grow=2)
    for u in under:  # les morceaux qui passent DEVANT sont retirés
        inv = Image.eval(raw_mask(im, u, grow=2), lambda v: 255 - v)
        m = Image.fromarray((np.minimum(np.asarray(m), np.asarray(inv))).astype(np.uint8))
    if feather:
        m = m.filter(ImageFilter.GaussianBlur(feather))
    return np.asarray(m, dtype=np.float32) / 255.0


def build(check_only: bool = False) -> dict:
    im = load()
    arr = np.asarray(im).astype(np.float32)
    a = arr[..., 3] / 255.0

    if not check_only:
        os.makedirs(OUT, exist_ok=True)
        im.save(os.path.join(OUT, "kael_complet.png"))

    # le contrôle : chaque morceau teinté d'une couleur, sur fond sombre
    cover = Image.new("RGBA", im.size, (26, 32, 42, 255))
    info = {"heros": "kael", "personnage": {"w": im.width, "h": im.height}, "morceaux": []}

    for i, p in enumerate(PIECES):
        under = [q["poly"] for q in PIECES if q["os"] in p.get("under", [])]
        under += p.get("holes", [])
        mask = mask_for(im, p["poly"], p["feather"], under) * a
        piece = arr.copy()
        piece[..., 3] = arr[..., 3] * mask
        img = Image.fromarray(np.clip(piece, 0, 255).astype(np.uint8), "RGBA")
        bb = img.getbbox()
        if not bb:
            continue
        crop = img.crop(bb)

        if check_only:
            tint = np.zeros_like(arr)
            tint[..., 0], tint[..., 1], tint[..., 2] = TINT[i % len(TINT)]
            tint[..., 3] = 90 * mask
            t = Image.fromarray(np.clip(tint, 0, 255).astype(np.uint8), "RGBA")
            cover.alpha_composite(t)
            cover.alpha_composite(img)
            continue

        os.makedirs(OUT, exist_ok=True)
        fn = f"{i + 1}_{p['os']}.png"
        crop.save(os.path.join(OUT, fn))
        px, py = p["pivot"]
        info["morceaux"].append({
            "os": p["os"], "fichier": fn,
            "w": crop.width, "h": crop.height,
            "x": bb[0], "y": bb[1],
            "px": round(px - bb[0], 1), "py": round(py - bb[1], 1),
            "pivot_perso": [px, py],
        })

    if check_only:
        d = ImageDraw.Draw(cover)
        f = ImageFont.truetype(FONT, 13)
        for i, p in enumerate(PIECES):
            x, y = p["pivot"]
            d.ellipse([x - 4, y - 4, x + 4, y + 4], fill=(20, 20, 20), outline=(255, 255, 255))
            d.text((x + 7, y - 7), p["os"], font=f, fill=(255, 255, 255))
        os.makedirs(OUT, exist_ok=True)
        cover.convert("RGB").save(os.path.join(OUT, "_controle.png"))
        return info

    # planche de contrôle : le personnage + les morceaux posés côte à côte
    with open(os.path.join(OUT, "kael_parts.json"), "w") as f:
        json.dump(info, f, indent=1, ensure_ascii=False)
    return info


if __name__ == "__main__":
    check = "--check" in sys.argv
    data = build(check)
    if check:
        print("contrôle →", os.path.join(OUT, "_controle.png"))
    else:
        print(f"{len(data['morceaux'])} morceaux → {OUT}")
        for m in data["morceaux"]:
            print(f"  {m['os']:9s} {m['w']:>4}×{m['h']:<4} pivot local {m['px']:.0f},{m['py']:.0f}  "
                  f"({m['x']},{m['y']})")
