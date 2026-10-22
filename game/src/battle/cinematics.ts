import { Sprite } from 'pixi.js';
import { audio } from '../audio/AudioEngine';
import { rand } from '../utils/math';
import type { BattleScene } from './BattleScene';
import { NYX_ECLIPSE, THORNE_WAVE_SPEED, type FxEvent, type Side, type Unit } from './Sim';

/** Durée (temps réel) de l'élan commun à tous les ultimes : combat figé, zoom, illustration. */
const PHASE_A = 1.45;
/** Montage kinétique d'ouverture : 3 coupes franches sur le héros (0,32 s). */
const PHASE_K = 0.32;
/** Temps de « retombée » après l'impact : le joueur a le temps de lire ce qui vient de se passer. */
const AFTERMATH = 0.95;

interface Timer { left: number; fn: () => void }

/** Script de la deuxième partie d'un ultime (propre à chaque héros), en temps de jeu. */
interface UltScript {
  /** Durée maximale de la séquence (s de jeu). */
  max: number;
  start(): void;
  onFx?(e: FxEvent): void;
  update?(t: number, dt: number): void;
}

const centroid = (us: readonly Unit[]): { x: number; y: number } => {
  if (!us.length) return { x: 1200, y: 780 };
  return { x: us.reduce((s, u) => s + u.x, 0) / us.length, y: us.reduce((s, u) => s + u.y, 0) / us.length };
};

/**
 * Réalisateur des cinématiques de combat.
 *
 * Chaque ultime se déroule en deux temps (~2 s au total) :
 *  A. Élan (0,8 s, combat figé) : la caméra plonge sur le héros, bandes cinéma, lignes de vitesse,
 *     flou radial, montée sonore et illustration plein écran.
 *  B. Exécution (propre à chaque héros) : travellings, coupes franches, plongées en perspective,
 *     ralentis, images d'impact, ondes de choc…
 * Il gère aussi les mini-séquences : rage du boss, mort du boss, victoire et défaite.
 */
export class CineDirector {
  private phase: 'idle' | 'K' | 'A' | 'B' | 'event' | 'end' = 'idle';
  /** Héros dont l'ultime est en cours. */
  caster: Unit | null = null;
  private readonly queue: Unit[] = [];
  private t = 0;
  private script: UltScript | null = null;
  /** Durée propre au héros (ses effets s'arrêtent là) et durée totale avec la retombée. */
  private scriptLimit = 0;
  private scriptMax = 0;
  private readonly realTimers: Timer[] = [];
  private readonly gameTimers: Timer[] = [];
  private eventEnd = 0;
  private ghostAcc = 0;

  constructor(private readonly s: BattleScene) {}

  /** Le combat est-il figé (élan d'un ultime) ? */
  get frozen(): boolean { return this.phase === 'A' || this.phase === 'K'; }
  /** Une séquence d'ultime est-elle en cours ou en attente ? */
  get busy(): boolean { return this.phase === 'K' || this.phase === 'A' || this.phase === 'B' || this.queue.length > 0; }
  /** La caméra est-elle pilotée par une cinématique ? */
  get controlsCamera(): boolean { return this.phase !== 'idle'; }

  reset(): void {
    this.phase = 'idle';
    this.caster = null;
    this.queue.length = 0;
    this.script = null;
    this.realTimers.length = 0;
    this.gameTimers.length = 0;
  }

  /** Temporisation en temps réel (insensible aux ralentis). */
  private later(delay: number, fn: () => void): void { this.realTimers.push({ left: delay, fn }); }
  /** Temporisation en temps de jeu. */
  private at(delay: number, fn: () => void): void { this.gameTimers.push({ left: delay, fn }); }

  /** Demande un ultime : lancé tout de suite, ou mis en file d'attente si une séquence est en cours. */
  request(u: Unit): boolean {
    if (this.caster === u || this.queue.includes(u)) return false;
    if (this.phase === 'end') return false;
    if (this.phase === 'idle' || this.phase === 'event') { this.startK(u); return true; }
    this.queue.push(u);
    return true;
  }

  update(realDt: number, gameDt: number): void {
    tick(this.realTimers, realDt);
    tick(this.gameTimers, gameDt);
    const s = this.s;
    switch (this.phase) {
      case 'K':
        this.t += realDt;
        if (this.t >= PHASE_K) this.startA(this.caster!);
        break;
      case 'A':
        this.t += realDt;
        if (this.caster) {
          const v = s.view(this.caster);
          if (v && Math.random() < realDt * 40) s.cineMotes.burst(1, v.chest.x + rand(-90, 90), v.chest.y + rand(-80, 120), this.caster.def.color);
        }
        if (this.t >= PHASE_A) this.startB();
        break;
      case 'B':
        this.t += gameDt;
        // Le script garde sa propre durée ; on ajoute une retombée lisible derrière.
        if (this.t <= this.scriptLimit) this.script?.update?.(this.t, gameDt);
        if (this.t >= this.scriptMax) this.endB();
        break;
      case 'event':
        this.t += realDt;
        if (this.t >= this.eventEnd) this.endEvent();
        break;
      default:
        break;
    }
    // Ultime suivant en attente : il peut couper la fin de la séquence en cours
    if (this.queue.length && (this.phase === 'idle' || this.phase === 'event' || (this.phase === 'B' && this.t > 0.6 && this.gameTimers.length === 0))) {
      const next = this.queue.shift()!;
      if (this.phase === 'B') this.endB();
      if (s.sim?.canUltimate(next) && s.fighting) this.startK(next);
    }
  }

