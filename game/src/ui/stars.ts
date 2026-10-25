import { MAX_STARS } from '../data/heroes';

/**
 * Étoiles d'un héros : 5 emplacements dorés (remplis jusqu'au rang atteint),
 * puis les étoiles ROUGES du Sanctuaire, affichées en losanges cramoisis.
 * Exemple : 4★ + 2✦ → ★★★★☆ ✦✦
 */
export function starsHTML(stars: number, cls = '', red = 0): string {
  const s = Math.max(0, Math.min(MAX_STARS, stars));
  const r = Math.max(0, Math.min(6, red));
  const out: string[] = [];
  for (let i = 0; i < MAX_STARS; i++) {
    out.push(`<i class="st ${i < s ? 'g' : 'e'}">★</i>`);
  }
  for (let i = 0; i < r; i++) out.push('<i class="st r">✦</i>');
  const title = `${s} étoile${s > 1 ? 's' : ''}${r ? ` · ${r} étoile${r > 1 ? 's' : ''} rouge${r > 1 ? 's' : ''}` : ''}`;
  return `<span class="stars ${cls}" title="${title}">${out.join('')}</span>`;
}
