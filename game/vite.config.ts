import { defineConfig } from 'vite';
import { viteSingleFile } from 'vite-plugin-singlefile';

/**
 * Le build produit UN SEUL fichier HTML (images, polices et code inclus)
 * → il suffit de double-cliquer sur dist/index.html pour jouer, sans serveur.
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
