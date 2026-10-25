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
  M: { name: 'Mythique', css: '#ffd36a', mult: 2.6, subs: 3, drop: 0.012 },
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

export interface ItemEffect {
  id: EffectId;
  name: string;
  text: string;
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
  /** Couleur de l'objet (les mythiques existent dans tous les coloris sauf le rouge). */
  tint?: string;
  /** Effet unique : CHAQUE objet en possède un (plus fort avec la rareté). */
  effect?: ItemEffect;
  /** Puissance de l'effet (1 = pleine puissance mythique). */
  effectScale?: number;
  /** Relique : le rouge est réservé à ces pièces-là. */
  relic?: boolean;
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
  /* --- Effets uniques d'objets nommés (tous facultatifs) --- */
  /** Fraction des dégâts infligés rendue en PV (0,08 = 8 %). */
  lifesteal?: number;
  /** Multiplicateur de gain d'énergie d'ultime. */
  ultRate?: number;
  /** Bonus de dégâts contre une cible sous 30 % de PV. */
  execute?: number;
  /** Réduction des dégâts subis. */
  dmgRed?: number;
  /** Bonus de dégâts global. */
  dmgBonus?: number;
  /** Bonus de dégâts des compétences et ultimes. */
  skillBonus?: number;
  /** Soin par seconde, en fraction des PV max. */
  regen?: number;
  /** Fraction des dégâts subis renvoyée à l'attaquant. */
  thorns?: number;
  /** Bonus de dégâts pendant les 8 premières secondes. */
  opening?: number;
}

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


/* ------------------------------------------------------------------ */
/*  Effets uniques                                                     */
/* ------------------------------------------------------------------ */

export type EffectId =
  | 'bloodthirst' | 'storm' | 'executioner' | 'bulwark' | 'fury' | 'archmage'
  | 'regen' | 'thorns' | 'opening' | 'colossus' | 'windrunner' | 'butcher'
  | 'eternal' | 'avalanche';

/**
 * Chaque effet est réellement appliqué en combat (voir BattleSim) :
 * ce n'est pas un texte décoratif. Les valeurs sont volontairement lisibles,
 * pour qu'un joueur puisse sentir la différence entre deux pièces.
 */
export const EFFECTS: Record<EffectId, ItemEffect> = {
  bloodthirst: { id: 'bloodthirst', name: 'Soif de sang', text: 'Rend 8 % des dégâts infligés en PV.' },
  storm: { id: 'storm', name: 'Orage intérieur', text: 'Gagne 30 % d’énergie d’ultime en plus.' },
  executioner: { id: 'executioner', name: 'Bourreau', text: '+40 % de dégâts sur une cible sous 30 % de PV.' },
  bulwark: { id: 'bulwark', name: 'Rempart', text: 'Réduit de 12 % les dégâts subis.' },
  fury: { id: 'fury', name: 'Fureur', text: '+14 % de dégâts infligés.' },
  archmage: { id: 'archmage', name: 'Archimage', text: '+25 % de dégâts de compétence et d’ultime.' },
  regen: { id: 'regen', name: 'Sève vive', text: 'Régénère 1,5 % des PV max par seconde.' },
  thorns: { id: 'thorns', name: 'Épines', text: 'Renvoie 15 % des dégâts subis à l’attaquant.' },
  opening: { id: 'opening', name: 'Premier sang', text: '+35 % de dégâts pendant les 8 premières secondes.' },
  colossus: { id: 'colossus', name: 'Colosse', text: '+18 % de PV maximum.' },
  windrunner: { id: 'windrunner', name: 'Coureur des vents', text: 'Attaque 12 % plus vite.' },
  butcher: { id: 'butcher', name: 'Abattoir', text: '+10 % de dégâts et +10 % de critique.' },
  eternal: { id: 'eternal', name: 'Éternité', text: 'Régénère 2 % des PV par seconde et réduit les dégâts de 8 %.' },
  avalanche: { id: 'avalanche', name: 'Avalanche', text: '+20 % de dégâts, +25 % d’énergie d’ultime.' },
};

/** Coloris mythiques : tous sauf le rouge, réservé aux reliques. */
export const TINTS = {
  or: '#ffd36a',
  azur: '#6ad8ff',
  emeraude: '#7ed957',
  pourpre: '#b06bff',
  ivoire: '#fff0d0',
  argent: '#d8e0ec',
  cuivre: '#e08a4a',
  jade: '#5fe0b0',
  saphir: '#5a7dff',
  amethyste: '#d46bff',
} as const;

export type TintId = keyof typeof TINTS;

interface CatalogEntry {
  slot: Slot;
  name: string;
  tint: TintId;
  effect: EffectId;
  /** Relique : rouge, plus rare, plus forte. */
  relic?: boolean;
}

/**
 * Catalogue des pièces nommées.
 * Chaque emplacement a plusieurs objets : on peut chercher celui qui complète
 * son build (vol de vie sur l'arme, régénération sur l'armure…).
 */
