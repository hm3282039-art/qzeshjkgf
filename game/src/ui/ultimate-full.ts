import { ART } from '../assets';
import type { UltData, UltStyle } from './ultimate';

/**
 * LA CINÉMATIQUE COMPLÈTE
 * -----------------------
 * Une révélation de nom, c'est joli, mais ce n'est pas une scène. Ici, l'ultime
 * est joué en entier, en cinq temps :
 *
 *   ACTE 1 · L'ENTRÉE ......... la caméra pousse, le monde s'éteint
 *   ACTE 2 · L'ARMEMENT ....... le héros se charge (runes, particules, aura)
 *   ACTE 3 · LE NOM ........... le carton d'ultime (la « révélation »)
 *   ACTE 4 · L'ACTION ......... ce que l'ultime FAIT (6 chorégraphies)
 *   ACTE 5 · L'IMPACT ......... arrêt sur image, dégâts, poussière, retour
 *
 * Les six chorégraphies viennent du texte de l'ultime, pas de la mode :
 *   slam (coup au sol) · dash (traversée) · storm (pluie du ciel)
 *   bless (bénédiction) · void (effondrement) · line (rayon)
 *
 * Tout est en DOM + CSS : aucun WebGL, aucun asset supplémentaire, et ça
 * s'affiche au-dessus du vrai combat sans le reconstruire.
 */

/** Durées totales, en ms (utilisées par le labo et par le combat). */
export const FULL_MS: Record<'cinema' | 'comics', number> = {
  cinema: 4600,
  comics: 4300,
};

export const fullDuration = (style: UltStyle): number =>
  style === 'comics' ? FULL_MS.comics : FULL_MS.cinema;

const esc = (s: string): string => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;');

function letters(s: string): string {
  return s.split('').map((ch, i) => (ch === ' '
    ? `<i class="cf-sp" style="--i:${i}">&nbsp;</i>`
    : `<i style="--i:${i}">${esc(ch)}</i>`)).join('');
}

/** Chiffres de dégâts décoratifs : la scène vend l'impact, pas un chiffre exact. */
const HITS = [
  { at: 0, x: -26, y: -8, big: true },
  { at: 1, x: 12, y: -22, big: false },
  { at: 2, x: 28, y: 4, big: false },
  { at: 3, x: -6, y: 16, big: false },
];

/** Trois silhouettes d'ennemis (uniquement dans le labo : en jeu, ce sont les vrais). */
const FOES = ['enemy_ghoul', 'enemy_skeleton', 'enemy_boneknight'] as const;

export interface FullOptions {
  /** Affiche un décor et des ennemis factices (laboratoire). */
  lab?: boolean;
  /** Adoucit la scène pour le combat (durée identique, moins de couches). */
  battle?: boolean;
}

/**
 * Construit la scène complète. `style` n'accepte que les deux styles que tu as
 * choisis (A cinéma, B comics) : les deux autres restent en révélation simple.
 */
export function fullUltHTML(style: UltStyle, d: UltData, o: FullOptions = {}): string {
  const s = style === 'comics' ? 'b' : 'a';
  const lab = o.lab ? ' cf-lab' : '';
  const foes = o.lab
    ? `<div class="cf-foes">${FOES.map((f, i) => `<i style="--i:${i}"><img src="${ART[f]}" alt="" draggable="false"/><b></b></i>`).join('')}</div>`
    : '';
  const hits = HITS.map((h) => `<i style="--i:${h.at};--x:${h.x};--y:${h.y}" class="${h.big ? 'big' : ''}">${(h.at + 2) * 1370}</i>`).join('');

  return `<div class="ucf cf-${s} arch-${d.arch}${lab}" style="--c:${d.css};--c2:${d.css2};--art:url(${d.art})">
    <div class="cf-world"></div>
    <div class="cf-vig"></div>
    <div class="cf-lines"></div>
    <div class="cf-neg"></div>
    ${foes}
    <div class="cf-cam">
      <div class="cf-rune"><i></i><i></i><i></i></div>
      <div class="cf-aura"></div>
      <div class="cf-hero"><img src="${d.art}" alt="" draggable="false"/><span class="cf-ghost"></span><span class="cf-ghost2"></span></div>
      <div class="cf-blade"></div>
      <div class="cf-trail"></div>
      <div class="cf-shock"></div>
      <div class="cf-crack">${'<i></i>'.repeat(9)}</div>
      <div class="cf-beams">${'<i></i>'.repeat(5)}</div>
      <div class="cf-pillars">${'<i></i>'.repeat(3)}</div>
      <div class="cf-void"></div>
      <div class="cf-parts">${'<i></i>'.repeat(14)}</div>
      <div class="cf-debris">${'<i></i>'.repeat(10)}</div>
    </div>
    <div class="cf-title">
      <small>${s === 'b' ? 'ULTIME' : 'Ultime'}</small>
      <b>${letters(d.name)}</b>
      <span>${esc(d.hero)} · ${esc(d.title)}</span>
    </div>
    <div class="cf-hit">${hits}</div>
    <div class="cf-word">${d.arch === 'dash' ? 'SLASH' : d.arch === 'slam' ? 'BOOM' : d.arch === 'storm' ? 'VOLLEY' : d.arch === 'bless' ? 'LUX' : d.arch === 'void' ? 'VOID' : 'BEAM'}</div>
    <div class="cf-bars"><i></i><i></i></div>
    <div class="cf-flash"></div>
    <div class="cf-dust"></div>
    <div class="cf-end"></div>
  </div>`;
}
