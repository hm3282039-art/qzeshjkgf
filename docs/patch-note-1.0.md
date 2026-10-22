# PATCH 1.0 & 1.1 — « DEUX DÉFENSES » puis « LES CLASSES »

**Date** : 22 octobre 2026
**Portée** : équilibrage complet, économie, lisibilité. **Aucun héros, aucun niveau, aucun décor ajouté.**
**But** : créer une méta — c'est-à-dire plusieurs équipes viables qui ne se ressemblent pas.

---

## En 30 secondes

Avant, une seule équipe gagnait partout : trois tanks et deux soigneurs. Les tanks faisaient autant de dégâts que les mages, les assassins mouraient au premier contact, et « armure » ne servait qu'à encaisser bêtement.

Maintenant :

- **L'armure arrête le fer, la résistance arrête les sorts.** Ce sont deux statistiques séparées.
- **Les ennemis d'ossuaire sont blindés mais fondent à la magie. Les ennemis du marais sont le contraire.**
- **Il faut donc changer d'équipe entre deux niveaux.** C'est ça, une méta.
- La difficulté monte enfin en pente régulière au lieu de faire des dents de scie.
- L'énergie se recharge : le jeu ne se bloque plus au bout de huit combats.
- **Chaque héros a une classe d'affinité** (Lumière, Obscur, Nature, Technique, Combat) avec un cycle d'avantages, et une synergie quand plusieurs partagent la même.

---

## 1. Ce qui n'allait pas (mesuré, pas deviné)

J'ai écrit un banc de test qui fait s'affronter **4 000 combats simulés** et qui sort des chiffres. Voilà ce qu'il disait du jeu d'avant :

| Problème | Mesure |
|---|---|
| Les ultimes décidaient de tout | 35 % de victoires sans ultime, **91 % avec**. Le bouton « ultime » était le vrai niveau de difficulté. |
| Les tanks étaient les meilleurs DPS | Un tank encaissait **5× plus** qu'un mage **et** son ultime faisait des dégâts de zone de mage. Résultat : 3 tanks dans toutes les équipes. |
| Les assassins étaient injouables | Ils plongeaient dans les cinq ennemis, y restaient, et mouraient. Vespera : **74 %** de victoires contre **99 %** pour Vaelen. |
| La difficulté n'était pas une courbe | 1-3 gagné à 100 % et 1-2 à 20 %. 2-2 gagné à 100 % et 2-4 à 0 %. Elle dépendait d'un seul ennemi, pas du numéro du niveau. |
| L'énergie ne remontait jamais | Après 8 combats, plus rien. Aucune régénération dans le code. |
| Le soin d'Aldric était dérisoire | 174 PV rendus sur un tank à 3 100 PV. Il ne suivait pas la montée en niveaux. |

---

## 2. La grande idée : deux défenses

Jusqu'ici, une seule statistique défensive : l'armure. La magie ne faisait que la contourner à 60 %.

Maintenant, chaque combattant a **deux** valeurs :

- **Armure** → réduit les dégâts **physiques** (`100 / (100 + armure)`)
- **Résistance** → réduit les dégâts **magiques** (`100 / (100 + résistance)`)

Et chaque ennemi a un profil tranché :

| Ennemi | Armure | Résistance | Ce qui le tue |
|---|---:|---:|---|
| Archer squelette | **46** | 6 | magie |
| Gardien d'Os | **88** | 10 | magie |
| Goule affamée | 28 | 16 | magie |
| Noyé | 20 | **42** | fer |
| Sorcière des marais | 12 | **50** | fer |
| La Reine Noyée | 22 | **66** | fer |
| Goule spectrale | 14 | **44** | fer |

**Conséquence directe** : contre 88 d'armure, un coup physique ne passe qu'à 53 %. Contre 10 de résistance, un sort passe à 91 %. **Presque deux fois plus.** Ce n'est plus un détail : c'est un choix d'équipe.

Et ça se lit sur la carte du niveau (nouvelle pastille) :

