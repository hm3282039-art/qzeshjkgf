/**
 * Banc de mesure de la méta — version 2.
 *
 * 1) Niveau requis : pour chaque niveau, on cherche le plus petit niveau d'équipe
 *    (les 5 héros au même niveau) qui gagne au moins 60 % des combats, ultimes en auto.
 *    C'est la vraie courbe de difficulté.
 * 2) Tournoi : on tire des équipes de 5 au hasard dans les 14 héros et on regarde
 *    le taux de victoire de chaque héros quand il est présent. C'est le tier list.
 */
import { BattleSim } from '../src/battle/Sim';
import { HEROES, STAGES, teamPower, levelUpCost, type HeroDef, type TeamMember } from '../src/data/heroes';

const STEP = 1 / 30;
/**
 * Échelle de niveaux construite AUTOUR du niveau conseillé par le jeu (`st.level`).
 *
 * L'ancienne échelle était fixe et s'arrêtait au niveau 38 : comme la fin de campagne
 * demande 80 à 110 niveaux, ce banc concluait « impossible » et « 0 % de victoires »
 * partout alors que le jeu était simplement mesuré trop bas. On part désormais du
 * conseil affiché et on élargit (×0,4 à ×8) pour trouver le vrai point de passage.
 */
const LEVEL_FACTORS = [0.4, 0.55, 0.7, 0.85, 1, 1.2, 1.5, 1.9, 2.5, 3.5, 5, 8];
const levelsFor = (st: { level: number }): number[] => {
  const out: number[] = [];
  for (const f of LEVEL_FACTORS) {
    const v = Math.max(1, Math.round(st.level * f));
    if (!out.includes(v)) out.push(v);
  }
  return out.sort((a, b) => a - b);
};

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

function play(stageIdx: number, defs: HeroDef[], level: number, seed: number) {
  const team: TeamMember[] = defs.map((def) => ({ def, stars: def.stars, level }));
  const s = new BattleSim(STAGES[stageIdx]!, team, mulberry(seed));
  s.setup();
  let t = 0;
  while (!s.winner && t < 120) {
    s.update(STEP);
    t += STEP;
    for (const h of s.heroes) if (h.alive && s.canUltimate(h)) s.ultimate(h);
  }
  return { win: s.winner === 'hero', t: Math.min(t, 120), alive: s.heroes.filter((h) => h.alive).length };
}

const rate = (stageIdx: number, defs: HeroDef[], level: number, runs = 10): number => {
  let w = 0;
  for (let r = 0; r < runs; r++) if (play(stageIdx, defs, level, 1000 + stageIdx * 61 + r * 17).win) w++;
  return w / runs;
};

const starters = HEROES.filter((h) => h.starter);

console.log('1) NIVEAU REQUIS PAR NIVEAU (équipe de départ, ultimes en auto, seuil 60 %)');
console.log('='.repeat(88));
console.log('niveau   niveau requis   puissance   difficulté ressentie');
const required: number[] = [];
for (let s = 0; s < STAGES.length; s++) {
  const st = STAGES[s]!;
  let found = -1;
  for (const L of levelsFor(st)) {
    if (rate(s, starters, L, 6) >= 0.6) { found = L; break; }
  }
  required.push(found);
  const p = teamPower(starters.map((def) => ({ def, stars: def.stars, level: found > 0 ? found : 1 })));
  const tag = found < 0 ? 'INFINI (impossible)' : found <= 1 ? 'offert' : found <= 8 ? 'normal' : found <= 18 ? 'exigeant' : 'mur';
  console.log(`${st.id.padEnd(8)} ${(found < 0 ? '—' : String(found)).padStart(13)}   ${String(p).padStart(8)}   ${tag}`);
}
console.log('');
const gaps = required.map((v, i) => (i === 0 || required[i - 1]! < 0 || v < 0 ? 0 : v - required[i - 1]!));
console.log('Paliers entre deux niveaux :', gaps.join(' · '));

console.log('\n2) COÛT RÉEL DE LA PROGRESSION (5 héros, équipe de départ)');
console.log('='.repeat(88));
let cumul = 0;
for (let i = 0; i < required.length; i++) {
  const target = required[i]!;
  if (target < 0) { console.log(`${STAGES[i]!.id.padEnd(8)} impossible`); continue; }
  const prev = i === 0 ? 1 : Math.max(1, required[i - 1]!);
  let cost = 0;
  for (const h of starters) for (let l = prev; l < target; l++) cost += levelUpCost(l, h.rarity);
  cumul += cost;
  console.log(`${STAGES[i]!.id.padEnd(8)} niv. ${String(target).padStart(2)}  +${cost.toLocaleString('fr-FR').padStart(8)} or (cumul ${cumul.toLocaleString('fr-FR').padStart(9)} / gagné ${STAGES.slice(0, i + 1).reduce((a, st) => a + st.rewards.gold, 0).toLocaleString('fr-FR')})`);
}

console.log('\n3) TOURNOI — 400 équipes tirées au hasard, niveau adapté au niveau joué');
console.log('='.repeat(88));
const rnd = mulberry(424242);
const stat = new Map<string, { win: number; n: number }>();
const perStage: number[] = new Array(STAGES.length).fill(0);
const TEAMS = 400;
for (let t = 0; t < TEAMS; t++) {
  const pool = HEROES.slice();
  const defs: HeroDef[] = [];
  for (let i = 0; i < 5; i++) defs.push(pool.splice(Math.floor(rnd() * pool.length), 1)[0]!);
  // l'équipe est jouée sur un niveau tiré, avec le niveau de héros attendu à ce stade
  const s = Math.floor(rnd() * STAGES.length);
  const L = Math.max(1, required[s]! > 0 ? required[s]! : 25);
  const r = play(s, defs, L, 7777 + t);
  perStage[s]! += r.win ? 1 : 0;
  for (const d of defs) {
    const e = stat.get(d.id) ?? { win: 0, n: 0 };
    e.n++; if (r.win) e.win++;
    stat.set(d.id, e);
  }
}
const tier = HEROES.map((h) => ({ h, ...(stat.get(h.id) ?? { win: 0, n: 1 }) }))
  .map((x) => ({ ...x, r: (x.win / x.n) * 100 }))
  .sort((a, b) => b.r - a.r);
console.log('héros'.padEnd(16), 'rôle'.padEnd(10), 'victoires'.padStart(9), '  échantillon');
for (const x of tier) console.log(x.h.name.padEnd(16), x.h.role.padEnd(10), `${x.r.toFixed(0)} %`.padStart(9), String(x.n).padStart(12));
const vals = tier.map((x) => x.r);
console.log('-'.repeat(88));
console.log(`Meilleur ${Math.max(...vals).toFixed(0)} % · médiane ${vals.slice().sort((a, b) => a - b)[Math.floor(vals.length / 2)]!.toFixed(0)} % · pire ${Math.min(...vals).toFixed(0)} %`);
console.log('Victoires par niveau :', perStage.map((v, i) => `${STAGES[i]!.id}:${Math.round((v / (TEAMS / STAGES.length)) * 100)}%`).join(' '));
