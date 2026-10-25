/**
 * PROFIL DU JOUEUR — cadres déblocables.
 *
 * Chaque cadre raconte une étape : la Tour, la campagne, la collection.
 * Ils se débloquent seuls (aucun achat), et le joueur choisit celui qu'il affiche.
 */

export interface ProfileStats {
  level: number;
  power: number;
  towerBest: number;
  /** Niveaux de campagne terminés (étoiles ≥ 1). */
  stagesDone: number;
  /** Héros possédés. */
  collection: number;
  summons: number;
  gems: number;
}

export interface FrameDef {
  id: string;
  name: string;
  /** Dégradé du cadre. */
  css: string;
  /** Couleur de lueur. */
  glow: string;
  /** Condition affichée. */
  req: string;
  test: (s: ProfileStats) => boolean;
}

export const FRAMES: FrameDef[] = [
  { id: 'bronze', name: 'Bronze', css: 'linear-gradient(135deg,#8a6a3a,#d8b45a,#6a4a24)', glow: '#d8b45a', req: 'Par défaut', test: () => true },
  { id: 'argent', name: 'Argent', css: 'linear-gradient(135deg,#8a96a8,#e8eef6,#7a8698)', glow: '#cfd8e6', req: 'Atteindre le niveau 20', test: (s) => s.level >= 20 },
  { id: 'or', name: 'Or', css: 'linear-gradient(135deg,#a87b2a,#ffe6a8,#8a5a1a)', glow: '#ffd36a', req: 'Atteindre le niveau 40', test: (s) => s.level >= 40 },
  { id: 'cramoisi', name: 'Cramoisi', css: 'linear-gradient(135deg,#7a1024,#ff5a72,#5a0a18)', glow: '#ff3b5c', req: 'Terminer le chapitre 3', test: (s) => s.stagesDone >= 15 },
  { id: 'emeraude', name: 'Émeraude', css: 'linear-gradient(135deg,#1a6a42,#7affc0,#0f4a2a)', glow: '#7ed957', req: 'Posséder 12 héros', test: (s) => s.collection >= 12 },
  { id: 'azur', name: 'Azur', css: 'linear-gradient(135deg,#165a8a,#8ae8ff,#0a3a5a)', glow: '#6ad8ff', req: 'Atteindre l’étage 20 de la Tour', test: (s) => s.towerBest >= 20 },
  { id: 'pourpre', name: 'Pourpre', css: 'linear-gradient(135deg,#4a1a7a,#c8a0ff,#2a0a4a)', glow: '#a06bff', req: 'Atteindre l’étage 40 de la Tour', test: (s) => s.towerBest >= 40 },
  { id: 'obsidienne', name: 'Obsidienne', css: 'linear-gradient(135deg,#0a0814,#4a3a5a,#000)', glow: '#8a4dff', req: 'Atteindre l’étage 60 de la Tour', test: (s) => s.towerBest >= 60 },
  { id: 'lumiere', name: 'Lumière', css: 'linear-gradient(135deg,#fff6d8,#ffd36a,#fff)', glow: '#fff2c0', req: 'Posséder les 27 héros', test: (s) => s.collection >= 27 },
  { id: 'diamant', name: 'Diamant', css: 'linear-gradient(135deg,#e8fbff,#9fe8ff,#4aa8d8,#e8fbff)', glow: '#bff2ff', req: 'Terminer le chapitre 10', test: (s) => s.stagesDone >= 50 },
  { id: 'sang', name: 'Sang de la Tour', css: 'linear-gradient(135deg,#3a0410,#ff3b5c,#8a0a1e,#ff8fa3)', glow: '#ff3b5c', req: 'Terminer le chapitre 15', test: (s) => s.stagesDone >= 75 },
  { id: 'celeste', name: 'Céleste', css: 'conic-gradient(from 0deg,#fff6d8,#ffd36a,#ffb02a,#fff,#ffd36a,#fff6d8)', glow: '#ffe9b0', req: 'Terminer les 100 niveaux', test: (s) => s.stagesDone >= 100 },
  { id: 'infini', name: 'Infini', css: 'conic-gradient(from 0deg,#ff3b5c,#ffd36a,#7ed957,#6ad8ff,#a06bff,#ff3b5c)', glow: '#ffffff', req: 'Étage 100 de la Tour', test: (s) => s.towerBest >= 100 },
  { id: 'mythe', name: 'Mythe', css: 'conic-gradient(from 90deg,#ff3bd0,#ffd36a,#6ad8ff,#a06bff,#ff3bd0)', glow: '#ff9cf0', req: 'Étage 150 de la Tour', test: (s) => s.towerBest >= 150 },
];

export const frameById = (id: string): FrameDef => FRAMES.find((f) => f.id === id) ?? FRAMES[0]!;

/** Titres affichés à côté du pseudo (débloqués par les mêmes jalons). */
export interface TitleDef { id: string; name: string; req: string; test: (s: ProfileStats) => boolean }

export const TITLES: TitleDef[] = [
  { id: 'invocateur', name: 'Invocateur', req: 'Par défaut', test: () => true },
  { id: 'veilleur', name: 'Veilleur de Cendrebourg', req: 'Terminer le chapitre 1', test: (s) => s.stagesDone >= 5 },
  { id: 'briseur', name: 'Briseur de Siège', req: 'Terminer le chapitre 5', test: (s) => s.stagesDone >= 25 },
  { id: 'grimpeur', name: 'Grimpeur', req: 'Étage 25 de la Tour', test: (s) => s.towerBest >= 25 },
  { id: 'sans_fond', name: 'Sans-Fond', req: 'Étage 50 de la Tour', test: (s) => s.towerBest >= 50 },
  { id: 'collectionneur', name: 'Collectionneur', req: 'Posséder 12 héros', test: (s) => s.collection >= 12 },
  { id: 'legende', name: 'Légende de la Tour', req: 'Étage 100', test: (s) => s.towerBest >= 100 },
  { id: 'faucheur', name: 'Faucheur d’Aube', req: 'Terminer les 100 niveaux', test: (s) => s.stagesDone >= 100 },
  { id: 'mythe', name: 'Mythe Vivant', req: 'Étage 150 de la Tour', test: (s) => s.towerBest >= 150 },
];