  /**
   * Montée en puissance : ce qu'on voit pendant l'élan, juste avant le cut-in.
   * Chaque héros a SA signature — plus de « trois anneaux » identiques pour tout le monde.
   */
  private buildUp(u: Unit): void {
    const s = this.s;
    const col = u.def.color;
    const D = PHASE_A;

    switch (u.def.id) {
      /* ---------- Vaelen : un rempart de flammes se dresse ---------- */
      case 'vaelen': {
        const crack = new Sprite(s.bt.crack);
        crack.anchor.set(0.5);
        crack.tint = 0xff7a2a;
        crack.blendMode = 'add';
        crack.position.set(u.x, u.y + 4);
        crack.scale.set(0.15, 0.05);
        s.anim(crack, s.groundFx, D + 0.3, (k) => {
          const sc = Math.min(1, k * 3.2) * 1.8;
          crack.scale.set(sc, sc * 0.3);
          crack.alpha = Math.min(1, k * 5) * (1 - Math.pow(k, 2.4));
        }, true);
        for (let i = 0; i < 16; i++) {
          const dx = u.x + (i % 2 ? 1 : -1) * (70 + (i >> 1) * 17);
          const grow = rand(1.4, 2.7);
          this.later((i >> 1) * 0.03, () => {
            if (!s.fighting) return;
            const fl = new Sprite(s.fx.flame);
            fl.anchor.set(0.5, 1);
            fl.tint = i % 3 === 0 ? 0xffc46a : 0xff7a2a;
            fl.blendMode = 'add';
            fl.position.set(dx, u.y + 8);
            s.anim(fl, s.groundFx, 0.8, (k) => {
              fl.scale.set(0.55 + k * 0.95, 0.5 + k * grow);
              fl.alpha = Math.min(1, k * 6) * (1 - k * k);
            }, true);
          });
        }
        break;
      }

      /* ---------- Sylvaine : les flèches convergent vers son arc ---------- */
      case 'sylvaine': {
        for (let i = 0; i < 16; i++) {
          this.later(i * 0.042, () => {
            if (!s.fighting) return;
            const a = rand(0, Math.PI * 2);
            const r = rand(430, 780);
            const ax = u.x + Math.cos(a) * r;
            const ay = u.y - 170 + Math.sin(a) * r * 0.6;
            const tx = u.x + rand(-24, 24);
            const ty = u.y - 160;
            const ar = new Sprite(s.bt.arrow);
            ar.anchor.set(0.9, 0.5);
            ar.tint = 0xbaffc8;
            ar.blendMode = 'add';
            ar.position.set(ax, ay);
            ar.scale.set(1.5);
            ar.rotation = Math.atan2(ty - ay, tx - ax);
            s.anim(ar, s.fxLayer, 0.42, (k) => {
              ar.x = ax + (tx - ax) * k;
              ar.y = ay + (ty - ay) * k;
              ar.alpha = k < 0.8 ? 1 : (1 - k) * 5;
            }, true);
          });
        }
        s.feathers.burst(20, u.x, u.y - 190);
        break;
      }

      /* ---------- Pyrrha : les braises montent en spirale ---------- */
      case 'pyrrha': {
        for (let i = 0; i < 26; i++) {
          const a0 = rand(0, Math.PI * 2);
          const r0 = rand(40, 155);
          const rise = rand(300, 470);
          const spin = rand(0.7, 1.9) * (i % 2 ? 1 : -1);
          const sy = u.y - rand(0, 40);
          this.later(i * 0.022, () => {
            if (!s.fighting) return;
            const e = new Sprite(s.fx.spark);
            e.anchor.set(0.5);
            e.tint = i % 3 ? 0xff8a3a : 0xffd27a;
            e.blendMode = 'add';
            e.position.set(u.x + Math.cos(a0) * r0, sy);
            s.anim(e, s.groundFx, 0.66, (k) => {
              const ang = a0 + k * Math.PI * 2 * spin;
              const rr = r0 * (1 - k * 0.55);
              e.x = u.x + Math.cos(ang) * rr;
              e.y = sy - k * rise;
              e.scale.set(0.95 * (1 - k) + 0.15);
              e.alpha = Math.min(1, k * 4) * (1 - k);
            }, true);
          });
        }
        break;
      }

      /* ---------- Kael : un brasier s'allume autour de lui ---------- */
      case 'orlan': {
        // La lumière tombe du ciel, des cierges s'allument, trois cercles se dessinent.
        const beam = new Sprite(s.bt.beam);
        beam.anchor.set(0.5, 1);
        beam.tint = 0xffe9b0;
        beam.blendMode = 'add';
        beam.position.set(u.x, u.y + 6);
        s.anim(beam, s.groundFx, D + 0.2, (k) => {
          const w = 1.4 + k * 0.8;
          const h = 2.2 + Math.sin(k * Math.PI) * 3.4;
          beam.scale.set(w, h);
          beam.alpha = Math.min(1, k * 2.4) * (1 - Math.pow(k, 3));
        }, true);
        for (let i = 0; i < 3; i++) {
          this.later(i * 0.22, () => {
            if (!s.fighting) return;
            const r = new Sprite(s.fx.ring);
            r.anchor.set(0.5);
            r.tint = i === 0 ? 0xfff4d0 : 0xd8c48a;
            r.blendMode = 'add';
            r.position.set(u.x, u.y + 6);
            s.anim(r, s.groundFx, D - i * 0.12, (k) => {
              const sc = 0.3 + k * 2.8;
              r.scale.set(sc, sc * 0.36);
              r.alpha = (1 - k) * 0.9;
            }, true);
          });
        }
        for (let i = 0; i < 24; i++) {
          this.later(rand(0, 0.95), () => {
            if (!s.fighting) return;
            const m = new Sprite(s.fx.glowSoft);
            m.anchor.set(0.5);
            m.tint = 0xffe9b0;
            m.blendMode = 'add';
            const a = rand(0, Math.PI * 2);
            const rad = rand(40, 155);
            m.position.set(u.x + Math.cos(a) * rad, u.y + 30 + Math.sin(a) * rad * 0.3);
            s.anim(m, s.groundFx, 1.0, (k) => {
              m.y -= 1.7;
              m.scale.set(0.2 * (1 - k * 0.5));
              m.alpha = Math.sin(k * Math.PI) * 0.95;
            }, true);
          });
        }
        break;
      }
      case 'vespera': {
        // Huit lames fantômes tournoient autour d'elle dans une brume écarlate.
        for (let i = 0; i < 8; i++) {
          const a0 = (i / 8) * Math.PI * 2;
          this.later(i * 0.05, () => {
            if (!s.fighting) return;
            const b = new Sprite(s.bt.slash);
            b.anchor.set(0.5);
            b.tint = 0xff3050;
            b.blendMode = 'add';
            b.position.set(u.x, u.y - 120);
            b.scale.set(0.72);
            s.anim(b, s.fxLayer, 1.15, (k) => {
              const ang = a0 + k * 2.6;
              b.x = u.x + Math.cos(ang) * (88 + k * 62);
              b.y = u.y - 120 + Math.sin(ang) * (38 + k * 24);
              b.rotation = ang + Math.PI / 2;
              b.alpha = Math.min(1, k * 4) * (1 - k);
            }, true);
          });
        }
        const mist = new Sprite(s.fx.glowSoft);
        mist.anchor.set(0.5);
        mist.tint = 0xff3050;
        mist.blendMode = 'add';
        mist.position.set(u.x, u.y - 30);
        s.anim(mist, s.groundFx, D, (k) => {
          mist.scale.set(0.6 + k * 1.9, 0.35 + k * 0.95);
          mist.alpha = 0.55 * Math.sin(k * Math.PI);
        }, true);
        break;
      }
      case 'gorm': {
        // Le sol se fend et les pierres s'arrachent au sol pour tournoyer autour de lui.
        const crack = new Sprite(s.bt.crack);
        crack.anchor.set(0.5);
        crack.tint = 0x8ad46a;
        crack.blendMode = 'add';
        crack.position.set(u.x, u.y + 4);
        crack.scale.set(0.15, 0.05);
        s.anim(crack, s.groundFx, D + 0.3, (k) => {
          const sc = Math.min(1, k * 2.6) * 2.3;
          crack.scale.set(sc, sc * 0.3);
          crack.alpha = Math.min(1, k * 4) * (1 - Math.pow(k, 2.4));
        }, true);
        for (let i = 0; i < 16; i++) {
          const a = rand(0, Math.PI * 2);
          const rad = rand(50, 200);
          this.later(i * 0.035, () => {
            if (!s.fighting) return;
            const rk = new Sprite(s.bt.ice[i % s.bt.ice.length]!);
            rk.anchor.set(0.5, 1);
            rk.tint = 0x8a9a78;
            rk.position.set(u.x + Math.cos(a) * rad, u.y + 10 + Math.sin(a) * rad * 0.3);
            const spin = rand(-1.2, 1.2);
            s.anim(rk, s.groundFx, 0.85, (k) => {
              const up = Math.sin(k * Math.PI) * 95;
              rk.y = u.y + 10 + Math.sin(a) * rad * 0.3 - up;
              rk.scale.set(0.5 + k * 0.35, 0.45 + k * 0.8);
              rk.alpha = 1 - k * k;
              rk.rotation = spin * k;
            }, true);
          });
        }
        s.debris.burst(18, u.x, u.y);
        break;
      }
      case 'kael': {
        for (let i = 0; i < 18; i++) {
          const a = (i / 18) * Math.PI * 2;
          const dist = rand(120, 210);
          this.later(i * 0.02, () => {
            if (!s.fighting) return;
            const fl = new Sprite(s.fx.flame);
            fl.anchor.set(0.5, 1);
            fl.tint = i % 2 ? 0xff5a1a : 0xffa04a;
            fl.blendMode = 'add';
            fl.position.set(u.x + Math.cos(a) * dist, u.y + Math.sin(a) * dist * 0.3 + 10);
            s.anim(fl, s.groundFx, 0.7, (k) => {
              fl.scale.set(0.5 + k * 0.7, 0.6 + k * 2.2);
              fl.alpha = Math.min(1, k * 5) * (1 - k * k);
            }, true);
          });
        }
        break;
      }

      /* ---------- Lyra : deux arcs rouges se croisent ---------- */
      case 'lyra': {
        for (let i = 0; i < 2; i++) {
          const sl = new Sprite(s.bt.slash);
          sl.anchor.set(0.5);
          sl.tint = 0xff3a5a;
          sl.blendMode = 'add';
          sl.position.set(u.x, u.y - 150);
          sl.rotation = (i ? 1 : -1) * 0.9;
          s.anim(sl, s.fxLayer, 0.6, (k) => {
            const sc = 0.5 + k * 1.5;
            sl.scale.set(sc * (i ? 1 : -1), sc);
            sl.alpha = Math.min(1, k * 6) * (1 - k);
          }, true);
        }
        s.cineMotes.burst(22, u.x, u.y - 160, 0xff5a7a);
        break;
      }

      /* ---------- Morwen : des volutes sombres s'enroulent ---------- */
      case 'morwen': {
        for (let i = 0; i < 5; i++) {
          const sp = new Sprite(s.fx.spiralSoft);
          sp.anchor.set(0.5);
          sp.tint = i % 2 ? 0x8a2ac8 : 0x3a1050;
          sp.blendMode = 'add';
          sp.position.set(u.x, u.y - 110);
          sp.scale.set(0.1);
          const dir = i % 2 ? 1 : -1;
          s.anim(sp, s.fxLayer, D + 0.2, (k) => {
            const sc = 0.25 + k * 1.5;
            sp.scale.set(sc);
            sp.rotation = k * 3.5 * dir;
            sp.alpha = Math.min(1, k * 4) * (0.55 - k * 0.3);
          }, true);
        }
        s.plague.burst(14, u.x, u.y - 60);
        break;
      }

      /* ---------- Seren : la lumière descend du ciel ---------- */
      case 'seren': {
        const beam = new Sprite(s.bt.beam);
        beam.anchor.set(0.5, 1);
        beam.tint = 0xfff0b0;
        beam.blendMode = 'add';
        beam.position.set(u.x, u.y + 12);
        beam.scale.set(0.12, 0.05);
        s.anim(beam, s.fxLayer, D + 0.25, (k) => {
          beam.scale.set(0.12 + k * 0.5, 0.1 + k * 1.5);
          beam.alpha = Math.min(1, k * 3.5) * (1 - Math.pow(k, 3));
        }, true);
        for (let i = 0; i < 10; i++) {
          this.later(i * 0.06, () => {
            if (!s.fighting) return;
            s.feathers.burst(2, u.x + rand(-160, 160), u.y - rand(260, 460));
          });
        }
        break;
      }

      /* ---------- Thorne : des éclats de glace jaillissent en cercle ---------- */
      case 'thorne': {
        for (let i = 0; i < 9; i++) {
          const a = (i / 9) * Math.PI * 2;
          const dist = rand(100, 240);
          const tex = s.bt.ice[i % s.bt.ice.length]!;
          this.later(i * 0.03, () => {
            if (!s.fighting) return;
            const ice = new Sprite(tex);
            ice.anchor.set(0.5, 1);
            ice.tint = 0xbff2ff;
            ice.blendMode = 'add';
            const px = u.x + Math.cos(a) * dist;
            const py = u.y + Math.sin(a) * dist * 0.32 + 12;
            ice.position.set(px, py);
            ice.scale.set(0.2, 0.05);
            s.anim(ice, s.groundFx, 0.8, (k) => {
              ice.scale.set(0.5 + k * 0.7, 0.3 + k * 1.2);
              ice.alpha = Math.min(1, k * 5) * (1 - k * k);
            }, true);
          });
        }
        break;
      }

      /* ---------- Nyx : une éclipse se referme sur elle ---------- */
      case 'nyx': {
        for (let i = 0; i < 3; i++) {
          const ring = new Sprite(s.bt.rune);
          ring.anchor.set(0.5);
          ring.tint = i === 0 ? 0x6a3aff : 0xb08aff;
          ring.blendMode = 'add';
          ring.position.set(u.x, u.y - 150);
          ring.scale.set(0.1);
          s.anim(ring, s.fxLayer, D, (k) => {
            const sc = 2.4 - k * 2.0;
            ring.scale.set(sc * (2 - i * 0.3), sc * (2 - i * 0.3));
            ring.rotation = k * (2 + i) * (i % 2 ? -1 : 1);
            ring.alpha = Math.min(1, k * 4) * (1 - Math.pow(k, 4));
          }, true);
        }
        s.wisps.burst(26, u.x, u.y - 140, 0xa86bff);
        break;
      }

      /* ---------- Ashka : la foudre frappe tout autour ---------- */
      case 'ashka': {
        for (let i = 0; i < 6; i++) {
          this.later(i * 0.1, () => {
            if (!s.fighting) return;
            const dx = u.x + rand(-260, 260);
            s.lightning(dx + rand(-40, 40), u.y - 520, dx, u.y - rand(20, 110), 0x9aeaff, 4, 0.2);
            s.sparks.burst(8, dx, u.y - 60, 0xffe08a);
          });
        }
        s.speedLinesOn(0.5, 0.35, 0x9aeaff);
        break;
      }

      /* ---------- Mira : la mécanique se remonte, le verre converge ---------- */
      case 'mira': {
        const ring = new Sprite(s.bt.rune);
        ring.anchor.set(0.5);
        ring.tint = 0x4ae0c8;
        ring.blendMode = 'add';
        ring.position.set(u.x + 40, u.y + 6);
        s.anim(ring, s.groundFx, D, (k) => {
          const sc = 0.35 + k * 0.7;
          ring.scale.set(sc, sc * 0.34);
          ring.rotation = k * 2.6;
          ring.alpha = Math.min(1, k * 3) * (1 - k * 0.45);
        }, true);
        // Les éclats de verre noir remontent vers la bouche de l'arbalète.
        for (let i = 0; i < 16; i++) {
          this.later(i * 0.032, () => {
            if (!s.fighting) return;
            const a = rand(0, Math.PI * 2);
            const r = rand(150, 330);
            const sx = u.x + Math.cos(a) * r;
            const sy = u.y - 150 + Math.sin(a) * r * 0.55;
            const tx = u.x + 76;
            const ty = u.y - 160;
            const st = new Sprite(s.bt.streak);
            st.anchor.set(0.5);
            st.tint = i % 3 ? 0x9afff0 : 0xffffff;
            st.blendMode = 'add';
            st.position.set(sx, sy);
            st.rotation = Math.atan2(ty - sy, tx - sx);
            s.anim(st, s.fxLayer, 0.3, (k) => {
              st.x = sx + (tx - sx) * k;
              st.y = sy + (ty - sy) * k;
              st.scale.set(0.85, 0.3);
              st.alpha = k < 0.75 ? 1 : (1 - k) * 4;
            }, true);
          });
        }
        for (let i = 0; i < 8; i++) s.debris.burst(1, u.x + rand(-90, 90), u.y + rand(-8, 8), 0x8afff0);
        break;
      }

      /* ---------- Corvin : la lumière tombe, les plumes noires tournoient ---------- */
      case 'corvin': {
        const beam = new Sprite(s.bt.beam);
        beam.anchor.set(0.5, 1);
        beam.tint = 0xffe9a8;
        beam.blendMode = 'add';
        beam.position.set(u.x, u.y + 8);
        s.anim(beam, s.groundFx, D, (k) => {
          const w = 1.2 + k * 1.1;
          const h = 3 + Math.sin(k * Math.PI) * 3.4;
          beam.scale.set(w, h);
          beam.alpha = Math.min(1, k * 2.2) * (1 - Math.pow(k, 2.4));
        }, true);
        const seal = new Sprite(s.bt.sigil);
        seal.anchor.set(0.5);
        seal.tint = 0xe3c077;
        seal.blendMode = 'add';
        seal.position.set(u.x, u.y + 4);
        s.anim(seal, s.groundFx, D + 0.2, (k) => {
          const sc = 0.5 + k * 1.5;
          seal.scale.set(sc, sc * 0.36);
          seal.alpha = 0.8 * (1 - k * 0.35);
        }, true);
        for (let i = 0; i < 14; i++) {
          this.later(i * 0.05, () => {
            if (!s.fighting) return;
            const a = rand(0, Math.PI * 2);
            const r = rand(110, 300);
            const fe = new Sprite(s.bt.feather);
            fe.anchor.set(0.5);
            fe.tint = i % 4 ? 0x241c2c : 0xffe9a8;
            fe.position.set(u.x + Math.cos(a) * r, u.y - rand(180, 420));
            fe.rotation = rand(0, 6);
            s.anim(fe, s.fxLayer, 1.0, (k) => {
              fe.y += 2.1;
              fe.x += Math.sin(k * 6 + i) * 0.9;
              fe.rotation += 0.03;
              fe.scale.set(0.55);
              fe.alpha = Math.min(1, k * 3) * (1 - k);
            }, true);
          });
        }
        break;
      }

      /* ---------- Elara : trois glas, des cierges, des colombes ---------- */
      case 'elara': {
        for (let i = 0; i < 3; i++) {
          this.later(i * 0.22, () => {
            if (!s.fighting) return;
            const ring = new Sprite(s.fx.ring);
            ring.anchor.set(0.5);
            ring.tint = i === 0 ? 0xfff6d0 : 0xd8c48a;
            ring.blendMode = 'add';
            ring.position.set(u.x, u.y + 6);
            s.anim(ring, s.groundFx, D - i * 0.14, (k) => {
              const sc = 0.3 + k * 2.3;
              ring.scale.set(sc, sc * 0.32);
              ring.alpha = (1 - k) * 0.7;
            }, true);
          });
        }
        s.feathers.burst(12, u.x, u.y - 210);
        for (let i = 0; i < 20; i++) {
          this.later(rand(0, 0.95), () => {
            if (!s.fighting) return;
            const a = rand(0, Math.PI * 2);
            const rad = rand(28, 140);
            s.motes.burst(1, u.x + Math.cos(a) * rad, u.y - rand(0, 70), 0xfff0c0);
          });
        }
        break;
      }

      /* ---------- Aldric : le sanctuaire s'ouvre ---------- */
      default: {
        const rays = new Sprite(s.fx.rays);
        rays.anchor.set(0.5, 1);
        rays.tint = 0xffe08a;
        rays.blendMode = 'add';
        rays.position.set(u.x, u.y + 10);
        rays.scale.set(0.1);
        s.anim(rays, s.groundFx, D + 0.2, (k) => {
          const w = Math.min(1, k * 2.4);
          rays.scale.set(w * 1.9, Math.min(1, k * 1.6) * 1.15);
          rays.rotation = k * 0.35;
          rays.alpha = Math.min(1, k * 3) * (0.45 * (1 - Math.pow(k, 3)));
        }, true);
        for (let i = 0; i < 3; i++) {
          const ring = new Sprite(s.bt.rune);
          ring.anchor.set(0.5);
          ring.tint = i === 1 ? 0xffffff : col;
          ring.blendMode = 'add';
          ring.position.set(u.x, u.y);
          ring.scale.set(0.1, 0.03);
          s.anim(ring, s.groundFx, D - i * 0.1, (k) => {
            const sc = (2.5 - k * 1.9) * (0.85 + i * 0.16);
            ring.scale.set(sc, sc * 0.3);
            ring.rotation = k * (4 + i * 2) * (i % 2 ? -1 : 1);
            ring.alpha = Math.min(1, k * 4) * (1 - Math.pow(k, 5));
          }, true);
        }
        break;
      }
    }
  }

