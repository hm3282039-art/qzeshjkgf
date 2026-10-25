import type { IconName } from '../ui/icons';

export type Role = 'Tank' | 'Guerrier' | 'Assassin' | 'Mage' | 'Tireur' | 'Soutien';
export type Rarity = 'SSR' | 'SR' | 'R';
export type ProjectileKind = 'arrow' | 'orb' | 'light' | 'bone' | 'void' | 'spark' | 'hex';
import type { GearBonus } from './items';

export type TextureKey =
  | 'hero_kael' | 'hero_lyra' | 'hero_morwen' | 'hero_seren' | 'hero_aldric'
  | 'hero_thorne' | 'hero_nyx' | 'hero_ashka'
  | 'hero_vaelen' | 'hero_sylvaine' | 'hero_pyrrha'
  | 'hero_orlan' | 'hero_vespera' | 'hero_gorm'
  | 'hero_mira' | 'hero_corvin' | 'hero_elara'
  | 'hero_bran' | 'hero_nell' | 'hero_oskar' | 'hero_sable' | 'hero_ilse'
  | 'hero_rook' | 'hero_vesper' | 'hero_noktis' | 'hero_aurore' | 'hero_zephyr'
  | 'enemy_ghoul' | 'enemy_skeleton' | 'enemy_boneknight'
  | 'enemy_drowned' | 'enemy_witch' | 'enemy_queen';

/**
 * Classe d'affinité (façon MLBB) : ce que le héros EST, indépendamment de son rôle.
 * Le rôle dit comment il se bat (tank, assassin…), la classe dit d'où vient sa force.
 *
 * Cinq classes, un cycle fermé : chacune bat une classe et perd contre une autre.
 *   Lumière → Obscur → Nature → Technique → Combat → Lumière
 */
export type HeroClass = 'lumiere' | 'obscur' | 'nature' | 'technique' | 'combat';

export interface ClassDef {
  id: HeroClass;
  name: string;
  motto: string;
  css: string;
  color: number;
  icon: IconName;
  /** La classe que celle-ci bat. */
  strong: HeroClass;
}

export const CLASSES: Record<HeroClass, ClassDef> = {
  lumiere: { id: 'lumiere', name: 'Lumière', motto: 'La foi qui brûle', css: '#ffd36a', color: 0xffd36a, icon: 'sun', strong: 'obscur' },
  obscur: { id: 'obscur', name: 'Obscur', motto: 'Ce que la nuit couve', css: '#a06bff', color: 0xa06bff, icon: 'moon', strong: 'nature' },
  nature: { id: 'nature', name: 'Nature', motto: 'La sève et la rouille', css: '#7ed957', color: 0x7ed957, icon: 'feather', strong: 'technique' },
  technique: { id: 'technique', name: 'Technique', motto: 'Le calcul avant le fer', css: '#6ad8ff', color: 0x6ad8ff, icon: 'anvil', strong: 'combat' },
  combat: { id: 'combat', name: 'Combat', motto: 'La force, rien d’autre', css: '#ff5a4a', color: 0xff5a4a, icon: 'swords', strong: 'lumiere' },
};

export const CLASS_LIST: readonly HeroClass[] = ['lumiere', 'obscur', 'nature', 'technique', 'combat'];

/** Bonus de dégâts quand on attaque une classe que l'on bat. */
export const CLASS_ADVANTAGE = 1.18;
/** Malus quand on attaque une classe qui nous bat. */
export const CLASS_WEAKNESS = 0.87;
/** PV et ATQ gagnés par allié supplémentaire de la même classe (soi non compté). */
export const CLASS_SYNERGY = 0.05;

/** La classe qui bat `c` (utile pour afficher « faible contre »). */
export const classBeatenBy = (c: HeroClass): HeroClass =>
  (CLASS_LIST.find((k) => CLASSES[k].strong === c) ?? 'lumiere');

/** Multiplicateur de dégâts entre deux classes. */
export const classMultiplier = (attacker: HeroClass, defender: HeroClass): number => {
  if (CLASSES[attacker].strong === defender) return CLASS_ADVANTAGE;
  if (CLASSES[defender].strong === attacker) return CLASS_WEAKNESS;
  return 1;
};

/** Nombre de héros de chaque classe dans une équipe. */
export const classCounts = (defs: readonly { cls: HeroClass }[]): Record<HeroClass, number> => {
  const out = { lumiere: 0, obscur: 0, nature: 0, technique: 0, combat: 0 } as Record<HeroClass, number>;
  for (const d of defs) out[d.cls]++;
  return out;
};

export interface Stats {
  hp: number;
  atk: number;
  /** Armure : réduit les dégâts PHYSIQUES de armor / (armor + 100). */
  armor: number;
  /**
   * Résistance : réduit les dégâts MAGIQUES de res / (res + 100).
   * Les deux défenses sont séparées : un colosse d'os est blindé mais fond à la magie,
   * une sorcière des marais est le contraire. C'est ce qui fait vivre plusieurs compos.
   */
  res: number;
  /** Secondes entre deux attaques de base. */
  interval: number;
  /** Portée d'attaque (px du terrain). */
  range: number;
  /** Vitesse de déplacement (px / s). */
  speed: number;
  crit: number;
}

export interface AbilityText {
  name: string;
  icon: IconName;
  text: string;
}

/* ===================================================================== */
/*  Liens d'équipe : deux héros qui se connaissent se renforcent          */
/* ===================================================================== */

export interface BondDef {
  /** Identifiants des deux héros liés. */
  a: string;
  b: string;
  name: string;
  /** Réplique affichée au début du combat. */
  line: string;
  /** Bonus de PV et d'ATQ pour les deux (0,08 = +8 %). */
  bonus: number;
}

export const BONDS: BondDef[] = [
  { a: 'kael', b: 'aldric', name: 'La Flamme et la Foi', line: '« Tu as brûlé pour tes péchés, Kael. Je brûlerai avec toi. »', bonus: 0.08 },
  { a: 'lyra', b: 'vespera', name: 'Les Deux Lames', line: '« Reste derrière moi. » — « Je suis déjà devant. »', bonus: 0.09 },
  { a: 'morwen', b: 'nyx', name: 'Le Seuil et le Néant', line: '« La mort est une porte. » — « Alors laisse-la ouverte. »', bonus: 0.1 },
  { a: 'seren', b: 'sylvaine', name: 'Les Archères de Minuit', line: '« La lune compte les flèches. » — « Elle en oubliera. »', bonus: 0.08 },
  { a: 'vaelen', b: 'gorm', name: 'Les Deux Remparts', line: '« Tiens ma gauche. » — « Je tiens tout. »', bonus: 0.1 },
  { a: 'kael', b: 'pyrrha', name: 'Le Bûcher Partagé', line: '« Le feu ne juge pas. » — « Il se souvient, c’est tout. »', bonus: 0.08 },
  { a: 'thorne', b: 'gorm', name: 'Le Nord et la Pierre', line: '« Le gel fend la roche. » — « Pas celle-ci. »', bonus: 0.08 },
  { a: 'ashka', b: 'orlan', name: 'L’Orage et le Glas', line: '« Une cloche pour chaque éclair. » — « Alors sonne fort. »', bonus: 0.08 },
  { a: 'aldric', b: 'orlan', name: 'Les Voix du Chœur', line: '« Le ciel écoute. » — « Il n’a pas le choix. »', bonus: 0.08 },
  { a: 'vespera', b: 'nyx', name: 'La Veuve et l’Impératrice', line: '« Tu régnais sur le vide. » — « Je règne encore. »', bonus: 0.09 },
  { a: 'mira', b: 'orlan', name: 'Le Verre et l’Airain', line: '« Tu vises à la cloche. » — « Et je ne rate pas. »', bonus: 0.08 },
  { a: 'corvin', b: 'aldric', name: 'Le Pardon Refusé', line: '« L’aube ne m’a pas voulu. » — « Elle t’attend encore. »', bonus: 0.08 },
  { a: 'elara', b: 'kael', name: 'La Voix et l’Épée', line: '« Chante, et je frappe. » — « Je chante toujours. »', bonus: 0.08 },
  { a: 'noktis', b: 'morwen', name: 'Le Silence et la Voix', line: '« Tu leur parles encore ? » — « Je leur dis adieu. »', bonus: 0.08 },
  { a: 'aurore', b: 'seren', name: 'Deux Heures du Jour', line: '« La lune veille. » — « Le soleil tranche. »', bonus: 0.08 },
  { a: 'zephyr', b: 'sylvaine', name: 'Le Vent et l’Épine', line: '« Cours. » — « Pique. »', bonus: 0.08 },
  { a: 'bran', b: 'oskar', name: 'La Porte et la Hache', line: '« Tiens la ligne. » — « Je la tiens depuis vingt ans. »', bonus: 0.09 },
  { a: 'ilse', b: 'mira', name: 'Deux Paires de Mains', line: '« Tu démontes. » — « Je remonte. »', bonus: 0.08 },
  { a: 'rook', b: 'vaelen', name: 'Les Deux Murs', line: '« Un mur ne suffit pas. » — « Alors faisons-en deux. »', bonus: 0.08 },
];

/** Liens actifs pour une équipe donnée. */
export const bondsIn = (ids: readonly string[]): BondDef[] =>
  BONDS.filter((x) => ids.includes(x.a) && ids.includes(x.b));

/** Bonus cumulé d'un héros donné (plusieurs liens possibles). */
export const bondBonusFor = (id: string, ids: readonly string[]): number =>
  bondsIn(ids).filter((x) => x.a === id || x.b === id).reduce((s, x) => s + x.bonus, 0);

/** Ulime propre à un boss : nom, mise en scène et effet. */
export interface BossUlt {
  name: string;
  /** Phrase affichée pendant la montée (le joueur sait ce qui arrive). */
  text: string;
  kind: 'nova' | 'line' | 'quake' | 'hex' | 'rain' | 'summon';
  /** Recharge (s) et premier lancement. */
  cd: number;
  first: number;
  /** Multiplicateur d'ATQ du coup. */
  mult: number;
}

export interface UnitDef {
  id: string;
  name: string;
  texture: TextureKey;
  /** Hauteur affichée au combat (px du terrain 1920×1080). */
  height: number;
  /** Le dessin regarde-t-il vers la droite ? */
  facesRight: boolean;
  stats: Stats;
  /** Classe d'affinité : Lumière, Obscur, Nature, Technique ou Combat. */
  cls: HeroClass;
  projectile?: ProjectileKind;
  /** Point de départ des projectiles : [px vers l'avant, px au-dessus des pieds]. */
  muzzle?: readonly [number, number];
  /** Recharge de la compétence (s) et premier lancement. */
  skillCd?: number;
  skillFirst?: number;
  /** Un boss peut réutiliser la compétence d'une autre créature (« skillAs »). */
  skillAs?: string;
  /** Ulime de boss, joué à intervalle régulier avec une montée télégraphiée. */
  bossUlt?: BossUlt;
  color: number;
}

export interface HeroDef extends UnitDef {
  title: string;
  role: Role;
  rarity: Rarity;
  /** Étoiles de base (selon la rareté) ; les doublons d'invocation en ajoutent. */
  stars: number;
  /** Héros de départ (les autres s'obtiennent uniquement par invocation). */
  starter?: boolean;
  quote: string;
  lore: string;
  /** Teinte de l'interface du héros (CSS). */
  css: string;
  abilities: { attack: AbilityText; skill: AbilityText; ultimate: AbilityText };
}

