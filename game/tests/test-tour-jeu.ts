/**
 * TEST DU COMBAT TOUR PAR TOUR **INTÉGRÉ AU JEU**.
 *
 * `tests/test-tour.ts` vérifie le moteur, `tests/test-tour-ui.ts` vérifie l'écran du
 * laboratoire (`?tour`). Ici on vérifie ce que le joueur voit en lançant un niveau de la
 * campagne :
 *
 *   • l'équipe reste à **5 héros** mais le champ propose **6 emplacements** — le joueur
 *     décide lequel reste vide, et son choix est **enregistré** dans la sauvegarde ;
 *   • le combat s'ouvre **dans l'interface du jeu** (`#ui`), avec la vraie équipe,
 *     les vrais niveaux, et l'étape imposée (pas de sélecteur d'étape) ;
 *   • à la fin, le combat rend un résultat **de la même forme** que le combat en temps
 *     réel (`winner / stars / time / stats`) : c'est ce qui permet au jeu d'afficher son
 *     écran de victoire, de donner l'or, les gemmes, l'expérience et le butin ;
 *   • « Quitter » rend la main au jeu, et l'écran se démonte proprement.
 *
 * Usage : npx vite-node tests/test-tour-jeu.ts
 */
import { parseHTML } from 'linkedom';
import type { TeamMember } from '../src/data/heroes';
import type { TourResult } from '../src/ui/tour';

/* --------------------------- DOM de laboratoire ------------------------- */

const dom = parseHTML(`<!doctype html><html><body>
  <canvas id="game"></canvas>
  <div id="ui"></div>
</body></html>`);

