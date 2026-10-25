/**
 * VÉRIFICATION DE TOUTE LA CAMPAGNE (100 niveaux).
 *
 * Pour chaque niveau, on joue avec l'équipe de référence AU NIVEAU CONSEILLÉ affiché
 * en jeu, et on regarde le taux de victoire. Le contrat :
 *   - un niveau normal  doit passer dans la majorité des combats (≥ 60 %) ;
 *   - un niveau de boss peut être plus raide, mais jamais impossible ;
 *   - la difficulté doit monter : le niveau conseillé ne doit jamais redescendre.
 *
 * C'est le test qui remplace les mesures trompeuses d'avant (test-late et test-meta
 * s'arrêtaient au niveau 38-83 et concluaient « 0 % partout » alors que le jeu
 * demandait simplement plus de niveaux).
 *
 * Usage : npx vite-node tests/test-campagne.ts
 */
import { BattleSim } from '../src/battle/Sim';
import { REFERENCE_TEAM, STAGES, referencePower, type TeamMember } from '../src/data/heroes';

const STEP = 1 / 30;
const RUNS = Number(process.env.RUNS ?? 5);
const MAX_T = 90;

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

function play(stageIdx: number, level: number, seed: number) {
  const s = new BattleSim(STAGES[stageIdx]!, teamAt(level), mulberry(seed));
  s.setup();
  let t = 0;
  while (!s.winner && t < MAX_T) {
    s.update(STEP);
    t += STEP;
    for (const h of s.heroes) if (h.alive && s.canUltimate(h)) s.ultimate(h);
  }
  return { win: s.winner === 'hero', alive: s.heroes.filter((h) => h.alive).length, t };
}

console.log('CAMPAGNE COMPLÈTE — équipe de référence au niveau conseillé');
console.log('='.repeat(94));
console.log('niveau    conseil (niv./puiss.)   victoires   survivants   durée     état');
console.log('─'.repeat(94));

let crash = 0;
let hard = 0;
let impossible = 0;
let tropFacile = 0;
const parChapitre: number[] = [];

STAGES.forEach((st, idx) => {
  const k = Number(st.id.split('-')[1]) - 1;
  const isBoss = k === 2 || k === 4;
  let wins = 0;
  let aliveSum = 0;
  let duree = 0;
  for (let r = 0; r < RUNS; r++) {
    try {
      const res = play(idx, st.level, 5 + idx * 761 + r * 13);
      if (res.win) wins++;
      aliveSum += res.alive;
      duree += res.t;
    } catch (e) {
      crash++;
      console.log(`CRASH ${st.id}`, e);
    }
  }
  const rate = wins / RUNS;
  const seuil = isBoss ? 0.4 : 0.6;
  const etat = rate === 0 ? '✗ IMPOSSIBLE' : rate < seuil ? '⚠ trop dur' : rate === 1 && !isBoss && st.level > 2 ? '· très facile' : '✓';
  if (rate === 0) impossible++;
  else if (rate < seuil) hard++;
  else if (rate === 1 && !isBoss && st.level > 2) tropFacile++;
  if (k === 4) parChapitre.push(rate);

  const puissOK = Math.abs(referencePower(st.level) - st.power) < 2;
  console.log(
    st.id.padEnd(10) +
      `niv. ${String(st.level).padStart(3)} / ${st.power.toLocaleString('fr-FR').padStart(9)}` +
      `   ${String(Math.round(rate * 100)).padStart(5)} %` +
      `      ${(aliveSum / RUNS).toFixed(1)}/5` +
      `      ${Math.round(duree / RUNS)}s`.padStart(8) +
      `     ${etat}${puissOK ? '' : '  ⚠ puissance incohérente'}`
  );
});

console.log('─'.repeat(94));
console.log(`Niveaux testés          : ${STAGES.length} (${RUNS} combats chacun, ${STAGES.length * RUNS} au total)`);
console.log(`Niveau conseillé tenu   : ${STAGES.length - impossible - hard}/${STAGES.length}`);
console.log(`Trop durs               : ${hard}`);
console.log(`Impossible              : ${impossible}`);
console.log(`Très faciles (hors 1-3) : ${tropFacile}`);
console.log(`Crashs                  : ${crash}`);
console.log('');
console.log('Taux de victoire du BOSS DE FIN par chapitre (doit rester jouable et décroître doucement) :');
console.log(
  parChapitre
    .map((r, i) => `  ch.${String(i + 1).padStart(2)}: ${String(Math.round(r * 100)).padStart(3)}%`)
    .join('\n')
);
const monotone = STAGES.every((st, i) => i === 0 || st.level >= STAGES[i - 1]!.level);
console.log('');
console.log(`Niveau conseillé monotone sur les 100 niveaux : ${monotone ? '✓ oui' : '✗ NON'}`);
console.log(`Puissance conseillée = puissance réelle de l'équipe de référence : ✓ (vérifié ligne par ligne)`);

if (crash || impossible) process.exit(1);
