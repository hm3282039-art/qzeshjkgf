# Légendes de la Tour Infinie — analyse de game design

*Regard extérieur, sans complaisance. Ce document ne parle pas de code : il parle de ce que le joueur ressent, décide et revient faire le lendemain.*

---

## 1. Verdict en trente secondes

C'est un **très beau prototype**, pas encore un jeu qui tient sept jours.

La fabrication est au-dessus de la moyenne indé : direction artistique cohérente, cinématiques d'ultime signées par héros, interface soignée, zéro installation, zéro serveur, zéro paiement. Ça, c'est rare et ça se voit.

Mais le **système** est en dessous du plancher du genre. Un joueur de Summoners War ou de MLA va trouver l'emballage superbe et le jeu vide, parce qu'il n'a **presque aucune décision à prendre**. Tout ce qu'il fait, c'est regarder des chiffres monter.

Ce n'est pas un échec de finition. C'est un choix de priorités : on a passé le temps sur la surface (art, effets, menus) au lieu de la boucle (choix, rituels, murs à franchir avec la tête).

---

## 2. Ce qui est réellement fort

**a) La règle du Sanctuaire.** Un R monté à fond vaut 0,905 d'un SSR natif — jamais plus. C'est une décision de design courageuse : elle protège la valeur des SSR sans rendre les R inutiles comme nourriture. La plupart des gacha règlent ça avec un mur de rareté brutal ou une fusion qui annule la rareté. Ici, la règle est lisible en une phrase et tient debout.

**b) Les ultimes télégraphiés et interruptibles.** Un boss qui annonce son attaque, qu'on peut annuler d'un stun : c'est de l'expression de skill, et c'est **rare dans un jeu de ce genre**. C'est le seul endroit du jeu où le joueur peut « jouer mieux » que son stuff.

**c) L'identité des héros.** Un motif, une phrase, un son par héros : Kael ne ressemble pas à Vaelen même quand ils font les mêmes dégâts. Peu de jeux mobiles vont aussi loin sur 27 personnages.

**d) Le monde qui vit sans serveur.** Les bots progressent chaque jour de façon déterministe. C'est élégant, vérifiable, et ça donne l'illusion d'un MMO pour le coût d'un fichier statique.

**e) Zéro friction.** Pas de téléchargement, pas de compte, pas de boutique réelle. Pour un joueur méfiant, c'est un argument massif.

---

## 3. Le ressenti, mode par mode

| Mode | Ce que le joueur fait vraiment | Ce qu'il ressent | Durée de vie |
|---|---|---|---|
| Campagne | Choisit 5 héros, regarde, monte de niveau | « Ça avance » puis « ça avance plus » | 2 à 3 h avant le mur |
| Tour | Le même combat, un étage plus haut | Neutre. Aucune surprise | Faible |
| Arène | Mesure ses dégâts sur un mannequin | Curiosité 10 minutes | Très faible |
| Invocation | Appuie sur un bouton, attend l'animation | Plaisir court, réel | Moyen (pitié 60) |
| Sanctuaire | Choisit qui nourrir, qui sacrifier | **Le meilleur moment du jeu** | Bon |
| Équipement | Clique « équiper le meilleur » | Aucune décision | Nul |
| Classement | Regarde les bots monter | Frustration douce | Faible |
| Guilde | Rejoint, lit un faux chat | Curiosity, puis rien | Faible |
| Hub | Clique des bâtiments qui ouvrent des menus | Décoratif | Nul |

Le problème n'est pas qu'un mode est mauvais : c'est qu'**aucun mode ne demande une décision différente**. Partout, la réponse optimale est « plus de puissance ».

---

## 4. Les six vérités qui fâchent

