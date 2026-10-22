import { Container, Graphics, Sprite, Texture } from 'pixi.js';
import { FastBloomFilter } from '../core/perf';
import type { GameTextures } from '../assets';
import { audio } from '../audio/AudioEngine';
import { CRYSTAL, PARALLAX, SKY, WORLD } from '../config';
import { BUILDINGS, type BuildingDef } from '../data/buildings';
import type { Camera } from '../core/Camera';
import type { Game, Viewport } from '../core/Game';
import { Crows } from '../fx/Crows';
import { Fog } from '../fx/Fog';
import { Lightning } from '../fx/Lightning';
import { Lights } from '../fx/Lights';
import { ParticleEmitter } from '../fx/Particles';
import { Pulses } from '../fx/Pulses';
import { createVerticalGradient, type FxTextures } from '../fx/textures';
import type { Quality } from '../state/store';
import { Emitter } from '../utils/Emitter';
import { clamp, flatPoints, rand } from '../utils/math';
import { BuildingView } from './BuildingView';
import { Npc } from './Npc';

/** Coordonnées de l'image d'origine (×2) → monde. */
const W2 = (x: number, y: number): [number, number] => [x * 2, y * 2];

/** Position X (monde) des sources sonores. */
const SOUND = { forge: 2124, portal: 420 } as const;

export interface LabelPosition {
  id: string;
  x: number;
  y: number;
  visible: boolean;
}

type SceneEvents = {
  hover: { def: BuildingDef; hovered: boolean };
  select: BuildingDef;
  talk: { id: string };
};

/**
 * La ville (hub) : ciel lointain avec la Tour de l'Infini, nuages, brume, ville au premier plan,
 * personnages, lumières, particules et parallaxe multi-couches → effet 2.5D.
 */
export class HubScene extends Emitter<SceneEvents> {
  // Couches (de l'arrière vers l'avant)
  private readonly skyLayer = new Container();
  private readonly skyContent = new Container();
  private readonly clouds = new Fog();
  private readonly farFog = new Fog();
  private readonly crows: Crows;
  private readonly lightning: Lightning;
  private readonly cityLayer = new Container();
  private readonly frontLayer = new Container();
  private readonly frontFog = new Fog();
  private readonly fxLayer = new Container();

  private readonly lights: Lights;
  private readonly emitters: ParticleEmitter[] = [];
  private readonly ashes: ParticleEmitter;
  private readonly bokeh: ParticleEmitter;
  private readonly talkers = new Map<string, Npc>();
  private readonly starLayer = new Container();
  private readonly shootingStars: Array<{ s: Sprite; vx: number; vy: number; life: number; max: number }> = [];
  private nextStar = 4;
  private streakTex: Texture | null = null;
  private readonly clickSparks: ParticleEmitter;
  private readonly anvilSparks: ParticleEmitter;
  private readonly pulses: Pulses;
  private readonly cityPulses: Pulses;
  private readonly buildings: BuildingView[] = [];
  private readonly npcs: Npc[] = [];
  private readonly bloom: FastBloomFilter;
  /** Vignette plein écran (assombrit les bords pour la profondeur). */
  private readonly vignette: Sprite;

  // Éléments animés
  private readonly crystal: Sprite;
  private readonly crystalGlow: Sprite;
  private readonly crystalHighlight: Sprite;
  private readonly crystalRays: Sprite;
  private readonly towerHalo: Sprite;
  private readonly towerRunes: Sprite;
  private readonly moonGlow: Sprite;
  private readonly moonRays: Sprite;
  private readonly vortex: Sprite;
  private readonly portalSwirls: Sprite[] = [];
  private readonly catEyes: Sprite[] = [];
  private smith!: Npc;

  private readonly skyWidth: number;
  private skyOffset = 0;
  private time = 0;
  private lastCamX = 0;
  private flashBoost = 0;
  private altarPulseTimer = 1.5;
  private hammerTimer = 2;
  private blinkTimer = 3;

