# Dépannage : « le dossier `.git` revient tout le temps »

## Le malentendu de base

Un dépôt Git **ne peut pas exister sans dossier `.git`**. C'est sa mémoire :
l'historique des commits, les branches, la configuration du remote.

```
mon-jeu/
├── .git/          ← OBLIGATOIRE. C'est le cerveau du repo.
├── index.html
└── assets/
```

Donc **si tu supprimes le `.git` de la racine, le dossier n'est plus un dépôt.**
GitHub Desktop te dit alors *« ce dossier n'est pas un dépôt git »* et te propose
de le créer — ce qui **recrée `.git`**. C'est le cycle infini que tu vis.

> ❌ Le `.git` de la racine n'est pas le problème.
> ✅ Le problème, c'est un `.git` **imbriqué plus bas**, dans un sous-dossier.

---

## Les deux `.git` : comment les distinguer

```
mon jeux/                    ← dossier que tu publies
├── .git/                    ✅ NORMAL — c'est le dépôt lui-même
├── index.html
└── assets/
    └── jeu-v2/
        └── .git/            ❌ PROBLÈME — dépôt imbriqué (cloné ou téléchargé)
```

Le second vient d'un template téléchargé, d'un ZIP d'itch.io, ou d'un projet
GitHub récupéré. Git voit ce sous-dossier comme un **sous-module** : il l'affiche
grisé dans GitHub Desktop et **n'envoie pas le contenu**.

C'est exactement le symptôme que tu as : « 0 changed files », puis un repo avec
un seul `.gitattributes`.

---

## La solution définitive : la copie propre

C'est la méthode la plus rapide et elle règle tout d'un coup.

### 1. Fermer GitHub Desktop
Menu **File → Exit** (ou clic sur la croix). Important : ça libère les
verrous de fichiers.

### 2. Créer un dossier neuf, hors OneDrive
```
C:\Dev\mon-jeu-propre
```
Règles : **pas d'espace**, **pas d'accent**, **pas dans OneDrive / Bureau /
Documents synchronisés**. OneDrive peut restaurer des fichiers supprimés —
c'est l'une des causes du `.git` qui « revient ».

### 3. Copier UNIQUEMENT le contenu du jeu
Dans l'Explorateur Windows, va dans ton dossier de jeu et copie **à la main** :

- `index.html`
- `assets/`, `js/`, `css/`, `img/`, `sons/`…
- `package.json` si présent

**Ne copie PAS :**
- `.git/`
- `node_modules/`
- `dist/` ou `build/`

> Si tu ne vois pas les dossiers cachés : onglet **Affichage** →
> coche **« Éléments masqués »**.

### 4. Recréer le repo proprement
1. GitHub Desktop → **File → Add local repository**
2. Choisis `C:\Dev\mon-jeu-propre`
3. *« does not appear to be a Git repository »* → **create a repository**
4. **Create repository**
5. La colonne **Changes** doit maintenant lister tes vrais fichiers ✅
6. Message : `mon jeu` → **Commit to main**
7. **Publish repository** → décoche *Keep this code private*

> Ici c'est **normal** que GitHub Desktop crée un `.git` : c'est le dépôt
> principal, celui de la racine. Il ne gêne pas, il est indispensable.

---

## Vérifier qu'il ne reste aucun `.git` imbriqué

### Windows — PowerShell

Ouvre PowerShell dans le dossier du jeu (clic droit → *Ouvrir PowerShell ici*)
et lance :

```powershell
Get-ChildItem -Recurse -Force -Directory -Filter ".git" |
  Select-Object FullName
```

Résultat attendu : **une seule ligne**, celle de la racine.

```
C:\Dev\mon-jeu-propre\.git          ← OK, c'est le dépôt principal
```

Si tu vois deux lignes ou plus → supprime toutes celles des sous-dossiers :

```powershell
# Supprime tous les .git SAUF celui de la racine
Get-ChildItem -Recurse -Force -Directory -Filter ".git" |
  Where-Object { $_.FullName -ne "C:\Dev\mon-jeu-propre\.git" } |
  ForEach-Object {
    Write-Host "Suppression de $($_.FullName)"
    Remove-Item $_.FullName -Recurse -Force
  }
```

### macOS / Linux

```bash
find . -name .git -type d -prune
```

Puis pour supprimer les imbriqués :

```bash
find . -mindepth 2 -name .git -type d -prune -exec rm -rf {} +
```

---

## Pourquoi le `.git` « revient » — les 4 causes

| Cause | Explication | Fix |
| --- | --- | --- |
| **Recréation du repo** | Tu supprimes le `.git` racine, GitHub Desktop le recrée pour te proposer un dépôt | Ne supprime jamais le `.git` **racine** |
| **OneDrive** | Le dossier est synchronisé ; OneDrive restaure les fichiers supprimés | Déplacer le projet hors OneDrive |
| **Fichiers verrouillés** | GitHub Desktop ouvert → suppression partielle, le dossier se reconstruit | Fermer l'app avant |
| **Copie depuis une source** | Tu recopies le dossier d'origine qui contient encore le `.git` | Copier sans `.git` (méthode ci-dessus) |

---

## Test de vérité

Dans le dossier publié, crée un fichier `test.txt` avec « bonjour ».

- Il apparaît **immédiatement** dans GitHub Desktop → tout fonctionne
- Il n'apparaît pas → GitHub Desktop suit un autre dossier, ou un `.gitignore` bloque

---

## Résumé

```text
❌ Supprimer le .git de la racine  → casse le repo, il sera recréé
✅ Supprimer les .git dans les sous-dossiers → règle le vrai problème
✅ Repartir d'un dossier neuf hors OneDrive → la méthode sans friction
```
