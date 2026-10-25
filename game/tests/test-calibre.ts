/**
 * CALIBRAGE DE LA CAMPAGNE PAR SIMULATION.
 *
 * Principe : on ne devine pas la difficulté, on la mesure.
 *  1. pour chaque chapitre, on cherche le plus petit niveau de héros qui passe
 *     les niveaux de boss à 60 % de victoires (ultimes en auto, équipe de départ) ;
 *  2. on compare avec le contrat {@link CHAPTER_TARGET_LEVEL} ;
 *  3. on corrige le budget de PV / l'ATQ des ennemis du chapitre en conséquence :
 *       - si le niveau requis est R et la cible T, les PV ennemis doivent baisser
 *         du rapport de DÉGÂTS entre R et T (les héros tapent moins fort en T) ;
 *       - leur ATQ doit baisser du rapport de PV entre R et T (les héros encaissent moins).
 *  4. on recommence quelques fois, avec un amortissement pour ne pas osciller.
 *
 * Le script imprime à la fin les deux tables à recopier dans src/data/heroes.ts.
 *
 * Usage : npx vite-node tests/test-calibre.ts
 */
import { BattleSim } from '../src/battle/Sim';
import {
  CHAPTER_TARGET_LEVEL,
  CHAPTER_TUNE_ATK,
  CHAPTER_TUNE_HP,
  HEROES,
  REFERENCE_TEAM,
  STAGES,
  levelStatMult,
  skillMult,
  skillTiers,
  type TeamMember,
} from '../src/data/heroes';

const STEP = 1 / 30;
const SEUIL = 0.6;
const RUNS = Number(process.env.RUNS ?? 3);
const MAX_T = 60;
const ITERATIONS = Number(process.env.ITER ?? 4);
const AMORTI = 0.85;

function mulberry(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const teamAt = (level: number): TeamMember[] =>
  REFERENCE_TEAM.map((def) => ({ def, stars: def.stars, level }));

function play(stageIdx: number, level: number, seed: number): boolean {
  const s = new BattleSim(STAGES[stageIdx]!, teamAt(level), mulberry(seed));
  s.setup();
  let t = 0;
  while (!s.winner && t < MAX_T) {
    s.update(STEP);
    t += STEP;
    for (const h of s.heroes) if (h.alive && s.canUltimate(h)) s.ultimate(h);
  }
  return s.winner === 'hero';
}

function winRate(stageIdx: number, level: number): number {
  let w = 0;
  for (let r = 0; r < RUNS; r++) if (play(stageIdx, level, 11 + stageIdx * 977 + r * 31 + level)) w++;
  return w / RUNS;
}

/** Échelle de niveaux autour de la cible : on cherche d'abord près, puis de plus en plus loin. */
function ladder(target: number): number[] {
  const out: number[] = [];
  for (const f of [0.5, 0.6, 0.7, 0.8, 0.9, 1, 1.1, 1.25, 1.4, 1.6, 1.9, 2.2, 2.6, 3.2, 4, 5, 6.5, 8]) {
    const v = Math.max(1, Math.round(target * f));
    if (!out.includes(v)) out.push(v);
  }
  return out.sort((a, b) => a - b);
}

/** Plus petit niveau qui atteint le seuil, ou null si aucun ne passe. */
function requiredLevel(stageIdx: number, target: number): number | null {
  const lad = ladder(target);
  // Sonde : si le plus haut niveau échoue, inutile de chercher plus bas.
  if (winRate(stageIdx, lad[lad.length - 1]!) === 0) return null;
  for (const lvl of lad) if (winRate(stageIdx, lvl) >= SEUIL) return lvl;
  return null;
}

/** Force offensive / défensive d'un héros à un niveau donné. */
const dpsOf = (L: number) => levelStatMult(L) * skillMult(skillTiers(L));
const hpOf = (L: number) => levelStatMult(L);

/** Les niveaux de boss (3e et 5e étage) font la difficulté d'un chapitre. */
const gateStages = (ci: number): number[] =>
  [2, 4].map((k) => STAGES.findIndex((s) => s.id === `${ci + 1}-${k + 1}`)).filter((i) => i >= 0);

console.log('CALIBRAGE DE LA CAMPAGNE (équipe de départ, ultimes en auto, seuil ' + Math.round(SEUIL * 100) + ' %)');
console.log('='.repeat(88));

const t0 = Date.now();
for (let it = 1; it <= ITERATIONS; it++) {
  console.log(`\n--- Passe ${it}/${ITERATIONS}  (${((Date.now() - t0) / 1000).toFixed(0)} s) ---`);
  console.log('chap.  cible   requis (boss 3 / boss 5)   écart      correction PV / ATQ');
  for (let ci = 0; ci < CHAPTER_TARGET_LEVEL.length; ci++) {
    const target = CHAPTER_TARGET_LEVEL[ci]!;
    const idx = gateStages(ci);
    const reqs = idx.map((i) => requiredLevel(i, target));
    const measured = reqs.filter((r): r is number => r !== null);
    // Un niveau non franchi même à 8× la cible compte comme 8× la cible : correction forte.
    const R = measured.length
      ? measured.reduce((a, b) => a + b, 0) / measured.length
      : target * 8;
    const hard = measured.length < reqs.length;
    const dpsR = dpsOf(R) / dpsOf(target);
    const hpR = hpOf(R) / hpOf(target);
    const corrHp = Math.pow(1 / dpsR, AMORTI);
    const corrAtk = Math.pow(1 / hpR, AMORTI);
    CHAPTER_TUNE_HP[ci] = Math.max(0.05, (CHAPTER_TUNE_HP[ci] ?? 1) * corrHp);
    CHAPTER_TUNE_ATK[ci] = Math.max(0.05, (CHAPTER_TUNE_ATK[ci] ?? 1) * corrAtk);
    console.log(
      String(ci + 1).padStart(4) +
        String(target).padStart(8) +
        '   ' +
        reqs.map((r) => (r == null ? 'IMPOSSIBLE' : `niv. ${r}`)).join(' / ').padStart(22) +
        `   ${(R / target).toFixed(2)}×`.padStart(9) +
        `      ×${corrHp.toFixed(3)} / ×${corrAtk.toFixed(3)}${hard ? '  (un boss résiste)' : ''}`
    );
  }
}

console.log('\n' + '='.repeat(88));
console.log('TABLES À RECOPIER DANS src/data/heroes.ts');
console.log('='.repeat(88));
const fmt = (a: number[]) =>
  a.map((v, i) => (i % 10 === 0 ? '  ' : '') + v.toFixed(3) + ',' + (i % 10 === 9 ? '\n' : ' ')).join('');
console.log('export const CHAPTER_TUNE_HP: number[] = [\n' + fmt(CHAPTER_TUNE_HP) + '\n];');
console.log('export const CHAPTER_TUNE_ATK: number[] = [\n' + fmt(CHAPTER_TUNE_ATK) + '\n];');
console.log(`\n(${((Date.now() - t0) / 1000).toFixed(0)} s de calcul)`);
void HEROES;
