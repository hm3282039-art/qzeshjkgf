import { defineConfig } from 'vite';

/**
 * `base` doit correspondre au chemin où le jeu est servi.
 *  - développement / aperçu local (racine)          → '/'
 *  - GitHub Pages sur le dépôt "loll"               → '/loll/'
 * On peut forcer la valeur avec la variable d'environnement VITE_BASE :
 *   VITE_BASE=/loll/ npm run build
 */
const base = process.env.VITE_BASE || '/';

export default defineConfig({
  base,
  root: '.',
  publicDir: 'assets',
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    rollupOptions: {
      input: {
        main: './index.html'
      }
    },
    minify: 'terser',
    sourcemap: true
  },
  server: {
    // Important pour l'aperçu en ligne : écouter sur toutes les interfaces
    // et accepter n'importe quel nom d'hôte (proxy, tunnel, domaine externe).
    host: '0.0.0.0',
    port: 3000,
    strictPort: false,
    open: false,
    allowedHosts: true
  },
  preview: {
    host: '0.0.0.0',
    port: 4173,
    open: false,
    allowedHosts: true
  }
});
