/**
 * COMBAT TOUR PAR TOUR — interface jouable (`?tour`).
 *
 * C'est la proposition complète : plus personne ne frappe en même temps.
 *
 *   • PRÉPARATION — tu poses tes héros sur les 6 emplacements (2 DEVANT, 2 MILIEU,
 *     2 DERRIÈRE). La ligne choisie change les chiffres et ce que l'ennemi peut toucher.
 *   • COMBAT — une jauge d'initiative par unité (la VITESSE décide qui joue). Quand c'est
 *     à ton héros, tu choisis une de ses 3 capacités ou son ultime, puis sa cible.
 *     Chaque capacité a une recharge en TOURS, affichée sur le bouton.
 *   • ÂMES — chaque capacité en produit ; 3 âmes permettent d'embraser un coup (×1,5).
 *
 * Tout vient du moteur `src/turn/engine.ts`, qui ne connaît pas le DOM : cette interface
 * ne fait que jouer la liste d'événements qu'il renvoie.
 */
import { ART, PORTRAITS } from '../assets';
import { HEROES, REFERENCE_TEAM, STAGES, type StageDef, type TeamMember } from '../data/heroes';
import { store } from '../state/store';
import { TurnBattle, type TUnit } from '../turn/engine';
import { MAX_TEAM, ROW_SLOTS, autoFormation, buildBattle } from '../turn/formation';
import type { BattleEvent, Row, StatusId, TargetRule, TurnSkill } from '../turn/types';
import { ROW_BONUS, ROW_LABEL, SOUL_BURN_COST, SOUL_MAX } from '../turn/types';
import { icon } from './icons';
import { audio } from '../audio/AudioEngine';
import { getUltStyle, ultDataOf, ultDuration, ultHTML } from './ultimate';
import { EPIC_MS, playEpic, specOf } from './ultimate-epic';
import { getUltMode } from './lab';
import './tour.css';
import './ultimate.css';
import './ultimate-epic.css';

/* ===================================================================== */
/*  Petits outils d'affichage                                             */
/* ===================================================================== */

/**
 * Retour au jeu : on recharge la même adresse, sans le paramètre `?tour`.
 * Le garde-fou `typeof location` ne sert qu'aux tests hors navigateur.
 */
function retourAuJeu(): void {
  if (typeof location === 'undefined') return;
  location.href = location.pathname;
}

const wait = (ms: number): Promise<void> => new Promise((r) => setTimeout(r, Math.max(0, ms)));
const nf = new Intl.NumberFormat('fr-FR');
const num = (n: number): string => nf.format(Math.round(n));

/** Les 6 emplacements, dans l'ordre de lecture : devant, puis milieu, puis derrière. */
const SLOT_ORDER: { row: Row; slot: number }[] = [
  { row: 'front', slot: 0 }, { row: 'front', slot: 1 },
  { row: 'mid', slot: 0 }, { row: 'mid', slot: 1 },
  { row: 'back', slot: 0 }, { row: 'back', slot: 1 },
];

const TARGET_LABEL: Record<TargetRule, string> = {
  enemyFront: 'un ennemi de la ligne avant',
  enemyFrontRow: 'toute la ligne avant ennemie',
  enemyAny: 'un ennemi au choix (perce la ligne)',
  enemyAll: 'tous les ennemis',
  allyAny: 'un allié au choix',
  allyLowest: "l'allié le plus blessé",
  allAllies: 'toute ton équipe',
  self: 'toi-même',
};

const KIND_LABEL: Record<string, string> = {
  phys: 'physique', magic: 'magique', true: 'pur', heal: 'soin', support: 'soutien',
};

const STATUS_UI: Record<StatusId, { label: string; cls: 'good' | 'bad' }> = {
  stun: { label: 'Étourdi', cls: 'bad' },
  freeze: { label: 'Gelé', cls: 'bad' },
  poison: { label: 'Poison', cls: 'bad' },
  burn: { label: 'Brûlure', cls: 'bad' },
  bleed: { label: 'Saignement', cls: 'bad' },
  hot: { label: 'Régénération', cls: 'good' },
  shield: { label: 'Bouclier', cls: 'good' },
  taunt: { label: 'Provoqué', cls: 'bad' },
  guard: { label: 'Garde', cls: 'good' },
  atkUp: { label: 'ATQ +', cls: 'good' },
  atkDown: { label: 'ATQ −', cls: 'bad' },
  defUp: { label: 'DÉF +', cls: 'good' },
  defDown: { label: 'DÉF −', cls: 'bad' },
  haste: { label: 'Hâte', cls: 'good' },
  slow: { label: 'Lenteur', cls: 'bad' },
  counter: { label: 'Riposte', cls: 'good' },
  invuln: { label: 'Invulnérable', cls: 'good' },
  stealth: { label: 'Discret', cls: 'good' },
};

/** Une ligne de description courte pour un bouton de capacité. */
function skillLine(s: TurnSkill): string {
  const parts: string[] = [TARGET_LABEL[s.target]];
  if (s.mult > 0) parts.push(s.kind === 'heal' ? `soin ×${s.mult.toFixed(1)}` : `×${s.mult.toFixed(1)} ${KIND_LABEL[s.kind] ?? ''}`);
  if (s.hits > 1) parts.push(`${s.hits} frappes`);
  if (s.pierce) parts.push(`ignore ${Math.round(s.pierce * 100)} % d'armure`);
  const label = (e: { id: StatusId; chance?: number }): string => {
    const l = STATUS_UI[e.id]?.label ?? e.id;
    return e.chance !== undefined && e.chance < 1 ? `${l} ${Math.round(e.chance * 100)} %` : l;
  };
  const fx = s.effects.filter((e) => !e.self).map(label);
  const soi = s.effects.filter((e) => e.self).map((e) => `${label(e)} (toi)`);
  const equipe = (s.team ?? []).map((e) => `${label(e)} (équipe)`);
  const tout = [...fx, ...soi, ...equipe];
  if (tout.length > 0) parts.push(tout.slice(0, 3).join(', '));
  return parts.filter(Boolean).join(' · ');
}

function portraitOf(u: TUnit): string {
  return (u.hero && PORTRAITS[u.hero.id]) || ART[u.def.texture] || '';
}

/* ===================================================================== */
/*  État de l'écran                                                       */
/* ===================================================================== */

type Phase = 'setup' | 'play' | 'over';

/**
 * Ce que le jeu doit fournir pour un combat intégré (même forme que le résultat du
 * combat en temps réel, pour que l'écran de victoire et les récompenses soient les mêmes).
 */
export interface TourResult {
  winner: 'hero' | 'enemy';
  stars: number;
  time: number;
  stats: Array<{ id: string; name: string; dealt: number; healed: number; taken: number; alive: boolean }>;
}

