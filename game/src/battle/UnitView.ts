import { Container, Graphics, Mesh, MeshGeometry, Sprite, Texture } from 'pixi.js';
import type { FxTextures } from '../fx/textures';
import { clamp } from '../utils/math';
import type { BattleTextures } from './battleTextures';
import { RigMesh, resetPose, restPose, type Pose } from './RigMesh';
import { RIGS, type RigDef } from './rigs';
import { FIELD, type Unit } from './Sim';

/** Les combattants plus proches de l'écran (plus bas) paraissent un peu plus grands → profondeur 2.5D. */
export const depthScale = (y: number): number => 0.86 + clamp((y - FIELD.minY) / (FIELD.maxY - FIELD.minY), 0, 1) * 0.2;

/* ---------- Courbes d'animation ---------- */

type Ease = 'lin' | 'out' | 'in' | 'io' | 'snap';
type Key = readonly [number, number, Ease?];
const easeF: Record<Ease, (x: number) => number> = {
  lin: (x) => x,
  out: (x) => 1 - Math.pow(1 - x, 3),
  in: (x) => x * x * x,
  io: (x) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2),
  snap: (x) => 1 - Math.pow(1 - x, 6),
};
/** Interpole une suite d'images clés [temps 0…1, valeur, easing du segment qui y mène]. */
function kf(k: number, keys: readonly Key[]): number {
  if (k <= keys[0]![0]) return keys[0]![1];
  for (let i = 1; i < keys.length; i++) {
    const [t1, v1, e] = keys[i]!;
    const [t0, v0] = keys[i - 1]!;
    if (k <= t1) return v0 + (v1 - v0) * easeF[e ?? 'io']((k - t0) / Math.max(1e-6, t1 - t0));
  }
  return keys[keys.length - 1]![1];
}

type Channel = 'spine' | 'head' | 'main' | 'off' | 'draw' | 'drawDx' | 'crouch' | 'lunge' | 'lift';
type Clip = { dur: number; strike: number; keys: Partial<Record<Channel, readonly Key[]>> };

/**
 * Clips d'attaque : élan (anticipation) → frappe très rapide → retour.
 * `strike` = moment (0…1) où le coup touche, synchronisé avec la simulation.
 */
