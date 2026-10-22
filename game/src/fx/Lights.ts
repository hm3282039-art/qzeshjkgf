import { Container, Sprite, type Texture } from 'pixi.js';

export interface LightDef {
  x: number;
  y: number;
  /** Rayon en px monde. */
  radius: number;
  color: number;
  intensity: number;
  /** 0 = lumière stable, 1 = flamme très vacillante. */
  flicker: number;
  /** Pulsation lente (magie). */
  pulse?: number;
}

interface LightInstance extends LightDef {
  sprite: Sprite;
  phase: number;
}

/** Halos lumineux additifs qui vacillent (torches, fenêtres, magie). */
export class Lights {
  readonly container = new Container();
  private readonly lights: LightInstance[] = [];
  private time = 0;

  constructor(private readonly texture: Texture) {
    this.container.blendMode = 'add';
  }

  add(def: LightDef): Sprite {
    const sprite = new Sprite(this.texture);
    sprite.anchor.set(0.5);
    sprite.tint = def.color;
    sprite.width = sprite.height = def.radius * 2;
    sprite.position.set(def.x, def.y);
    this.container.addChild(sprite);
    this.lights.push({ ...def, sprite, phase: Math.random() * 100 });
    return sprite;
  }

  update(dt: number): void {
    this.time += dt;
    const t = this.time;
    for (const l of this.lights) {
      const n =
        Math.sin(t * 9.1 + l.phase) * 0.5 +
        Math.sin(t * 15.7 + l.phase * 1.7) * 0.3 +
        Math.sin(t * 23.3 + l.phase * 0.3) * 0.2;
      const flick = 1 + n * 0.22 * l.flicker;
      const pulse = l.pulse ? 1 + Math.sin(t * l.pulse + l.phase) * 0.25 : 1;
      l.sprite.alpha = l.intensity * flick * pulse;
      const s = (l.radius * 2 * (1 + n * 0.05 * l.flicker)) / l.sprite.texture.width;
      l.sprite.scale.set(s);
    }
  }
}
