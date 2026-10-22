import { Texture } from 'pixi.js';

/** Textures générées par le code (pas d'images à charger). */

function canvas(w: number, h: number): [HTMLCanvasElement, CanvasRenderingContext2D] {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  return [c, c.getContext('2d')!];
}

/** Halo radial blanc (teinté ensuite via sprite.tint). */
export function createGlowTexture(size = 256, falloff = 2.2): Texture {
  const [c, ctx] = canvas(size, size);
  const img = ctx.createImageData(size, size);
  const r = size / 2;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const d = Math.hypot(x - r + 0.5, y - r + 0.5) / r;
      const a = d >= 1 ? 0 : Math.pow(1 - d, falloff);
      const i = (y * size + x) * 4;
      img.data[i] = img.data[i + 1] = img.data[i + 2] = 255;
      img.data[i + 3] = Math.round(a * 255);
    }
  }
  ctx.putImageData(img, 0, 0);
  return Texture.from(c);
}

/** Petite particule nette au centre (braise, étincelle). */
export function createSparkTexture(size = 32): Texture {
  const [c, ctx] = canvas(size, size);
  const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  g.addColorStop(0, 'rgba(255,255,255,1)');
  g.addColorStop(0.25, 'rgba(255,255,255,0.85)');
  g.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);
  return Texture.from(c);
}

/** Vignette sombre (bords assombris) pour donner de la profondeur à l'image. */
export function createVignetteTexture(size = 512): Texture {
  const [c, ctx] = canvas(size, size);
  const g = ctx.createRadialGradient(size / 2, size / 2, size * 0.28, size / 2, size / 2, size * 0.78);
  g.addColorStop(0, 'rgba(0,0,0,0)');
  g.addColorStop(0.65, 'rgba(0,0,0,0.28)');
  g.addColorStop(1, 'rgba(0,0,0,0.85)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);
  return Texture.from(c);
}

/** Halo de particules dorées (scintillement autour des héros). */
export function createShimmerTexture(size = 64): Texture {
  const [c, ctx] = canvas(size, size);
  const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  g.addColorStop(0, 'rgba(255,255,255,1)');
  g.addColorStop(0.3, 'rgba(255,255,255,0.5)');
  g.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);
  // croix de lumière
  ctx.strokeStyle = 'rgba(255,255,255,0.9)';
  ctx.lineWidth = size * 0.035;
  ctx.beginPath();
  ctx.moveTo(size * 0.5, size * 0.12); ctx.lineTo(size * 0.5, size * 0.88);
  ctx.moveTo(size * 0.12, size * 0.5); ctx.lineTo(size * 0.88, size * 0.5);
  ctx.stroke();
  return Texture.from(c);
}

/** Flamme stylisée (tête arrondie, pointe effilée) — teintée via sprite.tint. */
export function createFlameTexture(w = 128, h = 192): Texture {
  const [c, ctx] = canvas(w, h);
  const g = ctx.createRadialGradient(w / 2, h * 0.72, w * 0.04, w / 2, h * 0.72, h * 0.52);
  g.addColorStop(0, 'rgba(255,255,255,1)');
  g.addColorStop(0.35, 'rgba(255,255,255,0.75)');
  g.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = g;
  // silhouette en goutte : ellipse basse + pointe qui monte
  ctx.beginPath();
  ctx.moveTo(w / 2, h * 0.02);
  ctx.bezierCurveTo(w * 0.78, h * 0.42, w * 0.96, h * 0.66, w * 0.84, h * 0.86);
  ctx.bezierCurveTo(w * 0.72, h * 1.02, w * 0.28, h * 1.02, w * 0.16, h * 0.86);
  ctx.bezierCurveTo(w * 0.04, h * 0.66, w * 0.22, h * 0.42, w / 2, h * 0.02);
  ctx.fill();
  // cœur plus lumineux
  const g2 = ctx.createRadialGradient(w / 2, h * 0.76, 0, w / 2, h * 0.76, w * 0.3);
  g2.addColorStop(0, 'rgba(255,255,255,1)');
  g2.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = g2;
  ctx.fillRect(0, 0, w, h);
  return Texture.from(c);
}

/* ---------- Bruit périodique (pour une brume qui se répète sans couture) ---------- */
function makeValueNoise(period: number, seed: number) {
  const grid: number[] = [];
  let s = seed;
  const rnd = () => ((s = (s * 16807) % 2147483647) / 2147483647);
  for (let i = 0; i < period * period; i++) grid.push(rnd());
  const at = (x: number, y: number) => grid[((y % period) + period) % period * period + (((x % period) + period) % period)]!;
  const smooth = (t: number) => t * t * (3 - 2 * t);
  return (x: number, y: number): number => {
    const x0 = Math.floor(x), y0 = Math.floor(y);
    const fx = smooth(x - x0), fy = smooth(y - y0);
    const a = at(x0, y0), b = at(x0 + 1, y0), c = at(x0, y0 + 1), d = at(x0 + 1, y0 + 1);
    return a + (b - a) * fx + (c - a) * fy + (a - b - c + d) * fx * fy;
  };
}

