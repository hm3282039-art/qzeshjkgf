import type { IconName } from '../ui/icons';

export type Role = 'Tank' | 'Guerrier' | 'Assassin' | 'Mage' | 'Tireur' | 'Soutien';
export type Rarity = 'SSR' | 'SR' | 'R';
export type ProjectileKind = 'arrow' | 'orb' | 'light' | 'bone' | 'void' | 'spark' | 'hex';
export type TextureKey =
  | 'hero_kael' | 'hero_lyra' | 'hero_morwen' | 'hero_seren' | 'hero_aldric'
  | 'hero_thorne' | 'hero_nyx' | 'hero_ashka'
  | 'hero_vaelen' | 'hero_sylvaine' | 'hero_pyrrha'
  | 'enemy_ghoul' | 'enemy_skeleton' | 'enemy_boneknight'
  | 'enemy_drowned' | 'enemy_witch' | 'enemy_queen';

export interface Stats {
  hp: number;
  atk: number;
  /** Armure : réduit les dégâts reçus de armor / (armor + 100). */
  armor: number;
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

export interface UnitDef {
  id: string;
  name: string;
  texture: TextureKey;
  /** Hauteur affichée au combat (px du terrain 1920×1080). */
  height: number;
  /** Le dessin regarde-t-il vers la droite ? */
  facesRight: boolean;
  stats: Stats;
  projectile?: ProjectileKind;
  /** Point de départ des projectiles : [px vers l'avant, px au-dessus des pieds]. */
  muzzle?: readonly [number, number];
  /** Recharge de la compétence (s) et premier lancement. */
  skillCd?: number;
  skillFirst?: number;
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
    texture: 'hero_kael', height: 250, facesRight: true, color: 0xff7a2a, css: '#ff7a2a',
    quote: '« Mon serment a brûlé. Ma lame, elle, est restée. »',
    lore: 'Ancien champion de l’Ordre de l’Aube, Kael a survécu au bûcher qui devait le purifier. Les braises vivent désormais sous son armure.',
    stats: { hp: 3100, atk: 72, armor: 70, interval: 1.3, range: 140, speed: 170, crit: 0.08 },
    skillCd: 9, skillFirst: 2.5,
    abilities: {
      attack: { name: 'Lame de Braise', icon: 'swords', text: 'Frappe l’ennemi le plus proche avec son épée ardente.' },
      skill: { name: 'Bouclier de Cendres', icon: 'shield', text: 'Gagne un bouclier égal à 30 % de ses PV max pendant 6 s et provoque les ennemis : ils l’attaquent en priorité.' },
      ultimate: { name: 'Jugement Ardent', icon: 'flame', text: 'Bondit au cœur des ennemis et frappe le sol : 240 % d’ATQ en zone et étourdit 1,5 s.' },
    },
  },
  {
    id: 'lyra', name: 'Lyra', title: 'La Lame Sanglante', role: 'Assassin', rarity: 'SSR', stars: 5, starter: true,
    texture: 'hero_lyra', height: 215, facesRight: true, color: 0xff2a4a, css: '#ff2a4a',
    quote: '« Tu ne m’as pas vue. Personne ne me voit. »',
    lore: 'Élevée par la guilde des Écorcheurs, Lyra a bu le sang d’un démon pour survivre. Il murmure encore dans ses dagues.',
    stats: { hp: 1550, atk: 98, armor: 25, interval: 0.75, range: 125, speed: 270, crit: 0.3 },
    skillCd: 7, skillFirst: 2,
    abilities: {
      attack: { name: 'Double Entaille', icon: 'swords', text: 'Attaques très rapides, avec 30 % de chances de coup critique.' },
      skill: { name: 'Pas de l’Ombre', icon: 'moon', text: 'Se téléporte derrière l’ennemi le plus affaibli et lui inflige 260 % d’ATQ.' },
      ultimate: { name: 'Danse Écarlate', icon: 'drop', text: 'Devient intouchable et frappe 7 fois des ennemis au hasard (120 % d’ATQ chacun) en volant 35 % des dégâts en PV.' },
    },
  },
  {
    id: 'morwen', name: 'Morwen', title: 'La Nécromancienne', role: 'Mage', rarity: 'SSR', stars: 5, starter: true,
    texture: 'hero_morwen', height: 240, facesRight: true, color: 0xb055ff, css: '#b055ff',
    quote: '« La mort n’est qu’une porte. J’en ai la clé. »',
    lore: 'Bannie de l’Académie pour avoir relevé son propre maître, Morwen parcourt les cimetières en quête du secret de la Tour.',
    stats: { hp: 1200, atk: 118, armor: 18, interval: 1.6, range: 900, speed: 150, crit: 0.1 },
    projectile: 'orb', muzzle: [80, 175], skillCd: 11, skillFirst: 3.5,
    abilities: {
      attack: { name: 'Orbe d’Âme', icon: 'skull', text: 'Lance une orbe d’ombre sur l’ennemi le plus proche.' },
      skill: { name: 'Éveil des Morts', icon: 'skull', text: 'Relève 2 goules spectrales qui combattent à ses côtés pendant 12 s.' },
      ultimate: { name: 'Fléau Noir', icon: 'flame', text: 'Un nuage maudit ronge tous les ennemis : 520 % d’ATQ sur 4 s et les ralentit.' },
    },
  },
  {
    id: 'seren', name: 'Seren', title: 'L’Archère Lunaire', role: 'Tireur', rarity: 'SR', stars: 4, starter: true,
    texture: 'hero_seren', height: 225, facesRight: true, color: 0x7ac8ff, css: '#7ac8ff',
    quote: '« La lune guide mes flèches. Elle ne rate jamais. »',
    lore: 'Dernière gardienne du Bois d’Argent, Seren chasse les créatures de la nuit avec l’arc sacré de son peuple.',
    stats: { hp: 1250, atk: 92, armor: 18, interval: 1.05, range: 900, speed: 160, crit: 0.18 },
    projectile: 'arrow', muzzle: [85, 180], skillCd: 8, skillFirst: 3,
    abilities: {
      attack: { name: 'Flèche d’Argent', icon: 'arrow', text: 'Tire une flèche sur l’ennemi le plus proche.' },
      skill: { name: 'Tir Perçant', icon: 'arrow', text: 'Une flèche géante traverse toute la ligne ennemie : 220 % d’ATQ à chaque ennemi touché.' },
      ultimate: { name: 'Pluie Lunaire', icon: 'moon', text: '5 volées de flèches tombent du ciel sur tous les ennemis : 5 × 80 % d’ATQ.' },
    },
  },
  {
    id: 'aldric', name: 'Frère Aldric', title: 'L’Inquisiteur', role: 'Soutien', rarity: 'SR', stars: 4, starter: true,
    texture: 'hero_aldric', height: 235, facesRight: true, color: 0xffd36a, css: '#ffd36a',
    quote: '« Que la lumière brûle ce que la nuit a corrompu. »',
    lore: 'Inquisiteur de l’Ordre, Aldric a vu tomber Cendrebourg. Il est resté, seul prêtre encore capable d’allumer une flamme sacrée.',
    stats: { hp: 1400, atk: 62, armor: 30, interval: 1.4, range: 900, speed: 150, crit: 0.05 },
    projectile: 'light', muzzle: [-50, 195], skillCd: 6, skillFirst: 3,
    abilities: {
      attack: { name: 'Rayon Sacré', icon: 'sun', text: 'Projette un éclat de lumière sur l’ennemi le plus proche.' },
      skill: { name: 'Prière', icon: 'heart', text: 'Soigne l’allié le plus blessé de 280 % d’ATQ.' },
      ultimate: { name: 'Sanctuaire Sacré', icon: 'sun', text: 'Soigne toute l’équipe de 25 % de ses PV max, retire les malus et réduit les dégâts subis de 35 % pendant 5 s.' },
    },
  },
  {
    id: 'thorne', name: 'Thorne', title: 'Le Jarl de Givre', role: 'Guerrier', rarity: 'SR', stars: 4,
    texture: 'hero_thorne', height: 255, facesRight: true, color: 0x8ae0ff, css: '#8ae0ff',
    quote: '« L’hiver ne pardonne pas. Moi non plus. »',
    lore: 'Dernier jarl des Crocs-Blancs, Thorne a scellé un esprit du blizzard dans sa hache pour venger son clan englouti par la nuit. Depuis, son souffle ne réchauffe plus rien.',
    stats: { hp: 2400, atk: 105, armor: 45, interval: 1.5, range: 150, speed: 190, crit: 0.12 },
    skillCd: 8, skillFirst: 3,
    abilities: {
      attack: { name: 'Hache du Nord', icon: 'swords', text: 'Abat sa hache de glace sur l’ennemi le plus proche.' },
      skill: { name: 'Tourbillon de Givre', icon: 'snow', text: 'Tournoie avec sa hache : 160 % d’ATQ aux ennemis proches et les ralentit 2 s.' },
      ultimate: { name: 'Hiver Éternel', icon: 'snow', text: 'Frappe le sol : un mur de pics de glace balaie tout le champ de bataille, inflige 260 % d’ATQ et gèle les ennemis 2,2 s.' },
    },
  },
  {
    id: 'nyx', name: 'Nyx', title: 'L’Impératrice du Néant', role: 'Mage', rarity: 'SSR', stars: 5,
    texture: 'hero_nyx', height: 235, facesRight: true, color: 0xa86bff, css: '#a86bff',
    quote: '« Les étoiles s’éteignent. Je suis ce qui reste. »',
    lore: 'Astronome du roi déchu, Nyx a regardé trop longtemps l’éclipse qui a précédé la chute de Cendrebourg. Le soleil noir s’est penché vers elle… et lui a répondu.',
    stats: { hp: 1150, atk: 128, armor: 16, interval: 1.7, range: 900, speed: 150, crit: 0.12 },
    projectile: 'void', muzzle: [78, 178], skillCd: 10, skillFirst: 4,
    abilities: {
      attack: { name: 'Éclat du Vide', icon: 'vortex', text: 'Projette un fragment de néant sur l’ennemi le plus proche.' },
      skill: { name: 'Singularité', icon: 'vortex', text: 'Ouvre un trou noir au cœur des ennemis : il les aspire pendant 2,2 s et inflige 6 × 35 % d’ATQ.' },
      ultimate: { name: 'Éclipse', icon: 'moon', text: 'Un soleil noir dévore la lumière : il attire et étourdit tous les ennemis, puis implose pour 380 % d’ATQ.' },
    },
  },
  {
    id: 'ashka', name: 'Ashka', title: 'La Chamane de l’Orage', role: 'Soutien', rarity: 'SR', stars: 4,
    texture: 'hero_ashka', height: 230, facesRight: true, color: 0x6ad8ff, css: '#6ad8ff',
    quote: '« Écoute le tonnerre. Il chante ton nom… et celui de tes ennemis. »',
    lore: 'Fille des Hautes-Plaines, Ashka porte le totem de l’Oiseau-Tonnerre. Quand elle danse, le ciel gronde et les morts se souviennent qu’ils devraient avoir peur.',
    stats: { hp: 1350, atk: 80, armor: 26, interval: 1.3, range: 900, speed: 160, crit: 0.1 },
    projectile: 'spark', muzzle: [50, 200], skillCd: 7, skillFirst: 3,
    abilities: {
      attack: { name: 'Étincelle', icon: 'bolt', text: 'Lance un trait de foudre très rapide sur l’ennemi le plus proche.' },
      skill: { name: 'Chaîne d’Éclairs', icon: 'bolt', text: 'Un éclair rebondit sur 4 ennemis : 150 % d’ATQ, puis 15 % de moins à chaque rebond.' },
      ultimate: { name: 'Rage du Tonnerre', icon: 'feather', text: 'L’Oiseau-Tonnerre s’éveille : toute l’équipe attaque 45 % plus vite pendant 6 s, et 6 éclairs frappent les ennemis (70 % d’ATQ).' },
    },
  },
  {
    id: 'vaelen', name: 'Vaelen', title: 'Le Rempart de Cendre', role: 'Tank', rarity: 'SSR', stars: 5,
    texture: 'hero_vaelen', height: 262, facesRight: true, color: 0xffb454, css: '#ffb454',
    quote: '« Je ne tomberai pas. Il n’y a personne derrière moi pour me remplacer. »',
    lore: 'Dernier serment de la garde de Cendrebourg, Vaelen a tenu la porte nord pendant sept nuits. Quand la ville est tombée, il était encore debout — et il l’est toujours.',
    stats: { hp: 3600, atk: 66, armor: 88, interval: 1.45, range: 145, speed: 155, crit: 0.06 },
    skillCd: 10, skillFirst: 3,
    abilities: {
      attack: { name: 'Marteau de Guerre', icon: 'swords', text: 'Écrase l’ennemi le plus proche de son marteau de siège.' },
      skill: { name: 'Serment de Fer', icon: 'shield', text: 'Plante son bouclier : il gagne un bouclier de 42 % de ses PV max, provoque les ennemis 5 s et réduit de 20 % les dégâts subis par l’équipe.' },
      ultimate: { name: 'Rempart Écarlate', icon: 'flame', text: 'Un mur de flammes s’élève : 300 % d’ATQ en zone, étourdit 1,8 s et rend tous les alliés intouchables pendant 1,2 s.' },
    },
  },
  {
    id: 'sylvaine', name: 'Sylvaine', title: 'L’Épine de la Nuit', role: 'Tireur', rarity: 'SSR', stars: 5,
    texture: 'hero_sylvaine', height: 232, facesRight: true, color: 0x7ae08a, css: '#7ae08a',
    quote: '« La forêt m’a appris une chose : on n’entend jamais la flèche qui vous tue. »',
    lore: 'Bannie du Bois d’Argent pour avoir chassé un seigneur de la cour, Sylvaine vit désormais dans les branches. Son arc de ronces boit la sève des morts.',
    stats: { hp: 1320, atk: 104, armor: 20, interval: 0.95, range: 900, speed: 175, crit: 0.24 },
    projectile: 'arrow', muzzle: [86, 182], skillCd: 7.5, skillFirst: 2.8,
    abilities: {
      attack: { name: 'Flèche de Ronce', icon: 'arrow', text: 'Décoche une flèche acérée sur l’ennemi le plus proche.' },
      skill: { name: 'Salve d’Épines', icon: 'arrow', text: 'Tire 5 flèches en éventail sur les ennemis les plus proches : 120 % d’ATQ chacune et applique un saignement.' },
      ultimate: { name: 'Bois des Suppliciés', icon: 'moon', text: 'Fait surgir une forêt de ronces : 8 traits frappent des ennemis au hasard (100 % d’ATQ) et les enracinent 1,5 s.' },
    },
  },
  {
    id: 'pyrrha', name: 'Pyrrha', title: 'Le Bûcher Éternel', role: 'Mage', rarity: 'SSR', stars: 5,
    texture: 'hero_pyrrha', height: 238, facesRight: true, color: 0xff6a2a, css: '#ff6a2a',
    quote: '« Tout brûle. Certains mettent juste plus longtemps que d’autres. »',
    lore: 'Née dans l’incendie qui a consumé son village, Pyrrha n’a jamais cessé de brûler. Ce qu’elle touche prend feu ; ce qu’elle regarde finit en cendres.',
    stats: { hp: 1180, atk: 132, armor: 17, interval: 1.65, range: 900, speed: 152, crit: 0.1 },
    projectile: 'orb', muzzle: [78, 172], skillCd: 9, skillFirst: 3.2,
    abilities: {
      attack: { name: 'Braise Vive', icon: 'flame', text: 'Lance une braise enflammée sur l’ennemi le plus proche.' },
      skill: { name: 'Météore', icon: 'flame', text: 'Appelle un météore sur le groupe ennemi le plus dense : 280 % d’ATQ et brûlure sur 4 s.' },
      ultimate: { name: 'Jugement de Flammes', icon: 'sun', text: 'Le ciel s’embrase : 3 vagues de feu balaient le champ, 180 % d’ATQ chacune, et les ennemis brûlent pour 6 s.' },
    },
  },
];

