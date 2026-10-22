import { HEROES, MAX_STARS, type HeroDef, type Rarity } from './heroes';

/**
 * Autel d'invocation (façon gacha MLA) : règles pures, sans état.
 * L'état (gemmes, compteur de garantie, héros possédés) est géré par le store.
 */

/** Probabilités affichées en jeu. */
export const RATES: Record<Rarity, number> = { SSR: 0.03, SR: 0.27, R: 0.7 };
/** Un SSR est garanti au bout de ce nombre d'invocations sans SSR. */
export const PITY = 60;
export const COST = { one: 150, ten: 1350 } as const;

/** Objets de rang R (le reste du butin de l'autel). */
export type ItemId = 'gold' | 'elixir';
export const ITEMS: Record<ItemId, { name: string; amount: number; text: string }> = {
  gold: { name: 'Bourse d’or', amount: 2500, text: '+2 500 or' },
  elixir: { name: 'Élixir d’âme', amount: 60, text: '+60 XP de joueur' },
};

/** Remboursement d'un doublon quand le héros a déjà toutes ses étoiles. */
export const MAX_REFUND: Record<Exclude<Rarity, 'R'>, number> = { SSR: 12000, SR: 5000 };

export type PullResult =
  | { kind: 'hero'; rarity: Rarity; hero: HeroDef; isNew: boolean; stars: number; refundGold: number }
  | { kind: 'item'; rarity: 'R'; item: ItemId };

export const SUMMON_POOL = {
  SSR: HEROES.filter((h) => h.rarity === 'SSR'),
  SR: HEROES.filter((h) => h.rarity === 'SR'),
};

/** Tire une rareté. `pity` = invocations déjà faites sans SSR ; `minSR` force au moins un SR. */
export function rollRarity(pity: number, minSR: boolean, rnd: () => number): Rarity {
  if (pity + 1 >= PITY) return 'SSR';
  const r = rnd();
  if (r < RATES.SSR) return 'SSR';
  if (r < RATES.SSR + RATES.SR || minSR) return 'SR';
  return 'R';
}

/**
 * Effectue `count` invocations à partir d'un état (copié, puis renvoyé modifié).
 * Une invocation ×10 garantit au moins un SR (ou mieux) sur le dixième tirage.
 */
export function performSummon(
  count: number,
  state: { heroes: Record<string, number>; pity: number },
  rnd: () => number = Math.random,
): { results: PullResult[]; heroes: Record<string, number>; pity: number } {
  const heroes = { ...state.heroes };
  let pity = state.pity;
  const results: PullResult[] = [];
  let gotSR = false;
  for (let i = 0; i < count; i++) {
    const rarity = rollRarity(pity, count >= 10 && i === count - 1 && !gotSR, rnd);
    pity = rarity === 'SSR' ? 0 : pity + 1;
    if (rarity === 'R') {
      results.push({ kind: 'item', rarity: 'R', item: rnd() < 0.6 ? 'gold' : 'elixir' });
      continue;
    }
    gotSR = true;
    const pool = SUMMON_POOL[rarity];
    const hero = pool[Math.floor(rnd() * pool.length)]!;
    const cur = heroes[hero.id];
    let refundGold = 0;
    if (cur === undefined) heroes[hero.id] = hero.stars;
    else if (cur < MAX_STARS) heroes[hero.id] = cur + 1;
    else refundGold = MAX_REFUND[rarity];
    results.push({ kind: 'hero', rarity, hero, isNew: cur === undefined, stars: heroes[hero.id]!, refundGold });
  }
  return { results, heroes, pity };
}