export interface TourGameConfig {
  /** Le niveau joué (campagne ou Tour infinie). */
  stage: StageDef;
  /** L'équipe du joueur : 5 héros. */
  team: TeamMember[];
  /** Les 6 emplacements, déjà remplis d'après la sauvegarde. */
  slots: (TeamMember | null)[];
  /** Appelée dès que le joueur déplace un héros. */
  onSaveSlots(slots: (TeamMember | null)[]): void;
  /** Appelée à la fin du combat : récompenses et écran de résultat du jeu. */
  onFinished(result: TourResult): void;
  /** Appelée par « Quitter ». */
  onQuit(): void;
}

export interface TourHandle { close(): void; }

let root!: HTMLElement;
let phase: Phase = 'setup';
let stage: StageDef = STAGES.find((s) => s.id === '3-5') ?? STAGES[0]!;
let niveau = stage.level;
let slots: (TeamMember | null)[] = Array.from({ length: MAX_TEAM }, () => null);
let battle: TurnBattle | null = null;
let actor: TUnit | null = null;
let pickedSkill: number | null = null;
let burn = false;
let auto = false;
let speed = 1;
let runs = 0;
/** Config du combat intégré au jeu ; `null` = laboratoire `?tour`. */
let cfg: TourGameConfig | null = null;
/** Instant de départ du combat, pour la durée affichée à la fin. */
let startMs = 0;
/** Chaque reconstruction incrémente l'époque : les boucles en cours s'arrêtent. */
let epoch = 0;
const cards = new Map<number, HTMLElement>();

/* ===================================================================== */
/*  Montage                                                               */
/* ===================================================================== */

/**
 * Le laboratoire (`?tour`) : tout est réglable — étape, niveau, et les 27 héros.
 * Rien n'est enregistré dans la sauvegarde.
 */
export function mountTour(): void {
  cfg = null;
  document.getElementById('loader')?.remove();
  const game = document.getElementById('game');
  if (game) game.style.display = 'none';
  const ui = document.getElementById('ui');
  if (ui) ui.innerHTML = '';
  mountScreen(document.body, false);
  buildStageSelect();
  loadSavedTeam();
  rebuild();
}

/**
 * Le combat du jeu : l'étape et l'équipe sont imposées, les héros gardent leur vrai
 * niveau, et le placement des 5 héros sur les 6 emplacements est enregistré.
 * L'écran est monté DANS `#ui` pour rester sous l'écran de résultat du jeu.
 */
export function openTourBattle(host: HTMLElement, config: TourGameConfig): TourHandle {
  cfg = config;
  stage = config.stage;
  niveau = stage.level;
  slots = config.slots.slice(0, MAX_TEAM);
  while (slots.length < MAX_TEAM) slots.push(null);
  auto = false;
  burn = false;
  pickedSkill = null;
  mountScreen(host, true);
  rebuild();
  return {
    close(): void {
      epoch++;
      cfg = null;
      root?.remove();
      window.removeEventListener('keydown', onKey);
    },
  };
}

/** Construit l'écran (barre du haut différente en laboratoire et dans le jeu). */
function mountScreen(host: HTMLElement, ingame: boolean): void {
  epoch++;
  cards.clear();
  actor = null;
  phase = 'setup';
  root?.remove();
  window.removeEventListener('keydown', onKey);

  root = document.createElement('div');
  root.className = `tour${ingame ? ' ingame' : ''}`;
  root.innerHTML = `
    <header class="tour-top">
      <div class="tour-title">
        <b>${ingame ? `${stage.id} — ${stage.name}` : 'Combat tour par tour'}</b>
        <small>${ingame
          ? 'Une seule unité agit à la fois. 3 capacités + 1 ultime par héros, recharges en tours, 6 emplacements pour tes 5 héros.'
          : '3 capacités + 1 ultime par héros, recharges en tours, 6 emplacements : 2 devant, 2 au milieu, 2 derrière.'}</small>
      </div>
      ${ingame ? '' : `<label class="tour-pick">Étape
        <select data-stage></select>
      </label>
      <label class="tour-pick">Niv. héros
        <input type="number" min="1" max="400" data-level style="width:4.4rem;padding:.28rem .4rem;border:1px solid var(--t-line);border-radius:8px;background:#150f22;color:var(--t-text);font:inherit">
      </label>`}
      <button class="tbtn ghost" data-auto>Auto : non</button>
      <button class="tbtn ghost" data-speed>Vitesse ×1</button>
      <button class="tbtn ghost" data-place>Placement auto</button>
      ${ingame ? '' : '<button class="tbtn ghost" data-ref>Équipe de départ</button>'}
      <button class="tbtn ghost" data-rules>Règles</button>
      <button class="tbtn go" data-start>Lancer le combat</button>
      ${ingame ? '<button class="tbtn ghost" data-quit>Quitter</button>' : '<button class="tbtn ghost" data-back>Retour au jeu</button>'}
    </header>

    <div class="tour-order"><span>Ordre</span></div>

    <main class="tour-field">
      <section class="tour-side heroes" data-side="hero"></section>
      <div class="tour-center">
        <div class="tsoul" data-soul-hero>${soulHTML('Tes âmes')}</div>
        <div class="tour-hint" data-hint></div>
        <div class="tour-log" data-log></div>
        <div class="tsoul" data-soul-foe>${soulHTML('Âmes ennemies')}</div>
      </div>
      <section class="tour-side foes" data-side="enemy"></section>
    </main>

    <footer class="tour-bar" data-bar></footer>
  `;
  host.appendChild(root);
  bindTop();
  window.addEventListener('keydown', onKey);
}

function soulHTML(label: string): string {
  return `<b>${label}</b><span class="gems">${'<i class="gem"></i>'.repeat(SOUL_MAX)}</span><small>0 / ${SOUL_MAX}</small>`;
}

function buildStageSelect(): void {
  const sel = root.querySelector<HTMLSelectElement>('[data-stage]');
  const lvl = root.querySelector<HTMLInputElement>('[data-level]');
  if (!sel || !lvl) return; // en mode jeu, l'étape et le niveau ne se choisissent pas
  const byChapter = new Map<string, StageDef[]>();
  for (const s of STAGES) {
    const ch = s.id.split('-')[0]!;
    const list = byChapter.get(ch) ?? [];
    list.push(s);
    byChapter.set(ch, list);
  }
  let html = '';
  for (const [ch, list] of byChapter) {
    html += `<optgroup label="Chapitre ${ch}">`;
    for (const s of list) html += `<option value="${s.id}" ${s.id === stage.id ? 'selected' : ''}>${s.id} — ${s.name}${s.enemies.some((e) => e.boss) ? ' (boss)' : ''}</option>`;
    html += '</optgroup>';
  }
  sel.innerHTML = html;
  lvl.value = String(niveau);
}

