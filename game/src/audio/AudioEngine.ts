/**
 * Moteur audio.
 * - Combat : vrais bruitages enregistrés (CC0), mixés et superposés, joués avec de légères variations
 *   de hauteur et de volume pour ne jamais sonner répétitif ; musique épique en boucle ; « ducking »
 *   (la musique s'efface sous les gros impacts) et filtre de musique pendant les cinématiques d'ultime.
 * - Ville : ambiance générée par le code (vent, feu, portail, tonnerre, enclume).
 * Le son démarre au premier clic (règle des navigateurs).
 */

const FILES = import.meta.glob('../assets/sfx/*.ogg', { eager: true, query: '?url', import: 'default' }) as Record<string, string>;

/** Volume de base de chaque bruitage (linéaire), pour équilibrer le mixage. */
const GAIN: Record<string, number> = {
  hit: 0.5, hit_heavy: 0.75, crit: 0.8, swing_l: 0.45, swing_h: 0.6, bow: 0.55, arrow_hit: 0.5,
  orb_cast: 0.42, orb_hit: 0.45, light_cast: 0.45, heal: 0.55, block: 0.6, shield_up: 0.7,
  skel_atk: 0.5, ghoul_atk: 0.5, ghoul_die: 0.55, skel_die: 0.6, hero_down: 0.7, stun: 0.6,
  blink: 0.55, summon: 0.7, plague: 0.75, fire_burst: 0.85, land: 0.9, explosion: 0.9, arrow_rain: 0.9,
  choir: 0.95, riser: 0.75, cutin: 0.8, braam: 0.95, ult_impact: 1, ult_ready: 0.45,
  boss_windup: 0.8, boss_slam: 1, boss_roar: 0.95, boss_die: 1, defeat: 0.8, star: 0.6, coins: 0.7,
  ui_click: 0.5, ui_hover: 0.28, ui_open: 0.45, ui_close: 0.4, ui_confirm: 0.5,
};

export interface PlayOpts {
  /** Multiplicateur de volume. */
  vol?: number;
  /** Vitesse de lecture (1 = normale, <1 = plus grave). */
  rate?: number;
  /** Panoramique −1 (gauche) … 1 (droite). */
  pan?: number;
  /** Délai en secondes. */
  delay?: number;
  /** Amplitude de la variation aléatoire de hauteur (0.05 = ±5 %). */
  vary?: number;
}

export class AudioEngine {
  private ctx: AudioContext | null = null;
  private master!: GainNode;
  private sfx!: GainNode;
  private ambience!: GainNode;
  private fireGain!: GainNode;
  private portalGain!: GainNode;
  private noise!: AudioBuffer;
  private brown!: AudioBuffer;
  private volume = 0.7;
  private muted = false;
  private crackleTimer = 0;
  private fireLevel = 0;
  private mode: 'hub' | 'battle' = 'hub';

  // Échantillons
  private readonly buffers = new Map<string, AudioBuffer>();
  private readonly groups = new Map<string, string[]>();
  private readonly lastVariant = new Map<string, string>();
  private readonly lastPlay = new Map<string, number>();
  // Musique
  private musicBus!: GainNode;
  private musicDuck!: GainNode;
  private musicFilter!: BiquadFilterNode;
  private musicSrc: AudioBufferSourceNode | null = null;
  private musicGain: GainNode | null = null;
  private musicWanted: 'none' | 'battle' | 'victory' = 'none';
  private ambienceLevel = 0.9;

  get started(): boolean {
    return this.ctx !== null;
  }

