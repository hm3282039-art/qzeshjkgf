import type { TextureKey } from '../data/heroes';

/**
 * Squelettes 2D posés sur les illustrations (façon Spine) : chaque dessin est découpé en maillage
 * et ses sommets suivent des « os » (bassin, buste, tête, bras + arme, cape, cheveux, jambes).
 *
 * Coordonnées normalisées dans l'image : u = 0…1 (largeur), v = 0…1 (hauteur).
 * Les rayons sont exprimés en fraction de la HAUTEUR de l'image.
 */
export type V2 = readonly [number, number];

/** Membre rigide qui tourne autour d'une articulation (bras + arme, bouclier, arc…). */
export interface LimbDef {
  id: 'main' | 'off' | 'draw';
  pivot: V2;
  /** Une ou plusieurs lignes brisées qui couvrent le membre (et l'arme qu'il tient). */
  segs: V2[][];
  r: number;
  soft?: number;
}

/** Tissu / cheveux : ondulent au vent, de plus en plus loin du point d'attache. */
export interface ClothDef {
  segs: V2[][];
  r: number;
  soft?: number;
  anchor: V2;
  amp: number;
  freq?: number;
}

export interface RigDef {
  hip: V2;
  neck: V2;
  head: V2;
  headR: number;
  /** v à partir duquel le buste suit entièrement la colonne (épaules). */
  spineTop: number;
  /** u qui sépare la jambe arrière de la jambe avant. */
  legSplit: number;
  limbs: LimbDef[];
  cloth: ClothDef[];
  /** Style d'attaque au corps à corps. */
  style: 'heavy' | 'fast' | 'claw' | 'bow' | 'cast' | 'light';
}

