# Mon jeu web

Projet de jeu web — repo volontairement léger : **le code ici, les assets lourds sur un CDN.**

## Démarrer

```bash
npm install
npm run dev
```

## Règles du projet

1. Le repo ne contient que du texte (code, config, manifest) et des assets optimisés.
2. Pas de `node_modules/`, `dist/`, `build/`, ni sources `.psd` / `.blend` / `.wav` / `.fbx`.
3. Les assets sont décrits dans `public/assets/manifest.json` et servis depuis un CDN.
4. On charge par bundle (menu, niveau 1, niveau 2…) — jamais tout au démarrage.
5. Avant chaque grosse étape : `git count-objects -vH` pour surveiller la taille.

📖 Tout le détail de la stratégie : [`docs/strategie-128mb.md`](docs/strategie-128mb.md)

📦 Faire inspecter un projet existant et lourd : [`docs/partager-projet-existant.md`](docs/partager-projet-existant.md)

🐙 Mettre le projet sur GitHub pas à pas : [`docs/mettre-sur-github.md`](docs/mettre-sur-github.md)

🛡️ Vérifier le poids avant chaque push :
```bash
node scripts/check-taille.mjs --staged
```

## Structure

```
docs/strategie-128mb.md      # la stratégie anti-limite
public/assets/manifest.json  # description des assets (versionné)
src/assets/loader.js         # chargement à la demande depuis le CDN
```
