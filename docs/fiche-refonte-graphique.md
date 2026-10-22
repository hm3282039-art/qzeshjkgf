# Fiche — Refonte graphique, épisode 2

> Ce document ne change **rien** au jeu pour l'instant.
> Il sert à se mettre d'accord avant de toucher au code.
> **Rien ici ne modifie le gameplay** : dégâts, niveaux, équilibrage restent identiques.

---

## 1. Ce que tu m'as demandé

| # | Ta demande | En clair |
|---|---|---|
| 1 | « je quitte un combat, je suis bloqué sur l'écran de chargement » | Un **bug** qui bloque le jeu. À régler en premier. |
| 2 | « les héros quand ils bougent ils sont tout droit, pas de mouvement de corps, bras ou quoi » | Les personnages **glissent** au lieu de **marcher**. |
| 3 | « les ultimes un peu plus longs pour qu'on comprenne mieux ce que le héros fait » | Un ultime trop rapide = **on ne voit rien**. |
| 4 | « une vraie animation de fou comme Mobile Legends Adventure » | Le niveau de mise en scène de MLA. |

---

## 2. Le bug du combat abandonné

### Ce qui se passe (cause)

Entre le hub et le combat, il y a un **rideau noir** qui tombe, le jeu change de scène derrière le rideau, puis le rideau se lève.

Aujourd'hui, si quelque chose se passe mal **pendant** que le rideau est baissé (un ultime encore en cours, une erreur dans le nettoyage du combat…), le rideau **ne se relève jamais**. Résultat : écran noir figé = ce que tu appelles l'écran de chargement.

Il y a un deuxième défaut : si tu cliques deux fois vite sur « quitter », **le deuxième clic est ignoré** et tu restes dans le combat.

### Ce que je corrige

| Problème | Correctif |
|---|---|
| Rideau bloqué en cas d'erreur | Le rideau **se relève toujours**, même si le reste échoue (sécurité + minuteur de secours) |
| Ultime en cours quand on quitte | On **coupe proprement** la cinématique avant de sortir |
| Double-clic ignoré | On **mémorise la demande** et on l'exécute dès que le rideau est libre |
| Écran noir muet | Un **vrai indicateur de chargement** (roue + texte) au lieu du noir vide |

---

## 3. Les héros : de la « pancarte » au personnage vivant

### Aujourd'hui

Le dessin est **excellent** (armure, cape, bouclier). Le problème n'est pas l'image, c'est **ce qu'on en fait bouger**.

Le squelette actuel déforme surtout :
- le **buste** (inclinaison),
- **deux bras** (le bras principal et le bras libre),
- la **cape**.

Les **jambes** ne sont pas animées. Le personnage se déplace donc **en glissant**, sans que ses pieds ne fassent de pas. C'est exactement ce qui donne l'impression de « pancarte qui coulisse ».

### Ce que je change

| Mouvement | Aujourd'hui | Demain |
|---|---|---|
| **Marche** | glisse sans bouger les jambes | **jambes qui alternent**, hanches qui pivotent, épaules en contre-rotation, tête qui suit légèrement, bras qui balancent à l'opposé des jambes |
| **Respiration (immobile)** | très légère | poitrine qui se soulève, épaules, léger transfert de poids d'un pied sur l'autre |
| **Attaque** | rotation du buste | **élan → frappe → suite du geste** : tout le corps participe, appui sur la jambe avant, hanche qui tourne |
| **Dégât reçu** | flash blanc | **recul** du corps, tête qui part en arrière, jambes qui encaissent |
| **Chute** | fondu | genoux qui plient, corps qui bascule, arme qui tombe |
| **Cape / cheveux** | suit déjà | plus d'amplitude, avec du **retard** (effet de traîne) |
| **Sol** | ombre douce + reflet (fait) | ombre qui **s'étire avec le pas** et poussière synchronisée |

**Astuce importante** : pour que les jambes bougent vraiment, je dois **redessiner les zones de déformation** de chaque héros (indiquer où est la cuisse, le tibia, le pied sur chaque illustration). C'est le gros du travail — environ **1 héros = 1 passe de réglage**.

---

## 4. Les ultimes : plus longs et lisibles

### Le problème