  /* ================= Montage kinétique (ouverture) ================= */

  /**
   * Les trois premières dixièmes de seconde d'un ultime, façon anime.
   *
   * Trois COUPES FRANCHES sur le héros — visage, buste/arme, plan large en
   * contre-plongée — séparées par 0,1 s. Ce n'est pas de l'animation : c'est
   * du montage. L'œil lit trois images d'action, alors qu'on n'a dessiné
   * aucune pose supplémentaire.
   *
   * Coût : 0 image à produire, ~0,3 s de temps de jeu. C'est le meilleur
   * rapport effet / effort du lot.
   */
  private startK(u: Unit): void {
    const s = this.s;
    const v = s.view(u);
    if (!v) return;
    if (this.phase === 'event') this.endEvent();

    this.phase = 'K';
    this.caster = u;
    this.t = 0;
    const f = u.facing;
    const col = u.def.color;
    const head = v.head;
    const chest = v.chest;

    // Le monde s'éteint et se fige : on entre dans la cinématique.
    s.spotlight(u);
    s.dimTarget = 0.55;
    s.barsTarget = 1;
    v.cast(col, PHASE_K + 0.5);
    audio.play('riser');
    audio.muffle(true, 0.3);
    s.cam.follow = null;

    // 1) Le choc : l'écran se fissure et s'inverse deux images.
    s.glassBreak(0.45);
    s.negativeFlash(0.06);
    s.rgbSplit(14, 0.2);
    s.cam.shake(0.35);
    s.flashScreen(col, 0.14);
    s.speedLinesOn(0.75, PHASE_K + 0.15, 0xffffff);

    // 2) Coupe 1 — le VISAGE, très serré.
    s.cam.cut({ x: head.x + f * 16, y: head.y + 26, zoom: 3.0, roll: -f * 0.06, pitch: 0.05, yaw: f * 0.06 });
    s.zoomBlurAt(head.x, head.y, 0.14, 0.5);

    // 3) Coupe 2 — le BUSTE et l'ARME, angle opposé.
    this.later(PHASE_K * 0.34, () => {
      s.cam.cut({ x: chest.x - f * 26, y: chest.y + 54, zoom: 2.35, roll: f * 0.1, pitch: -0.03, yaw: -f * 0.07 });
    });

    // 4) Coupe 3 — plan LARGE en contre-plongée : on replace le héros dans le champ.
    this.later(PHASE_K * 0.68, () => {
      s.cam.cut({ x: u.x + f * 40, y: head.y + 130, zoom: 1.28, roll: -f * 0.02, pitch: 0.12, yaw: f * 0.03 });
    });
  }

  /* ====================== A. Élan ====================== */

  private startA(u: Unit): void {
    const s = this.s;
    const v = s.view(u);
    if (!v) return;
    if (this.phase === 'event') this.endEvent();
    this.phase = 'A';
    this.caster = u;
    this.t = 0;
    const col = u.def.color;
    const f = u.facing;
    s.spotlight(u);
    s.dimTarget = 0.55;
    s.barsTarget = 1;
    v.cast(col, PHASE_A + 0.25);
    audio.play('riser');
    audio.muffle(true, 0.3);
    const head = v.head;
    s.cam.follow = null;
    s.cam.go({ x: u.x + f * 60, y: head.y + 70, zoom: 1.62, roll: -f * 0.05, pitch: 0.07, yaw: f * 0.05 }, 7, 5);
    s.zoomBlurAt(v.chest.x, v.chest.y, 0.1, 0.45);
    s.speedLinesOn(0.6, PHASE_A, 0xffffff);
    s.flashScreen(col, 0.2);
    this.buildUp(u);

    // ---- Coup de zoom d'entrée : la caméra « claque » puis se pose ----
    s.cam.go({ x: u.x + f * 90, y: head.y + 60, zoom: 2.05, roll: -f * 0.08, pitch: 0.1, yaw: f * 0.07 }, 16, 2);
    this.later(0.1, () => {
      s.cam.go({ x: u.x + f * 60, y: head.y + 70, zoom: 1.62, roll: -f * 0.05, pitch: 0.07, yaw: f * 0.05 }, 7, 4);
    });

    this.later(0.12, () => { s.emitCutin(u); audio.play('cutin'); });
    this.later(PHASE_A - 0.12, () => audio.play('braam'));
  }

  /* ====================== B. Exécution ====================== */

