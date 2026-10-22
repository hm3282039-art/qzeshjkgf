# Patch 1.4 — la grande mise à jour en 13 points

Tout est livré d'un seul coup, sur la même version en ligne.

## 1. Navigation de campagne par chapitre
La carte n'est plus écrite en dur sur « Chapitre 1 ». Elle est générée à partir
des données : onglets de chapitre, compteur `terminés / total`, décor, titre et
route en zigzag. Elle affiche désormais les **10 chapitres**.

## 2. Mode entraînement (Arène)
Nouveau bouton **Arène** dans le menu du bas.

- Un seul héros, choisi dans la collection.
- Mannequin **invincible** qui ne riposte pas.
- Armure et résistance réglables (0 → 300), quatre préréglages : Paille, Cuir, Acier, Colosse.
- Compteur **dégâts totaux / DPS / temps** en direct, bouton *Remettre à zéro*.
- Fiche des trois capacités du héros à côté (attaque, compétence, ultime).

## 3. Campagne : 10 chapitres, 2 boss par chapitre
- 50 niveaux (`1-1` → `10-5`), 10 chapitres nommés.
- Chaque chapitre a **deux boss** : l'un au niveau 3, l'autre au niveau 5.
- 20 boss nommés, chacun avec sa teinte, sa taille et ses statistiques.
- Courbe d'ennemis recalibrée par simulation : 20 s au chapitre 1, ~75 s au chapitre 10.

## 4. Ultimes de boss
Chaque boss possède **son** ultime (nom + phrase de mise en scène), télégraphié
1,15 s avant l'impact : `nova`, `line`, `quake`, `hex`, `rain`, `summon`.
Pendant la montée, une bande de danger affiche le nom et la consigne ; étourdir
le boss **annule** l'ultime (`Ultime interrompu !`).

## 5. Équipement
- Catalogue de **36 pièces nommées** réparties sur les 4 emplacements.
- Les mythiques existent dans **tous les coloris sauf le rouge** (or, azur, émeraude, pourpre, ivoire, argent, cuivre, jade, saphir, améthyste).
- Le rouge est réservé aux **reliques** (4 pièces ultra puissantes, ×3,2).
- **Chaque objet a un effet unique**, réellement appliqué en combat : vol de vie, énergie d'ultime, exécution, réduction de dégâts, régénération, épines, premier sang… Les pièces communes ont le même effet, en plus discret (×0,3).

## 6. Nettoyage
Suppression du code mort prouvé par analyse des exports (aucune référence dans
le projet) : `CHAPTER1_BG`, `MAX_HERO_LEVEL`, `nextTierLevel`, `NO_GEAR`,
`randInt`. Aucun comportement retiré.

## 7. Cinématique d'invocation refondue
Trois actes : l'autel s'éveille → le seuil s'ouvre (fente de lumière, éclats,
secousse) → la réponse (éclatement, colonne de lumière, flash). La couleur du
rituel dépend de la meilleure rareté tirée.

## 8. Signature par héros (SSR)
Les 17 héros ont leur **signature** : symbole tracé en SVG, geste d'apparition
(slash, sink, burst, bloom, ring, wave, shatter), phrase et son propres.
La scène d'autel est commune, la signature ne l'est pas.

## 9. Bots
**60 faux joueurs** avec pseudo, titre, avatar (portrait de héros) et cadre.
Chacun a une trajectoire, un rythme et des faits marquants.

## 10. Profil
Bouton du bandeau (haut-gauche) → fenêtre complète :
- pseudo modifiable, titre choisi ;
- puissance, niveau, campagne, record de Tour, collection, invocations ;
- équipe affichée ;
- **10 cadres déblocables** (niveau, chapitres, collection, Tour) et 7 titres.
Le cadre choisi s'applique aussi au bandeau.

## 11. Tour de l'Infini
Mode sans énergie, sans fin, sans perte en cas de défaite. Étages générés à la
volée, gardien tous les 5 étages, reine tous les 10. Récompense à la première
victoire seulement. Record personnel sauvegardé.

## 12. Classement mondial
**Les bots et le joueur dans la même liste** (61 lignes), triés par score
(puissance + étage × 260). Le joueur est surligné, et un bouton « Me retrouver »
ramène sur sa ligne.

## 13. Bots vivants
La progression des bots est **cumulative et datée** : chaque jour, chacun gagne
ou ralentit, et certains font des poussées. Une **saison dure 120 jours** : le
classement se rouvre et les écarts se resserrent. Des événements sont générés
chaque jour (SSR invoqué, record d'étage, passage de niveau, guilde).

---

### Vérifications
- `tsc --noEmit` : 0 erreur.
- 11 400 simulations de combat : 0 plantage, 0 NaN, 0 combat sans fin.
- Tests d'interface : profil (10 cadres, 7 titres), classement (61 lignes,
  1 joueur surligné), arène (5 héros, 4 préréglages, 3 capacités), campagne.
- Tour recalibrée : niveau 15 → étage 16, niveau 25 → 21, niveau 35 → 23,
  niveau 50 → 27.
