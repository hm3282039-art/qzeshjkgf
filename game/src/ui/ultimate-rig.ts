import { RIGS } from '../data/rigs';
import type { UltData, UltStyle } from './ultimate';
import './ultimate-rig.css';

/** requestAnimationFrame avec repli (le DOM de test n'en a pas). */
const raf = (fn: () => void): number =>
  typeof requestAnimationFrame === 'function' ? requestAnimationFrame(fn) : 0;
import { audio } from '../audio/AudioEngine';

/**
 * LE MOTEUR 2D TEMPS RÉEL — façon Spine / « YUNA Engine »
 * -------------------------------------------------------
 * Pas de vidéo, pas d'images pré-rendues : on garde le dessin du héros
 * découpé en morceaux (tête, torse, bras, jambes) et on les ANIME à l'écran,
 * 60 fois par seconde, en déplaçant et en tournant chaque morceau autour de son
 * pivot. C'est le principe de Spine 2D :
 *
 *   • un squelette virtuel (pieds → hanches → torse → cou → bras)
 *   • chaque morceau est accroché à un os
 *   • on n'enregistre que des POSES (quelques nombres), jamais des images
 *
 * Conséquences, exactement celles que tu décrivis :
 *   • l'ultime démarre instantanément — rien à charger, les morceaux sont déjà là
 *   • poids minuscule : une pose = 8 nombres, contre 300 Ko de vidéo
 *   • fluide même sur un téléphone d'entrée de gamme : c'est le GPU qui tourne
 *
 * Les effets (flammes, éclats, ondes) restent, eux, de la « cell animation » :
 * des dizaines de petits éléments dessinés image par image par le moteur.
 */

/** Une pose du squelette. Tous les angles sont en degrés. */
export interface Pose {
  /** décalage du bassin (en fraction de la hauteur du corps) */
  hipY: number;
  hipX: number;
  /** inclinaison du torse */
  torso: number;
  /** rotation de la tête */
  head: number;
  /** bras gauche / droit */
  armL: number;
  armR: number;
  /** jambes */
  legs: number;
  /** échelle globale */
  scale: number;
}

export const REST: Pose = { hipY: 0, hipX: 0, torso: 0, head: 0, armL: 0, armR: 0, legs: 0, scale: 1 };

const P = (p: Partial<Pose>): Pose => ({ ...REST, ...p });

/**
 * Les poses de l'ultime. Elles dépendent du GESTE du héros (son archétype) :
 * un coup au sol ne se joue pas comme une pluie du ciel.
 */
