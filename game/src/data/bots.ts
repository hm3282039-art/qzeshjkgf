/**
 * LES HABITANTS DE LA TOUR — faux joueurs, vrais comportements.
 *
 * Il n'y a pas de serveur : le classement est simulé. Mais il ne doit pas être
 * figé. Chaque bot possède une identité, une trajectoire et un rythme. Sa
 * puissance, son étage et son niveau sont recalculés à partir du JOUR courant :
 * le classement bouge donc réellement d'un jour à l'autre, et certains bots
 * doublent le joueur pendant qu'il dort.
 *
 * Tout est déterministe (aucun Math.random) : deux ouvertures le même jour
 * donnent le même classement, et le joueur peut vérifier que ce n'est pas du bruit.
 */

export interface BotSeed {
  name: string;
  /** Héros utilisé comme portrait. */
  avatar: string;
  /** Cadre de profil (identifiant de FRAMES). */
  frame: string;
  /** Puissance au jour de référence. */
  power: number;
  /** Gain de puissance par jour. */
  growth: number;
  /** Étage de la Tour au jour de référence. */
  floor: number;
  /** Étages gagnés par jour (fractionnaire : un bot ne grimpe pas tous les jours). */
  climb: number;
  /** Niveau de compte au jour de référence. */
  level: number;
  /** Titre affiché. */
  title: string;
}

/** Jour 0 du classement : 1er janvier 2026. */
const EPOCH_DAY = Math.floor(Date.UTC(2026, 0, 1) / 86_400_000);

