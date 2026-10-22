import { TALKERS } from '../data/npcLines';
import { ART, GEAR_ART, PORTRAITS, SCENE_BG } from '../assets';
import { BUILDINGS, type BuildingDef } from '../data/buildings';
import { SLOT_LIST, SUB_LABEL, itemCss, itemRarity, mainLabel, type Slot } from '../data/items';
import { BONDS, BOSSES, CAMPAIGN_LENGTH, CHAPTERS, CLASSES, CLASS_LIST, classBeatenBy, classCounts, classMultiplier, CLASS_SYNERGY, ENEMIES, HEROES, MAX_RED, MAX_STARS, QUALITY, heroPower, levelStatMult, levelUpCost, skillTiers, starMult, STAGE_PROFILE_TEXT, STAGES, stageProfile, teamPower, tierBonusPct, type HeroClass, type HeroDef, type StageDef, type UnitDef } from '../data/heroes';
import type { LabelPosition } from '../scene/HubScene';
import { store, type PlayerState, type Quality } from '../state/store';
import { audio } from '../audio/AudioEngine';
import { Emitter } from '../utils/Emitter';
import { FormationScreen } from './Formation';
import { icon, type IconName } from './icons';
import { ROLE_ICON } from './roles';
import { starsHTML } from './stars';
import { foodStock, planRed, planYellow } from '../data/sanctuaire';
import { ULT_STYLES, getUltStyle, setUltStyle } from './ultimate';
import { canFullscreen, inIframe, isFullscreen, toggleFullscreen } from './fullscreen';
import { collectionText, SummonScreen } from './Summon';
import { towerRewards, towerStage, towerTier } from '../data/tower';
import { DUMMY_PRESETS, trainingStage } from '../data/training';
import { FRAMES, TITLES, frameById, type ProfileStats } from '../data/profile';
import { RANK_POPULATION, leaderboard, rankScore, rankingDay, seasonOf } from '../data/bots';
import { GUILDS, guildById, guildChat, guildMembers, playerWeekly } from '../data/guilds';

export type UIEvents = {
  labelHover: { id: string; hovered: boolean };
  selectBuilding: string;
  recenter: void;
  startStage: string;
  startTower: number;
  startTraining: { heroId: string; armor: number; res: number };
};

/** Un niveau est jouable si le précédent a été gagné. */
const unlocked = (st: StageDef): boolean => !st.requires || (store.campaign[st.requires] ?? 0) > 0;

interface MenuEntry {
  id: string;
  label: string;
  icon: IconName;
  badge?: string | true;
  isNew?: boolean;
  description: string;
}

const LEFT_MENU: MenuEntry[] = [
  { id: 'summon', label: 'Invocation', icon: 'crystal', isNew: true, description: '' },
  { id: 'sanctuaire', label: 'Sanctuaire', icon: 'star', isNew: true, description: 'Le seul endroit où les héros gagnent des étoiles.' },
  { id: 'mail', label: 'Courrier', icon: 'mail', badge: true, description: 'Les messages et récompenses de la Tour.' },
  { id: 'achievements', label: 'Succès', icon: 'medal', description: 'Accomplis des exploits pour gagner des gemmes.' },
  { id: 'codex', label: 'Codex', icon: 'book', description: "L'encyclopédie du monde : héros, monstres et boss." },
];

const RIGHT_MENU: MenuEntry[] = [
  { id: 'shop', label: 'Boutique', icon: 'shop', description: 'Objets, ressources et offres.' },
  { id: 'guild', label: 'Guilde', icon: 'banner', description: 'Rejoins une guilde vivante.' },
  { id: 'ranking', label: 'Classement', icon: 'trophy', description: 'Compare ta progression avec les autres joueurs.' },
  { id: 'events', label: 'Événements', icon: 'star', description: 'Événements à durée limitée.' },
];

const NAV: Array<MenuEntry & { main?: boolean }> = [
  { id: 'campaign', label: 'Campagne', icon: 'map', description: '' },
  { id: 'tower', label: 'Tour', icon: 'tower', description: 'La Tour de l’Infini : des étages sans fin, sans énergie, et un record à battre.' },
  { id: 'training', label: 'Arène', icon: 'swords', description: 'Entraînement : un héros contre un mannequin invincible, pour comprendre chaque capacité.' },
  { id: 'heroes', label: 'Héros', icon: 'helmet', description: 'Gère ta collection de héros, leur niveau et leur équipement.' },
  { id: 'city', label: 'Ville', icon: 'castle', main: true, description: '' },
  { id: 'bag', label: 'Sac', icon: 'bag', badge: true, description: 'Ton inventaire : objets, fragments et matériaux.' },
  { id: 'guild', label: 'Guilde', icon: 'banner', description: 'Rejoins une guilde pour affronter des boss avec d’autres joueurs.' },
];

const CHAT_FEED: Array<[string, string, string]> = [
  ['Monde', 'Vexa', 'quelqu’un a dépassé l’étage 100 de la Tour ??'],
  ['Système', '', 'Kaelthas a invoqué un héros légendaire !'],
  ['Guilde', 'Grimald', 'boss de guilde ce soir 21h, soyez là'],
  ['Monde', 'Nyx', 'la forge vaut le coup ou je garde mon or ?'],
  ['Monde', 'Sire_Corbeau', 'recrute pour la guilde « Les Cendres Noires »'],
  ['Système', '', 'Un éclair a frappé la Tour de l’Infini… les étages tremblent.'],
  ['Guilde', 'Elya', 'merci pour l’aide hier !'],
  ['Monde', 'Draven', 'Lyra + Morwen en ultime en même temps c’est violent'],
  ['Système', '', 'Le Gardien d’Os rôde sur la Route des Pendus…'],
  ['Monde', 'Thorne', 'le portail de campagne est ouvert depuis ce matin'],
];

const fmt = (n: number): string => n.toLocaleString('fr-FR');

/**
 * Interface HTML superposée au canvas : barres, menus, étiquettes, fenêtres.
 * Le HTML/CSS garde des textes parfaitement nets sur écran PC, quelle que soit la résolution.
 */
export class UI extends Emitter<UIEvents> {
  private readonly labels = new Map<string, { el: HTMLElement; lastX: number; lastY: number; shown: boolean }>();
  private labelsRoot!: HTMLElement;
  private modalRoot!: HTMLElement;
  private toastEl!: HTMLElement;
  private hintEl!: HTMLElement;
  private chatLines!: HTMLElement;
  private chatIndex = 0;
  private readonly summon = new SummonScreen(this);
  private readonly formation = new FormationScreen(this);

  constructor(readonly root: HTMLElement) {
    super();
    this.build();
    this.bindStore();
    this.applyUiScale();
    window.addEventListener('resize', () => this.applyUiScale());
    window.addEventListener('keydown', (e) => { if (e.key === 'Escape') this.closeModal(); });
    this.startChat();
  }

  /* ================= Construction ================= */

  private build(): void {
    const p = store.player;
    this.root.innerHTML = `
      <div class="vignette"></div>

      <header class="hud-top">
        <button class="profile interactive" data-action="profile" title="Profil">
          <div class="avatar-frame">
            <div class="avatar">${icon('helmet')}</div>
            <div class="lvl" data-bind="level">${p.level}</div>
          </div>
          <div class="pinfo">
            <div class="pname" data-bind="name">${p.name}</div>
            <div class="ppower">${icon('swords')}<span data-bind="power">${fmt(p.power)}</span></div>
            <div class="xpbar"><i data-bind="xp" style="width:${(p.xp / p.xpMax) * 100}%"></i></div>
          </div>
        </button>

        <div class="zone-title"><span>Cendrebourg</span><small>Cité des Damnés</small></div>

        <div class="resources">
          ${this.resHTML('gold', 'coin', fmt(p.gold))}
          ${this.resHTML('gems', 'gem', fmt(p.gems))}
          ${this.resHTML('energy', 'bolt', `${p.energy}/${p.energyMax}`)}
          <button class="round-btn" data-action="sound" title="Son">${icon(store.settings.muted ? 'mute' : 'volume')}</button>
          <button class="round-btn" data-action="mail" title="Courrier">${icon('mail')}<span class="badge">2</span></button>
          <button class="round-btn" data-action="settings" title="Paramètres">${icon('gear')}</button>
        </div>
      </header>

      <aside class="side side-left">${LEFT_MENU.map((m) => this.sideHTML(m)).join('')}</aside>
      <aside class="side side-right">${RIGHT_MENU.map((m) => this.sideHTML(m)).join('')}</aside>

      <div class="labels ${store.settings.showLabels ? '' : 'off'}"></div>

      <button class="chat interactive" data-action="chat">
        <div class="chat-head">${icon('chat')} Discussion</div>
        <div class="chat-lines"></div>
      </button>

      <button class="nav-toggle interactive" data-action="nav-min" title="Replier la barre">${icon('back')}</button>
      <nav class="bottom-nav">
        ${NAV.map((n) => `
          <button class="nav-btn ${n.main ? 'main' : ''}" data-nav="${n.id}">
            <div class="nav-ico">${icon(n.icon)}</div>
            <span class="nav-txt">${n.label}</span>
            ${n.badge ? `<span class="badge ${n.badge === true ? 'dot' : ''}">${n.badge === true ? '' : n.badge}</span>` : ''}
          </button>`).join('')}
      </nav>

      <button class="battle-btn" data-action="battle">${icon('swords')}<span>COMBATTRE</span><small data-bind="battle-sub">Chapitre 1-1</small></button>

      <div class="intro-title"><small>Bienvenue à</small><span>Cendrebourg</span><em>Cité des Damnés</em></div>
      <div class="hint">Maintiens le clic et glisse, utilise la molette ou <kbd>←</kbd> <kbd>→</kbd> pour explorer la ville</div>
      <div class="modal-layer"></div>
      <div class="toast"></div>
    `;

    this.root.classList.toggle('nav-min', store.settings.navCompact);
    this.refreshLocks();
    this.labelsRoot = this.root.querySelector('.labels')!;
    this.modalRoot = this.root.querySelector('.modal-layer')!;
    this.toastEl = this.root.querySelector('.toast')!;
    this.hintEl = this.root.querySelector('.hint')!;
    this.chatLines = this.root.querySelector('.chat-lines')!;

    for (const def of BUILDINGS) this.createLabel(def);

    this.root.addEventListener('click', (e) => this.onClick(e));
    this.root.addEventListener('click', (e) => {
      const btn = (e.target as HTMLElement).closest<HTMLElement>('[data-hero-view]');
      if (!btn) return;
      this.bubble?.el.remove();
      this.bubble = null;
      this.openHeroes(btn.dataset.heroView);
    });
    setTimeout(() => this.hideHint(), 12000);
  }

  private resHTML(cls: string, ico: IconName, value: string): string {
    return `<div class="res ${cls}">
      <div class="res-ico">${icon(ico)}</div>
      <div class="res-val" data-bind="${cls}">${value}</div>
      <button class="res-plus" data-action="buy-${cls}" title="Obtenir plus">${icon('plus')}</button>
    </div>`;
  }

  private sideHTML(m: MenuEntry): string {
    return `<button class="side-btn" data-menu="${m.id}">
      <div class="side-ico">${icon(m.icon)}
        ${m.badge ? `<span class="badge ${m.badge === true ? 'dot' : ''}">${m.badge === true ? '' : m.badge}</span>` : ''}
        ${m.isNew ? '<span class="tag-new">NEW</span>' : ''}
      </div>
      <span class="side-label">${m.label}</span>
    </button>`;
  }

  private createLabel(def: BuildingDef): void {
    const el = document.createElement('button');
    el.className = 'b-label';
    el.style.setProperty('--glow', `#${def.glow.toString(16).padStart(6, '0')}aa`);
    el.innerHTML = `
      <div class="b-ico">${icon(def.icon)}</div>
      <div class="b-text"><span class="b-name">${def.name}</span><span class="b-sub">${def.subtitle}</span></div>
      ${def.notify ? '<span class="badge dot"></span>' : ''}`;
    el.addEventListener('pointerenter', () => { el.classList.add('hover'); audio.hover(); this.emit('labelHover', { id: def.id, hovered: true }); });
    el.addEventListener('pointerleave', () => { el.classList.remove('hover'); this.emit('labelHover', { id: def.id, hovered: false }); });
    el.addEventListener('click', () => this.emit('selectBuilding', def.id));
    this.labelsRoot.appendChild(el);
    this.labels.set(def.id, { el, lastX: NaN, lastY: NaN, shown: true });
  }

  /* ================= Données ================= */

  private bindStore(): void {
    store.on('player', (p) => this.renderPlayer(p));
    store.on('campaign', () => this.renderBattleButton());
    this.renderBattleButton();
    store.on('settings', (s) => {
      this.labelsRoot.classList.toggle('off', !s.showLabels);
      const btn = this.root.querySelector('[data-action="sound"]');
      if (btn) btn.innerHTML = icon(s.muted ? 'mute' : 'volume');
    });
  }