function bindTop(): void {
  const on = (sel: string, ev: string, fn: (e: Event) => void): void => {
    root.querySelector(sel)?.addEventListener(ev, fn);
  };

  on('[data-stage]', 'change', (e) => {
    const found = STAGES.find((s2) => s2.id === (e.target as HTMLSelectElement).value);
    if (!found) return;
    stage = found;
    niveau = found.level;
    const lvl = root.querySelector<HTMLInputElement>('[data-level]');
    if (lvl) lvl.value = String(niveau);
    rebuild();
  });
  on('[data-level]', 'change', (e) => {
    const input = e.target as HTMLInputElement;
    const v = Number(input.value);
    niveau = isFinite(v) && v > 0 ? Math.min(400, Math.max(1, Math.round(v))) : stage.level;
    input.value = String(niveau);
    rebuild();
  });
  on('[data-auto]', 'click', (e) => {
    auto = !auto;
    (e.currentTarget as HTMLButtonElement).textContent = `Auto : ${auto ? 'oui' : 'non'}`;
    if (auto && phase === 'play' && actor?.side === 'hero') void heroAutoTurn();
  });
  on('[data-speed]', 'click', (e) => {
    speed = speed === 1 ? 2 : speed === 2 ? 4 : 1;
    (e.currentTarget as HTMLButtonElement).textContent = `Vitesse ×${speed}`;
  });
  on('[data-place]', 'click', () => {
    // Dans le jeu, « Placement auto » replace TOUTE l'équipe : c'est le raccourci quand
    // un héros vient d'y entrer et n'a pas encore d'emplacement.
    const chosen = cfg ? cfg.team.slice() : slots.filter((m): m is TeamMember => !!m);
    if (chosen.length === 0) { hint('Choisis d’abord des héros.'); return; }
    const placed = autoFormation(chosen);
    slots = Array.from({ length: MAX_TEAM }, () => null);
    placed.forEach((p, i) => {
      const idx = SLOT_ORDER.findIndex((s2) => s2.row === p.row && s2.slot === p.slot);
      if (idx >= 0) slots[idx] = chosen[i] ?? null;
    });
    persistSlots();
    rebuild();
    hint('Placement automatique : les tanks devant, les mages au milieu, les tireurs derrière. Tu peux tout déplacer.');
  });
  on('[data-ref]', 'click', () => {
    const members = startingMembers();
    const placed = autoFormation(members);
    slots = Array.from({ length: MAX_TEAM }, () => null);
    placed.forEach((p, i) => {
      const idx = SLOT_ORDER.findIndex((s2) => s2.row === p.row && s2.slot === p.slot);
      if (idx >= 0) slots[idx] = members[i] ?? null;
    });
    niveau = stage.level;
    const lvl = root.querySelector<HTMLInputElement>('[data-level]');
    if (lvl) lvl.value = String(niveau);
    rebuild();
  });
  on('[data-start]', 'click', () => {
    if (phase === 'play') return;
    if (slots.every((m) => !m)) { hint('Pose au moins un héros sur le champ de bataille.'); return; }
    startBattle();
  });
  on('[data-rules]', 'click', () => showRules());
  on('[data-back]', 'click', () => retourAuJeu());
  on('[data-quit]', 'click', () => cfg?.onQuit());
}

/** Enregistre le placement dans la sauvegarde (uniquement dans le jeu, pas au laboratoire). */
function persistSlots(): void {
  if (cfg) cfg.onSaveSlots(slots.slice());
}

/**
 * L'équipe enregistrée du joueur (niveaux, étoiles, équipement, étoiles rouges), lue
 * par le vrai `store`. En cas de sauvegarde absente ou illisible, on retombe sur
 * l'équipe de départ : le prototype reste utilisable dans une fenêtre privée.
 */
function savedTeam(): TeamMember[] {
  try { return store.team(); } catch { return []; }
}

/** Les membres à placer au chargement : la sauvegarde, sinon l'équipe de départ. */
function startingMembers(): TeamMember[] {
  const saved = savedTeam();
  return saved.length > 0 ? saved.slice(0, MAX_TEAM) : REFERENCE_TEAM.map((def) => ({ def, stars: def.stars, level: def.stars }));
}

function loadSavedTeam(): void {
  const members = startingMembers();
  const placed = autoFormation(members);
  placed.forEach((p, i) => {
    const idx = SLOT_ORDER.findIndex((s) => s.row === p.row && s.slot === p.slot);
    if (idx >= 0) slots[idx] = members[i] ?? null;
  });
}

/* ===================================================================== */
/*  Construction du combat                                                */
/* ===================================================================== */

function teamOf(): { team: TeamMember[]; placements: { row: Row; slot: number }[] } {
  const team: TeamMember[] = [];
  const placements: { row: Row; slot: number }[] = [];
  slots.forEach((m, i) => {
    if (!m) return;
    // Dans le jeu, chaque héros garde son vrai niveau (et son équipement, ses étoiles,
    // sa forge). Au laboratoire, le niveau est réglable pour tester la difficulté.
    team.push(cfg ? { ...m } : { ...m, level: niveau });
    placements.push(SLOT_ORDER[i]!);
  });
  return { team, placements };
}

/** (Re)construit le combat avec l'équipe, le niveau et le niveau de campagne actuels. */
function rebuild(): void {
  epoch++;
  phase = 'setup';
  actor = null;
  pickedSkill = null;
  burn = false;
  cards.clear();
  const { team, placements } = teamOf();
  runs++;
  battle = buildBattle({ stage, team, placements, seed: 4242 + stage.tier * 977 + niveau * 31 + runs * 13 });
  root.querySelector('[data-log]')!.innerHTML = '';
  root.querySelector('.tbanner')?.remove();
  root.querySelector('.tultname')?.remove();
  renderField();
  renderBar();
  renderOrder();
  syncAll();
  logLine('', `${stage.id} — ${stage.name} · ${stage.enemies.length} ennemis · niveau conseillé ${stage.level} (ici ${niveau}).`);
  const total = cfg ? cfg.team.length : MAX_TEAM;
  const banc = total - team.length;
  hint(team.length === 0
    ? (cfg
      ? `Aucun héros en place. Clique sur un emplacement pour choisir, ou sur « Placement auto » pour placer tes ${total} héros selon leur rôle.`
      : 'Pose tes héros sur les six emplacements, puis lance le combat.')
    : banc > 0
      ? `${team.length} de tes ${total} héros sont en place, ${banc} reste${banc > 1 ? 'nt' : ''} sur le banc. Tu peux lancer le combat ainsi, ajouter un héros sur un emplacement libre, ou tout replacer avec « Placement auto ».`
      : `${team.length} héros en place sur ${MAX_TEAM} emplacements. Clique sur un emplacement pour changer de héros, ou lance le combat.`);
}

