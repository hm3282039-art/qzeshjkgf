# v2.4.0 — Le combat devient tour par tour (3 capacités + 1 ultime, 6 emplacements)

Lien : `https://hm3282039-art.github.io/qzeshjkgf/?tour`
(ou, en local, le serveur de dev sur le port 5173 avec `?tour`)

## Ce que tu as demandé

> « on va recommencer de 0 les ulti » — un combat **tour par tour comme Epic Seven**,
> chaque personnage avec **3 capacités + 1 ultime**, des **recharges comptées en tours**,
> **le joueur choisit** quelle capacité utiliser, et **6 emplacements : 2 devant,
> 2 au milieu, 2 derrière**, placés librement.

C'est fait. Le combat en temps réel actuel n'est **pas modifié** : le nouveau système est
monté à part, sur `?tour`, comme le Laboratoire d'ultimes est monté sur `?lab`. Tu peux
donc comparer les deux, et rien de ce qui est déjà en ligne ne casse.

## Les cinq pièces du système

| Pièce | Ce que ça change pour toi |
|---|---|
| **Initiative** | Chaque unité remplit une jauge selon sa VITESSE. La première à 100 % joue. La barre du haut montre l'ordre des 9 prochains tours. La vitesse sert enfin à quelque chose de visible. |
| **4 capacités par héros** | 3 capacités + 1 ultime, avec une recharge **en tours** affichée sur le bouton (0 / 2-3 / 3-5 / 6-7). Au tour suivant il faut choisir autre chose : c'est ça, la décision. |
| **Choix de la cible** | Tu cliques la capacité, puis la cible sur le champ de bataille. Les cibles autorisées s'allument en vert ; les autres refusent. |
| **6 emplacements** | 2 DEVANT / 2 MILIEU / 2 DERRIÈRE, à remplir à la main (ou « Placement auto »). Devant : +12 % PV, +10 % armure. Milieu : +5 % PV, +3 % ATQ. Derrière : +10 % ATQ, −5 % armure. |
| **Âmes** | Chaque capacité utilisée en fait gagner à ton équipe. En dépenser 3 « embrase » ton prochain coup : dégâts ×1,5 et effets plus sûrs. |

### La règle qui fait exister le placement

Un ennemi au **corps à corps** ne peut pas frapper ta ligne arrière tant qu'une ligne plus
avancée tient debout : il tape dans le mur. Les **archers et les mages**, eux, passent
par-dessus. Frapper à travers une ligne encore debout coûte 25 % de dégâts au corps à
corps, et la ligne arrière encaisse 10 % de moins. D'où trois conséquences concrètes :

- cacher tout le monde derrière se paie (mesuré : **0 % de victoires** contre 100 % bien placé) ;
- un assassin ou un tireur « perce la ligne » punit justement ces équipes-là ;
- un tank avec **Garde** (Vaelen, Bran, Rook) attire les coups destinés à ton arrière.

### 18 statuts, tous comptés en tours

Étourdi · Gelé · Poison · Brûlure · Saignement · Régénération · Bouclier · Provoqué ·
Garde · ATQ + / − · DÉF + / − · Hâte · Lenteur · Riposte · Invulnérable · Discret.
Les pastilles sous les PV disent ce qui est actif et combien de tours il reste.

## Les ultimes, réécrites de zéro

Les 27 héros ont leurs **108 capacités écrites à la main** pour le tour par tour. On garde
les noms de tes fiches (ils sont bons), mais les textes sont réécrits : plus de
« pendant 6 s », plus de « 520 % d'ATQ sur 4 s » hérités du temps réel. Tout se compte en
tours, et l'interface affiche le vrai multiplicateur à côté du texte.

| Emplacement | Recharge moyenne | Puissance moyenne (×ATQ × frappes) |
|---|---|---|
| 1 — capacité de base | 0 tour | 1,01 |
| 2 — compétence | 2,7 tours | 1,48 |
| 3 — capacité écrite pour ce mode | 3,8 tours | 1,00 (souvent un outil : bouclier, hâte, garde) |
| 4 — ULTIME | 6,0 tours | 3,06 |

Exemples de ce que ça donne :

- **Lyra — Danse Écarlate** : intouchable, 7 frappes au hasard, saignement.
- **Thorne — Hiver Éternel** : 2 passages sur tous les ennemis, 75 % de chances de **gel**
  (le gelé perd son tour et encaisse +25 %).
- **Vaelen — Rempart Écarlate** : frappe et étourdit la ligne avant, **et** ton équipe
  gagne un bouclier (les « effets d'équipe » existent en plus de la cible principale).
- **Mira — Salve de Forge** : 6 traits qui ignorent 40 % de l'armure.
- **Frère Aldric — Sanctuaire Sacré** : soin de masse, invulnérabilité 1 tour, ATQ +.
- **Morwen — Fléau Noir** : poison long et lenteur sur tout le monde.

Et **la cinématique d'ultime du jeu est conservée** : quand un héros lance son ultime en
tour par tour, c'est la vraie séquence S3 du Laboratoire qui se joue (squelette 9 pièces
pour les héros découpés, carton du style choisi pour les autres), avec le son sur le pic
de la scène. Les boss, eux, ont un carton de titre.

## Les chiffres, mesurés plutôt que devinés