  private renderPlayer(p: PlayerState): void {
    // Le cadre choisi dans le profil doit se voir partout, pas seulement dans la fenêtre.
    const frameEl = this.root.querySelector<HTMLElement>('.hud-top .avatar-frame');
    if (frameEl) {
      const f = frameById(p.frame);
      frameEl.style.setProperty('--fr', f.css);
      frameEl.style.setProperty('--fg', f.glow);
    }
    const set = (key: string, v: string) => { const el = this.root.querySelector<HTMLElement>(`[data-bind="${key}"]`); if (el) el.textContent = v; };
    set('level', String(p.level));
    set('name', p.name);
    set('power', fmt(p.power));
    set('gold', fmt(p.gold));
    set('gems', fmt(p.gems));
    set('energy', `${p.energy}/${p.energyMax}`);
    // Compte à rebours de la prochaine unité : le joueur sait qu'il n'est pas bloqué.
    const nxt = store.nextEnergyIn();
    const et = this.root.querySelector<HTMLElement>('[data-bind="energy"]');
    if (et) et.title = p.energy >= p.energyMax ? 'Énergie pleine' : `+1 dans ${Math.floor(nxt / 60)}:${String(nxt % 60).padStart(2, '0')}`;
    const xp = this.root.querySelector<HTMLElement>('[data-bind="xp"]');
    if (xp) xp.style.width = `${(p.xp / p.xpMax) * 100}%`;
  }

  /** Taille de l'interface proportionnelle à l'écran (référence : 1920×1080). */
  private applyUiScale(): void {
    const s = Math.min(window.innerWidth / 1920, window.innerHeight / 1080);
    const clamped = Math.max(0.62, Math.min(1.5, s));
    document.documentElement.style.fontSize = `${16 * clamped}px`;
  }

  /* ================= Interactions ================= */

  private onClick(e: MouseEvent): void {
    const target = e.target as HTMLElement;
    this.refreshLocks();
    const action = target.closest<HTMLElement>('[data-action]')?.dataset.action;
    const menu = target.closest<HTMLElement>('[data-menu]')?.dataset.menu;
    const nav = target.closest<HTMLElement>('[data-nav]')?.dataset.nav;

    if (action || menu || nav) audio.click();
    if (action) {
      if (action === 'sound') { store.updateSettings({ muted: !store.settings.muted }); return; }
      if (action === 'nav-min') {
        const next = !store.settings.navCompact;
        store.updateSettings({ navCompact: next });
        this.root.classList.toggle('nav-min', next);
        audio.click();
        return;
      }
      if (action === 'settings') this.openSettings();
      else if (action === 'battle') this.openCampaign();
      else if (action.startsWith('buy-')) this.toast('La boutique ouvrira bientôt');
      else if (action === 'profile') this.openProfile();
      else if (action === 'mail') this.openInfo('Courrier', 'mail', '2 nouveaux messages', 'Les récompenses et messages des développeurs arriveront ici.');
      else if (action === 'chat') this.toast('La discussion arrivera bientôt');
      return;
    }
    if (menu === 'summon') { this.openSummon(); return; }
    if (menu === 'mail') { this.openMail(); return; }
    if (menu === 'achievements') { this.openAchievements(); return; }
    if (menu === 'codex') { this.openCodex(); return; }
    if (menu === 'shop') { this.openShop(); return; }
    if (menu === 'guild') { this.openGuild(); return; }
    if (menu === 'ranking') { this.openRanking(); return; }
    if (menu === 'profile') { this.openProfile(); return; }
    if (menu === 'sanctuaire') { this.openSanctuaire(); return; }
    if (menu) {
      const m = [...LEFT_MENU, ...RIGHT_MENU].find((x) => x.id === menu);
      if (m) this.openInfo(m.label, m.icon, 'Fonctionnalité', m.description);
      return;
    }
    if (nav) {
      if (this.deny(nav)) return;
      if (nav === 'city') { this.emit('recenter', undefined); return; }
      if (nav === 'guild') { this.openGuild(); return; }
      if (nav === 'campaign') { this.openCampaign(); return; }
      if (nav === 'heroes') { this.openHeroes(); return; }
      if (nav === 'tower') { this.openTower(); return; }
      if (nav === 'training') { this.openTraining(); return; }
      if (nav === 'profile') { this.openProfile(); return; }
      const n = NAV.find((x) => x.id === nav);
      if (n) this.openInfo(n.label, n.icon, 'Menu', n.description);
    }
  }

  /* ================= Bulles de dialogue ================= */

  private bubble: { id: string; el: HTMLElement; left: number } | null = null;
  private readonly lineIndex = new Map<string, number>();

  /** Un personnage du hub prend la parole (réplique suivante à chaque clic). */
  talk(id: string): void {
    const t = TALKERS[id];
    if (!t) return;
    const i = this.lineIndex.get(id) ?? Math.floor(Math.random() * t.lines.length);
    this.lineIndex.set(id, (i + 1) % t.lines.length);
    this.bubble?.el.remove();
    const el = document.createElement('div');
    el.className = `npc-bubble${t.hero ? ' is-hero' : ''}`;
    el.innerHTML = `<div class="nb-name">${t.name}</div><div class="nb-text"></div>${t.hero ? `<button class="nb-btn" data-hero-view="${t.hero}">Voir la fiche ›</button>` : ''}`;
    this.labelsRoot.parentElement!.appendChild(el);
    this.bubble = { id, el, left: 4.5 + t.lines[i]!.length * 0.035 };
    // Effet machine à écrire
    const textEl = el.querySelector<HTMLElement>('.nb-text')!;
    const full = t.lines[i]!;
    let n = 0;
    const tick = () => { if (!el.isConnected) return; n += 2; textEl.textContent = full.slice(0, n); if (n < full.length) requestAnimationFrame(tick); };
    tick();
  }

  updateBubble(anchor: (id: string) => { x: number; y: number; visible: boolean } | null, dt: number): void {
    const b = this.bubble;
    if (!b) return;
    b.left -= dt;
    const a = anchor(b.id);
    if (!a || b.left <= 0 || !a.visible) {
      const el = b.el;
      this.bubble = null;
      el.classList.add('out');
      window.setTimeout(() => el.remove(), 300);
      return;
    }
    b.el.style.transform = `translate(${a.x.toFixed(1)}px, ${a.y.toFixed(1)}px) translate(-50%, -100%)`;
  }

  /* ================= Étiquettes ================= */

  updateLabels(positions: LabelPosition[]): void {
    for (const p of positions) {
      const l = this.labels.get(p.id);
      if (!l) continue;
      if (l.shown !== p.visible) {
        l.el.style.visibility = p.visible ? 'visible' : 'hidden';
        l.shown = p.visible;
      }
      const x = Math.round(p.x), y = Math.round(p.y);
      if (x === l.lastX && y === l.lastY) continue;
      l.lastX = x; l.lastY = y;
      l.el.style.transform = `translate(${x}px, ${y}px) translate(-1.3rem, -50%)`;
    }
  }

  setLabelHover(id: string, hovered: boolean): void {
    this.labels.get(id)?.el.classList.toggle('hover', hovered);
  }

  hideHint(): void {
    this.hintEl.classList.add('hidden');
  }

  /* ================= Fenêtres ================= */

  openModal(html: string, glow = '#8a4dffaa', wide: boolean | 'xl' = false): HTMLElement {
    if (this.bubble) { this.bubble.el.remove(); this.bubble = null; }
    this.closeModal(true);
    const backdrop = document.createElement('div');
    backdrop.className = 'modal-backdrop';
    backdrop.innerHTML = `<div class="modal panel ornate ${wide === 'xl' ? 'xl' : wide ? 'wide' : ''}" style="--glow:${glow}">
      <i class="corner tl"></i><i class="corner tr"></i><i class="corner bl"></i><i class="corner br"></i>
      <button class="modal-close" data-close title="Fermer">${icon('close')}</button>${html}</div>`;
    audio.open();
    backdrop.addEventListener('click', (e) => {
      const t = e.target as HTMLElement;
      if (t === backdrop || t.closest('[data-close]')) this.closeModal();
    });
    this.modalRoot.appendChild(backdrop);
    return backdrop;
  }

  closeModal(instant = false): void {
    const m = this.modalRoot.querySelector('.modal-backdrop');
    if (!m) return;
    if (instant) { m.remove(); return; }
    m.classList.add('closing');
    setTimeout(() => m.remove(), 200);
  }

  get isModalOpen(): boolean {
    return !!this.modalRoot.querySelector('.modal-backdrop:not(.closing)');
  }

  openBuilding(def: BuildingDef): void {
    if (def.id === 'campaign') { this.openCampaign(); return; }
    if (def.id === 'sanctuary') { this.openSanctuaire(); return; }
    if (def.id === 'summon') { this.openSummon(); return; }
    const glow = `#${def.glow.toString(16).padStart(6, '0')}aa`;
    this.openModal(`
      <div class="modal-medal">${icon(def.icon)}</div>
      <h2>${def.name}</h2>
      <div class="subtitle">${def.subtitle}</div>
      <div class="divider"></div>
      <p>${def.description}</p>
      <div class="soon">${icon('lock')} Bientôt disponible</div>
      <div class="btn-row"><button class="btn" data-close>Retour à la ville</button></div>`, glow);
  }

  openInfo(title: string, ico: IconName, subtitle: string, text: string): void {
    this.openModal(`
      <div class="modal-medal">${icon(ico)}</div>
      <h2>${title}</h2>
      <div class="subtitle">${subtitle}</div>
      <div class="divider"></div>
      <p>${text}</p>
      <div class="soon">${icon('lock')} Bientôt disponible</div>
      <div class="btn-row"><button class="btn" data-close>Fermer</button></div>`);
  }

  openSettings(): void {
    const s = store.settings;
    const seg = (key: string, options: Array<[string, string]>, current: string) =>
      `<div class="seg" data-seg="${key}">${options.map(([v, l]) => `<button data-v="${v}" class="${v === current ? 'on' : ''}">${l}</button>`).join('')}</div>`;
    const modal = this.openModal(`
      <div class="modal-medal">${icon('gear')}</div>
      <h2>Paramètres</h2>
      <div class="divider"></div>
      <div class="settings">
        <div class="setting"><div><b>Qualité graphique</b><small>« Ultra » = résolution native (écrans 4K) · « Haute » = net jusqu'en 1440p · « Basse » = PC modestes. La résolution s'adapte toute seule si le jeu ralentit.</small></div>
          ${seg('quality', [['ultra', 'Ultra'], ['high', 'Haute'], ['low', 'Basse']], s.quality)}</div>
        <div class="setting"><div><b>Fréquence d'affichage</b><small>« Illimité » suit ton écran : 144 Hz → 144 images/seconde. Baisse cette valeur si le PC chauffe ou si l'image saccade.</small></div>
          ${seg('fpscap', [['0', 'Illimité'], ['144', '144'], ['120', '120'], ['60', '60']], String(s.fpsCap ?? 0))}</div>
        <div class="setting"><div><b>Compteur FPS</b><small>Images par seconde et temps de rendu (touche F)</small></div>
          ${seg('fps', [['on', 'Oui'], ['off', 'Non']], s.showFps ? 'on' : 'off')}</div>
        <div class="setting"><div><b>Noms des bâtiments</b><small>Afficher les étiquettes au-dessus de la ville</small></div>
          ${seg('labels', [['on', 'Oui'], ['off', 'Non']], s.showLabels ? 'on' : 'off')}</div>
        <div class="setting"><div><b>Volume</b><small>Vent, feu, tonnerre et sons de l'interface</small></div>
          <div class="vol"><button class="vol-mute" data-act="mute">${icon(s.muted ? 'mute' : 'volume')}</button>
          <input type="range" min="0" max="100" value="${Math.round(s.volume * 100)}" data-act="volume" /></div></div>
        <div class="setting"><div><b>Plein écran</b><small>Touche Entrée, ou double-clic sur le jeu</small></div>
          <button class="btn dark" data-act="fullscreen">${icon('expand')} ${isFullscreen() ? 'Quitter' : 'Activer'}</button></div>
        <div class="setting"><div><b>Cinématiques d'ultime</b><small>La mise en scène jouée quand un héros lance son ultime. Le laboratoire les fait tourner en grand, un par un.</small></div>
          <div class="ult-pick">${ULT_STYLES.map((x) => `<button data-ult="${x.id}" class="${x.id === getUltStyle() ? 'on' : ''}" title="${x.tag}">${x.letter} · ${x.name}</button>`).join('')}</div></div>
        <div class="setting"><div><b>Laboratoire d'ultimes</b><small>Voir les quatre styles en grand, sur n'importe quel héros, et choisir le sien.</small></div>
          <button class="btn dark" data-act="lab">${icon('star')} Ouvrir</button></div>
        <div class="setting"><div><b>Caméra</b><small>Revenir au centre de la ville</small></div>
          <button class="btn dark" data-act="recenter">${icon('refresh')} Recentrer</button></div>
      </div>
      <div class="btn-row">
        <button class="btn danger" data-act="reset">Effacer la sauvegarde</button>
        <button class="btn" data-close>Fermer</button>
      </div>`, '#d8b45aaa', true);

    modal.querySelectorAll<HTMLElement>('[data-seg]').forEach((segEl) => {
      segEl.addEventListener('click', (e) => {
        const btn = (e.target as HTMLElement).closest<HTMLElement>('[data-v]');
        if (!btn) return;
        segEl.querySelectorAll('button').forEach((b) => b.classList.toggle('on', b === btn));
        const v = btn.dataset.v!;
        if (segEl.dataset.seg === 'quality') store.updateSettings({ quality: v as Quality });
        if (segEl.dataset.seg === 'fps') store.updateSettings({ showFps: v === 'on' });
        if (segEl.dataset.seg === 'labels') store.updateSettings({ showLabels: v === 'on' });
        if (segEl.dataset.seg === 'fpscap') store.updateSettings({ fpsCap: Number(v) });
      });
    });
    const range = modal.querySelector<HTMLInputElement>('[data-act="volume"]');
    range?.addEventListener('input', () => store.updateSettings({ volume: Number(range.value) / 100, muted: false }));
    const muteBtn = modal.querySelector<HTMLElement>('[data-act="mute"]');
    muteBtn?.addEventListener('click', () => {
      store.updateSettings({ muted: !store.settings.muted });
      muteBtn.innerHTML = icon(store.settings.muted ? 'mute' : 'volume');
    });
    const fsBtn = modal.querySelector<HTMLElement>('[data-act="fullscreen"]');
    fsBtn?.addEventListener('click', () => {
      if (!canFullscreen()) { this.toast('Plein écran indisponible dans ce navigateur'); return; }
      if (inIframe()) this.toast('Ouvre le jeu dans un onglet pour le plein écran');
      void toggleFullscreen().then((on) => {
        fsBtn.innerHTML = `${icon('expand')} ${on ? 'Quitter' : 'Activer'}`;
      });
    });
    modal.querySelectorAll<HTMLElement>('[data-ult]').forEach((b) =>
      b.addEventListener('click', () => {
        setUltStyle(b.dataset.ult as ReturnType<typeof getUltStyle>);
        modal.querySelectorAll('[data-ult]').forEach((x) => x.classList.toggle('on', x === b));
        audio.click();
        this.toast(`Style « ${ULT_STYLES.find((x) => x.id === b.dataset.ult)?.name} » sélectionné`);
      }),
    );
    modal.querySelector('[data-act="lab"]')?.addEventListener('click', () => {
      const u = new URL(location.href);
      u.searchParams.set('lab', '1');
      location.href = u.toString();
    });
    modal.querySelector('[data-act="recenter"]')?.addEventListener('click', () => { this.emit('recenter', undefined); this.closeModal(); });
    modal.querySelector('[data-act="reset"]')?.addEventListener('click', () => {
      store.reset();
      this.closeModal();
      this.toast('Sauvegarde effacée');
    });
  }

