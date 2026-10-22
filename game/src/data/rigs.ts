/* FICHIER GÉNÉRÉ par tools/rig_parts.py — ne pas modifier à la main. */
/* Les héros découpés en morceaux, avec leurs pivots (rig 2D temps réel). */

import kael_tete from '../assets/rig_kael_tete.webp';
import kael_torse from '../assets/rig_kael_torse.webp';
import kael_bras_g from '../assets/rig_kael_bras_g.webp';
import kael_bras_d from '../assets/rig_kael_bras_d.webp';
import kael_jambes from '../assets/rig_kael_jambes.webp';
import lyra_tete from '../assets/rig_lyra_tete.webp';
import lyra_torse from '../assets/rig_lyra_torse.webp';
import lyra_bras_g from '../assets/rig_lyra_bras_g.webp';
import lyra_bras_d from '../assets/rig_lyra_bras_d.webp';
import lyra_jambes from '../assets/rig_lyra_jambes.webp';
import morwen_tete from '../assets/rig_morwen_tete.webp';
import morwen_torse from '../assets/rig_morwen_torse.webp';
import morwen_bras_g from '../assets/rig_morwen_bras_g.webp';
import morwen_bras_d from '../assets/rig_morwen_bras_d.webp';
import morwen_jambes from '../assets/rig_morwen_jambes.webp';
import seren_tete from '../assets/rig_seren_tete.webp';
import seren_torse from '../assets/rig_seren_torse.webp';
import seren_bras_g from '../assets/rig_seren_bras_g.webp';
import seren_bras_d from '../assets/rig_seren_bras_d.webp';
import seren_jambes from '../assets/rig_seren_jambes.webp';
import aldric_tete from '../assets/rig_aldric_tete.webp';
import aldric_torse from '../assets/rig_aldric_torse.webp';
import aldric_bras_g from '../assets/rig_aldric_bras_g.webp';
import aldric_bras_d from '../assets/rig_aldric_bras_d.webp';
import aldric_jambes from '../assets/rig_aldric_jambes.webp';
import thorne_tete from '../assets/rig_thorne_tete.webp';
import thorne_torse from '../assets/rig_thorne_torse.webp';
import thorne_bras_g from '../assets/rig_thorne_bras_g.webp';
import thorne_bras_d from '../assets/rig_thorne_bras_d.webp';
import thorne_jambes from '../assets/rig_thorne_jambes.webp';
import nyx_tete from '../assets/rig_nyx_tete.webp';
import nyx_torse from '../assets/rig_nyx_torse.webp';
import nyx_bras_g from '../assets/rig_nyx_bras_g.webp';
import nyx_bras_d from '../assets/rig_nyx_bras_d.webp';
import nyx_jambes from '../assets/rig_nyx_jambes.webp';
import ashka_tete from '../assets/rig_ashka_tete.webp';
import ashka_torse from '../assets/rig_ashka_torse.webp';
import ashka_bras_g from '../assets/rig_ashka_bras_g.webp';
import ashka_bras_d from '../assets/rig_ashka_bras_d.webp';
import ashka_jambes from '../assets/rig_ashka_jambes.webp';
import vaelen_tete from '../assets/rig_vaelen_tete.webp';
import vaelen_torse from '../assets/rig_vaelen_torse.webp';
import vaelen_bras_g from '../assets/rig_vaelen_bras_g.webp';
import vaelen_bras_d from '../assets/rig_vaelen_bras_d.webp';
import vaelen_jambes from '../assets/rig_vaelen_jambes.webp';
import sylvaine_tete from '../assets/rig_sylvaine_tete.webp';
import sylvaine_torse from '../assets/rig_sylvaine_torse.webp';
import sylvaine_bras_g from '../assets/rig_sylvaine_bras_g.webp';
import sylvaine_bras_d from '../assets/rig_sylvaine_bras_d.webp';
import sylvaine_jambes from '../assets/rig_sylvaine_jambes.webp';

export interface RigPart { src: string; w: number; h: number; /** pivot (pied du morceau) */ px: number; py: number; /** coin haut-gauche dans le corps */ x: number; y: number; }
export interface Rig { id: string; w: number; h: number; neck: [number, number]; hip: [number, number]; parts: Record<string, RigPart>; }

