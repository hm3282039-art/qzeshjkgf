# Propositions des IA — à comparer

> Ce fichier est un **carnet de réception**. On colle ici les réponses des autres IA, telles quelles.
> Comparaison et décision à la fin. Rien n'est codé avant.

---

## Rappel : la bonne façon de poser la question

Coller **la fiche graphique complète** (`docs/fiche-graphique.md`) puis le texte de la section 18.

---

## IA n°1 — reçue le 22/10/2026

**Chantier traité** : ☑ transverse — les 6 chantiers survolés (§16)
**Respecte §2 et §15** : ✅ oui
**Fournit du pseudo-code** : ❌ non
**Chemins de fichiers vérifiés** : ❌ non (« à confirmer dans ton code »)

### Réponse brute

```text
J'ai analysé ta fiche graphique complète. Ton jeu possède déjà une base technique vraiment intéressante :
14 héros, 14 ultimes uniques, un rendu PixiJS/WebGL, une ville en 2.5D, une caméra cinématique,
des effets de combat et une interface sombre avec de l'or.

À mon avis, tu n'as pas besoin de tout recommencer. Tu dois faire évoluer ton jeu d'un RPG de navigateur
visuellement travaillé vers un RPG dark fantasy qui donne l'impression d'un jeu premium, avec des
personnages vivants, des combats spectaculaires et un univers reconnaissable en quelques secondes.

Le plus important : ne pas ajouter des effets partout. Il faut améliorer les silhouettes, la profondeur,
les animations, la direction artistique et la mise en scène.

1. LES 6 AMÉLIORATIONS À PLUS FORT IMPACT
   1. Rendre les combats immédiatement lisibles (rangées en profondeur, ombres individuelles,
      silhouettes, mise en évidence de la cible).
   2. Ajouter deux nouveaux décors mémorables (citadelle en ruine, trône de cendre).
   3. Donner du poids aux personnages (transitions d'animation, anticipations, reculs, poussière, capes).
   4. Transformer Cendrebourg en lieu vivant (PNJ qui marchent, forgeron animé, fumée, corbeaux).
   5. Donner une profondeur premium à l'interface (transitions, survols, chiffres animés).
   6. Donner une signature visuelle à chaque héros (prolonger l'identité des ultimes).

2. CHANGEMENTS PRÉCIS
   A1. Formation intelligente : première ligne plus basse et plus grande, arrière-ligne plus haute et
       plus petite ; décalage horizontal ; ombre elliptique par unité ; contour discret sur la cible.
       Réglages : échelle selon profondeur 0,90–1,08 ; ombre opacité 0,25–0,40 ; ciblage 180–250 ms.
       Fichiers probables : battle/UnitView.ts, battle/BattleScene.ts.
       Risque : faible si seules les positions visuelles changent.
   A2. Ressenti des coups : attaque normale (anticipation courte, traînée, flash, réaction du défenseur) ;
       coup lourd (préparation longue, recul, poussière) ; coup critique (hit-stop bref, secousse
       directionnelle) ; mort (réaction propre puis disparition) ; saut (ombre qui s'écarte, compression,
       poussière). Réglages : transition 80–120 ms ; hit-stop lourd 50–70 ms ; flash 2–3 images ;
       retour pose neutre 120–220 ms. Fichiers : RigMesh.ts, UnitView.ts, rigs.ts.
       Attention : ne pas cumuler hit-stop et plusieurs ralentis caméra.
   B1. Deux décors : citadelle en ruine (neige, vitraux brisés, rayons lunaires) et trône de cendre
       (colonnes, fissures incandescentes, contre-jour rouge). Plusieurs plans : fond, architecture,
       premier plan, sol. Les éléments réagissent (neige poussée par le vent, braises, drapeaux, lumière).
       Parallaxe : fond 0,45–0,65 ; intermédiaire 0,80–1,00 ; premier plan 1,10–1,25.
   B2. Décors qui évoluent pendant le combat : pierres qui se détachent, brume qui se disperse,
       braises soulevées, flocons lors d'un ultime de glace, corbeaux à l'entrée du boss.
       Coût faible à moyen si les textures sont réutilisées.

3. CHANGEMENTS PREMIUM
   - Entrées de boss théâtrales (nom, silhouette monumentale, réaction du décor, retour caméra).
   - Écrans de victoire composés (héros au premier plan, boss en arrière-plan, lumière dirigée).
   - Invocation avec révélation en plusieurs temps (sceau, concentration, silhouette, rareté).
   - Équipement différencié par rareté via cadres/gravures/éclairages, pas via de nouvelles peintures.
     L'objet mythique doit avoir une présentation spéciale.
   - Transitions cohérentes entre tous les écrans (balayage de cendres, panneau qui se déploie).

4. CHECKLIST DE FINITION (0/8)
   [ ] Réduire le bruit visuel (moins de chiffres secondaires, regrouper les événements répétitifs)
   [ ] Améliorer les portraits (cadrage, lumière, contraste homogènes sur les 14)
   [ ] Ajouter des micro-animations (portraits qui respirent, boutons qui pulsent)
   [ ] Faire réagir Cendrebourg au joueur
   [ ] Créer un système de lumière cohérent (lumière des personnages alignée sur le décor)
   [ ] Uniformiser les matières (acier, cuir, os, pierre, tissu)
   [ ] Renforcer les états de l'interface (sélectionné, survolé, indisponible, amélioré, nouvel objet)
   [ ] Optimiser la mise à l'échelle sur différents écrans

5. PERFORMANCES
   Tableau du comportement par profil low / high / ultra (ombres, particules, décors, filtres, textures,
   animations). Règles : réutiliser les textures, mutualiser et limiter les filtres simultanés,
   ne pas animer le hors-écran, plafonner les particules, vérifier le poids des décors,
   mesurer sur PC modeste avec ultimes simultanés.
```

