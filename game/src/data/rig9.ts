/* FICHIER GÉNÉRÉ — découpe manuelle de Kael en 9 morceaux (plus fine que rigs.ts). */

const epicMods = import.meta.glob('../assets/epic_*.webp', { eager: true, query: '?url', import: 'default' }) as Record<string, string>;
const EP9: Record<string, string> = {};
for (const [chemin, url] of Object.entries(epicMods)) {
  const m = chemin.match(/epic_kael_([a-z_]+)\.webp$/);
  if (m) EP9[m[1]!] = url;
}
const part9 = (morceau: string): string => EP9[morceau] ?? '';
const MORCEAUX9 = ['cape', 'bouclier', 'casque', 'torse', 'bras_d', 'epee', 'pagne', 'jambe_g', 'jambe_d'];

export interface Part9 { src: string; w: number; h: number; x: number; y: number; px: number; py: number }
export interface Rig9 { id: string; w: number; h: number; hip: [number, number]; parts: Record<string, Part9> }

export const RIG9: Record<string, Rig9> = {
  kael: {
    id: 'kael', w: 889, h: 557, hip: [461.5, 356.2],
    parts: {
      cape: { src: part9('cape'), w: 594, h: 285, x: -283, y: 181, px: 540, py: 52 },
      bouclier: { src: part9('bouclier'), w: 326, h: 253, x: 129, y: 200, px: 229, py: 132 },
      casque: { src: part9('casque'), w: 213, h: 141, x: 334, y: 85, px: 103, py: 125 },
      torse: { src: part9('torse'), w: 359, h: 215, x: 347, y: 165, px: 115, py: 191 },
      bras_d: { src: part9('bras_d'), w: 257, h: 179, x: 498, y: 191, px: 38, py: 22 },
      epee: { src: part9('epee'), w: 472, h: 196, x: 666, y: 299, px: 56, py: 33 },
      pagne: { src: part9('pagne'), w: 178, h: 156, x: 391, y: 319, px: 82, py: 17 },
      jambe_g: { src: part9('jambe_g'), w: 231, h: 219, x: 308, y: 338, px: 116, py: 23 },
      jambe_d: { src: part9('jambe_d'), w: 205, h: 182, x: 488, y: 358, px: 93, py: 3 },
    },
  },
};

/** Les héros qui ont la découpe fine en 9 morceaux. */
for (const id of Object.keys(RIG9)) if (!MORCEAUX9.every((x) => !!RIG9[id]!.parts[x]?.src)) delete RIG9[id];
export const RIGGED9: string[] = Object.keys(RIG9);
