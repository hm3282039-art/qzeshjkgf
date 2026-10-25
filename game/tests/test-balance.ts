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
/**
 * L'équipe est jouée AU NIVEAU CONSEILLÉ par le niveau (st.level), pas au niveau 1.
 * Avant, ce banc alignait des héros niveau 1 contre le chapitre 20 et annonçait
 * « 0/60 victoires » partout : c'était vrai, mais ça ne mesurait rien d'autre que
 * l'évidence. On teste maintenant le contrat réel du jeu : « au niveau conseillé,
 * est-ce que ça passe ? »
 */
const teamAt = (level: number): TeamMember[] => starters.map((def) => ({ def, stars: def.stars, level }));
const ESSAIS = 20;

console.log('ÉQUIPE PAR DÉFAUT (nouveau joueur) AU NIVEAU CONSEILLÉ');
console.log('='.repeat(78));
console.log('Héros :', starters.map((h) => `${h.name}(${h.stars}★)`).join(', '));
console.log('');

let sousLeSeuil = 0;
let ultObligatoires = 0;
let tropFacile = 0;
for (let s = 0; s < STAGES.length; s++) {
  const st = STAGES[s]!;
  const team = teamAt(st.level);
  const lignes: string[] = [];
  const tauxBrut: number[] = [];
  for (const useUlt of [false, true]) {
    const res = Array.from({ length: ESSAIS }, () => run(s, team, useUlt));
    const wins = res.filter((r) => r.winner === 'hero').length;
    const avgAlive = res.reduce((a, r) => a + r.alive, 0) / res.length;
    const label = useUlt ? 'AVEC ultimes' : 'SANS ultimes';
    tauxBrut.push((wins / ESSAIS) * 100);
    lignes.push(`${label.padEnd(13)} ${String(wins).padStart(2)}/${ESSAIS} (${((wins / ESSAIS) * 100).toFixed(0).padStart(3)} %)  survivants ${avgAlive.toFixed(1)}/5`);
  }
  const isBoss = st.id.endsWith('-3') || st.id.endsWith('-5');
  const seuil = isBoss ? 40 : 60;
  // Le contrat du jeu se juge ULTIMES EN CLÉ : c'est la décision du joueur (et le mode
  // AUTO existe pour la déléguer). Le taux « sans ultimes » reste affiché : il mesure
  // l'écart de compétence, pas un échec.
  const taux = tauxBrut[1]!;
  const sansUlt = tauxBrut[0]!;
  const etat = taux < seuil ? '  ⚠ sous le seuil' : sansUlt === 0 ? '  · ultimes nécessaires' : '';
  if (taux < seuil) sousLeSeuil++;
  if (sansUlt === 0) ultObligatoires++;
  if (sansUlt >= 60) tropFacile++;
  console.log(`${st.id.padEnd(7)} niv. ${String(st.level).padStart(3)} · puiss. ${String(st.power).padStart(7)} │ ${lignes.join(' │ ')}${etat}`);
}
console.log('='.repeat(78));
console.log(`Contrat tenu (avec ultimes : 60 % normal / 40 % boss) : ${STAGES.length - sousLeSeuil}/${STAGES.length}`);
console.log(`Niveaux où les ultimes sont nécessaires                : ${ultObligatoires}/${STAGES.length}`);
console.log(`Niveaux gagnables à 60 % SANS toucher aux ultimes      : ${tropFacile}/${STAGES.length}`);
if (sousLeSeuil) {
  console.log('\n✗ Des niveaux ne respectent pas le contrat au niveau conseillé.');
  process.exit(1);
}
console.log('\n✓ Tous les niveaux passent au niveau conseillé (ultimes en clé).');
console.log('');

console.log('STATS : héros moyens vs ennemis');
console.log('='.repeat(64));
const hp = starters.reduce((a, h) => a + h.stats.hp, 0) / starters.length;
const atk = starters.reduce((a, h) => a + h.stats.atk, 0) / starters.length;
const arm = starters.reduce((a, h) => a + h.stats.armor, 0) / starters.length;
console.log(`Héros moyens : ${hp.toFixed(0)} PV, ${atk.toFixed(0)} ATQ, ${arm.toFixed(0)} armure`);
for (const [k, e] of Object.entries(ENEMIES)) {
  console.log(`  ${k.padEnd(11)} ${String(e.stats.hp).padStart(6)} PV, ${String(e.stats.atk).padStart(4)} ATQ, ${String(e.stats.armor).padStart(3)} armure`);
}
