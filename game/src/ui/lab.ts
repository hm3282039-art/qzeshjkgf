import { HEROES } from '../data/heroes';
import { PORTRAITS } from '../assets';
import {
  ULT_STYLES,
  getUltStyle,
  setUltStyle,
  ultDataOf,
  ultDuration,
  ultHTML,
  type UltStyle,
} from './ultimate';
import './ultimate.css';

/**
 * LE LABORATOIRE D'ULTIMES (`?lab`)
 *
 * Une salle d'essai, en dehors du jeu : on choisit un héros, on lance les
 * quatre styles, et on garde celui qu'on préfère. Le choix est mémorisé et
 * utilisé partout en combat.
 *
 * C'est volontairement séparé du jeu : on peut rejouer en boucle sans lancer
 * un combat, et comparer les quatre côte à côte.
 */
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
        <small>Choisis le style qui te plaît — il sera utilisé pour tous les héros en combat.</small>
      </div>
      <div class="lab-acts">
        <button class="lab-btn ghost" data-back>Retour au jeu</button>
        <button class="lab-btn keep" data-keep>Garder ce style</button>
      </div>
    </header>
    <div class="lab-stage" data-stage><div class="lab-frame"></div></div>
    <div class="lab-info" data-info></div>
    <div class="lab-styles" data-styles></div>
    <div class="lab-roster" data-roster></div>`;
  document.body.appendChild(root);

  let style: UltStyle = getUltStyle();
  let heroId = HEROES[0]!.id;
  let timer = 0;

  const stage = root.querySelector<HTMLElement>('[data-stage]')!;
  const info = root.querySelector<HTMLElement>('[data-info]')!;
  const stylesEl = root.querySelector<HTMLElement>('[data-styles]')!;
  const rosterEl = root.querySelector<HTMLElement>('[data-roster]')!;

  const play = (): void => {
    window.clearTimeout(timer);
    stage.querySelectorAll('.ult').forEach((n) => n.remove());
    const def = HEROES.find((h) => h.id === heroId)!;
    stage.insertAdjacentHTML('beforeend', ultHTML(style, ultDataOf(def)));
    const el = stage.querySelector<HTMLElement>('.ult')!;
    const dur = ultDuration(style);
    timer = window.setTimeout(() => {
      el.remove();
      // Petite respiration entre deux passages, pour voir la scène « arriver ».
      timer = window.setTimeout(play, 650);
    }, dur);
  };

  const drawStyles = (): void => {
    stylesEl.innerHTML = ULT_STYLES.map((s) => `
      <button class="lab-style${s.id === style ? ' on' : ''}" data-style="${s.id}">
        <span class="ls-letter">${s.letter}</span>
        <b>${s.name}</b>
        <em>${s.tag}</em>
      </button>`).join('');
    stylesEl.querySelectorAll<HTMLElement>('[data-style]').forEach((b) =>
      b.addEventListener('click', () => {
        style = b.dataset.style as UltStyle;
        drawStyles();
        drawInfo();
        play();
      }),
    );
  };

  const drawInfo = (): void => {
    const s = ULT_STYLES.find((x) => x.id === style)!;
    const owned = HEROES;
    info.innerHTML = `
      <div class="li-txt"><b>${s.letter} · ${s.name}</b><span>${s.desc}</span></div>
      <div class="li-meta">${s.ms} ms · ${owned.length} héros · style actif : <b>${getUltStyle() === style ? 'celui-ci' : ULT_STYLES.find((x) => x.id === getUltStyle())?.name}</b></div>`;
  };

  const drawRoster = (): void => {
    rosterEl.innerHTML = HEROES.map((h) => `
      <button class="lab-hero${h.id === heroId ? ' on' : ''}" data-hero="${h.id}" style="--c:${h.css}" title="${h.name}">
        <img src="${PORTRAITS[h.id]}" alt="" draggable="false"/>
        <span>${h.name}</span>
      </button>`).join('');
    rosterEl.querySelectorAll<HTMLElement>('[data-hero]').forEach((b) =>
      b.addEventListener('click', () => {
        heroId = b.dataset.hero!;
        drawRoster();
        play();
      }),
    );
  };

  root.querySelector('[data-keep]')?.addEventListener('click', () => {
    setUltStyle(style);
    const btn = root.querySelector<HTMLElement>('[data-keep]')!;
    btn.textContent = 'Style enregistré ✓';
    btn.classList.add('done');
    window.setTimeout(() => { btn.textContent = 'Garder ce style'; btn.classList.remove('done'); }, 1800);
    drawInfo();
  });

  root.querySelector('[data-back]')?.addEventListener('click', () => {
    const u = new URL(location.href);
    u.searchParams.delete('lab');
    location.href = u.toString();
  });

  drawStyles();
  drawInfo();
  drawRoster();
  play();
  // Relance aussi quand l'onglet redevient visible (sinon la boucle peut caler).
  document.addEventListener('visibilitychange', () => { if (!document.hidden) play(); });
}