export const HEROES: HeroDef[] = [
  {
    id: 'kael', name: 'Kael', title: 'Le Chevalier Déchu', role: 'Tank', rarity: 'SSR', stars: 5, starter: true,
    cls: 'lumiere',
    texture: 'hero_kael', height: 250, facesRight: true, color: 0xff7a2a, css: '#ff7a2a',
    quote: '« Mon serment a brûlé. Ma lame, elle, est restée. »',
    lore: 'Ancien champion de l’Ordre de l’Aube, Kael a survécu au bûcher qui devait le purifier. Les braises vivent désormais sous son armure.',
    stats: { hp: 3100, atk: 72, armor: 70, res: 34, interval: 1.3, range: 140, speed: 170, crit: 0.08 },
    skillCd: 9, skillFirst: 2.5,
    abilities: {
      attack: { name: 'Lame de Braise', icon: 'swords', text: 'Frappe l’ennemi le plus proche avec son épée ardente.' },
      skill: { name: 'Bouclier de Cendres', icon: 'shield', text: 'Gagne un bouclier égal à 30 % de ses PV max pendant 6 s et provoque les ennemis : ils l’attaquent en priorité.' },
      ultimate: { name: 'Jugement Ardent', icon: 'flame', text: 'Bondit au cœur des ennemis et frappe le sol : 160 % d’ATQ en zone et étourdit 1,2 s.' },
    },
  },
  {
    id: 'lyra', name: 'Lyra', title: 'La Lame Sanglante', role: 'Assassin', rarity: 'SSR', stars: 5, starter: true,
    cls: 'obscur',
    texture: 'hero_lyra', height: 215, facesRight: true, color: 0xff2a4a, css: '#ff2a4a',
    quote: '« Tu ne m’as pas vue. Personne ne me voit. »',
    lore: 'Élevée par la guilde des Écorcheurs, Lyra a bu le sang d’un démon pour survivre. Il murmure encore dans ses dagues.',
    stats: { hp: 1780, atk: 98, armor: 26, res: 32, interval: 0.75, range: 125, speed: 270, crit: 0.3 },
    skillCd: 7, skillFirst: 2,
    abilities: {
      attack: { name: 'Double Entaille', icon: 'swords', text: 'Attaques très rapides, avec 30 % de chances de coup critique.' },
      skill: { name: 'Pas de l’Ombre', icon: 'moon', text: 'Se téléporte derrière l’ennemi le plus affaibli et lui inflige 260 % d’ATQ.' },
      ultimate: { name: 'Danse Écarlate', icon: 'drop', text: 'Devient intouchable et frappe 7 fois des ennemis au hasard (120 % d’ATQ chacun) en volant 35 % des dégâts en PV.' },
    },
  },
  {
    id: 'morwen', name: 'Morwen', title: 'La Nécromancienne', role: 'Mage', rarity: 'SSR', stars: 5, starter: true,
    cls: 'obscur',
    texture: 'hero_morwen', height: 240, facesRight: true, color: 0xb055ff, css: '#b055ff',
    quote: '« La mort n’est qu’une porte. J’en ai la clé. »',
    lore: 'Bannie de l’Académie pour avoir relevé son propre maître, Morwen parcourt les cimetières en quête du secret de la Tour.',
    stats: { hp: 1200, atk: 118, armor: 14, res: 26, interval: 1.6, range: 640, speed: 150, crit: 0.1 },
    projectile: 'orb', muzzle: [80, 175], skillCd: 11, skillFirst: 3.5,
    abilities: {
      attack: { name: 'Orbe d’Âme', icon: 'skull', text: 'Lance une orbe d’ombre sur l’ennemi le plus proche.' },
      skill: { name: 'Éveil des Morts', icon: 'skull', text: 'Relève 2 goules spectrales qui combattent à ses côtés pendant 12 s.' },
      ultimate: { name: 'Fléau Noir', icon: 'flame', text: 'Un nuage maudit ronge tous les ennemis : 520 % d’ATQ sur 4 s et les ralentit.' },
    },
  },
  {
    id: 'seren', name: 'Seren', title: 'L’Archère Lunaire', role: 'Tireur', rarity: 'SR', stars: 4, starter: true,
    cls: 'lumiere',
    texture: 'hero_seren', height: 225, facesRight: true, color: 0x7ac8ff, css: '#7ac8ff',
    quote: '« La lune guide mes flèches. Elle ne rate jamais. »',
    lore: 'Dernière gardienne du Bois d’Argent, Seren chasse les créatures de la nuit avec l’arc sacré de son peuple.',
    stats: { hp: 1250, atk: 100, armor: 16, res: 22, interval: 1.05, range: 640, speed: 160, crit: 0.18 },
    projectile: 'arrow', muzzle: [85, 180], skillCd: 8, skillFirst: 3,
    abilities: {
      attack: { name: 'Flèche d’Argent', icon: 'arrow', text: 'Tire une flèche sur l’ennemi le plus proche.' },
      skill: { name: 'Tir Perçant', icon: 'arrow', text: 'Une flèche géante traverse toute la ligne ennemie : 220 % d’ATQ à chaque ennemi touché.' },
      ultimate: { name: 'Pluie Lunaire', icon: 'moon', text: '5 volées de flèches tombent du ciel sur tous les ennemis : 5 × 80 % d’ATQ.' },
    },
  },
  {
    id: 'aldric', name: 'Frère Aldric', title: 'L’Inquisiteur', role: 'Soutien', rarity: 'SR', stars: 4, starter: true,
    cls: 'lumiere',
    texture: 'hero_aldric', height: 235, facesRight: true, color: 0xffd36a, css: '#ffd36a',
    quote: '« Que la lumière brûle ce que la nuit a corrompu. »',
    lore: 'Inquisiteur de l’Ordre, Aldric a vu tomber Cendrebourg. Il est resté, seul prêtre encore capable d’allumer une flamme sacrée.',
    stats: { hp: 1400, atk: 62, armor: 30, res: 40, interval: 1.4, range: 640, speed: 150, crit: 0.05 },
    projectile: 'light', muzzle: [-50, 195], skillCd: 6, skillFirst: 3,
    abilities: {
      attack: { name: 'Rayon Sacré', icon: 'sun', text: 'Projette un éclat de lumière sur l’ennemi le plus proche.' },
      skill: { name: 'Prière', icon: 'heart', text: 'Soigne l’allié le plus blessé de 280 % d’ATQ.' },
      ultimate: { name: 'Sanctuaire Sacré', icon: 'sun', text: 'Soigne toute l’équipe de 25 % de ses PV max, retire les malus et réduit les dégâts subis de 35 % pendant 5 s.' },
    },
  },
  {
    id: 'thorne', name: 'Thorne', title: 'Le Jarl de Givre', role: 'Guerrier', rarity: 'SR', stars: 4,
    cls: 'combat',
    texture: 'hero_thorne', height: 255, facesRight: true, color: 0x8ae0ff, css: '#8ae0ff',
    quote: '« L’hiver ne pardonne pas. Moi non plus. »',
    lore: 'Dernier jarl des Crocs-Blancs, Thorne a scellé un esprit du blizzard dans sa hache pour venger son clan englouti par la nuit. Depuis, son souffle ne réchauffe plus rien.',
    stats: { hp: 2400, atk: 105, armor: 48, res: 30, interval: 1.5, range: 150, speed: 190, crit: 0.12 },
    skillCd: 8, skillFirst: 3,
    abilities: {
      attack: { name: 'Hache du Nord', icon: 'swords', text: 'Abat sa hache de glace sur l’ennemi le plus proche.' },
      skill: { name: 'Tourbillon de Givre', icon: 'snow', text: 'Tournoie avec sa hache : 160 % d’ATQ aux ennemis proches et les ralentit 2 s.' },
      ultimate: { name: 'Hiver Éternel', icon: 'snow', text: 'Frappe le sol : un mur de pics de glace balaie tout le champ de bataille, inflige 260 % d’ATQ et gèle les ennemis 2,2 s.' },
    },
  },
  {
    id: 'nyx', name: 'Nyx', title: 'L’Impératrice du Néant', role: 'Mage', rarity: 'SSR', stars: 5,
    cls: 'obscur',
    texture: 'hero_nyx', height: 235, facesRight: true, color: 0xa86bff, css: '#a86bff',
    quote: '« Les étoiles s’éteignent. Je suis ce qui reste. »',
    lore: 'Astronome du roi déchu, Nyx a regardé trop longtemps l’éclipse qui a précédé la chute de Cendrebourg. Le soleil noir s’est penché vers elle… et lui a répondu.',
    stats: { hp: 1150, atk: 128, armor: 12, res: 32, interval: 1.7, range: 640, speed: 150, crit: 0.12 },
    projectile: 'void', muzzle: [78, 178], skillCd: 10, skillFirst: 4,
    abilities: {
      attack: { name: 'Éclat du Vide', icon: 'vortex', text: 'Projette un fragment de néant sur l’ennemi le plus proche.' },
      skill: { name: 'Singularité', icon: 'vortex', text: 'Ouvre un trou noir au cœur des ennemis : il les aspire pendant 2,2 s et inflige 6 × 35 % d’ATQ.' },
      ultimate: { name: 'Éclipse', icon: 'moon', text: 'Un soleil noir dévore la lumière : il attire et étourdit tous les ennemis, puis implose pour 380 % d’ATQ.' },
    },
  },
  {
    id: 'ashka', name: 'Ashka', title: 'La Chamane de l’Orage', role: 'Soutien', rarity: 'SR', stars: 4,
    cls: 'nature',
    texture: 'hero_ashka', height: 230, facesRight: true, color: 0x6ad8ff, css: '#6ad8ff',
    quote: '« Écoute le tonnerre. Il chante ton nom… et celui de tes ennemis. »',
    lore: 'Fille des Hautes-Plaines, Ashka porte le totem de l’Oiseau-Tonnerre. Quand elle danse, le ciel gronde et les morts se souviennent qu’ils devraient avoir peur.',
    stats: { hp: 1500, atk: 80, armor: 26, res: 36, interval: 1.3, range: 640, speed: 160, crit: 0.1 },
    projectile: 'spark', muzzle: [50, 200], skillCd: 7, skillFirst: 3,
    abilities: {
      attack: { name: 'Étincelle', icon: 'bolt', text: 'Lance un trait de foudre très rapide sur l’ennemi le plus proche.' },
      skill: { name: 'Chaîne d’Éclairs', icon: 'bolt', text: 'Un éclair rebondit sur 4 ennemis : 150 % d’ATQ, puis 15 % de moins à chaque rebond.' },
      ultimate: { name: 'Rage du Tonnerre', icon: 'feather', text: 'L’Oiseau-Tonnerre s’éveille : toute l’équipe attaque 45 % plus vite pendant 6 s, et 6 éclairs frappent les ennemis (70 % d’ATQ).' },
    },
  },
  {
    id: 'vaelen', name: 'Vaelen', title: 'Le Rempart de Cendre', role: 'Tank', rarity: 'SSR', stars: 5,
    cls: 'combat',
    texture: 'hero_vaelen', height: 262, facesRight: true, color: 0xffb454, css: '#ffb454',
    quote: '« Je ne tomberai pas. Il n’y a personne derrière moi pour me remplacer. »',
    lore: 'Dernier serment de la garde de Cendrebourg, Vaelen a tenu la porte nord pendant sept nuits. Quand la ville est tombée, il était encore debout — et il l’est toujours.',
    stats: { hp: 3600, atk: 66, armor: 92, res: 40, interval: 1.45, range: 145, speed: 155, crit: 0.06 },
    skillCd: 10, skillFirst: 3,
    abilities: {
      attack: { name: 'Marteau de Guerre', icon: 'swords', text: 'Écrase l’ennemi le plus proche de son marteau de siège.' },
      skill: { name: 'Serment de Fer', icon: 'shield', text: 'Plante son bouclier : il gagne un bouclier de 42 % de ses PV max, provoque les ennemis 5 s et réduit de 20 % les dégâts subis par l’équipe.' },
      ultimate: { name: 'Rempart Écarlate', icon: 'flame', text: 'Un mur de flammes s’élève : 140 % d’ATQ en zone, étourdit 1,1 s et rend tous les alliés intouchables pendant 1,2 s.' },
    },
  },
  {
    id: 'sylvaine', name: 'Sylvaine', title: 'L’Épine de la Nuit', role: 'Tireur', rarity: 'SSR', stars: 5,
    cls: 'nature',
    texture: 'hero_sylvaine', height: 232, facesRight: true, color: 0x7ae08a, css: '#7ae08a',
    quote: '« La forêt m’a appris une chose : on n’entend jamais la flèche qui vous tue. »',
    lore: 'Bannie du Bois d’Argent pour avoir chassé un seigneur de la cour, Sylvaine vit désormais dans les branches. Son arc de ronces boit la sève des morts.',
    stats: { hp: 1320, atk: 104, armor: 18, res: 22, interval: 0.95, range: 640, speed: 175, crit: 0.24 },
    projectile: 'arrow', muzzle: [86, 182], skillCd: 7.5, skillFirst: 2.8,
    abilities: {
      attack: { name: 'Flèche de Ronce', icon: 'arrow', text: 'Décoche une flèche acérée sur l’ennemi le plus proche.' },
      skill: { name: 'Salve d’Épines', icon: 'arrow', text: 'Tire 5 flèches en éventail sur les ennemis les plus proches : 120 % d’ATQ chacune et applique un saignement.' },
      ultimate: { name: 'Bois des Suppliciés', icon: 'moon', text: 'Fait surgir une forêt de ronces : 8 traits frappent des ennemis au hasard (100 % d’ATQ) et les enracinent 1,5 s.' },
    },
  },
  {
    id: 'pyrrha', name: 'Pyrrha', title: 'Le Bûcher Éternel', role: 'Mage', rarity: 'SSR', stars: 5,
    cls: 'combat',
    texture: 'hero_pyrrha', height: 238, facesRight: true, color: 0xff6a2a, css: '#ff6a2a',
    quote: '« Tout brûle. Certains mettent juste plus longtemps que d’autres. »',
    lore: 'Née dans l’incendie qui a consumé son village, Pyrrha n’a jamais cessé de brûler. Ce qu’elle touche prend feu ; ce qu’elle regarde finit en cendres.',
    stats: { hp: 1180, atk: 132, armor: 13, res: 24, interval: 1.65, range: 640, speed: 152, crit: 0.1 },
    projectile: 'orb', muzzle: [78, 172], skillCd: 9, skillFirst: 3.2,
    abilities: {
      attack: { name: 'Braise Vive', icon: 'flame', text: 'Lance une braise enflammée sur l’ennemi le plus proche.' },
      skill: { name: 'Météore', icon: 'flame', text: 'Appelle un météore sur le groupe ennemi le plus dense : 280 % d’ATQ et brûlure sur 4 s.' },
      ultimate: { name: 'Jugement de Flammes', icon: 'sun', text: 'Le ciel s’embrase : 3 vagues de feu balaient le champ, 180 % d’ATQ chacune, et les ennemis brûlent pour 6 s.' },
    },
  },
  {
    id: 'orlan', name: 'Orlan', title: 'Le Sonneur de Glas', role: 'Soutien', rarity: 'SR', stars: 4,
    cls: 'technique',
    texture: 'hero_orlan', height: 240, facesRight: true, color: 0xd8c48a, css: '#d8c48a',
    quote: '« Chaque cloche sonne pour quelqu’un. La mienne sonne pour toi. »',
    lore: 'Il a enterré tant de monde qu’il ne compte plus. Orlan porte la cloche des morts sans nom, et son glas fait taire les vivants comme les trépassés.',
    stats: { hp: 1650, atk: 86, armor: 26, res: 42, interval: 1.5, range: 640, speed: 150, crit: 0.05 },
    projectile: 'light', muzzle: [72, 150], skillCd: 11, skillFirst: 4.5,
    abilities: {
      attack: { name: 'Glas Funèbre', icon: 'sun', text: 'Projette un éclat de lumière bénite sur l’ennemi le plus proche.' },
      skill: { name: 'Tollé de Brume', icon: 'moon', text: 'Fait sonner sa cloche : les ennemis proches sont étourdis 1,2 s et ralentis 4 s.' },
      ultimate: { name: 'Le Grand Glas', icon: 'sun', text: 'Un glas immense fige tous les ennemis 2 s et rend 18 % des PV max à chaque allié.' },
    },
  },
  {
    id: 'vespera', name: 'Vespera', title: 'La Veuve de Fer', role: 'Assassin', rarity: 'SSR', stars: 5,
    cls: 'technique',
    texture: 'hero_vespera', height: 232, facesRight: true, color: 0xff3050, css: '#ff3050',
    quote: '« Le deuil se porte sept jours. Moi, je le porte depuis toujours. »',
    lore: 'On l’a mariée à la mort, et elle a accepté. Depuis, Vespera traverse les champs de bataille en voile noir, et les veuves qu’elle laisse n’ont personne à qui se plaindre.',
    stats: { hp: 1500, atk: 130, armor: 18, res: 28, interval: 0.82, range: 150, speed: 268, crit: 0.24 },
    skillCd: 8, skillFirst: 3,
    abilities: {
      attack: { name: 'Lame Veuve', icon: 'swords', text: 'Double entaille très rapide sur l’ennemi le plus proche.' },
      skill: { name: 'Voile de Deuil', icon: 'moon', text: 'Se glisse derrière l’ennemi le plus affaibli et frappe pour 280 % d’ATQ.' },
      ultimate: { name: 'Veuve Noire', icon: 'drop', text: 'Devenue insaisissable, elle frappe 8 fois des cibles au hasard (110 % d’ATQ chacune) et vole 35 % des dégâts en PV.' },
    },
  },
  {
    id: 'gorm', name: 'Gorm', title: 'Le Père des Cailloux', role: 'Tank', rarity: 'SR', stars: 4,
    cls: 'nature',
    texture: 'hero_gorm', height: 262, facesRight: true, color: 0x8ad46a, css: '#8ad46a',
    quote: '« J’ai attendu sous la montagne. J’ai attendu longtemps. Maintenant, je bouge. »',
    lore: 'La montagne l’a recouvert et il ne l’a pas remarqué. Quand les goules ont rongé le hameau, le tas de pierres s’est levé, et les morts ont compris ce qu’elles avaient réveillé.',
    stats: { hp: 4300, atk: 60, armor: 100, res: 44, interval: 2.0, range: 150, speed: 108, crit: 0.03 },
    skillCd: 10, skillFirst: 4,
    abilities: {
      attack: { name: 'Poing de Granit', icon: 'swords', text: 'Abat son bloc de pierre sur l’ennemi le plus proche.' },
      skill: { name: 'Mur de Pierre', icon: 'shield', text: 'Plante son rempart : bouclier de 38 % des PV max et provoque les ennemis pendant 5 s.' },
      ultimate: { name: 'Éboulement', icon: 'flame', text: 'Le plafond s’effondre : 150 % d’ATQ sur tous les ennemis proches et étourdissement 1,2 s.' },
    },
  },
  {
    id: 'mira', name: 'Mira', title: 'La Mécanicienne des Abysses',
    cls: 'technique',
    texture: 'hero_mira', height: 225, facesRight: true, color: 0x4ae0c8, css: '#4ae0c8',
    role: 'Tireur', rarity: 'SSR', stars: 5,
    quote: '« Tout ce qui casse peut être réparé. Sauf un cœur. »',
    lore: 'Ingénieure des pompes du marais, Mira a vu ses machines céder une à une sous la crue. Elle a remplacé son bras droit par ce qu’elle a pu sauver, et ne remonte plus jamais sans son arbalète à verre noir.',
    stats: { hp: 1360, atk: 114, armor: 18, res: 24, interval: 0.98, range: 640, speed: 168, crit: 0.24 },
    projectile: 'spark', muzzle: [86, 178], skillCd: 8.5, skillFirst: 3.2,
    abilities: {
      attack: { name: 'Carreau de Verre', icon: 'arrow', text: 'Tire un trait de verre noir qui traverse l’air en sifflant.' },
      skill: { name: 'Pose de Piège', icon: 'gear', text: 'Lâche un piège à mâchoires devant elle : le premier ennemi qui passe est enraciné 1,4 s et saigne.' },
      ultimate: { name: 'Salve de Forge', icon: 'flame', text: 'Vide son chargeur dans une volée de six traits qui ricochent sur les ennemis proches, 90 % d’ATQ chacun.' },
    },
  },
  {
    id: 'corvin', name: 'Corvin', title: 'Le Serment Brisé',
    cls: 'lumiere',
    texture: 'hero_corvin', height: 260, facesRight: true, color: 0xe3c077, css: '#e3c077',
    role: 'Guerrier', rarity: 'SSR', stars: 5,
    quote: '« J’ai juré de protéger l’aube. L’aube, elle, m’a tourné le dos. »',
    lore: 'Paladin de l’Ordre de l’Aube, Corvin fut le premier à douter du bûcher de Kael — et le seul à en payer le prix. Son armure garde l’or des serments qu’il n’a pas tenus.',
    stats: { hp: 2650, atk: 112, armor: 62, res: 38, interval: 1.35, range: 155, speed: 180, crit: 0.1 },
    skillCd: 8, skillFirst: 3,
    abilities: {
      attack: { name: 'Lame du Serment', icon: 'swords', text: 'Frappe de taille avec son épée fendue, dont la garde brille encore.' },
      skill: { name: 'Contrition', icon: 'shield', text: 'Frappe le sol : 120 % d’ATQ autour de lui et gagne un bouclier de 25 % de ses PV max.' },
      ultimate: { name: 'Jugement Différé', icon: 'sun', text: 'Lève son épée vers le ciel : 190 % d’ATQ sur une ligne entière, et tous les alliés retrouvent 15 % de leurs PV.' },
    },
  },
  {
    id: 'elara', name: 'Elara', title: 'La Voix du Chœur',
    cls: 'lumiere',
    texture: 'hero_elara', height: 220, facesRight: true, color: 0xfff0c0, css: '#fff0c0',
    role: 'Soutien', rarity: 'SR', stars: 4,
    quote: '« Je ne vois pas la lumière. Je l’entends. »',
    lore: 'Née aveugle dans la nef noire, Elara a appris à lire le monde aux échos. Les cloches lui parlent ; elle leur répond — et les morts, parfois, s’arrêtent pour écouter.',
    stats: { hp: 1520, atk: 74, armor: 24, res: 46, interval: 1.45, range: 640, speed: 150, crit: 0.06 },
    projectile: 'light', muzzle: [-60, 186], skillCd: 7, skillFirst: 2.8,
    abilities: {
      attack: { name: 'Éclat de Voix', icon: 'sun', text: 'Envoie un éclat de lumière qui cherche seul sa cible.' },
      skill: { name: 'Écho de Nef', icon: 'heart', text: 'Un écho résonne : soigne l’allié le plus faible de 20 % de ses PV max et dissipe ses altérations.' },
      ultimate: { name: 'Chœur des Sept', icon: 'medal', text: 'Sept voix s’élèvent : toute l’équipe récupère 22 % de ses PV et les ennemis sont étourdis 1,1 s.' },
    },
  },
  /* ====================== Recrues de la Tour (v1.5) ====================== */
  {
    id: 'bran', name: 'Bran', title: 'Le Mercenaire Têtu', role: 'Guerrier', rarity: 'R', stars: 3,
    cls: 'combat',
    texture: 'hero_bran', height: 238, facesRight: true, color: 0xd08a5a, css: '#d08a5a',
    quote: '« On me paie pour tenir la ligne. Je tiens. C’est tout. »',
    lore: 'Bran n’a jamais sauvé de royaume. Il tient des portes, des ponts, des arrière-cours — et il les tient encore quand tout le monde est mort derrière lui.',
    stats: { hp: 1350, atk: 86, armor: 38, res: 22, interval: 1.25, range: 150, speed: 190, crit: 0.08 },
    skillCd: 8, skillFirst: 3.5,
    abilities: {
      attack: { name: 'Taille de Hache', icon: 'swords', text: 'Frappe large de sa hache ébréchée.' },
      skill: { name: 'Coup de Maillet', icon: 'anvil', text: 'Assomme l’ennemi devant lui : 150 % d’ATQ et ralentissement 2 s.' },
      ultimate: { name: 'Charge de la Horde', icon: 'flame', text: 'Fonce dans la ligne : 220 % d’ATQ sur les ennemis traversés et étourdissement 0,7 s.' },
    },
  },
  {
    id: 'nell', name: 'Nell', title: 'L’Œil des Bois', role: 'Tireur', rarity: 'R', stars: 3,
    cls: 'nature',
    texture: 'hero_nell', height: 208, facesRight: true, color: 0x8ad46a, css: '#8ad46a',
    quote: '« La forêt m’a appris à attendre. Toi, tu es pressé. C’est pour ça que tu vas mourir. »',
    lore: 'Elle compte les respirations avant de décocher. À douze, la cible tombe. Elle n’a jamais eu besoin d’aller jusqu’à treize.',
    stats: { hp: 1150, atk: 94, armor: 16, res: 26, interval: 1.05, range: 640, speed: 230, crit: 0.14 },
    projectile: 'arrow', muzzle: [58, 128], skillCd: 8, skillFirst: 4,
    abilities: {
      attack: { name: 'Flèche de Chasse', icon: 'arrow', text: 'Tire une flèche vive sur l’ennemi le plus proche.' },
      skill: { name: 'Marque du Gibier', icon: 'drop', text: 'Marque l’ennemi le plus faible : 180 % d’ATQ et saignement de 4 s.' },
      ultimate: { name: 'Pluie de Flèches', icon: 'arrow', text: 'Décoche une volée sur tous les ennemis : 110 % d’ATQ chacun.' },
    },
  },
  {
    id: 'oskar', name: 'Oskar', title: 'Le Porte-Bouclier', role: 'Tank', rarity: 'R', stars: 3,
    cls: 'technique',
    texture: 'hero_oskar', height: 244, facesRight: true, color: 0x9aa3b5, css: '#9aa3b5',
    quote: '« Un bouclier, ça se répare. Un homme, ça se remplace. Donc je donne le bouclier. »',
    lore: 'Ancien garde de la porte nord, Oskar a vu tomber trois capitaines. Il a gardé leurs boucliers et cloue une planche neuve chaque fois que l’un se fend.',
    stats: { hp: 1700, atk: 70, armor: 62, res: 34, interval: 1.55, range: 150, speed: 150, crit: 0.04 },
    skillCd: 9, skillFirst: 3.5,
    abilities: {
      attack: { name: 'Coup de Plat', icon: 'shield', text: 'Frappe avec le plat du bouclier.' },
      skill: { name: 'Mur de Planches', icon: 'shield', text: 'Se couvre : bouclier de 20 % des PV max et provoque les ennemis 3 s.' },
      ultimate: { name: 'Rempart de Fortune', icon: 'castle', text: 'Protège toute l’équipe : bouclier de 12 % des PV max et −12 % de dégâts subis pendant 5 s.' },
    },
  },
  {
    id: 'sable', name: 'Sable', title: 'La Rôdeuse', role: 'Assassin', rarity: 'R', stars: 3,
    cls: 'obscur',
    texture: 'hero_sable', height: 206, facesRight: true, color: 0xb08aff, css: '#b08aff',
    quote: '« Je ne me cache pas. J’attends que tu regardes ailleurs. »',
    lore: 'Personne ne l’a jamais vue entrer. On la retrouve parfois dans les cuisines, les mains froides, en train de voler du pain et des vies.',
    stats: { hp: 980, atk: 105, armor: 12, res: 20, interval: 0.95, range: 130, speed: 275, crit: 0.2 },
    skillCd: 7, skillFirst: 3,
    abilities: {
      attack: { name: 'Double Lame', icon: 'swords', text: 'Deux entailles rapides, presque simultanées.' },
      skill: { name: 'Écorchure', icon: 'moon', text: 'Se glisse derrière l’ennemi le plus faible : 190 % d’ATQ.' },
      ultimate: { name: 'Exécution', icon: 'drop', text: 'Frappe l’ennemi le plus faible pour 320 % d’ATQ. Les cibles sous 25 % de PV subissent le double.' },
    },
  },
  {
    id: 'ilse', name: 'Ilse', title: 'L’Ingénieure de Siège', role: 'Soutien', rarity: 'SR', stars: 4,
    cls: 'technique',
    texture: 'hero_ilse', height: 222, facesRight: true, color: 0x6ad8ff, css: '#6ad8ff',
    quote: '« Rien ne casse vraiment. Ça se démonte, voilà tout. »',
    lore: 'Elle a remplacé sa main gauche par un étau et son œil droit par une lunette. Elle répare les vivants avec la même patience qu’elle met à démonter les machines de guerre.',
    stats: { hp: 1450, atk: 88, armor: 30, res: 40, interval: 1.3, range: 640, speed: 160, crit: 0.06 },
    projectile: 'spark', muzzle: [54, 150], skillCd: 8, skillFirst: 3,
    abilities: {
      attack: { name: 'Tir de Rivet', icon: 'bolt', text: 'Envoie un rivet chauffé à blanc.' },
      skill: { name: 'Réparation', icon: 'gear', text: 'Répare l’allié le plus faible : 18 % de ses PV max et bouclier de 8 %.' },
      ultimate: { name: 'Bombardement', icon: 'anvil', text: 'Trois obus tombent sur les zones les plus denses : 130 % d’ATQ et ralentissement.' },
    },
  },
  {
    id: 'rook', name: 'Rook', title: 'Le Briseur de Lignes', role: 'Tank', rarity: 'SR', stars: 4,
    cls: 'combat',
    texture: 'hero_rook', height: 262, facesRight: true, color: 0xff5a4a, css: '#ff5a4a',
    quote: '« Les murs tombent. Les lignes tombent. Moi, je reste debout. »',
    lore: 'Il portait la porte de la caserne sur le dos quand il a chargé. Depuis, c’est un bouclier, et personne n’a osé lui demander de la rendre.',
    stats: { hp: 2350, atk: 78, armor: 76, res: 30, interval: 1.5, range: 155, speed: 140, crit: 0.05 },
    skillCd: 9, skillFirst: 4,
    abilities: {
      attack: { name: 'Bélier', icon: 'anvil', text: 'Frappe avec le bord de sa porte-bouclier.' },
      skill: { name: 'Coup de Bouclier', icon: 'shield', text: 'Étourdis la cible 1 s et inflige 140 % d’ATQ.' },
      ultimate: { name: 'Mur de Fer', icon: 'castle', text: 'Provoque tous les ennemis 4 s, gagne un bouclier de 35 % des PV max et frappe à 160 % d’ATQ autour de lui.' },
    },
  },
  {
    id: 'vesper', name: 'Vesper', title: 'Le Chantre de l’Aube', role: 'Mage', rarity: 'SR', stars: 4,
    cls: 'lumiere',
    texture: 'hero_vesper', height: 224, facesRight: true, color: 0xfff0c0, css: '#fff0c0',
    quote: '« Je chante faux. Les morts, eux, n’ont jamais osé me le dire. »',
    lore: 'Le dernier chantre de la nef haute. Il a vu l’aube se lever mille fois et n’a jamais cessé de la chanter, même quand elle a cessé de venir.',
    stats: { hp: 1380, atk: 98, armor: 20, res: 44, interval: 1.35, range: 640, speed: 150, crit: 0.07 },
    projectile: 'light', muzzle: [50, 150], skillCd: 9, skillFirst: 3.5,
    abilities: {
      attack: { name: 'Note Claire', icon: 'sun', text: 'Projette une note de lumière qui cherche sa cible.' },
      skill: { name: 'Hymne', icon: 'heart', text: 'Soigne toute l’équipe de 10 % de ses PV max et dissipe les altérations.' },
      ultimate: { name: 'Lumière Blanche', icon: 'medal', text: 'Éblouit tous les ennemis : 190 % d’ATQ et ralentissement 2,5 s.' },
    },
  },
  {
    id: 'noktis', name: 'Noktis', title: 'Le Bourreau du Néant', role: 'Guerrier', rarity: 'SSR', stars: 5,
    cls: 'obscur',
    texture: 'hero_noktis', height: 278, facesRight: true, color: 0x8a4dff, css: '#8a4dff',
    quote: '« Je ne tue pas pour la mort. Je tue pour le silence. »',
    lore: 'Sa faux a été forgée dans une éclipse. On dit qu’elle ne coupe pas les corps mais les noms — et que ceux qu’il moissonne, plus personne ne se souvient d’eux.',
    stats: { hp: 2500, atk: 124, armor: 58, res: 36, interval: 1.4, range: 160, speed: 175, crit: 0.12 },
    skillCd: 8, skillFirst: 3.5,
    abilities: {
      attack: { name: 'Faux du Néant', icon: 'moon', text: 'Fauche en arc, la lame siffle dans le vide.' },
      skill: { name: 'Sillon Noir', icon: 'vortex', text: 'Ouvre une entaille : 170 % d’ATQ en arc et saignement de 5 s.' },
      ultimate: { name: 'Moisson d’Âmes', icon: 'skull', text: 'Fauche toute la ligne ennemie : 260 % d’ATQ chacun, et se soigne de 25 % des dégâts infligés.' },
    },
  },
  {
    id: 'aurore', name: 'Aurore', title: 'La Vierge de Midi', role: 'Mage', rarity: 'SSR', stars: 5,
    cls: 'lumiere',
    texture: 'hero_aurore', height: 236, facesRight: true, color: 0xffd36a, css: '#ffd36a',
    quote: '« À midi, il n’y a plus d’ombres. Plus d’endroits où se cacher. »',
    lore: 'Elle n’a jamais connu la nuit. Là où elle passe, le soleil reste haut, et les créatures qui vivent dans les coins commencent à brûler.',
    stats: { hp: 1560, atk: 132, armor: 18, res: 48, interval: 1.45, range: 640, speed: 145, crit: 0.1 },
    projectile: 'light', muzzle: [52, 156], skillCd: 9, skillFirst: 3,
    abilities: {
      attack: { name: 'Trait de Midi', icon: 'sun', text: 'Un rayon solaire concentré.' },
      skill: { name: 'Éclat de Zénith', icon: 'flame', text: 'Trace une ligne de feu solaire : 160 % d’ATQ et brûlure.' },
      ultimate: { name: 'Zénith', icon: 'crown', text: 'Le soleil tombe sur l’arène : 240 % d’ATQ sur tous les ennemis et 18 % de PV rendus aux alliés.' },
    },
  },
  {
    id: 'zephyr', name: 'Zephyr', title: 'L’Enfant de l’Orage', role: 'Assassin', rarity: 'SSR', stars: 5,
    cls: 'nature',
    texture: 'hero_zephyr', height: 214, facesRight: true, color: 0x7ed957, css: '#7ed957',
    quote: '« Tu m’as déjà vu ? Non. Personne ne m’a jamais vu. »',
    lore: 'Né dans une bourrasque, il ne touche le sol que pour repartir. Les archers de la Tour ont cessé de tirer : ils ne savent plus où viser.',
    stats: { hp: 1420, atk: 138, armor: 16, res: 26, interval: 0.9, range: 150, speed: 300, crit: 0.26 },
    skillCd: 7, skillFirst: 3,
    abilities: {
      attack: { name: 'Lame de Vent', icon: 'feather', text: 'Deux entailles si rapides qu’on les entend après.' },
      skill: { name: 'Danse du Vent', icon: 'bolt', text: 'Traverse trois ennemis : 150 % d’ATQ chacun et gagne de la hâte.' },
      ultimate: { name: 'Tempête de Lames', icon: 'vortex', text: 'Six frappes tourbillonnantes (100 % d’ATQ) sur des cibles au hasard, puis hâte pendant 6 s.' },
    },
  },

];

