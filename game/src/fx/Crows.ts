import { Container, Graphics } from 'pixi.js';
import { rand } from '../utils/math';

interface Crow {
  root: Container;
  wingL: Graphics;
  wingR: Graphics;
  vx: number;
  baseY: number;
  phase: number;
  flapSpeed: number;
  t: number;
}

function drawWing(g: Graphics, dir: 1 | -1): void {
  g.moveTo(0, 0)
    .bezierCurveTo(dir * 10, -10, dir * 22, -8, dir * 34, -2)
    .lineTo(dir * 26, 1)
    .lineTo(dir * 30, 4)
    .bezierCurveTo(dir * 18, 4, dir * 8, 4, 0, 4)
    .fill({ color: 0x07050c });
}

/** Silhouettes de corbeaux qui traversent le ciel de temps en temps. */
export class Crows {
  readonly container = new Container();
  private readonly crows: Crow[] = [];
  private timer = rand(2, 5);

  constructor(private readonly bounds: { width: number; minY: number; maxY: number }) {}

  resize(width: number): void {
    this.bounds.width = width;
  }

  private spawnFlock(): void {
    const dir = Math.random() < 0.5 ? 1 : -1;
    const count = Math.floor(rand(1, 5));
    const y = rand(this.bounds.minY, this.bounds.maxY);
    const speed = rand(110, 190) * dir;
    for (let i = 0; i < count; i++) {
      const root = new Container();
      const body = new Graphics().ellipse(0, 2, 9, 3.5).fill({ color: 0x07050c }).circle(dir * 9, 0, 3.4).fill({ color: 0x07050c });
      const wingL = new Graphics();
      const wingR = new Graphics();
      drawWing(wingL, -1);
      drawWing(wingR, 1);
      root.addChild(wingL, wingR, body);
      const s = rand(0.55, 1.1);
      root.scale.set(s);
      root.alpha = 0.55 + s * 0.35;
      root.x = dir > 0 ? -100 - i * rand(40, 80) : this.bounds.width + 100 + i * rand(40, 80);
      const baseY = y + rand(-60, 60);
      root.y = baseY;
      this.container.addChild(root);
      this.crows.push({ root, wingL, wingR, vx: speed * rand(0.9, 1.1), baseY, phase: rand(0, 10), flapSpeed: rand(9, 13), t: 0 });
    }
  }

  update(dt: number): void {
    this.timer -= dt;
    if (this.timer <= 0) {
      this.spawnFlock();
      this.timer = rand(7, 15);
    }
    for (let i = this.crows.length - 1; i >= 0; i--) {
      const c = this.crows[i]!;
      c.t += dt;
      c.root.x += c.vx * dt;
      c.root.y = c.baseY + Math.sin(c.t * 1.3 + c.phase) * 14;
      // Battement d'ailes avec planés occasionnels.
      const gliding = Math.sin(c.t * 0.7 + c.phase) > 0.6;
      const flap = gliding ? 0.25 : Math.sin(c.t * c.flapSpeed + c.phase);
      c.wingL.scale.y = c.wingR.scale.y = flap;
      if (c.root.x < -400 || c.root.x > this.bounds.width + 400) {
        c.root.destroy({ children: true });
        this.crows.splice(i, 1);
      }
    }
  }
}
