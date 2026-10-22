import { ART, PORTRAITS } from '../assets';
import { audio } from '../audio/AudioEngine';
import type { BattleResult } from '../battle/BattleScene';
import { BATTLE_TIME_LIMIT, type BattleSim, type Unit } from '../battle/Sim';
import { HEROES, type StageDef } from '../data/heroes';
import type { RewardOutcome } from '../state/store';
import { Emitter } from '../utils/Emitter';
import { icon } from './icons';

type HudEvents = {
  ult: number;
  speed: 1 | 2;
  auto: boolean;
  pause: boolean;
  quit: void;
  retry: void;
  home: void;
};

interface CardRefs {
  unit: Unit;
  el: HTMLElement;
  hp: HTMLElement;
  energy: HTMLElement;
  key: string;
}

const fmt = (n: number): string => Math.round(n).toLocaleString('fr-FR');
const clock = (s: number): string => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;

/**
 * Interface HTML du combat : cartes des héros (vie, énergie, ultime), barre du boss, minuteur,
 * boutons AUTO / ×2 / pause, bannières, séquence d'ultime et écran de résultats.
 */
export class BattleHud extends Emitter<HudEvents> {
  private readonly el: HTMLElement;
  private cards: CardRefs[] = [];
  private bossBar: HTMLElement | null = null;
  private bossGhost: HTMLElement | null = null;
  private bossText: HTMLElement | null = null;
  private bossGhostRatio = 1;
  private bossKey = '';
  private timerTxt = '';
  private tipEl: Element | null = null;
  private timerEl: HTMLElement | null = null;
  private tipShown = false;
  private auto = false;
  private speed: 1 | 2 = 1;
  private paused = false;
  visible = false;

  constructor(parent: HTMLElement) {
    super();
    this.el = document.createElement('div');
    this.el.className = 'battle-hud';
    parent.appendChild(this.el);
    this.el.addEventListener('click', (e) => this.onClick(e));
    window.addEventListener('keydown', (e) => {
      if (!this.visible) return;
      const n = Number(e.key);
      if (n >= 1 && n <= 5) { const c = this.cards[n - 1]; if (c) this.emit('ult', c.unit.uid); }
      if (e.key === ' ' || e.key === 'Escape') { e.preventDefault(); this.togglePause(); }
      if (e.key.toLowerCase() === 'a') this.toggleAuto();
    });
  }

  show(stage: StageDef, sim: BattleSim, auto: boolean, speed: 1 | 2): void {
    this.visible = true;
    this.auto = auto;
    this.speed = speed;
    this.paused = false;
    this.tipShown = false;
    this.bossGhostRatio = 1;
    const boss = sim.boss;
    this.el.innerHTML = `
      <div class="bh-top">
        <div class="bh-stage panel"><b>${stage.id}</b><span>${stage.name}</span></div>
        ${boss ? `
        <div class="bh-boss">
          <div class="bh-boss-name">${icon('skull')}<span>${boss.def.name}</span></div>
          <div class="bh-boss-bar"><i class="ghost"></i><i class="fill"></i><em></em></div>
        </div>` : '<div></div>'}
        <div class="bh-ctrl">
          <div class="bh-timer">${icon('clock')}<span>${clock(BATTLE_TIME_LIMIT)}</span></div>
          <button class="bh-btn ${auto ? 'on' : ''}" data-b="auto" title="Ultimes automatiques (A)">${icon('auto')}<span>AUTO</span></button>
          <button class="bh-btn" data-b="speed" title="Vitesse">${icon('fast')}<span>×${speed}</span></button>
          <button class="bh-btn" data-b="pause" title="Pause (Espace)">${icon('pause')}</button>
        </div>
      </div>
      <div class="bh-banner"></div>
      <div class="bh-tip">Jauge dorée pleine ? <b>Clique sur la carte du héros</b> (ou touches <kbd>1</kbd>–<kbd>5</kbd>) pour lancer son <b>ULTIME</b> !</div>
      <div class="bh-cards">
        ${sim.heroes.map((u, i) => {
          const h = u.hero!;
          return `<button class="hcard" data-uid="${u.uid}" style="--c:${h.css}">
            <div class="hc-portrait"><img src="${PORTRAITS[h.id]}" alt="" draggable="false"/><span class="hc-key">${i + 1}</span><span class="hc-ult">ULTIME</span></div>
            <div class="hc-name">${h.name}</div>
            <div class="hc-bars"><div class="hc-hp"><i></i></div><div class="hc-en"><i></i></div></div>
          </button>`;
        }).join('')}
      </div>
      <div class="bh-overlay"></div>`;
    this.cards = sim.heroes.map((unit) => {
      const el = this.el.querySelector<HTMLElement>(`[data-uid="${unit.uid}"]`)!;
      return { unit, el, hp: el.querySelector('.hc-hp i')!, energy: el.querySelector('.hc-en i')!, key: '' };
    });
    this.bossBar = this.el.querySelector('.bh-boss-bar .fill');
    this.bossGhost = this.el.querySelector('.bh-boss-bar .ghost');
    this.bossText = this.el.querySelector('.bh-boss-bar em');
    this.timerEl = this.el.querySelector('.bh-timer span');
    this.tipEl = this.el.querySelector('.bh-tip');
    this.bossKey = this.timerTxt = '';
    this.el.classList.add('show');
    document.body.classList.add('in-battle');
  }

