# Légendes de la Tour Infinie (v0.5)

La ville de **Cendrebourg** en 2.5D, **8 héros**, l'**Autel d'invocation**, la préparation d'équipe et **2 niveaux de campagne**, avec un combat automatique façon MLA. Fait pour un écran de PC.

## ▶️ Jouer tout de suite
Double-clique sur **`JOUER.html`**. Il s'ouvre dans ton navigateur (Chrome, Edge ou Firefox).
Tout est dans ce seul fichier (images, polices, code) : pas besoin d'internet ni d'installation.

## 🎮 Commandes
| Action | Commande |
|---|---|
| Explorer la ville | Maintenir le clic gauche et glisser, molette, `←` `→` ou `Q` `D` / `A` `D`, ou souris au bord de l'écran |
| Entrer dans un bâtiment | Clic sur le bâtiment ou sur son étiquette |
| Fermer une fenêtre | `Échap` ou clic à côté |
| Parler à un personnage | Clic sur un habitant ou un héros dans la ville |
| **En combat :** lancer une ultime | Clic sur la carte du héros quand sa jauge dorée est pleine, ou touches `1` à `5` |
| Mode automatique | Bouton **AUTO** ou touche `A` |
| Vitesse ×1 / ×2 | Bouton **×1 / ×2** |
| Pause | Bouton ⏸, `Espace` ou `Échap` |
| Afficher les FPS | Touche `F` (images/s, temps par image, résolution de rendu) |

## 🏰 Contenu de cette version
- La ville en 2.5D, avec plusieurs couches qui défilent à des vitesses différentes : ciel, Tour de l'Infini au loin, brume, ville, premier plan. Le décor bouge aussi légèrement avec la souris.
- 6 bâtiments cliquables qui s'illuminent au survol : Portail de Campagne, Taverne, Autel d'Invocation (avec son cristal flottant), Forge, Sanctuaire et Tour de l'Infini.
- Une ville animée : torches qui vacillent, braises, fumée, portail qui aspire des particules, éclairs, corbeaux, cendres, lucioles.
- L'interface : profil, ressources, menus sur les côtés, barre de navigation, discussion, bouton Combattre, paramètres (qualité graphique, noms des bâtiments, recentrer la caméra, effacer la sauvegarde).
- Une sauvegarde automatique dans le navigateur.

### Nouveautés de la v0.2
- **Personnages vivants :** un garde qui patrouille, un cultiste qui erre avec sa lanterne (sa lumière le suit), un forgeron qui frappe l'enclume (gerbes d'étincelles) et un chat noir aux yeux qui brillent et clignent.
- **Lumière qui « bave » :** les torches, la forge, le cristal et le portail rayonnent vraiment (effet de halo lumineux, réglable avec la qualité graphique).
- **Ciel animé :** nuages qui défilent, rayons de la lune de sang, tourbillon au sommet de la Tour, runes qui s'illuminent par vagues, éclairs qui frappent parfois la Tour.
- **Portail qui tourne**, **cristal entouré de rayons**, ondes magiques qui partent de l'autel, flammes vivantes sur les torches.
- **Ambiance sonore de la ville, fabriquée par le code** : vent, feu qui crépite près de la forge, bourdonnement près du portail, tonnerre synchronisé avec les éclairs, coups d'enclume, sons d'interface. Volume et coupure du son dans la barre du haut et dans les Paramètres.
- **Titre d'introduction animé**, cercle de runes sur l'écran de chargement, curseurs dorés, onde lumineuse au clic, coins ornementaux sur les fenêtres, reflets qui balaient les boutons.

### Nouveautés de la v0.3
**Les 5 héros**, chacun avec son style et ses 3 capacités (attaque, compétence automatique, ultime) :
| Héros | Rôle | Compétence | Ultime |
|---|---|---|---|
| **Kael**, Chevalier Déchu | Tank | *Bouclier de Cendres* : bouclier + provocation | *Jugement Ardent* : bond, onde de feu, étourdit 1,5 s |
| **Lyra**, Lame Sanglante | Assassin | *Pas de l'Ombre* : se téléporte derrière l'ennemi le plus faible | *Danse Écarlate* : 7 frappes, intouchable, vol de vie |
| **Morwen**, Nécromancienne | Mage | *Éveil des Morts* : invoque 2 squelettes spectraux | *Fléau Noir* : peste sur tous les ennemis + ralentissement |
| **Seren**, Archère Lunaire | Archère | *Tir Perçant* : flèche qui traverse une ligne | *Pluie Lunaire* : vagues de flèches |
| **Frère Aldric**, Inquisiteur | Soigneur | *Prière* : soigne l'allié le plus blessé | *Sanctuaire Sacré* : soin de groupe, purification, −35 % de dégâts subis |

