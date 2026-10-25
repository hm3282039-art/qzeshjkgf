/**
 * MOTEUR DE COMBAT TOUR PAR TOUR.
 *
 * Différence fondamentale avec `src/battle/Sim.ts` (temps réel, tout le monde frappe en
 * même temps) : ici **une seule unité agit à la fois**, dans l'ordre de sa VITESSE, et
 * c'est le joueur qui choisit la capacité et la cible.
 *
 *  - Initiative : chaque unité remplit une jauge (vitesse × temps). La première à 100
 *    joue. C'est le principe d'Epic Seven, et ça rend la VITESSE enfin lisible.
 *  - Recharges : chaque capacité a un nombre de TOURS de recharge. Au tour suivant il
 *    faut choisir autre chose — d'où l'intérêt d'avoir 3 capacités + 1 ultime.
 *  - Lignes : le corps à corps ne peut pas atteindre une ligne encore couverte, la ligne
 *    arrière prend −10 % de dégâts mais tape +10 %. Le placement devient une décision.
 *  - Âmes : chaque capacité en génère ; en dépenser 3 « embrase » un coup (×1,5).
 *
 * Le moteur ne touche jamais au DOM : il rend une liste d'événements que l'interface
 * joue dans l'ordre. Même graine ⇒ même combat (tests/test-tour.ts).
 */
import { classMultiplier, heroStatMult, skillMult, skillTiers, type HeroClass, type HeroDef, type UnitDef } from '../data/heroes';
import type { GearBonus } from '../data/items';
import type { BattleEvent, DamageKind, Row, Side, StatusId, StatusSpec, TurnSkill } from './types';
import { GAUGE_FULL, MAX_TURNS, ROW_BONUS, ROW_DEPTH, SOUL_BURN_COST, SOUL_MAX, TOUR_DAMAGE, TOUR_DOT } from './types';

/** Générateur pseudo-aléatoire déterministe (mulberry32). */
export function rng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

let SEQ = 1;

/** Réinitialise la numérotation des unités (tests reproductibles). */
export function resetUid(): void { SEQ = 1; }

export interface ActiveStatus {
  id: StatusId;
  /** Tours restants, décrémentés au début du tour du porteur. */
  turns: number;
  /** Intensité : multiple d'ATQ (dégâts sur la durée, soin), fraction de PV max
   *  (bouclier) ou fraction (bonus/malus). */
  power: number;
  /** Auteur du statut (la provocation renvoie vers lui). */
  src: number;
}

export interface FoeInit {
  def: UnitDef;
  row: Row;
  slot: number;
  scale: { hp: number; atk: number };
  level: number;
  skills: TurnSkill[];
  synergy?: number;
}

export interface HeroInit {
  def: HeroDef;
  row: Row;
  slot: number;
  level: number;
  stars?: number;
  red?: number;
  gear?: GearBonus;
  skills: TurnSkill[];
  synergy?: number;
}

/** Une unité du combat tour par tour. */
export class TUnit {
  readonly uid = SEQ++;
  readonly def: UnitDef;
  readonly side: Side;
  readonly row: Row;
  readonly slot: number;
  readonly name: string;
  readonly cls: HeroClass;
  readonly texture: string;
  readonly color: number;
  /** Teinte d'interface du héros (vide pour un ennemi). */
  readonly accent: string;
  readonly ranged: boolean;
  readonly isBoss: boolean;
  readonly hero?: HeroDef;
  readonly level: number;

  readonly maxHp: number;
  hp: number;
  readonly baseAtk: number;
  readonly baseArmor: number;
  readonly baseRes: number;
  readonly crit: number;
  readonly speed: number;
  /** Puissance des capacités : +25 % par palier de 10 niveaux. */
  readonly skillPower: number;

  /** Jauge d'initiative, 0…100. */
  gauge = 0;
  readonly skills: TurnSkill[] = [];
  /** Tours de recharge restants, indexés comme `skills`. */
  readonly cd: number[] = [];
  readonly statuses: ActiveStatus[] = [];
  shield = 0;
  alive = true;
  dealt = 0;
  taken = 0;
  healed = 0;

