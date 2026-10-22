# Kael — kit de découpe pour Spine 2D

Tout est en **PNG transparent**, à la **résolution d'origine** (889 × 557 px).

## Les fichiers

| Fichier | Quoi |
|---|---|
| `kael_complet.png` | le personnage entier, pour la référence |
| `1_cape.png` … `9_epee.png` | les 9 morceaux, déjà détourés |
| `kael_parts.json` | tailles, positions, pivots — les chiffres à recopier dans Spine |
| `planche.png` | l'image de contrôle (celle que tu regardes) |

## L'ordre d'empilement (du fond vers l'avant)

1. `cape`
2. `jambe_g`
3. `jambe_d`
4. `pagne`
5. `torse`
6. `casque`
7. `bouclier`
8. `bras_d`
9. `epee`

## Le pivot, c'est quoi ?

Le rond rose sur la planche. C'est **le point autour duquel le morceau tourne**.
Pour une épée : le point de la poignée. Pour un bras : l'épaule. Pour la tête :
la base du cou. Si tu poses l'os ailleurs, le morceau tourne comme une porte
mal vissée.

Dans `kael_parts.json`, chaque morceau a :

* `x`, `y` → où se trouve son coin haut-gauche dans le personnage ;
* `px`, `py` → où se trouve le pivot dans l'image du morceau ;
* `pivot_perso` → le pivot ramené dans le repère du personnage (le plus pratique).

## Dans Spine

1. Nouveau projet.
2. Glisse les 9 PNG dans la fenêtre (Spine les range dans *Images*).
3. Crée les os : `racine`, `bassin`, `colonne`, `tete`, `bras_d`, `bouclier`, `epee`,
   `jambes`, `cape`, `pagne`.
4. Pour chaque morceau : un *slot*, l'image attachée, et l'os placé **sur le rond rose**.
5. Anime.

## Ce que ce kit ne peut pas faire

Le bras gauche est **derrière le bouclier** : il n'est pas dessiné. Si le bouclier
tourne de plus de ~20°, on verra un trou. Les studios règlent ça en dessinant les
pièces séparées dès le départ — c'est la vraie raison pour laquelle Epic Seven
paraît plus riche : le personnage n'a jamais été dessiné « en un seul morceau ».
