import { CAMERA } from '../config';
import { clamp, damp } from '../utils/math';

/**
 * Caméra horizontale façon jeu mobile : glisser-déposer avec inertie,
 * molette, clavier (← → / Q D / A D) et bords d'écran. Effet élastique aux limites.
 */
export class Camera {
  x = 0;
  target = 0;
  min = 0;
  max = 0;
  private vel = 0;
  private dragging = false;
  private lastPointerX = 0;
  private lastMoveTime = 0;
  private dragDistance = 0;
  private readonly keys = new Set<string>();
  private pointerX = -1;
  private pointerOnCanvas = false;
  private followOverride: number | null = null;
  /** Appelé la première fois que le joueur déplace la caméra. */
  onFirstMove?: () => void;
  private moved = false;

  constructor(private readonly getScale: () => number) {}

  /** Vrai si le dernier geste était un glissement (pour ne pas déclencher de clic). */
  get wasDrag(): boolean {
    return this.dragDistance > 8;
  }

  get isDragging(): boolean {
    return this.dragging;
  }

  setBounds(min: number, max: number): void {
    this.min = min;
    this.max = Math.max(min, max);
    this.target = clamp(this.target, this.min, this.max);
    this.x = clamp(this.x, this.min - CAMERA.rubberBand, this.max + CAMERA.rubberBand);
  }

  /** Déplacement doux vers une position (lambda plus petit = plus lent). */
  panTo(x: number, lambda: number | null = null): void {
    this.target = clamp(x, this.min, this.max);
    this.vel = 0;
    this.followOverride = lambda;
  }

  jumpTo(x: number): void {
    this.x = this.target = clamp(x, this.min, this.max);
    this.vel = 0;
  }

  attach(canvas: HTMLCanvasElement): void {
    canvas.addEventListener('pointerdown', (e) => {
      if (e.button !== 0) return;
      this.dragging = true;
      this.dragDistance = 0;
      this.lastPointerX = e.clientX;
      this.lastMoveTime = performance.now();
      this.vel = 0;
      this.followOverride = null;
    });
    window.addEventListener('pointermove', (e) => {
      this.pointerX = e.clientX;
      if (!this.dragging) return;
      const now = performance.now();
      const dxScreen = e.clientX - this.lastPointerX;
      this.lastPointerX = e.clientX;
      this.dragDistance += Math.abs(dxScreen);
      let dx = -dxScreen / this.getScale();
      // Résistance quand on dépasse les limites.
      if ((this.target < this.min && dx < 0) || (this.target > this.max && dx > 0)) dx *= 0.35;
      this.target += dx;
      this.x = this.target;
      const dtMove = Math.max(1, now - this.lastMoveTime) / 1000;
      this.vel = this.vel * 0.6 + (dx / dtMove) * 0.4;
      this.lastMoveTime = now;
      if (this.dragDistance > 8) this.markMoved();
    });
    const release = () => {
      if (!this.dragging) return;
      this.dragging = false;
      if (performance.now() - this.lastMoveTime > 90) this.vel = 0;
    };
    window.addEventListener('pointerup', release);
    window.addEventListener('pointercancel', release);
    canvas.addEventListener('pointerenter', () => (this.pointerOnCanvas = true));
    canvas.addEventListener('pointerleave', () => (this.pointerOnCanvas = false));
    canvas.addEventListener('wheel', (e) => {
      e.preventDefault();
      const delta = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY;
      this.target = clamp(this.target + (delta * CAMERA.wheelSpeed) / this.getScale() * 0.6, this.min, this.max);
      this.vel = 0;
      this.followOverride = null;
      this.markMoved();
    }, { passive: false });
    window.addEventListener('keydown', (e) => {
      if (e.target instanceof HTMLInputElement) return;
      this.keys.add(e.code);
    });
    window.addEventListener('keyup', (e) => this.keys.delete(e.code));
    window.addEventListener('blur', () => this.keys.clear());
  }

  private markMoved(): void {
    if (this.moved) return;
    this.moved = true;
    this.onFirstMove?.();
  }

  update(dt: number): void {
    let dir = 0;
    if (this.keys.has('ArrowLeft') || this.keys.has('KeyA') || this.keys.has('KeyQ')) dir -= 1;
    if (this.keys.has('ArrowRight') || this.keys.has('KeyD')) dir += 1;
    if (!this.dragging && this.pointerOnCanvas && this.pointerX >= 0) {
      if (this.pointerX < CAMERA.edgeSize) dir -= 0.6;
      else if (this.pointerX > window.innerWidth - CAMERA.edgeSize) dir += 0.6;
    }
    if (dir !== 0) {
      this.target = clamp(this.target + (dir * CAMERA.keySpeed * dt) / Math.max(0.5, this.getScale() * 1.6), this.min, this.max);
      this.vel = 0;
      this.followOverride = null;
      this.markMoved();
    }

    if (!this.dragging) {
      this.target += this.vel * dt;
      this.vel *= Math.exp(-CAMERA.dragInertia * dt);
      if (Math.abs(this.vel) < 1) this.vel = 0;
      // Retour élastique.
      if (this.target < this.min) { this.target = damp(this.target, this.min, 14, dt); this.vel = 0; }
      if (this.target > this.max) { this.target = damp(this.target, this.max, 14, dt); this.vel = 0; }
      this.x = damp(this.x, this.target, this.followOverride ?? CAMERA.follow, dt);
    }
  }
}