  constructor(
    private readonly game: Game,
    private readonly camera: Camera,
    private readonly tex: GameTextures,
    private readonly fx: FxTextures,
  ) {
    super();
    const root = game.root;

    /* ================= CIEL ================= */
    const sky = new Sprite(tex.sky);
    this.skyWidth = tex.sky.width * SKY.scale;
    this.skyContent.addChild(sky, this.starLayer);
    this.skyContent.scale.set(SKY.scale);
    this.skyContent.y = WORLD.height - tex.sky.height * SKY.scale;

    const skyFx = new Container();
    skyFx.blendMode = 'add';
    // Rayons et halo de la lune de sang
    this.moonRays = this.sprite(fx.rays, 600, 430, 1500, 0xff5a4a, 0.22);
    this.moonGlow = this.sprite(fx.glowSoft, 600, 430, 900, 0xff3a3a, 0.35);
    // Tourbillon de nuages au sommet de la Tour
    const vortexHolder = new Container();
    vortexHolder.position.set(1570, 150);
    vortexHolder.scale.y = 0.34;
    this.vortex = this.sprite(fx.spiralSoft, 0, 0, 1100, 0x9fd0e0, 0.22);
    vortexHolder.addChild(this.vortex);
    // Halo magenta
    this.towerHalo = this.sprite(fx.glowSoft, 1570, 490, 620, 0xff3bd0, 0.4);
    this.towerHalo.scale.y *= 0.35;
    skyFx.addChild(this.moonRays, this.moonGlow, vortexHolder, this.towerHalo);

    // Runes de la Tour qui s'illuminent par vagues
    const runesMask = new Graphics().poly(flatPoints([[700, 200], [880, 200], [880, 720], [700, 720]].map(([x, y]) => [x * 2, y * 2] as const))).fill(0xffffff);
    this.towerRunes = new Sprite(tex.sky);
    this.towerRunes.blendMode = 'add';
    this.towerRunes.tint = 0xff2bd0;
    this.towerRunes.alpha = 0;
    this.towerRunes.mask = runesMask;
    this.skyContent.addChild(skyFx, this.towerRunes, runesMask);

    // Brume magique autour de la base de la Tour
    this.addEmitter(new ParticleEmitter({
      texture: fx.smoke, rate: 3, max: 30, life: [6, 10],
      area: { x: 1440, y: 900, w: 260, h: 120 },
      vx: [-12, 12], vy: [-26, -12],
      scale: { start: [1.2, 1.8], end: [3, 4.5] },
      alpha: 0.35, tint: [0x9a4dff, 0xff3bd0, 0x5a3a9e], blend: 'add', rotation: [-0.2, 0.2],
    }), this.skyContent);
    this.skyLayer.addChild(this.skyContent);
    root.addChild(this.skyLayer);

    // Nuages qui dérivent devant le ciel
    this.clouds.add({ texture: fx.fog, y: -60, height: 520, alpha: 0.55, tint: 0x1c1430, speed: 10, parallax: PARALLAX.sky, tileScale: 2.6 });
    this.clouds.add({ texture: fx.fogThin, y: 40, height: 460, alpha: 0.16, tint: 0xb59cff, speed: 16, parallax: PARALLAX.sky * 1.05, tileScale: 2.1, blend: 'add' });
    root.addChild(this.clouds.container);

    /* ================= ÉCLAIRS, BRUME LOINTAINE, CORBEAUX ================= */
    this.lightning = new Lightning({ width: 100, height: WORLD.height * 0.65 });
    this.lightning.onStrike = () => {
      this.flashBoost = 1;
      audio.thunder(rand(0.25, 1.1));
    };
    this.lightning.target = () => this.towerSpire();
    root.addChild(this.lightning.container);

    this.farFog.add({ texture: fx.fog, y: 520, height: 420, alpha: 0.35, tint: 0x7a62b8, speed: 8, parallax: PARALLAX.farFog, tileScale: 1.6 });
    this.farFog.add({ texture: fx.fogThin, y: 640, height: 360, alpha: 0.28, tint: 0x3f8a94, speed: -5, parallax: PARALLAX.farFog * 0.9, tileScale: 1.3 });
    root.addChild(this.farFog.container);

    this.crows = new Crows({ width: 100, minY: 120, maxY: 460 });
    root.addChild(this.crows.container);

    /* ================= VILLE ================= */
    const ground = new Sprite(createVerticalGradient([[0, 'rgba(18,12,28,0)'], [0.25, 'rgba(18,12,28,1)'], [1, 'rgba(8,6,14,1)']]));
    ground.position.set(-200, 860);
    ground.width = WORLD.width + 400;
    ground.height = WORLD.height - 860 + 200;
    this.cityLayer.addChild(ground, new Sprite(tex.city));

    // Vortex animé du portail (deux spirales qui tournent en sens inverse)
    const portalHolder = new Container();
    portalHolder.position.set(420, 684);
    portalHolder.scale.y = 2.1;
    portalHolder.blendMode = 'add';
    const swirlA = this.sprite(fx.spiral, 0, 0, 250, 0xb070ff, 0.42);
    const swirlB = this.sprite(fx.spiral, 0, 0, 200, 0xffd0ff, 0.22);
    swirlB.scale.x *= -1;
    this.portalSwirls.push(swirlA, swirlB);
    portalHolder.addChild(swirlA, swirlB);
    this.cityLayer.addChild(portalHolder);

    // Bâtiments interactifs
    for (const def of BUILDINGS.filter((b) => b.layer === 'city')) {
      this.buildings.push(this.createBuilding(def, tex.city, this.cityLayer));
    }
    const towerDef = BUILDINGS.find((b) => b.id === 'tower');
    if (towerDef) this.buildings.push(this.createBuilding(towerDef, tex.sky, this.skyContent));

    // Cristal flottant (rayons + halo + cristal + surbrillance)
    const cx = CRYSTAL.x + CRYSTAL.w / 2;
    const cy = CRYSTAL.y + CRYSTAL.h / 2;
    this.crystalRays = this.sprite(fx.rays, cx, cy, 760, 0xff3050, 0.4);
    this.crystalRays.blendMode = 'add';
    this.crystalGlow = this.sprite(fx.glowSoft, cx, cy, 520, 0xff1f4a, 0.55);
    this.crystalGlow.blendMode = 'add';
    this.cityPulses = new Pulses(fx.ring);
    this.crystal = this.sprite(tex.crystal, cx, cy, 0, 0xffffff, 1);
    this.crystalHighlight = this.sprite(tex.crystal, cx, cy, 0, 0xffffff, 0);
    this.buildings.find((b) => b.def.id === 'summon')?.addExtraHighlight(this.crystalHighlight);
    this.cityLayer.addChild(this.cityPulses.container, this.crystalRays, this.crystalGlow, this.crystal, this.crystalHighlight);

    // Lumières (torches, fenêtres, magie) — avant les personnages pour pouvoir y accrocher des lueurs
    this.lights = new Lights(fx.glow);
    this.addLights();

    // Personnages d'ambiance
    this.addNpcs();
    this.cityLayer.addChild(this.lights.container);

    // Particules de la ville
    this.addCityParticles();
    this.anvilSparks = this.addEmitter(new ParticleEmitter({
      texture: fx.spark, rate: 0, max: 60, life: [0.3, 0.7], area: { x: 0, y: 0 },
      vx: [-180, 180], vy: [-260, -60], ay: 700,
      scale: { start: [0.3, 0.5], end: [0.05, 0.1] }, tint: [0xffe08a, 0xffa040, 0xffffff], blend: 'add',
    }), this.cityLayer);

    // Zones cliquables au-dessus de tout dans la couche ville
    for (const b of this.buildings) if (b.def.layer === 'city') this.cityLayer.addChild(b.hit);
    // Les personnages restent au-dessus des zones cliquables des bâtiments.
    for (const n of this.npcs) this.cityLayer.addChild(n.root);
    this.cityLayer.addChild(...this.catEyes);
    root.addChild(this.cityLayer);

    /* ================= PREMIER PLAN ================= */
    this.frontFog.add({ texture: fx.fog, y: 1000, height: 380, alpha: 0.32, tint: 0x6f5aa8, speed: 14, parallax: PARALLAX.front, tileScale: 1.4 });
    this.frontFog.add({ texture: fx.fogThin, y: 1120, height: 260, alpha: 0.4, tint: 0x2d2342, speed: -9, parallax: PARALLAX.front * 1.1, tileScale: 1.1 });
    this.frontLayer.addChild(this.frontFog.container);
    this.ashes = new ParticleEmitter({
      texture: fx.spark, rate: 9, max: 90, life: [7, 12],
      area: { x: 0, y: 0, w: 100, h: WORLD.height },
      vx: [-14, 6], vy: [6, 22], wobble: { amp: 14, freq: 1.2 },
      scale: { start: [0.12, 0.3], end: [0.08, 0.2] },
      alpha: 0.6, tint: [0xffb08a, 0xd9c7ff, 0xff6a4a], blend: 'add',
    });
    this.frontLayer.addChild(this.ashes.container);
    // Bokeh : grosses braises floues tout près de la « caméra »
    this.bokeh = new ParticleEmitter({
      texture: fx.glowSoft, rate: 0.7, max: 12, life: [9, 15],
      area: { x: 0, y: 200, w: 100, h: WORLD.height - 200 },
      vx: [-10, 10], vy: [-16, -4], wobble: { amp: 26, freq: 0.35 },
      scale: { start: [0.35, 0.8], end: [0.5, 1.0] },
      alpha: 0.13, tint: [0xff8a4a, 0xb68aff, 0xffc070], blend: 'add',
    });
    this.frontLayer.addChild(this.bokeh.container);
    this.frontLayer.eventMode = 'none';
    root.addChild(this.frontLayer);

    /* ================= EFFETS DE CLIC ================= */
    this.pulses = new Pulses(fx.ring);
    this.clickSparks = new ParticleEmitter({
      texture: fx.spark, rate: 0, max: 120, life: [0.4, 0.9], area: { x: 0, y: 0 },
      vx: [-320, 320], vy: [-360, 120], ay: 500,
      scale: { start: [0.4, 0.7], end: [0.05, 0.1] }, blend: 'add',
    });
    this.fxLayer.addChild(this.pulses.container, this.clickSparks.container);
    this.fxLayer.eventMode = 'none';
    root.addChild(this.fxLayer);

    /* ================= POST-TRAITEMENT ================= */
    this.bloom = new FastBloomFilter({ threshold: 0.66, bloomScale: 0.7, brightness: 1.0, blur: 6, quality: 3 });
    // Vignette au-dessus de tout le jeu (hors interface DOM)
    this.vignette = new Sprite(fx.vignette);
    this.vignette.eventMode = 'none';
    this.vignette.alpha = 0.9;
    game.app.stage.addChild(this.vignette);
    // Les filtres suivent la résolution de rendu (adaptative)
    const syncRes = (): void => { this.bloom.resolution = game.resolution; };
    syncRes();
    game.on('resolution', syncRes);
    this.cityLayer.filters = [this.bloom];

    game.on('resize', (vp) => this.layout(vp));
    this.layout(game.viewport);
    for (const e of this.emitters) e.prewarm(6);
    this.ashes.prewarm(10);
    this.bokeh.prewarm(12);
  }

