#!/usr/bin/env bash
# =====================================================================
#  deploy.sh — reconstruit le jeu et le publie sur GitHub Pages
#
#  Usage :  ./deploy.sh "message de mise à jour"
#
#  Ce script :
#   1. compile le jeu (tsc + vite build → un seul index.html)
#   2. pousse ce fichier sur la branche gh-pages
#   3. GitHub Pages le sert en 1 à 2 minutes
#
#  Adresse du jeu : https://hm3282039-art.github.io/qzeshjkgf/
# =====================================================================
set -euo pipefail

REPO="https://github.com/hm3282039-art/qzeshjkgf.git"
MSG="${1:-mise a jour du jeu}"
HERE="$(cd "$(dirname "$0")" && pwd)"
GAME="$HERE/game"

echo "▸ 1/4  Vérification TypeScript…"
cd "$GAME"
npx tsc --noEmit

echo "▸ 2/4  Compilation…"
npm run build

if [ ! -f "$GAME/dist/index.html" ]; then
  echo "✗ Le build n'a pas produit dist/index.html" >&2
  exit 1
fi

SIZE=$(du -h "$GAME/dist/index.html" | cut -f1)
echo "    ✓ dist/index.html ($SIZE)"

echo "▸ 3/4  Préparation de la branche gh-pages…"
TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT
cp "$GAME/dist/index.html" "$TMP/index.html"
cd "$TMP"
git init -q
git config user.name "hm3282039-art"
git config user.email "hm3282039-art@users.noreply.github.com"
git checkout -q -b gh-pages
git add index.html
git commit -q -m "$MSG"
git remote add origin "$REPO"

echo "▸ 4/4  Publication…"
git push -f -q origin gh-pages

echo ""
echo "✅ Publié : https://hm3282039-art.github.io/qzeshjkgf/"
echo "   (GitHub Pages met 1 à 2 minutes à reconstruire — Ctrl+F5 pour forcer)"
