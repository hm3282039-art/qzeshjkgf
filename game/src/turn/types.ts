/**
 * COMBAT TOUR PAR TOUR — types partagés.
 *
 * Pourquoi un nouveau système : dans le combat en temps réel actuel, tout le monde
 * frappe en même temps et le joueur ne décide qu'un moment d'ultime. En tour par tour
 * (façon Epic Seven), chaque héros agit à son tour, le joueur CHOISIT la capacité et
 * la cible, et les capacités ont un nombre de tours de recharge. Le combat se raconte
 * au lieu de se subir.
 *
 * Le moteur est volontairement SANS rendu et SANS DOM : il produit une liste
 * d'événements que l'interface joue ensuite. On peut donc le tester (tests/test-tour.ts)
 * et le rejouer de façon identique avec une graine aléatoire.
 */
import type { IconName } from '../ui/icons';

/** Les trois lignes d'une formation. Deux emplacements par ligne. */
export type Row = 'front' | 'mid' | 'back';

/** Ordre d'affichage : le joueur voit sa ligne arrière à gauche, l'ennemie à droite. */
export const ROWS: readonly Row[] = ['back', 'mid', 'front'];

/** Ordre de profondeur : la ligne « avant » est celle qui prend les coups au corps à corps. */
export const ROW_DEPTH: readonly Row[] = ['front', 'mid', 'back'];

/** Étiquettes françaises des lignes (interface). */
export const ROW_LABEL: Record<Row, string> = {
  front: 'Devant',
  mid: 'Milieu',
  back: 'Derrière',
};

/** Ce que la ligne apporte. C'est la raison d'être du choix d'emplacement. */
export const ROW_BONUS: Record<Row, { hp: number; atk: number; armor: number; text: string }> = {
  front: { hp: 1.12, atk: 1.0, armor: 1.1, text: '+12 % PV, +10 % armure · encaisse les coups au corps à corps' },
  mid: { hp: 1.05, atk: 1.03, armor: 1.0, text: '+5 % PV, +3 % ATQ · ligne charnière' },
  back: { hp: 1.0, atk: 1.1, armor: 0.95, text: '+10 % ATQ, −5 % armure · protégée tant que la ligne avant tient' },
};

export type Side = 'hero' | 'enemy';

export type DamageKind = 'phys' | 'magic' | 'true';

/** Qui peut être visé par une capacité. */
export type TargetRule =
  /** Un ennemi de la ligne la plus avancée encore debout (règle du corps à corps). */
  | 'enemyFront'
  /** Tous les ennemis de la ligne la plus avancée. */
  | 'enemyFrontRow'
  /** N'importe quel ennemi vivant (perce la ligne : flèches, sorts, assassins). */
  | 'enemyAny'
  /** Tous les ennemis vivants. */
  | 'enemyAll'
  /** Un allié au choix. */
  | 'allyAny'
  /** L'allié le plus blessé (choisi automatiquement). */
  | 'allyLowest'
  /** Toute l'équipe. */
  | 'allAllies'
  /** Soi-même. */
  | 'self';

/** Effets de statut du jeu (tous comptés en tours). */
export type StatusId =
  | 'stun'      // ne joue pas son tour
  | 'freeze'    // ne joue pas son tour, +25 % de dégâts subis
  | 'poison'    // dégâts magiques en début de tour
  | 'burn'      // dégâts magiques en début de tour (plus fort, moins long)
  | 'bleed'     // dégâts physiques en début de tour
  | 'hot'       // soin en début de tour
  | 'shield'    // absorbe des dégâts
  | 'taunt'     // force l'ennemi qui le porte à viser le provocateur
  | 'guard'     // le porteur attire les coups visant sa ligne arrière
  | 'atkUp' | 'atkDown'
  | 'defUp' | 'defDown'
  | 'haste' | 'slow'
  | 'counter'   // riposte après avoir été touché
  | 'invuln'    // aucun dégât direct
  | 'stealth';  // non ciblable par un coup mono-cible

