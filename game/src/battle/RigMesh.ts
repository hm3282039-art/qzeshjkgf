import { Mesh, MeshGeometry, type Texture } from 'pixi.js';
import type { RigDef, V2 } from './rigs';

/** Pose d'un squelette. Les angles sont en radians, dans le repère « vers l'avant » du personnage. */
export interface Pose {
  /** Inclinaison du buste autour du bassin (+ = vers l'avant). */
  spine: number;
  /** Rotation de la tête autour du cou (+ = vers l'avant / le bas). */
  head: number;
  /** Rotation (et décalage, en fraction de hauteur) des membres. − = lever l'arme. */
  main: number; off: number; draw: number;
  mainDx: number; mainDy: number; drawDx: number;
  /** Écart des jambes (−1…1) pour la course. */
  stride: number;
  /** Flexion des jambes (0…1, négatif = extension). */
  crouch: number;
  /** Respiration (gonflement du buste). */
  breathe: number;
  /** Amplitude des tissus (1 = normal). */
  cloth: number;
  /** Vent : décalage horizontal global des tissus (+ = vers l'arrière). */
  wind: number;
}

export const restPose = (): Pose => ({
  spine: 0, head: 0, main: 0, off: 0, draw: 0, mainDx: 0, mainDy: 0, drawDx: 0,
  stride: 0, crouch: 0, breathe: 0, cloth: 1, wind: 0,
});

/** Remet une pose au repos sans allouer d'objet (appelé à chaque image pour chaque combattant). */
export function resetPose(p: Pose): void {
  p.spine = p.head = p.main = p.off = p.draw = p.mainDx = p.mainDy = p.drawDx = 0;
  p.stride = p.crouch = p.breathe = p.wind = 0;
  p.cloth = 1;
}

