#!/usr/bin/env python3
"""
ANIMATION DU PERSONNAGE — d'un dessin à l'autre, sans à-coups
=============================================================

Le problème : quatre dessins posés à la suite, ça fait un diaporama. Un vrai
dessin animé, c'est 12 à 24 dessins par seconde, chacun légèrement différent du
précédent.

Ce module fabrique les dessins manquants entre deux poses :

  1. **OS** — il devine le squelette du personnage (tête, torse, bras, jambes)
     simplement en lisant la silhouette (le canal transparent du dessin).
  2. **INTERPOLATION** — il calcule le déplacement de chaque pixel entre la
     pose A et la pose B (suivi de mouvement par blocs), puis il **déplace
     réellement les pixels** : A avance, B recule, et on mélange. Les pixels
     suivent donc un trajet continu au lieu de sauter.
  3. **RELAIS** — la tête, les bras et les pans de cape ont un peu de retard :
     c'est ce qui donne l'impression de poids et d'inertie (« follow through »).

Résultat : 40 dessins au lieu de 4, et le mouvement est continu.
"""

from __future__ import annotations

import math
from dataclasses import dataclass, field

import numpy as np
from PIL import Image, ImageDraw, ImageFilter


# ─────────────────────────── outils numpy ──────────────────────────────────────

def to_np(img: Image.Image) -> np.ndarray:
    return np.asarray(img.convert("RGBA"), dtype=np.float32)


def to_img(a: np.ndarray) -> Image.Image:
    return Image.fromarray(np.clip(a, 0, 255).astype(np.uint8), "RGBA")


def sample_bilinear(img: np.ndarray, x: np.ndarray, y: np.ndarray) -> np.ndarray:
    """Lit l'image à des coordonnées flottantes (x, y), avec interpolation."""
    h, w = img.shape[:2]
    x0 = np.floor(x).astype(np.int32)
    y0 = np.floor(y).astype(np.int32)
    fx = (x - x0)[..., None]
    fy = (y - y0)[..., None]
    x0c = np.clip(x0, 0, w - 1)
    y0c = np.clip(y0, 0, h - 1)
    x1c = np.clip(x0 + 1, 0, w - 1)
    y1c = np.clip(y0 + 1, 0, h - 1)
    c00 = img[y0c, x0c]
    c10 = img[y0c, x1c]
    c01 = img[y1c, x0c]
    c11 = img[y1c, x1c]
    top = c00 * (1 - fx) + c10 * fx
    bot = c01 * (1 - fx) + c11 * fx
    return top * (1 - fy) + bot * fy


# ─────────────────────────── squelette ─────────────────────────────────────────

@dataclass
class Skeleton:
    bbox: tuple = (0, 0, 0, 0)
    head: tuple = (0.0, 0.0)
    neck: tuple = (0.0, 0.0)
    hip: tuple = (0.0, 0.0)
    shoulder_l: tuple = (0.0, 0.0)
    shoulder_r: tuple = (0.0, 0.0)
    hip_l: tuple = (0.0, 0.0)
    hip_r: tuple = (0.0, 0.0)
    row_center: np.ndarray = field(default_factory=lambda: np.zeros(1))
    row_width: np.ndarray = field(default_factory=lambda: np.zeros(1))


