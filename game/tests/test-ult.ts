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
import { CINE_MS, CINE_SHOTS, cineDuration, cineHTML } from '../src/ui/ultimate-cine';
import { ULT_ART, ULT_FRAMES, ULT_VIDEO } from '../src/assets';

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

/* ---------- 2 bis. La cinématique : 7 plans × 2 styles × 27 héros ---------- */
if (cineDuration() !== CINE_MS) throw new Error('durée de cinématique incohérente');
if (CINE_SHOTS.length !== 7) throw new Error(`${CINE_SHOTS.length} plans au lieu de 7`);
for (let i = 1; i < CINE_SHOTS.length; i++) {
  const prev = CINE_SHOTS[i - 1]!;
  if (CINE_SHOTS[i]!.at <= prev.at) throw new Error('plans dans le désordre');
}
const last = CINE_SHOTS[CINE_SHOTS.length - 1]!;
if (last.at + last.dur > CINE_MS + 1) throw new Error('le dernier plan dépasse la durée totale');

const CINE_MARKERS = ['ca-s1', 'ca-s2', 'ca-s3', 'ca-s4', 'ca-s5', 'ca-s6', 'ca-s7',
  'ca-art', 'ca-sil', 'ca-foes-far', 'ca-shock', 'ca-hits', 'ca-title', 'ca-glyph', 'ca-lunge'];
let c = 0;
let animCount = 0;
for (const s of FULL_STYLES) {
  for (const h of HEROES) {
    const d = ultDataOf(h);
    const html = cineHTML(s, d, { lab: true });
    if (/undefined|NaN|\[object/.test(html)) throw new Error(`valeur invalide (ciné) ${s}/${h.id}`);
    for (const m of CINE_MARKERS) {
      if (!html.includes(m)) throw new Error(`ciné ${s}/${h.id} : « ${m} » manquant`);
    }
    if (!html.includes(`arch-${d.arch}`)) throw new Error(`ciné ${s}/${h.id} : archétype absurde`);
    const expectedArt = ULT_ART[d.id] ?? d.portrait;
    if (!html.includes(expectedArt)) throw new Error(`ciné ${s}/${h.id} : illustration absente`);
    if (ULT_ART[d.id] && html.includes(d.portrait)) throw new Error(`ciné ${s}/${h.id} : portrait au lieu de l'illustration`);
    const frames = ULT_FRAMES[d.id];
    if (frames) {
      if (frames.length !== 4) throw new Error(`${h.id} : ${frames.length} images au lieu de 4`);
      if ((html.match(/class="ca-fr"/g) ?? []).length !== 4) throw new Error(`${h.id} : les 4 images ne sont pas montées`);
      for (const f of frames) if (!html.includes(f)) throw new Error(`${h.id} : image d'animation manquante`);
      animCount++;
    }
    const titleBlock = html.slice(html.indexOf('ca-title'));
    const titleLetters = (titleBlock.match(/<i style="--i:\d+">[^<]*<\/i>/g) ?? []).length;
    if (titleLetters !== d.name.replace(/ /g, '').length) {
      throw new Error(`ciné ${s}/${h.id} : ${titleLetters} lettres au carton pour « ${d.name} »`);
    }
    c++;
  }
}
const withArt = HEROES.filter((h) => ULT_ART[h.id]).length;
console.log(`Cinématique · 7 plans · ${CINE_MS} ms · ${c} scènes · ${withArt}/${HEROES.length} héros illustrés · ${animCount / 2} animés`);

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
if (modes.length !== 4) throw new Error(`4 modes attendus, ${modes.length} trouvés`);
if (styles.length !== ULT_STYLES.length) throw new Error(`${ULT_STYLES.length} styles attendus, ${styles.length} trouvés`);
if (heroes.length !== HEROES.length) throw new Error(`${HEROES.length} héros attendus, ${heroes.length} trouvés`);
// En mode vidéo il n'y a pas de repères : ils n'apparaissent qu'en mode « scène animée ».
if (acts.length !== 0) throw new Error(`aucun repère attendu en mode vidéo, ${acts.length} trouvés`);
const vid = document.querySelector('[data-stage] .cvid video');
if (!vid) throw new Error('aucune vidéo montée par défaut');
const vids = Object.values(ULT_VIDEO);
if (vids.length !== 10) throw new Error(`${vids.length} vidéos au lieu de 10`);
// En test, le bundler renvoie un chemin ; en production, la vidéo est intégrée
// dans la page unique (data:video/webm). On vérifie qu'il y a bien un fichier vidéo.
for (const v of vids) {
  if (!v.endsWith('.webm') && !v.startsWith('data:video/webm')) throw new Error(`source vidéo inattendue : ${v.slice(0, 40)}`);
}

// On bascule en mode « scène animée » : les 7 plans doivent se monter.
(document.querySelector('[data-mode="cine"]') as HTMLElement).dispatchEvent(new window.Event('click'));
if (document.querySelectorAll('[data-stage] .ca-shot').length !== 7) throw new Error('7 plans attendus dans le DOM');

// Puis en mode « révélation » : le carton doit apparaître.
(document.querySelector('[data-mode="card"]') as HTMLElement).dispatchEvent(new window.Event('click'));
const card = document.querySelector('[data-stage] .ult');
if (!card) throw new Error('le mode révélation ne monte rien');

console.log(`Vidéos · ${vids.length} fichiers WebM intégrés · ${(vids.reduce((a, v) => a + v.length, 0) / 1e6).toFixed(1)} Mo`);
console.log(`\nLaboratoire monté · ${modes.length} modes · ${styles.length} styles · ${heroes.length} héros · ${acts.length} repères`);
console.log(`${n} cartons + ${f} scènes continues + ${c} cinématiques · aucune valeur invalide · DOM réel`);
process.exit(0);
