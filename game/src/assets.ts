import { Texture } from 'pixi.js';
import phHeroUrl from './assets/ph_hero.webp';
import phPortraitUrl from './assets/ph_portrait.webp';

/**
 * Les persos sont (re)créés UN PAR UN : tout fichier manquant retombe sur une
 * silhouette « à créer », et `HERO_ART_DONE` dit lesquels ont déjà leur vrai dessin.
 */
const heroMods = import.meta.glob('./assets/hero_*.webp', { eager: true, query: '?url', import: 'default' }) as Record<string, string>;
const portraitMods = import.meta.glob('./assets/portrait_*.webp', { eager: true, query: '?url', import: 'default' }) as Record<string, string>;
const heroUrlOf = (id: string): string => heroMods[`./assets/hero_${id}.webp`] ?? phHeroUrl;
const portraitUrlOf = (id: string): string => portraitMods[`./assets/portrait_${id}.webp`] ?? phPortraitUrl;
export const HERO_ART_DONE: Record<string, boolean> = {};
for (const k of Object.keys(heroMods)) {
  const m = k.match(/hero_([a-z]+)\.webp$/);
  if (m) HERO_ART_DONE[m[1]!] = true;
}
import skyUrl from './assets/sky.webp';
import cityUrl from './assets/city.webp';
import crystalUrl from './assets/crystal.webp';
import cultistUrl from './assets/npc_cultist.webp';
import guardUrl from './assets/npc_guard.webp';
import smithUrl from './assets/npc_smith.webp';
import catUrl from './assets/npc_cat.webp';
import battleBgUrl from './assets/battle_bg.webp';
import gearWeaponUrl from './assets/gear/weapon_sword.webp';
import gearArmorUrl from './assets/gear/armor_chest.webp';
import gearHelmUrl from './assets/gear/helm_full.webp';
import gearBootsUrl from './assets/gear/boots_pair.webp';
import bgCitadelUrl from './assets/bg_shattered_citadel.webp';
import bgThroneUrl from './assets/bg_ashen_throne.webp';
import ghoulUrl from './assets/enemy_ghoul.webp';
import skeletonUrl from './assets/enemy_skeleton.webp';
import wardenUrl from './assets/enemy_boneknight.webp';
import drownedUrl from './assets/enemy_drowned.webp';
import witchUrl from './assets/enemy_witch.webp';
import queenUrl from './assets/enemy_queen.webp';
import swampBgUrl from './assets/battle_bg_swamp.webp';
import type { SceneId, TextureKey } from './data/heroes';

import sqKael0Url from './assets/seq_kael_0.webp';
import sqKael1Url from './assets/seq_kael_1.webp';
import sqKael2Url from './assets/seq_kael_2.webp';
import sqKael3Url from './assets/seq_kael_3.webp';
import sqLyra0Url from './assets/seq_lyra_0.webp';
import sqLyra1Url from './assets/seq_lyra_1.webp';
import sqLyra2Url from './assets/seq_lyra_2.webp';
import sqLyra3Url from './assets/seq_lyra_3.webp';
import sqMorwen0Url from './assets/seq_morwen_0.webp';
import sqMorwen1Url from './assets/seq_morwen_1.webp';
import sqMorwen2Url from './assets/seq_morwen_2.webp';
import sqMorwen3Url from './assets/seq_morwen_3.webp';
import sqSeren0Url from './assets/seq_seren_0.webp';
import sqSeren1Url from './assets/seq_seren_1.webp';
import sqSeren2Url from './assets/seq_seren_2.webp';
import sqSeren3Url from './assets/seq_seren_3.webp';
import sqAldric0Url from './assets/seq_aldric_0.webp';
import sqAldric1Url from './assets/seq_aldric_1.webp';
import sqAldric2Url from './assets/seq_aldric_2.webp';
import sqAldric3Url from './assets/seq_aldric_3.webp';
import sqThorne0Url from './assets/seq_thorne_0.webp';
import sqThorne1Url from './assets/seq_thorne_1.webp';
import sqThorne2Url from './assets/seq_thorne_2.webp';
import sqThorne3Url from './assets/seq_thorne_3.webp';
import sqNyx0Url from './assets/seq_nyx_0.webp';
import sqNyx1Url from './assets/seq_nyx_1.webp';
import sqNyx2Url from './assets/seq_nyx_2.webp';
import sqNyx3Url from './assets/seq_nyx_3.webp';
import sqAshka0Url from './assets/seq_ashka_0.webp';
import sqAshka1Url from './assets/seq_ashka_1.webp';
import sqAshka2Url from './assets/seq_ashka_2.webp';
import sqAshka3Url from './assets/seq_ashka_3.webp';
import sqVaelen0Url from './assets/seq_vaelen_0.webp';
import sqVaelen1Url from './assets/seq_vaelen_1.webp';
import sqVaelen2Url from './assets/seq_vaelen_2.webp';
import sqVaelen3Url from './assets/seq_vaelen_3.webp';
import sqSylvaine0Url from './assets/seq_sylvaine_0.webp';
import sqSylvaine1Url from './assets/seq_sylvaine_1.webp';
import sqSylvaine2Url from './assets/seq_sylvaine_2.webp';
import sqSylvaine3Url from './assets/seq_sylvaine_3.webp';

