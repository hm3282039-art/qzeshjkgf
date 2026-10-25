import { Container, Graphics, Polygon, Sprite, type FederatedPointerEvent, type Texture } from 'pixi.js';
import type { BuildingDef } from '../data/buildings';
import { damp, flatPoints } from '../utils/math';

/**
 * Zone interactive d'un bâtiment : zone cliquable, surbrillance au survol
 * (copie additive de l'image, découpée par le contour du bâtiment) et point d'ancrage de l'étiquette.
 */
export class BuildingView {
  readonly hit = new Container();
  readonly anchor = new Container();
  private readonly highlight: Sprite;
  private readonly mask: Graphics;
  private readonly extra: Sprite[] = [];
  private amount = 0;
  private hovered = false;
  private externalHover = false;
  private time = Math.random() * 10;

  onHover?: (def: BuildingDef, hovered: boolean) => void;
  onSelect?: (def: BuildingDef, global: { x: number; y: number }) => void;

  constructor(
    readonly def: BuildingDef,
    source: Texture,
    parent: Container,
    canClick: () => boolean,
  ) {
    const pts = flatPoints(def.polygon);

    this.mask = new Graphics().poly(pts).fill({ color: 0xffffff });
    this.highlight = new Sprite(source);
    this.highlight.blendMode = 'add';
    this.highlight.tint = def.glow;
    this.highlight.alpha = 0;
    this.highlight.mask = this.mask;

    this.hit.hitArea = new Polygon(pts);
    this.hit.eventMode = 'static';
    this.hit.cursor = 'pointer';
    this.hit.on('pointerover', () => this.setHover(true));
    this.hit.on('pointerout', () => this.setHover(false));
    this.hit.on('pointertap', (e: FederatedPointerEvent) => {
      if (canClick()) this.onSelect?.(this.def, { x: e.global.x, y: e.global.y });
    });

    this.anchor.position.set(def.label[0], def.label[1]);
    parent.addChild(this.highlight, this.mask, this.hit, this.anchor);
  }

  /** Autres sprites qui doivent briller avec le bâtiment (ex. le cristal flottant). */
  addExtraHighlight(sprite: Sprite): void {
    sprite.blendMode = 'add';
    sprite.tint = this.def.glow;
    sprite.alpha = 0;
    this.extra.push(sprite);
  }

  /** Survol déclenché depuis l'interface (étiquette). */
  setExternalHover(v: boolean): void {
    this.externalHover = v;
  }

  get isHovered(): boolean {
    return this.hovered || this.externalHover;
  }

  private setHover(v: boolean): void {
    if (this.hovered === v) return;
    this.hovered = v;
    this.onHover?.(this.def, v);
  }

  update(dt: number): void {
    this.time += dt;
    this.amount = damp(this.amount, this.isHovered ? 1 : 0, 10, dt);
    const a = this.amount * (0.45 + Math.sin(this.time * 4) * 0.1);
    this.highlight.alpha = a;
    this.highlight.visible = a > 0.003;
    for (const s of this.extra) s.alpha = a * 1.2;
  }
}