function startBattle(): void {
  epoch++;
  startMs = Date.now();
  phase = 'play';
  actor = null;
  pickedSkill = null;
  cards.clear();
  const { team, placements } = teamOf();
  battle = buildBattle({ stage, team, placements, seed: 4242 + stage.tier * 977 + niveau * 31 + runs * 13 });
  root.querySelector('[data-log]')!.innerHTML = '';
  renderField();
  renderBar();
  syncAll();
  logLine('turn', `Combat lancé — ${team.length} héros contre ${battle!.foes.length} ennemis.`);
  hint('C’est à l’initiative de décider qui joue en premier : la VITESSE remplit la jauge violette.');
  void nextTurn(epoch);
}

/* ===================================================================== */
/*  Rendu du champ                                                        */
/* ===================================================================== */

function renderField(): void {
  if (!battle) return;
  for (const side of ['hero', 'enemy'] as const) {
    const host = root.querySelector<HTMLElement>(`[data-side="${side}"]`)!;
    host.innerHTML = '';
    // Les héros se lisent de gauche (derrière) à droite (devant) ; les ennemis en miroir.
    const rows: Row[] = side === 'hero' ? ['back', 'mid', 'front'] : ['front', 'mid', 'back'];
    for (const row of rows) {
      const col = document.createElement('div');
      col.className = 'tour-col';
      const b = ROW_BONUS[row];
      col.innerHTML = `<h4>${ROW_LABEL[row]}<em>${b.text}</em></h4>`;
      for (let slot = 0; slot < ROW_SLOTS; slot++) {
        const u = battle.units.find((x) => x.side === side && x.row === row && x.slot === slot);
        if (u) col.appendChild(makeCard(u));
        else col.appendChild(makeEmpty(row, slot));
      }
      host.appendChild(col);
    }
  }
}

function makeEmpty(row: Row, slot: number): HTMLElement {
  const el = document.createElement('div');
  el.className = 'tcard empty';
  el.dataset.empty = `${row}:${slot}`;
  el.innerHTML = `${icon('plus')}<span>${ROW_LABEL[row]} · emplacement ${slot + 1}<br><small>libre</small></span>`;
  el.addEventListener('click', () => {
    if (phase !== 'setup') { hint('Le placement se décide avant le combat.'); return; }
    openPicker(row, slot);
  });
  return el;
}

function makeCard(u: TUnit): HTMLElement {
  const el = document.createElement('div');
  el.className = `tcard${u.side === 'enemy' ? ' foe' : ''}`;
  el.dataset.uid = String(u.uid);
  const sub = u.hero ? `${u.hero.role} · ${u.hero.rarity}` : u.isBoss ? 'BOSS' : 'créature';
  el.innerHTML = `
    <div class="tavatar">
      <img src="${portraitOf(u)}" alt="${u.name}" loading="lazy">
      <span class="tlvl">${u.level}</span>
      ${phase === 'setup' && u.side === 'hero' ? `<button class="tbtn ghost" data-remove style="position:absolute;top:-.45rem;right:-.45rem;padding:0 .3rem;font-size:.7rem;line-height:1.3" title="Retirer">×</button>` : ''}
    </div>
    <div class="tinfo">
      <div class="tname">${u.name} <small>${sub}</small></div>
      <div class="tbar hp"><i style="width:100%"></i><span class="tshield" style="left:0;width:0"></span><b></b></div>
      <div class="tbar gauge"><i style="width:0%"></i></div>
      <div class="tstatus"></div>
    </div>
  `;
  el.addEventListener('click', (e) => {
    if ((e.target as HTMLElement).dataset.remove !== undefined) return;
    if (phase === 'setup' && u.side === 'hero') {
      const idx = slotIndexOf(u);
      if (idx >= 0) openPicker(SLOT_ORDER[idx]!.row, SLOT_ORDER[idx]!.slot);
      return;
    }
    onTargetClick(u);
  });
  el.querySelector('[data-remove]')?.addEventListener('click', (e) => {
    e.stopPropagation();
    const idx = slotIndexOf(u);
    if (idx >= 0) { slots[idx] = null; persistSlots(); rebuild(); }
  });
  cards.set(u.uid, el);
  return el;
}

/** Emplacement occupé par ce héros (l'identité passe par la fiche, pas par l'unité). */
function slotIndexOf(u: TUnit): number {
  return slots.findIndex((m) => m?.def === u.hero);
}

/* ===================================================================== */
/*  Choix des héros                                                       */
/* ===================================================================== */

function openPicker(row: Row, slot: number): void {
  root.querySelector('.picker')?.remove();
  const idx = SLOT_ORDER.findIndex((s2) => s2.row === row && s2.slot === slot);
  if (idx < 0) return;
  const nb = slots.filter((x) => !!x).length;

  // Dans le jeu : les 5 héros du joueur (vrais niveaux, équipement, étoiles, forge).
  // Au laboratoire : les 27 héros, au niveau réglable.
  const equipe = cfg && cfg.team.length > 0 ? cfg.team : savedTeam();
  const pool: TeamMember[] = cfg
    ? equipe.map((m) => m)
    : HEROES.map((d) => savedTeam().find((x) => x.def === d) ?? { def: d, stars: d.stars, level: niveau });

  // Où se trouve déjà chaque héros : on peut le déplacer au lieu de le bloquer.
  const place = new Map<string, number>();
  slots.forEach((m, i) => { if (m) place.set(m.def.id, i); });

  const box = document.createElement('div');
  box.className = 'picker';
  box.innerHTML = `
    <div class="picker-box">
      <h3>${cfg ? 'Ton équipe' : 'Choisir un héros'}
        <small>${cfg ? `${cfg.team.length} héros pour ${MAX_TEAM} emplacements` : `${nb} / ${MAX_TEAM} emplacements`} · ligne ${ROW_LABEL[row]} · ${ROW_BONUS[row].text}</small>
      </h3>
      <div class="picker-grid">
        ${pool.map((m) => {
          const d = m.def;
          const ailleurs = place.get(d.id);
          const pris = ailleurs !== undefined && ailleurs !== idx;
          const bloque = pris && !cfg;
          const etat = ailleurs === idx ? 'déjà ici'
            : pris ? (cfg ? 'déjà placé — cliquer pour échanger' : 'déjà placé')
              : `niv. ${m.level}`;
          const img = PORTRAITS[d.id] || ART[d.texture] || '';
          return `<button class="pcard${pris ? ' taken' : ''}" data-hero="${d.id}" ${bloque ? 'disabled' : ''}>
            <img src="${img}" alt="" loading="lazy">
            <span><b>${d.name}</b><span class="rar ${d.rarity}">${d.rarity} · ${'★'.repeat(m.stars)} · ${etat}</span>
            <span>${d.role} · ${d.cls}</span></span>
          </button>`;
        }).join('')}
      </div>
      <div style="display:flex;gap:.5rem;align-items:center;justify-content:space-between">
        <small style="color:var(--t-muted);font-size:.7rem;line-height:1.4">${cfg
          ? 'Ton équipe est de 5 héros et le champ en propose 6 : tu décides quel emplacement reste vide. Cliquer sur un héros déjà placé l’échange avec celui de cet emplacement.'
          : 'Les héros grisés sont déjà placés. Tu peux aussi laisser un emplacement vide.'}</small>
        <span style="display:flex;gap:.4rem">
          <button class="tbtn ghost" data-vide>Laisser vide</button>
          <button class="tbtn go" data-close>Fermer</button>
        </span>
      </div>
    </div>`;
  root.appendChild(box);
  box.querySelector('[data-close]')!.addEventListener('click', () => box.remove());
  box.addEventListener('click', (e) => { if (e.target === box) box.remove(); });
  box.querySelector('[data-vide]')!.addEventListener('click', () => {
    slots[idx] = null;
    box.remove();
    persistSlots();
    rebuild();
  });
  box.querySelectorAll('[data-hero]').forEach((b) => {
    const id = (b as HTMLElement).dataset.hero!;
    b.addEventListener('click', () => {
      const trouve = pool.find((m) => m.def.id === id);
      if (!trouve) return;
      // Déplacement ou échange : l'équipe est de 5 héros pour 6 emplacements, donc
      // prendre la place d'un héros déjà posé ne doit jamais en faire disparaître un.
      const ailleurs = place.get(id);
      const occupe = slots[idx] ?? null;
      if (ailleurs !== undefined && ailleurs !== idx) slots[ailleurs] = occupe;
      slots[idx] = cfg ? trouve : { def: trouve.def, stars: trouve.stars, level: niveau };
      box.remove();
      persistSlots();
      rebuild();
    });
  });
}

