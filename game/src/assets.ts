import { Texture } from 'pixi.js';
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
import orlanUrl from './assets/hero_orlan.webp';
import vesperaUrl from './assets/hero_vespera.webp';
import gormUrl from './assets/hero_gorm.webp';
import kaelUrl from './assets/hero_kael.webp';
import lyraUrl from './assets/hero_lyra.webp';
import morwenUrl from './assets/hero_morwen.webp';
import serenUrl from './assets/hero_seren.webp';
import aldricUrl from './assets/hero_aldric.webp';
import ghoulUrl from './assets/enemy_ghoul.webp';
import skeletonUrl from './assets/enemy_skeleton.webp';
import wardenUrl from './assets/enemy_boneknight.webp';
import pOrlanUrl from './assets/portrait_orlan.webp';
import pVesperaUrl from './assets/portrait_vespera.webp';
import pGormUrl from './assets/portrait_gorm.webp';
import pKaelUrl from './assets/portrait_kael.webp';
import pLyraUrl from './assets/portrait_lyra.webp';
import pMorwenUrl from './assets/portrait_morwen.webp';
import pSerenUrl from './assets/portrait_seren.webp';
import pAldricUrl from './assets/portrait_aldric.webp';
import thorneUrl from './assets/hero_thorne.webp';
import nyxUrl from './assets/hero_nyx.webp';
import ashkaUrl from './assets/hero_ashka.webp';
import drownedUrl from './assets/enemy_drowned.webp';
import witchUrl from './assets/enemy_witch.webp';
import queenUrl from './assets/enemy_queen.webp';
import vaelenUrl from './assets/hero_vaelen.webp';
import sylvaineUrl from './assets/hero_sylvaine.webp';
import pyrrhaUrl from './assets/hero_pyrrha.webp';
import pVaelenUrl from './assets/portrait_vaelen.webp';
import pSylvaineUrl from './assets/portrait_sylvaine.webp';
import pPyrrhaUrl from './assets/portrait_pyrrha.webp';
import swampBgUrl from './assets/battle_bg_swamp.webp';
import pThorneUrl from './assets/portrait_thorne.webp';
import pNyxUrl from './assets/portrait_nyx.webp';
import pAshkaUrl from './assets/portrait_ashka.webp';
import miraUrl from './assets/hero_mira.webp';
import corvinUrl from './assets/hero_corvin.webp';
import elaraUrl from './assets/hero_elara.webp';
import pMiraUrl from './assets/portrait_mira.webp';
import pCorvinUrl from './assets/portrait_corvin.webp';
import pElaraUrl from './assets/portrait_elara.webp';
import branUrl from './assets/hero_bran.webp';
import pBranUrl from './assets/portrait_bran.webp';
import nellUrl from './assets/hero_nell.webp';
import pNellUrl from './assets/portrait_nell.webp';
import oskarUrl from './assets/hero_oskar.webp';
import pOskarUrl from './assets/portrait_oskar.webp';
import sableUrl from './assets/hero_sable.webp';
import pSableUrl from './assets/portrait_sable.webp';
import ilseUrl from './assets/hero_ilse.webp';
import pIlseUrl from './assets/portrait_ilse.webp';
import rookUrl from './assets/hero_rook.webp';
import pRookUrl from './assets/portrait_rook.webp';
import vesperUrl from './assets/hero_vesper.webp';
import pVesperUrl from './assets/portrait_vesper.webp';
import noktisUrl from './assets/hero_noktis.webp';
import pNoktisUrl from './assets/portrait_noktis.webp';
import auroreUrl from './assets/hero_aurore.webp';
import pAuroreUrl from './assets/portrait_aurore.webp';
import zephyrUrl from './assets/hero_zephyr.webp';
import pZephyrUrl from './assets/portrait_zephyr.webp';
import type { SceneId, TextureKey } from './data/heroes';

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
  hero_thorne: thorneUrl,
  hero_nyx: nyxUrl,
  hero_ashka: ashkaUrl,
  enemy_drowned: drownedUrl,
  enemy_witch: witchUrl,
  enemy_queen: queenUrl,
  hero_vaelen: vaelenUrl,
  hero_sylvaine: sylvaineUrl,
  hero_pyrrha: pyrrhaUrl,
  hero_kael: kaelUrl,
  hero_lyra: lyraUrl,
  hero_morwen: morwenUrl,
  hero_seren: serenUrl,
  hero_aldric: aldricUrl,
  enemy_ghoul: ghoulUrl,
  enemy_skeleton: skeletonUrl,
  enemy_boneknight: wardenUrl,
  hero_orlan: orlanUrl,
  hero_vespera: vesperaUrl,
  hero_gorm: gormUrl,
  hero_mira: miraUrl,
  hero_corvin: corvinUrl,
  hero_elara: elaraUrl,
  hero_bran: branUrl,
  hero_nell: nellUrl,
  hero_oskar: oskarUrl,
  hero_sable: sableUrl,
  hero_ilse: ilseUrl,
  hero_rook: rookUrl,
  hero_vesper: vesperUrl,
  hero_noktis: noktisUrl,
  hero_aurore: auroreUrl,
  hero_zephyr: zephyrUrl,
};

/** Adresses des illustrations utilisées par l'interface HTML (fiches de héros, cartes de combat). */
export const ART: Record<TextureKey, string> = {
  hero_kael: kaelUrl,
  hero_lyra: lyraUrl,
  hero_morwen: morwenUrl,
  hero_seren: serenUrl,
  hero_aldric: aldricUrl,
  enemy_ghoul: ghoulUrl,
  enemy_skeleton: skeletonUrl,
  enemy_boneknight: wardenUrl,
  hero_thorne: thorneUrl,
  hero_nyx: nyxUrl,
  hero_ashka: ashkaUrl,
  enemy_drowned: drownedUrl,
  enemy_witch: witchUrl,
  enemy_queen: queenUrl,
  hero_vaelen: vaelenUrl,
  hero_sylvaine: sylvaineUrl,
  hero_pyrrha: pyrrhaUrl,
  hero_orlan: orlanUrl,
  hero_vespera: vesperaUrl,
  hero_gorm: gormUrl,
  hero_mira: miraUrl,
  hero_corvin: corvinUrl,
  hero_elara: elaraUrl,
  hero_bran: branUrl,
  hero_nell: nellUrl,
  hero_oskar: oskarUrl,
  hero_sable: sableUrl,
  hero_ilse: ilseUrl,
  hero_rook: rookUrl,
  hero_vesper: vesperUrl,
  hero_noktis: noktisUrl,
  hero_aurore: auroreUrl,
  hero_zephyr: zephyrUrl,
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
  orlan: pOrlanUrl,
  vespera: pVesperaUrl,
  gorm: pGormUrl,
  kael: pKaelUrl,
  lyra: pLyraUrl,
  morwen: pMorwenUrl,
  seren: pSerenUrl,
  aldric: pAldricUrl,
  thorne: pThorneUrl,
  nyx: pNyxUrl,
  ashka: pAshkaUrl,
  vaelen: pVaelenUrl,
  sylvaine: pSylvaineUrl,
  pyrrha: pPyrrhaUrl,
  mira: pMiraUrl,
  corvin: pCorvinUrl,
  elara: pElaraUrl,
  bran: pBranUrl,
  nell: pNellUrl,
  oskar: pOskarUrl,
  sable: pSableUrl,
  ilse: pIlseUrl,
  rook: pRookUrl,
  vesper: pVesperUrl,
  noktis: pNoktisUrl,
  aurore: pAuroreUrl,
  zephyr: pZephyrUrl,

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