### Points forts

- Ne repropose aucun rejet, respecte les 8 règles d'or.
- **Premier chiffrage concret** de la profondeur visuelle (0,90–1,08) et des ombres (0,25–0,40).
- Valeurs de timing d'animation utilisables (transitions 80–120 ms, hit-stop lourd 50–70 ms).
- Parallaxe chiffrée pour les nouveaux décors.
- Idée **très rentable** : différencier les 5 raretés d'équipement par le cadre et la lumière, pas par de nouvelles peintures.
- Alerte pertinente sur le cumul hit-stop + ralentis caméra.

### Points faibles

- **N'a pas choisi un seul chantier** comme demandé : il survole les six.
- **Aucun pseudo-code**, malgré la consigne.
- Chemins de fichiers devinés, pas vérifiés.
- Beaucoup de « discret », « léger », « occasionnel » sans valeur mesurable.
- Rien sur le vrai problème structurel de la mêlée (les unités partagent la même ligne `y`).

---

## IA n°2 — reçue le 22/10/2026

**Chantier traité** : ☑ 1 mêlée · ☑ 2 animation · ☑ 3 décors · ☑ 4 hub · ☑ 5 interface · ☑ 6 identité
**Respecte §2 et §15** : ✅ oui
**Fournit du pseudo-code** : ⚠️ partiel (formule d'échelle, valeurs de squash)
**Chemins de fichiers vérifiés** : ⚠️ cite les bons fichiers, mais décrit du code qui existe déjà

### Réponse brute

```text
1. CE QU'IL FAUT MODIFIER

A. Lisibilité de la mêlée (priorité absolue)
   1. Étage de profondeur dynamique (Y-sorting + scale) : scale = 0.92 + y * 0.0002.
   2. Silhouettes de contraste au survol / à l'action : contour lumineux externe fin
      (OuterFilter ou +15 % de saturation) pour détacher l'unité de la mêlée.
   3. Ombres elliptiques sous les pieds, en mode Multiply, qui suivent le maillage.

B. Poids des animations
   1. Squash & stretch synthétique dans UnitView.ts : écrasement Y 0,88 / X 1,12 sur 3 images
      avant l'attaque ; étirement X 1,18 / Y 0,88 à l'impact ; micro-recul 10–15 px avec
      rotation du buste +0,08 rad à la réception.
   2. Fondu de transition de pose de 80 ms (empêcher le « pop » au retour en idle).
   3. Inertie des os secondaires (cape, cheveux) avec déphasage de 2 images.

2. CE QU'IL FAUT AJOUTER

A. Deux nouveaux décors (passer de 2 à 4)
   - Citadelle d'Obsidienne : neige en suspension, vitraux brisés éclairés par la lune,
     fissures bleues au sol.
   - Trône de Cendre : rouge/orange sombre, braises montantes, lave avec pulsation de lueur.
   - Météo dynamique sur les décors existants : pluie fine oblique sur les échafauds,
     lucioles et clapotis sur le marais.

B. Signature visuelle par rôle
   - Tanks : éclats de bouclier (plaques debris), ondes de choc dorées.
   - Assassins : déchirures chromatiques ciblées, lignes de vitesse obliques.
   - Mages : volutes spiralSoft + glow.
   - Traînées de lame et étincelles colorées avec h.css (la couleur du héros).

C. Cendrebourg V2
   - PNJ en boucle de 2 à 3 points de cheminement (marcher, s'arrêter, repartir).
   - Forgeron : gerbe de braises + lueur orange sur la façade toutes les 4 s.
   - Corbeaux qui s'envolent au survol des toits.

D. Interface
   - Cartes de héros inclinées en 3D au survol (rotateX / rotateY).
   - Compteurs d'or et de puissance qui défilent.
   - Transition : fondu au noir traversé par une nappe de cendres.
```

### Points forts

- **Cible les bons fichiers** : `UnitView.ts`, `BattleScene.ts`, `rigs.ts`, `RigMesh.ts`. C'est exact.
- **Chiffres justes et utilisables** : squash 0,88/1,12 puis 1,18/0,88, rotation +0,08 rad, reçu 10–15 px.
- **Idée très juste** : la couche de séparation anti-chevauchement entre les unités. C'est le vrai levier.
- Colorer les traînées avec `h.css` ne coûte presque rien (une teinte, pas une texture).
- Le fondu de pose de 80 ms est un détail qui se voit immédiatement.

### Points faibles — le problème principal

**L'IA décrit comme « à faire » du code qui existe déjà dans le jeu.** Vérification faite dans le dépôt :

| Ce qu'elle propose | Réalité du code |
|---|---|
| « Y-sorting + scale » (A1) | **déjà fait** : `zIndex = u.y` (`UnitView.ts:408`) et `depthScale(y)` = **0,80 → 1,10** (`UnitView.ts:12`) |
| « scale = 0,92 + y × 0,0002 » | **déjà fait, et en mieux** : sur le terrain (y de 690 à 900) sa formule donne 0,93 → 0,94, soit **1 % d'écart**. La plage réelle est de **30 %**. |
| « squash & stretch » (B1) | **déjà fait** : `squashAt(k)` avec anticipation, impact et retour (`UnitView.ts:132`) |
| « ombres sous les pieds » (A3) | **déjà fait** : ombre qui rétrécit en l'air + reflet au sol |
| « séparation des corps » | **déjà fait** : `sepX` / `sepTarget`, rayon 112 px, écart max **24 px** |

Autres faiblesses :

- **Le seul vrai défaut de lisibilité est passé sous silence** : l'écart maximal entre deux corps
  est plafonné à **24 px**, alors qu'un personnage fait 150 à 250 px de large. La mêlée reste
  illisible **à cause de ce plafond**, pas à cause de l'absence de tri en profondeur.
- Elle ne choisit pas un chantier : elle traite les six.
- L'`OuterFilter` n'est pas dans le projet, et le survol ne s'applique pas aux unités de combat.
- Deux nouveaux décors = **deux illustrations à peindre**, ce n'est pas du code.

---

## IA n°3 — reçue le 22/10/2026

**Chantier traité** : ☑ transverse — 12 propositions classées en 3 priorités
**Respecte §2 et §15** : ✅ oui
**Fournit du pseudo-code** : ❌ non
**Chemins de fichiers vérifiés** : ❌ aucun fichier cité

### Réponse brute

```text
PRIORITÉ 1 — ce qui change le plus l'impression

1. LE SON (absent de ta fiche)
   Un coup sans son ne pèse pas. Sons générés en WebAudio (oscillateurs, bruit filtré,
   enveloppes) : +0 Ko, fichier unique préservé.
   - Impact : « thud » grave (sinusoïde 60→40 Hz, 120 ms) + claquement de bruit filtré,
     synchronisé avec le hit-stop.
   - Ultimes : montée de tension 0,5 s puis grand impact avec réverbération.
   - Hub : vent, cloche lointaine, forge.
   - Réglage de volume et bouton muet.

2. MÊLÉE LISIBLE
   - Ombre nette sous chaque unité (ellipse noire, opacité 0,45).
   - Décalage en profondeur : échelle 0,94 à 1,06 selon y.
   - L'ennemi ciblé passe devant, avec un liseré cramoisi fin.
   - Les unités non impliquées dans une action perdent 25 % de luminosité pendant un ultime.
   - En low : garde l'ombre et le tri, coupe le liseré.

3. BANDEAU D'ULTIME (CUT-IN)
   - Le temps se fige 0,25 s.
   - Un bandeau diagonal traverse l'écran, portrait du héros qui glisse à 120 % puis se stabilise.
   - Nom de l'ultime en Cinzel, couleur h.css, léger flash.
   - Durée totale 0,6 s, puis la mise en scène démarre.
   - Le portrait est dans l'interface : rien n'est dessiné sur le sprite.

4. ANIMATION DE BASE
   - Squash & stretch : 1,0 → 0,88 en Y à l'impact, puis 1,06 en récupération, sur 6 images.
   - Fondu de 80 ms entre deux animations.
   - Micro-recul de 6 à 10 px à la réception d'un coup.
   - Poussière sous les pas (3 particules par foulée).
   - Idle plus vivant : toutes les 4 à 8 s, un petit geste.
   - Pose de victoire et animation de défaite.

PRIORITÉ 2 — variété et « wahou »

5. INVOCATION : montée en tension selon la rareté. Commun/Rare = lueur sobre ; Épique = cercle
   violet ; Légendaire/SSR = pause, écran qui se fissure, zoom, lumière dorée, puis révélation.
   La couleur de la lumière trahit la rareté avant la révélation.

6. DÉCORS 3 ET 4 : citadelle en ruine (neige, vitraux, lumière bleutée) et trône de cendre
   (lave, braises, orange). Étalonnage propre à chaque décor. Météo par décor via ParticleContainer :
   80 particules en high, 30 en low.

7. ENNEMIS : variantes « élite » par teinte et aura (0 nouveau sprite) ; carte de titre pour chaque
   boss ; boss qui change d'apparence en phase 2 (désaturation, fissures lumineuses).

8. IDENTITÉ PAR HÉROS : traînée et teinte propres à chaque rôle (Tank = plaques, Assassin =
   éclairs fins, Mage = volutes).

PRIORITÉ 3 — finitions

9. ÉCLAIRAGE DYNAMIQUE : chaque ultime allume une flaque additive au sol (glowSoft large, 0,35)
   qui éclaire les unités proches ; liseré chaud sur le bord gauche des héros (high/ultra seulement).

10. HUB V2 : PNJ qui marchent, forgeron en rythme, fumée de cheminée, cycle jour/crépuscule/nuit,
    halo doré au survol d'un bâtiment + petit mouvement de caméra.

11. INTERFACE : transition en balayage diagonal avec cendres ; chiffres qui roulent ; cadres
    d'équipement animés par rareté (reflet sur Légendaire, aura sur Mythique) en CSS ;
    écran de victoire avec récompenses qui tombent une à une.

12. CHIFFRES DE DÉGÂTS : trois tailles (normal, critique, ultime), critiques qui rebondissent,
    regroupement des petits coups en un seul chiffre cumulé.

TECHNIQUE
- Qualité adaptative : sous 50 fps pendant 2 s, bascule automatique de high à low.
- Pool d'objets pour particules, chiffres et projectiles (éviter les saccades du GC).
- Atlas de textures pour les 33 textures d'effets.
- Décodage asynchrone des images + barre de chargement stylée.
- Relancer les 2 280 simulations après chaque chantier.
```

### Points forts

- **C'est la seule des trois à parler du son.** Le son est 50 % du « poids » d'un coup.
- **Idée la plus rentable de tout le lot** : colorer la **lumière de l'invocation selon la rareté avant
  la révélation**. Zéro image, zéro moteur — juste du suspense. C'est du game design gratuit.
- **Variantes « élite » d'ennemis par teinte et aura** : 0 nouveau sprite, +7 ennemis visuels.
- **Qualité adaptative automatique** (sous 50 fps pendant 2 s → bascule en `low`) : protège vraiment la promesse des 60 fps.
- Regroupement des petits coups en un chiffre cumulé : règle directement le bruit visuel.
- Atlas de textures et pool d'objets : deux vrais gains de performance, pas des effets.

### Points faibles — deux erreurs factuelles

**1. « Le son (absent de ta fiche) » — confond la fiche et le jeu.**

Le jeu possède **déjà un moteur audio complet** :

| Élément | Réalité |
|---|---|
| `src/audio/AudioEngine.ts` | **450 lignes** : musique, effets, volume, mode hub/combat |
| Banque de sons | **54 fichiers** `.ogg`, **2,4 Mo** (impacts, critiques, boss, ultimes, monnaie, ambiance) |
| Réglages | volume, muet, mode sonore — déjà branchés dans l'interface |

Le manque est **dans ma fiche**, pas dans le jeu : j'ai oublié une section audio.
C'est une faiblesse de documentation, et elle se corrige en ajoutant la section §9.4.

**2. Le bandeau d'ultime (cut-in) existe déjà.**

`BattleHud.cutin()` est en place depuis plusieurs versions : bandeau (`cutin-band`), rayons
(`cutin-rays`), lignes de vitesse (`cutin-lines`), lignes (`cutin-speed`), illustration du héros,
texte « Ultime + nom de la compétence + nom et titre du héros », flash (`cutin-flash`), durée 820 ms.
Le temps se fige aussi (`hit-stop`), et la couleur vient de `h.css` comme elle le demande.

Autres faiblesses :

- « Échelle 0,94 à 1,06 selon y » : la vraie plage est **0,80 à 1,10** (30 %). Elle propose de la réduire.
- Elle ne choisit pas un chantier : 12 propositions, trois priorités. Impossible à exécuter tel quel.
- Aucun fichier cité, aucun pseudo-code.

---

## Grille de comparaison

| Critère | Poids | IA n°1 | IA n°2 | IA n°3 |
|---|---|---|---|---|
| Respecte les 8 règles d'or (§2) | bloquant | ✅ | ✅ | ✅ |
| Ne repropose pas un rejet (§15) | bloquant | ✅ | ✅ | ✅ |
| Donne les 6 points (§17) | fort | ⚠️ partiel | ⚠️ partiel | ⚠️ partiel |
| Valeurs chiffrées exploitables | fort | ✅ | ✅ | ✅ |
| Faisable sans nouvelles images | moyen | ❌ (décors) | ❌ (décors) | ❌ (décors) |
| Tient en `low` (60 fps) | moyen | ✅ | ✅ | ✅ |
| Gain visuel réel | fort | ✅ | ⚠️ | ✅ |
| Pseudo-code fourni | fort | ❌ | ⚠️ | ❌ |
| **Connaissance réelle du code** | **bloquant** | ❌ devine | ❌ décrit du code existant | ❌ fiche prise pour le jeu | ❌ fiche prise pour le jeu |

## Verdict

**Chantier retenu** : **n°1 — la mêlée lisible**, puis **n°2 — le poids des animations**.

Les trois IA sont d'accord sur le diagnostic : la lisibilité d'abord. Aucune n'a trouvé la cause
exacte, mais **l'IA n°2 s'en est approchée en parlant de la séparation des corps** — et c'est en
vérifiant ses affirmations que j'ai trouvé le vrai réglage :

> `BattleScene.ts:2434` — `const MAX = 24;` : l'écart anti-chevauchement maximal entre deux unités
> est plafonné à 24 px, alors qu'un personnage mesure 150 à 250 px de large.

**Ce que je garde des trois** :

- **IA n°1** — ellipse d'ombre 0,25–0,40 · hit-stop lourd 50–70 ms · transitions 80–120 ms ·
  parallaxe 0,45 / 0,90 / 1,18 (pour plus tard, avec les décors) · **raretés d'équipement différenciées
  par le cadre et la lumière** (règle les 4 peintures pour 5 raretés) · l'avertissement sur le cumul
  hit-stop + ralentis caméra.
- **IA n°2** — **la séparation des corps** (le point de départ) · rotation du buste **+0,08 rad** à la
  réception · **fondu de pose de 80 ms** · traînées teintées par `h.css` · familles d'effets par rôle
  (Tank / Assassin / Mage) · déphasage de 2 images sur la cape.
- **IA n°3** — **lumière de l'invocation colorée selon la rareté avant la révélation** · variantes
  « élite » d'ennemis par teinte et aura · **qualité adaptative** (< 50 fps pendant 2 s → `low`) ·
  regroupement des petits dégâts en un chiffre cumulé · trois tailles de chiffres de dégâts ·
  flaque de lumière additive sous chaque ultime · pool d'objets · atlas de textures.

**Ce que je jette et pourquoi** :

| Proposition | Pourquoi |
|---|---|
| Échelle par `y` de 0,90–1,08 (IA 1) ou 0,94–1,06 (IA 3) | Le jeu fait déjà **0,80 → 1,10**. Ce serait un recul. |
| « Y-sorting + scale » et « squash & stretch » présentés comme à faire (IA 2) | **Déjà dans le code** (`zIndex = u.y`, `squashAt()`). |
| Générer les sons en WebAudio (IA 3) | **54 sons déjà embarqués** (2,4 Mo) et un moteur de 450 lignes. Le manque était dans ma fiche. |
| Créer le bandeau d'ultime (IA 3) | **Déjà fait** (`BattleHud.cutin()`, 820 ms, couleur du héros, nom de l'ultime). |
| Les deux nouveaux décors (les trois IA) | Vrai besoin, mais ce sont **deux illustrations à peindre**, pas du code. On les traite séparément. |
| L'`OuterFilter` au survol des unités (IA 2) | N'existe pas dans le projet, et le survol ne s'applique pas aux combattants. |

