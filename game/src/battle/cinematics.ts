import { Sprite } from 'pixi.js';
import { audio } from '../audio/AudioEngine';
import { rand } from '../utils/math';
import type { BattleScene } from './BattleScene';
import { NYX_ECLIPSE, THORNE_WAVE_SPEED, type FxEvent, type Side, type Unit } from './Sim';

/** Durée (temps réel) de l'élan commun à tous les ultimes : combat figé, zoom, illustration. */
const PHASE_A = 0.8;

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
  private phase: 'idle' | 'A' | 'B' | 'event' | 'end' = 'idle';
  /** Héros dont l'ultime est en cours. */
  caster: Unit | null = null;
  private readonly queue: Unit[] = [];
  private t = 0;
  private script: UltScript | null = null;
  private readonly realTimers: Timer[] = [];
  private readonly gameTimers: Timer[] = [];
  private eventEnd = 0;
  private ghostAcc = 0;

  constructor(private readonly s: BattleScene) {}

  /** Le combat est-il figé (élan d'un ultime) ? */
  get frozen(): boolean { return this.phase === 'A'; }
  /** Une séquence d'ultime est-elle en cours ou en attente ? */
  get busy(): boolean { return this.phase === 'A' || this.phase === 'B' || this.queue.length > 0; }
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
    if (this.phase === 'idle' || this.phase === 'event') { this.startA(u); return true; }
    this.queue.push(u);
    return true;
  }

  update(realDt: number, gameDt: number): void {
    tick(this.realTimers, realDt);
    tick(this.gameTimers, gameDt);
    const s = this.s;
    switch (this.phase) {
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
        this.script?.update?.(this.t, gameDt);
        if (this.t >= (this.script?.max ?? 0)) this.endB();
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
      if (s.sim?.canUltimate(next) && s.fighting) this.startA(next);
    }
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
    // Anneau d'énergie qui se resserre sur le héros
    const ring = new Sprite(s.bt.rune);
    ring.anchor.set(0.5);
    ring.tint = col;
    ring.blendMode = 'add';
    ring.position.set(u.x, u.y);
    s.anim(ring, s.groundFx, PHASE_A, (k) => {
      const sc = (1.4 - k * 0.9) * 0.9;
      ring.scale.set(sc, sc * 0.3);
      ring.rotation = k * 4;
      ring.alpha = Math.min(1, k * 4) * (1 - Math.pow(k, 6));
    }, true);
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
    if (!u || !s.sim || !s.sim.ultimate(u)) { this.endB(); return; }
    this.phase = 'B';
    this.t = 0;
    this.ghostAcc = 0;
    this.script = this.makeScript(u);
    this.script.start();
  }

  /** Appelé par la scène pour chaque événement d'effet de la simulation. */
  onFx(e: FxEvent): void {
    if (this.phase === 'B' && this.script?.onFx) this.script.onFx(e);
    if (e.type === 'enrage' && e.u && (this.phase === 'idle')) this.enrage(e.u);
  }

  onCast(_u: Unit, _ability: 'skill' | 'ultimate'): void {
    // (réservé : petits zooms sur les compétences)
  }

  private endB(): void {
    const s = this.s;
    this.phase = 'idle';
    this.script = null;
    this.caster = null;
    this.gameTimers.length = 0;
    s.cam.follow = null;
    s.spotlight(null);
    s.dimTarget = 0;
    s.barsTarget = 0;
    s.setTimeScale(1, 6);
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

  /** Mort du boss : image d'impact, ralenti dramatique. */
  bossDeath(boss: Unit): void {
    const s = this.s;
    const v = s.view(boss);
    if (this.phase === 'B') this.endB();
    this.queue.length = 0;
    this.startEvent(1.3);
    s.barsTarget = 1;
    s.impactFrame(0.16);
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
