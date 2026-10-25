import { ENEMIES, referencePower, suggestedLevelForTier, type SceneId, type StageDef, type UnitDef } from './heroes';

/**
 * LA TOUR DE L'INFINI
 *
 * Un mode sans fin : chaque étage est généré à la volée, ne coûte pas d'énergie,
 * et la difficulté monte tant que le joueur progresse. Il n'y a pas de dernier
 * étage — seulement un record personnel à repousser.
 *
 * Règles :
 *  - les PV et l'ATQ des ennemis montent à chaque étage (courbe géométrique) ;
 *  - un gardien tous les 5 étages, une reine tous les 10 ;
 *  - la première victoire d'un étage donne or + gemmes + XP ; une victoire sur
 *    un étage déjà conquis ne donne que de l'XP (on ne farme pas le même palier) ;
 *  - une défaite ne fait rien perdre : le record reste, l'étage reste jouable.
 */

/** Palier de difficulté de l'étage. 0,4 = entrée très accessible ; +0,22 par étage. */
/**
 * Palier de la Tour. La courbe de campagne compte désormais 10 chapitres ;
 * l'échelle a donc été convertie pour conserver exactement la même difficulté
 * par étage (environ +5 % de PV et +4 % d'ATQ à chaque étage).
 */
export const towerTier = (floor: number): number => 1.35 + (floor - 1) * 1.55;

/**
 * Niveau conseillé pour un étage : la même courbe que la campagne, appliquée au palier
 * de la Tour. Avant, l'étage affichait une puissance qui montait en ligne droite alors
 * que la difficulté, elle, montait en géométrique : le conseil devenait faux dès l'étage 20.
 */
export const towerLevel = (floor: number): number => suggestedLevelForTier(towerTier(Math.max(1, Math.floor(floor))));

/** Puissance conseillée : puissance réelle de l'équipe de référence au niveau conseillé. */
export const towerPower = (floor: number): number => referencePower(towerLevel(floor));

/** Récompenses d'un étage (valeurs « première victoire »). */
export const towerRewards = (floor: number): { gold: number; gems: number; xp: number } => {
  const bonus = floor % 5 === 0 ? 2.2 : 1;
  return {
    gold: Math.round((420 + floor * 150) * bonus),
    gems: Math.round((12 + floor * 4) * bonus),
    xp: Math.round((55 + floor * 18) * bonus),
  };
};

/** Décor de l'étage : les quatre environnements tournent, comme les saisons d'une tour. */
const SCENES: SceneId[] = ['gallows', 'swamp', 'citadel', 'throne'];
const sceneOf = (floor: number): SceneId => SCENES[(floor - 1) % SCENES.length]!;

/** Six emplacements de combat, du plus proche au plus profond du terrain. */
const SLOTS = [
  { x: 1255, y: 725 }, { x: 1285, y: 875 }, { x: 1420, y: 800 },
  { x: 1555, y: 715 }, { x: 1585, y: 885 }, { x: 1705, y: 800 },
] as const;

/** Ce que l'étage aligne, selon la profondeur. */
function composition(floor: number): { def: UnitDef; x: number; y: number; boss?: boolean }[] {
  const isBoss = floor % 5 === 0;
  const isQueen = floor % 10 === 0;

  // Le vivier s'ouvre avec la profondeur : goules → squelettes → noyés → sorcières → gardiens.
  const pool: UnitDef[] = [ENEMIES.ghoul, ENEMIES.skeleton];
  if (floor >= 4) pool.push(ENEMIES.drowned);
  if (floor >= 6) pool.push(ENEMIES.witch);
  if (floor >= 9) pool.push(ENEMIES.warden);

  const count = Math.min(6, 3 + Math.floor((floor - 1) / 7));
  const foes: { def: UnitDef; x: number; y: number; boss?: boolean }[] = [];

  // Le gardien occupe le centre du dispositif, les autres tournent autour.
  const bossSlot = 2;
  let slot = 0;
  for (let i = 0; i < count; i++) {
    const s = SLOTS[slot % SLOTS.length]!;
    if (isBoss && slot === bossSlot) {
      foes.push({ def: isQueen ? ENEMIES.queen : ENEMIES.warden, x: s.x, y: s.y, boss: true });
      slot++;
      continue;
    }
    const def = pool[(floor + i * 3) % pool.length]!;
    foes.push({ def, x: s.x, y: s.y });
    slot++;
  }
  // Sécurité : un étage à boss doit toujours avoir son boss.
  if (isBoss && !foes.some((f) => f.boss)) {
    const s = SLOTS[bossSlot]!;
    foes[bossSlot] = { def: isQueen ? ENEMIES.queen : ENEMIES.warden, x: s.x, y: s.y, boss: true };
  }
  return foes;
}

/** Un étage de la Tour, sous la forme d'un niveau de combat classique. */
export function towerStage(floor: number): StageDef {
  const f = Math.max(1, Math.floor(floor));
  return {
    id: `T${f}`,
    name: `Étage ${f}`,
    scene: sceneOf(f),
    tier: towerTier(f),
    level: towerLevel(f),
    power: towerPower(f),
    energy: 0,
    tip: f % 5 === 0
      ? 'Un gardien garde cet étage : étourdis-le pendant sa frappe lourde pour l’annuler.'
      : 'La Tour ne pardonne pas l’usure : soigne entre deux vagues, les PV ne reviennent pas.',
    description: f % 10 === 0
      ? `Étage ${f}. La Tour change de visage : la Reine Noyée t’attend au centre, et ses suivants chantent déjà.`
      : `Étage ${f}. La Tour s’enfonce d’un cran : les murs se resserrent, la lumière baisse, et quelque chose monte à ta rencontre.`,
    rewards: towerRewards(f),
    enemies: composition(f),
  };
}

/** Vrai si l'identifiant correspond à un étage de la Tour. */
export const isTowerStage = (id: string): boolean => /^T\d+$/.test(id);

/** Numéro d'étage à partir de l'identifiant. */
export const towerFloorOf = (id: string): number => Number(id.slice(1)) || 1;
