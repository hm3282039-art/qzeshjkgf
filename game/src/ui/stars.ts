import { MAX_STARS } from '../data/heroes';

/**
 * Étoiles d'un héros (toujours 5 icônes) : de 1 à 5 étoiles dorées, puis de 6 à 10
 * les étoiles violettes remplacent les dorées une à une (façon gacha).
 */
export function starsHTML(stars: number, cls = ''): string {
  const s = Math.max(0, Math.min(MAX_STARS, stars));
  const purple = Math.max(0, s - 5);
  const gold = Math.min(5, s) - purple;
  const out: string[] = [];
  for (let i = 0; i < 5; i++) {
    const kind = i < purple ? 'p' : i < purple + gold ? 'g' : 'e';
    out.push(`<i class="st ${kind}">★</i>`);
  }
  return `<span class="stars ${cls}" title="${s} étoile${s > 1 ? 's' : ''}">${out.join('')}</span>`;
}
