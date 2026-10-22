import type { HeroDef } from '../data/heroes';

/**
 * SIGNATURES D'INVOCATION
 *
 * L'autel est commun à tous : c'est le même rituel, la même montée, le même
 * seuil. Mais quand un héros SSR tombe, SA scène s'ajoute — son symbole, son
 * geste, sa phrase et son son. Deux joueurs qui invoquent Nyx et Kael ne voient
 * donc pas la même chose, et le héros est reconnaissable avant même son nom.
 */

export type Motif = 'blade' | 'void' | 'grave' | 'moon' | 'bell' | 'frost' | 'forge' | 'thorn' | 'flame' | 'storm' | 'stone' | 'iron' | 'choir' | 'sun' | 'gear' | 'wall';

export interface Signature {
  motif: Motif;
  /** Mouvement de la scène. */
  motion: 'slash' | 'sink' | 'burst' | 'bloom' | 'ring' | 'wave' | 'shatter';
  /** Phrase affichée sous le titre du héros. */
  phrase: string;
  /** Son déclenché au moment de la signature. */
  sound: 'cutin' | 'braam' | 'choir' | 'riser' | 'crit';
}

export const SIGNATURES: Record<string, Signature> = {
  kael: { motif: 'wall', motion: 'burst', phrase: 'Le serment brûle encore sous la cendre.', sound: 'braam' },
  lyra: { motif: 'blade', motion: 'slash', phrase: 'Une lame. Une dette. Toujours payée.', sound: 'cutin' },
  morwen: { motif: 'grave', motion: 'sink', phrase: 'La mort ne refuse jamais un rendez-vous.', sound: 'riser' },
  seren: { motif: 'moon', motion: 'ring', phrase: 'La lune ne manque jamais sa cible.', sound: 'cutin' },
  aldric: { motif: 'bell', motion: 'wave', phrase: 'Le glas sonne pour quelqu’un d’autre.', sound: 'choir' },
  thorne: { motif: 'frost', motion: 'shatter', phrase: 'Le froid se souvient de chaque nom.', sound: 'braam' },
  nyx: { motif: 'void', motion: 'sink', phrase: 'Il n’y a rien. Et je suis ce rien.', sound: 'riser' },
  ashka: { motif: 'storm', motion: 'slash', phrase: 'L’orage répond quand je crie.', sound: 'crit' },
  vaelen: { motif: 'wall', motion: 'burst', phrase: 'Tant que je tiens, la ville tient.', sound: 'braam' },
  sylvaine: { motif: 'thorn', motion: 'bloom', phrase: 'La forêt se referme sur ses proies.', sound: 'cutin' },
  pyrrha: { motif: 'flame', motion: 'burst', phrase: 'Je ne m’éteins pas. Je me rallume.', sound: 'braam' },
  orlan: { motif: 'bell', motion: 'wave', phrase: 'Chaque cloche a son heure.', sound: 'choir' },
  vespera: { motif: 'iron', motion: 'slash', phrase: 'Le fil ne se voit qu’à la fin.', sound: 'cutin' },
  gorm: { motif: 'stone', motion: 'shatter', phrase: 'La montagne ne bouge pas. Elle tombe.', sound: 'braam' },
  mira: { motif: 'gear', motion: 'shatter', phrase: 'Trois balles, trois dettes.', sound: 'crit' },
  corvin: { motif: 'sun', motion: 'ring', phrase: 'L’aube se lève. Elle me doit une réponse.', sound: 'choir' },
  elara: { motif: 'choir', motion: 'bloom', phrase: 'Je ne vois pas la lumière. Je l’entends.', sound: 'choir' },
};

const FALLBACK: Signature = { motif: 'void', motion: 'ring', phrase: 'L’autel a répondu.', sound: 'braam' };

export const signatureOf = (h: HeroDef): Signature => SIGNATURES[h.id] ?? FALLBACK;

