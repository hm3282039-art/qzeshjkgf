import { Container, TilingSprite, type Texture } from 'pixi.js';

export interface FogBandDef {
  texture: Texture;
  y: number;
  height: number;
  alpha: number;
  tint: number;
  /** Vitesse de dérive (px/s). */
  speed: number;
  /** Facteur de parallaxe par rapport à la caméra. */
  parallax: number;
  tileScale: number;
  blend?: 'add' | 'normal' | 'screen';
}

interface FogBand extends FogBandDef {
  sprite: TilingSprite;
  drift: number;
}

/** Bandes de brume en espace écran, qui dérivent et suivent le parallaxe. */
export class Fog {
  readonly container = new Container();
  private readonly bands: FogBand[] = [];

  add(def: FogBandDef): void {
    const sprite = new TilingSprite({ texture: def.texture, width: 100, height: def.height });
    sprite.alpha = def.alpha;
    sprite.tint = def.tint;
    sprite.y = def.y;
    sprite.tileScale.set(def.tileScale);
    if (def.blend) sprite.blendMode = def.blend;
    this.container.addChild(sprite);
    this.bands.push({ ...def, sprite, drift: Math.random() * 1000 });
  }

  resize(viewWidth: number): void {
    for (const b of this.bands) b.sprite.width = viewWidth;
  }

  update(dt: number, cameraX: number): void {
    for (const b of this.bands) {
      b.drift += b.speed * dt;
      b.sprite.tilePosition.x = -cameraX * b.parallax + b.drift;
    }
  }
}
