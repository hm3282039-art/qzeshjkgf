import { ENEMIES, formationSlots, heroStatMult, skillMult, skillTiers, type HeroDef, type ProjectileKind, type StageDef, type TeamMember, type UnitDef } from '../data/heroes';
import { Emitter } from '../utils/Emitter';
import { strikeDelay } from './rigs';

/**
 * Simulation du combat automatique, totalement indépendante de l'affichage :
 * elle avance le temps, décide des actions et émet des événements que la vue anime.
 * (On peut donc la tester ou l'équilibrer sans navigateur.)
 */

export type Side = 'hero' | 'enemy';
export type DamageKind = 'phys' | 'magic' | 'dot' | 'true';

/** Terrain : zone où les combattants peuvent se placer (px, repère 1920×1080). */
export const FIELD = { minX: 140, maxX: 1800, minY: 690, maxY: 900 } as const;
export const BATTLE_TIME_LIMIT = 90;
/** Temps de préparation (s) des ultimes à « montée » (cercle runique, tir vers le ciel…). */
export const ULT_CHARGE = 0.4;

const PROJECTILE_SPEED: Record<ProjectileKind, number> = { arrow: 1700, orb: 950, light: 1250, bone: 1300, void: 900, spark: 2600, hex: 1000 };
/** Vitesse du mur de glace de Thorne (px / s) : la vue s'en sert pour rester synchronisée. */
export const THORNE_WAVE_SPEED = 1400;
/** Durées des sorts de Nyx. */
export const NYX_SINGULARITY = 2.2;
export const NYX_ECLIPSE = 1.4;
/** Bonus de la hâte d'Ashka. */
const HASTE_ATK = 1.45;
const HASTE_MOVE = 1.25;

interface Dot { src: Unit; mult: number; every: number; timer: number; left: number }
interface Leap { fx: number; fy: number; tx: number; ty: number; t: number; dur: number; height: number }
/** Zone qui attire les ennemis de `src` vers son centre (trous noirs de Nyx). */
interface PullZone { src: Unit; x: number; y: number; r: number; str: number; t: number }

export class Unit {
  private static nextId = 1;
  readonly uid = Unit.nextId++;
  hp: number;
  maxHp: number;
  atk: number;
  armor: number;
  interval: number;
  crit: number;
  energy = 0;
  shield = 0;
  shieldT = 0;
  stun = 0;
  /** Occupé (animation d'attaque ou de sort). */
  lock = 0;
  atkT: number;
  skillT: number;
  tauntT = 0;
  dmgRed = 0;
  dmgRedT = 0;
  slowT = 0;
  /** Gelé (bloc de glace) : ne peut plus agir. */
  frozenT = 0;
  /** Hâte : attaque et déplacement accélérés. */
  hasteT = 0;
  /** Alternance des compétences (boss à plusieurs attaques). */
  skillN = 0;
  untargetable = false;
  enraged = false;
  lifeT = Infinity;
  ultReadyNotified = false;
  readonly dots: Dot[] = [];
  leap: Leap | null = null;
  target: Unit | null = null;
  facing: 1 | -1;
  /** Petit décalage vertical pour que les combattants au corps à corps ne s'empilent pas. */
  readonly laneOffset = (Math.random() - 0.5) * 120;
  // Statistiques de fin de combat
  dealt = 0;
  taken = 0;
  healed = 0;

  constructor(
    readonly def: UnitDef,
    readonly side: Side,
    public x: number,
    public y: number,
    readonly opts: { boss?: boolean; summon?: boolean; hero?: HeroDef; stars?: number; level?: number } = {},
  ) {
    const s = def.stats;
    const m = opts.hero ? heroStatMult(opts.hero, opts.stars ?? opts.hero.stars, opts.level ?? 1) : 1;
    this.hp = this.maxHp = Math.round(s.hp * m);
    this.atk = Math.round(s.atk * m);
    this.armor = s.armor;
    this.interval = s.interval;
    this.crit = s.crit;
    this.atkT = 0.4 + Math.random() * 0.5;
    this.skillT = def.skillFirst ?? def.skillCd ?? Infinity;
    this.facing = side === 'hero' ? 1 : -1;
  }

  get alive(): boolean { return this.hp > 0; }
  get ratio(): number { return this.hp / this.maxHp; }
  get ranged(): boolean { return !!this.def.projectile; }
  get hero(): HeroDef | undefined { return this.opts.hero; }
  get isBoss(): boolean { return !!this.opts.boss; }
  get isSummon(): boolean { return !!this.opts.summon; }
  get stars(): number { return this.opts.stars ?? this.opts.hero?.stars ?? 0; }
  /** Niveau du héros (1…∞). */
  get level(): number { return this.opts.level ?? 1; }
  /**
   * Multiplicateur de puissance des compétences : +25 % par palier de 10 niveaux.
   * Appliqué aux dégâts, soins, boucliers et durées de tous les sorts du héros.
   */
  get skillPower(): number { return this.opts.hero ? skillMult(skillTiers(this.level)) : 1; }
  /** Palier de compétence atteint (0, 1, 2…). */
  get skillTier(): number { return this.opts.hero ? skillTiers(this.level) : 0; }
  get frozen(): boolean { return this.frozenT > 0; }
  get ultReady(): boolean { return !!this.hero && this.alive && this.energy >= 100; }
  /** Hauteur (px) du point visé au centre du corps. */
  get chestY(): number { return this.y - this.def.height * 0.55; }
}

export interface Projectile {
  id: number;
  kind: ProjectileKind | 'pierce';
  from: Unit;
  to: Unit | null;
  sx: number; sy: number;
  /** Destination fixe (si pas de cible suivie). */
  ex: number; ey: number;
  t: number;
  dur: number;
  big?: boolean;
  onHit?: () => void;
}

