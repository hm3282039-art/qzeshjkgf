# Audit — Légendes de la Tour Infinie (v0.5)

> Repo : `hm3282039-art/mon-jeuxx` · 168 entrées · branche `main`
> Audit réalisé en clonant le repo, en installant les dépendances et en lançant le build complet.

---

## ✅ Verdict global

**Le projet est solide et il compile.** Ce n'est pas un prototype : c'est un jeu
structuré, en TypeScript strict, avec une vraie architecture.

```
npx tsc --noEmit   →  0 erreur   (mode strict, noUnusedLocals, noUnusedParameters)
npm run build      →  ✓ 978 modules transformés en 6,03 s
                      dist/index.html = 8,24 MB  (5,63 MB gzip)
```

| Métrique | Valeur |
| --- | --- |
| Lignes de TypeScript | **10 490** |
| Lignes de CSS | 1 004 |
| Fichiers source | 44 |
| Assets optimisés | 30 WebP + 54 OGG |
| Stack | PixiJS 8.22, Vite 7.3, TypeScript 5.9 |
| Build | fichier HTML unique (`vite-plugin-singlefile`) |

---

## 🏗️ Architecture

Le découpage est propre, chaque dossier a une responsabilité claire :

```
src/
├── main.ts              (199 l.)  point d'entrée, câblage scène ↔ UI ↔ combat
├── config.ts                       constantes monde / parallaxe / caméra
├── assets.ts            (149 l.)  import des textures + chargement
├── core/
│   ├── Game.ts          (119 l.)  enveloppe Pixi, viewport, qualité de rendu
│   ├── Camera.ts        (139 l.)  caméra avec inertie, drag, molette, bords
│   └── perf.ts          (133 l.)  moniteur de FPS, culling, résolution adaptative
├── scene/
│   ├── HubScene.ts      (665 l.)  la ville 2.5D, parallaxe, bâtiments
│   ├── BuildingView.ts  ( 66 l.)  6 bâtiments cliquables
│   └── Npc.ts           (157 l.)  PNJ animés (garde, cultiste, forgeron, chat)
├── battle/
│   ├── BattleScene.ts   (1915 l.) le combat complet
│   ├── Sim.ts           (1004 l.) simulation pure (logique séparée du rendu) ★
│   ├── UnitView.ts      ( 671 l.) rendu des unités
│   ├── RigMesh.ts       ( 271 l.) squelette 2D en maillage déformable ★
│   ├── rigs.ts          ( 248 l.) définition des os par personnage
│   ├── cinematics.ts    ( 683 l.) séquences d'ultime
│   └── Camera.ts        ( 234 l.) caméra de combat
├── ui/
│   ├── UI.ts            ( 659 l.) hub, modales, boutons
│   ├── BattleHud.ts     ( 312 l.) HUD de combat
│   ├── Summon.ts        ( 242 l.) autel d'invocation
│   ├── Formation.ts     ( 128 l.) préparation d'équipe
│   └── styles.css       (1004 l.)
├── fx/                            7 modules d'effets procéduraux
├── data/              héros, bâtiments, répliques, invocations (données pures)
├── state/store.ts       ( 260 l.) sauvegarde + événements + puissance d'équipe
├── audio/AudioEngine.ts ( 450 l.) moteur audio WebAudio
└── utils/              Emitter, math
```

### Les trois points forts

**1. `Sim.ts` est séparé du rendu.** 1 004 lignes de simulation pure, sans Pixi.
C'est la bonne façon de faire : la logique de combat est testable et découplée de
l'affichage. Beaucoup de projets amateurs mélangent les deux et le regrettent.

**2. Le son est généré par du code.** `sound-design/design.py` produit les 54
fichiers OGG. Résultat : **2,4 MB d'audio pour un jeu complet**, contre 30–50 MB
si tu avais acheté des packs. C'est exactement la bonne approche pour la
contrainte de taille.

**3. La qualité de rendu est adaptative.** `core/perf.ts` mesure le temps par
image et baisse la résolution au-delà de 22 ms (`game.adaptive = true`). Avec
`PIXEL_BUDGET` (ultra / high / low), le jeu tient sur des machines modestes.

### Points d'attention dans le code

- `BattleScene.ts` à **1 915 lignes** : c'est gros. Il mélange probablement
  orchestration, effets et règles. Un découpage en `BattleFlow` / `BattleFx` /
  `BattleRules` faciliterait les évolutions futures.
- `styles.css` à **1 004 lignes** : envisager des fichiers par écran
  (`hub.css`, `battle.css`, `modal.css`) ou des modules.
- Pas de tests. `Sim.ts` étant pur, c'est le candidat idéal pour quelques tests
  de non-régression (dégâts, soins, mort, victoire).
- Les noms `arrow_hit_1`, `bow_1`, `hit_3` etc. ne sont pas dans le code source :
  ils sont chargés via `import.meta.glob`. Normal, mais 11 fichiers semblent
  inutilisés (~100 KB, négligeable).

---

## 📦 Le poids — le vrai sujet

```
Espace disque total du clone : 92 MB
├── fichiers suivis : 49,1 MB
└── .git            : 46,1 MB
```

### Répartition des 49 MB