  private startB(): void {
    const s = this.s;
    const u = this.caster;
    audio.muffle(false, 0.15);
    s.flashScreen(0xffffff, 0.35);
    s.spotlight(null);
    // Détonation d'ouverture : le héros « libère » l'énergie accumulée pendant l'élan.
    if (u) {
      s.shockwave(u.x, u.y, 1.4);
      // Image d'impact en NOIR ET BLANC PUR : fond blanc, silhouettes noires.
      // La couleur est réservée au reste du jeu, donc cet instant « sort » de l'image.
      s.impactFrame(0.1);
      s.glassBreak(0.3);
      s.negativeFlash(0.05);
      s.rgbSplit(20, 0.28);
      s.cam.shake(0.9);
      s.speedLinesOn(0.9, 0.35, 0xffffff);
      s.sparks.burst(26, u.x, u.y - u.def.height * 0.45, u.def.color);
    }
    if (!u || !s.sim || !u.alive || !s.sim.canUltimate(u)) { this.endB(); return; }
    // IMPORTANT : le script doit être en place AVANT de lancer l'ultime.
    // Certains ultimes émettent leurs effets instantanément ; sinon ils seraient perdus.
    this.phase = 'B';
    this.t = 0;
    this.ghostAcc = 0;
    this.script = this.makeScript(u);
    this.scriptLimit = this.script.max;
    this.scriptMax = this.scriptLimit + AFTERMATH;
    this.script.start();
    if (!s.sim.ultimate(u)) { this.endB(); return; }
  }

  /** Appelé par la scène pour chaque événement d'effet de la simulation. */
  onFx(e: FxEvent): void {
    if (this.phase === 'B' && this.script?.onFx) this.script.onFx(e);
    // Impacts majeurs : déchirure chromatique brève, très « anime ».
    if (e.type === 'vaelen_burst' || e.type === 'pyrrha_impact' || e.type === 'pyrrha_wave' || e.type === 'sylvaine_forest') {
      this.s.rgbSplit(11, 0.24);
    }
    if (e.type === 'enrage' && e.u && (this.phase === 'idle')) this.enrage(e.u);
  }

  onCast(_u: Unit, _ability: 'skill' | 'ultimate'): void {
    // (réservé : petits zooms sur les compétences)
  }

  private endB(): void {
    const s = this.s;
    const u = this.caster;
    // Retombée : la poussière retombe, la caméra s'écarte doucement.
    if (u && s.fighting) {
      s.smoke.burst(14, u.x, u.y - 20, 0x6a5a7a);
      s.shockwave(u.x, u.y, 0.6);
      s.cam.go({ x: u.x, y: u.y - 120, zoom: 1.02, roll: 0, pitch: 0, yaw: 0 }, 2.2, 4);
    }
    this.phase = 'idle';
    this.script = null;
    this.scriptLimit = 0;
    this.scriptMax = 0;
    this.caster = null;
    this.gameTimers.length = 0;
    s.cam.follow = null;
    s.spotlight(null);
    s.dimTarget = 0;
    s.barsTarget = 0;
    s.setTimeScale(1, 4);
  }

  private makeScript(u: Unit): UltScript {
    switch (u.def.id) {
      case 'kael': return this.kael(u);
      case 'lyra': return this.lyra(u);
      case 'morwen': return this.morwen(u);
      case 'seren': return this.seren(u);
      case 'thorne': return this.thorne(u);
      case 'nyx': return this.nyx(u);
      case 'ashka': return this.ashka(u);
      case 'gorm': return this.gorm(u);
      case 'orlan': return this.orlan(u);
      case 'vespera': return this.vespera(u);
      case 'vaelen': return this.vaelen(u);
      case 'sylvaine': return this.sylvaine(u);
      case 'pyrrha': return this.pyrrha(u);
      case 'mira': return this.mira(u);
      case 'corvin': return this.corvin(u);
      case 'elara': return this.elara(u);
      default: return this.aldric(u);
    }
  }

  /** Thorne — Hiver Éternel : contre-plongée sur le jarl, puis travelling qui suit le mur de glace. */
  private thorne(u: Unit): UltScript {
    const s = this.s;
    let waveStart = -1;
    let x0 = u.x;
    let done = false;
    return {
      max: 2.9,
      start: () => {
        s.setTimeScale(0.75, 12);
        s.dimTarget = 0.4;
        const v = s.view(u);
        s.cam.go({ x: u.x + 90, y: (v?.chest.y ?? u.y - 140) + 10, zoom: 1.55, pitch: -0.09, roll: 0.03, yaw: 0.06 }, 6, 4);
        s.speedLinesOn(0.35, 0.4, 0x9ae8ff);
      },
      update: (t) => {
        if (waveStart < 0 || done) return;
        const front = x0 + (t - waveStart) * THORNE_WAVE_SPEED;
        const foes = s.sim?.units.filter((f) => f.alive && f.side === 'enemy') ?? [];
        const last = foes.reduce((m, f) => Math.max(m, f.x), 0);
        if (front > last + 60) {
          // Le mur a tout englouti : arrêt sur image glacé
          done = true;
          s.cam.follow = null;
          s.impactFrame(0.12, 0xdff6ff);
          s.setTimeScale(0.2, Infinity);
          s.cam.punch(0.08);
          s.cam.shake(0.7);
          s.cam.go({ x: (x0 + last) / 2 + 100, y: 640, zoom: 1.12, pitch: 0.12, roll: 0, yaw: 0 }, 3);
          s.flashScreen(0xbff0ff, 0.35);
          audio.play('ult_impact', { rate: 1.2, vol: 0.8 });
          audio.play('block', { rate: 1.4, vol: 0.7 });
          this.later(0.35, () => s.setTimeScale(1, 3));
          this.at(0.85, () => this.endB());
        }
      },
      onFx: (e) => {
        if (e.type === 'thorne_charge') {
          s.cam.punch(0.03);
        } else if (e.type === 'thorne_wave') {
          waveStart = this.t;
          x0 = e.x!;
          s.setTimeScale(0.65, 6);
          s.flashScreen(0x9ae8ff, 0.3);
          s.shockwave(e.x!, (e.y ?? 800) - 40, 0.8);
          s.cam.cut({ x: e.x! + 380, y: 700, zoom: 1.3, pitch: 0.16, roll: -0.04, yaw: -0.1 });
          s.cam.follow = () => ({ x: Math.min(1700, x0 + (this.t - waveStart) * THORNE_WAVE_SPEED - 120), y: 690 });
          s.cam.go({ zoom: 1.14, roll: -0.015, yaw: -0.05, pitch: 0.1 }, 2.2, 2);
          s.speedLinesOn(0.4, 0.5, 0xbff0ff);
        }
      },
    };
  }

  /** Nyx — Éclipse : contre-plongée sur le soleil noir qui grossit, puis implosion en image d'impact violette. */
  private nyx(u: Unit): UltScript {
    const s = this.s;
    return {
      max: 3.0,
      start: () => {
        s.setTimeScale(0.75, 12);
        s.dimTarget = 0.55;
        const v = s.view(u);
        s.cam.go({ x: u.x + 110, y: (v?.chest.y ?? u.y - 140) - 40, zoom: 1.6, pitch: -0.1, roll: -0.04, yaw: 0.07 }, 6, 4);
      },
      update: () => {
        if (Math.random() < 0.25) s.cineMotes.burst(1, u.x + u.facing * 78 + rand(-30, 30), u.y - 178 + rand(-30, 30), 0xa86bff);
      },
      onFx: (e) => {
        if (e.type === 'nyx_eclipse') {
          const x = e.x!, y = e.y!;
          s.dimTarget = 0.75;
          s.setTimeScale(0.8, 6);
          s.cam.cut({ x: x - 120, y: y - 230, zoom: 1.08, pitch: -0.14, roll: 0.04, yaw: 0.08 });
          s.cam.go({ x: x - 40, y: y - 260, zoom: 1.28, pitch: -0.1, roll: -0.02, yaw: 0.03 }, 1.4, 1.2);
          s.zoomBlurAt(x, y - 300, 0.08, NYX_ECLIPSE);
          s.speedLinesOn(0.3, NYX_ECLIPSE, 0x8a5aff);
        } else if (e.type === 'nyx_implode') {
          const x = e.x!, y = e.y!;
          s.impactFrame(0.15, 0xd8b0ff);
          s.setTimeScale(0.15, Infinity);
          s.cam.cut({ x, y: y - 170, zoom: 1.32, pitch: 0.12, roll: 0.05, yaw: -0.04 });
          s.cam.punch(0.13);
          s.cam.go({ zoom: 1.12, roll: 0, pitch: 0.06, yaw: 0 }, 2.4);
          s.zoomBlurAt(x, y - 200, 0.12, 0.4);
          this.later(0.3, () => s.setTimeScale(1, 3));
          this.at(0.8, () => this.endB());
        }
      },
    };
  }

  /** Ashka — Rage du Tonnerre : l'Oiseau-Tonnerre traverse le ciel, puis la foudre s'abat en rafale. */
  private ashka(u: Unit): UltScript {
    const s = this.s;
    let strikes = 0;
    return {
      max: 2.8,
      start: () => {
        s.setTimeScale(0.75, 12);
        s.dimTarget = 0.5;
        s.cam.go({ x: u.x + 80, y: u.y - 260, zoom: 1.55, pitch: -0.08, roll: 0.04, yaw: 0.05 }, 6, 4);
      },
      onFx: (e) => {
        if (e.type === 'ashka_haste') {
          s.setTimeScale(0.8, 8);
          s.cam.cut({ x: 900, y: 560, zoom: 1.04, pitch: -0.12, roll: -0.03, yaw: 0.05 });
          s.cam.go({ x: 1080, y: 620, zoom: 1.12, pitch: 0.04, roll: 0.01, yaw: -0.02 }, 1.6, 1.4);
          s.speedLinesOn(0.35, 0.5, 0x8ae8ff);
        } else if (e.type === 'ashka_strike') {
          strikes++;
          s.cam.punch(0.03);
          s.hitstop(0.035);
          if (strikes === 6) {
            s.impactFrame(0.1, 0xdffaff);
            s.cam.shake(0.6);
            this.later(0.25, () => s.setTimeScale(1, 4));
            this.at(0.55, () => this.endB());
          }
        }
      },
    };
  }

  /** Kael — Châtiment du Brasier : bond au ralenti, caméra qui suit, impact dévastateur. */
  /* ---------- Scènes dédiées : Orlan, Vespera, Gorm ---------- */

