import { ART, SCENE_BG } from '../assets';
import { audio } from '../audio/AudioEngine';
import type { Archetype, UltData, UltStyle } from './ultimate';

/**
 * LA CINÉMATIQUE — version « plans de caméra »
 * -------------------------------------------
 * Une cinématique, ce n'est pas un effet qui dure plus longtemps : c'est un
 * MONTAGE. On coupe d'un plan à l'autre pour raconter une action :
 *
 *   1. PLAN LARGE ....... l'arène, les ennemis, une ombre qui avance
 *   2. GROS PLAN ......... le visage du héros, la lumière qui monte
 *   3. CONTRE-JOUR ....... sa silhouette noire, le sceau s'allume
 *   4. L'ÉLAN ............ il part (vitesse, images fantômes, poussière)
 *   5. L'IMPACT .......... ralenti, flash, les ennemis partent en cendres
 *   6. LE NOM ............ il se relève, le carton d'ultime tombe
 *   7. SORTIE ............ recul de caméra, fondu au noir
 *
 * Chaque plan est une `section` indépendante : on coupe (pas de fondu) et on
 * ne change que le CADRAGE, pas le dessin. C'est exactement comme ça qu'une
 * cinématique 2D est fabriquée : peu d'images, mais bien montées.
 */

/** Durée totale, en ms. */
export const CINE_MS = 6800;

/** Les plans, avec leur départ et leur durée (ms). */
export const CINE_SHOTS = [
  { at: 0, dur: 1000, label: 'Plan large', hint: "l'arène, les ennemis, une ombre" },
  { at: 880, dur: 950, label: 'Gros plan', hint: 'le visage, la lumière qui monte' },
  { at: 1750, dur: 700, label: 'Contre-jour', hint: 'la silhouette, le sceau' },
  { at: 2400, dur: 900, label: "L'élan", hint: 'il part, images fantômes' },
  { at: 3250, dur: 1050, label: "L'impact", hint: 'ralenti, flash, cendres' },
  { at: 4300, dur: 1400, label: 'Le nom', hint: "le carton d'ultime" },
  { at: 5600, dur: 1200, label: 'Sortie', hint: 'recul, fondu au noir' },
] as const;

export const cineDuration = (): number => CINE_MS;

const esc = (s: string): string => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;');

function letters(s: string): string {
  return s.split('').map((ch, i) => (ch === ' '
    ? `<i class="cs-sp" style="--i:${i}">&nbsp;</i>`
    : `<i style="--i:${i}">${esc(ch)}</i>`)).join('');
}

/** Le décor du plan large : le trône de cendre pour le néant, la citadelle sinon. */
const setOf = (a: Archetype): string =>
  a === 'void' ? SCENE_BG.throne : SCENE_BG.citadel;

const FOES = [ART.enemy_ghoul, ART.enemy_skeleton, ART.enemy_boneknight];

const shot = (id: string, at: number, dur: number, inner: string): string =>
  `<section class="cs-shot cs-${id}" style="--at:${at}ms;--dur:${dur}ms">${inner}</section>`;

/** Douze petites particules avec un départ aléatoire fixe (pas de Math.random : rendu stable). */
const dust = (n: number): string => Array.from({ length: n }, (_, i) => {
  const k = ((i * 37) % 100) - 50;
  return `<i style="--i:${i};--x:${k}%;--ax:${(k * 0.32).toFixed(1)}vmin;--d:${(i * 137) % 600}ms"></i>`;
}).join('');

