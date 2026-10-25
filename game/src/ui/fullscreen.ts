/**
 * Plein écran.
 *
 * Trois façons de basculer :
 *  - le bouton dans les paramètres,
 *  - la touche Entrée,
 *  - un double-clic n'importe où sur le jeu.
 *
 * On met en plein écran `document.documentElement` (et non le canvas) : le
 * navigateur redimensionne alors la fenêtre, ce qui déclenche déjà le
 * redimensionnement du canvas et le recalcul de la caméra dans `Game.ts`.
 */

let hooked = false;

export function isFullscreen(): boolean {
  const d = document as Document & { webkitFullscreenElement?: Element };
  return !!(document.fullscreenElement ?? d.webkitFullscreenElement);
}

export function canFullscreen(): boolean {
  const el = document.documentElement as HTMLElement & { webkitRequestFullscreen?: () => Promise<void> | void };
  return !!(el.requestFullscreen || el.webkitRequestFullscreen);
}

export async function toggleFullscreen(): Promise<boolean> {
  const doc = document as Document & { webkitExitFullscreen?: () => Promise<void> | void };
  const el = document.documentElement as HTMLElement & { webkitRequestFullscreen?: () => Promise<void> | void };

  try {
    if (isFullscreen()) {
      if (doc.exitFullscreen) await doc.exitFullscreen();
      else await doc.webkitExitFullscreen?.();
      return false;
    }
    if (el.requestFullscreen) await el.requestFullscreen({ navigationUI: 'hide' });
    else await el.webkitRequestFullscreen?.();
    return true;
  } catch {
    // Certains navigateurs refusent hors d'un geste utilisateur ou dans une iframe.
    return isFullscreen();
  }
}

/** Vrai si le jeu tourne dans une iframe (aperçu intégré) : le plein écran y est souvent bloqué. */
export function inIframe(): boolean {
  try {
    return window.self !== window.top;
  } catch {
    return true;
  }
}

/**
 * Installe les raccourcis globaux (une seule fois).
 * `onChange` est appelé après chaque bascule pour mettre l'interface à jour.
 */
export function hookFullscreen(onChange: (active: boolean) => void): void {
  if (hooked) return;
  hooked = true;

  document.addEventListener('fullscreenchange', () => onChange(isFullscreen()));

  // Touche Entrée
  window.addEventListener('keydown', (e) => {
    if (e.key !== 'Enter' || e.repeat) return;
    const t = e.target;
    if (t instanceof HTMLInputElement || t instanceof HTMLButtonElement) return;
    void toggleFullscreen().then(onChange);
  });

  // Double-clic sur le jeu (pas sur l'interface)
  window.addEventListener('dblclick', (e) => {
    const t = e.target as HTMLElement | null;
    if (t && t.closest('#ui .modal, #ui .topbar, #ui button, #ui input')) return;
    void toggleFullscreen().then(onChange);
  });
}