export const ENEMIES = {
  ghoul: {
    id: 'ghoul', name: 'Goule affamée', texture: 'enemy_ghoul', height: 165, facesRight: false, color: 0x9ac46a,
    skillCd: 9, skillFirst: 4,
    cls: 'obscur',
    stats: { hp: 1800, atk: 108, armor: 28, res: 16, interval: 0.95, range: 130, speed: 230, crit: 0.08 },
  },
  skeleton: {
    id: 'skeleton', name: 'Archer squelette', texture: 'enemy_skeleton', height: 215, facesRight: false, color: 0x6ae0ff,
    skillCd: 11, skillFirst: 5,
    cls: 'combat',
    stats: { hp: 1250, atk: 128, armor: 46, res: 6, interval: 1.45, range: 640, speed: 140, crit: 0.1 },
    projectile: 'bone', muzzle: [70, 125],
  },
  warden: {
    id: 'warden', name: 'Gardien d’Os', texture: 'enemy_boneknight', height: 285, facesRight: false, color: 0xff3bd0,
    cls: 'combat',
    stats: { hp: 6800, atk: 168, armor: 88, res: 10, interval: 1.8, range: 175, speed: 120, crit: 0.1 },
    skillCd: 7, skillFirst: 5,
    bossUlt: {
      name: 'Broyeur d’Ossements', text: 'Le Gardien lève son pilon : l’impact souffle tout autour de lui.',
      kind: 'quake', cd: 16, first: 14, mult: 1.9,
    },
  },
  spectral: {
    id: 'spectral', name: 'Goule spectrale', texture: 'enemy_ghoul', height: 130, facesRight: false, color: 0x7affd0,
    cls: 'obscur',
    stats: { hp: 520, atk: 38, armor: 14, res: 44, interval: 1, range: 120, speed: 260, crit: 0.05 },
  },
  drowned: {
    id: 'drowned', name: 'Noyé', texture: 'enemy_drowned', height: 205, facesRight: false, color: 0x6ac8d8,
    skillCd: 10, skillFirst: 4.5,
    cls: 'nature',
    stats: { hp: 2200, atk: 96, armor: 20, res: 42, interval: 1.2, range: 130, speed: 170, crit: 0.06 },
  },
  witch: {
    id: 'witch', name: 'Sorcière des marais', texture: 'enemy_witch', height: 210, facesRight: false, color: 0xffb02a,
    cls: 'nature',
    stats: { hp: 1350, atk: 120, armor: 12, res: 50, interval: 1.6, range: 640, speed: 140, crit: 0.08 },
    projectile: 'hex', muzzle: [92, 158], skillCd: 9, skillFirst: 4,
  },
  queen: {
    id: 'queen', name: 'La Reine Noyée', texture: 'enemy_queen', height: 300, facesRight: false, color: 0x4ae0d0,
    cls: 'nature',
    bossUlt: {
      name: 'Raz-de-Marée', text: 'La Reine appelle l’eau noire : toute l’arène se noie.',
      kind: 'rain', cd: 18, first: 16, mult: 1.7,
    },
    stats: { hp: 9200, atk: 180, armor: 22, res: 66, interval: 1.9, range: 190, speed: 110, crit: 0.1 },
    skillCd: 7.5, skillFirst: 5,
  },
} satisfies Record<string, UnitDef>;

