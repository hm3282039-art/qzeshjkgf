# Légendes de la Tour Infinie — Fiche graphique complète

> **Version 2 — refonte.** Remplace la fiche du 20 octobre (archivée dans `docs/archive/fiche-graphique-v1.md`).
> Cette version décrit **l'état réel du jeu aujourd'hui**, pas un projet. Tout ce qui est écrit ici
> existe dans le code et tourne en ligne. Les estimations sont données pour ce qu'elles sont : des estimations.
>
> **À quoi sert ce document** : servir de base de travail pour la refonte graphique. Il dit ce qui est
> en place, avec quels réglages, ce qui a été refusé, et par où recommencer.

---

## 0. Comment lire cette fiche

| Section | Pour qui | Pourquoi |
|---|---|---|
| 1 → 3 | tout le monde | comprendre le jeu et ses limites techniques |
| 4 → 6 | direction artistique | le style, les couleurs, la lumière, l'image |
| 7 → 10 | animation / effets | ce qui bouge et comment |
| 11 → 13 | interface | le hub, les écrans, l'équipement |
| 14 → 16 | **décision** | ce qui ne va pas, ce qui est refusé, le plan de rework |
| 17 → 18 | exécution | comment formuler une proposition, prompt prêt à coller |

---

## 1. Le jeu en une page

| | |
|---|---|
| **Titre** | Légendes de la Tour Infinie |
| **Genre** | RPG de collection, combat automatique semi-actif (« idle battler ») |
| **Plateforme** | navigateur PC, souris + clavier, plein écran |
| **Adresse** | https://hm3282039-art.github.io/qzeshjkgf/ |
| **Langue** | français (textes et interface) |
| **Moteur** | TypeScript + PixiJS 8.22 (WebGL), rendu en **1920 × 1080** fixe |
| **Livraison** | **un seul fichier HTML** de 9,81 Mo, sans aucun appel réseau au démarrage |

**Boucle de jeu.** Le joueur gère **Cendrebourg**, une ville-refuge en vue 2.5D panoramique. Il invoque
des héros à l'autel, les monte de niveau, les équipe, puis lance des combats de campagne. Les combats
sont automatiques — mais **les ultimes se déclenchent à la main**, et c'est là que le joueur regarde
vraiment l'écran. Toute la mise en scène est concentrée sur ces instants.

**Contenu actuel**

| Élément | Nombre | Détail |
|---|---|---|
| Héros jouables | **14** | 8 SSR, 6 SR — chacun avec sa compétence et son ultime propres |
| Types d'ennemis | **7** | goule, archer squelette, gardien d'os (boss), goule spectrale, noyé, sorcière des marais, reine (boss) |
| Niveaux de campagne | **10** | chapitre 1 (1-1 → 1-5), chapitre 2 (2-1 → 2-5) |
| Décors de combat | **4** | `gallows` (échafauds), `swamp` (marais) au chapitre I — `citadel` (nef brisée) et `throne` (trône de cendre) au chapitre II |
| Squelettes d'animation | **20** | 14 héros + 6 ennemis (la goule spectrale réutilise le squelette de la goule) |
| Styles d'attaque | **6** | `heavy`, `fast`, `claw`, `bow`, `cast`, `light` |
| Pièces d'équipement peintes | **4** | épée, cuirasse, heaume, bottes |
| Effets de combat (textures) | **19** | voir §9.1 |
| Effets d'ambiance (textures) | **14** | voir §9.2 |
| Scènes d'ultime dédiées | **14 / 14** | une mise en scène par héros, aucune n'est partagée |
| Simulations de test | **2 280** | 19 configurations × 5 niveaux × 12 répétitions, 0 crash |

---

## 2. Les huit règles d'or

Toute proposition graphique doit passer ces huit filtres. Une seule ligne rouge suffit à la faire refuser.

1. **Graphique uniquement.** Aucune modification des dégâts, portées, vitesses, coûts, taux de critique,
   économie ou courbes de niveau. L'équilibrage est validé par 2 280 simulations qui doivent rester vertes.
   *Exception : l'équipement, autorisé explicitement à donner des statistiques.*
