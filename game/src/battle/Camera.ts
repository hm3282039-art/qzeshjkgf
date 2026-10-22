import { Container, PerspectiveMesh, RenderTexture, Texture, type Renderer } from 'pixi.js';
import { cullInvisible } from '../core/perf';

/** État de la caméra (repère du terrain 1920×1080). */
export interface CamState {
  x: number;
  y: number;
  zoom: number;
  /** Roulis (rad) : inclinaison de l'image. */
  roll: number;
  /** Tangage (rad) : > 0 = on regarde le sol en plongée (le haut de l'image s'éloigne). */
  pitch: number;
  /** Lacet (rad) : rotation latérale en perspective. */
  yaw: number;
}

export const VIEW_W = 1920;
export const VIEW_H = 1080;
export const HOME: CamState = { x: VIEW_W / 2, y: VIEW_H / 2, zoom: 1, roll: 0, pitch: 0, yaw: 0 };

const KEYS = ['x', 'y', 'zoom', 'roll', 'pitch', 'yaw'] as const;
/** Bruit lisse 1D (somme de sinus) pour un tremblement organique. */
const wobble = (t: number, s: number): number => Math.sin(t * 37.1 + s) * 0.5 + Math.sin(t * 61.7 + s * 2.3) * 0.3 + Math.sin(t * 97.3 + s * 4.1) * 0.2;

/**
 * Caméra de combat « fausse 3D » :
 * - travelling, zoom et roulis sur le terrain ;
 * - décor en parallaxe (il bouge un peu moins que les combattants → profondeur) ;
 * - premier plan qui bouge plus vite ;
 * - plongée / lacet en vraie perspective : le terrain est rendu dans une texture affichée sur un
 *   maillage en perspective (uniquement pendant les cinématiques) ;
 * - tremblement « trauma » (décroissance quadratique) et coups de zoom.
 */
export class BattleCamera {
  readonly cur: CamState = { ...HOME };
  readonly target: CamState = { ...HOME };
  /** Vitesse de rattrapage par paramètre (1/s). Infinity = coupe franche. */
  private rate = 3;
  private rotRate = 3;
  /** Point suivi (remplace x/y de la cible tant qu'il est défini). */
  follow: (() => { x: number; y: number }) | null = null;
  followZoom = 0;
  private trauma = 0;
  private punchZ = 0;
  private t = 0;
  private shakeX = 0;
  private shakeY = 0;
  private shakeR = 0;

  // Rendu en perspective
  private readonly rtRoot = new Container();
  private rt: RenderTexture | null = null;
  private readonly persp: PerspectiveMesh;
  private perspOn = false;
  private readonly overscan = 1.22;

  constructor(
    private readonly renderer: Renderer,
    private readonly root: Container,
    private readonly world: Container,
    private readonly bgLayer: Container,
    private readonly fgLayer: Container,
  ) {
    this.persp = new PerspectiveMesh({ texture: Texture.WHITE, verticesX: 12, verticesY: 12 });
    this.persp.visible = false;
  }

  /** Va vers un nouvel état. `rate` : rapidité (6 = vif, 2 = doux, Infinity = coupe). */
  go(s: Partial<CamState>, rate = 4, rotRate = rate): void {
    for (const k of KEYS) if (s[k] !== undefined) this.target[k] = s[k]!;
    this.rate = rate;
    this.rotRate = rotRate;
    if (rate === Infinity) for (const k of KEYS) this.cur[k] = this.target[k];
  }

  /** Coupe franche : la caméra saute instantanément (montage façon anime). */
  cut(s: Partial<CamState>): void {
    this.go(s, Infinity);
  }

  shake(amount: number): void {
    this.trauma = Math.min(1.2, Math.max(this.trauma, amount));
  }

  /** Coup de zoom bref (impact). */
  punch(amount: number): void {
    this.punchZ = Math.max(this.punchZ, amount);
  }

  update(dt: number): void {
    this.t += dt;
    if (this.follow) {
      const p = this.follow();
      this.target.x = p.x;
      this.target.y = p.y;
    }
    const a = this.rate === Infinity ? 1 : 1 - Math.exp(-this.rate * dt);
    const ar = this.rotRate === Infinity ? 1 : 1 - Math.exp(-this.rotRate * dt);
    this.cur.x += (this.target.x - this.cur.x) * a;
    this.cur.y += (this.target.y - this.cur.y) * a;
    this.cur.zoom += (this.target.zoom - this.cur.zoom) * a;
    this.cur.roll += (this.target.roll - this.cur.roll) * ar;
    this.cur.pitch += (this.target.pitch - this.cur.pitch) * ar;
    this.cur.yaw += (this.target.yaw - this.cur.yaw) * ar;

    this.trauma = Math.max(0, this.trauma - dt * 1.6);
    this.punchZ *= Math.exp(-dt * 7);
    const sh = this.trauma * this.trauma;
    this.shakeX = wobble(this.t, 1) * 34 * sh;
    this.shakeY = wobble(this.t, 7) * 26 * sh;
    this.shakeR = wobble(this.t, 13) * 0.035 * sh;
  }

  /** Zoom effectif (avec le coup de zoom). */
  get zoom(): number {
    return this.cur.zoom * (1 + this.punchZ);
  }

