/* FICHIER GÉNÉRÉ par tools/rig_parts.py — ne pas modifier à la main. */
/* Les héros découpés en morceaux, avec leurs pivots (rig 2D temps réel). */


const rigMods = import.meta.glob('../assets/rig_*.webp', { eager: true, query: '?url', import: 'default' }) as Record<string, string>;
const PARTS: Record<string, Record<string, string>> = {};
for (const [chemin, url] of Object.entries(rigMods)) {
  const m = chemin.match(/rig_([a-z]+)_(tete|torse|bras_g|bras_d|jambes)\.webp$/);
  if (!m) continue;
  (PARTS[m[1]!] ??= {})[m[2]!] = url;
}
const part = (id: string, morceau: string): string => PARTS[id]?.[morceau] ?? '';
const MORCEAUX = ['tete', 'torse', 'bras_g', 'bras_d', 'jambes'];
const complet = (id: string): boolean => !!PARTS[id] && MORCEAUX.every((x) => !!PARTS[id]![x]);

export interface RigPart { src: string; w: number; h: number; /** pivot (pied du morceau) */ px: number; py: number; /** coin haut-gauche dans le corps */ x: number; y: number; }
export interface Rig { id: string; w: number; h: number; neck: [number, number]; hip: [number, number]; parts: Record<string, RigPart>; }

