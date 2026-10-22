# Légendes de la Tour Infinie

Jeu web dark fantasy en 2.5D — **PixiJS + TypeScript + Vite**.

## ▶️ Jouer

### En ligne (aucune installation)
**https://hm3282039-art.github.io/qzeshjkgf/**

Ouvre le lien, appuie sur **`Entrée`** pour le plein écran.
Fonctionne sur PC, tablette et téléphone.

### En local
```bash
cd game
npm install
npm run dev          # → http://localhost:5173
```

## 🛠️ Développement

```bash
cd game
npm run dev          # serveur de développement (rechargement à chaud)
npm run build        # produit dist/index.html (un seul fichier autonome)
npm run typecheck    # vérification TypeScript stricte
npm test             # 360 combats simulés : crashs, NaN, blocages
npm run test:balance   # équilibrage de l'équipe par défaut
npm run test:niveaux   # paliers de compétence et progression
```

## 🚀 Publier une mise à jour

```bash
./deploy.sh "ce qui a changé"
```

Le script compile, vérifie les types, puis pousse sur la branche `gh-pages`.
Le jeu est en ligne 1 à 2 minutes plus tard.

## 📁 Structure

```
game/
├── src/
│   ├── battle/     combat : simulation pure (Sim.ts) + rendu (BattleScene)
│   ├── scene/      hub 2.5D de Cendrebourg
│   ├── ui/         interface, héros, invocation, formation
│   ├── fx/         effets et textures procédurales
│   ├── data/       héros, ennemis, niveaux, répliques
│   └── state/      sauvegarde, niveaux, progression
└── tests/          bancs de test headless du combat
```

## ✅ État

- 11 héros jouables, 2 niveaux de campagne
- Système de niveaux **sans plafond** : +25 % de compétence tous les 10 niveaux
- Compilation **0 erreur** en mode strict, build en ~6 s
- 360 combats simulés : 0 crash, 0 NaN, 0 blocage

## 📖 Documentation

- [`docs/strategie-128mb.md`](docs/strategie-128mb.md) — tenir dans la limite de taille
- [`docs/mise-a-jour-heros.md`](docs/mise-a-jour-heros.md) — 3 héros + système de niveaux
- [`docs/rapport-de-test.md`](docs/rapport-de-test.md) — audit du combat et équilibrage
- [`docs/audit-legende-tour-infinie.md`](docs/audit-legende-tour-infinie.md) — audit du projet