const SEEDS: BotSeed[] = [
  { name: 'Kaelthas', avatar: 'kael', frame: 'or', power: 214_800, growth: 940, floor: 62, climb: 0.42, level: 74, title: 'Le Premier Cendrier' },
  { name: 'Sire_Corbeau', avatar: 'corvin', frame: 'obsidienne', power: 209_500, growth: 880, floor: 58, climb: 0.36, level: 72, title: 'Serment Brisé' },
  { name: 'Ysolde', avatar: 'sylvaine', frame: 'lumiere', power: 203_100, growth: 910, floor: 65, climb: 0.30, level: 71, title: 'Épine de la Nuit' },
  { name: 'Grimald', avatar: 'gorm', frame: 'bronze', power: 198_400, growth: 700, floor: 49, climb: 0.22, level: 70, title: 'Père des Cailloux' },
  { name: 'Nyx_Draven', avatar: 'nyx', frame: 'pourpre', power: 194_900, growth: 960, floor: 57, climb: 0.45, level: 69, title: 'Impératrice du Néant' },
  { name: 'Elya', avatar: 'elara', frame: 'argent', power: 188_300, growth: 860, floor: 44, climb: 0.38, level: 68, title: 'Voix du Chœur' },
  { name: 'Vexa', avatar: 'lyra', frame: 'cramoisi', power: 183_700, growth: 1020, floor: 61, climb: 0.50, level: 67, title: 'Lame Sanglante' },
  { name: 'Morne', avatar: 'morwen', frame: 'obsidienne', power: 179_200, growth: 690, floor: 40, climb: 0.18, level: 66, title: 'Nécromancienne' },
  { name: 'Ashen_King', avatar: 'vaelen', frame: 'or', power: 174_600, growth: 760, floor: 52, climb: 0.28, level: 65, title: 'Rempart de Cendre' },
  { name: 'Pyrrha_II', avatar: 'pyrrha', frame: 'cramoisi', power: 170_100, growth: 830, floor: 47, climb: 0.33, level: 64, title: 'Bûcher Éternel' },
  { name: 'Sylvain', avatar: 'seren', frame: 'argent', power: 165_800, growth: 640, floor: 38, climb: 0.20, level: 63, title: 'Archère Lunaire' },
  { name: 'Tobias', avatar: 'aldric', frame: 'bronze', power: 161_400, growth: 580, floor: 33, climb: 0.14, level: 62, title: 'Inquisiteur' },
  { name: 'Corbeille', avatar: 'mira', frame: 'azur', power: 157_900, growth: 720, floor: 41, climb: 0.26, level: 61, title: 'Tireuse de Forge' },
  { name: 'Harn', avatar: 'thorne', frame: 'bronze', power: 153_300, growth: 610, floor: 35, climb: 0.19, level: 60, title: 'Jarl de Givre' },
  { name: 'Nocturne', avatar: 'vespera', frame: 'pourpre', power: 149_500, growth: 780, floor: 43, climb: 0.31, level: 59, title: 'Veuve de Fer' },
  { name: 'Ashka_Brume', avatar: 'ashka', frame: 'emeraude', power: 145_800, growth: 540, floor: 29, climb: 0.12, level: 58, title: 'Chamane de l’Orage' },
  { name: 'Orlan_Cloche', avatar: 'orlan', frame: 'argent', power: 141_200, growth: 500, floor: 27, climb: 0.10, level: 57, title: 'Sonneur de Glas' },
  { name: 'Lysandre', avatar: 'lyra', frame: 'azur', power: 137_600, growth: 690, floor: 34, climb: 0.24, level: 56, title: 'Lame de l’Aube' },
  { name: 'Tern', avatar: 'gorm', frame: 'bronze', power: 133_900, growth: 470, floor: 24, climb: 0.09, level: 55, title: 'Le Taciturne' },
  { name: 'Mirelle', avatar: 'elara', frame: 'lumiere', power: 130_200, growth: 720, floor: 31, climb: 0.27, level: 54, title: 'Chant des Sept' },
  { name: 'Kael_Noir', avatar: 'kael', frame: 'cramoisi', power: 126_800, growth: 840, floor: 37, climb: 0.34, level: 53, title: 'Chevalier Déchu' },
  { name: 'Ombrelune', avatar: 'nyx', frame: 'obsidienne', power: 123_100, growth: 600, floor: 26, climb: 0.16, level: 52, title: 'Impératrice' },
  { name: 'Brenna', avatar: 'sylvaine', frame: 'emeraude', power: 119_700, growth: 650, floor: 28, climb: 0.21, level: 51, title: 'Épine Noire' },
  { name: 'Corbin', avatar: 'corvin', frame: 'or', power: 116_300, growth: 520, floor: 22, climb: 0.11, level: 50, title: 'Paladin de l’Aube' },
  { name: 'Vael', avatar: 'vaelen', frame: 'bronze', power: 112_800, growth: 580, floor: 25, climb: 0.13, level: 49, title: 'Rempart' },
  { name: 'Séraphine', avatar: 'seren', frame: 'azur', power: 109_400, growth: 630, floor: 23, climb: 0.17, level: 48, title: 'Lune Pâle' },
  { name: 'Dorian', avatar: 'aldric', frame: 'argent', power: 106_100, growth: 430, floor: 18, climb: 0.08, level: 47, title: 'Frère du Glas' },
  { name: 'Pyrrhe', avatar: 'pyrrha', frame: 'cramoisi', power: 102_700, growth: 700, floor: 27, climb: 0.23, level: 46, title: 'Flamme Vive' },
  { name: 'Mora', avatar: 'morwen', frame: 'obsidienne', power: 99_300, growth: 460, floor: 19, climb: 0.07, level: 45, title: 'Voix des Morts' },
  { name: 'Thorn', avatar: 'thorne', frame: 'bronze', power: 96_000, growth: 420, floor: 16, climb: 0.06, level: 44, title: 'Jarl' },
  { name: 'Eldrin', avatar: 'orlan', frame: 'lumiere', power: 92_600, growth: 560, floor: 21, climb: 0.15, level: 43, title: 'Sonneur' },
  { name: 'Vesper', avatar: 'vespera', frame: 'pourpre', power: 89_200, growth: 610, floor: 20, climb: 0.18, level: 42, title: 'Veuve' },
  { name: 'Ash', avatar: 'ashka', frame: 'emeraude', power: 85_900, growth: 380, floor: 14, climb: 0.05, level: 41, title: 'Chamane' },
  { name: 'Miran', avatar: 'mira', frame: 'azur', power: 82_500, growth: 590, floor: 17, climb: 0.16, level: 40, title: 'Piégeuse' },
  { name: 'Gormund', avatar: 'gorm', frame: 'bronze', power: 79_200, growth: 350, floor: 12, climb: 0.04, level: 39, title: 'Colosse' },
  { name: 'Lyriane', avatar: 'lyra', frame: 'cramoisi', power: 75_900, growth: 540, floor: 15, climb: 0.14, level: 38, title: 'Lame' },
  { name: 'Nyxaris', avatar: 'nyx', frame: 'pourpre', power: 72_600, growth: 480, floor: 13, climb: 0.09, level: 37, title: 'Néant' },
  { name: 'Kaelen', avatar: 'kael', frame: 'or', power: 69_300, growth: 330, floor: 10, climb: 0.03, level: 36, title: 'Cendrier' },
  { name: 'Iselde', avatar: 'elara', frame: 'argent', power: 66_000, growth: 570, floor: 14, climb: 0.12, level: 35, title: 'Chœur' },
  { name: 'Vaughn', avatar: 'vaelen', frame: 'bronze', power: 62_800, growth: 300, floor: 9, climb: 0.02, level: 34, title: 'Mur' },
  { name: 'Sylvie', avatar: 'sylvaine', frame: 'emeraude', power: 59_600, growth: 450, floor: 11, climb: 0.08, level: 33, title: 'Épine' },
  { name: 'Corvin_II', avatar: 'corvin', frame: 'or', power: 56_400, growth: 390, floor: 8, climb: 0.05, level: 32, title: 'Serment' },
  { name: 'Tessa', avatar: 'seren', frame: 'azur', power: 53_200, growth: 340, floor: 7, climb: 0.03, level: 31, title: 'Flèche' },
  { name: 'Aldous', avatar: 'aldric', frame: 'bronze', power: 50_100, growth: 270, floor: 6, climb: 0.02, level: 30, title: 'Prêtre' },
  { name: 'Morrigan', avatar: 'morwen', frame: 'obsidienne', power: 47_000, growth: 360, floor: 8, climb: 0.04, level: 29, title: 'Sorcière' },
  { name: 'Pyrrhan', avatar: 'pyrrha', frame: 'cramoisi', power: 43_900, growth: 320, floor: 5, climb: 0.03, level: 28, title: 'Braise' },
  { name: 'Thorn_Ice', avatar: 'thorne', frame: 'argent', power: 40_800, growth: 240, floor: 4, climb: 0.01, level: 27, title: 'Givre' },
  { name: 'Orlanne', avatar: 'orlan', frame: 'lumiere', power: 37_800, growth: 300, floor: 5, climb: 0.02, level: 26, title: 'Glas' },
  { name: 'Vesperia', avatar: 'vespera', frame: 'pourpre', power: 34_800, growth: 280, floor: 4, climb: 0.02, level: 25, title: 'Fer' },
  { name: 'Mirabel', avatar: 'mira', frame: 'azur', power: 31_800, growth: 260, floor: 3, climb: 0.01, level: 24, title: 'Forge' },
  { name: 'Gormak', avatar: 'gorm', frame: 'bronze', power: 28_900, growth: 200, floor: 2, climb: 0.01, level: 23, title: 'Caillou' },
  { name: 'Ashkane', avatar: 'ashka', frame: 'emeraude', power: 26_000, growth: 230, floor: 3, climb: 0.01, level: 22, title: 'Orage' },
  { name: 'Lyra_Nyx', avatar: 'lyra', frame: 'obsidienne', power: 23_200, growth: 210, floor: 2, climb: 0.01, level: 21, title: 'Duo' },
  { name: 'Kaelys', avatar: 'kael', frame: 'argent', power: 20_400, growth: 190, floor: 1, climb: 0.01, level: 20, title: 'Novice' },
  { name: 'Elarian', avatar: 'elara', frame: 'lumiere', power: 17_600, growth: 170, floor: 1, climb: 0.01, level: 19, title: 'Acolyte' },
  { name: 'Vex', avatar: 'vespera', frame: 'cramoisi', power: 14_900, growth: 160, floor: 1, climb: 0, level: 18, title: 'Ombre' },
  { name: 'Brann', avatar: 'thorne', frame: 'bronze', power: 12_200, growth: 140, floor: 0, climb: 0, level: 17, title: 'Mercenaire' },
  { name: 'Sable', avatar: 'sylvaine', frame: 'emeraude', power: 9_600, growth: 120, floor: 0, climb: 0, level: 16, title: 'Chasseuse' },
  { name: 'Ombre', avatar: 'nyx', frame: 'pourpre', power: 7_000, growth: 100, floor: 0, climb: 0, level: 15, title: 'Rôdeuse' },
  { name: 'Cendre', avatar: 'corvin', frame: 'obsidienne', power: 4_500, growth: 80, floor: 0, climb: 0, level: 14, title: 'Vagabond' },
];

