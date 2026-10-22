#!/usr/bin/env python3
"""
EXPORT POUR SPINE 2D
====================

Sort, pour un héros, tout ce qu'il faut pour l'ouvrir dans Spine :

    spine/<id>/<id>_complet.png     le personnage entier, fond transparent
    spine/<id>/1_tete.png … 5_jambes.png       les morceaux, pleine résolution
    spine/<id>/<id>_parts.json      tailles, positions, pivots (là où va l'os)
    spine/<id>/planche.png          une planche de contrôle (ce qu'on regarde)

La découpe reprend exactement les masques du moteur (tools/rig_parts.py),
mais SANS réduire à 460 px : on garde la résolution d'origine du dessin.

Usage : python3 tools/spine_export.py kael
"""

from __future__ import annotations

import json
import os
import sys

import numpy as np
from PIL import Image, ImageDraw, ImageFont

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from rig_parts import ASSETS, alpha_of, cut, feathered, landmarks  # noqa: E402

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, "spine", "_auto")

ORDER = ["tete", "torse", "bras_g", "bras_d", "jambes"]
LABEL = {
    "tete": "TÊTE",
    "torse": "TORSE",
    "bras_g": "BRAS (côté écran gauche)",
    "bras_d": "BRAS (côté écran droit)",
    "jambes": "JAMBES",
}
FONT = "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"
FONT_R = "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"


def masks_of(a: np.ndarray):
    """Les 5 masques, calculés sur la taille réelle du dessin."""
    lm = landmarks(a)
    h, w = a.shape
    Y = np.arange(h)[:, None].astype(np.float32)
    X = np.arange(w)[None, :].astype(np.float32)
    neck, hip, cx = lm["neck"], lm["hip"], lm["cx"]
    span = max(1, hip - neck)
    feather = max(6, int(span * 0.10))

    head = (Y < neck + feather * 0.5).astype(np.float32)
    torso = ((Y >= neck - feather) & (Y < hip + feather)).astype(np.float32)
    legs = (Y >= hip - feather * 0.8).astype(np.float32)
    side_l = ((X < cx - w * 0.02) & (Y >= neck) & (Y < hip + feather * 0.4)).astype(np.float32)
    side_r = ((X >= cx + w * 0.02) & (Y >= neck) & (Y < hip + feather * 0.4)).astype(np.float32)

    m = {
        "tete": feathered(head, feather),
        "torse": feathered(torso, feather),
        "bras_g": feathered(side_l, feather),
        "bras_d": feathered(side_r, feather),
        "jambes": feathered(legs, feather),
    }
    return m, lm, feather


def pivot_of(name: str, w: int, h: int) -> tuple[float, float]:
    """Le point autour duquel le morceau tourne — l'endroit où poser l'os."""
    if name == "tete":
        return w * 0.5, h
    if name == "torse":
        return w * 0.5, h * 0.88
    if name == "jambes":
        return w * 0.5, h * 0.16
    if name == "bras_g":
        return w * 0.78, h * 0.18
    if name == "bras_d":
        return w * 0.22, h * 0.18
    return w / 2, h / 2


def export(hero_id: str) -> dict:
    src = os.path.join(ASSETS, f"hero_{hero_id}.webp")
    im = Image.open(src).convert("RGBA")
    bb = im.getbbox()
    if bb:
        im = im.crop(bb)  # pleine résolution, sans mise à l'échelle
    folder = os.path.join(OUT, hero_id)
    os.makedirs(folder, exist_ok=True)

    im.save(os.path.join(folder, f"{hero_id}_complet.png"))

    a = alpha_of(im)
    mods, lm, feather = masks_of(a)
    arr = np.asarray(im).astype(np.float32)

    parts = []
    for i, name in enumerate(ORDER, 1):
        m = mods[name]
        piece = cut(im, m)
        if name == "bras_g" and piece.width < im.width * 0.05:
            continue
        fn = f"{i}_{name}.png"
        piece.save(os.path.join(folder, fn))

        # position du morceau dans le repère du personnage
        out = arr.copy()
        out[..., 3] = arr[..., 3] * m
        full = Image.fromarray(np.clip(out, 0, 255).astype(np.uint8), "RGBA")
        bx, by, _, _ = full.getbbox() or (0, 0, 1, 1)

        px, py = pivot_of(name, piece.width, piece.height)
        parts.append({
            "os": name,
            "fichier": fn,
            "w": piece.width, "h": piece.height,
            "x": int(bx), "y": int(by),            # coin haut-gauche dans le perso
            "px": round(px, 1), "py": round(py, 1),  # pivot dans l'image du morceau
            "pivot_perso": [round(bx + px, 1), round(by + py, 1)],
        })

    data = {
        "heros": hero_id,
        "source": f"hero_{hero_id}.webp · découpe {im.width}×{im.height} (résolution d'origine)",
        "personnage": {"w": im.width, "h": im.height},
        "reperes": {
            "cou": [round(lm["cx"], 1), lm["neck"]],
            "hanches": [round(lm["cx"], 1), lm["hip"]],
            "epaule_g": [round(lm["cx"] - im.width * 0.18, 1), round(lm["neck"] + (lm["hip"] - lm["neck"]) * 0.12, 1)],
            "epaule_d": [round(lm["cx"] + im.width * 0.18, 1), round(lm["neck"] + (lm["hip"] - lm["neck"]) * 0.12, 1)],
        },
        "os_suggeres": [
            {"nom": "racine", "parent": None, "pos": [round(im.width / 2, 1), im.height]},
            {"nom": "bassin", "parent": "racine", "pos": [round(lm["cx"], 1), lm["hip"]]},
            {"nom": "colonne", "parent": "bassin", "pos": [round(lm["cx"], 1), lm["neck"]]},
            {"nom": "tete", "parent": "colonne", "pos": [round(lm["cx"], 1), lm["neck"]]},
            {"nom": "bras_g", "parent": "colonne", "pos": [round(lm["cx"] - im.width * 0.18, 1), round(lm["neck"] + (lm["hip"] - lm["neck"]) * 0.12, 1)]},
            {"nom": "bras_d", "parent": "colonne", "pos": [round(lm["cx"] + im.width * 0.18, 1), round(lm["neck"] + (lm["hip"] - lm["neck"]) * 0.12, 1)]},
            {"nom": "jambes", "parent": "bassin", "pos": [round(lm["cx"], 1), lm["hip"]]},
        ],
        "morceaux": parts,
    }
    with open(os.path.join(folder, f"{hero_id}_parts.json"), "w") as f:
        json.dump(data, f, indent=1, ensure_ascii=False)
    return data


