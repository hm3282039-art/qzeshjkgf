import { Texture } from 'pixi.js';
import skyUrl from './assets/sky.webp';
import cityUrl from './assets/city.webp';
import crystalUrl from './assets/crystal.webp';
import cultistUrl from './assets/npc_cultist.webp';
import guardUrl from './assets/npc_guard.webp';
import smithUrl from './assets/npc_smith.webp';
import catUrl from './assets/npc_cat.webp';
import battleBgUrl from './assets/battle_bg.webp';
import kaelUrl from './assets/hero_kael.webp';
import lyraUrl from './assets/hero_lyra.webp';
import morwenUrl from './assets/hero_morwen.webp';
import serenUrl from './assets/hero_seren.webp';
import aldricUrl from './assets/hero_aldric.webp';
import ghoulUrl from './assets/enemy_ghoul.webp';
import skeletonUrl from './assets/enemy_skeleton.webp';
import wardenUrl from './assets/enemy_boneknight.webp';
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
  hero_thorne: Texture;
  hero_nyx: Texture;
  hero_ashka: Texture;
  enemy_drowned: Texture;
  enemy_witch: Texture;
  enemy_queen: Texture;
  hero_vaelen: Texture;
  hero_sylvaine: Texture;
  hero_pyrrha: Texture;
  hero_kael: Texture;
  hero_lyra: Texture;
  hero_morwen: Texture;
  hero_seren: Texture;
  hero_aldric: Texture;
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
};

/** Décor du chapitre 1 (fond de la carte de campagne). */
export const CHAPTER1_BG = battleBgUrl;

/** Fond de chaque décor de combat (vignettes de la campagne). */
export const SCENE_BG: Record<SceneId, string> = { gallows: battleBgUrl, swamp: swampBgUrl };

export const PORTRAITS: Record<string, string> = {
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
};

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.decoding = 'async';
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`Impossible de charger ${url.slice(0, 60)}`));
    img.src = url;
  });
}

/**
 * Charge les images via <img> (compatible file:// et images intégrées en base64),
 * puis les convertit en textures Pixi.
 */
export async function loadAssets(onProgress: (ratio: number) => void): Promise<GameTextures> {
  const entries = Object.entries(MANIFEST) as [keyof GameTextures, string][];
  let done = 0;
  const loaded = await Promise.all(
    entries.map(async ([key, url]) => {
      const img = await loadImage(url);
      if (img.decode) await img.decode().catch(() => undefined);
      done++;
      onProgress(done / entries.length);
      return [key, Texture.from(img)] as const;
    }),
  );
  return Object.fromEntries(loaded) as unknown as GameTextures;
}