- **Blindé** (bleu) → amène de la magie
- **Protégé** (violet) → amène du fer
- **Mixte** (or) → équipe équilibrée

---

## 3. La difficulté est enfin une pente

Deux mécanismes ont été posés.

**a) Un budget de PV par niveau.** Chaque niveau vise un total de PV ennemis sur une courbe (+21 % par palier). Chaque ennemi reçoit sa part pour atteindre ce total. Une composition à deux boss et une composition à cinq petites créatures pèsent donc pareil — c'est la **composition** qui change, pas le mur de statistiques.

**b) Des compositions réparées.** Trois niveaux n'avaient aucun boss (1-4, 2-2) ou en avaient deux (2-4) : ils étaient soit offerts, soit infranchissables. Ils ont maintenant un profil clair :

| Niveau | Palier | Profil | Niveau de héros nécessaire |
|---|---:|---|---:|
| 1-1 | 0 | Blindé | 1 |
| 1-2 | 0,5 | Protégé | 2 |
| 1-3 | 1,5 | Blindé | 3 |
| 1-4 | 2,5 | **Blindé (réparé)** | 4 |
| 1-5 | 4 | Protégé | 6 |
| 2-1 | 5 | Blindé | 10 |
| 2-2 | 6,5 | **Protégé pur (réparé)** | 12 |
| 2-3 | 7,5 | **Blindé pur (réparé)** | 16 |
| 2-4 | 8,5 | Blindé, deux boss | 20 |
| 2-5 | 9,5 | Mixte, Reine + Gardien | 29 |

**Vérification** : à la puissance affichée sur chaque niveau, l'équipe de départ gagne **73 à 100 %** des combats, en **24 à 60 secondes**. Avant, c'était 0 % ou 100 % selon le niveau, avec des combats de 90 secondes.

> Les chiffres « puissance conseillée » ont été **recalculés à partir de ces mesures**. Ils ne sont plus décoratifs : 13 800 pour 1-1, 42 000 pour 2-5.

---

## 4. L'économie

| | Avant | Après |
|---|---|---|
| Or par niveau | 800 → 4 600 | **2 400 → 13 800** |
| Coût d'un niveau de héros | 220 × 1,14ⁿ | **180 × 1,10ⁿ** |
| PV/ATQ par niveau de héros | +3,5 % | **+7 %** |
| Énergie | ne remonte **jamais** | **1 par minute**, + recharge complète à chaque niveau de joueur |

**Pourquoi.** Avec l'ancien coût, monter un héros au niveau 30 coûtait 9 800 or, alors qu'un niveau de campagne en rapportait 4 600. La progression s'arrêtait net vers le niveau 25. Maintenant, **deux passes complètes de la campagne** suffisent pour amener les cinq héros de départ au niveau de la Reine.

**Pourquoi l'énergie change tout.** Elle était dépensée à l'entrée du combat et jamais rendue. Un joueur bloquait définitivement après huit combats. C'est réparé : l'énergie se recharge en temps réel, y compris hors ligne (le temps écoulé est calculé au chargement).

---

## 5. Les 14 héros

### Tanks — ils protègent, ils ne nucléarisent plus

Leurs ultimes faisaient 240 à 300 % de dégâts de zone **et** étourdissaient 1,5 à 2 s. C'était la meilleure attaque du jeu, portée par les personnages les plus solides.

| Héros | Changement |
|---|---|
| **Kael** | Jugement Ardent : 240 % → **160 %**, étourdissement 1,5 → **1,2 s**. Résistance 46 → **34** : la magie le punit enfin. |
| **Vaelen** | Rempart Écarlate : 300 % → **140 %**, étourdissement 1,8 → **1,1 s**. Bouclier 42 % → **36 %**. Résistance 56 → **40**. |
| **Gorm** | Éboulement : 260 % → **150 %**, étourdissement 2 → **1,2 s**. Résistance 60 → **44**. |

### Assassins — ils entrent, ils frappent, ils ressortent

Ils mouraient systématiquement au milieu de la formation ennemie.