export const CATALOG: CatalogEntry[] = [
  // Armes
  { slot: 'weapon', name: 'Lame de l’Aube Noire', tint: 'or', effect: 'fury' },
  { slot: 'weapon', name: 'Dague des Marées', tint: 'azur', effect: 'bloodthirst' },
  { slot: 'weapon', name: 'Bâton de l’Éclipse', tint: 'pourpre', effect: 'archmage' },
  { slot: 'weapon', name: 'Hache du Bourreau', tint: 'cuivre', effect: 'executioner' },
  { slot: 'weapon', name: 'Arc de la Nuit Claire', tint: 'argent', effect: 'opening' },
  { slot: 'weapon', name: 'Marteau des Serments', tint: 'ivoire', effect: 'butcher' },
  { slot: 'weapon', name: 'Lame de Verre', tint: 'saphir', effect: 'windrunner' },
  { slot: 'weapon', name: 'Faux de la Moisson', tint: 'jade', effect: 'bloodthirst' },
  // Armures
  { slot: 'armor', name: 'Cuirasse de Cendrebourg', tint: 'cuivre', effect: 'bulwark' },
  { slot: 'armor', name: 'Robe du Chœur', tint: 'ivoire', effect: 'regen' },
  { slot: 'armor', name: 'Plastron du Colosse', tint: 'argent', effect: 'colossus' },
  { slot: 'armor', name: 'Peau de la Reine', tint: 'jade', effect: 'thorns' },
  { slot: 'armor', name: 'Haubert des Noyés', tint: 'azur', effect: 'bulwark' },
  { slot: 'armor', name: 'Manteau de l’Infini', tint: 'amethyste', effect: 'eternal' },
  { slot: 'armor', name: 'Cotte de l’Aube', tint: 'or', effect: 'regen' },
  { slot: 'armor', name: 'Armure de Suie', tint: 'pourpre', effect: 'thorns' },
  // Casques
  { slot: 'helm', name: 'Heaume du Roi Calciné', tint: 'or', effect: 'fury' },
  { slot: 'helm', name: 'Masque du Néant', tint: 'amethyste', effect: 'storm' },
  { slot: 'helm', name: 'Diadème de Sel', tint: 'ivoire', effect: 'bulwark' },
  { slot: 'helm', name: 'Capuche des Ossuaires', tint: 'argent', effect: 'opening' },
  { slot: 'helm', name: 'Casque du Veilleur', tint: 'azur', effect: 'butcher' },
  { slot: 'helm', name: 'Couronne d’Épines', tint: 'jade', effect: 'thorns' },
  { slot: 'helm', name: 'Cimier de l’Orage', tint: 'saphir', effect: 'storm' },
  { slot: 'helm', name: 'Voile de la Prophétesse', tint: 'pourpre', effect: 'archmage' },
  // Bottes
  { slot: 'boots', name: 'Solerets de la Tour', tint: 'or', effect: 'windrunner' },
  { slot: 'boots', name: 'Bottes des Marais', tint: 'jade', effect: 'regen' },
  { slot: 'boots', name: 'Grèves de Verre', tint: 'saphir', effect: 'opening' },
  { slot: 'boots', name: 'Sandales du Pèlerin', tint: 'ivoire', effect: 'bulwark' },
  { slot: 'boots', name: 'Bottes de l’Ombre', tint: 'pourpre', effect: 'bloodthirst' },
  { slot: 'boots', name: 'Fers du Colosse', tint: 'argent', effect: 'colossus' },
  { slot: 'boots', name: 'Bottes de Cendre', tint: 'cuivre', effect: 'windrunner' },
  { slot: 'boots', name: 'Solerets de l’Infini', tint: 'amethyste', effect: 'avalanche' },
  // Reliques (rouge — les seules pièces rouges du jeu)
  { slot: 'weapon', name: 'Épée de l’Ultime Serment', tint: 'or', effect: 'eternal', relic: true },
  { slot: 'armor', name: 'Cœur de la Tour', tint: 'or', effect: 'avalanche', relic: true },
  { slot: 'helm', name: 'Œil de l’Infini', tint: 'pourpre', effect: 'archmage', relic: true },
  { slot: 'boots', name: 'Pas du Premier Marcheur', tint: 'jade', effect: 'storm', relic: true },
];

/** Couleur d'affichage d'un objet : le rouge est réservé aux reliques. */
export const itemCss = (it: Item): string => (it.relic ? '#ff3b5c' : it.tint ?? GEAR[it.rarity].css);

/** Nom de rareté affiché (les reliques ont leur propre nom). */
export const itemRarity = (it: Item): string => (it.relic ? 'Relique' : GEAR[it.rarity].name);

/**
 * Fabrique un objet. `tier` représente la difficulté du niveau (0 = 1-1) :
 * il détermine le niveau de l'objet, donc sa puissance.
 */
