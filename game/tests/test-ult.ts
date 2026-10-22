/**
 * Cinématiques d'ultime : vérification complète.
 *  1. les 4 styles × 27 héros se génèrent sans trou (le carton du nom) ;
 *  2. les 2 styles retenus × 27 héros produisent une scène complète en 5 actes ;
 *  3. les 6 archétypes sont tous couverts par le casting ;
 *  4. le laboratoire se monte réellement dans un DOM, dans les deux modes.
 */
import { parseHTML } from 'linkedom';
import { HEROES } from '../src/data/heroes';
import { ARCHETYPES, ULT_STYLES, archetypeOf, ultDataOf, ultDuration, ultHTML } from '../src/ui/ultimate';
import { fullDuration, fullUltHTML } from '../src/ui/ultimate-full';

/* ---------- 1. Le carton du nom : 4 styles × 27 héros ---------- */
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
  console.log(`${s.letter} · ${s.name.padEnd(14)} ${String(ultDuration(s.id)).padStart(4)} ms  ${signatures[s.id].join(' · ')}`);
}

/* ---------- 2. La scène complète : 2 styles × 27 héros ---------- */
const FULL_STYLES = ['cinema', 'comics'] as const;
const FULL_MARKERS = ['cf-world', 'cf-vig', 'cf-cam', 'cf-hero', 'cf-title', 'cf-bars', 'cf-flash', 'cf-end'];
const EXPECTED_MS = { cinema: 4600, comics: 4300 } as const;

let f = 0;
const used = new Set<string>();
for (const s of FULL_STYLES) {
  if (fullDuration(s) !== EXPECTED_MS[s]) throw new Error(`${s} : ${fullDuration(s)} ms au lieu de ${EXPECTED_MS[s]}`);
  for (const h of HEROES) {
    const d = ultDataOf(h);
    const html = fullUltHTML(s, d, { lab: true });
    if (/undefined|NaN|\[object/.test(html)) throw new Error(`valeur invalide dans ${s}/${h.id}`);
    for (const m of FULL_MARKERS) {
      if (!html.includes(m)) throw new Error(`${s}/${h.id} : couche « ${m} » manquante`);
    }
    if (!html.includes(`arch-${d.arch}`)) throw new Error(`${s}/${h.id} : archétype absurde`);
    if (!html.includes('cf-foes')) throw new Error(`${s}/${h.id} : pas d'ennemis dans le labo`);
    const arch = archetypeOf(h.abilities.ultimate.text, h.role, h.id);
    if (arch !== d.arch) throw new Error(`${h.id} : archétype incohérent (${arch} ≠ ${d.arch})`);
    used.add(arch);
    f++;
  }
  console.log(`Scène ${s === 'cinema' ? 'A · Cinéma' : 'B · Comics'}  ${fullDuration(s)} ms  ·  5 actes  ·  ${HEROES.length} héros`);
}

/* ---------- 3. Couverture des 6 archétypes ---------- */
const missing = ARCHETYPES.filter((a) => !used.has(a.id));
if (missing.length) throw new Error(`archétypes jamais utilisés : ${missing.map((a) => a.id).join(', ')}`);
const count = (id: string): number => HEROES.filter((h) => ultDataOf(h).arch === id).length;
console.log(`Archétypes : ${ARCHETYPES.map((a) => `${a.id} ×${count(a.id)}`).join(' · ')}`);

/* ---------- 4. Montage réel du laboratoire ---------- */
const { window, document } = parseHTML('<!doctype html><html><body><div id="loader"></div><div id="game"></div><div id="ui"></div></body></html>');
(window as unknown as { localStorage: Storage }).localStorage = {
  getItem: () => null, setItem: () => undefined, removeItem: () => undefined,
  clear: () => undefined, key: () => null, length: 0,
} as unknown as Storage;
(globalThis as unknown as { window: unknown }).window = window;
(globalThis as unknown as { document: unknown }).document = document;

const { mountLab } = await import('../src/ui/lab');
mountLab();

const modes = document.querySelectorAll('[data-mode]');
const styles = document.querySelectorAll('[data-style]');
const heroes = document.querySelectorAll('[data-hero]');
const acts = document.querySelectorAll('[data-at]');
if (modes.length !== 2) throw new Error(`2 modes attendus, ${modes.length} trouvés`);
if (styles.length !== ULT_STYLES.length) throw new Error(`${ULT_STYLES.length} styles attendus, ${styles.length} trouvés`);
if (heroes.length !== HEROES.length) throw new Error(`${HEROES.length} héros attendus, ${heroes.length} trouvés`);
if (acts.length !== 5) throw new Error(`5 actes attendus, ${acts.length} trouvés`);
const fullScene = document.querySelector('[data-stage] .ucf');
if (!fullScene) throw new Error('aucune scène complète montée par défaut');
const sceneStyle = [...FULL_STYLES].find((s) => fullScene.className.includes(`cf-${s === 'cinema' ? 'a' : 'b'}`));
if (!sceneStyle) throw new Error('scène sans style identifiable');

// On bascule en mode « révélation » : le carton doit apparaître.
(document.querySelector('[data-mode="card"]') as HTMLElement).dispatchEvent(new window.Event('click'));
const card = document.querySelector('[data-stage] .ult');
if (!card) throw new Error('le mode révélation ne monte rien');

console.log(`\nLaboratoire monté · ${modes.length} modes · ${styles.length} styles · ${heroes.length} héros · ${acts.length} actes`);
console.log(`${n} cartons + ${f} scènes complètes générées · aucune valeur invalide · DOM réel`);
process.exit(0);