  constructor(side: Side, row: Row, slot: number, def: UnitDef, opts: {
    hero?: HeroDef; level?: number; stars?: number; red?: number; gear?: GearBonus;
    scale?: { hp: number; atk: number }; synergy?: number;
  } = {}) {
    const s = def.stats;
    const g = opts.gear;
    const sc = opts.scale ?? { hp: 1, atk: 1 };
    const syn = 1 + (opts.synergy ?? 0);
    const m = opts.hero ? heroStatMult(opts.hero, opts.stars ?? opts.hero.stars, opts.level ?? 1, opts.red ?? 0) : 1;
    const bonus = ROW_BONUS[row];

    this.side = side;
    this.row = row;
    this.slot = slot;
    this.def = def;
    this.hero = opts.hero;
    this.level = opts.level ?? 1;
    this.name = opts.hero?.name ?? def.name;
    this.cls = def.cls;
    this.texture = def.texture;
    this.color = def.color;
    this.accent = opts.hero?.css ?? '';
    this.ranged = !!def.projectile;
    this.isBoss = !!def.bossUlt;

    this.maxHp = Math.max(1, Math.round(s.hp * m * (g?.hp ?? 1) * sc.hp * syn * bonus.hp));
    this.hp = this.maxHp;
    this.baseAtk = Math.max(1, Math.round(s.atk * m * (g?.atk ?? 1) * sc.atk * syn * bonus.atk));
    this.baseArmor = Math.max(0, Math.round(s.armor * (g?.armor ?? 1) * bonus.armor));
    this.baseRes = Math.max(0, Math.round(s.res * (g?.res ?? 1) * bonus.armor));
    this.crit = Math.min(0.75, s.crit + (g?.crit ?? 0));
    this.speed = Math.max(20, s.speed);
    this.skillPower = opts.hero ? skillMult(skillTiers(this.level)) : 1;
  }

  bindSkills(skills: TurnSkill[]): void {
    this.skills.length = 0;
    this.cd.length = 0;
    for (const s of skills) {
      this.skills.push(s);
      // L'ultime démarre à mi-recharge : elle n'arrive jamais au premier tour.
      this.cd.push(s.ultimate ? Math.max(2, Math.ceil(s.cooldown / 2)) : 0);
    }
  }

  get ratio(): number { return this.maxHp > 0 ? this.hp / this.maxHp : 0; }
  status(id: StatusId): ActiveStatus | undefined { return this.statuses.find((s) => s.id === id); }
  has(id: StatusId): boolean { return !!this.status(id); }
  sum(id: StatusId): number { return this.statuses.filter((s) => s.id === id).reduce((a, s) => a + s.power, 0); }

  get atk(): number { return Math.max(1, Math.round(this.baseAtk * (1 + this.sum('atkUp') - this.sum('atkDown')))); }
  get armor(): number { return Math.max(0, Math.round(this.baseArmor * (1 + this.sum('defUp') - this.sum('defDown')))); }
  get res(): number { return Math.max(0, Math.round(this.baseRes * (1 + this.sum('defUp') - this.sum('defDown')))); }
  get effSpeed(): number { return Math.max(10, this.speed * (1 + this.sum('haste') - this.sum('slow'))); }
  get stunned(): boolean { return this.has('stun') || this.has('freeze'); }
  get targetable(): boolean { return this.alive && !this.has('stealth'); }
  /** Une capacité est jouable quand sa recharge est retombée à zéro. */
  ready(i: number): boolean { return (this.cd[i] ?? 1) <= 0; }

  addStatus(id: StatusId, turns: number, power: number, src: number): void {
    const found = this.status(id);
    if (found) {
      // On garde le plus fort et on rafraîchit la durée : jamais d'empilement infini.
      found.power = Math.max(found.power, power);
      found.turns = Math.max(found.turns, turns);
      found.src = src;
    } else {
      this.statuses.push({ id, turns, power, src });
    }
    if (id === 'shield') this.shield = Math.max(this.shield, Math.round(power * this.maxHp));
  }

  /** Retire ce qui a expiré et renvoie les statuts disparus. */
  expire(): StatusId[] {
    const gone: StatusId[] = [];
    for (let i = this.statuses.length - 1; i >= 0; i--) {
      const s = this.statuses[i]!;
      if (s.turns <= 0) { gone.push(s.id); this.statuses.splice(i, 1); }
    }
    if (!this.has('shield')) this.shield = 0;
    return gone;
  }
}

