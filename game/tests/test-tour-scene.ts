/**
 * TEST DU COMBAT TOUR PAR TOUR **DANS LA SCÈNE DU JEU** (v2.6).
 *
 * Depuis la correction du joueur, le combat tour par tour ne s'ouvre plus dans un écran
 * DOM à part : il se joue dans la vraie scène de bataille (terrain, sprites, barres de
 * vie, cinématiques) avec, en bas, la barre de capacités rondes. Ici on vérifie, sans
 * WebGL :
 *
 *   • `TurnBridge` traduit le moteur tour par tour en unités que la scène sait dessiner ;
 *   • `TurnController` joue un combat complet (choix de capacité + cible au clic, puis
 *     mode AUTO) jusqu'au gagnant ;
 *   • `BattleHud.showTurn/setTurn` affiche la barre du bas et émet `tskill/tburn/…` ;
 *   • l'écran de placement propose bien 6 cases pour 5 héros, avec échange et case vide.
 *
 * Usage : npx vite-node tests/test-tour-scene.ts
 */
import { parseHTML } from 'linkedom';
import type { TeamMember } from '../src/data/heroes';

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

function key(k: string): void {
  const Ctor = (dom.window as unknown as { Event: new (t: string, o?: unknown) => Event }).Event;
  const e = new Ctor('keydown', { bubbles: true, cancelable: true }) as Event & { key: string };
  e.key = k;
  dom.window.dispatchEvent(e);
}

let erreurs = 0;
const echec = (m: string): void => { erreurs++; console.log(`   ❌ ${m}`); };
const ok = (m: string): void => console.log(`   ✅ ${m}`);
const check = (cond: boolean, m: string): void => (cond ? ok(m) : echec(m));

const $ = (sel: string): Element | null => dom.document.querySelector(sel);
const $$ = (sel: string): Element[] => Array.from(dom.document.querySelectorAll(sel));

const { store } = await import('../src/state/store');
const { HEROES, STAGES } = await import('../src/data/heroes');
const { buildBattle, autoFormation } = await import('../src/turn/formation');
const { TurnBridge } = await import('../src/turn/bridge');
const { TurnController } = await import('../src/turn/controller');
const { BattleHud } = await import('../src/ui/BattleHud');
const { openPlacement } = await import('../src/ui/placement');
const { PORTRAITS } = await import('../src/assets');
import type { TurnBarState } from '../src/ui/BattleHud';
import type { TurnUi } from '../src/turn/controller';

store.load();
store.devGiveAll();

/* Une équipe de 5 héros à un niveau confortable, comme dans le vrai jeu. */
const ids = ['kael', 'lyra', 'aldric', 'seren', 'morwen'];
const team: TeamMember[] = ids
  .map((id) => HEROES.find((h) => h.id === id))
  .filter((d): d is NonNullable<typeof d> => !!d)
  .map((d) => ({ def: d, stars: d.stars, level: 60 }));
store.setTeam(ids);
check(team.length === 5, 'équipe de 5 héros prête');

const stage = STAGES[0]!;