2. **Un seul fichier.** Pas de dépendance lourde, pas de CDN, pas de police téléchargée au runtime.
   Chaque kilo-octet ajouté se paie sur le temps de chargement.
3. **60 images/seconde sur un PC modeste.** Trois profils existent : `low`, `high`, `ultra`.
   Toute proposition doit dire ce qu'elle coûte **et** comment elle se dégrade en `low`.
4. **Lisibilité avant beauté.** Un effet qui masque les personnages ou les barres de vie est un effet raté.
5. **Le style est sombre et peint.** Pas de cartoon lisse, pas de néon, pas de dégradés pastel.
6. **Pas de forme abstraite seule.** Un projectile doit avoir une **forme identifiable** (lame, flèche,
   trait, éclat). Les « boules de lumière » ont été rejetées.
7. **Chaque ultime a sa mise en scène.** Un même cercle au sol pour tous les héros a été rejeté.
8. **Rien de visible sur le sprite.** L'équipement ne se dessine jamais sur le personnage : il vit dans
   son écran de fiche, autour de l'illustration.

---

## 3. Fiche technique réelle

| | |
|---|---|
| Résolution interne | 1920 × 1080, mise à l'échelle proportionnelle |
| Limite d'images | réglable (30 / 60 / 120 / 144 / illimité), par défaut **illimitée** |
| Qualité | `low` / `high` / `ultra`, par défaut `high` |
| Build | `index.html` unique, **9,81 Mo** (6,76 Mo compressé) |
| Images embarquées | 45 fichiers : 14 héros, 14 portraits, 7 ennemis, 4 PNJ, 3 décors/ciel, 4 pièces d'équipement |
| Poids de l'équipement peint | **40 Ko** au total (4 webp 256²) |
| Polices | Cinzel, Cinzel Decorative (embarquées), Segoe UI en secours |
| Tests | `npm run test:battle` → 2 280 simulations |

**Les trois profils de qualité**

| | `low` | `high` | `ultra` |
|---|---|---|---|
| Bloom + étalonnage | ✗ | ✓ | ✓ |
| Flou du décor lointain | ✗ | ✓ | ✓ |
| Grain de pellicule | ✗ | 0,040 | 0,055 |
| Vignette | 0,32 | 0,50 | 0,50 |
| Filtres d'impact | 1 seul | tous | tous |

---

## 4. L'identité visuelle

### 4.1 La palette

Le jeu tient sur **quatre couleurs** et une règle simple : le décor est froid et désaturé, les
personnages et l'or sont chauds. C'est ce contraste qui fait ressortir les silhouettes.

| Rôle | Couleur | Usage |
|---|---|---|
| **Or** | `#e3c077` | cadres, titres, valeurs positives, l'interface entière |
| Or clair | `#f6e3a4` | texte mis en avant, halos |
| Or sombre | `#6b5326` | bordures enfoncées, séparateurs |
| **Cramoisi** | `#c2183c` | dégâts, danger, boss enragés |
| Cramoisi clair | `#ff4d6d` | éclats, ultimes agressifs |
| **Violet** | `#8a4dff` | magie, invocation, néant |
| **Encre** | `#0b0814` | fonds, plaques, vignette |

Chaque héros possède **sa propre couleur d'accent** (`h.css`), utilisée dans sa fiche, sa carte de
combat, ses projectiles et son ultime. C'est le fil qui relie un personnage à travers tout le jeu.

### 4.2 Matières et lumière

- **Matières** : acier noir, cuir usé, or terni, os, pierre humide, tissu lourd. Rien ne brille proprement.
- **Lumière** : une seule source chaude, en haut à gauche ; une lueur froide (lune, brume) en fond.
  Les halos sont **larges et faibles**, jamais des points durs.
- **Contraste** : les personnages sont éclairés, le décor est en retrait d'un voile sombre (`dimTarget`).
  Quand un ultime part, ce voile monte à 0,4-0,6 : le monde s'éteint, l'action reste.
