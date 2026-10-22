/**
 * Icônes vectorielles (SVG 24×24) dessinées pour le jeu.
 * Elles utilisent `currentColor` → leur couleur suit le CSS.
 */
const P = {
  swords: '<path d="M14.5 17.5 3 6V3h3l11.5 11.5"/><path d="m13 19 6-6"/><path d="m16 16 4 4"/><path d="m19 21 2-2"/><path d="M14.5 6.5 18 3h3v3l-3.5 3.5"/><path d="m5 14 4 4"/><path d="m7 17-3 3"/><path d="m3 19 2 2"/>',
  helmet: '<path d="M4 14a8 8 0 0 1 16 0v5h-5v-4h-6v4H4z"/><path d="M12 6V3"/><path d="M9 15V10h6v5"/><path d="M12 10v5"/>',
  castle: '<path d="M3 21V9h3V6h3v3h2V5h2v4h2V6h3v3h3v12z"/><path d="M10 21v-4a2 2 0 0 1 4 0v4"/><path d="M6 13h2M16 13h2"/><path d="M12 5V2l3 1.5L12 5"/>',
  bag: '<path d="M6 8h12l1.5 12.5a1 1 0 0 1-1 1.5h-13a1 1 0 0 1-1-1.5z"/><path d="M9 8V6a3 3 0 0 1 6 0v2"/><path d="M9 13h6"/>',
  banner: '<path d="M5 2v20"/><path d="M5 3h14l-3 5 3 5H5"/><circle cx="11" cy="8" r="1.6"/>',
  mail: '<rect x="3" y="5" width="18" height="14" rx="1.5"/><path d="m3 7 9 6 9-6"/>',
  gear: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/>',
  scroll: '<path d="M8 21h11a2 2 0 0 0 2-2v-1H10v1a2 2 0 0 1-4 0V5a2 2 0 0 0-2-2"/><path d="M4 3h12a2 2 0 0 1 2 2v13"/><path d="M10 8h5M10 12h5"/>',
  star: '<path d="m12 2 3 6.5 7 .9-5.1 4.9 1.3 7L12 18l-6.2 3.3 1.3-7L2 9.4l7-.9z"/>',
  trophy: '<path d="M8 21h8M12 17v4"/><path d="M7 4h10v5a5 5 0 0 1-10 0z"/><path d="M17 5h3v2a3 3 0 0 1-3 3M7 5H4v2a3 3 0 0 0 3 3"/>',
  shop: '<path d="M3 9 5 3h14l2 6"/><path d="M3 9a3 3 0 0 0 6 0 3 3 0 0 0 6 0 3 3 0 0 0 6 0"/><path d="M5 11v10h14V11"/><path d="M10 21v-5h4v5"/>',
  gift: '<rect x="3" y="8" width="18" height="5" rx="1"/><path d="M5 13v8h14v-8M12 8v13"/><path d="M12 8S10.5 3 8 3a2.5 2.5 0 0 0 0 5M12 8s1.5-5 4-5a2.5 2.5 0 0 1 0 5"/>',
  medal: '<circle cx="12" cy="15" r="6"/><path d="m8.5 10-3-8h4l2.5 5M15.5 10l3-8h-4L12 7"/><path d="m12 12 1 2h2l-1.5 1.4.5 2.1-2-1.1-2 1.1.5-2.1L9 14h2z"/>',
  book: '<path d="M4 19.5V5a2 2 0 0 1 2-2h14v16H6a2 2 0 0 0-2 2 2 2 0 0 0 2 2h14"/><path d="M12 7l1.2 2.4 2.6.4-1.9 1.8.5 2.6L12 13l-2.4 1.2.5-2.6-1.9-1.8 2.6-.4z"/>',
  coin: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5.5"/><path d="M12 9v6"/>',
  gem: '<path d="M6 3h12l4 6-10 12L2 9z"/><path d="M2 9h20M12 21 8 9l4-6 4 6z"/>',
  bolt: '<path d="M13 2 4 14h7l-1 8 9-12h-7z"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  chat: '<path d="M21 12a8 8 0 0 1-11.6 7.1L3 21l1.9-6.4A8 8 0 1 1 21 12z"/><path d="M8 11h8M8 14h5"/>',
  portal: '<path d="M5 21V10a7 7 0 0 1 14 0v11"/><path d="M3 21h18"/><path d="M12 9a3 3 0 1 0 3 3 4.5 4.5 0 0 0-4.5-4.5A6 6 0 0 0 4.5 13"/>',
  tower: '<path d="M12 2 10 7h4z"/><path d="M9 7h6v14H9z"/><path d="M7 21h10"/><ellipse cx="12" cy="10" rx="6" ry="1.6"/><path d="M11 13h2M11 17h2"/>',
  crystal: '<path d="M12 2 7 9l5 13 5-13z"/><path d="M7 9h10M12 2v20"/><path d="M3 6l1.5 1M21 6l-1.5 1M3 16l1.5-1M21 16l-1.5-1"/>',
  tavern: '<path d="M5 8h10v11a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2z"/><path d="M15 10h2a2 2 0 0 1 2 2v2a2 2 0 0 1-2 2h-2"/><path d="M5 8a2.5 2.5 0 0 1 2.5-3 3 3 0 0 1 5 0A2.5 2.5 0 0 1 15 8"/><path d="M8.5 12v6M11.5 12v6"/>',
  anvil: '<path d="M3 7h14c0 3-2 5-5 5H9"/><path d="M17 7h4l-1 2h-3"/><path d="M9 12v3M14 12v3"/><path d="M7 15h10l2 5H5z"/>',
  church: '<path d="M12 2v4M10 4h4"/><path d="m12 6 5 5v10H7V11z"/><path d="M3 21h18M7 14H4v7M17 14h3v7"/><path d="M10 21v-4a2 2 0 0 1 4 0v4"/><circle cx="12" cy="11.5" r="1.4"/>',
  close: '<path d="M18 6 6 18M6 6l12 12"/>',
  map: '<path d="m9 4-6 2v14l6-2 6 2 6-2V4l-6 2z"/><path d="M9 4v14M15 6v14"/>',
  skull: '<path d="M12 3a8 8 0 0 0-5 14.2V20h10v-2.8A8 8 0 0 0 12 3z"/><circle cx="9" cy="12" r="1.6"/><circle cx="15" cy="12" r="1.6"/><path d="M10 20v-2M14 20v-2M12 15.5l-.8 1.3h1.6z"/>',
  lock: '<rect x="5" y="11" width="14" height="10" rx="1.5"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/><circle cx="12" cy="16" r="1.3"/>',
  refresh: '<path d="M3 12a9 9 0 0 1 15.5-6.2L21 8"/><path d="M21 3v5h-5"/><path d="M21 12a9 9 0 0 1-15.5 6.2L3 16"/><path d="M3 21v-5h5"/>',
  volume: '<path d="M4 9h4l5-4v14l-5-4H4z"/><path d="M16.5 8.5a5 5 0 0 1 0 7M19 6a8.5 8.5 0 0 1 0 12"/>',
  mute: '<path d="M4 9h4l5-4v14l-5-4H4z"/><path d="m17 9 5 6M22 9l-5 6"/>',
  shield: '<path d="M12 2 4 5v6c0 5 3.5 9 8 11 4.5-2 8-6 8-11V5z"/><path d="M12 7v10M8 11h8"/>',
  flame: '<path d="M12 22c4 0 7-3 7-7 0-4-3-6-4-10-2 2-2 4-2 5-1-2-3-4-3-7-3 3-5 7-5 12 0 4 3 7 7 7z"/><path d="M12 22a3 3 0 0 1-3-3c0-2 2-3 3-5 1 2 3 3 3 5a3 3 0 0 1-3 3z"/>',
  moon: '<path d="M20 14.5A8.5 8.5 0 0 1 9.5 4a8.5 8.5 0 1 0 10.5 10.5z"/><path d="M17 3v3M15.5 4.5h3"/>',
  drop: '<path d="M12 2s7 7.5 7 12.5a7 7 0 0 1-14 0C5 9.5 12 2 12 2z"/><path d="M9 15a3 3 0 0 0 3 3"/>',
  arrow: '<path d="M3 21 21 3"/><path d="M14 3h7v7"/><path d="M3 21l2-6M3 21l6-2"/>',
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M4.9 19.1 7 17M17 7l2.1-2.1"/>',
  heart: '<path d="M12 21s-8-5-8-11a4.5 4.5 0 0 1 8-3 4.5 4.5 0 0 1 8 3c0 6-8 11-8 11z"/><path d="M12 9v6M9 12h6"/>',
  pause: '<path d="M8 5v14M16 5v14"/>',
  play: '<path d="M7 4l13 8-13 8z"/>',
  fast: '<path d="M3 5l8 7-8 7zM12 5l8 7-8 7z"/>',
  auto: '<path d="M4 12a8 8 0 0 1 14-5.3L20 9"/><path d="M20 4v5h-5"/><path d="M20 12a8 8 0 0 1-14 5.3L4 15"/><path d="M4 20v-5h5"/><path d="M10 9.5l4 2.5-4 2.5z"/>',
  crown: '<path d="M3 8l4.5 4L12 5l4.5 7L21 8l-2 11H5z"/><path d="M5 19h14"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  back: '<path d="M15 5l-7 7 7 7"/>',
  snow: '<path d="M12 2v20M3.3 7l17.4 10M3.3 17 20.7 7"/><path d="m9 3.5 3 2 3-2M9 20.5l3-2 3 2M4 10.5l2.6-1.3L6.4 6M20 13.5l-2.6 1.3.2 3.2M4 13.5l2.6 1.3-.2 3.2M20 10.5l-2.6-1.3.2-3.2"/>',
  vortex: '<path d="M12 12a1.5 1.5 0 1 1 1.5-1.5"/><path d="M13.5 10.5A4 4 0 1 1 9 7"/><path d="M9 7a7 7 0 1 1-5.5 6"/><path d="M3.5 13A9.5 9.5 0 0 1 12 2.5"/>',
  feather: '<path d="M20 4C12 4 6 10 6 18l-2 2"/><path d="M20 4c0 8-6 13-14 14"/><path d="M6 18 15 9"/><path d="M10 14h5M13 10h4"/>',
  expand: '<path d="M4 9V4h5"/><path d="M20 9V4h-5"/><path d="M4 15v5h5"/><path d="M20 15v5h-5"/>',
} as const;

export type IconName = keyof typeof P;

export function icon(name: IconName, cls = ''): string {
  return `<svg class="ico ${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${P[name]}</svg>`;
}
