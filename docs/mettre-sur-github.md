# Mettre ton jeu sur GitHub — pas à pas

Guide complet, de "j'ai un dossier sur mon PC" à "le repo est en ligne".
Fait pour un projet de jeu **déjà commencé et potentiellement lourd**.

---

## ⚠️ Avant tout : l'ordre des opérations

L'ordre compte plus que la vitesse. Si tu te trompes d'ordre, ton repo sera
pollué **définitivement**.

```
1. .gitignore à la racine        ← AVANT tout le reste
2. git init
3. vérifier ce qui va être commité
4. commit
5. créer le repo vide sur GitHub
6. push
```

> **Pourquoi c'est irréversible ?** Git conserve chaque fichier commité dans
> `.git/objects`, même après un `git rm`. Un `node_modules` commité par erreur
> reste dans l'historique pour toujours (il faut réécrire l'historique avec
> `git filter-repo` pour s'en débarrasser).

---

## Étape 0 — Installer Git

**Windows** : https://git-scm.com/download/win → installation par défaut, ça suffit.

**macOS** :
```bash
xcode-select --install          # ou : brew install git
```

**Linux** :
```bash
sudo apt install git            # Debian/Ubuntu
```

Vérification :
```bash
git --version
```

### Alternative sans terminal : GitHub Desktop

Si le terminal te rebute : https://desktop.github.com

GitHub Desktop fait tout ce qui suit en cliquant, gère l'authentification
automatiquement, et **affiche la taille des fichiers avant chaque commit** —
très pratique pour un projet de jeu. Le guide terminal reste valable, mais tu
peux sauter l'étape 3 (authentification).

---

## Étape 1 — Le `.gitignore` (l'étape qui sauve ton repo)

À la **racine de ton projet de jeu** :

```bash
cd /chemin/vers/mon-jeu
```

Copie le `.gitignore` fourni dans ce repo (`qzeshjkgf/.gitignore`) à la racine
de ton projet. Il exclut déjà : `node_modules/`, `dist/`, `build/`, `.env`,
`*.psd`, `*.blend`, `*.wav`, `*.fbx`, `*.glb`, `*.pck`, `*.wasm`, etc.

**Vérifie qu'il est bien pris en compte** — cette commande doit lister peu de
choses (du code, de la config, des petits assets) :

```bash
git init                # si pas encore fait
git add -A --dry-run    # simulation, ne commite rien
```

Si tu vois `node_modules/`, `dist/` ou des `.wav` dans la sortie → ton
`.gitignore` n'est pas au bon endroit ou mal écrit. Corrige **avant** de continuer.

### Ajuster le `.gitignore` à ton projet

Ouvre-le et adapte :

| Ton projet | Ajoute |
| --- | --- |
| Vite / React / Vue | déjà couvert (`node_modules/`, `dist/`) |
| Godot | `.godot/`, `export/`, `*.import` |
| Unity | `[Ll]ibrary/`, `[Tt]emp/`, `[Bb]uild/`, `*.csproj` |
| Phaser avec bundler | déjà couvert |
| Assets dans `assets/` | `assets/` si servis par CDN, ou garde seulement les petits |

---

## Étape 2 — Créer le repo GitHub (vide !)

1. Va sur https://github.com/new
2. **Repository name** : `mon-jeu` (minuscules, tirets)
3. **Public** ou **Private** — peu importe, les deux marchent
4. ❌ **NE COCHE RIEN** :
   - pas de "Add a README file"
   - pas de "Add .gitignore"
   - pas de "Choose a license"
5. Clique **Create repository**

> **Pourquoi vide ?** Si GitHub crée un README, tu auras un commit que tu n'as
> pas en local, et ton premier `git push` sera rejeté (`non-fast-forward`).
> C'est l'erreur n°1 des débutants. Repo vide = push direct.

Tu arrives sur une page qui affiche des commandes. Garde l'URL :
`https://github.com/TON_COMPTE/mon-jeu.git`

---

## Étape 3 — Authentification

GitHub n'accepte plus le mot de passe du compte depuis 2021. Trois solutions.

### Option 1 — Git Credential Manager (le plus simple)

Sur Windows, il est **déjà installé** avec Git. Au premier `git push`, une
fenêtre s'ouvre dans le navigateur : tu te connectes, c'est fini.

Sur macOS, Git utilise le trousseau Keychain — même principe.

**C'est la voie recommandée : tu ne gères aucun token.**

### Option 2 — Personal Access Token (PAT)

Si on te demande un mot de passe en ligne de commande :

1. https://github.com/settings/tokens → **Generate new token (classic)**
2. Note : `mon-jeu-cli`
3. Expiration : 90 jours
4. Coche la case **`repo`** (obligatoire pour un repo privé)
5. Génère, puis **copie le token** (affiché une seule fois, il commence par `ghp_`)
6. Au `git push`, quand Git demande :
   - `Username:` → ton pseudo GitHub
   - `Password:` → **colle le token**, pas ton mot de passe

Pour ne pas le retaper :
```bash
git config --global credential.helper store    # stocke en clair dans ~/.git-credentials
```
Sur macOS : `git config --global credential.helper osxkeychain`

> 🔒 **Ne colle jamais ton token dans le chat, dans un fichier du repo, ou dans un
> screenshot.** Si ça arrive : révoque-le immédiatement sur la page des tokens.

### Option 3 — Clé SSH

