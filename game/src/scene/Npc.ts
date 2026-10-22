import { Container, Graphics, Point, Rectangle, Sprite, type Texture } from 'pixi.js';
import { rand } from '../utils/math';

export interface NpcPath {
  from: readonly [number, number];
  to: readonly [number, number];
  /** Vitesse de marche (px monde / s). */
  speed: number;
  /** Pause aux extrémités (s). */
  pause: readonly [number, number];
}

export interface NpcDef {
  texture: Texture;
  /** Position des pieds (monde). */
  x: number;
  y: number;
  /** Hauteur affichée (px monde). */
  height: number;
  /** Le dessin d'origine regarde-t-il vers la droite ? */
  facesRight: boolean;
  path?: NpcPath;
  /** Amplitude de la respiration. */
  breathe?: number;
  /** −1 : retourne le dessin (personnage immobile regardant à gauche). */
  face?: 1 | -1;
  /** Couleur d'aura au sol (héros importants). */
  aura?: number;
  /** Intensité de l'aura (0…1). */
  auraAlpha?: number;
}

/**
 * Personnage d'ambiance : respiration, marche avec balancement, demi-tour, ombre au sol.
 * Les sprites « attachés » (lanterne, yeux…) suivent le personnage via `attach`.
 */
export class Npc {
  readonly root = new Container();
  readonly sprite: Sprite;
  private readonly shadow: Graphics;
  private readonly baseScale: number;
  private t = Math.random() * 10;
  private progress = 0;
  private dir: 1 | -1 = 1;
  private pauseLeft = rand(0.5, 2);
  private walking = false;
  private squash = 0;
  private halo: Graphics | null = null;
  private aura: Graphics | null = null;
  private auraBase = 0.5;
  private hovered = false;
  private readonly attachments: Array<{ sprite: Container; nx: number; ny: number }> = [];

  constructor(private readonly def: NpcDef) {
    this.sprite = new Sprite(def.texture);
    this.sprite.anchor.set(0.5, 1);
    this.baseScale = def.height / def.texture.height;
    // Ombre douce : plusieurs ellipses concentriques au lieu d'une tache opaque.
    const sw = def.texture.width * this.baseScale * 0.46;
    this.shadow = new Graphics()
      .ellipse(0, 0, sw, 14).fill({ color: 0x000000, alpha: 0.06 })
      .ellipse(0, 0, sw * 0.78, 11).fill({ color: 0x000000, alpha: 0.1 })
      .ellipse(0, 0, sw * 0.55, 8).fill({ color: 0x000000, alpha: 0.16 })
      .ellipse(0, 0, sw * 0.32, 5).fill({ color: 0x000000, alpha: 0.2 });
    this.root.addChild(this.shadow);
    // Aura colorée au sol (héros)
    if (def.aura !== undefined) {
      this.aura = new Graphics()
        .ellipse(0, 0, sw * 0.9, 20).fill({ color: def.aura, alpha: 0.1 })
        .ellipse(0, 0, sw * 0.6, 13).fill({ color: def.aura, alpha: 0.14 })
        .ellipse(0, 0, sw * 0.34, 8).fill({ color: def.aura, alpha: 0.22 });
      this.aura.blendMode = 'add';
      this.auraBase = def.auraAlpha ?? 0.55;
      this.aura.alpha = this.auraBase;
      this.root.addChild(this.aura);
    }
    this.root.addChild(this.sprite);
    this.root.position.set(def.x, def.y);
    this.root.eventMode = 'none';
  }

  /** Rend le personnage cliquable (zone resserrée sur le corps) avec un halo au sol au survol. */
  makeInteractive(onTap: () => void, canTap: () => boolean): void {
    const tw = this.def.texture.width, th = this.def.texture.height;
    const halo = new Graphics()
      .ellipse(0, 0, tw * this.baseScale * 0.5, 22).fill({ color: 0xffc46a, alpha: 0.18 })
      .ellipse(0, 0, tw * this.baseScale * 0.36, 13).stroke({ color: 0xffd98a, width: 3, alpha: 0.8 });
    halo.blendMode = 'add';
    halo.alpha = 0;
    this.halo = halo;
    this.root.addChildAt(halo, 1);
    this.root.eventMode = 'passive';
    const s = this.sprite;
    s.eventMode = 'static';
    s.cursor = 'pointer';
    s.hitArea = new Rectangle(-tw * 0.26, -th * 0.9, tw * 0.52, th * 0.9);
    s.on('pointerover', () => { this.hovered = true; });
    s.on('pointerout', () => { this.hovered = false; });
    s.on('pointertap', () => { if (!canTap()) return; this.punch(); onTap(); });
  }