const CLIPS: Record<string, Clip> = {
  heavy: {
    dur: 0.62, strike: 0.42,
    keys: {
      spine: [[0, 0], [0.34, -0.22, 'out'], [0.44, 0.3, 'snap'], [0.62, 0.24], [1, 0]],
      main: [[0, 0], [0.34, -0.8, 'out'], [0.44, 0.55, 'snap'], [0.62, 0.48], [1, 0]],
      off: [[0, 0], [0.34, 0.15, 'out'], [0.44, -0.12, 'snap'], [1, 0]],
      head: [[0, 0], [0.34, -0.1, 'out'], [0.44, 0.12, 'snap'], [1, 0]],
      crouch: [[0, 0], [0.34, 0.4, 'out'], [0.44, 0.08, 'snap'], [0.62, 0.15], [1, 0]],
      lunge: [[0, 0], [0.34, -14, 'out'], [0.44, 56, 'snap'], [0.62, 50], [1, 0]],
    },
  },
  fast: {
    dur: 0.36, strike: 0.42,
    keys: {
      spine: [[0, 0], [0.3, -0.1, 'out'], [0.45, 0.3, 'snap'], [1, 0]],
      main: [[0, 0], [0.3, -0.55, 'out'], [0.45, 0.6, 'snap'], [1, 0]],
      head: [[0, 0], [0.3, -0.05, 'out'], [0.45, 0.08, 'snap'], [1, 0]],
      crouch: [[0, 0], [0.3, 0.3, 'out'], [0.45, 0.15, 'snap'], [1, 0]],
      lunge: [[0, 0], [0.3, -8, 'out'], [0.45, 64, 'snap'], [1, 0]],
    },
  },
  fastAlt: {
    dur: 0.36, strike: 0.42,
    keys: {
      spine: [[0, 0], [0.3, -0.06, 'out'], [0.45, 0.34, 'snap'], [1, 0]],
      off: [[0, 0], [0.3, -0.35, 'out'], [0.45, 0.7, 'snap'], [1, 0]],
      main: [[0, 0], [0.3, 0.2, 'out'], [0.45, -0.25, 'snap'], [1, 0]],
      crouch: [[0, 0], [0.3, 0.35, 'out'], [0.45, 0.1, 'snap'], [1, 0]],
      lunge: [[0, 0], [0.3, -6, 'out'], [0.45, 70, 'snap'], [1, 0]],
    },
  },
  claw: {
    dur: 0.55, strike: 0.42,
    keys: {
      spine: [[0, 0], [0.34, -0.26, 'out'], [0.45, 0.38, 'snap'], [1, 0]],
      main: [[0, 0], [0.34, -0.6, 'out'], [0.45, 0.5, 'snap'], [1, 0]],
      off: [[0, 0], [0.34, -0.45, 'out'], [0.5, 0.5, 'snap'], [1, 0]],
      head: [[0, 0], [0.34, -0.22, 'out'], [0.45, 0.18, 'snap'], [1, 0]],
      crouch: [[0, 0], [0.34, 0.45, 'out'], [0.45, 0.05, 'snap'], [1, 0]],
      lunge: [[0, 0], [0.34, -16, 'out'], [0.45, 76, 'snap'], [1, 0]],
    },
  },
  bow: {
    dur: 0.5, strike: 0.44,
    keys: {
      drawDx: [[0, 0], [0.42, -0.075, 'out'], [0.47, 0.025, 'snap'], [1, 0]],
      draw: [[0, 0], [0.42, -0.06, 'out'], [0.47, 0.04, 'snap'], [1, 0]],
      main: [[0, 0], [0.42, -0.03, 'out'], [0.48, -0.13, 'snap'], [1, 0]],
      spine: [[0, 0], [0.42, -0.07, 'out'], [0.52, -0.12, 'snap'], [1, 0]],
      head: [[0, 0], [0.42, 0.05, 'out'], [1, 0]],
      crouch: [[0, 0], [0.42, 0.12, 'out'], [1, 0]],
      lunge: [[0, 0], [0.47, 0], [0.55, -10, 'snap'], [1, 0]],
    },
  },
  cast: {
    dur: 0.55, strike: 0.33,
    keys: {
      main: [[0, 0], [0.28, -0.5, 'out'], [0.38, 0.28, 'snap'], [1, 0]],
      off: [[0, 0], [0.28, 0.12, 'out'], [0.38, -0.08, 'snap'], [1, 0]],
      spine: [[0, 0], [0.28, -0.12, 'out'], [0.38, 0.14, 'snap'], [1, 0]],
      head: [[0, 0], [0.28, -0.12, 'out'], [0.38, 0.06, 'snap'], [1, 0]],
      crouch: [[0, 0], [0.28, 0.2, 'out'], [0.38, -0.08, 'snap'], [1, 0]],
      lunge: [[0, 0], [0.38, 14, 'snap'], [1, 0]],
    },
  },
  light: {
    dur: 0.55, strike: 0.33,
    keys: {
      main: [[0, 0], [0.28, -0.45, 'out'], [0.38, 0.35, 'snap'], [1, 0]],
      off: [[0, 0], [0.28, -0.12, 'out'], [0.38, 0.08, 'snap'], [1, 0]],
      spine: [[0, 0], [0.28, -0.1, 'out'], [0.38, 0.12, 'snap'], [1, 0]],
      head: [[0, 0], [0.28, -0.1, 'out'], [0.38, 0.04, 'snap'], [1, 0]],
      crouch: [[0, 0], [0.28, 0.15, 'out'], [0.38, -0.05, 'snap'], [1, 0]],
      lunge: [[0, 0], [0.38, 10, 'snap'], [1, 0]],
    },
  },
};

/**
 * Affichage d'un combattant : maillage animé par un squelette 2D, ombre, barre de vie, statuts
 * (bouclier, provocation, étourdissement, rage…) et toutes les animations du combat.
 */