| Héros | Changement |
|---|---|
| **Lyra** | 1 550 → **1 780 PV**. Après son Pas de l'Ombre : **0,45 s intouchable**. |
| **Vespera** | 1 240 → **1 500 PV**, 126 → **130 ATQ**. Même esquive après son Voile de Deuil. |

### Soins et soutiens

| Héros | Changement |
|---|---|
| **Frère Aldric** | Soin : 62 × 2,8 = 174 PV → **22 % des PV max de la cible**. Sur un tank, 174 → **682 PV**. |
| **Ashka** | 1 350 → **1 500 PV**. Hâte de l'ultime : 6 → **8 s**. Éclairs : 70 % → **90 % d'ATQ**. |
| **Morwen** | Ses goules spectrales prennent maintenant l'échelle de ses paliers (**×1,6 PV, ×1,4 ATQ**). Elles étaient décoratives. |
| **Thorne** | Gel de l'ultime : 2,2 → **2,4 s**. |
| **Seren** | 92 → **100 ATQ**. |

### La portée

Tous les héros à distance passaient de **900 à 640 px** (et Orlan de 760 à 640). Le terrain fait 1 660 px de large : à 900, un archer touchait l'autre bout du champ sans jamais bouger. Personne ne pouvait l'atteindre, et les tanks n'avaient rien à protéger.

À 640, la ligne de front redevient une ligne : les tireurs doivent avancer, les tanks doivent tenir, et les assassins ont enfin une raison d'aller chercher l'arrière.

---

## 6. Les compos

Quatre archétypes testés sur les dix niveaux, à niveau de héros 18 :

| Composition | 1-1 à 2-3 | 2-4 (deux Gardiens) | 2-5 (la Reine) |
|---|---|---|---|
| **Départ** (Kael, Lyra, Morwen, Seren, Aldric) | 100 % | 10 % | 0 % |
| **Magie** (Vaelen, Nyx, Pyrrha, Morwen, Aldric) | 100 % | **100 %** | 65 % |
| **Fer** (Vaelen, Lyra, Vespera, Sylvaine, Aldric) | 100 % | 90 % | 30 % |
| **Mixte** (Kael, Thorne, Seren, Pyrrha, Orlan) | 90-100 % | 60 % | 0 % |
| **Sustain** (Gorm, Aldric, Orlan, Sylvaine, Nyx) | 100 % | 100 % | 45 % |

Trois enseignements :

1. **La magie perce l'ossuaire, le fer découpe le marais.** Contre 88 d'armure, une flèche perd 47 % de sa force.
2. **Une compos à moitié physique, à moitié magique ne perce aucune des deux défenses.** C'est le piège du « Mixte ».
3. **L'équipe de départ ne finit pas le chapitre 2.** Il faut invoquer, choisir, équiper. C'est enfin un jeu de collection.

---

## 7. Ce qui n'a pas bougé

- Aucun héros, aucun niveau, aucun décor, aucun effet ajouté.
- Les compétences et les ultimes gardent leur mise en scène (montage kinétique, cut-in, caméra).
- Les 5 raretés d'équipement, les 4 emplacements, le butin après chaque niveau.
- Les 3 étoiles et leurs conditions.
- Le coût d'invocation (150 / 1 350 gemmes) et le système de pitié.

---

## 8. Idées pour la suite — à choisir

Classées par « ce que ça change » / « ce que ça coûte ». Rien n'est commencé.

### Mécanique

