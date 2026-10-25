/**
 * CAPACITÉS DU COMBAT TOUR PAR TOUR — les 27 héros, écrits à la main.
 *
 * Chaque héros a exactement ce que tu as demandé : **3 capacités + 1 ultime**, chacune
 * avec un nombre de TOURS de recharge. On garde les noms de la fiche du héros (ils sont
 * bons et cohérents avec l'histoire), mais les textes et les mécaniques sont réécrits
 * pour le tour par tour : plus de « pendant 6 s », plus de pourcentages hérités du temps
 * réel. Tout se compte en tours, et l'interface affiche le vrai multiplicateur.
 *
 * Trois niveaux de lecture :
 *  1. KITS — la mécanique par rôle (Tank, Guerrier, Assassin, Mage, Tireur, Soutien).
 *     Un héros ajouté demain est jouable sans écrire une ligne ici.
 *  2. TOUR_HEROES — l'identité de chacun : sa 3e capacité et son ultime sont écrites
 *     entièrement, ses deux capacités de fiche sont ajustées (nombre de frappes, cible,
 *     effets) pour que le nom raconte vraiment ce qui se passe.
 *  3. foeSkills — les ennemis et les boss suivent les mêmes règles.
 */
import type { HeroDef, Role, UnitDef } from '../data/heroes';
import type { IconName } from '../ui/icons';
import type { DamageKind, StatusSpec, TargetRule, TurnSkill } from './types';

/* ===================================================================== */
/*  1. Kits de rôle                                                       */
/* ===================================================================== */

const KITS: Record<Role, TurnSkill[]> = {
  Tank: [
    { id: 'r0', name: 'Coup de bouclier', icon: 'shield', text: 'Frappe la première ligne et fragilise son armure.', cooldown: 0, kind: 'phys', mult: 1.0, hits: 1, target: 'enemyFront', soul: 1, effects: [{ id: 'defDown', turns: 2, power: 0.15, chance: 0.4 }] },
    { id: 'r1', name: 'Provocation', icon: 'banner', text: 'La cible doit te frapper, et tu gagnes un bouclier.', cooldown: 3, kind: 'support', mult: 0.7, hits: 1, target: 'enemyFront', soul: 1, effects: [{ id: 'taunt', turns: 2, power: 1, chance: 0.85 }, { id: 'shield', turns: 2, power: 0.14, self: true }] },
    { id: 'r2', name: 'Rempart', icon: 'castle', text: 'Toute l\'équipe gagne un bouclier et une armure renforcée.', cooldown: 4, kind: 'support', mult: 0, hits: 1, target: 'allAllies', soul: 1, effects: [{ id: 'shield', turns: 2, power: 0.1 }, { id: 'defUp', turns: 2, power: 0.2 }] },
    { id: 'r3', name: 'Jugement', icon: 'swords', text: 'Frappe toute la ligne avant ennemie et peut l\'étourdir.', cooldown: 6, kind: 'phys', mult: 2.4, hits: 1, target: 'enemyFrontRow', soul: 2, ultimate: true, effects: [{ id: 'stun', turns: 1, power: 1, chance: 0.5 }] },
  ],
  Guerrier: [
    { id: 'r0', name: 'Coup de taille', icon: 'swords', text: 'Frappe la première ligne et fait saigner.', cooldown: 0, kind: 'phys', mult: 1.05, hits: 1, target: 'enemyFront', soul: 1, effects: [{ id: 'bleed', turns: 2, power: 0.35, chance: 0.3 }] },
    { id: 'r1', name: 'Charge', icon: 'bolt', text: 'Un coup violent qui affaiblit l\'attaque de la cible.', cooldown: 3, kind: 'phys', mult: 1.6, hits: 1, target: 'enemyAny', soul: 1, effects: [{ id: 'atkDown', turns: 2, power: 0.2, chance: 0.6 }] },
    { id: 'r2', name: 'Cri de guerre', icon: 'flame', text: 'L\'équipe frappe plus fort et joue plus souvent.', cooldown: 4, kind: 'support', mult: 0, hits: 1, target: 'allAllies', soul: 1, effects: [{ id: 'atkUp', turns: 2, power: 0.25 }, { id: 'haste', turns: 2, power: 0.15 }] },
    { id: 'r3', name: 'Fendoir', icon: 'swords', text: 'Deux frappes sur toute la ligne avant, qui font saigner.', cooldown: 6, kind: 'phys', mult: 1.5, hits: 2, target: 'enemyFrontRow', soul: 2, ultimate: true, effects: [{ id: 'bleed', turns: 3, power: 0.5, chance: 0.8 }] },
  ],
  Assassin: [
    { id: 'r0', name: 'Lame rapide', icon: 'swords', text: 'Frappe sèche, plus souvent critique.', cooldown: 0, kind: 'phys', mult: 1.0, hits: 1, target: 'enemyFront', soul: 1, critBonus: 0.12, effects: [] },
    { id: 'r1', name: 'Frappe tournante', icon: 'vortex', text: 'Perce la ligne et ignore une partie de l\'armure.', cooldown: 3, kind: 'phys', mult: 1.8, hits: 1, target: 'enemyAny', soul: 1, pierce: 0.25, effects: [{ id: 'bleed', turns: 2, power: 0.4, chance: 0.5 }] },
    { id: 'r2', name: 'Pas de l\'ombre', icon: 'moon', text: 'Disparaît un tour et monte son attaque.', cooldown: 4, kind: 'support', mult: 0, hits: 1, target: 'self', soul: 1, effects: [{ id: 'stealth', turns: 1, power: 1, self: true }, { id: 'atkUp', turns: 2, power: 0.3, self: true }] },
    { id: 'r3', name: 'Danse des lames', icon: 'swords', text: 'Quatre frappes, intouchable pendant la danse.', cooldown: 6, kind: 'phys', mult: 0.95, hits: 4, target: 'enemyAny', soul: 2, ultimate: true, effects: [{ id: 'invuln', turns: 1, power: 1, self: true }] },
  ],
  Mage: [
    { id: 'r0', name: 'Trait runique', icon: 'crystal', text: 'Sort de base : atteint n\'importe quelle ligne.', cooldown: 0, kind: 'magic', mult: 1.0, hits: 1, target: 'enemyAny', soul: 1, effects: [] },
    { id: 'r1', name: 'Éclat', icon: 'flame', text: 'Frappe fort et fait fondre la résistance.', cooldown: 3, kind: 'magic', mult: 1.7, hits: 1, target: 'enemyAny', soul: 1, effects: [{ id: 'defDown', turns: 2, power: 0.25, chance: 0.7 }] },
    { id: 'r2', name: 'Nova', icon: 'sun', text: 'Brûle tous les ennemis.', cooldown: 4, kind: 'magic', mult: 1.15, hits: 1, target: 'enemyAll', soul: 1, effects: [{ id: 'burn', turns: 2, power: 0.5, chance: 0.8 }] },
    { id: 'r3', name: 'Cataclysme', icon: 'vortex', text: 'Tempête sur tous les ennemis, peut étourdir.', cooldown: 6, kind: 'magic', mult: 2.2, hits: 1, target: 'enemyAll', soul: 2, ultimate: true, effects: [{ id: 'stun', turns: 1, power: 1, chance: 0.35 }] },
  ],
  Tireur: [
    { id: 'r0', name: 'Tir', icon: 'arrow', text: 'Atteint n\'importe quelle ligne, même l\'arrière.', cooldown: 0, kind: 'phys', mult: 1.05, hits: 1, target: 'enemyAny', soul: 1, effects: [] },
    { id: 'r1', name: 'Tir perçant', icon: 'arrow', text: 'Ignore une partie de l\'armure.', cooldown: 2, kind: 'phys', mult: 1.7, hits: 1, target: 'enemyAny', soul: 1, pierce: 0.3, effects: [] },
    { id: 'r2', name: 'Pluie de flèches', icon: 'drop', text: 'Touche tout le monde et ralentit.', cooldown: 4, kind: 'phys', mult: 1.05, hits: 1, target: 'enemyAll', soul: 1, effects: [{ id: 'slow', turns: 2, power: 0.2 }] },
    { id: 'r3', name: 'Œil de la lune', icon: 'moon', text: 'Un tir ajusté, presque toujours critique.', cooldown: 6, kind: 'phys', mult: 3.2, hits: 1, target: 'enemyAny', soul: 2, ultimate: true, critBonus: 0.3, effects: [] },
  ],
  Soutien: [
    { id: 'r0', name: 'Coup de bâton', icon: 'feather', text: 'Petite attaque, mais elle rapporte deux âmes.', cooldown: 0, kind: 'magic', mult: 0.8, hits: 1, target: 'enemyAny', soul: 2, effects: [] },
    { id: 'r1', name: 'Prière', icon: 'heart', text: 'Soigne l\'allié le plus blessé et le régénère.', cooldown: 2, kind: 'heal', mult: 1.9, hits: 1, target: 'allyLowest', soul: 1, effects: [{ id: 'hot', turns: 2, power: 0.5 }] },
    { id: 'r2', name: 'Bénédiction', icon: 'church', text: 'Soigne toute l\'équipe sur la durée.', cooldown: 4, kind: 'heal', mult: 1.1, hits: 1, target: 'allAllies', soul: 1, effects: [{ id: 'hot', turns: 3, power: 0.45 }, { id: 'atkUp', turns: 2, power: 0.15 }] },
    { id: 'r3', name: 'Sanctuaire', icon: 'sun', text: 'Grand soin d\'équipe et bulle d\'invulnérabilité.', cooldown: 6, kind: 'heal', mult: 2.4, hits: 1, target: 'allAllies', soul: 2, ultimate: true, effects: [{ id: 'invuln', turns: 1, power: 1 }, { id: 'atkUp', turns: 3, power: 0.2 }] },
  ],
};

