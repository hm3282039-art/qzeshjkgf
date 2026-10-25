/** Vérifie les chapitres 11 à 20 : pas de crash, pas de NaN, combats qui se terminent. */
import { BattleSim } from '../src/battle/Sim';
import { HEROES, STAGES, type TeamMember } from '../src/data/heroes';

const STEP = 1 / 30;
const team = (lvl: number): TeamMember[] =>
  ['kael', 'lyra', 'nyx', 'seren', 'aldric'].map((id) => {
    const def = HEROES.find((h) => h.id === id)!;
    return { def, stars: 5, level: lvl, red: 1 };
  });

let crash = 0, nan = 0, stall = 0, fights = 0;
for (const st of STAGES) {
  const ci = Number(st.id.split('-')[0]);
  if (ci < 11) continue;
  // On joue au niveau CONSEILLÉ par le jeu (st.level), pas avec une formule maison :
  // l'ancienne formule (20 + 7 × chapitre) restait sous la difficulté réelle et
  // annonçait « 0 % » sur tous les chapitres 11 à 20.
  const lvl = st.level;
  let wins = 0, dur = 0;
  for (let i = 0; i < 3; i++) {
    try {
      const sim = new BattleSim(st, team(lvl));
      sim.setup();
      let steps = 0;
      while (!sim.winner && steps < 30 * 180) { sim.update(STEP); steps++; }
      fights++;
      for (const u of sim.units) if (!Number.isFinite(u.hp)) nan++;
      if (!sim.winner) stall++;
      else if (sim.winner === 'hero') wins++;
      dur += steps / 30;
    } catch (e) {
      crash++;
      console.log(`CRASH ${st.id}`, e);
    }
  }
  const pct = Math.round((wins / 3) * 100);
  if (st.id.endsWith('-1') || st.id.endsWith('-3') || st.id.endsWith('-5')) {
    console.log(`${st.id.padEnd(6)} niv.${String(lvl).padStart(3)}  win ${String(pct).padStart(3)}%  ${Math.round(dur / 3)}s  (puiss. ${st.power})`);
  }
}
console.log(`\n${fights} combats · crash ${crash} · NaN ${nan} · sans fin ${stall}`);
if (crash || nan || stall) process.exit(1);