| Idée | Effet | Coût |
|---|---|---|
| **Lien d'équipe** — 2 héros qui se connaissent (Kael + Aldric, Lyra + Vespera…) gagnent un bonus quand ils sont ensemble | Crée de vraies compos, pas juste « les 5 meilleurs ». C'est la pièce qui manque à la méta. | Moyen |
| **Compétence d'ennemi pour tous** — goules, squelettes et noyés n'ont aujourd'hui aucune compétence : ils tapent, c'est tout | Les combats de base deviennent lisibles et dangereux. | Moyen |
| **Boss à phases** — à 50 % de PV, la Reine change de pattern au lieu de juste taper plus fort | Les boss deviennent des rendez-vous, pas des sacs à PV. | Moyen |
| **Équipement par chapitre** — les objets du marais donnent de la résistance, ceux de l'ossuaire de l'armure | Relie l'équipement à la méta au lieu d'être une simple courbe de puissance. | Faible |
| **Défi quotidien** — un niveau modifié (ennemis doublés, héros imposés) qui rapporte des gemmes | Une raison de revenir, et un banc d'essai pour les compos. | Moyen |
| **Chapitre 3** — la Tour elle-même, paliers 11 à 16 | Suite naturelle : la courbe est déjà paramétrée. | Élevé |

### Graphique

| Idée | Effet | Coût |
|---|---|---|
| **Ombre portée directionnelle** — l'ombre s'allonge selon la lumière du décor | Un seul réglage qui donne du volume à tout le monde. | Faible |
| **Réaction d'armure** — une étincelle à l'endroit frappé, colorée selon la défense (bleu sur armure, violet sur résistance) | Rend la nouvelle mécanique **visible** pendant le combat. | Faible |
| **Transitions de chapitre** — une carte animée entre 1-5 et 2-1 | Marque la bascule de décor, qui se fait aujourd'hui sans transition. | Faible |
| **Sol réactif** — herbe qui plie, neige qui s'envole, eau qui éclabousse au passage | Le décor réagit aux pas. Très fort effet « cher ». | Moyen |
| **Portraits animés** — les yeux suivent, la respiration bouge, sur les fiches héros | Donne vie à l'interface hors combat. | Moyen |
| **Météo par niveau** — pluie sur le marais, cendres sur le trône | Deux lignes de particules, énorme effet d'ambiance. | Faible |

---

## 9. Comment vérifier

Trois commandes, dans le dossier `game` :

```
npm run test:battle     # 2 280 combats : aucun crash, aucune valeur aberrante
npm run test:balance    # la courbe de difficulté, niveau par niveau
npx vite-node tests/test-meta.ts     # le tier list des 14 héros
npx vite-node tests/test-compos.ts   # les 5 archétypes sur les 10 niveaux
```

Et en jeu : **2-4** est le meilleur test de la nouvelle méta. Avec une équipe physique, elle plafonne autour de 50-90 %. Avec Nyx, Pyrrha et Morwen, elle tombe à 100 % dès le niveau 14.

---

# PATCH 1.1 — LES CLASSES D'AFFINITÉ

*Ajouté dans la même mise à jour, sur ta demande : « des classes comme MLBB, pas tank/assassin — obscur, lumière, combat, nature, technique ».*

## Le rôle dit comment il se bat. La classe dit d'où vient sa force.

Ce sont deux choses séparées, et les deux restent affichées :

- **Rôle** : Tank, Guerrier, Assassin, Mage, Tireur, Soutien → *sa place sur le terrain*.
- **Classe** : Lumière, Obscur, Nature, Technique, Combat → *ce qu'il est*.

## Les cinq classes

| Classe | Devise | Couleur | Bat |
|---|---|---|---|
| ☀ **Lumière** | La foi qui brûle | or | Obscur |
| ☾ **Obscur** | Ce que la nuit couve | violet | Nature |
| ❦ **Nature** | La sève et la rouille | vert | Technique |
| ⚒ **Technique** | Le calcul avant le fer | cyan | Combat |
| ⚔ **Combat** | La force, rien d'autre | rouge | Lumière |

C'est un **cycle fermé** : chaque classe en bat une et perd contre une. Pas de classe « forte partout », donc pas de classe obligatoire.

**Effet en combat** : +18 % de dégâts contre la classe qu'on bat, −13 % contre celle qui nous bat. Et le chiffre de dégâts **prend la couleur de la classe** de l'attaquant quand l'avantage joue : un 340 violet, c'est un nécromancien qui plante un marais.

## Qui est quoi

