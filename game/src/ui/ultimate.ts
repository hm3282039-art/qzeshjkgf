import type { HeroDef } from '../data/heroes';
import { ART, PORTRAITS } from '../assets';
import { signatureOf, type Motif } from './signatures';

/**
 * CINÉMATIQUES D'ULTIME — moteur à 4 styles.
 *
 * Chaque style est une petite mise en scène découpée en 4 temps :
 *   1. on coupe le monde (gel, noir, ou saturation)
 *   2. on plante le décor (sceau, cadre, grille)
 *   3. on révèle le héros et son nom
 *   4. on frappe (flash, onde, arrêt sur image) puis on sort
 *
 * Le joueur choisit son style dans le Laboratoire (`?lab`) ; le choix est
 * mémorisé et utilisé en combat. Aucun style n'est « le bon » : c'est une
 * affaire de goût, et c'est pour ça qu'on les montre au lieu de les décrire.
 */

export type UltStyle = 'cinema' | 'comics' | 'rituel' | 'holo';

/**
 * Famille d'action de l'ultime. Ce n'est pas la classe du héros : c'est ce que
 * l'ultime FAIT (lire son texte). Une cinématique de « coup au sol » n'a rien à
 * voir avec une « pluie du ciel », et c'est ce qui empêche les 27 scènes de se
 * ressembler.
 */
export type Archetype = 'slam' | 'dash' | 'storm' | 'bless' | 'void' | 'line';

export interface ArchetypeDef {
  id: Archetype;
  label: string;
  /** Ce que la scène montre, en une phrase (labo). */
  show: string;
}

export const ARCHETYPES: readonly ArchetypeDef[] = [
  { id: 'slam', label: 'Coup au sol', show: 'Le héros bondit, retombe, le sol se fend, l’onde part au sol.' },
  { id: 'dash', label: 'Traversée', show: 'Le héros traverse l’écran en laissant des images, une entaille reste.' },
  { id: 'storm', label: 'Pluie du ciel', show: 'Le ciel s’ouvre, des traits tombent un par un sur le champ.' },
  { id: 'bless', label: 'Bénédiction', show: 'Le héros s’élève, des colonnes de lumière montent du sol.' },
  { id: 'void', label: 'Effondrement', show: 'Tout est aspiré vers un point noir, puis relâché d’un coup.' },
  { id: 'line', label: 'Rayon', show: 'Le héros arme, puis un trait traverse tout l’écran.' },
];

/**
 * Devine la famille d'action à partir du texte de l'ultime, puis du rôle.
 * C'est volontairement lisible : si le texte dit « frappe le sol », on ne fait
 * pas une pluie de flèches.
 */
export function archetypeOf(text: string, role: string, id = ''): Archetype {
  // Trois ultimes mentent aux mots-clés : on les corrige à la main, une fois.
  // (Vaelen dit « intouchable » mais il dresse un mur de flammes ; Corvin dit
  // « ciel » mais il perce une ligne ; Noktis dit « soigne » mais il fauche.)
  const FORCED: Record<string, Archetype> = {
    vaelen: 'slam', rook: 'slam', corvin: 'line', noktis: 'line', vesper: 'bless',
  };
  if (FORCED[id]) return FORCED[id]!;

  const t = text.toLowerCase();
  const has = (...w: string[]): boolean => w.some((x) => t.includes(x));
  // L'ordre compte : ce qui définit le MOUVEMENT passe avant ce qui le nuance.
  if (has('fonce', 'intouchable', 'insaisissable', 'frappe 7', 'frappe 8', 'six frappes', 'exécution')) return 'dash';
  if (has('ligne', 'rayon', 'traits', 'lève son épée', 'fauche')) return 'line';
  if (has('pluie', 'volée', 'volées', 'ciel', 'éclair', 'nuage', 'obus', 'tombe')) return 'storm';
  if (has('aspire', 'attire', 'implose', 'soleil noir', 'néant', 'ronces', 'enracine')) return 'void';
  if (has('sol', 'bondit', 'éboulement', 's’effondre', 'plafond', 'mur', 'pics', 'marteau', 'frappe le')) return 'slam';
  if (has('soigne', 'protège', 'bouclier', 'chœur', 'glas', 'rend ', 'récupère', 'voix', 'éblouit')) return 'bless';
  // Repli sur le rôle : un tank frappe le sol, un assassin traverse, un tireur
  // envoie une volée, un soutien bénit, un mage effondre.
  if (role === 'Tank') return 'slam';
  if (role === 'Assassin') return 'dash';
  if (role === 'Tireur') return 'storm';
  if (role === 'Soutien') return 'bless';
  if (role === 'Mage') return 'void';
  return 'line';
}