  /** Le Grand Glas : la cloche sonne, le monde se fige dans la lumière. */
  private orlan(u: Unit): UltScript {
    const s = this.s;
    return {
      max: 3.0,
      start: () => {
        s.setTimeScale(0.9, 10);
        s.dimTarget = 0.45;
        s.barsTarget = 1;
        s.cam.cut({ x: u.x, y: u.y - 200, zoom: 1.48, roll: 0, yaw: 0, pitch: 0.04 });
        s.cam.go({ zoom: 1.66 }, 3);
        s.speedLinesOn(0.22, PHASE_A, 0xffe9b0);
      },
      onFx: (e) => {
        if (e.type === 'orlan_charge' && e.u === u) {
          s.motes.burst(28, u.x, u.y - 150, 0xffe9b0);
          s.flashScreen(0xfff4d0, 0.12);
        } else if (e.type === 'orlan_bell' && e.u === u) {
          for (let i = 0; i < 3; i++) {
            this.later(i * 0.13, () => {
              if (!s.fighting) return;
              s.shockwave(u.x, u.y - 140 - i * 30, 0.7 + i * 0.28);
              const ring = new Sprite(s.bt.rune);
              ring.anchor.set(0.5);
              ring.tint = i === 0 ? 0xffffff : 0xffe9b0;
              ring.blendMode = 'add';
              ring.position.set(u.x, u.y - 150);
              s.anim(ring, s.fxLayer, 0.9, (k) => {
                const sc = 0.4 + k * 3.6;
                ring.scale.set(sc);
                ring.alpha = (1 - k) * (0.95 - i * 0.22);
                ring.rotation = k * 1.3 * (i % 2 ? -1 : 1);
              });
            });
          }
          s.flashScreen(0xffe9b0, 0.55);
          s.impactFrame(0.09, 0xfff4d0);
          s.cam.shake(0.9);
          s.cam.punch(0.09);
          s.hitstop(0.09);
          audio.play('choir');
          audio.play('ult_impact', { vol: 0.7 });
          const mates = s.sim?.units.filter((x) => x.alive && x.side === 'hero') ?? [];
          for (const a of mates) {
            const v = s.view(a);
            if (!v) continue;
            const c = v.chest;
            const beam = new Sprite(s.bt.beam);
            beam.anchor.set(0.5, 1);
            beam.tint = 0xfff4d0;
            beam.blendMode = 'add';
            beam.position.set(c.x, c.y + 90);
            s.anim(beam, s.fxLayer, 0.8, (k) => {
              beam.scale.set(1.1, 1.6 + k * 2.2);
              beam.alpha = Math.sin(k * Math.PI) * 0.9;
            });
            s.motes.burst(10, c.x, c.y, 0xfff0b0);
          }
          this.later(0.9, () => s.setTimeScale(1, 4));
          this.at(1.7, () => this.endB());
        }
      },
    };
  }

  /** Veuve Noire : huit éclats de lame, puis une croix écarlate qui déchire l'écran. */
  private vespera(u: Unit): UltScript {
    const s = this.s;
    let n = 0;
    return {
      max: 2.7,
      start: () => {
        s.setTimeScale(0.86, 10);
        s.dimTarget = 0.55;
        s.barsTarget = 1;
        s.cam.cut({ x: u.x, y: u.y - 160, zoom: 1.5, roll: -0.05, yaw: 0.1, pitch: 0.04 });
      },
      onFx: (e) => {
        if (e.type === 'lyra_blink' && e.u === u) {
          const side = n % 2 === 0 ? 1 : -1;
          n++;
          s.afterimage(u, 0xff3050, 0.42, 0.8);
          s.cam.cut({ x: u.x - u.facing * 40, y: u.y - 140, zoom: 1.5 + (n % 3) * 0.08, roll: side * 0.06, yaw: side * 0.12, pitch: 0.05 });
          s.cam.go({ zoom: 1.68, roll: side * 0.02, yaw: side * 0.04 }, 2.4);
          s.speedLinesOn(0.42, 0.15, 0xff3050);
        } else if (e.type === 'lyra_slash' && e.u === u) {
          s.hitstop(0.05);
          s.flashScreen(0xff3050, 0.10);
          s.cam.shake(0.3);
          s.cam.punch(0.035);
        } else if (e.type === 'lyra_ult_end') {
          const foes = s.sim?.units.filter((x) => x.alive && x.side === 'enemy') ?? [];
          const c = centroid(foes);
          s.cam.cut({ x: c.x, y: c.y - 170, zoom: 1.18, roll: 0, yaw: 0, pitch: 0 });
          s.setTimeScale(0.3, Infinity);
          const cy = c.y - 150;
          s.streak(c.x - 760, cy - 420, c.x + 760, cy + 420, 0xff3050, 4.5, 0.76);
          this.later(0.08, () => {
            s.streak(c.x + 760, cy - 420, c.x - 760, cy + 420, 0xff3050, 4.5, 0.76);
            this.later(0.09, () => {
              s.streak(c.x - 620, cy + 380, c.x + 620, cy - 380, 0xff1030, 3, 0.6);
              s.impactFrame(0.13, 0xffd0d8);
              s.shockwave(c.x, cy, 1.1);
              s.cam.shake(0.85);
              s.cam.punch(0.11);
              s.flashScreen(0xff3050, 0.42);
              for (const fo of foes) s.view(fo)?.hit(true);
              s.sparks.burst(56, c.x, cy, 0xff4060);
              audio.play('ult_impact', { vol: 0.85 });
              audio.play('crit');
            });
          });
          this.later(0.5, () => s.setTimeScale(1, 4));
          this.at(0.78, () => this.endB());
        }
      },
    };
  }

  /** Éboulement : la montagne tombe du ciel sur le champ de bataille. */
  private gorm(u: Unit): UltScript {
    const s = this.s;
    return {
      max: 3.2,
      start: () => {
        s.setTimeScale(0.82, 10);
        s.dimTarget = 0.5;
        s.barsTarget = 1;
        s.cam.cut({ x: u.x, y: u.y - 150, zoom: 1.34, roll: 0, yaw: 0, pitch: -0.06 });
        s.cam.go({ zoom: 1.52, pitch: 0.02 }, 2.6);
        s.shake(0.25);
      },
      onFx: (e) => {
        if (e.type === 'gorm_charge' && e.u === u) {
          s.debris.burst(26, u.x, u.y);
          s.smoke.burst(12, u.x, u.y, 0x6a6a5a);
          s.speedLinesOn(0.2, PHASE_A, 0x8ad46a);
        } else if (e.type === 'gorm_slam' && e.u === u) {
          const foes = s.sim?.units.filter((x) => x.alive && x.side === 'enemy') ?? [];
          const c = centroid(foes);
          s.cam.cut({ x: c.x - 60, y: c.y - 210, zoom: 1.22, roll: 0, yaw: 0, pitch: 0.03 });
          s.setTimeScale(0.32, Infinity);
          for (let i = 0; i < 14; i++) {
            this.later(i * 0.045, () => {
              if (!s.fighting) return;
              const tx = c.x + rand(-380, 380);
              const ty = c.y + rand(-60, 90);
              const rk = new Sprite(s.bt.ice[i % s.bt.ice.length]!);
              rk.anchor.set(0.5);
              rk.tint = 0x9aa88a;
              rk.position.set(tx + rand(-60, 60), ty - 780);
              rk.scale.set(rand(0.5, 0.9));
              s.anim(rk, s.fxLayer, 0.42, (k) => {
                rk.y = ty - 780 + 780 * k * k;
                rk.rotation += 0.04;
                rk.alpha = k > 0.85 ? (1 - k) / 0.15 : 1;
              });
              this.later(0.4, () => {
                if (!s.fighting) return;
                s.debris.burst(6, tx, ty);
                s.smoke.burst(3, tx, ty, 0x7a7a6a);
                s.sparks.burst(6, tx, ty, 0x8ad46a);
              });
            });
          }
          this.later(0.45, () => {
            s.impactFrame(0.12, 0xd8ffd0);
            s.shockwave(c.x, c.y - 40, 1.5);
            s.cam.shake(1.15);
            s.cam.punch(0.12);
            s.flashScreen(0x8ad46a, 0.4);
            s.hitstop(0.1);
            s.debris.burst(50, c.x, c.y);
            s.smoke.burst(24, c.x, c.y - 40, 0x6a6a5a);
            for (const fo of foes) s.view(fo)?.hit(true);
            audio.play('ult_impact', { vol: 0.9 });
            audio.play('land', { vol: 0.9 });
          });
          this.later(1.0, () => s.setTimeScale(1, 4));
          this.at(1.8, () => this.endB());
        }
      },
    };
  }

  private kael(u: Unit): UltScript {
    const s = this.s;
    const f = u.facing;
    return {
      max: 2.2,
      start: () => {
        s.setTimeScale(0.7, 20);
        s.dimTarget = 0.3;
        const tx = u.leap ? u.leap.tx : u.x;
        s.cam.follow = () => ({ x: (u.x + tx) / 2 + f * 120, y: u.y - 190 - (u.leap ? Math.sin((u.leap.t / u.leap.dur) * Math.PI) * u.leap.height * 0.4 : 0) });
        s.cam.go({ zoom: 1.26, roll: f * 0.035, pitch: 0.1, yaw: -f * 0.06 }, 7, 4);
        s.speedLinesOn(0.3, 0.6, 0xffb070);
      },
      update: (_t, dt) => {
        if (u.leap) {
          this.ghostAcc += dt;
          if (this.ghostAcc > 0.075) { this.ghostAcc = 0; s.afterimage(u, 0xff5a1a, 0.25, 0.32); }
          if (Math.random() < 0.3) s.fire.burst(1, u.x + rand(-40, 40), u.y - 100 - (u.leap ? Math.sin((u.leap.t / u.leap.dur) * Math.PI) * u.leap.height : 0));
        }
      },
      onFx: (e) => {
        if (e.type !== 'kael_slam') return;
        const x = e.x!, y = e.y!;
        s.cam.follow = null;
        s.impactFrame(0.13);
        s.setTimeScale(0.12, Infinity);
        s.cam.cut({ x, y: y - 130, zoom: 1.5, roll: -f * 0.06, pitch: 0.17, yaw: f * 0.04 });
        s.cam.punch(0.12);
        s.cam.go({ zoom: 1.22, roll: 0, pitch: 0.06, yaw: 0 }, 2.6);
        s.zoomBlurAt(x, y - 60, 0.12, 0.35);
        s.speedLinesOn(0.5, 0.3, 0xffc080);
        this.later(0.28, () => s.setTimeScale(1, 3));
        this.at(0.7, () => this.endB());
      },
    };
  }