/** Éclats géométriques par motif, exprimés en unités d'un viewBox -100..100. */
export function motifSVG(motif: Motif): string {
  const ring = (r: number, dash = '') => `<circle r="${r}" ${dash ? `stroke-dasharray="${dash}"` : ''}/>`;
  switch (motif) {
    case 'blade':
      return Array.from({ length: 7 }, (_, i) => {
        const a = -60 + i * 20;
        return `<path class="motif-line" transform="rotate(${a})" d="M0 -96 L6 -30 L0 40 L-6 -30 Z"/>`;
      }).join('');
    case 'void':
      return Array.from({ length: 4 }, (_, i) => ring(20 + i * 18, i % 2 ? '3 9' : '')).join('') + '<circle r="10" class="motif-core"/>';
    case 'grave':
      return Array.from({ length: 6 }, (_, i) => {
        const x = -70 + i * 28;
        return `<rect x="${x}" y="${(i % 3) * 16 - 20}" width="10" height="${60 + (i % 4) * 12}" rx="4" class="motif-line"/>`;
      }).join('');
    case 'moon':
      return '<path class="motif-line" d="M-40 -70 A70 70 0 1 0 40 -70 A86 86 0 1 1 -40 -70 Z"/>' + ring(84, '2 12');
    case 'bell':
      return Array.from({ length: 3 }, (_, i) => `<path class="motif-line" transform="translate(0 ${i * 6})" d="M-34 44 Q-28 -40 0 -64 Q28 -40 34 44 Z"/>`).join('') + ring(74, '3 10');
    case 'frost':
      return Array.from({ length: 6 }, (_, i) => `<path class="motif-line" transform="rotate(${i * 60})" d="M0 -88 L10 -40 L0 -26 L-10 -40 Z"/>`).join('') + ring(40, '4 8');
    case 'forge':
      return '<rect x="-34" y="-34" width="68" height="68" rx="8" class="motif-line" transform="rotate(45)"/>' + ring(64, '3 9');
    case 'thorn':
      return Array.from({ length: 10 }, (_, i) => {
        const a = (i / 10) * 360;
        return `<path class="motif-line" transform="rotate(${a})" d="M0 -40 L8 -62 L0 -92 L-8 -62 Z"/>`;
      }).join('');
    case 'flame':
      return Array.from({ length: 5 }, (_, i) => `<path class="motif-line" transform="translate(${-32 + i * 16} 12)" d="M0 48 C-18 18 -10 -16 0 -54 C10 -16 18 18 0 48 Z"/>`).join('');
    case 'storm':
      return '<path class="motif-line" d="M-26 -78 L18 -20 L-4 -20 L26 78 L-18 12 L4 12 Z"/>' + ring(76, '4 12');
    case 'stone':
      return Array.from({ length: 5 }, (_, i) => `<path class="motif-line" transform="translate(${-50 + i * 26} ${(i % 2) * 18 - 9})" d="M-16 -26 L16 -18 L20 22 L-12 30 Z"/>`).join('');
    case 'iron':
      return Array.from({ length: 8 }, (_, i) => `<path class="motif-line" transform="rotate(${i * 45})" d="M0 -92 L3 -20 L0 92 L-3 -20 Z"/>`).join('');
    case 'choir':
      return Array.from({ length: 7 }, (_, i) => {
        const a = -70 + i * 23;
        return `<path class="motif-line" transform="rotate(${a}) translate(0 -70)" d="M0 0 L0 -22 M-5 -16 L0 -24 L5 -16"/>`;
      }).join('') + ring(86, '2 12');
    case 'sun':
      return ring(34) + Array.from({ length: 12 }, (_, i) => `<path class="motif-line" transform="rotate(${i * 30})" d="M0 -44 L4 -64 L0 -92 L-4 -64 Z"/>`).join('');
    case 'gear':
      return Array.from({ length: 12 }, (_, i) => `<rect x="-5" y="-84" width="10" height="16" rx="2" class="motif-line" transform="rotate(${i * 30})"/>`).join('') + ring(58, '3 10') + ring(24);
    case 'wall':
    default:
      return Array.from({ length: 5 }, (_, i) => `<rect x="${-70 + i * 29}" y="${-56 + (i % 2) * 18}" width="22" height="90" rx="6" class="motif-line"/>`).join('');
  }
}
