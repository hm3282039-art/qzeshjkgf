# v2.3.0 — La campagne devient finissable (équilibrage mesuré, pas deviné)

Lien : `https://hm3282039-art.github.io/qzeshjkgf/`

## Le problème, trouvé en lisant tes propres tests

Tes bancs de test annonçaient **« 0 % de victoires »** sur tous les chapitres 5 à 20.
En les relançant, j'ai vu que ce n'était pas le jeu qui était cassé : **les tests
jouaient trop bas** (équipe niveau 1, échelle de niveaux plafonnée à 38 alors que
la fin de campagne en demande 100). Ils mesuraient leur propre oubli.

Mais en mesurant correctement, deux vrais murs sont apparus :

**1. Le coût des niveaux partait en exponentielle pure (+10 % composés, sans plafond).**

| Niveau visé (5 héros) | Or nécessaire | En jours de farm | |
|---|---|---|---|
| 100 | 112 741 465 | 9,6 j | très long |
| 120 | 758 519 740 | **65 j** | mur |
| 140 | 5 102 993 095 | **437 j** | mur |
| 160 | 34 330 437 325 | **2 938 j** | mur (8 ans) |

Or les chapitres 17 à 20 demandaient **130 à 160 niveaux**. Autrement dit : la fin
de la campagne était **mathématiquement infranchissable**, même en jouant tous les
jours. Ce n'était pas une question de skill.

**2. La courbe de difficulté partait dans tous les sens.**
Le chapitre 19 était plus facile que le 18, le 16 plus facile que le 15, et le
chapitre 12 affichait « puissance conseillée 161 000 » alors qu'il en fallait
environ le double. Le jeu te disait « tu es prêt » et tu perdais quand même.

## Ce que j'ai changé

### 1. Un contrat de difficulté écrit noir sur blanc
`CHAPTER_TARGET_LEVEL` : le niveau de héros visé pour chaque chapitre,
**1 → 3 → 5 → 7 → 11 → 16 → 21 → 27 → 33 → 40 → 47 → 54 → 61 → 68 → 75 → 82 → 89 → 96 → 103 → 110**.
Plus `STAGE_LEVEL_BUMP` (+1/+2 sur les deux niveaux de boss). Le pas entre deux
chapitres est toujours ≥ 2, donc **le niveau conseillé ne redescend jamais**.

Ce niveau est maintenant **affiché en jeu**, à côté de la puissance :
écran de préparation d'équipe, fiche de niveau de campagne, étage de la Tour.
La Tour de l'Infini utilise la même courbe (`suggestedLevelForTier`), donc
« niveau conseillé » veut dire la même chose partout.

### 2. Un calibrage mesuré chapitre par chapitre
La formule brute donne un **budget de PV** au niveau, mais chaque chapitre a sa
composition (boss, classes, armure/résistance) : à budget égal, deux chapitres ne
résistent pas pareil. D'où les deux tables `CHAPTER_TUNE_HP` et `CHAPTER_TUNE_ATK`.

Elles ne sont pas écrites à la main : `tests/test-calibre.ts` les **calcule**.
Il cherche le plus petit niveau qui passe chaque boss à 60 % de victoires, compare
au contrat, et corrige les ennemis du chapitre (PV selon le rapport de dégâts,
ATQ selon le rapport de PV). 8 passes, 5 combats par mesure, amortissement 0,85.
47 secondes de calcul. À relancer si tu changes un boss ou une composition.

### 3. Le coût des niveaux en deux pentes
Jusqu'au niveau 60 : **+10 % par niveau, exactement comme avant** (le début du jeu
ne change pas du tout, la montée reste rapide et satisfaisante).
Au-delà : **+3,5 %**.

| Niveau visé (5 héros) | Avant | Après | Gain |
|---|---|---|---|
| 60 | 2 482 225 | 2 482 225 | identique |
| 100 | 112 741 465 | **23 545 490** | ÷ 4,8 |
| 120 | 758 519 740 | **51 438 765** | ÷ 14,7 |
| 160 | 34 330 437 325 | **217 377 160** | ÷ 158 |

Le chapitre 20 (niveau conseillé 112) tombe à **environ 3 jours de farm** pour une
équipe de départ sans aucune invocation — beaucoup moins avec des héros SSR, des
étoiles et de l'équipement.