  private renderBattleButton(): void {
    const sub = this.root.querySelector<HTMLElement>('[data-bind="battle-sub"]');
    if (!sub) return;
    const st = this.nextStage();
    const stars = store.campaign[st.id] ?? 0;
    sub.innerHTML = stars ? `Chapitre ${st.id} <span class="mini-stars">${'★'.repeat(stars)}${'☆'.repeat(3 - stars)}</span>` : `Chapitre ${st.id}`;
  }

  /** Prochain niveau à jouer : le premier débloqué pas encore gagné, sinon le dernier débloqué. */
  private nextStage(): StageDef {
    const open = STAGES.filter(unlocked);
    return open.find((st) => !store.campaign[st.id]) ?? open[open.length - 1]!;
  }

  openSummon(): void {
    this.summon.open();
  }

  /** Fenêtre « cadeau » (gemmes offertes avec la mise à jour de l'autel). */
  showGift(gems: number): void {
    const m = this.openModal(`
      <div class="modal-medal gift">${icon('gift')}</div>
      <h2>Cadeau de l’Autel</h2>
      <div class="subtitle">L’autel d’invocation s’est réveillé !</div>
      <div class="divider"></div>
      <div class="gift-gems">${icon('gem')}<b>+${gems.toLocaleString('fr-FR')}</b><small>gemmes</small></div>
      <p>Trois nouveaux héros répondent désormais à l’appel : <b style="color:#a86bff">Nyx</b>, <b style="color:#8ae0ff">Thorne</b> et <b style="color:#6ad8ff">Ashka</b>. Utilise tes gemmes à l’Autel pour tenter ta chance !</p>
      <div class="btn-row"><button class="btn dark" data-close>Plus tard</button><button class="btn" data-gift>${icon('crystal')} Aller à l’Autel</button></div>`, '#ffd84aaa');
    audio.play('coins', { delay: 0.2 });
    audio.play('star', { delay: 0.4 });
    m.querySelector('[data-gift]')?.addEventListener('click', () => { audio.click(); this.openSummon(); });
  }

  /* ================= Campagne ================= */

  /* ====================== Tour de l'Infini ====================== */

  /**
   * Écran de la Tour.
   *
   * Le mode est volontairement nu : un étage, un record, une composition ennemie,
   * une récompense. Pas d'énergie, pas de perte en cas de défaite — on vient
   * repousser sa limite, pas gérer une ressource.
   */
  openTower(): void {
    const floor = Math.max(1, store.towerFloor);
    const best = store.towerBest;
    const st = towerStage(floor);
    const rewards = towerRewards(floor);
    const firstClear = floor > best;
    const isBoss = floor % 5 === 0;

    const foes: string[] = [];
    const seen = new Set<string>();
    for (const e of st.enemies) {
      if (seen.has(e.def.id)) continue;
      seen.add(e.def.id);
      foes.push(`<div class="tw-foe ${e.boss ? 'boss' : ''}">
        <img src="${ART[(e.def as UnitDef).texture]}" alt="" draggable="false"/>
        <span>${e.def.name}</span>${e.boss ? '<em>BOSS</em>' : ''}
      </div>`);
    }

    const team = store.team();
    const power = teamPower(team);
    const modal = this.openModal(`
      <div class="modal-medal">${icon('tower')}</div>
      <h2>Tour de l'Infini</h2>
      <div class="subtitle">Aucun dernier étage. Aucune énergie dépensée. Une défaite ne coûte rien.</div>
      <div class="tw-head">
        <div class="tw-floor"><small>Étage</small><b>${floor}</b></div>
        <div class="tw-meta">
          <div><span>Record personnel</span><b>${best ? `Étage ${best}` : '—'}</b></div>
          <div><span>Palier</span><b>${best ? `+${floor - best} au-dessus` : 'Premier passage'}</b></div>
          <div><span>Difficulté</span><b>${isBoss ? 'Gardien' : `×${(Math.pow(1.21, towerTier(floor))).toFixed(1)} PV`}</b></div>
        </div>
      </div>
      <div class="tw-bar"><i style="--w:${Math.min(100, (floor % 5) * 20)}%"></i><span>${5 - (floor % 5) || 5} étage(s) avant le prochain gardien</span></div>
      <div class="cd-sec">Ce qui t'attend</div>
      <div class="tw-foes">${foes.join('')}</div>
      <div class="cd-sec">Récompense ${firstClear ? '<span class="cd-first">1<sup>re</sup> victoire</span>' : '<span class="cd-first">étage déjà conquis</span>'}</div>
      <div class="cd-rewards">
        ${firstClear
          ? `<span>${icon('coin')} ${rewards.gold}</span><span>${icon('gem')} ${rewards.gems}</span><span>${icon('star')} ${rewards.xp} XP</span>`
          : `<span>${icon('star')} ${Math.round(rewards.xp * 0.35)} XP</span><span class="tw-note">or et gemmes déjà touchés</span>`}
      </div>
      <div class="cd-power ${power >= st.power ? 'ok' : 'low'}">${icon('swords')} ${power.toLocaleString('fr-FR')} <small>/ conseillé ${st.power.toLocaleString('fr-FR')}</small></div>
      <button class="btn big fight" data-tower="${floor}">${icon('tower')} Gravir l'étage ${floor}</button>`,
    '#8a4dffaa', 'xl');

    modal.addEventListener('click', (e) => {
      const t = e.target as HTMLElement;
      const go = t.closest<HTMLElement>('[data-tower]');
      if (!go) return;
      audio.click();
      const f = Number(go.dataset.tower) || 1;
      const stage = towerStage(f);
      this.formation.open(stage, () => this.emit('startTower', f));
    });
  }

  /* ====================== Profil ====================== */

  /** Statistiques résumées du joueur, utilisées par le profil et les cadres. */
  private profileStats(): ProfileStats {
    const p = store.player;
    return {
      level: p.level,
      power: p.power,
      towerBest: store.towerBest,
      stagesDone: Object.values(store.campaign).filter((x) => x > 0).length,
      collection: HEROES.filter((h) => store.owns(h.id)).length,
      summons: store.summons,
      gems: p.gems,
    };
  }

  /** Cadre du joueur, appliqué au bouton de profil du bandeau. */
  applyFrame(): void {
    const btn = this.root.querySelector<HTMLElement>('.hud-top .avatar-frame');
    if (!btn) return;
    const f = frameById(store.player.frame);
    btn.style.setProperty('--fr', f.css);
    btn.style.setProperty('--fg', f.glow);
  }

  openProfile(): void {
    const p = store.player;
    const st = this.profileStats();
    const team = store.team();
    const avatar = team[0]?.def.id ?? 'kael';
    const unlocked = FRAMES.filter((f) => f.test(st));
    const titles = TITLES.filter((t) => t.test(st));
    const frame = frameById(p.frame);
    const title = titles.find((t) => t.id === p.title) ?? titles[0]!;

    const modal = this.openModal(`
      <div class="modal-medal">${icon('helmet')}</div>
      <h2>Profil</h2>
      <div class="subtitle">Ton nom, ton cadre, ta trace dans la Tour.</div>
      <div class="pf">
        <div class="pf-card">
          <div class="pf-ava" style="--fr:${frame.css};--fg:${frame.glow}">
            <img src="${PORTRAITS[avatar]}" alt=""/>
            <span class="pf-lvl">${p.level}</span>
          </div>
          <div class="pf-id">
            <label class="pf-name">Pseudo <input data-name maxlength="16" value="${p.name.replace(/"/g, '&quot;')}" spellcheck="false"/></label>
            <div class="pf-title">${icon('medal')} ${title.name}</div>
            <div class="pf-power">${icon('swords')} <b>${fmt(p.power)}</b> puissance</div>
          </div>
          <div class="pf-titles"></div>
        </div>
        <div class="pf-stats">
          <div><small>Campagne</small><b>${st.stagesDone}/${CAMPAIGN_LENGTH}</b><em>niveaux</em></div>
          <div><small>Tour</small><b>${st.towerBest || '—'}</b><em>record</em></div>
          <div><small>Collection</small><b>${st.collection}/17</b><em>héros</em></div>
          <div><small>Invocations</small><b>${st.summons}</b><em>au total</em></div>
        </div>
        <div class="cd-sec">Équipe <span class="pf-team-sub">${team.length}/5</span></div>
        <div class="pf-team">${team.map(({ def: h }) => `<div class="pf-hero" style="--c:${h.css}"><img src="${PORTRAITS[h.id]}" alt=""/><span>${h.name.replace('Frère ', '')}</span><small>Niv. ${store.levelOf(h)}</small></div>`).join('')}</div>
        <div class="cd-sec">Cadres <span class="pf-team-sub">${unlocked.length}/${FRAMES.length}</span></div>
        <div class="pf-frames">${FRAMES.map((f) => {
          const ok = f.test(st);
          return `<button class="pf-frame${ok ? '' : ' locked'}${f.id === p.frame ? ' on' : ''}" data-frame="${f.id}" style="--fr:${f.css};--fg:${f.glow}" ${ok ? '' : 'disabled'}>
            <span class="pff-ring"></span><b>${f.name}</b><small>${ok ? (f.id === p.frame ? 'Porté' : 'Débloqué') : f.req}</small></button>`;
        }).join('')}</div>
        <div class="cd-sec">Titres</div>
        <div class="pf-titles-list">${TITLES.map((t) => {
          const ok = t.test(st);
          return `<button class="pf-tit${ok ? '' : ' locked'}${t.id === p.title ? ' on' : ''}" data-title="${t.id}" ${ok ? '' : 'disabled'}>${icon(ok ? 'medal' : 'lock')} <span>${ok ? t.name : t.req}</span></button>`;
        }).join('')}</div>
      </div>
      <div class="btn-row"><button class="btn dark" data-open-rank>${icon('trophy')} Voir le classement</button><button class="btn" data-close-pf>${icon('back')} Fermer</button></div>`, '#d8b45aaa', 'xl');

    const nameInput = modal.querySelector<HTMLInputElement>('[data-name]')!;
    nameInput.addEventListener('input', () => {
      const v = nameInput.value.trim().slice(0, 16) || 'Invocateur';
      store.updatePlayer({ name: v });
      this.renderPlayer(store.player);
    });

    modal.addEventListener('click', (e) => {
      const t = e.target as HTMLElement;
      const fr = t.closest<HTMLElement>('[data-frame]');
      if (fr && !fr.hasAttribute('disabled')) {
        store.setFrame(fr.dataset.frame!);
        audio.click();
        this.applyFrame();
        this.openProfile();
        return;
      }
      const ti = t.closest<HTMLElement>('[data-title]');
      if (ti && !ti.hasAttribute('disabled')) {
        store.setTitle(ti.dataset.title!);
        audio.click();
        this.openProfile();
        return;
      }
      if (t.closest('[data-open-rank]')) { audio.click(); this.openRanking(); }
      else if (t.closest('[data-close-pf]')) { audio.click(); this.closeModal(); }
    });
    this.applyFrame();
  }


