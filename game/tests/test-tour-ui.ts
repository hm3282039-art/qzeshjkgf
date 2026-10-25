/**
 * TEST D'INTERFACE DU COMBAT TOUR PAR TOUR (`?tour`).
 *
 * Le moteur est testé par tests/test-tour.ts ; ici on vérifie que **l'écran se monte et
 * se joue vraiment dans un DOM** : la grille des 6 emplacements, les 4 boutons de
 * capacité avec leur recharge, le choix d'une cible à la souris, la barre d'ordre de
 * tour, le journal, et l'écran de fin. Sans navigateur : on utilise linkedom.
 *
 * Usage : npx vite-node tests/test-tour-ui.ts
 */
import { parseHTML } from 'linkedom';

/* --------------------------- DOM de laboratoire ------------------------- */

const dom = parseHTML(`<!doctype html><html><body>
  <div id="loader">chargement…</div>
  <canvas id="game"></canvas>
  <div id="ui"></div>
</body></html>`);

type Any = Record<string, unknown>;
const g = globalThis as unknown as Any;
/** Certains globaux de Node (navigator…) sont en lecture seule : on force. */
function globalSet(name: string, value: unknown): void {
  try {
    Object.defineProperty(globalThis, name, { value, writable: true, configurable: true });
  } catch { /* tant pis, le code n'en a peut-être pas besoin */ }
}
globalSet('window', dom.window);
globalSet('document', dom.document);
globalSet('navigator', dom.navigator);
globalSet('HTMLElement', dom.window.HTMLElement);
globalSet('Element', dom.window.Element);
globalSet('Node', dom.window.Node);
globalSet('Event', dom.window.Event);
globalSet('MouseEvent', dom.window.MouseEvent);
globalSet('KeyboardEvent', dom.window.KeyboardEvent);
globalSet('getComputedStyle', () => ({ getPropertyValue: () => '' }));
if (!dom.window.localStorage) {
  (dom.window as unknown as Any).localStorage = { getItem: () => null, setItem: () => undefined, removeItem: () => undefined };
}
g.localStorage = dom.window.localStorage;

const sleep = (ms: number): Promise<void> => new Promise((r) => setTimeout(r, ms));

/** Clique réellement sur un élément (l'événement doit remonter jusqu'au parent). */
function click(el: Element | null | undefined): boolean {
  if (!el) return false;
  // linkedom n'a pas MouseEvent : un Event « click » qui bulle suffit.
  const Ctor = (dom.window as unknown as { Event: new (t: string, o?: unknown) => Event }).Event;
  el.dispatchEvent(new Ctor('click', { bubbles: true, cancelable: true }));
  return true;
}

let erreurs = 0;
const echec = (m: string): void => { erreurs++; console.log(`   ❌ ${m}`); };
const ok = (m: string): void => console.log(`   ✅ ${m}`);

/* ------------------------------- montage -------------------------------- */

console.log('\n═══ INTERFACE — combat tour par tour (?tour) ═══');

const { mountTour } = await import('../src/ui/tour');
mountTour();

const $ = (sel: string): Element | null => dom.document.querySelector(sel);
const $$ = (sel: string): Element[] => Array.from(dom.document.querySelectorAll(sel));

if (!$('.tour')) echec('l’écran .tour n’est pas monté');
else ok('l’écran se monte dans le DOM');
if ($('#loader')) echec('l’écran de chargement n’a pas été retiré');

/* ---------------------------- écran de préparation ---------------------- */

const cartes = $$('.tour-side.heroes .tcard');
const vides = $$('.tour-side.heroes .tcard.empty');
if (cartes.length !== 6) echec(`${cartes.length} emplacements côté héros au lieu de 6`);
else ok(`6 emplacements côté héros (dont ${vides.length} libres)`);

const cols = $$('.tour-side.heroes .tour-col');
if (cols.length !== 3) echec(`${cols.length} colonnes au lieu de 3 (devant / milieu / derrière)`);
else {
  const titres = cols.map((c) => c.querySelector('h4')?.textContent?.trim().split('\n')[0] ?? '?');
  if (!titres.some((t) => t.toLowerCase().includes('derrière')) || !titres.some((t) => t.toLowerCase().includes('devant'))) {
    echec(`colonnes mal nommées : ${titres.join(' / ')}`);
  } else ok(`colonnes : ${titres.join(' / ')}`);
}

const colsEnnemies = $$('.tour-side.foes .tour-col');
const ennemis = $$('.tour-side.foes .tcard:not(.empty)');
if (colsEnnemies.length !== 3) echec('les ennemis ne sont pas répartis sur 3 lignes');
else ok(`ennemis sur 3 lignes · ${ennemis.length} créatures`);

const boutons = $$('.tour-bar .tskill');
if (boutons.length !== 4) echec(`${boutons.length} boutons de capacité au lieu de 4`);
else ok('4 boutons de capacité (3 + ultime) dans la barre du bas');

if (!$('[data-soul-hero]') || !$('[data-soul-foe]')) echec('les jauges d’âmes manquent');
else if ($$('[data-soul-hero] .gem').length !== 9) echec('la jauge d’âmes n’a pas 9 gemmes');
else ok('deux jauges d’âmes (toi / ennemi) de 9 gemmes');

if ($$('.tour-order .ochip').length === 0) echec('la barre d’ordre de tour est vide');
else ok(`barre d’ordre de tour : ${$$('.tour-order .ochip').length} pastilles`);

/* ------------------------------ changer un héros ------------------------ */

const avant = $$('.tour-side.heroes .tcard:not(.empty)').length;
click($('[data-place]'));
const apres = $$('.tour-side.heroes .tcard:not(.empty)').length;
if (apres !== avant) echec('« Placement auto » a changé le nombre de héros en jeu');
else ok('« Placement auto » replace les mêmes héros sur les 6 emplacements');

