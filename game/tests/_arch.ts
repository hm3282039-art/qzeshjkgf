import { HEROES } from '../src/data/heroes';
import { ARCHETYPES, archetypeOf } from '../src/ui/ultimate';
const rows = HEROES.map((h) => ({ n: h.name, r: h.role, a: archetypeOf(h.abilities.ultimate.text, h.role, h.id), u: h.abilities.ultimate.name }));
for (const x of rows) console.log(`${x.n.padEnd(14)} ${x.r.padEnd(9)} ${x.a.padEnd(6)} ${x.u}`);
console.log('\nRÉPARTITION :');
for (const a of ARCHETYPES) console.log(`  ${a.id.padEnd(6)} ${String(rows.filter((x) => x.a === a.id).length).padStart(2)}  ${a.label}`);
process.exit(0);
