import type { IconName } from '../ui/icons';

/** Couche dans laquelle se trouve le bâtiment (la Tour est dans le ciel, au loin). */
export type BuildingLayer = 'city' | 'sky';

export interface BuildingDef {
  id: string;
  name: string;
  subtitle: string;
  description: string;
  icon: IconName;
  layer: BuildingLayer;
  /** Contour cliquable (coordonnées de la texture de sa couche, image d'origine ×2). */
  polygon: ReadonlyArray<readonly [number, number]>;
  /** Point d'ancrage de l'étiquette. */
  label: readonly [number, number];
  /** Couleur de surbrillance au survol. */
  glow: number;
  /** Pastille de notification rouge sur l'étiquette. */
  notify?: boolean;
}

/** Les polygones sont saisis dans l'image d'origine (1584×672) puis multipliés par 2. */
const S = 2;
const p = (pts: Array<[number, number]>): Array<[number, number]> => pts.map(([x, y]) => [x * S, y * S]);

export const BUILDINGS: readonly BuildingDef[] = [
  {
    id: 'campaign',
    name: 'Portail de Campagne',
    subtitle: 'Aventure principale',
    description:
      "Une arche millénaire qui déchire le voile entre les mondes. Au-delà du vortex s'étendent les terres maudites : forêts mortes, déserts de cendres et citadelles oubliées. C'est ici que commence ta légende.",
    icon: 'portal',
    layer: 'city',
    polygon: p([[25, 140], [110, 118], [220, 120], [330, 170], [345, 240], [345, 470], [365, 520], [250, 552], [60, 560], [15, 520]]),
    label: [380, 1080],
    glow: 0xb16bff,
    notify: true,
  },
  {
    id: 'tavern',
    name: 'Taverne du Corbeau',
    subtitle: 'Missions & expéditions',
    description:
      "Le dernier endroit chaud de Cendrebourg. Mercenaires et chasseurs de primes s'y retrouvent autour d'une bière noire. Le tavernier affiche les contrats les plus dangereux du royaume.",
    icon: 'tavern',
    layer: 'city',
    polygon: p([[398, 250], [430, 140], [470, 150], [560, 140], [640, 105], [695, 250], [740, 255], [735, 300], [690, 320], [690, 462], [600, 472], [430, 472], [400, 400]]),
    label: [1100, 965],
    glow: 0xffa040,
  },
  {
    id: 'summon',
    name: "Autel d'Invocation",
    subtitle: 'Invoquer des héros',
    description:
      "Le Cristal Écarlate flotte au-dessus de l'autel depuis la Chute. Ceux qui lui offrent des gemmes entendent l'appel de héros venus d'autres époques… et parfois de créatures qu'il vaudrait mieux laisser dormir.",
    icon: 'crystal',
    layer: 'city',
    polygon: p([[790, 150], [930, 150], [935, 315], [962, 318], [966, 420], [922, 466], [760, 466], [728, 420], [732, 318], [785, 315]]),
    label: [1696, 955],
    glow: 0xff3b5c,
    notify: true,
  },
  {
    id: 'forge',
    name: 'Forge Infernale',
    subtitle: 'Équipement',
    description:
      "Le forgeron Durgan martèle l'acier noir dans un brasier qui ne s'est jamais éteint. Apporte-lui des matériaux et il forgera des armes capables de blesser les démons.",
    icon: 'anvil',
    layer: 'city',
    polygon: p([[990, 290], [1048, 238], [1110, 238], [1172, 292], [1172, 462], [1100, 472], [990, 468], [975, 420]]),
    label: [2160, 958],
    glow: 0xff7a2a,
  },
  {
    id: 'sanctuary',
    name: 'Sanctuaire Obscur',
    subtitle: 'Renforcer les héros',
    description:
      "Une cathédrale dont les prêtres ont juré de garder la lumière vivante. Sous ses vitraux, les héros peuvent briser leurs limites et éveiller des pouvoirs anciens.",
    icon: 'church',
    layer: 'city',
    polygon: p([[1180, 230], [1210, 100], [1232, 95], [1285, 58], [1345, 60], [1420, 140], [1568, 180], [1568, 520], [1500, 572], [1300, 592], [1185, 522], [1172, 300]]),
    label: [2600, 1090],
    glow: 0xffc94a,
  },
  {
    id: 'tower',
    name: "Tour de l'Infini",
    subtitle: 'Défi sans fin',
    description:
      "Nul ne sait qui l'a bâtie, ni ce qui attend à son sommet. Chaque étage est plus mortel que le précédent… et personne n'en a jamais vu la fin.",
    icon: 'tower',
    layer: 'sky',
    polygon: p([[785, 35], [800, 110], [830, 150], [840, 212], [905, 238], [882, 278], [872, 350], [700, 350], [705, 278], [668, 238], [735, 212], [745, 150], [770, 110]]),
    label: [1570, 330],
    glow: 0xff3bd0,
    notify: true,
  },
];