export class UnitView {
  readonly root = new Container();
  readonly body = new Container();
  readonly rig: RigMesh;
  readonly texture: Texture;
  private readonly shadow: Sprite;
  private readonly aura: Sprite;
  private readonly shieldBubble: Sprite;
  private readonly tauntRing: Sprite;
  private readonly sanctuary: Sprite;
  private readonly stunStars: Sprite[] = [];
  /** Gangue de glace (créée au premier gel) et anneau de hâte. */
  private ice: Container | null = null;
  private iceK = 0;
  private readonly hasteRing: Sprite;
  private readonly bt: BattleTextures;
  /** Barre de vie : cadre dessiné une fois + rectangles redimensionnés (rien n'est redessiné en combat). */
  private readonly bar = new Container();
  private readonly barW: number;
  private readonly barGhost: Sprite;
  private readonly barHp: Sprite;
  private readonly barShine: Sprite;
  private readonly barShield: Sprite;
  private readonly barEnergy: Sprite | null;
  /** Images rémanentes : géométries réutilisées. */
  private readonly ghostGeos: MeshGeometry[] = [];
  readonly baseScale: number;
  private readonly baseTint: number;
  private readonly baseAlpha: number;
  private readonly shadowScale: number;
  readonly style: RigDef['style'];
  private readonly pose: Pose = restPose();

  private t = Math.random() * 10;
  private action: { clip: Clip; t: number } | null = null;
  private altSwing = false;
  private channelT = 0;
  private channelHold = 0;
  private flashT = 0;
  private hitT = 0;
  private hitHeavy = 1;
  private deathT = -1;
  private spawnT = 0;
  private walk = 0;
  private walkPhase = 0;
  private lastX: number;
  private lastY: number;
  private ghostBar = 1;
  private victoryT = -1;
  /** 0 = normal, 1 = assombri (pendant la cinématique d'un autre héros). */
  dimK = 0;
  /** Passe devant tout le monde (héros mis en avant pendant son ultime). */
  front = false;
  private dimCur = 0;
  /** Silhouette noire (images d'impact façon anime). */
  silhouette = false;
  /** Teinte forcée temporaire (rouge du flash d'impact, etc.). */
  private flashTint = 0xffffff;
  /** Appelé quand le corps se dissout (pour les particules). */
  onDissolve: ((v: UnitView) => void) | null = null;
  private dissolved = false;
  /** Retirée de la scène une fois l'animation de mort terminée. */
  gone = false;

  constructor(readonly unit: Unit, texture: Texture, bt: BattleTextures, fx: FxTextures) {
    this.bt = bt;
    this.hasteRing = new Sprite(fx.ring);
    this.hasteRing.anchor.set(0.5);
    this.hasteRing.tint = 0x6ad8ff;
    this.hasteRing.blendMode = 'add';
    this.hasteRing.visible = false;
    const def = unit.def;
    this.texture = texture;
    const rig = RIGS[def.texture];
    this.style = unit.isSummon ? 'fast' : rig.style;
    this.baseScale = def.height / texture.height;
    this.baseTint = unit.isSummon ? 0x8affd8 : 0xffffff;
    this.baseAlpha = unit.isSummon ? 0.85 : 1;
    this.rig = new RigMesh(texture, rig, def.facesRight);

    this.shadow = new Sprite(bt.shadow);
    this.shadow.anchor.set(0.5);
    this.shadow.width = Math.min(texture.width, texture.height * 1.1) * this.baseScale * 0.8;
    this.shadow.height = 36 * (def.height / 220);
    this.shadowScale = this.shadow.scale.x;

    this.tauntRing = new Sprite(fx.ring);
    this.tauntRing.anchor.set(0.5);
    this.tauntRing.tint = 0xff3a2a;
    this.tauntRing.blendMode = 'add';
    this.tauntRing.visible = false;

    this.sanctuary = new Sprite(fx.glowSoft);
    this.sanctuary.anchor.set(0.5);
    this.sanctuary.tint = 0xffd36a;
    this.sanctuary.blendMode = 'add';
    this.sanctuary.visible = false;

    this.aura = new Sprite(fx.glowSoft);
    this.aura.anchor.set(0.5);
    this.aura.blendMode = 'add';
    this.aura.alpha = 0;
    this.aura.position.set(0, -def.height * 0.5);
    this.aura.width = def.height * 1.4;
    this.aura.height = def.height * 1.6;

    this.rig.mesh.tint = this.baseTint;
    this.rig.mesh.alpha = this.baseAlpha;
    if (unit.isSummon) { this.rig.flash.alpha = 0.3; this.rig.flash.tint = 0x5affc0; }

    this.shieldBubble = new Sprite(fx.glow);
    this.shieldBubble.anchor.set(0.5);
    this.shieldBubble.tint = 0xff9a3a;
    this.shieldBubble.blendMode = 'add';
    this.shieldBubble.visible = false;
    this.shieldBubble.position.set(0, -def.height * 0.5);

    for (let i = 0; i < 3; i++) {
      const s = new Sprite(bt.star);
      s.anchor.set(0.5);
      s.tint = 0xffe066;
      s.blendMode = 'add';
      s.visible = false;
      this.stunStars.push(s);
    }

    // ---- Barre de vie ----
    const bw = (this.barW = unit.isBoss ? 150 : unit.isSummon ? 70 : 104);
    const bh = unit.isBoss ? 12 : 9;
    const frame = new Graphics();
    frame.roundRect(-bw / 2 - 2, -2, bw + 4, bh + 4, 4).fill({ color: 0x07040c, alpha: 0.85 }).stroke({ color: unit.isBoss ? 0xd8b45a : 0x000000, width: 1.5, alpha: 0.9 });
    if (unit.hero) frame.roundRect(-bw / 2 - 2, bh + 3, bw + 4, 6, 3).fill({ color: 0x07040c, alpha: 0.85 });
    const rect = (color: number, alpha: number, y: number, h: number): Sprite => {
      const r = new Sprite(Texture.WHITE);
      r.tint = color;
      r.alpha = alpha;
      r.position.set(-bw / 2, y);
      r.height = h;
      return r;
    };
    this.barGhost = rect(0xffe08a, 1, 0, bh);
    this.barHp = rect(unit.side === 'enemy' ? 0xe0344a : unit.isSummon ? 0x6affc8 : 0x52d468, 1, 0, bh);
    this.barShine = rect(0xffffff, 0.22, 0, bh * 0.4);
    this.barShield = rect(0xffffff, 0.75, 0, bh);
    this.barEnergy = unit.hero ? rect(0xe0a83a, 1, bh + 4, 4) : null;
    this.bar.addChild(frame, this.barGhost, this.barHp, this.barShine, this.barShield);
    if (this.barEnergy) this.bar.addChild(this.barEnergy);

    this.body.addChild(this.aura, this.rig.mesh, this.rig.flash, this.shieldBubble);
    this.root.addChild(this.shadow, this.tauntRing, this.sanctuary, this.hasteRing, this.body, ...this.stunStars, this.bar);
    this.root.position.set(unit.x, unit.y);
    this.lastX = unit.x;
    this.lastY = unit.y;
    this.root.eventMode = 'none';
  }

