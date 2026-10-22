/**
 * Banc de test headless du combat.
 * Fait tourner des centaines de simulations pour détecter :
 *  - les crashs (exceptions)
 *  - les valeurs NaN / Infinity
 *  - les combats qui ne se terminent jamais
 *  - l'équilibrage (taux de victoire, durée)
 */
import { BattleSim } from '../src/battle/Sim';
import { HEROES, STAGES, type TeamMember } from '../src/data/heroes';

const STEP = 1 / 30;
const MAX_STEPS = 60 * 200; // 200 s de simulation max

interface Result {
  winner: string | null;
  time: number;
  steps: number;
  nan: boolean;
  heroesAlive: number;
}

function runBattle(stageIdx: number, team: TeamMember[]): Result {
  const stage = STAGES[stageIdx]!;
  const sim = new BattleSim(stage, team);
  sim.setup();

  let steps = 0;
  let nan = false;
  let time = 0;

  while (!sim.winner && steps < MAX_STEPS) {
    sim.update(STEP);
    time += STEP;
    steps++;
    // vérif intégrité à chaque pas
    if (steps % 10 === 0) {
      for (const u of sim.units) {
        if (!Number.isFinite(u.hp) || !Number.isFinite(u.maxHp) || Number.isNaN(u.hp)) {
          nan = true;
        }
      }
      if (!Number.isFinite(time)) nan = true;
    }
  }

  return {
    winner: sim.winner,
    time,
    steps,
    nan,
    heroesAlive: sim.heroes.filter((u) => u.hp > 0).length,
  };
}

function team(ids: string[], stars?: number): TeamMember[] {
  return ids.map((id) => {
    const def = HEROES.find((h) => h.id === id);
    if (!def) throw new Error(`héros inconnu: ${id}`);
    return { def, stars: stars ?? def.stars, level: 1 };
  });
}

// --- Configurations testées ---
const ALL = HEROES.map((h) => h.id);
const configs: Array<{ name: string; team: TeamMember[] }> = [
  { name: 'starter (4 héros de base)', team: team(HEROES.filter((h) => h.starter).map((h) => h.id)) },
  { name: 'tous les héros', team: team(ALL) },
  { name: 'Kael seul (tank)', team: team(['kael']) },
  { name: 'Lyra seule (assassin)', team: team(['lyra']) },
  { name: 'Aldric seul (soigneur)', team: team(['aldric']) },
  { name: 'Seren seule (archère)', team: team(['seren']) },
  { name: 'Morwen seule (mage)', team: team(['morwen']) },
  { name: 'tank + soin', team: team(['kael', 'aldric']) },
  { name: 'équipe 3 au hasard', team: team(['thorne', 'nyx', 'ashka']) },
  { name: 'les 3 nouveaux', team: team(['vaelen', 'sylvaine', 'pyrrha']) },
  { name: 'Vaelen seul (tank)', team: team(['vaelen']) },
  { name: 'Sylvaine seule', team: team(['sylvaine']) },
  { name: 'Pyrrha seule', team: team(['pyrrha']) },
  { name: 'tous à 1 étoile', team: team(ALL, 1) },
  { name: 'tous à 10 étoiles', team: team(ALL, 10) },
];

console.log('='.repeat(72));
console.log('BANC DE TEST — Légendes de la Tour Infinie');
console.log('='.repeat(72));

let crashes = 0;
let nans = 0;
let timeouts = 0;
let total = 0;

for (let s = 0; s < STAGES.length; s++) {
  const stage = STAGES[s]!;
  console.log(`\n▸ Niveau ${stage.id} — ${stage.name}  (${stage.enemies.length} ennemis, puissance ${stage.power})`);

  for (const cfg of configs) {
    const results: Result[] = [];
    let err: string | null = null;

    for (let i = 0; i < 12; i++) {
      try {
        results.push(runBattle(s, cfg.team));
      } catch (e) {
        err = e instanceof Error ? `${e.message}` : String(e);
        break;
      }
    }

    total += results.length;

    if (err) {
      crashes++;
      console.log(`  ✗ ${cfg.name.padEnd(28)} CRASH : ${err}`);
      continue;
    }

    const wins = results.filter((r) => r.winner === 'hero').length;
    const losses = results.filter((r) => r.winner === 'enemy').length;
    const draws = results.filter((r) => r.winner === null).length;
    const nanCount = results.filter((r) => r.nan).length;
    const avgTime = results.reduce((a, r) => a + r.time, 0) / results.length;
    const maxTime = Math.max(...results.map((r) => r.time));

    if (nanCount > 0) nans++;
    if (draws > 0) timeouts++;

    const bar = `${((wins / results.length) * 100).toFixed(0)}%`.padStart(4);
    const flag = nanCount > 0 ? ' ⚠NaN' : draws > 0 ? ' ⚠TIMEOUT' : '';
    console.log(
      `  ${flag ? '⚠' : '✓'} ${cfg.name.padEnd(28)} ` +
        `win ${bar}  (${wins}V/${losses}D/${draws}N)  ` +
        `${avgTime.toFixed(0)}s moy  ${maxTime.toFixed(0)}s max${flag}`
    );
  }
}

console.log('\n' + '='.repeat(72));
console.log('BILAN');
console.log('='.repeat(72));
console.log(`Simulations exécutées : ${total}`);
console.log(`Crashs                : ${crashes}`);
console.log(`Configs avec NaN      : ${nans}`);
console.log(`Configs sans fin      : ${timeouts}`);
console.log(crashes === 0 && nans === 0 && timeouts === 0 ? '\n✅ AUCUN BUG DÉTECTÉ' : '\n❌ DES PROBLÈMES SUBSISTENT');
