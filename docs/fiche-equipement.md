# Fiche — Système d'équipement

> **Statut : livré et en ligne.** Les 5 décisions ont été prises, le système est construit
> et publié. Ce document reste la référence des chiffres et des règles.

---

## 1. L'idée en une phrase

Chaque héros possède **4 emplacements** dans lesquels on glisse des objets trouvés en campagne.
Les objets augmentent ses statistiques, et on peut les fusionner pour en obtenir de meilleurs.

**Pourquoi c'est utile** : aujourd'hui, la seule façon de progresser est de monter de niveau avec de l'or.
Avec l'équipement, **rejouer un niveau redevient intéressant** — on y retourne pour l'objet, pas seulement pour l'expérience.

---

## 2. Les 4 emplacements

| Emplacement | Symbole | Statistique principale |
|---|---|---|
| **Arme** | ⚔ | Attaque |
| **Armure** | 🛡 | PV |
| **Casque** | ⛑ | Armure |
| **Bottes** | 👢 | Vitesse d'attaque |

Chaque héros a **ses 4 emplacements**. Le pool d'objets est **commun** : un objet équipé sur Kael n'est plus disponible pour Vespera — il disparaît de sa liste. C'est ce qui oblige à choisir « qui porte quoi ».

---

## 3. Les objets

### Rareté

| Rareté | Couleur | Statistiques | Chance de drop |
|---|---|---|---|
| **Commun** | gris-bleu | 1 principale | 52 % |
| **Rare** | bleu | 1 principale + 1 secondaire | 30 % |
| **Épique** | violet | 1 principale + 2 secondaires | 13 % |
| **Légendaire** | or | 1 principale + 2 secondaires (fortes) | 4,4 % |
| **Mythique** | rouge flamboyant | 1 principale + 3 secondaires | 0,6 % |

Les deux dernières raretés sont **volontairement rares** : elles sont la base du futur système de méta.

### Niveau

Chaque objet a un **niveau de 1 à 20**, tiré du niveau de campagne où il tombe :
`niveau = 1 + floor(index_du_niveau × 1,7)`

Plus loin tu vas, plus les objets sont hauts. La puissance suit :
`valeur = base × rareté × (1 + 0,05 × (niveau − 1))`

### Les statistiques possibles

PV · Attaque · Armure · Vitesse d'attaque · Critique

---

## 4. Comment on les obtient

**Deux sources, volontairement simples :**

1. **Butin de campagne** — chaque niveau terminé donne **1 objet** (garanti la première fois, aléatoire ensuite). Le chapitre 2 donne de meilleurs objets que le chapitre 1.
2. **La Forge de Cendrebourg** — *reportée à plus tard* (décision de l'utilisateur). On y fusionnera 3 objets de même rareté pour en obtenir un supérieur.

**Pas de boutique d'objets contre des gemmes.** Les gemmes restent réservées à l'invocation.

---

## 5. Effet sur les statistiques

Les bonus s'**additionnent entre eux**, puis s'appliquent **après** les multiplicateurs de niveau et d'étoiles.

```
stat finale = stat_de_base × (niveau) × (étoiles) + somme_des_bonus_d_objets
```

**Pourquoi ainsi** : c'est prévisible, facile à équilibrer, et ça évite qu'un objet devienne absurde sur un héros déjà très monté.

**Ordre de grandeur visé** : avec 6 objets épiques niveau 20, un héros gagne environ **+35 %** de puissance.
Ce n'est pas un doublement — ça récompense l'investissement sans casser les niveaux déjà équilibrés.

---

## 6. Où ça vit dans le code

| Fichier | Rôle |
|---|---|
| `src/data/items.ts` *(nouveau)* | définitions : emplacements, raretés, tables de stats, noms |
| `src/state/store.ts` | sauvegarde : inventaire + équipement par héros |
| `src/ui/HeroPanel.ts` *(ou dans `Formation.ts`)* | l'écran d'équipement |
| `src/data/heroes.ts` | `heroPower()` doit compter les objets |
| `src/battle/Sim.ts` | applique les bonus au moment de créer l'unité |

**Aucune modification du moteur de combat** : les objets modifient les statistiques d'entrée, pas les règles.

---

## 7. L'interface

Dans l'écran **Héros** (celui que tu m'as montré) :

Dans l'écran **Héros**, quand tu cliques sur un personnage :

- son **illustration reste au centre**, entière
- **4 médaillons** sont posés autour d'elle, dans les coins (arme en haut à gauche, casque en haut à droite, armure en bas à gauche, bottes en bas à droite)
- chaque médaillon porte l'icône de l'emplacement, la couleur de la rareté et le niveau de l'objet — survole-le pour voir son nom et son bonus
- un clic ouvre **la liste des objets libres** pour cet emplacement, du plus puissant au plus faible, avec le détail des bonus
- un bouton **« Retirer l'objet »** remet la pièce dans le pool
- la fiche récapitule les statistiques **avec** l'équipement, et la Puissance monte en direct

C'est exactement la disposition de Mobile Legends Adventure : le héros au milieu, son matériel autour.

---

## 8. Garde-fous

- Les **2 280 simulations** existantes doivent continuer à passer.
- J'ajouterai un test dédié : équiper les 11 héros au maximum et vérifier qu'aucun combat ne devient infini.
- **Les niveaux ne seront pas rééquilibrés** dans un premier temps : si l'équipement rend le jeu trop facile, on ajustera ensuite les PV ennemis — pas avant.

---

## 9. Découpage (3 lots)

| Lot | Contenu | Ce que tu vois |
|---|---|---|
| **1** | Données + sauvegarde + butin de campagne | des objets tombent après les combats |
| **2** | Écran d'équipement complet | tu équipes, tu compares, tu vois ta puissance monter |
| **3** | Forge + fusion + tri automatique | tu fabriques du meilleur matériel |

Je ferais **le lot 1 et 2 d'un coup**, la forge ensuite.

---

## 10. Ce que je ne ferai pas (sauf si tu le demandes)

- ❌ **Pas de changement d'apparence** du personnage quand il s'équipe (il faudrait dessiner chaque objet sur chaque héros : 4 × 14 = 56 illustrations).
- ❌ **Pas de durabilité, pas de casse, pas de réparation.**
- ❌ **Pas d'objets à acheter contre des gemmes.**
- ❌ **Pas de sets avec bonus de combinaison** dans un premier temps.

---

## 11. Tes 5 décisions (validées)

1. **4 emplacements** — arme, armure, casque, bottes. Pas d'anneau, pas d'amulette.
2. Le butin tombe **à chaque niveau terminé**.
3. **Aucun objet dessiné sur le personnage** : tout se joue dans l'écran Héros, autour de l'illustration.
4. Les objets sont **partagés** dans un pool commun.
5. La **Forge** : plus tard.

---

## 12. Résumé en une image

> Aujourd'hui : tu montes Kael avec de l'or.
> Demain : tu montes Kael **et** tu lui trouves une épée, un casque et des bottes — et tu retournes dans le marais parce qu'il y lâche une meilleure armure.