**Le combat** : automatique comme dans MLA. Les héros avancent, frappent et lancent leurs compétences seuls. Toi, tu choisis **le bon moment pour les ultimes** (avec arrêt sur image et séquence d'ultime), ou tu actives le mode **AUTO**. Vitesse ×2, pause, chiffres de dégâts, coups critiques, barre du boss, minuteur (90 s). À la fin : 1 à 3 étoiles (3 si aucun héros n'est tombé), récompenses, MVP et tableau des dégâts.

**Chapitre 1, niveau 1-1 « La Route des Pendus »** : 2 goules, 2 squelettes archers et le boss **Gardien d'Os**, qui charge ses coups et devient enragé sous 50 % de vie. On y accède par le Portail de Campagne, le bouton COMBATTRE ou l'onglet Campagne. Le niveau rapporte de l'or, des gemmes et de l'expérience. Il coûte de l'énergie et la progression est sauvegardée.

**L'écran des Héros** (Sanctuaire ou onglet Héros) : grande illustration, statistiques, puissance et description des capacités.

**Le hub encore plus vivant :**
- Kael, Aldric et Lyra sont maintenant présents dans la ville.
- Tous les personnages sont **cliquables** et ont leurs propres répliques, avec un halo au survol. La bulle d'un héros propose d'ouvrir sa fiche.
- **Étoiles filantes** dans le ciel, **bokeh** (grosses braises floues au premier plan) et transition animée vers le combat.

### Nouveautés de la v0.4 : le combat refait de A à Z
**Des personnages vraiment animés.** Chaque illustration est maintenant posée sur un **squelette 2D** (comme avec Spine) : bassin, buste, tête, bras, arme, jambes, cape et cheveux. Le dessin est découpé en maillage et se déforme en suivant les os :
- **Attaques en 3 temps** : élan (le personnage arme son coup et se ramasse), frappe éclair (le buste et l'arme partent vers l'avant), puis retour. Lyra alterne ses deux dagues. Les goules griffent, Seren bande vraiment son arc et encaisse le recul, et les mages lèvent la main avant de lancer leur sort.
- **Course** avec foulées, buste penché et rebond. **Respiration** au repos, **capes et cheveux qui flottent** au vent.
- **Réactions** : recul quand on est touché (plus fort sur un coup lourd), tête qui tourne quand on est étourdi, pose d'incantation avec aura, saut de joie à la victoire.
- **Morts** : les genoux lâchent, le corps bascule puis se dissout en poussière d'âme.
- Le moment de l'impact dans la simulation est **synchronisé** avec l'animation.

**Ultimes en fausse 3D (environ 2 s chacun).** Le combat se fige, puis la caméra plonge sur le héros : bandes cinéma, lignes de vitesse façon manga, flou radial, son qui monte et illustration plein écran. Ensuite chaque héros a sa propre mise en scène :
| Héros | Mise en scène |
|---|---|
| **Kael** | Bond au ralenti suivi par la caméra, avec des images rémanentes enflammées. L'atterrissage déclenche une **image d'impact** façon anime (écran blanc, silhouettes noires), une onde de choc qui déforme l'écran, un sol fissuré qui rougeoie, une colonne de feu et des débris projetés. |
| **Lyra** | Montage nerveux de **coupes franches**, avec une caméra qui pivote en perspective à chaque téléportation. Traînées rouges, arrêts sur chaque coup, puis un **grand X** qui déchire l'écran. |
| **Morwen** | **Plongée** en perspective sur un cercle runique géant, âmes qui s'élèvent, puis éclairs qui frappent chaque ennemi au ralenti. |
| **Seren** | Flèche de lumière tirée vers le ciel : la caméra la suit, puis bascule sur un **portail d'étoiles** d'où tombe la pluie de flèches. |
| **Aldric** | Cercle sacré doré, colonne de lumière divine et pluie de plumes. |