/** Hash 32 bits déterministe (petit, stable, sans dépendance). */
const hash = (s: string): number => {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
};

/** Nombre pseudo-aléatoire [0,1) déterministe. */
const rnd01 = (seed: string): number => (hash(seed) % 100_000) / 100_000;

export interface BotState {
  id: string;
  name: string;
  title: string;
  avatar: string;
  frame: string;
  power: number;
  floor: number;
  level: number;
  /** Progression de la journée (petite variation visible entre deux ouvertures). */
  trend: number;
  /** Dernier fait marquant du jour, pour le fil du classement. */
  event: string;
}

/** Jour courant depuis l'époque du classement. */
export const rankingDay = (now = Date.now()): number => Math.max(0, Math.floor(now / 86_400_000) - EPOCH_DAY);

/** Une saison dure 120 jours : les classements se rouvrent, les bots repartent. */
export const SEASON_LENGTH = 120;
export const seasonOf = (day: number): { season: number; dayInSeason: number } => ({
  season: Math.floor(day / SEASON_LENGTH) + 1,
  dayInSeason: day % SEASON_LENGTH,
});

/** Cache des progressions cumulées (nom → jour → total). */
const growthCache = new Map<string, number>();

/**
 * Progression cumulée d'un bot depuis l'ouverture du classement.
 *
 * Le gain de chaque journée dépend d'un tirage stable : certains jours un bot
 * pousse fort, d'autres il se repose. On ADDITIONNE, on ne recalcule jamais
 * depuis zéro — un bot ne peut donc pas reculer, il peut seulement ralentir.
 */
