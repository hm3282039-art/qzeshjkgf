#!/usr/bin/env python3
"""
DÉCOUPE DU PERSONNAGE EN MORCEAUX (rig 2D, façon Spine)
======================================================

Chaque héros est dessiné d'un seul tenant. Pour l'animer en temps réel, il faut
le découper en morceaux rattachés à un squelette :

    tête · torse · bras gauche · bras droit · jambes

La découpe se fait en lisant la silhouette :
  • le COU      = première fois que la largeur s'élargit franchement sous la tête
  • les HANCHES = le point le plus large du corps, au-dessus des pieds
  • les BRAS    = les zones latérales entre les épaules et les hanches

Les morceaux se recouvrent franchement (fondu progressif) : quand un bras
tourne, on ne voit pas de trou ni de couture.

Sortie : src/assets/rig_<id>_<morceau>.webp
         src/data/rigs.ts (les pivots et les tailles, prêts à l'emploi)
"""

from __future__ import annotations

import json
import os

import numpy as np
from PIL import Image, ImageFilter

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ASSETS = os.path.join(ROOT, "game", "src", "assets")
OUT_TS = os.path.join(ROOT, "game", "src", "data", "rigs.ts")

# Hauteur commune de tous les rigs : les héros sont ainsi à la même échelle.
BODY_H = 460


def alpha_of(im: Image.Image) -> np.ndarray:
    return np.asarray(im.convert("RGBA"))[..., 3].astype(np.float32) / 255.0


def prepare(im: Image.Image) -> Image.Image:
    """Recadre sur la silhouette et remet le personnage à la hauteur commune."""
    im = im.convert("RGBA")
    bb = im.getbbox()
    if bb:
        im = im.crop(bb)
    scale = BODY_H / im.height
    w = max(1, int(im.width * scale))
    im = im.resize((w, BODY_H), Image.LANCZOS)
    # marge à droite/gauche pour les armes qui dépassent quand elles tournent
    pad = int(BODY_H * 0.35)
    canvas = Image.new("RGBA", (w + pad * 2, BODY_H + int(BODY_H * 0.12)), (0, 0, 0, 0))
    canvas.alpha_composite(im, (pad, int(BODY_H * 0.10)))
    return canvas