export interface UltStyleDef {
  id: UltStyle;
  letter: string;
  name: string;
  tag: string;
  desc: string;
  /** Durée totale de la scène, en millisecondes. */
  ms: number;
}

export const ULT_STYLES: readonly UltStyleDef[] = [
  {
    id: 'cinema', letter: 'A', name: 'Cinéma', tag: 'Anime / Epic Seven',
    desc: 'Le temps se fige, les couleurs partent, deux barres noires claquent. Le nom tombe lettre par lettre. Flash, négatif, coup de lame.',
    ms: 1500,
  },
  {
    id: 'comics', letter: 'B', name: 'Comics', tag: 'Persona / Into the Spider-Verse',
    desc: 'Trames de points, cases découpées au couteau, lignes de vitesse noires, onomatopée géante. Le héros sort de son cadre.',
    ms: 1320,
  },
  {
    id: 'rituel', letter: 'C', name: 'Rituel', tag: 'Elden Ring / Dark Souls',
    desc: 'Tout devient noir, seule la couleur du héros survit. Le sceau se grave, les particules montent, la caméra tourne. Long silence, puis choc.',
    ms: 1900,
  },
  {
    id: 'holo', letter: 'D', name: 'Holographique', tag: 'Cyberpunk / Arknights',
    desc: 'Scanlines, glitch, grille 3D au sol, réticule. Le héros se recompose en blocs de pixels, néons sur la silhouette.',
    ms: 1420,
  },
];

const STYLE_KEY = 'legendes-ult-style';

/** Style choisi par le joueur (Cinéma par défaut). */
export function getUltStyle(): UltStyle {
  try {
    const v = localStorage.getItem(STYLE_KEY) as UltStyle | null;
    if (v && ULT_STYLES.some((s) => s.id === v)) return v;
  } catch { /* stockage indisponible : on garde le défaut */ }
  return 'cinema';
}

export function setUltStyle(s: UltStyle): void {
  try { localStorage.setItem(STYLE_KEY, s); } catch { /* ignoré */ }
}

const GLYPHS: Record<Motif, string> = {
  blade: '⚔', void: '◌', grave: '☩', moon: '☾', bell: '♪', frost: '❄', forge: '⚒', thorn: '❦',
  flame: '▲', storm: '⚡', stone: '⬢', iron: '✂', choir: '♫', sun: '☀', gear: '⚙', wall: '▣',
};

export interface UltData {
  /** Identifiant du héros (sert à retrouver son illustration d'ultime). */
  id: string;
  /** Nom de l'ultime (« Serment de Cendre »…). */
  name: string;
  hero: string;
  title: string;
  phrase: string;
  /** Couleur du héros, en CSS. */
  css: string;
  art: string;
  portrait: string;
  /** Rôle : sert aux variantes de mise en scène (Tank, Assassin, Mage…). */
  role: string;
  glyph: string;
  /** Deuxième couleur, pour les dégradés (classe). */
  css2: string;
  /** Famille d'action de l'ultime (raconte ce qu'il fait). */
  arch: Archetype;
  /** Nom court de la famille, pour l'affichage. */
  archLabel: string;
}

const SECOND: Record<string, string> = {
  Tank: '#ffb454', Guerrier: '#ff6a4a', Assassin: '#c2183c', Mage: '#a06bff', Tireur: '#6ad8ff', Soutien: '#ffd36a',
};

export function ultDataOf(h: HeroDef): UltData {
  const sig = signatureOf(h);
  const arch = archetypeOf(h.abilities.ultimate.text, h.role, h.id);
  return {
    id: h.id,
    arch,
    archLabel: ARCHETYPES.find((a) => a.id === arch)?.label ?? '',
    name: h.abilities.ultimate.name,
    hero: h.name,
    title: h.title,
    phrase: sig.phrase,
    css: h.css,
    css2: SECOND[h.role] ?? '#ffd36a',
    art: ART[h.texture],
    portrait: PORTRAITS[h.id],
    role: h.role,
    glyph: GLYPHS[sig.motif],
  };
}