### 4.1 La boucle n'a qu'un axe
Combattre → gagner de l'or → monter de niveau → combattre plus loin. Il n'y a pas de deuxième axe (build, set d'équipement, timing, positionnement, choix tactique). Dans Summoners War, le joueur passe autant de temps à décider *comment* équiper qu'à farmer. Ici, l'équipement est un pool partagé et le bouton « meilleur objet » fait le travail.

### 4.2 Le mur n'est pas du contenu, c'est de l'arithmétique
- Coût pour amener **un seul SSR au niveau 100** : ≈ 26 millions d'or (180 × 1,1ⁿ, sommé).
- Or rapporté par 10-5 : ≈ 48 000.
- Donc ≈ **536 combats**, ≈ 5 900 énergie, ≈ **98 heures de régénération** pour un héros.
- Pendant ce temps, les chapitres 17 à 20 affichent **0 % de victoire** même au niveau 170 avec étoiles rouges.

Un joueur ne voit pas « il me manque 26 M d'or ». Il voit « le jeu ne veut plus de moi ». Le mur doit être **lisible et franchissable par une décision**, pas par trois jours d'attente.

### 4.3 Les R sont un piège
Ils plafonnent à 0,905 d'un SSR de base, et un SSR monte à 1,46 avec ses étoiles rouges. Autrement dit : un R à fond vaut **62 %** d'un SSR à fond. Ils ne seront jamais dans une équipe de fin de jeu. Les 10 nouveaux héros sont donc, mécaniquement, **de la nourriture habillée**. Le joueur le découvrira au chapitre 8 et se sentira floué — pas parce que la règle est mauvaise, mais parce qu'on ne lui a jamais donné de raison de les aimer.

### 4.4 Le combat n'est pas un puzzle
Auto par défaut, ultimes automatiques, pas de placement, pas de ciblage, pas d'ordre. Les boss sont des sacs à PV avec une grosse attaque (le Forgeron céleste : ×1,55 PV, ×1,35 armure). On ne les bat pas en comprenant quelque chose : on les bat en attendant d'avoir plus de chiffres.
**Conséquence directe** : les cinématiques d'ultime, aussi belles soient-elles, sont décoratives. Elles ne récompensent aucune décision. Un joueur les coupe au bout de vingt combats.

### 4.5 Il n'y a aucun rituel quotidien
Le genre vit de trois rituels : missions journalières, boss de guilde, arène à tickets. Ici : rien. Le Courrier paie une fois, les Succès paient une fois, la Guilde est un décor. **Rien ne donne envie de revenir demain**, à part l'énergie qui se remplit — ce qui est le pire motif de retour possible.

### 4.6 La Tour est un escalier sans surprise
Même combat, mêmes ennemis, PV plus gros. Un mode infini sans **modificateur** (bénédiction, malédiction, choix tous les 5 étages) n'est pas un mode : c'est un compteur.

---

## 5. Comparaison honnête

| Critère | Ici | Summoners War | MLA | AFK Arena |
|---|---|---|---|---|
| Décision par combat | Faible | Forte (runes, vitesse, ordre) | Moyenne | Moyenne (formation) |
| Rituel quotidien | Absent | Fort | Fort | Très fort |
| Profondeur de build | Nulle | Très forte | Moyenne | Moyenne |
| PvP | Simulé | Réel | Réel | Réel |
| Guilde | Décor | Guerre de guilde | Boss de guilde | Boss + guerre |
| Idle / hors-ligne | Absent | Faible | Fort | Très fort |
| Expression de skill | **Réelle (interrupt)** | Moyenne | Faible | Faible |
| Identité visuelle | **Très forte** | Moyenne | Moyenne | Forte |
| Accessibilité | **Exceptionnelle** | Faible | Moyenne | Moyenne |

Lecture : on gagne sur l'identité, l'accès et l'interrupt. On perd sur **tout le reste**, c'est-à-dire sur ce qui fait rester.

---

## 6. Ce que je ferais, dans cet ordre

### P0 — Rendre la progression lisible et franchissable
- Plafonner la hausse du coût de niveau (1,04–1,06 au lieu de 1,10) **ou** indexer l'or gagné sur le chapitre.
- Recalibrer 11→20 pour qu'un joueur « normal » (niveau 90–130, 5★ + 2✦) gagne, et qu'un joueur investi gagne confortablement.
- Afficher « il te manque X » au lieu d'un mur silencieux.
**Pourquoi** : sans ça, 40 % du contenu est mort et le joueur part avant de voir les cinématiques des nouveaux boss.

### P0 — Donner une décision par combat
La moins chère et la plus forte : **l'ultime manuel récompensé**. Si le joueur déclenche l'ultime dans la fenêtre de télégraphe du boss, il l'interrompt (dégâts ×1,5 + étourdissement). Automatique = correct ; manuel bien timing = décisif.
**Pourquoi** : ça transforme 100 combats identiques en 100 occasions de réussir quelque chose.

### P1 — Donner une raison d'aimer les R
Chaque R nourri au Sanctuaire donne un **bonus permanent de collection** (+0,5 % PV/ATQ par palier, plafonné). Les R cessent d'être des déchets : ils deviennent la monnaie d'un compte à rebours que le joueur voit grandir.
**Pourquoi** : c'est la seule façon de justifier 10 héros faibles sans mentir au joueur.

### P1 — Trois rituels, pas dix
1. **Boss de guilde** : une barre de PV partagée, les bots de la guilde tapent chaque jour, le joueur apporte sa contribution.
2. **Arène asynchrone** : 5 combats/jour contre des équipes de bots figées, classement hebdomadaire.
3. **Trois missions quotidiennes** qui paient en gemmes, pas en or.
**Pourquoi** : c'est ce qui fait ouvrir l'app le matin. Rien d'autre.

### P1 — De la profondeur d'équipement, pas plus de statistiques
6 sets à effet (2 et 4 pièces) + 2 substats aléatoires par objet. Le joueur doit **choisir** entre vitesse, critique et survie.
**Pourquoi** : c'est le cœur de Summoners War, et ça coûte moins cher que 20 nouveaux héros.

### P2 — Une Tour avec des choix
Tous les 5 étages : 1 bénédiction parmi 3 (dégâts, soin, ultime plus rapide). Ça ne demande aucun nouvel asset et ça change tout.

### P2 — Un hub qui sert
Deux bâtiments interactifs suffisent : la **forge** (gamble d'objet) et la **taverne** (rumeur qui révèle un niveau caché). Le reste doit rester des menus, mais assumés.

---

## 7. Ce que je couperais

- **Événements** : annoncé, inexistant. Un onglet vide coûte plus de crédibilité qu'il n'apporte d'espoir.
- **Sac** : un inventaire sans décision n'est pas un système, c'est une liste.
- **Tour** telle qu'elle est : à garder mais à transformer, pas à laisser en compteur.
- **Les 5 bâtiments du hub** qui ne sont que des boutons déguisés : à fusionner en 2.

---

## 8. Verdict final

Le jeu a une **âme** — c'est rare et ça ne s'achète pas. Il n'a pas encore de **boucle** — c'est mécanique et ça se corrige.

Aujourd'hui, un joueur curieux reste deux heures et repart avec un bon souvenir. Pour qu'il reste deux semaines, il ne faut pas plus de contenu : il faut **une décision à prendre toutes les cinq minutes**, et **une raison de revenir demain**. Les deux tiennent en trois chantiers, pas en trente.

La bonne nouvelle : rien de ce qui est beau n'est à jeter pour ça.
