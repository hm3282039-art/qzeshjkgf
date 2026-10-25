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

/**
 * Les compositions sont comparées AUTOUR du niveau conseillé de chaque niveau
 * (×0,85 = sous-niveau, ×1 = conseil du jeu, ×1,2 = au-dessus).
 *
 * L'ancien banc jouait les 100 niveaux à des niveaux fixes (10, 14, 18, 22) :
 * à partir du chapitre 5, tout le monde était à 0 % et la comparaison ne voulait
 * plus rien dire. En niveaux relatifs, l'écart entre compos reste visible partout.
 */
const FACTEURS = [0.85, 1, 1.2];
const ESSAIS = 8;
for (const f of FACTEURS) {
  console.log(`\nÉQUIPE À ×${f.toFixed(2)} DU NIVEAU CONSEILLÉ — victoires sur ${ESSAIS} essais`);
  console.log('niveau   conseil  ' + Object.keys(COMPS).map((k) => k.padStart(8)).join(' '));
  for (let si = 0; si < STAGES.length; si++) {
    const st = STAGES[si]!;
    const L = Math.max(1, Math.round(st.level * f));
    const cells = Object.values(COMPS).map((defs) => {
      let w = 0;
      for (let r = 0; r < ESSAIS; r++) if (play(si, defs, L, 500 + si * 131 + r * 29).win) w++;
      const pct = Math.round((w / ESSAIS) * 100);
      return `${pct} %`.padStart(8);
    });
    console.log(st.id.padEnd(9) + `niv.${String(L).padStart(4)}  ` + cells.join(' '));
  }
}