  /**
   * Applique la caméra aux calques. `cover` = échelle qui remplit l'écran avec le terrain 1920×1080.
   */
  apply(screenW: number, screenH: number, cover: number): void {
    const c = this.cur;
    const zoom = this.zoom;
    // On empêche de voir au-delà des bords du terrain
    const halfW = screenW / (2 * cover * zoom);
    const halfH = screenH / (2 * cover * zoom);
    const margin = 60;
    const cx = clampRange(c.x, halfW - margin, VIEW_W - halfW + margin);
    const cy = clampRange(c.y, halfH - margin, VIEW_H - halfH + margin);

    const needPersp = Math.abs(c.pitch) > 0.004 || Math.abs(c.yaw) > 0.004;
    if (needPersp !== this.perspOn) this.setPersp(needPersp, screenW, screenH);
    const ow = needPersp ? screenW * this.overscan : screenW;
    const oh = needPersp ? screenH * this.overscan : screenH;
    if (needPersp && this.rt && (Math.abs(this.rt.width - ow) > 1 || Math.abs(this.rt.height - oh) > 1 || this.rt.source.resolution !== this.renderer.resolution)) this.makeRT(ow, oh);

    const w = this.world;
    w.pivot.set(cx + this.shakeX, cy + this.shakeY);
    w.position.set(ow / 2, oh / 2);
    w.scale.set(cover * zoom);
    w.rotation = c.roll + this.shakeR;

    // Décor : se comporte comme s'il était plus loin (zoom et travelling atténués)
    const zb = Math.pow(zoom, 0.88);
    const bx = VIEW_W / 2 + (cx - VIEW_W / 2) * 0.9;
    const by = VIEW_H / 2 + (cy - VIEW_H / 2) * 0.9;
    this.bgLayer.pivot.set(bx, by);
    this.bgLayer.position.set(cx, cy);
    this.bgLayer.scale.set(zb / zoom);
    // Premier plan : plus proche, il bouge davantage
    const zf = Math.pow(zoom, 1.25);
    const fx = VIEW_W / 2 + (cx - VIEW_W / 2) * 1.3;
    const fy = VIEW_H / 2 + (cy - VIEW_H / 2) * 1.3;
    this.fgLayer.pivot.set(fx, fy);
    this.fgLayer.position.set(cx, cy);
    this.fgLayer.scale.set(zf / zoom);

    if (needPersp) {
      // Coins du rectangle rendu, tournés en 3D puis projetés
      const D = screenH * 1.25;
      const cp = Math.cos(c.pitch), sp = Math.sin(c.pitch);
      const cyw = Math.cos(c.yaw), syw = Math.sin(c.yaw);
      const proj = (X: number, Y: number): [number, number] => {
        // lacet (autour de l'axe vertical) puis tangage (autour de l'axe horizontal)
        const x1 = X * cyw;
        const z1 = X * syw;
        const y2 = Y * cp;
        const z2 = z1 - Y * sp;
        const k = D / (D + z2);
        return [screenW / 2 + x1 * k, screenH / 2 + y2 * k];
      };
      // Léger zoom pour que les bords ne se voient jamais
      const s = 1 + Math.abs(c.pitch) * 0.35 + Math.abs(c.yaw) * 0.45;
      const hw = (ow / 2) * s, hh = (oh / 2) * s;
      const [x0, y0] = proj(-hw, -hh);
      const [x1, y1] = proj(hw, -hh);
      const [x2, y2] = proj(hw, hh);
      const [x3, y3] = proj(-hw, hh);
      this.persp.setCorners(x0, y0, x1, y1, x2, y2, x3, y3);
      // Le terrain est hors de la scène principale pendant la perspective : on l'élague ici
      cullInvisible(this.rtRoot);
      this.renderer.render({ container: this.rtRoot, target: this.rt!, clear: true });
    }
  }

  private setPersp(on: boolean, w: number, h: number): void {
    this.perspOn = on;
    if (on) {
      if (!this.rt) this.makeRT(w * this.overscan, h * this.overscan);
      const idx = this.root.getChildIndex(this.world);
      this.rtRoot.addChild(this.world);
      this.root.addChildAt(this.persp, idx);
      this.persp.visible = true;
    } else {
      const idx = this.root.getChildIndex(this.persp);
      this.root.removeChild(this.persp);
      this.root.addChildAt(this.world, idx);
    }
  }

  private makeRT(w: number, h: number): void {
    // On branche la nouvelle texture AVANT de détruire l'ancienne (sinon Pixi détruit une texture encore liée au shader)
    const old = this.rt;
    this.rt = RenderTexture.create({ width: Math.ceil(w), height: Math.ceil(h), resolution: this.renderer.resolution, antialias: false });
    this.persp.texture = this.rt;
    if (old) setTimeout(() => old.destroy(true), 200); // laisse passer quelques images : le bind group du shader la référence encore
  }

  /** Le terrain est-il actuellement rendu en perspective ? */
  get perspective(): boolean {
    return this.perspOn;
  }

  /** Convertit un point du terrain en coordonnées écran (approximation sans la perspective). */
  toScreen(x: number, y: number, screenW: number, screenH: number, cover: number): { x: number; y: number } {
    const z = cover * this.zoom;
    const dx = (x - this.world.pivot.x) * z, dy = (y - this.world.pivot.y) * z;
    const r = this.world.rotation, c = Math.cos(r), s = Math.sin(r);
    return { x: screenW / 2 + dx * c - dy * s, y: screenH / 2 + dx * s + dy * c };
  }

  reset(): void {
    Object.assign(this.cur, HOME);
    Object.assign(this.target, HOME);
    this.follow = null;
    this.trauma = this.punchZ = 0;
    this.rate = this.rotRate = 3;
  }
}

function clampRange(v: number, lo: number, hi: number): number {
  return lo > hi ? (lo + hi) / 2 : Math.max(lo, Math.min(hi, v));
}
