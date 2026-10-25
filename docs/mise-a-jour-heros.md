# Mise à jour — 3 héros, système d'amélioration, refonte visuelle

> Lot livré prêt à copier dans ton projet. **Tout compile, tout est testé.**

---

## 📦 Ce qu'il y a dans le zip

`mise-a-jour-heros.zip` contient **25 fichiers** (598 Ko) :

```
src/
├── data/heroes.ts          +3 héros, paliers de compétence, coûts
├── data/npcLines.ts        répliques des 3 nouveaux héros
├── state/store.ts          niveaux persistés, levelUp()
├── battle/Sim.ts           niveaux pris en compte, nouvelles compétences
├── battle/BattleScene.ts   8 nouveaux effets visuels
├── battle/rigs.ts          3 squelettes d'animation 2D
├── fx/textures.ts          flamme, vignette, scintillement (procéduraux)
├── scene/HubScene.ts       héros dans la ville, auras, vignette
├── scene/Npc.ts            ombres douces, auras animées
├── ui/UI.ts                panneau de niveau, bouton d'amélioration
├── ui/Formation.ts         puissance avec niveaux
├── ui/styles.css           style du panneau de niveau
├── assets.ts               déclaration des nouveaux assets
└── assets/                 3 illustrations + 3 portraits (WebP)
tests/                      5 bancs de test
package.json                scripts de test
```

**Installation :** décompresse à la racine de ton projet, en écrasant les fichiers existants.

---

## 🧙 Les 3 nouveaux héros

| Héros | Rôle | Rareté | PV | ATQ | Identité |
| --- | --- | --- | ---: | ---: | --- |
| **Vaelen**, Le Rempart de Cendre | Tank | SSR 5★ | 3 600 | 66 | Le mur qui ne tombe pas |
| **Sylvaine**, L'Épine de la Nuit | Tireur | SSR 5★ | 1 320 | 104 | La mort silencieuse |
| **Pyrrha**, Le Bûcher Éternel | Mage | SSR 5★ | 1 180 | 132 | Tout finit en cendres |

### Leurs compétences

**Vaelen**
- *Serment de Fer* — bouclier de 42 % des PV max, provocation 5 s et **−20 % de dégâts pour toute l'équipe**
- *Rempart Écarlate* (ultime) — mur de flammes, 300 % d'ATQ en zone, étourdit 1,8 s et rend **tous les alliés intouchables 1,2 s**

**Sylvaine**
- *Salve d'Épines* — 5 flèches en éventail, 120 % d'ATQ chacune + saignement
- *Bois des Suppliciés* (ultime) — 8 traits de ronces, 100 % d'ATQ chacun, enracinent 1,5 s

**Pyrrha**
- *Météore* — appelé sur le groupe le plus dense : 280 % d'ATQ + brûlure 4 s
- *Jugement de Flammes* (ultime) — 3 vagues de feu sur tout le terrain, 180 % d'ATQ chacune + brûlure 7 s

### Ce qu'ils ont aussi

- **3 illustrations** générées dans le style du jeu, détourées au pixel (fond transparent propre, sans liseré) et optimisées en WebP
- **3 portraits 256 × 256** découpés au visage pour la liste des héros
- **3 squelettes d'animation 2D** (bassin, colonne, tête, bras, cape, cheveux) : ils bougent vraiment en combat
- **8 nouveaux effets visuels** : météore qui tombe du ciel, mur de flammes, vagues de feu, ronces, impacts
- **Présents dans la ville**, cliquables, avec **11 nouvelles répliques** et une aura colorée à leurs pieds

---

## ⬆️ Le système d'amélioration

### Règle

> **Tous les 10 niveaux, les compétences du héros gagnent +25 %. Aucun niveau maximum.**

| Niveau | Palier | Puissance des compétences |
| ---: | ---: | ---: |
| 1 → 9 | 0 | ×1,00 |
| **10** | **1** | **×1,25** |
| 20 | 2 | ×1,50 |
| 30 | 3 | ×1,75 |
| 50 | 5 | ×2,25 |
| 100 | 10 | ×3,50 |
| 1 000 | 100 | ×26,00 |
| 100 000 | 10 000 | ×2 501 |

### Ce que le palier améliore concrètement

Le multiplicateur s'applique **aux dégâts, aux soins, aux boucliers et aux dégâts sur la durée** de toutes les compétences et de tous les ultimes — donc aux 11 héros, pas seulement aux nouveaux.

### En plus du palier

Chaque niveau ajoute **+3,5 % de PV et d'ATQ**. Les deux effets se cumulent avec les étoiles d'invocation.