export const ULT_POSES: Record<string, { at: number; pose: Pose }[]> = {
  slam: [
    { at: 0.00, pose: P({}) },
    { at: 0.10, pose: P({ hipY: 0.03, torso: -6, armL: 10, armR: 18, head: -4 }) },
    { at: 0.26, pose: P({ hipY: -0.10, torso: -16, armL: 26, armR: 74, head: -12, scale: 1.03 }) },
    { at: 0.40, pose: P({ hipY: -0.13, torso: -22, armL: 34, armR: 96, head: -16, scale: 1.05 }) },
    { at: 0.54, pose: P({ hipY: 0.07, torso: 24, armL: -26, armR: -64, head: 12, scale: 1.06 }) },
    { at: 0.60, pose: P({ hipY: 0.05, torso: 18, armL: -18, armR: -52, head: 9 }) },
    { at: 0.72, pose: P({ hipY: 0.01, torso: 6, armL: -6, armR: -20, head: 3 }) },
    { at: 1.00, pose: P({}) },
  ],
  dash: [
    { at: 0.00, pose: P({}) },
    { at: 0.12, pose: P({ hipY: 0.05, torso: -10, armL: -18, armR: 22, head: -8 }) },
    { at: 0.26, pose: P({ hipY: -0.02, hipX: -0.06, torso: 18, armL: 44, armR: 58, head: 10, scale: 1.04 }) },
    { at: 0.42, pose: P({ hipY: -0.02, hipX: 0.06, torso: -26, armL: -58, armR: -44, head: -14, scale: 1.05 }) },
    { at: 0.56, pose: P({ hipY: 0.02, hipX: 0.02, torso: 30, armL: 66, armR: 52, head: 16, scale: 1.05 }) },
    { at: 0.70, pose: P({ hipY: 0.03, torso: 12, armL: 24, armR: 18, head: 6 }) },
    { at: 1.00, pose: P({}) },
  ],
  storm: [
    { at: 0.00, pose: P({}) },
    { at: 0.14, pose: P({ hipY: 0.02, torso: 8, armL: -8, armR: -8, head: 10 }) },
    { at: 0.32, pose: P({ hipY: -0.08, torso: -12, armL: -64, armR: -70, head: -16, scale: 1.03 }) },
    { at: 0.48, pose: P({ hipY: -0.10, torso: -16, armL: -82, armR: -88, head: -20, scale: 1.05 }) },
    { at: 0.60, pose: P({ hipY: -0.04, torso: -4, armL: -30, armR: -36, head: -6 }) },
    { at: 1.00, pose: P({}) },
  ],
  bless: [
    { at: 0.00, pose: P({}) },
    { at: 0.16, pose: P({ hipY: 0.02, torso: 6, armL: 12, armR: 12, head: 8 }) },
    { at: 0.38, pose: P({ hipY: -0.10, torso: -6, armL: -46, armR: -46, head: -14, scale: 1.03 }) },
    { at: 0.56, pose: P({ hipY: -0.13, torso: -10, armL: -66, armR: -66, head: -20, scale: 1.05 }) },
    { at: 0.74, pose: P({ hipY: -0.06, torso: -4, armL: -26, armR: -26, head: -8 }) },
    { at: 1.00, pose: P({}) },
  ],
  void: [
    { at: 0.00, pose: P({}) },
    { at: 0.14, pose: P({ hipY: 0.03, torso: -8, armL: 20, armR: 20, head: -6 }) },
    { at: 0.34, pose: P({ hipY: -0.06, torso: -18, armL: 54, armR: 54, head: -14, scale: 0.97 }) },
    { at: 0.52, pose: P({ hipY: -0.02, torso: 14, armL: -40, armR: -40, head: 16, scale: 1.08 }) },
    { at: 0.64, pose: P({ hipY: 0.02, torso: 22, armL: -66, armR: -66, head: 20, scale: 1.10 }) },
    { at: 1.00, pose: P({}) },
  ],
  line: [
    { at: 0.00, pose: P({}) },
    { at: 0.16, pose: P({ hipY: 0.03, torso: -14, armL: 22, armR: 40, head: -10 }) },
    { at: 0.34, pose: P({ hipY: 0.01, torso: -24, armL: 36, armR: 86, head: -16, scale: 1.03 }) },
    { at: 0.50, pose: P({ hipY: 0.00, torso: 16, armL: -24, armR: -30, head: 10, scale: 1.04 }) },
    { at: 0.64, pose: P({ hipY: 0.00, torso: 6, armL: -8, armR: -10, head: 4 }) },
    { at: 1.00, pose: P({}) },
  ],
};

const lerp = (a: number, b: number, t: number): number => a + (b - a) * t;
const ease = (t: number): number => (t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2);

/** Mélange deux poses (avec lissage) — c'est ça qui rend le mouvement fluide. */
export function mixPose(a: Pose, b: Pose, t: number): Pose {
  const k = ease(Math.max(0, Math.min(1, t)));
  return {
    hipY: lerp(a.hipY, b.hipY, k),
    hipX: lerp(a.hipX, b.hipX, k),
    torso: lerp(a.torso, b.torso, k),
    head: lerp(a.head, b.head, k),
    armL: lerp(a.armL, b.armL, k),
    armR: lerp(a.armR, b.armR, k),
    legs: lerp(a.legs, b.legs, k),
    scale: lerp(a.scale, b.scale, k),
  };
}

/** La pose à l'instant `t` (0 → 1) d'une chorégraphie. */
export function poseAt(keys: { at: number; pose: Pose }[], t: number): Pose {
  if (t <= keys[0]!.at) return keys[0]!.pose;
  for (let i = 1; i < keys.length; i++) {
    const k0 = keys[i - 1]!;
    const k1 = keys[i]!;
    if (t <= k1.at) {
      const span = Math.max(0.0001, k1.at - k0.at);
      return mixPose(k0.pose, k1.pose, (t - k0.at) / span);
    }
  }
  return keys[keys.length - 1]!.pose;
}