export interface TurnStart {
  /** L'unité qui doit jouer maintenant, `null` si le combat est terminé. */
  actor: TUnit | null;
  /** Ce qui s'est passé en route : dégâts sur la durée, tour passé, morts, fin. */
  events: BattleEvent[];
}

export interface AiChoice { skill: number; target: number | null; burn: boolean; }

export interface UnitSnapshot {
  uid: number; name: string; side: Side; row: Row; slot: number; alive: boolean;
  hp: number; maxHp: number; shield: number; gauge: number; cd: number[];
  statuses: { id: StatusId; turns: number }[];
}

export interface BattleSnapshot {
  turn: number; winner: Side | null; soul: Record<Side, number>; units: UnitSnapshot[];
}

/**
 * Un combat tour par tour complet : deux équipes de 6 emplacements (2 devant, 2 au
 * milieu, 2 derrière), une jauge d'initiative par unité, des recharges en tours.
 */
export class TurnBattle {
  readonly units: TUnit[] = [];
  readonly heroes: TUnit[] = [];
  readonly foes: TUnit[] = [];
  readonly soul: Record<Side, number> = { hero: 0, enemy: 0 };
  readonly log: BattleEvent[] = [];
  turn = 0;
  winner: Side | null = null;
  /** Le combat est terminé (victoire, défaite OU match nul au plafond de tours). */
  over = false;
  current: TUnit | null = null;
  private readonly rnd: () => number;

  constructor(seed = 1234) { this.rnd = rng(seed); }

  /* ---------------------------- mise en place --------------------------- */

  addHero(init: HeroInit): TUnit {
    const u = new TUnit('hero', init.row, init.slot, init.def, {
      hero: init.def, level: init.level, stars: init.stars, red: init.red,
      gear: init.gear, synergy: init.synergy,
    });
    u.bindSkills(init.skills);
    this.units.push(u);
    this.heroes.push(u);
    return u;
  }

  addFoe(init: FoeInit): TUnit {
    const u = new TUnit('enemy', init.row, init.slot, init.def, {
      level: init.level, scale: init.scale, synergy: init.synergy,
    });
    u.bindSkills(init.skills);
    this.units.push(u);
    this.foes.push(u);
    return u;
  }

  alive(side: Side): TUnit[] { return this.units.filter((u) => u.side === side && u.alive); }
  byUid(uid: number): TUnit | undefined { return this.units.find((u) => u.uid === uid); }

  /* ------------------------------ initiative ---------------------------- */

  /**
   * Ordre prévisionnel des N prochains acteurs : c'est la barre de tour affichée en haut
   * de l'écran. Ne modifie rien, on simule sur une copie des jauges.
   */
  turnOrder(n = 6): TUnit[] {
    const pool = this.alive('hero').concat(this.alive('enemy'));
    if (pool.length === 0) return [];
    const gauge = new Map<number, number>(pool.map((u) => [u.uid, u.gauge]));
    const out: TUnit[] = [];
    for (let i = 0; i < n; i++) {
      let best: TUnit | null = null;
      let bestT = Infinity;
      for (const u of pool) {
        const t = (GAUGE_FULL - (gauge.get(u.uid) ?? 0)) / u.effSpeed;
        if (t < bestT || (t === bestT && best && u.uid < best.uid)) { best = u; bestT = t; }
      }
      if (!best || !isFinite(bestT)) break;
      for (const u of pool) gauge.set(u.uid, (gauge.get(u.uid) ?? 0) + u.effSpeed * bestT);
      gauge.set(best.uid, 0);
      out.push(best);
    }
    return out;
  }

