# Construire un gros jeu web avec une limite de ~128 MB

> TL;DR — **Le code est léger, les assets sont lourds.**
> Un jeu complet en Phaser/Three.js fait 1 à 5 MB de code. Le même jeu avec ses
> textures, musiques et modèles 3D non optimisés peut faire 500 MB.
> La règle : *le repo ne contient que du texte (code, config, manifest) et des
> assets optimisés. Tout le reste vit sur un CDN.*

---

## 1. Ce que couvre vraiment la limite

La limite (~128 MB cumulés, ~10 000 fichiers) porte sur les **fichiers du
workspace/repo** à chaque tour, cumulés. Concrètement :

| Ce qui coûte | Ce qui ne coûte quasi rien |
| --- | --- |
| Images, audio, vidéo, 3D, polices | Fichiers `.js`, `.ts`, `.css`, `.html`, `.json`, `.md` |
| `node_modules/`, `dist/`, `build/`, `.cache/` | `package.json`, config, shaders, manifest |
| Sources édition (`.psd`, `.blend`, `.wav`, `.fbx`) | Assets compressés et redimensionnés |
| Plusieurs copies/versions d'un même asset | Un fichier = une seule version finale |

Deux pièges classiques :

1. **Un binaire supprimé reste dans l'historique Git.** Si tu ajoutes 300 MB de
   textures puis que tu les enlèves, elles sont toujours dans `.git/objects`.
   → Vérifier régulièrement : `git count-objects -vH`.
2. **Les dossiers de build.** Un export Godot/Unity ou un `dist/` Vite fait à lui
   seul 20–80 MB. Ils ne doivent **jamais** être commités.

---

## 2. Les 8 règles d'or

### R1 — Séparer le code des assets
Le repo contient le code + un **manifest** décrivant les assets (URL, taille,
hash). Les octets des assets sont ailleurs (objet storage / CDN).

```json
// public/assets/manifest.json  (quelques Ko)
{
  "version": "1.4.0",
  "base": "https://cdn.mon-jeu.fr/v1.4.0/",
  "bundles": {
    "menu":  ["ui/logo.webp", "ui/boutons.webp", "audio/theme.opus"],
    "niveau1": ["tiles/foret.webp", "audio/pluie.opus", "models/arbre.glb"]
  }
}
```

Le loader ne télécharge que le bundle dont il a besoin :

```js
const manifest = await (await fetch('/assets/manifest.json')).json();

export async function loadBundle(name, onProgress = () => {}) {
  const files = manifest.bundles[name] ?? [];
  let done = 0;

  return Promise.all(files.map(async (file) => {
    const url = manifest.base + file + `?v=${manifest.version}`; // cache-busting
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Asset manquant: ${url}`);
    const blob = await res.blob();
    done++;
    onProgress(done / files.length);
    return { file, url: URL.createObjectURL(blob) };
  }));
}