/* ===================================================================== */
/*  2. Ce qu'un héros change par rapport au kit de son rôle               */
/* ===================================================================== */

/** Modification d'un emplacement : mécanique ET texte. */
export interface SlotPatch {
  text?: string;
  kind?: DamageKind | 'heal' | 'support';
  target?: TargetRule;
  mult?: number;
  hits?: number;
  cd?: number;
  pierce?: number;
  crit?: number;
  soul?: number;
  /** Remplace les effets. */
  set?: StatusSpec[];
  /** Ajoute des effets. */
  add?: StatusSpec[];
  /** Effets appliqués à toute ton équipe, en plus de la cible principale. */
  team?: StatusSpec[];
}

/** La 3e capacité : elle n'existe pas dans la fiche du héros, on l'écrit ici. */
export interface ThirdSkill extends SlotPatch {
  name: string;
  icon: IconName;
  text: string;
}

/** L'ultime : le nom et l'icône viennent de la fiche, tout le reste est réécrit. */
export interface UltSkill extends SlotPatch {
  text: string;
}

export interface TourHero {
  /** Capacité de base (celle de la fiche « attack »). */
  base?: SlotPatch;
  /** Compétence de la fiche (« skill »). */
  skill?: SlotPatch;
  /** 3e capacité, écrite pour le tour par tour. */
  third: ThirdSkill;
  /** Ultime, écrite pour le tour par tour. */
  ult: UltSkill;
}

