import { HEROES } from '../data/heroes';
import { PORTRAITS, ULT_ART, ULT_FRAMES } from '../assets';
import { audio } from '../audio/AudioEngine';
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
import { CINE_MS, CINE_SHOTS, cineHTML, cineSound } from './ultimate-cine';
import './ultimate.css';
import './ultimate-full.css';
import './ultimate-cine.css';

/**
 * LE LABORATOIRE D'ULTIMES (`?lab`)
 *
 * Trois salles d'essai :
 *   • CINÉMATIQUE — la scène en 7 plans de caméra (le vrai rendez-vous).
 *   • SCÈNE v1    — l'essai précédent : un seul plan continu, 5 actes.
 *   • CARTON      — juste la révélation du nom, 4 styles.
 *
 * On choisit en regardant. Le réglage est mémorisé et utilisé en combat.
 */

export type UltMode = 'cine' | 'full' | 'card';
const MODE_KEY = 'legendes-ult-mode';

export function getUltMode(): UltMode {
  try {
    const v = localStorage.getItem(MODE_KEY);
    return v === 'card' || v === 'full' ? v : 'cine';
  } catch { return 'cine'; }
}
export function setUltMode(m: UltMode): void {
  try { localStorage.setItem(MODE_KEY, m); } catch { /* ignoré */ }
}

/** requestAnimationFrame avec repli (le DOM de test n'en a pas). */
const raf = (fn: () => void): number =>
  typeof window.requestAnimationFrame === 'function' ? window.requestAnimationFrame(fn) : 0;

/** Les styles qui savent jouer une scène complète. */
const FULL_STYLES: UltStyle[] = ['cinema', 'comics'];

/** Repères du laboratoire, en millisecondes. */
interface Mark { at: number; label: string; hint: string }