// Usage : écran de chargement du niveau 1 uniquement
await loadBundle('niveau1', p => barre.style.width = `${p * 100}%`);
```

> CORS : le bucket/CDN doit renvoyer `Access-Control-Allow-Origin: *`
> (ou l'origine de ton jeu). Sinon `fetch` échoue, même si l'URL marche dans le
> navigateur.

### R2 — Charger à la demande, jamais tout au démarrage
Découpe en bundles par écran/niveau : `menu`, `tutoriel`, `niveau1…n`.
Objectif de départ : **< 3 MB pour arriver au menu**, < 8 MB par niveau.
Un jeu qui charge 200 MB avant l'écran-titre perd la majorité des joueurs.

### R3 — Formats modernes, systématiquement

| Type | À éviter | À utiliser | Gain typique |
| --- | --- | --- | --- |
| Image / texture | PNG 24 bits, JPEG q90, BMP | **WebP** (ou AVIF), Atlas + trim | 3–10× |
| Texture GPU 3D | PNG décodé en VRAM | **KTX2 / Basis** (reste compressé en VRAM) | 4–6× VRAM |
| Modèle 3D | FBX, OBJ, GLTF non compressé | **GLB + Draco** ou **meshopt** | 5–15× |
| Audio musique | WAV, MP3 320 | **OGG / Opus 96–128 kbps** | 10–20× |
| Audio SFX | WAV | OGG mono, ou **synthèse WebAudio** | ∞ |
| Police | TTF complet | **WOFF2 sous-ensemblé** aux glyphes utilisés | 5× |
| Vidéo | MP4 H.264 1080p | AV1/HEVC, ou **cutscene in-engine** | 2–4× |

Un WAV de 3 minutes en stéréo 44,1 kHz = **~30 MB**. En Opus 96 kbps = **~2 MB**.
Une seule erreur de ce type et tu as mangé un quart du budget.

### R4 — Dimensionner à l'affichage réel
Une texture 4096×4096 affichée en 200 px sur un mobile = 64 MB de VRAM pour rien.
Règle : `taille texture ≈ taille écran max × devicePixelRatio`, pas plus.

### R5 — Procédural quand c'est possible
Canvas 2D, shaders, WebAudio (oscillateurs + bruit), génération de terrain,
palettes de couleurs, animations par code… Tout ça pèse **0 octet de réseau**.
Pour un jeu 2D stylisé, une grosse partie du "art" peut être générée au runtime.

### R6 — Un budget par asset, décidé avant de produire
Exemple de budget pour un jeu 2D :
`menu 2 MB · chaque niveau 6 MB · audio total 15 MB · polices 300 KB`.
Si l'artiste livre 40 MB de PNG, c'est un problème de pipeline, pas de stockage.

### R7 — Sources d'édition hors repo
`.psd`, `.blend`, `.aup`, `.wav` master, `.fbx` : sur ton disque / Drive / NAS.
Le repo ne reçoit que l'export final optimisé (ou juste son URL CDN).

### R8 — Un repo par gros morceau
`jeu-client`, `site-vitrine`, `serveur-api`, `assets-cdn` (ce dernier avec LFS si
vraiment nécessaire). Ça évite qu'une accumulation (maquettes, essais, exports)
ne fasse grossir le repo principal.

---

## 3. Où stocker les assets lourds

| Solution | Coût | Pour qui | Points d'attention |
| --- | --- | --- | --- |
| **Cloudflare R2** + CDN | Free tier généreux, **egress $0** | Le meilleur défaut | Config CORS à faire une fois |
| **Bunny.net Storage** | ~1 €/mois pour 10 GB | EU, très rapide, simple | — |
| **Backblaze B2 + Cloudflare** | Quasi gratuit à petite échelle | Budget serré | Egress via Cloudflare |
| **GitHub Releases** | Gratuit | Prototype, builds de test | Pas un vrai CDN, fichiers immuables, penser au cache |
| **itch.io** | Gratuit | **Distribuer le jeu fini** | Le HTML5 est servi par leur CDN, tu ne paies rien |
| **GitHub Pages** | Gratuit | Site vitrine, petit jeu | ~1 GB de site, bande passante limitée |
| **AWS S3 / GCS** | Payant à l'usage | Prod à volume | Attention à l'egress |

**Recommandation pour toi** : `Cloudflare R2` pour les assets + `itch.io` pour
publier la build jouable. Ton repo reste à quelques Mo pour toujours.

### Et Git LFS ?
LFS déplace les binaires hors de l'historique Git classique, mais :
- les objets LFS vivent quand même dans le workspace (`.git/lfs`) → ça compte ;
- il faut un remote compatible LFS et payer le stockage/bande passante ;
- ça ne remplace pas un CDN pour la prod (pas de cache edge, latence de l'API LFS).

→ Utile pour versionner quelques gros fichiers sources *si* tu y tiens, mais ce
n'est **pas** la solution au problème de taille pour un jeu livré au navigateur.

---

## 4. Cas des moteurs

### Godot (export Web)
Le `.pck` d'un petit jeu fait 10–40 MB. **Ne pas le mettre dans le repo.**
- Build en CI (GitHub Actions) → upload direct sur R2/itch via `butler`.
- Activer la compression Brotli et vérifier la taille de `.wasm` (~10 MB compressé).
- `SharedArrayBuffer` exige des headers COOP/COEP → à configurer sur l'hébergeur.

### Unity WebGL
15–50 MB minimum, souvent plus. Mêmes règles : build hors repo, hébergée sur CDN,
compression Brotli/Gzip + `Content-Encoding` correct côté serveur.

### Phaser / PixiJS / Three.js / Babylon (custom)
Le plus confortable pour la contrainte : tout est du JS, tu contrôles chaque octet.
Three.js + GLB Draco + KTX2 donne des scènes 3D correctes en < 10 MB.

---

## 5. Workflow avec l'agent (moi)

Ce que je fais très bien dans cette limite :
- écrire tout le code du jeu (moteur, scènes, UI, sauvegardes, multijoueur) ;
- générer des assets **petits et optimisés** (icônes, tiles simples, SVG) ;
- écrire les scripts de compression (`sharp`, `gltf-transform`, `ffmpeg`) ;
- écrire le loader, le manifest, la CI de déploiement vers R2/itch.

Ce qu'il ne faut **pas** me demander de stocker ici :
- des packs de textures/modèles lourds, des vidéos, des musiques longues ;
- des exports Godot/Unity complets.

Méthode : tu uploades les gros bundles sur le CDN, tu me donnes l'URL de base du
manifest, et je code contre ces URLs. Le repo ne grossit pas.

### Scripts utiles (à installer quand tu veux)

```bash
# Images : WebP + resize
npx sharp-cli -i "src/**/*.png" -o dist --format webp --quality 85

# 3D : GLB + Draco
npx gltf-transform optimize in.glb out.glb --compress draco --texture-compress webp

# Audio : WAV → Opus
ffmpeg -i theme.wav -c:a libopus -b:a 96k theme.opus

# Vérifier la taille du repo avant de pousser
git count-objects -vH
```

---

## 6. Checklist de démarrage

- [ ] `.gitignore` incluant `node_modules/`, `dist/`, `build/`, `*.psd`, `*.blend`, `*.wav`, `*.fbx`
- [ ] Un bucket R2 (ou équivalent) + CORS réglé
- [ ] Un `manifest.json` versionné + loader par bundle
- [ ] Un budget de taille écrit noir sur blanc (menu / par niveau)
- [ ] Un script `npm run size` qui affiche le poids total des bundles
- [ ] CI qui publie `dist/` + assets vers le CDN (jamais dans Git)
- [ ] Vérif `git count-objects -vH` avant chaque grosse étape