  /** Fiche complète d'un bot : on peut enfin voir qui on affronte. */
  private openBotProfile(r: ReturnType<typeof leaderboard>[number]): void {
    const f = frameById(r.frame);
    const modal = this.openModal(`
      <div class="bps" style="--c:${f.glow}">
        <div class="bps-top">
          <div class="bps-ava" style="--fr:${f.css};--fg:${f.glow}"><img src="${PORTRAITS[r.avatar]}" alt=""/></div>
          <div class="bps-id">
            <h2>${r.name}</h2>
            <div class="bps-title">${icon('medal')} ${r.title}</div>
            <div class="bps-frame">Cadre : <b>${f.name}</b> · ${f.req}</div>
          </div>
          <div class="bps-rank">#${r.rank}<small>/${RANK_POPULATION}</small></div>
        </div>
        <div class="bps-stats">
          <div><small>Niveau</small><b>${r.level}</b></div>
          <div><small>Puissance</small><b>${fmt(r.power)}</b></div>
          <div><small>Tour</small><b>${r.floor || '—'}</b></div>
          <div><small>Tendance</small><b class="${r.trend >= 0 ? 'up' : 'down'}">${r.trend >= 0 ? '+' : ''}${fmt(r.trend)}</b></div>
        </div>
        <div class="bps-line">${icon('clock')} ${r.event ?? 'Progresse chaque jour : entraînement, invocations, Tour.'}</div>
        <div class="bps-team"><div class="cd-sec">Équipe visible</div><div class="bps-team-row">
          ${[r.avatar, ...HEROES.filter((h) => h.id !== r.avatar).slice(0, 4).map((h) => h.id)].map((id, i) => `
            <div class="bps-hero"><img src="${PORTRAITS[id]}" alt=""/><span>${HEROES.find((h) => h.id === id)?.name ?? id}</span><small>${i === 0 ? 'Chef d’équipe' : 'Membre'}</small></div>`).join('')}
        </div></div>
        <div class="btn-row">
          <button class="btn" data-defy>${icon('swords')} Défier (amical)</button>
          <button class="btn dark" data-close>Fermer</button>
        </div>
      </div>`, f.glow, true);
    modal.querySelector('[data-defy]')?.addEventListener('click', () => {
      audio.play('ult_ready', { vol: 0.5 });
      this.toast(`${r.name} accepte le défi. Rendez-vous dans l’Arène.`);
    });
    modal.querySelector('[data-close]')?.addEventListener('click', () => this.closeModal());
  }

  /* ====================== Classement ====================== */

  /**
   * Classement mondial : les bots ET le joueur dans la même liste.
   * Le joueur est surligné, et sa ligne reste visible en bas quoi qu'il arrive.
   */
  openRanking(): void {
    const p = store.player;
    const team = store.team();
    const avatar = team[0]?.def.id ?? 'kael';
    const titleName = (TITLES.find((t) => t.id === p.title) ?? TITLES[0]!).name;
    const rows = leaderboard({ name: p.name, power: p.power, floor: store.towerBest, level: p.level, avatar, frame: p.frame, title: titleName });
    const me = rows.find((r) => r.isPlayer)!;
    const day = rankingDay();
    const { season, dayInSeason } = seasonOf(day);
    const frameCss = (id: string): string => frameById(id).css;
    const rowHTML = (r: typeof rows[number]): string => `
      <div class="rk-row${r.isPlayer ? ' me' : ''}${r.rank <= 3 ? ' top' + r.rank : ''}" data-row="${r.rank}" data-bot="${r.isPlayer ? '' : r.name}">
        <div class="rk-pos">${r.rank <= 3 ? ['🥇', '🥈', '🥉'][r.rank - 1] : r.rank}</div>
        <div class="rk-ava" style="--fr:${frameCss(r.frame)}"><img src="${PORTRAITS[r.avatar]}" alt=""/></div>
        <div class="rk-id">
          <b>${r.name}${r.isPlayer ? ' <em>toi</em>' : ''}</b>
          <span>${r.title}</span>
          ${r.event && !r.isPlayer ? `<i>${r.event}</i>` : ''}
        </div>
        <div class="rk-num"><small>Niv.</small><b>${r.level}</b></div>
        <div class="rk-num"><small>Tour</small><b>${r.floor || '—'}</b></div>
        <div class="rk-pow"><small>Puissance</small><b>${fmt(r.power)}</b>${r.trend > 0 ? `<i>+${fmt(r.trend)}</i>` : ''}</div>
      </div>`;

    const podium = rows.slice(0, 3).map((r, i) => `
      <div class="rk-pod p${i + 1}" style="--c:${frameById(r.frame).glow}" data-bot="${r.name}">
        <div class="rk-ava big" style="--fr:${frameCss(r.frame)}"><img src="${PORTRAITS[r.avatar]}" alt=""/></div>
        <b>${r.name}</b><span>${r.title}</span><em>${fmt(r.power)}</em><small>Tour ${r.floor || '—'}</small>
      </div>`).join('');

    const modal = this.openModal(`
      <div class="modal-medal">${icon('trophy')}</div>
      <h2>Classement mondial</h2>
      <div class="subtitle">${RANK_POPULATION} profils · saison ${season} · jour ${dayInSeason + 1} / 120</div>
      <div class="rk-podium">${podium}</div>
      <div class="rk-note">${icon('clock')} Les profils évoluent chaque jour : les bots s'entraînent, invoquent et grimpent pendant que tu joues.</div>
      <div class="rk-head"><span>#</span><span>Joueur</span><span>Niv.</span><span>Tour</span><span>Puissance</span></div>
      <div class="rk-list">${rows.map(rowHTML).join('')}</div>
      <div class="rk-me">
        <span>Ton rang</span><b>${me.rank}<small>/${rows.length}</small></b>
        <div>${icon('swords')} ${fmt(me.power)} <i>score ${fmt(rankScore(me.power, me.floor))}</i></div>
        <button class="btn small" data-jump-me>Me retrouver</button>
      </div>`, '#d8b45aaa', 'xl');

    const list = modal.querySelector<HTMLElement>('.rk-list')!;
    const go = (): void => {
      const row = list.querySelector<HTMLElement>('.rk-row.me');
      // scrollIntoView n'existe pas dans tous les environnements (aperçus, tests).
      if (typeof row?.scrollIntoView === 'function') row.scrollIntoView({ block: 'center' });
      else if (row && list) list.scrollTop = Math.max(0, row.offsetTop - list.clientHeight / 2);
    };
    modal.querySelector('[data-jump-me]')?.addEventListener('click', () => { audio.click(); go(); });
    modal.querySelectorAll<HTMLElement>('[data-bot]').forEach((el) => {
      if (!el.dataset.bot) return;
      el.classList.add('clickable');
      el.addEventListener('click', () => {
        const r = rows.find((x) => x.name === el.dataset.bot);
        if (r && !r.isPlayer) { audio.click(); this.openBotProfile(r); }
      });
    });
    // Ouvre directement sur la zone du joueur si son rang est bas.
    window.setTimeout(go, 60);
  }

  /* ====================== Entraînement ====================== */

  /**
   * Écran d'entraînement.
   *
   * On choisit UN héros, on règle les défenses du mannequin, on lit ses trois
   * capacités, puis on entre dans l'arène. Le mannequin ne riposte pas : le but
   * est de mesurer, pas de survivre.
   */
  openTraining(heroId?: string): void {
    const owned = HEROES.filter((h) => store.owns(h.id));
    let pick = owned.find((h) => h.id === heroId) ?? owned[0];
    if (!pick) return;
    let preset = DUMMY_PRESETS[1]!;

    const modal = this.openModal(`
      <div class="modal-medal">${icon('swords')}</div>
      <h2>Arène d'entraînement</h2>
      <div class="subtitle">Un héros, un mannequin invincible, tous les chiffres à l'écran.</div>
      <div class="tr-wrap">
        <div class="tr-pick">
          <div class="cd-sec">Choisis ton héros</div>
          <div class="tr-heroes"></div>
          <div class="cd-sec">Mannequin</div>
          <div class="tr-presets"></div>
          <p class="tr-hint"></p>
          <div class="tr-sliders">
            <label>Armure <output data-out="armor"></output><input type="range" min="0" max="300" step="10" data-sl="armor"/></label>
            <label>Résistance <output data-out="res"></output><input type="range" min="0" max="300" step="10" data-sl="res"/></label>
          </div>
        </div>
        <div class="tr-detail"></div>
      </div>
      <button class="btn big fight" data-enter>${icon('swords')} Entrer dans l'arène</button>`, '#6ad8ffaa', 'xl');

    const heroesEl = modal.querySelector<HTMLElement>('.tr-heroes')!;
    const presetsEl = modal.querySelector<HTMLElement>('.tr-presets')!;
    const hintEl = modal.querySelector<HTMLElement>('.tr-hint')!;
    const detailEl = modal.querySelector<HTMLElement>('.tr-detail')!;
    const armorInput = modal.querySelector<HTMLInputElement>('[data-sl="armor"]')!;
    const resInput = modal.querySelector<HTMLInputElement>('[data-sl="res"]')!;

    const sync = (): void => {
      armorInput.value = String(preset.armor);
      resInput.value = String(preset.res);
      for (const k of ['armor', 'res'] as const) {
        const out = modal.querySelector<HTMLOutputElement>(`[data-out="${k}"]`);
        if (out) out.textContent = String(k === 'armor' ? preset.armor : preset.res);
      }
      const st = trainingStage(preset.armor, preset.res, pick!.name);
      detailEl.innerHTML = `
        <div class="tr-id" style="--c:${pick!.css}">
          <img src="${PORTRAITS[pick!.id]}" alt=""/>
          <div>
            <span class="hd-rar ${pick!.rarity}">${pick!.rarity}</span>
            <h3>${pick!.name}</h3>
            <em>${pick!.title}</em>
            ${starsHTML(store.starsOf(pick!), 'mini', store.redOf(pick!))}
            <small>Niv. ${store.levelOf(pick!)} · ${fmt(heroPower(pick!, store.starsOf(pick!), store.levelOf(pick!)))} puissance</small>
          </div>
        </div>
        <div class="tr-abil">
          ${(['attack', 'skill', 'ultimate'] as const).map((k) => {
            const a = pick!.abilities[k];
            return `<div class="tr-ab ${k}"><span>${icon(a.icon)}</span><div><small>${k === 'attack' ? 'Attaque' : k === 'skill' ? 'Compétence' : 'Ultime'}</small><b>${a.name}</b><p>${a.text}</p></div></div>`;
          }).join('')}
        </div>
        <div class="tr-dummy">
          <div class="td-art"><img src="${ART.enemy_boneknight}" alt=""/></div>
          <div class="td-txt"><b>${st.enemies[0]!.def.name}</b>
          <span>${preset.text}</span>
          <small>${icon('shield')} ${preset.armor} armure · ${icon('flame')} ${preset.res} résistance</small></div>
        </div>`;
      void st;
    };

    const render = (): void => {
      heroesEl.innerHTML = owned.map((h) => `<button class="tr-h ${h.id === pick!.id ? 'on' : ''}" data-hero="${h.id}" style="--c:${h.css}" title="${h.name}">
        <img src="${PORTRAITS[h.id]}" alt=""/><span>${h.name.replace('Frère ', '')}</span></button>`).join('');
      presetsEl.innerHTML = DUMMY_PRESETS.map((p) => `<button class="tr-p ${p.name === preset.name ? 'on' : ''}" data-preset="${p.name}">${p.name}</button>`).join('');
      hintEl.textContent = preset.text;
      sync();
    };

    modal.addEventListener('input', (e) => {
      const t = e.target as HTMLInputElement;
      if (!t.dataset.sl) return;
      const armor = Number(armorInput.value);
      const res = Number(resInput.value);
      preset = { name: 'Personnalisé', armor, res, text: 'Réglage manuel du mannequin.' };
      modal.querySelectorAll('.tr-p').forEach((b) => b.classList.remove('on'));
      hintEl.textContent = preset.text;
      for (const k of ['armor', 'res'] as const) {
        const out = modal.querySelector<HTMLOutputElement>(`[data-out="${k}"]`);
        if (out) out.textContent = String(k === 'armor' ? armor : res);
      }
      renderDetailOnly();
    });

    const renderDetailOnly = (): void => {
      const st = trainingStage(preset.armor, preset.res, pick!.name);
      const dummy = st.enemies[0]!.def;
      const txt = detailEl.querySelector('.td-txt');
      if (txt) txt.innerHTML = `<b>${dummy.name}</b><span>${preset.text}</span><small>${icon('shield')} ${preset.armor} armure · ${icon('flame')} ${preset.res} résistance</small>`;
    };

    modal.addEventListener('click', (e) => {
      const t = e.target as HTMLElement;
      const h = t.closest<HTMLElement>('[data-hero]');
      if (h) {
        pick = HEROES.find((x) => x.id === h.dataset.hero) ?? pick;
        audio.hover();
        render();
        return;
      }
      const p = t.closest<HTMLElement>('[data-preset]');
      if (p) {
        preset = DUMMY_PRESETS.find((x) => x.name === p.dataset.preset) ?? preset;
        audio.hover();
        render();
        return;
      }
      if (t.closest('[data-enter]')) {
        audio.click();
        this.emit('startTraining', { heroId: pick!.id, armor: preset.armor, res: preset.res });
      }
    });
    render();
  }

