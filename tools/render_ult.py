#!/usr/bin/env python3
"""
FABRIQUE DE LA VIDÉO D'ULTIME
=============================

Ce script ne fait pas d'« images empilées » : il CALCULE chaque image de la
vidéo (24 par seconde) puis les encode en vrai fichier WebM. C'est la méthode
historique de l'animation — on dessine image par image — sauf qu'ici le dessin
est assemblé par le programme : caméra qui pousse, particules, éclats, secousses,
et surtout les quatre dessins de l'action joués avec des images de flou entre eux.

    python3 tools/render_ult.py kael [autre_id ...]

Sortie : game/src/assets/ultvid_<id>.webm  (960×540, 24 i/s, 7 s)
"""

from __future__ import annotations

import json
import math
import os
import random
import shutil
import subprocess
import sys
import tempfile
from dataclasses import dataclass

from PIL import Image, ImageChops, ImageDraw, ImageFilter, ImageFont

import imageio_ffmpeg

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from animate_ult import smoothed_anim  # noqa: E402

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ASSETS = os.path.join(ROOT, "game", "src", "assets")
OUT = ASSETS
FFMPEG = imageio_ffmpeg.get_ffmpeg_exe()

W = int(os.environ.get("ULT_W", "854"))
H = int(round(W * 9 / 16))
FPS = int(os.environ.get("ULT_FPS", "30"))
CRF = os.environ.get("ULT_CRF", "38")
DUR = 7.0
NFRAMES = int(round(DUR * FPS))

FONT_DECO = "/usr/share/fonts/truetype/dejavu/DejaVuSerif-Bold.ttf"
FONT_TITLE = "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"

# Chronologie de la scène, en secondes. Chaque plan dure exactement ce qu'il faut.
T = {
    "wide":  (0.00, 1.10),   # plan large, la charogne fonce
    "illu":  (1.10, 2.40),   # l'illustration arrive
    "white": (2.40, 3.00),   # le blanc surexposé sur le visage
    "anim":  (3.00, 5.40),   # L'ANIMATION — le héros joue son geste
    "hit":   (5.40, 6.15),   # l'impact
    "title": (6.15, 6.80),   # le nom
    "out":   (6.80, 7.00),   # fondu
}
DUR = 7.0
START = {k: v[0] for k, v in T.items()}
END = {k: v[1] for k, v in T.items()}


# ─────────────────────────── outils ────────────────────────────────────────────

def clamp(x, a=0.0, b=1.0):
    return a if x < a else b if x > b else x


def ease_out(x):
    return 1 - (1 - clamp(x)) ** 3


def ease_in(x):
    return clamp(x) ** 3


def ease_both(x):
    x = clamp(x)
    return 3 * x * x - 2 * x * x * x


def lerp(a, b, t):
    return a + (b - a) * t


def hex_rgb(s):
    s = s.lstrip("#")
    return tuple(int(s[i:i + 2], 16) for i in (0, 2, 4))


def load(name):
    return Image.open(os.path.join(ASSETS, name)).convert("RGBA")


def cover(img, w, h, zoom=1.0, cx=0.5, cy=0.5):
    """Recadre `img` pour remplir w×h (couverture), avec zoom et point d'intérêt."""
    iw, ih = img.size
    scale = max(w / iw, h / ih) * zoom
    nw, nh = int(iw * scale + 1), int(ih * scale + 1)
    out = img.resize((nw, nh), Image.LANCZOS)
    x = int((nw - w) * cx)
    y = int((nh - h) * cy)
    return out.crop((x, y, x + w, y + h))


def fit(img, w, h):
    """Réduit `img` pour tenir dans w×h, sans déformer (alpha conservé)."""
    img = img.convert("RGBA")
    iw, ih = img.size
    s = min(w / iw, h / ih)
    return img.resize((max(1, int(iw * s)), max(1, int(ih * s))), Image.LANCZOS)


