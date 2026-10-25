/**
 * FORMATION ET MONTAGE D'UN COMBAT TOUR PAR TOUR.
 *
 * Fait le lien entre les données existantes (un niveau de campagne, une équipe avec
 * niveaux/étoiles/équipement) et le moteur tour par tour. Les 6 emplacements sont
 * 2 DEVANT / 2 MILIEU / 2 DERRIÈRE, et c'est le joueur qui décide : `autoFormation`
 * n'est qu'une proposition de départ (le bouton « Auto » de l'interface).
 */
import { stageEnemyScale, type HeroDef, type Role, type StageDef, type TeamMember, type UnitDef } from '../data/heroes';
import { TurnBattle, type FoeInit, type HeroInit } from './engine';
import { foeSkills, skillsOf } from './skills';
import type { Row } from './types';

/** Deux emplacements par ligne, soit six héros au maximum. */
export const ROW_SLOTS = 2;
export const MAX_TEAM = 6;

export interface Placement {
  row: Row;
  /** Emplacement dans la ligne : 0 ou 1. */
  slot: number;
}

/** Ligne naturelle d'un rôle (proposition, jamais une obligation). */
export function rowOfRole(role: Role): Row {
  switch (role) {
    case 'Tank':
    case 'Guerrier':
      return 'front';
    case 'Mage':
    case 'Soutien':
      return 'mid';
    case 'Assassin':
    case 'Tireur':
      return 'back';
  }
}

/** Premier emplacement libre d'une ligne, sinon la ligne la plus proche libre. */
function findSlot(filled: Placement[], wanted: Row): Placement | null {
  const order: Row[] = wanted === 'front' ? ['front', 'mid', 'back']
    : wanted === 'mid' ? ['mid', 'front', 'back']
      : ['back', 'mid', 'front'];
  for (const row of order) {
    for (let slot = 0; slot < ROW_SLOTS; slot++) {
      if (!filled.some((f) => f.row === row && f.slot === slot)) return { row, slot };
    }
  }
  return null;
}

/**
 * Proposition de formation : les tanks devant, les mages au milieu, les tireurs et
 * assassins derrière. Renvoie un placement par héros, dans l'ordre de l'équipe.
 */
export function autoFormation(team: readonly { def: HeroDef }[]): Placement[] {
  const filled: Placement[] = [];
  const out: Placement[] = [];
  // On place d'abord ceux qui veulent être devant, puis le reste : la ligne avant
  // est la plus précieuse, ce sont les tanks qui doivent l'occuper.
  const order = team
    .map((t, i) => ({ i, row: rowOfRole(t.def.role) }))
    .sort((a, b) => (a.row === 'front' ? -1 : b.row === 'front' ? 1 : a.row === 'mid' ? -1 : b.row === 'mid' ? 1 : 0) || a.i - b.i);
  for (const o of order) {
    const p = findSlot(filled, o.row);
    if (p) { filled.push(p); out[o.i] = p; }
  }
  return out.filter(Boolean);
}

/** Placement des ennemis d'un niveau : boss devant, distance derrière. */
export function foePlacement(enemies: readonly { def: UnitDef; boss?: boolean }[]): Placement[] {
  const filled: Placement[] = [];
  const out: Placement[] = [];
  enemies.forEach((e, i) => {
    const wanted: Row = e.boss || e.def.bossUlt ? 'front' : e.def.projectile ? 'back' : 'mid';
    const p = findSlot(filled, wanted);
    if (p) { filled.push(p); out[i] = p; }
  });
  return out.filter(Boolean);
}

/** Synergie de classe : deux héros de la même classe se renforcent (+5 %). */
function synergyOf(def: HeroDef, team: readonly { def: HeroDef }[]): number {
  const same = team.filter((t) => t.def.cls === def.cls).length;
  return same > 1 ? 0.05 * (same - 1) : 0;
}

/**
 * Facteur de PV des ennemis en tour par tour.
 *
 * Un combat en temps réel place 20 à 30 coups par unité ; un combat tour par tour en
 * place une dizaine. Avec les mêmes PV, le boss d'un niveau de campagne devenait un mur
 * (mesuré : 3-5 injouable au niveau conseillé, l'Engloutisseur finissait à 93 % de ses
 * PV). On descend donc le budget de PV ennemi — facteur choisi par la mesure, pas au
 * doigt mouillé (×0,60 : 100 % de victoires au niveau conseillé en 34 tours, 88 % à
 * −35 % de niveau). C'est le rôle de
 * tests/test-tour.ts de vérifier que le niveau conseillé reste le bon.
 */
export const TOUR_FOE_HP = 0.60;
/** L'attaque ennemie reste celle du niveau : c'est la durée du combat qui change. */
export const TOUR_FOE_ATK = 1.0;

export interface BattleSetup {
  stage: StageDef;
  team: TeamMember[];
  placements: Placement[];
  seed?: number;
  /** Facteur de PV ennemis (défaut : {@link TOUR_FOE_HP}). Sert au calibrage. */
  foeHp?: number;
  /** Facteur d'attaque ennemie (défaut : {@link TOUR_FOE_ATK}). */
  foeAtk?: number;
}

/** Construit un combat tour par tour prêt à jouer pour un niveau de campagne. */
export function buildBattle(setup: BattleSetup): TurnBattle {
  const { stage, team, placements } = setup;
  const battle = new TurnBattle(setup.seed ?? 1234);
  const base = stageEnemyScale(stage);
  const scale = { hp: base.hp * (setup.foeHp ?? TOUR_FOE_HP), atk: base.atk * (setup.foeAtk ?? TOUR_FOE_ATK) };

  team.slice(0, MAX_TEAM).forEach((m, i) => {
    const p = placements[i] ?? autoFormation(team)[i] ?? { row: 'mid' as Row, slot: i % ROW_SLOTS };
    const init: HeroInit = {
      def: m.def, row: p.row, slot: p.slot, level: m.level, stars: m.stars, red: m.red,
      gear: m.gear, skills: skillsOf(m.def), synergy: synergyOf(m.def, team),
    };
    battle.addHero(init);
  });

  // Les PASSIFS s'appliquent une fois pour toutes au début du combat : le bouton
  // est là pour la lecture, mais on ne l'utilise jamais.
  battle.heroes.forEach((u) => {
    for (const sk of u.skills) {
      if (!sk.passive) continue;
      for (const e of sk.effects) {
        if (e.self) u.addStatus(e.id, e.turns, e.power, u.uid);
      }
    }
  });

  const fp = foePlacement(stage.enemies);
  stage.enemies.slice(0, MAX_TEAM).forEach((e, i) => {
    const p = fp[i] ?? { row: 'front' as Row, slot: i % ROW_SLOTS };
    const init: FoeInit = {
      def: e.def, row: p.row, slot: p.slot, scale, level: stage.level,
      skills: foeSkills(e.def), synergy: 0,
    };
    battle.addFoe(init);
  });

  return battle;
}

/** Une équipe de test : les héros donnés, tous au même niveau. */
export function testTeam(defs: HeroDef[], level: number): TeamMember[] {
  return defs.slice(0, MAX_TEAM).map((def) => ({ def, level, stars: def.stars }));
}