  /* -------- Déclencheurs d'animation -------- */

  attack(): void {
    const u = this.unit;
    let name: string = this.style;
    if (u.ranged && name !== 'bow' && name !== 'cast' && name !== 'light') name = 'cast';
    if (!u.ranged && name === 'bow') name = 'fast';
    if (name === 'fast') { name = this.altSwing ? 'fastAlt' : 'fast'; this.altSwing = !this.altSwing; }
    this.action = { clip: CLIPS[name]!, t: 0 };
  }
  hit(heavy = false): void { this.flashT = 1; this.hitT = 1; this.hitHeavy = heavy ? 1.7 : 1; this.flashTint = 0xffffff; }
  /** Pose d'incantation (bras levés, aura) pendant `hold` secondes. */
  cast(color: number, hold = 0.45): void { this.channelT = Math.max(this.channelT, 0.001); this.channelHold = hold; this.aura.tint = color; }
  die(): void { if (this.deathT < 0) this.deathT = 0; }
  spawnIn(): void { this.spawnT = 1; }
  cheer(): void { if (this.victoryT < 0) this.victoryT = Math.random() * 0.4; }
  get isDead(): boolean { return this.deathT >= 0; }

  /** Point visé (poitrine), en coordonnées du terrain. */
  get chest(): { x: number; y: number } {
    return { x: this.unit.x, y: this.unit.y - this.unit.def.height * depthScale(this.unit.y) * 0.55 };
  }
  /** Sommet de la tête (pour la caméra des cinématiques). */
  get head(): { x: number; y: number } {
    return { x: this.unit.x, y: this.unit.y - this.unit.def.height * depthScale(this.unit.y) * 0.85 };
  }

