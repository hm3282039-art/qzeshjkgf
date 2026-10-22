import { ART, SCENE_BG, ULT_ART, ULT_FRAMES, ULT_VIDEO } from '../assets';
import { audio } from '../audio/AudioEngine';
import type { Archetype, UltData, UltStyle } from './ultimate';

/**
 * LA CINÉMATIQUE — version « illustration », comme dans Epic Seven
 * ----------------------------------------------------------------
 * Le vrai secret d'une cinématique d'ultime, ce n'est pas l'animation : c'est
 * de CHANGER D'IMAGE. On quitte le petit sprite du combat et on montre une
 * grande illustration dessinée pour l'occasion, plein écran, avec :
 *
 *   1. PLAN LARGE ....... l'arène, les ennemis, un monstre qui fonce
 *   2. L'ILLUSTRATION ... la grande image arrive, poussée lente, particules
 *   3. LE BLANC ......... la même image surexposée, filets colorés (le « flash »)
 *   4. LE DÉTAIL ........ gros plan sur le geste, lignes de vitesse, secousse
 *   5. L'IMPACT ......... flash, négatif, chiffres, cendres, onomatopée
 *   6. LE NOM ........... l'image s'assombrit, le carton d'ultime tombe
 *   7. SORTIE ........... fondu au noir
 *
 * Une illustration par héros (`ULT_ART`). Tant qu'un héros n'en a pas encore,
 * on utilise son portrait : la structure reste la même.
 */

/** Durée totale, en ms. */
export const CINE_MS = 6800;

/** Durée d'une vidéo d'ultime (fichier WebM), en ms. */
export const VIDEO_MS = 7000;

/** Vrai si ce héros a déjà sa vidéo. */
export const hasVideo = (id: string): boolean => Boolean(ULT_VIDEO[id]);

/** Les plans (départ, durée, libellé). */
export const CINE_SHOTS = [
  { at: 0, dur: 900, label: 'Plan large', hint: "l'arène, les ennemis, l'ombre du héros" },
  { at: 880, dur: 1420, label: 'Illustration', hint: 'la grande image arrive' },
  { at: 2280, dur: 800, label: 'Le blanc', hint: 'image surexposée, filets colorés' },
  { at: 3060, dur: 1340, label: "L'animation", hint: 'les 4 dessins de l\'action, image par image' },
  { at: 4400, dur: 900, label: "L'impact", hint: 'flash, cendres, dégâts' },
  { at: 5300, dur: 1150, label: 'Le nom', hint: "le carton d'ultime" },
  { at: 6450, dur: 350, label: 'Sortie', hint: 'fondu au noir' },
] as const;

export const cineDuration = (): number => CINE_MS;

const esc = (s: string): string => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;');

function letters(s: string): string {
  return s.split('').map((ch, i) => (ch === ' '
    ? `<i class="ca-sp" style="--i:${i}">&nbsp;</i>`
    : `<i style="--i:${i}">${esc(ch)}</i>`)).join('');
}

/** Le décor du plan large : le trône de cendre pour le néant, la citadelle sinon. */
const setOf = (a: Archetype): string =>
  a === 'void' ? SCENE_BG.throne : SCENE_BG.citadel;

const FOES = [ART.enemy_ghoul, ART.enemy_skeleton, ART.enemy_boneknight];

const shot = (id: string, index: number, inner: string): string =>
  `<section class="ca-shot ca-${id}" style="--at:${CINE_SHOTS[index]!.at}ms;--dur:${CINE_SHOTS[index]!.dur}ms">${inner}</section>`;

const dust = (n: number): string => Array.from({ length: n }, (_, i) => {
  const k = ((i * 37) % 100) - 50;
  return `<i style="--i:${i};--x:${k}%;--ax:${(k * 0.32).toFixed(1)}vmin;--d:${(i * 137) % 600}ms"></i>`;
}).join('');

const WORD: Record<Archetype, string> = {
  slam: 'BOOM', dash: 'SLASH', storm: 'VOLLEY', bless: 'LUX', void: 'VOID', line: 'BEAM',
};

export interface CineOptions {
  /** Mode laboratoire : on ajoute le décor et les ennemis du plan large. */
  lab?: boolean;
}

