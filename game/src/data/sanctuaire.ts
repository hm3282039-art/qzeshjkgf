import {
  HEROES,
  MAX_RED,
  MAX_STARS,
  RED_GOLD,
  YELLOW_GOLD,
  heroById,
  type HeroDef,
  type Rarity,
} from './heroes';

/**
 * LE SANCTUAIRE
 * -------------
 * Rien ne se combine tout seul : c'est ici, et seulement ici, qu'un héros gagne
 * une étoile. Deux monnaies de progression :
 *
 *  • ÉTOILES JAUNES (3★ → 5★) : il faut de la nourriture.
 *      – 1 doublon de la même rareté, OU
 *      – 3 doublons R (les R sont la nourriture de base, ils servent à tous).
 *    Plus un peu d'or.
 *
 *  • ÉTOILES ROUGES (après 5★) : c'est le vrai endgame.
 *      – ✦1 : un doublon DU MÊME HÉROS (le perso une deuxième fois).
 *      – ✦2 et au-delà : un AUTRE héros de la même rareté qui possède déjà
 *        une étoile rouge de moins. Il est sacrifié (définitivement).
 *    Plafond : R → 3✦, SR → 4✦, SSR → 5✦.
 *
 *  • QUALITÉ NATIVE : un R monté à fond vaut ~91 % d'un SSR natif de base.
 *    Un R ne dépasse JAMAIS un SSR natif, quel que soit son nombre d'étoiles.
 */

export interface StarState {
  /** Étoiles jaunes possédées : identifiant → 3…5. */
  heroes: Record<string, number>;
  /** Étoiles rouges : identifiant → 0…MAX_RED. */
  red: Record<string, number>;
  /** Doublons en réserve : identifiant → nombre. */
  dupes: Record<string, number>;
}

export interface StarPlan {
  gold: number;
  /** Doublons consommés (identifiant → quantité). */
  dupes: Array<{ id: string; count: number }>;
}

/** L'or demandé grimpe avec la rareté : un SSR coûte plus cher à étoiler. */
export const rarityFactor = (r: Rarity): number => (r === 'SSR' ? 3 : r === 'SR' ? 2 : 1);

/** Une étoile jaune est-elle encore possible ? */
export const canYellow = (_def: HeroDef, stars: number): boolean => stars < MAX_STARS;

/** Une étoile rouge est-elle encore possible ? */
export const canRed = (def: HeroDef, red: number): boolean => red < MAX_RED[def.rarity];

/** Doublons de la même rareté disponibles (hors celui du héros lui-même, qui reste utilisable). */
function sameRarityDupes(st: StarState, def: HeroDef): Array<{ id: string; count: number }> {
  return HEROES.filter((h) => h.rarity === def.rarity)
    .map((h) => ({ id: h.id, count: st.dupes[h.id] ?? 0 }))
    .filter((d) => d.count > 0)
    .sort((a, b) => b.count - a.count);
}

/** Tous les doublons R disponibles, quel que soit le héros. */
function rDupes(st: StarState): Array<{ id: string; count: number }> {
  return HEROES.filter((h) => h.rarity === 'R')
    .map((h) => ({ id: h.id, count: st.dupes[h.id] ?? 0 }))
    .filter((d) => d.count > 0)
    .sort((a, b) => b.count - a.count);
}

/**
 * Plan d'une étoile jaune : le moins cher d'abord (un doublon de la même rareté),
 * sinon trois doublons R répartis sur plusieurs héros. `null` = pas de nourriture.
 */
export function planYellow(st: StarState, def: HeroDef, stars: number): StarPlan | null {
  if (!canYellow(def, stars)) return null;
  const gold = YELLOW_GOLD[stars - 2]! * rarityFactor(def.rarity);
  const same = sameRarityDupes(st, def)[0];
  if (same) return { gold, dupes: [{ id: same.id, count: 1 }] };
  if (def.rarity === 'R') return null;
  const pool = rDupes(st);
  const total = pool.reduce((s, d) => s + d.count, 0);
  if (total < 3) return null;
  const use: Array<{ id: string; count: number }> = [];
  let left = 3;
  for (const d of pool) {
    const take = Math.min(left, d.count);
    use.push({ id: d.id, count: take });
    left -= take;
    if (!left) break;
  }
  return { gold, dupes: use };
}

/** Combien de doublons de la même rareté (et de R) sont en réserve, pour l'affichage. */
export function foodStock(st: StarState, def: HeroDef): { same: number; r: number } {
  return {
    same: sameRarityDupes(st, def).reduce((s, d) => s + d.count, 0),
    r: rDupes(st).reduce((s, d) => s + d.count, 0),
  };
}

export interface RedPlan {
  gold: number;
  /** Le héros à sacrifier (✦2 et au-delà), ou `null` pour un simple doublon. */
  sacrifice: string | null;
}

/**
 * Plan d'une étoile rouge.
 *  ✦1 → un doublon du héros ciblé.
 *  ✦n → un héros de même rareté, 5★, qui a déjà n−1 étoiles rouges.
 */
export function planRed(st: StarState, def: HeroDef, red: number): RedPlan | null {
  if (!canRed(def, red)) return null;
  const gold = RED_GOLD[red]! * rarityFactor(def.rarity);
  if (red === 0) {
    return (st.dupes[def.id] ?? 0) > 0 ? { gold, sacrifice: null } : null;
  }
  const sacrifice = redCandidates(st, def, red)[0];
  return sacrifice ? { gold, sacrifice: sacrifice.id } : null;
}

/**
 * Héros sacrifiables : même rareté, 5★, et exactement `need` étoiles rouges
 * (pour forger la ✦ suivante). La ✦1 se fait avec un doublon, sans sacrifice.
 */
export function redCandidates(st: StarState, def: HeroDef, need: number): HeroDef[] {
  return HEROES.filter((h) => {
    if (h.id === def.id || h.rarity !== def.rarity) return false;
    if ((st.red[h.id] ?? 0) !== need) return false;
    return (st.heroes[h.id] ?? 0) >= MAX_STARS;
  });
}

/** Petit résumé lisible affiché sur chaque carte du Sanctuaire. */
export function starLabel(stars: number, red: number): string {
  const gold = '★'.repeat(Math.max(0, Math.min(MAX_STARS, stars)));
  const rouge = red > 0 ? ` ${'✦'.repeat(red)}` : '';
  return `${gold}${rouge}`;
}

/** Un héros est-il « à fond » (plus aucune étoile possible) ? */
export function isMaxed(def: HeroDef, stars: number, red: number): boolean {
  return stars >= MAX_STARS && red >= MAX_RED[def.rarity];
}

/** Vérifie qu'un doublon existe bien (garde-fou avant consommation). */
export const hasDupe = (st: StarState, id: string): boolean => (st.dupes[id] ?? 0) > 0;
/** Le héros est-il possédé ? */
export const owns = (st: StarState, id: string): boolean => st.heroes[id] !== undefined;
/** Retrouve une définition par identifiant (raccourci pour l'interface). */
export const defOf = (id: string): HeroDef | undefined => heroById(id);