  /** Copie figée du dessin déformé (images rémanentes des dashs). */
  snapshot(): Mesh {
    const g = this.rig.geometry;
    let geo = this.ghostGeos.pop();
    if (geo) {
      geo.positions.set(g.positions);
      geo.getBuffer('aPosition').update();
    } else geo = new MeshGeometry({ positions: g.positions.slice(), uvs: g.uvs, indices: g.indices });
    const m = new Mesh({ geometry: geo, texture: this.texture });
    // Mesh.destroy() ne libère jamais la géométrie : on la récupère pour la prochaine image rémanente.
    const pooled = geo;
    m.once('destroyed', () => { if (this.ghostGeos.length < 12 && !this.destroyed) this.ghostGeos.push(pooled); else pooled.destroy(); });
    const ds = this.root.scale.x;
    const c = Math.cos(this.root.rotation), s = Math.sin(this.root.rotation);
    m.position.set(this.root.x + (this.body.x * c - this.body.y * s) * ds, this.root.y + (this.body.x * s + this.body.y * c) * ds);
    m.rotation = this.body.rotation;
    m.scale.set(this.rig.mesh.scale.x * ds, this.rig.mesh.scale.y * ds);
    return m;
  }

  /** `realDt` : temps réel (les fondus d'interface ne doivent pas se figer pendant les ralentis). */
  update(dt: number, realDt = dt): void {
    const u = this.unit;
    const def = u.def;
    // Gelé : l'animation s'arrête net (la pose reste figée dans la glace)
    const frozen = u.frozen && u.alive;
    this.t += frozen ? 0 : dt;
    const p = this.pose;
    resetPose(p);

    // Position et profondeur
    const moved = Math.hypot(u.x - this.lastX, u.y - this.lastY);
    const speed = dt > 0 ? moved / dt : 0;
    const walking = speed > 30 && !u.leap && !(u.untargetable && u.hero?.id === 'lyra');
    this.walk = clamp(this.walk + (walking ? dt * 7 : -dt * 6), 0, 1);
    this.lastX = u.x;
    this.lastY = u.y;
    this.root.position.set(u.x, u.y);
    this.root.zIndex = u.y + (u.leap ? 400 : 0) + (this.front ? 5000 : 0);
    this.root.scale.set(depthScale(u.y));

    const faceRight = u.facing === 1;
    const flip = faceRight === def.facesRight ? 1 : -1;

    let ox = 0, oy = 0, rot = 0;
    const tt = this.t;
    const heavyBody = u.isBoss ? 0.6 : 1;

    // ---- Repos : respiration, balancement, tissus ----
    p.spine = Math.sin(tt * 1.7) * 0.022 * heavyBody;
    p.head = Math.sin(tt * 1.3 + 1) * 0.035;
    p.main = Math.sin(tt * 1.7 + 0.6) * 0.04;
    p.off = Math.sin(tt * 1.5 + 2) * 0.035;
    p.draw = Math.sin(tt * 1.6 + 1) * 0.02;
    p.breathe = Math.sin(tt * 2.4) * (u.enraged ? 0.03 : 0.014);
    p.crouch = (1 + Math.sin(tt * 1.7)) * 0.025;
    p.cloth = 1;
    p.wind = 0.3 + Math.sin(tt * 0.7) * 0.3;

    // ---- Course ----
    if (this.walk > 0) {
      const w = this.walk;
      this.walkPhase += dt * (u.isBoss ? 7 : 10.5) * (0.6 + 0.4 * w);
      const ph = this.walkPhase;
      p.stride = Math.sin(ph) * w;
      p.spine += 0.15 * w;
      p.head -= 0.05 * w;
      p.crouch += (0.08 + Math.abs(Math.cos(ph)) * 0.1) * w;
      p.main += Math.sin(ph) * 0.12 * w;
      p.off -= Math.sin(ph) * 0.1 * w;
      p.cloth += 1.4 * w;
      p.wind += 0.9 * w;
      oy -= Math.abs(Math.sin(ph)) * 9 * w;
      rot += Math.sin(ph) * 0.025 * w;
    }

    // ---- Attaque (élan → frappe → retour) ----
    if (this.action) {
      const a = this.action;
      a.t += dt;
      const k = a.t / a.clip.dur;
      const K = a.clip.keys;
      const get = (c: Channel): number => (K[c] ? kf(k, K[c]!) : 0);
      p.spine += get('spine');
      p.head += get('head');
      p.main += get('main');
      p.off += get('off');
      p.draw += get('draw');
      p.drawDx += get('drawDx');
      p.crouch += get('crouch');
      ox += u.facing * get('lunge');
      p.cloth += 1.2;
      if (k >= 1) this.action = null;
    }

    // ---- Incantation (compétences, ultimes) ----
    if (this.channelT > 0) {
      this.channelT += dt;
      const inK = Math.min(1, this.channelT / 0.16);
      const outK = this.channelT > this.channelHold ? Math.max(0, 1 - (this.channelT - this.channelHold) / 0.3) : 1;
      const w = easeF.out(inK) * outK;
      p.main += -0.6 * w;
      p.off += -0.35 * w;
      p.spine += -0.13 * w;
      p.head += -0.14 * w;
      p.crouch += -0.12 * w;
      p.cloth += 2.2 * w;
      p.wind += 1.2 * w;
      oy -= 10 * w;
      this.aura.alpha = 0.85 * w;
      this.aura.scale.set((def.height * 1.4 / 256) * (1 + Math.sin(tt * 12) * 0.05));
      if (outK <= 0) this.channelT = 0;
    } else if (u.enraged && u.alive) {
      this.aura.tint = 0xff2040;
      this.aura.alpha = 0.35 + Math.sin(tt * 6) * 0.15;
    } else {
      this.aura.alpha = Math.max(0, this.aura.alpha - dt * 3);
    }

    // ---- Bond (ultime de Kael) ----
    if (u.leap) {
      const k = u.leap.t / u.leap.dur;
      oy -= Math.sin(k * Math.PI) * u.leap.height;
      p.crouch += k < 0.12 ? 0.55 : k > 0.88 ? 0.5 : 0.35;
      p.spine += k > 0.85 ? 0.45 : 0.12;
      p.main += k > 0.82 ? 0.65 : -1.15 * Math.sin(Math.min(1, k / 0.8) * Math.PI * 0.5);
      p.off += -0.2;
      p.cloth += 3;
      p.wind += 2;
      rot += u.facing * (k < 0.5 ? -0.12 : 0.18) * Math.sin(k * Math.PI);
    }

    // ---- Danse écarlate / intouchable : posture de dash ----
    if (u.untargetable && !u.leap) {
      p.spine += 0.38;
      p.main += 0.5;
      p.off += 0.45;
      p.crouch += 0.4;
      p.stride += 0.9;
      p.cloth += 3;
      p.wind += 2.5;
    }

    // ---- Impact reçu ----
    if (this.hitT > 0) {
      this.hitT = Math.max(0, this.hitT - dt / (0.32 * Math.sqrt(this.hitHeavy)));
      const e = Math.pow(this.hitT, 1.6) * this.hitHeavy * (u.isBoss ? 0.5 : 1);
      p.spine -= 0.22 * e;
      p.head -= 0.32 * e;
      p.main += 0.15 * e;
      p.off += 0.1 * e;
      p.crouch += 0.15 * e;
      ox -= u.facing * 16 * e;
      rot -= u.facing * 0.04 * e;
    }

    // ---- Étourdi ----
    if (u.stun > 0 && u.alive && !frozen) {
      p.spine += Math.sin(tt * 5) * 0.1 + 0.05;
      p.head += Math.sin(tt * 6.5) * 0.22 + 0.15;
      p.crouch += 0.28;
      p.main += 0.25;
      p.off += 0.15;
      rot += Math.sin(tt * 5) * 0.03;
    }

    // ---- Victoire : saut, arme levée ----
    if (this.victoryT >= 0 && u.alive) {
      this.victoryT += dt;
      const c = (this.victoryT % 1.3) / 1.3;
      const jump = c < 0.2 ? 0 : c < 0.55 ? Math.sin(((c - 0.2) / 0.35) * Math.PI) : 0;
      p.crouch += c < 0.2 ? Math.sin((c / 0.2) * Math.PI) * 0.4 : c > 0.55 && c < 0.7 ? Math.sin(((c - 0.55) / 0.15) * Math.PI) * 0.3 : 0;
      oy -= jump * 46;
      p.main += -0.85;
      p.off += -0.3;
      p.head += -0.15;
      p.spine += -0.1;
      p.cloth += 1.5;
    }

    // ---- Apparition ----
    let spawnK = 1;
    if (this.spawnT > 0) {
      this.spawnT = Math.max(0, this.spawnT - dt / 0.5);
      spawnK = 1 - this.spawnT;
    }

    // ---- Mort : les genoux lâchent, le corps bascule en arrière puis se dissout ----
    let deathAlpha = 1;
    if (this.deathT >= 0) {
      this.deathT += dt / 1.15;
      const k = Math.min(1, this.deathT);
      const fall = easeF.in(Math.min(1, k / 0.55));
      p.crouch += Math.min(1, k / 0.3) * 0.7;
      p.spine += 0.5 * Math.min(1, k / 0.3) - 0.3 * fall;
      p.head += 0.45 * Math.min(1, k / 0.25);
      p.main += 0.5 * Math.min(1, k / 0.3);
      p.off += 0.4 * Math.min(1, k / 0.3);
      p.cloth *= 1 - k;
      rot = -u.facing * fall * (u.isBoss ? 0.5 : 1.15);
      oy += fall * 18;
      ox -= u.facing * fall * 30;
      if (k > 0.55) {
        deathAlpha = 1 - (k - 0.55) / 0.45;
        if (!this.dissolved) { this.dissolved = true; this.onDissolve?.(this); }
      }
      this.bar.visible = false;
      this.stunStars.forEach((s) => (s.visible = false));
      if (k >= 1) { this.root.visible = false; this.gone = true; }
    }

    // ---- Application ----
    this.rig.apply(p, frozen ? 0 : dt);
    const sx = this.baseScale * flip;
    const sy = this.baseScale * (0.2 + 0.8 * spawnK);
    this.rig.mesh.scale.set(sx, sy);
    this.rig.flash.scale.set(sx, sy);
    this.body.position.set(ox, oy);
    this.body.rotation = rot;

    // Flash d'impact
    if (this.flashT > 0) {
      this.flashT = Math.max(0, this.flashT - dt / 0.14);
      // Sur une cible gelée (déjà très claire), le flash blanc additif saturerait : on l'atténue et le bleuit.
      this.rig.flash.alpha = this.flashT * this.flashT * (frozen ? 0.3 : 0.6);
      this.rig.flash.tint = frozen && this.flashTint === 0xffffff ? 0x6ab8ff : this.flashTint;
    } else if (!u.isSummon) {
      this.rig.flash.alpha = 0;
    }

    // Ombre : rétrécit quand le personnage est en l'air
    const air = clamp(-oy / 260, 0, 1);
    this.shadow.scale.x = this.shadowScale * (1 - air * 0.55);
    this.shadow.scale.y = this.shadow.scale.x * 0.5;
    this.shadow.alpha = (1 - air * 0.6) * deathAlpha;

    // Teinte : statuts, mise en retrait pendant les cinématiques, silhouette
    let tint = this.baseTint;
    if (u.dots.length) tint = 0xc89aff;
    if (u.slowT > 0 && !u.dots.length) tint = 0xb0c8ff;
    this.iceK = clamp(this.iceK + (frozen ? dt * 9 : -dt * 4), 0, 1);
    if (this.iceK > 0) tint = lerpColor(tint, 0x9adcff, this.iceK * 0.85);
    this.updateIce(dt, def.height);
    this.dimCur += (this.dimK - this.dimCur) * Math.min(1, realDt * 10);
    if (this.dimCur > 0.01) tint = lerpColor(tint, 0x2a2238, this.dimCur * 0.75);
    if (this.deathT >= 0) tint = lerpColor(tint, 0x4a3a4a, Math.min(1, this.deathT * 2));
    this.rig.mesh.tint = this.silhouette ? 0x000000 : tint;
    if (this.silhouette) this.rig.flash.alpha = 0;
    this.rig.mesh.alpha = this.baseAlpha * spawnK * deathAlpha;

    this.shieldBubble.visible = u.shield > 0 && u.alive && !this.silhouette;
    if (this.shieldBubble.visible) {
      const s = def.height * (1.05 + Math.sin(tt * 4) * 0.03);
      this.shieldBubble.width = s * 0.9;
      this.shieldBubble.height = s * 1.1;
      this.shieldBubble.alpha = 0.32 + Math.sin(tt * 5) * 0.08;
    }
    this.tauntRing.visible = u.tauntT > 0 && u.alive;
    if (this.tauntRing.visible) {
      this.tauntRing.rotation += dt * 1.5;
      this.tauntRing.width = 190;
      this.tauntRing.height = 56;
      this.tauntRing.alpha = 0.6 + Math.sin(tt * 8) * 0.2;
    }
    this.sanctuary.visible = u.dmgRed > 0 && u.alive;
    if (this.sanctuary.visible) {
      this.sanctuary.width = 200;
      this.sanctuary.height = 60;
      this.sanctuary.alpha = 0.55 + Math.sin(tt * 4) * 0.15;
    }
    this.hasteRing.visible = u.hasteT > 0 && u.alive && !this.silhouette;
    if (this.hasteRing.visible) {
      this.hasteRing.rotation -= dt * 6;
      this.hasteRing.width = 150 + Math.sin(tt * 14) * 8;
      this.hasteRing.height = 44;
      this.hasteRing.alpha = (0.55 + Math.sin(tt * 21) * 0.25) * Math.min(1, u.hasteT * 2);
    }
    const stunned = u.stun > 0 && u.alive && !frozen;
    this.stunStars.forEach((s, i) => {
      s.visible = stunned;
      if (!stunned) return;
      const a = tt * 5 + (i / 3) * Math.PI * 2;
      s.position.set(Math.cos(a) * 34, -def.height - 14 + Math.sin(a) * 9);
      s.scale.set(0.4 + Math.sin(a) * 0.1);
    });

    if (this.deathT < 0) this.drawBar(dt);
    this.bar.alpha = 1 - this.dimCur;
  }