def paste_center(dst, img, cx, cy, alpha=1.0):
    if alpha <= 0.01:
        return
    if alpha < 0.999:
        img = img.copy()
        a = img.getchannel("A").point(lambda v: int(v * alpha))
        img.putalpha(a)
    dst.alpha_composite(img, (int(cx - img.width / 2), int(cy - img.height / 2)))


def screen_layer(base, layer):
    """Ajoute de la lumière : le noir du calque ne change rien."""
    return ImageChops.screen(base, layer)


def radial(size, inner=(255, 255, 255), power=2.0):
    """Dégradé circulaire en niveaux de gris, pour les halos."""
    g = Image.radial_gradient("L").resize((size, size), Image.BICUBIC)
    inv = g.point(lambda v: int(255 * ((255 - v) / 255) ** power))
    return inv


def glow(size, color, power=2.0):
    m = radial(size, power=power)
    solid = Image.new("RGB", (size, size), color)
    out = Image.new("RGB", (size, size), (0, 0, 0))
    out.paste(solid, (0, 0), m)
    return out


def vignette(w, h, strength=0.85):
    g = Image.radial_gradient("L").resize((w * 2, h * 2), Image.BICUBIC)
    m = g.point(lambda v: int(255 * (1 - strength * ((255 - v) / 255) ** 1.6)))
    black = Image.new("RGB", (w * 2, h * 2), (0, 0, 0))
    black.putalpha(m.resize((w * 2, h * 2)))
    return black.crop((w // 2, h // 2, w // 2 + w, h // 2 + h))


VIG = None
NOISE = None


def finish(rgb, t, grain=4, vig=0.8):
    """Vignettage + grain : ce qui fait « image de film » plutôt que « dessin »."""
    global VIG, NOISE
    if VIG is None:
        VIG = vignette(W, H, vig)
    out = Image.alpha_composite(rgb.convert("RGBA"), VIG).convert("RGB")
    if NOISE is None:
        rnd = random.Random(7)
        NOISE = [Image.effect_noise((W, H), 26).convert("RGB") for _ in range(6)]
    n = NOISE[int(t * FPS) % len(NOISE)]
    lit = ImageChops.add(out, n.point(lambda v: int(v * grain / 255)), scale=1.0, offset=-4 * grain)
    return Image.blend(out, lit, 0.45)


def shake_frame(img, amount, seed):
    if amount <= 0.5:
        return img
    rnd = random.Random(seed)
    dx = int(rnd.uniform(-amount, amount))
    dy = int(rnd.uniform(-amount, amount))
    canvas = Image.new("RGB", (W, H), (0, 0, 0))
    canvas.paste(img, (dx, dy))
    return canvas


def chroma(img, dx):
    if abs(dx) < 0.6:
        return img
    r, g, b = img.split()
    r = ImageChops.offset(r, int(dx), 0)
    b = ImageChops.offset(b, -int(dx), 0)
    return Image.merge("RGB", (r, g, b))


def flash(img, amount):
    if amount <= 0.01:
        return img
    white = Image.new("RGB", img.size, (255, 255, 255))
    return Image.blend(img, white, clamp(amount))


def dim(img, k):
    if k >= 0.999:
        return img
    black = Image.new("RGB", img.size, (0, 0, 0))
    return Image.blend(img, black, clamp(1 - k))


# ─────────────────────────── particules ────────────────────────────────────────

@dataclass
class Spark:
    x: float
    y: float
    vx: float
    vy: float
    life: float
    size: float
    color: tuple


def draw_particles(layer, parts, gravity=0.0, fade=True):
    d = ImageDraw.Draw(layer, "RGBA")
    for p in parts:
        if p.life <= 0:
            continue
        a = clamp(p.life) if fade else 1.0
        x, y = p.x, p.y
        r = max(0.6, p.size * (0.4 + 0.6 * a))
        col = (p.color[0], p.color[1], p.color[2], int(210 * a))
        d.ellipse((x - r, y - r, x + r, y + r), fill=col)
        if r > 2.2:
            d.ellipse((x - r * 2.2, y - r * 2.2, x + r * 2.2, y + r * 2.2),
                      outline=(p.color[0], p.color[1], p.color[2], int(70 * a)), width=1)
    return layer


def step_particles(parts, dt, gravity=0.0, drag=1.0):
    for p in parts:
        p.x += p.vx * dt
        p.y += p.vy * dt
        p.vy += gravity * dt
        p.vx *= drag
        p.life -= dt * 1.35
    return [p for p in parts if p.life > 0]


# ─────────────────────────── texte ─────────────────────────────────────────────

def text_width(font, s, tracking=0):
    w = 0
    for ch in s:
        w += font.getlength(ch) + tracking
    return w


def draw_tracked(draw, xy, s, font, fill, tracking=0, shadow=None):
    x, y = xy
    for ch in s:
        if shadow:
            draw.text((x + 2, y + 3), ch, font=font, fill=shadow)
        draw.text((x, y), ch, font=font, fill=fill)
        x += font.getlength(ch) + tracking
    return x


# ─────────────────────────── plans ─────────────────────────────────────────────

def shot_wide(t, hero, bg, hero_sil, foes, lunge):
    p = clamp((t - START['wide']) / (END['wide'] - START['wide']))
    z = 1.10 - 0.08 * ease_out(p)
    frame = cover(bg, W, H, zoom=z, cx=0.5 + 0.02 * p, cy=0.52).convert("RGBA")
    frame = Image.blend(frame.convert("RGB"), Image.new("RGB", (W, H), (6, 4, 12)), 0.06).convert("RGBA")

    # les ennemis, petits, au fond (images déjà détourées)
    for i, f in enumerate(foes):
        hh = H * (0.42 + 0.05 * i)
        im = fit(f, int(W * 0.55), int(hh))
        alpha = im.getchannel("A")
        im = Image.eval(im.convert("RGB"), lambda v: int(v * 0.62)).convert("RGBA")
        im.putalpha(alpha)
        paste_center(frame, im, W * (0.46 + 0.13 * i), H * (0.84 - 0.03 * i), 0.9)

    # l'ombre du héros, à gauche, dos tourné (presque noire)
    sil = fit(hero_sil, int(W * 0.52), int(H * 0.92))
    alpha = sil.getchannel("A").point(lambda v: int(v * 0.96))
    sil = Image.eval(sil.convert("RGB"), lambda v: int(v * 0.16)).convert("RGBA")
    sil.putalpha(alpha)
    paste_center(frame, sil, W * 0.17, H * 0.80)

    # la charogne qui fonce sur la caméra
    lp = clamp((t - 0.26) / (END['wide'] - 0.30))
    if lp > 0:
        sc = lerp(0.34, 1.5, lp ** 1.7)
        im = fit(lunge, int(W * 0.55 * sc), int(H * 1.0 * sc))
        alpha = im.getchannel("A")
        im = Image.eval(im.convert("RGB"), lambda v: int(v * lerp(0.30, 0.72, lp))).convert("RGBA")
        im.putalpha(alpha)
        im = im.filter(ImageFilter.GaussianBlur(1.0 + 3.5 * lp))
        paste_center(frame, im, lerp(W * 1.0, W * 0.72, lp ** 1.4), lerp(H * 0.72, H * 0.88, lp), 0.95)

    # brume basse
    fog = Image.new("RGB", (W, H), (0, 0, 0))
    d = ImageDraw.Draw(fog, "RGBA")
    for i in range(16):
        y = H * (0.72 + i * 0.018)
        a = int(6 + i * 1.1)
        d.rectangle((0, y, W, y + H * 0.03), fill=(120, 100, 160, a))
    frame = ImageChops.screen(frame.convert("RGB"), fog.filter(ImageFilter.GaussianBlur(14))).convert("RGBA")
    return frame


def shot_illustration(t, hero, art):
    p = clamp((t - START['illu']) / (END['illu'] - START['illu']))
    z = lerp(1.24, 1.045, ease_out(p))
    frame = cover(art, W, H, zoom=z, cx=0.60 + 0.05 * p, cy=0.46).convert("RGB")
    # arrivée depuis le noir
    enter = clamp(p / 0.16)
    frame = dim(frame, lerp(0.05, 1.0, ease_out(enter)))

    fx = Image.new("RGB", (W, H), (0, 0, 0))
    c = hero["rgb"]
    g = glow(int(W * 0.95), tuple(int(v * 0.85) for v in c), power=2.6)
    fx.paste(g, (int(W * 0.18), int(-H * 0.22)), g.convert("L").point(lambda v: int(v * (0.30 + 0.16 * math.sin(p * 6)))))
    frame = screen_layer(frame, fx)

    # poussières qui montent
    rnd = random.Random(11)
    parts = []
    for _ in range(30):
        parts.append(Spark(rnd.uniform(0, W), rnd.uniform(H * 0.55, H * 1.05),
                           rnd.uniform(-8, 8), rnd.uniform(-70, -26),
                           rnd.uniform(0.35, 1.0), rnd.uniform(0.8, 2.6), c))
    step_particles(parts, ((t - START['illu']) % 0.62) * 0.62)
    lay = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    draw_particles(lay, parts)
    return Image.alpha_composite(frame.convert("RGBA"), lay)


def shot_white(t, hero, art):
    p = clamp((t - START['white']) / (END['white'] - START['white']))
    # vrai gros plan : on recadre directement le visage (en haut à droite du dessin)
    iw, ih = art.size
    box_w, box_h = int(iw * 0.34), int(iw * 0.34 * H / W)
    cx = int(iw * 0.845)
    cy = int(ih * 0.235)
    x0 = min(max(0, cx - box_w // 2), iw - box_w)
    y0 = min(max(0, cy - box_h // 2), ih - box_h)
    crop = art.crop((x0, y0, x0 + box_w, y0 + box_h))
    z = lerp(1.16, 1.02, ease_out(p))
    frame = crop.resize((int(W * z), int(H * z)), Image.LANCZOS).crop(((W * (z - 1)) // 2, (H * (z - 1)) // 2,
                                                                      (W * (z - 1)) // 2 + W, (H * (z - 1)) // 2 + H)).convert("RGB")
    # surexposition : on monte vers le blanc par paliers (pas la teinte vers le brun)
    frame = frame.point(lambda v: min(255, int(v * 1.35) + 78))
    frame = flash(frame, 0.30)

    # dédoublement de couleur (la signature « dessin surexposé »)
    frame = chroma(frame, lerp(9, 2, ease_out(p)))

    # hachures de croquis
    lay = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    d = ImageDraw.Draw(lay, "RGBA")
    c = hero["rgb"]
    rnd = random.Random(3)
    for i in range(70):
        x0 = rnd.uniform(W * 0.3, W)
        y0 = rnd.uniform(0, H)
        ln = rnd.uniform(20, 120)
        a = int(rnd.uniform(20, 80) * (1 - p * 0.6))
        d.line((x0, y0, x0 + ln * 0.9, y0 - ln * 0.35), fill=(c[0], c[1], c[2], a), width=1)
    frame = Image.alpha_composite(frame.convert("RGBA"), lay)

    # un sceau géométrique tourne lentement derrière (pas de caractère : trop aléatoire)
    glyph_layer = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    gd = ImageDraw.Draw(glyph_layer, "RGBA")
    ga = int(120 * (1 - clamp((p - 0.35) / 0.65)))
    cx, cy, R = W * 0.5, H * 0.48, H * 0.44
    for k in range(3):
        rr = R * (1 - k * 0.18)
        gd.ellipse((cx - rr, cy - rr, cx + rr, cy + rr), outline=(255, 255, 255, ga // (k + 1)), width=2)
    for k in range(8):
        a = math.radians(k * 45 + p * 40)
        gd.line((cx + math.cos(a) * R * 0.62, cy + math.sin(a) * R * 0.62,
                 cx + math.cos(a) * R, cy + math.sin(a) * R), fill=(255, 255, 255, ga), width=2)
    return Image.alpha_composite(frame, glyph_layer)


def shot_animation(t, hero, frames):
    """
    Le héros joue son geste : la séquence a été calculée image par image
    (déplacement réel des pixels entre les poses), donc le mouvement est continu.
    """
    p = clamp((t - START['anim']) / (END['anim'] - START['anim']))
    n = len(frames)
    pos = p * (n - 1)
    idx = min(n - 1, int(pos))
    local = pos - idx

    c = hero["rgb"]
    frame = Image.new("RGBA", (W, H), (6, 4, 12, 255))
    # halo de fond dans la couleur du héros
    halo = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    hd = ImageDraw.Draw(halo)
    for r in range(int(H * 0.62), 0, -8):
        a = int(3.4 * (1 - r / (H * 0.62)) ** 0.7 * 26)
        hd.ellipse((W * 0.52 - r, H * 0.56 - r, W * 0.52 + r, H * 0.56 + r),
                   fill=(min(255, int(c[0] * 0.5)), min(255, int(c[1] * 0.5)), min(255, int(c[2] * 0.5)), a))
    frame = Image.alpha_composite(frame, halo.filter(ImageFilter.GaussianBlur(18)))

    def pose(i, scale, alpha=1.0, blur=0.0, dx=0.0, dy=0.0):
        """Pose le dessin sur du noir, puis l'ajoute en lumière (screen) :
        le fond noir du dessin disparaît et laisse voir le halo."""
        if i < 0 or i >= len(frames):
            return
        im = frames[i].convert("RGB").resize((int(W * scale), int(H * scale)), Image.LANCZOS)
        if blur > 0.2:
            im = im.filter(ImageFilter.GaussianBlur(blur))
        if alpha < 0.999:
            im = Image.eval(im, lambda v: int(v * alpha))
        canvas = Image.new("RGB", (W, H), (0, 0, 0))
        canvas.paste(im, (int(dx), int(dy)))
        nonlocal frame
        frame = ImageChops.screen(frame.convert("RGB"), canvas).convert("RGBA")

    # le dessin du moment, avec juste un souffle de mouvement entre deux images
    punch = 1.02 - 0.02 * math.sin(p * math.pi * 8)
    pose(idx, punch, 1.0)
    if local > 0.5 and idx + 1 < len(frames):
        pose(idx + 1, punch, (local - 0.5) * 0.55)

    # lignes de vitesse (lumineuses, jamais noires)
    lay = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    d = ImageDraw.Draw(lay, "RGBA")
    rnd = random.Random(int(t * 1000) & 0xFFFF)
    for _ in range(18):
        y = rnd.uniform(-H * 0.1, H)
        x = rnd.uniform(-W * 0.3, W * 0.4)
        ln = rnd.uniform(140, 380)
        a = int(rnd.uniform(14, 46))
        d.line((x, y, x + ln, y + ln * 0.30), fill=(255, 255, 255, a), width=1)
    lay = lay.filter(ImageFilter.GaussianBlur(0.6))
    frame = Image.alpha_composite(frame, lay)

    # petit coup à chaque changement de dessin
    if local < 0.10:
        frame = Image.alpha_composite(frame, Image.new("RGBA", (W, H), (255, 255, 255, int(70 * (1 - local / 0.10)))))
    return frame


def shot_impact(t, hero, art):
    p = clamp((t - START['hit']) / (END['hit'] - START['hit']))
    # l'illustration, poussée et brûlée par la lumière de l'impact
    ghost = cover(art, W, H, zoom=lerp(1.32, 1.12, ease_out(p)), cx=0.58, cy=0.46).convert("RGB")
    frame = Image.blend(ghost, Image.new("RGB", (W, H), (255, 255, 255)), 0.34 * (1 - p) ** 1.5)
    frame = Image.blend(frame, Image.new("RGB", (W, H), (7, 4, 12)), 0.10 + 0.42 * p)
    c = hero["rgb"]

    # ondes de choc
    rings = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    rd = ImageDraw.Draw(rings, "RGBA")
    for k in range(3):
        q = clamp((p - k * 0.12) / 0.75)
        if q <= 0:
            continue
        r = 20 + q * W * 0.55
        a = int(200 * (1 - q) ** 1.4)
        rd.ellipse((W * 0.6 - r, H * 0.56 - r * 0.62, W * 0.6 + r, H * 0.56 + r * 0.62),
                   outline=(min(255, c[0] + 90), min(255, c[1] + 90), min(255, c[2] + 90), a),
                   width=max(1, int(9 * (1 - q))))
    frame = Image.alpha_composite(frame.convert("RGBA"), rings.filter(ImageFilter.GaussianBlur(1.2)))

    # fissures
    crack = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    cd = ImageDraw.Draw(crack, "RGBA")
    rnd = random.Random(hash(hero["id"]) & 0xFF)
    grow = ease_out(clamp(p / 0.35))
    for i in range(9):
        ang = math.radians(i * 40 + 8)
        ln = (0.22 + rnd.random() * 0.3) * W * grow
        x0, y0 = W * 0.6, H * 0.78
        pts = [(x0, y0)]
        for s in range(1, 5):
            pts.append((x0 + math.cos(ang) * ln * s / 4 + rnd.uniform(-8, 8),
                        y0 + math.sin(ang) * ln * s / 4 * 0.35 + rnd.uniform(-6, 6)))
        cd.line(pts, fill=(255, 255, 255, int(230 * (1 - p * 0.5))), width=2)
        cd.line(pts, fill=(c[0], c[1], c[2], int(150 * (1 - p * 0.5))), width=5)
    frame = Image.alpha_composite(frame, crack)

    # cendres et éclats
    lay = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    parts = []
    for i in range(34):
        r2 = random.Random(i * 977 + (hash(hero["id"]) & 0xFF))
        age = p * 0.9
        parts.append(Spark(W * 0.6 + r2.uniform(-260, 260) * (0.4 + age),
                           H * 0.72 - age * r2.uniform(60, 240),
                           0, 0, 1 - p, r2.uniform(1, 3.2), c))
    draw_particles(lay, parts)
    frame = Image.alpha_composite(frame, lay)

    # chiffres de dégâts
    hits = [(-150, -40, 1), (90, -120, 0), (190, 20, 0), (-30, 90, 0)]
    tl = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    td = ImageDraw.Draw(tl, "RGBA")
    for i, (dx, dy, big) in enumerate(hits):
        q = clamp((p - 0.04 - i * 0.05) / 0.30)
        if q <= 0:
            continue
        size = (58 if big else 38) * (1.35 - 0.35 * ease_out(q))
        fnt = ImageFont.truetype(FONT_TITLE, max(10, int(size)))
        txt = str((i + 2) * 1370)
        rise = ease_out(q) * 70
        a = int(255 * (1 - clamp((q - 0.55) / 0.45)))
        td.text((W * 0.58 + dx, H * 0.42 + dy - rise), txt, font=fnt,
                fill=(255, 245, 215, a), stroke_width=3, stroke_fill=(0, 0, 0, a))
    frame = Image.alpha_composite(frame, tl)

    # onomatopée
    words = {"slam": "BOOM", "dash": "SLASH", "storm": "VOLLEY", "bless": "LUX", "void": "VOID", "line": "BEAM"}
    wd = words.get(hero["arch"], "BOOM")
    q = clamp((p - 0.06) / 0.34)
    if q > 0:
        size = 96 * (1.5 - 0.5 * ease_out(min(1, q * 1.6)))
        fnt = ImageFont.truetype(FONT_DECO, max(12, int(size)))
        tw = td.textlength(wd, font=fnt)
        # on réduit tant que ça dépasse du cadre
        while tw > W * 0.40 and size > 26:
            size *= 0.92
            fnt = ImageFont.truetype(FONT_DECO, int(size))
            tw = td.textlength(wd, font=fnt)
        a = int(255 * (1 - clamp((q - 0.55) / 0.45)))
        pos = (W * 0.955 - tw, H * 0.14 - fnt.size * 0.5)
        td.text((pos[0] + 3, pos[1] + 4), wd, font=fnt, fill=(0, 0, 0, a))
        td.text(pos, wd, font=fnt, fill=(255, 255, 255, a), stroke_width=4,
                stroke_fill=(20, 10, 30, a))
        frame = Image.alpha_composite(frame, tl)

    frame_rgb = frame.convert("RGB")
    frame_rgb = chroma(frame_rgb, lerp(10, 0, ease_out(p)))
    frame_rgb = flash(frame_rgb, max(0.0, 1 - p * 7))
    return frame_rgb


def shot_title(t, hero, art):
    p = clamp((t - START['title']) / (END['title'] - START['title']))
    z = lerp(1.06, 1.0, ease_out(p))
    frame = cover(art, W, H, zoom=z, cx=0.6, cy=0.48).convert("RGB")
    # fond sombre de chaque côté, mais le héros reste visible
    shade = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    sd = ImageDraw.Draw(shade)
    for x in range(W):
        a = int(190 * clamp(1 - x / (W * 0.72)) ** 1.3)
        sd.line((x, 0, x, H), fill=(4, 2, 8, a))
    for x in range(int(W * 0.72), W):
        a = int(70 * clamp((x - W * 0.72) / (W * 0.28)))
        sd.line((x, 0, x, H), fill=(4, 2, 8, a))
    frame = Image.alpha_composite(frame.convert("RGBA"), shade).convert("RGB")

    frame = frame.convert("RGBA")
    c = hero["rgb"]
    lay = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    d = ImageDraw.Draw(lay, "RGBA")

    # petit mot au-dessus
    f_small = ImageFont.truetype(FONT_TITLE, 15)
    x0 = W * 0.075
    a_small = int(255 * clamp((p - 0.05) / 0.15))
    draw_tracked(d, (x0, H * 0.60), "ULTIME", f_small, (c[0], c[1], c[2], a_small),
                 tracking=11, shadow=(0, 0, 0, a_small))

    # le nom, lettre par lettre — la taille s'adapte pour tenir dans la largeur
    f_big = ImageFont.truetype(FONT_DECO, 78)
    name = hero["ult"].upper()
    maxw = W * 0.47
    while f_big.getlength(name) + 2 * len(name) > maxw and f_big.size > 26:
        f_big = ImageFont.truetype(FONT_DECO, int(f_big.size * 0.94))
    x = x0
    y = H * 0.655
    for i, ch in enumerate(name):
        q = clamp((p - 0.12 - i * 0.026) / 0.16)
        if q <= 0:
            continue
        a = int(255 * q)
        dy = (1 - ease_out(q)) * 26
        if ch != " ":
            d.text((x + 3, y + dy + 4), ch, font=f_big, fill=(0, 0, 0, a))
            d.text((x, y + dy), ch, font=f_big, fill=(255, 249, 236, a))
        x += f_big.getlength(ch) + 2

    # sous-titre
    q = clamp((p - 0.42) / 0.2)
    if q > 0:
        a = int(255 * q)
        f_sub = ImageFont.truetype(FONT_TITLE, 16)
        draw_tracked(d, (x0 + 2, y + 100), f"{hero['name'].upper()} · {hero['title'].upper()}",
                     f_sub, (227, 192, 119, a), tracking=3, shadow=(0, 0, 0, a))

    frame = Image.alpha_composite(frame, lay)

    # halo derrière le texte
    fx = Image.new("RGB", (W, H), (0, 0, 0))
    g = glow(int(W * 0.8), tuple(int(v * 0.35) for v in c), power=2.4)
    fx.paste(g, (int(-W * 0.15), int(H * 0.30)), g.convert("L").point(lambda v: int(v * 0.55)))
    return screen_layer(frame.convert("RGB"), fx)


# ─────────────────────────── assemblage ────────────────────────────────────────

def render(hero_id: str, out_dir: str):
    heroes = json.load(open("/tmp/heroes.json"))
    hero = next(h for h in heroes if h["id"] == hero_id)
    hero["rgb"] = hex_rgb(hero["css"])

    art_path = f"ult_{hero_id}.webp"
    art = (load(art_path) if os.path.exists(os.path.join(ASSETS, art_path))
           else load(f"portrait_{hero_id}.webp")).convert("RGB")

    bg = load("bg_ashen_throne.webp" if hero["arch"] == "void" else "bg_shattered_citadel.webp").convert("RGB")
    hero_sil = load(f"hero_{hero_id}.webp")
    foes = [load("enemy_ghoul.webp"), load("enemy_skeleton.webp"), load("enemy_boneknight.webp")]
    lunge = load("enemy_boneknight.webp")

    seq = [f"seq_{hero_id}_{i}.webp" for i in range(4)]
    has_seq = all(os.path.exists(os.path.join(ASSETS, f)) for f in seq)
    anim_frames: list[Image.Image] = []
    if has_seq:
        keys = [load(f).convert("RGBA") for f in seq]
        dur_anim = T["anim"][1] - T["anim"][0]
        per_gap = max(4, int(round(dur_anim * FPS / 3)))
        print(f"  … animation : {per_gap} dessins entre chaque pose ({dur_anim:.1f}s à {FPS} i/s)")
        anim_frames = smoothed_anim(keys, per_gap=per_gap, lean=5.0, smear=0.09)

    for n in range(NFRAMES):
        t = n / FPS
        if t < START["wide"] or t >= END["out"]:
            seg = "out"
        elif t < START["illu"]:
            seg = "wide"
        elif t < START["white"]:
            seg = "illu"
        elif t < START["anim"]:
            seg = "white"
        elif t < START["hit"]:
            seg = "anim"
        elif t < START["title"]:
            seg = "hit"
        else:
            seg = "title"

        if seg == "wide":
            img = shot_wide(t, hero, bg, hero_sil, foes, lunge).convert("RGB")
            img = shake_frame(img, 7 * clamp(1 - t / 0.45), n)
        elif seg == "illu":
            img = shot_illustration(t, hero, art).convert("RGB")
        elif seg == "white":
            img = shot_white(t, hero, art).convert("RGB")
        elif seg == "anim":
            if anim_frames:
                img = shot_animation(t, hero, anim_frames).convert("RGB")
                beat = (t - START["anim"]) % ((T["anim"][1] - T["anim"][0]) / 3)
                img = shake_frame(img, 5 if beat < 0.04 else 0.6, n)
            else:
                img = shot_illustration(t, hero, art).convert("RGB")
        elif seg == "hit":
            img = shot_impact(t, hero, art)
            img = shake_frame(img, 16 * clamp(1 - (t - START["hit"]) / 0.32), n)
        elif seg == "title":
            img = shot_title(t, hero, art)
        else:
            img = dim(shot_title(END["title"] - 0.001, hero, art), 1 - clamp((t - END["title"]) / 0.30))

        img = finish(img, t)
        img.save(os.path.join(out_dir, f"{n:04d}.png"), compress_level=1)

    webm = os.path.join(OUT, f"ultvid_{hero_id}.webm")
    cmd = [FFMPEG, "-y", "-loglevel", "error", "-framerate", str(FPS),
           "-i", os.path.join(out_dir, "%04d.png"),
           "-c:v", "libvpx-vp9", "-b:v", "0", "-crf", "37",
           "-row-mt", "1", "-cpu-used", "4", "-pix_fmt", "yuv420p", "-an", webm]
    subprocess.run(cmd, check=True)
    return webm, has_seq


def main():
    ids = sys.argv[1:] or ["kael"]
    for hid in ids:
        tmp = tempfile.mkdtemp(prefix=f"ultvid_{hid}_")
        try:
            path, anim = render(hid, tmp)
            kb = os.path.getsize(path) / 1024
            print(f"{hid:10s} {'animé' if anim else 'fixe ':6s} {kb:7.0f} Ko  ->  {os.path.relpath(path, ROOT)}")
        finally:
            shutil.rmtree(tmp, ignore_errors=True)


if __name__ == "__main__":
    main()