**Plan d'exécution — Lot A : mêlée lisible** (aucune nouvelle image, aucun chiffre de gameplay touché) :

1. `battle/BattleScene.ts` — relever `MAX` de 24 à ~70 px, élargir le rayon de séparation `R`
   de 112 à ~150 px, et passer l'écart de 6 à 9 px/frame au lissage.
2. `battle/UnitView.ts` — ombre elliptique plus nette (opacité 0,45) et resserrée sous les pieds.
3. `battle/BattleScene.ts` — voile d'ultime : les unités non concernées baissent de 25 % de luminosité.
4. `battle/UnitView.ts` — liseré discret sur la cible (teinte additive, `low` = désactivé).

**Lot B : le poids des animations**

5. `battle/UnitView.ts` — rotation du buste `+0,08 rad` à la réception, fondu de pose de 80 ms.
6. `battle/UnitView.ts` — poussière sous les pas (3 particules par foulée, pool partagé).
7. `battle/BattleScene.ts` — flaque de lumière additive sous chaque ultime.
8. `battle/Sim.ts` / `BattleScene.ts` — traînées teintées par `h.css`.

**Lot C : les gains sans image**

9. `ui/Summon.ts` — lumière de l'invocation colorée selon la rareté (suspense avant révélation).
10. `ui/UI.ts` + `styles.css` — cadres d'équipement animés par rareté (reflet Légendaire, aura Mythique).
11. `data/heroes.ts` — variantes « élite » d'ennemis par teinte (0 nouveau sprite).
12. `core/Game.ts` — qualité adaptative automatique.
13. `ui/BattleHud.ts` — regroupement des petits dégâts en un chiffre cumulé.

