import { AdvancedBloomFilter, type AdvancedBloomFilterOptions } from 'pixi-filters';
import { TexturePool, type Container, type FilterSystem, type RenderSurface, type Texture } from 'pixi.js';

/**
 * Outils de performance du rendu.
 *
 * Constats (mesurés) qui ont motivé ce module :
 *  - PixiJS v8 dessine quand même un objet dont l'opacité vaut 0 : chaque calque plein écran
 *    « éteint » (flash, lignes de vitesse, voile, image d'impact…) coûtait un remplissage complet.
 *  - Le bloom d'origine fait 6 passes plein écran en pleine résolution : très cher en 1440p / 4K.
 */

/**
 * Passe à faire juste avant le rendu : un objet dont l'opacité est quasi nulle n'est plus dessiné
 * (`renderable = false`), sans toucher à `visible` qui reste géré par le jeu.
 */
export function cullInvisible(node: Container): void {
  const ch = node.children;
  for (let i = 0; i < ch.length; i++) {
    const c = ch[i]!;
    if (!c.visible) continue;
    const show = c.alpha > 0.004;
    if (c.renderable !== show) c.renderable = show;
    if (show && c.children.length) cullInvisible(c);
  }
}

/**
 * Bloom sous-échantillonné : l'extraction des zones lumineuses et le flou se font en ¼ de résolution
 * (16× moins de pixels), seul le mélange final est en pleine résolution. Visuellement identique
 * (un halo est flou par nature) pour une fraction du coût.
 */
export class FastBloomFilter extends AdvancedBloomFilter {
  /** Fraction de la résolution utilisée pour le halo. */
  downscale = 0.25;

  constructor(options: AdvancedBloomFilterOptions) {
    super(options);
  }

  override apply(filterManager: FilterSystem, input: Texture, output: RenderSurface, clearMode: boolean): void {
    const self = this as unknown as {
      _extractFilter: { apply: (f: FilterSystem, i: Texture, o: Texture, c: boolean) => void };
      _blurFilter: { apply: (f: FilterSystem, i: Texture, o: Texture, c: boolean) => void };
      uniforms: { uBloomScale: number; uBrightness: number };
    };
    // Même taille « logique » que l'entrée (les shaders de filtre en dépendent), mais 4× moins de pixels par côté.
    const res = Math.max(0.05, input.source._resolution * this.downscale);
    const bright = TexturePool.getOptimalTexture({ width: input.frame.width, height: input.frame.height, resolution: res, antialias: false });
    self._extractFilter.apply(filterManager, input, bright, true);
    const bloom = TexturePool.getOptimalTexture({ width: input.frame.width, height: input.frame.height, resolution: res, antialias: false });
    self._blurFilter.apply(filterManager, bright, bloom, true);
    self.uniforms.uBloomScale = this.bloomScale;
    self.uniforms.uBrightness = this.brightness;
    this.resources.uMapTexture = bloom.source;
    filterManager.applyFilter(this, input, output, clearMode);
    TexturePool.returnTexture(bloom);
    TexturePool.returnTexture(bright);
  }
}

/**
 * Surveille la durée réelle des images. Si le jeu n'arrive plus à suivre pendant plusieurs secondes,
 * il baisse la résolution interne par paliers (jusqu'à 60 %), puis la remonte quand tout redevient fluide.
 * Affiche aussi un compteur d'images par seconde (touche F ou réglages).
 */
export class PerfMonitor {
  /** Facteur appliqué à la résolution (0.6…1). */
  scale = 1;
  fps = 60;
  private acc = 0;
  private frames = 0;
  private slowT = 0;
  private fastT = 0;
  private cooldown = 0;
  private emaMs = 16.7;
  private worstMs = 0;
  private el: HTMLDivElement | null = null;

  constructor(private readonly onScale: (scale: number) => void) {}

  /** `ms` = durée de l'image écoulée. `active` = on surveille (combat). */
  sample(ms: number, active: boolean): void {
    // Onglet masqué, chargement… : ignoré
    if (ms > 250) return;
    this.emaMs += (ms - this.emaMs) * 0.08;
    this.worstMs = Math.max(this.worstMs, ms);
    this.acc += ms;
    this.frames++;
    if (this.acc >= 500) {
      this.fps = (this.frames * 1000) / this.acc;
      if (this.el) this.el.textContent = `${Math.round(this.fps)} FPS · ${this.emaMs.toFixed(1)} ms · pic ${this.worstMs.toFixed(0)} ms · rendu ${Math.round(this.scale * 100)} %`;
      this.acc = 0;
      this.frames = 0;
      this.worstMs = 0;
    }
    if (!active) { this.slowT = this.fastT = 0; return; }
    const dt = ms / 1000;
    this.cooldown = Math.max(0, this.cooldown - dt);
    // Lent = moins de ~45 images/s en moyenne lissée
    if (this.emaMs > 22) { this.slowT += dt; this.fastT = 0; }
    else if (this.emaMs < 17.6) { this.fastT += dt; this.slowT = 0; }
    else { this.slowT = Math.max(0, this.slowT - dt); this.fastT = 0; }
    if (this.slowT > 1.6 && this.scale > 0.6 && this.cooldown <= 0) {
      this.set(Math.max(0.6, this.scale - 0.15));
      this.slowT = 0;
      this.cooldown = 2;
    } else if (this.fastT > 12 && this.scale < 1) {
      this.set(Math.min(1, this.scale + 0.1));
      this.fastT = 0;
      this.cooldown = 4;
    }
  }

  private set(s: number): void {
    this.scale = Math.round(s * 100) / 100;
    this.onScale(this.scale);
  }

  showCounter(on: boolean): void {
    if (on && !this.el) {
      this.el = document.createElement('div');
      this.el.className = 'fps-counter';
      this.el.textContent = '… FPS';
      document.body.appendChild(this.el);
    } else if (!on && this.el) {
      this.el.remove();
      this.el = null;
    }
  }

  get counterShown(): boolean { return !!this.el; }
}