/** Texture de brume répétable horizontalement et verticalement. */
export function createFogTexture(w = 512, h = 256, seed = 7): Texture {
  const [c, ctx] = canvas(w, h);
  const img = ctx.createImageData(w, h);
  const octaves = [4, 8, 16, 32].map((p, i) => ({ p, n: makeValueNoise(p, seed + i * 101), amp: 1 / (i + 1) ** 1.3 }));
  const ampSum = octaves.reduce((a, o) => a + o.amp, 0);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      let v = 0;
      for (const o of octaves) v += o.n((x / w) * o.p, (y / h) * o.p * (h / w) * 2) * o.amp;
      v /= ampSum;
      const a = Math.max(0, Math.min(1, (v - 0.42) * 2.6));
      const i = (y * w + x) * 4;
      img.data[i] = img.data[i + 1] = img.data[i + 2] = 255;
      img.data[i + 3] = Math.round(a * a * 255);
    }
  }
  ctx.putImageData(img, 0, 0);
  return Texture.from(c);
}

/** Bouffée de fumée douce et irrégulière. */
export function createSmokeTexture(size = 128): Texture {
  const [c, ctx] = canvas(size, size);
  for (let i = 0; i < 14; i++) {
    const x = size / 2 + (Math.random() - 0.5) * size * 0.35;
    const y = size / 2 + (Math.random() - 0.5) * size * 0.35;
    const r = size * (0.18 + Math.random() * 0.2);
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, 'rgba(255,255,255,0.22)');
    g.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }
  return Texture.from(c);
}

/** Dégradé vertical (utilisé pour assombrir le sol / l'horizon). */
export function createVerticalGradient(stops: Array<[number, string]>, h = 256): Texture {
  const [c, ctx] = canvas(4, h);
  const g = ctx.createLinearGradient(0, 0, 0, h);
  stops.forEach(([o, col]) => g.addColorStop(o, col));
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 4, h);
  return Texture.from(c);
}

/** Fonction utilitaire : remplit une texture pixel par pixel (coordonnées polaires normalisées). */
function polarTexture(size: number, fn: (r: number, a: number) => number): Texture {
  const [c, ctx] = canvas(size, size);
  const img = ctx.createImageData(size, size);
  const h = size / 2;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const dx = (x - h + 0.5) / h, dy = (y - h + 0.5) / h;
      const r = Math.hypot(dx, dy);
      const v = r >= 1 ? 0 : Math.max(0, Math.min(1, fn(r, Math.atan2(dy, dx))));
      const i = (y * size + x) * 4;
      img.data[i] = img.data[i + 1] = img.data[i + 2] = 255;
      img.data[i + 3] = Math.round(v * 255);
    }
  }
  ctx.putImageData(img, 0, 0);
  return Texture.from(c);
}

/** Spirale à plusieurs bras (vortex du portail, tourbillon de nuages). */
export const createSpiralTexture = (size = 512, arms = 3, twist = 9): Texture =>
  polarTexture(size, (r, a) => {
    const s = 0.5 + 0.5 * Math.sin(a * arms + Math.log(r + 0.02) * twist);
    const edge = Math.pow(1 - r, 0.7);
    const core = Math.min(1, r * 6);
    return Math.pow(s, 2.5) * edge * core + Math.pow(Math.max(0, 1 - r * 3), 2) * 0.8;
  });

/** Rayons de lumière (lune, cristal). */
export const createRaysTexture = (size = 512, seed = 1): Texture => {
  const ph = [seed * 1.3, seed * 2.1, seed * 0.7, seed * 3.3];
  return polarTexture(size, (r, a) => {
    const beams = Math.sin(a * 7 + ph[0]!) * 0.35 + Math.sin(a * 13 + ph[1]!) * 0.3 + Math.sin(a * 23 + ph[2]!) * 0.2 + Math.sin(a * 41 + ph[3]!) * 0.15;
    const b = Math.max(0, beams);
    return Math.pow(b, 1.6) * Math.pow(1 - r, 1.4) * Math.min(1, r * 5);
  });
};

/** Anneau lumineux (onde de choc, impulsion magique). */
export const createRingTexture = (size = 256): Texture =>
  polarTexture(size, (r) => {
    const d = Math.abs(r - 0.86) / 0.12;
    return Math.max(0, 1 - d * d);
  });

export interface FxTextures {
  glow: Texture;
  glowSoft: Texture;
  spark: Texture;
  fog: Texture;
  fogThin: Texture;
  smoke: Texture;
  spiral: Texture;
  spiralSoft: Texture;
  rays: Texture;
  ring: Texture;
  flame: Texture;
  vignette: Texture;
  shimmer: Texture;
}

export const createFxTextures = (): FxTextures => ({
  glow: createGlowTexture(256, 2.2),
  glowSoft: createGlowTexture(256, 1.3),
  spark: createSparkTexture(32),
  fog: createFogTexture(512, 256, 7),
  fogThin: createFogTexture(512, 256, 42),
  smoke: createSmokeTexture(128),
  spiral: createSpiralTexture(512, 3, 9),
  spiralSoft: createSpiralTexture(512, 4, 5),
  rays: createRaysTexture(512, 1),
  ring: createRingTexture(256),
  flame: createFlameTexture(128, 192),
  vignette: createVignetteTexture(512),
  shimmer: createShimmerTexture(64),
});