/** Décor du combat. */
export type SceneId = 'gallows' | 'swamp' | 'citadel' | 'throne';

/** Montée des ennemis : +16 % de PV et +9,5 % d'ATQ par palier (composés).
 *  Un palier = un niveau. Les niveaux diffèrent donc par leur COMPOSITION, pas par un mur de stats. */
/**
 * Budget de PV d'un niveau. Les compositions changent beaucoup (un niveau à deux boss
 * contre un niveau à cinq petites créatures), donc on ne multiplie pas les ennemis
 * un par un : on vise un TOTAL, et chaque ennemi reçoit la part qui lui permet de l'atteindre.
 * La courbe devient lisible, et un futur chapitre n'a qu'à continuer la série.
 */
export const STAGE_HP_BASE = 12900;
/**
 * Les PV montent de 35 % par CHAPITRE (pas par palier) : la campagne compte
 * désormais 20 chapitres et 100 niveaux, une exponentielle par palier deviendrait
 * rapidement infaisable. La puissance des héros, elle, monte avec le niveau et l'équipement.
 */
export const STAGE_HP_STEP = 1.44;
/** L'ATQ monte moins vite que les PV : la difficulté vient de la survie, pas du temps de combat. */
export const STAGE_ATK_STEP = 1.28;

/**
 * Niveau de héros visé pour chaque chapitre (index 0 = chapitre 1).
 *
 * C'est le CONTRAT de difficulté du jeu : pour finir le chapitre N avec une équipe
 * de départ correctement montée, il faut viser ce niveau. Tout le reste (budget de PV
 * ennemis, puissance conseillée affichée à l'écran) en découle.
 * La courbe est volontairement régulière : +3 à +7 niveaux par chapitre, sans marche
 * d'escalier, pour qu'aucun chapitre ne surprenne le joueur.
 */
