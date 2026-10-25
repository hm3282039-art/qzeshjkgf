# LÉGENDES DE LA TOUR INFINIE — fiche de conception complète

> **Mode d'emploi pour l'IA qui lit ce document**
> Ce document décrit un jeu réel, jouable, en ligne. Tu n'as pas besoin de le voir tourner : tout ce qui compte est chiffré ici.
> Je ne cherche **pas** des compliments. Je cherche ce qui **casse**, ce qui **ennuie**, ce qui **manque**, et des idées concrètes que je peux coder.
> Réponds en français. Sois précis et chiffré. Si tu proposes un système, donne ses valeurs de départ, pas juste son nom.
> À la fin du document (§11) il y a les questions exactes auxquelles je veux que tu répondes. Tu peux tout lire dans l'ordre, mais réponds dans l'ordre de ces questions.

---

## 1. Le jeu en une phrase

**Un RPG de collection en temps réel où 5 héros affrontent automatiquement des vagues de morts-vivants, et où la seule décision du joueur est : qui je mets dans l'équipe, et comment je les fais monter.**

Le jeu se joue dans un navigateur (ordinateur ou téléphone), sans installation. Un seul fichier HTML de 10 Mo : images, styles et code sont inlinés dedans, donc une fois la page chargée il n'y a plus aucun appel réseau.

- **URL** : https://hm3282039-art.github.io/qzeshjkgf/
- **Genre de référence** : *Mobile Legends: Adventure* / *AFK Arena* — mais 100 % solo, sans serveur, sans PvP, sans paiement.
- **Public visé** : joueur occasionnel, sessions de 3 à 10 minutes.
- **Réalité de production** : **une seule personne**, en TypeScript/PixiJS, sans moteur de jeu, sans artiste 3D.

---

## 2. La boucle de jeu

```
Ville (hub)
  └─> Campagne : choisir un niveau
        └─> Préparation : composer l'équipe de 5
              └─> Combat automatique (~20 à 60 s), le joueur peut lancer les ultimes
                    └─> Victoire → or, gemmes, XP, 1 objet d'équipement
                          └─> Retour à la Ville → améliorer les héros → niveau suivant
```

Un **niveau coûte de l'énergie** (6 à 9 points sur 60 maximum, +1 toutes les 60 secondes). L'énergie est la seule limite de farm : elle empêche de farmer 50 fois le même niveau d'affilée, et pousse à revenir plus tard.

**Ce qui existe réellement aujourd'hui** (4 écrans fonctionnels) :

| Écran | État |
|---|---|
| **Ville** | Hub visuel animé, bâtiments cliquables |
| **Campagne** | 10 niveaux, 2 chapitres, 3 étoiles par niveau |
| **Héros** | 17 héros, niveaux, étoiles, 4 emplacements d'équipement, fiche de liens et de classes |
| **Invocation** | Gacha x1 / x10, gemmes, compteur de garantie |

**Ce qui est affiché mais pas encore implémenté** (boutons qui répondent « bientôt ») : Sac, Guilde, Boutique, Quêtes, Événements, Classement, Succès, Codex, Connexion quotidienne, Forge d'objets.

---

## 3. Le combat — le cœur du jeu

### 3.1 Format

- **5 héros contre 4 à 6 ennemis**, sur un terrain en perspective 2.5D de 1920 × 1080.
- **Temps réel, automatique** : les héros se déplacent, choisissent leur cible et attaquent seuls.
- **Une seule action du joueur** : quand la barre d'énergie d'un héros est pleine, il peut **déclencher son ultime** d'un clic. Sinon, l'IA le fait toute seule (mode AUTO, activé par défaut).
- **Vitesses ×1 / ×2 / ×3**, pause, et un mode « cinéma » qui zoome sur l'action.

### 3.2 Les quatre actions d'un héros

