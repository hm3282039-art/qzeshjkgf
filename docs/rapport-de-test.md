# Rapport de test — Légendes de la Tour Infinie

> Test du 22/10/2026 · 264 combats simulés + 840 combats d'équilibrage
> Méthode : simulation headless de `src/battle/Sim.ts` (logique pure, sans navigateur)

---

## 1. Résultat global — le code est sain

| Test | Résultat |
| --- | --- |
| Compilation TypeScript (`strict`, `noUnusedLocals`) | ✅ **0 erreur** |
| Build de production | ✅ 978 modules, 5,9 s, 8,24 MB |
| 264 combats sur 2 niveaux × 11 compositions | ✅ **0 crash** |
| Valeurs `NaN` / `Infinity` dans les PV | ✅ **0** |
| Combats qui ne se terminent jamais | ✅ **0** |
| Imports d'assets (31 textures) | ✅ **0 manquant** |
| Éléments DOM attendus par `main.ts` | ✅ **5/5 présents** |

**Le moteur de combat est solide.** Aucune fuite, aucune boucle infinie, aucun
état corrompu, même avec 8 héros, 1 étoile ou 10 étoiles.

---

## 2. 🔴 Le problème trouvé : le jeu est impossible sans les ultimes

C'est le point le plus important de ce rapport.

Équipe par défaut d'un nouveau joueur (celle du `store`) :
**Kael 5★, Lyra 5★, Morwen 5★, Seren 4★, Aldric 4★** — puissance 12 402.

| Niveau | Puissance conseillée | Sans ultimes | Avec ultimes |
| --- | ---: | ---: | ---: |
| **1-1 La Route des Pendus** | 9 800 | **0 / 60 → 0 %** | **60 / 60 → 100 %** |
| **1-2 Le Marais des Noyés** | 13 500 | **0 / 60 → 0 %** | **60 / 60 → 100 %** |

### Ce que ça veut dire concrètement

Un nouveau joueur qui ne comprend pas le mécanisme d'ultime (cliquer la carte du
héros quand la jauge dorée est pleine, ou `1`–`5`) **perd 100 % de ses combats**,
sur le tout premier niveau, avec l'équipe que le jeu lui donne.

Et le mode qui le sauverait — **AUTO**, qui lance bien les ultimes
(`BattleScene.ts:1737`) — est **désactivé par défaut** :
`battleAuto: false` dans `store.ts:79`.

### La courbe actuelle est binaire, pas progressive

```
Sans ultimes  ▏0 %                                     ██████████████ 100 %
              └──────────────────────────────────────────────────────────┘
                            aucune zone intermédiaire
```

Avec un temps de réaction humain simulé (l'ultime est lancé *n* secondes après
que la jauge est pleine) :

| Réaction | 1-1 | 1-2 |
| --- | ---: | ---: |
| 0,0 s (parfait) | 100 % | 100 % |
| 1,0 s | 100 % | 95 % |
| 2,0 s | 100 % | 90 % |
| 3,0 s (distrait) | 100 % | 75 % |

**Conclusion : le combat n'est pas difficile, il est clivant.** Il ne pardonne
aucune seconde d'inattention, et il est trivial dès qu'on clique. Il n'y a pas
de marge d'apprentissage.

### Pourquoi — les stats brutes

| Combattant | PV | ATQ | Armure |
| --- | ---: | ---: | ---: |
| **Héros moyen** | 1 700 | 88 | 32 |
| Goule | 2 700 | 135 | 22 |
| Squelette | 1 750 | **160** | 15 |
| Noyé | 3 200 | 120 | 30 |
| Sorcière | 1 900 | 150 | 14 |
| **Gardien d'Os** (boss) | 11 800 | **225** | 55 |
| **Reine Noyée** (boss) | 16 000 | **240** | 50 |

Un héros a **moins de PV et moins d'ATQ** qu'un ennemi de base, et le boss a
presque 2,5× son ATQ. Les ennemis sont objectivement supérieurs, un contre un.

---

## 3. La correction proposée

Diviser **PV et ATQ des ennemis par 1,25** (× 0,80). Une ligne de données, aucun
changement de mécanique.

| Niveau | Avant (sans ultime) | Après (sans ultime) | Après (avec ultime) |
| --- | ---: | ---: | ---: |
| 1-1 | 0 % | **44 %** | 100 % |
| 1-2 | 0 % | **14 %** | 100 % |

La courbe devient progressive : le niveau 1-1 est jouable et pardonne les
erreurs, le 1-2 reste exigeant mais atteignable, et l'ultime redevient un
**bonus** au lieu d'une **condition de survie**.

### Application

```ts
// src/data/heroes.ts — dans la définition de chaque ennemi
// multiplier hp et atk par 0.8

// Exemple pour le Gardien d'Os
hp: 11800 → 9440
atk: 225   → 180
```

### Deux réglages complémentaires recommandés

1. **`battleAuto: true` par défaut** (`store.ts:79`) — le nouveau joueur gagne
   pendant qu'il apprend les mécaniques, puis désactive AUTO quand il a compris.
2. **Un tutoriel sur le premier combat** — forcer le joueur à cliquer une fois
   sur une carte dont la jauge est pleine, avec une flèche et un texte.

---

## 4. Tests ajoutés au projet

Quatre bancs de test, réutilisables, ajoutés dans `tests/` :

| Fichier | Rôle | Commande |
| --- | --- | --- |
| `tests/test-battle.ts` | 264 combats, détection de crash / NaN / blocage | `npm test` |
| `tests/test-balance.ts` | Équilibrage de l'équipe par défaut | `npm run test:balance` |
| `tests/test-reaction.ts` | Impact du temps de réaction humain | `npm run test:reaction` |
| `tests/test-fix.ts` | Recherche du bon coefficient d'équilibrage | `npm run test:fix` |

Ils tournent **sans navigateur**, directement sur la logique pure — 3 secondes.

---

## 5. Résumé

| Sujet | Verdict |
| --- | --- |
| Stabilité du code | ✅ excellente, aucun bug d'exécution |
| Architecture du combat | ✅ `Sim.ts` testable, c'est ce qui a rendu ce test possible |
| Équilibrage du niveau 1-1 | 🔴 **0 % de victoire sans ultime** |
| Équilibrage du niveau 1-2 | 🔴 **0 % de victoire sans ultime** |
| Valeur par défaut de `battleAuto` | 🔴 `false` — à passer à `true` |
| Correctif | ✅ × 0,80 sur PV/ATQ ennemis |

**Le code n'a pas de bug. Le jeu a un problème de réglage, et il est corrigeable
en changeant une poignée de chiffres.**
