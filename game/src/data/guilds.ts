/**
 * LES GUILDES — des bots qui se comportent comme des joueurs.
 *
 * Aucun serveur : tout est déterministe à partir du jour courant. Les membres
 * progressent, les contributions tombent chaque jour, les messages du chat
 * changent et les grades bougent. Rejoindre une guilde donne un vrai cadre :
 * un nom, un emblème, des membres classés, un chat vivant.
 */

export interface GuildMember {
  name: string;
  avatar: string;
  role: 'Chef' | 'Officier' | 'Ancien' | 'Membre' | 'Recrue';
  level: number;
  power: number;
  /** Points de guilde apportés cette semaine. */
  weekly: number;
  /** Connecté maintenant ? */
  online: boolean;
  /** Dernière connexion, en heures. */
  seen: number;
}

export interface Guild {
  id: string;
  name: string;
  motto: string;
  emblem: string;
  color: string;
  /** Niveau de la guilde. */
  level: number;
  /** Puissance cumulée. */
  power: number;
  minLevel: number;
  /** Places occupées / totales. */
  members: number;
  capacity: number;
  /** Rang mondial. */
  rank: number;
}

const DAY = 86_400_000;
const EPOCH = Math.floor(Date.UTC(2026, 0, 1) / DAY);
export const today = (): number => Math.floor(Date.now() / DAY) - EPOCH;

const AVATARS = ['kael', 'lyra', 'morwen', 'seren', 'aldric', 'thorne', 'nyx', 'ashka', 'vaelen', 'sylvaine', 'pyrrha', 'orlan', 'vespera', 'gorm', 'mira', 'corvin', 'elara', 'bran', 'nell', 'oskar', 'sable', 'ilse', 'rook', 'vesper', 'noktis', 'aurore', 'zephyr'];

/** Petit générateur déterministe : le même jour donne le même résultat. */
const hash = (s: string): number => {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
};

const NAMES = [
  ['Les Veilleurs de Cendre', 'On ne dort pas. On veille.', '🜂', '#ff7a2a'],
  ['Le Serment Brisé', 'Le serment tient encore, quelque part.', '🜄', '#6ad8ff'],
  ['La Lame Noire', 'Une lame, une ombre, aucun témoin.', '🗡', '#a06bff'],
  ['Les Fils du Néant', 'Le vide nous a faits. Il nous réclame.', '🕳', '#8a4dff'],
  ['Ordre du Soleil Renversé', 'Nous nous levons quand le monde se couche.', '☀', '#ffd36a'],
  ['La Cour des Veuves', 'Elles savent ce que coûte une victoire.', '🕸', '#ff3b5c'],
  ['Les Pèlerins de Verre', 'Nous marchons pieds nus sur nos propres éclats.', '◇', '#9fe8ff'],
  ['Le Chœur Muet', 'Nous chantons. Personne n’entend.', '♪', '#7ed957'],
  ['Les Forgerons d’Aube', 'Chaque matin, une nouvelle lame.', '⚒', '#ffb02a'],
  ['La Dernière Marche', 'Il reste un étage. Il reste nous.', '⛰', '#c8b48a'],
  ['Les Enfants de la Tour', 'Nés dans l’escalier, morts en haut.', '🗼', '#e3c077'],
  ['Le Banquet de Cendre', 'On mange ce qu’on a brûlé.', '🍷', '#c2183c'],
];

export const GUILDS: Guild[] = NAMES.map(([name, motto, emblem, color], i) => {
  const seed = hash('guild-' + name);
  const power = Math.round((2_400_000 - i * 132_000 + (seed % 90_000)) * (1 + today() * 0.0012));
  return {
    id: `g${i + 1}`,
    name, motto, emblem, color,
    level: 14 - Math.floor(i / 2),
    power,
    minLevel: [8, 5, 10, 12, 15, 18, 20, 22, 25, 30, 35, 40][i]!,
    members: 42 - i * 2 + (seed % 5),
    capacity: 50,
    rank: i + 1,
  };
});

export const guildById = (id: string | null): Guild | undefined => (id ? GUILDS.find((g) => g.id === id) : undefined);

const ROLE_ORDER: GuildMember['role'][] = ['Chef', 'Officier', 'Officier', 'Ancien', 'Ancien', 'Ancien', 'Membre', 'Membre', 'Membre', 'Membre', 'Recrue'];

/** Les membres d'une guilde un jour donné : noms, niveaux et contributions cohérents. */
export function guildMembers(id: string, day = today()): GuildMember[] {
  const g = guildById(id);
  if (!g) return [];
  const out: GuildMember[] = [];
  const n = Math.min(11, g.members);
  for (let i = 0; i < n; i++) {
    const seed = hash(`${id}-${i}`);
    const name = `${['Kael', 'Yso', 'Mor', 'Ser', 'Al', 'Thor', 'Nyx', 'Ash', 'Vae', 'Syl', 'Pyr', 'Orl', 'Vesp', 'Gorm', 'Mir', 'Corv', 'El', 'Bran', 'Nell'][seed % 19]}${['thas', '_noir', 'wen', 'en', 'dric', 'ne', 'ia', 'ka', 'en', 'aine', 'ha', 'an', 'era', 'm'][(seed >> 3) % 14]}${seed % 97}`;
    const level = Math.max(1, Math.round(g.minLevel + 12 + (seed % 40) + day * 0.03));
    out.push({
      name,
      avatar: AVATARS[seed % AVATARS.length]!,
      role: ROLE_ORDER[i] ?? 'Membre',
      level,
      power: Math.round(g.power / n * (1.25 - i * 0.06) * (1 + (seed % 20) / 200)),
      weekly: Math.round(600 + (seed % 900) + day * 3),
      online: ((seed >> 5) + day) % 4 === 0,
      seen: ((seed >> 7) + day) % 30,
    });
  }
  return out;
}

/** Messages récents du chat de guilde : différents chaque jour, jamais vides. */
export function guildChat(id: string, day = today()): Array<{ who: string; text: string; tag: 'chat' | 'system' | 'don' }> {
  const members = guildMembers(id, day);
  const who = (i: number): string => members[i % members.length]?.name ?? 'Système';
  const pool: Array<[GuildMember['role'] | 'sys', string]> = [
    ['sys', 'Le boss de guilde apparaît ce soir à 21 h. Toute la guilde est attendue.'],
    ['Membre', 'quelqu’un a un build tank pour l’étage 60 ? je me fais ouvrir en deux'],
    ['Officier', 'je lance une invocation x10, priez pour moi'],
    ['sys', 'Un membre a atteint le chapitre 12. La guilde gagne 1 200 points.'],
    ['Ancien', 'les gars, pensez à donner vos points avant dimanche, on est à 300 du palier'],
    ['Membre', 'j’ai eu Noktis en pitié 58 😭'],
    ['Chef', 'on reste groupés sur le même étage, sinon on se disperse'],
    ['Recrue', 'bonjour, je viens de rejoindre, je fais quoi ?'],
    ['Officier', 'tu montes ton équipe au niveau 30 et tu viens au boss ce soir'],
  ];
  return pool.map(([role, text]) => ({
    who: role === 'sys' ? 'Système' : who(pool.indexOf([role, text] as never)),
    text,
    tag: role === 'sys' ? 'system' : 'chat',
  }));
}

/** Contribution qu'un joueur rapporte par jour (affichage). */
export const playerWeekly = (power: number, level: number): number => Math.round(power / 40 + level * 30);
