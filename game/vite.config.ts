import { defineConfig } from 'vite';

/**
 * Build "multi-fichiers" : le HTML reste léger (code + styles) et les images /
 * polices sont servies à côté, dans `assets/`.
 *
 * Pourquoi ce choix : un fichier unique de 13 Mo obligeait le navigateur à
 * télécharger ET décoder 13 Mo avant le premier pixel, et à garder tout le
 * base64 en mémoire. Résultat : sur un téléphone ou une machine modeste, le
 * chargement pouvait rester bloqué. En séparant, la page s'affiche tout de
 * suite, les images arrivent en parallèle et restent en cache d'une visite à
 * l'autre.
 */
export default defineConfig({
  base: './',
  server: { host: '0.0.0.0', port: 5173, allowedHosts: true },
  preview: { host: '0.0.0.0', port: 4173, allowedHosts: true },
  build: {
    target: 'es2022',
    assetsInlineLimit: 0,
    chunkSizeWarningLimit: 10_000,
  },
});
