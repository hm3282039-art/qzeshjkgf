/* FICHIER GÉNÉRÉ — découpe manuelle de Kael en 9 morceaux (plus fine que rigs.ts). */
import epic_kael_cape from '../assets/epic_kael_cape.webp';
import epic_kael_bouclier from '../assets/epic_kael_bouclier.webp';
import epic_kael_casque from '../assets/epic_kael_casque.webp';
import epic_kael_torse from '../assets/epic_kael_torse.webp';
import epic_kael_bras_d from '../assets/epic_kael_bras_d.webp';
import epic_kael_epee from '../assets/epic_kael_epee.webp';
import epic_kael_pagne from '../assets/epic_kael_pagne.webp';
import epic_kael_jambe_g from '../assets/epic_kael_jambe_g.webp';
import epic_kael_jambe_d from '../assets/epic_kael_jambe_d.webp';

export interface Part9 { src: string; w: number; h: number; x: number; y: number; px: number; py: number }
export interface Rig9 { id: string; w: number; h: number; hip: [number, number]; parts: Record<string, Part9> }

export const RIG9: Record<string, Rig9> = {
  kael: {
    id: 'kael', w: 889, h: 557, hip: [455, 320],
    parts: {
      cape: { src: epic_kael_cape, w: 363, h: 336, x: 0, y: 114, px: 330, py: 61 },
      bouclier: { src: epic_kael_bouclier, w: 199, h: 298, x: 252, y: 136, px: 140, py: 156 },
      casque: { src: epic_kael_casque, w: 130, h: 166, x: 377, y: 1, px: 63, py: 147 },
      torse: { src: epic_kael_torse, w: 219, h: 253, x: 385, y: 95, px: 70, py: 225 },
      bras_d: { src: epic_kael_bras_d, w: 157, h: 211, x: 477, y: 126, px: 23, py: 26 },
      epee: { src: epic_kael_epee, w: 288, h: 231, x: 580, y: 253, px: 34, py: 39 },
      pagne: { src: epic_kael_pagne, w: 109, h: 184, x: 412, y: 276, px: 50, py: 20 },
      jambe_g: { src: epic_kael_jambe_g, w: 141, h: 258, x: 361, y: 299, px: 71, py: 27 },
      jambe_d: { src: epic_kael_jambe_d, w: 125, h: 214, x: 471, y: 322, px: 57, py: 4 },
    },
  },
};

/** Les héros qui ont la découpe fine en 9 morceaux. */
export const RIGGED9: string[] = ['kael'];
