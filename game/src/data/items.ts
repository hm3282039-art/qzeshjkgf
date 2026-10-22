/**
 * Objets d'équipement.
 *
 * Principe : chaque objet donne un bonus exprimé en POURCENTAGE de la
 * statistique de base du héros. Ainsi un objet vaut la même chose pour un
 * tank que pour un assassin, et l'équilibrage reste lisible.
 *
 * Quatre emplacements : arme, armure, casque, bottes.
 * Cinq raretés, du commun au mythique (le mythique est très rare : c'est la
 * monnaie d'échange du futur système de méta).
 */

export type Slot = 'weapon' | 'armor' | 'helm' | 'boots';

export const SLOT_LIST: ReadonlyArray<{ id: Slot; name: string }> = [
  { id: 'weapon', name: 'Arme' },
  { id: 'armor', name: 'Armure' },
  { id: 'helm', name: 'Casque' },
  { id: 'boots', name: 'Bottes' },
];

export type GearRarity = 'C' | 'R' | 'E' | 'L' | 'M';

export interface RarityDef {
  name: string;
  /** Couleur d'affichage. */
  css: string;
  /** Multiplicateur de puissance. */
  mult: number;
  /** Nombre de statistiques secondaires. */
  subs: number;
  /** Probabilité de tomber sur cette rareté. */
  drop: number;
}

export const GEAR: Record<GearRarity, RarityDef> = {
  C: { name: 'Commun', css: '#9aa3b5', mult: 1.0, subs: 0, drop: 0.52 },
  R: { name: 'Rare', css: '#4aa3ff', mult: 1.3, subs: 1, drop: 0.30 },
  E: { name: 'Épique', css: '#b46bff', mult: 1.7, subs: 2, drop: 0.13 },
  L: { name: 'Légendaire', css: '#ffb02a', mult: 2.1, subs: 2, drop: 0.044 },
  M: { name: 'Mythique', css: '#ff3b5c', mult: 2.6, subs: 3, drop: 0.006 },
};

export const RARITY_ORDER: GearRarity[] = ['C', 'R', 'E', 'L', 'M'];

export type SubStat = 'hp' | 'atk' | 'armor' | 'res' | 'crit' | 'haste';

export const SUB_LABEL: Record<SubStat, string> = {
  hp: 'PV',
  atk: 'Attaque',
  armor: 'Armure',
  res: 'Résistance',
  crit: 'Critique',
  haste: 'Vitesse d’attaque',
};

export interface ItemSub {
  stat: SubStat;
  /** Valeur en % (pour le critique, en points de %). */
  value: number;
}

export interface Item {
  id: string;
  slot: Slot;
  rarity: GearRarity;
  level: number;
  /** Bonus principal, en % de la statistique de base. */
  main: number;
  subs: ItemSub[];
  name: string;
}

/** Multiplicateurs appliqués aux statistiques du héros. */
export interface GearBonus {
  hp: number;
  atk: number;
  armor: number;
  /** Multiplicateur de résistance magique. */
  res: number;
  /** Multiplicateur de la cadence d'attaque (< 1 = plus rapide). */
  interval: number;
  /** Points de critique ajoutés (0,04 = +4 %). */
  crit: number;
}

export const NO_GEAR: GearBonus = { hp: 1, atk: 1, armor: 1, res: 1, interval: 1, crit: 0 };

/* ------------------------------------------------------------------ */
/*  Génération                                                         */
/* ------------------------------------------------------------------ */

const NAMES: Record<Slot, string[]> = {
  weapon: ['Lame', 'Marteau', 'Hache', 'Dague', 'Bâton', 'Épée'],
  armor: ['Plastron', 'Cotte', 'Haubert', 'Cuirasse', 'Robe'],
  helm: ['Heaume', 'Casque', 'Capuche', 'Diadème', 'Masque'],
  boots: ['Bottes', 'Grèves', 'Solerets', 'Sandales'],
};

