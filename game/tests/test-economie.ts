/**
 * Test économique : le joueur peut-il VRAIMENT atteindre les niveaux requis ?
 *
 * On confronte deux courbes :
 *  - le coût cumulé en or pour amener 5 héros à un niveau donné ;
 *  - l'or réellement gagnable (première victoire de la campagne + farm journalier).
 *
 * Usage : npx vite-node tests/test-economie.ts
 */
import { HEROES, STAGES, levelUpCost, levelStatMult, skillMult, skillTiers } from '../src/data/heroes';

const fr = (n: number) => Math.round(n).toLocaleString('fr-FR');

/** Coût cumulé pour amener UN héros du niveau 1 au niveau L. */
function cumul(L: number, rarity: 'R' | 'SR' | 'SSR' = 'SSR'): number {
  let s = 0;
  for (let l = 1; l < L; l++) s += levelUpCost(l, rarity);
  return s;
}

/** Or de la campagne en première victoire (tous les niveaux). */
const goldFirstClear = STAGES.reduce((a, st) => a + st.rewards.gold, 0);
const gemsFirstClear = STAGES.reduce((a, st) => a + st.rewards.gems, 0);

/** Farm : énergie par jour (1 par minute) divisée par le coût du niveau farmé. */
const ENERGY_PER_DAY = 24 * 60;

console.log('ÉCONOMIE DE LA PROGRESSION');
console.log('='.repeat(78));
console.log(`Or gagné en terminant la campagne une fois : ${fr(goldFirstClear)}  (${fr(gemsFirstClear)} gemmes)`);
console.log(`Énergie disponible par jour               : ${ENERGY_PER_DAY}`);
console.log('');
console.log('Niveau   coût/héros   coût ×5 héros   farm/jour (chap. 20)   jours de farm');
console.log('─'.repeat(78));

const farmStage = STAGES[STAGES.length - 1]!;
const runsPerDay = Math.floor(ENERGY_PER_DAY / farmStage.energy);
const goldPerDay = runsPerDay * farmStage.rewards.gold;

for (const L of [20, 40, 60, 80, 100, 120, 140, 160, 200]) {
  const c = cumul(L);
  const total = c * 5;
  const days = total / goldPerDay;
  const mark = days > 30 ? '  ← MUR' : days > 7 ? '  ← très long' : '';
  console.log(
    String(L).padStart(5) +
      fr(c).padStart(14) +
      fr(total).padStart(16) +
      fr(goldPerDay).padStart(20) +
      (days < 0.1 ? '< 1 h'.padStart(14) : `${days.toFixed(1)} j`.padStart(14)) +
      mark
  );
}

console.log('');
console.log(`Un niveau de farm au chapitre 20 rapporte ${fr(farmStage.rewards.gold)} or (${runsPerDay} runs/jour).`);
console.log('');
console.log('Multiplicateur de statistiques d\'un héros selon le niveau :');
for (const L of [1, 30, 60, 100, 140, 200]) {
  const m = levelStatMult(L);
  const s = skillMult(skillTiers(L));
  console.log(`  niv. ${String(L).padStart(3)} → PV/ATQ ×${m.toFixed(2)} · compétences ×${s.toFixed(2)} · dégâts ≈ ×${(m * s).toFixed(2)}`);
}
console.log('');
console.log('Budget de PV ennemis par chapitre (formule actuelle) :');
for (const st of STAGES) {
  if (!st.id.endsWith('-1')) continue;
  const c = st.tier / 5;
  const hp = c <= 10 ? Math.pow(1.44, c) : Math.pow(1.44, 10) * Math.pow(1.05, c - 10);
  const atk = c <= 10 ? Math.pow(1.28, c) : Math.pow(1.28, 10) * Math.pow(1.03, c - 10);
  console.log(`  chap. ${String(Math.round(c)).padStart(2)} → PV ×${hp.toFixed(1).padStart(7)} · ATQ ×${atk.toFixed(1).padStart(6)} · budget ${fr(12900 * hp)} PV`);
}
void HEROES;
