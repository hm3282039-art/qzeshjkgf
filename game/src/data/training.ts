import { ENEMIES, type StageDef, type UnitDef } from './heroes';

/**
 * MODE ENTRAÎNEMENT
 *
 * Un seul héros face à un mannequin invincible qui ne riposte pas.
 * Le but n'est pas de gagner : c'est de comprendre. On règle l'armure et la
 * résistance du mannequin pour voir l'effet réel de chaque capacité, et le
 * compteur de dégâts donne le chiffre exact.
 */

/** Le mannequin : immortel, immobile, sans attaque. */
export const dummyUnit = (armor: number, res: number): UnitDef => ({
  ...ENEMIES.warden,
  id: 'dummy',
  name: 'Mannequin runique',
  height: 300,
  color: 0x9aa3b5,
  skillCd: undefined,
  skillFirst: undefined,
  bossUlt: undefined,
  stats: {
    ...ENEMIES.warden.stats,
    hp: 1_000_000_000,
    atk: 0,
    armor,
    res,
    range: 40,
    speed: 0,
    crit: 0,
    interval: 99,
  },
});

export const trainingStage = (armor: number, res: number, heroName: string): StageDef => ({
  id: 'ENT',
  name: `Entraînement · ${heroName}`,
  scene: 'citadel',
  tier: 0,
  power: 0,
  energy: 0,
  tip: 'Le mannequin ne riposte pas : prends ton temps, regarde les chiffres, teste les ultimes.',
  description: `Mannequin réglé à ${armor} d’armure et ${res} de résistance. Change les réglages pour voir comment chaque capacité traverse les défenses.`,
  rewards: { gold: 0, gems: 0, xp: 0 },
  enemies: [{ def: dummyUnit(armor, res), x: 1480, y: 800 }],
});

/** Réglages proposés dans l'interface (armure, résistance). */
export const DUMMY_PRESETS: ReadonlyArray<{ name: string; armor: number; res: number; text: string }> = [
  { name: 'Paille', armor: 0, res: 0, text: 'Aucune défense : dégâts bruts, parfait pour lire les multiplicateurs.' },
  { name: 'Cuir', armor: 60, res: 40, text: 'Défenses légères, comme un mob de début de campagne.' },
  { name: 'Acier', armor: 150, res: 60, text: 'Blindé : la magie passe mieux que le fer.' },
  { name: 'Colosse', armor: 260, res: 150, text: 'Mur de défense : idéal pour comparer deux équipements.' },
];