def landmarks(a: np.ndarray) -> dict:
    """Trouve le cou, les hanches et le centre du corps."""
    ys, xs = np.nonzero(a > 0.08)
    y0, y1 = int(ys.min()), int(ys.max())
    h = max(1, y1 - y0)

    row_w = np.zeros(a.shape[0])
    row_c = np.zeros(a.shape[0])
    for y in range(y0, y1 + 1):
        idx = np.nonzero(a[y] > 0.08)[0]
        if len(idx):
            row_w[y] = idx[-1] - idx[0]
            row_c[y] = (idx[-1] + idx[0]) / 2

    w_top = float(np.median(row_w[y0:y0 + max(3, int(h * 0.06))])) or 1.0
    neck = y0 + int(h * 0.22)
    for y in range(y0 + int(h * 0.05), y0 + int(h * 0.45)):
        if row_w[y] > w_top * 2.0:
            neck = y
            break

    # les hanches : le plus large entre 45 % et 75 % de la hauteur
    lo, hi = y0 + int(h * 0.45), y0 + int(h * 0.78)
    hip = lo + int(np.argmax(row_w[lo:hi])) if hi > lo else y0 + int(h * 0.6)

    return {
        "y0": y0, "y1": y1, "hip": int(hip), "neck": int(neck),
        "cx": float(row_c[(neck + hip) // 2] or row_c[y0]),
        "row_c": row_c, "row_w": row_w,
    }


def feathered(mask: np.ndarray, radius: int) -> np.ndarray:
    m = Image.fromarray((np.clip(mask, 0, 1) * 255).astype(np.uint8), "L")
    m = m.filter(ImageFilter.GaussianBlur(radius))
    return np.asarray(m, dtype=np.float32) / 255.0


def cut(im: Image.Image, mask: np.ndarray) -> Image.Image:
    """Découpe le dessin selon un masque doux."""
    a = np.asarray(im.convert("RGBA")).astype(np.float32)
    out = a.copy()
    out[..., 3] = a[..., 3] * mask
    bb = Image.fromarray(np.clip(out, 0, 255).astype(np.uint8), "RGBA").getbbox()
    if not bb:
        return Image.new("RGBA", (1, 1), (0, 0, 0, 0))
    return Image.fromarray(np.clip(out, 0, 255).astype(np.uint8), "RGBA").crop(bb)


def build(hero_id: str) -> dict | None:
    src = os.path.join(ASSETS, f"hero_{hero_id}.webp")
    if not os.path.exists(src):
        return None
    im = prepare(Image.open(src))
    a = alpha_of(im)
    lm = landmarks(a)
    h, w = a.shape
    Y = np.arange(h)[:, None].astype(np.float32)
    X = np.arange(w)[None, :].astype(np.float32)

    neck, hip, cx = lm["neck"], lm["hip"], lm["cx"]
    span = max(1, hip - neck)
    feather = max(6, int(span * 0.10))

    # ── les masques (avec recouvrement volontaire) ──────────────────────────
    head = (Y < neck + feather * 0.5).astype(np.float32)
    torso = ((Y >= neck - feather) & (Y < hip + feather)).astype(np.float32)
    legs = (Y >= hip - feather * 0.8).astype(np.float32)

    # les bras : les côtés du torse, en s'arrêtant avant le centre du corps
    side_l = ((X < cx - w * 0.02) & (Y >= neck) & (Y < hip + feather * 0.4)).astype(np.float32)
    side_r = ((X >= cx + w * 0.02) & (Y >= neck) & (Y < hip + feather * 0.4)).astype(np.float32)

    masks = {
        "tete": feathered(head, feather),
        "torse": feathered(torso, feather),
        "bras_g": feathered(side_l, feather),
        "bras_d": feathered(side_r, feather),
        "jambes": feathered(legs, feather),
    }

    parts = {}
    for name, m in masks.items():
        piece = cut(im, m)
        if name == "bras_g":
            bb = piece.getbbox()
            if bb and bb[2] - bb[0] < w * 0.05:
                continue
        path = os.path.join(ASSETS, f"rig_{hero_id}_{name}.webp")
        piece.save(path, "WEBP", quality=88, method=6)

        # pivot : l'endroit autour duquel le morceau tourne, dans son propre repère
        if name == "tete":
            px, py = piece.width * 0.5, piece.height
        elif name == "torse":
            px, py = piece.width * 0.5, piece.height * 0.88
        elif name == "jambes":
            px, py = piece.width * 0.5, piece.height * 0.16
        elif name in ("bras_g", "bras_d"):
            px, py = (piece.width * 0.78 if name == "bras_g" else piece.width * 0.22), piece.height * 0.18
        else:
            px, py = piece.width / 2, piece.height / 2

        # position du morceau dans le repère du corps (déduite du recadrage)
        src_arr = np.asarray(im.convert("RGBA")).astype(np.float32)
        out = src_arr.copy()
        out[..., 3] = src_arr[..., 3] * m
        full = Image.fromarray(np.clip(out, 0, 255).astype(np.uint8), "RGBA")
        bb = full.getbbox() or (0, 0, 1, 1)

        parts[name] = {
            "src": f"rig_{hero_id}_{name}.webp",
            "w": piece.width,
            "h": piece.height,
            "px": round(px, 1),
            "py": round(py, 1),
            "x": int(bb[0]),
            "y": int(bb[1]),
        }

    return {
        "id": hero_id,
        "w": im.width,
        "h": im.height,
        "neck": [round(cx, 1), neck],
        "hip": [round(cx, 1), hip],
        "parts": parts,
    }


def main(ids: list[str]):
    rigs = {}
    for hid in ids:
        r = build(hid)
        if r:
            rigs[hid] = r
            print(f"{hid:10s} {len(r['parts'])} morceaux  {r['w']}x{r['h']}")
    json.dump(rigs, open("/tmp/rigs.json", "w"), indent=1)

    lines = ["/* FICHIER GÉNÉRÉ par tools/rig_parts.py — ne pas modifier à la main. */",
             "/* Les héros découpés en morceaux, avec leurs pivots (rig 2D temps réel). */", ""]
    for hid, r in rigs.items():
        for name, p in r["parts"].items():
            lines.append(f"import {hid}_{name} from '../assets/{p['src']}';")
    lines.append("")
    lines.append("export interface RigPart { src: string; w: number; h: number; px: number; py: number; x: number; y: number; }")
    lines.append("export interface Rig { id: string; w: number; h: number; neck: [number, number]; hip: [number, number]; parts: Record<string, RigPart>; }")
    lines.append("")
    lines.append("export const RIGS: Record<string, Rig> = {")
    for hid, r in rigs.items():
        lines.append(f"  {hid}: {{")
        lines.append(f"    id: '{hid}', w: {r['w']}, h: {r['h']},")
        lines.append(f"    neck: [{r['neck'][0]}, {r['neck'][1]}], hip: [{r['hip'][0]}, {r['hip'][1]}],")
        lines.append("    parts: {")
        for name, p in r["parts"].items():
            lines.append(f"      {name}: {{ src: {hid}_{name}, w: {p['w']}, h: {p['h']}, px: {p['px']}, py: {p['py']}, x: {p['x']}, y: {p['y']} }},")
        lines.append("    },")
        lines.append("  },")
    lines.append("};")
    lines.append("")
    lines.append("/** Les héros qui ont un squelette prêt. */")
    lines.append(f"export const RIGGED: string[] = [{', '.join(repr(k) for k in rigs)}];")
    open(OUT_TS, "w").write("\n".join(lines) + "\n")
    print(f"\n{len(rigs)} rigs · {OUT_TS}")


if __name__ == "__main__":
    import sys
    ids = sys.argv[1:] or ["kael"]
    main(ids)