- **Détail** : texture peinte visible (coups de pinceau), pas de trait net ni de contour noir.

### 4.3 Typographie

| Usage | Police | Réglage |
|---|---|---|
| Titres d'écran | Cinzel Decorative | 3,2 rem, interlettrage 0,06 em |
| Sous-titres, boutons | Cinzel | 0,8 rem, majuscules, interlettrage 0,15 em |
| Corps de texte | Segoe UI / system-ui | 0,76 rem |

Toujours en **majuscules espacées** pour les titres. Jamais de texte penché, jamais d'ombre portée dure.

### 4.4 Ce que le style interdit

- ❌ néons, dégradés arc-en-ciel, particules scintillantes gratuites
- ❌ contours noirs épais ou cel-shading
- ❌ flou de profondeur marqué (donne l'impression d'un jeu flou — rejeté)
- ❌ bloom fort (crame les héros clairs — rejeté)
- ❌ formes abstraites seules (boules, cercles, carrés) sans objet identifiable

---

## 5. Anatomie d'un écran de combat

Ordre des calques, du fond vers l'avant :

| z | Calque | Contenu |
|---|---|---|
| 0 | ciel / fond lointain | décor peint, flouté légèrement en `high` |
| 1 | plan moyen | végétation, stèles, brume dense |
| 2 | plan proche | éléments de premier plan, plus rapides à la parallaxe |
| 3 | sol | ombres au sol, marques, cercles runiques |
| 4 | **unités** | héros et ennemis, triés en profondeur (`y`) pour que les premiers passent devant |
| 5 | projectiles | lames, flèches, traits, éclats |
| 6 | effets au sol | impacts, ondes, fissures |
| 7 | effets aériens | halos, flammes, plumes, éclairs |
| 8 | texte flottant | dégâts, soins, statuts |
| 9 | voile | assombrissement d'ultime (`dimTarget`) |
| 10 | post | bloom, étalonnage, vignette, grain |
| 11 | interface de combat | barres, cartes, boutons, lignes de vitesse |

**Repère** : la scène de combat travaille en deux espaces. Le monde (`world`) porte la caméra et tous
les effets ; l'interface de combat est posée **au-dessus**, insensible au zoom et aux secousses.

---

## 6. La chaîne d'image

C'est ce qui donne au jeu son aspect « film » plutôt que « jeu web ». Elle s'applique dans cet ordre :

