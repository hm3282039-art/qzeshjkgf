# v2.1.0 — L'ultime S3 en 4 phases (ton cahier des charges)

Lien : `https://hm3282039-art.github.io/qzeshjkgf/?lab`

## Ton brief, appliqué point par point

| Phase | Durée | Ce qui se passe |
|---|---|---|
| **1 · Teaser** | 0 → 900 ms | **gros plan sur le visage** (cut-in), vignettage qui ne laisse que le regard, les yeux s'allument, l'aura charge |
| **2 · Dash** | 900 → 1520 ms | **lignes de vitesse**, la caméra recule et file, légère inclinaison (travelling) |
| **3 · Impact** | 1520 → 2900 ms | **snap zoom** (1,06 → 1,40), traînée de lame, onde de choc, fissures, chiffres, **secousse de caméra** |
| **4 · Outro** | 2900 → 4400 ms | recul de caméra, **pose de fin**, poussière qui retombe, carton du nom, fondu |

## Les « impact frames »
Au moment exact du coup, le moteur affiche **2 images de contraste extrême**
(image inversée + saturation poussée), espacées de 40 ms. C'est le truc que
faisaient les animateurs d'anime pour donner du poids à un coup.

## La caméra
Un seul élément bouge (le conteneur), tout suit : zoom, translation,
inclinaison, secousse. Le zoom est **exponentiel** : ça claque au lieu de glisser.

## Ce qui n'est pas encore là (franchise)
1. **Découpe plus fine** : aujourd'hui 5 morceaux (tête, torse, 2 bras, jambes).
   Ton brief demande aussi **arme, cheveux, cape, vêtements flottants**.
   Ces morceaux ne peuvent pas être devinés de façon fiable sur un dessin
   d'un seul tenant — il faut soit les dessiner séparés, soit les détourer à la main.
2. **Expressions faciales** : je sais allumer les yeux, pas changer une bouche.
3. **Déformation vectorielle** (maillage qui se courbe) : le navigateur sait le
   faire en SVG/WebGL, mais ça demande un maillage dessiné pour chaque héros.