  /**
   * Fait avancer le temps jusqu'au prochain acteur et joue son début de tour. Si une
   * unité est étourdie, elle perd son tour et on enchaîne sur la suivante : la fonction
   * renvoie toujours la première unité qui agit vraiment (ou `null` si le combat finit).
   */
  advance(): TurnStart {
    const events: BattleEvent[] = [];
    if (this.over) return { actor: null, events };

    for (let guard = 0; guard < 128; guard++) {
      const pool = this.alive('hero').concat(this.alive('enemy'));
      if (pool.length === 0) break;

      let actor: TUnit | null = null;
      let best = Infinity;
      for (const u of pool) {
        const t = (GAUGE_FULL - u.gauge) / u.effSpeed;
        if (t < best || (t === best && actor && u.uid < actor.uid)) { actor = u; best = t; }
      }
      if (!actor || !isFinite(best)) break;

      for (const u of pool) u.gauge = Math.min(GAUGE_FULL, u.gauge + u.effSpeed * best);
      actor.gauge = 0;
      this.current = actor;

      const canAct = this.startOfTurn(actor, events);
      if (this.checkEnd(events)) { this.current = null; return { actor: null, events }; }
      if (canAct && actor.alive) {
        events.push({ type: 'turn', uid: actor.uid, name: actor.name, side: actor.side, turn: this.turn + 1 });
        return { actor, events };
      }
    }
    this.current = null;
    this.checkEnd(events);
    return { actor: null, events };
  }

  /**
   * Début de tour : les recharges descendent, les durées descendent, les dégâts/soins
   * sur la durée s'appliquent. Renvoie `false` si l'unité perd son tour.
   */
  private startOfTurn(u: TUnit, ev: BattleEvent[]): boolean {
    for (let i = 0; i < u.cd.length; i++) u.cd[i] = Math.max(0, u.cd[i] - 1);
    for (const s of u.statuses) s.turns -= 1;

    for (const s of [...u.statuses]) {
      if (s.id === 'poison' || s.id === 'burn' || s.id === 'bleed') {
        const kind: DamageKind = s.id === 'bleed' ? 'phys' : 'magic';
        const raw = Math.round(u.maxHp * 0.05 + u.baseAtk * s.power * 0.4);
        const hit = this.deal(u, u, raw, kind, 0, true);
        ev.push({ type: 'dot', tgt: u.uid, id: s.id, amount: hit.amount, hp: Math.max(0, u.hp) });
        if (!u.alive) { ev.push({ type: 'death', uid: u.uid, name: u.name, side: u.side }); return false; }
      } else if (s.id === 'hot' && u.hp < u.maxHp) {
        const amount = Math.min(u.maxHp - u.hp, Math.round(u.baseAtk * s.power * 0.8 + u.maxHp * 0.03));
        u.hp += amount;
        u.healed += amount;
        ev.push({ type: 'heal', src: u.uid, tgt: u.uid, amount, hp: u.hp });
      }
    }
    u.expire();

    if (u.stunned) {
      ev.push({ type: 'skip', uid: u.uid, reason: u.has('stun') ? 'stun' : 'freeze' });
      u.gauge = 0;
      this.current = null;
      this.turn++;
      return false;
    }
    return true;
  }

  /* -------------------------------- cibles ------------------------------ */

  /** Ligne la plus avancée encore debout d'un côté : le mur du corps à corps. */
  frontRow(side: Side): Row | null {
    for (const r of ROW_DEPTH) {
      if (this.units.some((u) => u.side === side && u.row === r && u.alive)) return r;
    }
    return null;
  }

  /** Cibles autorisées d'une capacité : c'est ici que le placement compte. */
  legalTargets(u: TUnit, skill: TurnSkill): TUnit[] {
    const foeSide: Side = u.side === 'hero' ? 'enemy' : 'hero';
    const foes = this.alive(foeSide).filter((f) => f.targetable);
    const allies = this.alive(u.side).filter((a) => a.targetable);
    const front = this.frontRow(foeSide);
    const frontLine = foes.filter((f) => f.row === front);

    // Un ennemi qui nous provoque devient la cible obligatoire de nos coups directs.
    const taunt = u.status('taunt');
    if (taunt && (skill.target === 'enemyFront' || skill.target === 'enemyAny')) {
      const src = this.byUid(taunt.src);
      if (src && src.alive && src.targetable) return [src];
    }

    switch (skill.target) {
      case 'enemyFront':
      case 'enemyFrontRow':
        return frontLine.length > 0 ? frontLine : foes;
      case 'enemyAny':
      case 'enemyAll':
        return foes;
      case 'allyAny':
        return allies;
      case 'allyLowest': {
        if (allies.length === 0) return [];
        const hurt = allies.filter((a) => a.hp < a.maxHp);
        const pool = hurt.length > 0 ? hurt : allies;
        return [pool.reduce((a, b) => (a.ratio <= b.ratio ? a : b))];
      }
      case 'allAllies':
        return allies;
      case 'self':
        return [u];
    }
  }

