import { defineConfig } from 'vite';
import { viteSingleFile } from 'vite-plugin-singlefile';

/**
 * Le build produit UN SEUL fichier HTML (images, polices et code inclus).
 *
 * Pourquoi ce choix plutôt que des fichiers séparés : GitHub Pages a refusé de
 * construire le site quand il contenait 146 fichiers (build bloqué puis en
 * erreur). Le fichier unique, lui, se publie en moins d'une minute à chaque
 * fois. On garde donc ce format : c'est le seul qui soit fiable ici.
 *
 * `viteSingleFile` conserve les polices et les images en base64, ce qui rend
 * aussi le fichier jouable hors connexion (double-clic sur l'index.html).
 */
export default defineConfig({
  base: './',
  plugins: [viteSingleFile()],
  server: { host: '0.0.0.0', port: 5173, allowedHosts: true },
  preview: { host: '0.0.0.0', port: 4173, allowedHosts: true },
  build: {
    target: 'es2022',
    assetsInlineLimit: 100_000_000,
    chunkSizeWarningLimit: 10_000,
  },
});