  /** Chapitre affiché dans la campagne (mémorisé entre deux ouvertures). */
  private campChapter: number | null = null;

  /** Nom des chapitres (source unique : les données de campagne). */
  private static readonly CHAPTER_NAMES: Record<number, string> = Object.fromEntries(CHAPTERS.map((c) => [c.id, c.name]));

  private static readonly ROMAN = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII', 'XIII', 'XIV', 'XV', 'XVI', 'XVII', 'XVIII', 'XIX', 'XX'];

  openCampaign(selectId?: string): void {
    const chapterOf = (id: string): number => Number(id.split('-')[0]) || 1;
    const chapters = [...new Set(STAGES.map((st) => chapterOf(st.id)))].sort((a, b) => a - b);
    const inChapter = (c: number): StageDef[] => STAGES.filter((st) => chapterOf(st.id) === c);
    const next = this.nextStage();

    // On ouvre sur le chapitre du niveau demandé, sinon sur celui du prochain niveau à jouer.
    let chapter = selectId ? chapterOf(selectId) : (this.campChapter ?? chapterOf(next.id));
    if (!chapters.includes(chapter)) chapter = chapters[0] ?? 1;
    this.campChapter = chapter;

    /** Position des nœuds : une route en zigzag, calculée selon le nombre de niveaux. */
    const layout = (c: number): Array<{ id: string; x: number; y: number; boss: boolean }> => {
      const list = inChapter(c);
      return list.map((st, i) => ({
        id: st.id,
        x: 12 + (76 * i) / Math.max(1, list.length - 1),
        y: i % 2 ? 38 : 58,
        boss: st.enemies.some((e) => e.boss),
      }));
    };

    let nodes = layout(chapter);
    const pathOf = (n: Array<{ x: number; y: number }>): string => n.map((p, i) => `${i ? 'L' : 'M'}${p.x} ${p.y}`).join(' ');

    let selected = (selectId ? STAGES.find((st) => st.id === selectId) : undefined)
      ?? inChapter(chapter).find((st) => unlocked(st) && !(store.campaign[st.id] ?? 0))
      ?? inChapter(chapter)[0]
      ?? next;

    const modal = this.openModal(`
      <div class="modal-medal">${icon('map')}</div>
      <h2>Campagne</h2>
      <div class="subtitle camp-sub"></div>
      <div class="camp-tabs"></div>
      <div class="camp">
        <div class="camp-map">
          <svg viewBox="0 0 100 100" preserveAspectRatio="none" class="camp-path"><path d="${pathOf(nodes)}"/></svg>
          <div class="camp-nodes"></div>
          <div class="camp-fog"></div>
        </div>
        <div class="camp-detail"></div>
      </div>`, '#c2183caa', 'xl');
    const nodesEl = modal.querySelector<HTMLElement>('.camp-nodes')!;
    const detail = modal.querySelector<HTMLElement>('.camp-detail')!;
    const tabsEl = modal.querySelector<HTMLElement>('.camp-tabs')!;
    const subEl = modal.querySelector<HTMLElement>('.camp-sub')!;
    const mapEl = modal.querySelector<HTMLElement>('.camp-map')!;
    const pathEl = modal.querySelector<SVGPathElement>('.camp-path path')!;

    const renderTabs = (): void => {
      tabsEl.innerHTML = chapters.map((c) => {
        const list = inChapter(c);
        const opened = list.some((st) => unlocked(st));
        const done = list.filter((st) => (store.campaign[st.id] ?? 0) > 0).length;
        const name = UI.CHAPTER_NAMES[c] ?? `Chapitre ${c}`;
        return `<button class="camp-tab${c === chapter ? ' active' : ''}${opened ? '' : ' locked'}" ${opened ? `data-ch="${c}"` : `data-locked="req"`}>
          <b>${UI.ROMAN[c - 1] ?? c}</b><span>${name}</span><em>${done}/${list.length}</em>
        </button>`;
      }).join('');
    };

    const render = (): void => {
      renderTabs();
      const list = inChapter(chapter);
      const done = list.filter((st) => (store.campaign[st.id] ?? 0) > 0).length;
      subEl.textContent = `Chapitre ${UI.ROMAN[chapter - 1] ?? chapter} · ${UI.CHAPTER_NAMES[chapter] ?? 'Les Terres Perdues'} · ${done}/${list.length} niveaux`;
      mapEl.style.setProperty('--map', `url('${SCENE_BG[list[0]?.scene ?? 'gallows']}')`);

      nodesEl.innerHTML = nodes.map((n) => {
        const st = STAGES.find((x) => x.id === n.id);
        const open = !!st && unlocked(st);
        const stars = store.campaign[n.id] ?? 0;
        const cls = `${open ? 'open' : 'locked'} ${st?.id === selected.id ? 'selected' : ''} ${n.boss ? 'boss' : ''} ${stars ? 'cleared' : ''}`;
        return `<button class="camp-node ${cls}" style="left:${n.x}%;top:${n.y}%" ${open ? `data-stage="${n.id}"` : `data-locked="${st ? 'req' : 'soon'}"`}>
          <span class="cn-ring">${open ? icon('swords') : n.boss ? icon('skull') : icon('lock')}</span>
          <b>${n.id}</b>
          ${open ? `<span class="cn-stars">${[1, 2, 3].map((i) => `<i class="${i <= stars ? 'on' : ''}">★</i>`).join('')}</span>` : `<small>${st?.requires ? `Gagne ${st.requires}` : 'Bientôt'}</small>`}
        </button>`;
      }).join('');

      const st = selected;
      const stars = store.campaign[st.id] ?? 0;
      const seen = new Set<string>();
      const foes = st.enemies.filter((e) => !seen.has(e.def.id) && seen.add(e.def.id));
      const enemyCards = foes.map((e) => `
        <div class="camp-enemy ${e.boss ? 'boss' : ''}">
          <img src="${ART[(e.def as UnitDef).texture]}" alt="" draggable="false"/>
          <span>${e.def.name}</span>${e.boss ? '<em>BOSS</em>' : ''}
        </div>`).join('');
      const team = store.team();
      const power = teamPower(team);
      detail.innerHTML = `
        <div class="cd-scene" style="--bg:url('${SCENE_BG[st.scene]}')"><div class="cd-head"><b>${st.id}</b><span>${st.name}</span></div></div>
        <p class="cd-desc">${st.description}</p>
        <div class="cd-profile ${STAGE_PROFILE_TEXT[stageProfile(st)].css}">
          ${icon(stageProfile(st) === 'res' ? 'shield' : stageProfile(st) === 'armor' ? 'flame' : 'swords')}
          <b>${STAGE_PROFILE_TEXT[stageProfile(st)].tag}</b><span>${STAGE_PROFILE_TEXT[stageProfile(st)].hint}</span>
        </div>
        <div class="cd-sec">Classes ennemies</div>
        <div class="cd-classes">${(() => {
          const fc = classCounts(st.enemies.map((e) => e.def));
          const present = CLASS_LIST.filter((c) => fc[c] > 0).sort((a, b) => fc[b] - fc[a]);
          const top = present[0] ?? 'combat';
          const ans = classBeatenBy(top);
          return present.map((c) => `<span class="cls-chip" style="--cc:${CLASSES[c].css}">${icon(CLASSES[c].icon)} ${CLASSES[c].name}<b>×${fc[c]}</b></span>`).join('')
            + `<span class="cls-advice" style="--cc:${CLASSES[ans].css}">${icon('swords')} Fort contre : <b>${CLASSES[ans].name}</b></span>`;
        })()}</div>
        <div class="cd-sec">Ennemis</div>
        <div class="camp-enemies">${enemyCards}</div>
        <div class="cd-sec">Ton équipe <span class="cd-power ${power >= st.power ? 'ok' : 'low'}">${icon('swords')} ${power.toLocaleString('fr-FR')} <small>/ conseillé ${st.power.toLocaleString('fr-FR')}</small></span></div>
        <div class="camp-team">${team.map(({ def: h }) => `<div class="ct-hero" style="--c:${h.css}" title="${h.name}"><img src="${PORTRAITS[h.id]}" alt=""/><span>${h.name.replace('Frère ', '')}</span></div>`).join('')}</div>
        <div class="cd-sec">Récompenses ${stars ? '' : '<span class="cd-first">1<sup>re</sup> victoire</span>'}</div>
        <div class="cd-rewards">
          <span>${icon('coin')} ${st.rewards.gold}</span><span>${icon('gem')} ${st.rewards.gems}</span><span>${icon('star')} ${st.rewards.xp} XP</span>
        </div>
        <button class="btn big fight" data-start="${st.id}">${icon('swords')} Préparer le combat <small>${icon('bolt')} ${st.energy}</small></button>`;
    };

    modal.addEventListener('click', (e) => {
      const t = e.target as HTMLElement;
      const tab = t.closest<HTMLElement>('[data-ch]');
      const node = t.closest<HTMLElement>('[data-stage]');
      const locked = t.closest<HTMLElement>('[data-locked]');
      if (tab) {
        const c = Number(tab.dataset.ch);
        if (c !== chapter) {
          chapter = c;
          this.campChapter = c;
          nodes = layout(chapter);
          pathEl.setAttribute('d', pathOf(nodes));
          const list = inChapter(chapter);
          selected = list.find((st) => unlocked(st) && !(store.campaign[st.id] ?? 0)) ?? list[0] ?? next;
          audio.hover();
          render();
        }
        return;
      }
      if (node) {
        const st = STAGES.find((x) => x.id === node.dataset.stage);
        if (st && st !== selected) { selected = st; audio.hover(); render(); }
      } else if (locked) {
        this.toast(locked.dataset.locked === 'req' ? 'Termine le niveau précédent !' : 'Ce contenu arrive bientôt !');
      } else if (t.closest('[data-start]')) {
        audio.click();
        const st = selected;
        this.formation.open(st, () => this.emit('startStage', st.id));
      }
    });
    render();
  }

  /* ================= Héros ================= */

  /* ================= Déblocage par la campagne (point 12) ================= */

  /** Nombre de niveaux terminés. */
  private doneCount(): number { return store.campaignDone(); }

  /** Seuil de déblocage d'une fonction (0 = disponible tout de suite). */
  private static readonly NEED: Record<string, number> = {
    campaign: 0, city: 0, heroes: 0, bag: 0, tower: 0, ranking: 0, codex: 0, profile: 0,
    sanctuaire: 5, training: 5, achievements: 10, shop: 10, guild: 15, events: 25,
  };

  private locked(id: string): boolean { return this.doneCount() < (UI.NEED[id] ?? 0); }

  /** Grise les boutons verrouillés et affiche le cadenas. */
  private refreshLocks(): void {
    this.root.querySelectorAll<HTMLElement>('[data-menu],[data-nav]').forEach((b) => {
      const id = b.dataset.menu ?? b.dataset.nav ?? '';
      const need = UI.NEED[id] ?? 0;
      const lock = this.doneCount() < need;
      b.classList.toggle('locked', lock);
      let tag = b.querySelector<HTMLElement>('.lock-tag');
      if (lock && !tag) {
        tag = document.createElement('span');
        tag.className = 'lock-tag';
        tag.textContent = `🔒 ${need}`;
        b.appendChild(tag);
      } else if (!lock && tag) tag.remove();
    });
  }