  /** Cibles réelles du coup joué (règle + choix du joueur + garde du corps). */
  private targetsFor(u: TUnit, skill: TurnSkill, chosen: number | null): TUnit[] {
    const legal = this.legalTargets(u, skill);
    if (legal.length === 0) return [];
    const multi = skill.target === 'enemyAll' || skill.target === 'enemyFrontRow'
      || skill.target === 'allAllies' || skill.target === 'allyLowest' || skill.target === 'self';
    let list: TUnit[];
    if (multi) {
      list = legal;
    } else if (chosen != null) {
      const picked = legal.find((t) => t.uid === chosen);
      list = picked ? [picked] : [legal[0]!];
    } else {
      list = [legal.reduce((a, b) => (a.ratio <= b.ratio ? a : b))];
    }
    // Un garde du corps attire les coups qui visent sa ligne arrière.
    if (list.length === 1 && skill.kind !== 'heal' && skill.kind !== 'support') {
      const t = list[0]!;
      if (t.row === 'back') {
        const guard = this.alive(t.side).find((a) => a.has('guard') && a.uid !== t.uid);
        if (guard) list = [guard];
      }
    }
    return list;
  }

  /* -------------------------------- dégâts ------------------------------ */

  /**
   * Applique des dégâts et renvoie le détail. `dot` = dégâts sur la durée : pas de
   * critique, pas de malus de ligne, pas de riposte.
   */
  private deal(src: TUnit, tgt: TUnit, raw: number, kind: DamageKind, pierce: number, dot: boolean): { amount: number; crit: boolean } {
    if (!tgt.alive) return { amount: 0, crit: false };
    if (tgt.has('invuln')) return { amount: 0, crit: false };

    const defStat = kind === 'phys' ? tgt.armor : kind === 'magic' ? tgt.res : 0;
    const mitigation = kind === 'true' ? 1 : 100 / (100 + Math.max(0, defStat * (1 - Math.min(0.9, pierce))));
    const cm = classMultiplier(src.cls, tgt.cls);
    const variance = dot ? 1 : 0.92 + this.rnd() * 0.16;
    const crit = !dot && this.rnd() < src.crit;

    let amount = Math.max(1, Math.round(raw * cm * variance * mitigation * (crit ? 1.75 : 1) * (dot ? TOUR_DOT : TOUR_DAMAGE)));
    if (!dot) {
      if (tgt.row === 'back') amount = Math.max(1, Math.round(amount * 0.9));      // ligne arrière couverte
      const front = this.frontRow(tgt.side);
      if (!src.ranged && kind === 'phys' && front && tgt.row !== front) {
        amount = Math.max(1, Math.round(amount * 0.75));                            // frapper à travers la ligne
      }
      if (tgt.has('freeze')) amount = Math.round(amount * 1.25);                     // le gel rend fragile
    }

    let left = amount;
    if (tgt.shield > 0) {
      const absorbed = Math.min(tgt.shield, left);
      tgt.shield -= absorbed;
      left -= absorbed;
      if (tgt.shield <= 0) {
        const i = tgt.statuses.findIndex((s) => s.id === 'shield');
        if (i >= 0) tgt.statuses.splice(i, 1);
      }
    }
    tgt.hp = Math.max(0, tgt.hp - left);
    tgt.taken += amount;
    src.dealt += amount;
    if (tgt.hp <= 0 && tgt.alive) { tgt.alive = false; tgt.statuses.length = 0; tgt.shield = 0; }
    return { amount, crit };
  }

  /* -------------------------------- action ------------------------------ */

