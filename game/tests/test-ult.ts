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
import { ULT_ART, ULT_FRAMES } from '../src/assets';
import { RIGS } from '../src/data/rigs';
import { PHASES, RIG_MS, ULT_POSES, applyPose, poseAt } from '../src/ui/ultimate-rig';
import { EPIC_HIT, EPIC_MS, EPIC_PHASES, epicRigHTML, specOf } from '../src/ui/ultimate-epic';
import { RIG9 } from '../src/data/rig9';

/* ---------- 0. La séquence S3 : un squelette par héros ---------- */
const epicHeroes = HEROES.filter((h) => specOf(h.id));
if (epicHeroes.length !== Object.keys(RIGS).length) {
  throw new Error(`${epicHeroes.length} squelettes S3 pour ${Object.keys(RIGS).length} héros découpés`);
}
let fine = 0;
for (const h of epicHeroes) {
  const spec = specOf(h.id)!;
  const html = epicRigHTML(h.id);
  if (/undefined|NaN|\[object/.test(html)) throw new Error(`valeur invalide dans le squelette ${h.id}`);
  const bones = (html.match(/data-b=/g) ?? []).length;
  const pieces = (html.match(/class="ep-p"/g) ?? []).length;
  if (bones !== spec.bones.length) throw new Error(`${h.id} : ${bones} os montés pour ${spec.bones.length}`);
  const expected = spec.bones.reduce((a, b) => a + b.pieces.length, 0);
  if (pieces !== expected) throw new Error(`${h.id} : ${pieces} morceaux au lieu de ${expected}`);
  if (spec.fine) {
    fine++;
    if (pieces !== 9) throw new Error(`${h.id} : ${pieces} morceaux fins au lieu de 9`);
  }
}
if (Object.keys(RIG9).length !== fine) throw new Error('RIG9 et le squelette fin ne sont pas d\'accord');
if (EPIC_PHASES[EPIC_PHASES.length - 1]!.at + EPIC_PHASES[EPIC_PHASES.length - 1]!.dur !== EPIC_MS) {
  throw new Error('les phases S3 ne couvrent pas toute la séquence');
}
if (EPIC_HIT <= EPIC_PHASES[2]!.at || EPIC_HIT >= EPIC_PHASES[3]!.at + 1) {
  throw new Error('le coup ne tombe pas au début de la phase d\'onde');
}
console.log(`Séquence S3 · ${epicHeroes.length} squelettes (${fine} en 9 morceaux) · coup à ${EPIC_HIT} ms`);

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
if (modes.length !== 5) throw new Error(`5 modes attendus, ${modes.length} trouvés`);
if (styles.length !== ULT_STYLES.length) throw new Error(`${ULT_STYLES.length} styles attendus, ${styles.length} trouvés`);
if (heroes.length !== HEROES.length) throw new Error(`${HEROES.length} héros attendus, ${heroes.length} trouvés`);
// En mode vidéo il n'y a pas de repères : ils n'apparaissent qu'en mode « scène animée ».
if (acts.length !== EPIC_PHASES.length) {
  throw new Error(`${EPIC_PHASES.length} repères attendus dans la séquence S3, ${acts.length} trouvés`);
}
const ep = document.querySelector('[data-stage] .ep');
if (!ep) throw new Error('aucune séquence S3 montée par défaut');
for (const layer of ['.ep-cam', '.ep-cutin', '.ep-slash', '.ep-shock', '.ep-sparks', '.ep-invert', '.ep-title', '.ep-bars']) {
  if (!ep.querySelector(layer)) throw new Error(`couche « ${layer} » manquante`);
}
if (ep.querySelectorAll('.ep-p').length !== 9) {
  throw new Error(`${ep.querySelectorAll('.ep-p').length} morceaux affichés au lieu de 9`);
}
if (ep.querySelectorAll('.ep-bone').length !== 8) {
  throw new Error(`${ep.querySelectorAll('.ep-bone').length} os affichés au lieu de 8`);
}

// Puis la version à 5 morceaux (mode « Ultime S3 v1 »).
(document.querySelector('[data-mode="rig"]') as HTMLElement).dispatchEvent(new window.Event('click'));
const rigScene = document.querySelector('[data-stage] .rscene');
if (!rigScene) throw new Error('aucun squelette monté en mode Ultime S3 v1');
if (document.querySelectorAll('[data-stage] .rg-p').length !== 5) throw new Error('5 morceaux attendus par héros');
const rigged = Object.keys(RIGS).length;
console.log(`Squelettes 2D · ${rigged} héros découpés · ${Object.keys(ULT_POSES).length} chorégraphies`);
if (rigged > 2) {
  // toutes les chorégraphies produisent une pose valide à 20 instants
  for (const [arch, keys] of Object.entries(ULT_POSES)) {
    for (let i = 0; i <= 20; i++) {
      const p = poseAt(keys, i / 20);
      for (const [k, v] of Object.entries(p)) if (!Number.isFinite(v)) throw new Error(`pose invalide ${arch}.${k}`);
    }
  }
  // les 4 phases doivent couvrir toute la durée, sans trou
  if (PHASES.length !== 4) throw new Error(`${PHASES.length} phases au lieu de 4`);
  for (let i = 0; i < PHASES.length; i++) {
    const p = PHASES[i]!;
    if (p.at !== (i === 0 ? 0 : PHASES[i - 1]!.at + PHASES[i - 1]!.dur)) {
      throw new Error(`la phase ${p.id} ne reprend pas exactement où la précédente s'arrête`);
    }
  }
  const lastPhase = PHASES[PHASES.length - 1]!;
  if (lastPhase.at + lastPhase.dur !== RIG_MS) throw new Error('les phases ne couvrent pas toute la scène');
  const rg = document.querySelector('[data-stage] .rscene');
  if (!rg) throw new Error('pas de scène montée');
  if (!rg.querySelector('.rs-cam')) throw new Error('pas de caméra dans la scène');
  if (!rg.querySelector('.rs-invert')) throw new Error('pas de calque d\'impact frame');
  if (!rg.querySelector('.rs-speed')) throw new Error('pas de lignes de vitesse');

  const el = document.querySelector<HTMLElement>('[data-stage] .rg')!;
  applyPose(el, poseAt(ULT_POSES.slam!, 0.54));
  console.log(`S3 · ${PHASES.map((p) => `${p.label} ${p.at}–${p.at + p.dur}ms`).join(' · ')}`);
  console.log(`Chorégraphies vérifiées à 0 %, 5 %, … 100 % · caméra + impact frames présents`);
}

(document.querySelector('[data-mode="cine"]') as HTMLElement).dispatchEvent(new window.Event('click'));
if (document.querySelectorAll('[data-stage] .ca-shot').length !== 7) throw new Error('7 plans attendus dans le DOM');

// Puis en mode « révélation » : le carton doit apparaître.
(document.querySelector('[data-mode="card"]') as HTMLElement).dispatchEvent(new window.Event('click'));
const card = document.querySelector('[data-stage] .ult');
if (!card) throw new Error('le mode révélation ne monte rien');

console.log(`\nLaboratoire monté · ${modes.length} modes · ${styles.length} styles · ${heroes.length} héros · ${acts.length} repères`);
console.log(`${n} cartons + ${f} scènes continues + ${c} cinématiques · aucune valeur invalide · DOM réel`);
process.exit(0);