const SUFFIX: Record<GearRarity, string[]> = {
  C: ['usée', 'ternie', 'de fer', 'banale'],
  R: ['de cendre', 'du guet', 'de givre', 'des noyés'],
  E: ['écarlate', 'du caveau', 'de l’orage', 'sacrée'],
  L: ['de la Reine', 'du Trône', 'des Rois morts', 'de l’Aube noire'],
  M: ['du Néant', 'de Cendrebourg', 'de l’Infini', 'de la Tour'],
};

let seq = 0;

const pick = <T,>(arr: readonly T[]): T => arr[Math.floor(Math.random() * arr.length)]!;

/** Tire une rareté selon les probabilités. */
export function rollRarity(): GearRarity {
  const r = Math.random();
  let acc = 0;
  for (const id of RARITY_ORDER) {
    acc += GEAR[id].drop;
    if (r < acc) return id;
  }
  return 'C';
}

/**
 * Fabrique un objet. `tier` représente la difficulté du niveau (0 = 1-1) :
 * il détermine le niveau de l'objet, donc sa puissance.
 */
export function makeItem(tier: number, force?: { rarity?: GearRarity; slot?: Slot }): Item {
  const rarity = force?.rarity ?? rollRarity();
  const slot = force?.slot ?? pick(SLOT_LIST).id;
  const level = Math.max(1, Math.min(20, 1 + Math.floor(tier * 1.7)));
  const def = GEAR[rarity];
  const main = 4 * def.mult * (1 + 0.05 * (level - 1));
  const subs: ItemSub[] = [];
  const pool: SubStat[] = ['hp', 'atk', 'armor', 'res', 'crit', 'haste'];
  for (let i = 0; i < def.subs; i++) {
    const stat = pool.splice(Math.floor(Math.random() * pool.length), 1)[0]!;
    const base = stat === 'crit' ? 1.2 : 2.2;
    subs.push({ stat, value: +(base * def.mult * (1 + 0.045 * (level - 1))).toFixed(1) });
  }
  return {
    id: `it${Date.now().toString(36)}${(seq++).toString(36)}`,
    slot,
    rarity,
    level,
    main: +main.toFixed(1),
    subs,
    name: `${pick(NAMES[slot])} ${pick(SUFFIX[rarity])}`,
  };
}

/* ------------------------------------------------------------------ */
/*  Calcul des bonus                                                   */
/* ------------------------------------------------------------------ */

/** Libellé du bonus principal selon l'emplacement. */
export const mainLabel = (slot: Slot): string =>
  slot === 'weapon' ? 'Attaque' : slot === 'armor' ? 'PV' : slot === 'helm' ? 'Armure' : 'Vitesse d’attaque';

/** Applique un ensemble d'objets. Les bonus s'additionnent, puis s'appliquent. */
export function gearBonus(items: ReadonlyArray<Item | undefined>): GearBonus {
  let hp = 1, atk = 1, armor = 1, res = 1, haste = 0, crit = 0;
  for (const it of items) {
    if (!it) continue;
    const v = it.main / 100;
    if (it.slot === 'weapon') atk += v;
    else if (it.slot === 'armor') hp += v;
    else if (it.slot === 'helm') armor += v;
    else haste += v;
    for (const s of it.subs) {
      const sv = s.value / 100;
      if (s.stat === 'hp') hp += sv;
      else if (s.stat === 'atk') atk += sv;
      else if (s.stat === 'armor') armor += sv;
      else if (s.stat === 'res') res += sv;
      else if (s.stat === 'haste') haste += sv;
      else crit += s.value / 100;
    }
  }
  // Plafonds : on ne veut ni héros intuable, ni attaque instantanée.
  return {
    hp: Math.min(hp, 2.2),
    atk: Math.min(atk, 2.2),
    armor: Math.min(armor, 2.5),
    res: Math.min(res, 2.5),
    interval: Math.max(0.7, 1 / (1 + Math.min(haste, 0.45))),
    crit: Math.min(0.35, crit),
  };
}

/** Puissance indicative d'un objet, pour trier l'inventaire. */
export const itemScore = (it: Item): number =>
  it.main * GEAR[it.rarity].mult + it.subs.reduce((s, x) => s + x.value, 0);
