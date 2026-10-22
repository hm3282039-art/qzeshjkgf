# Faire inspecter un projet déjà commencé (et lourd)

Objectif : me donner accès au **code** sans faire exploser la limite de 128 MB,
et sans perdre l'historique de ton projet existant.

> Le principe : **on ne transfère jamais les assets.** On transfère le code
> (quelques Mo) et on me donne les métadonnées des assets (liste, tailles, formats).

---

## Option A — GitHub, la méthode propre (recommandée)

### A.1 — Si ton projet n'est pas encore sur Git

```bash
cd /chemin/vers/mon-jeu

# 1. Copie le .gitignore de ce repo à la racine de TON projet  <-- ÉTAPE CLÉ
#    (il bloque node_modules, dist, .psd, .blend, .wav, .fbx, .glb...)

# 2. Initialise et commite uniquement le code
git init
git add -A
git commit -m "WIP: état actuel du jeu"

# 3. Vérifie que rien de lourd n'est entré dans l'historique
git count-objects -vH
```

⚠️ **Le `.gitignore` doit être en place AVANT le premier `git add`.**
Un fichier commité puis supprimé reste dans `.git/objects` pour toujours.
Si le `size-pack` dépasse ~80 MB, repars sur un `git init` propre (voir A.4).

### A.2 — Si ton projet est déjà sur Git mais lourd

Regarde d'abord ce qui pèse :

```bash
git count-objects -vH
```

Puis pousse la branche et donne-moi l'URL. **De mon côté je clone en mode
partiel** : je récupère tout le code et je ne télécharge les blobs lourds que
si j'en ai besoin.

```bash
git clone --depth 1 --filter=blob:none --sparse https://github.com/toi/mon-jeu.git
cd mon-jeu
git sparse-checkout set src public index.html package.json
```

C'est exactement la technique pour inspecter un repo de 2 GB sans télécharger 2 GB.

### A.3 — Si le projet est privé

- Compte `hm3282039-art` : je peux tenter directement, l'accès GitHub du sandbox
  est configuré dessus.
- Autre compte : rends le repo **public temporairement**, je clone, tu le repasses
  en privé après. Ou connecte l'app GitHub dans Arena.

### A.4 — Repartir sur un historique propre (si tout est contaminé)

```bash
cd mon-jeu
rm -rf .git                      # supprime UNIQUEMENT l'historique Git (pas tes fichiers)
# remets le .gitignore ici et vérifie son contenu
git init
git add -A
git commit -m "Import propre: code uniquement"
git remote add origin https://github.com/toi/mon-jeu.git
git push -u origin main
```

Si tu tiens à l'historique, garde une copie du dossier `.git` avant de le
supprimer (`mv .git .git.backup`), elle ne sera juste pas poussée.

---

## Option B — Un ZIP du code, envoyé dans le chat

Parfait si tu ne veux pas toucher à GitHub.

```bash
# Génère un zip contenant UNIQUEMENT ce qui est commité
# (donc sans node_modules, dist, assets, grâce au .gitignore)
git archive --format=zip -o code-only.zip HEAD
```

Windows PowerShell, même chose :

```powershell
git archive --format=zip -o code-only.zip HEAD
```

Tu joins `code-only.zip` à ton message. Pour un jeu web, ça fait typiquement
**200 KB à 5 MB** — largement sous la limite.

> ⚠️ N'envoie **pas** un zip de tout le dossier : `node_modules` à lui seul peut
> dépasser 400 MB. Toujours passer par `git archive` ou par une exclusion explicite.

Si tu n'as pas Git, fais un zip manuel en excluant :
`node_modules/`, `dist/`, `build/`, `.git/`, `*.psd`, `*.blend`, `*.wav`, `*.fbx`,
et tout dossier d'assets binaires.

---

## Option C — Pas de transfert : je diagnostique à distance

Tu m'envoies seulement du **texte**, et je te dis où sont les problèmes.

### C.1 — La liste des gros fichiers (le plus utile)

**Windows PowerShell** (à la racine du projet) :

```powershell
Get-ChildItem -Recurse -File |
  Where-Object { $_.Length -gt 1MB } |
  Sort-Object Length -Descending |
  Select-Object -First 40 @{N='MB';E={[math]::Round($_.Length/1MB,1)}}, FullName |
  Format-Table -AutoSize
```

**macOS / Linux** :

```bash
find . \( -path ./node_modules -o -path ./.git \) -prune -o -type f -size +1M \
  -exec du -h {} + | sort -rh | head -40
```

Colle le résultat dans le chat : je vois immédiatement ce qui coûte cher.

### C.2 — L'arborescence

```bash
# macOS / Linux
find . \( -path ./node_modules -o -path ./.git -o -path ./dist \) -prune -o -type f -print | head -200
```

```powershell
# Windows
Get-ChildItem -Recurse -File |
  Where-Object { $_.FullName -notmatch 'node_modules|\.git\\|dist\\' } |
  ForEach-Object { $_.FullName.Replace((Get-Location).Path + '\', '') } |
  Select-Object -First 200
```

### C.3 — Les fichiers qui disent tout

Colle le contenu de : `package.json`, `vite.config.*` (ou équivalent), et le
fichier d'entrée (`main.js`, `index.html`, `game.ts`…).

Avec ça je peux déjà auditer l'architecture, les dépendances mortes, et
l'organisation des assets — sans rien télécharger.

### C.4 — Une capture d'écran

Une image du jeu en cours d'exécution (ou de la console du navigateur) m'aide
beaucoup pour juger du style et repérer les erreurs de chargement.

---

## Ce qu'il ne faut JAMAIS faire

| ❌ | Pourquoi |
| --- | --- |
| `git add .` sans `.gitignore` | `node_modules` + `dist` = 300 MB+ dans l'historique |
| Uploader un export Godot/Unity complet | 20–80 MB pour un seul build, non versionnable utilement |
| Envoyer `.psd`, `.blend`, `.wav` master, `.fbx` | Sources d'édition : 10 à 500 MB, inutiles pour coder |
| Zipper tout le dossier projet | Le zip inclut `node_modules` et `.git` |
| Commit puis `git rm` d'un gros fichier | Il reste dans `.git/objects` — l'historique ne maigrit pas |

---

## Récapitulatif

| Situation | Action |
| --- | --- |
| Le projet est sur GitHub (ou peut l'être) | **Option A** — je clone en mode partiel |
| Pas envie de Git | **Option B** — `git archive` puis zip dans le chat |
| Rapide, juste un avis | **Option C** — liste des gros fichiers + `package.json` |
| Le repo fait déjà 500 MB | **A.4** — historique neuf, code seulement |

Dans tous les cas : **le code voyage, les assets restent sur le CDN.**