  /* ================= Construction ================= */

  private sprite(texture: Texture, x: number, y: number, size: number, tint: number, alpha: number): Sprite {
    const s = new Sprite(texture);
    s.anchor.set(0.5);
    s.position.set(x, y);
    if (size > 0) s.width = s.height = size;
    s.tint = tint;
    s.alpha = alpha;
    return s;
  }

  private createBuilding(def: BuildingDef, source: Texture, parent: Container): BuildingView {
    const view = new BuildingView(def, source, parent, () => !this.camera.wasDrag);
    view.onHover = (d, hovered) => this.emit('hover', { def: d, hovered });
    view.onSelect = (d, global) => {
      const p = this.fxLayer.toLocal(global);
      this.pulses.spawn(p.x, p.y, { tint: d.glow, from: 20, to: 260, duration: 0.55, alpha: 0.9 });
      this.pulses.spawn(p.x, p.y, { tint: 0xffffff, from: 10, to: 140, duration: 0.4, alpha: 0.6 });
      this.clickSparks.burst(26, p.x, p.y, d.glow);
      this.clickSparks.burst(10, p.x, p.y, 0xffffff);
      window.setTimeout(() => this.emit('select', d), 170);
    };
    return view;
  }

  private addEmitter(e: ParticleEmitter, parent: Container): ParticleEmitter {
    parent.addChild(e.container);
    this.emitters.push(e);
    return e;
  }