const smooth = (a: number, b: number, x: number): number => {
  const t = Math.max(0, Math.min(1, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

function distToSeg(px: number, py: number, ax: number, ay: number, bx: number, by: number): number {
  const dx = bx - ax, dy = by - ay;
  const l2 = dx * dx + dy * dy;
  let t = l2 > 0 ? ((px - ax) * dx + (py - ay) * dy) / l2 : 0;
  t = Math.max(0, Math.min(1, t));
  return Math.hypot(px - (ax + dx * t), py - (ay + dy * t));
}

type LimbId = 'main' | 'off' | 'draw';
const LIMB_IDS: readonly LimbId[] = ['main', 'off', 'draw'];
const EMPTY = new Float32Array(0);
interface LimbState { w: Float32Array; px: number; py: number; rot: number; dx: number; dy: number }

/**
 * Illustration découpée en maillage et animée par un squelette 2D (skinning).
 * Deux `Mesh` partagent la même géométrie : le dessin et sa copie additive (flash d'impact).
 */
export class RigMesh {
  readonly geometry: MeshGeometry;
  readonly mesh: Mesh;
  readonly flash: Mesh;
  private readonly rest: Float32Array;
  private readonly pos: Float32Array;
  private readonly n: number;
  private readonly W: number;
  private readonly H: number;
  // Poids par sommet
  private readonly wSpine: Float32Array;
  private readonly wHead: Float32Array;
  private readonly wLimb: Record<'main' | 'off' | 'draw', Float32Array | null>;
  private readonly wLeg: Float32Array;
  private readonly cloth: Array<{ w: Float32Array; d: Float32Array; amp: number; freq: number; phase: number }>;
  private readonly fwd: number;
  private readonly px: (p: V2) => [number, number];
  private readonly pivots: Record<'main' | 'off' | 'draw', [number, number] | null>;
  private t = Math.random() * 10;
  private readonly limbBuf: LimbState[] = [];
  private readonly limbData: Record<LimbId, LimbState> = {
    main: { w: EMPTY, px: 0, py: 0, rot: 0, dx: 0, dy: 0 },
    off: { w: EMPTY, px: 0, py: 0, rot: 0, dx: 0, dy: 0 },
    draw: { w: EMPTY, px: 0, py: 0, rot: 0, dx: 0, dy: 0 },
  };

  constructor(readonly texture: Texture, readonly rig: RigDef, facesRight: boolean) {
    const W = (this.W = texture.width);
    const H = (this.H = texture.height);
    this.fwd = facesRight ? 1 : -1;
    this.px = (p) => [p[0] * W, p[1] * H];
    const rows = 18;
    const cols = Math.max(8, Math.min(30, Math.round(rows * (W / H)) + 1));
    const n = (this.n = rows * cols);
    const positions = new Float32Array(n * 2);
    const uvs = new Float32Array(n * 2);
    const idx: number[] = [];
    for (let j = 0; j < rows; j++) {
      for (let i = 0; i < cols; i++) {
        const k = j * cols + i;
        const u = i / (cols - 1), v = j / (rows - 1);
        uvs[k * 2] = u; uvs[k * 2 + 1] = v;
        positions[k * 2] = u * W - W / 2;
        positions[k * 2 + 1] = v * H - H;
        if (i < cols - 1 && j < rows - 1) idx.push(k, k + 1, k + cols, k + 1, k + cols + 1, k + cols);
      }
    }
    this.rest = positions.slice();
    this.pos = positions;
    this.geometry = new MeshGeometry({ positions, uvs, indices: new Uint32Array(idx) });
    this.mesh = new Mesh({ geometry: this.geometry, texture });
    this.flash = new Mesh({ geometry: this.geometry, texture });
    this.flash.blendMode = 'add';
    this.flash.alpha = 0;

    // ---------- Poids ----------
    const r = rig;
    const wS = (this.wSpine = new Float32Array(n));
    const wH = (this.wHead = new Float32Array(n));
    const wL = (this.wLeg = new Float32Array(n));
    const spineAt = (v: number): number => 1 - smooth(r.spineTop, r.hip[1] + 0.03, v);
    const limbW = (segs: V2[][], rad: number, soft: number, x: number, y: number): number => {
      let d = Infinity;
      for (const s of segs) for (let q = 0; q < s.length - 1; q++) {
        const [ax, ay] = this.px(s[q]!), [bx, by] = this.px(s[q + 1]!);
        d = Math.min(d, distToSeg(x, y, ax, ay, bx, by));
      }
      return 1 - smooth(rad * H, (rad + soft) * H, d);
    };

    this.wLimb = { main: null, off: null, draw: null };
    this.pivots = { main: null, off: null, draw: null };
    for (const l of r.limbs) {
      const w = new Float32Array(n);
      for (let k = 0; k < n; k++) {
        const x = uvs[k * 2]! * W, y = uvs[k * 2 + 1]! * H;
        w[k] = limbW(l.segs, l.r, l.soft ?? 0.05, x, y);
      }
      this.wLimb[l.id] = w;
      this.pivots[l.id] = this.px(l.pivot);
    }
    this.cloth = r.cloth.map((c, ci) => {
      const w = new Float32Array(n);
      const d = new Float32Array(n);
      const [axp, ayp] = this.px(c.anchor);
      for (let k = 0; k < n; k++) {
        const x = uvs[k * 2]! * W, y = uvs[k * 2 + 1]! * H;
        w[k] = limbW(c.segs, c.r, c.soft ?? 0.05, x, y);
        d[k] = Math.hypot(x - axp, y - ayp) / H;
      }
      return { w, d, amp: c.amp, freq: c.freq ?? 3, phase: ci * 1.7 };
    });
    const [hx, hy] = this.px(r.head);
    for (let k = 0; k < n; k++) {
      const u = uvs[k * 2]!, v = uvs[k * 2 + 1]!;
      const x = u * W, y = v * H;
      let s = spineAt(v);
      // Les membres et tissus accrochés au buste suivent la colonne, même s'ils descendent bas (épée, cape).
      for (const l of r.limbs) s = Math.max(s, this.wLimb[l.id]![k]! * spineAt(l.pivot[1]));
      r.cloth.forEach((c, ci) => { s = Math.max(s, this.cloth[ci]!.w[k]! * spineAt(c.anchor[1])); });
      wS[k] = s;
      wH[k] = 1 - smooth(r.headR * H, (r.headR + 0.05) * H, Math.hypot(x - hx, y - hy));
      let lw = smooth(r.hip[1] + 0.02, r.hip[1] + 0.12, v);
      for (const l of r.limbs) lw *= 1 - this.wLimb[l.id]![k]!;
      wL[k] = lw;
    }
  }

  /** Applique une pose : recalcule la position de chaque sommet. */
  apply(p: Pose, dt: number): void {
    this.t += dt;
    const { rest, pos, n, W, H, fwd, rig } = this;
    const [hipX, hipY] = [rig.hip[0] * W - W / 2, rig.hip[1] * H - H];
    const [neckX, neckY] = [rig.neck[0] * W - W / 2, rig.neck[1] * H - H];
    const legTop = (rig.hip[1] + 0.04) * H - H;
    const split = rig.legSplit;
    const crouch = p.crouch * 0.22;
    // Membres actifs (tableau réutilisé : aucune allocation par image)
    const limbs = this.limbBuf;
    limbs.length = 0;
    for (const id of LIMB_IDS) {
      const w = this.wLimb[id];
      const pv = this.pivots[id];
      if (!w || !pv) continue;
      const l = this.limbData[id];
      l.w = w;
      l.px = pv[0] - W / 2;
      l.py = pv[1] - H;
      l.rot = (id === 'main' ? p.main : id === 'off' ? p.off : p.draw) * fwd;
      l.dx = (id === 'main' ? p.mainDx : id === 'draw' ? p.drawDx : 0) * H * fwd;
      l.dy = (id === 'main' ? p.mainDy : 0) * H;
      limbs.push(l);
    }
    const headRot = p.head * fwd;
    const spineRot = p.spine * fwd;
    const t = this.t;

    for (let k = 0; k < n; k++) {
      let x = rest[k * 2]!, y = rest[k * 2 + 1]!;
      const ry = y;
      // 1. Tissus et cheveux
      for (const c of this.cloth) {
        const w = c.w[k]!;
        if (w <= 0.001) continue;
        const d = c.d[k]!;
        const ph = t * c.freq - d * 9 + c.phase;
        x += (Math.sin(ph) * c.amp * p.cloth - p.wind * 0.04 * fwd) * H * w * d * 2.2;
        y += Math.cos(ph * 1.3) * c.amp * 0.5 * p.cloth * H * w * d * 2.2;
      }
      // 2. Membres (épaule → main → arme)
      for (let li = 0; li < limbs.length; li++) {
        const l = limbs[li]!;
        const w = l.w[k]!;
        if (w <= 0.001) continue;
        const a = l.rot * w;
        if (a !== 0) {
          const c = Math.cos(a), s = Math.sin(a);
          const ox = x - l.px, oy = y - l.py;
          x = l.px + ox * c - oy * s;
          y = l.py + ox * s + oy * c;
        }
        x += l.dx * w;
        y += l.dy * w;
      }
      // 3. Tête
      const wh = this.wHead[k]!;
      if (wh > 0.001 && headRot !== 0) {
        const a = headRot * wh, c = Math.cos(a), s = Math.sin(a);
        const ox = x - neckX, oy = y - neckY;
        x = neckX + ox * c - oy * s;
        y = neckY + ox * s + oy * c;
      }
      // 4. Colonne (le buste plie autour du bassin)
      const ws = this.wSpine[k]!;
      if (ws > 0.001) {
        if (spineRot !== 0) {
          const a = spineRot * ws, c = Math.cos(a), s = Math.sin(a);
          const ox = x - hipX, oy = y - hipY;
          x = hipX + ox * c - oy * s;
          y = hipY + ox * s + oy * c;
        }
        y = hipY + (y - hipY) * (1 + p.breathe * ws);
      }
      // 5. Jambes : foulée et flexion (les pieds restent au sol)
      const wl = this.wLeg[k]!;
      if (wl > 0.001 && p.stride !== 0) {
        const u = (rest[k * 2]! + W / 2) / W;
        const side = smooth(split - 0.06, split + 0.06, u) * 2 - 1;
        const kk = Math.max(0, Math.min(1, (ry - legTop) / (0 - legTop)));
        x += p.stride * side * kk * H * 0.07 * fwd * wl;
        y -= Math.abs(p.stride) * Math.sin(kk * Math.PI) * H * 0.02 * wl * (side * p.stride > 0 ? 1 : 0.3);
      }
      if (crouch !== 0) {
        if (ry >= legTop) y = y * (1 - crouch);
        else y = y + -legTop * crouch;
      }
      pos[k * 2] = x;
      pos[k * 2 + 1] = y;
    }
    this.geometry.getBuffer('aPosition').update();
  }

  /** Position (repère local du maillage) d'un point du dessin après déformation approximative. */
  restPoint(p: V2): { x: number; y: number } {
    return { x: (p[0] - 0.5) * this.W, y: (p[1] - 1) * this.H };
  }

  destroy(): void {
    this.mesh.destroy();
    this.flash.destroy();
    this.geometry.destroy();
  }
}
