# v1.8.0 — De vraies vidéos (plus d'images empilées)

Lien : `https://hm3282039-art.github.io/qzeshjkgf/?lab`

## Ce que tu me reprochais
« Je veux pas des images superposées, je veux une espèce de vidéo. »

Tu avais raison : jusque-là, c'était le navigateur qui affichait quatre dessins
l'un sur l'autre. Maintenant, c'est un **vrai fichier vidéo**.

## Comment c'est fait
J'ai écrit un programme qui **dessine chaque image de la scène**, une par une,
20 fois par seconde, pendant 7 secondes : 140 images calculées. Ensuite il les
**encode** en un seul fichier WebM — exactement comme on fabrique un dessin animé.
Le jeu ne fait plus qu'appuyer sur « lecture ».

Contenu de chaque image, calculé (pas copié) :
- la caméra qui pousse et recule
- les particules, les cendres, les éclats qui volent
- les ondes de choc qui s'élargissent, les fissures qui s'ouvrent
- les chiffres de dégâts qui montent
- les 4 dessins de l'action, avec des images de flou entre eux
- le grain de pellicule et le vignettage (l'image « film »)
- les secousses, le négatif, les dédoublements de couleur

## Les plans (7 s)
| Temps | Plan |
|---|---|
| 0,0 s | plan large : la salle, les ennemis, une charogne qui fonce |
| 1,2 s | l'illustration arrive en poussée |
| 2,7 s | le blanc : gros plan sur le visage, dédoublement couleur |
| 3,4 s | l'action : les 4 dessins joués à 5 images/seconde |
| 5,1 s | l'impact : ondes, fissures, dégâts, onomatopée |
| 5,9 s | le nom, lettre par lettre |
| 6,7 s | fondu au noir |

## Les 10 héros qui ont leur vidéo
Kael · Lyra · Morwen · Seren · Frère Aldric · Thorne · Nyx · Ashka · Vaelen · Sylvaine

Poids : environ 0,4 Mo par vidéo, intégré dans la page.

## Le laboratoire
Quatre boutons : **Vidéo** (le nouveau), Scène animée, Scène continue, Carton.
L'ancienne version « scène animée » reste là pour comparer.

## Le son
La vidéo est muette : c'est le jeu qui joue les bruits par-dessus, calés sur
les coupes (montée, gong, whoosh, impact, chœur). Bouton `Son : oui / non`.

## Toujours pas dans le combat
Labo d'abord. Tu valides, j'installe.