const cumulative = (name: string, day: number, perDay: number, base: number, key: string): number => {
  const ck = `${key}:${name}:${day}`;
  const hit = growthCache.get(ck);
  if (hit !== undefined) return hit;
  let total = base;
  for (let d = 1; d <= Math.min(day, 3000); d++) {
    const r = rnd01(`${name}:${key}:${d}`);
    total += perDay * (0.55 + r * 0.9);
  }
  if (day > 3000) total += perDay * (day - 3000);
  growthCache.set(ck, total);
  return total;
};

/** Gain de la journée en cours (affiché comme tendance). */
const todayGain = (name: string, day: number, perDay: number, key: string): number =>
  Math.round(perDay * (0.55 + rnd01(`${name}:${key}:${Math.max(1, day)}`) * 0.9));

/** État du classement pour un jour donné. */
export function botsAt(day = rankingDay(), now = Date.now()): BotState[] {
  void now;
  const { season, dayInSeason } = seasonOf(day);
  return SEEDS.map((b) => {
    // Progression de la saison en cours : elle repart de la base à chaque saison.
    const power = Math.round(cumulative(b.name, dayInSeason, b.growth, b.power, `p${season}`));
    const floor = Math.round(cumulative(b.name, dayInSeason, b.climb, b.floor, `f${season}`));
    const level = Math.round(cumulative(b.name, dayInSeason, 0.14, b.level, `l${season}`));
    const evSeed = hash(`${b.name}:${day}:event`) % 100;
    const event = evSeed < 10
      ? `a invoqué un héros SSR`
      : evSeed < 22
        ? `a battu son record : étage ${Math.max(1, floor)}`
        : evSeed < 34
          ? `est passé niveau ${level}`
          : evSeed < 44
            ? `a rejoint une guilde`
            : '';
    return {
      id: b.name.toLowerCase().replace(/[^a-z0-9]+/g, '_'),
      name: b.name,
      title: b.title,
      avatar: b.avatar,
      frame: b.frame,
      power,
      floor,
      level,
      trend: todayGain(b.name, dayInSeason, b.growth, `p${season}`),
      event,
    };
  });
}

/** Score de classement : la puissance domine, la Tour départage. */
export const rankScore = (power: number, floor: number): number => power + floor * 260;

export interface RankRow extends BotState {
  rank: number;
  isPlayer: boolean;
}

/**
 * Fusionne le joueur et les bots dans UN SEUL classement.
 * C'est le point important : le joueur n'est pas « à part », il grimpe et
 * redescend parmi les autres.
 */
export function leaderboard(player: { name: string; power: number; floor: number; level: number; avatar: string; frame: string; title: string }, day = rankingDay(), now = Date.now()): RankRow[] {
  const rows = botsAt(day, now);
  const all: Omit<RankRow, 'rank'>[] = [
    ...rows.map((b) => ({ ...b, isPlayer: false })),
    {
      id: 'player', name: player.name || 'Invocateur', title: player.title, avatar: player.avatar, frame: player.frame,
      power: player.power, floor: player.floor, level: player.level, trend: 0, event: '', isPlayer: true,
    },
  ];
  all.sort((a, b) => rankScore(b.power, b.floor) - rankScore(a.power, a.floor));
  return all.map((r, i) => ({ ...r, rank: i + 1 }));
}

/** Nombre total de profils simulés (bots + joueur). */
export const RANK_POPULATION = SEEDS.length + 1;