| Classe | Héros |
|---|---|
| **Lumière** (3) | Kael, Seren, Frère Aldric |
| **Obscur** (3) | Lyra, Morwen, Nyx |
| **Nature** (3) | Ashka, Sylvaine, Gorm |
| **Combat** (3) | Thorne, Vaelen, Pyrrha |
| **Technique** (2) | Vespera, Orlan |

Chaque fiche héros affiche sa classe, sa devise, **ce qu'elle bat** et **ce qu'elle craint**.

## La synergie

Deux héros de la même classe se renforcent : **+5 % de PV et d'ATQ par allié supplémentaire**.

| Même classe dans l'équipe | Bonus par héros |
|---:|---:|
| 2 | +5 % |
| 3 | +10 % |
| 4 | +15 % |
| 5 | +20 % |

Comme aucune classe ne compte plus de 3 héros, le plafond réel est **+10 %**. Assez pour récompenser une équipe thématique, pas assez pour rendre le mélange inutile.

## Les ennemis ont aussi une classe

| Ennemi | Classe |
|---|---|
| Goule affamée, Goule spectrale | Obscur |
| Archer squelette, Gardien d'Os | Combat |
| Noyé, Sorcière des marais, La Reine Noyée | Nature |

Ce qui donne une deuxième lecture des chapitres :

- **L'ossuaire** (Combat + Obscur) → la **Lumière** a l'avantage. L'équipe de départ est donc très à l'aise au chapitre 1.
- **Le marais** (Nature) → l'**Obscur** a l'avantage. Lyra est phys + Obscur : c'est la réponse parfaite à la Reine, parce qu'elle cumule le bon type de dégâts **et** le bon avantage de classe.

Les deux systèmes (armure/résistance et classes) ne disent pas toujours la même chose. C'est voulu : le meilleur héros est celui qui satisfait **les deux** — la bonne défense à percer, et la bonne affinité.

## Où ça se voit

- **Liste des héros** : pastille de classe colorée sur chaque vignette.
- **Fiche héros** : bandeau de classe avec « Bat » et « Craint ».
- **Écran Héros** : la roue des cinq classes en haut.
- **Carte de niveau** : les classes ennemies, avec leur nombre, et la classe qui les bat.
- **Préparation du combat** : les héros de la réserve qui ont l'avantage sont **surlignés en vert** (▲), et la synergie de l'équipe s'affiche sous la puissance (« ☾ ×3 +10 % »).
- **Combat** : le chiffre de dégâts change de couleur quand l'affinité joue.

## Vérification

| Niveau | Effet mesuré (niveau de héros 18) |
|---|---|
| 2-4 (deux Gardiens) | Magie **100 %** · Fer 95 % · Départ **15 %** |
| 2-5 (la Reine) | Magie (Obscur ×2) **90 %** · Sustain 45 % · Fer 20 % · Départ **0 %** |

Avant les classes, la compos Magie faisait 65 % sur 2-5. Le passage à 90 % vient uniquement de l'avantage **Obscur → Nature**.

La courbe de difficulté n'a pas bougé : avec l'équipe de départ au niveau conseillé, chaque niveau se gagne toujours entre **88 et 100 %**, en **22 à 59 secondes**.

---

# PATCH 1.2 — LA TOUR SE RÉVEILLE

Ce patch ne touche presque pas aux chiffres. Il s'occupe de ce qui manquait **entre** les chiffres : la tour ne se contente plus d'être un décor, les défenses se voient, les héros se parlent, et les ennemis ont enfin des intentions.

## 1. La météo suit le décor

Trois décors sur quatre ont maintenant leur climat, en continu, derrière les combattants :

| Décor | Climat | Ce qu'on voit |
|---|---|---|
| **Le marais** | Pluie | Traînées obliques grises, projecteurs humides, sol qui renvoie la lumière |
| **La citadelle** | Neige | Flocons lents qui dérivent, vent qui les pousse vers la droite |
| **Le trône** | Cendres | Braises et poussière grise qui montent, comme si le sol brûlait encore |
| **L'ossuaire** | — | Rien. Le silence minéral fait partie de l'ambiance |