const RIGS_BASE: Record<string, RigDef> = {
  hero_kael: {
    hip: [0.53, 0.6], neck: [0.52, 0.22], head: [0.52, 0.12], headR: 0.1, spineTop: 0.3, legSplit: 0.52,
    style: 'heavy',
    limbs: [
      { id: 'main', pivot: [0.6, 0.27], segs: [[[0.61, 0.29], [0.64, 0.55], [0.99, 0.93]]], r: 0.065, soft: 0.06 },
      { id: 'off', pivot: [0.45, 0.27], segs: [[[0.41, 0.32], [0.4, 0.72]]], r: 0.15, soft: 0.05 },
    ],
    cloth: [
      { segs: [[[0.36, 0.3], [0.15, 0.45], [0.03, 0.66]]], r: 0.16, soft: 0.06, anchor: [0.42, 0.26], amp: 0.028 },
      { segs: [[[0.55, 0.62], [0.56, 0.78]]], r: 0.04, anchor: [0.55, 0.56], amp: 0.015 },
    ],
  },
  hero_lyra: {
    hip: [0.5, 0.58], neck: [0.63, 0.3], head: [0.68, 0.22], headR: 0.09, spineTop: 0.36, legSplit: 0.46,
    style: 'fast',
    limbs: [
      { id: 'main', pivot: [0.62, 0.36], segs: [[[0.63, 0.37], [0.73, 0.47], [0.99, 0.56]]], r: 0.06, soft: 0.05 },
      { id: 'off', pivot: [0.46, 0.35], segs: [[[0.45, 0.37], [0.3, 0.5], [0.1, 0.38]]], r: 0.065, soft: 0.05 },
    ],
    cloth: [
      { segs: [[[0.62, 0.12], [0.4, 0.08], [0.18, 0.12]]], r: 0.09, soft: 0.05, anchor: [0.64, 0.12], amp: 0.045, freq: 5 },
      { segs: [[[0.42, 0.29], [0.05, 0.27]]], r: 0.06, anchor: [0.46, 0.3], amp: 0.035 },
      { segs: [[[0.38, 0.6], [0.14, 0.7]]], r: 0.07, anchor: [0.44, 0.55], amp: 0.03 },
    ],
  },
  hero_morwen: {
    hip: [0.45, 0.52], neck: [0.42, 0.26], head: [0.42, 0.17], headR: 0.09, spineTop: 0.32, legSplit: 0.45,
    style: 'cast',
    limbs: [
      { id: 'main', pivot: [0.55, 0.3], segs: [[[0.56, 0.31], [0.72, 0.22], [0.8, 0.16]]], r: 0.07, soft: 0.05 },
      { id: 'off', pivot: [0.33, 0.33], segs: [[[0.32, 0.35], [0.22, 0.42]], [[0.06, 0.08], [0.2, 0.55]]], r: 0.07, soft: 0.06 },
    ],
    cloth: [
      { segs: [[[0.45, 0.66], [0.45, 0.96]]], r: 0.2, soft: 0.06, anchor: [0.45, 0.55], amp: 0.018 },
      { segs: [[[0.05, 0.75], [0.35, 0.68], [0.65, 0.58], [0.95, 0.42]]], r: 0.06, anchor: [0.5, 0.52], amp: 0.03, freq: 4 },
      { segs: [[[0.5, 0.28], [0.58, 0.5]]], r: 0.06, anchor: [0.45, 0.2], amp: 0.02 },
    ],
  },
  hero_seren: {
    hip: [0.47, 0.55], neck: [0.5, 0.29], head: [0.5, 0.2], headR: 0.09, spineTop: 0.34, legSplit: 0.47,
    style: 'bow',
    limbs: [
      { id: 'main', pivot: [0.6, 0.33], segs: [[[0.61, 0.33], [0.86, 0.33]], [[0.86, 0.02], [0.86, 0.88]]], r: 0.06, soft: 0.05 },
      { id: 'draw', pivot: [0.38, 0.33], segs: [[[0.38, 0.33], [0.47, 0.3]]], r: 0.05, soft: 0.04 },
    ],
    cloth: [
      { segs: [[[0.36, 0.33], [0.15, 0.4]]], r: 0.04, anchor: [0.4, 0.28], amp: 0.04, freq: 5 },
      { segs: [[[0.6, 0.27], [0.76, 0.25]]], r: 0.03, anchor: [0.55, 0.26], amp: 0.03, freq: 5 },
      { segs: [[[0.16, 0.45], [0.05, 0.86]]], r: 0.08, anchor: [0.3, 0.35], amp: 0.03 },
      { segs: [[[0.84, 0.55], [0.95, 0.9]]], r: 0.08, anchor: [0.7, 0.4], amp: 0.025 },
    ],
  },
  hero_aldric: {
    hip: [0.45, 0.5], neck: [0.45, 0.24], head: [0.45, 0.13], headR: 0.11, spineTop: 0.3, legSplit: 0.45,
    style: 'light',
    limbs: [
      { id: 'main', pivot: [0.27, 0.28], segs: [[[0.26, 0.29], [0.15, 0.25], [0.07, 0.17]]], r: 0.065, soft: 0.05 },
      { id: 'off', pivot: [0.68, 0.28], segs: [[[0.69, 0.29], [0.88, 0.32]]], r: 0.05, soft: 0.04 },
    ],
    cloth: [
      { segs: [[[0.88, 0.37], [0.88, 0.63]]], r: 0.06, soft: 0.04, anchor: [0.88, 0.33], amp: 0.03, freq: 2.2 },
      { segs: [[[0.2, 0.46], [0.2, 0.6]]], r: 0.07, anchor: [0.25, 0.42], amp: 0.02, freq: 2.5 },
      { segs: [[[0.45, 0.72], [0.45, 0.95]]], r: 0.24, soft: 0.05, anchor: [0.45, 0.55], amp: 0.014 },
      { segs: [[[0.68, 0.45], [0.72, 0.7]]], r: 0.04, anchor: [0.66, 0.42], amp: 0.03 },
    ],
  },
  enemy_ghoul: {
    hip: [0.52, 0.5], neck: [0.35, 0.3], head: [0.27, 0.22], headR: 0.13, spineTop: 0.36, legSplit: 0.55,
    style: 'claw',
    limbs: [
      { id: 'main', pivot: [0.35, 0.38], segs: [[[0.33, 0.4], [0.2, 0.65], [0.1, 0.9]]], r: 0.06, soft: 0.05 },
      { id: 'off', pivot: [0.47, 0.12], segs: [[[0.5, 0.1], [0.65, 0.07], [0.72, 0.25], [0.78, 0.45]]], r: 0.06, soft: 0.05 },
    ],
    cloth: [
      { segs: [[[0.55, 0.55], [0.6, 0.76]]], r: 0.08, anchor: [0.55, 0.45], amp: 0.02 },
      { segs: [[[0.3, 0.04], [0.45, 0.04]]], r: 0.05, anchor: [0.3, 0.15], amp: 0.02, freq: 5 },
    ],
  },
  enemy_skeleton: {
    hip: [0.47, 0.55], neck: [0.43, 0.27], head: [0.42, 0.18], headR: 0.1, spineTop: 0.32, legSplit: 0.47,
    style: 'bow',
    limbs: [
      { id: 'main', pivot: [0.33, 0.3], segs: [[[0.32, 0.32], [0.2, 0.58]], [[0.05, 0.05], [0.08, 0.7]]], r: 0.06, soft: 0.05 },
      { id: 'draw', pivot: [0.6, 0.3], segs: [[[0.6, 0.31], [0.55, 0.42]]], r: 0.05, soft: 0.04 },
    ],
    cloth: [
      { segs: [[[0.7, 0.35], [0.9, 0.7]]], r: 0.1, anchor: [0.6, 0.25], amp: 0.03 },
    ],
  },
  enemy_boneknight: {
    hip: [0.55, 0.55], neck: [0.53, 0.27], head: [0.53, 0.17], headR: 0.1, spineTop: 0.32, legSplit: 0.57,
    style: 'heavy',
    limbs: [
      { id: 'main', pivot: [0.5, 0.32], segs: [[[0.48, 0.35], [0.44, 0.6]], [[0.42, 0.6], [0.2, 0.7], [0.02, 0.8]]], r: 0.09, soft: 0.05 },
    ],
    cloth: [
      { segs: [[[0.65, 0.24], [0.97, 0.24]], [[0.7, 0.4], [0.9, 0.7]]], r: 0.12, soft: 0.05, anchor: [0.62, 0.22], amp: 0.035 },
    ],
  },
  hero_thorne: {
    hip: [0.48, 0.56], neck: [0.51, 0.21], head: [0.51, 0.11], headR: 0.1, spineTop: 0.29, legSplit: 0.47,
    style: 'heavy',
    limbs: [
      {
        id: 'main', pivot: [0.57, 0.26],
        segs: [
          [[0.59, 0.27], [0.65, 0.39], [0.69, 0.44]],
          [[0.34, 0.43], [0.38, 0.57]],
          [[0.24, 0.63], [0.6, 0.48], [0.98, 0.42]],
          [[0.8, 0.18], [0.93, 0.27], [0.77, 0.36], [0.95, 0.45], [0.78, 0.53], [0.88, 0.6]],
        ],
        r: 0.055, soft: 0.05,
      },
    ],
    cloth: [
      { segs: [[[0.3, 0.2], [0.13, 0.42], [0.04, 0.72]]], r: 0.14, soft: 0.06, anchor: [0.38, 0.18], amp: 0.026 },
      { segs: [[[0.51, 0.16], [0.51, 0.25]]], r: 0.03, anchor: [0.51, 0.13], amp: 0.01 },
      { segs: [[[0.48, 0.6], [0.5, 0.75]]], r: 0.05, anchor: [0.48, 0.55], amp: 0.012 },
    ],
  },
  hero_nyx: {
    hip: [0.6, 0.52], neck: [0.62, 0.24], head: [0.62, 0.16], headR: 0.08, spineTop: 0.3, legSplit: 0.6,
    style: 'cast',
    limbs: [
      { id: 'main', pivot: [0.72, 0.3], segs: [[[0.73, 0.31], [0.84, 0.38], [0.9, 0.3], [0.92, 0.22]]], r: 0.06, soft: 0.05 },
      { id: 'off', pivot: [0.53, 0.3], segs: [[[0.53, 0.31], [0.47, 0.48]], [[0.29, 0.37], [0.6, 0.66]]], r: 0.05, soft: 0.05 },
    ],
    cloth: [
      { segs: [[[0.55, 0.12], [0.3, 0.15], [0.1, 0.3]]], r: 0.1, soft: 0.05, anchor: [0.58, 0.1], amp: 0.04, freq: 3 },
      { segs: [[[0.38, 0.45], [0.1, 0.42], [0.05, 0.62]]], r: 0.08, anchor: [0.45, 0.4], amp: 0.03 },
      { segs: [[[0.6, 0.7], [0.6, 0.93]]], r: 0.22, soft: 0.05, anchor: [0.6, 0.55], amp: 0.016 },
      { segs: [[[0.85, 0.42], [0.9, 0.66]]], r: 0.06, anchor: [0.8, 0.36], amp: 0.03 },
    ],
  },
  hero_ashka: {
    hip: [0.35, 0.55], neck: [0.37, 0.24], head: [0.38, 0.15], headR: 0.09, spineTop: 0.3, legSplit: 0.33,
    style: 'cast',
    limbs: [
      {
        id: 'main', pivot: [0.46, 0.32],
        segs: [[[0.47, 0.32], [0.6, 0.38], [0.69, 0.4]], [[0.56, 0.88], [0.73, 0.3], [0.75, 0.12]], [[0.62, 0.1], [0.86, 0.1]]],
        r: 0.06, soft: 0.05,
      },
      { id: 'off', pivot: [0.26, 0.32], segs: [[[0.25, 0.33], [0.2, 0.45], [0.17, 0.57]]], r: 0.06, soft: 0.05 },
    ],
    cloth: [
      { segs: [[[0.3, 0.15], [0.12, 0.3], [0.05, 0.45]]], r: 0.1, soft: 0.05, anchor: [0.33, 0.1], amp: 0.04, freq: 4 },
      { segs: [[[0.25, 0.04], [0.4, 0.03]]], r: 0.04, anchor: [0.35, 0.08], amp: 0.015, freq: 5 },
      { segs: [[[0.35, 0.6], [0.33, 0.75]]], r: 0.09, anchor: [0.35, 0.55], amp: 0.02 },
    ],
  },
  hero_vaelen: {
    hip: [0.47, 0.62], neck: [0.57, 0.27], head: [0.635, 0.145], headR: 0.095, spineTop: 0.34, legSplit: 0.47,
    style: 'heavy',
    limbs: [
      { id: 'main', pivot: [0.6, 0.29], segs: [[[0.62, 0.31], [0.78, 0.36], [0.95, 0.56]], [[0.6, 0.22], [0.96, 0.2]], [[0.63, 0.84], [0.95, 0.86]]], r: 0.2, soft: 0.07 },
      { id: 'off', pivot: [0.42, 0.32], segs: [[[0.41, 0.34], [0.36, 0.52], [0.33, 0.67]]], r: 0.075, soft: 0.05 },
    ],
    cloth: [
      { segs: [[[0.36, 0.28], [0.2, 0.42], [0.06, 0.66]]], r: 0.16, soft: 0.06, anchor: [0.42, 0.25], amp: 0.03 },
      { segs: [[[0.64, 0.17], [0.72, 0.13]]], r: 0.04, anchor: [0.62, 0.15], amp: 0.02, freq: 3 },
      { segs: [[[0.47, 0.66], [0.48, 0.82]]], r: 0.06, anchor: [0.47, 0.6], amp: 0.014 },
    ],
  },
  hero_sylvaine: {
    hip: [0.44, 0.56], neck: [0.42, 0.17], head: [0.42, 0.105], headR: 0.062, spineTop: 0.22, legSplit: 0.44,
    style: 'bow',
    limbs: [
      { id: 'main', pivot: [0.6, 0.36], segs: [[[0.71, 0.27], [0.8, 0.45], [0.86, 0.62]], [[0.74, 0.2], [0.88, 0.3], [0.93, 0.45]]], r: 0.055, soft: 0.04 },
      { id: 'draw', pivot: [0.34, 0.36], segs: [[[0.34, 0.37], [0.46, 0.4]]], r: 0.045, soft: 0.035 },
    ],
    cloth: [
      { segs: [[[0.33, 0.26], [0.14, 0.42], [0.03, 0.72]]], r: 0.13, soft: 0.05, anchor: [0.38, 0.22], amp: 0.03 },
      { segs: [[[0.34, 0.09], [0.2, 0.2], [0.14, 0.36]]], r: 0.05, soft: 0.04, anchor: [0.38, 0.08], amp: 0.045, freq: 4 },
      { segs: [[[0.47, 0.09], [0.53, 0.24]]], r: 0.045, anchor: [0.45, 0.08], amp: 0.03, freq: 3 },
      { segs: [[[0.44, 0.6], [0.46, 0.78]]], r: 0.05, anchor: [0.44, 0.55], amp: 0.012 },
    ],
  },
  hero_pyrrha: {
    hip: [0.5, 0.56], neck: [0.53, 0.16], head: [0.545, 0.105], headR: 0.058, spineTop: 0.21, legSplit: 0.5,
    style: 'cast',
    limbs: [
      { id: 'main', pivot: [0.44, 0.36], segs: [[[0.44, 0.37], [0.38, 0.24], [0.34, 0.1]], [[0.27, 0.06], [0.44, 0.22]]], r: 0.05, soft: 0.04 },
      { id: 'off', pivot: [0.58, 0.3], segs: [[[0.58, 0.31], [0.66, 0.24], [0.7, 0.19]]], r: 0.05, soft: 0.04 },
    ],
    cloth: [
      { segs: [[[0.54, 0.07], [0.44, 0.06], [0.34, 0.1]]], r: 0.06, soft: 0.04, anchor: [0.55, 0.06], amp: 0.05, freq: 4.5 },
      { segs: [[[0.5, 0.62], [0.49, 0.84]]], r: 0.14, soft: 0.05, anchor: [0.5, 0.56], amp: 0.016 },
      { segs: [[[0.62, 0.55], [0.74, 0.68], [0.8, 0.76]]], r: 0.1, anchor: [0.6, 0.5], amp: 0.03, freq: 3 },
      { segs: [[[0.38, 0.55], [0.3, 0.72]]], r: 0.08, anchor: [0.42, 0.5], amp: 0.025 },
    ],
  },
  enemy_drowned: {
    hip: [0.5, 0.55], neck: [0.35, 0.22], head: [0.3, 0.13], headR: 0.1, spineTop: 0.3, legSplit: 0.6,
    style: 'heavy',
    limbs: [
      { id: 'main', pivot: [0.36, 0.32], segs: [[[0.36, 0.33], [0.3, 0.5], [0.23, 0.63], [0.12, 0.85]], [[0.03, 0.62], [0.14, 0.9]]], r: 0.07, soft: 0.05 },
      { id: 'off', pivot: [0.74, 0.25], segs: [[[0.75, 0.27], [0.82, 0.4], [0.88, 0.55]]], r: 0.07, soft: 0.05 },
    ],
    cloth: [
      { segs: [[[0.27, 0.1], [0.22, 0.4]]], r: 0.06, anchor: [0.3, 0.05], amp: 0.015 },
      { segs: [[[0.6, 0.5], [0.9, 0.65]]], r: 0.04, anchor: [0.6, 0.45], amp: 0.015 },
      { segs: [[[0.5, 0.62], [0.5, 0.75]]], r: 0.1, anchor: [0.5, 0.55], amp: 0.012 },
    ],
  },
  enemy_witch: {
    hip: [0.5, 0.6], neck: [0.53, 0.32], head: [0.55, 0.22], headR: 0.11, spineTop: 0.36, legSplit: 0.45,
    style: 'cast',
    limbs: [
      { id: 'main', pivot: [0.38, 0.34], segs: [[[0.38, 0.35], [0.25, 0.32], [0.1, 0.22]]], r: 0.07, soft: 0.05 },
      { id: 'off', pivot: [0.58, 0.38], segs: [[[0.58, 0.4], [0.78, 0.45]], [[0.71, 0.95], [0.78, 0.4], [0.8, 0.05]], [[0.86, 0.38], [0.87, 0.6]]], r: 0.06, soft: 0.05 },
    ],
    cloth: [
      { segs: [[[0.25, 0.45], [0.1, 0.7]]], r: 0.1, anchor: [0.35, 0.4], amp: 0.02 },
      { segs: [[[0.35, 0.12], [0.4, 0.04]]], r: 0.06, anchor: [0.4, 0.2], amp: 0.02, freq: 4 },
      { segs: [[[0.5, 0.62], [0.5, 0.8]]], r: 0.12, anchor: [0.5, 0.55], amp: 0.015 },
    ],
  },
  enemy_queen: {
    hip: [0.5, 0.5], neck: [0.49, 0.22], head: [0.49, 0.15], headR: 0.07, spineTop: 0.28, legSplit: 0.5,
    style: 'heavy',
    limbs: [
      { id: 'main', pivot: [0.45, 0.3], segs: [[[0.45, 0.31], [0.38, 0.44]], [[0.4, 0.46], [0.2, 0.33], [0.03, 0.13]], [[0.1, 0.08], [0.18, 0.38]]], r: 0.06, soft: 0.05 },
      { id: 'off', pivot: [0.56, 0.3], segs: [[[0.57, 0.31], [0.67, 0.37]]], r: 0.05, soft: 0.05 },
    ],
    cloth: [
      { segs: [[[0.55, 0.15], [0.75, 0.25], [0.95, 0.3]]], r: 0.12, soft: 0.06, anchor: [0.52, 0.1], amp: 0.035, freq: 2.5 },
      { segs: [[[0.42, 0.2], [0.3, 0.4], [0.25, 0.6]]], r: 0.06, anchor: [0.45, 0.12], amp: 0.03 },
      { segs: [[[0.05, 0.65], [0.2, 0.55], [0.3, 0.8]]], r: 0.1, anchor: [0.4, 0.6], amp: 0.03, freq: 2 },
      { segs: [[[0.75, 0.5], [0.9, 0.55], [0.75, 0.85]]], r: 0.12, anchor: [0.6, 0.6], amp: 0.03, freq: 2 },
      { segs: [[[0.5, 0.6], [0.5, 0.95]]], r: 0.22, soft: 0.05, anchor: [0.5, 0.5], amp: 0.012 },
    ],
  },
  hero_orlan: {
    hip: [0.45, 0.5], neck: [0.45, 0.24], head: [0.45, 0.13], headR: 0.11, spineTop: 0.3, legSplit: 0.45,
    style: 'light',
    limbs: [
      { id: 'main', pivot: [0.27, 0.28], segs: [[[0.26, 0.29], [0.15, 0.25], [0.07, 0.17]]], r: 0.065, soft: 0.05 },
      { id: 'off', pivot: [0.68, 0.28], segs: [[[0.69, 0.29], [0.88, 0.32]]], r: 0.05, soft: 0.04 },
    ],
    cloth: [
      { segs: [[[0.88, 0.37], [0.88, 0.63]]], r: 0.06, soft: 0.04, anchor: [0.88, 0.33], amp: 0.03, freq: 2.2 },
      { segs: [[[0.2, 0.46], [0.2, 0.6]]], r: 0.07, anchor: [0.25, 0.42], amp: 0.02, freq: 2.5 },
      { segs: [[[0.45, 0.72], [0.45, 0.95]]], r: 0.24, soft: 0.05, anchor: [0.45, 0.55], amp: 0.014 },
      { segs: [[[0.68, 0.45], [0.72, 0.7]]], r: 0.04, anchor: [0.66, 0.42], amp: 0.03 },
    ],
  },
  hero_vespera: {
    hip: [0.5, 0.58], neck: [0.63, 0.3], head: [0.68, 0.22], headR: 0.09, spineTop: 0.36, legSplit: 0.46,
    style: 'fast',
    limbs: [
      { id: 'main', pivot: [0.62, 0.36], segs: [[[0.63, 0.37], [0.73, 0.47], [0.99, 0.56]]], r: 0.06, soft: 0.05 },
      { id: 'off', pivot: [0.46, 0.35], segs: [[[0.45, 0.37], [0.3, 0.5], [0.1, 0.38]]], r: 0.065, soft: 0.05 },
    ],
    cloth: [
      { segs: [[[0.62, 0.12], [0.4, 0.08], [0.18, 0.12]]], r: 0.09, soft: 0.05, anchor: [0.64, 0.12], amp: 0.045, freq: 5 },
      { segs: [[[0.42, 0.29], [0.05, 0.27]]], r: 0.06, anchor: [0.46, 0.3], amp: 0.035 },
      { segs: [[[0.38, 0.6], [0.14, 0.7]]], r: 0.07, anchor: [0.44, 0.55], amp: 0.03 },
    ],
  },
  hero_gorm: {
    hip: [0.47, 0.62], neck: [0.57, 0.27], head: [0.635, 0.145], headR: 0.095, spineTop: 0.34, legSplit: 0.47,
    style: 'heavy',
    limbs: [
      { id: 'main', pivot: [0.6, 0.29], segs: [[[0.62, 0.31], [0.78, 0.36], [0.95, 0.56]], [[0.6, 0.22], [0.96, 0.2]], [[0.63, 0.84], [0.95, 0.86]]], r: 0.2, soft: 0.07 },
      { id: 'off', pivot: [0.42, 0.32], segs: [[[0.41, 0.34], [0.36, 0.52], [0.33, 0.67]]], r: 0.075, soft: 0.05 },
    ],
    cloth: [
      { segs: [[[0.36, 0.28], [0.2, 0.42], [0.06, 0.66]]], r: 0.16, soft: 0.06, anchor: [0.42, 0.25], amp: 0.03 },
      { segs: [[[0.64, 0.17], [0.72, 0.13]]], r: 0.04, anchor: [0.62, 0.15], amp: 0.02, freq: 3 },
      { segs: [[[0.47, 0.66], [0.48, 0.82]]], r: 0.06, anchor: [0.47, 0.6], amp: 0.014 },
    ],
  },
  // ---- Nouveaux héros (13-15) : mêmes conventions que les autres, réglées sur leurs planches ----
  hero_mira: {
    hip: [0.48, 0.6], neck: [0.53, 0.24], head: [0.545, 0.13], headR: 0.085, spineTop: 0.31, legSplit: 0.49,
    style: 'bow',
    limbs: [
      // Bras mécanique + arbalète tenue à hauteur de hanche.
      { id: 'main', pivot: [0.55, 0.32], segs: [[[0.56, 0.34], [0.6, 0.52], [0.78, 0.62]], [[0.72, 0.58], [0.99, 0.66]]], r: 0.085, soft: 0.05 },
      { id: 'off', pivot: [0.4, 0.3], segs: [[[0.4, 0.32], [0.33, 0.5], [0.31, 0.6]]], r: 0.07, soft: 0.05 },
    ],
    cloth: [
      // Le pan du manteau part de l'épaule gauche et fouette vers l'arrière.
      { segs: [[[0.42, 0.24], [0.22, 0.44], [0.08, 0.78]]], r: 0.15, soft: 0.06, anchor: [0.44, 0.24], amp: 0.032 },
      { segs: [[[0.5, 0.12], [0.62, 0.11]]], r: 0.05, anchor: [0.52, 0.13], amp: 0.02, freq: 4 },
      // Câble enroulé à la ceinture.
      { segs: [[[0.34, 0.55], [0.28, 0.62]]], r: 0.05, anchor: [0.36, 0.53], amp: 0.016 },
    ],
  },
  hero_corvin: {
    hip: [0.5, 0.58], neck: [0.5, 0.21], head: [0.5, 0.1], headR: 0.085, spineTop: 0.29, legSplit: 0.5,
    style: 'heavy',
    limbs: [
      // Grande épée tenue à deux mains, pointe au sol.
      { id: 'main', pivot: [0.57, 0.26], segs: [[[0.58, 0.28], [0.62, 0.44], [0.68, 0.52]]], r: 0.075, soft: 0.05 },
      { id: 'off', pivot: [0.43, 0.26], segs: [[[0.43, 0.28], [0.52, 0.42], [0.66, 0.5]], [[0.66, 0.5], [0.7, 0.92]]], r: 0.075, soft: 0.06 },
    ],
    cloth: [
      // Cape déchirée : deux pans qui ne tombent pas ensemble.
      { segs: [[[0.4, 0.24], [0.24, 0.52], [0.14, 0.88]]], r: 0.14, soft: 0.06, anchor: [0.42, 0.22], amp: 0.03 },
      { segs: [[[0.44, 0.26], [0.3, 0.6], [0.24, 0.9]]], r: 0.09, soft: 0.05, anchor: [0.45, 0.24], amp: 0.038, freq: 4 },
      // Surtout d'ivoire.
      { segs: [[[0.5, 0.62], [0.48, 0.86]]], r: 0.07, anchor: [0.5, 0.58], amp: 0.018 },
    ],
  },
  hero_elara: {
    hip: [0.47, 0.56], neck: [0.5, 0.22], head: [0.5, 0.1], headR: 0.08, spineTop: 0.3, legSplit: 0.46,
    style: 'cast',
    limbs: [
      // Encensoir au bout d'une chaîne, main légèrement levée.
      { id: 'main', pivot: [0.45, 0.3], segs: [[[0.44, 0.32], [0.34, 0.44], [0.26, 0.62]]], r: 0.06, soft: 0.05 },
      { id: 'off', pivot: [0.56, 0.3], segs: [[[0.57, 0.32], [0.7, 0.42], [0.81, 0.54]]], r: 0.06, soft: 0.05 },
    ],
    cloth: [
      // Voile translucide : grande amplitude, faible fréquence.
      { segs: [[[0.52, 0.2], [0.5, 0.5], [0.46, 0.9]]], r: 0.13, soft: 0.08, anchor: [0.52, 0.18], amp: 0.028, freq: 2.4 },
      { segs: [[[0.44, 0.22], [0.32, 0.5], [0.24, 0.86]]], r: 0.1, soft: 0.07, anchor: [0.45, 0.2], amp: 0.035, freq: 2.8 },
      // Traîne de robe.
      { segs: [[[0.5, 0.7], [0.46, 0.95]]], r: 0.09, anchor: [0.5, 0.64], amp: 0.02 },
    ],
  },
};
/**
 * Les recrues de la v1.5 réutilisent les squelettes existants : le rig décrit
 * la SILHOUETTE (hanches, épaules, bras, pans de tissu), pas le dessin. On clone
 * donc une silhouette de même famille (lourd, archer, mage, dagues) et on
 * ajuste les proportions pour que chaque nouveau héros ait sa démarche.
 */