  private deny(id: string): boolean {
    if (!this.locked(id)) return false;
    const need = UI.NEED[id] ?? 0;
    audio.close();
    this.toast(`Verrouillé : termine ${need} niveaux de campagne (${this.doneCount()}/${need})`);
    return true;
  }

  /* ================= Courrier ================= */

  private static readonly MAILS = [
    { id: 'm1', from: 'La Tour', subject: 'Bienvenue dans l’escalier', body: 'Tu as gravi le premier palier. La Tour t’a vu. Prends ça, et continue.', reward: { gems: 200 }, need: 0 },
    { id: 'm2', from: 'Le Forgeron', subject: 'Une lame pour ton premier sang', body: 'J’ai vu tes hommes tomber au chapitre 1. Tiens, de quoi tenir debout.', reward: { gold: 3000 }, need: 5 },
    { id: 'm3', from: 'Intendant de Cendrebourg', subject: 'Ration de campagne', body: 'L’énergie manque à tout le monde. Voilà de quoi frapper encore un peu.', reward: { energy: 30 }, need: 10 },
    { id: 'm4', from: 'La Guilde des Veuves', subject: 'Une place à notre table', body: 'Tu as survécu à dix chapitres. Rejoins une guilde : on ne grimpe pas seul.', reward: { gems: 300 }, need: 25 },
    { id: 'm5', from: 'L’Œil de la Tour', subject: 'Je te regarde', body: 'Personne n’arrive jusqu’ici. Toi, si. Prends ce qui reste.', reward: { gold: 12000, gems: 500 }, need: 50 },
  ];

  openMail(): void {
    const list = UI.MAILS.filter((m) => this.doneCount() >= m.need);
    const modal = this.openModal(`
      <div class="modal-medal">${icon('mail')}</div>
      <h2>Courrier</h2>
      <div class="subtitle">${list.filter((m) => !store.hasFlag('mail:' + m.id)).length} message(s) à récupérer</div>
      <div class="mail-list">${list.map((m) => {
        const got = store.hasFlag('mail:' + m.id);
        const rw = [m.reward.gold ? `${fmt(m.reward.gold)} or` : '', m.reward.gems ? `${fmt(m.reward.gems)} gemmes` : '', m.reward.energy ? `+${m.reward.energy} énergie` : ''].filter(Boolean).join(' · ');
        return `<div class="mail-item${got ? ' got' : ''}">
          <div class="mi-from">${m.from}</div>
          <b>${m.subject}</b>
          <p>${m.body}</p>
          <div class="mi-foot"><span>${icon('gift')} ${rw}</span>
          ${got ? '<em>Récupéré</em>' : `<button class="btn small" data-claim="${m.id}">Récupérer</button>`}</div>
        </div>`;
      }).join('')}</div>`, '#d8b45aaa', true);
    modal.querySelectorAll<HTMLElement>('[data-claim]').forEach((b) =>
      b.addEventListener('click', () => {
        const m = UI.MAILS.find((x) => x.id === b.dataset.claim)!;
        store.grant(m.reward);
        store.setFlag('mail:' + m.id);
        audio.play('coins', { vol: 0.7 });
        this.toast('Récompense récupérée');
        this.openMail();
      }),
    );
  }

  /* ================= Succès ================= */

  openAchievements(): void {
    if (this.deny('achievements')) return;
    const st = this.profileStats();
    const items = [
      { id: 'a1', name: 'Premier sang', desc: 'Terminer 1 niveau', cur: st.stagesDone, goal: 1, reward: { gems: 50 } },
      { id: 'a2', name: 'Marcheur', desc: 'Terminer 25 niveaux', cur: st.stagesDone, goal: 25, reward: { gems: 250 } },
      { id: 'a3', name: 'Le monde entier', desc: 'Terminer les 100 niveaux', cur: st.stagesDone, goal: 100, reward: { gems: 2000 } },
      { id: 'a4', name: 'Grimpeur', desc: 'Atteindre l’étage 25 de la Tour', cur: st.towerBest, goal: 25, reward: { gold: 5000 } },
      { id: 'a5', name: 'Sans fond', desc: 'Atteindre l’étage 60', cur: st.towerBest, goal: 60, reward: { gems: 600 } },
      { id: 'a6', name: 'Collectionneur', desc: 'Posséder 20 héros', cur: st.collection, goal: 20, reward: { gems: 400 } },
      { id: 'a7', name: 'Invocateur', desc: 'Faire 100 invocations', cur: st.summons, goal: 100, reward: { gems: 500 } },
      { id: 'a8', name: 'Vétéran', desc: 'Atteindre le niveau de compte 30', cur: st.level, goal: 30, reward: { gold: 8000 } },
    ];
    const modal = this.openModal(`
      <div class="modal-medal">${icon('medal')}</div>
      <h2>Succès</h2>
      <div class="subtitle">${items.filter((i) => i.cur >= i.goal && !store.hasFlag('ach:' + i.id)).length} à récupérer · ${items.filter((i) => i.cur >= i.goal).length}/${items.length} accomplis</div>
      <div class="ach-list">${items.map((i) => {
        const done = i.cur >= i.goal;
        const got = store.hasFlag('ach:' + i.id);
        const pct = Math.min(100, (i.cur / i.goal) * 100);
        return `<div class="ach-item${done ? ' done' : ''}">
          <div class="ach-ico">${icon(done ? 'medal' : 'lock')}</div>
          <div class="ach-txt"><b>${i.name}</b><span>${i.desc}</span>
            <div class="ach-bar"><i style="width:${pct}%"></i></div>
            <small>${Math.min(i.cur, i.goal)} / ${i.goal}</small></div>
          <div class="ach-rw">${i.reward.gold ? `${fmt(i.reward.gold)} or` : `${fmt(i.reward.gems!)} gemmes`}
          ${got ? '<em>OK</em>' : done ? `<button class="btn small" data-ach="${i.id}">Récupérer</button>` : ''}</div>
        </div>`;
      }).join('')}</div>`, '#d8b45aaa', true);
    modal.querySelectorAll<HTMLElement>('[data-ach]').forEach((b) =>
      b.addEventListener('click', () => {
        const i = items.find((x) => x.id === b.dataset.ach)!;
        store.grant(i.reward);
        store.setFlag('ach:' + i.id);
        audio.confirm();
        this.openAchievements();
      }),
    );
  }

  /* ================= Codex ================= */

  openCodex(): void {
    const bosses = Object.values(BOSSES).filter((b) => b.id.startsWith('boss_'));
    let tab: 'heroes' | 'beasts' | 'bosses' = 'heroes';
    const modal = this.openModal(`
      <div class="modal-medal">${icon('book')}</div>
      <h2>Codex</h2>
      <div class="subtitle">Tout ce que la Tour a avalé : ${HEROES.length} héros · ${Object.keys(ENEMIES).length} créatures · ${bosses.length} boss</div>
      <div class="cx-tabs">
        <button class="cx-tab on" data-tab="heroes">Héros</button>
        <button class="cx-tab" data-tab="beasts">Créatures</button>
        <button class="cx-tab" data-tab="bosses">Boss</button>
      </div>
      <div class="cx-body"></div>`, '#8a4dffaa', 'xl');
    const body = modal.querySelector<HTMLElement>('.cx-body')!;
    const draw = (): void => {
      if (tab === 'heroes') {
        body.innerHTML = `<div class="cx-grid">${HEROES.map((h) => `
          <div class="cx-card" style="--c:${h.css}">
            <img src="${PORTRAITS[h.id]}" alt=""/>
            <div><b>${h.name}</b><span class="sc-rar ${h.rarity}">${h.rarity}</span>
            <em>${h.title} · ${h.role}</em>
            <small>${CLASSES[h.cls].name} · ${store.owns(h.id) ? starsHTML(store.starsOf(h), 'mini', store.redOf(h)) : 'non invoqué'}</small></div>
          </div>`).join('')}</div>`;
      } else if (tab === 'beasts') {
        body.innerHTML = `<div class="cx-beasts">${Object.values(ENEMIES).map((e) => `
          <div class="cx-beast"><b>${e.name}</b><div><span>PV ${fmt(e.stats.hp)}</span><span>ATQ ${fmt(e.stats.atk)}</span><span>Armure ${e.stats.armor}</span><span>Rés. ${e.stats.res}</span></div></div>`).join('')}</div>`;
      } else {
        body.innerHTML = `<div class="cx-beasts">${bosses.map((b) => `
          <div class="cx-beast boss"><b>${b.name}</b>
            <div><span>Ultime : <em>${b.bossUlt!.name}</em></span><span>${b.bossUlt!.kind}</span></div>
            <small>${b.bossUlt!.text}</small></div>`).join('')}</div>`;
      }
    };
    modal.querySelectorAll<HTMLElement>('[data-tab]').forEach((b) =>
      b.addEventListener('click', () => {
        tab = b.dataset.tab as typeof tab;
        modal.querySelectorAll('.cx-tab').forEach((x) => x.classList.toggle('on', x === b));
        audio.hover();
        draw();
      }),
    );
    draw();
  }

  /* ================= Boutique ================= */

  openShop(): void {
    if (this.deny('shop')) return;
    const offers = [
      { id: 's1', name: 'Bourse d’or', desc: '3 000 pièces d’or', cost: 120, cur: 'gems', give: { gold: 3000 } },
      { id: 's2', name: 'Coffre d’or', desc: '12 000 pièces d’or', cost: 400, cur: 'gems', give: { gold: 12000 } },
      { id: 's3', name: 'Ration d’énergie', desc: '+30 énergie tout de suite', cost: 60, cur: 'gems', give: { energy: 30 } },
    ];
    const modal = this.openModal(`
      <div class="modal-medal">${icon('shop')}</div>
      <h2>Boutique</h2>
      <div class="subtitle">${fmt(store.player.gems)} gemmes disponibles</div>
      <div class="shop-grid">${offers.map((o) => `
        <div class="shop-item">
          <div class="si-ico">${icon(o.give.gold ? 'coin' : 'crystal')}</div>
          <b>${o.name}</b><span>${o.desc}</span>
          <button class="btn small" data-buy="${o.id}">${fmt(o.cost)} gemmes</button>
        </div>`).join('')}</div>
      <div class="shop-note">Pour l’instant, tout s’achète avec les gemmes gagnées en jeu. Aucun paiement réel.</div>`, '#d8b45aaa', true);
    modal.querySelectorAll<HTMLElement>('[data-buy]').forEach((b) =>
      b.addEventListener('click', () => {
        const o = offers.find((x) => x.id === b.dataset.buy)!;
        if (store.player.gems < o.cost) { audio.close(); this.toast('Pas assez de gemmes'); return; }
        store.grant({ gems: -o.cost });
        store.grant(o.give);
        audio.play('coins', { vol: 0.7 });
        this.toast(`${o.name} acheté`);
        this.openShop();
      }),
    );
  }

  /* ================= Guilde ================= */

  openGuild(): void {
    if (this.deny('guild')) return;
    const g = guildById(store.guild);
    if (!g) {
      const list = GUILDS;
      const modal = this.openModal(`
        <div class="modal-medal">${icon('banner')}</div>
        <h2>Guildes</h2>
        <div class="subtitle">Des guildes vivantes, tenues par de vrais joueurs simulés. Choisis la tienne.</div>
        <div class="gl-list">${list.map((x) => `
          <div class="gl-item" style="--c:${x.color}">
            <div class="gl-emb" style="--c:${x.color}">${x.emblem}</div>
            <div class="gl-txt"><b>${x.name}</b><span>${x.motto}</span>
              <small>Niv. ${x.level} · ${x.members}/${x.capacity} membres · ${fmt(x.power)} puissance · min. niv. ${x.minLevel}</small></div>
            <div class="gl-rank">#${x.rank}<small>mondial</small></div>
            <button class="btn small" data-join="${x.id}" ${store.player.level < x.minLevel ? 'disabled' : ''}>${store.player.level < x.minLevel ? `Niv. ${x.minLevel}` : 'Rejoindre'}</button>
          </div>`).join('')}</div>`, '#8a4dffaa', 'xl');
      modal.querySelectorAll<HTMLElement>('[data-join]').forEach((b) =>
        b.addEventListener('click', () => {
          store.joinGuild(b.dataset.join!);
          audio.confirm();
          this.toast('Guilde rejointe !');
          this.openGuild();
        }),
      );
      return;
    }
    const members = guildMembers(g.id);
    const chat = guildChat(g.id);
    const modal = this.openModal(`
      <div class="modal-medal" style="--c:${g.color}">${g.emblem}</div>
      <h2>${g.name}</h2>
      <div class="subtitle">${g.motto} · niveau ${g.level} · #${g.rank} mondial</div>
      <div class="gl-head">
        <div><small>Puissance</small><b>${fmt(g.power)}</b></div>
        <div><small>Membres</small><b>${g.members}/${g.capacity}</b></div>
        <div><small>Ma contribution</small><b>${fmt(playerWeekly(store.player.power, store.player.level))}/sem.</b></div>
        <button class="btn small danger" data-leave>Quitter</button>
      </div>
      <div class="gl-cols">
        <div><div class="cd-sec">Membres</div><div class="gl-members">${members.map((m) => `
          <div class="gl-mem${m.role === 'Chef' ? ' chief' : ''}">
            <img src="${PORTRAITS[m.avatar]}" alt=""/>
            <div><b>${m.name}</b><span class="gl-role r-${m.role.toLowerCase()}">${m.role}</span>
              <small>Niv. ${m.level} · ${fmt(m.power)}</small></div>
            <div class="gl-week"><b>${fmt(m.weekly)}</b><small>pts</small></div>
            <i class="gl-dot${m.online ? ' on' : ''}" title="${m.online ? 'En ligne' : `Vu il y a ${m.seen} h`}"></i>
          </div>`).join('')}</div></div>
        <div><div class="cd-sec">Discussion de guilde</div><div class="gl-chat">${chat.map((c) => `
          <div class="gl-msg ${c.tag}"><b>${c.who}</b><span>${c.text}</span></div>`).join('')}</div></div>
      </div>`, '#8a4dffaa', 'xl');
    modal.querySelector('[data-leave]')?.addEventListener('click', () => {
      store.leaveGuild();
      audio.close();
      this.toast('Tu as quitté la guilde');
      this.openGuild();
    });
  }