| Action | Déclenchement | Effet |
|---|---|---|
| **Attaque de base** | Toutes les `interval` secondes | Dégâts = `ATQ × 1,0` |
| **Compétence** | Toutes les `skillCd` secondes, dès `skillFirst` | Effet propre au héros (soin, zone, stun, invocation…) |
| **Ultime** | Barre d'énergie à 100 | Effet spectaculaire, propre au héros |
| **Déplacement** | En continu | Se rapproche si la cible est hors de portée (`range`) |

**Gain d'énergie** : +1,2 par seconde, +4,2 × `interval` par attaque portée, +30 % des dégâts subis rapportés aux PV max. Un ultime arrive donc en gros **toutes les 18 à 25 secondes**.

### 3.3 Les formules exactes

```
Dégâts = max(1, ATQ × multiplicateur × classe × critique × variance × mitigation × (1 − réduction))

mitigation   = 100 / (100 + défense)          défense = armure si physique, résistance si magique
critique     = 1,75 si coup critique, sinon 1  (probabilité = stat « crit »)
variance     = 0,92 à 1,08                     (±8 %, pour éviter les résultats trop lisses)
classe       = 1,18 avantage / 0,87 désavantage / 1,00 neutre
PV et ATQ    = base × (1 + 0,07 × (niveau − 1))
```

**Deux défenses distinctes** — c'est le point central du jeu :

- **Armure** arrête les dégâts physiques.
- **Résistance** arrête les dégâts magiques et les dégâts sur la durée (saignement, brûlure, poison).

Ce qui donne la lecture suivante : contre un **Gardien d'Os** (armure 88, résistance 10), les flèches font **53 %** de dégâts en moins et la magie **presque rien** en moins. Contre une **Sorcière des marais** (armure 12, résistance 50), c'est l'inverse. Le joueur doit donc lire la composition ennemie avant de composer son équipe.

### 3.4 Les rôles

| Rôle | Rôle réel en combat |
|---|---|
| **Tank** | Encaisse, provoque (force les ennemis à le cibler), protège la ligne |
| **Guerrier** | Mélange dégâts et résistance, tient la mêlée |
| **Assassin** | Se téléporte sur l'ennemi le plus faible, gros critique, très fragile |
| **Mage** | Dégâts magiques de zone à distance (640 px) |
| **Tireur** | Dégâts physiques à distance, rapides, fragiles |
| **Soutien** | Soigne, étourdit, purifie les malus |

---

## 4. Les classes d'affinité — le système le plus récent

Un **cycle fermé à 5 classes**, indépendant du rôle. Le rôle dit *comment* le héros se bat ; la classe dit *d'où vient sa force*.

```
Lumière → Obscur → Nature → Technique → Combat → Lumière
```

| Classe | Devise | Bat | Couleur |
|---|---|---|---|
| **Lumière** | La foi qui brûle | Obscur | `#ffd36a` |
| **Obscur** | Ce que la nuit couve | Nature | `#a06bff` |
| **Nature** | La sève et la rouille | Technique | `#7ed957` |
| **Technique** | Le calcul avant le fer | Combat | `#6ad8ff` |
| **Combat** | La force, rien d'autre | Lumière | `#ff5a4a` |