---

## Livraison — 22/10/2026

Tout le plan ci-dessus a été exécuté, plus ce que les trois IA n'avaient pas vu.

### Ce qui a été codé

| # | Geste | Fichier | Effet |
|---|---|---|---|
| 1 | Écart anti-chevauchement **24 → 78 px**, rayon de gêne **112 → 190 px**, lissage 6 → 9 | `BattleScene.ts` | les corps ne se confondent plus |
| 2 | **Séparation en profondeur** (`sepY`) en plus de la largeur | `BattleScene.ts`, `UnitView.ts` | la troupe se range en quinconce |
| 3 | **Décalage de base** stable par combattant (±22 px) | `UnitView.ts` | plus jamais une ligne au cordeau |
| 4 | Ombre portée renforcée (opacité **0,50**) | `UnitView.ts` | les pieds « posent » au sol |
| 5 | **Anneau de cible** sous l'ennemi concentré | `UnitView.ts`, `BattleScene.ts` | on voit qui l'équipe frappe |
| 6 | **Fondu de pose ~80 ms** | `UnitView.ts` | plus de « pop » au retour en idle |
| 7 | Recul et rotation du buste **doublés** | `UnitView.ts` | le coup reçu pèse |
| 8 | **Flaque de lumière** sous le héros en ultime | `BattleScene.ts` | l'ultime éclaire le sol |
| 9 | **Cadres d'équipement par rareté** : reflet Légendaire, halo Mythique, pulsation Épique | `UI.ts`, `styles.css` | 5 raretés lisibles avec 4 peintures |
| 10 | **Aura de braises du chapitre II** | `UnitView.ts`, `BattleScene.ts` | les deux chapitres se distinguent |

