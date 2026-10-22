# v2.2.0 — La séquence S3 « façon Epic Seven »

Lien : `https://hm3282039-art.github.io/qzeshjkgf/?lab` → mode **Séquence S3**.

## Ce que j'ai lu avant de coder

Epic Seven ne fait pas de la magie, il empile cinq techniques :

1. **Une illustration dédiée** au coup, dessinée à part du sprite de combat.
   C'est le « cut-in » : le personnage change de dessin, cadrage serré, blanc
   surexposé.
2. **Un squelette** : les morceaux sont découpés dans Photoshop, montés dans
   Spine, et chaque morceau tourne autour d'une articulation. Le moteur maison
   (YUNA) ne joue que des poses.
3. **Une caméra** animée : poussée, recul, inclinaison.
4. **Des effets dessinés à part** : traînées, onde de choc, étincelles,
   poussière.
5. **Des impact frames** : 1 à 3 images de contraste extrême au moment du coup.

## Ce que fait la scène

| Temps | Phase | Ce qui se passe |
|---|---|---|
| 0 → 0,9 s | **Cut-in** | l'illustration de Kael arrive plein cadre, poussée lente, flash blanc |
| 0,9 → 1,5 s | **Élan** | lignes de vitesse, le squelette glisse, caméra qui recule |
| 1,5 → 1,86 s | **Armé** | l'épée monte, le torse se charge, la cape part en arrière |
| 1,86 s | **Impact** | 3 impact frames (45 ms chacune), secousse, arcs, étincelles, onde |
| 1,86 → 2,5 s | **Onde** | la caméra recule, les anneaux s'étendent |
| 2,5 → 4,6 s | **Sortie** | pose de fin, poussière, carton du nom |

## Le squelette

* **Kael** : **9 morceaux** (cape, bouclier, casque, torse, bras, épée, pagne,
  deux jambes) — découpe faite à la main, pas en tranches.
* Les **9 autres héros** riggés : 5 morceaux, avec des amplitudes réduites
  (sinon les morceaux se séparent : la découpe automatique est grossière).
* Les 17 héros sans rig n'ont pas encore la séquence.

## Ce qui reste imparfait (franchement)

1. **La découpe**. Un dessin fait d'un seul tenant ne peut pas se plier comme
   un personnage dessiné en morceaux dès le départ. Les studios dessinent les
   parties cachées (l'intérieur du bras, sous la cape) — je ne peux pas les
   inventer.
2. **Les expressions**. Les yeux s'allument, la bouche ne bouge pas.
3. **Le rendu des effets** reste du CSS : pas de particules dessinées à la
   main comme leurs explosions.

## Les fichiers

* `src/ui/ultimate-epic.ts` / `.css` — la séquence.
* `src/data/rig9.ts` + `src/assets/epic_kael_*.webp` — les 9 morceaux (114 Ko).
* `tools/spine_cut.py` — la découpe à la main (reproductible).
* `tools/epic_storyboard.py` — le rendu hors ligne des 6 moments clés.