  /** À appeler lors d'une interaction de l'utilisateur. */
  start(): void {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') void this.ctx.resume();
      return;
    }
    const Ctx = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!Ctx) return;
    const ctx = new Ctx();
    this.ctx = ctx;
    this.master = ctx.createGain();
    this.master.gain.value = 0;
    // Compresseur doux + limiteur : les gros impacts s'additionnent sans saturer
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -16;
    comp.knee.value = 10;
    comp.ratio.value = 4;
    comp.attack.value = 0.004;
    comp.release.value = 0.18;
    const limiter = ctx.createDynamicsCompressor();
    limiter.threshold.value = -2;
    limiter.knee.value = 0;
    limiter.ratio.value = 20;
    limiter.attack.value = 0.001;
    limiter.release.value = 0.1;
    this.master.connect(comp).connect(limiter).connect(ctx.destination);
    this.sfx = ctx.createGain();
    this.sfx.connect(this.master);
    this.ambience = ctx.createGain();
    this.ambience.gain.value = this.ambienceLevel;
    this.ambience.connect(this.master);

    this.musicFilter = ctx.createBiquadFilter();
    this.musicFilter.type = 'lowpass';
    this.musicFilter.frequency.value = 20000;
    this.musicFilter.Q.value = 0.8;
    this.musicDuck = ctx.createGain();
    this.musicBus = ctx.createGain();
    this.musicBus.gain.value = 0.42;
    this.musicFilter.connect(this.musicDuck).connect(this.musicBus).connect(this.master);

    this.noise = this.makeNoise(2, false);
    this.brown = this.makeNoise(6, true);
    this.buildWind();
    this.buildFire();
    this.buildPortal();
    this.applyVolume(1.5);
    void this.loadSamples();
    if (this.mode === 'battle') this.setMode('battle');
  }

  private async loadSamples(): Promise<void> {
    const ctx = this.ctx!;
    await Promise.all(Object.entries(FILES).map(async ([path, url]) => {
      const name = path.split('/').pop()!.replace('.ogg', '');
      try {
        const data = await (await fetch(url)).arrayBuffer();
        const buf = await ctx.decodeAudioData(data);
        this.buffers.set(name, buf);
        // Variantes : « hit_1 », « hit_2 »… → groupe « hit » ; « swing_l1 » → « swing_l »
        const group = name.replace(/_?\d+$/, '');
        if (group !== name) {
          const g = this.groups.get(group) ?? [];
          g.push(name);
          this.groups.set(group, g);
        }
      } catch (err) {
        console.warn('Son illisible :', name, err);
      }
    }));
    // Si la musique était demandée avant la fin du chargement
    const w = this.musicWanted;
    this.musicWanted = 'none';
    if (w !== 'none') this.music(w);
  }

  setVolume(v: number): void {
    this.volume = v;
    this.applyVolume();
  }

  setMuted(m: boolean): void {
    this.muted = m;
    this.applyVolume();
  }

  private applyVolume(fade = 0.25): void {
    if (!this.ctx) return;
    const target = this.muted ? 0 : this.volume;
    const g = this.master.gain;
    g.cancelScheduledValues(this.ctx.currentTime);
    g.setValueAtTime(g.value, this.ctx.currentTime);
    g.linearRampToValueAtTime(target, this.ctx.currentTime + fade);
  }

  /* ================= Échantillons ================= */

  /**
   * Joue un bruitage. `name` peut désigner un groupe de variantes (« hit » → hit_1/2/3),
   * tirées au hasard sans répéter deux fois de suite la même.
   */
  play(name: string, o: PlayOpts = {}): void {
    const ctx = this.ctx;
    if (!ctx) return;
    let file = name;
    const group = this.groups.get(name);
    if (group && group.length) {
      const last = this.lastVariant.get(name);
      const pool = group.length > 1 ? group.filter((g) => g !== last) : group;
      file = pool[Math.floor(Math.random() * pool.length)]!;
      this.lastVariant.set(name, file);
    }
    const buf = this.buffers.get(file);
    if (!buf) return;
    const t = ctx.currentTime + (o.delay ?? 0);
    // Le même son joué plusieurs fois au même instant (×2, ultimes multi-cibles) : on l'atténue
    const prev = this.lastPlay.get(name) ?? -1;
    const stack = t - prev < 0.035 ? 0.5 : 1;
    this.lastPlay.set(name, t);
    const src = ctx.createBufferSource();
    src.buffer = buf;
    const vary = o.vary ?? 0.05;
    src.playbackRate.value = (o.rate ?? 1) * (1 + (Math.random() * 2 - 1) * vary);
    const g = ctx.createGain();
    g.gain.value = (GAIN[name] ?? GAIN[file] ?? 0.7) * (o.vol ?? 1) * stack * (0.9 + Math.random() * 0.1);
    let node: AudioNode = src.connect(g);
    if (o.pan && ctx.createStereoPanner) {
      const p = ctx.createStereoPanner();
      p.pan.value = Math.max(-1, Math.min(1, o.pan));
      node = node.connect(p);
    }
    node.connect(this.sfx);
    src.start(t);
  }

  /** Panoramique à partir d'une position x sur le terrain (repère 1920 px). */
  panX(x: number): number {
    return Math.max(-0.7, Math.min(0.7, (x - 960) / 960 * 0.7));
  }

  /** La musique s'efface brièvement (gros impacts, cinématiques). */
  duck(amount = 0.45, hold = 0.25, release = 0.9): void {
    const ctx = this.ctx;
    if (!ctx) return;
    const g = this.musicDuck.gain, t = ctx.currentTime;
    g.cancelScheduledValues(t);
    g.setValueAtTime(g.value, t);
    g.linearRampToValueAtTime(amount, t + 0.04);
    g.setValueAtTime(amount, t + 0.04 + hold);
    g.linearRampToValueAtTime(1, t + 0.04 + hold + release);
  }

  /** Filtre passe-bas sur la musique (effet « sous l'eau » pendant l'élan d'un ultime). */
  muffle(on: boolean, time = 0.25): void {
    const ctx = this.ctx;
    if (!ctx) return;
    const f = this.musicFilter.frequency, t = ctx.currentTime;
    f.cancelScheduledValues(t);
    f.setValueAtTime(f.value, t);
    f.exponentialRampToValueAtTime(on ? 520 : 20000, t + time);
  }

  /** Lance (en fondu enchaîné) la musique de combat, la fanfare de victoire, ou coupe tout. */
  music(which: 'none' | 'battle' | 'victory'): void {
    const ctx = this.ctx;
    if (!ctx) { this.musicWanted = which; return; }
    const t = ctx.currentTime;
    if (this.musicSrc && this.musicGain) {
      const old = this.musicSrc, og = this.musicGain;
      og.gain.cancelScheduledValues(t);
      og.gain.setValueAtTime(og.gain.value, t);
      og.gain.linearRampToValueAtTime(0, t + (which === 'victory' ? 0.35 : 1.2));
      old.stop(t + 1.3);
      this.musicSrc = null;
      this.musicGain = null;
    }
    if (which === 'none') return;
    const buf = this.buffers.get(which === 'battle' ? 'music_battle' : 'music_victory');
    if (!buf) { this.musicWanted = which; return; }
    const src = ctx.createBufferSource();
    src.buffer = buf;
    src.loop = which === 'battle';
    const g = ctx.createGain();
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(which === 'battle' ? 1 : 1.25, t + (which === 'battle' ? 1.5 : 0.05));
    src.connect(g).connect(this.musicFilter);
    src.start(t + (which === 'victory' ? 0.25 : 0));
    this.musicSrc = src;
    this.musicGain = g;
    this.musicFilter.frequency.setValueAtTime(20000, t);
  }

  /** Change l'ambiance : ville (vent, feu) ou combat (musique). */
  setMode(mode: 'hub' | 'battle'): void {
    this.mode = mode;
    this.music(mode === 'battle' ? 'battle' : 'none');
    const ctx = this.ctx;
    if (!ctx) return;
    const g = this.ambience.gain;
    g.cancelScheduledValues(ctx.currentTime);
    g.setValueAtTime(g.value, ctx.currentTime);
    g.linearRampToValueAtTime(mode === 'battle' ? 0.25 : this.ambienceLevel, ctx.currentTime + 1.2);
  }

  /* ---------- Générateurs ---------- */

  private makeNoise(seconds: number, brown: boolean): AudioBuffer {
    const ctx = this.ctx!;
    const len = Math.floor(ctx.sampleRate * seconds);
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = buf.getChannelData(0);
    let last = 0;
    for (let i = 0; i < len; i++) {
      const w = Math.random() * 2 - 1;
      if (brown) {
        last = (last + 0.02 * w) / 1.02;
        d[i] = last * 3.5;
      } else d[i] = w;
    }
    // Fondu aux extrémités pour une boucle sans clic.
    const f = Math.min(2000, len / 4);
    for (let i = 0; i < f; i++) {
      d[i]! *= i / f;
      d[len - 1 - i]! *= i / f;
    }
    return buf;
  }

  private loop(buffer: AudioBuffer): AudioBufferSourceNode {
    const src = this.ctx!.createBufferSource();
    src.buffer = buffer;
    src.loop = true;
    src.start(0, Math.random() * buffer.duration);
    return src;
  }

  private lfo(freq: number, depth: number, target: AudioParam): void {
    const ctx = this.ctx!;
    const o = ctx.createOscillator();
    o.frequency.value = freq;
    const g = ctx.createGain();
    g.gain.value = depth;
    o.connect(g).connect(target);
    o.start();
  }

  private buildWind(): void {
    const ctx = this.ctx!;
    // Grondement grave
    const low = ctx.createBiquadFilter();
    low.type = 'lowpass';
    low.frequency.value = 380;
    const lowGain = ctx.createGain();
    lowGain.gain.value = 0.35;
    this.loop(this.brown).connect(low).connect(lowGain).connect(this.ambience);
    this.lfo(0.07, 0.18, lowGain.gain);
    // Sifflement qui monte et descend
    const band = ctx.createBiquadFilter();
    band.type = 'bandpass';
    band.frequency.value = 700;
    band.Q.value = 6;
    const bandGain = ctx.createGain();
    bandGain.gain.value = 0.05;
    this.loop(this.noise).connect(band).connect(bandGain).connect(this.ambience);
    this.lfo(0.05, 280, band.frequency);
    this.lfo(0.11, 0.035, bandGain.gain);
  }

  private buildFire(): void {
    const ctx = this.ctx!;
    this.fireGain = ctx.createGain();
    this.fireGain.gain.value = 0;
    this.fireGain.connect(this.ambience);
    const roar = ctx.createBiquadFilter();
    roar.type = 'lowpass';
    roar.frequency.value = 260;
    const roarGain = ctx.createGain();
    roarGain.gain.value = 0.5;
    this.loop(this.brown).connect(roar).connect(roarGain).connect(this.fireGain);
  }

  private buildPortal(): void {
    const ctx = this.ctx!;
    this.portalGain = ctx.createGain();
    this.portalGain.gain.value = 0;
    this.portalGain.connect(this.ambience);
    for (const [f, g] of [[55, 0.12], [82.4, 0.07], [110.6, 0.04]] as const) {
      const o = ctx.createOscillator();
      o.type = 'sine';
      o.frequency.value = f;
      const og = ctx.createGain();
      og.gain.value = g;
      o.connect(og).connect(this.portalGain);
      this.lfo(0.3 + Math.random() * 0.4, g * 0.6, og.gain);
      this.lfo(0.13, 1.5, o.frequency);
      o.start();
    }
  }

  /** Mise à jour à chaque image : niveaux selon la proximité (0…1) des sources. */
  update(dt: number, fireProximity: number, portalProximity: number): void {
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    this.fireLevel = fireProximity;
    this.fireGain.gain.setTargetAtTime(0.15 + fireProximity * 0.55, now, 0.3);
    this.portalGain.gain.setTargetAtTime(portalProximity * 0.9, now, 0.3);
    this.crackleTimer -= dt;
    if (this.crackleTimer <= 0) {
      this.crackleTimer = 0.03 + Math.random() * 0.18;
      this.crackle(0.1 + this.fireLevel * 0.5);
    }
  }

  private crackle(level: number): void {
    const ctx = this.ctx!;
    const src = ctx.createBufferSource();
    src.buffer = this.noise;
    const hp = ctx.createBiquadFilter();
    hp.type = 'bandpass';
    hp.frequency.value = 1500 + Math.random() * 3500;
    hp.Q.value = 1.5;
    const g = ctx.createGain();
    const t = ctx.currentTime;
    const peak = level * (0.15 + Math.random() * 0.5);
    g.gain.setValueAtTime(peak, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.02 + Math.random() * 0.05);
    src.connect(hp).connect(g).connect(this.fireGain);
    src.start(t, Math.random() * 1.5, 0.1);
  }

  /* ---------- Effets ponctuels ---------- */

  thunder(delay = 0.6): void {
    const ctx = this.ctx;
    if (!ctx) return;
    const t = ctx.currentTime + delay;
    const src = ctx.createBufferSource();
    src.buffer = this.brown;
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.setValueAtTime(900, t);
    lp.frequency.exponentialRampToValueAtTime(90, t + 3);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(1.4, t + 0.08);
    g.gain.exponentialRampToValueAtTime(0.5, t + 0.5);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 3.6);
    src.connect(lp).connect(g).connect(this.ambience);
    src.start(t, Math.random() * 2, 4);
  }

  anvil(proximity: number): void {
    const ctx = this.ctx;
    if (!ctx || proximity < 0.05) return;
    const t = ctx.currentTime;
    const out = ctx.createGain();
    out.gain.value = 0.25 * proximity;
    out.connect(this.sfx);
    for (const [f, d] of [[1870, 0.6], [2840, 0.4], [4120, 0.25], [920, 0.5]] as const) {
      const o = ctx.createOscillator();
      o.type = 'sine';
      o.frequency.value = f * (0.98 + Math.random() * 0.04);
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.5, t);
      g.gain.exponentialRampToValueAtTime(0.0001, t + d);
      o.connect(g).connect(out);
      o.start(t);
      o.stop(t + d);
    }
  }

  /* ================= Interface ================= */

  hover(): void { this.play('ui_hover', { vary: 0.08 }); }
  click(): void { this.play('ui_click', { vary: 0.04 }); }
  open(): void { this.play('ui_open', { vary: 0.02 }); }
  close(): void { this.play('ui_close', { vary: 0.02 }); }
  confirm(): void { this.play('ui_confirm', { vary: 0 }); }
  whoosh(): void { this.play('blink', { vol: 0.6, rate: 1.1 }); }
}

export const audio = new AudioEngine();