export const CHAPTER_TARGET_LEVEL: readonly number[] = [
  1, 3, 5, 7, 11, 16, 21, 27, 33, 40,
  47, 54, 61, 68, 75, 82, 89, 96, 103, 110,
];

/**
 * Surcoût de l'étage dans le chapitre : les deux niveaux de boss demandent un ou deux
 * niveaux de plus. Le pas entre deux chapitres est toujours ≥ 2, donc le niveau
 * conseillé ne redescend jamais d'un niveau à l'autre (vérifié par tests/test-campagne.ts).
 */
export const STAGE_LEVEL_BUMP: readonly number[] = [0, 0, 1, 1, 2];

/**
 * Réglage fin par chapitre, mesuré par simulation (tests/test-calibre.ts).
 *
 * La formule brute donne un budget de PV, mais chaque chapitre a sa propre
 * composition (nombre d'ennemis, boss, armure/résistance, classes) : à budget égal,
 * deux chapitres ne résistent pas pareil. Ces deux tables corrigent l'écart pour que
 * le niveau réellement nécessaire suive {@link CHAPTER_TARGET_LEVEL} au lieu de
 * partir dans tous les sens (avant correction, le chapitre 19 était plus facile que
 * le 18 et le 12 demandait 130 niveaux pour 161 000 de puissance « conseillée »).
 */
/**
 * Valeurs mesurées le 22/10/2026 par `npx vite-node tests/test-calibre.ts`
 * (14 passes, équipe de départ, 5 combats par mesure, seuil 60 % de victoires).
 * À recalculer si on change un boss, une composition ou la courbe des héros.
 */
export const CHAPTER_TUNE_HP: number[] = [
  1.000, 1.002, 1.284, 0.673, 1.000, 0.440, 0.420, 0.419, 0.458, 0.270,
  0.249, 0.250, 0.268, 0.298, 0.394, 0.523, 0.293, 0.368, 0.726, 0.461,
];
export const CHAPTER_TUNE_ATK: number[] = [
  1.000, 1.002, 1.284, 0.813, 1.000, 0.657, 0.507, 0.647, 0.620, 0.429,
  0.485, 0.460, 0.382, 0.600, 0.605, 0.703, 0.581, 0.598, 0.813, 0.618,
];

/** Chapitre (0-19) d'un niveau, déduit de son palier de difficulté. */
export const stageChapter = (stage: Pick<StageDef, 'tier'>): number =>
  Math.max(0, Math.min(CHAPTER_TARGET_LEVEL.length - 1, Math.floor(stage.tier / 5)));

export const stageEnemyScale = (stage: StageDef): { hp: number; atk: number } => {
  const base = stage.enemies.reduce((a, e) => a + e.def.stats.hp, 0) || 1;
  // La pente d'origine (×1,44 PV par chapitre) est tenue jusqu'au chapitre 11.
  // Au-delà elle s'adoucit : sinon les PV ennemis dépassent toute progression possible.
  const c = stage.tier / 5;
  const ci = stageChapter(stage);
  const hpFactor = c <= 10 ? Math.pow(STAGE_HP_STEP, c) : Math.pow(STAGE_HP_STEP, 10) * Math.pow(1.05, c - 10);
  const atkFactor = c <= 10 ? Math.pow(STAGE_ATK_STEP, c) : Math.pow(STAGE_ATK_STEP, 10) * Math.pow(1.03, c - 10);
  return {
    hp: (STAGE_HP_BASE * hpFactor * (CHAPTER_TUNE_HP[ci] ?? 1)) / base,
    atk: atkFactor * (CHAPTER_TUNE_ATK[ci] ?? 1),
  };
};

export interface StageDef {
  id: string;
  name: string;
  scene: SceneId;
  /** Niveau à terminer avant de pouvoir jouer celui-ci. */
  requires?: string;
  /** Conseil affiché après une défaite. */
  tip: string;
  description: string;
  /**
   * Palier de difficulté (0 = premier niveau). Les ennemis gagnent PV et ATQ à chaque palier :
   * la courbe est continue, et un futur chapitre n'aura qu'à reprendre tier 10, 11…
   */
  tier: number;
  /** Puissance d'équipe conseillée (affichée avant le combat). */
  power: number;
  /**
   * Niveau de héros conseillé pour ce niveau. C'est le niveau auquel une équipe de
   * départ correctement jouée passe ce niveau : la puissance conseillée ci-dessus en
   * est la traduction en chiffres. Les deux sont mesurés par simulation, pas devinés.
   */
  level: number;
  energy: number;
  rewards: { gold: number; gems: number; xp: number };
  /** Ennemis et position de départ (px du terrain). */
  enemies: Array<{ def: UnitDef; x: number; y: number; boss?: boolean }>;
}

/**
 * Défense dominante d'un niveau, pondérée par les PV (un boss compte plus qu'une goule).
 * Sert à prévenir le joueur : « ce niveau est blindé, prends de la magie ».
 */
export type StageProfile = 'armor' | 'res' | 'mixed';

export const stageProfile = (stage: StageDef): StageProfile => {
  let a = 0, r = 0;
  for (const e of stage.enemies) {
    const w = e.def.stats.hp * (e.boss ? 1.4 : 1);
    a += e.def.stats.armor * w;
    r += e.def.stats.res * w;
  }
  if (a > r * 1.35) return 'armor';
  if (r > a * 1.35) return 'res';
  return 'mixed';
};

/** Résumé d'une défense dominante (affiché sur les cartes de niveau). */
export const STAGE_PROFILE_TEXT: Record<StageProfile, { tag: string; hint: string; css: string }> = {
  armor: { tag: 'Blindé', hint: 'Armure lourde — la magie le fond', css: 'armor' },
  res: { tag: 'Protégé', hint: 'Résistance haute — le fer le perce', css: 'res' },
  mixed: { tag: 'Mixte', hint: 'Défenses mêlées — équipe équilibrée', css: 'mixed' },
};

export interface ChapterDef {
  id: number;
  name: string;
  subtitle: string;
  scenes: readonly SceneId[];
  stages: readonly string[];
}

export const CHAPTERS: ChapterDef[] = [
  {
    id: 1, name: 'Les Faubourgs Maudits',
    subtitle: 'La route des pendus, les fossés, les premières goules.',
    scenes: ['gallows', 'swamp', 'gallows', 'swamp', 'gallows'],
    stages: ['La Route des Pendus', 'Le Marais des Noyés', 'Les Ossuaires', 'Le Chœur des Noyées', 'La Porte de Cendrebourg'],
  },
  {
    id: 2, name: 'Le Royaume de Cendre',
    subtitle: 'Une capitale calcinée où le trône attend encore son roi.',
    scenes: ['citadel', 'throne', 'citadel', 'throne', 'throne'],
    stages: ['Les Remparts Calcinés', 'La Cour des Bannières', 'La Salle du Trône', 'Le Puits aux Couronnes', 'Le Roi sans Visage'],
  },
  {
    id: 3, name: 'La Nécropole Engloutie',
    subtitle: 'Des cryptes sous les eaux, où les morts apprennent à nager.',
    scenes: ['swamp', 'swamp', 'swamp', 'swamp', 'swamp'],
    stages: ['La Crypte Basse', 'Le Puits des Noyés', 'Les Galeries Molles', 'Le Lagon Sourd', 'Le Ventre de la Nécropole'],
  },
  {
    id: 4, name: 'Les Aiguilles de Verre',
    subtitle: 'Une forêt de cristal qui coupe la lumière et les hommes.',
    scenes: ['citadel', 'citadel', 'citadel', 'citadel', 'citadel'],
    stages: ['Le Seuil de Verre', 'La Forêt Tranchante', 'Les Aiguilles', 'Le Prisme', 'Le Cœur de Verre'],
  },
  {
    id: 5, name: 'Le Chœur des Abysses',
    subtitle: 'Quelque chose chante sous la croûte du monde.',
    scenes: ['swamp', 'throne', 'swamp', 'throne', 'swamp'],
    stages: ['La Faille', 'La Voix Sous l’Eau', 'Le Chœur Muet', 'Les Cloches Noyées', 'L’Abîme Chantant'],
  },
  {
    id: 6, name: 'La Forge des Âmes',
    subtitle: 'Les enclumes tournent encore, sans forgeron.',
    scenes: ['citadel', 'citadel', 'throne', 'citadel', 'citadel'],
    stages: ['Les Enclumes', 'Le Couloir des Soufflets', 'La Fournaise', 'Les Âmes en Fleurs', 'Le Grand Marteau'],
  },
  {
    id: 7, name: 'Le Trône de Suie',
    subtitle: 'Le roi calciné tient sa cour. Elle est faite de cendres.',
    scenes: ['throne', 'throne', 'citadel', 'throne', 'throne'],
    stages: ['Le Parvis de Suie', 'La Cour Calcinée', 'Le Banquet de Cendres', 'Les Bannières Mortes', 'Le Trône de Suie'],
  },
  {
    id: 8, name: 'Les Jardins de Sel',
    subtitle: 'Des fleurs de sel poussent sur les noyés.',
    scenes: ['swamp', 'gallows', 'swamp', 'gallows', 'swamp'],
    stages: ['Le Jardin Blanc', 'La Roseraie de Sel', 'Les Statues de Sel', 'Le Labyrinthe Blanc', 'La Jardinière'],
  },
  {
    id: 9, name: 'La Cité Inversée',
    subtitle: 'Les tours pendent vers le ciel ; le sol est un plafond.',
    scenes: ['citadel', 'throne', 'citadel', 'throne', 'citadel'],
    stages: ['La Porte Renversée', 'Les Toits du Dessous', 'Le Ciel Creux', 'Les Clochers Bas', 'Le Miroir de la Cité'],
  },
  {
    id: 10, name: 'L’Œil de la Tour',
    subtitle: 'Le sommet n’existe pas. Il n’y a que l’œil.',
    scenes: ['throne', 'throne', 'throne', 'throne', 'throne'],
    stages: ['Le Seuil', 'L’Escalier Sans Fin', 'La Salle des Records', 'Le Dernier Palier', 'L’Œil'],
  },
  {
    id: 11, name: 'Les Marches de Cendre',
    subtitle: 'La cité est tombée ; la cendre, elle, continue de monter.',
    scenes: ['citadel', 'throne', 'citadel', 'throne', 'citadel'],
    stages: ['La Cendre Montante', 'Les Escaliers Fumants', 'Le Pont des Morts', 'Les Cloches Fêlées', 'La Marche Haute'],
  },
  {
    id: 12, name: 'Le Labyrinthe des Miroirs',
    subtitle: 'Chaque mur te renvoie quelqu’un que tu as perdu.',
    scenes: ['throne', 'throne', 'throne', 'throne', 'throne'],
    stages: ['Le Seuil Renversé', 'La Galerie des Reflets', 'Le Couloir qui Ment', 'La Salle des Doubles', 'Le Miroir Sans Fond'],
  },
  {
    id: 13, name: 'Les Champs d’Ossements',
    subtitle: 'On y sème des héros. La récolte est déjà là.',
    scenes: ['gallows', 'gallows', 'gallows', 'gallows', 'gallows'],
    stages: ['La Terre Grise', 'Les Silhouettes Couchées', 'Le Champ Haut', 'La Moisson', 'Le Semeur'],
  },
  {
    id: 14, name: 'La Mer de Fer',
    subtitle: 'Une flotte morte, rouillée, qui n’a jamais touché la rive.',
    scenes: ['swamp', 'throne', 'swamp', 'throne', 'swamp'],
    stages: ['Le Quai Rouillé', 'Les Coques Vides', 'La Houle de Fer', 'Le Pont des Ancres', 'Le Vaisseau Amiral'],
  },
  {
    id: 15, name: 'Le Jardin des Pendus',
    subtitle: 'Les arbres portent des fruits qui balancent.',
    scenes: ['gallows', 'gallows', 'gallows', 'gallows', 'gallows'],
    stages: ['L’Allée des Cordes', 'Le Verger Noir', 'La Clairière Sourde', 'Les Fruits Tardifs', 'Le Jardinier'],
  },
  {
    id: 16, name: 'La Bibliothèque Noire',
    subtitle: 'Des livres écrits avant le monde, reliés avec de la peau.',
    scenes: ['citadel', 'throne', 'citadel', 'throne', 'citadel'],
    stages: ['Le Vestibule', 'Les Rayons Infinis', 'La Salle de Lecture', 'L’Index', 'Le Bibliothécaire'],
  },
  {
    id: 17, name: 'Les Forges Célestes',
    subtitle: 'Les dieux forgeaient ici. Ils ont laissé le feu allumé.',
    scenes: ['citadel', 'throne', 'citadel', 'throne', 'citadel'],
    stages: ['Le Seuil de Bronze', 'Les Soufflets Célestes', 'L’Enclume Haute', 'La Coulée', 'Le Forgeron Céleste'],
  },
  {
    id: 18, name: 'Le Désert de Verre',
    subtitle: 'Le sable a fondu. Il marche sur des tessons.',
    scenes: ['throne', 'throne', 'throne', 'throne', 'throne'],
    stages: ['La Dune Fendue', 'Les Éclats', 'Le Grand Poli', 'La Tempête de Verre', 'La Reine de Verre'],
  },
  {
    id: 19, name: 'La Cité des Veuves',
    subtitle: 'Elles ont enterré tout le monde. Il ne reste qu’elles.',
    scenes: ['citadel', 'throne', 'citadel', 'throne', 'citadel'],
    stages: ['Le Portail Noir', 'Les Ruelles Veuves', 'Le Parvis', 'La Maison du Deuil', 'La Mère des Veuves'],
  },
  {
    id: 20, name: 'L’Aube Inverse',
    subtitle: 'Le soleil se lève à l’envers. C’est la fin, ou le début.',
    scenes: ['throne', 'throne', 'throne', 'throne', 'throne'],
    stages: ['Le Dernier Seuil', 'La Nuit Blanche', 'Le Soleil Renversé', 'La Cime', 'L’Aube Inverse'],
  },
];