```bash
ssh-keygen -t ed25519 -C "ton-email@exemple.com"     # Entrée, Entrée, Entrée
cat ~/.ssh/id_ed25519.pub                             # copie le contenu
```
Colle-la sur https://github.com/settings/keys → **New SSH key**.
Puis utilise l'URL SSH : `git@github.com:TON_COMPTE/mon-jeu.git`

---

## Étape 4 — Commit et push

Depuis la racine de ton projet :

```bash
# 1. Initialiser (si pas déjà fait)
git init

# 2. Se présenter (une seule fois)
git config user.name "Ton Nom"
git config user.email "ton-email@exemple.com"

# 3. Indexer tout ce que le .gitignore autorise
git add -A

# 4. VÉRIFIER — l'étape que tout le monde saute
git status
node scripts/check-taille.mjs --staged     # si tu as copié le script ici

# 5. Commiter
git commit -m "WIP: état actuel du jeu"

# 6. Nommer la branche main
git branch -M main

# 7. Relier au repo GitHub
git remote add origin https://github.com/TON_COMPTE/mon-jeu.git

# 8. Pousser
git push -u origin main
```

Après le point 4, tu dois voir **des dizaines de fichiers, pas des milliers**.
Si `git status` affiche 3 000 fichiers, c'est que `node_modules` est passé.

---

## Étape 5 — Vérifier que c'est propre

```bash
git count-objects -vH
```

Regarde `size-pack` :

| Taille | Verdict |
| --- | --- |
| < 20 MB | ✅ parfait |
| 20–80 MB | 🟡 acceptable, à surveiller |
| 80–128 MB | 🟠 il faut optimiser maintenant |
| > 128 MB | ❌ il faut nettoyer l'historique |

Sur GitHub, la page du repo affiche aussi la taille réelle utilisée
(Settings → General, ou l'API `/repos/{owner}/{repo}`).

---

## Les limites GitHub à connaître

| Limite | Valeur | Conséquence |
| --- | --- | --- |
| Fichier individuel | **100 MB** | Push **refusé** |
| Fichier individuel | **50 MB** | Avertissement à chaque push |
| Taille repo recommandée | **< 1 GB** | Ralentissements |
| Taille d'un push | **2 GB** | Push refusé |
| Fichier dans l'interface web | 25 MB | Upload web bloqué |

Ces limites sont **indépendantes** de la limite de 128 MB de cet espace de
travail — mais les deux pointent dans la même direction : **ne mets pas de
binaires lourds dans Git.**

---

## Dépannage

### `remote origin already exists`
```bash
git remote set-url origin https://github.com/TON_COMPTE/mon-jeu.git
```

### `rejected — non-fast-forward`
Le repo GitHub n'est pas vide (un README a été coché).
```bash
# Option A : récupérer son commit et le fusionner
git pull origin main --allow-unrelated-histories
git push -u origin main

# Option B : l'écraser (destructif, repo neuf uniquement)
git push -u origin main --force
```

### `repository not found`
- URL mal orthographiée (vérifie le compte et le nom)
- Repo privé sans authentification → refais l'étape 3
- Token expiré → régénère-le

### `File xxx is 143.2 MB; this exceeds GitHub's file size limit of 100 MB`
Un fichier trop gros est dans ton commit. Retire-le :
```bash
git rm --cached chemin/du/fichier.glb
echo "chemin/du/fichier.glb" >> .gitignore
git commit --amend --no-edit
```
⚠️ Ça ne marche que si le fichier n'a **jamais** été poussé. S'il est déjà sur
GitHub, il faut réécrire l'historique (§ ci-dessous).

### `fatal: not a git repository`
Tu n'es pas dans le bon dossier, ou `git init` n'a pas été fait.

### Le repo est déjà trop lourd — repartir propre

```bash
cd mon-jeu
mv .git .git.backup        # garde une sauvegarde de l'historique
# vérifie que .gitignore est bien à la racine
git init
git add -A
node scripts/check-taille.mjs --staged
git commit -m "Import propre: code uniquement"
git branch -M main
git remote add origin https://github.com/TON_COMPTE/mon-jeu.git
git push -u origin main
```

Si le repo distant est déjà pollué, il faut soit le supprimer, soit réécrire
l'historique avec `git filter-repo` (avancé, fais une sauvegarde avant).

---

## Et après ?

Une fois le repo en ligne :

1. **Envoie-moi l'URL** → je clone en mode partiel et j'inspecte tout le code
   sans télécharger les assets.
2. **Mets en place le CDN** pour les assets (`docs/strategie-128mb.md`, §3).
3. **Ajoute le garde-fou** en hook pre-commit :

```bash
cat > .git/hooks/pre-commit << 'EOF'
#!/bin/sh
node scripts/check-taille.mjs --staged || {
  echo "Commit bloqué : fichiers trop lourds."
  exit 1
}
EOF
chmod +x .git/hooks/pre-commit
```

Désormais, impossible de commiter accidentellement un asset de 200 MB.

---

## Résumé express

```bash
# Dans ton dossier de jeu
# 0. copier .gitignore ici
git init
git add -A
git status                              # doit lister des dizaines, pas des milliers
git commit -m "WIP: état actuel du jeu"
git branch -M main
git remote add origin https://github.com/TON_COMPTE/mon-jeu.git
git push -u origin main
```

Puis : `git count-objects -vH` → et tu m'envoies l'URL.
