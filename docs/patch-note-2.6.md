# Patch note 2.6 — Le combat tour par tour retrouve SON écran

## Ce que tu as demandé

> « nn mais je veut le meme interface quavant … c linterfac quil faudrait quand on est en combat les perso est les bouton en bas pour choisir la competence »

Traduction : le combat tour par tour ne devait pas s'ouvrir dans un écran de cartes à part.
Il devait se jouer **dans le combat du jeu** — le terrain, tes héros debout dessus, leurs barres
de vie, le boss, les cinématiques d'ultime — avec **en bas les boutons ronds** pour choisir la
compétence. C'est fait.

## Ce qui change pour toi

| Avant (2.5) | Maintenant (2.6) |
| --- | --- |
| Le mode « tour par tour » ouvrait un écran DOM séparé, style cartes | Le combat se joue **dans la vraie scène de bataille** (mêmes décors, mêmes sprites, mêmes effets) |
| Choix de cible = clic sur des lignes de texte | Choix de cible = **clic direct sur l'ennemi ou le héros dans le terrain** (anneau doré sur les cibles possibles) |
| Pas de cinématiques d'ultime | **Les cinématiques d'ultime du jeu sont jouées** (Cinéma / Comics / Rituel / Holo, selon ton réglage) |
| Barre de vie du boss absente | Barre du boss **en haut**, cartes des 5 héros **en bas à gauche**, comme en temps réel |

### La barre du bas (le cœur de la demande)

- **4 boutons ronds** par héros qui joue : ses 3 compétences + son ultime.
  L'ultime a un liseré orange, les soins un liseré vert.
- Sur un bouton en recharge : **le chiffre du compte à rebours** en grand, bouton grisé.
- Sous chaque bouton, le nom de la capacité ; au survol, sa description complète.
- À droite : le bouton **Embraser** (3 âmes, ×1,5 dégâts) et tes **âmes** (9 gemmes).
- À gauche : le **portrait de l'unité qui joue**, son niveau, sa barre de PV.
- Clavier : touches **1-4** = capacités, **Échap** = annuler le choix de cible.
- En haut : **AUTO** (le jeu joue tout seul), **×1 / ×2 / ×4** (vitesse), **PLACES**
  (replacer ton équipe, uniquement avant le 1er tour), **quitter**.

### Avant le combat : l'écran de placement

Quand tu lances un niveau en mode tour par tour, un calque s'ouvre : **6 emplacements**
(2 DEVANT, 2 MILIEU, 2 DERRIÈRE) pour tes **5 héros** — tu décides lequel reste vide.
Clic sur une case → tu choisis le héros (échange automatique s'il était ailleurs),
bouton « Placement auto » pour un placement malin par rôle, et ton choix est
**enregistré** : au combat suivant tu le retrouves tel quel.

### Ce qui ne bouge pas

- Le mode **temps réel** d'origine : intact (c'est le réglage « Combat » des Paramètres).
- Récompenses, or, gemmes, XP, butin, progression de campagne, Tour infinie : **identiques**,
  l'écran de victoire/défaite est le même dans les deux modes.
- L'équipe reste à **5 héros** partout.
- Le laboratoire `?tour` (l'ancien écran cartes) reste disponible pour tester le moteur.

## Sous le capot

- `src/turn/bridge.ts` — **TurnBridge** : traduit le moteur tour par tour en unités que la
  scène 3D sait dessiner (vraies `Unit` de Sim, placées sur 6 cases par côté, PV/statuts/
  dots/recharges recopiés à chaque événement).
- `src/turn/controller.ts` — **TurnController** : joue le combat (délais animés, ciné
  d'ultime attendue, IA ennemie, choix du joueur, AUTO, vitesse ×1/×2/×4).
- `src/ui/placement.ts` + `placement.css` — le calque de placement.
- `BattleScene.startTurn()` / `setPickable()` — la scène accepte le bridge et rend les
  cibles cliquables ; `BattleHud.showTurn()/setTurn()` — la barre du bas.
- Le chronomètre temps réel est remplacé par un **compteur de tours** (un combat au tour
  par tour dure ce qu'il dure).

## Les chiffres

- `npx tsc --noEmit` : **0 erreur**.
- Nouveau banc `npm run test:tour-scene` : **52 ✅ / 0 ❌** (bridge, combats complets avec
  clics et en AUTO, barre du HUD, écran de placement) — 6 s.
- Bancs existants toujours verts : `test:tour`, `test:tour-ui`, `test:tour-jeu`.
- Build single-file : **18 896 ko** (13 376 ko gzip).

## Ce que je n'ai pas fait

- Aucun changement d'équilibrage : les dégâts/PV du tour par tour restent calés sur la 2.4/2.5.
- Rien n'est poussé sur ton GitHub (tout est sur la branche de travail Arena).
- Ton repo `nv-eux-e` reste inaccessible depuis ici (403) : je n'ai toujours pas pu le regarder.