/* ===================================================================== */
console.log('\n1) TurnBridge — le moteur tour par tour parle à la scène 3D');
/* ===================================================================== */
{
  const engine = buildBattle({ stage, team, placements: autoFormation(team), seed: 7 });
  const bridge = new TurnBridge(engine, stage);
  check(bridge.heroes.length === 5, `5 héros rendus (${bridge.heroes.length})`);
  check(bridge.units.length === 5 + engine.foes.length, `toutes les unités sont sur le terrain (${bridge.units.length})`);
  const u0 = engine.heroes[0]!;
  const v0 = bridge.view(u0.uid);
  check(!!v0 && bridge.view(u0.uid) === v0, 'chaque unité du moteur a son unité rendue, stable dans le temps');
  check(!!v0 && v0.maxHp === u0.maxHp && v0.hp === u0.hp, 'PV du moteur recopiés sur l’unité rendue');
  const aBoss = engine.foes.some((f) => f.isBoss);
  check(aBoss === !!bridge.boss, aBoss ? 'le boss de l’étape est bien là' : 'étape sans boss : rien d’affiché en trop');
  const tu = engine.heroes.find((h) => h.hp < h.maxHp);
  if (tu) { tu.hp -= 10; bridge.sync(tu); const vv = bridge.view(tu.uid); check(!!vv && vv.hp === tu.hp, 'sync() suit les dégâts'); }
  else { engine.foes[0]!.hp -= 10; bridge.sync(engine.foes[0]!); ok('sync() suit les dégâts (cible ennemie)'); }
  bridge.syncAll();
  check(bridge.units.every((u) => u.alive), 'syncAll() : personne ne meurt par accident');
  check(bridge.canUltimate(bridge.heroes[0]!) === false, 'pas d’ultime hors cinématique');
  bridge.cineCaster = bridge.heroes[0]!;
  check(bridge.canUltimate(bridge.heroes[0]!) === true && bridge.ultimate(bridge.heroes[0]!), 'ultime autorisé pendant la cinématique (cineCaster)');
  bridge.cineCaster = null;
  check(bridge.winner === null && bridge.time >= 0, 'état de fin propre avant le combat');
}

/* ===================================================================== */
console.log('\n2) TurnController — combat complet avec clics (capacité + cible)');
/* ===================================================================== */
let engineManuel: ReturnType<typeof buildBattle> | null = null;
{
  const engine = buildBattle({ stage, team, placements: autoFormation(team), seed: 11 });
  engineManuel = engine;
  const bridge = new TurnBridge(engine, stage);
  let states = 0;
  const hints: string[] = [];
  let picked: number[] | null = null;
  const ui: TurnUi = {
    state: () => { states++; },
    hint: (t) => { hints.push(t); },
    pick: (uids) => { picked = uids; },
    waitCine: async () => { /* pas de cinématique en test headless */ },
  };
  const ctl = new TurnController(engine, bridge, ui);
  ctl.speed = 4;
  void ctl.run();

  let clics = 0;
  const t0 = Date.now();
  while (bridge.winner === null && Date.now() - t0 < 60_000) {
    await sleep(15);
    const actor = ctl.acting;
    if (!actor || actor.side !== 'hero' || ctl.auto) continue;
    if (picked && picked.length > 0) { ctl.tapTarget(picked[0]!); picked = null; clics++; continue; }
    for (let i = 0; i < actor.skills.length; i++) {
      if (actor.ready(i)) { ctl.tapSkill(i); clics++; break; }
    }
  }
  check(bridge.winner !== null, `combat terminé, gagnant : ${bridge.winner}`);
  check(clics > 10, `le joueur a cliqué capacités et cibles (${clics} interactions)`);
  check(states > 20, `la barre du bas a été rafraîchie ${states} fois`);
  check(hints.length > 5, `des indices ont été affichés (${hints.length})`);
  check(ctl.turns > 0, `compteur de tours à jour (${ctl.turns})`);
  const morts = engine.heroes.filter((h) => h.hp <= 0).length + engine.foes.filter((f) => f.hp <= 0).length;
  check(morts > 0, `des unités sont tombées (${morts})`);
  check(bridge.units.some((u) => !u.alive), 'les unités rendues voient aussi les morts');
  ctl.cancel();
}

/* ===================================================================== */
console.log('\n3) TurnController — mode AUTO (le jeu joue seul)');
/* ===================================================================== */
{
  const engine = buildBattle({ stage, team, placements: autoFormation(team), seed: 23 });
  const bridge = new TurnBridge(engine, stage);
  const ctl = new TurnController(engine, bridge, {
    state: () => { /* rien */ }, hint: () => { /* rien */ }, pick: () => { /* rien */ }, waitCine: async () => {},
  });
  ctl.speed = 4;
  ctl.auto = true;
  void ctl.run();
  const t0 = Date.now();
  while (bridge.winner === null && Date.now() - t0 < 60_000) await sleep(20);
  check(bridge.winner !== null, `AUTO termine le combat (gagnant : ${bridge.winner}, tour ${ctl.turns})`);
  check(engine.winner === bridge.winner, 'moteur et scène sont d’accord sur le gagnant');
  ctl.cancel();
}

