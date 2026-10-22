#!/usr/bin/env python3
"""Planche de contrôle de la découpe : le personnage, ses os, ses 9 morceaux."""

from __future__ import annotations

import json
import os

from PIL import Image, ImageDraw, ImageFont

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
D = os.path.join(ROOT, "spine", "kael")
FB = "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"
FR = "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"

ORDER = ["cape", "jambe_g", "jambe_d", "pagne", "torse", "casque", "bouclier", "bras_d", "epee"]


def checker(w, h, cell=20):
    img = Image.new("RGB", (w, h), (23, 29, 39))
    d = ImageDraw.Draw(img)
    for y in range(0, h, cell):
        for x in range(0, w, cell):
            if (x // cell + y // cell) % 2 == 0:
                d.rectangle([x, y, x + cell - 1, y + cell - 1], fill=(30, 38, 50))
    return img


def main() -> None:
    data = json.load(open(os.path.join(D, "kael_parts.json")))
    parts = {p["os"]: p for p in data["morceaux"]}
    W, H = 1740, 1210
    sheet = checker(W, H)
    d = ImageDraw.Draw(sheet)
    f1 = ImageFont.truetype(FB, 36)
    f2 = ImageFont.truetype(FR, 20)
    f3 = ImageFont.truetype(FB, 17)
    f4 = ImageFont.truetype(FR, 15)

    d.text((44, 28), "KAEL · kit de découpe pour Spine 2D", font=f1, fill=(244, 247, 252))
    d.text((44, 76), "9 morceaux · PNG transparents · pleine résolution · le rond rose = l'endroit où poser l'os",
           font=f2, fill=(154, 168, 188))

    # ── personnage + squelette ────────────────────────────────────────────
    full = Image.open(os.path.join(D, "kael_complet.png")).convert("RGBA")
    sc = 620 / full.height
    small = full.resize((int(full.width * sc), 620), Image.LANCZOS)
    ox, oy = 44, 130
    sheet.paste(small, (ox, oy), small)
    d.rectangle([ox - 1, oy - 1, ox + small.width, oy + small.height], outline=(60, 76, 96))

    pts = {p["os"]: p["pivot_perso"] for p in data["morceaux"]}
    neck = (440, 148)
    hip = (455, 320)
    d.line([neck, hip], fill=(255, 64, 160), width=3)
    d.line([pts["bras_d"], neck], fill=(255, 64, 160), width=3)
    d.line([pts["bouclier"], neck], fill=(255, 64, 160), width=3)
    d.line([pts["jambe_g"], hip], fill=(255, 64, 160), width=3)
    d.line([pts["jambe_d"], hip], fill=(255, 64, 160), width=3)
    d.line([pts["epee"], pts["bras_d"]], fill=(255, 190, 60), width=2)
    for name, p in pts.items():
        x, y = ox + p[0] * sc, oy + p[1] * sc
        d.ellipse([x - 5, y - 5, x + 5, y + 5], fill=(255, 64, 160), outline=(18, 18, 18))
        d.text((x + 8, y - 8), name, font=f4, fill=(255, 188, 220))

    # ── l'ordre d'empilement ─────────────────────────────────────────────
    tx = 44 + small.width + 50
    d.text((tx, 140), "ORDRE D'EMPILEMENT", font=f3, fill=(120, 220, 255))
    d.text((tx, 168), "du fond (derrière) vers l'avant :", font=f4, fill=(150, 165, 185))
    for i, name in enumerate(ORDER):
        y = 200 + i * 30
        d.text((tx + 6, y), f"{i + 1}.", font=f4, fill=(110, 125, 145))
        d.text((tx + 40, y), name, font=f4, fill=(226, 234, 244))
    d.text((tx, 200 + 9 * 30 + 26), "Note : le bras qui tient le bouclier", font=f4, fill=(150, 165, 185))
    d.text((tx, 200 + 9 * 30 + 48), "n'existe pas sur le dessin", font=f4, fill=(150, 165, 185))
    d.text((tx, 200 + 9 * 30 + 70), "(il est caché derrière).", font=f4, fill=(150, 165, 185))

    # ── les morceaux ─────────────────────────────────────────────────────
    y0 = 810
    d.text((44, y0 - 34), "LES 9 MORCEAUX", font=f3, fill=(120, 220, 255))
    cols = 5
    cw = (W - 88) // cols
    ch = (H - y0 - 30) // 2

    for i, name in enumerate(ORDER):
        p = parts[name]
        piece = Image.open(os.path.join(D, p["fichier"])).convert("RGBA")
        base = Image.new("RGBA", (cw - 16, ch - 34), (0, 0, 0, 0))
        s = min((cw - 30) / piece.width, (ch - 70) / piece.height, 1.0)
        t = piece.resize((max(1, int(piece.width * s)), max(1, int(piece.height * s))), Image.LANCZOS)
        bx = (base.width - t.width) // 2
        by = (base.height - t.height) // 2
        base.paste(t, (bx, by), t)
        cx = 44 + (i % cols) * cw
        cy = y0 + (i // cols) * ch
        sheet.paste(base, (cx + 8, cy + 26), base)
        d.text((cx + 8, cy + 4), f"{i + 1}. {name}", font=f3, fill=(232, 240, 250))
        px, py = cx + 8 + bx + p["px"] * s, cy + 26 + by + p["py"] * s
        d.ellipse([px - 5, py - 5, px + 5, py + 5], fill=(255, 64, 160), outline=(18, 18, 18))
        d.text((cx + 8, cy + ch - 24), f"{p['w']}×{p['h']} px · pivot {p['px']:.0f},{p['py']:.0f}",
               font=f4, fill=(130, 146, 168))

    sheet.save(os.path.join(D, "planche.png"))
    print("spine/kael/planche.png")


if __name__ == "__main__":
    main()
