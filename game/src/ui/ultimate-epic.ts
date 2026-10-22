import { RIGS } from '../data/rigs';
import { RIG9 } from '../data/rig9';
import { ULT_ART } from '../assets';
import { audio } from '../audio/AudioEngine';
import type { UltData, UltStyle } from './ultimate';
import './ultimate-epic.css';

/** requestAnimationFrame avec repli (le DOM de test n'en a pas). */
const raf = (fn: () => void): number =>
  typeof requestAnimationFrame === 'function' ? requestAnimationFrame(fn) : 0;

/**
 * LA SÉQUENCE S3 « À L'ÉPIC SEVEN »
 * --------------------------------
 * Ce que fait vraiment Epic Seven, et ce qu'on refait ici :
 *
 *  1. Une ILLUSTRATION dédiée qui remplace le personnage (le « cut-in »).
 *     Chez eux, elle est dessinée à part, en grande résolution, et n'a rien à
 *     voir avec le sprite de combat. Elle arrive d'un coup, cadre serré, avec
 *     un blanc surexposé. → épisode 1, 0,15 s à 0,85 s.
 *  2. Un SQUELETTE (Spine chez eux) : le corps est découpé en morceaux, chaque
 *     morceau tourne autour d'un pivot, et l'ensemble est interpolé à 60 i/s.
 *     → ici, 9 morceaux pour Kael (cape, épée et bouclier séparés).
 *  3. Une CAMÉRA animée : poussée, recul, inclinaison, secousse à l'impact.
 *  4. Des EFFETS dessinés à part (traits, onde de choc, étincelles, poussière).
 *  5. Des IMPACT FRAMES : 2 ou 3 images de contraste extrême au moment du coup.
 *
 * Rien n'est pré-rendu : tout est calculé à l'écran, donc zéro chargement.
 */

export const EPIC_MS = 4600;
/** L'instant du coup, en millisecondes. */
export const EPIC_HIT = 1860;

export const EPIC_PHASES = [
  { id: 'cutin', label: 'Cut-in', at: 0, dur: 900 },
  { id: 'dash', label: 'Élan', at: 900, dur: 600 },
  { id: 'impact', label: 'Impact', at: 1500, dur: 360 },
  { id: 'blast', label: 'Onde', at: 1860, dur: 640 },
  { id: 'outro', label: 'Sortie', at: 2500, dur: 2100 },
] as const;

/* ------------------------------------------------------------------ */
/*  Le squelette                                                       */
/* ------------------------------------------------------------------ */

interface Piece { src: string; w: number; h: number; dx: number; dy: number }
interface Bone { name: string; parent: string | null; x: number; y: number; pieces: Piece[] }
export interface Spec { w: number; h: number; hip: [number, number]; bones: Bone[]; fine: boolean }

const boneOf = (
  name: string, parent: string | null, pivot: [number, number],
  parts: { src: string; w: number; h: number; x: number; y: number }[],
): Bone => ({
  name, parent, x: pivot[0], y: pivot[1],
  pieces: parts.map((p) => ({ src: p.src, w: p.w, h: p.h, dx: p.x - pivot[0], dy: p.y - pivot[1] })),
});

/** Construit la liste des os pour un héros : 9 morceaux si on les a, sinon 5. */
export function specOf(id: string): Spec | null {
  const fine = RIG9[id];
  if (fine) {
    const P = fine.parts;
    const need = ['cape', 'jambe_g', 'jambe_d', 'pagne', 'torse', 'casque', 'bouclier', 'bras_d', 'epee'] as const;
    if (need.some((n) => !P[n])) return null;
    return {
      w: fine.w, h: fine.h, hip: fine.hip, fine: true,
      bones: [
        boneOf('cape', null, [330, 175], [P.cape!]),
        boneOf('legs', null, [480, 326], [P.jambe_g!, P.jambe_d!]),
        boneOf('pagne', null, [462, 296], [P.pagne!]),
        boneOf('torso', null, [455, 320], [P.torse!]),
        boneOf('head', 'torso', [440, 148], [P.casque!]),
        boneOf('shield', 'torso', [392, 292], [P.bouclier!]),
        boneOf('arm', 'torso', [500, 152], [P.bras_d!]),
        boneOf('sword', 'arm', [614, 292], [P.epee!]),
      ],
    };
  }
  const r = RIGS[id];
  if (!r) return null;
  const [nx, ny] = r.neck;
  const [hx, hy] = r.hip;
  const sx = (nx - hx) * 0.62;
  const sy = ny + (hy - ny) * 0.12;
  const armL = { x: nx - sx, y: sy };
  const armR = { x: nx + sx, y: sy };
  return {
    w: r.w, h: r.h, hip: r.hip, fine: false,
    bones: [
      boneOf('legs', null, r.hip, r.parts.jambes ? [r.parts.jambes] : []),
      boneOf('torso', null, r.hip, r.parts.torse ? [r.parts.torse] : []),
      boneOf('head', 'torso', r.neck, r.parts.tete ? [r.parts.tete] : []),
      boneOf('armL', 'torso', [armL.x, armL.y], r.parts.bras_g ? [r.parts.bras_g] : []),
      boneOf('armR', 'torso', [armR.x, armR.y], r.parts.bras_d ? [r.parts.bras_d] : []),
    ],
  };
}