/* ===================================================================== */
console.log('\n4) BattleHud.showTurn — la barre de capacités en bas de l’écran');
/* ===================================================================== */
{
  const engine = engineManuel!;
  const bridge = new TurnBridge(engine, stage);
  const host = $('#ui') as unknown as HTMLElement;
  const hud = new BattleHud(host);
  hud.showTurn(stage, bridge);
  check(hud.turn === true, 'le HUD passe en mode tour par tour');
  check(!!$('.bh-turnbar'), 'la barre du bas (.bh-turnbar) existe');
  check(!!$('.bh-overlay'), 'l’écran de résultat reste disponible (.bh-overlay)');
  check($$('.hcard').length === 5, 'les 5 cartes de héros sont affichées comme avant');
  check(bridge.boss ? !!$('.bh-boss-bar') : !$('.bh-boss-bar'), bridge.boss ? 'la barre de vie du boss est affichée' : 'pas de boss dans cette étape : pas de barre de boss');
  check(($('.bh-timer span')?.textContent ?? '').startsWith('tour'), 'le chrono est remplacé par le compteur de tours');

  const events: string[] = [];
  hud.on('tskill', (i) => events.push(`tskill:${i}`));
  hud.on('tburn', () => events.push('tburn'));
  hud.on('tcancel', () => events.push('tcancel'));
  hud.on('tspeed', (sp) => events.push(`tspeed:${sp}`));
  hud.on('tplace', () => events.push('tplace'));
  hud.on('quit', () => events.push('quit'));

  const snap: TurnBarState = {
    turn: 3,
    actor: { uid: 1, name: team[0]!.def.name, portrait: PORTRAITS[team[0]!.def.id] ?? '', css: '#fff', hp: 900, maxHp: 1200, level: 20, sub: 'niv. 20 · Tank' },
    skills: [
      { name: 'Frappe', icon: 'swords', cd: 0, ready: true, ult: false, heal: false, line: 'coup simple' },
      { name: 'Garde', icon: 'shield', cd: 2, ready: false, ult: false, heal: false, line: 'se protège' },
      { name: 'Soin', icon: 'heart', cd: 0, ready: true, ult: false, heal: true, line: 'soigne' },
      { name: 'ULTIME', icon: 'star', cd: 0, ready: true, ult: true, heal: false, line: 'cinématique' },
    ],
    soul: 4, burn: false, canAct: true, auto: false, speed: 1, placeable: false,
    order: [
      { name: team[0]!.def.name, img: PORTRAITS[team[0]!.def.id] ?? '', css: '#fff', side: 'hero', gauge: 0, boss: false },
      { name: 'Goule', img: '', css: '#c2183c', side: 'enemy', gauge: 62, boss: false },
      { name: team[1]!.def.name, img: PORTRAITS[team[1]!.def.id] ?? '', css: '#fff', side: 'hero', gauge: 30, boss: false },
    ],
  };
  hud.setTurn(snap);
  check($$('.tb-skill').length === 4, '4 capacités rondes affichées');
  check(!!$('.tb-skill.ult'), 'l’ultime a son style propre');
  check($('.tb-cd')?.textContent === '2', 'la recharge s’affiche sur la capacité en attente');
  check($$('.tb-soul i.on').length === 4, '4 âmes allumées sur 9');
  check(($('[data-twho] b')?.textContent ?? '') === team[0]!.def.name, 'le portrait de l’acteur est affiché avec son nom');
  check(($('[data-turn]')?.textContent ?? '').includes('3'), 'le compteur de tours est affiché');
  check($$('.cr-cell').length === 3 && !!$('.cr-cell.now'), 'la barre de tour (façon Epic Seven) affiche l’ordre des acteurs');
  check(!!$('.tb-sb') === false, 'pas de sceau de soulburn quand l’embrasement n’est pas armé');
  hud.setTurn({ ...snap, burn: true });
  check($$('.tb-sb').length >= 1, 'le sceau de soulburn apparaît sur les capacités prêtes quand on embrase');
  hud.setTurn(snap);

  click($('.tb-skill[data-i="2"]'));
  click($('[data-b="tburn"]'));
  click($('[data-b="tspeed"]'));
  click($('[data-b="tplace"]'));
  click($('[data-b="quit"]'));
  key('Escape');
  key('1');
  check(events.includes('tskill:2'), 'clic sur une capacité → tskill:2');
  check(events.includes('tburn'), 'clic sur embraser → tburn');
  check(events.includes('tspeed:2'), 'clic vitesse → tspeed:2');
  check(events.includes('tplace'), 'clic PLACES → tplace');
  check(events.includes('quit'), 'clic quitter → quit');
  check(events.includes('tcancel'), 'Échap → tcancel');
  check(events.includes('tskill:0'), 'touche 1 → tskill:0');

  hud.setTurnHint('Choisis une cible.');
  check(($('[data-thint]')?.textContent ?? '').includes('cible'), 'l’indice du bas est mis à jour');
  hud.setTurn({ ...snap, canAct: false, actor: null });
  check(!!$('.tb-wait'), 'quand personne n’agit, la barre attend');
  hud.hide();
  check(hud.turn === false, 'hide() quitte le mode tour par tour');
}

