# Légendes de la Tour Infinie — Fiche graphique & technique

> **But de ce document** : permettre à une autre IA (ou à un artiste technique) de comprendre le jeu
> **sans accès au code**, puis de proposer des améliorations visuelles réellement applicables.
> Tout ce qui est décrit ici est **déjà implémenté** sauf mention contraire.

---

## 0. Résumé en anglais (pour les modèles anglophones)

**Infinite Tower Legends** is a dark-fantasy idle/RPG battler built with **TypeScript + PixiJS 8**,
shipped as a **single self-contained HTML file** on GitHub Pages. Fixed 1920×1080 render target,
photographic-style post chain (bloom, colour grade, vignette, film grain, depth blur), a 2.5D
three-plane parallax battle background, 11 hand-drawn heroes, skeleton-rigged units, a DOM-based
cinematic cut-in for ultimates, and a "game-feel" layer (directional camera kick, zoom punch,
chromatic aberration, shockwave, hit-stop). All recent work is **purely graphical**: damage numbers,
abilities, balance and economy are frozen.

The owner's goal: **animation quality comparable to _Mobile Legends: Adventure_** — i.e. every hit and
every ultimate should feel expensive. This sheet lists what exists, what was rejected, and where help
is wanted.

---

## 1. Le jeu en 30 secondes

| | |
|---|---|
| **Titre** | Légendes de la Tour Infinie |
| **Genre** | RPG de collection / combat automatique semi-actif (« idle battler ») |
| **Plateforme** | Navigateur PC (souris + clavier), plein écran |
| **URL publique** | https://hm3282039-art.github.io/qzeshjkgf/ |
| **Langue** | Français (textes et interface) |

**Boucle de jeu** : le joueur gère une ville-refuge (**Cendrebourg**) en vue 2.5D. Il recrute des héros
à l'autel d'invocation, les fait monter de niveau, puis lance des combats de donjons. Les combats sont
automatiques (on peut accélérer ×1/×2) mais **les ultimes se déclenchent à la main** — c'est le moment
où le joueur regarde vraiment l'écran.

**Trois écrans principaux :**

1. **Le hub (Cendrebourg)** — une place de ville peinte, défilement horizontal, ciel, brume, braises,
   corbeaux. Bâtiments cliquables (Forge, Taverne, Autel, Sanctuaire…). Cristal d'invocation géant au
   centre, tour gothique en arrière-plan, lune rouge.
2. **Le combat** — deux lignes de personnages face à face, décor peint (marais, cimetière, ruines),
   barres de vie, cartes de héros en bas, boutons Auto / ×1 / pause en haut à droite.
3. **Les fenêtres** (Héros, Invocation, Boutique, Campagne) — panneaux sombres à filets dorés.

---

## 2. Contraintes absolues (à respecter par toute proposition)

1. **Graphique uniquement.** Aucune proposition ne doit modifier : dégâts, portée, vitesse d'attaque,
   coûts, taux de critique, économie, courbes de niveau. Le gameplay est figé et validé par
   **360 combats automatisés** qui doivent rester à 0 crash / 0 blocage.
2. **Pas de dépendance lourde.** Le jeu est livré en **un seul fichier HTML** (~9 Mo). Toute librairie
   supplémentaire doit être justifiée en poids.
3. **Pas de ressources externes.** Tout est embarqué (polices comprises). Aucun appel réseau au runtime.
4. **60 images/seconde sur PC modeste.** Il existe trois niveaux de qualité interne
   (`low` / `high` / `ultra`). Une proposition doit indiquer son coût.
5. **Pas de `AlphaMask` Pixi 8** (buggé sur ce projet) : les fondus sont **pré-cuits dans les textures
   canvas**.

---

## 3. Fiche technique

| Élément | Valeur |
|---|---|
| Langage | TypeScript 5.9 (strict) |
| Moteur | **PixiJS 8.22** (WebGL) |
| Filtres | `pixi-filters` 6.1.5 + un `FastBloomFilter` maison |
| Bundler | Vite 7 + `vite-plugin-singlefile` |
| Build | `tsc --noEmit && vite build` → **un seul `index.html`** |
| Poids | ≈ **9 000 kB** (gzip ≈ 6 150 kB) |
| Hébergement | GitHub Pages, branche `gh-pages` |
| Code | ≈ **12 400 lignes** de TS + **1 270 lignes** de CSS |
| Polices | Cinzel + Cinzel Decorative (embarquées via `@fontsource`) |
| Chiffres de dégâts | `BitmapText` avec une police bitmap générée, pool de 80 objets |

**Résolution de rendu du combat : 1920 × 1080 fixe**, mise à l'échelle de la fenêtre.
**Monde du hub : 3168 × 1344 px**, avec parallaxe :
ciel `0.55`, brume lointaine `0.75`, premier plan `1.18`, plus un décalage souris.