export const TOUR_HEROES: Record<string, TourHero> = {
  /* ------------------------------ SSR ------------------------------- */
  kael: {
    base: { text: 'Un coup d\'épée ardente sur la première ligne : ça brûle un peu plus à chaque tour.' },
    skill: { text: 'Plante son bouclier : la cible est forcée de le frapper et il gagne un bouclier.' },
    third: {
      name: 'Cendres ardentes', icon: 'flame', kind: 'support', target: 'self', mult: 0, cd: 4,
      text: 'Se couvre de braises : bouclier et riposte sur chaque coup reçu.',
      set: [{ id: 'shield', turns: 2, power: 0.18, self: true }, { id: 'counter', turns: 2, power: 0.6, self: true }],
    },
    ult: {
      kind: 'phys', target: 'enemyFrontRow', mult: 2.6, cd: 6,
      text: 'Bond au milieu de la ligne avant ennemie : onde de feu, étourdissement et brûlure.',
      set: [{ id: 'stun', turns: 1, power: 1, chance: 0.5 }, { id: 'burn', turns: 2, power: 0.6, chance: 0.9 }],
    },
  },
  lyra: {
    base: { text: 'Deux entailles si rapides qu\'on n\'en voit qu\'une.', hits: 2, mult: 0.6, crit: 0.15 },
    skill: { text: 'Se téléporte derrière l\'ennemi le plus affaibli : le coup perce la ligne.', mult: 1.9, target: 'enemyAny', pierce: 0.2 },
    third: {
      name: 'Éventrement', icon: 'swords', kind: 'phys', target: 'enemyAny', mult: 1.0, hits: 2, cd: 3,
      text: 'Deux dagues, deux plaies : le saignement est quasi garanti.',
      set: [{ id: 'bleed', turns: 2, power: 0.5, chance: 0.9 }],
    },
    ult: {
      kind: 'phys', target: 'enemyAny', mult: 0.95, hits: 7, cd: 6,
      text: 'Devient intouchable et frappe sept fois au hasard, en faisant saigner.',
      set: [{ id: 'invuln', turns: 1, power: 1, self: true }, { id: 'bleed', turns: 2, power: 0.5, chance: 0.9 }],
    },
  },
  morwen: {
    base: { text: 'Une orbe d\'ombre qui atteint n\'importe quelle ligne.' },
    skill: { text: 'Deux goules spectrales frappent avec elle : poison garanti sur la cible.', set: [{ id: 'poison', turns: 3, power: 0.7 }] },
    third: {
      name: 'Nuée de peste', icon: 'skull', kind: 'magic', target: 'enemyAll', mult: 0.9, cd: 4,
      text: 'Un nuage de peste recouvre tout le monde : poison et résistance rongée.',
      set: [{ id: 'poison', turns: 3, power: 0.6, chance: 0.9 }, { id: 'defDown', turns: 2, power: 0.2, chance: 0.8 }],
    },
    ult: {
      kind: 'magic', target: 'enemyAll', mult: 1.9, cd: 6,
      text: 'Un fléau noir ronge tous les ennemis : poison long et lenteur.',
      set: [{ id: 'poison', turns: 3, power: 0.9 }, { id: 'slow', turns: 2, power: 0.3 }],
    },
  },
  nyx: {
    base: { text: 'Un fragment de néant, qui atteint même la ligne arrière.' },
    skill: { text: 'Ouvre un trou noir sur une cible : il broie sa résistance.', mult: 1.8, set: [{ id: 'defDown', turns: 2, power: 0.3, chance: 0.85 }] },
    third: {
      name: 'Effondrement', icon: 'vortex', kind: 'magic', target: 'enemyAny', mult: 2.1, cd: 4, pierce: 0.2,
      text: 'Un point du ciel s\'effondre sur une seule cible et traverse ses défenses.',
      set: [{ id: 'defDown', turns: 3, power: 0.25 }],
    },
    ult: {
      kind: 'magic', target: 'enemyAll', mult: 2.4, cd: 6,
      text: 'Un soleil noir dévore la lumière : tous les ennemis sont touchés, leur défense s\'effondre et certains perdent leur tour.',
      set: [{ id: 'defDown', turns: 3, power: 0.3 }, { id: 'stun', turns: 1, power: 1, chance: 0.3 }],
    },
  },
  vaelen: {
    base: { text: 'Un coup de marteau de siège sur la première ligne.' },
    skill: { text: 'Plante son bouclier : provocation longue et gros bouclier personnel.', mult: 0.8, set: [{ id: 'taunt', turns: 2, power: 1 }, { id: 'shield', turns: 3, power: 0.22, self: true }] },
    third: {
      name: 'Serment du rempart', icon: 'shield', kind: 'support', target: 'self', mult: 0, cd: 4,
      text: 'Jure de tenir : il attire les coups destinés à ta ligne arrière et riposte.',
      set: [{ id: 'guard', turns: 2, power: 1, self: true }, { id: 'counter', turns: 2, power: 0.5, self: true }, { id: 'defUp', turns: 2, power: 0.25, self: true }],
    },
    ult: {
      kind: 'phys', target: 'enemyFrontRow', mult: 2.4, cd: 6,
      text: 'Un mur de flammes s\'élève sur la ligne avant, étourdit, et ton équipe gagne un bouclier.',
      set: [{ id: 'stun', turns: 1, power: 1, chance: 0.5 }, { id: 'burn', turns: 2, power: 0.5, chance: 0.7 }],
      team: [{ id: 'shield', turns: 2, power: 0.12 }],
    },
  },
  sylvaine: {
    base: { text: 'Une flèche de ronce qui atteint n\'importe quelle ligne.' },
    skill: { text: 'Tire en éventail sur toute la ligne avant ennemie : saignement assuré.', mult: 1.2, target: 'enemyFrontRow', hits: 1, set: [{ id: 'bleed', turns: 3, power: 0.5, chance: 0.9 }] },
    third: {
      name: 'Épines', icon: 'feather', kind: 'support', target: 'self', mult: 0, cd: 4,
      text: 'Se couvre de ronces : elle renvoie une partie des dégâts reçus et frappe plus fort.',
      set: [{ id: 'counter', turns: 3, power: 0.7, self: true }, { id: 'atkUp', turns: 2, power: 0.2, self: true }],
    },
    ult: {
      kind: 'phys', target: 'enemyAny', mult: 1.0, hits: 8, cd: 6, pierce: 0.2,
      text: 'Une forêt de ronces surgit : huit traits au hasard, qui enracinent et font saigner.',
      set: [{ id: 'slow', turns: 2, power: 0.3, chance: 0.8 }, { id: 'bleed', turns: 3, power: 0.5, chance: 0.7 }],
    },
  },
  pyrrha: {
    base: { text: 'Une braise vive sur la cible de ton choix.' },
    skill: { text: 'Un météore sur un ennemi : gros dégâts et brûlure.', mult: 1.9, set: [{ id: 'burn', turns: 3, power: 0.7, chance: 0.9 }] },
    third: {
      name: 'Bûcher', icon: 'flame', kind: 'magic', target: 'enemyFrontRow', mult: 1.3, cd: 4,
      text: 'Allume la ligne avant ennemie : la brûlure dure longtemps.',
      set: [{ id: 'burn', turns: 3, power: 0.8 }],
    },
    ult: {
      kind: 'magic', target: 'enemyAll', mult: 1.5, cd: 6,
      text: 'Le ciel s\'embrase : trois vagues de feu sur tous les ennemis, qui brûlent.',
      hits: 3, set: [{ id: 'burn', turns: 3, power: 0.8 }],
    },
  },
  vespera: {
    base: { text: 'Une double entaille de veuve sur la première ligne.', hits: 2, mult: 0.6 },
    skill: { text: 'Se glisse derrière l\'ennemi le plus affaibli : le coup perce la ligne.', mult: 1.85, pierce: 0.3 },
    third: {
      name: 'Lame empoisonnée', icon: 'drop', kind: 'phys', target: 'enemyAny', mult: 1.6, cd: 3,
      text: 'Enduit sa lame : poison et saignement sur la même plaie.',
      set: [{ id: 'poison', turns: 3, power: 0.6 }, { id: 'bleed', turns: 2, power: 0.35, chance: 0.7 }],
    },
    ult: {
      kind: 'phys', target: 'enemyAny', mult: 0.95, hits: 5, cd: 6,
      text: 'Devenue insaisissable, elle frappe cinq fois au hasard et saigne ses victimes.',
      set: [{ id: 'invuln', turns: 1, power: 1, self: true }, { id: 'bleed', turns: 3, power: 0.6 }],
    },
  },
  mira: {
    base: { text: 'Un carreau de verre noir, sur la ligne de ton choix.' },
    skill: { text: 'Pose un piège : la cible est enracinée et saigne.', mult: 1.5, set: [{ id: 'slow', turns: 2, power: 0.35 }, { id: 'bleed', turns: 2, power: 0.45, chance: 0.8 }] },
    third: {
      name: 'Viser le joint', icon: 'arrow', kind: 'phys', target: 'enemyAny', mult: 1.9, cd: 3, pierce: 0.5,
      text: 'Vise le joint de l\'armure : la moitié de la défense ne compte pas.',
      set: [],
    },
    ult: {
      kind: 'phys', target: 'enemyAny', mult: 0.55, hits: 6, cd: 6, pierce: 0.4,
      text: 'Vide son chargeur en six traits qui traversent les armures.',
      set: [],
    },
  },
  corvin: {
    base: { text: 'Une taille d\'épée fendue sur la première ligne.' },
    skill: { text: 'Frappe le sol autour de lui : la cible frappe moins fort et il gagne un bouclier.', mult: 1.5, set: [{ id: 'atkDown', turns: 2, power: 0.25, chance: 0.9 }, { id: 'shield', turns: 2, power: 0.15, self: true }] },
    third: {
      name: 'Pardon refusé', icon: 'skull', kind: 'phys', target: 'enemyAny', mult: 1.7, cd: 3,
      text: 'Un coup qui ne pardonne pas : la cible frappe moins fort et saigne.',
      set: [{ id: 'atkDown', turns: 3, power: 0.3 }, { id: 'bleed', turns: 2, power: 0.4, chance: 0.7 }],
    },
    ult: {
      kind: 'phys', target: 'enemyFrontRow', mult: 1.5, hits: 2, cd: 6,
      text: 'Lève son épée vers le ciel : deux coups sur toute la ligne avant, et ton équipe se régénère.',
      set: [{ id: 'bleed', turns: 3, power: 0.5, chance: 0.8 }],
      team: [{ id: 'hot', turns: 2, power: 0.4 }],
    },
  },
  noktis: {
    base: { text: 'Un arc de faux sur la première ligne.' },
    skill: { text: 'Ouvre une entaille noire : saignement et chance d\'étourdir.', mult: 1.6, set: [{ id: 'bleed', turns: 3, power: 0.5, chance: 0.8 }, { id: 'stun', turns: 1, power: 1, chance: 0.25 }] },
    third: {
      name: 'Silence', icon: 'moon', kind: 'phys', target: 'enemyAny', mult: 1.5, cd: 3,
      text: 'Réduit au silence : la cible frappe moins fort et joue moins souvent.',
      set: [{ id: 'atkDown', turns: 3, power: 0.3 }, { id: 'slow', turns: 2, power: 0.25 }],
    },
    ult: {
      kind: 'phys', target: 'enemyFrontRow', mult: 1.25, hits: 2, cd: 6, pierce: 0.2,
      text: 'Fauche toute la ligne ennemie : deux passages de lame, saignement long.',
      set: [{ id: 'bleed', turns: 3, power: 0.6, chance: 0.9 }],
    },
  },
  aurore: {
    base: { text: 'Un rayon solaire concentré sur la cible de ton choix.' },
    skill: { text: 'Trace une ligne de feu : dégâts et brûlure.', mult: 1.7, set: [{ id: 'burn', turns: 2, power: 0.6, chance: 0.9 }] },
    third: {
      name: 'Aube', icon: 'sun', kind: 'heal', target: 'allAllies', mult: 1.0, cd: 4,
      text: 'La lumière se lève sur ton équipe : soin et régénération.',
      set: [{ id: 'hot', turns: 3, power: 0.5 }],
    },
    ult: {
      kind: 'magic', target: 'enemyAll', mult: 2.1, cd: 6,
      text: 'Le soleil tombe sur l\'arène : tous les ennemis brûlent, et ton équipe se régénère.',
      set: [{ id: 'burn', turns: 2, power: 0.7 }, { id: 'stun', turns: 1, power: 1, chance: 0.35 }],
      team: [{ id: 'hot', turns: 2, power: 0.5 }],
    },
  },
  zephyr: {
    base: { text: 'Deux entailles si rapides qu\'on les entend après.', hits: 2, mult: 0.6 },
    skill: { text: 'Traverse trois ennemis : deux frappes qui percent la ligne et font saigner.', mult: 1.0, hits: 2, target: 'enemyAny', pierce: 0.2 },
    third: {
      name: 'Courant d\'air', icon: 'feather', kind: 'support', target: 'self', mult: 0, cd: 4,
      text: 'Prend le vent : il joue plus souvent pendant trois tours et frappe plus fort.',
      set: [{ id: 'haste', turns: 3, power: 0.35, self: true }, { id: 'atkUp', turns: 2, power: 0.25, self: true }],
    },
    ult: {
      kind: 'phys', target: 'enemyAny', mult: 0.95, hits: 4, cd: 6,
      text: 'Quatre frappes tourbillonnantes au hasard, puis la hâte.',
      set: [{ id: 'haste', turns: 3, power: 0.3, self: true }],
    },
  },

  /* ------------------------------- SR ------------------------------- */
  seren: {
    base: { text: 'Une flèche d\'argent, sur n\'importe quelle ligne.' },
    skill: { text: 'Une flèche géante traverse toute la ligne avant ennemie.', mult: 1.3, target: 'enemyFrontRow' },
    third: {
      name: 'Flèche de givre', icon: 'snow', kind: 'phys', target: 'enemyAny', mult: 1.6, cd: 3, pierce: 0.2,
      text: 'Une flèche froide : la cible joue moins souvent.',
      set: [{ id: 'slow', turns: 2, power: 0.3 }],
    },
    ult: {
      kind: 'phys', target: 'enemyAll', mult: 1.15, hits: 3, cd: 6,
      text: 'Cinq volées tombent du ciel sur tous les ennemis et les ralentissent.',
      set: [{ id: 'slow', turns: 2, power: 0.25, chance: 0.8 }],
    },
  },
  thorne: {
    base: { text: 'Un coup de hache glacée sur la première ligne.' },
    skill: { text: 'Tournoie avec sa hache sur toute la ligne avant : dégâts et lenteur.', mult: 1.2, target: 'enemyFrontRow', set: [{ id: 'slow', turns: 2, power: 0.3, chance: 0.9 }] },
    third: {
      name: 'Grêle', icon: 'snow', kind: 'phys', target: 'enemyAll', mult: 1.0, cd: 4,
      text: 'Une grêle de glaçons sur tout le monde : ça saigne et ça ralentit.',
      set: [{ id: 'slow', turns: 2, power: 0.25, chance: 0.8 }, { id: 'bleed', turns: 2, power: 0.35, chance: 0.5 }],
    },
    ult: {
      kind: 'phys', target: 'enemyAll', mult: 2.0, hits: 2, cd: 7,
      text: 'Un mur de pics de glace balaie le champ : tout le monde risque d\'être gelé.',
      set: [{ id: 'freeze', turns: 1, power: 1, chance: 0.75 }],
    },
  },
  aldric: {
    base: { text: 'Un éclat de lumière bénite sur la cible de ton choix.' },
    skill: { text: 'Soigne l\'allié le plus blessé et le régénère plusieurs tours.', mult: 2.2 },
    third: {
      name: 'Litanie', icon: 'church', kind: 'heal', target: 'allAllies', mult: 1.2, cd: 4,
      text: 'Un chant tenu : toute l\'équipe se régénère et son armure remonte.',
      set: [{ id: 'hot', turns: 3, power: 0.45 }, { id: 'defUp', turns: 2, power: 0.25 }],
    },
    ult: {
      kind: 'heal', target: 'allAllies', mult: 2.6, cd: 6,
      text: 'Un sanctuaire : toute l\'équipe est soignée, intouchable un tour, et frappe plus fort.',
      set: [{ id: 'invuln', turns: 1, power: 1 }, { id: 'hot', turns: 3, power: 0.6 }, { id: 'atkUp', turns: 3, power: 0.2 }],
    },
  },
  ashka: {
    base: { text: 'Un trait de foudre très rapide, qui rapporte deux âmes.', soul: 2 },
    skill: { text: 'Un éclair rebondit sur tous les ennemis.', kind: 'magic', target: 'enemyAll', mult: 1.0, cd: 3, set: [{ id: 'burn', turns: 2, power: 0.4, chance: 0.6 }] },
    third: {
      name: 'Couronne d\'éclairs', icon: 'bolt', kind: 'heal', target: 'allAllies', mult: 1.2, cd: 4,
      text: 'Couronne ton équipe d\'électricité : soin, hâte et attaque en hausse.',
      set: [{ id: 'haste', turns: 3, power: 0.25 }, { id: 'atkUp', turns: 2, power: 0.25 }],
    },
    ult: {
      kind: 'heal', target: 'allAllies', mult: 1.8, cd: 6,
      text: 'L\'Oiseau-Tonnerre s\'éveille : ton équipe joue plus souvent, frappe plus fort et ne peut pas être touchée pendant un tour.',
      set: [{ id: 'haste', turns: 3, power: 0.25 }, { id: 'atkUp', turns: 3, power: 0.25 }, { id: 'invuln', turns: 1, power: 1 }],
    },
  },
  orlan: {
    base: { text: 'Un éclat de glas sur la cible de ton choix.' },
    skill: { text: 'Fait sonner sa cloche : la cible est étourdie et ralentie.', kind: 'magic', target: 'enemyAny', mult: 1.4, cd: 3, set: [{ id: 'stun', turns: 1, power: 1, chance: 0.45 }, { id: 'slow', turns: 2, power: 0.3, chance: 0.8 }] },
    third: {
      name: 'Carillon', icon: 'clock', kind: 'heal', target: 'allAllies', mult: 1.0, cd: 4,
      text: 'La cloche sonne clair : l\'équipe rejoue plus vite et se régénère.',
      set: [{ id: 'haste', turns: 3, power: 0.25 }, { id: 'hot', turns: 2, power: 0.4 }],
    },
    ult: {
      kind: 'heal', target: 'allAllies', mult: 2.4, cd: 6,
      text: 'Un glas immense : chaque allié récupère beaucoup de vie et devient intouchable un tour.',
      set: [{ id: 'invuln', turns: 1, power: 1 }, { id: 'hot', turns: 3, power: 0.5 }],
    },
  },
  gorm: {
    base: { text: 'Un bloc de granit sur la première ligne.' },
    skill: { text: 'Plante son rempart : provocation garantie et gros bouclier.', mult: 0.8, set: [{ id: 'taunt', turns: 2, power: 1 }, { id: 'shield', turns: 3, power: 0.2, self: true }] },
    third: {
      name: 'Pierre à pierre', icon: 'anvil', kind: 'support', target: 'allAllies', mult: 0, cd: 5,
      text: 'Monte un mur : bouclier et armure renforcée pour toute l\'équipe.',
      set: [{ id: 'shield', turns: 2, power: 0.12 }, { id: 'defUp', turns: 2, power: 0.2 }],
    },
    ult: {
      kind: 'phys', target: 'enemyFrontRow', mult: 2.2, cd: 6,
      text: 'Le plafond s\'effondre sur la ligne avant : gros dégâts et étourdissement probable.',
      set: [{ id: 'stun', turns: 1, power: 1, chance: 0.7 }],
    },
  },
  elara: {
    base: { text: 'Un éclat de voix qui cherche seul sa cible.' },
    skill: { text: 'Un écho résonne : soigne l\'allié le plus faible et remonte son armure.', mult: 1.9, set: [{ id: 'hot', turns: 2, power: 0.5 }, { id: 'defUp', turns: 2, power: 0.2 }] },
    third: {
      name: 'Voix du chœur', icon: 'chat', kind: 'heal', target: 'allAllies', mult: 1.3, cd: 4, soul: 2,
      text: 'Chante : soin de groupe, régénération, et davantage d\'âmes pour ton équipe.',
      set: [{ id: 'hot', turns: 3, power: 0.5 }],
    },
    ult: {
      kind: 'heal', target: 'allAllies', mult: 2.4, cd: 6,
      text: 'Sept voix s\'élèvent : toute l\'équipe est soignée, joue plus vite et frappe plus fort.',
      set: [{ id: 'hot', turns: 3, power: 0.6 }, { id: 'haste', turns: 2, power: 0.2 }, { id: 'atkUp', turns: 3, power: 0.2 }],
    },
  },
  ilse: {
    base: { text: 'Un rivet chauffé à blanc, sur n\'importe quelle ligne.' },
    skill: { text: 'Répare l\'allié le plus faible : soin et bouclier.', mult: 1.9, set: [{ id: 'hot', turns: 2, power: 0.45 }, { id: 'shield', turns: 2, power: 0.12 }] },
    third: {
      name: 'Deux paires de mains', icon: 'gear', kind: 'heal', target: 'allAllies', mult: 1.1, cd: 4,
      text: 'Répare tout ce qui casse : bouclier et régénération sur toute l\'équipe.',
      set: [{ id: 'shield', turns: 2, power: 0.1 }, { id: 'hot', turns: 3, power: 0.45 }],
    },
    ult: {
      kind: 'magic', target: 'enemyAll', mult: 1.3, cd: 6,
      text: 'Trois obus tombent sur tous les ennemis et les ralentissent.',
      set: [{ id: 'slow', turns: 2, power: 0.3, chance: 0.9 }],
      team: [{ id: 'shield', turns: 2, power: 0.1 }],
    },
  },
  rook: {
    base: { text: 'Un coup de bord de porte-bouclier sur la première ligne.' },
    skill: { text: 'Un coup de bouclier qui étourdit parfois et couvre sa ligne.', mult: 1.2, set: [{ id: 'stun', turns: 1, power: 1, chance: 0.4 }, { id: 'guard', turns: 2, power: 1, self: true }] },
    third: {
      name: 'Mur de pierre', icon: 'castle', kind: 'support', target: 'allAllies', mult: 0, cd: 5,
      text: 'Un mur qui riposte : bouclier et contre-attaque pour toute l\'équipe.',
      set: [{ id: 'shield', turns: 3, power: 0.1 }, { id: 'counter', turns: 2, power: 0.4 }],
    },
    ult: {
      kind: 'phys', target: 'enemyFrontRow', mult: 2.4, cd: 6,
      text: 'Provoque toute la ligne avant, gagne un énorme bouclier et frappe autour de lui.',
      set: [{ id: 'taunt', turns: 2, power: 1 }, { id: 'shield', turns: 3, power: 0.2, self: true }],
    },
  },
  vesper: {
    base: { text: 'Une note de lumière qui cherche sa cible.' },
    skill: { text: 'Un hymne qui soigne toute l\'équipe.', kind: 'heal', target: 'allAllies', mult: 1.2, cd: 3, set: [{ id: 'hot', turns: 2, power: 0.4 }] },
    third: {
      name: 'Diapason', icon: 'crystal', kind: 'magic', target: 'enemyAll', mult: 1.0, cd: 4,
      text: 'Une note aiguë fêle la résistance de tous les ennemis.',
      set: [{ id: 'defDown', turns: 2, power: 0.2, chance: 0.85 }, { id: 'burn', turns: 2, power: 0.4, chance: 0.6 }],
    },
    ult: {
      kind: 'magic', target: 'enemyAll', mult: 2.2, cd: 6,
      text: 'Une lumière blanche éblouit tous les ennemis et les ralentit.',
      set: [{ id: 'slow', turns: 2, power: 0.3 }, { id: 'stun', turns: 1, power: 1, chance: 0.25 }],
    },
  },

  /* -------------------------------- R --------------------------------- */
  bran: {
    base: { text: 'Un coup de hache ébréchée sur la première ligne.' },
    skill: { text: 'Un coup de maillet qui assomme parfois et le couvre d\'un bouclier.', mult: 1.5, set: [{ id: 'stun', turns: 1, power: 1, chance: 0.35 }, { id: 'shield', turns: 2, power: 0.12, self: true }] },
    third: {
      name: 'La Porte', icon: 'castle', kind: 'support', target: 'self', mult: 0, cd: 4,
      text: 'Se plante devant l\'équipe : il attire les coups et riposte.',
      set: [{ id: 'guard', turns: 2, power: 1, self: true }, { id: 'counter', turns: 2, power: 0.6, self: true }, { id: 'shield', turns: 2, power: 0.12, self: true }],
    },
    ult: {
      kind: 'phys', target: 'enemyFrontRow', mult: 1.5, hits: 2, cd: 6,
      text: 'Fonce dans la ligne : deux coups sur les ennemis traversés, qui saignent.',
      set: [{ id: 'bleed', turns: 3, power: 0.5, chance: 0.8 }],
    },
  },
  nell: {
    base: { text: 'Une flèche de chasse sur n\'importe quelle ligne.' },
    skill: { text: 'Marque l\'ennemi le plus faible : il saigne longtemps.', mult: 1.7, set: [{ id: 'bleed', turns: 3, power: 0.5, chance: 0.9 }] },
    third: {
      name: 'Ferraille', icon: 'gear', kind: 'phys', target: 'enemyAll', mult: 1.0, cd: 4,
      text: 'Mitraille toute la ligne ennemie de débris : ça ralentit et ça saigne.',
      set: [{ id: 'slow', turns: 2, power: 0.2 }, { id: 'bleed', turns: 2, power: 0.3, chance: 0.5 }],
    },
    ult: {
      kind: 'phys', target: 'enemyAll', mult: 1.2, hits: 3, cd: 6,
      text: 'Une volée sur tous les ennemis, trois fois de suite.',
      set: [],
    },
  },
  oskar: {
    base: { text: 'Un coup avec le plat du bouclier sur la première ligne.' },
    skill: { text: 'Se couvre de planches : bouclier et provocation.', mult: 0.7, set: [{ id: 'shield', turns: 2, power: 0.16, self: true }, { id: 'taunt', turns: 2, power: 1, chance: 0.85 }] },
    third: {
      name: 'Hache lourde', icon: 'anvil', kind: 'phys', target: 'enemyFrontRow', mult: 1.35, cd: 4,
      text: 'Une hache de bûcheron brise l\'armure de toute la ligne avant.',
      set: [{ id: 'defDown', turns: 3, power: 0.25 }],
    },
    ult: {
      kind: 'support', target: 'allAllies', mult: 0, cd: 6,
      text: 'Protège toute l\'équipe : bouclier et armure renforcée pendant trois tours.',
      set: [{ id: 'shield', turns: 3, power: 0.14 }, { id: 'defUp', turns: 3, power: 0.25 }],
    },
  },
  sable: {
    base: { text: 'Deux entailles rapides sur la première ligne.', hits: 2, mult: 0.6 },
    skill: { text: 'Se glisse derrière l\'ennemi le plus affaibli et disparaît un tour.', mult: 1.8, add: [{ id: 'stealth', turns: 1, power: 1, self: true }] },
    third: {
      name: 'Sable dans les yeux', icon: 'vortex', kind: 'phys', target: 'enemyAny', mult: 1.3, cd: 3,
      text: 'Une poignée de sable : la cible peut perdre son prochain tour et frappe moins fort.',
      set: [{ id: 'stun', turns: 1, power: 1, chance: 0.35 }, { id: 'atkDown', turns: 2, power: 0.2, chance: 0.7 }],
    },
    ult: {
      kind: 'phys', target: 'enemyAny', mult: 0.55, hits: 6, cd: 6,
      text: 'Six coups sur l\'ennemi le plus faible, intouchable pendant l\'exécution.',
      set: [{ id: 'invuln', turns: 1, power: 1, self: true }],
    },
  },
};