export type FxType =
  | 'kael_shield' | 'kael_leap' | 'kael_slam'
  | 'lyra_blink' | 'lyra_slash' | 'lyra_ult_start' | 'lyra_ult_end'
  | 'morwen_summon' | 'morwen_charge' | 'morwen_plague'
  | 'seren_skyshot' | 'seren_volley'
  | 'aldric_heal' | 'aldric_charge' | 'aldric_sanctuary'
  | 'thorne_spin' | 'thorne_charge' | 'thorne_wave'
  | 'nyx_singularity' | 'nyx_charge' | 'nyx_eclipse' | 'nyx_implode'
  | 'ashka_chain' | 'ashka_charge' | 'ashka_haste' | 'ashka_strike'
  | 'vaelen_wall' | 'vaelen_burst'
  | 'sylvaine_forest' | 'sylvaine_thorn'
  | 'pyrrha_meteor' | 'pyrrha_impact' | 'pyrrha_pyre' | 'pyrrha_wave'
  | 'warden_windup' | 'warden_cleave' | 'enrage'
  | 'witch_hex' | 'drowned_grab'
  | 'queen_tide_windup' | 'queen_tide' | 'queen_grab_windup' | 'queen_grab'
  | 'stun' | 'freeze' | 'dot_tick' | 'expire';

export interface FxEvent {
  type: FxType;
  u?: Unit;
  target?: Unit;
  targets?: Unit[];
  x?: number; y?: number;
  x2?: number; y2?: number;
  dur?: number;
}

export type SimEvents = {
  attack: { u: Unit; target: Unit };
  damage: { target: Unit; source: Unit | null; amount: number; crit: boolean; absorbed: number; kind: DamageKind };
  heal: { target: Unit; amount: number; source: Unit };
  projectile: Projectile;
  projectileEnd: Projectile;
  cast: { u: Unit; ability: 'skill' | 'ultimate' };
  fx: FxEvent;
  spawn: Unit;
  death: Unit;
  ultReady: Unit;
  end: { winner: Side };
};

export class BattleSim extends Emitter<SimEvents> {
  readonly units: Unit[] = [];
  readonly projectiles: Projectile[] = [];
  time = 0;
  over = false;
  winner: Side | null = null;
  private timers: Array<{ at: number; fn: () => void }> = [];
  readonly zones: PullZone[] = [];
  private projectileId = 1;
  private acc = 0;
  private static readonly STEP = 1 / 60;

  constructor(readonly stage: StageDef, readonly team: readonly TeamMember[], readonly random: () => number = Math.random) {
    super();
  }

  /** Place les combattants (à appeler après avoir branché les écouteurs). */
  setup(): void {
    const slots = formationSlots(this.team.map((m) => m.def));
    this.team.forEach((m, i) => {
      const [x, y] = slots[i]!;
      this.add(new Unit(m.def, 'hero', x, y, { hero: m.def, stars: m.stars, level: m.level }));
    });
    for (const e of this.stage.enemies) this.add(new Unit(e.def, 'enemy', e.x, e.y, { boss: e.boss }));
  }

  get heroes(): Unit[] { return this.units.filter((u) => u.hero); }
  get boss(): Unit | undefined { return this.units.find((u) => u.isBoss); }

  private add(u: Unit): Unit {
    this.units.push(u);
    this.emit('spawn', u);
    return u;
  }

  /** Avance la simulation (pas fixe pour un résultat stable quelle que soit la fréquence d'images). */
  update(dt: number): void {
    this.acc += dt;
    while (this.acc >= BattleSim.STEP) {
      this.acc -= BattleSim.STEP;
      this.tick(BattleSim.STEP);
    }
  }

  private after(delay: number, fn: () => void): void {
    this.timers.push({ at: this.time + delay, fn });
  }

  private foes(u: Unit, includeUntargetable = false): Unit[] {
    return this.units.filter((o) => o.alive && o.side !== u.side && (includeUntargetable || !o.untargetable));
  }

  private allies(u: Unit): Unit[] {
    return this.units.filter((o) => o.alive && o.side === u.side);
  }

  private dist(a: Unit, b: Unit): number {
    return Math.hypot(a.x - b.x, (a.y - b.y) * 1.6);
  }

  /* ======================= Boucle ======================= */

  private tick(dt: number): void {
    if (this.over) return;
    this.time += dt;

    // Actions programmées
    if (this.timers.length) {
      const due = this.timers.filter((t) => t.at <= this.time);
      if (due.length) {
        this.timers = this.timers.filter((t) => t.at > this.time);
        for (const t of due) t.fn();
      }
    }

    // Projectiles
    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const p = this.projectiles[i]!;
      p.t += dt;
      if (p.t >= p.dur) {
        this.projectiles.splice(i, 1);
        if (!p.to || p.to.alive) p.onHit?.();
        this.emit('projectileEnd', p);
      }
    }

    if (this.zones.length) this.tickZones(dt);