/* ===================================================================== */
/*  Barre d'action, ordre des tours, synchronisation                      */
/* ===================================================================== */

/** Ces règles touchent plusieurs cases d’un coup : pas besoin de choisir une cible. */
const MULTI: TargetRule[] = ['enemyAll', 'enemyFrontRow', 'allAllies', 'allyLowest', 'self'];

function cardOf(uid: number): HTMLElement | null {
  return cards.get(uid) ?? null;
}

/** L’ordre des prochains tours, en haut de l’écran. */
function renderOrder(): void {
  const bar = root.querySelector('.tour-order');
  if (!bar) return;
  bar.innerHTML = '<span>Ordre</span>';
  if (!battle) return;
  for (const u of battle.turnOrder(8)) {
    const chip = document.createElement('div');
    chip.className = `ochip${u.side === 'enemy' ? ' foe' : ''}${actor?.uid === u.uid ? ' now' : ''}`;
    chip.innerHTML = `<img src="${portraitOf(u)}" alt="" loading="lazy"><b>${u.name}</b><i>${Math.round(u.gauge)} %</i>`;
    bar.appendChild(chip);
  }
}

/** Les deux jauges d’âmes (la tienne et celle de l’ennemi). */
function syncSoul(): void {
  if (!battle) return;
  for (const [side, sel] of [['hero', '[data-soul-hero]'], ['enemy', '[data-soul-foe]']] as const) {
    const box = root.querySelector(sel);
    if (!box) continue;
    const n = battle.soul[side];
    box.querySelectorAll('.gem').forEach((g, i) => g.classList.toggle('on', i < n));
    const small = box.querySelector('small');
    if (small) small.textContent = `${n} / ${SOUL_MAX}`;
  }
}

/** Rafraîchit chaque carte : PV, bouclier, jauge, statuts, mort, tour actif, cible possible. */
function syncAll(): void {
  const b = battle;
  if (!b) return;
  const legal = pickedSkill !== null && actor ? new Set(b.legalTargets(actor, actor.skills[pickedSkill]!).map((t) => t.uid)) : null;
  for (const u of b.units) {
    const el = cardOf(u.uid);
    if (!el) continue;
    el.classList.toggle('dead', !u.alive);
    el.classList.toggle('acting', actor?.uid === u.uid && u.alive);
    el.classList.toggle('picking', !!legal?.has(u.uid) && u.uid !== actor?.uid);

    const hp = el.querySelector('.tbar.hp');
    if (hp) {
      hp.classList.toggle('low', u.ratio < 0.35);
      const fill = hp.querySelector('i');
      if (fill) fill.style.width = `${Math.max(0, Math.min(100, u.ratio * 100))}%`;
      const txt = hp.querySelector('b');
      if (txt) txt.textContent = `${num(Math.max(0, u.hp))} / ${num(u.maxHp)}`;
      const sh = hp.querySelector<HTMLElement>('.tshield');
      if (sh) {
        const part = u.maxHp > 0 ? Math.min(1, u.shield / u.maxHp) : 0;
        sh.style.width = `${part * 100}%`;
        sh.style.left = `${Math.max(0, Math.min(1, u.ratio)) * 100}%`;
        sh.title = u.shield > 0 ? `Bouclier : ${num(u.shield)}` : '';
      }
    }
    const gauge = el.querySelector<HTMLElement>('.tbar.gauge i');
    if (gauge) gauge.style.width = `${Math.max(0, Math.min(100, u.gauge))}%`;

    const st = el.querySelector('.tstatus');
    if (st) {
      st.innerHTML = u.statuses.map((s2) => {
        const ui = STATUS_UI[s2.id];
        const reste = s2.turns > 1 ? ' tours restants' : ' tour restant';
        return `<span class="tst ${ui?.cls ?? 'bad'}">${ui?.label ?? s2.id}<b>${s2.turns}${reste}</b></span>`;
      }).join('');
    }
  }
  syncSoul();
  renderOrder();
}