export function cineHTML(style: UltStyle, d: UltData, o: CineOptions = {}): string {
  const b = style === 'comics';
  const real = ULT_ART[d.id];
  const art = real ?? d.portrait;
  // Une vraie illustration est composée avec le héros à droite : on peut donc
  // cadrer serré sur son visage et sur son geste. Un portrait, lui, est centré.
  const facePos = real ? '85% 18%' : '50% 24%';
  const faceSize = real ? '300%' : '185%';
  const cropPos = real ? '60% 56%' : '50% 52%';
  const artPos = real ? '68% 50%' : '50% 30%';

  const cls = `ca ${b ? 'ca-b' : 'ca-a'} arch-${d.arch}${o.lab ? ' ca-lab' : ''}${real ? '' : ' ca-fallback'}`;

  /* ── 1 · PLAN LARGE ───────────────────────────────────────────────────── */
  const s1 = shot('s1', 0, `
    <div class="ca-bg" style="background-image:url(${setOf(d.arch)})"></div>
    <div class="ca-fog"></div>
    <div class="ca-foes-far">${FOES.map((f, i) => `<i style="--i:${i}"><img src="${f}" alt="" draggable="false"/></i>`).join('')}</div>
    <div class="ca-sil"><img src="${d.art}" alt="" draggable="false"/></div>
    <div class="ca-lunge"><img src="${ART.enemy_boneknight}" alt="" draggable="false"/></div>`);

  /* ── 2 · L'ILLUSTRATION ───────────────────────────────────────────────── */
  const s2 = shot('s2', 1, `
    <div class="ca-art" style="background-image:url(${art});background-position:${artPos}"></div>
    <div class="ca-glow"></div>
    <div class="ca-streak">${Array.from({ length: 5 }, (_, i) => `<i style="--i:${i}"></i>`).join('')}</div>
    <div class="ca-parts">${dust(16)}</div>
    <div class="ca-edge"></div>`);

  /* ── 3 · LE BLANC (la signature Epic Seven) ───────────────────────────── */
  const s3 = shot('s3', 2, `
    <div class="ca-art white" style="background-image:url(${art});background-position:${facePos};background-size:${faceSize}"></div>
    <div class="ca-art white mis mis-r" style="background-image:url(${art});background-position:${facePos};background-size:${faceSize}"></div>
    <div class="ca-art white mis mis-c" style="background-image:url(${art});background-position:${facePos};background-size:${faceSize}"></div>
    <div class="ca-glyph">${d.glyph}</div>
    <div class="ca-scribble"></div>`);

  /* ── 4 · L'ANIMATION — quatre dessins joués image par image ───────────── */
  const frames = ULT_FRAMES[d.id];
  const animInner = frames
    ? `<div class="ca-frame-bg"></div>
       <div class="ca-seq">${frames.map((f, i) =>
         `<i class="ca-fr" style="--i:${i};background-image:url(${f})"></i>`).join('')}</div>
       <div class="ca-speed">${Array.from({ length: 16 }, (_, i) => `<i style="--i:${i}"></i>`).join('')}</div>
       <div class="ca-impactline"></div>`
    : `<div class="ca-art crop" style="background-image:url(${art});background-position:${cropPos};background-size:${real ? '190%' : '150%'}"></div>
       <div class="ca-speed">${Array.from({ length: 16 }, (_, i) => `<i style="--i:${i}"></i>`).join('')}</div>`;
  const s4 = shot('s4', 3, `${animInner}<div class="ca-flash early"></div>`);

  /* ── 5 · L'IMPACT ─────────────────────────────────────────────────────── */
  const hits = [[-24, -10, 1], [14, -24, 0], [30, 2, 0], [-4, 14, 0]]
    .map(([x, y, big], i) => `<i class="${big ? 'big' : ''}" style="--i:${i};--x:${x};--y:${y}">${(i + 2) * 1370}</i>`).join('');
  const s5 = shot('s5', 4, `
    <div class="ca-art" style="background-image:url(${art});background-position:${artPos}"></div>
    <div class="ca-art neg" style="background-image:url(${art});background-position:${artPos}"></div>
    <div class="ca-shock"></div>
    <div class="ca-crack">${'<i></i>'.repeat(9)}</div>
    <div class="ca-beams">${'<i></i>'.repeat(5)}</div>
    <div class="ca-ash">${dust(16)}</div>
    <div class="ca-hits">${hits}</div>
    <div class="ca-word">${WORD[d.arch]}</div>
    <div class="ca-flash"></div>
    <div class="ca-neg"></div>`);

  /* ── 6 · LE NOM ───────────────────────────────────────────────────────── */
  const s6 = shot('s6', 5, `
    <div class="ca-art dim" style="background-image:url(${art});background-position:${artPos}"></div>
    <div class="ca-dim"></div>
    <div class="ca-dust2">${dust(12)}</div>
    <div class="ca-title">
      <small>${b ? 'ULTIME' : 'Ultime'}</small>
      <b>${letters(d.name)}</b>
      <span>${esc(d.hero)} · ${esc(d.title)}</span>
    </div>`);

  /* ── 7 · SORTIE ───────────────────────────────────────────────────────── */
  const s7 = shot('s7', 6, `<div class="ca-dim end"></div>`);

  return `<div class="${cls}" style="--c:${d.css};--c2:${d.css2}">
    ${s1}${s2}${s3}${s4}${s5}${s6}${s7}
  </div>`;
}

/**
 * Le lecteur vidéo : une VRAIE vidéo, jouée comme YouTube.
 * Rien n'est superposé par le navigateur — c'est ffmpeg qui a calculé les 140
 * images et les a encodées en un seul fichier.
 */
export function videoUltHTML(id: string, d: UltData, o: { lab?: boolean } = {}): string {
  const src = ULT_VIDEO[id];
  if (!src) return cineHTML('cinema', d, o);
  return `<div class="cvid${o.lab ? ' cvid-lab' : ''}" style="--c:${d.css}">
    <video class="cvid-el" src="${src}" autoplay muted playsinline preload="auto"></video>
    <div class="cvid-skip">${esc(d.hero)} · ${esc(d.name)}</div>
  </div>`;
}

/** Relance la vidéo de zéro (le laboratoire s'en sert pour rejouer). */
export function playVideo(el: HTMLVideoElement): void {
  try {
    el.currentTime = 0;
    void el.play();
  } catch { /* le navigateur a refusé : la vidéo reste sur sa première image */ }
}

/** La bande-son, calée sur les coupes. */
export function cineSound(animated = false): void {
  const P = (n: string, at: number, vol = 1): void => audio.play(n, { delay: at / 1000, vol });
  P('riser', 0, 0.5);
  P('braam', 860, 0.85);
  P('cutin', 2280, 0.8);
  if (animated) {
    // Chaque dessin de l'animation claque comme un coup de crayon.
    P('blink', 3060, 0.55);
    P('hit_heavy', 3360, 0.6);
    P('hit_heavy', 3660, 0.7);
  } else {
    P('blink', 3060, 0.55);
    P('blink', 3820, 0.75);
  }
  P('ult_impact', 4400, 0.95);
  P('crit', 4460, 0.8);
  P('explosion', 4440, 0.45);
  P('choir', 5290, 0.7);
  P('land', 6440, 0.6);
}