    for (const u of this.units) {
      if (!u.alive) continue;
      this.tickStatus(u, dt);
      if (!u.alive) continue;
      this.think(u, dt);
    }
    this.separate(dt);
    this.checkEnd();
  }

  /** Les trous noirs aspirent les ennemis (les boss résistent mieux). */
  private tickZones(dt: number): void {
    for (let i = this.zones.length - 1; i >= 0; i--) {
      const z = this.zones[i]!;
      z.t -= dt;
      if (z.t <= 0 || this.over) { this.zones.splice(i, 1); continue; }
      for (const f of this.units) {
        if (!f.alive || f.side === z.src.side || f.leap || f.untargetable) continue;
        const dx = z.x - f.x, dy = z.y - f.y;
        const d = Math.hypot(dx, dy * 1.6);
        if (d > z.r || d < 24) continue;
        const k = (f.isBoss ? 0.35 : 1) * (1 - (d / z.r) * 0.45);
        const step = Math.min(d - 24, z.str * k * dt);
        f.x = Math.max(FIELD.minX, Math.min(FIELD.maxX, f.x + (dx / d) * step));
        f.y = clampY(f.y + (dy / d) * step * 0.7);
      }
    }
  }

  private addZone(src: Unit, x: number, y: number, r: number, str: number, t: number): void {
    this.zones.push({ src, x, y, r, str, t });
  }

  private tickStatus(u: Unit, dt: number): void {
    if (u.shieldT > 0 && (u.shieldT -= dt) <= 0) u.shield = 0;
    if (u.tauntT > 0) u.tauntT -= dt;
    if (u.dmgRedT > 0 && (u.dmgRedT -= dt) <= 0) u.dmgRed = 0;
    if (u.slowT > 0) u.slowT -= dt;
    if (u.hasteT > 0) u.hasteT -= dt;
    if (u.frozenT > 0) u.frozenT -= dt;
    if (u.stun > 0) u.stun -= dt;
    if (u.lock > 0) u.lock -= dt;
    u.atkT -= dt * (u.slowT > 0 ? 0.65 : 1) * (u.hasteT > 0 ? HASTE_ATK : 1);
    u.skillT -= dt;

    // Héros : l'énergie remonte doucement
    if (u.hero) {
      this.gainEnergy(u, dt * 1.2);
    }

    for (let i = u.dots.length - 1; i >= 0; i--) {
      const d = u.dots[i]!;
      d.timer -= dt;
      if (d.timer <= 0) {
        d.timer += d.every;
        d.left--;
        this.damage(d.src, u, d.mult, 'dot', false);
        this.emit('fx', { type: 'dot_tick', target: u });
        if (d.left <= 0) u.dots.splice(i, 1);
        if (!u.alive) return;
      }
    }

    if (u.lifeT !== Infinity && (u.lifeT -= dt) <= 0) {
      u.hp = 0;
      this.emit('fx', { type: 'expire', u });
      this.emit('death', u);
    }

    if (u.leap) {
      const l = u.leap;
      l.t = Math.min(l.dur, l.t + dt);
      const k = l.t / l.dur;
      u.x = l.fx + (l.tx - l.fx) * k;
      u.y = l.fy + (l.ty - l.fy) * k;
      if (l.t >= l.dur) u.leap = null;
    }
  }

  private gainEnergy(u: Unit, amount: number): void {
    if (!u.hero || !u.alive) return;
    u.energy = Math.min(100, u.energy + amount);
    if (u.energy >= 100 && !u.ultReadyNotified) {
      u.ultReadyNotified = true;
      this.emit('ultReady', u);
    }
  }

  private pickTarget(u: Unit): Unit | null {
    const foes = this.foes(u);
    if (!foes.length) return null;
    const taunter = foes.find((f) => f.tauntT > 0);
    if (taunter && u.side === 'enemy' && !u.ranged) return taunter;
    if (u.target && u.target.alive && !u.target.untargetable) return u.target;
    // Les archers squelettes visent au hasard : ils peuvent viser tes héros fragiles à l'arrière.
    if (u.side === 'enemy' && u.ranged) return foes[Math.floor(this.random() * foes.length)]!;
    let best = foes[0]!;
    let bestD = Infinity;
    for (const f of foes) {
      const d = this.dist(u, f);
      if (d < bestD) { bestD = d; best = f; }
    }
    return best;
  }

  private think(u: Unit, dt: number): void {
    if (u.stun > 0 || u.leap) return;
    const target = (u.target = this.pickTarget(u));
    if (!target) return;
    if (u.lock > 0) return;

    u.facing = target.x >= u.x ? 1 : -1;

    // Compétence (lancée automatiquement dès qu'elle est prête)
    if (u.skillT <= 0 && this.trySkill(u, target)) {
      u.skillT = u.def.skillCd ?? Infinity;
      return;
    }

    const range = u.def.stats.range;
    const dx = Math.abs(target.x - u.x);
    const dy = Math.abs(target.y - u.y);
    const inRange = u.ranged ? this.dist(u, target) <= range : dx <= range && dy <= 55;
    if (!inRange) {
      // Se rapproche de la cible (en gardant à peu près sa ligne pour ne pas s'entasser)
      const speed = u.def.stats.speed * (u.slowT > 0 ? 0.6 : 1) * (u.hasteT > 0 ? HASTE_MOVE : 1);
      const tx = target.x - u.facing * range * 0.8;
      const ty = u.ranged ? u.y : clampY(target.y + u.laneOffset * 0.35);
      const mx = tx - u.x;
      const my = dy > 40 || u.ranged ? ty - u.y : 0;
      const len = Math.hypot(mx, my) || 1;
      const step = Math.min(len, speed * dt);
      u.x += (mx / len) * step;
      u.y = clampY(u.y + (my / len) * step);
      return;
    }

    if (u.atkT <= 0) {
      u.atkT = u.interval;
      this.basicAttack(u, target);
    }
  }

  /** Les combattants d'un même camp se poussent un peu pour rester lisibles. */
  private separate(dt: number): void {
    const alive = this.units.filter((u) => u.alive && !u.leap);
    for (let i = 0; i < alive.length; i++) {
      for (let j = i + 1; j < alive.length; j++) {
        const a = alive[i]!, b = alive[j]!;
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        if (a.side === b.side) {
          // Même camp : on s'écarte (surtout verticalement)
          const d = Math.hypot(dx, dy * 1.4);
          if (d > 0 && d < 95) {
            const push = (95 - d) * 3 * dt;
            const sy = dy === 0 ? (a.uid < b.uid ? -1 : 1) : Math.sign(dy);
            a.y = clampY(a.y - sy * push * 0.6);
            b.y = clampY(b.y + sy * push * 0.6);
            a.x -= Math.sign(dx || 1) * push * 0.25;
            b.x += Math.sign(dx || 1) * push * 0.25;
          }
        } else if (Math.abs(dx) < 105 && Math.abs(dy) < 60) {
          // Camps opposés : chacun recule vers son côté pour ne pas se superposer
          const push = (105 - Math.abs(dx)) * 4 * dt;
          const h = a.side === 'hero' ? a : b;
          const e = a.side === 'hero' ? b : a;
          h.x = Math.max(FIELD.minX, h.x - push * 0.5);
          e.x = Math.min(FIELD.maxX, e.x + push * 0.5);
        }
      }
    }
  }

  /* ======================= Attaques ======================= */

  private basicAttack(u: Unit, target: Unit): void {
    this.emit('attack', { u, target });
    const strike = strikeDelay(u.def.texture, !!u.def.projectile, u.isSummon);
    u.lock = strike + (u.ranged ? 0.14 : 0.18);
    const energy = 7 * u.interval;
    if (!u.def.projectile) {
      this.after(strike, () => {
        if (!u.alive || u.stun > 0 || !target.alive) return;
        this.damage(u, target, 1, 'phys');
        this.gainEnergy(u, energy);
        // Les Noyés agrippent leur cible : elle est ralentie
        if (u.def.id === 'drowned' && target.alive) {
          target.slowT = Math.max(target.slowT, 1.2);
          this.emit('fx', { type: 'drowned_grab', u, target });
        }
      });
      return;
    }
    const kind = u.def.projectile;
    this.after(strike, () => {
      if (!u.alive || !target.alive) return;
      this.shoot(u, target, kind, () => {
        this.damage(u, target, 1, kind === 'arrow' || kind === 'bone' ? 'phys' : 'magic');
        this.gainEnergy(u, energy);
      });
    });
  }

  private muzzle(u: Unit): { x: number; y: number } {
    const [forward, up] = u.def.muzzle ?? [40, u.def.height * 0.6];
    return { x: u.x + forward * u.facing, y: u.y - up };
  }

  private shoot(u: Unit, target: Unit, kind: ProjectileKind, onHit: () => void, big = false): void {
    const m = this.muzzle(u);
    const d = Math.hypot(target.x - m.x, target.chestY - m.y);
    const p: Projectile = {
      id: this.projectileId++, kind, from: u, to: target,
      sx: m.x, sy: m.y, ex: target.x, ey: target.chestY,
      t: 0, dur: Math.max(0.12, d / PROJECTILE_SPEED[kind]), big, onHit,
    };
    this.projectiles.push(p);
    this.emit('projectile', p);
  }

  /** Dégâts d'une compétence : applique le bonus de palier du héros. */
  private hit(u: Unit, t: Unit, mult: number, kind: DamageKind, canCrit = true): number {
    return this.damage(u, t, mult * u.skillPower, kind, canCrit);
  }

  damage(src: Unit, tgt: Unit, mult: number, kind: DamageKind, canCrit = true): number {
    if (!tgt.alive || this.over) return 0;
    if (tgt.untargetable && kind !== 'dot') return 0;
    const crit = canCrit && this.random() < src.crit;
    const variance = 0.92 + this.random() * 0.16;
    const mitigation = kind === 'true' ? 1 : 100 / (100 + tgt.armor * (kind === 'magic' || kind === 'dot' ? 0.6 : 1));
    let amount = Math.max(1, Math.round(src.atk * mult * (crit ? 1.75 : 1) * variance * mitigation * (1 - tgt.dmgRed)));
    const absorbed = Math.min(tgt.shield, amount);
    tgt.shield -= absorbed;
    const hpLoss = amount - absorbed;
    tgt.hp = Math.max(0, tgt.hp - hpLoss);
    src.dealt += amount;
    tgt.taken += amount;
    this.gainEnergy(tgt, (hpLoss / tgt.maxHp) * 45);
    this.emit('damage', { target: tgt, source: src, amount, crit, absorbed, kind });

    if (tgt.isBoss && !tgt.enraged && tgt.ratio < 0.5 && tgt.alive) {
      tgt.enraged = true;
      tgt.atk = Math.round(tgt.atk * 1.3);
      tgt.interval *= 0.8;
      this.emit('fx', { type: 'enrage', u: tgt });
    }
    if (!tgt.alive) this.kill(tgt);
    return amount;
  }

  heal(src: Unit, tgt: Unit, value: number): void {
    if (!tgt.alive) return;
    const amount = Math.round(Math.min(value, tgt.maxHp - tgt.hp));
    if (amount <= 0) return;
    tgt.hp += amount;
    src.healed += amount;
    this.emit('heal', { target: tgt, amount, source: src });
  }

  private kill(u: Unit): void {
    u.dots.length = 0;
    u.leap = null;
    this.emit('death', u);
  }

  private stunUnit(u: Unit, dur: number, quiet = false): void {
    if (!u.alive) return;
    u.stun = Math.max(u.stun, dur);
    u.lock = 0;
    if (!quiet) this.emit('fx', { type: 'stun', target: u, dur });
  }

  /** Gel : un étourdissement prolongé, affiché comme un bloc de glace. */
  private freezeUnit(u: Unit, dur: number): void {
    if (!u.alive) return;
    u.stun = Math.max(u.stun, dur);
    u.frozenT = Math.max(u.frozenT, dur);
    u.lock = 0;
    this.emit('fx', { type: 'freeze', target: u, dur });
  }

  /** Centre du groupe d'ennemis le plus dense. */
  private densest(u: Unit, radius = 230): { x: number; y: number; n: number } | null {
    const foes = this.foes(u, true);
    if (!foes.length) return null;
    let best = foes[0]!;
    let bestN = -1;
    for (const f of foes) {
      const n = foes.filter((o) => Math.hypot(o.x - f.x, (o.y - f.y) * 1.6) < radius).length;
      if (n > bestN) { bestN = n; best = f; }
    }
    const near = foes.filter((o) => Math.hypot(o.x - best.x, (o.y - best.y) * 1.6) < radius);
    return { x: near.reduce((s, o) => s + o.x, 0) / near.length, y: near.reduce((s, o) => s + o.y, 0) / near.length, n: near.length };
  }

  private checkEnd(): void {
    if (this.over) return;
    const enemiesAlive = this.units.some((u) => u.alive && u.side === 'enemy');
    const heroesAlive = this.units.some((u) => u.alive && u.hero);
    let winner: Side | null = null;
    if (!enemiesAlive) winner = 'hero';
    else if (!heroesAlive || this.time >= BATTLE_TIME_LIMIT) winner = 'enemy';
    if (winner) {
      this.over = true;
      this.winner = winner;
      this.projectiles.length = 0;
      this.emit('end', { winner });
    }
  }

  /* ======================= Compétences ======================= */

  private trySkill(u: Unit, target: Unit): boolean {
    switch (u.def.id) {
      case 'kael': return this.kaelSkill(u);
      case 'lyra': return this.lyraSkill(u);
      case 'morwen': return this.morwenSkill(u);
      case 'seren': return this.serenSkill(u, target);
      case 'aldric': return this.aldricSkill(u);
      case 'thorne': return this.thorneSkill(u);
      case 'nyx': return this.nyxSkill(u);
      case 'ashka': return this.ashkaSkill(u, target);
      case 'vaelen': return this.vaelenSkill(u);
      case 'sylvaine': return this.sylvaineSkill(u, target);
      case 'pyrrha': return this.pyrrhaSkill(u);
      case 'warden': return this.wardenSkill(u, target);
      case 'witch': return this.witchSkill(u);
      case 'queen': return this.queenSkill(u, target);
      default: return false;
    }
  }

  /* ---------- Nouveaux héros ---------- */

  private thorneSkill(u: Unit): boolean {
    const near = this.foes(u).filter((f) => this.dist(u, f) < 230);
    if (!near.length) { u.skillT = 0.5; return false; }
    u.lock = 0.6;
    this.emit('cast', { u, ability: 'skill' });
    this.emit('fx', { type: 'thorne_spin', u, x: u.x, y: u.y });
    this.after(0.22, () => {
      if (!u.alive || u.stun > 0) return;
      for (const f of this.foes(u)) {
        if (this.dist(u, f) < 240) {
          this.hit(u, f, 1.6, 'phys');
          f.slowT = Math.max(f.slowT, 2);
        }
      }
    });
    return true;
  }

  private nyxSkill(u: Unit): boolean {
    const c = this.densest(u, 260);
    if (!c) return false;
    const x = Math.max(FIELD.minX + 100, Math.min(FIELD.maxX - 60, c.x)), y = clampY(c.y);
    u.lock = 0.6;
    this.emit('cast', { u, ability: 'skill' });
    this.emit('fx', { type: 'nyx_singularity', u, x, y, dur: NYX_SINGULARITY });
    this.after(0.25, () => {
      if (this.over) return;
      this.addZone(u, x, y, 360, 120, NYX_SINGULARITY - 0.25);
      for (let i = 0; i < 6; i++) {
        this.after(0.1 + i * 0.32, () => {
          if (this.over) return;
          for (const f of this.foes(u)) {
            if (Math.hypot(f.x - x, (f.y - y) * 1.6) < 270) {
              this.hit(u, f, 0.35, 'magic', false);
              f.slowT = Math.max(f.slowT, 0.6);
            }
          }
        });
      }
    });
    return true;
  }

  private ashkaSkill(u: Unit, target: Unit): boolean {
    const chain: Unit[] = [target];
    let cur = target;
    while (chain.length < 4) {
      const next = this.foes(u).filter((f) => !chain.includes(f) && Math.hypot(f.x - cur.x, (f.y - cur.y) * 1.6) < 520)
        .sort((a, b) => Math.hypot(a.x - cur.x, a.y - cur.y) - Math.hypot(b.x - cur.x, b.y - cur.y))[0];
      if (!next) break;
      chain.push(next);
      cur = next;
    }
    u.lock = 0.55;
    this.emit('cast', { u, ability: 'skill' });
    const m = this.muzzle(u);
    chain.forEach((t, i) => {
      this.after(0.14 + i * 0.09, () => {
        if (!u.alive || this.over || !t.alive) return;
        const prev = i === 0 ? m : { x: chain[i - 1]!.x, y: chain[i - 1]!.chestY };
        this.emit('fx', { type: 'ashka_chain', u, target: t, x: prev.x, y: prev.y });
        this.hit(u, t, 1.5 * Math.pow(0.85, i), 'magic');
      });
    });
    return true;
  }

  /* ---------- Vaelen, Sylvaine, Pyrrha ---------- */

  /** Serment de Fer : gros bouclier, provocation et protection de l'équipe. */
  private vaelenSkill(u: Unit): boolean {
    u.shield = Math.round(u.maxHp * 0.42 * u.skillPower);
    u.shieldT = 7;
    u.tauntT = 5;
    u.lock = 0.55;
    this.emit('cast', { u, ability: 'skill' });
    this.emit('fx', { type: 'kael_shield', u });
    // Réduction de dégâts pour toute l'équipe
    for (const a of this.allies(u)) {
      a.dmgRed = Math.max(a.dmgRed, 0.2);
      a.dmgRedT = Math.max(a.dmgRedT, 5);
    }
    return true;
  }

  /** Salve d'Épines : 5 flèches en éventail avec saignement. */
  private sylvaineSkill(u: Unit, target: Unit): boolean {
    const foes = this.foes(u).slice().sort((a, b) => this.dist(u, a) - this.dist(u, b)).slice(0, 5);
    if (!foes.length) return false;
    u.lock = 0.55;
    this.emit('cast', { u, ability: 'skill' });
    const m = this.muzzle(u);
    foes.forEach((t, i) => {
      this.after(0.12 + i * 0.07, () => {
        if (!u.alive || this.over || !t.alive) return;
        const p: Projectile = {
          id: this.projectileId++, kind: 'arrow', from: u, to: t,
          sx: m.x, sy: m.y, ex: t.x, ey: t.chestY, t: 0, dur: this.dist(u, t) / 2400, big: true,
        };
        this.projectiles.push(p);
        this.emit('projectile', p);
        this.after(0.09, () => {
          if (!t.alive) return;
          this.hit(u, t, 1.2, 'phys');
          t.dots.push({ src: u, mult: 0.35 * u.skillPower, every: 0.8, timer: 0.8, left: 4 });
        });
      });
    });
    void target;
    return true;
  }

  /** Météore : frappe la zone la plus dense et embrase le sol. */
  private pyrrhaSkill(u: Unit): boolean {
    const c = this.densest(u, 300);
    if (!c) return false;
    const x = Math.max(FIELD.minX + 80, Math.min(FIELD.maxX - 40, c.x));
    const y = clampY(c.y);
    u.lock = 0.7;
    this.emit('cast', { u, ability: 'skill' });
    this.emit('fx', { type: 'pyrrha_meteor', u, x, y, dur: 0.75 });
    this.after(0.75, () => {
      if (this.over) return;
      this.emit('fx', { type: 'pyrrha_impact', u, x, y });
      for (const f of this.foes(u)) {
        if (Math.hypot(f.x - x, (f.y - y) * 1.6) < 260) {
          this.hit(u, f, 2.8, 'magic');
          f.dots.push({ src: u, mult: 0.5 * u.skillPower, every: 0.7, timer: 0.7, left: 6 });
        }
      }
    });
    return true;
  }

  /* ---------- Nouveaux ennemis ---------- */

  private witchSkill(u: Unit): boolean {
    const heroes = this.foes(u);
    if (!heroes.length) return false;
    const tgt = heroes[Math.floor(this.random() * heroes.length)]!;
    u.lock = 0.7;
    this.emit('cast', { u, ability: 'skill' });
    this.emit('fx', { type: 'witch_hex', u, target: tgt });
    this.after(0.45, () => {
      if (!u.alive || u.stun > 0 || !tgt.alive) return;
      tgt.dots.push({ src: u, mult: 0.4, every: 0.6, timer: 0.6, left: 5 });
    });
    return true;
  }

  private queenSkill(u: Unit, target: Unit): boolean {
    const heroes = this.foes(u);
    if (!heroes.length) return false;
    const tide = u.skillN++ % 2 === 0;
    this.emit('cast', { u, ability: 'skill' });
    if (tide) {
      // Raz-de-marée : longue préparation (on peut l'interrompre en l'étourdissant), puis toute l'équipe est balayée
      u.lock = 1.35;
      this.emit('fx', { type: 'queen_tide_windup', u, x: u.x, y: u.y, dur: 0.8 });
      this.after(0.8, () => {
        if (!u.alive || u.stun > 0) return;
        this.emit('fx', { type: 'queen_tide', u, x: u.x, y: u.y });
        for (const h of this.foes(u)) {
          this.hit(u, h, 1.4, 'phys', false);
          if (!h.leap) h.x = Math.max(FIELD.minX, h.x - 80);
        }
      });
      return true;
    }
    // Étreinte des abysses : attire le héros le plus éloigné et l'étourdit
    const far = heroes.filter((h) => !h.leap && !h.untargetable).reduce<Unit | null>((a, b) => (!a || Math.abs(b.x - u.x) > Math.abs(a.x - u.x) ? b : a), null) ?? target;
    u.lock = 1.1;
    this.emit('fx', { type: 'queen_grab_windup', u, target: far, dur: 0.45 });
    this.after(0.45, () => {
      if (!u.alive || u.stun > 0 || !far.alive || far.leap) return;
      const tx = Math.max(FIELD.minX, u.x - 150), ty = clampY(u.y + (far.y > u.y ? 40 : -40));
      this.emit('fx', { type: 'queen_grab', u, target: far, x: far.x, y: far.y, x2: tx, y2: ty, dur: 0.4 });
      far.leap = { fx: far.x, fy: far.y, tx, ty, t: 0, dur: 0.4, height: 70 };
      far.lock = 0;
      this.after(0.4, () => {
        if (!far.alive) return;
        this.hit(u, far, 0.8, 'phys', false);
        this.stunUnit(far, 1.2);
      });
    });
    return true;
  }

  private kaelSkill(u: Unit): boolean {
    u.shield = Math.round(u.maxHp * 0.3 * u.skillPower);
    u.shieldT = 6;
    u.tauntT = 4;
    u.lock = 0.45;
    this.emit('cast', { u, ability: 'skill' });
    this.emit('fx', { type: 'kael_shield', u });
    return true;
  }

  private lyraSkill(u: Unit): boolean {
    const foes = this.foes(u);
    if (!foes.length) return false;
    const tgt = foes.reduce((a, b) => (b.ratio < a.ratio ? b : a));
    const fx = u.x, fy = u.y;
    u.x = Math.min(FIELD.maxX, tgt.x + 75 * (tgt.side === 'enemy' ? 1 : -1));
    u.y = tgt.y;
    u.facing = tgt.x >= u.x ? 1 : -1;
    u.target = tgt;
    u.lock = 0.5;
    u.atkT = Math.max(u.atkT, 0.35);
    this.emit('cast', { u, ability: 'skill' });
    this.emit('fx', { type: 'lyra_blink', u, x: fx, y: fy });
    this.after(0.12, () => {
      if (!u.alive || !tgt.alive) return;
      this.emit('fx', { type: 'lyra_slash', u, target: tgt });
      this.hit(u, tgt, 2.6, 'phys');
    });
    return true;
  }

  private morwenSkill(u: Unit): boolean {
    this.emit('cast', { u, ability: 'skill' });
    u.lock = 0.6;
    for (const dy of [-55, 55]) {
      const x = Math.min(FIELD.maxX, u.x + 170);
      const y = clampY(u.y + dy);
      this.emit('fx', { type: 'morwen_summon', u, x, y });
      this.after(0.35, () => {
        if (this.over) return;
        const s = this.add(new Unit(ENEMIES.spectral, 'hero', x, y, { summon: true }));
        s.lifeT = 12;
        s.atkT = 0.3;
      });
    }
    return true;
  }

  private serenSkill(u: Unit, target: Unit): boolean {
    const y = target.y;
    const sx = u.x + 60, sy = y - 120;
    const ex = 2050;
    const speed = 2300;
    const hits = this.foes(u).filter((f) => Math.abs(f.y - y) < 85 && f.x > u.x);
    u.lock = 0.5;
    this.emit('cast', { u, ability: 'skill' });
    const p: Projectile = { id: this.projectileId++, kind: 'pierce', from: u, to: null, sx, sy, ex, ey: sy, t: 0, dur: (ex - sx) / speed, big: true };
    this.after(0.15, () => {
      if (!u.alive) return;
      this.projectiles.push(p);
      this.emit('projectile', p);
      for (const h of hits) this.after((h.x - sx) / speed, () => this.hit(u, h, 2.2, 'phys'));
    });
    return true;
  }

  private aldricSkill(u: Unit): boolean {
    const hurt = this.allies(u).filter((a) => a.ratio < 0.9);
    if (!hurt.length) { u.skillT = 0.8; return false; }
    const tgt = hurt.reduce((a, b) => (b.ratio < a.ratio ? b : a));
    u.lock = 0.5;
    this.emit('cast', { u, ability: 'skill' });
    this.emit('fx', { type: 'aldric_heal', u, target: tgt });
    this.after(0.25, () => this.heal(u, tgt, u.atk * 2.8 * u.skillPower));
    return true;
  }

  private wardenSkill(u: Unit, target: Unit): boolean {
    if (this.dist(u, target) > u.def.stats.range + 40) return false;
    const x = target.x, y = target.y;
    u.lock = 1.0;
    this.emit('cast', { u, ability: 'skill' });
    this.emit('fx', { type: 'warden_windup', u, x, y });
    this.after(0.65, () => {
      if (!u.alive || u.stun > 0) return; // un étourdissement interrompt l'attaque !
      this.emit('fx', { type: 'warden_cleave', u, x, y });
      for (const h of this.foes(u)) {
        if (Math.hypot(h.x - x, (h.y - y) * 1.6) < 200) {
          this.hit(u, h, 1.7, 'phys');
          h.x = Math.max(FIELD.minX, h.x - 55);
        }
      }
    });
    return true;
  }

  /* ======================= Ultimes ======================= */

  canUltimate(u: Unit): boolean {
    return !this.over && u.ultReady && u.stun <= 0 && !u.leap && this.foes(u, true).length > 0;
  }

  ultimate(u: Unit): boolean {
    if (!this.canUltimate(u)) return false;
    u.energy = 0;
    u.ultReadyNotified = false;
    this.emit('cast', { u, ability: 'ultimate' });
    switch (u.def.id) {
      case 'kael': this.kaelUlt(u); break;
      case 'lyra': this.lyraUlt(u); break;
      case 'morwen': this.morwenUlt(u); break;
      case 'seren': this.serenUlt(u); break;
      case 'aldric': this.aldricUlt(u); break;
      case 'thorne': this.thorneUlt(u); break;
      case 'nyx': this.nyxUlt(u); break;
      case 'ashka': this.ashkaUlt(u); break;
      case 'vaelen': this.vaelenUlt(u); break;
      case 'sylvaine': this.sylvaineUlt(u); break;
      case 'pyrrha': this.pyrrhaUlt(u); break;
    }
    return true;
  }

  private kaelUlt(u: Unit): void {
    const foes = this.foes(u, true);
    // Vise le groupe d'ennemis le plus dense
    let best = foes[0]!;
    let bestN = -1;
    for (const f of foes) {
      const n = foes.filter((o) => Math.hypot(o.x - f.x, (o.y - f.y) * 1.6) < 230).length;
      if (n > bestN) { bestN = n; best = f; }
    }
    const tx = Math.max(FIELD.minX, best.x - 90);
    const ty = best.y;
    const dur = 0.55;
    u.leap = { fx: u.x, fy: u.y, tx, ty, t: 0, dur, height: 260 };
    u.untargetable = true;
    u.lock = dur + 0.35;
    this.emit('fx', { type: 'kael_leap', u, x: u.x, y: u.y, x2: tx, y2: ty, dur });
    this.after(dur, () => {
      u.untargetable = false;
      if (!u.alive) return;
      const cx = tx + 70;
      this.emit('fx', { type: 'kael_slam', u, x: cx, y: ty });
      for (const f of this.foes(u)) {
        if (Math.hypot(f.x - cx, (f.y - ty) * 1.5) < 260) {
          this.hit(u, f, 2.4, 'phys');
          this.stunUnit(f, 1.5);
        }
      }
    });
  }

  private lyraUlt(u: Unit): void {
    const hits = 7;
    const every = 0.26;
    u.untargetable = true;
    u.lock = hits * every + 0.35;
    this.emit('fx', { type: 'lyra_ult_start', u });
    for (let i = 0; i < hits; i++) {
      this.after(i * every, () => {
        if (!u.alive || this.over) return;
        const foes = this.foes(u);
        if (!foes.length) return;
        const tgt = foes[Math.floor(this.random() * foes.length)]!;
        const fx = u.x, fy = u.y;
        const side = i % 2 === 0 ? 1 : -1;
        u.x = Math.min(FIELD.maxX, Math.max(FIELD.minX, tgt.x + 80 * side));
        u.y = tgt.y;
        u.facing = tgt.x >= u.x ? 1 : -1;
        this.emit('fx', { type: 'lyra_blink', u, x: fx, y: fy });
        this.emit('fx', { type: 'lyra_slash', u, target: tgt });
        const dealt = this.hit(u, tgt, 1.2, 'phys');
        if (dealt > 0) this.heal(u, u, dealt * 0.35);
      });
    }
    this.after(hits * every, () => {
      u.untargetable = false;
      this.emit('fx', { type: 'lyra_ult_end', u });
    });
  }

  private morwenUlt(u: Unit): void {
    u.lock = 0.9;
    // Le cercle runique se forme, puis la peste s'abat (synchronisé avec la cinématique)
    this.emit('fx', { type: 'morwen_charge', u, targets: this.foes(u, true), dur: ULT_CHARGE });
    this.after(ULT_CHARGE, () => {
      if (this.over) return;
      const foes = this.foes(u, true);
      this.emit('fx', { type: 'morwen_plague', u, targets: foes });
      for (const f of foes) {
        f.dots.push({ src: u, mult: 0.65, every: 0.5, timer: 0.5, left: 8 });
        f.slowT = Math.max(f.slowT, 4);
      }
    });
  }

  private serenUlt(u: Unit): void {
    u.lock = 0.6 + ULT_CHARGE;
    // Une flèche de lumière part vers le ciel… puis la pluie s'abat
    this.emit('fx', { type: 'seren_skyshot', u, dur: ULT_CHARGE });
    for (let w = 0; w < 5; w++) {
      this.after(ULT_CHARGE + w * 0.35, () => {
        if (!u.alive || this.over) return;
        const foes = this.foes(u, true);
        this.emit('fx', { type: 'seren_volley', u, targets: foes });
        this.after(0.3, () => { for (const f of foes) this.hit(u, f, 0.8, 'phys'); });
      });
    }
  }

  /** Thorne — Hiver Éternel : un mur de pics de glace traverse tout le terrain. */
  private thorneUlt(u: Unit): void {
    u.lock = 0.9 + ULT_CHARGE;
    this.emit('fx', { type: 'thorne_charge', u, dur: ULT_CHARGE });
    this.after(ULT_CHARGE, () => {
      if (!u.alive || this.over) return;
      const x0 = u.x + 70;
      this.emit('fx', { type: 'thorne_wave', u, x: x0, y: u.y, x2: FIELD.maxX + 160 });
      for (const f of this.foes(u, true)) {
        const delay = Math.max(0, f.x - x0) / THORNE_WAVE_SPEED;
        this.after(delay, () => {
          if (!f.alive || this.over) return;
          this.hit(u, f, 2.6, 'phys');
          this.freezeUnit(f, 2.2);
        });
      }
    });
  }

  /** Nyx — Éclipse : un soleil noir aspire et fige les ennemis, puis implose. */
  private nyxUlt(u: Unit): void {
    const foes = this.foes(u, true);
    const cx = Math.max(FIELD.minX + 200, Math.min(FIELD.maxX - 150, foes.reduce((s, f) => s + f.x, 0) / foes.length));
    const cy = clampY(foes.reduce((s, f) => s + f.y, 0) / foes.length);
    u.lock = 0.8 + ULT_CHARGE;
    this.emit('fx', { type: 'nyx_charge', u, x: cx, y: cy, dur: ULT_CHARGE });
    this.after(ULT_CHARGE, () => {
      if (this.over) return;
      this.emit('fx', { type: 'nyx_eclipse', u, x: cx, y: cy, dur: NYX_ECLIPSE });
      this.addZone(u, cx, cy, 2000, 300, NYX_ECLIPSE);
      for (const f of this.foes(u, true)) this.stunUnit(f, NYX_ECLIPSE + 0.1, true);
      for (let i = 0; i < 4; i++) {
        this.after(0.2 + i * 0.3, () => {
          if (this.over) return;
          for (const f of this.foes(u, true)) this.hit(u, f, 0.4, 'magic', false);
        });
      }
      this.after(NYX_ECLIPSE, () => {
        if (this.over) return;
        this.emit('fx', { type: 'nyx_implode', u, x: cx, y: cy });
        for (const f of this.foes(u, true)) {
          this.hit(u, f, 3.8, 'magic');
          this.stunUnit(f, 1, true);
        }
      });
    });
  }

  /** Ashka — Rage du Tonnerre : hâte pour toute l'équipe et éclairs sur les ennemis. */
  private ashkaUlt(u: Unit): void {
    u.lock = 0.6 + ULT_CHARGE;
    this.emit('fx', { type: 'ashka_charge', u, dur: ULT_CHARGE });
    this.after(ULT_CHARGE, () => {
      if (this.over) return;
      const allies = this.allies(u);
      this.emit('fx', { type: 'ashka_haste', u, targets: allies });
      for (const a of allies) a.hasteT = 6;
      for (let i = 0; i < 6; i++) {
        this.after(0.15 + i * 0.25, () => {
          if (this.over) return;
          const foes = this.foes(u, true);
          if (!foes.length) return;
          const t = foes[Math.floor(this.random() * foes.length)]!;
          this.emit('fx', { type: 'ashka_strike', u, target: t, x: t.x, y: t.y });
          this.hit(u, t, 0.7, 'magic');
        });
      }
    });
  }

  private aldricUlt(u: Unit): void {
    u.lock = 0.7 + ULT_CHARGE;
    this.emit('fx', { type: 'aldric_charge', u, targets: this.allies(u), dur: ULT_CHARGE });
    this.after(ULT_CHARGE, () => this.aldricSanctuary(u));
  }

  private aldricSanctuary(u: Unit): void {
    if (this.over) return;
    const allies = this.allies(u);
    this.emit('fx', { type: 'aldric_sanctuary', u, targets: allies });
    for (const a of allies) {
      a.dots.length = 0;
      a.stun = 0;
      a.slowT = 0;
      a.dmgRed = 0.35;
      a.dmgRedT = 5;
      this.after(0.2, () => this.heal(u, a, a.maxHp * 0.25 * u.skillPower));
    }
  }

  /* ---------- Ultimes de Vaelen, Sylvaine et Pyrrha ---------- */

  /** Rempart Écarlate : mur de flammes, étourdissement et équipe intouchable. */
  private vaelenUlt(u: Unit): void {
    const cx = u.x + 260, cy = u.y;
    u.lock = 1.1;
    this.emit('fx', { type: 'vaelen_wall', u, x: cx, y: cy, dur: 1.1 });
    // Les alliés deviennent intouchables une fraction de seconde
    for (const a of this.allies(u)) {
      a.untargetable = true;
      this.after(1.2, () => { if (a.alive) a.untargetable = false; });
    }
    this.after(0.45, () => {
      if (this.over || !u.alive) return;
      this.emit('fx', { type: 'vaelen_burst', u, x: cx, y: cy });
      for (const f of this.foes(u)) {
        if (Math.abs(f.x - cx) < 420) {
          this.hit(u, f, 3.0, 'magic');
          this.stunUnit(f, 1.8);
        }
      }
    });
  }

  /** Bois des Suppliciés : 8 traits de ronces qui enracinent. */
  private sylvaineUlt(u: Unit): void {
    u.lock = 1.0;
    this.emit('fx', { type: 'sylvaine_forest', u, x: u.x + 320, y: u.y, dur: 1.0 });
    for (let i = 0; i < 8; i++) {
      this.after(0.15 + i * 0.13, () => {
        if (this.over || !u.alive) return;
        const alive = this.foes(u);
        if (!alive.length) return;
        const t = alive[Math.floor(this.random() * alive.length)]!;
        this.emit('fx', { type: 'sylvaine_thorn', u, target: t });
        this.hit(u, t, 1.0, 'phys');
        t.slowT = Math.max(t.slowT, 1.5);
        this.stunUnit(t, 0.5);
      });
    }
  }

  /** Jugement de Flammes : 3 vagues de feu qui balaient le champ. */
  private pyrrhaUlt(u: Unit): void {
    u.lock = 1.2;
    this.emit('fx', { type: 'pyrrha_pyre', u, x: u.x, y: u.y, dur: 1.2 });
    for (let wave = 0; wave < 3; wave++) {
      this.after(0.3 + wave * 0.32, () => {
        if (this.over || !u.alive) return;
        this.emit('fx', { type: 'pyrrha_wave', u, x: u.x + 200, y: u.y });
        for (const f of this.foes(u)) {
          this.hit(u, f, 1.8, 'magic');
          f.dots.push({ src: u, mult: 0.4 * u.skillPower, every: 0.8, timer: 0.8, left: 7 });
        }
      });
    }
  }
}

export const clampY = (y: number): number => Math.max(FIELD.minY, Math.min(FIELD.maxY, y));

/** Étoiles obtenues : 3 sans perte, 2 si un ou deux héros tombent, 1 sinon. */
export function starsFor(sim: BattleSim): number {
  if (sim.winner !== 'hero') return 0;
  const dead = sim.heroes.filter((h) => !h.alive).length;
  return dead === 0 ? 3 : dead <= 2 ? 2 : 1;
}