  private addLights(): void {
    const torch = { radius: 70, color: 0xff8a2a, intensity: 0.75, flicker: 1 };
    const torches: Array<[number, number]> = [
      [200, 478], [380, 423], [770, 405], [905, 405], [770, 330], [820, 327], [880, 327], [925, 330], [1160, 450], [1290, 500],
    ];
    for (const [x, y] of torches) this.lights.add({ ...torch, x: x * 2, y: y * 2 });
    for (const [x, y] of [[622, 378], [688, 370]] as const) this.lights.add({ x: x * 2, y: y * 2, radius: 55, color: 0xffa040, intensity: 0.6, flicker: 0.6 });
    for (const [x, y] of [[480, 240], [460, 312], [507, 312], [636, 290], [636, 206], [577, 404], [520, 410]] as const)
      this.lights.add({ x: x * 2, y: y * 2, radius: 42, color: 0xffb050, intensity: 0.4, flicker: 0.3 });
    this.lights.add({ x: 2124, y: 790, radius: 190, color: 0xff6a1a, intensity: 0.8, flicker: 1 });
    for (const [x, y, r] of [[1295, 262, 150], [1405, 410, 90], [1477, 420, 80], [1250, 420, 60]] as const)
      this.lights.add({ x: x * 2, y: y * 2, radius: r, color: 0xffc94a, intensity: 0.38, flicker: 0.15, pulse: 0.8 });
    this.lights.add({ x: 420, y: 684, radius: 340, color: 0x9a4dff, intensity: 0.55, flicker: 0.2, pulse: 1.6 });
    this.lights.add({ x: 1696, y: 760, radius: 260, color: 0xff2a50, intensity: 0.35, flicker: 0.1, pulse: 1.1 });
  }

