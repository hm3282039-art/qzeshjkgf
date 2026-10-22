import { HEROES } from '../data/heroes';
import { PORTRAITS } from '../assets';
import {
  ARCHETYPES,
  ULT_STYLES,
  getUltStyle,
  setUltStyle,
  ultDataOf,
  ultDuration,
  ultHTML,
  type UltStyle,
} from './ultimate';
import { fullDuration, fullUltHTML } from './ultimate-full';
import './ultimate.css';
import './ultimate-full.css';

/**
 * LE LABORATOIRE D'ULTIMES (`?lab`)
 *
 * Deux salles d'essai :
 *   • RÉVÉLATION — le carton d'ultime, 4 styles (A, B, C, D), très court.
 *   • CINÉMATIQUE — la scène complète en 5 actes, 2 styles (A cinéma, B comics),
 *     avec la vraie action de l'ultime (coup au sol, traversée, pluie du ciel…).
 *
 * On choisit en regardant. Le réglage est mémorisé et utilisé en combat.
 */

export type UltMode = 'card' | 'full';
const MODE_KEY = 'legendes-ult-mode';

export function getUltMode(): UltMode {
  try { return localStorage.getItem(MODE_KEY) === 'card' ? 'card' : 'full'; } catch { return 'full'; }
}
export function setUltMode(m: UltMode): void {
  try { localStorage.setItem(MODE_KEY, m); } catch { /* ignoré */ }
}

/** requestAnimationFrame avec repli (le DOM de test n'en a pas). */
const raf = (fn: () => void): number =>
  typeof window.requestAnimationFrame === 'function' ? window.requestAnimationFrame(fn) : 0;

/** Les styles qui savent jouer une scène complète. */
const FULL_STYLES: UltStyle[] = ['cinema', 'comics'];

/** Les cinq actes, avec leur position dans la timeline (en %). */
const ACTS = [
  { at: 0, label: "Entrée", hint: "la caméra pousse, le monde s'éteint" },
  { at: 18, label: 'Nom', hint: 'le carton de ton ultime' },
  { at: 33, label: 'Action', hint: 'le héros joue son geste' },
  { at: 52, label: 'Impact', hint: 'flash, dégâts, fissures' },
  { at: 70, label: 'Sortie', hint: 'la poussière retombe' },
];