click($('.tour-side.heroes .tcard.empty') ?? $('.tour-side.heroes .tcard'));
if (!$('.picker')) echec('cliquer sur un emplacement n’ouvre pas le choix de héros');
else {
  const cartesChoix = $$('.picker .pcard');
  if (cartesChoix.length < 20) echec(`seulement ${cartesChoix.length} héros proposés`);
  else ok(`choix de héros : ${cartesChoix.length} fiches proposées (${$$('.picker .pcard.taken').length} déjà placées)`);
  const libre = $$('.picker .pcard:not(.taken)')[0];
  const nom = libre?.querySelector('b')?.textContent ?? '?';
  click(libre);
  if ($('.picker')) echec('le choix ne se referme pas après avoir pris un héros');
  else if ($$('.tour-side.heroes .tcard:not(.empty)').length !== 6) echec('l’emplacement choisi n’a pas été rempli');
  else ok(`héros ajouté depuis le choix : ${nom} → 6 emplacements occupés`);
}

/* -------------------------------- combat -------------------------------- */

click($('[data-start]'));
await sleep(30);
if (!$('.tour-side.heroes .tcard.acting') && !$('.tbanner')) {
  // Le premier tour peut prendre quelques dizaines de ms (jauge d'initiative).
  for (let i = 0; i < 40 && !$('.tcard.acting'); i++) await sleep(30);
}

const actif = $('.tcard.acting');
if (!actif) echec('aucune unité ne devient active au lancement du combat');
else {
  const nom = actif.querySelector('.tname')?.textContent?.trim() ?? '?';
  ok(`le combat démarre : c’est au tour de « ${nom} »`);
}

// Un tour joué À LA MAIN : capacité → cible, comme le ferait le joueur.
const jouables = $$('.tour-bar .tskill').filter((b) => !(b as unknown as { disabled: boolean }).disabled);
if (jouables.length === 0) echec('aucune capacité jouable alors que c’est le tour d’un héros');
else {
  const btn = jouables[jouables.length - 1]!;
  const nomCap = btn.querySelector('b')?.textContent ?? '?';
  click(btn);
  await sleep(20);
  const cibles = $$('.tcard.picking');
  if (cibles.length > 0) {
    click(cibles[0]);
    ok(`coup joué à la main : « ${nomCap} » → ${cibles.length} cibles proposées, une choisie`);
  } else {
    ok(`coup joué à la main : « ${nomCap} » (cible automatique, capacité de zone)`);
  }
}

// On laisse ensuite l'auto jouer jusqu'à la fin, en vitesse ×4.
click($('[data-speed]'));
click($('[data-speed]'));
click($('[data-auto]'));

let tours = 0;
let cine = 0;
const debut = Date.now();
while (!$('.tbanner') && Date.now() - debut < 120_000) {
  await sleep(60);
  tours++;
  // La cinématique d'ultime du jeu doit se monter au moment du coup.
  if ($('.tour-ult-host') || $('.ult') || $('.tultname')) cine++;
}

if (!$('.tbanner')) echec(`le combat ne se termine pas (${tours} polls, ${((Date.now() - debut) / 1000).toFixed(0)} s)`);
else {
  const titre = $('.tbanner h2')?.textContent?.trim() ?? '?';
  const texte = $('.tbanner p')?.textContent ?? '';
  if (!/VICTOIRE|DÉFAITE|MATCH NUL/.test(titre)) echec(`écran de fin illisible : « ${titre} »`);
  else ok(`écran de fin : ${titre} — ${texte.trim().split('\n')[0]}`);
  if (!$('.tbanner [data-again]')) echec('pas de bouton « Rejouer » sur l’écran de fin');
}

if (cine === 0) echec('aucune cinématique d’ultime ne s’est montée pendant le combat');
else ok(`cinématique d’ultime du jeu rejouée pendant le combat (vue sur ${cine} relevés)`);

const lignes = $$('.tour-log p');
if (lignes.length < 10) echec(`journal de combat quasi vide (${lignes.length} lignes)`);
else ok(`journal de combat : ${lignes.length} lignes (dont ${$$('.tour-log p.ult').length} ultimes, ${$$('.tour-log p.dead').length} morts)`);

const morts = $$('.tcard.dead').length;
if (morts === 0) echec('personne n’est mort : les dégâts ne servent à rien');
else ok(`${morts} unités tombées, cartes grisées`);

/* ------------------------------ on rejoue ------------------------------- */

click($('.tbanner [data-again]'));
await sleep(40);
for (let i = 0; i < 30 && !$('.tcard.acting'); i++) await sleep(40);
if ($('.tbanner')) echec('« Rejouer » ne relance pas un combat propre');
else ok('« Rejouer ce combat » repart sur un combat neuf');

/* ------------------------------ les règles ------------------------------ */

click($('[data-rules]'));
await sleep(20);
if (!$('.picker-box')) echec('le panneau de règles ne s’ouvre pas');
else {
  const texte = $('.picker-box')?.textContent ?? '';
  for (const mot of ['initiative', 'capacités', 'lignes', 'âmes', 'statuts']) {
    if (!texte.toLowerCase().includes(mot)) echec(`les règles ne parlent pas de « ${mot} »`);
  }
  ok('panneau de règles : initiative, capacités, lignes, âmes, statuts');
  click($('.picker [data-close]'));
}

console.log('\n════════════════════════════════════════════════');
if (erreurs === 0) console.log('✅ INTERFACE TOUR PAR TOUR : RIEN À SIGNALER');
else console.log(`❌ ${erreurs} problème(s) d'interface`);
console.log('════════════════════════════════════════════════\n');
process.exit(erreurs === 0 ? 0 : 1);
