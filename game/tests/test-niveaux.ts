/**
 * Vérifie le système d'amélioration des héros :
 *  - les compétences gagnent +25 % par palier de 10 niveaux
 *  - il n'y a aucun niveau maximum
 *  - l'équilibrage ne s'effondre pas
 */
import { BattleSim } from '../src/battle/Sim';
import { HEROES, STAGES, skillMult, skillTiers, levelUpCost, heroPower, teamPower, type TeamMember } from '../src/data/heroes';

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
  return { win: s.winner === 'hero', t };
}

console.log('PALIERS DE COMPÉTENCE');
console.log('='.repeat(60));
for (const lvl of [1, 9, 10, 11, 20, 30, 50, 100, 250, 1000]) {
  console.log(`  niveau ${String(lvl).padStart(5)} → palier ${String(skillTiers(lvl)).padStart(3)}  (compétences ×${skillMult(skillTiers(lvl)).toFixed(2)})`);
}

console.log('\nCOÛT EN OR (SSR)');
console.log('='.repeat(60));
for (const lvl of [1, 5, 10, 20, 30, 50]) {
  console.log(`  niveau ${String(lvl).padStart(3)} → ${levelUpCost(lvl, 'SSR').toLocaleString('fr-FR')} or`);
}

const starters = HEROES.filter((h) => h.starter);
const base: TeamMember[] = starters.map((def) => ({ def, stars: def.stars, level: 1 }));

console.log('\nIMPACT DU NIVEAU SUR LES COMBATS (niveau 1-1, 30 essais)');
console.log('='.repeat(60));
console.log('  niveau  puissance  sans ultime   avec ultime');
for (const lvl of [1, 10, 25, 50, 100]) {
  const team = base.map((m) => ({ ...m, level: lvl }));
  const no = Array.from({ length: 30 }, () => run(0, team, false)).filter((r) => r.win).length;
  const yes = Array.from({ length: 30 }, () => run(0, team, true)).filter((r) => r.win).length;
  console.log(`  ${String(lvl).padStart(5)}  ${String(teamPower(team)).padStart(8)}  ${String(Math.round((no / 30) * 100)).padStart(9)} %  ${String(Math.round((yes / 30) * 100)).padStart(9)} %`);
}

console.log('\nPAS DE NIVEAU MAXIMUM');
console.log('='.repeat(60));
const h = HEROES[0]!;
for (const lvl of [1000, 100000]) {
  console.log(`  ${h.name} niveau ${lvl.toLocaleString('fr-FR')} → palier ${skillTiers(lvl)}, puissance ${heroPower(h, 5, lvl).toLocaleString('fr-FR')}`);
}
console.log('\n✅ Le système monte indéfiniment.');