Un combat tour par tour place **beaucoup moins de coups** qu'un combat en temps réel
(une dizaine par unité contre 20 à 30). Recopier les PV et l'ATQ tels quels donnait des
combats interminables et des boss impossibles : mesuré, **3-5 était perdu à 0 %** au
niveau conseillé, l'Engloutisseur finissant à 93 % de ses PV.

Deux facteurs ont été cherchés par simulation sur les 20 boss de la campagne :

| Réglage | Valeur | Pourquoi |
|---|---|---|
| `TOUR_DAMAGE` | ×1,8 | Sans lui : 70 tours par combat. Avec : 34. Chaque coup doit compter puisqu'il y en a moins. |
| `TOUR_FOE_HP` | ×0,60 | Le budget de PV ennemi du niveau, ramené au nombre d'actions réel. |

Le balayage qui a fixé `TOUR_FOE_HP` (équipe de référence, IA des deux côtés, 4 essais par boss) :

| PV ennemis | Niveau conseillé | −20 % de niveau | −35 % de niveau | Durée |
|---|---|---|---|---|
| ×0,35 | 100 % | — | — | 26 tours |
| ×0,45 | 100 % | — | — | 30 tours |
| ×0,55 | 100 % | — | — | 33 tours |
| **×0,60 (retenu)** | **100 %** | **99 %** | **88 %** | **34 tours** |
| ×0,70 | 98 % (3-5 à 50 %) | 90 % | 80 % | 38 tours |
| ×0,85 | 94 % (3-5 à 0 %) | — | — | 42 tours |

×0,60 est le seul réglage qui tient **à la fois** le contrat de la v2.3 (au niveau
conseillé, ça passe) et une vraie pente (sous-niveau, ça casse).

## Les tests

Deux nouveaux bancs, `npm run test:tour` et `npm run test:tour-ui` :

| Banc | Résultat |
|---|---|
| `test-tour` (RUNS=4) | **108/108 capacités** des 27 héros s'exécutent · **100/100 combats** de boss terminés · 0 cible illégale · 0 anomalie de recharge · 0 chiffre invalide (NaN) · même graine = même combat · **100 % des 20 boss au niveau conseillé**, 88 % à −35 % · **34 tours** en moyenne, record 61 (plafond 120) · placement : **+100 points** |
| `test-tour-ui` (linkedom) | l'écran se monte · 6 emplacements + 3 colonnes nommées · 4 boutons de capacité · jauges d'âmes · ordre de tour · le choix d'un héros remplit un emplacement · **un coup joué à la main** (capacité puis cible) · la cinématique d'ultime se monte · écran de VICTOIRE avec les statistiques · « Rejouer » repart propre · panneau de règles complet |
| `tsc --noEmit` / `npm run build` | 0 erreur · ✓ `dist/index.html` 18,87 Mo (gzip 13,4 Mo), 8,2 s |

Le moteur est **déterministe** (graine mulberry32) : deux combats avec la même graine
produisent la même liste d'événements au caractère près. C'est ce qui rend tout le reste
testable.

## Ce que je n'ai PAS fait

- **Le mode n'est pas branché sur la campagne.** C'est une salle d'essai : tu choisis
  l'étape et le niveau des héros dans la barre du haut, et les 27 héros sont disponibles.
  Tes niveaux, étoiles, équipement et étoiles rouges enregistrés sont repris, mais le
  niveau affiché est celui de l'étape par défaut.
- **Ton équipe réelle est limitée à 5 héros** (`store.team()` fait `slice(0, 5)`) alors que
  ce mode en joue 6. Pour l'intégrer au jeu, il faut passer l'équipe à 6 (sauvegarde,
  écran Formation, puissance conseillée). C'est le premier chantier d'intégration.
- **Aucun recalibrage de la campagne en temps réel** : le combat actuel, ses ultimes et
  ses tests ne sont pas touchés.
- **Pas de PvP, pas de Tour infinie en tour par tour, pas de récompenses** : ce mode ne
  rapporte rien pour l'instant, il sert à valider le système.
- **Deux mécaniques absentes** : la **dissipation** (« retire les malus ») et
  l'**invocation** (les goules de Morwen sont devenues un coup empoisonné). Le reste des
  textes a été réécrit pour ne rien promettre qui n'existe pas.
- **Les boss n'ont pas de cinématique d'ultime**, seulement un carton de titre.
- **L'IA ennemie est volontairement simple** (elle tape le plus blessé, garde son ultime
  pour tuer, soigne sous 60 %). Le mode « Auto » du joueur utilise la même.

## Fichiers ajoutés

```
src/turn/types.ts       règles partagées : lignes, cibles, statuts, constantes
src/turn/skills.ts      108 capacités écrites à la main + celles des ennemis et des boss
src/turn/engine.ts      le moteur : initiative, recharges, lignes, âmes, IA, événements
src/turn/formation.ts   les 6 emplacements, le placement auto, le montage d'un combat
src/ui/tour.ts          l'écran jouable (?tour) : préparation, combat, fin, règles
src/ui/tour.css         la feuille de style (même langue visuelle que le jeu)
tests/test-tour.ts      7 sections : structure, lignes, capacités, robustesse,
                        déterminisme, équilibre, contrat de difficulté
tests/test-tour-ui.ts   l'interface jouée dans un DOM (linkedom)
```

Modifiés : `src/main.ts` (montage de `?tour`), `package.json` (version 2.4.0 + les deux
scripts de test).