**Caméra dynamique.** Hors cinématique, la caméra suit la mêlée et zoome un peu quand les combattants se regroupent. Le décor est en **parallaxe** (il bouge moins que les personnages) et il y a une brume au premier plan, ce qui donne de la profondeur.
- Tremblements organiques, coups de zoom et **arrêts sur impact** à chaque coup lourd ou critique.
- **Mini-séquences** : plan d'ouverture qui part du boss, rage du boss (zoom brutal et rugissement au ralenti), mort du boss (ralenti dramatique), victoire (caméra sur les héros qui sautent de joie).

**Vrais sons enregistrés.** Les bips de synthé sont remplacés par des enregistrements libres de droits (CC0) :
- Bruitages de combat retravaillés, avec plusieurs couches mixées pour chaque son : lames, impacts, os, explosions, sorts, cris de monstres, chœur…
- Légères variations de hauteur à chaque coup pour éviter la répétition. Le son est spatialisé (gauche/droite selon la position à l'écran).
- La musique s'efface sous les gros impacts et elle est assourdie pendant l'élan des ultimes.
- **Musique de combat épique** en boucle et **fanfare de victoire**. Des sons accompagnent les étoiles et le butin, et l'interface a de nouveaux clics.



### Nouveautés de la v0.5
**Fluidité (le gros chantier).** Les chutes d'images en combat venaient de plusieurs goulots, tous corrigés :
- Le **bloom** (halo lumineux) est calculé sur une image 4 fois plus petite, avec un rendu identique.
- L'**antialiasing matériel** est coupé : il était inutile (tout passe déjà par des filtres) et très coûteux. La résolution est **plafonnée** par un budget de pixels selon la qualité choisie. Sur un écran 4K, on ne calcule donc plus 8 millions de pixels quatre fois par image.
- Il n'y a **plus d'à-coups** dus au ramasse-miettes. Les chiffres de dégâts, les images rémanentes et les barres de vie sont recyclés au lieu d'être recréés. Les squelettes ne créent plus aucun objet à chaque image.
- Ce qui est hors champ ou transparent n'est plus dessiné. L'interface de combat ne touche la page que quand une valeur change.
- Les mélanges de couleurs et les flous d'arrière-plan en CSS, très lourds, ont été retirés.
- **Résolution adaptative** en combat : si la machine peine vraiment, la résolution baisse un peu toute seule, puis remonte.
- Touche `F` pour afficher le compteur de FPS.

**3 nouveaux héros**, chacun avec son illustration peinte, son squelette animé, 3 capacités et un ultime en cinématique :
| Héros | Rareté | Rôle | Ultime |
|---|---|---|---|
| **Thorne**, le Jarl de Givre | SR | Guerrier | **Hiver Éternel** : il charge, puis un mur de pics de glace balaie tout le champ de bataille. Les ennemis sont **gelés** (immobiles et teintés de glace, avec des cristaux qui les emprisonnent) et la caméra suit la vague. |
| **Nyx**, l'Impératrice du Néant | SSR | Mage | **Éclipse** : un soleil noir grossit au-dessus des ennemis, filmé en contre-plongée. Il les **aspire** vers lui, puis implose dans une image d'impact violette. |
| **Ashka**, la Chamane de l'Orage | SR | Soutien | **Rage du Tonnerre** : un oiseau-tonnerre s'abat sur le champ de bataille. Les alliés sont **accélérés**, puis 6 colonnes de foudre frappent les ennemis. |

Leurs capacités : Tourbillon de Givre (ralentit), Singularité (petit trou noir qui aspire), Chaîne d'Éclairs (rebondit sur 4 ennemis).

**Autel d'invocation (façon MLA).**
- Bannière « Éclipse Naissante » avec **gemmes**, invocation **×1** (150) ou **×10** (1 350, avec un SR ou mieux garanti). Les taux sont affichés : SSR 3 %, SR 27 %, R 70 %.
- **Garantie** : un SSR au plus tard à la 60ᵉ invocation, avec une jauge visible.
- **Les doublons donnent des étoiles** : +1 étoile par doublon, et chaque étoile ajoute +10 % de PV et d'ATQ. Les étoiles 1 à 5 sont dorées, les étoiles 6 à 10 violettes.
- **Grande séquence d'invocation** : cercle runique en perspective, particules aspirées, orbe et colonne de lumière. La couleur du cercle **annonce la rareté** (violet, puis or pour un SSR). Viennent ensuite un flash et des cartes qui se retournent une à une. Chaque nouveau héros est présenté en plein écran. Clique pour passer.
- Thorne, Nyx et Ashka ne s'obtiennent qu'à l'Autel. Tu reçois **1 500 gemmes** en cadeau à la première ouverture.

**Préparation d'équipe.** Avant chaque combat, tu choisis tes 5 héros et tu vois l'aperçu du placement face aux ennemis. La puissance de l'équipe est comparée à celle conseillée, et un bouton compose « l'équipe la plus puissante ».

**Niveau 1-2 : Le Marais des Noyés.** Un nouveau décor peint (marais, épave, chapelle engloutie, lanternes), avec de la brume et des lucioles.
- **Noyés** : leurs coups ralentissent.
- **Sorcières des marais** : maléfice qui inflige des dégâts sur la durée.
- Boss, **La Reine Noyée** : elle alterne le **Raz-de-marée** (repousse toute l'équipe) et l'**Étreinte** (attire le héros le plus éloigné et l'étourdit). Astuce : étourdis-la ou gèle-la pendant qu'elle prépare sa vague.

**Écrans revus.**
- La carte de campagne a 5 étapes : la 1-2 se débloque après la 1-1, et la suite arrive bientôt.
- L'écran des héros montre les étoiles, les héros pas encore invoqués et l'équipe actuelle.
- Le conseil affiché après une défaite dépend du niveau.

## 🛠️ Pour développer (code source)
Il faut installer [Node.js](https://nodejs.org) (version 20 ou plus), puis :
```bash
npm install
npm run dev      # lance le jeu en mode développement, avec rechargement automatique
npm run build    # produit dist/index.html (un seul fichier jouable)
```

**Outils utilisés :** TypeScript (en mode strict), Vite et PixiJS 8 (rendu WebGL). L'interface est en HTML/CSS.

```
src/
  main.ts            démarrage, écran de chargement, liaisons entre les modules
  config.ts          réglages (taille du monde, parallaxe, caméra)
  assets.ts          chargement des images
  core/Game.ts       application Pixi, adaptation à la taille de l'écran, boucle de jeu
  core/Camera.ts     caméra : glisser avec inertie, molette, clavier, bords élastiques
  scene/HubScene.ts  la ville : couches, effets, bâtiments
  scene/BuildingView.ts  zone cliquable et surbrillance d'un bâtiment
  scene/Npc.ts       personnages d'ambiance (marche, respiration, lumière qui les suit, clic)
  battle/Sim.ts      moteur de combat (logique pure, sans affichage : stats, IA, capacités)
  battle/BattleScene.ts  affichage du combat (Pixi) : unités, effets, chiffres, ralentis, ondes de choc
  battle/UnitView.ts     un combattant : machine d'animation (élan, frappe, course, mort…), barres de vie
  battle/rigs.ts         squelettes 2D de chaque illustration (os, membres, tissus)
  battle/RigMesh.ts      maillage déformable + calcul des poids (skinning)
  battle/Camera.ts       caméra « fausse 3D » : zoom, roulis, parallaxe, plongée en perspective
  battle/cinematics.ts   réalisateur des ultimes et des mini-séquences
  ui/BattleHud.ts    interface de combat : cartes des héros, pause, victoire / défaite
  ui/Summon.ts       Autel d'invocation et séquence d'invocation
  ui/Formation.ts    préparation de l'équipe avant un combat
  data/summon.ts     taux, garantie, coût et tirage de l'Autel
  core/perf.ts       mesure des FPS, résolution adaptative, bloom optimisé
  data/heroes.ts     héros, ennemis, niveaux (stats et capacités, facile à équilibrer)
  data/npcLines.ts   répliques des personnages du hub
  audio/AudioEngine.ts   lecture des sons enregistrés (variations, mixage, musique) + ambiance de la ville générée par le code
  data/buildings.ts  liste des bâtiments (nom, texte, contour, étiquette)
  fx/                particules, lumières, brume, éclairs, corbeaux, textures créées par le code
  ui/                interface HTML (UI.ts), icônes SVG, styles CSS
  state/store.ts     données du joueur, paramètres et sauvegarde
  assets/            images du jeu (ciel, ville, cristal, héros, ennemis, champ de bataille)
  assets/sfx/        sons et musiques (OGG)
art-sources/         images d'origine, avant détourage
sound-design/        script Python qui a fabriqué les sons à partir des enregistrements
```

### Ajouter un bâtiment
Ajoute une entrée dans `src/data/buildings.ts`. Il faut lui donner un nom, un texte, une icône, le contour (polygone) et la position de l'étiquette. La surbrillance, le clic et l'étiquette sont alors créés automatiquement.

### Équilibrer un héros ou ajouter un niveau
Tout est dans `src/data/heroes.ts` : points de vie, attaque, armure, vitesse d'attaque, portée, temps de recharge et puissance des capacités. Un niveau, c'est une entrée dans `STAGES` : la liste des ennemis avec leur position, le décor, la puissance conseillée, le conseil en cas de défaite, les récompenses et le coût en énergie. Les taux de l'Autel sont dans `src/data/summon.ts`.

### Animer un nouveau personnage
Ajoute son squelette dans `src/battle/rigs.ts`. Les coordonnées vont de 0 à 1 dans l'image :
- position du bassin, du cou et de la tête ;
- membres (articulation + tracé qui couvre le bras et l'arme) ;
- tissus (cape, cheveux) avec leur point d'attache ;
- style d'attaque : `heavy`, `fast`, `claw`, `bow`, `cast` ou `light`.

Le maillage, les poids et toutes les animations sont alors générés automatiquement.

## 🎵 Crédits audio (tous sous licence CC0, domaine public)
**Musiques**
- « Boss Battle Music » : Juhani Junkala / SubspaceAudio (OpenGameArt)
- « Victory Theme » : cynicmusic (OpenGameArt)

**Packs de bruitages**
- OpenGameArt : « 20 Sword Sound Effects » (StarNinjas) ; « 80 CC0 RPG SFX », « 100 CC0 SFX », « 25 CC0 bang SFX », « 80 CC0 creature SFX » et « 75 CC0 breaking/falling/hit sfx » (rubberduck) ; « RPG Sound Pack » (artisticdude) ; « Magic Spell SFX » (JaggedStone)
- Kenney : « Impact Sounds », « Sci-Fi Sounds » et « Interface Sounds »

**Sons Freesound.org (CC0), numéro et titre :**
- #19312 « classic double swwosh .wav »
- #60013 « Whoosh »
- #60024 « swosh swinging sword 37.flac »
- #77637 « growl6.wav »
- #202091 « Falling Bones.wav »
- #315772 « dragon roar big angry.aiff »
- #367182 « swing.mp3 »
- #370203 « shield guard »
- #372086 « Distant Explosion »
- #384918 « Bow Release (Bow and Arrow) 3 »
- #394186 « Slingshot Fly by 2.wav »
- #429083 « Big Roar.wav »
- #430769 « Magical Hit »
- #430977 « Big impact.wav »
- #455207 « Magic Spell 04.wav »
- #504626 « BODY FALL - V HVY - DIRT »
- #521552 « Arrow Impact »
- #523057 « ENERGY RISER 2 »
- #523204 « Magic Spell 09.wav »
- #562292 « Heal - Rpg »
- #570853 « magicShield_block.wav »
- #587193 « explosion_big_02.ogg »
- #587194 « explosion_big_01.ogg »
- #592039 « BRAAMS HIT - 2 »
- #608892 « Angel Reveal.wav »
- #641236 « bones.wav »
- #648729 « Cinematic Woosh SFX-010.wav »
- #733890 « Whoosh 03 »
- #735062 « Fast Warp In »
- #856173 « Apocalyptic Cinematic Brass Braam Impact »

Merci à tous ces créateurs d'avoir offert leur travail au domaine public.