import ultKaelUrl from './assets/ult_kael.webp';
import ultLyraUrl from './assets/ult_lyra.webp';
import ultMorwenUrl from './assets/ult_morwen.webp';
import ultSerenUrl from './assets/ult_seren.webp';
import ultAldricUrl from './assets/ult_aldric.webp';
import ultThorneUrl from './assets/ult_thorne.webp';
import ultNyxUrl from './assets/ult_nyx.webp';
import ultAshkaUrl from './assets/ult_ashka.webp';
import ultVaelenUrl from './assets/ult_vaelen.webp';
import ultSylvaineUrl from './assets/ult_sylvaine.webp';


export interface GameTextures {
  sky: Texture;
  city: Texture;
  crystal: Texture;
  cultist: Texture;
  guard: Texture;
  smith: Texture;
  cat: Texture;
  battle_bg: Texture;
  battle_bg_swamp: Texture;
  bg_citadel: Texture;
  bg_throne: Texture;
  hero_thorne: Texture;
  hero_nyx: Texture;
  hero_ashka: Texture;
  enemy_drowned: Texture;
  enemy_witch: Texture;
  enemy_queen: Texture;
  hero_vaelen: Texture;
  hero_sylvaine: Texture;
  hero_pyrrha: Texture;
  hero_orlan: Texture;
  hero_vespera: Texture;
  hero_gorm: Texture;
  hero_kael: Texture;
  hero_lyra: Texture;
  hero_morwen: Texture;
  hero_seren: Texture;
  hero_aldric: Texture;
  hero_mira: Texture;
  hero_corvin: Texture;
  hero_elara: Texture;
  hero_bran: Texture;
  hero_nell: Texture;
  hero_oskar: Texture;
  hero_sable: Texture;
  hero_ilse: Texture;
  hero_rook: Texture;
  hero_vesper: Texture;
  hero_noktis: Texture;
  hero_aurore: Texture;
  hero_zephyr: Texture;
  enemy_ghoul: Texture;
  enemy_skeleton: Texture;
  enemy_boneknight: Texture;
}

const MANIFEST: Record<keyof GameTextures, string> = {
  sky: skyUrl,
  city: cityUrl,
  crystal: crystalUrl,
  cultist: cultistUrl,
  guard: guardUrl,
  smith: smithUrl,
  cat: catUrl,
  battle_bg: battleBgUrl,
  battle_bg_swamp: swampBgUrl,
  bg_citadel: bgCitadelUrl,
  bg_throne: bgThroneUrl,
  hero_thorne: heroUrlOf('thorne'),
  hero_nyx: heroUrlOf('nyx'),
  hero_ashka: heroUrlOf('ashka'),
  enemy_drowned: drownedUrl,
  enemy_witch: witchUrl,
  enemy_queen: queenUrl,
  hero_vaelen: heroUrlOf('vaelen'),
  hero_sylvaine: heroUrlOf('sylvaine'),
  hero_pyrrha: heroUrlOf('pyrrha'),
  hero_kael: heroUrlOf('kael'),
  hero_lyra: heroUrlOf('lyra'),
  hero_morwen: heroUrlOf('morwen'),
  hero_seren: heroUrlOf('seren'),
  hero_aldric: heroUrlOf('aldric'),
  enemy_ghoul: ghoulUrl,
  enemy_skeleton: skeletonUrl,
  enemy_boneknight: wardenUrl,
  hero_orlan: heroUrlOf('orlan'),
  hero_vespera: heroUrlOf('vespera'),
  hero_gorm: heroUrlOf('gorm'),
  hero_mira: heroUrlOf('mira'),
  hero_corvin: heroUrlOf('corvin'),
  hero_elara: heroUrlOf('elara'),
  hero_bran: heroUrlOf('bran'),
  hero_nell: heroUrlOf('nell'),
  hero_oskar: heroUrlOf('oskar'),
  hero_sable: heroUrlOf('sable'),
  hero_ilse: heroUrlOf('ilse'),
  hero_rook: heroUrlOf('rook'),
  hero_vesper: heroUrlOf('vesper'),
  hero_noktis: heroUrlOf('noktis'),
  hero_aurore: heroUrlOf('aurore'),
  hero_zephyr: heroUrlOf('zephyr'),
};