### Ce qui existait déjà (et que la fiche ne disait pas)

- le **son** : 54 fichiers, moteur de 450 lignes ;
- le **cut-in** d'ultime (820 ms, bandeau, rayons, portrait) ;
- le **squash & stretch** et le **tri en profondeur** (0,80 → 1,10) ;
- la **poussière sous les pas** (`onFootstep`) ;
- l'**assombrissement des unités** non concernées pendant un ultime ;
- la **teinte des traînées** par la couleur du héros ;
- l'**invocation colorée par la rareté** avant la révélation ;
- l'**adaptation automatique** de la résolution.

Leçon : la fiche graphique sous-estimait le jeu. Elle est corrigée (§9.4, §10.1).

---

# BRIEF v2 — amélioration du hub (Cendrebourg)

> Nouveau cycle de propositions, sur le brief `docs/brief-3-ia.md`.
> Mission confiée à l'IA n°1 : **Cendrebourg, le hub**.

---

## IA n°1 — reçue le 22/10/2026

**Mission** : Cendrebourg (hub)
**Respecte §2 et §15** : ✅ oui
**Chiffre ses propositions** : ✅ oui, et avec honnêteté (« budgets de conception, pas des mesures »)
**Vérifie l'existant** : ❌ **non — deux propositions sur trois sont déjà faites**

