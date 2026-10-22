/**
 * Cinématiques d'ultime : vérification complète.
 *  1. les 4 styles × 27 héros se génèrent sans trou ;
 *  2. le laboratoire se monte réellement dans un DOM ;
 *  3. chaque style produit bien sa structure propre (une scène différente).
 */
import { parseHTML } from 'linkedom';
import { HEROES } from '../src/data/heroes';
import { ULT_STYLES, ultDataOf, ultDuration, ultHTML } from '../src/ui/ultimate';

/* ---------- 1. Génération ---------- */
const signatures = {
  cinema: ['ua-bars', 'ua-seal', 'ua-neg'],
  comics: ['ub-panel', 'ub-dots', 'ub-name'],
  rituel: ['ur-void', 'ur-seal', 'ur-core'],
  holo: ['uh-grid', 'uh-brackets', 'uh-reticle'],
} as const;

let n = 0;
for (const s of ULT_STYLES) {
  if (!(ultDuration(s.id) > 500)) throw new Error(`durée invalide ${s.id}`);
  const html0 = ultHTML(s.id, ultDataOf(HEROES[0]!));
  for (const marker of signatures[s.id]) {
    if (!html0.includes(marker)) throw new Error(`${s.id} : élément « ${marker} » manquant`);
  }
  for (const h of HEROES) {
    const html = ultHTML(s.id, ultDataOf(h));
    if (/undefined|NaN|\[object/.test(html)) throw new Error(`valeur invalide dans ${s.id}/${h.id}`);
    if (!html.includes('<img src=')) throw new Error(`illustration manquante ${s.id}/${h.id}`);
    n++;
  }
  console.log(`${s.letter} · ${s.name.padEnd(14)} ${String(ultDuration(s.id)).padStart(4)} ms  ${markers(s.id)}`);
}
function markers(id: string): string { return signatures[id as keyof typeof signatures].join(' · '); }

/* ---------- 2. Montage réel dans un DOM ---------- */
const { window, document } = parseHTML('<!doctype html><html><body><div id="loader"></div><div id="game"></div><div id="ui"></div></body></html>');
(window as unknown as { localStorage: Storage }).localStorage = {
  getItem: () => null, setItem: () => undefined, removeItem: () => undefined,
  clear: () => undefined, key: () => null, length: 0,
} as unknown as Storage;
(globalThis as unknown as { window: unknown }).window = window;
(globalThis as unknown as { document: unknown }).document = document;

const { mountLab } = await import('../src/ui/lab');
mountLab();

const styles = document.querySelectorAll('[data-style]');
const heroes = document.querySelectorAll('[data-hero]');
const firstUlt = document.querySelector('[data-stage] .ult');
if (styles.length !== ULT_STYLES.length) throw new Error(`${ULT_STYLES.length} styles attendus, ${styles.length} trouvés`);
if (heroes.length !== HEROES.length) throw new Error(`${HEROES.length} héros attendus, ${heroes.length} trouvés`);
if (!firstUlt) throw new Error('aucune cinématique montée dans la scène');

console.log(`\nLaboratoire monté · ${styles.length} styles · ${heroes.length} héros · scène : ${firstUlt.className}`);
console.log(`${n} cinématiques générées · 4 styles × 27 héros · aucune valeur invalide`);
process.exit(0);
