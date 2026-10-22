/**
 * Loader d'assets à la demande (vanilla ESM, zéro dépendance).
 *
 * Principe : le repo contient ce fichier + `manifest.json` (quelques Ko).
 * Les octets des assets vivent sur un CDN. On ne télécharge qu'un bundle
 * à la fois, au moment où l'écran qui en a besoin se charge.
 *
 * Usage :
 *   import { loadManifest, loadBundle, preload } from './assets/loader.js';
 *   const manifest = await loadManifest('/assets/manifest.json');
 *   const menu = await loadBundle(manifest, 'menu', p => console.log(p));
 */

/** Charge et valide le manifest. */
export async function loadManifest(url = '/assets/manifest.json') {
  const res = await fetch(url, { cache: 'no-cache' });
  if (!res.ok) throw new Error(`manifest introuvable (${res.status}): ${url}`);

  const manifest = await res.json();
  if (!manifest.base || !manifest.bundles) {
    throw new Error('manifest invalide : champs "base" et "bundles" requis');
  }
  return manifest;
}

/**
 * Télécharge tous les fichiers d'un bundle en parallèle.
 * @returns {Promise<Map<string, {url: string, blob: Blob, size: number}>>}
 */
export async function loadBundle(manifest, name, onProgress = () => {}) {
  const files = manifest.bundles[name];
  if (!files) throw new Error(`bundle inconnu : "${name}"`);

  const out = new Map();
  let done = 0;

  await Promise.all(
    files.map(async (file) => {
      const url = `${manifest.base}${file}?v=${manifest.version}`;
      const res = await fetch(url);
      if (!res.ok) throw new Error(`asset manquant (${res.status}) : ${url}`);

      const blob = await res.blob();
      out.set(file, {
        url: URL.createObjectURL(blob),
        blob,
        size: blob.size,
      });

      done += 1;
      onProgress(done / files.length, file);
    })
  );

  return out;
}

/** Précharge plusieurs bundles (utile entre deux niveaux, temps mort). */
export async function preload(manifest, names, onProgress = () => {}) {
  const results = new Map();
  for (const name of names) {
    results.set(name, await loadBundle(manifest, name, onProgress));
  }
  return results;
}

/** Libère la mémoire des blobs d'un bundle (changement de niveau). */
export function release(bundle) {
  for (const { url } of bundle.values()) URL.revokeObjectURL(url);
  bundle.clear();
}
