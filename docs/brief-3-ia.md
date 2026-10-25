# Brief pour les 3 IA — améliorer Légendes de la Tour Infinie

> **Mode d'emploi**
> 1. Copie **tout le bloc ci-dessous** (entre les deux lignes `────`).
> 2. Envoie-le à l'IA n°1, puis à l'IA n°2, puis à l'IA n°3.
> 3. **Change une seule chose** à chaque fois : la ligne `MISSION :` (les trois versions sont données plus bas).
> 4. Récupère les réponses et colle-les ici, dans `docs/propositions-ia.md`.

---

## Les trois missions à répartir

| Envoi | Remplace la ligne `MISSION :` par |
|---|---|
| **IA n°1** | `MISSION : CENDRBOURG — le hub. C'est l'écran que le joueur regarde le plus, et il est encore trop statique.` |
| **IA n°2** | `MISSION : LES MOMENTS-CLÉS DU COMBAT — entrée de boss, mort de boss, écran de victoire.` |
| **IA n°3** | `MISSION : L'ANIMATION DE BASE — anticipation, poids, transitions entre poses.` |

---

## LE TEXTE À COPIER

────────────────────────────────────────────────────────────────────────

Tu es directeur artistique et développeur technique spécialisé en jeux de combat 2D
(PixiJS / WebGL). Je te donne l'état **exact** d'un jeu déjà en ligne, puis une mission.
Réponds en français.

# LE JEU

**Légendes de la Tour Infinie** — RPG de collection dark fantasy, combat automatique
semi-actif. Navigateur PC, souris + clavier, plein écran.

- Moteur : **TypeScript + PixiJS 8.22**, rendu en **1920 × 1080** fixe
- Livraison : **un seul fichier HTML de 10,1 Mo**, aucun appel réseau au démarrage
- Interface : **HTML/CSS** au-dessus du canvas (pas dans Pixi)
- Qualité : 3 profils `low` / `high` / `ultra`, dont une résolution adaptative automatique
- Tests : **2 280 simulations de combat automatisées** qui doivent rester à 0 crash
- URL : https://hm3282039-art.github.io/qzeshjkgf/

**Contenu** : 14 héros jouables (8 SSR / 6 SR), 7 types d'ennemis, 10 niveaux
(2 chapitres), **4 décors peints**, 4 pièces d'équipement illustrées,
**54 sons** (2,4 Mo), 4 slots d'équipement / 5 raretés.

# LES 8 RÈGLES À RESPECTER (une seule ligne rouge = proposition refusée)

1. **Graphique uniquement.** Aucun changement de dégâts, portée, vitesse, coût, économie,
   taux de critique. 2 280 simulations doivent passer.
2. **Un seul fichier.** Pas de CDN, pas de police téléchargée, pas de librairie lourde.
3. **60 images/seconde sur PC modeste.** Dis ce que ça coûte ET ce qui se dégrade en `low`.
4. **Lisibilité avant beauté.** Un effet qui masque un personnage est un effet raté.
5. **Style sombre et peint.** Pas de cartoon lisse, pas de néon, pas de pastel.
6. **Pas de forme abstraite seule.** Un projectile a une forme identifiable.
7. **Chaque héros garde sa mise en scène propre.** Pas de gabarit commun.
8. **Rien de dessiné sur le sprite.** L'équipement vit dans la fiche du héros.

**Palette** : or `#e3c077` · or clair `#f6e3a4` · cramoisi `#c2183c` · violet `#8a4dff`
· encre `#0b0814`. Chaque héros a sa couleur d'accent (`h.css`).

# CE QUI EXISTE DÉJÀ — NE PAS LE REPROPOSER

