import { Container, Sprite, type Texture } from 'pixi.js';
import { inRange, type Range } from '../utils/math';

export interface Particle {
  sprite: Sprite;
  x: number; y: number;
  vx: number; vy: number;
  life: number; maxLife: number;
  scale0: number; scale1: number;
  rot: number; vrot: number;
  seed: number;
  /** Données libres pour les comportements personnalisés. */
  data: number[];
}

export interface EmitterConfig {
  texture: Texture;
  /** Particules par seconde. */
  rate: number;
  max: number;
  life: Range;
  /** Zone d'apparition (rectangle) ou point si w/h = 0. */
  area: { x: number; y: number; w?: number; h?: number };
  vx?: Range;
  vy?: Range;
  ax?: number;
  ay?: number;
  /** Ondulation horizontale (amplitude px/s, fréquence). */
  wobble?: { amp: number; freq: number };
  scale: { start: Range; end: Range };
  alpha?: number;
  tint?: number | readonly number[];
  blend?: 'add' | 'normal' | 'screen';
  rotation?: Range;
  /** Position initiale personnalisée. */
  spawn?: (p: Particle) => void;
  /** Mouvement personnalisé (remplace la physique par défaut si retourne true). */
  behavior?: (p: Particle, dt: number) => boolean;
}

/**
 * Système de particules léger avec réutilisation des sprites (pool),
 * suffisant pour les braises, la fumée, les poussières magiques…
 */
export class ParticleEmitter {
  readonly container = new Container();
  private readonly alive: Particle[] = [];
  private readonly pool: Particle[] = [];
  private acc = 0;
  enabled = true;
  rateMultiplier = 1;

  constructor(private readonly cfg: EmitterConfig) {
    if (cfg.blend) this.container.blendMode = cfg.blend;
  }

  /** Modifie la zone d'apparition (ex. après un redimensionnement). */
  setArea(area: EmitterConfig['area']): void {
    this.cfg.area = area;
  }

  /** Remplit l'écran immédiatement (évite l'effet « vide » au démarrage). */
  prewarm(seconds: number, step = 1 / 30): void {
    for (let t = 0; t < seconds; t += step) this.update(step);
  }

  /** Décale toutes les particules (pour le parallaxe des couches en espace écran). */
  shift(dx: number, dy = 0): void {
    for (const p of this.alive) { p.x += dx; p.y += dy; }
  }

  update(dt: number): void {
    const c = this.cfg;
    if (this.enabled) {
      this.acc += dt * c.rate * this.rateMultiplier;
      while (this.acc >= 1 && this.alive.length < c.max) {
        this.acc -= 1;
        this.spawn();
      }
      if (this.alive.length >= c.max) this.acc = 0;
    }

    for (let i = this.alive.length - 1; i >= 0; i--) {
      const p = this.alive[i]!;
      p.life += dt;
      if (p.life >= p.maxLife) {
        this.recycle(i);
        continue;
      }
      if (!c.behavior?.(p, dt)) {
        p.vx += (c.ax ?? 0) * dt;
        p.vy += (c.ay ?? 0) * dt;
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        if (c.wobble) p.x += Math.sin(p.life * c.wobble.freq + p.seed) * c.wobble.amp * dt;
      }
      const t = p.life / p.maxLife;
      // Apparition puis disparition en douceur.
      const fade = t < 0.15 ? t / 0.15 : t > 0.6 ? 1 - (t - 0.6) / 0.4 : 1;
      p.rot += p.vrot * dt;
      const s = p.scale0 + (p.scale1 - p.scale0) * t;
      p.sprite.position.set(p.x, p.y);
      p.sprite.scale.set(s);
      p.sprite.rotation = p.rot;
      p.sprite.alpha = fade * (c.alpha ?? 1);
    }
  }

  /** Émet d'un coup `count` particules en (x, y) — explosions, étincelles d'enclume… */
  burst(count: number, x: number, y: number, tint?: number): void {
    for (let i = 0; i < count; i++) this.spawn(x, y, tint);
  }

  private spawn(atX?: number, atY?: number, tint?: number): void {
    const c = this.cfg;
    const p = this.pool.pop() ?? this.create();
    p.x = atX ?? c.area.x + Math.random() * (c.area.w ?? 0);
    p.y = atY ?? c.area.y + Math.random() * (c.area.h ?? 0);
    p.vx = c.vx ? inRange(c.vx) : 0;
    p.vy = c.vy ? inRange(c.vy) : 0;
    p.life = 0;
    p.maxLife = inRange(c.life);
    p.scale0 = inRange(c.scale.start);
    p.scale1 = inRange(c.scale.end);
    p.rot = Math.random() * Math.PI * 2;
    p.vrot = c.rotation ? inRange(c.rotation) : 0;
    p.seed = Math.random() * 1000;
    p.data.length = 0;
    if (Array.isArray(c.tint)) p.sprite.tint = c.tint[Math.floor(Math.random() * c.tint.length)]!;
    else if (typeof c.tint === 'number') p.sprite.tint = c.tint;
    if (tint !== undefined) p.sprite.tint = tint;
    c.spawn?.(p);
    p.sprite.alpha = 0;
    p.sprite.visible = true;
    this.alive.push(p);
  }

  private create(): Particle {
    const sprite = new Sprite(this.cfg.texture);
    sprite.anchor.set(0.5);
    this.container.addChild(sprite);
    return { sprite, x: 0, y: 0, vx: 0, vy: 0, life: 0, maxLife: 1, scale0: 1, scale1: 1, rot: 0, vrot: 0, seed: 0, data: [] };
  }

  private recycle(index: number): void {
    const p = this.alive[index]!;
    p.sprite.visible = false;
    this.alive[index] = this.alive[this.alive.length - 1]!;
    this.alive.pop();
    this.pool.push(p);
  }
}