  hide(): void {
    this.visible = false;
    this.el.classList.remove('show');
    this.el.innerHTML = '';
    this.cards = [];
    document.body.classList.remove('in-battle');
  }

  /** Mise à jour à chaque image (uniquement ce qui a changé). */
  update(sim: BattleSim, dt: number, usedUlt: boolean): void {
    if (!this.visible) return;
    for (const c of this.cards) {
      const u = c.unit;
      const ready = sim.canUltimate(u);
      const key = `${Math.round(u.ratio * 300)}|${Math.round(u.energy)}|${ready}|${u.alive}`;
      if (key === c.key) continue;
      c.key = key;
      c.hp.style.transform = `scaleX(${Math.max(0, u.ratio).toFixed(3)})`;
      c.energy.style.transform = `scaleX(${(u.energy / 100).toFixed(3)})`;
      c.el.classList.toggle('ready', ready && !this.auto);
      c.el.classList.toggle('ready-auto', ready && this.auto);
      c.el.classList.toggle('dead', !u.alive);
      c.el.classList.toggle('low', u.alive && u.ratio < 0.3);
    }
    const boss = sim.boss;
    if (boss && this.bossBar && this.bossGhost && this.bossText) {
      this.bossGhostRatio = Math.max(boss.ratio, this.bossGhostRatio - dt * 0.35);
      // On n'écrit dans le DOM que ce qui a changé (sinon : recalcul de style à chaque image)
      const bk = `${(boss.ratio * 1000) | 0}|${(this.bossGhostRatio * 1000) | 0}|${boss.enraged}`;
      if (bk !== this.bossKey) {
        this.bossKey = bk;
        this.bossBar.style.transform = `scaleX(${Math.max(0, boss.ratio).toFixed(4)})`;
        this.bossGhost.style.transform = `scaleX(${this.bossGhostRatio.toFixed(4)})`;
        this.bossText.textContent = `${fmt(boss.hp)} / ${fmt(boss.maxHp)}`;
        this.bossBar.parentElement!.classList.toggle('enraged', boss.enraged);
      }
    }
    if (this.timerEl) {
      const left = Math.max(0, BATTLE_TIME_LIMIT - sim.time);
      const txt = clock(left);
      if (txt !== this.timerTxt) {
        this.timerTxt = txt;
        this.timerEl.textContent = txt;
        this.timerEl.parentElement!.classList.toggle('urgent', left < 15);
      }
    }
    // Astuce : la première fois qu'un ultime est prêt
    const anyReady = this.cards.some((c) => sim.canUltimate(c.unit));
    const tip = this.tipEl;
    if (tip) {
      if (anyReady && !usedUlt && !this.auto && !this.tipShown) { tip.classList.add('show'); this.tipShown = true; }
      if (usedUlt || this.auto) tip.classList.remove('show');
    }
  }