/** Découpe un titre en lettres animables (les espaces restent des espaces). */
function letters(s: string): string {
  return s
    .split('')
    .map((ch, i) => (ch === ' '
      ? `<i class="ult-sp" style="--i:${i}">&nbsp;</i>`
      : `<i style="--i:${i}">${ch.replace('<', '&lt;')}</i>`))
    .join('');
}

const esc = (s: string): string => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;');
const roleClass = (d: UltData): string => `role-${d.role.toLowerCase().replace(/[^a-z]/g, '')}`;
const varz = (d: UltData): string => `--c:${d.css};--c2:${d.css2}`;

/** Le HTML complet d'une cinématique, prêt à insérer dans un conteneur. */
export function ultHTML(style: UltStyle, d: UltData): string {
  const rc = roleClass(d);
  const v = varz(d);

  if (style === 'comics') {
    return `<div class="ult ub ${rc}" style="${v}">
      <div class="ub-paper"></div>
      <div class="ub-burst">${'<i></i>'.repeat(14)}</div>
      <div class="ub-speed">${'<i></i>'.repeat(7)}</div>
      <div class="ub-panel"><img src="${d.art}" alt="" draggable="false"/></div>
      <div class="ub-dots"></div>
      <div class="ub-stripe"></div>
      <div class="ub-tag">ULTIME</div>
      <div class="ub-name">${esc(d.name)}</div>
      <div class="ub-sub"><b>${esc(d.hero)}</b> · ${esc(d.phrase)}</div>
      <div class="ub-bang">!</div>
      <div class="ub-impact"></div>
    </div>`;
  }

  if (style === 'rituel') {
    return `<div class="ult ur ${rc}" style="${v}">
      <div class="ur-void"></div>
      <div class="ur-seal">${d.glyph}</div>
      <div class="ur-rings">${'<i></i>'.repeat(3)}</div>
      <div class="ur-motes">${'<i></i>'.repeat(20)}</div>
      <div class="ur-art"><img src="${d.art}" alt="" draggable="false"/></div>
      <div class="ur-glyphsmoke"></div>
      <div class="ur-cap">
        <small>Ultime</small>
        <b>${letters(d.name)}</b>
        <span>${esc(d.hero)} · ${esc(d.title)}</span>
        <em>${esc(d.phrase)}</em>
      </div>
      <div class="ur-core"></div>
      <div class="ur-flash"></div>
      <div class="ur-out"></div>
    </div>`;
  }

  if (style === 'holo') {
    return `<div class="ult uh ${rc}" style="${v}">
      <div class="uh-grid"></div>
      <div class="uh-scan"></div>
      <div class="uh-art"><img src="${d.art}" alt="" draggable="false"/></div>
      <div class="uh-blocks">${'<i></i>'.repeat(26)}</div>
      <div class="uh-brackets"><i></i><i></i><i></i><i></i></div>
      <div class="uh-reticle"></div>
      <div class="uh-cap">
        <small>SYS.ULT // ${d.role.toUpperCase()} // ${d.glyph}</small>
        <b data-ghost="${esc(d.name)}">${letters(d.name)}</b>
        <span>${esc(d.hero)} · ${esc(d.title)}</span>
        <em>${esc(d.phrase)}</em>
      </div>
      <div class="uh-glitch"></div>
      <div class="uh-flash"></div>
    </div>`;
  }

  // cinéma (par défaut)
  return `<div class="ult ua ${rc}" style="${v}">
    <div class="ua-wash"></div>
    <div class="ua-seal">${d.glyph}</div>
    <div class="ua-rays">${'<i></i>'.repeat(10)}</div>
    <div class="ua-art"><img src="${d.art}" alt="" draggable="false"/></div>
    <div class="ua-shade"></div>
    <div class="ua-cap">
      <small>Ultime</small>
      <b>${letters(d.name)}</b>
      <span>${esc(d.hero)} · ${esc(d.title)}</span>
      <em>${esc(d.phrase)}</em>
    </div>
    <div class="ua-speed">${'<i></i>'.repeat(9)}</div>
    <div class="ua-slash"></div>
    <div class="ua-bars"><i></i><i></i></div>
    <div class="ua-flash"></div>
    <div class="ua-neg"></div>
  </div>`;
}

export const ultDuration = (style: UltStyle): number =>
  ULT_STYLES.find((s) => s.id === style)?.ms ?? 1500;