  /**
   * Joue une capacité. `skillIndex` 0…3, `targetUid` = cible choisie par le joueur
   * (null = choix automatique), `burn` = dépenser 3 âmes pour renforcer le coup.
   * Renvoie les événements à animer, dans l'ordre.
   */
  resolve(skillIndex: number, targetUid: number | null, burn = false): BattleEvent[] {
    const ev: BattleEvent[] = [];
    const u = this.current;
    if (!u || !u.alive || this.over) return ev;
    const skill = u.skills[skillIndex];
    if (!skill || !u.ready(skillIndex)) return ev;

    const canBurn = burn && this.soul[u.side] >= SOUL_BURN_COST;
    if (canBurn) this.soul[u.side] = Math.max(0, this.soul[u.side] - SOUL_BURN_COST);
    ev.push({ type: 'cast', uid: u.uid, skill: skill.name, ultimate: !!skill.ultimate, burn: canBurn });

    this.soul[u.side] = Math.min(SOUL_MAX, this.soul[u.side] + skill.soul);
    ev.push({ type: 'soul', side: u.side, amount: skill.soul, total: this.soul[u.side] });

    const targets = this.targetsFor(u, skill, targetUid);
    const power = skill.mult * u.skillPower * (canBurn ? 1.5 : 1);
    const chanceBonus = canBurn ? 0.25 : 0;

    for (const t of targets) {
      if (!u.alive) break;

      if (skill.kind === 'heal') {
        if (t.alive && t.hp < t.maxHp && skill.mult > 0) {
          const amount = Math.min(t.maxHp - t.hp, Math.round(u.atk * power));
          t.hp += amount;
          u.healed += amount;
          ev.push({ type: 'heal', src: u.uid, tgt: t.uid, amount, hp: t.hp });
        }
        if (t.alive) this.applyEffects(u, t, skill.effects, chanceBonus, ev);
        continue;
      }

      const hits = Math.max(1, skill.hits);
      for (let h = 0; h < hits; h++) {
        if (!t.alive || !u.alive) break;
        const raw = u.atk * power;
        const hit = this.deal(u, t, raw, skill.kind as DamageKind, skill.pierce ?? 0, false);
        ev.push({ type: 'damage', src: u.uid, tgt: t.uid, amount: hit.amount, crit: hit.crit, kind: skill.kind as DamageKind, hp: Math.max(0, t.hp), shield: t.shield });
        if (!t.alive) { ev.push({ type: 'death', uid: t.uid, name: t.name, side: t.side }); break; }

        const counter = t.status('counter');
        if (counter && u.alive && u.side !== t.side) {
          const back = this.deal(t, u, Math.round(t.atk * counter.power), 'true', 0, true);
          if (back.amount > 0) ev.push({ type: 'damage', src: t.uid, tgt: u.uid, amount: back.amount, crit: false, kind: 'true', hp: Math.max(0, u.hp), shield: u.shield });
          if (!u.alive) { ev.push({ type: 'death', uid: u.uid, name: u.name, side: u.side }); break; }
        }
      }
      if (t.alive) this.applyEffects(u, t, skill.effects, chanceBonus, ev);
    }

    // Les effets « sur soi » (bouclier, invulnérabilité, bonus d'attaque…).
    if (u.alive) {
      for (const e of skill.effects) if (e.self) this.applyOne(u, u, e, chanceBonus, ev);
    }

    // Les effets d'équipe : ils tombent sur tous les alliés vivants, en plus de la cible.
    if (skill.team && skill.team.length > 0) {
      for (const ally of this.alive(u.side)) {
        for (const e of skill.team) this.applyOne(u, ally, e, chanceBonus, ev);
      }
    }

    u.cd[skillIndex] = skill.cooldown;
    u.gauge = 0;
    this.current = null;
    this.turn++;
    for (const e of ev) this.log.push(e);
    this.checkEnd(ev);
    return ev;
  }

  private applyEffects(src: TUnit, tgt: TUnit, effects: StatusSpec[], bonus: number, ev: BattleEvent[]): void {
    for (const e of effects) if (!e.self) this.applyOne(src, tgt, e, bonus, ev);
  }