const MARKS_CINE: Mark[] = CINE_SHOTS.map((s) => ({ at: s.at, label: s.label, hint: s.hint }));
const MARKS_FULL: Mark[] = [
  { at: 0, label: 'Entrée', hint: "la caméra pousse, le monde s'éteint" },
  { at: 830, label: 'Nom', hint: 'le carton de ton ultime' },
  { at: 1520, label: 'Action', hint: 'le héros joue son geste' },
  { at: 2390, label: 'Impact', hint: 'flash, dégâts, fissures' },
  { at: 3220, label: 'Sortie', hint: 'la poussière retombe' },
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
        <small>Trois façons de filmer le même ultime. Le combat, lui, ne change pas encore.</small>
      </div>
      <div class="lab-acts">
        <button class="lab-btn ghost" data-sound>Son : oui</button>
        <button class="lab-btn ghost" data-replay>Rejouer</button>
        <button class="lab-btn ghost" data-back>Retour au jeu</button>
        <button class="lab-btn keep" data-keep>Choisir pour le jeu</button>
      </div>
    </header>
    <div class="lab-modes">
      <button class="lab-mode" data-mode="cine"><b>Cinématique</b><span>7 plans · dessin animé image par image · son</span></button>
      <button class="lab-mode" data-mode="full"><b>Scène continue</b><span>l'essai précédent · 5 actes · un seul plan</span></button>
      <button class="lab-mode" data-mode="card"><b>Carton du nom</b><span>la révélation seule · 4 styles · 1,5 s</span></button>
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
  if (mode !== 'card' && !FULL_STYLES.includes(style)) style = 'cinema';
  let heroId = HEROES[0]!.id;
  let sound = true;
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

  /** Le navigateur n'autorise le son qu'après un vrai clic : on l'arme au premier. */
  let audioReady = false;
  const unlock = (): void => {
    if (audioReady) return;
    audioReady = true;
    audio.start();
  };
  root.addEventListener('pointerdown', unlock, { once: true });
  document.addEventListener('keydown', unlock, { once: true });

  const stop = (): void => {
    window.clearTimeout(timer); window.clearTimeout(loop);
    stage.querySelectorAll('.ult, .ucf, .ca').forEach((n) => n.remove());
  };

  const markers = (): Mark[] => (mode === 'cine' ? MARKS_CINE : mode === 'full' ? MARKS_FULL : []);

  /** Barre de progression + mise en avant du plan en cours. */
  const runProgress = (dur: number, on: boolean): void => {
    const me = ++runId;
    const fill = progEl.querySelector<HTMLElement>('i')!;
    progEl.style.opacity = on ? '1' : '0';
    actsEl.style.opacity = on ? '1' : '0';
    fill.style.animation = 'none';
    void fill.offsetWidth;
    fill.style.animation = on ? `lab-fill ${dur}ms linear forwards` : 'none';
    if (!on) return;
    const t0 = performance.now();
    const tick = (): void => {
      if (me !== runId) return;
      const ms = performance.now() - t0;
      const p = Math.min(100, (ms / dur) * 100);
      actsEl.querySelectorAll<HTMLElement>('[data-at]').forEach((m) =>
        m.classList.toggle('past', Number(m.dataset.at) <= ms));
      if (p < 100) raf(tick);
    };
    raf(tick);
  };

  const play = (once = false): void => {
    stop();
    const def = HEROES.find((h) => h.id === heroId)!;
    const d = ultDataOf(def);
    if (mode === 'card') {
      stage.insertAdjacentHTML('beforeend', ultHTML(style, d));
      const dur = ultDuration(style);
      runProgress(dur, false);
      timer = window.setTimeout(() => {
        stage.querySelectorAll('.ult').forEach((n) => n.remove());
        if (!once) loop = window.setTimeout(play, 650);
      }, dur);
      return;
    }
    const dur = mode === 'cine' ? CINE_MS : fullDuration(style);
    stage.insertAdjacentHTML('beforeend', mode === 'cine'
      ? cineHTML(style, d, { lab: true })
      : fullUltHTML(style, d, { lab: true }));
    runProgress(dur, true);
    if (mode === 'cine' && sound && audioReady) cineSound(Boolean(ULT_FRAMES[d.id]));
    const cls = mode === 'cine' ? '.ca' : '.ucf';
    timer = window.setTimeout(() => {
      stage.querySelectorAll(cls).forEach((n) => n.remove());
      if (!once) loop = window.setTimeout(play, mode === 'cine' ? 700 : 900);
    }, dur);
  };

  const drawModes = (): void => {
    modesEl.querySelectorAll<HTMLElement>('[data-mode]').forEach((b) =>
      b.classList.toggle('on', b.dataset.mode === mode));
  };

  const drawMarks = (): void => {
    const lines = markers();
    const total = mode === 'cine' ? CINE_MS : fullDuration(style);
    actsEl.innerHTML = lines.map((m, i) => {
      const pct = Math.max(0, Math.min(100, (m.at / total) * 100));
      return `<div class="lab-act${i === 0 ? ' first' : ''}" data-at="${m.at}" style="left:${pct}%"
        title="${m.hint}"><b>${m.label}</b><span>${(m.at / 1000).toFixed(1)}s</span></div>`;
    }).join('');
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
        if (mode !== 'card' && !FULL_STYLES.includes(id)) {
          mode = 'card';
          setUltMode(mode);
          drawModes(); drawMarks();
        }
        style = id;
        drawStyles(); drawInfo(); play();
      }),
    );
  };

  const drawInfo = (): void => {
    const s = ULT_STYLES.find((x) => x.id === style)!;
    const def = HEROES.find((h) => h.id === heroId)!;
    const d = ultDataOf(def);
    const arch = ARCHETYPES.find((a) => a.id === d.arch)!;
    if (mode === 'card') {
      info.innerHTML = `<div class="li-txt"><b>${s.letter} · ${s.name}</b><span>${s.desc}</span></div>
        <div class="li-meta">${s.ms} ms · carton du nom</div>`;
      return;
    }
    const dur = mode === 'cine' ? CINE_MS : fullDuration(style);
    const what = mode === 'cine'
      ? (ULT_FRAMES[def.id]
        ? '7 plans : large → illustration → blanc → **les 4 dessins joués comme un dessin animé** → impact → nom → sortie'
        : '7 plans : large → illustration → blanc → détail → impact → nom → sortie (animation à venir pour ce héros)')
      : 'un seul plan continu, 5 actes';
    info.innerHTML = `<div class="li-txt"><b>${s.letter} · ${s.name} — ${arch.label}</b><span>${what}. ${arch.show}</span></div>
      <div class="li-meta">${(dur / 1000).toFixed(1)} s · ${def.name} · « ${d.name} »</div>`;
  };

  const drawRoster = (): void => {
    rosterEl.innerHTML = HEROES.map((h) => {
      const a = ultDataOf(h).arch;
      const hasArt = Boolean(ULT_ART[h.id]);
      const animated = Boolean(ULT_FRAMES[h.id]);
      return `<button class="lab-hero${h.id === heroId ? ' on' : ''}${hasArt ? ' has-art' : ''}" data-hero="${h.id}" style="--c:${h.css}"
        title="${h.name} — ${ARCHETYPES.find((x) => x.id === a)?.label}${animated ? ' · animation 4 dessins' : hasArt ? ' · illustration d’ultime' : ' · portrait (à venir)'}">
        <img src="${PORTRAITS[h.id]}" alt="" draggable="false"/>
        <span>${h.name}</span>
      </button>`;
    }).join('');
    rosterEl.querySelectorAll<HTMLElement>('[data-hero]').forEach((b) =>
      b.addEventListener('click', () => {
        heroId = b.dataset.hero!;
        drawRoster(); drawInfo(); play();
      }),
    );
  };

  modesEl.querySelectorAll<HTMLElement>('[data-mode]').forEach((b) =>
    b.addEventListener('click', () => {
      mode = b.dataset.mode as UltMode;
      if (mode !== 'card' && !FULL_STYLES.includes(style)) style = 'cinema';
      setUltMode(mode);
      drawModes(); drawStyles(); drawMarks(); drawInfo(); play();
    }),
  );

  root.querySelector('[data-keep]')?.addEventListener('click', () => {
    setUltStyle(style);
    setUltMode(mode);
    const btn = root.querySelector<HTMLElement>('[data-keep]')!;
    btn.textContent = 'Réglage enregistré ✓';
    btn.classList.add('done');
    window.setTimeout(() => { btn.textContent = 'Choisir pour le jeu'; btn.classList.remove('done'); }, 1800);
    drawInfo();
  });

  root.querySelector('[data-sound]')?.addEventListener('click', (ev) => {
    sound = !sound;
    const btn = ev.currentTarget as HTMLElement;
    btn.textContent = sound ? 'Son : oui' : 'Son : non';
    btn.classList.toggle('off', !sound);
    unlock();
    if (sound) play(true);
  });

  root.querySelector('[data-replay]')?.addEventListener('click', () => { unlock(); play(true); });
  root.querySelector('[data-back]')?.addEventListener('click', () => {
    const u = new URL(location.href);
    u.searchParams.delete('lab');
    location.href = u.toString();
  });

  document.addEventListener('keydown', (ev) => {
    const k = ev.key;
    if (k === ' ') { ev.preventDefault(); unlock(); play(true); return; }
    const idIdx = HEROES.findIndex((h) => h.id === heroId);
    if (k === 'ArrowRight' || k === 'ArrowLeft') {
      const step = k === 'ArrowRight' ? 1 : -1;
      heroId = HEROES[(idIdx + step + HEROES.length) % HEROES.length]!.id;
      drawRoster(); drawInfo(); play();
    }
    if (k === 'ArrowDown' || k === 'ArrowUp') {
      const ids: UltStyle[] = mode === 'card' ? ULT_STYLES.map((x) => x.id) : FULL_STYLES;
      const si = Math.max(0, ids.indexOf(style));
      const step = k === 'ArrowDown' ? 1 : -1;
      style = ids[(si + step + ids.length) % ids.length]!;
      drawStyles(); drawInfo(); play();
    }
  });

  drawModes();
  drawStyles();
  drawMarks();
  drawInfo();
  drawRoster();
  play();
}