  /* ================= Le Sanctuaire ================= */

  /**
   * Sanctuaire : le seul endroit où les héros gagnent des étoiles.
   * Étoiles jaunes = de la nourriture (doublons) ; étoiles rouges = le endgame
   * (doublon du même héros, puis sacrifice d'un héros de même rareté).
   */
  openSanctuaire(id?: string): void {
    const owned = HEROES.filter((h) => store.owns(h.id));
    let sel = id && store.owns(id) ? id : owned.find((h) => store.redOf(h) > 0)?.id ?? owned[0]!.id;
    const modal = this.openModal('<div class="sanct"></div>', '#ff3b5caa', 'xl');
    const root = modal.querySelector<HTMLElement>('.sanct')!;

    const card = (h: HeroDef): string => {
      const on = h.id === sel ? 'on' : '';
      return `<button class="sc-card ${on}" data-id="${h.id}" style="--c:${h.css}">
        <img src="${PORTRAITS[h.id]}" alt="" draggable="false"/>
        <span class="sc-rar ${h.rarity}">${h.rarity}</span>
        <b>${h.name}</b>
        ${starsHTML(store.starsOf(h), 'mini', store.redOf(h))}
      </button>`;
    };

    const render = (): void => {
      const st = store.starState();
      const gold = store.player.gold;
      const d = HEROES.find((h) => h.id === sel)!;
      const stars = store.starsOf(d);
      const red = store.redOf(d);
      const maxRed = MAX_RED[d.rarity];
      const yellow = stars < MAX_STARS ? planYellow(st, d, stars) : null;
      const redPlan = stars >= MAX_STARS ? planRed(st, d, red) : null;
      const food = foodStock(st, d);
      const goldOk = (n: number): boolean => gold >= n;
      const nameOf = (hid: string): string => HEROES.find((h) => h.id === hid)?.name ?? hid;
      const meltable = HEROES.filter((h) => h.rarity === 'R').reduce((s, h) => s + (st.dupes[h.id] ?? 0), 0);

      const yellowBlock = (() => {
        if (stars >= MAX_STARS) return '<div class="sc-op done"><b>5★ atteint</b><span>Place aux étoiles rouges.</span></div>';
        if (!yellow) {
          return `<div class="sc-op off"><b>Étoile ${stars + 1}★ impossible</b><span>Il faut 1 doublon ${d.rarity} (tu en as ${food.same}) ou 3 doublons R (tu en as ${food.r}).</span></div>`;
        }
        const cost = yellow.dupes.map((x) => `${x.count}× ${nameOf(x.id)}`).join(' + ');
        return `<button class="sc-op ${goldOk(yellow.gold) ? 'go' : 'off'}" data-op="yellow" ${goldOk(yellow.gold) ? '' : 'disabled'}>
          <b>Monter ${stars + 1}★ jaune</b>
          <span>${fmt(yellow.gold)} or · ${cost}</span>
        </button>`;
      })();

      const redBlock = (() => {
        if (stars < MAX_STARS) return `<div class="sc-op off"><b>✦ rouge verrouillée</b><span>Le héros doit d’abord atteindre 5★ jaunes.</span></div>`;
        if (red >= maxRed) return `<div class="sc-op done"><b>Plafond atteint : ${maxRed}✦</b><span>Un ${d.rarity} ne peut pas aller plus loin.</span></div>`;
        if (!redPlan) {
          const why = red === 0
            ? `Il faut un doublon de ${d.name} (tu en as ${store.dupesOf(d.id)}).`
            : `Il faut un autre ${d.rarity} 5★ qui a déjà ${red}✦ rouge.`;
          return `<div class="sc-op off"><b>✦${red + 1} impossible</b><span>${why}</span></div>`;
        }
        const sac = redPlan.sacrifice ? `Sacrifie ${nameOf(redPlan.sacrifice)} (5★ ${'✦'.repeat(red)})` : `Consomme 1 doublon de ${d.name}`;
        return `<button class="sc-op red ${goldOk(redPlan.gold) ? 'go' : 'off'}" data-op="red" ${goldOk(redPlan.gold) ? '' : 'disabled'}>
          <b>Forger ✦${red + 1} rouge</b>
          <span>${fmt(redPlan.gold)} or · ${sac}</span>
        </button>`;
      })();

      const sac = redPlan?.sacrifice ? HEROES.find((h) => h.id === redPlan.sacrifice) : null;

      root.innerHTML = `
        <div class="sc-head">
          <div>
            <div class="sc-kicker">Autel des âmes</div>
            <h2>Sanctuaire</h2>
            <div class="subtitle">Aucune fusion automatique : c’est toi qui montes chaque étoile, ici.</div>
          </div>
          <div class="sc-wallet">
            <span>${icon('coin')} ${fmt(gold)} or</span>
            <button class="sc-melt" data-op="melt" ${meltable ? '' : 'disabled'}>Fondre les R · ${meltable} → ${fmt(meltable * 300)} or</button>
          </div>
        </div>
        <div class="sc-body">
          <div class="sc-list">${owned.map(card).join('')}</div>
          <div class="sc-detail" style="--c:${d.css}">
            <div class="sc-art"><img src="${ART[d.texture as keyof typeof ART] ?? PORTRAITS[d.id]}" alt=""/></div>
            <div class="sc-info">
              <div class="sc-name"><b>${d.name}</b><span class="sc-rar ${d.rarity}">${d.rarity}</span></div>
              <div class="sc-stars">${starsHTML(stars, '', red)}</div>
              <div class="sc-meta">Niv. ${store.levelOf(d)} · ${fmt(store.powerOf(d))} puissance · qualité native ×${QUALITY[d.rarity].toFixed(2)}</div>
              ${d.rarity === 'R' ? '<div class="sc-warn">Un R, même à 5★ + 3✦, reste sous un SSR natif : c’est la règle du Sanctuaire.</div>' : ''}
              <div class="sc-ops">${yellowBlock}${redBlock}</div>
              ${sac ? `<div class="sc-sac"><span>Va être sacrifié</span><img src="${PORTRAITS[sac.id]}" alt=""/><b>${sac.name}</b><em>${starsHTML(5, 'mini', red - 1)}</em></div>` : ''}
              <div class="sc-stock">En réserve : <b>${food.same}</b> doublon(s) ${d.rarity} · <b>${food.r}</b> doublon(s) R · <b>${store.dupesOf(d.id)}</b> doublon(s) de ${d.name}</div>
            </div>
          </div>
        </div>
        <div class="sc-rules">
          <b>Les règles, noir sur blanc</b>
          <ul>
            <li><em>Étoiles jaunes 3★ → 5★ :</em> 1 doublon de la même rareté, ou 3 doublons R. Les R sont la nourriture de base.</li>
            <li><em>Étoile rouge ✦1 :</em> un doublon du même héros (le perso une deuxième fois).</li>
            <li><em>Étoile rouge ✦2 et + :</em> on sacrifie un autre héros de la même rareté qui possède déjà une étoile rouge de moins. Il disparaît définitivement.</li>
            <li><em>Plafonds :</em> R → 3✦ · SR → 4✦ · SSR → 5✦.</li>
            <li><em>Qualité native :</em> un R à fond vaut ~91 % d’un SSR natif de base. Un SSR natif garde toujours l’avantage.</li>
          </ul>
        </div>`;

      root.querySelectorAll<HTMLElement>('[data-id]').forEach((b) =>
        b.addEventListener('click', () => { audio.hover(); sel = b.dataset.id!; render(); }),
      );
      root.querySelector('[data-op="yellow"]')?.addEventListener('click', () => {
        const r = store.yellowStar(d.id);
        if (r.ok) { audio.confirm(); this.toast(`${d.name} passe à ${store.starsOf(d)}★`); }
        else { audio.close(); this.toast(r.reason ?? 'Impossible'); }
        render();
      });
      root.querySelector('[data-op="red"]')?.addEventListener('click', () => {
        const r = store.redStar(d.id);
        if (r.ok) {
          audio.play('ult_ready', { vol: 0.6 });
          this.toast(`${d.name} forge sa ✦${store.redOf(d)} rouge${r.sacrificed ? ` (${nameOf(r.sacrificed)} sacrifié)` : ''}`);
        } else { audio.close(); this.toast(r.reason ?? 'Impossible'); }
        render();
      });
      root.querySelector('[data-op="melt"]')?.addEventListener('click', () => {
        const r = store.meltRDupes();
        if (r.count) { audio.play('coins', { vol: 0.7 }); this.toast(`${r.count} doublons R fondus · +${fmt(r.gold)} or`); }
        else this.toast('Aucun doublon R à fondre');
        render();
      });
    };
    render();
  }

  openHeroes(selected = HEROES[0]!.id): void {
    const team = store.teamIds;
    const modal = this.openModal(`
      <div class="modal-medal">${icon('helmet')}</div>
      <h2>Héros</h2>
      <div class="subtitle">Ta compagnie · ${collectionText()} · Puissance de l’équipe ${teamPower(store.team()).toLocaleString('fr-FR')}</div>
      <div class="cls-wheel">${CLASS_LIST.map((c: HeroClass) => `<span class="cw-step" style="--cc:${CLASSES[c].css}">${icon(CLASSES[c].icon)} ${CLASSES[c].name}<em>+${Math.round((classMultiplier(c, CLASSES[c].strong) - 1) * 100)} %</em></span>`).join('<i class="cw-arrow">›</i>')}</div>
      <div class="cls-wheel-note">Chaque classe bat la suivante. Deux héros de la même classe gagnent ${Math.round(CLASS_SYNERGY * 100)} % de PV et d’ATQ par allié supplémentaire.</div>
      <div class="heroes">
        <div class="hero-list">
          ${HEROES.map((h) => {
            const owned = store.owns(h.id);
            return `
            <button class="hl-item ${owned ? '' : 'locked'}" data-hero="${h.id}" style="--c:${h.css}">
              <img src="${PORTRAITS[h.id]}" alt="" draggable="false"/>
              <span class="hl-rar ${h.rarity}">${h.rarity}</span>
              <span class="hl-cls" style="--cc:${CLASSES[h.cls].css}" title="${CLASSES[h.cls].name} — ${CLASSES[h.cls].motto}">${icon(CLASSES[h.cls].icon)}</span>
              ${team.includes(h.id) ? `<span class="hl-team" title="Dans l’équipe">${icon('swords')}</span>` : ''}
              <div class="hl-txt"><b>${h.name}</b>${owned ? starsHTML(store.starsOf(h), 'mini', store.redOf(h)) : `<small>${icon('lock')} À invoquer</small>`}</div>
            </button>`;
          }).join('')}
        </div>
        <div class="hero-detail"></div>
      </div>`, '#8a4dffaa', 'xl');
    const detail = modal.querySelector<HTMLElement>('.hero-detail')!;
    const show = (id: string) => {
      const h = HEROES.find((x) => x.id === id)!;
      modal.querySelectorAll<HTMLElement>('[data-hero]').forEach((b) => b.classList.toggle('on', b.dataset.hero === id));
      detail.style.setProperty('--c', h.css);
      detail.classList.toggle('locked', !store.owns(h.id));
      detail.innerHTML = this.heroDetailHTML(h);
      detail.querySelector('[data-go-summon]')?.addEventListener('click', () => { audio.click(); this.openSummon(); });
      const doLevel = (n: number) => {
        const gained = store.levelUp(h.id, n);
        if (gained === 0) { audio.close(); this.toast('Pas assez d’or'); return; }
        audio.confirm();
        const tierNow = store.skillTierOf(h);
        if (tierNow > skillTiers(store.levelOf(h) - 1)) {
          this.toast(`${h.name} atteint le palier de compétence ${tierNow} !`);
          audio.play('ult_ready', { vol: 0.7 });
        } else {
          this.toast(`${h.name} passe au niveau ${store.levelOf(h)}`);
        }
        show(id);
      };
      detail.querySelector('[data-levelup]')?.addEventListener('click', () => doLevel(1));
      detail.querySelector('[data-levelup10]')?.addEventListener('click', () => doLevel(10));

      // Équipement : un clic sur un emplacement ouvre la liste des objets libres.
      const picker = detail.querySelector<HTMLElement>('.eq-picker');
      const wirePick = () => {
        if (!picker) return;
        picker.querySelectorAll<HTMLElement>('[data-item]').forEach((b) =>
          b.addEventListener('click', () => {
            if (store.equip(h.id, b.dataset.item!)) { audio.confirm(); show(id); }
          }),
        );
        picker.querySelector('[data-unequip]')?.addEventListener('click', () => {
          const open = picker.dataset.slot as Slot | undefined;
          if (open) { store.unequip(h.id, open); audio.close(); show(id); }
        });
        picker.querySelector('[data-eq-close]')?.addEventListener('click', () => {
          picker.innerHTML = '';
          delete picker.dataset.slot;
          detail.querySelectorAll('.eq-slot').forEach((x) => x.classList.remove('sel'));
        });
      };
      detail.querySelectorAll<HTMLElement>('[data-slot]').forEach((b) =>
        b.addEventListener('click', () => {
          if (!picker) return;
          const slot = b.dataset.slot as Slot;
          audio.hover();
          detail.querySelectorAll('.eq-slot').forEach((x) => x.classList.remove('sel'));
          b.classList.add('sel');
          picker.dataset.slot = slot;
          picker.innerHTML = this.gearPickerHTML(h, slot);
          wirePick();
          picker.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
        }),
      );
      wirePick();
    };
    modal.querySelectorAll<HTMLElement>('[data-hero]').forEach((b) => b.addEventListener('click', () => { audio.hover(); show(b.dataset.hero!); }));
    show(selected);
  }

