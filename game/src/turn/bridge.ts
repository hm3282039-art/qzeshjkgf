/**
 * PONT entre le moteur tour par tour (`src/turn/engine.ts`) et la scène de combat
 * d'origine (`src/battle/BattleScene.ts`).
 *
 * Le joueur a demandé à retrouver l'interface du jeu : le terrain dessiné, les
 * personnages animés, les chiffres de dégâts qui volent, les cinématiques d'ultime —
 * et simplement des boutons en bas pour choisir la capacité. Plutôt que de refaire un
 * affichage, on donne à la scène existante de vraies unités `Unit` (celles du combat
 * temps réel) dont les PV / boucliers / statuts sont recopiés depuis le moteur tour par
 * tour après chaque événement. La scène ne voit donc aucune différence : elle anime,
 * filme et met en scène exactement comme avant.
 *
 * Le pont émet aussi les événements `SimEvents` (cast, damage, heal, death, end…) que
 * la scène écoute d'habitude sur la simulation temps réel : c'est ce qui déclenche les
 * attaques, les impacts, les morts et la musique de fin.
 */
import { Unit, type SimEvents } from '../battle/Sim';
import type { StageDef } from '../data/heroes';
import type { Side } from './types';
import { Emitter } from '../utils/Emitter';
import type { TurnBattle, TUnit } from './engine';
import type { Row } from './types';

/**
 * Les 6 emplacements du tour par tour, posés sur le vrai terrain (repères du combat
 * temps réel : héros à gauche vers x 300-700, ennemis à droite vers x 1250-1700,
 * sol entre y 690 et 900). Deux cases par ligne.
 */
export const HERO_SLOTS: Record<Row, readonly [readonly [number, number], readonly [number, number]]> = {
  front: [[660, 760], [625, 870]],
  mid: [[520, 715], [490, 830]],
  back: [[380, 760], [340, 880]],
};

/** Miroir côté ennemi : devant = proche des héros, derrière = fond droit. */
export const FOE_SLOTS: Record<Row, readonly [readonly [number, number], readonly [number, number]]> = {
  front: [[1255, 725], [1285, 875]],
  mid: [[1430, 715], [1460, 880]],
  back: [[1600, 760], [1635, 870]],
};

/**
 * Une simulation « fantôme » : elle ne calcule rien (c'est le moteur tour par tour qui
 * décide de tout), elle porte seulement les unités rendues et les compteurs de fin
 * (vainqueur, durée, dégâts par héros) que la scène lit pour son écran de résultat.
 */
export class TurnBridge extends Emitter<SimEvents> {
  readonly units: Unit[] = [];
  /** Durée réelle du combat en secondes (pour l'écran de résultat). */
  time = 0;
  winner: Side | null = null;
  /** Lu par la scène en mode entraînement uniquement : jamais utilisé ici. */
  heroDamage = 0;
  private readonly rendu = new Map<number, Unit>();

  constructor(readonly battle: TurnBattle, readonly stage: StageDef) {
    super();
    for (const t of battle.units) {
      const table = t.side === 'hero' ? HERO_SLOTS : FOE_SLOTS;
      const [x, y] = table[t.row][t.slot] ?? [t.side === 'hero' ? 500 : 1400, 780];
      const u = new Unit(t.def, t.side, x, y, t.side === 'hero'
        ? { hero: t.hero, stars: t.hero?.stars, level: t.level }
        : { boss: t.isBoss });
      // Les PV viennent du moteur tour par tour (lignes, contrat de difficulté…),
      // pas de la formule temps réel : on écrase donc ceux du constructeur.
      u.hp = u.maxHp = Math.max(1, Math.round(t.maxHp));
      this.units.push(u);
      this.rendu.set(t.uid, u);
      this.sync(t);
      this.emit('spawn', u);
    }
  }

  get heroes(): Unit[] { return this.units.filter((u) => u.opts.hero); }
  get boss(): Unit | undefined { return this.units.find((u) => u.isBoss); }

  /** La scène appelle ceci à chaque image : ici le temps est tenu par le contrôleur. */
  update(_dt: number): void { /* rien : le tour par tour avance par événements */ }

  /**
   * Pas d'ultime « à la jauge » en tour par tour : l'ultime a sa recharge en tours.
   * `cineCaster` est l'unité dont la cinématique d'ultime est en cours : le réalisateur
   * (`cinematics.ts`) vérifie `canUltimate` / `ultimate` pendant sa séquence, donc on ne
   * les renvoie vrais que pour lui, et seulement pendant sa mise en scène.
   */
  cineCaster: Unit | null = null;
  canUltimate(u: Unit): boolean { return u === this.cineCaster; }
  /** Les effets sont déjà appliqués par le moteur tour par tour : rien à refaire ici. */
  ultimate(_u: Unit): boolean { return true; }

  /** L'unité rendue (celle de la scène) correspondant à une unité du moteur. */
  view(uid: number): Unit | undefined { return this.rendu.get(uid); }

  /**
   * Recopie l'état d'une unité du moteur sur son double rendu : PV, bouclier, statuts
   * (compteurs lus par `UnitView` pour les pastilles et les poses), jauges.
   */
  sync(t: TUnit): Unit | undefined {
    const u = this.rendu.get(t.uid);
    if (!u) return undefined;
    u.hp = Math.max(0, Math.round(t.hp));
    u.maxHp = Math.max(1, Math.round(t.maxHp));
    u.shield = Math.max(0, Math.round(t.shield));
    u.stun = t.status('stun')?.turns ?? 0;
    u.frozenT = t.status('freeze')?.turns ?? 0;
    u.slowT = t.status('slow')?.turns ?? 0;
    u.hasteT = t.status('haste')?.turns ?? 0;
    u.tauntT = t.status('taunt')?.turns ?? 0;
    u.untargetable = t.has('stealth');
    u.dmgRed = t.has('invuln') ? 1 : t.has('guard') ? 0.6 : t.has('defUp') ? 0.3 : 0;
    u.dmgRedT = u.dmgRed > 0 ? 1 : 0;
    u.enraged = false;
    u.leap = null;
    u.target = null;
    // Les dégâts sur la durée nourrissent les nuages de peste / braises de la scène.
    u.dots.length = 0;
    for (const s of t.statuses) {
      if (s.id !== 'poison' && s.id !== 'burn' && s.id !== 'bleed') continue;
      const src = this.rendu.get(s.src) ?? u;
      u.dots.push({ src, mult: s.power, every: 1, timer: 0, left: s.turns, kind: s.id === 'bleed' ? 'phys' : 'magic' });
    }
    // Jauge dorée du HUD : en tour par tour elle montre la recharge de l'ultime.
    if (t.side === 'hero') u.energy = t.ready(3) ? 100 : Math.max(0, Math.min(99, Math.round((1 - (t.cd[3] ?? 0) / 7) * 100)));
    return u;
  }

  /** Recopie tout le monde (après un coup, un soin, une mort…). */
  syncAll(): void {
    for (const t of this.battle.units) this.sync(t);
  }
}