  private addNpcs(): void {
    const t = this.tex;
    // Garde qui patrouille devant l'autel
    const guard = new Npc({ texture: t.guard, x: 1430, y: 990, height: 200, facesRight: false, breathe: 0.01,
      path: { from: [1430, 992], to: [1630, 985], speed: 42, pause: [2.5, 5] } });
    // Cultiste à la lanterne qui erre entre le portail et la taverne
    const cultist = new Npc({ texture: t.cultist, x: 720, y: 1080, height: 192, facesRight: true,
      path: { from: [720, 1085], to: [1140, 1012], speed: 30, pause: [3, 6] } });
    const lantern = this.lights.add({ x: 0, y: 0, radius: 110, color: 0xffa040, intensity: 0.9, flicker: 0.9 });
    cultist.attach(lantern, 0.898, 0.362);
    // Forgeron devant la forge
    this.smith = new Npc({ texture: t.smith, x: 2222, y: 940, height: 196, facesRight: true, breathe: 0.016 });
    // Chat noir assis sur les marches du portail
    const cat = new Npc({ texture: t.cat, x: 628, y: 992, height: 74, facesRight: true, breathe: 0.02 });
    for (const nx of [0.171, 0.342]) {
      const eye = this.sprite(this.fx.spark, 0, 0, 11, 0xffd040, 0.9);
      this.catEyes.push(eye);
      cat.attach(eye, nx, 0.194);
    }
    // Héros de passage en ville (on peut leur parler)
    const kael = new Npc({ texture: t.hero_kael, x: 2420, y: 1150, height: 228, facesRight: true, breathe: 0.01, aura: 0xff7a2a, auraAlpha: 0.5 });
    const aldric = new Npc({ texture: t.hero_aldric, x: 2535, y: 1172, height: 212, facesRight: true, face: -1, breathe: 0.013, aura: 0xffd36a, auraAlpha: 0.42 });
    const lyra = new Npc({ texture: t.hero_lyra, x: 905, y: 990, height: 196, facesRight: true, breathe: 0.016, aura: 0xff2a4a, auraAlpha: 0.45 });
    const vaelen = new Npc({ texture: t.hero_vaelen, x: 2320, y: 1010, height: 236, facesRight: true, breathe: 0.009, aura: 0xffb454, auraAlpha: 0.55 });
    const sylvaine = new Npc({ texture: t.hero_sylvaine, x: 1420, y: 1015, height: 210, facesRight: true, face: -1, breathe: 0.015, aura: 0x7ae08a, auraAlpha: 0.5 });
    const pyrrha = new Npc({ texture: t.hero_pyrrha, x: 690, y: 1060, height: 214, facesRight: true, breathe: 0.014, aura: 0xff6a2a, auraAlpha: 0.55 });
    const named: Array<[string, Npc]> = [
      ['kael', kael], ['aldric', aldric], ['lyra', lyra],
      ['vaelen', vaelen], ['sylvaine', sylvaine], ['pyrrha', pyrrha],
      ['cat', cat], ['cultist', cultist], ['guard', guard], ['smith', this.smith],
    ];
    for (const [id, n] of named) {
      this.talkers.set(id, n);
      n.makeInteractive(() => {
        const h = this.fxLayer.toLocal(n.headGlobal());
        this.clickSparks.burst(14, h.x, h.y + 30, 0xffd98a);
        this.emit('talk', { id });
      }, () => !this.camera.wasDrag);
    }
    this.npcs.push(lyra, kael, aldric, vaelen, sylvaine, pyrrha, cat, cultist, guard, this.smith);
    for (const n of this.npcs) this.cityLayer.addChild(n.root);
    this.cityLayer.addChild(...this.catEyes);
  }