/** Phrase d’ambiance du niveau (varie selon la position dans le chapitre). */
const STAGE_FLAVOUR = [
  'Les éclaireurs tombent un par un : la route s’ouvre.',
  'Un détour obligé, un pont qui grince, et l’odeur qui monte.',
  'Le passage se referme derrière toi. Pas de retour.',
  'Les murs suintent. Quelque chose compte tes pas.',
  'Dernier palier avant la salle suivante : tout ce qui vit ici t’attend.',
];

/**
 * Les 18 boss forgés pour les chapitres 3 à 10.
 * Chacun reprend le corps d’une créature connue, mais avec sa taille, sa teinte,
 * ses statistiques et surtout SON ultime, joué en combat avec une montée télégraphiée.
 */
const ult_texts: Record<BossUlt["kind"], string> = {
  nova: 'Le boss rassemble son pouvoir et le relâche autour de lui : recule ou encaisse.',
  line: 'Une ligne de destruction se dessine au sol : sors du couloir.',
  quake: 'Le sol tremble : l’impact étourdit tous ceux qui restent au contact.',
  hex: 'Une malédiction se referme : dégâts continus et défense entamée.',
  rain: 'Le ciel se charge : tout le terrain est frappé, il faut encaisser.',
  summon: 'Le boss appelle ses suivants : de nouvelles cibles entrent en scène.',
};


const mkBoss = (base: UnitDef, b: { id: string; name: string; color: number; hp: number; atk: number; armor: number; res: number; height: number; ult: { name: string; kind: BossUlt["kind"]; cd: number; first: number; mult: number } }): UnitDef => ({
  ...base,
  id: b.id,
  name: b.name,
  color: b.color,
  height: Math.round(base.height * b.height),
  skillAs: base.id,
  stats: { ...base.stats, hp: Math.round(base.stats.hp * b.hp), atk: Math.round(base.stats.atk * b.atk), armor: Math.round(base.stats.armor * b.armor), res: Math.round(base.stats.res * b.res) },
  bossUlt: { ...b.ult, text: ult_texts[b.ult.kind] },
});

const BOSS_BASE: Record<string, UnitDef> = {
  warden: ENEMIES.warden, queen: ENEMIES.queen, boneknight: ENEMIES.warden, witch: ENEMIES.witch,
  drowned: ENEMIES.drowned, skeleton: ENEMIES.skeleton, spectral: ENEMIES.spectral, ghoul: ENEMIES.ghoul,
};