export const ENEMIES = {
  ghoul: {
    id: 'ghoul', name: 'Goule affamée', texture: 'enemy_ghoul', height: 165, facesRight: false, color: 0x9ac46a,
    stats: { hp: 2160, atk: 108, armor: 22, interval: 0.95, range: 130, speed: 230, crit: 0.08 },
  },
  skeleton: {
    id: 'skeleton', name: 'Archer squelette', texture: 'enemy_skeleton', height: 215, facesRight: false, color: 0x6ae0ff,
    stats: { hp: 1400, atk: 128, armor: 15, interval: 1.45, range: 900, speed: 140, crit: 0.1 },
    projectile: 'bone', muzzle: [70, 125],
  },
  warden: {
    id: 'warden', name: 'Gardien d’Os', texture: 'enemy_boneknight', height: 285, facesRight: false, color: 0xff3bd0,
    stats: { hp: 9440, atk: 180, armor: 55, interval: 1.8, range: 175, speed: 120, crit: 0.1 },
    skillCd: 7, skillFirst: 5,
  },
  spectral: {
    id: 'spectral', name: 'Goule spectrale', texture: 'enemy_ghoul', height: 130, facesRight: false, color: 0x7affd0,
    stats: { hp: 520, atk: 38, armor: 15, interval: 1, range: 120, speed: 260, crit: 0.05 },
  },
  drowned: {
    id: 'drowned', name: 'Noyé', texture: 'enemy_drowned', height: 205, facesRight: false, color: 0x6ac8d8,
    stats: { hp: 2560, atk: 96, armor: 30, interval: 1.2, range: 130, speed: 170, crit: 0.06 },
  },
  witch: {
    id: 'witch', name: 'Sorcière des marais', texture: 'enemy_witch', height: 210, facesRight: false, color: 0xffb02a,
    stats: { hp: 1520, atk: 120, armor: 14, interval: 1.6, range: 900, speed: 140, crit: 0.08 },
    projectile: 'hex', muzzle: [92, 158], skillCd: 9, skillFirst: 4,
  },
  queen: {
    id: 'queen', name: 'La Reine Noyée', texture: 'enemy_queen', height: 300, facesRight: false, color: 0x4ae0d0,
    stats: { hp: 12800, atk: 192, armor: 50, interval: 1.9, range: 190, speed: 110, crit: 0.1 },
    skillCd: 7.5, skillFirst: 5,
  },
} satisfies Record<string, UnitDef>;

