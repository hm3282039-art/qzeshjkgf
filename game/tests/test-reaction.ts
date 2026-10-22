import { BattleSim } from '../src/battle/Sim';
import { HEROES, STAGES, type TeamMember } from '../src/data/heroes';

const STEP = 1 / 30;

/** Joue avec un temps de réaction humain : l'ultime est lancé `delay` s après être prêt. */
function run(stageIdx: number, team: TeamMember[], reaction: number) {
  const s = new BattleSim(STAGES[stageIdx]!, team);
  s.setup();
  const readyAt = new Map<number, number>();
  let t = 0;
  let ultCount = 0;

  while (!s.winner && t < 200) {
    s.update(STEP);
    t += STEP;
    for (const h of s.heroes) {
      if (!h.alive) { readyAt.delete(h.uid); continue; }
      if (s.canUltimate(h)) {
        const since = readyAt.get(h.uid) ?? t;
        if (!readyAt.has(h.uid)) readyAt.set(h.uid, t);
        if (t - since >= reaction) {
          s.ultimate(h);
          readyAt.delete(h.uid);
          ultCount++;
        }
      } else {
        readyAt.delete(h.uid);
      }
    }
  }
  return { winner: s.winner, t, ultCount };
}

const starters = HEROES.filter((h) => h.starter);
const team: TeamMember[] = starters.map((def) => ({ def, stars: def.stars }));

console.log('IMPACT DU TEMPS DE RÉACTION SUR LA VICTOIRE');
console.log('='.repeat(66));
console.log('(0 s = joueur parfait qui clique instantanément,');
console.log(' 2 s = joueur distrait qui clique 2 s après que la jauge soit pleine)');
console.log('');

for (let s = 0; s < STAGES.length; s++) {
  const st = STAGES[s]!;
  console.log(`▸ Niveau ${st.id} — ${st.name}`);
  for (const reaction of [0, 0.3, 0.6, 1.0, 1.5, 2.0, 3.0]) {
    const res = Array.from({ length: 40 }, () => run(s, team, reaction));
    const wins = res.filter((r) => r.winner === 'hero').length;
    const avgUlt = res.reduce((a, r) => a + r.ultCount, 0) / res.length;
    const pct = (wins / 40) * 100;
    const bar = '█'.repeat(Math.round(pct / 5)).padEnd(20, '·');
    console.log(`   réaction ${reaction.toFixed(1)}s  ${bar} ${pct.toFixed(0).padStart(3)}%  (${wins}/40, ${avgUlt.toFixed(1)} ultimes)`);
  }
  console.log('');
}
