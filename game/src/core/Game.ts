import { Application, Container } from 'pixi.js';
import { cullInvisible, PerfMonitor } from './perf';
import { WORLD } from '../config';
import { Emitter } from '../utils/Emitter';
import { damp } from '../utils/math';

export interface Viewport {
  /** Échelle écran ← monde. */
  scale: number;
  /** Taille visible, en pixels monde. */
  width: number;
  height: number;
  /** Décalage vertical de la vue (si l'écran est très large). */
  offsetY: number;
  screenWidth: number;
  screenHeight: number;
}

/**
 * Enveloppe l'application Pixi : rendu, redimensionnement, boucle de jeu
 * et position (lissée) de la souris pour le parallaxe.
 */
/** Budget de pixels réellement calculés par niveau de qualité (au-delà, l'image est agrandie par le navigateur). */
export type RenderQuality = 'ultra' | 'high' | 'low';
const PIXEL_BUDGET: Record<RenderQuality, number> = {
  ultra: Infinity, // résolution native de l'écran (jusqu'à ×2)
  high: 2560 * 1440, // net jusqu'en 1440p ; un écran 4K affiche une image 1440p agrandie
  low: 1600 * 900,
};

export class Game extends Emitter<{ resize: Viewport; update: number; resolution: number }> {
  readonly app = new Application();
  /** Conteneur racine mis à l'échelle : tout ce qu'il contient est en pixels monde. */
  readonly root = new Container();
  readonly viewport: Viewport = { scale: 1, width: WORLD.width, height: WORLD.height, offsetY: 0, screenWidth: 1, screenHeight: 1 };
  /** Souris normalisée (-1…1), lissée. */
  readonly mouse = { x: 0, y: 0, targetX: 0, targetY: 0 };
  /** Résolution de rendu actuelle (pixels réels par pixel CSS). */
  resolution = 1;
  private quality: RenderQuality = 'high';
  /** Mesure des images et adaptation automatique de la résolution (en combat). */
  readonly perf = new PerfMonitor(() => this.applyResolution());
  /** Vrai pendant les phases où l'adaptation automatique est autorisée. */
  adaptive = false;

  async init(host: HTMLElement): Promise<void> {
    await this.app.init({
      resizeTo: window,
      background: 0x07050f,
      // Pas de MSAA : tout est fait de textures déjà lissées, et la scène passe par des filtres (sans MSAA).
      antialias: false,
      autoDensity: true,
      resolution: this.targetResolution(),
      powerPreference: 'high-performance',
    });
    host.appendChild(this.app.canvas);
    this.app.stage.addChild(this.root);

    this.app.renderer.on('resize', () => this.layout());
    window.addEventListener('resize', () => this.applyResolution());
    window.addEventListener('pointermove', (e) => {
      this.mouse.targetX = (e.clientX / window.innerWidth) * 2 - 1;
      this.mouse.targetY = (e.clientY / window.innerHeight) * 2 - 1;
    });

    this.app.ticker.add((ticker) => {
      const dt = Math.min(ticker.deltaMS / 1000, 1 / 20);
      this.mouse.x = damp(this.mouse.x, this.mouse.targetX, 3, dt);
      this.mouse.y = damp(this.mouse.y, this.mouse.targetY, 3, dt);
      this.perf.sample(ticker.deltaMS, this.adaptive);
      this.emit('update', dt);
      // Juste avant le rendu : on ne dessine pas ce qui est transparent
      cullInvisible(this.app.stage);
    });

    this.resolution = this.app.renderer.resolution;
    this.layout();
  }

  setQuality(q: RenderQuality): void {
    this.quality = q;
    this.perf.scale = 1;
    this.applyResolution();
  }

  /** Résolution visée : densité de l'écran, plafonnée par le budget de pixels, × facteur adaptatif. */
  private targetResolution(): number {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const css = Math.max(1, window.innerWidth * window.innerHeight);
    const cap = Math.sqrt(PIXEL_BUDGET[this.quality] / css);
    const r = Math.min(dpr, cap) * this.perf.scale;
    return Math.max(0.5, Math.round(r * 100) / 100);
  }

  applyResolution(): void {
    const r = this.targetResolution();
    if (!this.app.renderer || Math.abs(r - this.resolution) < 0.01) { this.resolution = r; return; }
    this.resolution = r;
    this.app.renderer.resize(window.innerWidth, window.innerHeight, r);
    this.emit('resolution', r);
  }

  /** Adapte l'échelle pour que la ville remplisse toujours la hauteur (ou la largeur sur écran ultra-large). */
  layout(): void {
    const w = this.app.screen.width;
    const h = this.app.screen.height;
    const scale = Math.max(h / WORLD.height, w / WORLD.width);
    const vp = this.viewport;
    vp.scale = scale;
    vp.width = w / scale;
    vp.height = h / scale;
    vp.offsetY = Math.max(0, (WORLD.height - vp.height) * 0.5);
    vp.screenWidth = w;
    vp.screenHeight = h;
    this.root.scale.set(scale);
    this.root.y = -vp.offsetY * scale;
    this.emit('resize', vp);
  }
}