  /** Lyra — Danse écarlate : montage nerveux de coupes franches, traînées rouges, X final. */
  private lyra(u: Unit): UltScript {
    const s = this.s;
    let n = 0;
    return {
      max: 2.8,
      start: () => {
        s.setTimeScale(0.85, 10);
        s.dimTarget = 0.5;
        s.barsTarget = 1;
      },
      onFx: (e) => {
        if (e.type === 'lyra_blink' && e.u === u) {
          const side = n % 2 === 0 ? 1 : -1;
          n++;
          // L'image rémanente reste à l'ancienne position
          s.afterimage(u, 0xff2a4a, 0.4, 0.75);
          s.cam.cut({ x: u.x - u.facing * 40, y: u.y - 140, zoom: 1.42 + (n % 3) * 0.09, roll: side * 0.07, yaw: side * 0.13, pitch: 0.05 });
          s.cam.go({ zoom: 1.6 + (n % 3) * 0.09, roll: side * 0.02, yaw: side * 0.05 }, 2.2);
          s.speedLinesOn(0.45, 0.16, 0xff5070);
        } else if (e.type === 'lyra_slash' && e.u === u) {
          s.hitstop(0.055);
          s.flashScreen(0xff2a4a, 0.12);
          s.cam.shake(0.35);
          s.cam.punch(0.04);
        } else if (e.type === 'lyra_ult_end') {
          const foes = s.sim?.units.filter((x) => x.alive && x.side === 'enemy') ?? [];
          const c = centroid(foes);
          s.cam.cut({ x: c.x, y: c.y - 170, zoom: 1.2, roll: 0, yaw: 0, pitch: 0 });
          s.setTimeScale(0.35, Infinity);
          // Grand X qui déchire l'écran
          const cy = c.y - 150;
          s.streak(c.x - 700, cy - 380, c.x + 700, cy + 380, 0xff2a4a, 4, 0.7);
          this.later(0.09, () => {
            s.streak(c.x + 700, cy - 380, c.x - 700, cy + 380, 0xff2a4a, 4, 0.7);
            s.impactFrame(0.12);
            s.shockwave(c.x, cy, 1);
            s.cam.shake(0.8);
            s.cam.punch(0.1);
            s.flashScreen(0xff2a4a, 0.4);
            for (const fo of foes) s.view(fo)?.hit(true);
            s.sparks.burst(50, c.x, cy, 0xff4060);
            audio.play('ult_impact', { vol: 0.85 });
            audio.play('crit');
          });
          this.later(0.45, () => s.setTimeScale(1, 4));
          this.at(0.75, () => this.endB());
        }
      },
    };
  }

  /** Morwen — Peste noire : plongée sur un cercle runique géant, éclairs, âmes qui s'élèvent. */
  private morwen(_u: Unit): UltScript {
    const s = this.s;
    const foes = s.sim?.units.filter((x) => x.alive && x.side === 'enemy') ?? [];
    const c = centroid(foes);
    let rune: Sprite | null = null;
    return {
      max: 2.2,
      start: () => {
        s.setTimeScale(0.6, 10);
        s.dimTarget = 0.6;
        s.cam.go({ x: c.x - 40, y: c.y - 150, zoom: 1.28, pitch: 0.2, roll: 0.025, yaw: -0.05 }, 4.5, 3.5);
        // Cercle runique qui se forme sous les ennemis
        const r = new Sprite(s.bt.rune);
        rune = r;
        r.anchor.set(0.5);
        r.tint = 0x9a4aff;
        r.position.set(c.x, c.y + 10);
        s.anim(r, s.groundFx, 2.2, (k, dt) => {
          const grow = Math.min(1, k / 0.18);
          const sc = 1.7 * (1 - Math.pow(1 - grow, 3));
          r.scale.set(sc, sc * 0.32);
          r.rotation += dt * 1.2;
          r.alpha = k < 0.75 ? 1 : (1 - k) * 4;
        });
        const r2 = new Sprite(s.bt.rune);
        r2.anchor.set(0.5);
        r2.tint = 0x5affc0;
        r2.position.set(c.x, c.y + 10);
        s.anim(r2, s.groundFx, 2.2, (k, dt) => {
          const grow = Math.min(1, Math.max(0, (k - 0.05) / 0.18));
          const sc = 1.0 * (1 - Math.pow(1 - grow, 3));
          r2.scale.set(sc, sc * 0.32);
          r2.rotation -= dt * 2;
          r2.alpha = (k < 0.75 ? 0.8 : (1 - k) * 3.2);
        });
        for (let i = 0; i < 16; i++) s.wisps.burst(1, c.x + Math.cos(i) * 300, c.y + Math.sin(i) * 90);
      },
      update: () => {
        if (Math.random() < 0.5) {
          const a = Math.random() * Math.PI * 2;
          s.wisps.burst(1, c.x + Math.cos(a) * 320, c.y + Math.sin(a) * 100);
        }
      },
      onFx: (e) => {
        if (e.type !== 'morwen_plague') return;
        s.impactFrame(0.1);
        s.shockwave(c.x, c.y - 60, 0.9);
        s.cam.punch(0.09);
        s.cam.shake(0.6);
        s.cam.go({ zoom: 1.18, pitch: 0.12, roll: -0.02, yaw: 0.03 }, 2);
        s.setTimeScale(0.4, Infinity);
        if (rune) rune.tint = 0xd0a0ff;
        const targets = e.targets ?? [];
        targets.forEach((t, i) => {
          const strike = (): void => {
            const v = s.view(t);
            if (!v) return;
            s.lightning(t.x + rand(-140, 140), t.y - 980, v.chest.x, v.chest.y, i % 2 ? 0x7affc0 : 0xb055ff, 7, 0.32);
            s.fxSprite(s.bt.crack, t.x, t.y, { tint: 0x9a4aff, life: 1, scale: [0.4, 0.55], alpha: [1, 0], flatten: 0.3, ease: 'linear' });
            s.plague.burst(10, v.chest.x, v.chest.y);
            v.hit(true);
          };
          this.later(i * 0.06, strike);
          this.later(0.22 + i * 0.05, strike);
        });
        this.later(0.55, () => s.setTimeScale(1, 4));
        this.at(0.95, () => this.endB());
      },
    };
  }

  /** Seren — Pluie d'étoiles : flèche tirée vers le ciel, la caméra la suit puis bascule sur la pluie. */
  private seren(u: Unit): UltScript {
    const s = this.s;
    const foes = s.sim?.units.filter((x) => x.alive && x.side === 'enemy') ?? [];
    const c = centroid(foes);
    let volleys = 0;
    return {
      max: 2.4,
      start: () => {
        s.setTimeScale(0.7, 10);
        s.dimTarget = 0.45;
        const v = s.view(u);
        const sx = u.x + u.facing * 50, sy = (v?.chest.y ?? u.y - 150) - 30;
        s.cam.go({ x: u.x + 140, y: u.y - 360, zoom: 1.32, pitch: -0.1, roll: -0.04, yaw: 0.04 }, 5, 4);
        // Flèche de lumière vers le ciel
        const arrow = new Sprite(s.bt.arrow);
        arrow.anchor.set(1, 0.5);
        arrow.tint = 0xcff0ff;
        arrow.blendMode = 'add';
        arrow.rotation = -Math.PI / 2 + 0.12;
        const ex = sx + 140, ey = sy - 1100;
        s.anim(arrow, s.fxLayer, 0.38, (k) => {
          const e = k * k;
          arrow.position.set(sx + (ex - sx) * e, sy + (ey - sy) * e);
          arrow.scale.set(2.6, 2.2);
        });
        s.streak(sx, sy, ex, ey, 0x9ad8ff, 1.6, 0.6);
        s.fxSprite(s.fx.glow, sx, sy, { tint: 0x9ad8ff, life: 0.4, scale: [0.4, 2], alpha: [1, 0] });
        s.sparks.burst(20, sx, sy, 0xcff0ff);
        // Puis la caméra bascule sur les ennemis, sous un portail d'étoiles
        this.at(0.36, () => {
          s.cam.go({ x: c.x - 60, y: c.y - 220, zoom: 1.2, pitch: 0.14, roll: 0.03, yaw: -0.04 }, 3.2, 2.5);
          s.flashScreen(0x9ad8ff, 0.25);
          const portal = new Sprite(s.bt.rune);
          portal.anchor.set(0.5);
          portal.tint = 0x9ad8ff;
          portal.blendMode = 'add';
          portal.position.set(c.x - 180, c.y - 720);
          s.anim(portal, s.fxLayer, 2.1, (k, dt) => {
            const g = Math.min(1, k / 0.15);
            portal.scale.set(1.5 * g, 1.5 * g * 0.35);
            portal.rotation += dt * 1.5;
            portal.alpha = k < 0.8 ? 0.9 : (1 - k) * 4.5;
          });
          s.fxSprite(s.fx.glowSoft, c.x - 180, c.y - 720, { tint: 0x9ad8ff, life: 2, scale: [2, 3], alpha: [0.7, 0] });
        });
      },
      onFx: (e) => {
        if (e.type !== 'seren_volley') return;
        volleys++;
        s.cam.shake(0.22);
        s.cam.punch(0.015);
        // Pluie plus dense que la volée simulée : flèches supplémentaires purement visuelles
        for (let i = 0; i < 8; i++) {
          const tx = c.x + rand(-320, 320), ty = c.y + rand(-90, 90);
          s.fallingArrow(tx - 200, ty - 760, tx, ty, 0.26 + Math.random() * 0.08);
        }
        if (volleys === 1) s.setTimeScale(0.85, 4);
        if (volleys === 3) this.at(0.35, () => this.endB());
      },
    };
  }

  /** Aldric — Sanctuaire : cercle doré, colonne de lumière divine, plumes. */
  /* ====================== Ultimes des trois héros ====================== */

  /**
   * Vaelen — Rempart Écarlate.
   * Lecture : il plante son bouclier (contre-plongée héroïque) → un mur de flammes traverse
   * le champ de bataille (caméra qui accompagne le mur) → tout explose au bout.
   */
  private vaelen(u: Unit): UltScript {
    const s = this.s;
    const f = u.facing;
    return {
      max: 3.5,
      start: () => {
        s.setTimeScale(0.65, 12);
        s.dimTarget = 0.34;
        const v = s.view(u);
        // Contre-plongée : on regarde le tank depuis le sol, il paraît immense.
        s.cam.go({ x: u.x + f * 70, y: (v?.chest.y ?? u.y - 150) + 40, zoom: 1.44, roll: f * 0.045, pitch: -0.1, yaw: -f * 0.05 }, 6, 4);
        s.speedLinesOn(0.4, 0.8, 0xff9a4a);
        for (let i = 0; i < 14; i++) s.fire.burst(1, u.x + rand(-120, 120), u.y - rand(0, 180));
      },
      update: () => {
        if (Math.random() < 0.3) s.motes.burst(1, u.x + rand(-220, 220), u.y + rand(-40, 40), 0xffc06a);
      },
      onFx: (e) => {
        if (e.type === 'vaelen_wall') {
          const x = e.x ?? u.x, y = e.y ?? u.y;
          // Le mur part du héros : la caméra le suit de profil, en légère contre-plongée.
          s.cam.follow = null;
          s.cam.go({ x: x - f * 60, y: y - 170, zoom: 1.06, roll: -f * 0.03, pitch: 0.03, yaw: f * 0.04 }, 2.4);
          s.setTimeScale(0.42, 16);
          s.cam.shake(0.5);
          s.flashScreen(0xffa050, 0.26);
          s.rgbSplit(8, 0.22);
          this.later(0.45, () => s.setTimeScale(0.85, 8));
        }
        if (e.type === 'vaelen_burst') {
          const x = e.x ?? 0, y = e.y ?? 0;
          // Le point d'orgue : arrêt sur image, puis explosion en ralenti.
          s.impactFrame(0.12, 0xffe0b0);
          s.setTimeScale(0.14, Infinity);
          s.cam.cut({ x, y: y - 140, zoom: 1.38, roll: -f * 0.05, pitch: 0.15, yaw: f * 0.03 });
          s.cam.punch(0.11);
          s.cam.shake(1);
          s.shockwave(x, y, 1.35);
          s.rgbSplit(15, 0.3);
          s.speedLinesOn(0.6, 0.4, 0xffc080);
          this.later(0.3, () => s.setTimeScale(1, 3));
          this.at(0.9, () => this.endB());
        }
      },
    };
  }