/* ===================================================================== */
/*  Construction des capacités                                            */
/* ===================================================================== */

const clone = (s: TurnSkill): TurnSkill => ({ ...s, effects: s.effects.map((e) => ({ ...e })), team: s.team?.map((e) => ({ ...e })) });

function applyPatch(s: TurnSkill, p: SlotPatch | undefined): void {
  if (!p) return;
  if (p.kind !== undefined) s.kind = p.kind;
  if (p.target !== undefined) s.target = p.target;
  if (p.mult !== undefined) s.mult = p.mult;
  if (p.hits !== undefined) s.hits = p.hits;
  if (p.cd !== undefined) s.cooldown = p.cd;
  if (p.pierce !== undefined) s.pierce = p.pierce;
  if (p.crit !== undefined) s.critBonus = p.crit;
  if (p.soul !== undefined) s.soul = p.soul;
  if (p.set) s.effects = p.set.map((e) => ({ ...e }));
  if (p.add) s.effects = [...s.effects, ...p.add.map((e) => ({ ...e }))];
  if (p.team) s.team = p.team.map((e) => ({ ...e }));
  if (p.text !== undefined) s.text = p.text;
}

/**
 * Les 4 capacités d'un héros : base, compétence, 3e capacité, ultime.
 * Les noms et les icônes viennent de sa fiche ; les textes et les mécaniques viennent
 * d'ici (ou du kit de son rôle pour un héros qui n'a pas encore d'identité écrite).
 */