La météo est purement décorative : elle ne change **aucune** statistique, aucun dégât. Elle passe derrière les personnages, jamais devant leurs visages.

## 2. Les défenses deviennent lisibles

Avant, un coup sur un tank et un coup sur un mage faisaient le même bruit, la même étincelle, le même chiffre. Impossible de savoir *pourquoi* on tapait dans le vide.

Maintenant, chaque impact raconte sa défense :

| Ce que vous voyez | Ce que ça veut dire |
|---|---|
| Étincelles **bleues** | L'armure physique a absorbé le coup |
| Étincelles **violettes** | La résistance magique a absorbé le coup |
| Étincelles **grises** | Mauvais type de dégâts : vous tapez là où l'ennemi est le plus dur |
| **Anneau doré + sceau** | L'affinité de classe joue : le coup fait +18 % |
| Chiffre de dégâts **teinté** | Même chose, version chiffre |

Résultat pratique : contre le Gardien d'Os (armure 88), on voit immédiatement que les flèches rebondissent en bleu — et qu'il faut passer à la magie.

## 3. Les héros se parlent : 13 liens d'équipe

Certaines paires de héros se connaissent. Quand elles sont alignées ensemble, elles gagnent un bonus **et** échangent une réplique au début du combat.

Le bonus s'applique aux **PV et à l'attaque** du héros concerné :

| Lien | Paire | Bonus |
|---|---|---|
| La Flamme et la Foi | Kael + Aldric | +8 % |
| Les Deux Lames | Lyra + Vespera | +9 % |
| Le Seuil et le Néant | Morwen + Nyx | **+10 %** |
| Les Archères de Minuit | Seren + Sylvaine | +8 % |
| Les Deux Remparts | Vaelen + Gorm | **+10 %** |
| Le Bûcher Partagé | Kael + Pyrrha | +8 % |
| Le Nord et la Pierre | Thorne + Gorm | +8 % |
| L'Orage et le Glas | Ashka + Orlan | +8 % |
| Les Voix du Chœur | Aldric + Orlan | +8 % |
| La Veuve et l'Impératrice | Vespera + Nyx | +9 % |
| Le Verre et l'Airain | **Mira** + Orlan | +8 % |
| Le Pardon Refusé | **Corvin** + Aldric | +8 % |
| La Voix et l'Épée | **Elara** + Kael | +8 % |

Les liens se **cumulent avec la synergie de classe**. Un héros peut donc toucher les deux à la fois — c'est exactement ce que fait Elara, Lumière, dans une équipe à dominante Lumière.

Où ça se voit :

- **Fiche héros** : la liste de ses liens et de ses partenaires.
- **Préparation du combat** : un encart « ⛓ liens actifs » sous la synergie.
- **En combat** : l'encart de réplique apparaît dans les 2 premières secondes.

## 4. Les ennemis ont des compétences

Jusqu'ici, seuls les boss savaient faire autre chose que taper. Les trois ennemis de base ont maintenant une intention, annoncée par un effet avant de frapper — on a le temps de lire.

| Ennemi | Compétence | Effet | Recharge |
|---|---|---|---|
| **Goule affamée** | Griffes putrides | 110 % de dégâts + **saignement** 4 × 25 % | 9 s |
| **Archer squelette** | Tir ajusté | Vise le héros **le moins blindé** et perce 35 % de son armure (×1,5) | 11 s |
| **Noyé** | Noyade | Agrippe, étourdit **0,9 s** et ralentit 2,5 s | 10 s |

Ce que ça change : la goule punit les compositions sans soigneur, l'archer **force à protéger ses arrières** (il ignore le tank), et le noyé peut bloquer un soigneur au mauvais moment. Les niveaux 2-3 à 2-5 demandent maintenant une vraie placement, pas seulement des statistiques.

## 5. Le boss change de visage

Quand un boss passe sous **50 % de vie**, il entre en **phase 2** :