---

## 4. Direction artistique actuelle

**Style** : dark fantasy peint, inspiration *Darkest Dungeon* / *Grimoire* pour les textures,
mais composition plus « propre » et colorée, façon jeu mobile coréen.

**Palette d'interface (« obsidienne & or brûlé »)**

| Rôle | Couleur |
|---|---|
| Or principal | `#e3c077` |
| Or clair | `#fff0c2` |
| Or sombre | `#6a5024` |
| Braise / accent chaud | `#ff8a3d` |
| Rouge sacrificiel | `#c2183c` |
| Violet arcanique | `#8a4dff` |
| Encre (fond) | `#070510` |
| Panneaux | `rgba(18,13,30,.94)` / `rgba(33,24,51,.96)` |
| Texte | `#f4eeff` · secondaire `#a99cc4` |

**Codes de couleur des héros** (utilisés partout : auras, projectiles, cut-in, halos de carte) :

| Héros | Rôle | Couleur | Identité visuelle |
|---|---|---|---|
| Kael | Tank | `#ff7a2a` braise | chevalier déchu, armure + bouclier ardent |
| Lyra | Assassin | `#ff2a4a` rouge sang | lame jumelle, cape, vitesse |
| Morwen | Mage | `#b055ff` violet | nécromancienne, spectres |
| Seren | Tireur | `#7ac8ff` bleu lunaire | archère, flèches d'argent |
| Frère Aldric | Soutien | `#ffd36a` or | inquisiteur, lumière sainte |
| Thorne | Guerrier | `#8ae0ff` glace | jarl nordique, hache de givre |
| Nyx | Mage | `#a86bff` néant | impératrice du vide, éclipse |
| Ashka | Soutien | `#6ad8ff` foudre | chamane orage, oiseau-tonnerre |
| Vaelen | Tank | `#ffb454` cendre | rempart, marteau de siège |
| Sylvaine | Tireur | `#7ae08a` vert ronce | épine de la nuit, arc |
| Pyrrha | Mage | `#ff6a2a` braise | bûcher éternel, météores |

**Ambiance** : nuit permanente, lune rouge, brume, cendres qui montent, grain de film léger.

---

## 5. Architecture du rendu (combat)

### 5.1 Ordre des calques (z, du fond vers l'avant)

```
bgLayer            décor peint lointain (3 plans de parallaxe)
ambientBack        spores / poussière d'ambiance
dim                voile d'assombrissement (mode « spotlight »)
impactBg           aplat plein écran pour les arrêts sur image
groundNormal       ombres, marques au sol (mode normal)
groundFx           effets au sol additifs (anneaux, runes, fissures)
unitsLayer         les personnages
debris / smoke / fxNormal / fxLayer / plague / wisps / fire / sparks / motes / feathers / cineMotes
fgLayer            premier plan (herbes, brume basse) — parallaxe 1.3
textLayer          chiffres de dégâts
─────────────────────────────────────────────
vignette           vignette écran
grain              grain de film (TilingSprite, alpha .045)
speedLines         lignes de vitesse radiales (add)
barTop / barBot    bandes cinéma
flash              flash plein écran (add)
```

### 5.2 Chaîne de post-traitement

| Effet | Réglage actuel |
|---|---|
| **Bloom** maison (`FastBloomFilter`) | seuil `0.84`, échelle `0.5`, luminosité `0.92`, flou `6` |
| **Étalonnage** (`ColorMatrixFilter`) | contraste `+0.11`, saturation `+0.16`, luminosité `1.02` |
| **Flou de profondeur** | flou du décor lointain `1.4` (high) / `2.4` (ultra) — **volontairement très léger** |
| **Vignette** | alpha `0.5` |
| **Grain** | alpha `0.045` |
| **Déchirure chromatique** (`RGBSplitFilter`) | déclenchée par événement, `0 → 16 px` |
| **Onde de choc** (`ShockwaveFilter`) | amplitude décroissante, durée `1.2 s` |
| **Flou radial** (`ZoomBlurFilter`) | jusqu'à `0.12` sur les impacts |
| **Bandes cinéma** | `8.5 %` de la hauteur, montée en `0.1 s` |

> ⚠️ **Leçon apprise** : un flou de profondeur trop fort a été essayé puis **rejeté** — il donnait
> l'impression que tout le jeu était hors mise au point. Idem pour un bloom trop généreux : les héros
> clairs (Thorne, Seren) devenaient des taches blanches. Les seuils actuels sont des maximums.

### 5.3 Caméra