export function heroSkills(h: HeroDef): TurnSkill[] {
  const kit = KITS[h.role] ?? KITS.Guerrier!;
  const spec = TOUR_HEROES[h.id];
  const out = kit.map(clone);

  // Emplacement 1 — la capacité de base de la fiche.
  out[0]!.name = h.abilities.attack.name || out[0]!.name;
  out[0]!.icon = h.abilities.attack.icon || out[0]!.icon;
  out[0]!.text = h.abilities.attack.text || out[0]!.text;
  applyPatch(out[0]!, spec?.base);

  // Emplacement 2 — la compétence de la fiche.
  out[1]!.name = h.abilities.skill.name || out[1]!.name;
  out[1]!.icon = h.abilities.skill.icon || out[1]!.icon;
  out[1]!.text = h.abilities.skill.text || out[1]!.text;
  applyPatch(out[1]!, spec?.skill);

  // Emplacement 3 — la capacité qui n'existe pas dans la fiche.
  if (spec?.third) {
    out[2]!.name = spec.third.name;
    out[2]!.icon = spec.third.icon;
    applyPatch(out[2]!, spec.third);
  }

  // Emplacement 4 — l'ultime : nom et icône de la fiche, mécanique réécrite.
  out[3]!.name = h.abilities.ultimate.name || out[3]!.name;
  out[3]!.icon = h.abilities.ultimate.icon || out[3]!.icon;
  out[3]!.ultimate = true;
  applyPatch(out[3]!, spec?.ult);
  if (spec?.ult.text) out[3]!.text = spec.ult.text;
  if (out[3]!.cooldown < 4) out[3]!.cooldown = 6;

  // Un héros à distance atteint la ligne arrière dès sa capacité de base.
  if (h.projectile && out[0]!.target === 'enemyFront') out[0]!.target = 'enemyAny';

  return out.map((s, i) => ({ ...s, id: `${h.id}_s${i}` }));
}