/* ===================================================================== */
console.log('\n5) Écran de placement — 6 cases pour 5 héros');
/* ===================================================================== */
{
  const host = $('#ui') as unknown as HTMLElement;
  const initial = store.slotsForTeam(team);
  let recu: (TeamMember | null)[] | null = null;
  const h = openPlacement(host, team, initial, (slots) => { recu = slots; });
  check($$('.plc-slot').length === 6, '6 emplacements affichés');
  check(store.slotsEdited ? $$('.plc-slot.free').length === 1 : $$('.plc-slot.free').length === 1, 'une case reste vide pour 5 héros');
  click($('[data-auto]'));
  check($$('.plc-slot.free').length === 1, 'placement auto : toujours 5 héros placés, 1 case vide');
  const noms = $$('.plc-slot b').map((el) => el.textContent);
  check(noms.filter((n) => n && n !== 'Libre').length === 5, `les 5 noms sont sur le terrain (${noms.join(', ')})`);
  click($$('.plc-slot')[0]);
  const picks = $$('.plc-pick');
  check(picks.length === 5, 'la liste propose les 5 héros de l’équipe');
  click(picks[2]);
  const apres = $$('.plc-slot b')[0]?.textContent;
  check(apres === team[2]!.def.name, 'le héros choisi occupe la case (échange si elle était prise)');
  const iOccupe = $$('.plc-slot').findIndex((el) => !(el.textContent ?? '').includes('Libre'));
  click($$('.plc-slot')[iOccupe]);
  click($('.plc-list [data-free]'));
  check(($$('.plc-slot')[iOccupe]!.textContent ?? '').includes('Libre'), 'on peut libérer une case (héros mis sur le banc)');
  click($('[data-go]'));
  check(recu !== null && recu!.length === 6, '« Commencer » rend bien les 6 cases');
  const places = (recu ?? []).filter((m) => !!m).length;
  check(places === 4, `le joueur part au combat avec ${places} héros (2 cases vides acceptées)`);
  h.close();
  check(!$('.plc'), 'close() démonte le calque');
}

/* ===================================================================== */
console.log(`\n${erreurs === 0 ? '✅ TOUS LES TESTS PASSENT' : `❌ ${erreurs} ÉCHEC(S)`}`);
process.exit(erreurs === 0 ? 0 : 1);