| Élément | Poids | % | Utile au build ? |
| --- | ---: | ---: | --- |
| `art-sources/` (19 PNG) | **34,0 MB** | 69 % | ❌ **NON** |
| `JOUER.html` | **7,9 MB** | 16 % | ❌ artefact régénérable |
| `src/assets/` (WebP) | 5,3 MB | 11 % | ✅ oui |
| dont `src/assets/sfx/` | 2,4 MB | — | ✅ oui |
| Code source | 0,5 MB | 1 % | ✅ oui |

**85 % du repo ne sert à rien au build.**

- `art-sources/` contient les illustrations **originales en PNG** (`ciel_original.png`,
  `ville_originale.png`, `personnages_originaux.png`…). Les versions optimisées
  sont déjà dans `src/assets/*.webp` — **18× plus légères**. Les sources sont
  utiles pour retoucher l'art, pas pour faire tourner le jeu.
- `JOUER.html` est le `dist/index.html` renommé. Il se régénère en **6 secondes**
  avec `npm run build`.

### Le lien avec la limite de 128 MB

Cloner ce repo coûte **92 MB**. Dans un espace de travail limité à 128 MB, il ne
resterait que 36 MB pour tout le reste. C'est pourquoi l'audit a été fait dans
`/tmp` sur un clone jetable, et pourquoi la stratégie « code ici, assets sur CDN »
reste la bonne.

---

## 🚨 URGENT — il n'y a aucun `.gitignore`

C'est le problème le plus grave, et il est immédiat. J'ai lancé `npm install`
puis `git status` dans le clone :

```console
$ du -sh node_modules
140M    node_modules

$ git status --short
 M package-lock.json
?? dist/
?? node_modules/
```

**Le prochain `git add .` va embarquer 140 MB de `node_modules` et 8 MB de `dist/`.**

Conséquences concrètes :
- le repo passerait de 49 MB à **~200 MB** ;
- GitHub **refuse** tout fichier de plus de 100 MB et prévient dès 50 MB ;
- 5 097 fichiers supplémentaires, dont des binaires, dans un historique qui ne
  s'allège jamais.

Un `.gitignore` est prêt : `templates/legendes-tour-infinie.gitignore`.

---

## 🎯 Plan d'action

### Étape 1 — Le `.gitignore` (à faire maintenant, 2 minutes)

Copier `templates/legendes-tour-infinie.gitignore` dans le dossier du projet,
sous le nom **`.gitignore`**. Il exclut `node_modules/`, `dist/`, `art-sources/`,
les caches et les fichiers système.

### Étape 2 — Sortir `art-sources/` du repo (−34 MB)

Ces 19 PNG sont des sources d'édition. Elles doivent vivre sur ton disque ou
dans un Drive, pas dans Git.

```bash
git rm -r --cached art-sources
# le dossier reste sur ton disque, il sort juste de Git
```

### Étape 3 — Sortir `JOUER.html` et le publier en Release (−7,9 MB)

```bash
# 1. le sortir du suivi Git
git rm --cached JOUER.html

# 2. le publier comme fichier téléchargeable d'une Release
gh release create v0.5 JOUER.html --title "v0.5" --notes "Version jouable"
```

Résultat : une page `github.com/.../releases` avec un bouton de téléchargement
propre, et le fichier n'entre pas dans l'historique.

### Étape 4 — Vérifier

```bash
git add -A
node scripts/check-taille.mjs --staged   # script fourni dans l'espace de travail
git commit -m "chore: ignore node_modules, dist, art-sources"
git push
```

Après ces trois étapes, le repo passe de **49 MB à ~7 MB** de fichiers suivis.

### Étape 5 (optionnelle) — Alléger l'historique

`.git` pèse encore 44 MB car `art-sources/` et `JOUER.html` y sont déjà. Les
retirer maintenant ne réduit pas l'historique.

Pour l'alléger vraiment (outil `git-filter-repo`, **faire une sauvegarde avant**) :

```bash
git filter-repo --path art-sources --path JOUER.html --invert-paths --force
git push --force
```

À ne faire que si la taille devient gênante : **51 MB au lieu de 92 MB**, ce qui
reste largement gérable en l'état.

---

## 📋 Récapitulatif

| Sujet | État |
| --- | --- |
| Compilation TypeScript stricte | ✅ 0 erreur |
| Build de production | ✅ 6 s, 8,24 MB (5,6 MB gzip) |
| Architecture modulaire | ✅ propre, `Sim.ts` isolé du rendu |
| Audio procédural | ✅ excellent (2,4 MB) |
| Assets optimisés | ✅ WebP + OGG |
| Qualité de rendu adaptative | ✅ |
| `.gitignore` | ❌ **absent — à corriger en priorité** |
| `art-sources/` dans le repo | ⚠️ 34 MB inutiles |
| `JOUER.html` dans le repo | ⚠️ 7,9 MB régénérables |
| Tests | ⚠️ aucun (mais `Sim.ts` est testable facilement) |
| `BattleScene.ts` | ⚠️ 1 915 lignes, à découper un jour |

**Le jeu est bon. Le repo a juste besoin d'un grand ménage — et ce ménage est
aussi ce qui répond à ta question de départ sur la limite de 128 MB.**