/* ===================================================================== */
/*  Ennemis et boss                                                       */
/* ===================================================================== */

/** Où tape l'ultime d'un boss, selon sa mise en scène. */
const BOSS_TARGET: Record<'hex' | 'nova' | 'line' | 'quake' | 'rain' | 'summon', TargetRule> = {
  hex: 'enemyAny', nova: 'enemyAll', line: 'enemyFrontRow', quake: 'enemyFrontRow', rain: 'enemyAll', summon: 'enemyFront',
};

/** Effet ajouté à l'ultime d'un boss (lisible pour le joueur). */
function bossEffects(kind: 'hex' | 'nova' | 'line' | 'quake' | 'rain' | 'summon'): StatusSpec[] {
  switch (kind) {
    case 'hex': return [{ id: 'defDown', turns: 3, power: 0.3 }, { id: 'slow', turns: 2, power: 0.3 }];
    case 'nova': return [{ id: 'burn', turns: 2, power: 0.8, chance: 0.9 }];
    case 'rain': return [{ id: 'slow', turns: 2, power: 0.35, chance: 0.9 }];
    case 'quake': return [{ id: 'stun', turns: 1, power: 1, chance: 0.55 }];
    case 'line': return [{ id: 'bleed', turns: 3, power: 0.6, chance: 0.8 }];
    case 'summon': return [{ id: 'atkUp', turns: 3, power: 0.3, self: true }];
  }
}