  /**
   * Sylvaine — Bois des Suppliciés.
   * Lecture : elle arme (on s'écarte pour voir le terrain) → la forêt de ronces jaillit
   * (caméra secouée, vert) → chaque flèche claque avec un micro-coup de zoom.
   */
  private sylvaine(u: Unit): UltScript {
    const s = this.s;
    const f = u.facing;
    let shots = 0;
    return {
      max: 3.3,
      start: () => {
        s.setTimeScale(0.5, 14);
        s.dimTarget = 0.42;
        // Large : on doit voir les ronces pousser sur toute la largeur.
        s.cam.follow = () => ({ x: u.x + f * 190, y: u.y - 150 });
        s.cam.go({ zoom: 0.93, roll: f * 0.03, pitch: 0.07, yaw: -f * 0.04 }, 5, 4);
        s.speedLinesOn(0.35, 0.9, 0x8aff9a);
      },
      update: (_t, dt) => {
        this.ghostAcc += dt;
        if (this.ghostAcc > 0.085) { this.ghostAcc = 0; s.afterimage(u, 0x6aff8a, 0.22, 0.26); }
      },
      onFx: (e) => {
        if (e.type === 'sylvaine_forest') {
          const x = e.x ?? u.x, y = e.y ?? u.y;
          s.cam.follow = null;
          s.setTimeScale(0.3, 16);
          s.flashScreen(0x8aff9a, 0.22);
          s.rgbSplit(7, 0.2);
          s.cam.shake(0.55);
          s.cam.go({ x, y: y - 165, zoom: 1.09, roll: 0, pitch: 0.05, yaw: 0 }, 2.2);
          for (let i = 0; i < 20; i++) s.sparks.burst(1, x + rand(-400, 400), y - rand(0, 300), 0xbaffc8);
          this.later(0.4, () => s.setTimeScale(0.9, 8));
        }
        if (e.type === 'sylvaine_thorn') {
          // Chaque flèche : micro-secousse qui donne le rythme de la salve.
          shots++;
          s.cam.punch(0.028 + shots * 0.004);
          s.cam.shake(0.2);
          s.hitstop(0.02);
        }
      },
    };
  }

  /**
   * Pyrrha — Jugement de Flammes.
   * Lecture : le ciel s'ouvre (caméra qui lève les yeux) → les météores tombent, la caméra
   * les suit → l'impact au sol fait trembler l'image.
   */
  private pyrrha(u: Unit): UltScript {
    const s = this.s;
    const f = u.facing;
    let meteors = 0;
    return {
      max: 3.6,
      start: () => {
        s.setTimeScale(0.6, 12);
        s.dimTarget = 0.55;
        // On lève les yeux : le ciel devient le décor principal.
        s.cam.follow = () => ({ x: u.x + f * 50, y: u.y - 340 });
        s.cam.go({ zoom: 1.1, roll: -f * 0.05, pitch: -0.13, yaw: f * 0.04 }, 5, 4);
        s.speedLinesOn(0.45, 1, 0xffa050);
        s.flashScreen(0xff6a2a, 0.16);
        for (let i = 0; i < 12; i++) s.fire.burst(1, u.x + rand(-180, 180), u.y - rand(120, 360));
      },
      update: () => {
        if (Math.random() < 0.35) s.motes.burst(1, u.x + rand(-300, 300), u.y + rand(-60, 60), 0xffc06a);
      },
      onFx: (e) => {
        if (e.type === 'pyrrha_meteor') {
          meteors++;
          const x = e.x ?? 0, y = e.y ?? 0;
          s.cam.follow = null;
          // La caméra plonge avec le météore.
          s.cam.go({ x, y: y - 210, zoom: 1.18, roll: (meteors % 2 ? 1 : -1) * 0.03, pitch: 0.06, yaw: 0 }, 3.2);
        }
        if (e.type === 'pyrrha_impact' || e.type === 'pyrrha_wave') {
          const x = e.x ?? 0, y = e.y ?? 0;
          s.shockwave(x, y, 1.15);
          s.cam.shake(0.62);
          s.rgbSplit(10, 0.22);
          if (meteors <= 1) s.impactFrame(0.1, 0xffd0a0);
        }
      },
    };
  }

  /**
   * Mira — Salve de Forge.
   * Lecture : on colle à l'arme, puis chaque trait est une coupe franche alternée
   * (épaule de Mira → impact chez la cible). Six tirs, six images, un rechargement.
   */
  private mira(u: Unit): UltScript {
    const s = this.s;
    const f = u.facing;
    let shots = 0;
    return {
      max: 2.6,
      start: () => {
        s.setTimeScale(0.6, 12);
        s.dimTarget = 0.4;
        s.cam.follow = () => ({ x: u.x + f * 110, y: u.y - 150 });
        s.cam.go({ zoom: 1.24, roll: -f * 0.05, pitch: 0.08, yaw: f * 0.05 }, 5, 4);
        s.speedLinesOn(0.4, 0.8, 0x7afff0);
      },
      update: (_t, dt) => {
        this.ghostAcc += dt;
        if (this.ghostAcc > 0.07) { this.ghostAcc = 0; s.afterimage(u, 0x4ae0c8, 0.2, 0.24); }
        if (Math.random() < 0.45) s.sparks.burst(1, u.x + f * 76 + rand(-16, 16), u.y - 158 + rand(-12, 12), 0x9afff0);
      },
      onFx: (e) => {
        if (e.type === 'mira_shot') {
          shots++;
          const v = s.view(e.target);
          s.cam.follow = null;
          s.hitstop(0.018);
          s.cam.punch(0.03 + shots * 0.006);
          s.cam.shake(0.12);
          if (v) {
            // Une coupe sur deux montre l'impact : le reste appartient à Mira.
            if (shots % 2 === 1) {
              s.cam.cut({ x: v.chest.x - f * 40, y: v.chest.y, zoom: 1.55, roll: f * 0.04, pitch: 0.05, yaw: -f * 0.03 });
            } else {
              s.cam.cut({ x: u.x + f * 54, y: u.y - 152, zoom: 1.38, roll: -f * 0.06, pitch: 0.07, yaw: f * 0.05 });
            }
            s.zoomBlurAt(v.chest.x, v.chest.y, 0.06, 0.22);
          }
          if (shots === 6) {
            s.impactFrame(0.12, 0x9afff0);
            s.rgbSplit(8, 0.2);
            s.flashScreen(0x7afff0, 0.18);
          }
          return;
        }
        if (e.type === 'mira_reload') {
          // La vapeur du chargeur, et la caméra qui s'écarte : le travail est fait.
          const v = s.view(u);
          const c = v ? v.chest : { x: u.x, y: u.y - 150 };
          for (let i = 0; i < 10; i++) s.smoke.burst(1, c.x + rand(-24, 24), c.y + rand(-24, 24), 0xbfe8ff);
          s.cam.follow = null;
          s.cam.go({ x: u.x + f * 140, y: u.y - 200, zoom: 1.02, roll: 0, pitch: 0.06, yaw: 0 }, 3);
          s.setTimeScale(1, 5);
          this.at(0.8, () => this.endB());
        }
      },
    };
  }

  /**
   * Corvin — Jugement Différé.
   * Lecture : la lumière s'accumule dans la lame (contre-plongée immobile), puis la
   * sentence tombe : travelling latéral qui accompagne le balayage, et l'équipe s'illumine.
   */
  private corvin(u: Unit): UltScript {
    const s = this.s;
    const f = u.facing;
    let struck = false;
    return {
      max: 2.7,
      start: () => {
        s.setTimeScale(0.55, 10);
        s.dimTarget = 0.5;
        s.cam.follow = () => ({ x: u.x + f * 70, y: u.y - 180 });
        s.cam.go({ zoom: 1.45, roll: f * 0.03, pitch: -0.07, yaw: -f * 0.04 }, 4.5, 4);
      },
      update: () => {
        if (!struck && Math.random() < 0.5) s.motes.burst(1, u.x + rand(-70, 70), u.y - rand(170, 300), 0xffe9a8);
      },
      onFx: (e) => {
        if (e.type !== 'corvin_judgement' || struck) return;
        struck = true;
        const x = e.x ?? u.x;
        const y = e.y ?? u.y;
        s.cam.follow = null;
        s.impactFrame(0.14, 0xfff6d0);
        s.setTimeScale(0.14, Infinity);
        // Le balayage part de lui et file vers la droite : la caméra le suit.
        s.cam.cut({ x: x + 240, y: y - 175, zoom: 1.14, roll: 0.02, pitch: 0.05, yaw: 0.02 });
        s.cam.go({ x: x + 540, y: y - 150, zoom: 1.04, roll: 0, pitch: 0.03, yaw: 0 }, 1.7);
        s.rgbSplit(12, 0.3);
        s.cam.shake(0.8);
        s.flashScreen(0xfff6d0, 0.3);
        this.later(0.3, () => s.setTimeScale(1, 4));
        // Les alliés relevés s'allument un par un.
        const allies = s.sim?.units.filter((a) => a.alive && a.side === 'hero') ?? [];
        allies.forEach((a, i) => {
          const v = s.view(a);
          if (!v) return;
          this.later(0.06 * i, () => {
            s.fxSprite(s.bt.star, v.chest.x, v.chest.y, { tint: 0xfff0c0, life: 0.7, scale: [0.3, 0.95], alpha: [0.9, 0], vrot: 1.2 });
            s.motes.burst(6, v.chest.x, v.chest.y, 0xfff6d0);
          });
        });
        this.at(1.1, () => this.endB());
      },
    };
  }