  /** Pics de glace qui poussent autour des pieds pendant le gel, puis se brisent. */
  private updateIce(dt: number, h: number): void {
    if (this.iceK <= 0) { if (this.ice) this.ice.visible = false; return; }
    if (!this.ice) {
      const c = new Container();
      const w = Math.min(this.texture.width * this.baseScale, h * 0.9);
      const n = 6;
      for (let i = 0; i < n; i++) {
        const k = i / (n - 1);
        const s = new Sprite(this.bt.ice[i % 3]!);
        s.anchor.set(0.5, 1);
        const big = 1 - Math.abs(k - 0.5) * 1.2;
        s.position.set((k - 0.5) * w * 0.85, 6 + (i % 2) * 8);
        s.rotation = (k - 0.5) * 0.9;
        s.scale.set(0.45 + big * 0.35, (0.35 + big * 0.55) * (h / 230));
        s.alpha = 0.92;
        c.addChild(s);
      }
      const frost = new Sprite(this.bt.disc);
      frost.anchor.set(0.5);
      frost.tint = 0xbfefff;
      frost.alpha = 0.35;
      frost.width = w * 1.1;
      frost.height = 34;
      c.addChildAt(frost, 0);
      this.ice = c;
      this.root.addChildAt(c, this.root.getChildIndex(this.body) + 1);
    }
    this.ice.visible = true;
    const k = this.iceK;
    const grow = k * k * (3 - 2 * k);
    this.ice.scale.set(1, grow);
    this.ice.alpha = this.unit.frozen ? 1 : k;
    void dt;
  }