export const RIGS: Record<string, Rig> = {
  kael: {
    id: 'kael', w: 1056, h: 515,
    neck: [414.5, 91], hip: [414.5, 384],
    parts: {
      tete: { src: part('kael', 'tete'), w: 233, h: 134, px: 116.5, py: 134, x: 391, y: 46 },
      torse: { src: part('kael', 'torse'), w: 733, h: 441, px: 366.5, py: 388.1, x: 161, y: 46 },
      bras_g: { src: part('kael', 'bras_g'), w: 307, h: 348, px: 239.5, py: 62.6, x: 161, y: 95 },
      bras_d: { src: part('kael', 'bras_d'), w: 530, h: 423, px: 116.6, py: 76.1, x: 362, y: 47 },
      jambes: { src: part('kael', 'jambes'), w: 730, h: 219, px: 365.0, py: 35.0, x: 165, y: 287 },
    },
  },
  lyra: {
    id: 'lyra', w: 901, h: 515,
    neck: [432.0, 209], hip: [432.0, 270],
    parts: {
      tete: { src: part('lyra', 'tete'), w: 499, h: 181, px: 249.5, py: 181, x: 161, y: 46 },
      torse: { src: part('lyra', 'torse'), w: 560, h: 103, px: 280.0, py: 90.6, x: 161, y: 188 },
      bras_g: { src: part('lyra', 'bras_g'), w: 268, h: 94, px: 209.0, py: 16.9, x: 161, y: 194 },
      bras_d: { src: part('lyra', 'bras_d'), w: 283, h: 94, px: 62.3, py: 16.9, x: 436, y: 194 },
      jambes: { src: part('lyra', 'jambes'), w: 578, h: 255, px: 289.0, py: 40.8, x: 162, y: 251 },
    },
  },
  morwen: {
    id: 'morwen', w: 787, h: 515,
    neck: [436.0, 97], hip: [436.0, 370],
    parts: {
      tete: { src: part('morwen', 'tete'), w: 450, h: 134, px: 225.0, py: 134, x: 161, y: 46 },
      torse: { src: part('morwen', 'torse'), w: 465, h: 420, px: 232.5, py: 369.6, x: 161, y: 46 },
      bras_g: { src: part('morwen', 'bras_g'), w: 329, h: 404, px: 256.6, py: 72.7, x: 161, y: 46 },
      bras_d: { src: part('morwen', 'bras_d'), w: 243, h: 355, px: 53.5, py: 63.9, x: 383, y: 95 },
      jambes: { src: part('morwen', 'jambes'), w: 441, h: 226, px: 220.5, py: 36.2, x: 166, y: 280 },
    },
  },
  seren: {
    id: 'seren', w: 751, h: 515,
    neck: [387.5, 101], hip: [387.5, 371],
    parts: {
      tete: { src: part('seren', 'tete'), w: 274, h: 138, px: 137.0, py: 138, x: 287, y: 46 },
      torse: { src: part('seren', 'torse'), w: 429, h: 421, px: 214.5, py: 370.5, x: 161, y: 46 },
      bras_g: { src: part('seren', 'bras_g'), w: 281, h: 352, px: 219.2, py: 63.4, x: 161, y: 99 },
      bras_d: { src: part('seren', 'bras_d'), w: 256, h: 405, px: 56.3, py: 72.9, x: 334, y: 46 },
      jambes: { src: part('seren', 'jambes'), w: 404, h: 225, px: 202.0, py: 36.0, x: 161, y: 281 },
    },
  },
  aldric: {
    id: 'aldric', w: 598, h: 515,
    neck: [300.5, 85], hip: [300.5, 299],
    parts: {
      tete: { src: part('aldric', 'tete'), w: 178, h: 103, px: 89.0, py: 103, x: 161, y: 46 },
      torse: { src: part('aldric', 'torse'), w: 275, h: 327, px: 137.5, py: 287.8, x: 161, y: 46 },
      bras_g: { src: part('aldric', 'bras_g'), w: 181, h: 315, px: 141.2, py: 56.7, x: 161, y: 46 },
      bras_d: { src: part('aldric', 'bras_d'), w: 176, h: 313, px: 38.7, py: 56.3, x: 260, y: 48 },
      jambes: { src: part('aldric', 'jambes'), w: 266, h: 276, px: 133.0, py: 44.2, x: 170, y: 230 },
    },
  },
  thorne: {
    id: 'thorne', w: 944, h: 515,
    neck: [518.5, 70], hip: [518.5, 254],
    parts: {
      tete: { src: part('thorne', 'tete'), w: 243, h: 79, px: 121.5, py: 79, x: 311, y: 46 },
      torse: { src: part('thorne', 'torse'), w: 613, h: 272, px: 306.5, py: 239.4, x: 170, y: 46 },
      bras_g: { src: part('thorne', 'bras_g'), w: 375, h: 260, px: 292.5, py: 46.8, x: 171, y: 48 },
      bras_d: { src: part('thorne', 'bras_d'), w: 291, h: 242, px: 64.0, py: 43.6, x: 492, y: 66 },
      jambes: { src: part('thorne', 'jambes'), w: 622, h: 312, px: 311.0, py: 49.9, x: 161, y: 194 },
    },
  },
  nyx: {
    id: 'nyx', w: 681, h: 515,
    neck: [359.5, 70], hip: [359.5, 266],
    parts: {
      tete: { src: part('nyx', 'tete'), w: 227, h: 81, px: 113.5, py: 81, x: 222, y: 47 },
      torse: { src: part('nyx', 'torse'), w: 359, h: 286, px: 179.5, py: 251.7, x: 161, y: 47 },
      bras_g: { src: part('nyx', 'bras_g'), w: 233, h: 269, px: 181.7, py: 48.4, x: 161, y: 53 },
      bras_d: { src: part('nyx', 'bras_d'), w: 194, h: 274, px: 42.7, py: 49.3, x: 326, y: 48 },
      jambes: { src: part('nyx', 'jambes'), w: 337, h: 303, px: 168.5, py: 48.5, x: 161, y: 203 },
    },
  },
  ashka: {
    id: 'ashka', w: 742, h: 515,
    neck: [335.0, 147], hip: [335.0, 252],
    parts: {
      tete: { src: part('ashka', 'tete'), w: 418, h: 131, px: 209.0, py: 131, x: 163, y: 46 },
      torse: { src: part('ashka', 'torse'), w: 420, h: 175, px: 210.0, py: 154.0, x: 161, y: 112 },
      bras_g: { src: part('ashka', 'bras_g'), w: 185, h: 159, px: 144.3, py: 28.6, x: 161, y: 122 },
      bras_d: { src: part('ashka', 'bras_d'), w: 243, h: 159, px: 53.5, py: 28.6, x: 325, y: 122 },
      jambes: { src: part('ashka', 'jambes'), w: 319, h: 287, px: 159.5, py: 45.9, x: 165, y: 219 },
    },
  },
  vaelen: {
    id: 'vaelen', w: 893, h: 515,
    neck: [536.0, 68], hip: [536.0, 272],
    parts: {
      tete: { src: part('vaelen', 'tete'), w: 297, h: 83, px: 148.5, py: 83, x: 369, y: 46 },
      torse: { src: part('vaelen', 'torse'), w: 571, h: 297, px: 285.5, py: 261.4, x: 161, y: 46 },
      bras_g: { src: part('vaelen', 'bras_g'), w: 409, h: 285, px: 319.0, py: 51.3, x: 161, y: 46 },
      bras_d: { src: part('vaelen', 'bras_d'), w: 229, h: 267, px: 50.4, py: 48.1, x: 503, y: 64 },
      jambes: { src: part('vaelen', 'jambes'), w: 571, h: 301, px: 285.5, py: 48.2, x: 161, y: 205 },
    },
  },
  sylvaine: {
    id: 'sylvaine', w: 595, h: 515,
    neck: [316.0, 139], hip: [316.0, 372],
    parts: {
      tete: { src: part('sylvaine', 'tete'), w: 245, h: 163, px: 122.5, py: 163, x: 189, y: 46 },
      torse: { src: part('sylvaine', 'torse'), w: 273, h: 395, px: 136.5, py: 347.6, x: 161, y: 58 },
      bras_g: { src: part('sylvaine', 'bras_g'), w: 202, h: 359, px: 157.6, py: 64.6, x: 161, y: 81 },
      bras_d: { src: part('sylvaine', 'bras_d'), w: 164, h: 359, px: 36.1, py: 64.6, x: 270, y: 81 },
      jambes: { src: part('sylvaine', 'jambes'), w: 259, h: 210, px: 129.5, py: 33.6, x: 161, y: 296 },
    },
  },
};

/** Les héros qui ont un squelette prêt. */
for (const id of Object.keys(RIGS)) if (!complet(id)) delete RIGS[id];
export const RIGGED: string[] = Object.keys(RIGS);
