/**
 * Sonde de courbe de difficulté.
 *
 * Pour chaque niveau sondé, on cherche le plus petit NIVEAU DE HÉROS qui atteint
 * au moins `SEUIL` de victoires (ultimes en auto). On compare ensuite avec la
 * puissance conseillée affichée en jeu (`stage.power`).
 *
 * Usage : npx vite-node tests/test-courbe.ts
 */
import { BattleSim } from '../src/battle/Sim';
import { HEROES, STAGES, heroPower, teamPower, type HeroDef, type TeamMember } from '../src/data/heroes';

const STEP = 1 / 30;
const SEUIL = 0.6;
const RUNS = 4;
const MAX_T = 60; // secondes simulées

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

const IDS = ['kael', 'lyra', 'nyx', 'seren', 'aldric'];
const DEFS: HeroDef[] = IDS.map((id) => HEROES.find((h) => h.id === id)!);

function play(stageIdx: number, level: number, stars: number, red: number, seed: number) {
  const team: TeamMember[] = DEFS.map((def) => ({ def, stars, level, red }));
  const s = new BattleSim(STAGES[stageIdx]!, team, mulberry(seed));
  s.setup();
  let t = 0;
  while (!s.winner && t < MAX_T) {
    s.update(STEP);
    t += STEP;
    for (const h of s.heroes) if (h.alive && s.canUltimate(h)) s.ultimate(h);
  }
  return s.winner === 'hero';
}

function winRate(stageIdx: number, level: number, stars: number, red: number) {
  let w = 0;
  for (let r = 0; r < RUNS; r++) if (play(stageIdx, level, stars, red, 7 + stageIdx * 131 + r * 17 + level)) w++;
  return w / RUNS;
}

/** Échelle de niveaux testés : fine au début, large ensuite. */
const LADDER = [1, 2, 3, 5, 8, 12, 16, 20, 25, 30, 40, 50, 60, 75, 90, 110, 130, 160, 200, 250, 300, 400, 500, 700, 1000, 1500, 2000, 3000, 5000];

function minLevel(stageIdx: number, stars: number, red: number): { level: number | null; rate: number } {
  // Sonde rapide : si même au niveau plafond on ne gagne jamais, inutile de chercher.
  const top = LADDER[LADDER.length - 1]!;
  if (winRate(stageIdx, top, stars, red) === 0) return { level: null, rate: 0 };
  let last = 0;
  for (const lvl of LADDER) {
    last = winRate(stageIdx, lvl, stars, red);
    if (last >= SEUIL) return { level: lvl, rate: last };
  }
  return { level: null, rate: last };
}

const SCENES: Array<[string, number, number]> = [
  ['équipe de départ (3★/0✦)', 3, 0],
  ['équipe investie (5★/1✦)', 5, 1],
  ['équipe à fond (5★/5✦)', 5, 5],
];

const t0 = Date.now();
console.log('COURBE DE DIFFICULTÉ — niveau de héros requis pour ' + Math.round(SEUIL * 100) + ' % de victoires');
console.log('='.repeat(96));
console.log('niveau   puiss. conseillée │ ' + SCENES.map((s) => s[0].padEnd(24)).join('│ ') + '│ écart/1 niveau par chap.');
console.log('─'.repeat(96));

const rows: Array<{ id: string; power: number; lv: Array<number | null> }> = [];
for (const st of STAGES) {
  const ci = Number(st.id.split('-')[0]);
  const si = Number(st.id.split('-')[1]);
  if (si !== 1) continue; // un niveau par chapitre suffit pour la sonde
  if (ci > 20) continue;
  const idx = STAGES.indexOf(st);
  const lv = SCENES.map(([, stars, red]) => minLevel(idx, stars, red).level);
  rows.push({ id: st.id, power: st.power, lv });
  const prev = rows[rows.length - 2];
  const ecart = prev && lv[1] != null && prev.lv[1] != null ? `+${lv[1]! - prev.lv[1]!}` : '—';
  console.log(
    st.id.padEnd(9) +
      String(st.power).padStart(10) +
      ' │ ' +
      lv.map((v, i) => (v == null ? 'IMPOSSIBLE' : `niv. ${v} (${Math.round(winRate(idx, v, SCENES[i]![1], SCENES[i]![2]) * 100)}%)`).padEnd(24)).join('│ ') +
      '│ ' + ecart
  );
}

console.log('─'.repeat(96));
console.log('Puissance de l\'équipe "investie" (5★/1✦) selon le niveau :');
for (const lvl of [1, 10, 25, 50, 75, 100, 150, 200, 300, 500, 1000]) {
  const team: TeamMember[] = DEFS.map((def) => ({ def, stars: 5, level: lvl, red: 1 }));
  console.log(`  niv. ${String(lvl).padStart(4)} → puissance ${teamPower(team).toLocaleString('fr-FR')}`);
}
console.log(`\n(${((Date.now() - t0) / 1000).toFixed(1)} s de calcul)`);