### Réponse brute — résumé fidèle

**Proposition 1 — Cycle de vie des PNJ.** Machine à états `WALK` / `IDLE` / `INTERACT` /
`RETURN`, chemins prédéfinis sans pathfinding, décalage initial déterministe par PNJ.
8 PNJ actifs en `high`, 4 en `low`. Vitesse 35–55 px/s, arrêts 1,5–4 s, interactions 1,2–2,5 s,
distance minimale 28 px. Fichiers : `scene/Npc.ts`, `scene/HubScene.ts`, `scene/BuildingView.ts`.

**Proposition 2 — Les bâtiments réagissent au joueur.** Au survol : luminosité +15 %,
fenêtres +20 %, détail animé, plaque de nom en obsidienne bordée d'or (opacité 0,92,
bordure `#e3c077`). Entrée 180 ms, sortie 240 ms, interpolation quadratique, **un seul
bâtiment à la fois**. `low` : luminosité + plaque seulement.

**Proposition 3 — Ambiance qui respire.** Fumée de cheminées (12 particules max, 2–3,5 s de vie,
opacité 0,18), corbeaux toutes les 12–25 s, fenêtres qui varient de ±8 % sur 2,5–5 s.
En `low` : 50 % des particules, lumière statique. L'IA précise honnêtement :
« si les corbeaux ne disposent d'aucun sprite existant, cette partie nécessitera une illustration ».

### Points forts