  private applyOne(src: TUnit, tgt: TUnit, e: StatusSpec, bonus: number, ev: BattleEvent[]): void {
    if (!tgt.alive) return;
    const chance = Math.min(1, (e.chance ?? 1) + bonus);
    if (chance < 1 && this.rnd() >= chance) {
      ev.push({ type: 'status', tgt: tgt.uid, id: e.id, turns: 0, applied: false });
      return;
    }
    tgt.addStatus(e.id, e.turns, e.power, src.uid);
    if (e.id === 'shield') ev.push({ type: 'shield', src: src.uid, tgt: tgt.uid, amount: Math.round(e.power * tgt.maxHp) });
    ev.push({ type: 'status', tgt: tgt.uid, id: e.id, turns: e.turns, applied: true });
  }

  /* --------------------------------- fin -------------------------------- */

  private checkEnd(ev: BattleEvent[]): boolean {
    if (this.over) return true;
    const heroesAlive = this.alive('hero').length;
    const foesAlive = this.alive('enemy').length;
    if (foesAlive === 0 || heroesAlive === 0 || this.turn >= MAX_TURNS) {
      this.over = true;
      this.winner = foesAlive === 0 ? 'hero' : heroesAlive === 0 ? 'enemy' : null;
      const end: BattleEvent = { type: 'end', winner: this.winner, turns: this.turn };
      ev.push(end);
      this.log.push(end);
      this.current = null;
      return true;
    }
    return false;
  }

  /* ---------------------------------- IA -------------------------------- */

  /** Choix de l'ennemi (et du mode auto du joueur) : mêmes règles, décidées ici. */
  aiChoice(u: TUnit): AiChoice {
    const ready: number[] = [];
    for (let i = 0; i < u.skills.length; i++) if (u.ready(i)) ready.push(i);
    const pool = ready.length > 0 ? ready : [0];
    const foes = this.alive(u.side === 'hero' ? 'enemy' : 'hero').filter((f) => f.targetable);
    const hurtAllies = this.alive(u.side).filter((a) => a.hp < a.maxHp);
    const hurt = hurtAllies.length > 0 ? hurtAllies.reduce((a, b) => (a.ratio <= b.ratio ? a : b)) : null;

    let bestIdx = pool[0]!;
    let bestScore = -Infinity;
    for (const i of pool) {
      const s = u.skills[i]!;
      const legal = this.legalTargets(u, s);
      if (legal.length === 0) continue;
      let score: number;
      if (s.kind === 'heal') {
        score = hurt && hurt.ratio < 0.6 ? 6 + (1 - hurt.ratio) * 8 : -2;
      } else if (s.kind === 'support') {
        score = this.turn < 4 ? 2.4 : 1.5;
      } else {
        score = s.mult * Math.max(1, s.hits) * (s.ultimate ? 1.2 : 1);
        if (s.target === 'enemyAll' || s.target === 'enemyFrontRow') score *= Math.min(3, legal.length) * 0.6;
        if (legal.some((t) => t.hp + t.shield < u.atk * s.mult * u.skillPower * 0.6)) score += 5;
      }
      if (score > bestScore) { bestScore = score; bestIdx = i; }
    }

    const skill = u.skills[bestIdx]!;
    const legal = this.legalTargets(u, skill);
    let target: number | null = null;
    if (legal.length > 0) {
      const direct = skill.target !== 'allyLowest' && skill.target !== 'allAllies' && skill.target !== 'self';
      if (direct) {
        const lethal = legal.filter((t) => t.hp + t.shield < u.atk * skill.mult * u.skillPower * 0.6);
        const pick = (lethal.length > 0 ? lethal : legal).reduce((a, b) => (a.ratio <= b.ratio ? a : b));
        target = pick.uid;
      } else {
        target = legal[0]!.uid;
      }
    }
    const burn = this.soul[u.side] >= SOUL_BURN_COST && skill.mult > 0 && (foes.length >= 2 || skill.cooldown >= 3);
    return { skill: bestIdx, target, burn };
  }

  snapshot(): BattleSnapshot {
    return {
      turn: this.turn,
      winner: this.winner,
      soul: { ...this.soul },
      units: this.units.map((u) => ({
        uid: u.uid, name: u.name, side: u.side, row: u.row, slot: u.slot, alive: u.alive,
        hp: u.hp, maxHp: u.maxHp, shield: u.shield, gauge: Math.round(u.gauge), cd: [...u.cd],
        statuses: u.statuses.map((s) => ({ id: s.id, turns: s.turns })),
      })),
    };
  }
}
