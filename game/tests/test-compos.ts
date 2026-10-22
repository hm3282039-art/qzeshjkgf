/**
 * Test des compos : quatre archétypes d'équipe sur les dix niveaux.
 * Si une seule compos gagne partout, il n'y a pas de méta.
 * Si chacune a ses niveaux, il y en a plusieurs.
 */
import { BattleSim } from '../src/battle/Sim';
import { HEROES, STAGES, heroById, type HeroDef } from '../src/data/heroes';

const STEP = 1 / 30;
const h = (id: string): HeroDef => heroById(id)!;

function mulberry(seed: number) { let a = seed >>> 0; return () => { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }

function play(si: number, defs: HeroDef[], L: number, seed: number) {
  const s = new BattleSim(STAGES[si]!, defs.map((def) => ({ def, stars: def.stars, level: L })), mulberry(seed));
  s.setup();
  let t = 0;
  while (!s.winner && t < 120) { s.update(STEP); t += STEP; for (const x of s.heroes) if (x.alive && s.canUltimate(x)) s.ultimate(x); }
  return { win: s.winner === 'hero', t };
}

// Toutes les compos ont un tank et un soigneur : on compare les DÉGÂTS, pas la structure.
const COMPS: Record<string, HeroDef[]> = {
  'DÉPART ': ['kael', 'lyra', 'morwen', 'seren', 'aldric'].map(h),
  'MAGIE  ': ['vaelen', 'nyx', 'pyrrha', 'morwen', 'aldric'].map(h),
  'FER    ': ['vaelen', 'lyra', 'vespera', 'sylvaine', 'aldric'].map(h),
  'MIXTE  ': ['kael', 'thorne', 'seren', 'pyrrha', 'orlan'].map(h),
  'SUSTAIN': ['gorm', 'aldric', 'orlan', 'sylvaine', 'nyx'].map(h),
};

const LVLS = [10, 14, 18, 22];
for (const L of LVLS) {
  console.log(`\nNIVEAU ${L} — victoires sur 20 essais`);
  console.log('niveau  ' + Object.keys(COMPS).map((k) => k.padStart(8)).join(' '));
  for (let si = 0; si < STAGES.length; si++) {
    const cells = Object.values(COMPS).map((defs) => {
      let w = 0;
      for (let r = 0; r < 20; r++) if (play(si, defs, L, 500 + si * 131 + r * 29).win) w++;
      const pct = Math.round((w / 20) * 100);
      return `${pct} %`.padStart(8);
    });
    console.log(STAGES[si]!.id.padEnd(8) + cells.join(' '));
  }
}