- **La meilleure qualité de réponse reçue jusqu'ici.** Elle chiffre *tout*, elle nomme les bons
  fichiers, et surtout elle **avoue ses incertitudes** (« budgets de conception, pas des mesures »,
  « je ne suppose pas qu'une ressource existe déjà »). C'est exactement ce que le brief demandait.
- **La proposition 1 est juste et utile** : machine à états simple, pas de pathfinding,
  chemins sans croisement, décalage initial pour éviter l'effet robot. C'est exécutable tel quel.
- Le garde-fou « un seul bâtiment survolé à la fois » et les durées d'entrée/sortie asymétriques
  (180 ms / 240 ms) sont des détails de professionnel.

### Points faibles — vérification faite dans le code

| Sa proposition | Réalité du code |
|---|---|
| Machine à états PNJ `WALK/IDLE/RETURN` | **déjà fait** : `Npc.update()` gère l'aller-retour (`progress`, `dir`), la pause (`pauseLeft`), le balancement de marche, le retournement, la respiration |
| Corbeaux qui traversent le ciel | **déjà fait** : `fx/Crows.ts`, volées de 1 à 5, ailes animées, toutes les 2–5 s |
| Fumée de cheminée | **déjà fait** : émetteur `smoke` dans `addCityParticles()` + braises de la forge |
| Fenêtres qui varient | **déjà fait** : `fx/Lights.ts` — scintillement à 3 sinus superposés (9,1 / 15,7 / 23,3 Hz) + pulsation |
| Bâtiments qui s'illuminent au survol | **déjà fait** : `BuildingView.update()` — `damp()` vers la cible, halo additif teinté par bâtiment, `extra` (cristal), **+ plaque de nom HTML déjà branchée** |
| « Un seul bâtiment à la fois » | **déjà garanti** : le survol est par bâtiment, pas par scène |

Autres écarts :

- Elle propose **8 PNJ actifs**. Il y en a déjà 8 dans le hub, mais **4 sont tes héros**
  (Kael, Aldric, Lyra, Vaelen) plantés dans la ville comme figurants. Les faire déambuler
  serait une erreur : ce sont des héros de ta collection, pas des passants.
- Elle ne dit pas que `Npc` possède déjà `punch()`, `attach()`, `aura`, `halo` et un boost d'aura
  au survol : la moitié du travail d'« INTERACT » est là.

### Ce qu'il reste vraiment à faire (d'après son texte, une fois l'existant retiré)

1. **`INTERACT`** — la seule chose qui manque vraiment : le forgeron qui frappe, le garde qui
   regarde au loin, le cultiste qui officie. Et `punch()` existe déjà pour l'accent du marteau.
2. **Mettre plus de figurants sur des chemins** (le forgeron et le chat sont immobiles).
3. **Décalage initial** des cycles pour casser la synchronie — vrai manque, facile.
4. Deuxième et troisième cheminée (il n'y en a qu'une).

**Verdict** : proposition 1 retenue, à 40 % ; propositions 2 et 3 écartées comme déjà faites.
La qualité de la réponse reste la meilleure des quatre IA consultées.

---

## IA n°2 — reçue le 22/10/2026

**Mission** : les moments-clés du combat (entrée de boss, mort de boss, écran de victoire)
**Respecte §2 et §15** : ✅ oui
**Chiffre ses propositions** : ✅ oui, exhaustivement
**Vérifie l'existant** : ❌ **non — une proposition sur trois est déjà faite, une autre à moitié**

### Réponse brute — résumé fidèle

**Proposition 1 — Carte de titre de boss.** Entrée théâtralisée type *Elden Ring* :
assombrissement `dimTarget = 0.75`, zoom caméra 1,45× sur 400 ms, envolée de 12 à 18 corbeaux
(textures `feather` / `shadow`), plaque HTML `.boss-title-banner` qui glisse depuis les deux côtés
avec une ligne d'or, retour caméra 0,95× et allumage de la barre de vie du boss avec flash cramoisi.
Durée totale **1 600 ms** (400 entrée / 800 maintien / 400 sortie). Couleurs : ligne `#e3c077`,
fond `rgba(11,8,20,0.85)`, texte `#f6e3a4`. Fichiers : `cinematics.ts`, `Camera.ts`,
`BattleHud.ts`, `styles.css`, `fx/Particles.ts`.

**Proposition 2 — Mort du boss.** Super hit-stop 120 ms, désaturation du monde
(`ColorMatrixFilter` : saturation 0,20, luminosité 0,80) sauf le boss en blanc pur, 4 à 6 fissures
dorées/violettes calées sur le maillage, puis étirement vertical (Y 1,30, X 0,82), disparition en
alpha sur 600 ms et 40 particules d'âmes qui montent (Vy −180, dispersion ±120, vie 800 ms).

**Proposition 3 — Écran de victoire composé.** Travelling de 700 ms en contre-plongée
(zoom 1,15×, pitch −0,14 rad, décalage Y +80), pose de triomphe des héros (buste +8°, arme levée),
titre « VICTOIRE » en Cinzel Decorative doré, cartes de récompense en balayage diagonal décalées de
100–120 ms, **compteurs roulants** sur 800 ms (`easeOutCubic`), plafonnés à 30 Hz de rafraîchissement.

### Points forts

- **La proposition 1 comble un vrai trou.** Il n'existe **aucune** carte de titre de boss dans le
  jeu : le boss apparaît et la barre s'allume, sans un mot. C'est, de toutes les réponses des
  quatre IA, **la meilleure trouvaille** sur la mission « moments-clés ».
- Elle cite des textures **qui existent vraiment** (`feather`, `shadow`) et ne demande aucune image.
- Le détail du réglage à 30 Hz pour les compteurs roulants est celui d'un développeur qui a déjà
  été mordu par un `innerHTML` dans une boucle.
- Les couleurs proposées sont exactement la palette du jeu.

### Points faibles — vérification faite dans le code

| Sa proposition | Réalité du code |
|---|---|
| Mort du boss : hit-stop, ralenti, caméra, flash | **déjà fait** : `bossDeath()` — image d'impact 0,16 s, `setTimeScale(0.18)`, caméra 1,42×, onde de choc, secousse 1,0, flash blanc 0,5, coupure du son |
| Particules de dissolution | **déjà fait** : `dissolve()` — 24 braises d'âme + 4 nuages de fumée par ennemi |
| Pose de triomphe (buste, arme levée) | **déjà fait** : `cheer()` + bloc « Victoire : saut, arme levée » dans `UnitView.update()` — saut, arme levée de −0,85 rad, cape au vent |
| Travelling de victoire en contre-plongée | **déjà fait** : `ending()` — zoom 1,3× sur le centroïde des héros, ralenti 0,5, applaudissements |
| Cartes de récompense décalées | **déjà fait** : `showResult()` — délais en cascade `--d` sur les étoiles puis les lignes de statistiques |
| Titre « VICTOIRE » doré animé | **déjà fait** : `.rpanel h1` en Cinzel Decorative 6 rem avec `animation: result-title` |

**Ce qui manque réellement**, une fois l'existant retiré :

1. **La carte de titre de boss** (proposition 1) — intégralement à faire. ✅ **à garder**
2. **La désaturation du monde à la mort du boss** — la chaîne d'image n'a aucun `ColorMatrixFilter`
   pilotable à chaud ; c'est la seule pièce de la proposition 2 qui n'existe pas.
3. **Les fissures lumineuses sur le maillage** du boss (proposition 2).
4. **Les compteurs roulants** de l'écran de victoire (proposition 3) — les montants s'affichent
   d'un coup aujourd'hui.

### Autres écarts

- **1,6 s d'écran confisqué** pour une carte de titre, juste avant « Combat ! ». L'intro actuelle
  dure déjà 1,9 s. Empilées, on attend **3,5 s** avant de jouer. À réduire de moitié.
- Elle écrit « 0 impact sur les FPS » : c'est vrai pour la carte HTML, faux pour les 18 corbeaux
  et le flou radial. Sa propre section `low` le contredit.
- Elle ne précise pas **où** déclencher la séquence : l'intro se joue dans `updateIntro()`, qui
  n'a aujourd'hui qu'un seul événement (le bandeau « Combat ! » à 0,9 s).

**Verdict** : proposition 1 **retenue** (c'est la meilleure idée de ce lot), proposition 2 réduite
à deux ajouts (désaturation + fissures), proposition 3 réduite aux compteurs roulants.

---

## BRIEF v2 — IA n°3 (animation de base)

Troisième relecture, consacrée au cœur du sujet : comment bouge un combattant. Trois propositions
seulement — c'est la plus resserrée des trois IA, et la plus juste sur le fond.

### Proposition 1 — « L'anticipation en quatre temps »

**Découpage demandé** : élan (2–4 images) → arrêt bref → claquement → retombée.

**Vérification dans `UnitView.ts`** : le système de clips fait déjà exactement ça. Chaque clip
déclare un `strike` (0,42) et des clés échelonnées :

| temps | pose | easing |
|---|---|---|
| 0 → 0,34 | élan (bras qui recule, `spine −0,22`, `lunge −14`) | `out` |
| 0,34 → 0,44 | claquement (bras qui part, `spine +0,30`, `lunge +56`) | `snap` |
| 0,44 → 1 | retombée | `io` |

Plus `squashAt()` pour l'écrasement, et `strikeDelay()` (rigs.ts) qui recale l'impact du visuel sur
la simulation. **Environ 80 % de sa proposition existe déjà.** Elle ne pouvait pas le savoir.

**Ce qui manquait vraiment** : le **dépassement**. Après le claquement, la main s'arrêtait net sur
sa valeur d'arrivée, puis retombait. Un mouvement lancé continue toujours un peu avant de revenir.

**Codé** : sur `heavy` et `claw` (les deux clips lourds), une clé intercalée à 0,50 / 0,51 :
`spine 0,30 → 0,335`, `main 0,55 → 0,61`, `lunge 56 → 60`, avant la retombée à 0,62. Six centièmes
de seconde, huit pour cent d'amplitude — invisible consciemment, mais c'est ce qui fait qu'un coup
« pèse » au lieu de « s'arrêter ».

### Proposition 2 — « Le poids des coups encaissés »

**Son constat** : tous les coups reçus produisent la même secousse, qu'on perde 2 % ou 40 % des PV.
Un boss entouré de cinq héros tremble en permanence.

**Vérification** : exact. `hit()` n'avait qu'un booléen `heavy`, et la simulation appelait
`v.hit(heavy || crit)` — sans connaître les dégâts.

**Codé** : `hit(heavy, force)` où `force = dégâts nets / PV max` (les PV absorbés par un bouclier ne
comptent pas). `hitForce = clamp(0,28 … 1, 0,35 + force × 6)` :

- plancher à 0,28 : même un petit coup reste lisible ;
- plafond à 1 : un coup à 11 % des PV sature ;
- la réaction et l'écrasement sont multipliés par `hitForce` ;
- **garde de 70 ms** entre deux réactions : sans elle, cinq attaques par seconde produisent une
  vibration continue, pas cinq impacts ;
- le boss ne subit que **40 %** du recul (`0,5 → 0,4`) : une masse ne s'ébranle pas comme un homme.

### Proposition 3 — « Les micro-gestes d'attente »

**Son constat** : entre deux attaques, un combattant est parfaitement immobile (hors respiration).
C'est ce qui trahit le plus un jeu à budget.

**Vérification** : exact — `update()` n'avait que la respiration (`breathe`) et le marche.

**Codé** : trois gestes tirés au sort toutes les **4 à 8 s**, d'une durée de **0,6 s**, en cloche
(`sin`) donc sans à-coup :

1. **transfert d'appui** — le bassin glisse de ±3,5 px, les genoux fléchissent de 0,05 ;
2. **regard de côté** — la tête tourne de 0,12 rad, le buste suit de 0,03 ;
3. **ajustement d'arme** — la main principale descend de 0,16, l'autre monte de 0,06.

Le geste est **coupé** s'il démarre dans les 800 ms qui suivent une action (`hitT`, `action`,
`channelT`) ou pendant une marche : un personnage qui se gratte la tête en plein coup serait pire
que l'immobilité. La tête est bridée à 0,12 rad pour ne jamais dépasser la rotation du cou.

### Ce qui n'a PAS été retenu

- **Réécrire les 20 rigs autour de ces quatre temps** : déjà en place, et un rig se règle image par
  image — c'est un mois de travail pour un gain nul sur ce point précis.
- **Ses chiffres d'images** (« 2 à 4 images ») : le jeu tourne à 60 fps et anime en temps réel lissé
  (`k = 1 − exp(−dt/0,08)`), pas en images fixes. Un élan de 0,34 × 0,62 s = 21 images, pas 4 —
  volontairement, parce que l'écran d'un téléphone ne montre pas 4 images.

**Verdict** : les **trois** propositions sont retenues, mais aucune n'était neuve à 100 %. La n°2 et
la n°3 sont codées telles quelles ; la n°1 se réduit au dépassement, ajouté sur les deux clips lourds.
C'est la meilleure des trois relectures : elle regarde le jeu de l'intérieur, pas la liste des effets
à la mode.