export const RIGS: Record<string, Rig> = {
  kael: {
    id: 'kael', w: 1056, h: 515,
    neck: [414.5, 91], hip: [414.5, 384],
    parts: {
      tete: { src: kael_tete, w: 233, h: 134, px: 116.5, py: 134, x: 391, y: 46 },
      torse: { src: kael_torse, w: 733, h: 441, px: 366.5, py: 388.1, x: 161, y: 46 },
      bras_g: { src: kael_bras_g, w: 307, h: 348, px: 239.5, py: 62.6, x: 161, y: 95 },
      bras_d: { src: kael_bras_d, w: 530, h: 423, px: 116.6, py: 76.1, x: 362, y: 47 },
      jambes: { src: kael_jambes, w: 730, h: 219, px: 365.0, py: 35.0, x: 165, y: 287 },
    },
  },
  lyra: {
    id: 'lyra', w: 901, h: 515,
    neck: [432.0, 209], hip: [432.0, 270],
    parts: {
      tete: { src: lyra_tete, w: 499, h: 181, px: 249.5, py: 181, x: 161, y: 46 },
      torse: { src: lyra_torse, w: 560, h: 103, px: 280.0, py: 90.6, x: 161, y: 188 },
      bras_g: { src: lyra_bras_g, w: 268, h: 94, px: 209.0, py: 16.9, x: 161, y: 194 },
      bras_d: { src: lyra_bras_d, w: 283, h: 94, px: 62.3, py: 16.9, x: 436, y: 194 },
      jambes: { src: lyra_jambes, w: 578, h: 255, px: 289.0, py: 40.8, x: 162, y: 251 },
    },
  },
  morwen: {
    id: 'morwen', w: 787, h: 515,
    neck: [436.0, 97], hip: [436.0, 370],
    parts: {
      tete: { src: morwen_tete, w: 450, h: 134, px: 225.0, py: 134, x: 161, y: 46 },
      torse: { src: morwen_torse, w: 465, h: 420, px: 232.5, py: 369.6, x: 161, y: 46 },
      bras_g: { src: morwen_bras_g, w: 329, h: 404, px: 256.6, py: 72.7, x: 161, y: 46 },
      bras_d: { src: morwen_bras_d, w: 243, h: 355, px: 53.5, py: 63.9, x: 383, y: 95 },
      jambes: { src: morwen_jambes, w: 441, h: 226, px: 220.5, py: 36.2, x: 166, y: 280 },
    },
  },
  seren: {
    id: 'seren', w: 751, h: 515,
    neck: [387.5, 101], hip: [387.5, 371],
    parts: {
      tete: { src: seren_tete, w: 274, h: 138, px: 137.0, py: 138, x: 287, y: 46 },
      torse: { src: seren_torse, w: 429, h: 421, px: 214.5, py: 370.5, x: 161, y: 46 },
      bras_g: { src: seren_bras_g, w: 281, h: 352, px: 219.2, py: 63.4, x: 161, y: 99 },
      bras_d: { src: seren_bras_d, w: 256, h: 405, px: 56.3, py: 72.9, x: 334, y: 46 },
      jambes: { src: seren_jambes, w: 404, h: 225, px: 202.0, py: 36.0, x: 161, y: 281 },
    },
  },
  aldric: {
    id: 'aldric', w: 598, h: 515,
    neck: [300.5, 85], hip: [300.5, 299],
    parts: {
      tete: { src: aldric_tete, w: 178, h: 103, px: 89.0, py: 103, x: 161, y: 46 },
      torse: { src: aldric_torse, w: 275, h: 327, px: 137.5, py: 287.8, x: 161, y: 46 },
      bras_g: { src: aldric_bras_g, w: 181, h: 315, px: 141.2, py: 56.7, x: 161, y: 46 },
      bras_d: { src: aldric_bras_d, w: 176, h: 313, px: 38.7, py: 56.3, x: 260, y: 48 },
      jambes: { src: aldric_jambes, w: 266, h: 276, px: 133.0, py: 44.2, x: 170, y: 230 },
    },
  },
  thorne: {
    id: 'thorne', w: 944, h: 515,
    neck: [518.5, 70], hip: [518.5, 254],
    parts: {
      tete: { src: thorne_tete, w: 243, h: 79, px: 121.5, py: 79, x: 311, y: 46 },
      torse: { src: thorne_torse, w: 613, h: 272, px: 306.5, py: 239.4, x: 170, y: 46 },
      bras_g: { src: thorne_bras_g, w: 375, h: 260, px: 292.5, py: 46.8, x: 171, y: 48 },
      bras_d: { src: thorne_bras_d, w: 291, h: 242, px: 64.0, py: 43.6, x: 492, y: 66 },
      jambes: { src: thorne_jambes, w: 622, h: 312, px: 311.0, py: 49.9, x: 161, y: 194 },
    },
  },
  nyx: {
    id: 'nyx', w: 681, h: 515,
    neck: [359.5, 70], hip: [359.5, 266],
    parts: {
      tete: { src: nyx_tete, w: 227, h: 81, px: 113.5, py: 81, x: 222, y: 47 },
      torse: { src: nyx_torse, w: 359, h: 286, px: 179.5, py: 251.7, x: 161, y: 47 },
      bras_g: { src: nyx_bras_g, w: 233, h: 269, px: 181.7, py: 48.4, x: 161, y: 53 },
      bras_d: { src: nyx_bras_d, w: 194, h: 274, px: 42.7, py: 49.3, x: 326, y: 48 },
      jambes: { src: nyx_jambes, w: 337, h: 303, px: 168.5, py: 48.5, x: 161, y: 203 },
    },
  },
  ashka: {
    id: 'ashka', w: 742, h: 515,
    neck: [335.0, 147], hip: [335.0, 252],
    parts: {
      tete: { src: ashka_tete, w: 418, h: 131, px: 209.0, py: 131, x: 163, y: 46 },
      torse: { src: ashka_torse, w: 420, h: 175, px: 210.0, py: 154.0, x: 161, y: 112 },
      bras_g: { src: ashka_bras_g, w: 185, h: 159, px: 144.3, py: 28.6, x: 161, y: 122 },
      bras_d: { src: ashka_bras_d, w: 243, h: 159, px: 53.5, py: 28.6, x: 325, y: 122 },
      jambes: { src: ashka_jambes, w: 319, h: 287, px: 159.5, py: 45.9, x: 165, y: 219 },
    },
  },
  vaelen: {
    id: 'vaelen', w: 893, h: 515,
    neck: [536.0, 68], hip: [536.0, 272],
    parts: {
      tete: { src: vaelen_tete, w: 297, h: 83, px: 148.5, py: 83, x: 369, y: 46 },
      torse: { src: vaelen_torse, w: 571, h: 297, px: 285.5, py: 261.4, x: 161, y: 46 },
      bras_g: { src: vaelen_bras_g, w: 409, h: 285, px: 319.0, py: 51.3, x: 161, y: 46 },
      bras_d: { src: vaelen_bras_d, w: 229, h: 267, px: 50.4, py: 48.1, x: 503, y: 64 },
      jambes: { src: vaelen_jambes, w: 571, h: 301, px: 285.5, py: 48.2, x: 161, y: 205 },
    },
  },
  sylvaine: {
    id: 'sylvaine', w: 595, h: 515,
    neck: [316.0, 139], hip: [316.0, 372],
    parts: {
      tete: { src: sylvaine_tete, w: 245, h: 163, px: 122.5, py: 163, x: 189, y: 46 },
      torse: { src: sylvaine_torse, w: 273, h: 395, px: 136.5, py: 347.6, x: 161, y: 58 },
      bras_g: { src: sylvaine_bras_g, w: 202, h: 359, px: 157.6, py: 64.6, x: 161, y: 81 },
      bras_d: { src: sylvaine_bras_d, w: 164, h: 359, px: 36.1, py: 64.6, x: 270, y: 81 },
      jambes: { src: sylvaine_jambes, w: 259, h: 210, px: 129.5, py: 33.6, x: 161, y: 296 },
    },
  },
};

/** Les héros qui ont un squelette prêt. */
export const RIGGED: string[] = ['kael', 'lyra', 'morwen', 'seren', 'aldric', 'thorne', 'nyx', 'ashka', 'vaelen', 'sylvaine'];