export function makeItem(tier: number, force?: { rarity?: GearRarity; slot?: Slot }): Item {
  const rarity = force?.rarity ?? rollRarity();
  const slot = force?.slot ?? pick(SLOT_LIST).id;
  const level = Math.max(1, Math.min(20, 1 + Math.floor(tier * 1.7)));
  const def = GEAR[rarity];
  const subs: ItemSub[] = [];
  const pool: SubStat[] = ['hp', 'atk', 'armor', 'res', 'crit', 'haste'];
  const rollSubs = (n: number): ItemSub[] => {
    const out: ItemSub[] = [];
    for (let i = 0; i < n; i++) {
      const stat = pool.splice(Math.floor(Math.random() * pool.length), 1)[0]!;
      const base = stat === 'crit' ? 1.2 : 2.2;
      out.push({ stat, value: +(base * def.mult * (1 + 0.045 * (level - 1))).toFixed(1) });
    }
    return out;
  };

  // Les pièces mythiques viennent du catalogue nommé : chacune a une couleur
  // (toutes sauf le rouge) et un effet unique réellement appliqué en combat.
  if (rarity === 'M') {
    const relic = Math.random() < 0.16;
    const candidates = CATALOG.filter((c) => c.slot === slot && !!c.relic === relic);
    const entry = pick(candidates.length ? candidates : CATALOG.filter((c) => c.slot === slot));
    const mult = relic ? 3.2 : def.mult;
    const main = 4 * mult * (1 + 0.05 * (level - 1));
    return {
      id: `it${Date.now().toString(36)}${(seq++).toString(36)}`,
      slot,
      rarity,
      level,
      main: +main.toFixed(1),
      subs: rollSubs(relic ? 3 : def.subs),
      name: entry.name,
      tint: TINTS[entry.tint],
      effect: EFFECTS[entry.effect],
      relic,
    };
  }

  const main = 4 * def.mult * (1 + 0.05 * (level - 1));
  subs.push(...rollSubs(def.subs));
  // Même une pièce commune a son effet propre — simplement plus discret.
  const minorIds = Object.keys(EFFECTS) as EffectId[];
  const effect = EFFECTS[minorIds[Math.floor(Math.random() * minorIds.length)]!];
  const effectScale = rarity === 'L' ? 0.9 : rarity === 'E' ? 0.7 : rarity === 'R' ? 0.5 : 0.3;
  return {
    id: `it${Date.now().toString(36)}${(seq++).toString(36)}`,
    slot,
    rarity,
    level,
    main: +main.toFixed(1),
    subs,
    name: `${pick(NAMES[slot])} ${pick(SUFFIX[rarity])}`,
    effect,
    effectScale,
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
  const fx = { lifesteal: 0, ultRate: 0, execute: 0, dmgRed: 0, dmgBonus: 0, skillBonus: 0, regen: 0, thorns: 0, opening: 0 };
  for (const it of items) {
    if (!it) continue;
    const v = it.main / 100;
    if (it.slot === 'weapon') atk += v;
    else if (it.slot === 'armor') hp += v;
    else if (it.slot === 'helm') armor += v;
    else haste += v;
    if (it.effect) {
      const k = it.effectScale ?? 1;
      switch (it.effect.id) {
        case 'bloodthirst': fx.lifesteal += 0.08 * k; break;
        case 'storm': fx.ultRate += 0.3 * k; break;
        case 'executioner': fx.execute += 0.4 * k; break;
        case 'bulwark': fx.dmgRed += 0.12 * k; break;
        case 'fury': fx.dmgBonus += 0.14 * k; break;
        case 'archmage': fx.skillBonus += 0.25 * k; break;
        case 'regen': fx.regen += 0.015 * k; break;
        case 'thorns': fx.thorns += 0.15 * k; break;
        case 'opening': fx.opening += 0.35 * k; break;
        case 'colossus': hp += 0.18 * k; break;
        case 'windrunner': haste += 0.12 * k; break;
        case 'butcher': fx.dmgBonus += 0.10 * k; crit += 0.10 * k; break;
        case 'eternal': fx.regen += 0.02 * k; fx.dmgRed += 0.08 * k; break;
        case 'avalanche': fx.dmgBonus += 0.20 * k; fx.ultRate += 0.25 * k; break;
      }
    }
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
    lifesteal: Math.min(0.25, fx.lifesteal),
    ultRate: 1 + Math.min(0.8, fx.ultRate),
    execute: Math.min(0.6, fx.execute),
    dmgRed: Math.min(0.35, fx.dmgRed),
    dmgBonus: Math.min(0.45, fx.dmgBonus),
    skillBonus: Math.min(0.5, fx.skillBonus),
    regen: Math.min(0.05, fx.regen),
    thorns: Math.min(0.3, fx.thorns),
    opening: Math.min(0.5, fx.opening),
  };
}

/** Puissance indicative d'un objet, pour trier l'inventaire. */
export const itemScore = (it: Item): number =>
  it.main * GEAR[it.rarity].mult + it.subs.reduce((s, x) => s + x.value, 0) + (it.effect ? 8 : 0) + (it.relic ? 14 : 0);