export const BOSSES: Record<string, UnitDef> = {
  warden: ENEMIES.warden, queen: ENEMIES.queen,
  boss_ashknight: mkBoss(BOSS_BASE.boneknight!, {
    id: 'boss_ashknight', name: 'Chevalier de Suie', color: 0xff6a3d, hp: 1.15, atk: 1.1, armor: 1.2, res: 0.8, height: 1.05,
    ult: { name: 'Charge de Suie', kind: 'line', cd: 20, first: 18, mult: 1.77 },
  }),
  boss_redwidow: mkBoss(BOSS_BASE.witch!, {
    id: 'boss_redwidow', name: 'La Veuve Écarlate', color: 0xff2f5e, hp: 1.1, atk: 1.25, armor: 0.8, res: 1.3, height: 1.05,
    ult: { name: 'Litanie de Sang', kind: 'hex', cd: 16, first: 14, mult: 1.8 },
  }),
  boss_drownmonk: mkBoss(BOSS_BASE.drowned!, {
    id: 'boss_drownmonk', name: 'Le Moine Noyé', color: 0x5fd8c0, hp: 1.2, atk: 1.05, armor: 1.1, res: 1.2, height: 1.1,
    ult: { name: 'Étreinte des Profondeurs', kind: 'nova', cd: 18, first: 16, mult: 1.84 },
  }),
  boss_devourer: mkBoss(BOSS_BASE.queen!, {
    id: 'boss_devourer', name: 'L’Engloutisseur', color: 0x2fbfae, hp: 1.25, atk: 1.15, armor: 1.0, res: 1.1, height: 1.25,
    ult: { name: 'Gouffre', kind: 'summon', cd: 20, first: 18, mult: 1.88 },
  }),
  boss_glassarcher: mkBoss(BOSS_BASE.skeleton!, {
    id: 'boss_glassarcher', name: 'L’Archer de Verre', color: 0xaef0ff, hp: 1.05, atk: 1.3, armor: 1.0, res: 1.1, height: 1.1,
    ult: { name: 'Pluie de Verre', kind: 'rain', cd: 16, first: 14, mult: 1.91 },
  }),
  boss_prism: mkBoss(BOSS_BASE.witch!, {
    id: 'boss_prism', name: 'Le Polymathe', color: 0xd6b3ff, hp: 1.15, atk: 1.3, armor: 0.9, res: 1.4, height: 1.1,
    ult: { name: 'Éclat Prismatique', kind: 'line', cd: 18, first: 16, mult: 1.95 },
  }),
  boss_mutechoir: mkBoss(BOSS_BASE.spectral!, {
    id: 'boss_mutechoir', name: 'Le Chœur Muet', color: 0x9dffe8, hp: 1.35, atk: 1.1, armor: 0.9, res: 1.3, height: 1.2,
    ult: { name: 'Chant du Silence', kind: 'hex', cd: 20, first: 18, mult: 1.98 },
  }),
  boss_marshmother: mkBoss(BOSS_BASE.queen!, {
    id: 'boss_marshmother', name: 'La Mère des Marais', color: 0x7fe06a, hp: 1.3, atk: 1.1, armor: 1.05, res: 1.15, height: 1.3,
    ult: { name: 'Marée Noire', kind: 'nova', cd: 16, first: 14, mult: 2.02 },
  }),
  boss_soulsmith: mkBoss(BOSS_BASE.warden!, {
    id: 'boss_soulsmith', name: 'Le Forgeron d’Âmes', color: 0xffb02a, hp: 1.3, atk: 1.15, armor: 1.25, res: 0.9, height: 1.15,
    ult: { name: 'Enclume des Âmes', kind: 'quake', cd: 18, first: 16, mult: 2.05 },
  }),
  boss_ember: mkBoss(BOSS_BASE.witch!, {
    id: 'boss_ember', name: 'La Braise', color: 0xff7a2a, hp: 1.15, atk: 1.35, armor: 0.85, res: 1.35, height: 1.05,
    ult: { name: 'Fournaise', kind: 'rain', cd: 20, first: 18, mult: 2.08 },
  }),
  boss_cinderking: mkBoss(BOSS_BASE.boneknight!, {
    id: 'boss_cinderking', name: 'Le Roi Calciné', color: 0xff4a4a, hp: 1.35, atk: 1.2, armor: 1.25, res: 1.0, height: 1.25,
    ult: { name: 'Couronne de Flammes', kind: 'nova', cd: 16, first: 14, mult: 2.12 },
  }),
  boss_royalhand: mkBoss(BOSS_BASE.warden!, {
    id: 'boss_royalhand', name: 'La Main du Roi', color: 0xc2183c, hp: 1.4, atk: 1.2, armor: 1.3, res: 0.9, height: 1.2,
    ult: { name: 'Écrasement Royal', kind: 'quake', cd: 18, first: 16, mult: 2.16 },
  }),
  boss_saltgardener: mkBoss(BOSS_BASE.witch!, {
    id: 'boss_saltgardener', name: 'La Jardinière de Sel', color: 0xf0f0ff, hp: 1.2, atk: 1.4, armor: 0.9, res: 1.4, height: 1.1,
    ult: { name: 'Cristallisation', kind: 'hex', cd: 20, first: 18, mult: 2.19 },
  }),
  boss_saltcolossus: mkBoss(BOSS_BASE.boneknight!, {
    id: 'boss_saltcolossus', name: 'Le Colosse de Sel', color: 0xe8f4ff, hp: 1.5, atk: 1.1, armor: 1.45, res: 0.8, height: 1.4,
    ult: { name: 'Effondrement', kind: 'quake', cd: 16, first: 14, mult: 2.23 },
  }),
  boss_reflection: mkBoss(BOSS_BASE.spectral!, {
    id: 'boss_reflection', name: 'Le Reflet', color: 0xbfa6ff, hp: 1.4, atk: 1.25, armor: 1.0, res: 1.35, height: 1.25,
    ult: { name: 'Miroir Brisé', kind: 'line', cd: 18, first: 16, mult: 2.26 },
  }),
  boss_antithesis: mkBoss(BOSS_BASE.queen!, {
    id: 'boss_antithesis', name: 'L’Antithèse', color: 0x8a4dff, hp: 1.45, atk: 1.25, armor: 1.1, res: 1.25, height: 1.3,
    ult: { name: 'Inversion', kind: 'summon', cd: 20, first: 18, mult: 2.29 },
  }),
  boss_summit: mkBoss(BOSS_BASE.warden!, {
    id: 'boss_summit', name: 'Le Gardien du Sommet', color: 0xffd36a, hp: 1.5, atk: 1.3, armor: 1.35, res: 1.1, height: 1.3,
    ult: { name: 'Jugement du Sommet', kind: 'nova', cd: 16, first: 14, mult: 2.33 },
  }),
  boss_eye: mkBoss(BOSS_BASE.spectral!, {
    id: 'boss_eye', name: 'L’Œil de la Tour', color: 0xff3bd0, hp: 1.6, atk: 1.35, armor: 1.1, res: 1.5, height: 1.5,
    ult: { name: 'Regard de l’Infini', kind: 'rain', cd: 18, first: 16, mult: 2.37 },
  }),
  boss_cinderwake: mkBoss(ENEMIES.warden, {
    id: 'boss_cinderwake', name: 'L’Éveil de Cendre', color: 0xe86a3c, hp: 1.55, atk: 1.28, armor: 1.3, res: 1.1, height: 1.3,
    ult: { name: 'Brasier Montant', kind: 'quake', cd: 18, first: 16, mult: 2.41 },
  }),
  boss_ashherald: mkBoss(BOSS_BASE.spectral!, {
    id: 'boss_ashherald', name: 'Le Héraut de Cendre', color: 0xff8a5c, hp: 1.5, atk: 1.32, armor: 1.1, res: 1.3, height: 1.25,
    ult: { name: 'Proclamation', kind: 'nova', cd: 18, first: 16, mult: 2.45 },
  }),
  boss_mirrorknight: mkBoss(BOSS_BASE.boneknight!, {
    id: 'boss_mirrorknight', name: 'Le Chevalier de Miroir', color: 0xbfd8ff, hp: 1.6, atk: 1.35, armor: 1.45, res: 1.0, height: 1.3,
    ult: { name: 'Lame Réfléchie', kind: 'line', cd: 18, first: 16, mult: 2.48 },
  }),
  boss_double: mkBoss(BOSS_BASE.ghoul!, {
    id: 'boss_double', name: 'Le Double', color: 0xd6b3ff, hp: 1.55, atk: 1.3, armor: 1.0, res: 1.2, height: 1.2,
    ult: { name: 'Duplication', kind: 'summon', cd: 18, first: 16, mult: 2.52 },
  }),
  boss_bonelord: mkBoss(BOSS_BASE.skeleton!, {
    id: 'boss_bonelord', name: 'Le Seigneur des Ossements', color: 0xe8e0c8, hp: 1.7, atk: 1.35, armor: 1.3, res: 1.1, height: 1.35,
    ult: { name: 'Pluie d’Os', kind: 'rain', cd: 18, first: 16, mult: 2.55 },
  }),
  boss_seeder: mkBoss(BOSS_BASE.witch!, {
    id: 'boss_seeder', name: 'Le Semeur', color: 0x9bc46a, hp: 1.6, atk: 1.4, armor: 1.0, res: 1.45, height: 1.25,
    ult: { name: 'Semence Noire', kind: 'hex', cd: 18, first: 16, mult: 2.58 },
  }),
  boss_ironadmiral: mkBoss(ENEMIES.warden, {
    id: 'boss_ironadmiral', name: 'L’Amiral de Fer', color: 0x8fa6b8, hp: 1.75, atk: 1.38, armor: 1.5, res: 1.0, height: 1.35,
    ult: { name: 'Bordée', kind: 'line', cd: 18, first: 16, mult: 2.61 },
  }),
  boss_hull: mkBoss(ENEMIES.queen, {
    id: 'boss_hull', name: 'La Coque Vide', color: 0x6e8ca0, hp: 1.7, atk: 1.35, armor: 1.2, res: 1.3, height: 1.4,
    ult: { name: 'Voie d’Eau', kind: 'nova', cd: 18, first: 16, mult: 2.64 },
  }),
  boss_hangman: mkBoss(BOSS_BASE.ghoul!, {
    id: 'boss_hangman', name: 'Le Pendu', color: 0xc8b48a, hp: 1.65, atk: 1.45, armor: 1.2, res: 1.2, height: 1.3,
    ult: { name: 'Balancier', kind: 'quake', cd: 18, first: 16, mult: 2.67 },
  }),
  boss_orchard: mkBoss(BOSS_BASE.witch!, {
    id: 'boss_orchard', name: 'Le Verger', color: 0x7fa85c, hp: 1.8, atk: 1.38, armor: 1.15, res: 1.4, height: 1.35,
    ult: { name: 'Récolte', kind: 'summon', cd: 18, first: 16, mult: 2.7 },
  }),
  boss_archivist: mkBoss(BOSS_BASE.spectral!, {
    id: 'boss_archivist', name: 'L’Archiviste', color: 0xd9c8a0, hp: 1.7, atk: 1.45, armor: 1.1, res: 1.6, height: 1.3,
    ult: { name: 'Décret', kind: 'hex', cd: 18, first: 16, mult: 2.73 },
  }),
  boss_ink: mkBoss(BOSS_BASE.witch!, {
    id: 'boss_ink', name: 'L’Encre', color: 0x5b4a8a, hp: 1.75, atk: 1.42, armor: 1.1, res: 1.55, height: 1.35,
    ult: { name: 'Page Blanche', kind: 'nova', cd: 18, first: 16, mult: 2.76 },
  }),
  boss_celforge: mkBoss(ENEMIES.warden, {
    id: 'boss_celforge', name: 'Le Forgeron Céleste', color: 0xffc24a, hp: 1.55, atk: 1.40, armor: 1.35, res: 1.1, height: 1.35,
    ult: { name: 'Marteau Divin', kind: 'quake', cd: 18, first: 16, mult: 2.79 },
  }),
  boss_anvil: mkBoss(BOSS_BASE.boneknight!, {
    id: 'boss_anvil', name: 'L’Enclume', color: 0xffa02a, hp: 1.6, atk: 1.42, armor: 1.3, res: 1.2, height: 1.32,
    ult: { name: 'Coulée', kind: 'line', cd: 18, first: 16, mult: 2.82 },
  }),
  boss_glassqueen: mkBoss(ENEMIES.queen, {
    id: 'boss_glassqueen', name: 'La Reine de Verre', color: 0x9fe8ff, hp: 1.8, atk: 1.48, armor: 1.15, res: 1.6, height: 1.4,
    ult: { name: 'Éclat Absolu', kind: 'rain', cd: 18, first: 16, mult: 2.85 },
  }),
  boss_shard: mkBoss(BOSS_BASE.ghoul!, {
    id: 'boss_shard', name: 'L’Éclat', color: 0x7fd8ff, hp: 1.75, atk: 1.5, armor: 1.2, res: 1.4, height: 1.3,
    ult: { name: 'Tranchant', kind: 'line', cd: 18, first: 16, mult: 2.88 },
  }),
  boss_widowmother: mkBoss(BOSS_BASE.witch!, {
    id: 'boss_widowmother', name: 'La Mère des Veuves', color: 0xb83a5a, hp: 1.9, atk: 1.45, armor: 1.2, res: 1.6, height: 1.4,
    ult: { name: 'Deuil Éternel', kind: 'hex', cd: 18, first: 16, mult: 2.91 },
  }),
  boss_mourner: mkBoss(BOSS_BASE.spectral!, {
    id: 'boss_mourner', name: 'La Pleureuse', color: 0xd86a8a, hp: 1.85, atk: 1.48, armor: 1.1, res: 1.7, height: 1.35,
    ult: { name: 'Chant Funèbre', kind: 'nova', cd: 18, first: 16, mult: 2.94 },
  }),
  boss_invertsun: mkBoss(ENEMIES.queen, {
    id: 'boss_invertsun', name: 'Le Soleil Renversé', color: 0xffd36a, hp: 1.85, atk: 1.5, armor: 1.35, res: 1.55, height: 1.45,
    ult: { name: 'Zénith Noir', kind: 'rain', cd: 18, first: 16, mult: 2.97 },
  }),
  boss_aurora: mkBoss(ENEMIES.warden, {
    id: 'boss_aurora', name: 'L’Aube Inverse', color: 0xffe9b0, hp: 1.95, atk: 1.55, armor: 1.45, res: 1.45, height: 1.55,
    ult: { name: 'Nouveau Monde', kind: 'summon', cd: 18, first: 16, mult: 3.05 },
  }),
};

const chapter_bosses: string[][] = [
  ['warden', 'queen'],
  ['boss_ashknight', 'boss_redwidow'],
  ['boss_drownmonk', 'boss_devourer'],
  ['boss_glassarcher', 'boss_prism'],
  ['boss_mutechoir', 'boss_marshmother'],
  ['boss_soulsmith', 'boss_ember'],
  ['boss_cinderking', 'boss_royalhand'],
  ['boss_saltgardener', 'boss_saltcolossus'],
  ['boss_reflection', 'boss_antithesis'],
  ['boss_summit', 'boss_eye'],
  ['boss_cinderwake', 'boss_ashherald'],
  ['boss_mirrorknight', 'boss_double'],
  ['boss_bonelord', 'boss_seeder'],
  ['boss_ironadmiral', 'boss_hull'],
  ['boss_hangman', 'boss_orchard'],
  ['boss_archivist', 'boss_ink'],
  ['boss_celforge', 'boss_anvil'],
  ['boss_glassqueen', 'boss_shard'],
  ['boss_widowmother', 'boss_mourner'],
  ['boss_invertsun', 'boss_aurora'],
];

/** Viviers d’ennemis ordinaires, un par chapitre : le bestiaire s’ouvre avec la profondeur. */
const ENEMY_POOL: UnitDef[][] = [
  [ENEMIES.ghoul, ENEMIES.skeleton],
  [ENEMIES.skeleton, ENEMIES.ghoul, ENEMIES.warden],
  [ENEMIES.drowned, ENEMIES.ghoul, ENEMIES.witch],
  [ENEMIES.skeleton, ENEMIES.witch, ENEMIES.spectral],
  [ENEMIES.drowned, ENEMIES.witch, ENEMIES.spectral],
  [ENEMIES.warden, ENEMIES.skeleton, ENEMIES.witch],
  [ENEMIES.spectral, ENEMIES.drowned, ENEMIES.warden],
  [ENEMIES.witch, ENEMIES.spectral, ENEMIES.ghoul],
  [ENEMIES.skeleton, ENEMIES.spectral, ENEMIES.drowned, ENEMIES.witch],
  [ENEMIES.warden, ENEMIES.witch, ENEMIES.spectral, ENEMIES.drowned],
  [ENEMIES.spectral, ENEMIES.warden, ENEMIES.witch, ENEMIES.drowned],
  [ENEMIES.skeleton, ENEMIES.witch, ENEMIES.spectral, ENEMIES.warden],
  [ENEMIES.ghoul, ENEMIES.skeleton, ENEMIES.warden, ENEMIES.spectral],
  [ENEMIES.drowned, ENEMIES.queen, ENEMIES.witch, ENEMIES.spectral],
  [ENEMIES.ghoul, ENEMIES.spectral, ENEMIES.witch, ENEMIES.warden],
  [ENEMIES.skeleton, ENEMIES.witch, ENEMIES.spectral, ENEMIES.drowned],
  [ENEMIES.warden, ENEMIES.skeleton, ENEMIES.witch, ENEMIES.spectral],
  [ENEMIES.skeleton, ENEMIES.spectral, ENEMIES.witch, ENEMIES.warden],
  [ENEMIES.ghoul, ENEMIES.drowned, ENEMIES.spectral, ENEMIES.witch],
  [ENEMIES.warden, ENEMIES.queen, ENEMIES.spectral, ENEMIES.witch],
];


/** Chapitre d’un niveau (1-3 → 1). */
export const chapterOf = (id: string): number => Number(id.split('-')[0]) || 1;

/** Nombre total de niveaux de campagne. */
export const CAMPAIGN_LENGTH = CHAPTERS.length * 5;