  private addCityParticles(): void {
    const fx = this.fx;
    const [cx, cy] = W2(1078, 236);
    // Fumée de la cheminée
    this.addEmitter(new ParticleEmitter({
      texture: fx.smoke, rate: 5, max: 50, life: [4, 7],
      area: { x: cx - 18, y: cy - 6, w: 36, h: 8 },
      vx: [4, 22], vy: [-70, -45], ax: 6, wobble: { amp: 12, freq: 0.8 },
      scale: { start: [0.5, 0.8], end: [2.6, 3.6] },
      alpha: 0.75, tint: [0x4a4256, 0x5a5066, 0x3a3346], rotation: [-0.4, 0.4],
    }), this.cityLayer);
    // Braises de la forge et de la cheminée
    this.addEmitter(new ParticleEmitter({
      texture: fx.spark, rate: 14, max: 70, life: [1.2, 2.6],
      area: { x: 2080, y: 760, w: 90, h: 40 },
      vx: [-30, 30], vy: [-150, -70], ay: 20, wobble: { amp: 40, freq: 4 },
      scale: { start: [0.35, 0.6], end: [0.05, 0.15] },
      tint: [0xffb040, 0xff6a1a, 0xffe08a], blend: 'add',
    }), this.cityLayer);
    this.addEmitter(new ParticleEmitter({
      texture: fx.spark, rate: 4, max: 20, life: [1.5, 2.5],
      area: { x: cx - 12, y: cy, w: 24, h: 4 },
      vx: [-10, 25], vy: [-120, -60], wobble: { amp: 30, freq: 3 },
      scale: { start: [0.3, 0.5], end: [0.05, 0.1] }, tint: 0xff8a2a, blend: 'add',
    }), this.cityLayer);

    // Flammes vivantes + étincelles sur chaque torche
    const torchSpots: Array<[number, number]> = [[200, 470], [380, 415], [770, 397], [905, 397], [1160, 442], [1290, 492], [770, 322], [820, 319], [880, 319], [925, 322]];
    for (const [x, y] of torchSpots) {
      this.addEmitter(new ParticleEmitter({
        texture: fx.glowSoft, rate: 20, max: 16, life: [0.25, 0.5],
        area: { x: x * 2 - 5, y: y * 2 - 2, w: 10, h: 4 },
        vx: [-10, 10], vy: [-120, -70],
        scale: { start: [0.13, 0.18], end: [0.02, 0.05] }, tint: [0xffb040, 0xff7a1a, 0xffe0a0], blend: 'add', alpha: 0.75,
      }), this.cityLayer);
      this.addEmitter(new ParticleEmitter({
        texture: fx.spark, rate: 3, max: 12, life: [0.6, 1.3],
        area: { x: x * 2 - 6, y: y * 2 - 6, w: 12, h: 6 },
        vx: [-15, 15], vy: [-90, -50], wobble: { amp: 20, freq: 5 },
        scale: { start: [0.2, 0.35], end: [0.04, 0.08] }, tint: [0xffc060, 0xff7a2a], blend: 'add',
      }), this.cityLayer);
    }

    // Particules aspirées en spirale par le portail
    const [px, py] = [420, 684];
    this.addEmitter(new ParticleEmitter({
      texture: fx.spark, rate: 22, max: 90, life: [2, 3.2],
      area: { x: px, y: py },
      scale: { start: [0.25, 0.5], end: [0.05, 0.12] },
      tint: [0xc58bff, 0x8a4dff, 0xffffff, 0xff7af0], blend: 'add',
      spawn: (p) => { p.data.push(Math.random() * Math.PI * 2); },
      behavior: (p) => {
        const t = p.life / p.maxLife;
        const angle = p.data[0]! + t * 5.5;
        const r = (1 - t) ** 1.3;
        p.x = px + Math.cos(angle) * 160 * r;
        p.y = py + Math.sin(angle) * 280 * r;
        return true;
      },
    }), this.cityLayer);

    // Éclats qui tournent autour du cristal
    const ccx = CRYSTAL.x + CRYSTAL.w / 2;
    const ccy = CRYSTAL.y + CRYSTAL.h / 2;
    this.addEmitter(new ParticleEmitter({
      texture: fx.spark, rate: 12, max: 50, life: [2, 3.5],
      area: { x: ccx, y: ccy },
      scale: { start: [0.25, 0.5], end: [0.05, 0.1] },
      tint: [0xff3b5c, 0xffd0a0, 0xff7a90], blend: 'add',
      spawn: (p) => { p.data.push(Math.random() * Math.PI * 2, 120 + Math.random() * 60, (Math.random() - 0.5) * 80); },
      behavior: (p) => {
        const a = p.data[0]! + p.life * 1.8;
        p.x = ccx + Math.cos(a) * p.data[1]!;
        p.y = ccy + Math.sin(a) * p.data[1]! * 0.32 + p.data[2]! - p.life * 25 + Math.sin(this.time * 1.4) * 12;
        return true;
      },
    }), this.cityLayer);

    // Lucioles fantomatiques au sol
    this.addEmitter(new ParticleEmitter({
      texture: fx.spark, rate: 3, max: 25, life: [5, 9],
      area: { x: 0, y: 880, w: WORLD.width, h: 300 },
      vx: [-10, 10], vy: [-12, -2], wobble: { amp: 25, freq: 1.5 },
      scale: { start: [0.25, 0.45], end: [0.15, 0.3] }, tint: [0x7affd4, 0xb48aff], blend: 'add', alpha: 0.8,
    }), this.cityLayer);
  }

  /* ================= Mise en page ================= */

  private layout(vp: Viewport): void {
    const maxCam = Math.max(0, WORLD.width - vp.width);
    this.camera.setBounds(0, maxCam);
    const camMid = maxCam / 2;
    // La Tour s'aligne derrière l'autel quand la caméra est centrée.
    this.skyOffset = -camMid + SKY.alignWorldX - SKY.towerX * SKY.scale + camMid * PARALLAX.sky;
    this.clouds.resize(vp.width);
    this.farFog.resize(vp.width);
    this.frontFog.resize(vp.width);
    this.lightning.resize(vp.width);
    this.crows.resize(vp.width);
    this.vignette.width = vp.screenWidth;
    this.vignette.height = vp.screenHeight;
    this.ashes.setArea({ x: 0, y: 0, w: vp.width, h: WORLD.height });
    this.bokeh.setArea({ x: 0, y: 200, w: vp.width, h: WORLD.height - 200 });
  }

  get centerCamera(): number {
    return this.camera.max / 2;
  }