export interface StatusSpec {
  id: StatusId;
  /** Durée en tours (le tour du porteur). */
  turns: number;
  /** Intensité : multiple d'ATQ (DoT, soin, bouclier) ou fraction (buffs). */
  power: number;
  /** Probabilité d'application, 1 = garanti. */
  chance?: number;
  /** Appliqué à la cible (`true`) ou à l'auteur (`false`, défaut selon l'effet). */
  self?: boolean;
}

export interface TurnSkill {
  id: string;
  name: string;
  icon: IconName;
  /** Texte affiché au survol, dans la langue du jeu. */
  text: string;
  /** Tours de recharge après usage (0 = utilisable à chaque tour). */
  cooldown: number;
  kind: DamageKind | 'heal' | 'support';
  /** Multiplicateur d'ATQ par frappe (0 = ne fait pas de dégâts). */
  mult: number;
  /** Nombre de frappes (les ultimes enchaînent souvent plusieurs coups). */
  hits: number;
  target: TargetRule;
  effects: StatusSpec[];
  /**
   * Effets appliqués à TOUTE ton équipe au moment du lancement, quelle que soit la
   * cible principale. C'est ce qui permet aux ultimes de protéger le groupe pendant
   * qu'elles frappent devant (« Rempart Écarlate », « Jugement Différé »…).
   */
  team?: StatusSpec[];
  /** Part d'armure ignorée (0…1). */
  pierce?: number;
  /** Bonus de critique ajouté pour ce coup. */
  critBonus?: number;
  /** Vrai pour l'ultime (une seule par héros, recharge longue). */
  ultimate?: boolean;
  /** Âmes gagnées par l'équipe en utilisant cette capacité. */
  soul: number;
}

/** Ce que le moteur produit pour que l'interface puisse animer. */
export type BattleEvent =
  | { type: 'turn'; uid: number; name: string; side: Side; turn: number }
  | { type: 'cast'; uid: number; skill: string; ultimate: boolean; burn: boolean }
  | { type: 'move'; uid: number; to: number }
  | { type: 'damage'; src: number; tgt: number; amount: number; crit: boolean; kind: DamageKind; hp: number; shield: number }
  | { type: 'heal'; src: number; tgt: number; amount: number; hp: number }
  | { type: 'shield'; src: number; tgt: number; amount: number }
  | { type: 'status'; tgt: number; id: StatusId; turns: number; applied: boolean }
  | { type: 'dot'; tgt: number; id: StatusId; amount: number; hp: number }
  | { type: 'death'; uid: number; name: string; side: Side }
  | { type: 'soul'; side: Side; amount: number; total: number }
  | { type: 'skip'; uid: number; reason: StatusId }
  | { type: 'end'; winner: Side | null; turns: number };

/** Âmes nécessaires pour embraser une capacité (dégâts/soin ×1,5, effets plus sûrs). */
export const SOUL_BURN_COST = 3;
/** Plafond de la jauge d'âmes d'une équipe. */
export const SOUL_MAX = 9;
/**
 * Facteur de dégâts du tour par tour.
 *
 * En temps réel, une unité place 20 à 30 coups pendant un combat ; ici elle n'agit
 * qu'une dizaine de fois. Sans ce facteur, les mêmes chiffres donneraient des combats
 * trois fois plus longs (mesuré : 70 tours en moyenne). Chaque coup doit donc compter
 * davantage. Les soins gardent leurs multiplicateurs d'origine : le soin ne doit pas
 * devenir plus fort que les dégâts, sinon plus personne ne meurt.
 */
export const TOUR_DAMAGE = 1.8;
/** Même idée pour les dégâts sur la durée (ils tombent à chaque tour du porteur). */
export const TOUR_DOT = 1.25;

/** Jauge d'initiative : une unité agit quand elle atteint cette valeur. */
export const GAUGE_FULL = 100;
/** Nombre maximal de tours avant match nul (sécurité anti-boucle). */
export const MAX_TURNS = 120;