export function mountLab(): void {
  document.getElementById('loader')?.remove();
  const host = document.getElementById('game');
  if (host) host.style.display = 'none';
  const ui = document.getElementById('ui');
  if (ui) ui.innerHTML = '';

  const root = document.createElement('div');
  root.className = 'lab';
  root.innerHTML = `
    <header class="lab-top">
      <div class="lab-title">
        <b>Laboratoire d'ultimes</b>
        <small>La scène complète est en test : le combat joue encore le carton du nom. Dis-moi ce que tu gardes, je l'intègre après.</small>
      </div>
      <div class="lab-acts">
        <button class="lab-btn ghost" data-replay>Rejouer</button>
        <button class="lab-btn ghost" data-back>Retour au jeu</button>
        <button class="lab-btn keep" data-keep>Choisir pour le jeu</button>
      </div>
    </header>
    <div class="lab-modes">
      <button class="lab-mode" data-mode="full"><b>Cinématique complète</b><span>5 actes · le héros joue son ultime · 2 styles</span></button>
      <button class="lab-mode" data-mode="card"><b>Révélation seule</b><span>le carton de nom · 4 styles · 1,5 s</span></button>
    </div>
    <div class="lab-stage" data-stage>
      <div class="lab-frame"></div>
      <div class="lab-prog" data-prog><i></i></div>
      <div class="lab-time" data-acts></div>
    </div>
    <div class="lab-info" data-info></div>
    <div class="lab-styles" data-styles></div>
    <div class="lab-roster" data-roster></div>`;
  document.body.appendChild(root);

  let mode: UltMode = getUltMode();
  let style: UltStyle = getUltStyle();
  if (mode === 'full' && !FULL_STYLES.includes(style)) style = 'cinema';
  let heroId = HEROES[0]!.id;
  let timer = 0;
  let loop = 0;
  let runId = 0;

  const stage = root.querySelector<HTMLElement>('[data-stage]')!;
  const info = root.querySelector<HTMLElement>('[data-info]')!;
  const stylesEl = root.querySelector<HTMLElement>('[data-styles]')!;
  const rosterEl = root.querySelector<HTMLElement>('[data-roster]')!;
  const actsEl = root.querySelector<HTMLElement>('[data-acts]')!;
  const progEl = root.querySelector<HTMLElement>('[data-prog]')!;
  const modesEl = root.querySelector<HTMLElement>('.lab-modes')!;

  const stop = (): void => {
    window.clearTimeout(timer); window.clearTimeout(loop);
    stage.querySelectorAll('.ult, .ucf').forEach((n) => n.remove());
  };

  /** Remplit la barre de progression + met en avant l'acte en cours. */
  const runProgress = (dur: number, on: boolean): void => {
    const me = ++runId;
    const fill = progEl.querySelector<HTMLElement>('i')!;
    progEl.style.opacity = on ? '1' : '0';
    actsEl.style.opacity = on ? '1' : '0';
    fill.style.animation = 'none';
    void fill.offsetWidth;
    fill.style.animation = on ? `lab-fill ${dur}ms linear forwards` : 'none';
    if (on) {
      const t0 = performance.now();
      const tick = (): void => {
        if (me !== runId) return;
        const p = Math.min(100, ((performance.now() - t0) / dur) * 100);
        actsEl.querySelectorAll<HTMLElement>('[data-at]').forEach((m) =>
          m.classList.toggle('past', Number(m.dataset.at) <= p));
        if (p < 100) raf(tick);
      };
      raf(tick);
    }
  };

  const play = (once = false): void => {
    stop();
    const def = HEROES.find((h) => h.id === heroId)!;
    const d = ultDataOf(def);
    if (mode === 'full') {
      stage.insertAdjacentHTML('beforeend', fullUltHTML(style, d, { lab: true }));
      const dur = fullDuration(style);
      runProgress(dur, true);
      timer = window.setTimeout(() => {
        stage.querySelectorAll('.ucf').forEach((n) => n.remove());
        if (!once) loop = window.setTimeout(play, 900);
      }, dur);
    } else {
      stage.insertAdjacentHTML('beforeend', ultHTML(style, d));
      const dur = ultDuration(style);
      runProgress(dur, false);
      timer = window.setTimeout(() => {
        stage.querySelectorAll('.ult').forEach((n) => n.remove());
        if (!once) loop = window.setTimeout(play, 650);
      }, dur);
    }
  };

  const drawModes = (): void => {
    modesEl.querySelectorAll<HTMLElement>('[data-mode]').forEach((b) =>
      b.classList.toggle('on', b.dataset.mode === mode));
  };

  const drawStyles = (): void => {
    stylesEl.innerHTML = ULT_STYLES.map((s) => {
      const ok = mode === 'card' || FULL_STYLES.includes(s.id);
      return `<button class="lab-style${s.id === style ? ' on' : ''}${ok ? '' : ' off'}" data-style="${s.id}">
        <span class="ls-letter">${s.letter}</span>
        <b>${s.name}</b>
        <em>${ok ? s.tag : 'révélation seule'}</em>
      </button>`;
    }).join('');
    stylesEl.querySelectorAll<HTMLElement>('[data-style]').forEach((b) =>
      b.addEventListener('click', () => {
        const id = b.dataset.style as UltStyle;
        if (mode === 'full' && !FULL_STYLES.includes(id)) {
          mode = 'card';
          setUltMode(mode);
          drawModes();
        }
        style = id;
        drawStyles();
        drawInfo();
        play();
      }),
    );
  };

  const drawInfo = (): void => {
    const s = ULT_STYLES.find((x) => x.id === style)!;
    const def = HEROES.find((h) => h.id === heroId)!;
    const d = ultDataOf(def);
    const arch = ARCHETYPES.find((a) => a.id === d.arch)!;
    info.innerHTML = mode === 'full'
      ? `<div class="li-txt"><b>${s.letter} · ${s.name} — ${arch.label}</b>
          <span>${arch.show}</span></div>
         <div class="li-meta">${fullDuration(style)} ms · ${def.name} · « ${d.name} » · style actif :
           <b>${getUltMode() === 'full' && getUltStyle() === style ? 'celui-ci' : ULT_STYLES.find((x) => x.id === getUltStyle())?.name}</b></div>`
      : `<div class="li-txt"><b>${s.letter} · ${s.name}</b><span>${s.desc}</span></div>
         <div class="li-meta">${s.ms} ms · style actif :
           <b>${getUltMode() === 'card' && getUltStyle() === style ? 'celui-ci' : 'autre'}</b></div>`;
  };

  const drawRoster = (): void => {
    rosterEl.innerHTML = HEROES.map((h) => {
      const a = ultDataOf(h).arch;
      return `<button class="lab-hero${h.id === heroId ? ' on' : ''}" data-hero="${h.id}" style="--c:${h.css}"
        title="${h.name} — ${ARCHETYPES.find((x) => x.id === a)?.label}">
        <img src="${PORTRAITS[h.id]}" alt="" draggable="false"/>
        <span>${h.name}</span>
      </button>`;
    }).join('');
    rosterEl.querySelectorAll<HTMLElement>('[data-hero]').forEach((b) =>
      b.addEventListener('click', () => {
        heroId = b.dataset.hero!;
        drawRoster();
        drawInfo();
        play();
      }),
    );
  };

  modesEl.querySelectorAll<HTMLElement>('[data-mode]').forEach((b) =>
    b.addEventListener('click', () => {
      mode = b.dataset.mode as UltMode;
      if (mode === 'full' && !FULL_STYLES.includes(style)) style = 'cinema';
      setUltMode(mode);
      drawModes();
      drawStyles();
      drawInfo();
      play();
    }),
  );

  root.querySelector('[data-keep]')?.addEventListener('click', () => {
    setUltStyle(style);
    setUltMode(mode);
    const btn = root.querySelector<HTMLElement>('[data-keep]')!;
    btn.textContent = 'Réglage enregistré ✓';
    btn.classList.add('done');
    window.setTimeout(() => { btn.textContent = 'Garder ce réglage'; btn.classList.remove('done'); }, 1800);
    drawInfo();
  });

  root.querySelector('[data-replay]')?.addEventListener('click', () => play(true));
  root.querySelector('[data-back]')?.addEventListener('click', () => {
    const u = new URL(location.href);
    u.searchParams.delete('lab');
    location.href = u.toString();
  });

  actsEl.innerHTML = ACTS.map((a) => `<div class="lab-act${a.at === 0 ? ' first' : ''}" data-at="${a.at}" style="left:${a.at}%" title="${a.hint}">
    <b>${a.label}</b><span>${a.at}%</span></div>`).join('');

  document.addEventListener('keydown', (ev) => {
    const k = ev.key;
    if (k === ' ') { ev.preventDefault(); play(true); return; }
    const idIdx = HEROES.findIndex((h) => h.id === heroId);
    if (k === 'ArrowRight' || k === 'ArrowLeft') {
      const step = k === 'ArrowRight' ? 1 : -1;
      heroId = HEROES[(idIdx + step + HEROES.length) % HEROES.length]!.id;
      drawRoster(); drawInfo(); play();
    }
    if (k === 'ArrowDown' || k === 'ArrowUp') {
      const ids = mode === 'full' ? FULL_STYLES : ULT_STYLES.map((x) => x.id);
      const si = Math.max(0, ids.indexOf(style));
      const step = k === 'ArrowDown' ? 1 : -1;
      style = ids[(si + step + ids.length) % ids.length]!;
      drawStyles(); drawInfo(); play();
    }
  });

  drawModes();
  drawStyles();
  drawInfo();
  drawRoster();
  play();
  document.addEventListener('visibilitychange', () => { if (!document.hidden) play(); });
}