### Coût

| Niveau visé | Prix (SSR) |
| ---: | ---: |
| 2 | 220 or |
| 6 | 372 or |
| 11 | 715 or |
| 21 | 2 652 or |
| 51 | 135 133 or |

Progression géométrique (+14 % par niveau) : monter haut demande un vrai investissement, sans jamais bloquer.

### Dans l'interface

Le panneau du héros affiche un **badge de niveau circulaire**, une **barre de progression vers le prochain palier**, le bonus en cours, et deux boutons : **« Niveau suivant »** et **« ×10 »** avec leur prix. Le bouton se grise si l'or manque.

---

## 🎨 Refonte visuelle

### Bugs et défauts corrigés

| Problème | Correction |
| --- | --- |
| **Ombres au sol** : une ellipse noire opaque à 45 %, effet « tache » | **Dégradé en 4 anneaux** (6 % → 20 % d'opacité) : contact doux et crédible |
| **Respiration mécanique** : un seul sinus, rythme de robot | **Deux sinus superposés** avec déphasage : respiration organique |
| **Puissance d'équipe** ignorait le niveau | `teamPower` intègre désormais les niveaux |
| **Palier de compétence** tombait au niveau 11 | Corrigé : il tombe bien au niveau 10 |

### Ajouts

- **Vignette cinématographique** plein écran : les bords s'assombrissent, le regard est conduit vers le centre. C'est le changement le plus visible du lot.
- **Auras colorées animées** au sol sous les héros de la ville, qui pulsent et s'intensifient au survol
- **Nouvelle texture de flamme** procédurale (0 octet, dessinée par le code) pour tous les effets de feu
- **Particules de scintillement** disponibles pour les moments forts

---

## ✅ Vérifications effectuées

```console
$ npx tsc --noEmit
  → 0 erreur (mode strict complet)

$ npm run build
  → ✓ 978 modules en 6,3 s
  → dist/index.html 8,93 MB (6,14 MB gzip)

$ npm run test:battle        (360 combats)
  → 0 crash · 0 NaN · 0 combat sans fin

$ npm run test:niveaux
  → paliers corrects, puissance croissante, aucun plafond
```

Les 3 nouveaux héros ont été testés dans **toutes** les configurations : seuls, en trio, avec toute l'équipe, à 1 et 10 étoiles, sur les deux niveaux.

---

## 📊 Impact sur le poids

| Élément | Taille |
| --- | ---: |
| 3 illustrations WebP | 417 Ko |
| 3 portraits WebP | 85 Ko |
| Code ajouté | ~30 Ko |
| **Total** | **~532 Ko** |

Le build passe de 8,24 à **8,93 MB** (6,14 MB gzip) — les illustrations sont la seule vraie dépense.

---

## 🎯 Pour voir le résultat

1. Décompresse le zip à la racine de ton projet
2. `npm run dev` puis `Ctrl+F5`
3. **Efface la sauvegarde** dans les paramètres du jeu : les anciens réglages n'ont pas le champ `levels`

Les 3 nouveaux héros sont **invocables à l'Autel** (rareté SSR) mais ne sont pas donnés au départ — c'est voulu, ça préserve la progression. Si tu veux les tester tout de suite : ouvre la console du navigateur et tape

```js
__dev.store.summon // ou donne-toi de l'or :
__dev.store.updatePlayer({ gold: 999999, gems: 99999 })
```

(puis ouvre **Héros → Sanctuaire** et améliore-les pour voir les paliers tomber)

---

## 🖥️ Plein écran

Ajouté dans ce lot, trois façons de basculer :

| Méthode | Où |
| --- | --- |
| **Touche Entrée** | n'importe où dans le jeu |
| **Double-clic** | sur le jeu (pas sur un panneau) |
| **Bouton** | Paramètres → Plein écran → Activer |

`Échap` quitte le plein écran (comportement du navigateur).

### ⚠️ Dans l'aperçu intégré, le plein écran est bloqué

Les navigateurs interdisent `requestFullscreen()` dans une **iframe**. L'aperçu
d'Arena est une iframe : le bouton y affichera le message « Ouvre le jeu dans un
onglet pour le plein écran ».

**Solution : ouvre le jeu dans un onglet**, puis le plein écran fonctionne
normalement (Entrée, double-clic ou bouton).

Fichiers concernés : `src/ui/fullscreen.ts` (nouveau), `src/ui/UI.ts`,
`src/ui/icons.ts` (icône `expand`), `src/main.ts`.