/** La barre du bas : qui joue, ses 4 capacités, l’embrasement. */
function renderBar(): void {
  const bar = root.querySelector<HTMLElement>('[data-bar]');
  if (!bar) return;
  const b = battle;
  const u = actor;
  const joue = phase === 'play' && !!u && u.side === 'hero' && !auto;
  const ennemi = phase === 'play' && (!u || u.side !== 'hero');

  const titre = phase === 'setup' ? 'Préparation'
    : phase === 'over' ? 'Combat terminé'
      : ennemi ? 'Tour ennemi…'
        : u ? u.name : '…';
  const sous = phase === 'setup'
    ? `${slots.filter((m) => !!m).length} héros en place · ${MAX_TEAM} emplacements`
      : ennemi ? 'Une seule unité agit à la fois.'
        : phase === 'over' ? `${b?.turn ?? 0} tours joués`
          : u ? (pickedSkill !== null
            ? 'Choisis une cible — Échap pour annuler.'
            : `Tour ${b?.turn ?? 1} · touches 1 à 4`) : '';

  let html = `<div class="twho"><b>${titre}</b><span>${sous}</span>`;
  if (u) html += `<div class="tbar hp${u.ratio < 0.35 ? ' low' : ''}"><i style="width:${Math.max(0, Math.min(100, u.ratio * 100))}%"></i><b>${num(Math.max(0, u.hp))} / ${num(u.maxHp)}</b></div>`;
  html += '</div>';

  for (let i = 0; i < 4; i++) {
    const sk = u?.skills[i];
    if (!sk || !u) { html += '<button class="tskill" disabled></button>'; continue; }
    const pret = u.ready(i);
    const cd = Math.max(0, u.cd[i] ?? 0);
    const cls = `tskill${sk.ultimate ? ' ult' : ''}${sk.kind === 'heal' ? ' heal' : ''}${pickedSkill === i ? ' sel' : ''}`;
    const detail = `${TARGET_LABEL[sk.target]}${sk.soul > 0 ? ` · +${sk.soul} âme${sk.soul > 1 ? 's' : ''}` : ''}`;
    html += `<button class="${cls}" data-skill="${i}" ${joue && pret ? '' : 'disabled'} title="${sk.text} — ${skillLine(sk)}">
      <i class="ico">${icon(sk.icon)}</i>
      <b>${sk.name}</b>
      <span>${detail}</span>
      ${pret ? '<em class="tagcd">' + (i + 1) + '</em>' : '<span class="cd"><em>' + cd + '</em>tour' + (cd > 1 ? 's' : '') + '</span>'}
    </button>`;
  }

  const ames = b?.soul.hero ?? 0;
  html += `<div class="textra">
    <button class="tbtn ghost burn" data-burn aria-pressed="${burn}" ${joue && ames >= SOUL_BURN_COST ? '' : 'disabled'}>${burn ? 'Embrasé ✓' : `Embraser (${ames}/${SOUL_BURN_COST})`}</button>
    <small>${ames} âme${ames > 1 ? 's' : ''} · prochain coup ×1,5</small>
  </div>`;
  bar.innerHTML = html;

  bar.querySelectorAll<HTMLElement>('[data-skill]').forEach((el) => {
    el.addEventListener('click', () => onSkillClick(Number(el.dataset.skill)));
  });
  bar.querySelector('[data-burn]')?.addEventListener('click', () => {
    if (ames < SOUL_BURN_COST) return;
    burn = !burn;
    renderBar();
    hint(burn ? `Embrasement armé : ${SOUL_BURN_COST} âmes dépensées, le prochain coup fera ×1,5 dégâts et ses effets passeront plus sûrement.` : 'Embrasement annulé, les âmes sont gardées.');
  });
}

/* --------------------------- choix du joueur --------------------------- */

function onSkillClick(i: number): void {
  const b = battle;
  const u = actor;
  if (!b || !u || u.side !== 'hero' || phase !== 'play' || auto) return;
  const sk = u.skills[i];
  if (!sk) return;
  if (!u.ready(i)) { hint(`${sk.name} recharge encore : ${Math.max(0, u.cd[i] ?? 0)} tour(s).`); return; }

  const legal = b.legalTargets(u, sk);
  if (legal.length === 0) { hint(`Aucune cible valable pour ${sk.name}.`); return; }
  if (burn && b.soul.hero < SOUL_BURN_COST) { burn = false; hint('Plus assez d’âmes : l’embrasement est annulé.'); }

  if (MULTI.includes(sk.target) || legal.length === 1) { void heroPlay(i, legal[0]?.uid ?? null); return; }
  pickedSkill = pickedSkill === i ? null : i;
  syncAll();
  renderBar();
  hint(pickedSkill === null ? 'Coup annulé.' : `${sk.name} — ${TARGET_LABEL[sk.target]} : clique sur une carte entourée de vert.`);
}

function onTargetClick(u: TUnit): void {
  const b = battle;
  const a = actor;
  if (!b || !a || a.side !== 'hero' || phase !== 'play' || auto) return;
  if (pickedSkill === null) {
    hint(`${u.name} — ${num(Math.max(0, u.hp))} / ${num(u.maxHp)} PV${u.shield > 0 ? ` · bouclier ${num(u.shield)}` : ''} · ligne ${ROW_LABEL[u.row]} · vitesse ${Math.round(u.effSpeed)}.`);
    return;
  }
  const sk = a.skills[pickedSkill]!;
  if (!b.legalTargets(a, sk).some((x) => x.uid === u.uid)) {
    hint(`${u.name} n’est pas une cible valable pour ${sk.name} (${TARGET_LABEL[sk.target]}).`);
    return;
  }
  void heroPlay(pickedSkill, u.uid);
}

/** Lance le coup choisi, joue ses événements, puis rend la main à l’initiative. */
async function heroPlay(i: number, target: number | null): Promise<void> {
  const b = battle;
  const u = actor;
  if (!b || !u) return;
  const here = epoch;
  const embrase = burn && b.soul.hero >= SOUL_BURN_COST;
  burn = false;
  pickedSkill = null;
  const ev = b.resolve(i, target, embrase);
  await playEvents(ev, here);
  if (here !== epoch) return;
  actor = null;
  syncAll();
  renderBar();
  await wait(170 / speed);
  if (here !== epoch) return;
  void nextTurn(here);
}

/** Le mode AUTO : le jeu choisit la capacité et la cible comme l’IA ennemie. */
async function heroAutoTurn(): Promise<void> {
  const b = battle;
  const u = actor;
  if (!b || !u || u.side !== 'hero' || phase !== 'play') return;
  const here = epoch;
  await wait(330 / speed);
  if (here !== epoch) return;
  const c = b.aiChoice(u);
  const ev = b.resolve(c.skill, c.target, c.burn);
  await playEvents(ev, here);
  if (here !== epoch) return;
  actor = null;
  syncAll();
  renderBar();
  await wait(170 / speed);
  if (here !== epoch) return;
  void nextTurn(here);
}

function onKey(e: KeyboardEvent): void {
  if (!root.isConnected) { window.removeEventListener('keydown', onKey); return; }
  if (e.key === 'Escape') {
    root.querySelector('.picker')?.remove();
    if (pickedSkill !== null) { pickedSkill = null; renderBar(); syncAll(); hint('Coup annulé.'); }
    return;
  }
  if (phase !== 'play' || !actor || actor.side !== 'hero' || auto) return;
  const n = Number(e.key);
  if (n >= 1 && n <= 4) { e.preventDefault(); onSkillClick(n - 1); }
}

/* ===================================================================== */
/*  Boucle de jeu                                                         */
/* ===================================================================== */