/** Adresses des illustrations utilisées par l'interface HTML (fiches de héros, cartes de combat). */

export const ART: Record<TextureKey, string> = {
  hero_kael: heroUrlOf('kael'),
  hero_lyra: heroUrlOf('lyra'),
  hero_morwen: heroUrlOf('morwen'),
  hero_seren: heroUrlOf('seren'),
  hero_aldric: heroUrlOf('aldric'),
  enemy_ghoul: ghoulUrl,
  enemy_skeleton: skeletonUrl,
  enemy_boneknight: wardenUrl,
  hero_thorne: heroUrlOf('thorne'),
  hero_nyx: heroUrlOf('nyx'),
  hero_ashka: heroUrlOf('ashka'),
  enemy_drowned: drownedUrl,
  enemy_witch: witchUrl,
  enemy_queen: queenUrl,
  hero_vaelen: heroUrlOf('vaelen'),
  hero_sylvaine: heroUrlOf('sylvaine'),
  hero_pyrrha: heroUrlOf('pyrrha'),
  hero_orlan: heroUrlOf('orlan'),
  hero_vespera: heroUrlOf('vespera'),
  hero_gorm: heroUrlOf('gorm'),
  hero_mira: heroUrlOf('mira'),
  hero_corvin: heroUrlOf('corvin'),
  hero_elara: heroUrlOf('elara'),
  hero_bran: heroUrlOf('bran'),
  hero_nell: heroUrlOf('nell'),
  hero_oskar: heroUrlOf('oskar'),
  hero_sable: heroUrlOf('sable'),
  hero_ilse: heroUrlOf('ilse'),
  hero_rook: heroUrlOf('rook'),
  hero_vesper: heroUrlOf('vesper'),
  hero_noktis: heroUrlOf('noktis'),
  hero_aurore: heroUrlOf('aurore'),
  hero_zephyr: heroUrlOf('zephyr'),
};

/** Décor du chapitre 1 (fond de la carte de campagne). */

/** Fond de chaque décor de combat (vignettes de la campagne). */
export const SCENE_BG: Record<SceneId, string> = {
  gallows: battleBgUrl,
  swamp: swampBgUrl,
  citadel: bgCitadelUrl,
  throne: bgThroneUrl,
};

/** Illustration de chaque pièce d'équipement (peinte dans le style des héros). */
export const GEAR_ART: Record<'weapon' | 'armor' | 'helm' | 'boots', string> = {
  weapon: gearWeaponUrl,
  armor: gearArmorUrl,
  helm: gearHelmUrl,
  boots: gearBootsUrl,
};

export const PORTRAITS: Record<string, string> = {
  orlan: portraitUrlOf('orlan'),
  vespera: portraitUrlOf('vespera'),
  gorm: portraitUrlOf('gorm'),
  kael: portraitUrlOf('kael'),
  lyra: portraitUrlOf('lyra'),
  morwen: portraitUrlOf('morwen'),
  seren: portraitUrlOf('seren'),
  aldric: portraitUrlOf('aldric'),
  thorne: portraitUrlOf('thorne'),
  nyx: portraitUrlOf('nyx'),
  ashka: portraitUrlOf('ashka'),
  vaelen: portraitUrlOf('vaelen'),
  sylvaine: portraitUrlOf('sylvaine'),
  pyrrha: portraitUrlOf('pyrrha'),
  mira: portraitUrlOf('mira'),
  corvin: portraitUrlOf('corvin'),
  elara: portraitUrlOf('elara'),
  bran: portraitUrlOf('bran'),
  nell: portraitUrlOf('nell'),
  oskar: portraitUrlOf('oskar'),
  sable: portraitUrlOf('sable'),
  ilse: portraitUrlOf('ilse'),
  rook: portraitUrlOf('rook'),
  vesper: portraitUrlOf('vesper'),
  noktis: portraitUrlOf('noktis'),
  aurore: portraitUrlOf('aurore'),
  zephyr: portraitUrlOf('zephyr'),

};

function loadImage(url: string, timeoutMs = 12000): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const timer = window.setTimeout(() => reject(new Error('délai dépassé')), timeoutMs);
    img.decoding = 'async';
    img.onload = () => { window.clearTimeout(timer); resolve(img); };
    img.onerror = () => { window.clearTimeout(timer); reject(new Error(`Impossible de charger ${url.slice(0, 40)}`)); };
    img.src = url;
  });
}