type Any = Record<string, unknown>;
const g = globalThis as unknown as Any;
function globalSet(name: string, value: unknown): void {
  try {
    Object.defineProperty(globalThis, name, { value, writable: true, configurable: true });
  } catch { /* certains globaux de Node sont en lecture seule */ }
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

function click(el: Element | null | undefined): boolean {
  if (!el) return false;
  const Ctor = (dom.window as unknown as { Event: new (t: string, o?: unknown) => Event }).Event;
  el.dispatchEvent(new Ctor('click', { bubbles: true, cancelable: true }));
  return true;
}

let erreurs = 0;
const echec = (m: string): void => { erreurs++; console.log(`   ❌ ${m}`); };
const ok = (m: string): void => console.log(`   ✅ ${m}`);

const $ = (sel: string): Element | null => dom.document.querySelector(sel);
const $$ = (sel: string): Element[] => Array.from(dom.document.querySelectorAll(sel));

const { store } = await import('../src/state/store');
const { HEROES, STAGES } = await import('../src/data/heroes');
const { ROW_LABEL } = await import('../src/turn/types');
const { openTourBattle } = await import('../src/ui/tour');

/* ===================================================================== */
console.log('\n═══ 1. LA SAUVEGARDE — 5 héros, 6 emplacements ═══');
/* ===================================================================== */

if (store.settings.battleMode !== 'tour') echec(`le mode par défaut est « ${store.settings.battleMode} », attendu « tour »`);
else ok('le combat tour par tour est le système par défaut du jeu');

const equipe: TeamMember[] = store.team();
if (equipe.length !== 5) echec(`l'équipe compte ${equipe.length} héros, attendu 5`);
else ok(`l'équipe reste à 5 héros (${equipe.map((m) => m.def.name).join(', ')})`);

const places = store.slotsForTeam(equipe);
if (places.length !== 6) echec(`${places.length} emplacements proposés, attendu 6`);
else ok('le champ de bataille propose 6 emplacements');

const occupes = places.filter((m) => !!m).length;
if (occupes !== equipe.length) echec(`${occupes} emplacements occupés pour ${equipe.length} héros`);
else ok(`${occupes} emplacements occupés · ${6 - occupes} reste vide (au joueur de choisir lequel)`);

if (places.some((m, i) => places.findIndex((x) => x?.def.id === m?.def.id) !== i && m)) {
  echec('un héros occupe deux emplacements à la fois');
} else ok('aucun héros n’est placé deux fois');

// Le choix du joueur est conservé : on déplace un héros tout au fond, on relit.
const deplace = [...places];
const iLibre = deplace.findIndex((m) => !m);
const premier = deplace[0];
deplace[0] = deplace[iLibre] ?? null;   // on échange avec l'emplacement libre
deplace[iLibre] = premier;
store.saveSlots(deplace);
const relus = store.slotsForTeam(equipe);
if (iLibre < 0) echec('aucun emplacement libre à échanger');
else if (relus[iLibre]?.def.id !== premier?.def.id) echec('le placement choisi n’est pas conservé dans la sauvegarde');
else ok('le placement choisi est enregistré puis relu à l’identique');
if (relus.filter((m) => !!m).length !== 5) echec(`${relus.filter((m) => !!m).length} héros après relecture, attendu 5`);
else ok('la relecture remet bien les 5 héros, sans en inventer un sixième');

// Un héros qui ENTRE dans l'équipe prend une case libre ; ceux qui restent gardent la leur.
store.devGiveAll();   // tous les héros deviennent invocables pour le test
const base = store.team();
const avantCases = store.slotsForTeam(base);
const sortant = base[base.length - 1]!;
const baseIds = base.map((m) => m.def.id);
const entrant = HEROES.find((h) => !baseIds.includes(h.id));
if (!entrant) echec('aucun héros disponible pour tester un changement d’équipe');
else {
  store.setTeam([...baseIds.filter((id) => id !== sortant.def.id), entrant.id]);
  const apresCases = store.slotsForTeam(store.team());
  const nomEntrant: string = entrant.name;
  const nomSortant: string = sortant.def.name;
  const bouges = baseIds
    .filter((id) => id !== sortant.def.id)
    .filter((id) => avantCases.findIndex((m) => m?.def.id === id) !== apresCases.findIndex((m) => m?.def.id === id));
  const souciEquipe = apresCases.filter((m) => !!m).length !== 5 ? 'tout le monde n’est pas placé après le changement d’équipe'
    : !apresCases.some((m) => m?.def.id === entrant.id) ? 'le nouveau héros n’a reçu aucun emplacement'
      : bouges.length > 0 ? 'des héros déjà placés ont été déplacés sans raison'
        : '';
  if (souciEquipe) echec(`${nomEntrant} entre, ${nomSortant} sort : ${souciEquipe}`);
  else ok('un héros qui entre dans l’équipe prend la case libre, les autres gardent la leur');
  store.setTeam(baseIds);
}

// Un héros retiré par le joueur reste sur le banc : à partir du premier choix
// enregistré, c'est ce choix qui fait foi (pas de replacement automatique).
const banc = [...places];
const iRetire = banc.findIndex((m) => !!m);
const retire = banc[iRetire];
banc[iRetire] = null;
store.saveSlots(banc);
const apresBanc = store.slotsForTeam(equipe);
const nomRetire: string = retire?.def.name ?? '?';
const souci = apresBanc.filter((m) => !!m).length !== 4 ? 'le banc n’est pas respecté (pas 4 héros en place)'
  : apresBanc.some((m) => m?.def.id === retire?.def.id) ? 'le héros retiré a été replacé de force'
    : '';
if (souci) echec(`${nomRetire} : ${souci}`);
else ok(`un héros retiré reste sur le banc (${nomRetire}) : 4 en place, le choix du joueur fait foi`);

// Champ vide pour la suite : on vérifiera que « Placement auto » replace toute l'équipe.
store.saveSlots([null, null, null, null, null, null]);

/* ===================================================================== */
console.log('\n═══ 2. LE COMBAT S’OUVRE DANS L’INTERFACE DU JEU ═══');
/* ===================================================================== */

// Une équipe de test à un niveau confortable, sur une étape du début de la campagne :
// le combat doit se gagner, pour vérifier le chemin « victoire → récompenses ».
const ids = ['kael', 'lyra', 'aldric', 'seren', 'morwen'];
const team: TeamMember[] = ids
  .map((id) => HEROES.find((h) => h.id === id))
  .filter((d): d is NonNullable<typeof d> => !!d)
  .map((d) => ({ def: d, stars: d.stars, level: 60 }));
if (team.length !== 5) echec(`équipe de test : ${team.length} héros trouvés sur 5`);
const stage = STAGES.find((s) => s.id === '2-3') ?? STAGES[0]!;

const host = dom.document.getElementById('ui')!;
const enregistrements: (TeamMember | null)[][] = [];
let resultat: TourResult | null = null;
let fins = 0;
let quits = 0;

const handle = openTourBattle(host, {
  stage,
  team,
  slots: store.slotsForTeam(team),
  onSaveSlots: (s2) => enregistrements.push(s2.map((m) => m)),
  onFinished: (r) => { resultat = r; fins++; },
  onQuit: () => { quits++; },
});

const ecran = $('.tour');
if (!ecran) echec('aucun écran de combat monté');
else if (!ecran.classList.contains('ingame')) echec('l’écran n’a pas la classe « ingame » (il couvrirait l’écran de résultat du jeu)');
else if (!host.contains(ecran)) echec('l’écran n’est pas monté DANS #ui : l’écran de résultat du jeu passerait dessous');
else ok('l’écran est monté dans #ui, sous l’écran de résultat du jeu');

const titre = $('.tour-title b')?.textContent ?? '';
if (!titre.includes(stage.id)) echec(`le titre n’affiche pas l’étape jouée (« ${titre} »)`);
else ok(`l’étape jouée est affichée : ${titre}`);

for (const [sel, nom] of [['[data-stage]', 'sélecteur d’étape'], ['[data-level]', 'réglage de niveau'], ['[data-ref]', '« Équipe de départ »'], ['[data-back]', '« Retour au jeu »']] as const) {
  if ($(sel)) echec(`${nom} encore présent dans le jeu (réservé au laboratoire)`);
}
if (!$('[data-quit]')) echec('pas de bouton « Quitter » pour rendre la main au jeu');
else ok('ni sélecteur d’étape ni niveau réglable ; « Quitter » rend la main au jeu');

const ligneDe = (i: number): string => (i < 2 ? 'front' : i < 4 ? 'mid' : 'back');
if ($$('.tour-side.heroes .tcard:not(.empty)').length !== 0) echec('le champ n’est pas vide alors qu’aucun emplacement n’est enregistré');
else ok('le champ s’ouvre sur les 6 emplacements, vides si rien n’est enregistré');

// « Placement auto » replace TOUTE l'équipe (5 héros), pas seulement ceux déjà posés.
click($('[data-place]'));
const placeAuto = enregistrements[enregistrements.length - 1] ?? [];
const poses = placeAuto.filter((m) => !!m);
if (poses.length !== 5) echec(`« Placement auto » ne place que ${poses.length} héros sur 5`);
else ok('« Placement auto » replace toute l’équipe : 5 héros sur 6 emplacements');

const horsLigne = placeAuto.filter((m, i) => {
  if (!m) return false;
  const r = m.def.role;
  const veut = r === 'Tank' || r === 'Guerrier' ? 'front' : r === 'Mage' || r === 'Soutien' ? 'mid' : 'back';
  return ligneDe(i) !== veut;
});
if (horsLigne.length) echec(`placement auto hors rôle : ${horsLigne.map((m) => m!.def.role + ' en ' + ligneDe(placeAuto.indexOf(m!))).join(', ')}`);
else ok(`chacun chez soi : ${ROW_LABEL.front} pour le Tank, ${ROW_LABEL.mid} pour le Mage et le Soutien, ${ROW_LABEL.back} pour le Tireur et l’Assassin`);
if (placeAuto.filter((m) => !m).length !== 1) echec(`${placeAuto.filter((m) => !m).length} emplacements libres après placement auto, attendu 1`);
else ok('il reste exactement un emplacement libre (5 héros pour 6 places)');

const cartes = $$('.tour-side.heroes .tcard');
const vides = $$('.tour-side.heroes .tcard.empty');
if (cartes.length !== 6) echec(`${cartes.length} emplacements côté héros, attendu 6`);
else ok(`6 emplacements côté héros, dont ${vides.length} libre`);
if (cartes.length - vides.length !== 5) echec(`${cartes.length - vides.length} héros posés, attendu 5`);
else ok('5 héros posés à l’écran : toute l’équipe du joueur est là');

const niveaux = $$('.tour-side.heroes .tlvl').map((e) => Number(e.textContent));
if (niveaux.length !== 5 || niveaux.some((n) => n !== 60)) echec(`niveaux affichés : ${niveaux.join(', ')} (attendu 60 partout)`);
else ok('les héros gardent leur vrai niveau (60), pas le niveau conseillé de l’étape');

const ennemis = $$('.tour-side.foes .tcard:not(.empty)');
if (ennemis.length !== stage.enemies.length) echec(`${ennemis.length} ennemis affichés pour ${stage.enemies.length} dans l’étape`);
else ok(`${ennemis.length} ennemis de l’étape ${stage.id} sont en face`);

// Le choix de héros ne propose QUE l'équipe du joueur (5 héros), pas les 27.
click($$('.tour-side.heroes .tcard:not(.empty)')[0]);
const fiches = $$('.picker .pcard');
if (fiches.length !== 5) echec(`le choix propose ${fiches.length} fiches, attendu les 5 héros de l’équipe`);
else ok('le choix ne propose que les 5 héros de l’équipe');
if (!$('.picker [data-vide]')) echec('pas de bouton « Laisser vide » dans le choix');
else ok('« Laisser vide » permet de décider quel emplacement reste libre');
click($('.picker [data-close]'));

// Cliquer un héros déjà placé l'échange avec celui de l'emplacement visé.
click($$('.tour-side.heroes .tcard:not(.empty)')[0]);
const avant = $$('.tour-side.heroes .tcard:not(.empty)').length;
const dejaPlacee = $$('.picker .pcard.taken')[0];
// Un même nom utilisé deux fois dans une instruction casse la transformation de
// vite-node : on passe par des variables intermédiaires.
const nomDeplace: string = dejaPlacee?.querySelector('b')?.textContent ?? '?';
click(dejaPlacee);
const apres = $$('.tour-side.heroes .tcard:not(.empty)').length;
const encoreLa = $$('.tour-side.heroes .tname').some((e) => (e.textContent ?? '').includes(nomDeplace));
const souciEchange = !dejaPlacee ? 'aucun héros déjà placé à échanger'
  : apres !== avant ? 'l’échange change le nombre de héros en place'
    : !encoreLa ? 'le héros échangé a disparu du champ'
      : '';
if (souciEchange) echec(`${nomDeplace} : ${souciEchange}`);
else ok('cliquer un héros déjà placé l’échange de place, personne ne disparaît');
if ($$('.tour-side.heroes .tcard:not(.empty)').length !== 5) echec('l’échange a laissé un autre nombre de héros que 5');
else ok('5 héros en place après l’échange, et toujours un emplacement libre');
if (enregistrements.length < 2) echec(`le placement n’est enregistré qu’à ${enregistrements.length} reprise(s)`);
else ok(`le placement est enregistré à chaque changement (${enregistrements.length} fois)`);

/* ===================================================================== */
console.log('\n═══ 3. LE COMBAT SE JOUE ET REND LE RÉSULTAT AU JEU ═══');
/* ===================================================================== */

click($('[data-speed]'));   // ×2
click($('[data-speed]'));   // ×4
click($('[data-auto]'));    // AUTO : le test joue comme un joueur pressé
click($('[data-start]'));
if (!$('.tour-side.foes .tcard')) echec('le combat ne démarre pas');

const t0 = Date.now();
while (!resultat && Date.now() - t0 < 180_000) await sleep(250);

if (!resultat) {
  echec('le combat n’a jamais rendu son résultat au jeu (180 s)');
} else {
  const r = resultat;
  if (fins !== 1) echec(`le résultat a été rendu ${fins} fois, attendu 1`);
  else ok('le résultat est rendu une seule fois au jeu');

  if (r.winner !== 'hero' && r.winner !== 'enemy') echec(`winner = ${String(r.winner)} (attendu « hero » ou « enemy »)`);
  const champs = ['winner', 'stars', 'time', 'stats'] as const;
  const manque = champs.filter((c) => !(c in (r as unknown as Any)));
  if (manque.length) echec(`le résultat n’a pas la forme du combat temps réel : manque ${manque.join(', ')}`);
  else ok('le résultat a la même forme que celui du combat en temps réel (winner / stars / time / stats)');

  if (r.winner !== 'hero') echec(`défaite en ${stage.id} avec 5 héros niveau 60 (niveau conseillé ${stage.level})`);
  else ok(`victoire en ${stage.id} — ${r.stars} étoile${r.stars > 1 ? 's' : ''} · ${Math.round(r.time)} s · ${r.stats.length} fiches de héros`);

  if (!Number.isFinite(r.time) || r.time < 0) echec(`durée invalide : ${r.time}`);
  const morts = r.stats.filter((s) => !s.alive).length;
  const attendu = r.winner !== 'hero' ? 0 : morts === 0 ? 3 : morts <= 2 ? 2 : 1;
  if (r.stars !== attendu) echec(`${r.stars} étoiles pour ${morts} mort(s), la règle du jeu en donne ${attendu}`);
  else ok(`les étoiles suivent la règle du jeu (${morts} héros tombé${morts > 1 ? 's' : ''} → ${r.stars} ★)`);

  const horsEquipe = r.stats.filter((s) => !team.some((m) => m.def.id === s.id));
  if (horsEquipe.length) echec(`fiches inconnues dans le résultat : ${horsEquipe.map((s) => s.id).join(', ')}`);
  else ok('chaque fiche du résultat est un héros de l’équipe engagée (l’écran de victoire les retrouve)');

  const negatifs = r.stats.filter((s) => !Number.isFinite(s.dealt) || s.dealt < 0 || !Number.isFinite(s.healed) || s.healed < 0);
  if (negatifs.length) echec(`${negatifs.length} fiches avec des compteurs invalides`);
  else ok(`compteurs valides · ${r.stats.reduce((a, s) => a + s.dealt, 0).toLocaleString('fr-FR')} dégâts et ${r.stats.reduce((a, s) => a + s.healed, 0).toLocaleString('fr-FR')} soins au total`);

  // L'écran reste monté : c'est ce qui permet à l'écran de résultat de s'afficher
  // PAR-DESSUS le champ de bataille figé, comme dans le combat en temps réel.
  if (!$('.tour')) echec('l’écran a disparu avant l’affichage du résultat du jeu');
  else ok('l’écran reste en place derrière le résultat (le jeu affiche son écran par-dessus)');
  const journal = $$('.tour-log p').length;
  if (journal < 10) echec(`journal de combat presque vide (${journal} lignes)`);
  else ok(`journal de combat : ${journal} lignes`);
}

/* ===================================================================== */
console.log('\n═══ 4. QUITTER ET REVENIR AU JEU ═══');
/* ===================================================================== */

click($('[data-quit]'));
if (quits !== 1) echec(`« Quitter » a prévenu le jeu ${quits} fois, attendu 1`);
else ok('« Quitter » rend la main au jeu');

handle.close();
if ($('.tour')) echec('l’écran n’est pas démonté après la fermeture');
else ok('l’écran se démonte : #ui redevient libre pour le hub');

// Un deuxième combat (bouton « Rejouer » du jeu) doit remonter proprement.
const suivant = openTourBattle(host, {
  stage,
  team,
  slots: store.slotsForTeam(team),
  onSaveSlots: () => undefined,
  onFinished: () => undefined,
  onQuit: () => undefined,
});
if ($$('.tour').length !== 1) echec(`${$$('.tour').length} écrans montés après « Rejouer », attendu 1`);
else ok('« Rejouer » remonte un écran unique, sans empiler les combats');
suivant.close();

console.log('\n════════════════════════════════════════════════');
if (erreurs > 0) {
  console.log(`❌ COMBAT INTÉGRÉ : ${erreurs} PROBLÈME${erreurs > 1 ? 'S' : ''}`);
  console.log('════════════════════════════════════════════════\n');
  process.exit(1);
}
console.log('✅ COMBAT TOUR PAR TOUR INTÉGRÉ AU JEU : AUCUN BUG DÉTECTÉ');
console.log('════════════════════════════════════════════════\n');