async function nextTurn(here: number): Promise<void> {
  const b = battle;
  if (!b || here !== epoch || b.over) { if (here === epoch) finish(); return; }

  const { actor: a, events } = b.advance();
  await playEvents(events, here);
  if (here !== epoch) return;
  if (!a) { finish(); return; }

  actor = a;
  syncAll();
  renderBar();

  if (a.side === 'enemy') {
    hint(`${a.name} joue…`);
    await wait(430 / speed);
    if (here !== epoch) return;
    const c = b.aiChoice(a);
    const ev = b.resolve(c.skill, c.target, c.burn);
    await playEvents(ev, here);
    if (here !== epoch) return;
    actor = null;
    syncAll();
    renderBar();
    await wait(200 / speed);
    void nextTurn(here);
    return;
  }

  if (auto) { await heroAutoTurn(); return; }
  const s = a.skills;
  hint(`À ${a.name} de jouer — capacité de base (${s[0]!.name}), ${s[1]!.name}, ${s[2]!.name}${a.ready(3) ? ` ou ULTIME ${s[3]!.name}` : ` (ultime dans ${a.cd[3]} tour${(a.cd[3] ?? 0) > 1 ? 's' : ''})`}.`);
}

/** Joue une liste d'événements dans l'ordre, avec les animations qui vont avec. */
async function playEvents(events: BattleEvent[], here: number): Promise<void> {
  const b = battle;
  for (const e of events) {
    if (here !== epoch) return;
    const src = 'src' in e ? b?.byUid(e.src) : undefined;
    const tgt = 'tgt' in e ? b?.byUid(e.tgt) : undefined;
    const srcU = 'uid' in e ? b?.byUid(e.uid) : src;

    switch (e.type) {
      case 'turn':
        actor = b?.byUid(e.uid) ?? null;
        syncAll();
        break;
      case 'cast': {
        const el = srcU ? cardOf(srcU.uid) : null;
        flash(el, 'casting', 400);
        if (e.ultimate) {
          const duree = srcU ? showUltimate(srcU, e.skill) : 1200;
          logLine('ult', `⚡ ${srcU?.name ?? '?'} lance son ULTIME : ${e.skill}${e.burn ? ' (embrasé)' : ''}.`);
          // La mise en scène se regarde : la vitesse du combat ne la coupe qu'à partir de ×4.
          await wait(speed >= 4 ? Math.max(600, duree / speed) : duree);
        } else {
          logLine('', `<b>${srcU?.name ?? '?'}</b> utilise ${e.skill}${e.burn ? ' <b>(embrasé)</b>' : ''}.`);
          await wait(230 / speed);
        }
        break;
      }
      case 'damage': {
        const el = tgt ? cardOf(tgt.uid) : null;
        flash(el, 'hit', 340);
        floatText(el, e.amount === 0 ? 'bloqué' : `${e.crit ? '✦ ' : ''}${num(e.amount)}`, e.amount === 0 ? 'block' : e.crit ? 'crit' : 'dmg');
        if (e.amount > 0) logLine('', `${tgt?.name ?? '?'} encaisse ${num(e.amount)} (${KIND_LABEL[e.kind] ?? e.kind})${e.crit ? ' — critique !' : ''}.`);
        syncAll();
        await wait(e.amount === 0 ? 120 / speed : 190 / speed);
        break;
      }
      case 'heal': {
        const el = tgt ? cardOf(tgt.uid) : null;
        flash(el, 'healed', 500);
        floatText(el, `+${num(e.amount)}`, 'heal');
        logLine('heal', `${tgt?.name ?? '?'} récupère ${num(e.amount)} PV.`);
        syncAll();
        await wait(200 / speed);
        break;
      }
      case 'shield':
        floatText(tgt ? cardOf(tgt.uid) : null, `bouclier ${num(e.amount)}`, 'block');
        logLine('heal', `${tgt?.name ?? '?'} gagne un bouclier de ${num(e.amount)}.`);
        syncAll();
        break;
      case 'status': {
        if (!e.applied) { logLine('', `${tgt?.name ?? '?'} résiste à ${STATUS_UI[e.id]?.label ?? e.id}.`); break; }
        const ui = STATUS_UI[e.id];
        logLine('', `${tgt?.name ?? '?'} : ${ui?.label ?? e.id} (${e.turns} tour${e.turns > 1 ? 's' : ''}).`);
        syncAll();
        break;
      }
      case 'dot':
        floatText(tgt ? cardOf(tgt.uid) : null, `${num(e.amount)}`, 'dot');
        flash(tgt ? cardOf(tgt.uid) : null, 'hit', 300);
        logLine('', `${tgt?.name ?? '?'} souffre (${STATUS_UI[e.id]?.label ?? e.id}) : ${num(e.amount)}.`);
        syncAll();
        await wait(170 / speed);
        break;
      case 'death':
        logLine('dead', `☠ ${e.name} tombe.`);
        syncAll();
        await wait(220 / speed);
        break;
      case 'skip':
        logLine('', `${srcU?.name ?? '?'} est ${STATUS_UI[e.reason]?.label ?? e.reason} et perd son tour.`);
        await wait(260 / speed);
        break;
      case 'soul':
        syncSoul();
        break;
      case 'end':
        break;
    }
  }
  if (here === epoch) syncAll();
}

function flash(el: HTMLElement | null, cls: string, ms: number): void {
  if (!el) return;
  el.classList.remove(cls);
  void el.offsetWidth;
  el.classList.add(cls);
  setTimeout(() => el.classList.remove(cls), ms);
}

function floatText(el: HTMLElement | null, text: string, cls: string): void {
  if (!el) return;
  const f = document.createElement('span');
  f.className = `tfloat ${cls}`;
  f.textContent = text;
  el.appendChild(f);
  setTimeout(() => f.remove(), 1000);
}

/**
 * L'ultime n'est plus un simple carton : on rejoue la vraie mise en scène du jeu
 * (séquence S3 du Laboratoire quand le héros a son squelette 9 pièces, sinon le carton
 * du style choisi). Renvoie la durée jouée, pour que le combat attende la fin de la scène.
 */
function showUltimate(u: TUnit, skillName: string): number {
  const h = u.hero;
  // Un boss n'a pas de cinématique dédiée : on garde le carton de titre.
  if (!h) { showUlt(`${u.name} — ${skillName}`); return 1200; }

  const style = getUltStyle();
  const d = ultDataOf(h);
  root.querySelector('.tour-ult-host')?.remove();
  const el = document.createElement('div');
  el.className = 'ult-host tour-ult-host';
  root.appendChild(el);

  try {
    if (getUltMode() === 'epic' && specOf(d.id)) {
      playEpic(el, d.id, d, style);
      sonUlt('braam', 1520);
      window.setTimeout(() => el.remove(), EPIC_MS + 120);
      return EPIC_MS;
    }
    el.innerHTML = ultHTML(style, d);
    const dur = ultDuration(style);
    sonUlt(style === 'comics' ? 'crit' : style === 'holo' ? 'cutin' : 'braam', style === 'rituel' ? 1450 : style === 'comics' ? 780 : 820);
    window.setTimeout(() => el.remove(), dur + 120);
    return dur;
  } catch {
    // Mise en scène indisponible (assets absents, navigateur limité) : on retombe
    // sur le carton de titre, et le combat continue normalement.
    el.remove();
    showUlt(`${h.name} — ${skillName}`);
    return 1000;
  }
}