/** Le HTML du squelette (ordre du DOM = ordre d'empilement). */
export function epicRigHTML(id: string): string {
  const s = specOf(id);
  if (!s) return '';
  const build = (b: Bone, origin: [number, number]): string => {
    const kids = s.bones.filter((c) => c.parent === b.name)
      .map((c) => build(c, [b.x, b.y])).join('');
    const pieces = b.pieces.map((p) =>
      `<i class="ep-p" style="left:${p.dx}px;top:${p.dy}px;width:${p.w}px;height:${p.h}px;background-image:url(${p.src})"></i>`)
      .join('');
    return `<div class="ep-bone" data-b="${b.name}" style="left:${b.x - origin[0]}px;top:${b.y - origin[1]}px">${pieces}${kids}</div>`;
  };
  const roots = s.bones.filter((b) => b.parent === null).map((b) => build(b, s.hip)).join('');
  return `<div class="ep-hero" style="width:${s.w}px;height:${s.h}px;transform-origin:${s.hip[0]}px ${s.hip[1]}px">${roots}</div>`;
}

/* ------------------------------------------------------------------ */
/*  Les courbes d'animation                                            */
/* ------------------------------------------------------------------ */

type Track = [number, number][];

/** Interpolation lissée (départ et arrivée en douceur, comme un vrai animateur). */
const at = (k: Track, t: number): number => {
  if (t <= k[0]![0]) return k[0]![1];
  for (let i = 1; i < k.length; i++) {
    const [t1, v1] = k[i]!;
    const [t0, v0] = k[i - 1]!;
    if (t <= t1) {
      const p = (t - t0) / (t1 - t0 || 1);
      return v0 + (v1 - v0) * (p * p * (3 - 2 * p));
    }
  }
  return k[k.length - 1]![1];
};

const HIT = EPIC_HIT;

/** Les courbes. Temps en ms, angles en degrés, déplacements en px du dessin. */
const T = {
  camZoom: [[0, 1.3], [900, 1.42], [1500, 1], [HIT, 1], [HIT + 60, 1.34], [2300, 1.08], [2900, 1], [EPIC_MS, 1]] as Track,
  camX: [[0, -4], [900, -7], [1500, 0], [HIT, 0], [HIT + 70, 3], [2400, 0], [EPIC_MS, 0]] as Track,
  camRot: [[0, -3], [900, -6], [1500, 0], [HIT, -2], [HIT + 60, -5], [2200, 1.5], [2700, 0], [EPIC_MS, 0]] as Track,
  heroX: [[0, -40], [900, -170], [1500, 0], [EPIC_MS, 0]] as Track,
  heroY: [[0, 0], [1500, 0], [1620, -18], [HIT, 0], [EPIC_MS, 0]] as Track,
  heroRot: [[0, -2], [900, -5], [1500, 0], [HIT, -3], [2050, 2], [2700, 0], [EPIC_MS, 0]] as Track,
  heroS: [[0, 1], [1500, 1], [1620, 1.03], [HIT, 1.05], [2300, 1], [EPIC_MS, 1]] as Track,
  torso: [[0, 2], [900, 3], [1500, 4], [1620, 6], [HIT, -7], [2050, -4], [2500, 1], [EPIC_MS, 0]] as Track,
  head: [[0, 5], [900, 3], [1500, -3], [HIT, 6], [2150, 2], [2700, -2], [EPIC_MS, 0]] as Track,
  armR: [[1500, -6], [1620, -26], [HIT, 20], [2050, 14], [2500, -3], [EPIC_MS, 0]] as Track,
  sword: [[1620, 6], [HIT, -14], [2100, -5], [EPIC_MS, 0]] as Track,
  cape: [[0, 0], [900, -9], [1500, -4], [1620, -12], [HIT, -14], [2400, -6], [3100, 2], [EPIC_MS, 2]] as Track,
  shield: [[1500, 0], [HIT, -7], [2300, 0], [EPIC_MS, 0]] as Track,
  legs: [[1500, -2], [HIT, 1], [2300, 0], [EPIC_MS, 0]] as Track,
};