/** Ce que chaque créature fait de particulier. */
const FOE_FLAVOUR: Record<string, { effects: StatusSpec[]; third?: { name: string; icon: IconName; text: string } }> = {
  ghoul: { effects: [{ id: 'bleed', turns: 2, power: 0.45, chance: 0.6 }] },
  skeleton: { effects: [{ id: 'defDown', turns: 2, power: 0.2, chance: 0.6 }], third: { name: 'Tir ajusté', icon: 'arrow', text: 'Vise le héros le moins blindé et perce son armure.' } },
  drowned: { effects: [{ id: 'slow', turns: 2, power: 0.3, chance: 0.7 }] },
  witch: { effects: [{ id: 'poison', turns: 3, power: 0.6, chance: 0.8 }] },
  warden: { effects: [{ id: 'stun', turns: 1, power: 1, chance: 0.35 }], third: { name: 'Coup de masse', icon: 'anvil', text: 'Une masse qui étourdit la ligne avant.' } },
  spectral: { effects: [{ id: 'atkDown', turns: 2, power: 0.2, chance: 0.5 }] },
  queen: { effects: [{ id: 'slow', turns: 2, power: 0.35 }], third: { name: 'Raz-de-marée', icon: 'drop', text: 'Repousse toute l\'équipe et la ralentit.' } },
};

