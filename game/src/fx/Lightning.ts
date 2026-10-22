import { Container, Graphics, Sprite, Texture } from 'pixi.js';
import { rand } from '../utils/math';

/**
 * Éclairs : flash sur le ciel + zébrure lumineuse qui se ramifie.
 */
export class Lightning {
  readonly container = new Container();
  private readonly flash: Sprite;
  private readonly bolt = new Graphics();
  private timer = rand(4, 8);
  private flashT = 0;
  private boltT = 0;
  /** Appelé à chaque éclair (pour illuminer d'autres éléments). */
  onStrike?: (strength: number) => void;
  /** Cible optionnelle (ex. la flèche de la Tour) : l'éclair s'y abat parfois. */
  target?: () => { x: number; y: number } | null;

  constructor(private readonly area: { width: number; height: number }) {
    this.flash = new Sprite(Texture.WHITE);
    this.flash.width = area.width;
    this.flash.height = area.height;
    this.flash.tint = 0xc9b8ff;
    this.flash.alpha = 0;
    this.flash.blendMode = 'add';
    this.bolt.blendMode = 'add';
    this.container.addChild(this.flash, this.bolt);
  }

  resize(width: number): void {
    this.area.width = width;
    this.flash.width = width;
  }

  private strike(): void {
    this.flashT = 0.6;
    this.boltT = 0.35;
    this.bolt.clear();
    const t = Math.random() < 0.45 ? this.target?.() : null;
    if (t) {
      this.drawBranch(t.x + rand(-220, 220), -40, t.y + 40, 6, 0, t.x);
    } else {
      const x0 = rand(this.area.width * 0.05, this.area.width * 0.95);
      this.drawBranch(x0, 0, rand(380, 620), 5, 0);
    }
    this.onStrike?.(1);
  }

  private drawBranch(x: number, y: number, length: number, width: number, depth: number, targetX?: number): void {
    const pts: number[] = [x, y];
    const segments = 9;
    let cx = x, cy = y;
    for (let i = 0; i < segments; i++) {
      const k = (i + 1) / segments;
      cx = targetX !== undefined ? x + (targetX - x) * k + (i < segments - 1 ? rand(-30, 30) : 0) : cx + rand(-38, 38);
      cy += length / segments;
      pts.push(cx, cy);
      if (depth < 2 && Math.random() < 0.22) this.drawBranch(cx, cy, length * 0.4, width * 0.55, depth + 1);
    }
    const draw = (w: number, color: number, alpha: number) => {
      this.bolt.moveTo(pts[0]!, pts[1]!);
      for (let i = 2; i < pts.length; i += 2) this.bolt.lineTo(pts[i]!, pts[i + 1]!);
      this.bolt.stroke({ width: w, color, alpha, cap: 'round', join: 'round' });
    };
    draw(width * 4, 0x8a5cff, 0.25);
    draw(width, 0xf2ecff, 0.95);
  }

  update(dt: number): void {
    this.timer -= dt;
    if (this.timer <= 0) {
      this.strike();
      this.timer = rand(7, 16);
    }
    if (this.flashT > 0) {
      this.flashT -= dt;
      const t = Math.max(0, this.flashT);
      // Double flash caractéristique.
      this.flash.alpha = (t > 0.45 ? 0.32 : t > 0.35 ? 0.05 : t * 0.5);
    } else this.flash.alpha = 0;
    if (this.boltT > 0) {
      this.boltT -= dt;
      this.bolt.alpha = Math.max(0, this.boltT / 0.35);
    } else this.bolt.alpha = 0;
  }
}
