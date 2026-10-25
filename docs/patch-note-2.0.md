# v2.0.0 — Le squelette 2D (le vrai système, façon Spine)

Lien : `https://hm3282039-art.github.io/qzeshjkgf/?lab`

## Ce que m'a appris ta recherche
Les jeux comme Epic Seven ne jouent pas une vidéo : ils gardent le personnage
**découpé en morceaux** et le font bouger **en temps réel** avec un squelette.
C'est pour ça que l'ultime démarre instantanément et pèse presque rien.

J'ai jeté les vidéos et j'ai fait exactement ça.

## Comment le héros est découpé
Chaque héros est maintenant en **5 morceaux** : tête, torse, bras gauche,
bras droit, jambes. Chaque morceau a un **pivot** (l'épaule, le cou, la hanche)
et tourne autour.

La découpe est automatique : le programme lit la silhouette et trouve
- le **cou** (là où la largeur s'élargit sous la tête),
- les **hanches** (le point le plus large du corps),
- les **bras** (les zones latérales entre les deux).

Les morceaux se recouvrent largement : aucun trou quand un bras tourne.

## Comment ça bouge
Le moteur n'enregistre **que des poses** (8 nombres) : bassin, torse, tête,
deux bras, jambes, échelle. Il mélange la pose de départ et la pose d'arrivée
en douceur, 60 fois par seconde, et applique le résultat aux morceaux.

**6 chorégraphies** selon le geste de l'ultime : coup au sol, traversée,
pluie du ciel, bénédiction, effondrement, rayon.

## Pourquoi c'est mieux que la vidéo
| | Vidéo | Squelette 2D |
|---|---|---|
| Démarrage | chargement du fichier | instantané |
| Poids | ~0,5 Mo par héros | ~35 Ko par héros |
| Fluidité | 30 images/s figées | 60 images/s calculées |
| Changement de héros | nouvelle vidéo | même moteur |

Le fichier du jeu est passé de **26 Mo à 18,6 Mo** en supprimant les vidéos.

## Ce qui reste de la « cell animation »
Les effets (étincelles, ondes de choc, fissures, flash, négatif) sont des
dizaines de petits éléments que le moteur dessine lui-même — comme des dessins
animés un par un, mais calculés à l'écran.

## Héros avec squelette (10)
Kael · Lyra · Morwen · Seren · Aldric · Thorne · Nyx · Ashka · Vaelen · Sylvaine
(un héros sans squelette montre la scène animée en attendant)

## Mode d'emploi du labo
`Squelette 2D` (par défaut) · `Scène animée` · `Scène continue` · `Carton du nom`