/** Le son arrive sur le pic de la scène, pas au début (même réglage que le combat classique). */
function sonUlt(name: 'braam' | 'crit' | 'cutin', at: number): void {
  try { setTimeout(() => { try { audio.play(name, { vol: 0.8 }); } catch { /* son absent */ } }, at); }
  catch { /* audio indisponible */ }
}

function showUlt(text: string): void {
  root.querySelector('.tultname')?.remove();
  const el = document.createElement('div');
  el.className = 'tultname';
  el.textContent = text;
  root.appendChild(el);
  setTimeout(() => el.remove(), 1500);
}

function logLine(cls: string, html: string): void {
  const log = root.querySelector<HTMLElement>('[data-log]');
  if (!log) return;
  const p = document.createElement('p');
  if (cls) p.className = cls;
  p.innerHTML = html;
  log.appendChild(p);
  while (log.children.length > 220) log.firstChild?.remove();
  log.scrollTop = log.scrollHeight;
}

function hint(text: string): void {
  const el = root.querySelector<HTMLElement>('[data-hint]');
  if (el) el.textContent = text;
}

/* ===================================================================== */
/*  Fin de combat et règles                                               */
/* ===================================================================== */

function finish(): void {
  const b = battle;
  if (!b || phase === 'over') return;
  phase = 'over';
  actor = null;
  syncAll();
  renderBar();

  // Dans le jeu, c'est lui qui affiche le résultat (étoiles, butin, récompenses) :
  // on lui donne exactement la même forme de résultat que le combat en temps réel.
  if (cfg) {
    cfg.onFinished(resultOf(b));
    logLine('turn', b.winner === 'hero' ? 'Victoire !' : 'Défaite.');
    hint(b.winner === 'hero' ? 'Victoire — les récompenses sont à l’écran.' : 'Défaite — l’écran te dit ce qui manque.');
    return;
  }

  const win = b.winner === 'hero';
  const nul = b.winner === null;
  const classe = [...b.heroes].sort((x, y) => y.dealt - x.dealt);
  const stats = classe.slice(0, 3).map((u) => `${u.name} ${num(u.dealt)} dégâts${u.healed > 0 ? ` · ${num(u.healed)} soignés` : ''}`).join(' · ');

  const banner = document.createElement('div');
  banner.className = `tbanner${win ? '' : ' lose'}`;
  banner.innerHTML = `
    <h2>${nul ? 'MATCH NUL' : win ? 'VICTOIRE' : 'DÉFAITE'}</h2>
    <p>${stage.id} — ${stage.name} · ${b.turn} tours${nul ? ` (plafond de ${b.turn} atteint)` : ''}.<br>${stats}</p>
    <p style="color:var(--t-gold-l)">${win
      ? 'C’est ton choix de capacités et ton placement qui ont fait la différence.'
      : nul ? 'Personne n’est tombé : les soins ont tenu plus longtemps que les dégâts.' : `Il manque des niveaux ou une meilleure ligne avant. Niveau conseillé : ${stage.level}.`}</p>
    <div class="acts">
      <button class="tbtn go" data-again>Rejouer ce combat</button>
      <button class="tbtn" data-edit>Changer l’équipe</button>
      <button class="tbtn ghost" data-quit>Retour au jeu</button>
    </div>`;
  banner.querySelector('[data-again]')!.addEventListener('click', () => { banner.remove(); startBattle(); });
  banner.querySelector('[data-edit]')!.addEventListener('click', () => { banner.remove(); phase = 'setup'; rebuild(); });
  banner.querySelector('[data-quit]')!.addEventListener('click', retourAuJeu);
  root.appendChild(banner);
  logLine('turn', nul ? 'Match nul.' : win ? 'Victoire !' : 'Défaite.');
}

/** Le résultat du combat, dans la même forme que celui du combat en temps réel. */
function resultOf(b: TurnBattle): TourResult {
  const win = b.winner === 'hero';
  const morts = b.heroes.filter((h) => !h.alive).length;
  return {
    winner: win ? 'hero' : 'enemy',
    // Même règle que le combat classique : 3 étoiles si personne ne tombe.
    stars: !win ? 0 : morts === 0 ? 3 : morts <= 2 ? 2 : 1,
    time: (Date.now() - startMs) / 1000,
    stats: b.heroes.map((h) => ({
      id: h.hero?.id ?? h.def.id, name: h.name, dealt: h.dealt, healed: h.healed,
      taken: h.taken, alive: h.alive,
    })),
  };
}

function showRules(): void {
  root.querySelector('.picker')?.remove();
  const box = document.createElement('div');
  box.className = 'picker';
  box.innerHTML = `
    <div class="picker-box" style="width:min(46rem,100%)">
      <h3>Comment ça se joue
        <small>Le combat n’est plus simultané : une seule unité agit à la fois.</small>
      </h3>
      <div style="font-size:.8rem;line-height:1.65;color:var(--t-text);overflow-y:auto">
        <p><b style="color:var(--t-gold-l)">1. L’initiative.</b> Chaque unité remplit sa jauge violette à la vitesse de sa VITESSE. La première à 100 % joue. La barre du haut montre l’ordre des prochains tours.</p>
        <p><b style="color:var(--t-gold-l)">2. Les capacités.</b> Chaque héros en a <b>trois + une ultime</b>. La première est gratuite (recharge 0), les autres ont une recharge en <b>tours</b> affichée sur le bouton : une fois lancée, il faut attendre. D’où l’intérêt d’alterner.</p>
        <p><b style="color:var(--t-gold-l)">3. Les lignes.</b> ${ROW_BONUS.front.text}. ${ROW_BONUS.mid.text}. ${ROW_BONUS.back.text}. Un ennemi au corps à corps ne peut pas frapper ta ligne arrière tant qu’une ligne plus avancée tient ; les archers et les mages, eux, passent par-dessus. Un héros avec « perce la ligne » punit donc les équipes toutes cachées derrière.</p>
        <p><b style="color:var(--t-gold-l)">4. Les âmes.</b> Chaque capacité utilisée en fait gagner à ton équipe (jauge au centre). En dépenser ${SOUL_BURN_COST} « embrase » ton prochain coup : dégâts ×1,5 et effets plus sûrs.</p>
        <p><b style="color:var(--t-gold-l)">5. Les statuts.</b> Tout est compté en tours : étourdissement, gel, poison, brûlure, saignement, bouclier, régénération, provocation, riposte, invulnérabilité… Les pastilles sous les PV indiquent ce qui est actif et combien de tours il reste.</p>
      </div>
      <div style="display:flex;justify-content:flex-end"><button class="tbtn go" data-close>J’ai compris</button></div>
    </div>`;
  box.querySelector('[data-close]')!.addEventListener('click', () => box.remove());
  box.addEventListener('click', (e) => { if (e.target === box) box.remove(); });
  root.appendChild(box);
}