/* ------------------------------------------------------------------ */
/*  Lecture                                                           */
/* ------------------------------------------------------------------ */

/** Un élément de décor aléatoire mais stable (pour les étincelles). */
const rand = (i: number, k: number): number => {
  const x = Math.sin(i * 12.9898 + k * 78.233) * 43758.5453;
  return x - Math.floor(x);
};

export function playEpic(
  host: HTMLElement,
  id: string,
  d: UltData,
  style: UltStyle,
  onEnd?: () => void,
): boolean {
  const spec = specOf(id);
  if (!spec) return false;
  const art = ULT_ART[id];

  const sparks = Array.from({ length: 30 }, (_, i) => {
    const a = (i / 30) * Math.PI * 2 + rand(i, 1) * 0.5;
    const dist = 140 + rand(i, 2) * 320;
    return `<i style="--dx:${Math.cos(a) * dist}px;--dy:${Math.sin(a) * dist}px;--dl:${(rand(i, 3) * 90) | 0}ms;--sz:${2 + ((rand(i, 4) * 4) | 0)}px"></i>`;
  }).join('');

  const embers = Array.from({ length: 20 }, (_, i) =>
    `<i style="left:${(rand(i, 5) * 100).toFixed(1)}%;--dl:${(rand(i, 6) * 9).toFixed(1)}s;--dr:${(4 + rand(i, 7) * 5).toFixed(1)}s;--sz:${1 + ((rand(i, 8) * 3) | 0)}px"></i>`).join('');

  const speed = Array.from({ length: 26 }, (_, i) =>
    `<i style="top:${(rand(i, 9) * 120 - 10).toFixed(1)}%;--dl:${(rand(i, 10) * 0.25).toFixed(2)}s;--len:${(12 + rand(i, 11) * 28).toFixed(0)}%"></i>`).join('');

  host.insertAdjacentHTML('beforeend', `<div class="ep ep-${style}" data-phase="cutin" style="--c:${d.css};--c2:${d.css2}">
    <div class="ep-cam">
      <div class="ep-bg"><b></b><b></b><b></b><u></u></div>
      <div class="ep-world" style="width:${spec.w}px;height:${spec.h}px">${epicRigHTML(id)}</div>
      <div class="ep-speed">${speed}</div>
      <div class="ep-shadow"></div>
      <div class="ep-slash"><svg viewBox="0 0 600 600" preserveAspectRatio="none">
        <path d="M60 470 C 150 200, 330 90, 560 40" />
        <path d="M95 520 C 190 260, 360 150, 585 105" />
      </svg></div>
      <div class="ep-shock"><i></i><i></i><i></i></div>
      <div class="ep-sparks">${sparks}</div>
      <div class="ep-dust">${embers}</div>
    </div>
    <div class="ep-cutin">${art ? `<img src="${art}" alt="" draggable="false"/>` : ''}</div>
    <div class="ep-bars"><i></i><i></i></div>
    <div class="ep-title"><small>ULTIME</small><b>${d.name}</b><span>${d.hero} · ${d.title}</span></div>
    <div class="ep-flash"></div>
    <div class="ep-invert"></div>
    <div class="ep-vig"></div>
  </div>`);

  const scene = host.lastElementChild as HTMLElement;
  if (!scene || !scene.classList.contains('ep')) return false;
  const cam = scene.querySelector<HTMLElement>('.ep-cam')!;
  const world = scene.querySelector<HTMLElement>('.ep-world')!;
  const boneEl = (n: string): HTMLElement | null => scene.querySelector<HTMLElement>(`[data-b="${n}"]`);

  // échelle : le dessin doit tenir dans la scène
  const fitH = host.clientHeight || 420;
  const k = Math.min((fitH * 0.94) / spec.h, (host.clientWidth || 720) / spec.w);
  world.style.transform = `translate(-50%,-50%) scale(${k.toFixed(3)})`;
  world.style.bottom = 'auto';

  const bones = {
    hero: scene.querySelector<HTMLElement>('.ep-hero'),
    torso: boneEl('torso'), head: boneEl('head'), arm: boneEl('arm') ?? boneEl('armR'),
    sword: boneEl('sword'), cape: boneEl('cape'), shield: boneEl('shield'), legs: boneEl('legs'),
  };
  const title = scene.querySelector<HTMLElement>('.ep-title')!;

  // les héros découpés grossièrement (5 morceaux) bougent moins : ça casserait
  const amp = spec.fine ? 1 : 0.28;

  const t0 = performance.now();
  let phase = '';
  let hitDone = false;
  let titleDone = false;

  const goPhase = (id2: string): void => {
    if (phase === id2) return;
    phase = id2;
    scene.dataset.phase = id2;
    if (id2 === 'dash') audio.play('blink', { vol: 0.55 });
    if (id2 === 'impact') audio.play('swing_h2', { vol: 0.8 });
    if (id2 === 'blast') {
      audio.play('ult_impact', { vol: 0.95 });
      audio.play('explosion', { vol: 0.5, delay: 0.03 });
      audio.play('crit', { vol: 0.6, delay: 0.06 });
    }
    if (id2 === 'outro') audio.play('land', { vol: 0.5 });
  };

  const tick = (): void => {
    const ms = performance.now() - t0;
    goPhase(ms < 900 ? 'cutin' : ms < 1500 ? 'dash' : ms < HIT ? 'impact' : ms < 2500 ? 'blast' : 'outro');

    // ── la caméra ───────────────────────────────────────────────────────
    const shake = ms > HIT && ms < HIT + 560 ? 2.2 * Math.pow(1 - (ms - HIT) / 560, 1.7) : 0;
    const sx = shake ? (Math.random() * 2 - 1) * shake : 0;
    const sy = shake ? (Math.random() * 2 - 1) * shake : 0;
    cam.style.transform =
      `translate(${(at(T.camX, ms) + sx).toFixed(2)}%, ${sy.toFixed(2)}%) ` +
      `rotate(${at(T.camRot, ms).toFixed(2)}deg) scale(${at(T.camZoom, ms).toFixed(4)})`;

    // ── le squelette ────────────────────────────────────────────────────
    const hero = bones.hero;
    if (hero) {
      hero.style.transform =
        `translate(${at(T.heroX, ms).toFixed(1)}px, ${at(T.heroY, ms).toFixed(1)}px) ` +
        `rotate(${at(T.heroRot, ms).toFixed(2)}deg) scale(${at(T.heroS, ms).toFixed(3)})`;
    }
    const setRot = (el: HTMLElement | null, v: number): void => {
      if (el) el.style.transform = `rotate(${(v * amp).toFixed(2)}deg)`;
    };
    setRot(bones.torso, at(T.torso, ms));
    setRot(bones.head, at(T.head, ms));
    setRot(bones.arm, at(T.armR, ms));
    setRot(bones.sword, at(T.sword, ms));
    setRot(bones.shield, at(T.shield, ms));
    setRot(bones.legs, at(T.legs, ms));
    setRot(bones.cape, at(T.cape, ms));

    // ── l'impact : une seule fois ───────────────────────────────────────
    if (!hitDone && ms >= HIT) {
      hitDone = true;
      scene.classList.add('hit');
    }
    // impact frames : 3 images de contraste extrême, 45 ms chacune
    if (hitDone && ms < HIT + 190) {
      scene.classList.toggle('invert', Math.floor((ms - HIT) / 45) % 2 === 0);
    } else if (scene.classList.contains('invert')) {
      scene.classList.remove('invert');
    }

    // ── le carton du nom ────────────────────────────────────────────────
    if (!titleDone && ms > 3120) {
      titleDone = true;
      title.classList.add('show');
    }

    if (ms < EPIC_MS) raf(tick);
    else onEnd?.();
  };

  audio.play('riser', { vol: 0.45 });
  audio.play('choir', { vol: 0.5, delay: 0.02 });
  audio.play('cutin', { vol: 0.7 });
  raf(tick);
  return true;
}