- la caméra **pousse** sur lui et un flash rouge traverse l'écran ;
- il **rugit** (onde de choc au sol) ;
- ses compétences repartent **immédiatement** (`skillT` remis à 0,8 s) : le répit accordé par la première phase disparaît.

C'est le moment où les combats de 2-5 se décident : la Reine Noyée enchaîne deux fois plus vite, et il faut avoir gardé son ultime.

## 6. Trois nouveaux héros

| | **Mira** | **Corvin** | **Elara** |
|---|---|---|---|
| Rareté | SSR | SSR | SR |
| Rôle | Tireur | Guerrier | Soutien |
| Classe | Technique | Lumière | Lumière |
| PV | 1 360 | **2 650** | 1 520 |
| Attaque | **114** | 112 | 74 |
| Armure / Rés. | 18 / 24 | 62 / 38 | 24 / 46 |
| Portée | 640 | 155 | 640 |
| Spécialité | Critique 24 % | Tank de première ligne | Soins d'équipe |

**Mira — l'arbalète de forge.** Un piège au sol qui **enracine** la cible 1,4 s et la fait saigner, puis une *Salve de Forge* : six carreaux de 90 %, chacun capable de critique. Elle est fragile — mais elle tire de loin et frappe fort, avec un lien direct vers Orlan.

**Corvin — le chevalier sans pardon.** Un homme en armure noire et or, une épée aussi grande que lui. *Contrition* : 120 % de dégâts en zone et **bouclier** de 25 % de ses PV. *Jugement Différé*, son ultime : 190 % sur une ligne entière **et** un soin de 15 % pour toute l'équipe. Il soigne en frappant — le seul tank du jeu qui fait ça.

**Elara — la voix de la nef.** Une prêtresse voilée, un encensoir, une clochette, et des colombes autour d'elle. *Écho de Nef* : soin de 20 % **et** purge des effets néfastes. *Chœur des Sept*, son ultime : soin de 22 % à toute l'équipe **et** étourdissement de 1,1 s sur les ennemis proches. Elle ne tape presque pas : elle empêche l'équipe de mourir.

Les trois ont leur planche peinte, leur squelette d'animation, leurs effets propres, et un lien d'équipe qui les rattache aux héros existants.

## 7. Correction des faisceaux

Les faisceaux de Mira et de Corvin étaient étirés par un réglage d'échelle mal converti : ils apparaissaient trop courts ou mal orientés. L'épaisseur et la longueur sont maintenant calculées sur la vraie taille de la texture. Le trait de Mira traverse l'écran, le rideau de lumière de Corvin tombe du ciel.

## 8. Vérification

**17 héros** au total. Tournoi automatique (médiane 68) : Vaelen 85 · Gorm 84 · Kael 81 · Pyrrha 77 · Aldric 76 · Orlan 72 · **Corvin 71** · **Elara 69** · Vespera 68 · Nyx 68 · Thorne 66 · Lyra 65 · **Mira 64** · Seren 62 · Morwen 61 · Sylvaine 60 · Ashka 55.

Les trois nouveaux arrivent **dans le peloton**, pas au-dessus : Corvin 7ᵉ, Elara 8ᵉ, Mira 13ᵉ. Un héros fraîchement sorti qui écrase tout casserait le jeu des anciens.

Courbe de difficulté (40 runs par niveau, équipe de départ au niveau conseillé) :

| Niveau | Victoires | Durée |
|---|---|---|
| 1-1 | 100 % | 26 s |
| 1-2 | 100 % | 21 s |
| 1-3 | 100 % | 35 s |
| 1-4 | 100 % | 28 s |
| 1-5 | 100 % | 36 s |
| 2-1 | 90 % | 49 s |
| 2-2 | 100 % | 37 s |
| 2-3 | 93 % | 63 s |
| 2-4 | 93 % | 56 s |
| 2-5 | 98 % | 46 s |

2 280 combats simulés, **aucun plantage**. Chaque niveau reste gagnable, mais les niveaux 2-1 / 2-3 / 2-4 laissent maintenant une vraie place à l'échec — c'est l'effet direct des compétences ennemies et de la phase 2 des boss.
