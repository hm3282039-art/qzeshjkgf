import { Container, Sprite, type Texture } from 'pixi.js';

interface Pulse {
  holder: Container;
  sprite: Sprite;
  t: number;
  duration: number;
  from: number;
  to: number;
  alpha: number;
}

/** Ondes lumineuses qui s'élargissent puis disparaissent (clic, impulsion de l'autel). */
export class Pulses {
  readonly container = new Container();
  private readonly pulses: Pulse[] = [];

  constructor(private readonly texture: Texture) {
    this.container.blendMode = 'add';
    this.container.eventMode = 'none';
  }

  spawn(x: number, y: number, opts: { tint: number; from: number; to: number; duration: number; alpha?: number; flatten?: number }): void {
    const holder = new Container();
    holder.position.set(x, y);
    holder.scale.y = opts.flatten ?? 1;
    const sprite = new Sprite(this.texture);
    sprite.anchor.set(0.5);
    sprite.tint = opts.tint;
    holder.addChild(sprite);
    this.container.addChild(holder);
    this.pulses.push({ holder, sprite, t: 0, duration: opts.duration, from: opts.from, to: opts.to, alpha: opts.alpha ?? 1 });
  }

  update(dt: number): void {
    for (let i = this.pulses.length - 1; i >= 0; i--) {
      const p = this.pulses[i]!;
      p.t += dt;
      const k = Math.min(1, p.t / p.duration);
      const ease = 1 - (1 - k) ** 3;
      const size = p.from + (p.to - p.from) * ease;
      p.sprite.width = p.sprite.height = size;
      p.sprite.alpha = p.alpha * (1 - k) ** 1.5;
      if (k >= 1) {
        p.holder.destroy({ children: true });
        this.pulses.splice(i, 1);
      }
    }
  }
}