  banner(text: string, kind: 'start' | 'boss' | 'info'): void {
    const b = this.el.querySelector<HTMLElement>('.bh-banner');
    if (!b) return;
    b.className = `bh-banner ${kind}`;
    b.innerHTML = `<span>${text}</span>`;
    void b.offsetWidth;
    b.classList.add('play');
  }

  /** Illustration plein écran du héros qui lance son ultime (façon MLA). */
  cutin(u: Unit): void {
    const h = u.hero;
    if (!h) return;
    const el = document.createElement('div');
    el.className = 'cutin';
    el.style.setProperty('--c', h.css);
    el.innerHTML = `
      <div class="cutin-band"></div>
      <div class="cutin-lines"></div>
      <img class="cutin-art" src="${ART[h.texture]}" alt="" draggable="false"/>
      <div class="cutin-text"><small>Ultime</small><b>${h.abilities.ultimate.name}</b><span>${h.name} · ${h.title}</span></div>`;
    this.el.appendChild(el);
    setTimeout(() => el.remove(), 820);
  }

  private onClick(e: MouseEvent): void {
    const t = e.target as HTMLElement;
    const card = t.closest<HTMLElement>('[data-uid]');
    if (card) { this.emit('ult', Number(card.dataset.uid)); return; }
    const b = t.closest<HTMLElement>('[data-b]')?.dataset.b;
    if (!b) return;
    audio.click();
    if (b === 'auto') this.toggleAuto();
    else if (b === 'speed') {
      this.speed = this.speed === 1 ? 2 : 1;
      const s = this.el.querySelector('[data-b="speed"] span');
      if (s) s.textContent = `×${this.speed}`;
      this.el.querySelector('[data-b="speed"]')?.classList.toggle('on', this.speed === 2);
      this.emit('speed', this.speed);
    } else if (b === 'pause' || b === 'resume') this.togglePause();
    else if (b === 'quit') { this.closeOverlay(); this.emit('quit', undefined); }
    else if (b === 'retry') this.emit('retry', undefined);
    else if (b === 'home') this.emit('home', undefined);
  }

  private toggleAuto(): void {
    this.auto = !this.auto;
    this.el.querySelector('[data-b="auto"]')?.classList.toggle('on', this.auto);
    for (const c of this.cards) c.key = '';
    this.emit('auto', this.auto);
  }

  private togglePause(): void {
    if (this.el.querySelector('.bh-overlay .result')) return;
    this.paused = !this.paused;
    this.emit('pause', this.paused);
    if (this.paused) {
      this.openOverlay(`<div class="bh-pause panel ornate">
        <i class="corner tl"></i><i class="corner tr"></i><i class="corner bl"></i><i class="corner br"></i>
        <h2>Pause</h2>
        <p>Le combat est en suspens… les morts, eux, attendent.</p>
        <div class="btn-row">
          <button class="btn dark" data-b="quit">${icon('back')} Abandonner</button>
          <button class="btn" data-b="resume">${icon('play')} Reprendre</button>
        </div></div>`);
    } else this.closeOverlay();
  }

  private openOverlay(html: string): void {
    const o = this.el.querySelector<HTMLElement>('.bh-overlay');
    if (!o) return;
    o.innerHTML = html;
    o.classList.add('show');
  }

  private closeOverlay(): void {
    const o = this.el.querySelector<HTMLElement>('.bh-overlay');
    if (!o) return;
    o.classList.remove('show');
    o.innerHTML = '';
  }