  /** Pointe de la Tour, dans l'espace de la vue (pour les éclairs). */
  private towerSpire(): { x: number; y: number } {
    return {
      x: this.skyLayer.x + 1570 * SKY.scale,
      y: this.skyLayer.y + this.skyContent.y + 80 * SKY.scale,
    };
  }

  /* ================= Boucle ================= */

  update(dt: number): void {
    this.time += dt;
    const t = this.time;
    const vp = this.game.viewport;
    const cam = this.camera.x;
    const m = this.game.mouse;

    // Parallaxe
    const skyX = -cam * PARALLAX.sky + this.skyOffset - m.x * PARALLAX.mouse.sky;
    this.skyLayer.x = clamp(skyX, vp.width - this.skyWidth, 0);
    this.skyLayer.y = -m.y * PARALLAX.mouse.sky * 0.5;
    this.cityLayer.x = -cam - m.x * PARALLAX.mouse.city;
    this.cityLayer.y = -m.y * PARALLAX.mouse.city * 0.5;
    this.frontLayer.x = -m.x * PARALLAX.mouse.front;
    this.frontLayer.y = -m.y * PARALLAX.mouse.front * 0.4;

    const camDelta = cam - this.lastCamX;
    this.lastCamX = cam;
    this.ashes.shift(-camDelta * PARALLAX.front);
    this.bokeh.shift(-camDelta * PARALLAX.front * 1.3);
    this.updateShootingStars(dt);

    // Effets d'ambiance
    this.clouds.update(dt, cam);
    this.farFog.update(dt, cam);
    this.frontFog.update(dt, cam);
    this.crows.update(dt);
    this.lightning.update(dt);
    this.lights.update(dt);
    for (const e of this.emitters) e.update(dt);
    this.ashes.update(dt);
    this.bokeh.update(dt);
    this.clickSparks.update(dt);
    this.pulses.update(dt);
    this.cityPulses.update(dt);
    for (const b of this.buildings) b.update(dt);
    for (const n of this.npcs) n.update(dt);

    // Ciel
    this.flashBoost = Math.max(0, this.flashBoost - dt * 2);
    this.moonRays.rotation = t * 0.02;
    this.moonRays.alpha = 0.2 + Math.sin(t * 0.4) * 0.05 + this.flashBoost * 0.1;
    this.moonGlow.alpha = 0.3 + Math.sin(t * 0.5) * 0.05 + this.flashBoost * 0.15;
    this.vortex.rotation = -t * 0.06;
    this.towerHalo.alpha = 0.35 + Math.sin(t * 1.7) * 0.12 + this.flashBoost * 0.5;
    const runeWave = Math.max(0, Math.sin(t * 0.9)) ** 3;
    this.towerRunes.alpha = 0.08 + runeWave * 0.45 + this.flashBoost * 0.6;

    // Portail
    this.portalSwirls[0]!.rotation = -t * 1.1;
    this.portalSwirls[1]!.rotation = t * 0.7;
    this.portalSwirls[0]!.alpha = 0.38 + Math.sin(t * 2.3) * 0.08;

    // Cristal flottant
    const bob = Math.sin(t * 1.4) * 12;
    const baseY = CRYSTAL.y + CRYSTAL.h / 2;
    this.crystal.y = baseY + bob;
    this.crystal.rotation = Math.sin(t * 0.9) * 0.025;
    this.crystalHighlight.position.copyFrom(this.crystal.position);
    this.crystalHighlight.rotation = this.crystal.rotation;
    this.crystalGlow.y = baseY + bob;
    this.crystalGlow.alpha = 0.45 + Math.sin(t * 2.2) * 0.12;
    this.crystalRays.y = baseY + bob;
    this.crystalRays.rotation = t * 0.15;
    this.crystalRays.alpha = 0.32 + Math.sin(t * 1.3) * 0.08;
    this.altarPulseTimer -= dt;
    if (this.altarPulseTimer <= 0) {
      this.altarPulseTimer = 3.2;
      this.cityPulses.spawn(1700, 735, { tint: 0xff2a50, from: 60, to: 520, duration: 2.2, alpha: 0.7, flatten: 0.3 });
    }

    // Forgeron qui frappe l'enclume
    this.hammerTimer -= dt;
    if (this.hammerTimer <= 0) {
      this.hammerTimer = rand(1.6, 4);
      this.smith.punch();
      this.anvilSparks.burst(18, 2290, 846);
      audio.anvil(this.proximity(SOUND.forge));
    }

    // Yeux du chat qui clignent
    this.blinkTimer -= dt;
    const closed = this.blinkTimer < 0.14;
    if (this.blinkTimer <= 0) this.blinkTimer = rand(2.5, 6);
    for (const e of this.catEyes) e.alpha = closed ? 0 : 0.75 + Math.sin(t * 3) * 0.15;

    // Son d'ambiance
    audio.update(dt, Math.max(this.proximity(SOUND.forge), 0.25), this.proximity(SOUND.portal));
  }