/** Texture de secours (petit carré violet) : une image cassée ne doit jamais bloquer le jeu. */
function placeholderTexture(): Texture {
  const c = document.createElement('canvas');
  c.width = c.height = 8;
  const ctx = c.getContext('2d');
  if (ctx) { ctx.fillStyle = '#2a1747'; ctx.fillRect(0, 0, 8, 8); }
  return Texture.from(c);
}

export interface LoadResult {
  textures: GameTextures;
  /** Clés dont l'image n'a pas pu être chargée (remplacées par une texture de secours). */
  failed: string[];
}

/**
 * Charge les images via <img> (compatible file:// et images intégrées en base64),
 * puis les convertit en textures Pixi.
 *
 * Robuste par construction : chaque image a un délai maximum, les échecs sont
 * comptés et remplacés par une texture de secours. Une seule image cassée ne
 * peut donc plus laisser le jeu bloqué sur l'écran de chargement.
 */
export async function loadAssets(
  onProgress: (ratio: number, done: number, total: number) => void,
): Promise<LoadResult> {
  const entries = Object.entries(MANIFEST) as [keyof GameTextures, string][];
  let done = 0;
  const failed: string[] = [];
  const loaded = await Promise.all(
    entries.map(async ([key, url]) => {
      let texture: Texture;
      try {
        const img = await loadImage(url);
        if (img.decode) await img.decode().catch(() => undefined);
        texture = Texture.from(img);
      } catch (err) {
        failed.push(key);
        console.warn('[assets] image ignorée :', key, err);
        texture = placeholderTexture();
      }
      done++;
      onProgress(done / entries.length, done, entries.length);
      return [key, texture] as const;
    }),
  );
  return { textures: Object.fromEntries(loaded) as unknown as GameTextures, failed };
}

/**
 * Illustrations d'ultime : une vraie image dessinée pour le moment où le héros
 * lâche son ultime (plan large, pose dynamique). Elles n'existent pas encore
 * pour tout le casting : `undefined` = on retombe sur l'animation d'origine.
 */
export const ULT_ART: Partial<Record<string, string>> = {
  kael: ultKaelUrl,
  lyra: ultLyraUrl,
  morwen: ultMorwenUrl,
  seren: ultSerenUrl,
  aldric: ultAldricUrl,
  thorne: ultThorneUrl,
  nyx: ultNyxUrl,
  ashka: ultAshkaUrl,
  vaelen: ultVaelenUrl,
  sylvaine: ultSylvaineUrl,
};

/**
 * LES IMAGES DE L'ULTIME — quatre dessins par héros, joués l'un après l'autre
 * comme un dessin animé (l'animateur dessine le mouvement, le jeu le déroule).
 * Le fond de chaque dessin est noir : à l'écran, le mode « screen » le fait
 * disparaître, comme une pellicule transparente.
 */
export const ULT_FRAMES: Partial<Record<string, string[]>> = {
  kael: [sqKael0Url, sqKael1Url, sqKael2Url, sqKael3Url],
  lyra: [sqLyra0Url, sqLyra1Url, sqLyra2Url, sqLyra3Url],
  morwen: [sqMorwen0Url, sqMorwen1Url, sqMorwen2Url, sqMorwen3Url],
  seren: [sqSeren0Url, sqSeren1Url, sqSeren2Url, sqSeren3Url],
  aldric: [sqAldric0Url, sqAldric1Url, sqAldric2Url, sqAldric3Url],
  thorne: [sqThorne0Url, sqThorne1Url, sqThorne2Url, sqThorne3Url],
  nyx: [sqNyx0Url, sqNyx1Url, sqNyx2Url, sqNyx3Url],
  ashka: [sqAshka0Url, sqAshka1Url, sqAshka2Url, sqAshka3Url],
  vaelen: [sqVaelen0Url, sqVaelen1Url, sqVaelen2Url, sqVaelen3Url],
  sylvaine: [sqSylvaine0Url, sqSylvaine1Url, sqSylvaine2Url, sqSylvaine3Url],
};
/**
 * Icônes de capacité PEINTES (façon Epic Seven) : 4 par héros quand elles existent
 * (`skill_<heros>_0..3.webp`), sinon la barre du bas retombe sur les sceaux SVG.
 */
const skillArtMods = import.meta.glob('./assets/skill_*.webp', { eager: true, query: '?url', import: 'default' }) as Record<string, string>;
export const SKILL_ART: Record<string, string[]> = {};
for (const [chemin, url] of Object.entries(skillArtMods)) {
  const m = chemin.match(/skill_([a-z]+)_(\d)\.webp$/);
  if (!m) continue;
  const liste = (SKILL_ART[m[1]!] ??= []);
  liste[Number(m[2])] = url;
}