  /**
   * Les quatre emplacements d'équipement, posés AUTOUR de l'illustration du
   * héros (façon Mobile Legends Adventure) : le personnage reste visible au
   * centre, chaque pièce est un bouton posé dans un coin.
   */
  private gearSlotsHTML(h: HeroDef): string {
    const eq = store.equippedIn(h.id);
    const pos: Record<Slot, string> = { weapon: 'tl', helm: 'tr', armor: 'bl', boots: 'br' };
    return `<div class="hd-gear">${SLOT_LIST.map((sl) => {
      const it = eq[sl.id];
      const col = it ? itemCss(it) : 'rgba(227,192,119,.3)';
      return `<button class="eq-slot ${pos[sl.id]} ${it ? `on r-${it.rarity}` : 'empty'}" data-slot="${sl.id}" style="--rc:${col}"
          title="${it ? `${it.name} (${itemRarity(it)})` : sl.name}">
        <img class="eq-art" src="${GEAR_ART[sl.id]}" alt="" draggable="false"/>
        <span class="eq-frame"></span>
        ${it ? `<span class="eq-lvl">${it.level}</span>` : `<span class="eq-plus">+</span>`}
        <span class="eq-tip"><b>${it ? it.name : sl.name}</b><small>${
          it ? `${itemRarity(it)} · +${it.main}% ${mainLabel(it.slot)}${it.effect ? ` · ${it.effect.name}` : ''}` : 'Emplacement vide · clique pour équiper'
        }</small></span>
      </button>`;
    }).join('')}<div class="eq-picker"></div></div>`;
  }

  /** Liste des objets disponibles pour un emplacement. */
  private gearPickerHTML(h: HeroDef, slot: Slot): string {
    const list = store.inventoryFor(slot).slice(0, 24);
    const cur = store.equippedIn(h.id)[slot];
    const rows = list.map((it) => `
      <button class="eq-row r-${it.rarity}" data-item="${it.id}" style="--rc:${itemCss(it)}">
        <img class="eq-thumb" src="${GEAR_ART[it.slot]}" alt="" draggable="false"/>
        <span class="eq-row-main"><b>${it.name}${it.relic ? ' <em class="eq-relic">REL</em>' : ''}</b><small>${itemRarity(it)} · niv. ${it.level}</small>
          ${it.effect ? `<em class="eq-fx">${icon('bolt')} ${it.effect.name} — ${it.effect.text}</em>` : ''}</span>
        <span class="eq-row-stats">+${it.main}% ${mainLabel(it.slot)}${
          it.subs.length ? `<small>${it.subs.map((sb) => `${SUB_LABEL[sb.stat]} +${sb.value}%`).join(' · ')}</small>` : ''
        }</span>
      </button>`).join('');
    return `
      <div class="eq-picker-head">
        <b>${SLOT_LIST.find((x) => x.id === slot)!.name}</b>
        ${cur ? '<button class="eq-clear" data-unequip>Retirer l’objet</button>' : ''}
        <button class="eq-close" data-eq-close>Fermer</button>
      </div>
      <div class="eq-list">${rows || '<div class="eq-empty">Aucun objet libre pour cet emplacement.<br/><small>Termine des niveaux de campagne pour en trouver.</small></div>'}</div>`;
  }

  /** Panneau de niveau : palier de compétence, progression et bouton d'amélioration. */
  private levelPanelHTML(h: HeroDef): string {
    const level = store.levelOf(h);
    const tier = skillTiers(level);
    const prog = store.tierProgressOf(h);
    const price = store.levelUpPrice(h);
    const gold = store.player.gold;
    const can = gold >= price;
    const bonus = tierBonusPct(tier);
    const nextTierAt = (tier + 1) * 10;
    return `
      <div class="lv-panel">
        <div class="lv-head">
          <div class="lv-badge"><small>NIVEAU</small><b>${level}</b></div>
          <div class="lv-tier">
            <div class="lv-tier-name">
              ${icon('flame')} Compétences <b>palier ${tier}</b>
              ${bonus > 0 ? `<em>+${bonus} %</em>` : '<em class="dim">aucun bonus</em>'}
            </div>
            <div class="lv-bar"><i style="width:${Math.round(prog * 100)}%"></i></div>
            <div class="lv-next">Prochain palier au niveau <b>${nextTierAt}</b> · ${icon('flame')} +25 % de puissance</div>
          </div>
        </div>
        <div class="lv-actions">
          <button class="btn lv-btn ${can ? '' : 'off'}" data-levelup="${h.id}">
            ${icon('plus')} Niveau suivant
            <span class="lv-cost">${icon('coin')} ${price.toLocaleString('fr-FR')}</span>
          </button>
          <button class="btn ghost lv-btn ${can ? '' : 'off'}" data-levelup10="${h.id}">
            ×10 <span class="lv-cost">${icon('coin')} ${this.bulkCost(h, 10).toLocaleString('fr-FR')}</span>
          </button>
        </div>
      </div>`;
  }

  /** Coût cumulé de N niveaux. */
  private bulkCost(h: HeroDef, n: number): number {
    let total = 0;
    const lvl = store.levelOf(h);
    for (let i = 0; i < n; i++) total += levelUpCost(lvl + i, h.rarity);
    return total;
  }

  private heroDetailHTML(h: HeroDef): string {
    const owned = store.owns(h.id);
    const stars = store.starsOf(h);
    const lvl = store.levelOf(h);
    const red = store.redOf(h);
    const m = starMult(h, stars, red) * levelStatMult(lvl);
    const st = h.stats;
    const g = store.gearOf(h.id);
    const hp = Math.round(st.hp * m * g.hp), atk = Math.round(st.atk * m * g.atk);
    const armor = Math.round(st.armor * g.armor);
    const res = Math.round(st.res * g.res);
    const interval = st.interval * g.interval;
    const crit = Math.min(0.75, st.crit + g.crit);
    const bar = (label: string, value: string, ratio: number) =>
      `<div class="hs"><span>${label}</span><div class="hs-bar"><i style="width:${Math.min(100, ratio * 100)}%"></i></div><b>${value}</b></div>`;
    const ab = (tag: string, a: HeroDef['abilities']['attack'], cls: string) => `
      <div class="ha ${cls}"><div class="ha-ico">${icon(a.icon)}</div>
        <div><div class="ha-head"><b>${a.name}</b><em>${tag}</em></div><p>${a.text}</p></div></div>`;
    const bonus = m > 1 ? ` <small class="hs-bonus">+${Math.round((m - 1) * 100)} %</small>` : '';
    return `
      <div class="hd-art"><div class="hd-glow"></div><div class="hd-circle"></div><img src="${ART[h.texture]}" alt="" draggable="false"/>
        ${owned ? this.gearSlotsHTML(h) : ''}
        ${owned ? '' : `<div class="hd-lock">${icon('lock')}<b>Pas encore invoqué</b><button class="btn" data-go-summon>${icon('crystal')} Autel d’invocation</button></div>`}</div>
      <div class="hd-info">
        <div class="hd-top"><span class="hd-rar ${h.rarity}">${h.rarity}</span>${starsHTML(stars, owned ? '' : 'dim', store.redOf(h))}<span class="hd-role">${icon(ROLE_ICON[h.role])} ${h.role}</span></div>
        <div class="hd-cls" style="--cc:${CLASSES[h.cls].css}">
          <span class="hc-badge">${icon(CLASSES[h.cls].icon)} ${CLASSES[h.cls].name}</span>
          <span class="hc-motto">${CLASSES[h.cls].motto}</span>
          <span class="hc-vs"><b>Bat</b> ${CLASSES[CLASSES[h.cls].strong].name}</span>
          <span class="hc-vs weak"><b>Craint</b> ${CLASSES[classBeatenBy(h.cls)].name}</span>
        </div>
        <h3>${h.name}</h3>
        <div class="hd-title">${h.title}</div>
        <p class="hd-quote">${h.quote}</p>
        <div class="hd-stats">
          ${bar('PV', hp.toLocaleString('fr-FR') + bonus, hp / 3600)}
          ${bar('Attaque', String(atk), atk / 140)}
          ${bar('Armure', String(armor), armor / 100)}
          ${bar('Résistance', String(res), res / 70)}
          ${bar('Vitesse', `${(1 / interval).toFixed(2)}/s`, (1 / interval) / 1.4)}
          ${bar('Critique', `${Math.round(crit * 100)} %`, crit / 0.32)}
        </div>
        <div class="hd-abilities">
          ${ab('Attaque', h.abilities.attack, 'atk')}
          ${ab('Compétence', h.abilities.skill, 'skill')}
          ${ab('Ultime', h.abilities.ultimate, 'ult')}
        </div>
        ${(() => {
          const links = BONDS.filter((b) => b.a === h.id || b.b === h.id);
          if (!links.length) return '';
          const other = (id: string) => HEROES.find((x) => x.id === id)?.name ?? id;
          return `<div class="hd-bonds">${links.map((b) => `<span class="hb"><i>✦</i><b>${b.name}</b><em>avec ${other(b.a === h.id ? b.b : b.a)} · +${Math.round(b.bonus * 100)} %</em></span>`).join('')}</div>`;
        })()}
        <p class="hd-lore">${h.lore}</p>
        ${owned ? this.levelPanelHTML(h) : ''}
        <div class="hd-power">${icon('swords')} Puissance <b>${heroPower(h, stars, store.levelOf(h), g).toLocaleString('fr-FR')}</b> <span>${owned ? `${stars} étoile${stars > 1 ? 's' : ''} · niv. ${store.levelOf(h)}` : 'Obtenable à l’Autel'}</span></div>
      </div>`;
  }

  toast(msg: string): void {
    this.toastEl.textContent = msg;
    this.toastEl.classList.add('show');
    clearTimeout((this.toastEl as unknown as { _t?: number })._t);
    (this.toastEl as unknown as { _t?: number })._t = window.setTimeout(() => this.toastEl.classList.remove('show'), 2000);
  }

  /* ================= Discussion (ambiance) ================= */

  private startChat(): void {
    for (let i = 0; i < 3; i++) this.pushChat();
    const loop = () => {
      this.pushChat();
      window.setTimeout(loop, 5000 + Math.random() * 6000);
    };
    window.setTimeout(loop, 6000);
  }

  private pushChat(): void {
    const [ch, who, msg] = CHAT_FEED[this.chatIndex++ % CHAT_FEED.length]!;
    const cls = ch === 'Guilde' ? 'guild' : ch === 'Système' ? 'sys' : '';
    const line = document.createElement('div');
    line.className = 'chat-line';
    line.innerHTML = `<span class="ch ${cls}">[${ch}]</span>${who ? `<span class="who">${who} :</span>` : ''}${msg}`;
    this.chatLines.appendChild(line);
    while (this.chatLines.children.length > 3) this.chatLines.firstElementChild?.remove();
  }
}