  /** 0…1 selon la distance entre le centre de l'écran et une source sonore. */
  private proximity(worldX: number): number {
    const center = this.camera.x + this.game.viewport.width / 2;
    return clamp(1 - Math.abs(center - worldX) / 1500, 0, 1);
  }

  /* ================= Interface ================= */

  setExternalHover(id: string, hovered: boolean): void {
    this.buildings.find((b) => b.def.id === id)?.setExternalHover(hovered);
  }

  setQuality(q: Quality): void {
    const high = q !== 'low';
    for (const e of this.emitters) e.rateMultiplier = high ? 1 : 0.35;
    this.ashes.rateMultiplier = high ? 1 : 0.3;
    this.frontFog.container.visible = high;
    this.clouds.container.alpha = high ? 1 : 0.7;
    this.cityLayer.filters = high ? [this.bloom] : [];
    const r = this.game.app.renderer;
    r.resize(r.screen.width, r.screen.height, high ? Math.min(window.devicePixelRatio || 1, 2) : 1);
  }

  /** Positions écran (px CSS) des étiquettes de bâtiments. */
  /** Position écran au-dessus de la tête d'un personnage (bulles de dialogue). */
  talkerAnchor(id: string): { x: number; y: number; visible: boolean } | null {
    const n = this.talkers.get(id);
    if (!n) return null;
    const p = n.headGlobal();
    return { ...p, visible: p.x > -100 && p.x < this.game.viewport.screenWidth + 100 };
  }

  /* ================= Étoiles filantes ================= */

  private makeStreakTexture(): Texture {
    const c = document.createElement('canvas');
    c.width = 256; c.height = 16;
    const g = c.getContext('2d')!;
    const grad = g.createLinearGradient(0, 0, 256, 0);
    grad.addColorStop(0, 'rgba(255,255,255,0)');
    grad.addColorStop(0.75, 'rgba(210,200,255,0.55)');
    grad.addColorStop(1, 'rgba(255,255,255,1)');
    g.fillStyle = grad;
    g.beginPath(); g.moveTo(0, 8); g.lineTo(248, 5); g.arc(248, 8, 3, -Math.PI / 2, Math.PI / 2); g.lineTo(0, 8); g.fill();
    const head = g.createRadialGradient(248, 8, 0, 248, 8, 8);
    head.addColorStop(0, 'rgba(255,255,255,1)'); head.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = head; g.fillRect(232, 0, 24, 16);
    return Texture.from(c);
  }

  private updateShootingStars(dt: number): void {
    if (!this.streakTex) this.streakTex = this.makeStreakTexture();
    this.nextStar -= dt;
    if (this.nextStar <= 0) {
      this.nextStar = 5 + Math.random() * 9;
      const k = SKY.scale;
      const vp = this.game.viewport;
      const left = -this.skyLayer.x / k, top = (-this.skyContent.y - this.skyLayer.y) / k;
      const s = new Sprite(this.streakTex);
      s.anchor.set(1, 0.5);
      s.blendMode = 'add';
      s.tint = Math.random() < 0.5 ? 0xffffff : 0xffc4e8;
      const dir = Math.random() < 0.5 ? 1 : -1;
      const ang = (0.32 + Math.random() * 0.25);
      const speed = (900 + Math.random() * 600) / k;
      s.position.set(left + (0.15 + Math.random() * 0.7) * vp.width / k, top + (30 + Math.random() * 220) / k);
      s.rotation = dir > 0 ? ang : Math.PI - ang;
      s.scale.set((0.8 + Math.random() * 0.7) / k, (0.9 + Math.random() * 0.5) / k);
      s.alpha = 0;
      this.starLayer.addChild(s);
      this.shootingStars.push({ s, vx: Math.cos(s.rotation) * speed, vy: Math.sin(s.rotation) * speed, life: 0, max: 0.7 + Math.random() * 0.5 });
    }
    for (let i = this.shootingStars.length - 1; i >= 0; i--) {
      const st = this.shootingStars[i]!;
      st.life += dt;
      st.s.x += st.vx * dt; st.s.y += st.vy * dt;
      const f = st.life / st.max;
      st.s.alpha = f < 0.2 ? f / 0.2 : Math.max(0, 1 - (f - 0.2) / 0.8);
      if (f >= 1) { st.s.destroy(); this.shootingStars.splice(i, 1); }
    }
  }

  labelPositions(): LabelPosition[] {
    const sw = this.game.viewport.screenWidth;
    return this.buildings.map((b) => {
      const g = b.anchor.getGlobalPosition();
      return { id: b.def.id, x: g.x, y: g.y, visible: g.x > -150 && g.x < sw + 150 };
    });
  }
}