/** Décor du combat. */
export type SceneId = 'gallows' | 'swamp';

export interface StageDef {
  id: string;
  name: string;
  scene: SceneId;
  /** Niveau à terminer avant de pouvoir jouer celui-ci. */
  requires?: string;
  /** Conseil affiché après une défaite. */
  tip: string;
  description: string;
  power: number;
  energy: number;
  rewards: { gold: number; gems: number; xp: number };
  /** Ennemis et position de départ (px du terrain). */
  enemies: Array<{ def: UnitDef; x: number; y: number; boss?: boolean }>;
}

export const STAGES: StageDef[] = [
  {
    id: '1-1',
    name: 'La Route des Pendus',
    scene: 'gallows',
    tip: 'L’étourdissement de Kael peut <b>interrompre</b> l’attaque tournoyante du Gardien d’Os !',
    description: 'À la sortie de Cendrebourg, les morts ne restent pas en terre. Un Gardien d’Os mène les goules vers la ville : arrête-le avant la nuit noire.',
    power: 9800,
    energy: 6,
    rewards: { gold: 800, gems: 60, xp: 90 },
    enemies: [
      { def: ENEMIES.ghoul, x: 1270, y: 715 },
      { def: ENEMIES.ghoul, x: 1290, y: 865 },
      { def: ENEMIES.warden, x: 1440, y: 790, boss: true },
      { def: ENEMIES.skeleton, x: 1630, y: 705 },
      { def: ENEMIES.skeleton, x: 1650, y: 885 },
    ],
  },
  {
    id: '1-2',
    name: 'Le Marais des Noyés',
    scene: 'swamp',
    requires: '1-1',
    tip: 'Étourdis ou <b>gèle</b> la Reine pendant qu’elle prépare son <b>Raz-de-marée</b> pour l’annuler. Les Sorcières, fragiles, sont la cible idéale des sorts de zone.',
    description: 'Au-delà de la route, les eaux noires du marais engloutissent les voyageurs. Leur reine les relève, et des sorcières chantent pour elle. Ne laisse personne t’entraîner sous la surface.',
    power: 13500,
    energy: 6,
    rewards: { gold: 1100, gems: 120, xp: 120 },
    enemies: [
      { def: ENEMIES.drowned, x: 1260, y: 720 },
      { def: ENEMIES.drowned, x: 1280, y: 870 },
      { def: ENEMIES.queen, x: 1450, y: 795, boss: true },
      { def: ENEMIES.witch, x: 1640, y: 710 },
      { def: ENEMIES.witch, x: 1660, y: 880 },
    ],
  },
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
export const nextTierLevel = (level: number): number => (skillTiers(level) + 1) * SKILL_TIER_LEVELS;

/** Progression (0…1) vers le prochain palier. */
export function tierProgress(level: number): number {
  const tier = skillTiers(level);
  const start = tier * SKILL_TIER_LEVELS;
  const end = (tier + 1) * SKILL_TIER_LEVELS;
  return Math.max(0, Math.min(1, (level - start) / (end - start)));
}

/** Coût en or pour passer un héros au niveau suivant. */
export function levelUpCost(level: number, rarity: Rarity): number {
  const base = rarity === 'SSR' ? 220 : rarity === 'SR' ? 150 : 90;
  return Math.round(base * Math.pow(1.14, level - 1));
}

/** Deux niveaux supplémentaires = +7 % PV/ATQ ; le reste vient des paliers de compétence. */
export const levelStatMult = (level: number): number => 1 + 0.035 * (level - 1);

/** Niveau maximum d'un héros : aucun. */
export const MAX_HERO_LEVEL = Number.POSITIVE_INFINITY;

/** Bonus de dégâts de compétence affiché en pourcentage. */
export const tierBonusPct = (tier: number): number => Math.round((skillMult(tier) - 1) * 100);

export const heroById = (id: string): HeroDef | undefined => HEROES.find((h) => h.id === id);

/** Étoiles maximales d'un héros (5 dorées puis 5 violettes). */
export const MAX_STARS = 10;

/** Un héros de l'équipe et son nombre d'étoiles. */
export interface TeamMember {
  def: HeroDef;
  stars: number;
  /** Niveau du héros (1…∞). Améliore ses PV/ATQ et ses compétences tous les 10 niveaux. */
  level: number;
}

/** Bonus de statistiques donné par les étoiles au-delà de la base : +10 % PV et ATQ par étoile. */
export const starMult = (def: HeroDef, stars: number): number => 1 + 0.1 * Math.max(0, stars - def.stars);

/**
 * Multicateur global des statistiques d'un héros :
 * étoiles (invocation) × niveau (amélioration) — les deux se cumulent.
 */
export const heroStatMult = (def: HeroDef, stars: number, level: number): number =>
  starMult(def, stars) * levelStatMult(level);

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
export const heroPower = (h: HeroDef, stars = h.stars, level = 1): number => {
  const m = heroStatMult(h, stars, level);
  const skill = skillMult(skillTiers(level));
  return Math.round(h.stats.hp * m * 0.6 + h.stats.atk * m * 12 * skill + h.stats.armor * 8 + (h.stats.crit * 100) * 10);
};

export const teamPower = (team: readonly TeamMember[]): number =>
  team.reduce((s, m) => s + heroPower(m.def, m.stars, m.level), 0);