/** Tout le corps tient dans un seul élément : un `div`, cinq images, zéro canvas. */
export function rigHTML(id: string): string {
  const rig = RIGS[id];
  if (!rig) return '';
  const part = (name: string): string => {
    const p = rig.parts[name];
    if (!p) return '';
    return `<i class="rg-p rg-${name}" style="
      left:${(p.x / rig.w) * 100}%;top:${(p.y / rig.h) * 100}%;
      width:${(p.w / rig.w) * 100}%;height:${(p.h / rig.h) * 100}%;
      transform-origin:${(p.px / p.w) * 100}% ${(p.py / p.h) * 100}%;
      background-image:url(${p.src})"></i>`;
  };
  // du fond vers l'avant : jambes, torse, bras, tête
  return `<div class="rg" data-n="${(rig.neck[1] / rig.h).toFixed(3)}"><div class="rg-body">
    ${part('jambes')}${part('torse')}${part('bras_g')}${part('bras_d')}${part('tete')}
  </div></div>`;
}

/** Applique une pose aux morceaux du squelette (une seule écriture par image). */
export function applyPose(root: HTMLElement, pose: Pose): void {
  const body = root.querySelector<HTMLElement>('.rg-body');
  if (!body) return;
  body.style.transform =
    `translate(${pose.hipX * 100}%, ${pose.hipY * 100}%) rotate(${pose.torso}deg) scale(${pose.scale})`;
  const set = (name: string, deg: number): void => {
    const el = root.querySelector<HTMLElement>(`.rg-${name}`);
    if (el) el.style.rotate = `${deg}deg`;
  };
  set('tete', pose.head - pose.torso);
  set('bras_g', pose.armL - pose.torso);
  set('bras_d', pose.armR - pose.torso);
  set('jambes', -pose.torso + pose.legs);
}

/** La durée d'une chorégraphie de squelette, en ms. */
export const RIG_MS = 5200;

/**
 * Joue l'ultime d'un héros avec son squelette, en temps réel.
 * Une seule fonction : c'est elle qui remplace les vidéos.
 */
export function playRig(
  host: HTMLElement,
  id: string,
  d: UltData,
  style: UltStyle,
  onEnd?: () => void,
): void {
  const rig = RIGS[id];
  if (!rig) return;
  const t0 = performance.now();
  const keys = ULT_POSES[d.arch] ?? ULT_POSES.slam!;

  host.innerHTML = `<div class="rscene rscene-${style} arch-${d.arch}" style="--c:${d.css};--c2:${d.css2}">
    <div class="rs-bg"></div>
    <div class="rs-glow"></div>
    <div class="rs-aura"></div>
    <div class="rs-parts">${'<i></i>'.repeat(18)}</div>
    <div class="rs-shock"></div>
    <div class="rs-crack">${'<i></i>'.repeat(9)}</div>
    <div class="rs-title"><small>ULTIME</small><b>${d.name}</b><span>${d.hero} · ${d.title}</span></div>
    <div class="rs-frame" style="aspect-ratio:${rig.w} / ${rig.h}">${rigHTML(id)}</div>
    <div class="rs-flash"></div>
    <div class="rs-end"></div>
  </div>`;

  const scene = host.querySelector<HTMLElement>('.rscene')!;
  const frame = host.querySelector<HTMLElement>('.rs-frame')!;
  const glyph = host.querySelector<HTMLElement>('.rs-title')!;

  // le héros « respire » : léger balancement quand il ne fait rien
  const tick = (): void => {
    const ms = performance.now() - t0;
    const t = Math.min(1, ms / RIG_MS);
    applyPose(frame, poseAt(keys, t));
    // impact : au moment où le geste frappe (54 % pour un coup au sol)
    const hitAt = d.arch === 'slam' ? 0.54 : d.arch === 'dash' ? 0.56 : 0.5;
    if (t > hitAt && !scene.classList.contains('hit')) {
      scene.classList.add('hit');
      audio.play('ult_impact', { vol: 0.9 });
      audio.play('crit', { vol: 0.7, delay: 0.06 });
    }
    if (t > 0.52 && t < 0.62) glyph.classList.add('show');
    if (ms < RIG_MS) raf(tick);
    else onEnd?.();
  };
  audio.play('riser', { vol: 0.5 });
  raf(tick);
}
