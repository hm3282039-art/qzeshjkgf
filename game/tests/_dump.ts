import { HEROES } from '../src/data/heroes';
import { ultDataOf } from '../src/ui/ultimate';
import { writeFileSync } from 'node:fs';
const out = HEROES.map((h) => {
  const d = ultDataOf(h);
  return { id: h.id, name: h.name, role: h.role, css: d.css, css2: d.css2, arch: d.arch,
           ult: d.name, title: d.title, phrase: d.phrase, glyph: d.glyph, art: d.art, portrait: d.portrait };
});
writeFileSync('/tmp/heroes.json', JSON.stringify(out, null, 1));
console.log(out.length, 'héros');
process.exit(0);
