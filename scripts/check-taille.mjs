#!/usr/bin/env node
/**
 * check-taille.mjs — garde-fou avant de pousser sur GitHub.
 *
 * Détecte les fichiers qui vont faire exploser ton repo :
 *   > 1 MB    → avertissement (à optimiser ou sortir vers le CDN)
 *   > 50 MB   → GitHub prévient, ne pousse pas tel quel
 *   > 100 MB  → GitHub REFUSE le push
 *
 * Usage :
 *   node scripts/check-taille.mjs           # fichiers suivis par Git
 *   node scripts/check-taille.mjs --staged  # uniquement ce qui est dans le prochain commit
 *   node scripts/check-taille.mjs --all     # tout le dossier (hors .git/node_modules)
 */

import { execFileSync } from 'node:child_process';
import { readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

const MB = 1024 * 1024;
const WARN = 1 * MB;
const HARD = 50 * MB;
const BLOCK = 100 * MB;

const IGNORE_DIRS = new Set([
  '.git', 'node_modules', 'dist', 'build', 'out', '.next', '.nuxt',
  '.cache', '.turbo', '.vite', 'coverage', '.svelte-kit',
]);

const args = new Set(process.argv.slice(2));

function walk(dir, root, acc = []) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === '.git') continue;
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      if (IGNORE_DIRS.has(entry.name)) continue;
      walk(full, root, acc);
    } else if (entry.isFile()) {
      acc.push({ path: relative(root, full), size: statSync(full).size });
    }
  }
  return acc;
}

function gitFiles(extra = []) {
  const out = execFileSync('git', ['ls-files', '-z', ...extra], {
    encoding: 'utf8',
    maxBuffer: 64 * MB,
  });
  return out
    .split('\0')
    .filter(Boolean)
    .map((p) => {
      try {
        return { path: p, size: statSync(p).size };
      } catch {
        return null; // fichier supprimé mais encore indexé
      }
    })
    .filter(Boolean);
}

function human(bytes) {
  if (bytes >= MB) return `${(bytes / MB).toFixed(1)} MB`;
  if (bytes >= 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${bytes} B`;
}

// --- Collecte ---
let files;
let label;

if (args.has('--all')) {
  files = walk('.', '.');
  label = 'tout le dossier';
} else if (args.has('--staged')) {
  files = gitFiles(['--cached']);
  label = 'prochain commit (fichiers indexés)';
} else {
  files = gitFiles();
  label = 'fichiers suivis par Git';
}

if (files.length === 0) {
  console.log('ℹ️  Aucun fichier à analyser.');
  process.exit(0);
}

// --- Analyse ---
files.sort((a, b) => b.size - a.size);

const blocked = files.filter((f) => f.size >= BLOCK);
const hard = files.filter((f) => f.size >= HARD && f.size < BLOCK);
const warn = files.filter((f) => f.size >= WARN && f.size < HARD);
const total = files.reduce((s, f) => s + f.size, 0);

console.log(`\n📦 Analyse : ${label} — ${files.length} fichiers pour ${human(total)}\n`);

const print = (list, icon, title) => {
  if (list.length === 0) return;
  console.log(`${icon} ${title}`);
  for (const f of list.slice(0, 20)) {
    console.log(`   ${human(f.size).padStart(9)}  ${f.path}`);
  }
  if (list.length > 20) console.log(`   … et ${list.length - 20} autres`);
  console.log('');
};

print(blocked, '🚫', 'REFUSÉS par GitHub (>= 100 MB) — à retirer et uploader sur le CDN');
print(hard, '⛔', 'TROP LOURDS (>= 50 MB) — GitHub avertit, ne pousse pas tel quel');
print(warn, '⚠️ ', 'À optimiser (> 1 MB) — WebP/Opus/GLB, ou CDN');

// Top 5 toujours affiché
console.log('🏆 Les 5 plus gros fichiers :');
for (const f of files.slice(0, 5)) {
  console.log(`   ${human(f.size).padStart(9)}  ${f.path}`);
}
console.log('');

// --- Verdict ---
const LIMIT = 128 * MB;
let exitCode = 0;

if (blocked.length > 0) {
  console.log('❌ Push impossible : des fichiers dépassent 100 MB.');
  console.log('   → Sors-les du repo (git rm --cached) et mets-les sur un CDN.');
  exitCode = 1;
} else if (hard.length > 0) {
  console.log('❌ Trop de poids : des fichiers dépassent 50 MB.');
  console.log('   → Optimise (WebP/Opus/Draco) ou déplace-les sur le CDN.');
  exitCode = 1;
} else if (total > LIMIT) {
  console.log(`❌ Total ${human(total)} : au-delà du budget de 128 MB.`);
  exitCode = 1;
} else if (total > LIMIT * 0.5) {
  console.log(`⚠️  Total ${human(total)} : tu approches du budget de 128 MB.`);
  console.log(`   Marge restante : ${human(LIMIT - total)}`);
} else {
  console.log(`✅ OK — ${human(total)} sur un budget de 128 MB (${human(LIMIT - total)} de marge).`);
  console.log('   Push autorisé.');
}

console.log('');
process.exit(exitCode);
