import { BattleSim } from '../src/battle/Sim';
import { HEROES, STAGES, ENEMIES, type TeamMember } from '../src/data/heroes';

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
  return s.winner === 'hero';
}

const starters = HEROES.filter((h) => h.starter);
const team: TeamMember[] = starters.map((def) => ({ def, stars: def.stars }));

// Sauvegarde des stats d'origine
const orig = Object.entries(ENEMIES).map(([k, e]) => [k, { ...e.stats }] as const);

function scale(hpMul: number, atkMul: number) {
  for (const [k, st] of orig) {
    const e = (ENEMIES as Record<string, { stats: Record<string, number> }>)[k]!;
    e.stats.hp = Math.round(st.hp! * hpMul);
    e.stats.atk = Math.round(st.atk! * atkMul);
  }
}

console.log('RECHERCHE D\'UN ÉQUILIBRAGE SAIN');
console.log('='.repeat(70));
console.log('Objectif : ~35-45 % de victoires SANS ultimes (le joueur apprend),');
console.log('           ~95 % AVEC ultimes (la récompense de la maîtrise).');
console.log('');
console.log('PV ennemis  ATQ ennemis │  sans ultime   avec ultime');
console.log('─'.repeat(70));

for (const [hpMul, atkMul] of [
  [1.0, 1.0],
  [0.8, 0.8],
  [0.7, 0.7],
  [0.6, 0.65],
  [0.5, 0.6],
  [0.45, 0.55],
  [0.4, 0.5],
  [0.35, 0.45],
]) {
  scale(hpMul, atkMul);
  const resNo: boolean[] = [];
  const resYes: boolean[] = [];
  for (let s = 0; s < STAGES.length; s++) {
    for (let i = 0; i < 25; i++) {
      resNo.push(run(s, team, false));
      resYes.push(run(s, team, true));
    }
  }
  const pNo = ((resNo.filter(Boolean).length / resNo.length) * 100).toFixed(0);
  const pYes = ((resYes.filter(Boolean).length / resYes.length) * 100).toFixed(0);
  const mark = Math.abs(Number(pNo) - 40) < 12 ? '  ← candidat' : '';
  console.log(
    `  ×${hpMul.toFixed(2)}       ×${atkMul.toFixed(2)}    │   ${pNo.padStart(3)} %         ${pYes.padStart(3)} %${mark}`
  );
}

scale(1, 1); // restauration
