# MAJ 1.6 — Le Laboratoire d'ultimes

**En ligne :** https://hm3282039-art.github.io/qzeshjkgf/?lab

---

## Pourquoi cette mise à jour

Les cinématiques d'ultime précédentes ne te plaisaient pas. Elles avaient un défaut
objectif : **tout arrivait en même temps**. Le texte, l'image, les éclairs et le flash
se déclenchaient au même instant, donc l'œil ne savait pas où regarder, et ça faisait
« image qui glisse » plutôt que « cinématique ».

Une vraie cinématique, ce n'est pas plus d'effets. C'est **du rythme** : un silence,
puis un choc. C'est de la musique, pas de la peinture.

Plutôt que de te demander de décrire ce que tu voulais — ce qui est impossible quand
on ne sait pas le nommer —, j'ai construit **quatre styles** et je te les montre en
grand. Tu cliques sur celui que tu préfères, il est mémorisé, et il s'applique aux
**27 héros** en combat.

---

## Comment aller au laboratoire

1. Ouvre : **https://hm3282039-art.github.io/qzeshjkgf/?lab**
2. Choisis un héros dans la bande du bas.
3. Clique sur A, B, C ou D : la scène tourne en boucle.
4. Quand tu as choisi : **« Garder ce style »**.

Tu peux aussi y accéder depuis le jeu : **Paramètres → Laboratoire d'ultimes**.

---

## Les quatre styles

### A · Cinéma — *Anime / Epic Seven*
Le temps se fige, les couleurs partent, deux barres noires claquent en haut et en bas.
Le sceau du héros s'abat au centre avec une onde de choc, puis **le nom de l'ultime
tombe lettre par lettre**. L'illustration entre de biais en contre-jour, la caméra
pousse. Au pic : **flash blanc de deux images, image en négatif, dédoublement
chromatique, coup de lame diagonal**. Puis tout se retire et le combat reprend.
*1 500 ms.*

### B · Comics — *Persona 5 / Into the Spider-Verse*
Fond jaune rayé, **trames de points**, lignes de vitesse noires. Une case découpée au
couteau claque de travers, le héros **sort de son cadre**. Le nom s'écrase avec un
contour noir épais, une onomatopée géante arrive en retard. Ça sent l'encre.
*1 320 ms.*

### C · Rituel — *Elden Ring*
L'écran devient **noir**, seule la couleur du héros survit. Le sceau se **grave** au
centre, des anneaux s'ouvrent lentement, des particules montent. La caméra tourne
autour du personnage. Long silence de presque une seconde… puis **effondrement et
choc brutal**. C'est le plus lent et le plus inquiétant.
*1 900 ms.*

### D · Holographique — *Cyberpunk / Arknights*
Scanlines, grille 3D au sol, réticule qui se verrouille. Le héros **se recompose en
blocs de pixels**, avec un dédoublement rouge/bleu sur la silhouette. Le texte arrive
en police technique, avec des micro-coupures numériques.
*1 420 ms.*

---

## Chaque classe a sa mise en scène

Ce n'est pas qu'un filtre de couleur : le **mouvement** change selon le métier.

| Classe | Ce qui change |
|---|---|
| **Tank** | Entrée lourde par le bas, sceau écrasé, impact sourd |
| **Assassin** | Vitesse extrême, flou de mouvement, lettres qui claquent |
| **Mage** | Lévitation lente, le personnage monte |
| **Tireur** | Zoom brutal, flou radial, mise au point |
| **Guerrier** | Contre-plongée, léger pivot, pose héroïque |

---

## Ce qui a été corrigé au passage

- **Migration des anciennes sauvegardes** : les comptes créés avant la 1.5 avaient
  jusqu'à 10 étoiles jaunes. Elles sont ramenées à 5 et le surplus devient des étoiles
  rouges, sans rien perdre.
- **Build en fichier unique** rétabli : c'est le seul format que GitHub Pages publie
  de façon fiable (le build en 146 fichiers restait bloqué en « construction »).

---

## Vérifications faites avant publication

```
108 cinématiques générées · 4 styles × 27 héros · aucune valeur invalide
Laboratoire monté · 4 styles · 27 héros
Sanctuaire : toutes les règles vérifiées
TypeScript : 0 erreur
```

---

## Ce qui vient ensuite

Le chantier suivant est celui que tu as demandé : **de vrais personnages articulés**,
pas des images qui glissent. Squelette (bassin, colonne, épaules, coudes, hanches,
genoux), peau qui se plie sans couture, physique sur les capes et les cheveux, et de
vraies poses de marche, d'attaque, d'encaissement et de mort.

Ça ne demande aucun nouvel art : seulement du code, sur les images que tu as déjà.