- Translation, zoom, roulis, tangage, lacet (perspective réelle via `PerspectiveMesh`).
- **Tremblement** : bruit multi-fréquence dont l'amplitude suit `trauma²` (décroissance `1.6/s`).
- **Coup de zoom** (`punch`) : multiplicateur bref, décroissance `exp(-7t)`.
- **Impulsion directionnelle** (`kick`) : la caméra est **projetée dans le sens du coup** (max 46 px),
  décroissance `exp(-9t)`. C'est ce qui donne du poids.
- Parallaxe : le décor suit à `0.9` du mouvement, le premier plan à `1.3`.

---

## 6. Inventaire des effets existants

### 6.1 Projectiles — formes réelles (refonte récente)

Chaque type a une **silhouette identifiable** dessinée en canvas. Objectif explicite du propriétaire :
**« plus jamais de boules de lumière »**.

| `kind` | Texture | Forme | Ancre | Échelle | Traînée |
|---|---|---|---|---|---|
| `arrow` | `arrow` | flèche | pointe | 1 | 80/s |
| `light` | `bolt` | **lance de lumière** effilée | `(0.93, 0.5)` | `1.25` | 70/s, or pâle, 0.18–0.34 s |
| `spark` | `arc` | **éclair en zigzag** | `(0.9, 0.5)` | `1.3` | 170/s, cyan, 0.10–0.22 s |
| `orb` | `sigil` | **sceau arcanique** (2 anneaux, 12 encoches, hexagramme) | centre | `0.58` | 90/s |
| `void` | `sigil` teinté | sceau brisé, sombre | centre | `0.66` | 90/s |
| `hex` | `spike` teinté | **braise hérissée de pointes** | centre | `0.72` | 110/s |
| `bone` / `pierce` | `arrow` | os / trait perçant | pointe | 1 | 80/s |

**Règle d'orientation** : les armes et traits **visent** (`rotation = angle de vol`) ; les sceaux et
braises **tournoient** (`rotation += 7 × dt`). Ne pas inverser.

### 6.2 Ultimes — une mise en scène par héros

Le déroulé est commun (élan → cut-in → exécution → retombée) mais **l'élan et l'exécution sont uniques**.
Constantes : `PHASE_A = 1.45 s`, `AFTERMATH = 0.95 s`.

| Héros | Mise en scène de l'élan |
|---|---|
| Vaelen | le sol se fend, **rempart de flammes** jaillit de chaque côté |
| Sylvaine | **16 flèches convergent** vers son arc + envolée de plumes |
| Pyrrha | **26 braises en spirale** montent autour d'elle |
| Kael | **18 flammes** s'allument en cercle |
| Lyra | **2 arcs de lame** (`slash`) rouges se croisent + poussière cinéma |
| Morwen | **5 spirales** violettes + nuage de peste |
| Seren | **faisceau vertical** + pluie de plumes |
| Thorne | **9 éclats de glace** en cercle |
| Nyx | **3 runes convergentes** + feux follets |
| Ashka | **6 éclairs** + lignes de vitesse |
| Aldric | **rayons sacrés** + 3 anneaux |

**Cut-in (DOM, au-dessus du canvas)** : bandeau incliné à −8°, rayons tournants en conic-gradient,
lignes de vitesse radiales, portrait du héros qui glisse, nom de la capacité en gros, flash d'ouverture.
Durée ≈ `0.78 s`.

### 6.3 « Ressenti d'impact » (ajouté récemment — le cœur du sujet)

À chaque dégât, une intensité `p ∈ [0,1]` est calculée :

```
p = min(1, (dégâts / PV_max) × 5.2)  + 0.30 si critique  + 0.12 si coup lourd
```

Déclenchements :

| Condition | Effet |
|---|---|
| toujours | secousse caméra `0.12 + 0.55p`, coup de zoom `0.004 + 0.032p` |
| `p > 0.20` | **impulsion directionnelle** de la caméra dans le sens du coup |
| `p > 0.30` | déchirure chromatique `2 → 16 px` |
| `p > 0.50` | anneau d'onde au point d'impact |
| `p > 0.55` | onde de choc au sol |
| `p > 0.62` | micro-arrêt du temps `0.02 → 0.07 s` |
| `p > 0.66` | lignes de vitesse teintées |

En qualité `low`, `p` est divisé par deux.

**Sort lancé** : zoom + halo coloré + déchirure.
**Élimination** : onde blanche + projection caméra + arrêt sur image.

---

## 7. Interface (DOM, pas Pixi)

L'interface est en **HTML/CSS superposé** au canvas (`#ui`), avec des unités `rem` dont la base est
ajustée en JS selon la résolution.