def analyze(im: Image.Image) -> Skeleton:
    """Devine les points du corps à partir de la silhouette."""
    a = np.asarray(im.convert("RGBA"))[..., 3].astype(np.float32)
    ys, xs = np.nonzero(a > 24)
    if len(ys) == 0:
        return Skeleton()
    x0, x1, y0, y1 = xs.min(), xs.max(), ys.min(), ys.max()
    h = max(1, y1 - y0)

    row_center = np.zeros(a.shape[0], dtype=np.float32)
    row_width = np.zeros(a.shape[0], dtype=np.float32)
    for y in range(y0, y1 + 1):
        idx = np.nonzero(a[y] > 24)[0]
        if len(idx):
            row_center[y] = idx.mean()
            row_width[y] = idx.max() - idx.min()

    # Le cou : on part du sommet de la tête et on descend jusqu'à ce que la
    # silhouette s'élargisse franchement (les épaules).
    w_top = float(np.median(row_width[y0:y0 + max(2, int(h * 0.05))])) or 1.0
    neck_y = y0 + int(h * 0.20)
    for y in range(y0 + int(h * 0.04), y0 + int(h * 0.42)):
        if row_width[y] > w_top * 2.1:
            neck_y = y - int(h * 0.015)
            break

    # Les hanches = un peu au-dessus de la moitié.
    hip_y = y0 + int(h * 0.56)

    cx = float(row_center[(y0 + y1) // 2]) if row_center[(y0 + y1) // 2] else (x0 + x1) / 2
    neck_cx = float(row_center[neck_y]) if row_center[neck_y] else cx
    hip_cx = float(row_center[hip_y]) if row_center[hip_y] else cx
    w_hip = float(row_width[hip_y]) or (x1 - x0) * 0.5
    w_neck = float(row_width[neck_y]) or (x1 - x0) * 0.3

    return Skeleton(
        bbox=(int(x0), int(y0), int(x1), int(y1)),
        head=(neck_cx, float(y0 + (neck_y - y0) * 0.45)),
        neck=(neck_cx, float(neck_y)),
        hip=(hip_cx, float(hip_y)),
        shoulder_l=(neck_cx - w_neck * 0.55, float(neck_y + h * 0.05)),
        shoulder_r=(neck_cx + w_neck * 0.55, float(neck_y + h * 0.05)),
        hip_l=(hip_cx - w_hip * 0.28, float(hip_y)),
        hip_r=(hip_cx + w_hip * 0.28, float(hip_y)),
        row_center=row_center,
        row_width=row_width,
    )


def body_parts(im: Image.Image, sk: Skeleton) -> dict[str, Image.Image]:
    """
    Découpe le dessin en morceaux (tête, torse, bras gauche/droite, jambes).
    Les morceaux se recouvrent légèrement pour ne pas laisser de trous quand
    ils bougent.
    """
    w, h = im.size
    a = np.asarray(im.convert("RGBA"))[..., 3]
    layers: dict[str, Image.Image] = {}

    def layer_from_mask(mask_arr: np.ndarray) -> Image.Image:
        m = Image.fromarray((mask_arr * 255).astype(np.uint8), "L").filter(ImageFilter.GaussianBlur(2.0))
        base = im.convert("RGBA").copy()
        base.putalpha(Image.composite(m, Image.new("L", im.size, 0), im.getchannel("A")))
        return base

    ys = np.arange(h)[:, None]
    xs = np.arange(w)[None, :]
    nx, ny = sk.neck
    hx, hy = sk.hip
    alpha = (a > 20)

    head = alpha & (ys < ny + (hy - ny) * 0.06)
    layers["tete"] = layer_from_mask(head)

    torso = alpha & (ys >= ny - (hy - ny) * 0.05) & (ys < hy + (hy - ny) * 0.18) & (np.abs(xs - nx) < (hx - nx) + (w * 0.30))
    layers["torse"] = layer_from_mask(torso)

    mid_y = (ny + hy) / 2
    arm_l = alpha & (ys >= ny) & (ys < hy + 10) & (xs < nx - w * 0.02)
    arm_r = alpha & (ys >= ny) & (ys < hy + 10) & (xs >= nx + w * 0.02)
    layers["bras_g"] = layer_from_mask(arm_l)
    layers["bras_d"] = layer_from_mask(arm_r)

    leg_l = alpha & (ys >= hy) & (xs < hx)
    leg_r = alpha & (ys >= hy) & (xs >= hx)
    layers["jambe_g"] = layer_from_mask(leg_l)
    layers["jambe_d"] = layer_from_mask(leg_r)

    return layers


def rotate_layer(layer: Image.Image, pivot: tuple, angle: float) -> Image.Image:
    if abs(angle) < 0.02:
        return layer
    return layer.rotate(angle, center=pivot, resample=Image.BICUBIC)


# ─────────────────────────── suivi de mouvement ────────────────────────────────

def optical_flow(a: Image.Image, b: Image.Image, block: int = 6, radius: int = 9, scale: int = 4) -> np.ndarray:
    """
    Déplacement de chaque zone entre l'image A et l'image B (en pixels, à
    l'échelle d'origine). Méthode « block matching » : pour chaque petite zone
    de A, on cherche dans B le morceau qui lui ressemble le plus.
    """
    ga = np.asarray(a.convert("L").resize((a.width // scale, a.height // scale)), dtype=np.float32)
    gb = np.asarray(b.convert("L").resize((b.width // scale, b.height // scale)), dtype=np.float32)
    h, w = ga.shape
    bh = max(4, h // block)
    bw = max(4, w // block)
    gy, gx = max(1, h // bh), max(1, w // bw)

    best = np.full((bh, bw), 1e18, dtype=np.float32)
    dy_best = np.zeros((bh, bw), dtype=np.float32)
    dx_best = np.zeros((bh, bw), dtype=np.float32)

    for dy in range(-radius, radius + 1):
        for dx in range(-radius, radius + 1):
            shifted = np.roll(np.roll(gb, dy, axis=0), dx, axis=1)
            diff = np.abs(ga - shifted)
            score = diff[: bh * gy, : bw * gx].reshape(bh, gy, bw, gx).mean(axis=(1, 3))
            better = score < best
            best = np.where(better, score, best)
            dy_best = np.where(better, float(dy) * scale, dy_best)
            dx_best = np.where(better, float(dx) * scale, dx_best)

    flow = np.stack([dx_best, dy_best], axis=-1)
    # lissage : le déplacement doit varier doucement sur l'image
    # on complète les bords pour que le redimensionnement soit propre
    pad_x = int(np.ceil(bh / 2))
    pad_y = int(np.ceil(bw / 2))
    pad = np.pad(flow, ((pad_x, pad_x), (pad_y, pad_y), (0, 0)), mode="edge")
    rgb = np.zeros((pad.shape[0], pad.shape[1], 3), dtype=np.uint8)
    rgb[..., :] = 128
    rgb[..., 0] = np.clip(pad[..., 0] + 128, 0, 255).astype(np.uint8)
    rgb[..., 1] = np.clip(pad[..., 1] + 128, 0, 255).astype(np.uint8)
    flow_img = Image.fromarray(rgb, "RGB")
    flow_img = flow_img.resize(a.size, Image.BILINEAR).filter(ImageFilter.GaussianBlur(max(2, a.width // 90)))
    flow = np.asarray(flow_img, dtype=np.float32) - 128.0
    # plafond : un pixel ne peut pas se déplacer plus d'un quart de la largeur
    cap = a.width * 0.13
    mag = np.sqrt((flow ** 2).sum(axis=-1, keepdims=True)) + 1e-6
    flow = flow * np.minimum(1.0, cap / mag)
    return flow


def warp(img_np: np.ndarray, flow: np.ndarray, t: float) -> np.ndarray:
    h, w = img_np.shape[:2]
    ys, xs = np.mgrid[0:h, 0:w].astype(np.float32)
    sx = xs + flow[..., 0] * t
    sy = ys + flow[..., 1] * t
    return sample_bilinear(img_np, sx, sy)


def ease(x: float) -> float:
    x = max(0.0, min(1.0, x))
    return x * x * (3 - 2 * x)


def in_between(a: Image.Image, b: Image.Image, t: float, flow: np.ndarray | None = None) -> Image.Image:
    """
    L'image « entre » A et B à l'instant t (0 = A, 1 = B).
    Les pixels sont réellement déplacés le long de leur trajet : pas de fondu
    mou, un vrai mouvement.
    """
    if flow is None:
        flow = optical_flow(a, b)
    A = to_np(a)
    B = to_np(b)
    wa = warp(A, flow, t)
    wb = warp(B, flow, t - 1.0)
    k = ease(t)
    out = wa * (1 - k) + wb * k
    # on garde le meilleur des deux alphas pour éviter les trous
    out[..., 3] = np.maximum(wa[..., 3], wb[..., 3]) * (0.55 + 0.45 * (1 - abs(2 * t - 1)))
    return to_img(out)


# ─────────────────────────── séquence complète ────────────────────────────────

def follow_through(img: Image.Image, sk: Skeleton, lean: float, lag: float) -> Image.Image:
    """
    Relais du mouvement : la tête et les bras traînent un peu derrière le
    corps. `lean` = l'inclinaison du corps (degrés), `lag` = retard (0..1).
    """
    if abs(lean) < 0.15 and abs(lag) < 0.02:
        return img
    parts = body_parts(img, sk)
    canvas = Image.new("RGBA", img.size, (0, 0, 0, 0))
    body = Image.new("RGBA", img.size, (0, 0, 0, 0))
    body.alpha_composite(parts["jambe_g"])
    body.alpha_composite(parts["jambe_d"])
    body.alpha_composite(parts["torse"])
    body = rotate_layer(body, sk.hip, lean)
    canvas.alpha_composite(body)
    for name, pivot, mult in (("bras_g", sk.shoulder_l, 1.6), ("bras_d", sk.shoulder_r, 1.6), ("tete", sk.neck, 2.4)):
        part = rotate_layer(parts[name], pivot, lean * lag * mult)
        canvas.alpha_composite(part)
    return canvas


def smooth_sequence(keys: list[Image.Image], per_gap: int = 10, lean: float = 0.0) -> list[Image.Image]:
    """
    Fabrique la séquence complète : `per_gap` dessins entre chaque paire de
    poses, plus un léger relais (inertie) sur la tête et les bras.
    """
    sk = analyze(keys[0])
    frames: list[Image.Image] = []
    for i in range(len(keys) - 1):
        a, b = keys[i], keys[i + 1]
        flow = optical_flow(a, b)
        for k in range(per_gap):
            t = k / per_gap
            f = in_between(a, b, t, flow)
            # inertie : maximale au milieu du mouvement
            lag = math.sin(math.pi * t) * 0.35
            f = follow_through(f, sk, lean * math.sin(math.pi * t), lag)
            frames.append(f)
    frames.append(keys[-1])
    return frames


def smooth_loop_sequence(keys: list[Image.Image], per_gap: int = 10, lean: float = 0.0) -> list[Image.Image]:
    """Comme `smooth_sequence`, mais referme la boucle (retour à la 1re pose)."""
    seq = smooth_sequence(keys + [keys[0]], per_gap, lean)
    return seq[:-1]


# ─────────────────────────── alignement des poses ─────────────────────────────

def normalize_pose(img: Image.Image, height_ratio: float = 0.86, canvas=(560, 416)) -> Image.Image:
    """
    Recadre le dessin sur sa silhouette, puis le remet à la même taille avec
    les pieds au même endroit. Sans ça, les 4 poses « sautent » d'une image à
    l'autre au lieu de s'enchaîner.
    """
    bbox = img.convert("RGBA").getbbox()
    if not bbox:
        return img
    cut = img.crop(bbox)
    W, H = canvas
    target_h = H * height_ratio
    scale = target_h / cut.height
    new_w = max(1, int(cut.width * scale))
    cut = cut.resize((new_w, int(target_h)), Image.LANCZOS)
    out = Image.new("RGBA", canvas, (0, 0, 0, 0))
    x = (W - cut.width) // 2
    y = int(H * 0.94 - cut.height)
    out.alpha_composite(cut, (x, y))
    return out


def directional_smear(img: Image.Image, flow: np.ndarray, amount: float, steps: int = 5) -> Image.Image:
    """
    Étirement directionnel léger : la silhouette fuse, mais le fond reste noir
    et les parties claires ne se transforment pas en brume.
    """
    if amount < 0.02:
        return img
    base = to_np(img)
    acc = np.zeros_like(base)
    weight = 0.0
    for i in range(steps):
        k = (i / (steps - 1) - 0.5) * 2.0
        w = max(0.08, 1 - abs(k) * 1.3)
        acc += warp(base, flow, k * amount) * w
        weight += w
    out = acc / weight
    # on garde l'image d'origine bien nette par-dessus : l'étirement ne touche
    # que les bords du mouvement
    keep = 0.62
    out = out * (1 - keep) + base * keep
    return to_img(out)


def add_motion_blur(img: Image.Image, dist: float, angle_deg: float) -> Image.Image:
    """Flou de bougé simple (déplacement de moyenne), pour les frames rapides."""
    if dist < 0.6:
        return img
    ang = math.radians(angle_deg)
    steps = max(2, int(dist / 2))
    acc = np.zeros(np.asarray(img).shape, dtype=np.float32)
    for i in range(steps):
        k = dist * (i / (steps - 1) - 0.5)
        acc += warp(to_np(img), np.dstack([np.full_like(np.mgrid[0:img.height, 0:img.width][0].astype(np.float32), math.cos(ang) * k),
                                           np.full_like(np.mgrid[0:img.height, 0:img.width][0].astype(np.float32), math.sin(ang) * k)]), 1.0)
    return to_img(acc / steps)


def smoothed_anim(keys: list[Image.Image], per_gap: int = 10, lean: float = 5.0,
                  smear: float = 0.0, canvas=(560, 416)) -> list[Image.Image]:
    """
    LA séquence : alignement + interpolation par déplacement de pixels +
    inertie (tête/bras) + étirement sur les frames rapides.
    """
    poses = [normalize_pose(k, canvas=canvas) for k in keys]
    sk = analyze(poses[0])
    frames: list[Image.Image] = []
    for i in range(len(poses) - 1):
        a, b = poses[i], poses[i + 1]
        flow = optical_flow(a, b, block=5, radius=11, scale=4)
        for k in range(per_gap):
            t = k / per_gap
            f = in_between(a, b, t, flow)
            # inertie : maximale au milieu du geste
            bell = math.sin(math.pi * t)
            if smear > 0:
                f = directional_smear(f, flow, smear * bell ** 2, steps=4)
            f = follow_through(f, sk, lean * bell, 0.35 * bell)
            frames.append(f)
    frames.append(poses[-1])
    return frames
