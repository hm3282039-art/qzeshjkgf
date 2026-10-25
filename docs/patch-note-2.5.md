# v2.5.0 — Le tour par tour devient LE combat du jeu (5 héros, 6 emplacements)

Lien : serveur de dev sur le port **5173** — ouvre le jeu normalement, lance n'importe
quel niveau de la campagne ou de la Tour infinie : le combat est tour par tour.
`?tour` reste disponible comme **laboratoire** (les 27 héros, n'importe quelle étape).

> La version en ligne sur GitHub Pages (`hm3282039-art.github.io/qzeshjkgf/`) est
> toujours ta v2.2.1 : rien de mon travail n'y est poussé. Dis-moi si tu veux que je
> pousse et que je redéploie.

## Ce que tu as demandé

> « EQUIE DE 5 perso mais 6 place sur le jeux c tout est oui mais tout direct dans le jeux »

Deux choses, donc :

1. **L'équipe reste à 5 héros**, mais le champ de bataille garde ses **6 emplacements**
   (2 devant, 2 au milieu, 2 derrière). Un emplacement reste vide — et c'est toi qui
   décides lequel.
2. Le combat tour par tour passe **directement dans le jeu** : plus besoin de `?tour`.

## Ce qui change quand tu joues

| Avant (v2.4) | Maintenant (v2.5) |
|---|---|
| Le tour par tour vivait à part, sur `?tour`, avec son propre sélecteur d'étape | La campagne et la Tour infinie se jouent **au tour par tour** |
| 6 héros possibles dans le laboratoire | **5 héros** (ton équipe réelle) sur **6 emplacements** |
| Les héros étaient tous mis au même niveau réglable | Chaque héros garde **son niveau, ses étoiles, son équipement, sa forge** |
| Aucun lien avec ta progression | Victoire = **étoiles, or, gemmes, expérience, butin, progression de campagne** exactement comme avant |

Le combat en temps réel n'a **pas disparu** : Réglages → **Système de combat** →
« Tour par tour / Temps réel ». Le choix est enregistré. Même équipe, mêmes récompenses,
même écran de résultat des deux côtés — tu peux donc comparer sur le même niveau.

L'**entraînement** (le mannequin) reste en temps réel : ce n'est pas un combat, c'est un
chronomètre de dégâts par seconde.

## 5 héros, 6 emplacements : la règle

- Tes 5 héros sont posés automatiquement la première fois selon leur rôle :
  **Tank devant · Mage et Soutien au milieu · Tireur et Assassin derrière**.
- Tu peux tout changer : clic sur un emplacement → ta liste de **5 héros** (pas les 27),
  plus un bouton **« Laisser vide »**.
- Cliquer sur un héros déjà placé **l'échange** avec celui de l'emplacement visé :
  personne ne disparaît jamais (avant, prendre une place occupée faisait sauter un héros
  de l'équipe — corrigé et testé).
- Ton placement est **enregistré** à chaque changement et rechargé au prochain combat.
- **« Placement auto »** replace **toute** ton équipe selon les rôles — c'est le raccourci
  quand un héros vient d'entrer dans l'équipe et n'a pas encore d'emplacement.
- Une sauvegarde d'avant cette version (qui ne connaît pas les emplacements) est
  complétée toute seule : les 5 héros sont placés, tu ne démarres jamais sur un champ vide.
- **Dès que tu as touché au placement, c'est ton choix qui fait foi** : un héros que tu
  retires reste sur le banc au combat suivant (personne ne le replace de force), et tu peux
  très bien lancer un combat à 4 contre 6.
- Un héros qui **entre dans ton équipe** (après une invocation, par exemple) prend
  automatiquement une case libre dans sa ligne, et les autres gardent exactement la leur :
  tu ne te retrouves jamais avec un héros de l'équipe sans emplacement.

L'emplacement vide n'est pas un manque, c'est un choix : laisser libre la case « derrière »
protège d'un assassin adverse qui perce la ligne, ou au contraire avancer un tireur au
milieu pour qu'il profite du +5 % PV sans être atteignable au corps à corps.

## Ce qui est conservé à l'identique

Tout ce qui n'est pas la façon de jouer :

- **L'énergie** est dépensée au même moment (avant le combat), par le même code.
- **Les étoiles** suivent la règle du jeu : défaite 0 ★, personne ne tombe 3 ★,
  1 ou 2 morts 2 ★, au-delà 1 ★.
- **L'écran de victoire** : étoiles qui tintent une par une, or/gemmes/XP qui roulent,
  butin, montée de niveau, MVP et barre de dégâts par héros.
- **L'écran de défaite honnête** de la v2.3 : il te dit exactement combien de niveaux ou
  de puissance il te manque par rapport au niveau conseillé. Seul le conseil change
  (il parle maintenant de placement et d'embrasement, plus des jauges dorées du temps réel).
- **La Tour infinie** : étage validé ou échoué, mêmes récompenses.
- Les boutons **« Rejouer »** et **« Retour à la ville »** fonctionnent sur les deux systèmes.

## Sous le capot (pour toi, si tu veux relire)

| Fichier | Ce qui a été ajouté |
|---|---|
| `src/state/store.ts` | `settings.battleMode` (`'tour'` par défaut), `slots` (6 cases), `slotsEdited` (le choix du joueur fait foi), `slotsForTeam()`, `saveSlots()`, et la relecture d'une vieille sauvegarde |
| `src/ui/tour.ts` | `openTourBattle(host, config)` : l'étape et l'équipe sont imposées, les niveaux sont réels, le placement est enregistré, la fin de combat renvoie un résultat au jeu. `mountTour()` reste le laboratoire |
| `src/main.ts` | `launch()` part sur le tour par tour sauf entraînement ; `finishStage()` est désormais **commun** aux deux systèmes ; `exitBattle()` sait fermer un combat tour par tour |
| `src/ui/BattleHud.ts` | `prepareTour()` (prépare la couche de résultat sans simulation temps réel), `clearResult()`, `tourMode` (le conseil de défaite) |
| `src/ui/UI.ts` | Réglages → « Système de combat », et le laboratoire renommé |
| `src/ui/tour.css` | `.tour.ingame` : l'écran est monté **dans `#ui`**, en `z-index: 35`, donc sous `.bh-overlay` (40) — c'est ce qui permet à l'écran de résultat du jeu de s'afficher par-dessus le champ de bataille figé |

Le résultat rendu au jeu a exactement la forme de `BattleResult`
(`winner / stars / time / stats[{id, name, dealt, healed, taken, alive}]`), d'où la
réutilisation de l'écran de victoire sans une ligne de doublon.

## Les chiffres

Bancs de test (aucun navigateur nécessaire, `linkedom` pour le DOM) :

| Banc | Commande | Résultat |
|---|---|---|
| Moteur | `npm run test:tour` (`RUNS=4`) | ✅ 7 sections, 21 assertions |
| Laboratoire `?tour` | `npm run test:tour-ui` | ✅ 18 contrôles |
| **Combat intégré au jeu** | `npm run test:tour-jeu` | ✅ **36 contrôles** |
| Compilation | `npx tsc --noEmit` | 0 erreur |
| Build | `npm run build` | ✓ `dist/index.html` 18 872,38 kB (gzip 13 366,78 kB, 8,4 s) |

Le nouveau banc `test:tour-jeu` vérifie, dans l'ordre : le mode par défaut, l'équipe à 5,
les 6 emplacements avec un seul héros par case, l'enregistrement puis la relecture à
l'identique du choix du joueur, **le banc respecté** (un héros retiré n'est pas replacé de
force), **un héros qui entre dans l'équipe prend la case libre sans déplacer les autres**,
le montage de l'écran **dans `#ui`**, l'absence de sélecteur d'étape et de niveau
réglable en jeu, la présence de « Quitter », l'ouverture sur un champ vide, **« Placement
auto » qui replace les 5 héros chacun dans sa ligne** (Tank devant, Mage et Soutien au
milieu, Tireur et Assassin derrière) en laissant exactement une case libre, les vrais
niveaux affichés, le nombre d'ennemis de l'étape, la liste de choix limitée à tes 5 héros,
« Laisser vide », l'échange sans disparition, puis un combat complet en AUTO qui rend **un
résultat au jeu** (victoire 3 ★ en 2-3, 5 fiches de héros, compteurs valides, écran
toujours en place pour l'affichage du résultat), et enfin « Quitter » + le démontage +
« Rejouer » qui ne remonte qu'un seul écran.

Le contrat de difficulté de la v2.4 tient toujours : **100 % des 20 boss de la campagne au
niveau conseillé**, 88 % à −35 % de niveau, 34 tours en moyenne.

## Ce que je n'ai pas fait

- Je n'ai pas touché au combat en temps réel : il reste utilisable tel quel, et c'est lui
  qui fait tourner l'entraînement.
- Je n'ai pas ajouté de 6e héros à l'équipe (tu as dit 5), ni modifié l'invocation, le
  Sanctuaire ou l'économie.
- Je n'ai pas poussé sur GitHub ni redéployé GitHub Pages.
- Les cinématiques d'ultime du jeu (styles Cinéma / Comics / Rituel / Holographique) sont
  rejouées à l'identique dans le combat tour par tour ; je n'en ai pas écrit de nouvelles.