  /**
   * Elara — Chœur des Sept.
   * Lecture : gros plan sur le voile, puis la caméra s'élève et recule d'un coup pour
   * révéler toute l'équipe baignée de lumière — l'ultime est un soin, il doit se voir large.
   */
  private elara(u: Unit): UltScript {
    const s = this.s;
    const f = u.facing;
    let sang = false;
    return {
      max: 3,
      start: () => {
        s.setTimeScale(0.45, 8);
        s.dimTarget = 0.45;
        s.cam.follow = () => ({ x: u.x + f * 40, y: u.y - 210 });
        s.cam.go({ x: u.x + f * 40, y: u.y - 235, zoom: 1.32, roll: -f * 0.02, pitch: 0.1, yaw: f * 0.03 }, 3.6, 3);
        for (let i = 0; i < 10; i++) s.feathers.burst(1, u.x + rand(-320, 320), u.y - rand(420, 700));
      },
      update: () => {
        if (Math.random() < 0.5) s.motes.burst(1, u.x + rand(-260, 260), u.y + rand(-90, 30), 0xfff0c0);
      },
      onFx: (e) => {
        if (e.type !== 'elara_wave' || sang) return;
        sang = true;
        s.cam.follow = null;
        const allies = e.targets ?? [];
        const c = centroid(allies.length ? allies : [u]);
        s.setTimeScale(0.35, 10);
        // Plan large : le soin d'équipe se lit d'un seul regard.
        s.cam.go({ x: c.x + 40, y: c.y - 250, zoom: 0.94, roll: 0, pitch: 0.06, yaw: 0 }, 2.4);
        s.flashScreen(0xfff6d0, 0.25);
        s.shockwave(c.x, c.y, 1.2);
        for (let i = 0; i < 22; i++) s.feathers.burst(1, c.x + rand(-520, 520), c.y - rand(300, 800));
        allies.forEach((a, i) => {
          const v = s.view(a);
          if (!v) return;
          this.later(0.05 * i, () => {
            s.fxSprite(s.bt.sigil, v.chest.x, v.chest.y, { tint: 0xfff0c0, life: 0.9, scale: [0.3, 1.4], alpha: [0.9, 0], vrot: 0.8 });
            s.motes.burst(8, v.chest.x, v.chest.y, 0xfff6d0);
          });
        });
        this.later(0.5, () => s.setTimeScale(1, 5));
        this.at(1.2, () => this.endB());
      },
    };
  }

  private aldric(_u: Unit): UltScript {
    const s = this.s;
    const allies = s.sim?.units.filter((x) => x.alive && x.side === 'hero') ?? [];
    const c = centroid(allies);
    return {
      max: 2.2,
      start: () => {
        s.setTimeScale(0.6, 10);
        s.dimTarget = 0.5;
        s.cam.go({ x: c.x + 40, y: c.y - 190, zoom: 1.24, pitch: 0.13, roll: -0.025, yaw: 0.05 }, 4.5, 3.5);
        const r = new Sprite(s.bt.rune);
        r.anchor.set(0.5);
        r.tint = 0xffd36a;
        r.position.set(c.x, c.y + 10);
        s.anim(r, s.groundFx, 2.2, (k, dt) => {
          const g = Math.min(1, k / 0.18);
          const sc = 2.0 * (1 - Math.pow(1 - g, 3));
          r.scale.set(sc, sc * 0.3);
          r.rotation += dt * 0.8;
          r.alpha = k < 0.75 ? 1 : (1 - k) * 4;
        });
        s.fxSprite(s.fx.rays, c.x, c.y - 300, { tint: 0xffe08a, life: 1.6, scale: [0.6, 2.4], alpha: [0.6, 0], vrot: 0.4 });
        for (let i = 0; i < 12; i++) s.feathers.burst(1, c.x + rand(-420, 420), c.y - rand(500, 800));
      },
      update: () => {
        if (Math.random() < 0.3) s.motes.burst(1, c.x + rand(-380, 380), c.y + rand(-40, 60), 0xfff0a0);
      },
      onFx: (e) => {
        if (e.type !== 'aldric_sanctuary') return;
        s.cam.punch(0.06);
        s.cam.go({ zoom: 1.14, pitch: 0.06, roll: 0, yaw: 0 }, 2);
        s.shockwave(c.x, c.y - 100, 0.6);
        s.zoomBlurAt(c.x, c.y - 300, 0.08, 0.4);
        // Colonne de lumière divine au centre
        s.fxSprite(s.bt.beam, c.x, c.y + 30, { tint: 0xffe08a, life: 1.1, scale: [1, 1], alpha: [1, 0], anchorY: 1, sx: 9, sy: 6 });
        s.fxSprite(s.bt.beam, c.x, c.y + 30, { tint: 0xffffff, life: 0.7, scale: [1, 1], alpha: [1, 0], anchorY: 1, sx: 3.5, sy: 6.5 });
        for (let i = 0; i < 26; i++) s.feathers.burst(1, c.x + rand(-500, 500), c.y - rand(400, 900));
        this.later(0.4, () => s.setTimeScale(1, 4));
        this.at(1.0, () => this.endB());
      },
    };
  }

  /* ====================== Mini-séquences ====================== */

  private startEvent(dur: number): void {
    this.phase = 'event';
    this.t = 0;
    this.eventEnd = dur;
  }

  private endEvent(): void {
    const s = this.s;
    this.phase = 'idle';
    s.barsTarget = 0;
    s.setTimeScale(1, 4);
  }

  /** Le boss entre en rage : zoom brutal, rugissement au ralenti. */
  private enrage(boss: Unit): void {
    const s = this.s;
    const v = s.view(boss);
    if (!v) return;
    this.startEvent(1.0);
    s.barsTarget = 1;
    s.cam.go({ x: boss.x - boss.facing * -40, y: v.chest.y - 20, zoom: 1.5, roll: 0.045, pitch: 0, yaw: 0 }, 9);
    s.setTimeScale(0.25, 20);
    s.cam.shake(0.85);
    s.flashScreen(0xff1a3a, 0.35);
    s.shockwave(v.chest.x, v.chest.y, 0.7);
    s.zoomBlurAt(v.chest.x, v.chest.y, 0.1, 0.5);
    s.speedLinesOn(0.4, 0.8, 0xff3050);
  }

  /**
   * Ouverture du niveau : la caméra file sur le boss et le monde s'éteint
   * pendant que la carte de titre s'inscrit.
   *
   * Aucun impact sur la simulation : on est encore dans l'intro, les héros
   * courent vers leur position. Rien ne peut être touché « hors champ ».
   */
  bossIntro(): void {
    const s = this.s;
    const boss = s.sim?.units.find((u) => u.side === 'enemy' && u.isBoss);
    if (!boss) return;
    const v = s.view(boss);
    s.dimTarget = 0.55;
    s.cam.follow = null;
    s.cam.cut({ x: boss.x - 40, y: v ? v.chest.y + 40 : boss.y - 120, zoom: 1.5, roll: 0, pitch: 0.06, yaw: -0.04 });
    s.cam.go({ x: boss.x - 10, y: v ? v.chest.y + 20 : boss.y - 100, zoom: 1.4, roll: 0, pitch: 0.03, yaw: -0.02 }, 2.2);
    audio.play('boss_roar', { vol: 0.7, delay: 0.25 });
    this.later(1.15, () => { s.dimTarget = 0; });
  }

  /**
   * Second souffle du boss : il ne meurt pas, il s'énerve.
   * Un coup de zoom bref, un flash rouge et un rugissement — le combat continue derrière.
   */
  bossPhase(): void {
    const s = this.s;
    const boss = s.sim?.units.find((u) => u.side === 'enemy' && u.isBoss && u.alive);
    if (!boss) return;
    const v = s.view(boss);
    s.cam.cut({ x: boss.x - 30, y: v ? v.chest.y + 30 : boss.y, zoom: 1.62, roll: 0.03, pitch: 0.08, yaw: -0.03 });
    s.cam.go({ x: boss.x, y: v ? v.chest.y + 20 : boss.y - 80, zoom: 1.3, roll: 0, pitch: 0.02, yaw: 0 }, 2.4);
    s.cam.shake(0.85);
    s.flashScreen(0xff3a2a, 0.32);
    s.setTimeScale(0.35, 0.34);
    audio.play('boss_roar', { vol: 0.55, rate: 1.15 });
    this.later(0.9, () => { if (this.phase === 'idle') s.cam.follow = null; });
  }

  /** Mort du boss : image d'impact, ralenti dramatique. */
  bossDeath(boss: Unit): void {
    const s = this.s;
    const v = s.view(boss);
    if (this.phase === 'B') this.endB();
    this.queue.length = 0;
    this.startEvent(1.3);
    s.barsTarget = 1;
    s.impactFrame(0.16);
    s.worldDrain(1.6);
    s.setTimeScale(0.18, Infinity);
    if (v) {
      s.cam.go({ x: boss.x, y: v.chest.y, zoom: 1.42, roll: -0.05, pitch: 0.05, yaw: 0 }, 6);
      s.shockwave(v.chest.x, v.chest.y, 1.2);
    }
    s.cam.shake(1);
    s.flashScreen(0xffffff, 0.5);
    audio.duck(0.3, 0.6, 1);
  }

  /** Fin du combat : la caméra se pose sur les héros victorieux (ou s'éloigne en cas de défaite). */
  ending(winner: Side): void {
    const s = this.s;
    this.queue.length = 0;
    const delay = this.phase === 'event' ? Math.max(0, this.eventEnd - this.t) : 0;
    if (this.phase === 'B' || this.phase === 'A') this.endB();
    this.later(delay + 0.05, () => {
      this.phase = 'end';
      s.barsTarget = 1;
      if (winner === 'hero') {
        const heroes = s.sim?.units.filter((x) => x.alive && x.side === 'hero' && !x.isSummon) ?? [];
        const c = centroid(heroes);
        s.setTimeScale(0.5, Infinity);
        this.later(0.5, () => s.setTimeScale(1, 3));
        s.cam.go({ x: c.x + 60, y: c.y - 170, zoom: 1.3, roll: 0, pitch: 0, yaw: 0 }, 2);
        heroes.forEach((h) => s.view(h)?.cheer());
        audio.play('star', { delay: 0.3 });
      } else {
        s.setTimeScale(0.5, 4);
        s.cam.go({ x: 760, y: 600, zoom: 1.12, roll: -0.03, pitch: 0, yaw: 0 }, 0.8);
      }
    });
  }
}

function tick(list: Timer[], dt: number): void {
  if (dt <= 0 || !list.length) return;
  // Copie : un callback peut ajouter de nouvelles temporisations
  const due: Timer[] = [];
  for (let i = list.length - 1; i >= 0; i--) {
    const t = list[i]!;
    t.left -= dt;
    if (t.left <= 0) { due.push(t); list.splice(i, 1); }
  }
  for (let i = due.length - 1; i >= 0; i--) due[i]!.fn();
}