- **Avantage : ×1,18** de dégâts. **Désavantage : ×0,87.** Écart total entre les deux : **×1,36**.
- **Synergie d'équipe** : +5 % de PV et d'ATQ par allié **supplémentaire** de la même classe, et au maximum +20 % (impossible d'aller au-delà, une équipe compte 5 héros). Une équipe de 3 Lumière donne +10 % aux trois.

**Pourquoi ces chiffres** : j'ai volontairement choisi un écart **modéré**. Un avantage à ×1,5 rendrait les mauvais choix punitifs et le jeu frustrant ; à ×1,18, le bon choix se sent sans être obligatoire. Le vrai levier est ailleurs : c'est la **somme** classe + défense + rôle.

### Les liens d'équipe

13 paires de héros qui se connaissent. Si les deux sont alignés, **+8 à +10 % de PV et d'ATQ** pour les deux, **et** une réplique échangée au début du combat.

| Lien | Paire | Bonus |
|---|---|---|
| La Flamme et la Foi | Kael + Aldric | +8 % |
| Les Deux Lames | Lyra + Vespera | +9 % |
| Le Seuil et le Néant | Morwen + Nyx | +10 % |
| Les Archères de Minuit | Seren + Sylvaine | +8 % |
| Les Deux Remparts | Vaelen + Gorm | +10 % |
| Le Bûcher Partagé | Kael + Pyrrha | +8 % |
| Le Nord et la Pierre | Thorne + Gorm | +8 % |
| L'Orage et le Glas | Ashka + Orlan | +8 % |
| Les Voix du Chœur | Aldric + Orlan | +8 % |
| La Veuve et l'Impératrice | Vespera + Nyx | +9 % |
| Le Verre et l'Airain | Mira + Orlan | +8 % |
| Le Pardon Refusé | Corvin + Aldric | +8 % |
| La Voix et l'Épée | Elara + Kael | +8 % |

Les liens **se cumulent avec la synergie de classe**. Ils servent surtout à donner une raison de jouer des héros « moyens » : Gorm est médiocre seul, mais il est le partenaire de deux des meilleurs tanks.

---

## 5. Les héros — les 17 personnages

Les stats sont au **niveau 1, 0 objet, 0 étoile bonus**. `interval` = secondes entre deux attaques. `range` = portée en pixels (640 = ligne arrière, 125-175 = mêlée).

### Légende des raretés

| Rareté | Taux d'invocation | Étoiles de base | Coût de montée de niveau (niv. 1) |
|---|---|---|---|
| **SSR** | 3 % | 5 | 180 or |
| **SR** | 27 % | 4 | 130 or |
| **R** | 70 % (objets) | — | — |

Coût du niveau suivant : `coût × 1,10^(niveau−1)`. **Il n'y a aucun niveau maximum.**

### Tableau complet

| Héros | Rareté | Rôle | Classe | PV | ATQ | Armure | Rés. | Interval | Portée | Crit | Départ |
|---|---|---|---|---|---|---|---|---|---|---|---|
| **Kael** | SSR | Tank | Lumière | 3 100 | 72 | 70 | 34 | 1,3 s | 140 | 8 % | ✅ |
| **Lyra** | SSR | Assassin | Obscur | 1 780 | 98 | 26 | 32 | 0,75 s | 125 | 30 % | ✅ |
| **Morwen** | SSR | Mage | Obscur | 1 200 | 118 | 14 | 26 | 1,6 s | 640 | 10 % | ✅ |
| **Seren** | SR | Tireur | Lumière | 1 250 | 100 | 16 | 22 | 1,05 s | 640 | 18 % | ✅ |
| **Frère Aldric** | SR | Soutien | Lumière | 1 400 | 62 | 30 | 40 | 1,4 s | 640 | 5 % | ✅ |
| **Thorne** | SR | Guerrier | Combat | 2 400 | 105 | 48 | 30 | 1,5 s | 150 | 12 % | |
| **Nyx** | SSR | Mage | Obscur | 1 150 | 128 | 12 | 32 | 1,7 s | 640 | 12 % | |
| **Ashka** | SR | Soutien | Nature | 1 500 | 80 | 26 | 36 | 1,3 s | 640 | 10 % | |
| **Vaelen** | SSR | Tank | Combat | 3 600 | 66 | 92 | 40 | 1,45 s | 145 | 6 % | |
| **Sylvaine** | SSR | Tireur | Nature | 1 320 | 104 | 18 | 22 | 0,95 s | 640 | 24 % | |
| **Pyrrha** | SSR | Mage | Combat | 1 180 | 132 | 13 | 24 | 1,65 s | 640 | 10 % | |
| **Orlan** | SR | Soutien | Technique | 1 650 | 86 | 26 | 42 | 1,5 s | 640 | 5 % | |
| **Vespera** | SSR | Assassin | Technique | 1 500 | 130 | 18 | 28 | 0,82 s | 150 | 24 % | |
| **Gorm** | SR | Tank | Nature | 4 300 | 60 | 100 | 44 | 2,0 s | 150 | 3 % | |
| **Mira** | SSR | Tireur | Technique | 1 360 | 114 | 18 | 24 | 0,98 s | 640 | 24 % | |
| **Corvin** | SSR | Guerrier | Lumière | 2 650 | 112 | 62 | 38 | 1,35 s | 155 | 10 % | |
| **Elara** | SR | Soutien | Lumière | 1 520 | 74 | 24 | 46 | 1,45 s | 640 | 6 % | |

**Répartition** : 10 SSR, 7 SR · Lumière 5, Obscur 3, Nature 3, Technique 3, Combat 3 · Tank 3, Guerrier 2, Assassin 2, Mage 3, Tireur 3, Soutien 4.

**Équilibre mesuré** — 400 équipes tirées au hasard (17 héros, 5 par équipe, niveau adapté au niveau joué), classement en % de victoires :

```
Vaelen 85 · Gorm 84 · Kael 81 · Pyrrha 77 · Aldric 76 · Orlan 72 · Corvin 71
Elara 69 · Vespera 68 · Nyx 68 · Thorne 66 · Lyra 65 · Mira 64 · Seren 62
Morwen 61 · Sylvaine 60 · Ashka 55          (médiane 68)
```

Aucun héros n'est inutile, aucun n'est obligatoire : l'écart entre le premier et le dernier est de **30 points**, ce qui est beaucoup à l'œil, mais ces héros ne jouent pas le même rôle — Gorm est nul en dégâts et excellent en survie, ce que le tournoi ne mesure pas.

### Les ultimes, par héros

| Héros | Compétence | Ultime |
|---|---|---|
| Kael | Bouclier de 30 % PV + provocation 6 s | 160 % en zone + étourdis 1,2 s |
| Lyra | Téléportation + 260 % sur la cible la plus faible | 7 frappes × 120 %, intouchable, vol de vie 35 % |
| Morwen | Relève 2 goules alliées 12 s | 520 % sur 4 s en zone + ralentissement |
| Seren | Flèche traversante, 220 % sur la ligne | 5 volées × 80 % sur tous |
| Aldric | Soin 280 % sur le plus blessé | Soin 25 % PV équipe + purge + −35 % dégâts 5 s |
| Thorne | 160 % zone + ralentissement 2 s | 260 % + gel 2,2 s sur tout le terrain |
| Nyx | Trou noir, 6 × 35 % + aspiration 2,2 s | Attire + étourdit tous, puis 380 % |
| Ashka | Éclair en chaîne sur 4 cibles, −15 % par rebond | Équipe +45 % vitesse d'attaque 6 s, 6 éclairs |
| Vaelen | Bouclier 42 % + provocation + −20 % dégâts équipe | 140 % zone + étourdis 1,1 s + équipe intouchable 1,2 s |
| Sylvaine | 5 flèches en éventail 120 % + saignement | 8 ronces 100 % + enracinement 1,5 s |
| Pyrrha | Météore 280 % + brûlure 4 s | 3 vagues × 180 % + brûlure 6 s |
| Orlan | Étourdis 1,2 s + ralentis 4 s | Fige tout 2 s + rend 18 % PV à chaque allié |
| Vespera | Téléportation + 280 % | 8 frappes × 110 %, vol de vie 35 % |
| Gorm | Bouclier 38 % + provocation | 150 % zone + étourdis 1,2 s |
| Mira | Piège : enracine 1,4 s + saignement | 6 carreaux × 90 % |
| Corvin | 120 % zone + bouclier 25 % | 190 % sur une ligne + soin 15 % équipe |
| Elara | Soin 20 % + purge | Soin 22 % équipe + étourdis 1,1 s |

---

## 6. Les ennemis

| Ennemi | Classe | PV | ATQ | Armure | Rés. | Interval | Portée | Rôle |
|---|---|---|---|---|---|---|---|---|
| **Goule affamée** | Obscur | 1 800 | 108 | 28 | 16 | 0,95 s | 130 | Mêlée rapide |
| **Archer squelette** | Combat | 1 250 | 128 | 46 | 6 | 1,45 s | 640 | Distance, fragile |
| **Gardien d'Os** (boss) | Combat | 6 800 | 168 | 88 | 10 | 1,8 s | 175 | Mur blindé |
| **Goule spectrale** | Obscur | 520 | 38 | 14 | 44 | 1,0 s | 120 | Invocation de Morwen |
| **Noyé** | Nature | 2 200 | 96 | 20 | 42 | 1,2 s | 130 | Contrôle |
| **Sorcière des marais** | Nature | 1 350 | 120 | 12 | 50 | 1,6 s | 640 | Dégâts magiques |
| **La Reine Noyée** (boss) | Nature | 9 200 | 180 | 22 | 66 | 1,9 s | 190 | Zone + invocations |

### Compétences ennemies (ajoutées récemment)

| Ennemi | Compétence | Effet | Recharge |
|---|---|---|---|
| **Goule** | Griffes putrides | 110 % + saignement 4 × 25 % | 9 s |
| **Archer squelette** | Tir ajusté | Vise le héros **le moins blindé**, ignore 35 % de son armure, ×1,5 | 11 s |
| **Noyé** | Noyade | Agrippe, étourdit 0,9 s, ralentit 2,5 s | 10 s |
| **Gardien d'Os** | Frappe tournoyante | Zone + recul | 7 s |
| **Sorcière** | Maléfice | Dégâts magiques + brûlure | 9 s |
| **Reine Noyée** | Raz-de-marée | Grosses dégâts de zone, **interruptible** par un étourdissement | 7,5 s |

### La phase 2 des boss

Quand un boss passe **sous 50 % de PV** :

1. **+30 % d'attaque**, **−20 % d'intervalle** (il frappe 25 % plus vite) ;
2. **ses compétences repartent immédiatement** (le temps de recharge est remis à 0,8 s) ;
3. la caméra pousse sur lui, un flash rouge traverse l'écran, il rugit.

C'est le moment où la plupart des combats se décident. Le joueur doit avoir gardé un ultime défensif ou un étourdissement.

---

## 7. La campagne — 10 niveaux

| Niveau | Nom | Décor | Puissance conseillée | Énergie | or / gemmes / XP |
|---|---|---|---|---|---|
| **1-1** | La Route des Pendus | Ossuaire | 13 800 | 6 | 2 400 / 90 / 180 |
| **1-2** | Le Marais des Noyés | Marais | 14 200 | 6 | 3 300 / 180 / 240 |
| **1-3** | Les Ossuaires | Ossuaire | 14 800 | 6 | 4 200 / 240 / 300 |
| **1-4** | Le Chœur des Noyées | Marais | 15 400 | 6 | 5 100 / 300 / 360 |
| **1-5** | Le Trône Englouti | Marais | 17 000 | 7 | 6 300 / 390 / 440 |
| **2-1** | Les Cloches Fêlées | Trône | 22 000 | 7 | 7 800 / 450 / 500 |
| **2-2** | Le Chœur des Damnés | Citadelle | 24 000 | 7 | 9 000 / 510 / 580 |
| **2-3** | La Nef Noire | Trône | 27 000 | 8 | 10 200 / 570 / 660 |
| **2-4** | Le Caveau des Rois | Citadelle | 34 000 | 8 | 11 700 / 645 / 760 |
| **2-5** | Le Trône de Cendre | Trône | 42 000 | 9 | 13 800 / 750 / 900 |

**Montée des ennemis** : +21 % de PV et +16 % d'ATQ par palier (`tier`), composés. Un palier = un niveau. Les niveaux diffèrent surtout par leur **composition**, pas par un mur de statistiques : le budget total de PV d'un niveau est fixé à l'avance, puis réparti entre les ennemis présents.

**Compositions** : 1-1 → 5 ennemis (1 boss) · 1-3 → 6 ennemis (1 boss) · 2-2 → 6 ennemis (**aucun boss**) · 2-4 et 2-5 → **2 boss simultanés**.

---

## 8. Économie et progression

### Ressources

| Ressource | Départ | Gain | Usage |
|---|---|---|---|
| **Or** | 5 000 | Niveaux (2 400 → 13 800) + objets | Monter les héros |
| **Gemmes** | 300 | Niveaux (90 → 750), cadeaux | Invoquer |
| **Énergie** | 60 / 60 | +1 / minute | Lancer un niveau (6 à 9) |
| **XP joueur** | 0 | Fin de niveau | Niveau de compte (`xpMax × 1,3` à chaque niveau) |

### Invocation

- **150 gemmes** l'unité, **1 350** les dix (soit −10 %).
- **SSR 3 %**, **SR 27 %**, **R 70 %**.
- Le **x10 garantit au moins un SR**.
- **Garantie SSR au bout de 60 invocations** sans SSR (compteur visible).
- Un **doublon** donne **+1 étoile** au héros (10 étoiles maximum ; au-delà, remboursement en or : 12 000 pour un SSR).
- Un R donne soit **2 500 or** (60 %), soit **60 XP** (40 %).

### Étoiles et niveaux

- **Niveau** : +7 % de PV et d'ATQ par niveau, **aucun maximum**. Coût `180 × 1,10^(n−1)` (SSR).
- **Paliers de compétence** : +25 % de puissance de compétence tous les 10 niveaux.
- **Étoiles** : de 4 ou 5 à 10, uniquement via les doublons.

### Équipement

4 emplacements : **Arme, Armure, Casque, Bottes**. Les objets sont **partagés** entre tous les héros (pas d'objet par personnage), donc on les déplace selon le niveau.

Chaque objet donne un **pourcentage de la statistique de base** du héros — ainsi un objet vaut la même chose pour un tank que pour un assassin, et l'équilibrage reste lisible.

| Rareté | Multiplicateur | Stats secondaires | Chances |
|---|---|---|---|
| **Commun** | ×1,0 | 0 | 52 % |
| **Rare** | ×1,3 | 1 | 30 % |
| **Épique** | ×1,7 | 2 | 13 % |
| **Légendaire** | ×2,1 | 2 | 4,4 % |
| **Mythique** | ×2,6 | 3 | 0,6 % |

Un objet tombe **après chaque victoire**. La Forge (fusion de 3 objets pour monter en rareté) est **conçue mais pas encore codée**.

---

## 9. Ce que le jeu donne à voir

C'est une grosse partie du travail réel : le jeu cherche à être **beau et lisible**, pas seulement équilibré.

| Élément | Détail |
|---|---|
| **Décors 2.5D** | 4 environnements peints (Ossuaire, Marais, Citadelle, Trône), perspective fixe, profondeur par calques |
| **Météo** | Pluie dans le marais, neige sur la citadelle, cendres sur le trône — purement décoratif |
| **Squelettes anatomiques** | Chaque héros a un rig (hanches, cou, tête, 2 bras, pans de cape) qui bouge pendant l'attaque : ce n'est pas un sprite qui glisse, c'est un corps qui se plie |
| **Réactions de défense** | Étincelles bleues = armure, violettes = résistance, grises = mauvais type de dégâts, anneau doré = avantage de classe |
| **Projectiles à forme réelle** | Chaque projectile est identifiable : flèche, carreau, orbe d'ombre, éclat de lumière, os, éclair |
| **Mise en scène d'ultime** | Chaque ultime a sa propre séquence (cut-in du visage, ralenti, zoom, onde de choc) |
| **Effets** | ~30 types : faisceaux, runes, sigils, éclairs en chaîne, secousses de caméra, nombres flottants |
| **Portraits et planches** | 17 héros ont une illustration peinte + un portrait détouré |

**Technique** : TypeScript + PixiJS (WebGL), 15 254 lignes de code, build en un seul fichier HTML (tout est inliné : images, CSS, JS) pour que le lien fonctionne partout. Sauvegarde locale via `localStorage`. Aucun serveur, aucun compte.

---

## 10. La difficulté, mesurée

40 simulations par niveau, avec l'**équipe de départ** (Kael, Lyra, Morwen, Seren, Aldric) au niveau conseillé, sans équipement :

| Niveau | Victoires | Durée moyenne |
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

**Plus de 2 000 combats simulés, aucun plantage.**

Compositions testées au niveau 18 :

| Composition | 2-4 | 2-5 |
|---|---|---|
| Équipe de départ (SSR + SR de base) | **15 %** | **0 %** |
| Magie (Morwen, Nyx, Pyrrha) | **100 %** | **90 %** |
| Fer (Lyra, Vespera, Sylvaine) | 95 % | 20 % |
| Mixte | 60 % | 0 % |
| Sustain (2 tanks + 2 soigneurs) | **100 %** | 45 % |

Ces chiffres disent la vérité du jeu : **la composition compte plus que la puissance**. Une équipe de départ au niveau maximum de raisonnable ne passe pas 2-5 ; une équipe magique au même niveau passe à 90 %.

---

## 11. Ce que je veux que tu évalues

### Le contexte honnête

- Je suis **seul**, je code en TypeScript, je ne peux pas produire d'art 3D ni animer à la main 17 personnages.
- Le jeu doit rester **un seul fichier HTML** (contrainte de diffusion).
- **Pas de serveur** : pas de PvP temps réel, pas de guilde réelle, pas de classement en ligne.
- Je peux coder des **systèmes** (règles, formules, écrans), pas des assets lourds.
- Le jeu est **déjà jouable de bout en bout** : 10 niveaux, 17 héros, équipement, gacha.

### Mes vrais doutes, classés

1. **La boucle est courte.** 10 niveaux, ça se termine en une soirée. Après le niveau 2-5, il n'y a **rien** : pas de chapitre 3, pas de mode infini, pas de raison de continuer à monter ses héros. C'est mon problème n°1.
2. **Le joueur ne décide presque rien pendant un combat.** Il regarde, il clique parfois sur un ultime. Est-ce que ça suffit, ou est-ce qu'il faut ajouter une décision *pendant* le combat ?
3. **17 héros, mais aucun contenu qui les distingue vraiment.** Les ultimes sont différents, les rôles sont différents, mais un joueur ressent-il vraiment la différence entre jouer Seren et Sylvaine ?
4. **Le gacha n'a aucune raison d'exister** sans monétisation : 3 % de SSR avec garantie à 60, c'est généreux, mais qu'est-ce que ça apporte au joueur solo, à part du hasard ?
5. **Les classes d'affinité sont-elles lisibles ?** ×1,18 / ×0,87, c'est subtil. Est-ce que le joueur comprend pourquoi il gagne, ou est-ce qu'il voit juste des nombres qui changent ?
6. **L'équipement est plat.** 4 emplacements, 6 statistiques, aucune décision intéressante : on prend toujours le plus haut score. La Forge n'y changera rien si le choix reste « lequel a le plus gros chiffre ».
7. **Rien ne récompense la maîtrise.** Pas de score, pas de classement, pas de défi, pas de « battre 2-5 avec l'équipe de départ ». Le skill n'a aucun endroit où s'exprimer.

### Les questions auxquelles je veux des réponses

**Q1 — La boucle longue.** Qu'est-ce que je construis après le niveau 2-5, sachant que je n'ai ni serveur ni équipe ? Donne-moi **3 options classées** par rapport (plaisir / effort de code), avec leur règle précise et leurs valeurs. Je pense à : tour infinie à étages générés, donjon à étages courts avec choix de récompense, mode « survie » avec vagues, ou refonte de la campagne en 5 chapitres. Dis-moi laquelle et pourquoi, et ce que je dois **couper** pour y arriver.

**Q2 — La décision en combat.** Le combat est-il trop passif ? Si oui, quelle est **la plus petite** addition qui crée une vraie décision sans casser l'automatisme ? (ex. : un bouton « esquive » à cooldown, un choix de cible prioritaire, une position de départ à choisir, un consommable à usage unique.) Donne la règle, le cooldown ou le coût, et pourquoi ça ne rend pas le mode AUTO inutile.

**Q3 — 17 héros, trop ou pas assez ?** Est-ce que je dois **arrêter d'ajouter des héros** et travailler la profondeur (équipement, compétences à monter, variantes), ou continuer à en ajouter ? Argumente avec le nombre de héros qu'un joueur peut réellement apprendre, et ce que je dois faire des héros faibles (Ashka 55, Sylvaine 60, Morwen 61) : les buff, les fusionner, ou en faire des clés de composition ?

**Q4 — Le gacha sans argent.** Dois-je **supprimer** le gacha et donner tous les héros, ou le garder ? S'il reste, quel rôle doit-il jouer dans un jeu solo ? (déblocage progressif ? monnaie de progression ? source de doublons pour les étoiles ?) Sois tranchant.

**Q5 — Les classes.** Le système Lumière/Obscur/Nature/Technique/Combat vaut-il mieux que les 6 rôles seuls ? Est-ce que ×1,18 / ×0,87 est le bon écart, ou faut-il aller plus loin (×1,3 / ×0,8) ? Et faut-il **afficher** le multiplicateur dans les nombres de dégâts (« 412 ▲ »), ou le laisser invisible ?

**Q6 — L'équipement.** Comment transformer 4 emplacements × 6 statistiques en vraie décision, sans ajouter de complexité de lecture ? (sets ? effets uniques ? objets qui modifient une compétence ? choix exclusif ?) Donne un système **complet mais court**, avec ses chiffres.

**Q7 — La première heure.** Décris la **première heure idéale** d'un nouveau joueur dans ce jeu, minute par minute, avec ce qu'il doit ressentir à chaque étape. Puis dis-moi ce que mon jeu actuel rate dans cette heure.

**Q8 — Le truc que je ne vois pas.** Qu'est-ce qui, dans ce document, te fait dire « ça, c'est le vrai problème, et il ne le voit pas » ? Une seule chose, la plus importante, avec la correction.

### Format de réponse attendu

Pour chaque question : **un diagnostic en 2 phrases**, puis **une proposition concrète** (règles + chiffres), puis **le risque** de cette proposition. Pas de listes de bonnes pratiques génériques. Si tu estimes qu'une de mes idées est mauvaise, dis-le et explique pourquoi en une phrase.

---

## 12. Annexe — glossaire

| Terme | Sens dans ce jeu |
|---|---|
| **Palier (`tier`)** | Étage de difficulté d'un niveau ; +21 % PV / +16 % ATQ par palier |
| **Mitigation** | Réduction de dégâts par l'armure ou la résistance : `100 / (100 + défense)` |
| **Interval** | Secondes entre deux attaques de base |
| **Rig** | Squelette d'animation d'un personnage (hanches, cou, tête, bras, cape) |
| **Cut-in** | Plan rapproché du visage au lancement d'un ultime |
| **Provocation** | Force les ennemis à cibler ce personnage |
| **Purge** | Retire les effets négatifs (saignement, brûlure, ralentissement) |
| **Enracinement** | Immobilise sans empêcher d'attaquer |
| **Intouchable** | Ne peut pas être ciblé (mais peut subir des dégâts sur la durée) |
| **AUTO** | Mode où l'IA lance les ultimes à la place du joueur |
| **Synergie** | +5 % PV/ATQ par allié supplémentaire de la même classe |
| **Lien** | Bonus fixe entre deux héros nommés, cumulable avec la synergie |
