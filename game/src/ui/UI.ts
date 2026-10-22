import { TALKERS } from '../data/npcLines';
import { ART, CHAPTER1_BG, PORTRAITS, SCENE_BG } from '../assets';
import { BUILDINGS, type BuildingDef } from '../data/buildings';
import { HEROES, heroPower, levelStatMult, levelUpCost, skillTiers, starMult, STAGES, teamPower, tierBonusPct, type HeroDef, type StageDef, type UnitDef } from '../data/heroes';
import type { LabelPosition } from '../scene/HubScene';
import { store, type PlayerState, type Quality } from '../state/store';
import { audio } from '../audio/AudioEngine';
import { Emitter } from '../utils/Emitter';
import { FormationScreen } from './Formation';
import { icon, type IconName } from './icons';
import { ROLE_ICON } from './roles';
import { starsHTML } from './stars';
import { canFullscreen, inIframe, isFullscreen, toggleFullscreen } from './fullscreen';
import { collectionText, SummonScreen } from './Summon';

export type UIEvents = {
  labelHover: { id: string; hovered: boolean };
  selectBuilding: string;
  recenter: void;
  startStage: string;
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
  { id: 'daily', label: 'Connexion', icon: 'gift', badge: true, description: 'Connecte-toi chaque jour pour recevoir des récompenses de plus en plus rares.' },
  { id: 'achievements', label: 'Succès', icon: 'medal', description: 'Accomplis des exploits pour gagner des titres et des gemmes.' },
  { id: 'codex', label: 'Codex', icon: 'book', description: "L'encyclopédie du monde : héros, monstres et légendes oubliées." },
];

const RIGHT_MENU: MenuEntry[] = [
  { id: 'quests', label: 'Quêtes', icon: 'scroll', badge: '3', description: 'Quêtes quotidiennes et hebdomadaires pour progresser plus vite.' },
  { id: 'events', label: 'Événements', icon: 'star', isNew: true, description: 'Événements à durée limitée avec des récompenses exclusives.' },
  { id: 'ranking', label: 'Classement', icon: 'trophy', description: 'Compare ta progression dans la Tour de l’Infini avec les autres joueurs.' },
  { id: 'shop', label: 'Boutique', icon: 'shop', description: 'Objets, ressources et offres spéciales.' },
];