  /** Point au-dessus de la tête, en coordonnées écran. */
  headGlobal(): { x: number; y: number } {
    const p = this.sprite.toGlobal(new Point(0, -this.def.texture.height * 0.96));
    return { x: p.x, y: p.y };
  }

  /** Attache un élément à un point du dessin (coordonnées normalisées 0…1 dans la texture). */
  attach(sprite: Container, nx: number, ny: number): void {
    this.attachments.push({ sprite, nx, ny });
  }

  /** Petit écrasement (coup de marteau, sursaut…). */
  punch(amount = 1): void {
    this.squash = amount;
  }

  get feet(): { x: number; y: number } {
    return { x: this.root.x, y: this.root.y };
  }

  update(dt: number): void {
    this.t += dt;
    const d = this.def;
    let bob = 0;
    let sway = 0;

    if (d.path) {
      const p = d.path;
      const len = Math.hypot(p.to[0] - p.from[0], p.to[1] - p.from[1]);
      if (this.pauseLeft > 0) {
        this.pauseLeft -= dt;
        this.walking = false;
      } else {
        this.walking = true;
        this.progress += (this.dir * p.speed * dt) / len;
        if (this.progress >= 1 || this.progress <= 0) {
          this.progress = Math.max(0, Math.min(1, this.progress));
          this.dir = this.dir === 1 ? -1 : 1;
          this.pauseLeft = rand(p.pause[0], p.pause[1]);
        }
      }
      this.root.x = p.from[0] + (p.to[0] - p.from[0]) * this.progress;
      this.root.y = p.from[1] + (p.to[1] - p.from[1]) * this.progress;
      if (this.walking) {
        const step = this.t * p.speed * 0.09;
        bob = -Math.abs(Math.sin(step)) * 5;
        sway = Math.sin(step) * 0.035;
      }
    }

    // Orientation selon le sens de marche.
    const movingRight = d.path ? (p2(d.path) ? this.dir === 1 : this.dir === -1) : d.facesRight;
    const flip = (movingRight === d.facesRight ? 1 : -1) * (d.face ?? 1);

    // Respiration : deux sinus superposés pour un rythme moins mécanique.
    const breathe = 1 + (Math.sin(this.t * 2.1) + Math.sin(this.t * 3.7 + 1.1) * 0.35) * (d.breathe ?? 0.012);
    this.squash = Math.max(0, this.squash - dt * 5);
    const sq = Math.sin(this.squash * Math.PI) * 0.06;
    this.sprite.scale.set(this.baseScale * flip * (1 + sq), this.baseScale * breathe * (1 - sq));
    this.sprite.y = bob;
    this.sprite.rotation = sway;

    if (this.aura) {
      const pulse = 0.85 + Math.sin(this.t * 1.6) * 0.15;
      const boost = this.hovered ? 1.45 : 1;
      this.aura.alpha = this.auraBase * pulse * boost;
      const sc = 1 + Math.sin(this.t * 1.6) * 0.05;
      this.aura.scale.set(sc, sc);
    }

    if (this.halo) {
      const target = this.hovered ? 1 : 0;
      this.halo.alpha += (target - this.halo.alpha) * Math.min(1, dt * 10);
      this.halo.scale.set(1 + Math.sin(this.t * 4) * 0.04);
    }

    for (const a of this.attachments) {
      const w = d.texture.width * this.baseScale;
      const h = d.texture.height * this.baseScale;
      a.sprite.x = this.root.x + (a.nx - 0.5) * w * flip;
      a.sprite.y = this.root.y + bob - (1 - a.ny) * h * breathe;
    }
  }
}

/** Le chemin va-t-il de gauche à droite ? */
function p2(path: NpcPath): boolean {
  return path.to[0] >= path.from[0];
}
