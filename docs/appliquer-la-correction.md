# Appliquer la correction d'équilibrage

Le fichier **`equilibrage.patch`** (dans le dossier `game/`) contient deux changements :

1. **PV et ATQ de tous les ennemis × 0,80**
2. **`battleAuto` passe à `true`** par défaut

---

## Résultat mesuré (60 combats par configuration)

| Niveau | Avant (sans ultimes) | Après (sans ultimes) | Après (avec ultimes) |
| --- | ---: | ---: | ---: |
| 1-1 La Route des Pendus | 0 % | **50 %** | 100 % |
| 1-2 Le Marais des Noyés | 0 % | **25 %** | 100 % |

Le niveau 1-1 devient jouable même sans maîtriser les ultimes. Le 1-2 reste
exigeant. L'ultime redevient un bonus au lieu d'une condition de survie.

---

## Méthode 1 — Le patch (recommandé, 30 secondes)

Le fichier est testé : il s'applique proprement sur la version actuelle du repo.

```bash
# 1. Se placer dans le dossier du jeu (là où il y a package.json)
cd chemin/vers/mon-jeuxx

# 2. Vérifier que le patch passera (ne modifie rien)
git apply --check equilibrage.patch

# 3. Appliquer
git apply equilibrage.patch

# 4. Commiter et envoyer
git add -A
git commit -m "equilibrage: ennemis -20%, AUTO par defaut"
git push
```

Si `git apply --check` affiche une erreur, le fichier a été modifié depuis :
utilise la méthode 2.

---

## Méthode 2 — À la main (aucun terminal)

Deux fichiers, huit lignes.

### `src/data/heroes.ts` — bloc `ENEMIES` (ligne ~172)

| Ennemi | Avant | Après |
| --- | --- | --- |
| `ghoul` | `hp: 2700, atk: 135` | `hp: 2160, atk: 108` |
| `skeleton` | `hp: 1750, atk: 160` | `hp: 1400, atk: 128` |
| `warden` | `hp: 11800, atk: 225` | `hp: 9440, atk: 180` |
| `spectral` | `hp: 650, atk: 48` | `hp: 520, atk: 38` |
| `drowned` | `hp: 3200, atk: 120` | `hp: 2560, atk: 96` |
| `witch` | `hp: 1900, atk: 150` | `hp: 1520, atk: 120` |
| `queen` | `hp: 16000, atk: 240` | `hp: 12800, atk: 192` |

Seuls `hp` et `atk` changent. `armor`, `interval`, `range`, `speed` et `crit`
restent identiques.

### `src/state/store.ts` — ligne 79

```diff
- settings: { quality: 'high', showLabels: true, volume: 0.7, muted: false, battleAuto: false, battleSpeed: 1, showFps: false },
+ settings: { quality: 'high', showLabels: true, volume: 0.7, muted: false, battleAuto: true,  battleSpeed: 1, showFps: false },
```

---

## Vérifier après application

```bash
npm run typecheck      # doit afficher 0 erreur
npm run build          # doit produire dist/index.html
npm run test:balance   # doit afficher 50 % et 25 % sans ultimes
```

Pour voir le changement dans le navigateur : recharge la page du jeu (`Ctrl+F5`,
pour ignorer le cache de l'ancienne sauvegarde locale). Si ton navigateur garde
l'ancienne sauvegarde, ouvre les paramètres du jeu et clique **« effacer la
sauvegarde »** — les réglages sont stockés en local (`localStorage`).

---

## Pourquoi ces valeurs et pas d'autres

J'ai balayé huit coefficients et mesuré les deux extrêmes (sans ultime / avec
ultime) pour chacun :

| PV / ATQ ennemis | Sans ultime | Avec ultime |
| --- | ---: | ---: |
| ×1,00 (actuel) | 0 % | 98 % |
| **×0,80** | **36–44 %** | **100 %** |
| ×0,70 | 76 % | 100 % |
| ×0,60 | 86 % | 100 % |
| ×0,50 | 100 % | 100 % |

En dessous de ×0,80, le jeu devient trop facile et l'ultime perd tout intérêt :
on gagne déjà sans. ×0,80 est le seul palier qui garde les deux courbes utiles.

---

## Optionnel — les tests

Le dossier `game/tests/` contient quatre bancs de test autonomes. Pour les
ajouter au projet, copie le dossier `tests/` à la racine et ajoute les scripts
à `package.json` :

```json
"test:battle":   "vite-node tests/test-battle.ts",
"test:balance":  "vite-node tests/test-balance.ts",
"test:reaction": "vite-node tests/test-reaction.ts",
"test":          "vite-node tests/test-battle.ts"
```

Et la dépendance :

```bash
npm install -D vite-node
```

Ces tests tournent en 3 secondes, sans navigateur, directement sur `Sim.ts`.
Ils détectent les crashs, les `NaN`, les combats qui ne finissent pas, et
mesurent l'équilibrage à chaque modification.