1. **Bloom** (`FastBloomFilter`, seuil 0,84, échelle 0,5, flou 6) — les hautes lumières débordent.
2. **Étalonnage** (`ColorMatrixFilter`) — contraste +0,11, saturation +0,16, luminosité 1,02.
3. **Vignette** — assombrit les bords à 50 %, garde l'œil au centre.
4. **Grain** — bruit animé à 4,5 % d'opacité, redonne une texture de pellicule.
5. **Filtres d'impact**, appliqués à la volée :
   - **Onde de choc** (`ShockwaveFilter`, amplitude 26, longueur d'onde 170) sur les gros impacts
   - **Flou radial** (`ZoomBlurFilter`) sur les coups critiques et les ultimes
   - **Déchirure chromatique** (`RGBSplitFilter`, séparation 11, 0,24 s) sur les impacts majeurs
6. **Flou du décor lointain** (`BlurFilter` force 6) — uniquement le plan 0, jamais les personnages.

**Règle** : aucun filtre ne s'applique **jamais** à l'interface. Elle reste nette en toutes circonstances.

---

## 7. Caméra

La caméra est un objet à part entière (`battle/Camera.ts`), pas un simple décalage. Elle sait :

| Capacité | Usage |
|---|---|
| **Zoom** | 1,0 → 1,8 sur les ultimes ; 0,92 sur les plans larges de fin |
| **Pitch / lacet / roulis** | légère inclinaison pour les contre-plongées (`pitch: -0,09`) |
| **Secousse directionnelle** | l'impact part dans la direction du coup, pas dans tous les sens |
| **Travelling** | suit un projectile, une vague de glace, un mur de flammes |
| **Montage** | coupes franches entre deux cadrages (utilisées par Lyra) |
| **Ralenti** | `setTimeScale(0,75, 12)` — le temps ralentit puis revient sur 12 images |
| **Retombée** | après chaque ultime, la caméra s'écarte et la poussière retombe |

**Le principe** : la caméra n'est jamais décorative. Elle **raconte** le coup — elle recule avant,
plonge pendant, se relève après. C'est 70 % de l'effet « cher » d'un ultime.

---

## 8. Animation des personnages

Chaque illustration est découpée en **maillage** et ses sommets suivent des **os** — la technique de
Spine, mais faite maison (`RigMesh.ts`, `UnitView.ts`, `rigs.ts`).

**Os disponibles** : bassin, colonne (buste), tête, bras principal + arme, bras secondaire, cape,
cheveux, jambes avant/arrière.

**Ce qui existe aujourd'hui**

| Animation | Détail |
|---|---|
| Respiration | le buste monte et descend en boucle, décalé par unité |
| Marche | les jambes alternent, le corps oscille, les pieds se posent |
| Attaque | anticipation → frappe → récupération, avec déformation du buste |
| Tissu | cape et cheveux ondulent, amplitude croissante loin de l'attache |
| Mort | affaissement, teinte désaturée, disparition en fondu |
| Statuts | gel (teinte cyan + ralentissement), brûlure (braises), poison (voile vert) |

**Six styles de frappe** : `heavy` (marteau, coup lent et large), `fast` (estoc, aller-retour nerveux),
`claw` (griffes, double crochet), `bow` (arc, tension puis relâchement), `cast` (incantation, bras levés),
`light` (dague, coups brefs en rafale).

**Ce qui manque encore** : l'écrasement/étirement (*squash & stretch*) sur les impacts, les foulées qui
soulèvent la poussière, et les transitions entre deux animations (aujourd'hui, une attaque remplace
l'idle sans fondu).

---

## 9. Les effets

### 9.1 Textures de combat (19)

| Catégorie | Textures |
|---|---|
| Armes | `slash` (entaille), `claw` (griffure), `arrow` (flèche), `beam` (rayon), `bolt` (trait d'énergie) |
| Impacts | `crack` (fissure au sol), `rune` (cercle gravé), `disc` (disque sombre), `spike` (masse d'épines) |
| Air | `speed` (lignes de vitesse), `streak` (traînée), `debris` (gravats), `feather` (plume) |
| Magie | `star` (étoile), `sigil` (sceau), `arc` (arc électrique), `ice` ×3 (éclats de glace) |
| Base | `shadow` (ombre au sol) |

### 9.2 Textures d'ambiance (14)

`glow`, `glowSoft`, `spark`, `fog`, `fogThin`, `smoke`, `spiral`, `spiralSoft`, `rays`, `ring`,
`flame`, `vignette`, `shimmer`, `noise`.

### 9.3 Le « ressenti d'impact »

C'est le cœur du sujet. Chaque coup important déclenche une **chaîne** :

1. **Hit-stop** — le temps s'arrête 40 à 90 ms. Le coup « pèse ».
2. **Flash** — un aplat blanc ou coloré sur 2 à 4 images.
3. **Onde de choc** — un anneau part du point d'impact.
4. **Déchirure chromatique** — les canaux rouge/bleu se séparent brièvement.
5. **Secousse caméra** — directionnelle, amortie.
6. **Éclats** — 6 à 16 morceaux qui partent en arc.
7. **Chiffre de dégâts** — étagé verticalement pour ne jamais se superposer.
8. **Traînée** — la lame laisse un fantôme 120 ms.

Un coup « normal » n'en déclenche que trois (flash, éclat, chiffre). C'est la **rareté** qui donne
sa valeur au reste.

### 9.4 Le son — la moitié invisible du poids des coups

Un impact sans son ne pèse pas, même avec un hit-stop parfait. Le jeu embarque donc sa propre
banque sonore, **sans aucun téléchargement**.

| Élément | Réalité |
|---|---|
| Moteur | `src/audio/AudioEngine.ts` — 450 lignes : musique, effets, volume, modes hub/combat |
| Banque | **54 fichiers `.ogg`, 2,4 Mo** — impacts, critiques, projectiles, boss, ultimes, monnaie, ambiance |
| Musique | deux pistes séparées (`music_hub`, `music_battle`), fondu croisé au changement d'écran |
| Réglages | volume, muet, changement de mode — branchés dans l'interface |

**Synchronisation.** Le son d'impact part **à la même image** que le hit-stop. C'est ce couplage
qui fait la différence entre « un bruit » et « un coup ».

**Ce qui peut encore progresser** : la voix (aucune ligne parlée), l'ambiance du hub (vent, forge)
et une montée de tension avant les ultimes. Ce sont des ajouts de contenu sonore, pas de code moteur.

---

## 10. Les ultimes — une mise en scène par héros

Aucune séquence n'est partagée. Durée moyenne : **2,4 à 3,4 s**.

| Héros | Ultime | Mise en scène |
|---|---|---|
| **Kael** | Jugement Ardent | bond au ralenti, caméra qui suit, impact dévastateur au sol |
| **Lyra** | Danse Écarlate | montage nerveux de coupes franches, traînées rouges, X final |
| **Morwen** | Fléau Noir | plongée sur un cercle runique géant, éclairs, âmes qui s'élèvent |
| **Seren** | Pluie Lunaire | flèche tirée vers le ciel, la caméra la suit puis bascule sur la pluie |
| **Aldric** | Sanctuaire Sacré | cercle doré, colonne de lumière divine, plumes |
| **Thorne** | Hiver Éternel | contre-plongée sur le jarl, travelling qui suit le mur de glace |
| **Nyx** | Éclipse | contre-plongée sur un soleil noir qui grossit, implosion violette |
| **Ashka** | Rage du Tonnerre | l'Oiseau-Tonnerre traverse le ciel, la foudre s'abat en rafale |
| **Vaelen** | Rempart Écarlate | éclatement de bouclier, déchirure chromatique, projection |
| **Sylvaine** | Bois des Suppliciés | forêt d'épines qui jaillit autour des ennemis |
| **Pyrrha** | Jugement de Flammes | impact et onde de feu, deux déchirures chromatiques |
| **Orlan** | Le Grand Glas | rayon vertical + 3 anneaux runiques + éclat sur chaque allié |
| **Vespera** | Veuve Noire | 8 éclats de lame spiralés puis croix écarlate en *crossing streaks* |
| **Gorm** | Éboulement | fissure verte, 14 blocs de pierre tombent du ciel, onde de choc |

### 10.1 Le cut-in — le bandeau d'annonce

Avant que la mise en scène démarre, un **bandeau diagonal** traverse l'écran pendant **820 ms**
(`BattleHud.cutin()`). Il contient :

| Couche | Rôle |
|---|---|
| `cutin-band` | bandeau diagonal, teinté de la couleur du héros (`h.css`) |
| `cutin-rays` | rayons qui partent du centre |
| `cutin-lines` / `cutin-speed` | lignes de vitesse qui filent vers l'extérieur |
| `cutin-art` | illustration du héros (la même que la fiche, rien de dessiné sur le sprite) |
| `cutin-text` | « Ultime » + nom de la compétence + nom et titre du héros, en Cinzel |
| `cutin-flash` | éclat final avant la mise en scène |

C'est ce qui transforme un clic en **événement**. Sans lui, l'ultime commence sans prévenir et
perd la moitié de son effet.

### 10.2 Le montage kinétique — 0,32 s de « cinéma »

Avant l'élan, une **ouverture de trois coupes franches** (`CineDirector.startK()`), sans une seule
image supplémentaire à dessiner :

| Temps | Coupe | Effet |
|---|---|---|
| 0,00 s | **visage** — zoom 3,0 sur la tête | l'écran **se fissure**, s'inverse en négatif 3 images, déchirure RVB 14 px, secousse légère |
| 0,11 s | **buste / arme** — zoom 2,35, angle opposé | contre-roulis du cadre, lignes de vitesse en rotation |
| 0,22 s | **plan large** en contre-plongée — zoom 1,28 | on replace le héros dans le champ avant l'élan |

Puis l'élan normal reprend (1,45 s) et la scène propre au héros démarre.

**Pourquoi ça marche :** l'œil ne lit pas « une image qui bouge », il lit **trois images d'action
différentes**. C'est du montage, pas de l'animation — et c'est exactement la technique d'un anime.
Coût : **zéro asset**, 0,32 s de temps de jeu.

**Les trois outils de choc, chiffrés**

| Outil | Valeur | Où |
|---|---|---|
| Fissure de verre | 0,45 s en ouverture, 0,30 s à l'impact | `createGlassCrackTexture()` — 17 rayons, 5 toiles concentriques |
| Négatif | 0,05–0,06 s (2 à 4 images) | `ColorMatrixFilter.negative()`, prioritaire même en `low` |
| Image d'impact | fond **blanc pur**, silhouettes **noires** | `impactFrame()` — la couleur est réservée au reste du jeu |
| Déchirure RVB | 20 px sur l'impact | `rgbSplit()` |
| Lignes de vitesse | **4,5 rad/s** en rotation continue | elles tournent au lieu de clignoter |

**Règle tenue :** l'ajout total est de **0,32 s**, pas 2,1 s. Un ultime complet reste à 2,7–3,7 s.
Au-delà, l'écran d'excuse devient le jeu.


**Le boss a aussi ses deux scènes** : entrée en rage (zoom brutal, rugissement au ralenti) et mort
(image d'impact, ralenti dramatique). La fin de combat recadre sur les héros vainqueurs.

---

## 11. Cendrebourg — le hub

Une place de ville peinte en **3168 × 1344**, parcourue horizontalement à la souris, au clavier ou en
glissant. Le jeu se joue beaucoup ici : c'est le « chez soi » entre deux combats.

**Les couches, du fond vers l'avant**

| Couche | Parallaxe | Contenu |
|---|---|---|
| Ciel | 0,55 | lune rouge, nuages, éclairs d'orage dirigés vers la Tour |
| Brume lointaine | 0,75 | deux nappes qui dérivent en sens inverse |
| Ville | 1,00 | bâtiments, places, cristal d'invocation |
| Brume proche | 1,18 | nappe basse + cendres qui montent |

**Ce qui vit déjà** : brume multi-couches, corbeaux qui traversent, éclairs sur la Tour, éclairage des
fenêtres qui vacille, cristal qui flotte et pulse, PNJ qui parlent au survol, cendres en suspension,
léger décalage de la scène quand la souris bouge.

**PNJ** : forgeron, garde, cultiste, chat.

**Bâtiments cliquables** : Forge, Taverne, Autel d'invocation, Sanctuaire, Campagne, Boutique, Tour.

---

## 12. L'interface

L'interface est en **HTML/CSS au-dessus du canvas**, pas dessinée dans Pixi. C'est un choix :
texte net, mise en page rapide, animations CSS, accessibilité.

**Le langage visuel** : plaques d'obsidienne (`rgba(16,11,26,0,9)`), filets d'or, coins ornés,
léger dégradé interne, ombre portée profonde. Les boutons ont un liseré doré qui s'allume au survol.

**Écrans** : Hub (HUD haut), Héros (liste + fiche détaillée + équipement), Invocation (autel + animation
de tirage), Campagne (carte des niveaux), Boutique, Formation, Combat (barres, cartes, ultimes).

**Détail des fiches de héros** : illustration centrale, **4 médaillons d'équipement dans les coins**
(arme en haut à gauche, casque en haut à droite, armure en bas à gauche, bottes en bas à droite),
statistiques avec barres, compétences, biographie, puissance.

---

## 13. L'équipement

| Élément | Valeur |
|---|---|
| Emplacements | **4** : arme, armure, casque, bottes |
| Raretés | **5** : Commun, Rare, Épique, Légendaire, Mythique |
| Taux de drop | 52 % / 30 % / 13 % / 4,4 % / **0,6 %** |
| Niveau d'objet | 1 → 20, selon l'avancement dans la campagne |
| Graphisme | **4 peintures** dans le style des héros (épée, cuirasse, heaume, bottes) |
| Poids | 40 Ko au total |

Les peintures ont été générées avec **fond noir pur**, puis posées dans les médaillons avec un
**masque radial CSS** qui fait disparaître le fond. Aucun détourage manuel, aucune découpe.

---

## 14. Audit honnête : ce qui marche, ce qui ne marche pas

### Ce qui marche

- Les **14 ultimes** sont toutes différentes et racontent chacune une action.
- La **chaîne d'impact** donne du poids aux coups.
- Le **décor 2.5D** est crédible : profondeur, brume, parallaxe.
- L'**interface** a une identité cohérente (or + obsidienne).
- Les **projectiles** ont une forme réelle.

### Ce qui ne marche pas encore

| Problème | Gravité | État |
|---|---|---|
| **Mêlée illisible** : au centre, les personnages se chevauchaient | 🔴 fort | ✅ **corrigé** (écart 24 → 78 px + profondeur) |
| **Seulement 2 décors** pour 10 niveaux | 🔴 fort | ✅ **résolu** — 4 décors peints, le chapitre II a les siens |
| **Animation de base** : transitions sèches | 🟠 moyen | ✅ **corrigé** (fondu de pose 80 ms, recul doublé) |
| **Personnages figés entre deux actions** (idle trop discret) | 🟠 moyen | partiel |
| **Hub** : vie présente mais peu interactive (PNJ immobiles) | 🟠 moyen | partiel |
| **Chiffres de dégâts** encore nombreux en combat de groupe | 🟡 faible | amélioré |
| **Équipement** : une seule peinture par emplacement, quelle que soit la rareté | 🟡 faible | assumé pour l'instant |
| **Aucune variation de teinte** entre les 14 héros au combat (même socle d'effets) | 🟡 faible | non résolu |

---

## 15. Ce qui a été essayé puis refusé — ne pas reproposer tel quel

1. **Boules de lumière** comme projectiles → laides, génériques.
2. **Un cercle au sol** comme ultime universel → rejeté.
3. **Flou de profondeur marqué** → sensation de jeu flou.
4. **Bloom fort** → héros clairs cramés.
5. **`AlphaMask` de Pixi 8** → ne fonctionne pas dans ce projet.
6. **Polices externes au runtime** → interdites (build hors-ligne).
7. **Objets dessinés sur le personnage** → refusé : l'équipement vit dans sa fiche.
8. **Détourage d'un fond noir par algorithme** → échoue ; on utilise un fond chroma pur ou un masque.

---

## 16. Le plan de rework

Six chantiers, classés par **impact visuel ÷ effort**. Chacun est indépendant : on peut n'en faire qu'un.

### Chantier 1 — Mêlée lisible 🔴 *priorité absolue*

**Problème** : au centre de l'écran, six à dix personnages se superposent et on ne comprend plus rien.
**Piste** : resserrer les formations, décaler les lignes en profondeur (les héros de devant plus bas et
plus grands), ajouter une ombre nette sous chaque unité, faire passer les ennemis ciblés au premier plan.
**Effort** : moyen. **Risque** : faible (aucune statistique touchée).

### Chantier 2 — Animation de base 🟠

**Problème** : les personnages bougent, mais sans « poids ».
**Piste** : squash & stretch sur l'impact et le saut, poussière sous les pas, fondu de 80 ms entre
deux animations, micro-recul du corps à chaque coup reçu.
**Effort** : moyen-fort. **Risque** : faible.

### Chantier 3 — Un troisième et un quatrième décor 🔴

**Problème** : deux décors pour dix niveaux.
**Piste** : une **citadelle en ruine** (pierre, neige, vitraux brisés) et un **trône de cendre**
(intérieur, colonnes, lave). Chaque décor = une illustration 2.5D + deux plans de parallaxe.
**Effort** : fort (création d'images). **Risque** : faible.

### Chantier 4 — Hub vivant v2 🟠

**Problème** : les PNJ sont des statues.
**Piste** : trois allées piétonnes, PNJ qui marchent d'un point à l'autre, fumée de cheminée,
forgeron qui frappe en rythme, corbeaux qui s'envolent au survol, cendres qui tourbillonnent.
**Effort** : moyen. **Risque** : faible.

### Chantier 5 — Interface : profondeur et réactivité 🟡

**Problème** : l'interface est propre mais plate.
**Piste** : transitions entre écrans (balayage diagonal + cendres), survols plus marqués,
ouverture des fenêtres avec décalage, chiffres qui roulent au lieu de sauter.
**Effort** : faible-moyen. **Risque** : faible.

### Chantier 6 — Identité par héros 🟡

**Problème** : les 14 héros partagent le même socle d'effets.
**Piste** : teinte et texture propres à chaque héros sur ses projectiles et sa traînée ;
une signature visuelle par rôle (Tank = plaques, Assassin = éclairs fins, Mage = volutes…).
**Effort** : moyen. **Risque** : faible.

**Ordre conseillé** : 1 → 2 → 3 → 4 → 5 → 6.
Le chantier 1 change le plus l'expérience pour le moins d'effort ; le 3 demande des images et peut
se faire en parallèle.

---

## 17. Format attendu d'une proposition

Pour être exploitable, chaque idée doit préciser **six points** :

1. **Quoi** — une phrase, avec une référence visuelle concrète.
2. **Où** — fichier et zone (`battle/BattleScene.ts`, `ui/styles.css`, texture canvas…).
3. **Comment** — sprite, particule, filtre, déformation de maillage, CSS ?
4. **Coût** — images/seconde et mémoire estimées ; comportement en `low`.
5. **Risque** — ce qui peut casser (lisibilité, contraste, performance).
6. **Réglage** — valeurs chiffrées de départ (durées, échelles, opacités, couleurs).

Une proposition sans ces six points sera difficile à intégrer.

---

## 18. Prompt prêt à copier-coller

> Tu es directeur artistique et développeur technique spécialisé en jeux de combat 2D (PixiJS/WebGL).
> Voici la fiche graphique complète d'un jeu dark fantasy déjà en ligne :
>
> [coller cette fiche]
>
> Le propriétaire veut une refonte graphique comparable à *Mobile Legends: Adventure*, **sans toucher
> à l'équilibrage**. En respectant les huit règles d'or et la liste des rejets (§15), choisis **un seul
> chantier du plan de rework (§16)** et détaille-le en suivant le format en six points (§17).
> Pour la meilleure proposition, écris le pseudo-code complet : signatures, constantes chiffrées,
> ordre des appels, et le chemin exact des fichiers à modifier.

---

## 19. Historique

| Date | Version | Changement |
|---|---|---|
| 20/10/2026 | v1 | fiche initiale (11 héros, 360 simulations) |
| 22/10/2026 | **v2** | réécriture complète : 14 héros, 10 niveaux, 2 280 simulations, équipement, audit et plan de rework |
| 22/10/2026 | **v2.1** | ajout du §9.4 (le son : 54 sons, moteur 450 lignes) et du §10.1 (le cut-in) — oubliés en v2 |
| 22/10/2026 | **v2.2** | mêlée corrigée : écart 24 → 78 px, séparation en profondeur, anneau de cible, flaque d'ultime, fondu de pose, cadres d'équipement par rareté, aura du chapitre II |
| 22/10/2026 | **v2.3** | §10.2 — montage kinétique : 3 coupes franches, fissure de verre, négatif, impact frame noir et blanc, lignes de vitesse rotatives |
| 22/10/2026 | **v2.4** | deux décors peints : nef brisée (froid, neige, faisceaux lunaires) et trône de cendre (lave, braises montantes) — le chapitre II a sa propre identité |