### 4. La puissance conseillée est calculée, plus recopiée
C'était une table de 20 nombres écrits à la main, donc capable de mentir.
Elle est maintenant `referencePower(niveau)` : la puissance **réelle** de l'équipe
de référence (les 5 héros de départ, étoiles d'origine, sans équipement) au niveau
conseillé. Les deux chiffres affichés avant un combat viennent de la même source :
ils ne peuvent plus se contredire.

### 5. L'écran de défaite dit enfin quoi faire
Au lieu d'un conseil générique, il mesure ton équipe engagée et affiche l'écart :

> 👑 Il te manque **7 niveaux** (conseillé 96, ton équipe est 89) et **18 402** de
> puissance (conseillé 177 519, tu es à 159 117). Monte tes héros au Sanctuaire,
> équipe le butin ramassé, ou invoque à l'Autel — puis reviens.

Et si tu as le niveau et la puissance mais que tu perds quand même, il te le dit
aussi et renvoie vers la vraie cause : composition, classes ennemies, liens d'équipe.

## Ce que les tests racontent maintenant

| Banc | Résultat |
|---|---|
| `test-campagne.ts` *(nouveau)* | **100/100** niveaux passent au niveau conseillé · courbe monotone ✓ · puissance cohérente ✓ · 0 crash |
| `test-balance.ts` | Contrat tenu **100/100** · 12 niveaux exigent les ultimes · 65 gagnables sans y toucher |
| `test-compos.ts` | La méta existe : 19-3 → FER 100 %, MAGIE 88 %, DÉPART 50 %, **MIXTE 0 %** |
| `test-reaction.ts` | Le skill compte : 20-5 → 100 % à 0 s de réaction, 88 % à 1,5 s |
| `test-economie.ts` *(nouveau)* | Coût des niveaux contre or réellement gagnable |
| `test-calibre.ts` *(nouveau)* | L'outil qui recalcule les deux tables de calibrage |
| `test-battle.ts` | 18 000 simulations · **0 crash · 0 NaN · 0 combat sans fin** |
| `tsc --noEmit` | **0 erreur** |
| `npm run build` | ✓ fichier unique de 18,8 Mo (1154 modules) |

Les cinq bancs qui racontaient n'importe quoi (`test-late`, `test-meta`,
`test-battle`, `test-compos`, `test-reaction`) jouent désormais **au niveau
conseillé par le jeu** au lieu d'un niveau codé en dur. C'était la source des
faux « 0 % ».

## Ce que je n'ai pas fait (franchise)

1. **Les niveaux normaux restent faciles** : 56 niveaux sur 100 se gagnent à 100 %
   sans perdre un héros. C'est voulu pour un idle game — le mur, c'est le boss de
   fin de chapitre (ch. 8 : 40 %, ch. 16 : 60 %). Mais si tu préfères une campagne
   plus tendue partout, c'est un paramètre à resserrer.
2. **Le calibrage est fait sur l'équipe de départ.** Avec des SSR 5★, des étoiles
   rouges et de l'équipement, tu seras très au-dessus du conseil : le jeu devient
   confortable, pas difficile. C'est le rôle du gacha, mais ça veut dire que la
   vraie difficulté pour un joueur investi arrive plus tard que le chapitre 20.
3. **Je n'ai pas touché aux récompenses** (or, gemmes, XP, butin) ni à l'énergie.
   J'ai agi sur la dépense, pas sur le revenu.
4. **La Tour de l'Infini** garde sa propre courbe de difficulté ; je n'ai corrigé
   que son conseil affiché, qui était faux dès l'étage 20.
5. **Rien n'est poussé sur GitHub.** Tout est dans l'espace de travail, sur la
   branche de cette session. Ta branche `arena/3d77bb2d-qzeshjkgf` est passée de
   v1.5 à v2.2.1 pendant que je travaillais : j'ai rebasé mes modifications sur
   la v2.2.1 (les fichiers d'équilibrage étaient identiques, donc aucun conflit).

## Fichiers touchés

```
src/data/heroes.ts       contrat de difficulté, calibrage mesuré, coût des niveaux en
                         deux pentes, champ `level` sur StageDef, referencePower()
src/data/tower.ts        niveau et puissance conseillés cohérents avec la campagne
src/data/training.ts     champ `level` (mannequin : 1)
src/ui/BattleHud.ts      progressGap() : l'écart honnête après une défaite
src/ui/UI.ts             niveau conseillé affiché (campagne + Tour)
src/ui/Formation.ts      niveau conseillé affiché (préparation d'équipe)
src/ui/styles.css        style .rgap (encart d'écart, rouge / vert)
tests/test-campagne.ts   nouveau : les 100 niveaux au niveau conseillé
tests/test-economie.ts   nouveau : coût des niveaux vs or gagnable
tests/test-calibre.ts    nouveau : calcule les tables de calibrage
tests/test-courbe.ts     nouveau : sonde de courbe de difficulté
tests/test-balance.ts    joue au niveau conseillé, juge le contrat avec ultimes
tests/test-battle.ts     joue au niveau conseillé
tests/test-compos.ts     niveaux relatifs au conseil (×0,85 / ×1 / ×1,2)
tests/test-reaction.ts   joue au niveau conseillé
tests/test-late.ts       joue au niveau conseillé
tests/test-meta.ts       échelle construite autour du niveau conseillé
```