export function cineHTML(style: UltStyle, d: UltData, o: { lab?: boolean } = {}): string {
  const b = style === 'comics';
  const cls = `cs ${b ? 'cs-b' : 'cs-a'} arch-${d.arch}${o.lab ? ' cs-lab' : ''}`;
  const set = setOf(d.arch);

  /* ── 1 · PLAN LARGE ───────────────────────────────────────────────────── */
  const s1 = shot('s1', 0, 1000, `
    <div class="cs-bg" style="background-image:url(${set})"></div>
    <div class="cs-fog"></div>
    <div class="cs-foes-far">${FOES.map((f, i) => `<i style="--i:${i}"><img src="${f}" alt="" draggable="false"/></i>`).join('')}</div>
    <div class="cs-sil"><img src="${d.art}" alt="" draggable="false"/></div>
    <div class="cs-lunge"><img src="${ART.enemy_boneknight}" alt="" draggable="false"/></div>
    <div class="cs-scan"></div>`);

  /* ── 2 · GROS PLAN ────────────────────────────────────────────────────── */
  const s2 = shot('s2', 880, 950, `
    <div class="cs-black"></div>
    <div class="cs-halo"></div>
    <div class="cs-portrait"><img src="${d.portrait}" alt="" draggable="false"/></div>
    <div class="cs-rim"></div>
    <div class="cs-glint"></div>
    <div class="cs-dust">${dust(12)}</div>`);

  /* ── 3 · CONTRE-JOUR ──────────────────────────────────────────────────── */
  const s3 = shot('s3', 1750, 700, `
    <div class="cs-black"></div>
    <div class="cs-backlight"></div>
    <div class="cs-sil2"><img src="${d.art}" alt="" draggable="false"/></div>
    <div class="cs-rings"><i></i><i></i><i></i></div>
    <div class="cs-glyph">${d.glyph}</div>`);

  /* ── 4 · L'ÉLAN ───────────────────────────────────────────────────────── */
  const s4 = shot('s4', 2400, 900, `
    <div class="cs-bg" style="background-image:url(${set})"></div>
    <div class="cs-speed">${Array.from({ length: 14 }, (_, i) => `<i style="--i:${i}"></i>`).join('')}</div>
    <div class="cs-run">
      <span class="cs-ghost g1"><img src="${d.art}" alt="" draggable="false"/></span>
      <span class="cs-ghost g2"><img src="${d.art}" alt="" draggable="false"/></span>
      <span class="cs-ghost g3"><img src="${d.art}" alt="" draggable="false"/></span>
      <img class="cs-hero" src="${d.art}" alt="" draggable="false"/>
    </div>
    <div class="cs-kick">${Array.from({ length: 8 }, (_, i) => `<i style="--i:${i}"></i>`).join('')}</div>`);

  /* ── 5 · L'IMPACT ─────────────────────────────────────────────────────── */
  const hits = [[-24, -10, 1], [14, -24, 0], [30, 2, 0], [-4, 14, 0]]
    .map(([x, y, big], i) => `<i class="${big ? 'big' : ''}" style="--i:${i};--x:${x};--y:${y}">${(i + 2) * 1370}</i>`).join('');
  const word = d.arch === 'dash' ? 'SLASH' : d.arch === 'slam' ? 'BOOM' : d.arch === 'storm' ? 'VOLLEY'
    : d.arch === 'bless' ? 'LUX' : d.arch === 'void' ? 'VOID' : 'BEAM';
  const s5 = shot('s5', 3250, 1050, `
    <div class="cs-bg" style="background-image:url(${set})"></div>
    <div class="cs-foes-hit">${FOES.map((f, i) => `<i style="--i:${i}"><img src="${f}" alt="" draggable="false"/><b></b></i>`).join('')}</div>
    <div class="cs-shock"></div>
    <div class="cs-crack">${'<i></i>'.repeat(9)}</div>
    <div class="cs-beams">${'<i></i>'.repeat(5)}</div>
    <div class="cs-pillars">${'<i></i>'.repeat(3)}</div>
    <div class="cs-void"></div>
    <div class="cs-blade"></div>
    <div class="cs-ash">${dust(14)}</div>
    <div class="cs-hits">${hits}</div>
    <div class="cs-word">${word}</div>
    <div class="cs-flash"></div>
    <div class="cs-neg"></div>`);

  /* ── 6 · LE NOM ───────────────────────────────────────────────────────── */
  const s6 = shot('s6', 4300, 1400, `
    <div class="cs-black"></div>
    <div class="cs-ground"></div>
    <div class="cs-pose"><img src="${d.art}" alt="" draggable="false"/></div>
    <div class="cs-dust2">${dust(10)}</div>
    <div class="cs-title">
      <small>${b ? 'ULTIME' : 'Ultime'}</small>
      <b>${letters(d.name)}</b>
      <span>${esc(d.hero)} · ${esc(d.title)}</span>
    </div>`);

  /* ── 7 · SORTIE ───────────────────────────────────────────────────────── */
  const s7 = shot('s7', 5600, 1200, `<div class="cs-worlddim"></div><div class="cs-end"></div>`);

  return `<div class="${cls}" style="--c:${d.css};--c2:${d.css2};--art:url(${d.art})">
    ${s1}${s2}${s3}${s4}${s5}${s6}${s7}
  </div>`;
}

/**
 * La bande-son de la scène, calée sur les coupes. Si l'audio n'est pas encore
 * autorisé par le navigateur, rien ne se passe : la scène reste silencieuse.
 */
export function cineSound(): void {
  const P = (n: string, at: number, vol = 1): void => audio.play(n, { delay: at / 1000, vol });
  P('riser', 0, 0.55);
  P('braam', 860, 0.7);
  P('blink', 1720, 0.5);
  P('cutin', 1760, 0.75);
  P('blink', 2380, 0.7);
  P('ult_impact', 3250, 0.95);
  P('crit', 3320, 0.8);
  P('explosion', 3320, 0.5);
  P('choir', 4280, 0.75);
  P('land', 5580, 0.7);
}