Un ultime dure aujourd'hui **environ 2 secondes**. L'œil n'a pas le temps de comprendre : ça brille, c'est fini.

### La nouvelle structure (5 temps, ~5 secondes)

| Temps | Durée | Ce qu'on voit | Ce que ça raconte |
|---|---|---|---|
| **1. L'appel** | 0,7 s | le héros se braque, le sol se fend, les anneaux se resserrent, la caméra pousse | « il se passe quelque chose » |
| **2. Le nom** | 1,0 s | cut-in : flash, rayons, nom de l'ultime | « voilà qui frappe et avec quoi » |
| **3. Le geste** | 1,2 s | **au ralenti** : on voit le bras / l'arme / le sort se lancer | « voilà comment il frappe » |
| **4. L'impact** | 1,5 s | pleine vitesse : explosion, secousse, éclats, décor qui réagit | « voilà le résultat » |
| **5. La retombée** | 0,8 s | fumée, poussière, silence, caméra qui revient | « souffle » |

### Les effets « façon MLA » que je vais utiliser

- **Ralenti ciblé** au moment du geste (le héros bouge au ralenti, le décor aussi)
- **Image figée** (freeze) d'une fraction de seconde à l'impact — très MLA
- **Lignes de vitesse** qui convergent vers le point d'impact
- **Ondes de choc** concentriques au sol
- **Images rémanentes** derrière le héros (traînée de mouvement)
- **Découpage de l'écran** : flash + inversion des couleurs sur 2 images
- **Le décor réagit** : fissures, débris, poussière, cendres, arbres qui plient
- **Caméra** : poussée, secousse, roulis, retour au calme
- **Typographie** : le nom de l'ultime qui claque à l'écran

### Une variante par héros (pas le même effet pour tous)

| Héros | Son ultime | Sa signature visuelle |
|---|---|---|
| **Vaelen** | Rempart Écarlate | mur de flammes qui monte du sol, bouclier géant projeté, onde de choc lourde, **caméra basse** |
| **Sylvaine** | Bois des Suppliciés | forêt de ronces qui jaillit, volée de flèches en ralenti, **caméra qui suit les flèches** |
| **Pyrrha** | Jugement de Flammes | ciel qui s'ouvre, météores, **caméra qui monte puis plonge**, écran qui brûle sur les bords |

---

## 5. Le reste du jeu (finitions graphiques)

Ce que j'ajouterais en plus, toujours **sans toucher au gameplay** :

- **Profondeur du décor de combat** : 3 plans qui bougent à des vitesses différentes (déjà partiellement là), plus de brume au sol
- **Lumière vivante** : les torches du décor éclairent réellement le sol proche (halo qui tremble)
- **Impacts** : étincelles directionnelles (elles partent dans le sens du coup, pas en rond)
- **Morts** : le corps reste au sol quelques secondes au lieu de disparaître
- **Interface** : les cartes de héros respirent au survol, les boutons ont un vrai enfoncement
- **Hub** : météo qui change lentement (nuages qui s'épaississent, pluie fine parfois)

---

## 6. Ordre de travail proposé

| Étape | Quoi | Pourquoi cet ordre |
|---|---|---|
| **1** | Le bug du rideau noir | Ça bloque le jeu, tout le reste attend |
| **2** | Ultimes plus longs (structure en 5 temps) | Le plus visible, le plus « waouh » |
| **3** | Héros vivants (jambes, marche, respiration) | Le plus long, mais c'est le cœur du problème |
| **4** | Finitions (impacts, morts, interface, météo) | Le sel |

---

## 7. Le point de vigilance

Plus d'animation = **plus de calcul**. Sur un vieux téléphone, ça peut ramer.

**Ma solution** : je garde 3 niveaux de qualité (bas / moyen / haut). Les effets « de fou » ne se déclenchent qu'en moyen et haut. En bas, le jeu reste fluide et jouable — il perd juste les fioritures.

---

## 8. Ce que je ne touche pas

- Les dégâts, les compétences, l'équilibrage
- Le système de niveaux infini
- Les ombres, auras et vignette que tu as déjà validés (« c'est nickel »)
- La sauvegarde

---

**En attente de ton feu vert pour commencer par l'étape 1 (le bug).**