def checker(w: int, h: int, cell: int = 22) -> Image.Image:
    """Damier : montre clairement que le fond est transparent."""
    img = Image.new("RGB", (w, h), (24, 30, 40))
    d = ImageDraw.Draw(img)
    for y in range(0, h, cell):
        for x in range(0, w, cell):
            if (x // cell + y // cell) % 2 == 0:
                d.rectangle([x, y, x + cell - 1, y + cell - 1], fill=(31, 39, 52))
    return img


def planche(hero_id: str, data: dict) -> None:
    folder = os.path.join(OUT, hero_id)
    full = Image.open(os.path.join(folder, f"{hero_id}_complet.png")).convert("RGBA")
    W, H = 1720, 1080
    sheet = checker(W, H)
    d = ImageDraw.Draw(sheet)
    f_title = ImageFont.truetype(FONT, 34)
    f_sub = ImageFont.truetype(FONT_R, 19)
    f_lab = ImageFont.truetype(FONT, 17)
    f_tiny = ImageFont.truetype(FONT_R, 14)

    d.text((44, 30), f"{hero_id.upper()} — prêt pour Spine 2D", font=f_title, fill=(240, 244, 250))
    d.text((44, 76), f"{full.width} × {full.height} px · fond transparent · 5 morceaux + pivots",
           font=f_sub, fill=(150, 165, 185))

    # ── le personnage entier, à l'échelle 1 ────────────────────────────────
    ox, oy = 44, 130
    sheet.paste(full, (ox, oy), full)
    d.rectangle([ox - 1, oy - 1, ox + full.width, oy + full.height], outline=(70, 90, 115))

    rep = data["reperes"]
    neck = rep["cou"]
    hip = rep["hanches"]
    sg, sd = rep["epaule_g"], rep["epaule_d"]
    d.line([tuple(neck), tuple(hip)], fill=(255, 64, 160), width=3)
    d.line([tuple(sg), tuple(sd)], fill=(255, 64, 160), width=3)
    for p, lab in ((neck, "cou"), (hip, "hanches"), (sg, "épaule G"), (sd, "épaule D")):
        x, y = ox + p[0], oy + p[1]
        d.ellipse([x - 7, y - 7, x + 7, y + 7], fill=(255, 64, 160), outline=(20, 20, 20), width=2)
        d.text((x + 11, y - 9), lab, font=f_tiny, fill=(255, 170, 210))

    # ── les morceaux, en bas ───────────────────────────────────────────────
    y0 = oy + full.height + 40
    d.text((44, y0 - 30), "LES 5 MORCEAUX (le rond rose = l'os)", font=f_lab, fill=(200, 212, 228))

    cw = (W - 88) // 5
    for i, p in enumerate(data["morceaux"]):
        piece = Image.open(os.path.join(folder, p["fichier"])).convert("RGBA")
        box_w, box_h = cw - 24, H - y0 - 70
        s = min(box_w / piece.width, box_h / piece.height, 1.0)
        th = piece.resize((max(1, int(piece.width * s)), max(1, int(piece.height * s))), Image.LANCZOS)
        x = 44 + i * cw + (cw - th.width) // 2
        y = y0 + (box_h - th.height) // 2
        sheet.paste(th, (x, y), th)
        cx, cy = x + p["px"] * s, y + p["py"] * s
        d.ellipse([cx - 6, cy - 6, cx + 6, cy + 6], fill=(255, 64, 160), outline=(20, 20, 20), width=2)
        d.text((44 + i * cw + 6, y0 - 2), p["os"].upper(), font=f_tiny, fill=(150, 220, 255))
        d.text((44 + i * cw + 6, H - 46), f"{p['w']}×{p['h']} px", font=f_tiny, fill=(130, 145, 165))

    sheet.save(os.path.join(folder, "planche.png"))


if __name__ == "__main__":
    hero = sys.argv[1] if len(sys.argv) > 1 else "kael"
    data = export(hero)
    planche(hero, data)
    print(f"{hero} · {len(data['morceaux'])} morceaux · {data['personnage']['w']}×{data['personnage']['h']}")
    for p in data["morceaux"]:
        print(f"  {p['os']:8s} {p['w']}×{p['h']}  pivot perso {p['pivot_perso']}")
