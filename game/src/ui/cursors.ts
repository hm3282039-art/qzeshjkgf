/** Curseurs dorés « fantasy » en SVG (aucune image externe). */
const arrow = (c1: string, c2: string, c3: string, glow: string): string => {
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='32' height='32' viewBox='0 0 32 32'>
<defs><linearGradient id='g' x1='0' y1='0' x2='1' y2='1'><stop offset='0' stop-color='${c1}'/><stop offset='.55' stop-color='${c2}'/><stop offset='1' stop-color='${c3}'/></linearGradient>
<filter id='f' x='-50%' y='-50%' width='200%' height='200%'><feGaussianBlur stdDeviation='1.2'/></filter></defs>
<path d='M3 2 L3 24 L9 18.5 L13.5 28 L17.5 26.2 L13 17 L21 17 Z' fill='${glow}' filter='url(#f)' opacity='.8'/>
<path d='M3 2 L3 24 L9 18.5 L13.5 28 L17.5 26.2 L13 17 L21 17 Z' fill='url(#g)' stroke='#140904' stroke-width='1.5' stroke-linejoin='round'/>
<path d='M5.4 6.6 L5.4 19 L9.4 15.6' fill='none' stroke='#fffbe8' stroke-width='1' opacity='.75'/></svg>`;
  return `url("data:image/svg+xml,${encodeURIComponent(svg)}") 3 2`;
};

export const CURSORS = {
  default: `${arrow('#fff3c9', '#d8b45a', '#7a5418', '#000')}, auto`,
  pointer: `${arrow('#ffe0e6', '#ff4d6d', '#7a0a20', '#ff2a50')}, pointer`,
};

export function applyCursors(): void {
  const root = document.documentElement.style;
  root.setProperty('--cursor-default', CURSORS.default);
  root.setProperty('--cursor-pointer', CURSORS.pointer);
}