  /** Écran de victoire / défaite. */
  showResult(r: BattleResult, stage: StageDef, outcome: RewardOutcome | null): void {
    const win = r.winner === 'hero';
    if (win) {
      // Chaque étoile tinte au moment où elle apparaît, puis le butin
      for (let i = 1; i <= r.stars; i++) audio.play('star', { delay: 0.5 + i * 0.28 + 0.15, rate: 1 + i * 0.08, vary: 0 });
      audio.play('coins', { delay: 1.5 });
    }
    const best = Math.max(1, ...r.stats.map((s) => s.dealt + s.healed));
    const mvp = r.stats.reduce((a, b) => (b.dealt + b.healed > a.dealt + a.healed ? b : a));
    const mvpHero = HEROES.find((h) => h.id === mvp.id)!;
    const stars = [1, 2, 3].map((i) => `<i class="rstar ${i <= r.stars ? 'on' : ''}" style="--d:${0.5 + i * 0.28}s">${icon('star')}</i>`).join('');
    const rows = r.stats.map((s, i) => {
      const h = HEROES.find((x) => x.id === s.id)!;
      return `<div class="rrow ${s.alive ? '' : 'dead'}" style="--c:${h.css};--d:${1.4 + i * 0.1}s">
        <img src="${PORTRAITS[s.id]}" alt=""/>
        <div class="rname">${s.name}</div>
        <div class="rbar"><i style="--w:${(s.dealt / best) * 100}%"></i>${s.healed ? `<i class="heal" style="--w:${(s.healed / best) * 100}%"></i>` : ''}</div>
        <div class="rval">${fmt(s.dealt)}${s.healed ? `<small>+${fmt(s.healed)} soins</small>` : ''}</div>
      </div>`;
    }).join('');

    const body = win ? `
      <div class="rstars">${stars}</div>
      <div class="rsub">${stage.id} · ${stage.name} · ${clock(r.time)}</div>
      <div class="rrewards">
        <div class="rw gold">${icon('coin')}<b>+${fmt(stage.rewards.gold)}</b><small>Or</small></div>
        <div class="rw gems">${icon('gem')}<b>+${fmt(stage.rewards.gems)}</b><small>Gemmes</small></div>
        <div class="rw xp">${icon('star')}<b>+${fmt(stage.rewards.xp)}</b><small>Expérience</small></div>
      </div>
      ${outcome?.levelUp ? `<div class="rlevel">${icon('crown')} Niveau ${outcome.newLevel} atteint !</div>` : ''}
      <div class="rgrid">
        <div class="rmvp" style="--c:${mvpHero.css}">
          <img src="${ART[mvpHero.texture]}" alt=""/>
          <div class="rmvp-tag">MVP</div>
          <div class="rmvp-name">${mvpHero.name}</div>
        </div>
        <div class="rstats"><div class="rstats-title">Dégâts infligés</div>${rows}</div>
      </div>` : `
      <div class="rsub">${stage.id} · ${stage.name}</div>
      <p class="rtips">Les morts ont gagné cette fois…<br/>
        <b>Astuce :</b> lance les <b>ultimes</b> dès que les jauges dorées sont pleines (ou active <b>AUTO</b>).
        ${stage.tip}</p>
      <div class="rstats solo"><div class="rstats-title">Dégâts infligés</div>${rows}</div>`;

    this.openOverlay(`
      <div class="result ${win ? 'victory' : 'defeat'}">
        <div class="rrays"></div>
        <div class="rpanel">
          <h1>${win ? 'Victoire' : 'Défaite'}</h1>
          ${body}
          <div class="btn-row">
            <button class="btn dark" data-b="retry">${icon('refresh')} ${win ? 'Rejouer' : 'Réessayer'}</button>
            <button class="btn" data-b="home">${icon('castle')} Retour à la ville</button>
          </div>
        </div>
      </div>`);
  }
}