- Deux couches CSS : la base (`:root` d'origine) puis une **surcouche « refonte v2 »** en fin de
  fichier qui redéfinit couleurs, surfaces, bordures, ombres et typographie — **sans jamais toucher
  aux positions**.
- Composants : `.hud-top`, `.profile/.avatar`, `.chat`, `.bottom-nav/.nav-btn`, `.battle-btn`
  (bouton rouge circulaire pulsant), `.hcard` (cartes de héros), `.modal/.shell`, `.settings`,
  `.panel.ornate`, `.camp-*`, `.cd-*`, `#loader/.loader-bar`.
- Signature visuelle : **filet d'or intérieur** (`::before` en `inset: .22rem`), biseau clair en haut
  / sombre en bas, ombres profondes, or `#e3c077`.

---

## 8. Zone connue comme faible (analyse honnête)

| Problème | État |
|---|---|
| Projectiles en « boules de lumière » | **corrigé** (formes réelles) |
| Ultimes tous identiques (« cercle bizarre ») | **corrigé** (11 mises en scène) |
| Interface générique | **corrigé** (surcouche obsidienne & or) |
| Image globale trop molle (flou) | **corrigé** (flou ÷3, bloom calmé) |
| Chiffres de dégâts superposés | **corrigé** (étagement vertical + alternance) |
| **Mêlée illisible** : les personnages se chevauchent au centre | **non résolu** |
| **Grand vide** au centre de l'écran « Héros » | **non résolu** |
| **Personnages statiques** entre deux actions (peu d'idle) | **partiellement** (respiration, marche) |
| **Hub** : vie présente mais perfectible | **non résolu** |

---

## 9. Ce qui a été essayé puis **rejeté** (ne pas reproposer tel quel)

1. **Boules de lumière magiques** comme projectiles → jugées laides et génériques.
2. **Un cercle au sol** comme mise en scène d'ultime pour tous les héros → rejeté.
3. **Flou de profondeur marqué** → rejeté (impression de jeu flou).
4. **Bloom fort** → rejeté (héros clairs cramés).
5. **`AlphaMask` de Pixi 8** → ne fonctionne pas dans ce projet.
6. **Polices externes au runtime** → interdites (build hors-ligne, un seul fichier).

---

## 10. Ce que le propriétaire demande

> « Je voudrais juste des **animations de malade** comme dans *Mobile Legends: Adventure*. »

Autrement dit : que **chaque action** donne l'impression de coûter cher — pas seulement les ultimes.

Pistes déjà identifiées mais **non encore implémentées** :

- **Caméra dirigée** : recadrage automatique sur l'action (push-in quand un héros lance un sort,
  léger travelling vers le groupe ennemi le plus dense).
- **Animation d'attaque lisible** : anticipation → frappe → récupération, avec déformation du corps.
- **Écrasement/étirement** (*squash & stretch*) sur les impacts et les sauts.
- **Traînées de mouvement** persistantes sur les dashs.
- **Particules de sol** (poussière, gravats) qui réagissent aux pas.
- **Enchaînement de sorts** : quand deux héros lancent un sort à moins de 0,4 s, un « combo » visuel.
- **Hub vivant** : PNJ qui se déplacent d'un point à l'autre, fumée qui sort des cheminées,
  forgeron qui frappe en rythme, corbeaux qui s'envolent au survol.
- **Transitions entre écrans** : balayage en diagonale avec traînée de cendres.

---

## 11. Format attendu d'une proposition

Pour être exploitable, chaque idée doit préciser :

1. **Quoi** — description en une phrase, avec une référence visuelle concrète.
2. **Où** — fichier et zone concernés (`battle/BattleScene.ts`, `ui/styles.css`, texture canvas…).
3. **Comment** — technique : sprite, particule, filtre, déformation de maillage, CSS, shader ?
4. **Coût** — estimation en images/seconde et en mémoire ; compatible `low` ?
5. **Risque** — que peut-on casser (lisibilité, contraste, performance) ?
6. **Réglage** — valeurs de départ chiffrées (durées, échelles, alphas, couleurs).

Une proposition qui ne précise pas ces six points sera difficilement intégrable.

---

## 12. Prompt prêt à copier-coller

> Tu es directeur artistique et développeur technique spécialisé en jeux de combat 2D (PixiJS/WebGL).
> Voici la fiche graphique complète d'un jeu dark fantasy en cours de développement :
>
> [coller cette fiche]
>
> Le propriétaire veut des animations spectaculaires, comparables à *Mobile Legends: Adventure*,
> **sans toucher à l'équilibrage**. En respectant les contraintes et la liste des pistes rejetées,
> propose **5 améliorations visuelles classées par rapport qualité/effort**, en suivant le format en
> 6 points de la section 11. Pour la meilleure d'entre elles, écris le pseudo-code complet
> (signatures, constantes, ordre des appels) prêt à être traduit en TypeScript.
