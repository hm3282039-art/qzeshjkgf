import { BattleSim } from '../src/battle/Sim';
import { HEROES, STAGES, ENEMIES, teamPower, type TeamMember } from '../src/data/heroes';

const STEP = 1 / 30;

function run(stageIdx: number, team: TeamMember[], useUlt: boolean) {
  const s = new BattleSim(STAGES[stageIdx]!, team);
  s.setup();
  let t = 0;
  while (!s.winner && t < 200) {
    s.update(STEP);
    t += STEP;
    if (useUlt) for (const h of s.heroes) if (h.alive && s.canUltimate(h)) s.ultimate(h);
  }
  return { winner: s.winner, t, alive: s.heroes.filter((u) => u.hp > 0).length };
}

const starters = HEROES.filter((h) => h.starter);
const team: TeamMember[] = starters.map((def) => ({ def, stars: def.stars }));

console.log('ÉQUIPE PAR DÉFAUT (nouveau joueur)');
console.log('='.repeat(64));
console.log('Héros :', starters.map((h) => `${h.name}(${h.stars}★)`).join(', '));
console.log('Puissance :', teamPower(team));
console.log('');

for (let s = 0; s < STAGES.length; s++) {
  const st = STAGES[s]!;
  for (const useUlt of [false, true]) {
    const res = Array.from({ length: 60 }, () => run(s, team, useUlt));
    const wins = res.filter((r) => r.winner === 'hero').length;
    const avgAlive = res.reduce((a, r) => a + r.alive, 0) / res.length;
    const label = useUlt ? 'AVEC ultimes' : 'SANS ultimes';
    console.log(`Niveau ${st.id} ${label.padEnd(14)} : ${String(wins).padStart(2)}/60 victoires (${((wins / 60) * 100).toFixed(0)}%)  survivants ${avgAlive.toFixed(1)}/5`);
  }
  console.log(`   (puissance recommandée : ${st.power})`);
  console.log('');
}

console.log('STATS : héros moyens vs ennemis');
console.log('='.repeat(64));
const hp = starters.reduce((a, h) => a + h.stats.hp, 0) / starters.length;
const atk = starters.reduce((a, h) => a + h.stats.atk, 0) / starters.length;
const arm = starters.reduce((a, h) => a + h.stats.armor, 0) / starters.length;
console.log(`Héros moyens : ${hp.toFixed(0)} PV, ${atk.toFixed(0)} ATQ, ${arm.toFixed(0)} armure`);
for (const [k, e] of Object.entries(ENEMIES)) {
  console.log(`  ${k.padEnd(11)} ${String(e.stats.hp).padStart(6)} PV, ${String(e.stats.atk).padStart(4)} ATQ, ${String(e.stats.armor).padStart(3)} armure`);
}