export const STAGES: StageDef[] = [
  ...((): StageDef[] => {
    const out: StageDef[] = [];
    let prev: string | undefined;
    CHAPTERS.forEach((ch, ci) => {
      for (let k = 0; k < ch.stages.length; k++) {
        const id = `${ch.id}-${k + 1}`;
        const isBoss = k === 2 || k === 4;
        const bossId = chapter_bosses[ci][k === 2 ? 0 : 1]!;
        const boss = BOSSES[bossId]!;
        const pool = ENEMY_POOL[Math.min(ENEMY_POOL.length - 1, ci)];
        const enemies: StageDef["enemies"] = [];
        const count = Math.min(5, 3 + (k === 4 ? 1 : 0));
        const slots = [[1255,725],[1285,875],[1555,715],[1585,885],[1725,800]] as const;
        for (let i = 0; i < count; i++) {
          const [x, y] = slots[i]!;
          const def = pool[(ci + k * 2 + i) % pool.length]!;
          enemies.push({ def, x, y });
        }
        // Deux boss par chapitre : l'un à l'étage 3, l'autre à l'étage 5.
        if (isBoss) enemies.push({ def: boss, x: 1420, y: 800, boss: true });
        else if (boss) { /* pas de boss sur les autres étages */ }
        // Niveau conseillé : le contrat du chapitre ({@link CHAPTER_TARGET_LEVEL}),
        // légèrement relevé sur les étages de boss. La puissance conseillée, elle,
        // n'est plus une table écrite à la main : elle est CALCULÉE en fin de module
        // (voir `referencePower`) à partir de ce niveau, donc toujours cohérente.
        const level = Math.max(1, (CHAPTER_TARGET_LEVEL[ci] ?? 1) + (STAGE_LEVEL_BUMP[k] ?? 0));
        out.push({
          id,
          tier: ci * 5 + [0, 0.6, 1.4, 2.2, 3.2][k]!,
          level,
          name: ch.stages[k]!,
          scene: ch.scenes[k]!,
          requires: prev,
          tip: isBoss
            ? `Son ultime, <b>${boss.bossUlt!.name}</b>, est télégraphié : lis le texte et bouge, ou étourdis-le pour l’annuler.`
            : `Regarde les classes ennemies : la Lumière bat l’Obscur, l’Obscur bat la Nature, la Nature bat la Technique, la Technique bat le Combat, le Combat bat la Lumière.`,
          description: `${ch.subtitle} ${STAGE_FLAVOUR[k]}${isBoss ? ` ${boss.name} barre la route.` : ''}`,
          power: 0, // rempli en fin de module par referencePower() : le calcul dépend de teamPower
          energy: 6 + Math.min(6, ci),
          rewards: {
            gold: Math.round((2400 + ci * 2600) * (1 + k * 0.22)),
            gems: Math.round((90 + ci * 60) * (1 + k * 0.3)),
            xp: Math.round((180 + ci * 120) * (1 + k * 0.25)),
          },
          enemies,
        });
        prev = id;
      }
    });
    return out;
  })(),
];

/* ===================================================================== */
/*  Amélioration des compétences : tous les 10 niveaux, sans plafond      */
/* ===================================================================== */

/**
 * Paliers d'amélioration. Chaque palier renforce TOUTES les compétences du héros
 * (dégâts, soins, boucliers, durées). Il n'y a pas de niveau maximum :
 * `skillTier` continue de croître indéfiniment.
 */
export const SKILL_TIER_LEVELS = 10;

/** Nombre de paliers atteints pour un niveau donné (niv. 1-9 → 0, 10 → 1, 20 → 2…). */
export const skillTiers = (level: number): number => Math.max(0, Math.floor(level / SKILL_TIER_LEVELS));

/** Multiplicateur appliqué aux valeurs de compétence. Un palier = +25 %. */
export const skillMult = (tier: number): number => 1 + 0.25 * tier;

/** Niveau auquel tombe le prochain palier. */
/** Progression (0…1) vers le prochain palier. */
export function tierProgress(level: number): number {
  const tier = skillTiers(level);
  const start = tier * SKILL_TIER_LEVELS;
  const end = (tier + 1) * SKILL_TIER_LEVELS;
  return Math.max(0, Math.min(1, (level - start) / (end - start)));
}

/**
 * Coût en or pour passer un héros au niveau suivant.
 *
 * Deux pentes, pas une :
 *  - jusqu'au niveau {@link LEVEL_COST_PIVOT}, +10 % par niveau (le début reste
 *    exactement aussi rapide qu'avant : on monte vite, ça se sent) ;
 *  - au-delà, +3,5 % seulement.
 *
 * Pourquoi : avec +10 % composés jusqu'au bout, le niveau 120 coûtait 758 MILLIONS
 * d'or pour une équipe de 5, soit 65 jours de farm non-stop, et le niveau 160
 * près de 8 ans. Les chapitres 17 à 20 étaient donc mathématiquement infranchissables.
 * La pente douce garde les mêmes sensations au début et rend la fin de campagne
 * atteignable en quelques jours de jeu (voir tests/test-economie.ts).
 */
export const LEVEL_COST_PIVOT = 60;
export const LEVEL_COST_EARLY = 1.10;
export const LEVEL_COST_LATE = 1.035;

export function levelUpCost(level: number, rarity: Rarity): number {
  const base = rarity === 'SSR' ? 180 : rarity === 'SR' ? 130 : 85;
  const early = Math.pow(LEVEL_COST_EARLY, Math.min(level, LEVEL_COST_PIVOT) - 1);
  const late = Math.pow(LEVEL_COST_LATE, Math.max(0, level - LEVEL_COST_PIVOT));
  return Math.round(base * early * late);
}

/**
 * Chaque niveau donne +7 % de PV et d'ATQ : une courbe franche, pour que « monter de niveau »
 * se sente tout de suite, et que les niveaux 20-30 restent atteignables sans farm infini.
 * Le reste vient des paliers de compétence (+25 % tous les 10 niveaux).
 */
export const levelStatMult = (level: number): number => 1 + 0.07 * (level - 1);

/** Niveau maximum d'un héros : aucun. */

/** Bonus de dégâts de compétence affiché en pourcentage. */
export const tierBonusPct = (tier: number): number => Math.round((skillMult(tier) - 1) * 100);

export const heroById = (id: string): HeroDef | undefined => HEROES.find((h) => h.id === id);

/**
 * Étoiles JAUNES maximales (3★ pour un R, 4★ pour un SR, 5★ pour un SSR).
 * Au-delà commencent les étoiles ROUGES, forgées au Sanctuaire.
 */
export const MAX_STARS = 5;

/** Étoiles rouges maximales selon la rareté d'origine. */
export const MAX_RED: Record<Rarity, number> = { R: 3, SR: 4, SSR: 5 };

/**
 * Qualité native d'une rareté. Un R, même monté à 5★ + 3✦, vaut 62 % de ses
 * statistiques de fiche : il reste donc TOUJOURS moins fort qu'un SSR natif
 * (facteur 1,00). C'est la règle demandée : « sinon ça n'a aucun intérêt ».
 */
export const QUALITY: Record<Rarity, number> = { R: 0.62, SR: 1, SSR: 1 };

/** Coût en or d'une étoile jaune (index = étoile visée − 3). */
export const YELLOW_GOLD = [0, 900, 1800];
/** Coût en or d'une étoile rouge (index = nombre d'étoiles rouges visé − 1). */
export const RED_GOLD = [4000, 7000, 11000, 16000, 22000];

/** Un héros de l'équipe et son nombre d'étoiles. */
export interface TeamMember {
  def: HeroDef;
  stars: number;
  /** Niveau du héros (1…∞). Améliore ses PV/ATQ et ses compétences tous les 10 niveaux. */
  level: number;
  /** Bonus cumulés de l'équipement (facultatif : 1 partout = aucun objet). */
  gear?: GearBonus;
  /** Étoiles rouges forgées au Sanctuaire (facultatif). */
  red?: number;
}

/**
 * Bonus de statistiques des étoiles : +8 % par étoile jaune au-delà de la base,
 * +10 % par étoile rouge, le tout multiplié par la qualité native de la rareté.
 * Un R plafonne donc à 0,62 × 1,46 ≈ 0,91 : sous un SSR natif (1,00), même à fond.
 */
export const starMult = (def: HeroDef, stars: number, red = 0): number =>
  QUALITY[def.rarity] * (1 + 0.08 * Math.max(0, stars - def.stars) + 0.1 * Math.max(0, red));

/**
 * Multicateur global des statistiques d'un héros :
 * étoiles (invocation) × niveau (amélioration) — les deux se cumulent.
 */
export const heroStatMult = (def: HeroDef, stars: number, level: number, red = 0): number =>
  starMult(def, stars, red) * levelStatMult(level);

/** Le héros combat-il au corps à corps ? */
export const isMelee = (def: UnitDef): boolean => !def.projectile;

/**
 * Position de départ des héros selon leur rôle : les combattants au corps à corps en première
 * ligne (les plus résistants devant), les tireurs et mages derrière, dans l'ordre de l'équipe.
 */
const FRONT_SLOTS: ReadonlyArray<readonly [number, number]> = [[660, 760], [625, 870], [600, 700], [570, 820]];
const BACK_SLOTS: ReadonlyArray<readonly [number, number]> = [[440, 705], [400, 800], [350, 890], [470, 880], [320, 740]];

export function formationSlots(defs: readonly HeroDef[]): Array<readonly [number, number]> {
  const out: Array<readonly [number, number]> = new Array(defs.length);
  const melee = defs.map((d, i) => ({ d, i })).filter((x) => isMelee(x.d)).sort((a, b) => b.d.stats.armor - a.d.stats.armor);
  const ranged = defs.map((d, i) => ({ d, i })).filter((x) => !isMelee(x.d));
  melee.forEach((m, k) => (out[m.i] = FRONT_SLOTS[k] ?? [560 - k * 20, 760]));
  ranged.forEach((r, k) => (out[r.i] = BACK_SLOTS[k] ?? [380, 760]));
  return out;
}

/** Puissance d'un héros (affichage façon gacha). */
export const heroPower = (h: HeroDef, stars = h.stars, level = 1, gear?: GearBonus, red = 0): number => {
  const m = heroStatMult(h, stars, level, red);
  const skill = skillMult(skillTiers(level));
  const g = gear ?? { hp: 1, atk: 1, armor: 1, res: 1, interval: 1, crit: 0 };
  return Math.round(
    h.stats.hp * m * g.hp * 0.6 +
    h.stats.atk * m * g.atk * 12 * skill +
    h.stats.armor * g.armor * 8 +
    h.stats.res * g.res * 8 +
    (Math.min(0.75, h.stats.crit + g.crit) * 100) * 10,
  );
};

export const teamPower = (team: readonly TeamMember[]): number =>
  team.reduce((s, m) => s + heroPower(m.def, m.stars, m.level, m.gear, m.red), 0);

/* ===================================================================== */
/*  Puissance conseillée : calculée, pas devinée                          */
/* ===================================================================== */

/**
 * Équipe de référence pour tous les conseils affichés en jeu : les 5 héros de départ,
 * avec leurs étoiles d'origine (ni gemmes, ni équipement, ni étoiles rouges).
 * C'est le pire cas réaliste : un joueur qui n'a rien invoqué doit quand même voir
 * un objectif atteignable.
 */
export const REFERENCE_TEAM: readonly HeroDef[] = HEROES.filter((h) => h.starter);

/**
 * Puissance de l'équipe de référence à un niveau donné.
 * Sert de « puissance conseillée » pour un niveau de campagne.
 */
export const referencePower = (level: number): number =>
  teamPower(REFERENCE_TEAM.map((def) => ({ def, stars: def.stars, level })));

/**
 * Remplissage de `power` pour chaque niveau. Fait ici (et pas dans le générateur de
 * STAGES) parce que `teamPower` n'existe pas encore au moment où STAGES est construit.
 * Les deux chiffres affichés avant un combat — puissance conseillée et niveau
 * conseillé — viennent donc de la même source et ne peuvent plus se contredire.
 */
for (const st of STAGES) st.power = referencePower(st.level);

/**
 * Niveau conseillé pour un palier de difficulté quelconque.
 *
 * Sert aux modes qui ne suivent pas les chapitres de la campagne (la Tour de l'Infini) :
 * on interpole la courbe {@link CHAPTER_TARGET_LEVEL}, et au-delà du chapitre 20 on la
 * prolonge avec la même pente. Ainsi, un conseil de niveau veut partout dire la même chose.
 */
export const suggestedLevelForTier = (tier: number): number => {
  const t = CHAPTER_TARGET_LEVEL;
  const last = t.length - 1;
  const c = Math.max(0, tier / 5);
  if (c <= last) {
    const i = Math.min(last, Math.floor(c));
    const j = Math.min(last, i + 1);
    const a = t[i]!;
    const b = t[j]!;
    return Math.max(1, Math.round(a + (b - a) * (c - i)));
  }
  const slope = t[last]! - t[last - 1]! || 7;
  return Math.max(1, Math.round(t[last]! + slope * (c - last)));
};
