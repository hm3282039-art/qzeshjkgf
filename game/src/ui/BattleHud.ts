import { ART, PORTRAITS } from '../assets';
import { audio } from '../audio/AudioEngine';
import type { BattleResult } from '../battle/BattleScene';
import { BATTLE_TIME_LIMIT, type BattleSim, type Unit } from '../battle/Sim';
import { HEROES, type StageDef } from '../data/heroes';
import { SUB_LABEL, itemCss, itemRarity, mainLabel } from '../data/items';
import type { RewardOutcome } from '../state/store';
import { Emitter } from '../utils/Emitter';
import { icon } from './icons';
import { signatureOf, type Motif } from './signatures';

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

  /**
   * Ultime de boss : bande de danger en haut de l'écran, nom de l'attaque et
   * consigne. Le joueur a 1,15 s pour réagir (étourdir le boss ou bouger).
   */
  bossCast(name: string, kind: string, color: number): void {
    const hint: Record<string, string> = {
      nova: 'Reculez du boss !',
      line: 'Sortez de la ligne !',
      quake: 'Impact au contact — étourdissez-le !',
      hex: 'Malédiction — éliminez-le vite !',
      rain: 'Tout le terrain est frappé !',
      summon: 'Des renforts arrivent !',
    };
    const el = document.createElement('div');
    el.className = 'bh-bosscast';
    el.style.setProperty('--c', `#${color.toString(16).padStart(6, '0')}`);
    el.innerHTML = `
      <div class="bc-fill"></div>
      <div class="bc-body">
        <small>Ultime de boss</small>
        <b>${name}</b>
        <span>${hint[kind] ?? 'Préparez-vous !'}</span>
      </div>`;
    this.el.appendChild(el);
    audio.play('boss_windup', { vol: 0.5, rate: 1.2 });
    setTimeout(() => el.remove(), 1500);
  }

  /** Petite secousse visuelle quand l'ultime de boss touche. */
  bossImpact(kind: string): void {
    if (kind === 'cancel') return;
    const el = this.el.querySelector('.bh-bosscast');
    el?.classList.add('impact');
  }

  /* ====================== Entraînement ====================== */

  /**
   * Barre d'entraînement : dégâts cumulés, DPS et remise à zéro.
   * Le mannequin est invincible : ce qui compte, c'est le chiffre.
   */
  trainingBar(onReset: () => void): void {
    const el = document.createElement('div');
    el.className = 'bh-training panel';
    el.innerHTML = `
      <div class="bt-head">${icon('swords')} <b>Entraînement</b><small>mannequin invincible</small></div>
      <div class="bt-nums">
        <div><small>Dégâts totaux</small><b data-tr="total">0</b></div>
        <div><small>DPS</small><b data-tr="dps">0</b></div>
        <div><small>Temps</small><b data-tr="time">0:00</b></div>
      </div>
      <button class="btn dark tiny" data-b="reset">${icon('refresh')} Remettre à zéro</button>`;
    el.querySelector('[data-b="reset"]')?.addEventListener('click', () => { audio.click(); onReset(); });
    this.el.appendChild(el);
  }

  tickTraining(total: number, dps: number, time: number): void {
    const set = (k: string, v: string): void => {
      const n = this.el.querySelector(`[data-tr="${k}"]`);
      if (n && n.textContent !== v) n.textContent = v;
    };
    set('total', fmt(total));
    set('dps', fmt(dps));
    set('time', clock(time));
  }

  /**
   * Lien d'équipe : deux héros qui se connaissent entrent ensemble.
   * Petit encart discret sous le bandeau, qui s'efface tout seul.
   */
  bond(name: string, line: string): void {
    const el = document.createElement('div');
    el.className = 'bh-bond';
    el.innerHTML = `<span class="bb-mark">✦</span><div><b>${name}</b><i>${line}</i></div>`;
    this.el.appendChild(el);
    requestAnimationFrame(() => el.classList.add('play'));
    window.setTimeout(() => {
      el.classList.remove('play');
      window.setTimeout(() => el.remove(), 500);
    }, 3200);
  }

  /**
   * Carte de titre du boss : l'écran s'assombrit, une plaque d'or et d'obsidienne
   * glisse, le nom et le titre s'inscrivent, puis tout s'efface.
   *
   * Volontairement courte (~1,15 s) : l'intro dure déjà 1,9 s, au-delà on
   * attendrait trois secondes avant de jouer.
   */
  bossTitle(name: string, title: string, color = '#c2183c'): void {
    const el = document.createElement('div');
    el.className = 'boss-title';
    el.style.setProperty('--c', color);
    el.innerHTML = `
      <div class="bt-veil"></div>
      <div class="bt-plate">
        <span class="bt-line"></span>
        <small>Boss</small>
        <b>${name}</b>
        <i>${title}</i>
        <span class="bt-line"></span>
      </div>`;
    this.el.appendChild(el);
    setTimeout(() => el.remove(), 1900);
  }

  /** Illustration plein écran du héros qui lance son ultime (façon MLA). */
  /**
   * CINÉMATIQUE D'ULTIME (refonte totale).
   *
   * Ce n'est plus un bandeau qui glisse : c'est une scène de cinéma.
   *   1. les barres noires se ferment (lettrage) ;
   *   2. le sceau du héros s'imprime, le titre de l'ultime se révèle au trait ;
   *   3. l'illustration entre de biais, contre-jour, avec sa phrase-signature ;
   *   4. un coup de lame traverse l'écran, flash, puis tout se retire.
   * Durée : 1,5 s, sans jamais bloquer le combat.
   */
  cutin(u: Unit): void {
    const h = u.hero;
    if (!h) return;
    const sig = signatureOf(h);
    const glyph: Record<Motif, string> = {
      blade: '⚔', void: '◌', grave: '☩', moon: '☾', bell: '♪', frost: '❄', forge: '⚒', thorn: '❦',
      flame: '▲', storm: '⚡', stone: '⬢', iron: '✂', choir: '♫', sun: '☀', gear: '⚙', wall: '▣',
    };
    const el = document.createElement('div');
    el.className = 'uc';
    el.style.setProperty('--c', h.css);
    el.innerHTML = `
      <div class="uc-bars"><i></i><i></i></div>
      <div class="uc-vign"></div>
      <div class="uc-grain"></div>
      <div class="uc-seal">${glyph[sig.motif]}</div>
      <div class="uc-streaks">${'<i></i>'.repeat(9)}</div>
      <img class="uc-art" src="${ART[h.texture]}" alt="" draggable="false"/>
      <div class="uc-artshade"></div>
      <div class="uc-cap">
        <small>Ultime</small>
        <b>${h.abilities.ultimate.name}</b>
        <span>${h.name} · ${h.title}</span>
        <em>${sig.phrase}</em>
      </div>
      <div class="uc-slash"></div>
      <div class="uc-flash"></div>`;
    this.el.appendChild(el);
    try { audio.play(sig.sound, { vol: 0.75 }); } catch { /* son absent : on continue */ }
    window.setTimeout(() => el.remove(), 1500);
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
      if (outcome?.drop && (outcome.drop.rarity === 'L' || outcome.drop.rarity === 'M')) audio.play('ult_ready', { delay: 2.1, vol: 0.8 });
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
        <div class="rw gold">${icon('coin')}<b data-count="${outcome?.gold ?? stage.rewards.gold}">+0</b><small>Or</small></div>
        <div class="rw gems">${icon('gem')}<b data-count="${outcome?.gems ?? stage.rewards.gems}">+0</b><small>Gemmes</small></div>
        <div class="rw xp">${icon('star')}<b data-count="${outcome?.xp ?? stage.rewards.xp}">+0</b><small>Expérience</small></div>
      </div>
      ${outcome?.drop ? `
      <div class="rloot" style="--rc:${itemCss(outcome.drop)}">
        <div class="rloot-ico">${icon(outcome.drop.slot === 'weapon' ? 'swords' : outcome.drop.slot === 'armor' ? 'shield' : outcome.drop.slot === 'helm' ? 'helmet' : 'arrow')}</div>
        <div class="rloot-txt">
          <b>${outcome.drop.name}</b>
          <small>${itemRarity(outcome.drop)} · ${mainLabel(outcome.drop.slot)} +${outcome.drop.main}%${outcome.drop.subs.length ? ' · ' + outcome.drop.subs.map((x) => `${SUB_LABEL[x.stat]} +${x.value}%`).join(' · ') : ''}${outcome.drop.effect ? ` · <b>${outcome.drop.effect.name}</b>` : ''}</small>
        </div>
        <div class="rloot-tag">Butin</div>
      </div>` : ''}
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

    // Les récompenses roulent au lieu de tomber d'un coup (800 ms, easeOutCubic).
    if (win) {
      window.setTimeout(() => {
        const targets = this.el.querySelectorAll<HTMLElement>('.result [data-count]');
        targets.forEach((el, i) => {
          const target = Number(el.dataset.count ?? 0);
          const t0 = performance.now() + i * 110;
          const step = (): void => {
            if (!el.isConnected) return;
            const k = Math.max(0, Math.min(1, (performance.now() - t0) / 800));
            el.textContent = `+${fmt(target * (1 - Math.pow(1 - k, 3)))}`;
            if (k < 1) requestAnimationFrame(step);
            else el.textContent = `+${fmt(target)}`;
          };
          requestAnimationFrame(step);
        });
      }, 900);
    }

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