/** Capacités d'un ennemi ou d'un boss : mêmes règles que les héros. */
export function foeSkills(u: UnitDef): TurnSkill[] {
  const flav = FOE_FLAVOUR[u.id];
  const ranged = !!u.projectile;
  const reach: TargetRule = ranged ? 'enemyAny' : 'enemyFront';
  const boss = !!u.bossUlt;

  const base: TurnSkill = {
    id: `${u.id}_s0`, name: boss ? 'Frappe du gardien' : 'Frappe', icon: 'swords',
    text: 'Attaque ta première ligne.', cooldown: 0, kind: 'phys', mult: boss ? 1.15 : 1.0,
    hits: 1, target: reach, soul: 1, effects: flav?.effects.slice(0, 1) ?? [],
  };
  const second: TurnSkill = {
    id: `${u.id}_s1`, name: boss ? 'Élan brisé' : 'Coup appuyé', icon: ranged ? 'arrow' : 'bolt',
    text: 'Un coup plus lourd.', cooldown: boss ? 3 : 2, kind: 'phys', mult: boss ? 1.7 : 1.5,
    hits: 1, target: reach, soul: 1, effects: flav?.effects ?? [],
  };
  const third: TurnSkill = {
    id: `${u.id}_s2`, name: flav?.third?.name ?? (boss ? 'Onde de choc' : 'Ruée'), icon: flav?.third?.icon ?? 'vortex',
    text: flav?.third?.text ?? 'Frappe toute ta ligne avant.', cooldown: boss ? 4 : 3, kind: 'phys',
    mult: boss ? 1.25 : 1.0, hits: 1, target: 'enemyFrontRow', soul: 1, effects: flav?.effects ?? [],
  };
  const ult: TurnSkill = u.bossUlt
    ? {
        id: `${u.id}_s3`, name: u.bossUlt.name, icon: 'crown',
        text: 'L\'ultime du boss : télégraphié, dévastateur.',
        cooldown: Math.max(4, Math.round(u.bossUlt.cd / 2)), kind: 'phys',
        mult: Math.max(2, u.bossUlt.mult * 1.6), hits: 1,
        target: BOSS_TARGET[u.bossUlt.kind] ?? 'enemyAll',
        soul: 2, ultimate: true, effects: bossEffects(u.bossUlt.kind),
      }
    : {
        id: `${u.id}_s3`, name: boss ? 'Rage' : 'Frénésie', icon: 'flame',
        text: 'Deux coups enragés.', cooldown: boss ? 5 : 4, kind: 'phys', mult: 1.1,
        hits: 2, target: reach, soul: 2, ultimate: true, effects: flav?.effects ?? [],
      };

  return [base, second, third, ult];
}

/** Les capacités d'un héros, mémoïsées par identifiant. */
const cache = new Map<string, TurnSkill[]>();
export function skillsOf(h: HeroDef): TurnSkill[] {
  const hit = cache.get(h.id);
  if (hit) return hit;
  const made = heroSkills(h);
  cache.set(h.id, made);
  return made;
}

/** Pour l'interface : le nom de la 3e capacité d'un héros (celle qu'il n'avait pas). */
export function thirdName(h: HeroDef): string {
  return skillsOf(h)[2]!.name;
}