const RIG_CLONES: Record<string, { base: string; tweak?: Partial<RigDef> }> = {
  hero_bran:    { base: 'hero_thorne' },
  hero_nell:    { base: 'hero_sylvaine' },
  hero_oskar:   { base: 'hero_kael' },
  hero_sable:   { base: 'hero_lyra' },
  hero_ilse:    { base: 'hero_mira' },
  hero_rook:    { base: 'hero_vaelen' },
  hero_vesper:  { base: 'hero_aldric' },
  hero_noktis:  { base: 'hero_corvin' },
  hero_aurore:  { base: 'hero_pyrrha' },
  hero_zephyr:  { base: 'hero_vespera' },
};

for (const [id, def] of Object.entries(RIG_CLONES)) {
  const base = RIGS_BASE[def.base];
  if (base) RIGS_BASE[id] = { ...base, ...def.tweak };
}

export const RIGS = RIGS_BASE as Record<TextureKey, RigDef>;


/** Délai (s) entre le début d'une attaque de base et l'impact : synchronisé avec les clips de UnitView. */
const STRIKE: Record<RigDef['style'], number> = { heavy: 0.26, fast: 0.15, claw: 0.23, bow: 0.22, cast: 0.18, light: 0.18 };
export function strikeDelay(tex: TextureKey, ranged: boolean, summon: boolean): number {
  const st = summon ? 'fast' : RIGS[tex].style;
  if (ranged) return st === 'bow' ? STRIKE.bow : STRIKE.cast;
  return st === 'bow' || st === 'cast' || st === 'light' ? STRIKE.fast : STRIKE[st];
}