| Élément | État |
|---|---|
| 4 décors peints (échafauds, marais, nef brisée, trône de cendre) | ✅ fait, chacun avec sa brume, ses particules et ses lumières |
| 14 scènes d'ultime uniques (une par héros) | ✅ fait |
| Cut-in d'ultime (bandeau, rayons, portrait, 820 ms) | ✅ fait |
| Ouverture kinétique : 3 coupes franches, fissure de verre, négatif 3 images | ✅ fait |
| Image d'impact **noir et blanc pur** | ✅ fait |
| Déchirure chromatique, onde de choc, flou radial | ✅ fait |
| Mêlée : séparation 78 px + décalage de profondeur + anneau de cible | ✅ fait |
| Ombres au sol renforcées, reflet, contre-jour teinté | ✅ fait |
| Fondu de pose 80 ms entre deux animations | ✅ fait |
| Poussière sous les pas (déjà branchée) | ✅ fait |
| Traînées d'attaque teintées par la couleur du héros | ✅ fait |
| Chiffres de dégâts étagés et alternés | ✅ fait |
| 54 sons synchronisés avec le hit-stop | ✅ fait |
| Équipement : 4 slots, 5 raretés, 4 peintures, cadres animés par rareté | ✅ fait |
| PNJ qui marchent sur un chemin (2 seulement) | ⚠️ partiel |
| Transitions entre écrans (tourbillon sombre) | ⚠️ basique |

# CE QUI MANQUE RÉELLEMENT

- **Aucune variante d'ennemi** : 7 types pour 10 niveaux, toujours les mêmes.
- **Aucune carte de titre de boss** : le boss arrive sans annonce.
- **Aucun écran de victoire composé** : un simple panneau avec du texte.
- **Le décor ne réagit jamais au combat** : pas de gravats qui tombent, pas de corbeaux
  qui s'envolent à l'entrée du boss.
- **Cendrebourg** : seulement 2 PNJ qui marchent, pas de fumée aux cheminées,
  pas de forgeron en rythme, pas de réaction au survol d'un bâtiment.
- **Pas de regroupement des petits dégâts** : trop de chiffres en combat de groupe.
- **Anticipation d'attaque peu marquée** : le corps se déforme, mais on ne « voit » pas
  le coup se préparer.

# TA MISSION

MISSION : _________

Traite **uniquement cette mission**. Ne propose rien sur les autres.

# FORMAT DE RÉPONSE EXIGÉ

Pour **chaque** proposition, donne ces six points, dans cet ordre :

1. **Quoi** — une phrase, avec une référence visuelle concrète (un jeu, un film, une scène).
2. **Où** — le fichier et la zone. Les fichiers existants sont :
   `battle/BattleScene.ts`, `battle/UnitView.ts`, `battle/RigMesh.ts`, `battle/rigs.ts`,
   `battle/cinematics.ts`, `battle/Camera.ts`, `battle/Sim.ts`, `scene/HubScene.ts`,
   `scene/Npc.ts`, `scene/BuildingView.ts`, `ui/BattleHud.ts`, `ui/UI.ts`, `ui/styles.css`,
   `fx/textures.ts`, `fx/Particles.ts`, `core/Game.ts`.
   Si tu as besoin d'un nouveau fichier, dis-le et explique pourquoi.
3. **Comment** — la technique : sprite, particule, filtre, déformation de maillage, CSS, shader ?
4. **Coût** — estimation en images/seconde et en mémoire, et ce qui se dégrade en `low`.
5. **Risque** — ce qui peut casser (lisibilité, contraste, performance).
6. **Réglages** — les valeurs chiffrées de départ (durées en ms, échelles, opacités, couleurs).

Puis, pour **la meilleure** de tes propositions, écris le **pseudo-code TypeScript
complet** : noms de fonctions, constantes chiffrées, ordre des appels.

# CE QUE JE NE VEUX PAS

- Une liste de 10 idées vagues. **Trois propositions maximum, mais exécutables.**
- Des mots comme « subtil », « léger », « discret » **sans chiffre**.
- Du code qui suppose des fichiers qui n'existent pas.
- Reproposer ce qui est déjà fait (voir le tableau plus haut).
- Une refonte de moteur. Le jeu tourne, on l'améliore.

# UNE DERNIÈRE CHOSE

Si tu n'es pas sûr d'un détail technique, **dis-le** au lieu d'inventer. Une réponse
honnête avec deux incertitudes vaut mieux qu'une réponse fausse et confiante.

────────────────────────────────────────────────────────────────────────

---

## Après réception : la grille de tri

| Critère | Bloquant ? |
|---|---|
| Respecte les 8 règles | oui |
| Aucune proposition déjà faite | oui |
| Chiffres exploitables | non |
| Faisable sans nouvelle illustration | non |
| Tient en `low` à 60 fps | non |
| Pseudo-code fourni | non |

Une réponse qui échoue à un critère bloquant est écartée d'office, quelle que soit sa beauté.