  private drawBar(dt: number): void {
    const u = this.unit;
    this.ghostBar = Math.max(u.ratio, this.ghostBar - dt * 0.6);
    if (this.ghostBar < u.ratio) this.ghostBar = u.ratio;
    this.bar.position.set(0, -u.def.height - 26);
    const w = this.barW;
    const r = Math.max(0, u.ratio);
    this.barHp.scale.x = w * r;
    this.barShine.scale.x = w * r;
    this.barGhost.visible = this.ghostBar > r + 0.002;
    if (this.barGhost.visible) this.barGhost.scale.x = w * this.ghostBar;
    const sh = Math.min(1, u.shield / u.maxHp);
    this.barShield.visible = sh > 0.002;
    if (this.barShield.visible) {
      this.barShield.x = -w / 2 + w * Math.min(r, 1 - sh);
      this.barShield.scale.x = w * sh;
    }
    if (this.barEnergy) {
      this.barEnergy.scale.x = Math.max(0.001, w * (u.energy / 100));
      this.barEnergy.tint = u.energy >= 100 ? 0xfff08a : 0xe0a83a;
    }
  }

  private destroyed = false;

  destroy(): void {
    this.destroyed = true;
    for (const g of this.ghostGeos) g.destroy();
    this.ghostGeos.length = 0;
    this.root.destroy({ children: true });
    this.rig.geometry.destroy();
  }
}

function lerpColor(a: number, b: number, k: number): number {
  const ar = (a >> 16) & 255, ag = (a >> 8) & 255, ab = a & 255;
  const br = (b >> 16) & 255, bg = (b >> 8) & 255, bb = b & 255;
  return (Math.round(ar + (br - ar) * k) << 16) | (Math.round(ag + (bg - ag) * k) << 8) | Math.round(ab + (bb - ab) * k);
}