const NAV: Array<MenuEntry & { main?: boolean }> = [
  { id: 'campaign', label: 'Campagne', icon: 'map', description: '' },
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
    const set = (key: string, v: string) => { const el = this.root.querySelector<HTMLElement>(`[data-bind="${key}"]`); if (el) el.textContent = v; };
    set('level', String(p.level));
    set('name', p.name);
    set('power', fmt(p.power));
    set('gold', fmt(p.gold));
    set('gems', fmt(p.gems));
    set('energy', `${p.energy}/${p.energyMax}`);
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
    const action = target.closest<HTMLElement>('[data-action]')?.dataset.action;
    const menu = target.closest<HTMLElement>('[data-menu]')?.dataset.menu;
    const nav = target.closest<HTMLElement>('[data-nav]')?.dataset.nav;

    if (action || menu || nav) audio.click();
    if (action) {
      if (action === 'sound') { store.updateSettings({ muted: !store.settings.muted }); return; }
      if (action === 'settings') this.openSettings();
      else if (action === 'battle') this.openCampaign();
      else if (action.startsWith('buy-')) this.toast('La boutique ouvrira bientôt');
      else if (action === 'profile') this.openInfo('Profil de l’Invocateur', 'helmet', 'Ton héros', 'Ici tu pourras changer ton nom, ton avatar et voir tes statistiques.');
      else if (action === 'mail') this.openInfo('Courrier', 'mail', '2 nouveaux messages', 'Les récompenses et messages des développeurs arriveront ici.');
      else if (action === 'chat') this.toast('La discussion arrivera bientôt');
      return;
    }
    if (menu === 'summon') { this.openSummon(); return; }
    if (menu) {
      const m = [...LEFT_MENU, ...RIGHT_MENU].find((x) => x.id === menu);
      if (m) this.openInfo(m.label, m.icon, 'Fonctionnalité', m.description);
      return;
    }
    if (nav) {
      if (nav === 'city') { this.emit('recenter', undefined); return; }
      if (nav === 'campaign') { this.openCampaign(); return; }
      if (nav === 'heroes') { this.openHeroes(); return; }
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
    if (def.id === 'sanctuary') { this.openHeroes(); return; }
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
        <div class="setting"><div><b>Compteur FPS</b><small>Images par seconde et temps de rendu (touche F)</small></div>
          ${seg('fps', [['on', 'Oui'], ['off', 'Non']], s.showFps ? 'on' : 'off')}</div>
        <div class="setting"><div><b>Noms des bâtiments</b><small>Afficher les étiquettes au-dessus de la ville</small></div>
          ${seg('labels', [['on', 'Oui'], ['off', 'Non']], s.showLabels ? 'on' : 'off')}</div>
        <div class="setting"><div><b>Volume</b><small>Vent, feu, tonnerre et sons de l'interface</small></div>
          <div class="vol"><button class="vol-mute" data-act="mute">${icon(s.muted ? 'mute' : 'volume')}</button>
          <input type="range" min="0" max="100" value="${Math.round(s.volume * 100)}" data-act="volume" /></div></div>
        <div class="setting"><div><b>Plein écran</b><small>Touche Entrée, ou double-clic sur le jeu</small></div>
          <button class="btn dark" data-act="fullscreen">${icon('expand')} ${isFullscreen() ? 'Quitter' : 'Activer'}</button></div>
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

  openCampaign(selectId?: string): void {
    const nodes = [
      { id: '1-1', x: 12, y: 70 }, { id: '1-2', x: 31, y: 44 }, { id: '1-3', x: 50, y: 66 },
      { id: '1-4', x: 69, y: 38 }, { id: '1-5', x: 88, y: 58, boss: true },
    ];
    const path = nodes.map((n, i) => `${i ? 'L' : 'M'}${n.x} ${n.y}`).join(' ');
    let selected = STAGES.find((st) => st.id === selectId && unlocked(st)) ?? this.nextStage();
    const modal = this.openModal(`
      <div class="modal-medal">${icon('map')}</div>
      <h2>Campagne</h2>
      <div class="subtitle">Chapitre 1 · Les Faubourgs Maudits</div>
      <div class="camp">
        <div class="camp-map" style="--map:url('${CHAPTER1_BG}')">
          <svg viewBox="0 0 100 100" preserveAspectRatio="none" class="camp-path"><path d="${path}"/></svg>
          <div class="camp-nodes"></div>
          <div class="camp-fog"></div>
        </div>
        <div class="camp-detail"></div>
      </div>`, '#c2183caa', 'xl');
    const nodesEl = modal.querySelector<HTMLElement>('.camp-nodes')!;
    const detail = modal.querySelector<HTMLElement>('.camp-detail')!;

    const render = () => {
      nodesEl.innerHTML = nodes.map((n) => {
        const st = STAGES.find((x) => x.id === n.id);
        const open = !!st && unlocked(st);
        const s = store.campaign[n.id] ?? 0;
        const cls = `${open ? 'open' : 'locked'} ${st?.id === selected.id ? 'selected' : ''} ${n.boss ? 'boss' : ''} ${s ? 'cleared' : ''}`;
        return `<button class="camp-node ${cls}" style="left:${n.x}%;top:${n.y}%" ${open ? `data-stage="${n.id}"` : `data-locked="${st ? 'req' : 'soon'}"`}>
          <span class="cn-ring">${open ? icon('swords') : n.boss ? icon('skull') : icon('lock')}</span>
          <b>${n.id}</b>
          ${open ? `<span class="cn-stars">${[1, 2, 3].map((i) => `<i class="${i <= s ? 'on' : ''}">★</i>`).join('')}</span>` : `<small>${st ? `Gagne ${st.requires}` : 'Bientôt'}</small>`}
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
      const node = t.closest<HTMLElement>('[data-stage]');
      const locked = t.closest<HTMLElement>('[data-locked]');
      if (node) {
        const st = STAGES.find((x) => x.id === node.dataset.stage);
        if (st && st !== selected) { selected = st; audio.hover(); render(); }
      } else if (locked) {
        this.toast(locked.dataset.locked === 'req' ? 'Gagne d’abord le niveau précédent !' : 'Ce niveau arrive bientôt !');
      } else if (t.closest('[data-start]')) {
        audio.click();
        const st = selected;
        this.formation.open(st, () => this.emit('startStage', st.id));
      }
    });
    render();
  }

  /* ================= Héros ================= */

  openHeroes(selected = HEROES[0]!.id): void {
    const team = store.teamIds;
    const modal = this.openModal(`
      <div class="modal-medal">${icon('helmet')}</div>
      <h2>Héros</h2>
      <div class="subtitle">Ta compagnie · ${collectionText()} · Puissance de l’équipe ${teamPower(store.team()).toLocaleString('fr-FR')}</div>
      <div class="heroes">
        <div class="hero-list">
          ${HEROES.map((h) => {
            const owned = store.owns(h.id);
            return `
            <button class="hl-item ${owned ? '' : 'locked'}" data-hero="${h.id}" style="--c:${h.css}">
              <img src="${PORTRAITS[h.id]}" alt="" draggable="false"/>
              <span class="hl-rar ${h.rarity}">${h.rarity}</span>
              ${team.includes(h.id) ? `<span class="hl-team" title="Dans l’équipe">${icon('swords')}</span>` : ''}
              <div class="hl-txt"><b>${h.name}</b>${owned ? starsHTML(store.starsOf(h), 'mini') : `<small>${icon('lock')} À invoquer</small>`}</div>
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
    };
    modal.querySelectorAll<HTMLElement>('[data-hero]').forEach((b) => b.addEventListener('click', () => { audio.hover(); show(b.dataset.hero!); }));
    show(selected);
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
    const m = starMult(h, stars) * levelStatMult(lvl);
    const st = h.stats;
    const hp = Math.round(st.hp * m), atk = Math.round(st.atk * m);
    const bar = (label: string, value: string, ratio: number) =>
      `<div class="hs"><span>${label}</span><div class="hs-bar"><i style="width:${Math.min(100, ratio * 100)}%"></i></div><b>${value}</b></div>`;
    const ab = (tag: string, a: HeroDef['abilities']['attack'], cls: string) => `
      <div class="ha ${cls}"><div class="ha-ico">${icon(a.icon)}</div>
        <div><div class="ha-head"><b>${a.name}</b><em>${tag}</em></div><p>${a.text}</p></div></div>`;
    const bonus = m > 1 ? ` <small class="hs-bonus">+${Math.round((m - 1) * 100)} %</small>` : '';
    return `
      <div class="hd-art"><div class="hd-glow"></div><div class="hd-circle"></div><img src="${ART[h.texture]}" alt="" draggable="false"/>
        ${owned ? '' : `<div class="hd-lock">${icon('lock')}<b>Pas encore invoqué</b><button class="btn" data-go-summon>${icon('crystal')} Autel d’invocation</button></div>`}</div>
      <div class="hd-info">
        <div class="hd-top"><span class="hd-rar ${h.rarity}">${h.rarity}</span>${starsHTML(stars, owned ? '' : 'dim')}<span class="hd-role">${icon(ROLE_ICON[h.role])} ${h.role}</span></div>
        <h3>${h.name}</h3>
        <div class="hd-title">${h.title}</div>
        <p class="hd-quote">${h.quote}</p>
        <div class="hd-stats">
          ${bar('PV', hp.toLocaleString('fr-FR') + bonus, hp / 3600)}
          ${bar('Attaque', String(atk), atk / 140)}
          ${bar('Armure', String(st.armor), st.armor / 75)}
          ${bar('Vitesse', `${(1 / st.interval).toFixed(2)}/s`, (1 / st.interval) / 1.4)}
          ${bar('Critique', `${Math.round(st.crit * 100)} %`, st.crit / 0.32)}
        </div>
        <div class="hd-abilities">
          ${ab('Attaque', h.abilities.attack, 'atk')}
          ${ab('Compétence', h.abilities.skill, 'skill')}
          ${ab('Ultime', h.abilities.ultimate, 'ult')}
        </div>
        <p class="hd-lore">${h.lore}</p>
        ${owned ? this.levelPanelHTML(h) : ''}
        <div class="hd-power">${icon('swords')} Puissance <b>${heroPower(h, stars, store.levelOf(h)).toLocaleString('fr-FR')}</b> <span>${owned ? `${stars} étoile${stars > 1 ? 's' : ''} · niv. ${store.levelOf(h)}` : 'Obtenable à l’Autel'}</span></div>
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
