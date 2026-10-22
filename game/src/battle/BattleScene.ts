import { BitmapFont, BitmapText, BlurFilter, ColorMatrixFilter, Container, Graphics, Rectangle, RenderTexture, Sprite, Texture, TilingSprite } from 'pixi.js';
import { RGBSplitFilter, ShockwaveFilter, ZoomBlurFilter } from 'pixi-filters';
import { FastBloomFilter } from '../core/perf';
import type { GameTextures } from '../assets';
import { audio } from '../audio/AudioEngine';
import type { Game } from '../core/Game';
import { CLASSES, type SceneId, type StageDef, type TeamMember } from '../data/heroes';
import { Fog } from '../fx/Fog';
import { ParticleEmitter } from '../fx/Particles';
import type { FxTextures } from '../fx/textures';
import type { Quality } from '../state/store';
import { Emitter } from '../utils/Emitter';
import { clamp, rand } from '../utils/math';
import { createBattleTextures, type BattleTextures } from './battleTextures';
import { BattleCamera, VIEW_H, VIEW_W, type CamState } from './Camera';
import { CineDirector } from './cinematics';
import { strikeDelay } from './rigs';
import { BattleSim, FIELD, NYX_ECLIPSE, starsFor, THORNE_WAVE_SPEED, type FxEvent, type Projectile, type Side, type Unit } from './Sim';
import { UnitView } from './UnitView';

/** Le décor est un peu plus grand que l'écran pour laisser de la marge aux mouvements de caméra. */
const BG_SCALE = 1.62;

/** Position (pixels de l'image de fond 1376×768) → terrain. */
const BG = (x: number, y: number): [number, number] => [VIEW_W / 2 + (x - 688) * BG_SCALE, VIEW_H / 2 + (y - 384) * BG_SCALE];

export interface BattleResult {
  winner: Side;
  stars: number;
  time: number;
  stats: Array<{ id: string; name: string; dealt: number; healed: number; taken: number; alive: boolean }>;
}

type BattleEvents = {
  /** Illustration plein écran du héros qui lance son ultime (gérée par l'interface HTML). */
  cutin: Unit;
  banner: { text: string; kind: 'start' | 'boss' | 'info' };
  /** Carte de titre du boss (plaque or et obsidienne). */
  bossTitle: { name: string; title: string };
  /** Lien d'équipe actif au début du combat. */
  bond: { name: string; line: string };
  /** Un boss prépare son ultime : l'interface affiche le nom et la menace. */
  bosscast: { name: string; kind: string; color: number };
  bossimpact: { name: string; kind: string };
  /** Entraînement : dégâts cumulés et DPS, envoyés à l'interface. */
  trainingTick: { total: number; dps: number; time: number };
  finished: BattleResult;
};

interface FxSprite {
  s: Sprite;
  life: number;
  max: number;
  scale: readonly [number, number];
  alpha: readonly [number, number];
  vx: number; vy: number;
  vrot: number;
  flatten: number;
  ease: 'out' | 'linear' | 'inout';
  dy?: number;
}

/** Animation libre : `fn(k, dt)` est appelée chaque image (k = 0…1), l'objet est détruit à la fin. */
interface Anim {
  obj: Container;
  life: number;
  max: number;
  fn: (k: number, dt: number) => void;
  real: boolean;
}

interface ProjView {
  p: Projectile;
  holder: Container;
  head: Sprite;
  glow: Sprite;
  trail?: ParticleEmitter;
  lastX: number;
  lastY: number;
  color: number;
  /** Queue effilée orientée dans le sens du vol (le projectile « file » au lieu de flotter). */
  tail: Graphics;
  /** Cœur blanc surchauffé au centre du projectile. */
  core: Sprite;
  /** Anneau qui tournoie autour des projectiles magiques. */
  ring: Sprite | null;
  ringBase: number;
  coreBase: number;
  spin: number;
}

/** Dessine une queue de comète pointant vers -x (derrière le projectile). */
function drawTail(g: Graphics, len: number, half: number, color: number, alpha: number): void {
  g.clear();
  g.poly([0, -half, -len, 0, 0, half]).fill({ color, alpha });
  // noyau plus clair, plus court
  g.poly([0, -half * 0.42, -len * 0.55, 0, 0, half * 0.42]).fill({ color: 0xffffff, alpha: alpha * 0.55 });
}

const PROJ_COLOR: Record<string, number> = { arrow: 0xbfe6ff, orb: 0xb055ff, light: 0xffd36a, bone: 0x6ae0ff, pierce: 0x9ad8ff, void: 0xa86bff, spark: 0x8ae8ff, hex: 0xffa82a };

/**
 * Scène de combat : décor animé en parallaxe, combattants squelettés, projectiles, effets de sorts,
 * caméra dynamique « fausse 3D », ralentis, arrêts sur impact, images d'impact façon anime,
 * ondes de choc et cinématiques d'ultime (pilotées par `CineDirector`).
 * Elle affiche la simulation `BattleSim` sans jamais la modifier (sauf pour déclencher les ultimes).
 */
export class BattleScene extends Emitter<BattleEvents> {
  readonly root = new Container();
  readonly world = new Container();
  readonly bgLayer = new Container();
  readonly fgLayer = new Container();
  private readonly dim = new Sprite(Texture.WHITE);
  readonly impactBg = new Sprite(Texture.WHITE);
  readonly groundFx = new Container();
  /** Flaque de lumière additive sous le héros qui lance son ultime. */
  private readonly ultPool = new Sprite(Texture.WHITE);
  readonly groundNormal = new Container();
  readonly unitsLayer = new Container();
  readonly fxLayer = new Container();
  readonly fxNormal = new Container();
  private readonly textLayer = new Container();
  private readonly flash = new Sprite(Texture.WHITE);
  readonly speedLines: Sprite;
  /** Bandes noires « cinéma » (deux rectangles, pas de Graphics redessiné à chaque image). */
  private readonly barTop = new Sprite(Texture.WHITE);
  private readonly barBot = new Sprite(Texture.WHITE);
  readonly bt: BattleTextures;
  private readonly bloom: FastBloomFilter;
  /** Déchirure chromatique : les canaux rouge et bleu se séparent sur les très gros impacts. */
  private readonly rgb = new RGBSplitFilter({ red: { x: 0, y: 0 }, green: { x: 0, y: 0 }, blue: { x: 0, y: 0 } });
  /* ---- Chaîne « cinéma » : ce qui transforme un dessin animé en image de film ---- */
  /** Étalonnage couleur : contraste et saturation unifiés sur toute l'image. */
  private readonly grade = new ColorMatrixFilter();
  /** Flou de profondeur : seul le plan de combat reste net. */
  private readonly farBlur = new BlurFilter({ strength: 6, quality: 1 });
  /** Vignette plein écran (bords assombris). */
  private readonly vignette: Sprite;
  /** Verre brisé plein écran, dessiné au-dessus de tout le terrain. */
  private readonly glass: Sprite;
  /** Filtre négatif, chargé seulement quand on en a besoin. */
  private readonly negate = new ColorMatrixFilter();
  /** Désaturation progressive du monde à la mort d'un boss. */
  private readonly drain = new ColorMatrixFilter();
  private drainT = 0;
  private drainDur = 0;
  /** Grain de pellicule, animé image par image. */
  private readonly grain: TilingSprite;
  private rgbT = 0;
  private rgbDur = 0;
  private rgbMax = 0;
  private readonly shock = new ShockwaveFilter({ amplitude: 26, wavelength: 170, brightness: 1.25, speed: 1500, radius: -1 });
  private readonly zoomBlur = new ZoomBlurFilter({ strength: 0, innerRadius: 240 });
  readonly cam: BattleCamera;
  readonly director: CineDirector;

  /** Décor courant : fond, lumières, brumes et particules d'ambiance. */
  private scene: SceneId | null = null;
  private readonly bgDecor = new Container();
  /** Plans de profondeur du décor : chacun glisse à sa propre vitesse (2.5D). */
  private bgPlanes: Array<{ s: Sprite; k: number; bx: number; by: number }> = [];
  /** Textures de bandes fabriquées à la volée (libérées au changement de décor). */
  private bandTexs: Texture[] = [];
  private readonly fgDecor = new Container();
  private readonly ambientBack = new Container();
  private fog = new Fog();
  private fgFog = new Fog();
  private ambient: ParticleEmitter[] = [];
  private flames: ParticleEmitter[] = [];
  /** Lumières qui vacillent (torches, lanternes) ou flottent (feux follets). */
  private glows: Array<{ s: Sprite; a: number; bob: number; y0: number }> = [];
  readonly sparks: ParticleEmitter;
  readonly motes: ParticleEmitter;
  readonly smoke: ParticleEmitter;
  readonly fire: ParticleEmitter;
  readonly plague: ParticleEmitter;
  readonly debris: ParticleEmitter;
  readonly feathers: ParticleEmitter;
  readonly wisps: ParticleEmitter;
  /** Météo du décor : pluie sur le marais, neige sur la citadelle, cendres sur le trône. */
  private readonly rain: ParticleEmitter;
  private readonly snow: ParticleEmitter;
  private readonly ash: ParticleEmitter;
  /** Particules qui vivent en temps réel (pendant que le combat est figé). */
  readonly cineMotes: ParticleEmitter;

  sim: BattleSim | null = null;
  readonly views = new Map<number, UnitView>();
  private readonly projViews = new Map<number, ProjView>();
  private readonly fxSprites: FxSprite[] = [];
  private readonly anims: Anim[] = [];
  private readonly texts: Array<{ t: BitmapText; life: number; vx: number; vy: number; s0: number; baseY: number }> = [];
  /** Chiffres de dégâts réutilisables (police bitmap : aucune texture créée pendant le combat). */
  private readonly numPool: BitmapText[] = [];
  private moonRays: Container | null = null;
  private fxEmitters: ParticleEmitter[] = [];
  private rootFxKey = '';

  speed: 1 | 2 = 1;
  paused = false;
  auto = false;
  private phase: 'idle' | 'intro' | 'fight' | 'ending' | 'done' = 'idle';
  private introT = 0;
  /** Nom et titre du boss du niveau en cours (pour la carte de titre). */
  private bossName = '';
  private stageName = '';
  /** Identifiant du boss du niveau : sert à fissurer sa carapace selon ses PV. */
  private bossUid = -1;
  private endT = 0;
  private flashT = 0;
  dimTarget = 0;
  private time = 0;
  private autoCd = 0;
  private readonly homes = new Map<number, number>();
  /** Le joueur a-t-il déjà lancé un ultime ? (pour l'astuce du tutoriel) */
  usedUlt = false;
  private cover = 1;
  private quality: Quality = 'high';

  // Temps : ralenti des cinématiques et arrêts sur impact
  private timeScale = 1;
  private tsTarget = 1;
  private tsRate = 8;
  private hitstopT = 0;
  private impactT = 0;
  /** Fissure de verre (ouverture d'ultime) : durée restante en secondes. */
  private glassT = 0;
  private glassDur = 1;
  /** Négatif : l'image s'inverse 2 à 4 images, comme un choc optique. */
  private negT = 0;
  private impactCol = 0xfff6ea;
  private impactDur = 0;
  private shockT = -1;
  private zoomBlurT = 0;
  private zoomBlurMax = 0;
  private zoomBlurDur = 1;
  private speedT = 0;
  /** Angle cumulé des lignes de vitesse (elles tournent, elles ne sautent pas). */
  private speedSpin = 0;
  private speedMax = 0;
  private barsK = 0;
  barsTarget = 0;
  /** Unité mise en avant (les autres sont assombries). */
  private spot: Unit | null = null;
  /** Chapitre II : les ennemis portent une aura de braises (ambiance distincte). */
  private chapter2 = false;
  /** Entraînement : mannequin invincible, compteur de dégâts. */
  private training = false;
  private trainingAcc = 0;

  constructor(private readonly game: Game, private readonly tex: GameTextures, readonly fx: FxTextures) {
    super();
    this.bt = createBattleTextures();
    this.root.visible = false;

    /* ---------- Décor (reconstruit selon le niveau) ---------- */
    this.bgLayer.addChild(this.bgDecor);
    this.fgLayer.addChild(this.fgDecor);
    this.buildDecor('gallows');

    this.dim.tint = 0x05020a;
    this.dim.alpha = 0;
    this.dim.width = VIEW_W + 2000;
    this.dim.height = VIEW_H + 2000;
    this.dim.position.set(-1000, -1000);
    this.impactBg.width = VIEW_W + 3000;
    this.impactBg.height = VIEW_H + 3000;
    this.impactBg.position.set(-1500, -1500);
    this.impactBg.visible = false;

    this.groundFx.blendMode = 'add';
    // Flaque d'ultime : posée au sol, elle éclaire les jambes et « asseoit » le héros.
    this.ultPool.anchor.set(0.5);
    this.ultPool.texture = this.fx.glowSoft;
    this.ultPool.blendMode = 'add';
    this.ultPool.visible = false;
    this.groundFx.addChild(this.ultPool);
    this.unitsLayer.sortableChildren = true;
    this.fxLayer.blendMode = 'add';

    // Émetteurs d'effets (rafales à la demande)
    this.sparks = new ParticleEmitter({
      texture: fx.spark, rate: 0, max: 600, life: [0.25, 0.6],
      area: { x: 0, y: 0 }, vx: [-520, 520], vy: [-560, 140], ay: 1100,
      scale: { start: [0.7, 1.5], end: [0.1, 0.3] }, alpha: 1, blend: 'add',
    });
    this.motes = new ParticleEmitter({
      texture: fx.spark, rate: 0, max: 500, life: [0.8, 1.6],
      area: { x: 0, y: 0 }, vx: [-40, 40], vy: [-160, -60], wobble: { amp: 40, freq: 3 },
      scale: { start: [0.8, 1.6], end: [0.1, 0.3] }, alpha: 1, blend: 'add',
    });
    this.fire = new ParticleEmitter({
      texture: fx.spark, rate: 0, max: 500, life: [0.4, 0.9],
      area: { x: 0, y: 0 }, vx: [-380, 380], vy: [-420, -40], ay: -100,
      scale: { start: [2, 3.6], end: [0.2, 0.5] }, alpha: 1, tint: [0xffd27a, 0xff9a3a, 0xff5a1a], blend: 'add',
    });
    this.smoke = new ParticleEmitter({
      texture: fx.smoke, rate: 0, max: 200, life: [0.7, 1.4],
      area: { x: 0, y: 0 }, vx: [-90, 90], vy: [-80, -10],
      scale: { start: [0.6, 1], end: [1.6, 2.6] }, alpha: 0.55, rotation: [-1, 1],
    });
    this.plague = new ParticleEmitter({
      texture: fx.smoke, rate: 0, max: 260, life: [0.8, 1.5],
      area: { x: 0, y: 0 }, vx: [-40, 40], vy: [-60, -15],
      // Fumée en mélange normal : en additif, une dizaine de nuages superposés + le bloom viraient au blanc.
      scale: { start: [0.5, 0.9], end: [1.2, 1.9] }, alpha: 0.5, tint: [0x9a4ae8, 0x6a2aa8, 0x4ac87a], blend: 'normal', rotation: [-1, 1],
    });
    this.debris = new ParticleEmitter({
      texture: this.bt.debris, rate: 0, max: 160, life: [0.7, 1.2],
      area: { x: 0, y: 0 }, vx: [-520, 520], vy: [-1000, -380], ay: 2400,
      scale: { start: [0.5, 1.3], end: [0.4, 1.0] }, alpha: 1, rotation: [-12, 12], blend: 'normal',
    });
    this.feathers = new ParticleEmitter({
      texture: this.bt.feather, rate: 0, max: 120, life: [1.4, 2.4],
      area: { x: 0, y: 0 }, vx: [-60, 60], vy: [60, 160], wobble: { amp: 120, freq: 2.5 },
      scale: { start: [0.5, 0.8], end: [0.3, 0.5] }, alpha: 0.95, rotation: [-2, 2], tint: [0xffffff, 0xfff0c0], blend: 'add',
    });
    this.wisps = new ParticleEmitter({
      texture: fx.spark, rate: 0, max: 300, life: [0.6, 1.3],
      area: { x: 0, y: 0 }, vx: [-60, 60], vy: [-420, -160], wobble: { amp: 160, freq: 6 },
      scale: { start: [1.4, 2.4], end: [0.2, 0.4] }, alpha: 1, tint: [0x7affc0, 0xb055ff, 0xd0a0ff], blend: 'add',
    });
    // --- Météo : trois régimes, un seul actif par décor ---
    this.rain = new ParticleEmitter({
      texture: this.bt.streak, rate: 260, max: 260, life: [0.7, 1.1],
      area: { x: 0, y: -300, w: 2100, h: 120 },
      vx: [-260, -180], vy: [1300, 1700],
      scale: { start: [0.5, 0.9], end: [0.4, 0.8] }, alpha: 0.32, tint: 0xbfe8ff,
      blend: 'add', rotation: [0.9, 1.05],
    });
    this.snow = new ParticleEmitter({
      texture: fx.spark, rate: 90, max: 200, life: [3, 5],
      area: { x: 0, y: -320, w: 2100, h: 140 },
      vx: [-60, 60], vy: [90, 160], wobble: { amp: 55, freq: 1.4 },
      scale: { start: [0.10, 0.22], end: [0.08, 0.18] }, alpha: 0.85, tint: 0xffffff,
      blend: 'normal', rotation: [0, 6],
    });
    this.ash = new ParticleEmitter({
      texture: fx.spark, rate: 70, max: 160, life: [3.4, 6],
      area: { x: 0, y: -320, w: 2100, h: 140 },
      vx: [-30, 50], vy: [40, 90], wobble: { amp: 70, freq: 1.1 },
      scale: { start: [0.09, 0.2], end: [0.06, 0.14] }, alpha: 0.5, tint: [0x8a7a70, 0x5a4a44, 0xff8a4a],
      blend: 'normal',
    });
    this.applyWeather(this.scene);
    this.fgLayer.addChild(this.ash.container, this.snow.container, this.rain.container);

    this.cineMotes = new ParticleEmitter({
      texture: fx.spark, rate: 0, max: 200, life: [0.4, 0.9],
      area: { x: 0, y: 0 }, vx: [-260, 260], vy: [-300, 60], wobble: { amp: 60, freq: 5 },
      scale: { start: [1, 2], end: [0.1, 0.3] }, alpha: 1, blend: 'add',
    });

    this.world.addChild(
      this.bgLayer,
      this.ambientBack,
      this.dim,
      this.impactBg,
      this.groundNormal,
      this.groundFx,
      this.unitsLayer,
      this.debris.container,
      this.smoke.container,
      this.fxNormal,
      this.fxLayer,
      this.plague.container,
      this.wisps.container,
      this.fire.container,
      this.sparks.container,
      this.motes.container,
      this.feathers.container,
      this.cineMotes.container,
      this.fgLayer,
      this.textLayer,
    );
    this.fxEmitters = [this.sparks, this.motes, this.smoke, this.fire, this.plague, this.debris, this.feathers, this.wisps, this.rain, this.snow, this.ash];

    // Calques écran (au-dessus du terrain)
    this.speedLines = new Sprite(this.bt.speed);
    this.speedLines.anchor.set(0.5);
    this.speedLines.blendMode = 'add';
    this.speedLines.alpha = 0;
    this.flash.alpha = 0;
    this.flash.blendMode = 'add';
    this.barTop.tint = this.barBot.tint = 0x000000;
    this.barTop.visible = this.barBot.visible = false;

    // Étalonnage : plus de relief, couleurs plus riches, sans écraser les noirs.
    this.grade.contrast(0.11, true);
    this.grade.saturate(0.16, true);
    this.grade.brightness(1.02, true);

    // Vignette : regarde au centre de l'image.
    this.vignette = new Sprite(fx.vignette);
    this.vignette.anchor.set(0.5);
    this.vignette.alpha = 0.5;
    this.vignette.eventMode = 'none';

    // Grain : très léger, il casse la platitude numérique.
    this.grain = new TilingSprite({ texture: fx.noise, width: 64, height: 64 });
    this.grain.alpha = 0.045;
    this.grain.eventMode = 'none';

    // Verre brisé : plein écran, additif, il « casse » l'image à l'ouverture d'un ultime.
    this.glass = new Sprite(fx.glass);
    this.glass.anchor.set(0.5);
    this.glass.blendMode = 'add';
    this.glass.alpha = 0;
    this.glass.visible = false;
    this.glass.eventMode = 'none';

    this.root.addChild(this.world, this.vignette, this.grain, this.glass, this.speedLines, this.barTop, this.barBot, this.flash);

    this.bloom = new FastBloomFilter({ threshold: 0.84, bloomScale: 0.5, brightness: 0.92, blur: 6, quality: 3 });
    // Les filtres suivent la résolution de rendu (qui s'adapte si le jeu ralentit)
    const syncRes = (): void => { this.bloom.resolution = this.shock.resolution = this.zoomBlur.resolution = this.rgb.resolution = game.resolution; };
    syncRes();
    game.on('resolution', syncRes);
    this.cam = new BattleCamera(game.app.renderer, this.root, this.world, this.bgLayer, this.fgLayer);
    this.director = new CineDirector(this);
    game.app.stage.addChild(this.root);
    game.on('resize', () => this.layout());
    this.layout();
  }

  /**
   * Active le climat du décor courant.
   *
   * Appelée deux fois : une première fois par `buildDecor()` au tout début du
   * constructeur (les émetteurs ne sont pas encore créés — d'où le garde-fou),
   * puis une seconde fois une fois la météo construite.
   */
  private applyWeather(scene: SceneId | null): void {
    if (!this.rain || !this.snow || !this.ash) return;
    this.rain.enabled = scene === 'swamp';
    this.snow.enabled = scene === 'citadel';
    this.ash.enabled = scene === 'throne';
  }

  /** (Re)construit le décor d'un niveau. Les textures sont partagées : seuls les objets sont détruits. */
  private buildDecor(scene: SceneId): void {
    if (this.scene === scene) return;
    this.scene = scene;
    for (const c of [this.bgDecor, this.fgDecor, this.ambientBack]) {
      for (const ch of c.removeChildren()) ch.destroy({ children: true });
    }
    for (const t of this.bandTexs) t.destroy(true);
    this.bandTexs = [];
    this.bgPlanes = [];
    this.ambient = [];
    this.flames = [];
    this.glows = [];
    this.moonRays = null;
    this.fog = new Fog();
    this.fgFog = new Fog();
    const fx = this.fx;
    const swamp = scene === 'swamp';

    // Un seul temps par décor : la pluie du marais n'a rien à voir avec la neige de la citadelle.
    this.applyWeather(scene);

    // Quatre décors, quatre ambiances : le chapitre II ne ressemble plus au I.
    const bgTex =
      scene === 'swamp' ? this.tex.battle_bg_swamp
        : scene === 'citadel' ? this.tex.bg_citadel
          : scene === 'throne' ? this.tex.bg_throne
            : this.tex.battle_bg;
    this.buildParallaxBg(bgTex);

    const lights = new Container();
    lights.blendMode = 'add';
    const [mx, my] = BG(700, swamp || scene === 'citadel' ? 112 : 118);
    const moonTint = scene === 'citadel' ? 0xbfe0ff : scene === 'throne' ? 0xff7a3a : swamp ? 0x8affe8 : 0xff3a3a;
    const moon = this.makeSprite(fx.glowSoft, mx, my, swamp ? 620 : 560, moonTint, swamp ? 0.3 : 0.35);
    const moonRays = this.makeSprite(fx.rays, mx, my, 1200, moonTint, swamp ? 0.13 : 0.16);
    this.moonRays = moonRays;
    lights.addChild(moonRays, moon);

    /* ---------- Citadelle brisée : nuit froide, neige qui descend, lune par les vitraux ---------- */
    if (scene === 'citadel') {
      // Deux faisceaux lunaires qui traversent les vitraux brisés.
      for (const [wx, wy, sc, al] of [[1330, 150, 1.35, 0.14], [380, 130, 1.1, 0.11]] as const) {
        const [x, y] = BG(wx, wy);
        const shaft = this.makeSprite(fx.rays, x, y + 240, 900 * sc, 0xcfe6ff, al);
        shaft.rotation = 0.12;
        lights.addChild(shaft);
      }
      // Poussière de neige : elle tombe lentement, en dérivant.
      const snow = new ParticleEmitter({
        texture: fx.spark, rate: 22, max: 90, life: [3.2, 6.5],
        area: { x: 0, y: -220, w: VIEW_W + 200, h: 120 },
        vx: [-26, 10], vy: [26, 58], wobble: { amp: 26, freq: 1.4 },
        scale: { start: [0.5, 1.1], end: [0.3, 0.6] }, alpha: 0.7,
        tint: [0xffffff, 0xcfe6ff, 0x9ac8ff], blend: 'add',
      });
      this.flames.push(snow);
      lights.addChild(snow.container);
      // Deux braises gelées au sol pour rappeler qu'on est en dark fantasy.
      for (const [wx, wy] of [[210, 900], [1520, 880]] as const) {
        const [x, y] = BG(wx, wy);
        const g = this.makeSprite(fx.glow, x, y, 240, 0x7ac8ff, 0.3);
        this.glows.push({ s: g, a: 0.28, bob: 3, y0: y });
        lights.addChild(g);
      }
    }

    /* ---------- Trône de cendre : lave, braises montantes, contre-jour rouge ---------- */
    if (scene === 'throne') {
      // Lueur de lave au fond : une grande flaque chaude derrière le trône.
      const [lx, ly] = BG(700, 620);
      const lava = this.makeSprite(fx.glow, lx, ly, 1500, 0xff5a1a, 0.34);
      this.glows.push({ s: lava, a: 0.3, bob: 0, y0: ly });
      lights.addChild(lava);
      // Braises : elles MONTENT, contrairement à la neige.
      const embers = new ParticleEmitter({
        texture: fx.spark, rate: 30, max: 130, life: [1.6, 3.4],
        area: { x: 0, y: 900, w: VIEW_W + 100, h: 90 },
        vx: [-30, 30], vy: [-160, -70], wobble: { amp: 34, freq: 2.2 },
        scale: { start: [0.7, 1.6], end: [0.15, 0.4] }, alpha: 0.95,
        tint: [0xffd27a, 0xff7a2a, 0xff3a1a], blend: 'add',
      });
      this.flames.push(embers);
      lights.addChild(embers.container);
      // Trois foyers au sol, comme des fissures incandescentes.
      for (const [wx, wy, k] of [[160, 830, 1], [760, 880, 0.7], [1350, 840, 0.9]] as const) {
        const [x, y] = BG(wx, wy);
        const g = this.makeSprite(fx.glow, x, y, 420 * k, 0xff5a1a, 0.34);
        this.glows.push({ s: g, a: 0.3, bob: 4 * k, y0: y });
        lights.addChild(g);
        const fire = new ParticleEmitter({
          texture: fx.spark, rate: 12 * k, max: 22, life: [0.4, 0.9],
          area: { x: x - 30 * k, y: y - 4, w: 60 * k, h: 8 },
          vx: [-14, 14], vy: [-90 * k, -40 * k],
          scale: { start: [1.2 * k, 2.0 * k], end: [0.2, 0.4] },
          alpha: 0.9, tint: [0xffd27a, 0xff8a3a], blend: 'add',
        });
        this.flames.push(fire);
        lights.addChild(fire.container);
      }
    }

    if (scene === 'gallows') {
      for (const [x, y, big] of [[124, 330, 1], [462, 365, 0.8], [1194, 330, 1], [533, 305, 0.5], [539, 470, 0.5]] as const) {
        const [wx, wy] = BG(x, y);
        const b = big * 1.12;
        const glow = this.makeSprite(fx.glow, wx, wy, 320 * b, 0xff8a3a, 0.35);
        this.glows.push({ s: glow, a: 0.3, bob: 0, y0: wy });
        lights.addChild(glow);
        const flame = new ParticleEmitter({
          texture: fx.spark, rate: 26 * b, max: 40, life: [0.35, 0.7],
          area: { x: wx - 8 * b, y: wy - 4, w: 16 * b, h: 6 },
          vx: [-12, 12], vy: [-110 * b, -60 * b],
          scale: { start: [1.6 * b, 2.4 * b], end: [0.3, 0.6] },
          alpha: 0.95, tint: [0xffd27a, 0xff9a3a, 0xff6a2a], blend: 'add',
        });
        this.flames.push(flame);
        lights.addChild(flame.container);
      }
    } else if (scene === 'swamp') {
      // Lanternes des gibets
      for (const [x, y] of [[385, 305], [1200, 355]] as const) {
        const [wx, wy] = BG(x, y);
        const glow = this.makeSprite(fx.glow, wx, wy, 380, 0xff9a3a, 0.4);
        this.glows.push({ s: glow, a: 0.36, bob: 0, y0: wy });
        lights.addChild(glow, this.makeSprite(fx.glowSoft, wx, wy + 10, 140, 0xffd27a, 0.5));
        const flame = new ParticleEmitter({
          texture: fx.spark, rate: 9, max: 16, life: [0.3, 0.6],
          area: { x: wx - 6, y: wy, w: 12, h: 6 }, vx: [-6, 6], vy: [-40, -20],
          scale: { start: [1, 1.6], end: [0.2, 0.4] }, alpha: 0.9, tint: [0xffd27a, 0xff9a3a], blend: 'add',
        });
        this.flames.push(flame);
        lights.addChild(flame.container);
      }
      // Feux follets qui flottent au-dessus des eaux
      for (const [x, y, k] of [[125, 368, 1], [287, 392, 0.85], [490, 425, 0.6], [776, 382, 0.45], [800, 415, 0.5], [1086, 412, 0.75]] as const) {
        const [wx, wy] = BG(x, y);
        const halo = this.makeSprite(fx.glow, wx, wy, 190 * k, 0x6ad8ff, 0.5);
        const core = this.makeSprite(fx.glowSoft, wx, wy, 60 * k, 0xd8fbff, 0.8);
        this.glows.push({ s: halo, a: 0.5, bob: 6 * k, y0: wy }, { s: core, a: 0.8, bob: 6 * k, y0: wy });
        lights.addChild(halo, core);
        const trail = new ParticleEmitter({
          texture: fx.spark, rate: 5 * k, max: 14, life: [0.8, 1.6],
          area: { x: wx - 6, y: wy - 6, w: 12, h: 12 }, vx: [-8, 8], vy: [-30, -12], wobble: { amp: 10, freq: 2 },
          scale: { start: [0.8 * k, 1.3 * k], end: [0.1, 0.2] }, alpha: 0.9, tint: [0x9aeaff, 0x6ad8ff], blend: 'add',
        });
        this.flames.push(trail);
        lights.addChild(trail.container);
      }
    }
    this.bgDecor.addChild(lights);

    if (scene === 'citadel') {
      // Brume froide et légère : on voit loin dans la nef.
      this.fog.add({ texture: fx.fog, y: 610, height: 300, alpha: 0.3, tint: 0x6a8ab0, speed: 9, parallax: 0, tileScale: 1.2 });
      this.fog.add({ texture: fx.fogThin, y: 840, height: 300, alpha: 0.18, tint: 0x9ac8ff, speed: -12, parallax: 0, tileScale: 1.6 });
      this.fgFog.add({ texture: fx.fog, y: 970, height: 250, alpha: 0.42, tint: 0x0a1420, speed: 18, parallax: 0, tileScale: 1.8 });
    } else if (scene === 'throne') {
      // Fumée chaude qui monte du sol et encre le bas de l'image.
      this.fog.add({ texture: fx.fog, y: 600, height: 300, alpha: 0.36, tint: 0x8a3a1a, speed: 11, parallax: 0, tileScale: 1.2 });
      this.fog.add({ texture: fx.fogThin, y: 830, height: 300, alpha: 0.22, tint: 0xff7a3a, speed: -14, parallax: 0, tileScale: 1.6 });
      this.fgFog.add({ texture: fx.fog, y: 970, height: 250, alpha: 0.5, tint: 0x140604, speed: 22, parallax: 0, tileScale: 1.8 });
    } else if (swamp) {
      this.fog.add({ texture: fx.fog, y: 590, height: 280, alpha: 0.42, tint: 0x3a8a9a, speed: 10, parallax: 0, tileScale: 1.2 });
      this.fog.add({ texture: fx.fogThin, y: 830, height: 280, alpha: 0.26, tint: 0x5aa0b0, speed: -16, parallax: 0, tileScale: 1.6 });
      this.fgFog.add({ texture: fx.fog, y: 960, height: 260, alpha: 0.55, tint: 0x03141a, speed: 24, parallax: 0, tileScale: 1.8 });
    } else {
      this.fog.add({ texture: fx.fog, y: 600, height: 260, alpha: 0.35, tint: 0x6a5a9a, speed: 14, parallax: 0, tileScale: 1.2 });
      this.fog.add({ texture: fx.fogThin, y: 820, height: 280, alpha: 0.22, tint: 0x8a6aaa, speed: -22, parallax: 0, tileScale: 1.6 });
      this.fgFog.add({ texture: fx.fog, y: 960, height: 260, alpha: 0.5, tint: 0x120818, speed: 30, parallax: 0, tileScale: 1.8 });
    }
    this.fog.resize(VIEW_W + 800);
    this.fog.container.x = -400;
    this.bgDecor.addChild(this.fog.container);
    this.fgFog.resize(VIEW_W + 1200);
    this.fgFog.container.x = -600;
    this.fgDecor.addChild(this.fgFog.container);

    if (swamp) {
      // Spores qui dérivent et lucioles du marais
      const spores = new ParticleEmitter({
        texture: fx.spark, rate: 8, max: 70, life: [6, 10],
        area: { x: -300, y: -100, w: VIEW_W + 600, h: 10 },
        vx: [-15, 25], vy: [18, 40], wobble: { amp: 30, freq: 1 },
        scale: { start: [0.3, 0.6], end: [0.2, 0.4] }, alpha: 0.45, tint: [0x9ab8b0, 0x7a9890],
      });
      const fireflies = new ParticleEmitter({
        texture: fx.spark, rate: 6, max: 50, life: [3, 6],
        area: { x: -200, y: 520, w: VIEW_W + 400, h: 420 },
        vx: [-25, 25], vy: [-20, 10], wobble: { amp: 40, freq: 1.5 },
        scale: { start: [0.7, 1.2], end: [0.2, 0.4] }, alpha: 0.9, tint: [0xc8ff9a, 0x7ae0ff, 0xaaffd0], blend: 'add',
      });
      this.ambient.push(spores, fireflies);
      this.ambientBack.addChild(spores.container);
      this.fgDecor.addChild(fireflies.container);
    } else {
      // Cendres qui tombent et braises qui montent
      const ash = new ParticleEmitter({
        texture: fx.spark, rate: 10, max: 80, life: [5, 9],
        area: { x: -300, y: -100, w: VIEW_W + 600, h: 10 },
        vx: [-25, 15], vy: [30, 60], wobble: { amp: 25, freq: 1.3 },
        scale: { start: [0.3, 0.6], end: [0.2, 0.4] }, alpha: 0.5, tint: [0xbab0c8, 0x8a8098],
      });
      const embers = new ParticleEmitter({
        texture: fx.spark, rate: 7, max: 50, life: [3, 6],
        area: { x: -200, y: VIEW_H + 60, w: VIEW_W + 400, h: 10 },
        vx: [-20, 20], vy: [-90, -40], wobble: { amp: 30, freq: 2 },
        scale: { start: [0.6, 1.1], end: [0.1, 0.3] }, alpha: 0.9, tint: [0xff8a3a, 0xff5a2a, 0xffc06a], blend: 'add',
      });
      this.ambient.push(ash, embers);
      this.ambientBack.addChild(ash.container);
      this.fgDecor.addChild(embers.container);
    }
    this.ambient.forEach((e) => {
      e.rateMultiplier = this.quality !== 'low' ? 1 : 0.4;
      e.prewarm(6);
    });
  }

  /**
   * Décor en 2.5D : la MÊME illustration est découpée en plans de profondeur.
   * Chaque plan glisse à sa propre vitesse quand la caméra bouge → le champ de bataille
   * se lit en volume au lieu d'être une image plate.
   */
  private buildParallaxBg(tex: Texture): void {
    const W = tex.width * BG_SCALE;
    const H = tex.height * BG_SCALE;
    const left = VIEW_W / 2 - W / 2;
    const top = VIEW_H / 2 - H / 2;

    // --- Plan lointain : ciel, lune et château (l'image entière) ---
    const far = new Sprite(tex);
    far.anchor.set(0.5);
    far.position.set(VIEW_W / 2, VIEW_H / 2);
    far.scale.set(BG_SCALE);
    this.bgDecor.addChild(far);
    this.bgPlanes.push({ s: far, k: 0, bx: VIEW_W / 2, by: VIEW_H / 2 });

    // --- Plans rapprochés : bandes découpées avec un fondu intégré à la texture ---
    const bands = [
      // `k` = vitesse SUPPLÉMENTAIRE par rapport au fond.
      // Le sol (0,10) compense exactement l'atténuation du calque de fond : il glisse
      // donc à la vitesse des combattants, personne ne « patine ».
      { k: 0.05, v0: 0.38, v1: 0.95, stops: [[0.43, 0], [0.55, 1], [0.86, 1], [0.95, 0]] },
      { k: 0.10, v0: 0.72, v1: 1.0, stops: [[0.77, 0], [0.87, 1], [1.0, 1]] },
    ] as const;

    for (const b of bands) {
      let bandTex: Texture | null = null;
      try {
        bandTex = this.bandTexture(tex, b.v0, b.v1, b.stops as unknown as ReadonlyArray<readonly [number, number]>);
      } catch (err) {
        console.warn('[décor] découpe en plans impossible, fond classique conservé', err);
        continue;
      }
      this.bandTexs.push(bandTex);
      const s = new Sprite(bandTex);
      s.anchor.set(0, 0);
      // Échelle STRICTEMENT identique au fond : au repos, la bande recouvre exactement
      // les mêmes pixels. Aucun décalage, aucun doublon visible.
      s.scale.set(BG_SCALE);
      const bx = left;
      const by = top + b.v0 * H;
      s.position.set(bx, by);
      this.bgDecor.addChild(s);
      this.bgPlanes.push({ s, k: b.k, bx, by });
    }
    // Le décor vient d'être reconstruit : on réapplique le flou de profondeur.
    this.applyDof();
  }

  /** Découpe une bande horizontale de l'illustration avec un alpha en dégradé. */
  private bandTexture(
    tex: Texture, v0: number, v1: number,
    stops: ReadonlyArray<readonly [number, number]>,
  ): Texture {
    const w = tex.width;
    const hFull = tex.height;
    const y0 = Math.max(0, Math.floor(v0 * hFull));
    const y1 = Math.min(hFull, Math.ceil(v1 * hFull));
    const h = Math.max(1, y1 - y0);
    const c = document.createElement('canvas');
    c.width = w;
    c.height = h;
    const ctx = c.getContext('2d');
    if (!ctx) throw new Error('contexte 2D indisponible');
    const src = tex.source.resource as CanvasImageSource;
    ctx.drawImage(src, 0, y0, w, h, 0, 0, w, h);
    // On ne garde que la bande, avec un fondu vers le haut et vers le bas.
    ctx.globalCompositeOperation = 'destination-in';
    const g = ctx.createLinearGradient(0, 0, 0, h);
    for (const [o, a] of stops) {
      const local = (o - y0 / hFull) / (h / hFull);
      if (local > 0 && local < 1) g.addColorStop(local, `rgba(255,255,255,${a})`);
    }
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
    return Texture.from(c);
  }

  /**
   * Flou de profondeur : le lointain se fond, le plan de combat reste net.
   * C'est ce qui « détache » les personnages du décor — donc ce qui rend le combat lisible.
   */
  private applyDof(): void {
    const q = this.quality;
    const far = this.bgPlanes[0]?.s;
    const mid = this.bgPlanes[1]?.s;
    // Flou volontairement TRÈS léger : sur les captures, un flou marqué donnait
    // l'impression que tout le jeu était hors mise au point. On garde juste un
    // léger adoucissement du lointain, qui détache les personnages sans baver.
    if (far) far.filters = q === 'low' ? [] : [this.farBlur];
    if (mid) mid.filters = [];
    this.farBlur.strength = q === 'ultra' ? 2.4 : 1.4;
  }

  /** Fait glisser les plans les uns par rapport aux autres selon la caméra. */
  private updateBgPlanes(): void {
    if (!this.bgPlanes.length) return;
    const dx = this.cam.cur.x - VIEW_W / 2;
    const dy = this.cam.cur.y - VIEW_H / 2;
    for (const p of this.bgPlanes) {
      // Plus le plan est proche, plus il se déplace.
      p.s.x = p.bx + dx * p.k;
      p.s.y = p.by + dy * p.k * 0.6;
    }
  }

  private makeSprite(texture: Texture, x: number, y: number, size: number, tint: number, alpha: number): Sprite {
    const s = new Sprite(texture);
    s.anchor.set(0.5);
    s.position.set(x, y);
    s.width = s.height = size;
    s.tint = tint;
    s.alpha = alpha;
    return s;
  }

  setQuality(q: Quality): void {
    this.quality = q;
    // Bloom + étalonnage : les deux couches qui donnent le rendu « film ».
    this.world.filters = q !== 'low' ? [this.bloom, this.grade] : [];
    this.vignette.alpha = q === 'low' ? 0.32 : 0.5;
    this.grain.alpha = q === 'ultra' ? 0.055 : q === 'high' ? 0.04 : 0;
    this.applyDof();
    this.ambient.forEach((e) => (e.rateMultiplier = q !== 'low' ? 1 : 0.4));
  }

  layout(): void {
    const w = this.game.app.screen.width;
    const h = this.game.app.screen.height;
    this.cover = Math.max(w / VIEW_W, h / VIEW_H);
    this.flash.width = w;
    this.flash.height = h;
    this.root.filterArea = new Rectangle(0, 0, w, h);
    this.speedLines.position.set(w / 2, h / 2);
    const s = Math.max(w, h) * 1.25 / this.bt.speed.width;
    this.speedLines.scale.set(s);
    this.vignette.position.set(w / 2, h / 2);
    this.vignette.width = w * 1.02;
    this.vignette.height = h * 1.02;
    this.grain.width = w;
    this.grain.height = h;
    this.glass.position.set(w / 2, h / 2);
    this.glass.width = w * 1.1;
    this.glass.height = h * 1.1;
    this.cam.apply(w, h, this.cover);
  }

  get active(): boolean { return this.phase !== 'idle'; }
  get fighting(): boolean { return this.phase === 'fight'; }

  /* =========================== Cycle de vie =========================== */

  start(stage: StageDef, team: readonly TeamMember[], opts: { training?: boolean } = {}): void {
    this.clear();
    // Braises sur les ennemis dès le chapitre 2 : le monde brûle de plus en plus.
    this.chapter2 = !stage.id.startsWith('1-');
    const boss = stage.enemies.find((e) => e.boss);
    this.bossName = boss ? boss.def.name : '';
    this.stageName = stage.name;
    this.buildDecor(stage.scene);
    const sim = new BattleSim(stage, team, Math.random, { training: opts.training });
    this.training = !!opts.training;
    this.trainingAcc = 0;
    this.sim = sim;
    this.bossUid = sim.boss?.uid ?? -1;
    this.bindSim(sim);
    sim.setup();
    this.phase = 'intro';
    this.introT = 0;
    this.time = 0;
    this.endT = 0;
    this.usedUlt = false;
    this.root.visible = true;
    this.prewarm();
    audio.music('battle');
    // Les héros arrivent en courant depuis la gauche, les ennemis surgissent de la brume.
    for (const u of sim.units) {
      this.homes.set(u.uid, u.x);
      if (u.side === 'hero') u.x -= 650 + Math.random() * 80;
    }
    // Plan d'ouverture : la caméra part des ennemis puis revient sur la mêlée
    const foes = sim.units.filter((u) => u.side === 'enemy');
    const fx = foes.reduce((s, u) => s + u.x, 0) / Math.max(1, foes.length);
    this.cam.reset();
    this.cam.cut({ x: fx - 60, y: 600, zoom: 1.32, roll: -0.025 });
    this.cam.go({ x: fx - 160, zoom: 1.25, roll: 0 }, 1.2);
  }

  stop(): void {
    this.clear();
    this.phase = 'idle';
    this.root.visible = false;
  }

  /** Nettoyage défensif : un objet récalcitrant ne doit jamais empêcher de sortir du combat. */
  private clear(): void {
    const safe = (label: string, fn: () => void): void => {
      try { fn(); } catch (err) { console.warn(`[battle] nettoyage : ${label}`, err); }
    };
    safe('cinématique', () => this.director.reset());
    for (const v of this.views.values()) safe('combattant', () => v.destroy());
    this.views.clear();
    for (const p of this.projViews.values()) safe('projectile', () => this.removeProj(p));
    this.projViews.clear();
    for (const f of this.fxSprites) {
      safe('effet', () => {
        (f as FxSprite & { emitter?: ParticleEmitter }).emitter?.container.destroy({ children: true });
        f.s.destroy();
      });
    }
    this.fxSprites.length = 0;
    for (const a of this.anims) safe('animation', () => a.obj.destroy({ children: true }));
    this.anims.length = 0;
    for (const t of this.texts) safe('texte', () => this.releaseNumber(t.t));
    this.texts.length = 0;
    this.homes.clear();
    this.flashT = this.hitstopT = this.impactT = this.zoomBlurT = this.speedT = 0;
    this.glassT = this.negT = this.drainT = 0;
    if (this.glass) { this.glass.visible = false; this.glass.alpha = 0; }
    this.shockT = -1;
    this.timeScale = this.tsTarget = 1;
    this.rgbT = 0;
    this.dimTarget = 0;
    this.dim.alpha = 0;
    this.barsTarget = this.barsK = 0;
    this.spot = null;
    this.impactBg.visible = false;
    this.paused = false;
    this.sim = null;
  }

  /* =========================== Ultimes =========================== */

  setAuto(on: boolean): void {
    this.auto = on;
    this.autoCd = 0.3;
  }

  /** Demande l'ultime d'un héros (clic sur sa carte ou mode AUTO). */
  requestUltimate(u: Unit): boolean {
    const sim = this.sim;
    if (!sim || this.phase !== 'fight' || this.paused || !sim.canUltimate(u)) return false;
    if (!this.director.request(u)) return false;
    this.usedUlt = true;
    return true;
  }

  /* =========================== Outils pour les cinématiques =========================== */

  /** Ralenti (1 = normal). `rate` : vitesse de transition. */
  setTimeScale(k: number, rate = 10): void {
    this.tsTarget = k;
    this.tsRate = rate;
    if (rate === Infinity) this.timeScale = k;
  }

  /** Arrêt sur impact : le temps se fige un court instant. */
  hitstop(s: number): void {
    this.hitstopT = Math.max(this.hitstopT, s);
  }

  /** Image d'impact façon anime : fond blanc + silhouettes noires, puis fond noir. */
  impactFrame(dur = 0.12, color = 0xffffff): void {
    this.impactCol = color;
    this.impactT = dur;
    this.impactDur = dur;
  }

  /**
   * L'écran se brise : fissure de verre plein écran qui s'efface vite.
   * C'est le « déclic » d'ouverture des ultimes façon anime.
   */
  glassBreak(dur = 0.42): void {
    this.glassT = this.glassDur = dur;
    this.glass.visible = true;
    this.glass.alpha = 1;
    this.glass.rotation = rand(-0.05, 0.05);
  }

  /**
   * Le monde se vide de ses couleurs pendant que le boss meurt.
   * Le boss, lui, reste en blanc pur : il est le seul objet encore « vivant ».
   */
  worldDrain(dur = 1.5): void {
    this.drainT = this.drainDur = dur;
  }

  /** Inversion des couleurs sur quelques images : le choc « saute » à l'œil. */
  negativeFlash(dur = 0.05): void {
    this.negT = Math.max(this.negT, dur);
  }

  /** Onde de choc qui déforme l'image. */
  shockwave(x: number, y: number, power = 1): void {
    const p = this.cam.toScreen(x, y, this.game.app.screen.width, this.game.app.screen.height, this.cover);
    this.shock.centerX = p.x;
    this.shock.centerY = p.y;
    this.shock.amplitude = 30 * power;
    this.shock.wavelength = 180 * Math.sqrt(power);
    this.shock.time = 0;
    this.shockT = 0;
  }

  /** Flou radial (effet de vitesse vers un point). */
  zoomBlurAt(x: number, y: number, strength: number, dur: number): void {
    const p = this.cam.toScreen(x, y, this.game.app.screen.width, this.game.app.screen.height, this.cover);
    this.zoomBlur.centerX = p.x;
    this.zoomBlur.centerY = p.y;
    this.zoomBlurMax = strength;
    this.zoomBlurT = dur;
    this.zoomBlurDur = dur;
  }

  /** Lignes de vitesse façon manga sur tout l'écran. */
  /** Déchirure chromatique brève (rouge/bleu séparés) : la signature des gros impacts. */
  rgbSplit(strength = 9, dur = 0.22): void {
    this.rgbMax = strength;
    this.rgbDur = Math.max(0.05, dur);
    this.rgbT = this.rgbDur;
  }

  /** Un sort lancé doit « claquer » : coup de zoom, halo au sol, déchirure chromatique. */
  private juiceCast(u: Unit): void {
    const v = this.views.get(u.uid);
    if (!v) return;
    const c = v.chest;
    this.cam.punch(0.012);
    this.cam.shake(0.14);
    this.rgbSplit(5, 0.16);
    this.fxSprite(this.fx.ring, c.x, c.y - 30, { tint: u.def.color, life: 0.34, scale: [0.2, 1.5], alpha: [0.75, 0] });
    this.fxSprite(this.fx.glow, c.x, c.y - 30, { tint: u.def.color, life: 0.26, scale: [0.3, 1.1], alpha: [0.5, 0] });
  }

  /**
   * Ressenti d'impact « jeu de combat » : c'est CE détail qui fait qu'un coup
   * pèse quelque chose. Chaque dégât déclenche une combinaison d'effets
   * proportionnelle à sa violence, comme dans un jeu de bagarre.
   */
  private juiceImpact(rel: number, crit: boolean, heavy: boolean, x: number, y: number, color: number, dirX = 0): void {
    // Intensité de 0 à 1 : un coup qui retire 20 % des PV sonne déjà très fort.
    let p = Math.min(1, rel * 5.2);
    if (crit) p = Math.min(1, p + 0.30);
    if (heavy) p = Math.min(1, p + 0.12);
    if (this.quality === 'low') p *= 0.5;

    // 1. La caméra encaisse le coup — et recule dans le SENS du choc.
    this.cam.shake(0.12 + p * 0.55);
    this.cam.punch(0.004 + p * 0.032);
    if (p > 0.20) this.cam.kick(dirX * (2 + p * 15), -p * 4);

    // 2. Déchirure chromatique : la signature des jeux de combat modernes.
    if (p > 0.30) this.rgbSplit(2 + p * 14, 0.09 + p * 0.15);

    // 3. Lignes de vitesse quand le coup compte vraiment.
    if (p > 0.66) this.speedLinesOn(0.08 + p * 0.20, 0.10 + p * 0.12, color);

    // 4. Onde de choc au sol sur les gros impacts.
    if (p > 0.55) this.shockwave(x, y - 10, 0.45 + p * 1.1);

    // 5. Micro-freeze : le temps s'arrête une fraction de seconde.
    if (p > 0.62) this.hitstop(0.02 + p * 0.05);

    // 6. Éclat d'impact : un « pop » blanc au point de contact.
    this.fxSprite(this.fx.spark, x, y, {
      tint: 0xffffff, life: 0.15, scale: [0.25, 0.85 + p * 0.75], alpha: [0.95, 0],
      rot: rand(0, Math.PI * 2), vrot: rand(-4, 4),
    });
    if (p > 0.5) {
      this.fxSprite(this.fx.ring, x, y, { tint: color, life: 0.24, scale: [0.18, 1.1 + p], alpha: [0.72, 0] });
    }
  }

  speedLinesOn(alpha: number, dur: number, tint = 0xffffff): void {
    this.speedMax = alpha;
    this.speedT = dur;
    this.speedLines.tint = tint;
  }

  /** Met une unité en avant : toutes les autres sont assombries. */
  spotlight(u: Unit | null): void {
    this.spot = u;
  }

  shake(amount: number): void {
    this.cam.shake(amount);
  }

  flashScreen(color: number, alpha: number): void {
    this.flash.tint = color;
    this.flashT = Math.max(this.flashT, alpha);
  }

  view(u: Unit | null | undefined): UnitView | undefined {
    return u ? this.views.get(u.uid) : undefined;
  }

  /** Ajoute une animation libre (objet détruit à la fin). `real` = en temps réel (insensible au ralenti). */
  anim(obj: Container, layer: Container, life: number, fn: (k: number, dt: number) => void, real = false): void {
    layer.addChild(obj);
    this.anims.push({ obj, life: 0, max: life, fn, real });
    fn(0, 0);
  }

  /**
   * Petit différé branché sur la boucle d'effets : sert aux volées (Corvin, Elara)
   * qui doivent s'égrener sans dépendre de la simulation.
   */
  private laterFx(delay: number, fn: () => void): void {
    let done = false;
    const seed = new Container();
    this.anim(seed, this.fxLayer, Math.max(0.001, delay), (k) => {
      if (!done && k >= 1) { done = true; fn(); }
    });
  }

  /** Éclair zigzaguant entre deux points. */
  lightning(x1: number, y1: number, x2: number, y2: number, color: number, width = 6, life = 0.28): void {
    const g = new Graphics();
    const draw = (): void => {
      g.clear();
      const pts: Array<[number, number]> = [[x1, y1]];
      const n = 10;
      const len = Math.hypot(x2 - x1, y2 - y1);
      const nx = -(y2 - y1) / len, ny = (x2 - x1) / len;
      for (let i = 1; i < n; i++) {
        const k = i / n;
        const off = (Math.random() - 0.5) * len * 0.12 * Math.sin(k * Math.PI);
        pts.push([x1 + (x2 - x1) * k + nx * off, y1 + (y2 - y1) * k + ny * off]);
      }
      pts.push([x2, y2]);
      for (const [w, a, c] of [[width * 4, 0.25, color], [width * 1.8, 0.6, color], [width * 0.7, 1, 0xffffff]] as const) {
        g.moveTo(pts[0]![0], pts[0]![1]);
        for (let i = 1; i < pts.length; i++) g.lineTo(pts[i]![0], pts[i]![1]);
        g.stroke({ width: w, color: c, alpha: a, cap: 'round', join: 'round' });
      }
    };
    let acc = 0;
    this.anim(g, this.fxLayer, life, (k, dt) => {
      acc += dt;
      if (acc > 0.05 || k === 0) { acc = 0; draw(); }
      g.alpha = k < 0.5 ? 1 : (1 - k) * 2 * (Math.random() < 0.3 ? 0.4 : 1);
    });
  }

  /** Traînée lumineuse d'un point à un autre (dashs). */
  streak(x1: number, y1: number, x2: number, y2: number, color: number, thick = 1, life = 0.3): void {
    const s = new Sprite(this.bt.streak);
    s.anchor.set(1, 0.5);
    s.position.set(x2, y2);
    s.rotation = Math.atan2(y2 - y1, x2 - x1);
    const len = Math.hypot(x2 - x1, y2 - y1);
    s.tint = color;
    this.anim(s, this.fxLayer, life, (k) => {
      s.scale.set(len / 512, thick * (1 - k) * 1.4);
      s.alpha = 1 - k * k;
    });
  }

  /** Image rémanente d'un combattant (copie figée de sa pose). */
  afterimage(u: Unit, tint: number, life = 0.35, alpha = 0.7): void {
    const v = this.views.get(u.uid);
    if (!v) return;
    const m = v.snapshot();
    m.tint = tint;
    m.blendMode = 'add';
    this.anim(m, this.fxLayer, life, (k) => (m.alpha = alpha * (1 - k)));
  }

  /* =========================== Événements de la simulation =========================== */

  private bindSim(sim: BattleSim): void {
    sim.on('spawn', (u) => {
      const view = new UnitView(u, this.tex[u.def.texture], this.bt, this.fx);
      view.onDissolve = (v) => this.dissolve(v);
      view.ember = this.chapter2 && u.side === 'enemy';
      // Poussière sous les pas : ancre les personnages au sol.
      view.onFootstep = (x, y, u) => {
        if (u.isBoss) return;
        this.fxSprite(this.fx.smoke, x + rand(-10, 10), y - 2, {
          tint: u.side === 'hero' ? 0x8a7a6a : 0x5a4a62,
          life: 0.45, scale: [0.14, 0.4], alpha: [0.32, 0],
          vy: -14, flatten: 0.55, normal: true, ease: 'out',
        });
      };
      this.views.set(u.uid, view);
      this.unitsLayer.addChild(view.root);
      if (u.side === 'enemy' || u.isSummon) view.spawnIn();
      if (u.side === 'enemy') this.smoke.burst(8, u.x, u.y - 40, 0x5a3a7a);
    });

    sim.on('attack', ({ u }) => {
      const v = this.views.get(u.uid);
      v?.attack();
      if (u.ranged) return;
      // Le sifflement de la lame juste avant l'impact
      const strike = strikeDelay(u.def.texture, false, u.isSummon) / (this.speed * Math.max(0.2, this.timeScale));
      const pan = audio.panX(u.x);
      const id = u.def.id;
      if (id === 'kael' || id === 'warden' || id === 'queen') audio.play('swing_h', { delay: Math.max(0, strike - 0.1), pan, rate: id === 'queen' ? 0.8 : 1 });
      else if (id === 'thorne') {
        audio.play('swing_h', { delay: Math.max(0, strike - 0.1), pan, rate: 0.85 });
        audio.play('block', { delay: strike, pan, rate: 1.7, vol: 0.35 });
      } else if (id === 'drowned') {
        audio.play('swing_h', { delay: Math.max(0, strike - 0.1), pan, rate: 0.7, vol: 0.8 });
        audio.play('ghoul_atk', { delay: Math.max(0, strike - 0.3), pan, rate: 0.65, vol: 0.4 });
      } else if (id === 'ghoul') audio.play('ghoul_atk', { delay: Math.max(0, strike - 0.25), pan, vol: 0.55 });
      else audio.play('swing_l', { delay: Math.max(0, strike - 0.06), pan, vol: u.isSummon ? 0.5 : 1 });
    });

    sim.on('bond', ({ name, line }) => this.emit('bond', { name, line }));

    sim.on('damage', ({ target, amount, crit, absorbed, kind, source, cls }) => {
      const v = this.views.get(target.uid);
      if (!v) return;
      const c = v.chest;
      const pan = audio.panX(target.x);
      const melee = !!source && !source.ranged && kind === 'phys';
      const heavy = !!source && (source.def.id === 'kael' || source.def.id === 'thorne' || source.isBoss);
      if (kind !== 'dot') v.hit(heavy || crit, (amount - absorbed) / Math.max(1, target.maxHp));
      const col = source?.def.color ?? 0xffffff;
      if (absorbed >= amount) {
        this.number('Bloqué', c.x, c.y - 40, 'block');
        audio.play('block', { pan, vol: 0.7 });
        this.sparks.burst(10, c.x, c.y, 0xffd27a);
        return;
      }
      // Avantage d'affinité : le chiffre prend la couleur de la classe de l'attaquant.
      const advTint = cls > 1 && source ? CLASSES[source.cls].color : cls < 1 ? 0x7c7488 : undefined;
      this.number(String(amount - absorbed), c.x, c.y - 40, kind === 'dot' ? 'dot' : crit ? 'crit' : target.side === 'hero' ? 'hurt' : 'dmg', advTint);
      if (kind === 'dot') return;
      this.sparks.burst(crit ? 16 : 6, c.x, c.y, crit ? 0xffe27a : col);
      // La défense qui a encaissé se voit : étincelles bleues sur l'armure, violettes sur la résistance.
      this.deflectFx(c.x, c.y, kind, cls);
      // Le coup doit se SENTIR : intensité proportionnelle aux dégâts infligés.
      const kx = source ? Math.sign(target.x - source.x) : 0;
      this.juiceImpact((amount - absorbed) / Math.max(1, target.maxHp), !!crit, heavy, c.x, c.y, col, kx);
      if (melee && source) {
        // Entaille orientée dans le sens du coup
        const dir = source.x <= target.x ? 1 : -1;
        // Traînées d'impact : elles partent dans le sens du coup, on lit d'où il vient.
        const n = crit ? 7 : heavy ? 6 : 4;
        for (let i = 0; i < n; i++) {
          const a = (dir > 0 ? 0 : Math.PI) + rand(-0.8, 0.8);
          const len = rand(45, crit ? 130 : 95);
          this.streak(c.x, c.y, c.x + Math.cos(a) * len, c.y + Math.sin(a) * len,
            crit ? 0xffe27a : heavy ? 0xffb08a : col, rand(1.2, 2.8), rand(0.16, 0.3));
        }
        const claw = source.def.id === 'ghoul' || source.isSummon;
        this.fxSprite(claw ? this.bt.claw : this.bt.slash, c.x, c.y, {
          tint: source.isBoss ? 0xff3bd0 : col, life: 0.22, scale: heavy ? [0.9, 1.5] : [0.6, 1.1], alpha: [1, 0],
          rot: (dir > 0 ? 0 : Math.PI) + rand(-0.5, 0.5), vrot: dir * 4,
        });
        this.fxSprite(this.fx.glow, c.x, c.y, { tint: 0xffffff, life: 0.12, scale: [0.2, heavy ? 1 : 0.6], alpha: [0.9, 0] });
        audio.play(heavy ? 'hit_heavy' : 'hit', { pan });
        this.hitstop(heavy ? 0.06 : 0.03);
        if (heavy) this.cam.shake(0.32);
      }
      if (crit) {
        audio.play('crit', { pan, vol: 0.8 });
        this.cam.punch(0.025);
        this.cam.shake(0.3);
        this.hitstop(0.07);
      }
    });

    sim.on('heal', ({ target, amount }) => {
      const v = this.views.get(target.uid);
      if (!v) return;
      const c = v.chest;
      this.number(`+${amount}`, c.x, c.y - 50, 'heal');
      this.motes.burst(6, c.x, c.y + 20, 0x8aff9a);
    });

    sim.on('projectile', (p) => this.addProj(p));
    sim.on('projectileEnd', (p) => {
      const pv = this.projViews.get(p.id);
      if (!pv) return;
      const pan = audio.panX(pv.lastX);
      if (p.kind !== 'pierce') {
        this.sparks.burst(p.kind === 'orb' ? 9 : 5, pv.lastX, pv.lastY, pv.color);
        this.fxSprite(this.fx.glow, pv.lastX, pv.lastY, { tint: pv.color, life: 0.22, scale: [0.25, 0.75], alpha: [0.6, 0] });
        if (p.kind === 'arrow' || p.kind === 'bone') audio.play('arrow_hit', { pan });
        else if (p.kind === 'orb') { audio.play('orb_hit', { pan }); this.plague.burst(3, pv.lastX, pv.lastY); }
        else if (p.kind === 'void') { audio.play('orb_hit', { pan, rate: 0.7 }); this.suck(pv.lastX, pv.lastY, 70, 0xa86bff, 5); }
        else if (p.kind === 'spark') { audio.play('stun', { pan, rate: 1.8, vol: 0.35 }); this.lightning(pv.lastX - 30, pv.lastY - 40, pv.lastX + 20, pv.lastY + 30, 0x8ae8ff, 3, 0.14); }
        else if (p.kind === 'hex') { audio.play('orb_hit', { pan, rate: 1.3, vol: 0.8 }); this.fire.burst(6, pv.lastX, pv.lastY); }
        else audio.play('orb_hit', { pan, rate: 1.5, vol: 0.55 });
      }
      this.removeProj(pv);
      this.projViews.delete(p.id);
    });

    sim.on('cast', ({ u, ability }) => {
      const v = this.views.get(u.uid);
      if (ability === 'skill') v?.cast(u.def.color);
      if (ability === 'skill' && u.side === 'hero') this.juiceCast(u);
      this.director.onCast(u, ability);
    });

    sim.on('ultReady', (u) => {
      if (u.side === 'hero') audio.play('ult_ready', { vol: 0.8 });
    });

    sim.on('fx', (e) => {
      this.onFx(e);
      this.director.onFx(e);
    });

    sim.on('death', (u) => {
      const v = this.views.get(u.uid);
      if (!v) return;
      v.die();
      const c = v.chest;
      const pan = audio.panX(u.x);
      if (u.isBoss) {
        audio.play('boss_die');
        this.director.bossDeath(u);
      } else if (u.side === 'enemy') {
        // Une élimination doit se fêter : ralenti d'un instant, onde, déchirure.
        this.cam.punch(0.018);
        this.cam.shake(0.24);
        this.rgbSplit(8, 0.18);
        this.hitstop(0.035);
        this.fxSprite(this.fx.ring, c.x, c.y, { tint: 0xffffff, life: 0.30, scale: [0.2, 1.5], alpha: [0.65, 0] });
        this.fxSprite(this.fx.spark, c.x, c.y, { tint: 0xffffff, life: 0.22, scale: [0.4, 1.3], alpha: [0.9, 0], rot: rand(0, 6.28), vrot: rand(-3, 3) });
        this.plague.burst(6, c.x, c.y, 0x7a2ac8);
        const id = u.def.id;
        if (id === 'drowned') { audio.play('ghoul_die', { pan, rate: 0.75 }); this.smoke.burst(10, c.x, c.y, 0x2a5a6a); }
        else if (id === 'witch') { audio.play('ghoul_die', { pan, rate: 1.4 }); this.fire.burst(14, c.x, c.y); }
        else audio.play(id === 'ghoul' ? 'ghoul_die' : 'skel_die', { pan });
      } else if (!u.isSummon) {
        this.motes.burst(20, c.x, c.y, 0xffffff);
        audio.play('hero_down', { pan });
      } else {
        this.smoke.burst(8, u.x, u.y - 50, 0x3a8a6a);
      }
    });

    sim.on('end', ({ winner }) => {
      for (const pv of this.projViews.values()) this.removeProj(pv);
      this.projViews.clear();
      this.phase = 'ending';
      this.endT = 0;
      this.director.ending(winner);
      if (winner === 'hero') {
        audio.music('victory');
      } else {
        this.dimTarget = 0.5;
        audio.music('none');
        audio.play('defeat');
      }
    });
  }

  /** Le corps d'un ennemi vaincu se dissout en poussière d'âme. */
  private dissolve(v: UnitView): void {
    const u = v.unit;
    const h = u.def.height;
    const col = u.side === 'enemy' ? 0xb07aff : 0xffffff;
    for (let i = 0; i < 6; i++) this.motes.burst(4, u.x + rand(-h * 0.3, h * 0.3), u.y - rand(0, h * 0.8), col);
    this.smoke.burst(4, u.x, u.y - h * 0.3, u.side === 'enemy' ? 0x2a1a3a : 0x3a3a4a);
  }

  private onFx(e: FxEvent): void {
    const fx = this.fx;
    const bt = this.bt;
    const uv = this.view(e.u);
    const pan = audio.panX(e.u?.x ?? 960);
    switch (e.type) {
      case 'boss_charge': {
        if (!e.u) return;
        const c = uv!.chest;
        // Le boss aspire la lumière : anneau qui se referme, particules happées, secousse.
        this.cam.shake(0.5);
        this.cam.punch(0.02);
        audio.play('boss_windup', { vol: 1 });
        audio.play('riser', { vol: 0.5, rate: 0.7 });
        this.pulse(e.u.x, e.u.y, e.u.def.color, 90, 520, 1.15);
        this.suck(c.x, c.y, 150, e.u.def.color, 26);
        for (let i = 0; i < 3; i++) {
          this.fxSprite(fx.ring, e.u.x, e.u.y, {
            tint: e.u.def.color, life: 1.1 + i * 0.25, scale: [2.4, 0.25], alpha: [0.35 + i * 0.15, 0], flatten: 0.3,
          });
        }
        this.emit('bosscast', { name: e.label ?? 'Ultime', kind: e.kind ?? 'nova', color: e.u.def.color });
        break;
      }
      case 'boss_impact': {
        if (!e.u) return;
        if (e.kind === 'cancel') {
          this.emit('banner', { text: 'Ultime interrompu !', kind: 'info' });
          audio.play('block');
          break;
        }
        audio.play('boss_slam', { vol: 1 });
        this.cam.shake(0.85);
        this.cam.punch(0.035);
        this.hitstop(0.06);
        this.rgbSplit(10, 0.2);
        const x = e.x ?? e.u.x;
        const y = e.y ?? e.u.y;
        if (e.kind === 'rain') {
          for (let i = 0; i < 10; i++) {
            const px = 200 + (i / 9) * 1500;
            this.lightning(px, y - 420, px + rand(-40, 40), y, e.u.def.color, 2, 0.3);
          }
        }
        this.fxSprite(fx.ring, x, y, { tint: e.u.def.color, life: 0.7, scale: [0.4, 5], alpha: [0.9, 0], flatten: 0.45 });
        this.fxSprite(fx.ring, x, y, { tint: 0xffffff, life: 0.45, scale: [0.2, 2.6], alpha: [0.8, 0], flatten: 0.45 });
        this.smoke.burst(24, x, y, 0x2a1a2a);
        this.debris.burst(18, x, y);
        this.emit('bossimpact', { name: e.label ?? '', kind: e.kind ?? 'nova' });
        break;
      }
      case 'kael_shield': {
        if (!e.u) return;
        audio.play('shield_up', { pan });
        const c = uv!.chest;
        this.pulse(e.u.x, e.u.y, 0xff7a2a, 60, 280, 0.6);
        this.fire.burst(22, c.x, c.y + 40);
        this.fxSprite(fx.glow, c.x, c.y, { tint: 0xffb05a, life: 0.5, scale: [1, 3], alpha: [0.8, 0] });
        this.fxSprite(bt.rune, e.u.x, e.u.y, { tint: 0xff8a3a, life: 0.8, scale: [0.4, 1.1], alpha: [0.9, 0], vrot: 2, flatten: 0.3 });
        break;
      }
      case 'kael_leap':
        audio.play('blink', { rate: 0.7, pan });
        this.fire.burst(20, e.x!, e.y! - 40);
        this.smoke.burst(8, e.x!, e.y!, 0x6a5040);
        this.debris.burst(8, e.x!, e.y!);
        this.pulse(e.x!, e.y!, 0xff9a4a, 20, 220, 0.4);
        break;
      case 'kael_slam': {
        const x = e.x!, y = e.y!;
        audio.play('ult_impact', { pan });
        audio.play('land', { pan, vol: 0.9 });
        audio.play('fire_burst', { pan, delay: 0.05 });
        audio.duck(0.3, 0.4, 1.2);
        this.cam.shake(1.1);
        this.flashScreen(0xff8a3a, 0.45);
        this.shockwave(x, y - 30, 1.3);
        this.pulse(x, y, 0xff7a2a, 40, 760, 0.6);
        this.pulse(x, y, 0xffd27a, 20, 480, 0.45);
        // Sol fissuré qui rougeoie puis s'éteint
        this.fxSprite(bt.crack, x, y + 4, { tint: 0x140804, life: 2.6, scale: [1.3, 1.45], alpha: [0.95, 0], ease: 'linear', normal: true, flatten: 0.3 });
        this.fxSprite(bt.crack, x, y + 4, { tint: 0xff6a1a, life: 1.6, scale: [1.3, 1.45], alpha: [1, 0], flatten: 0.3, ease: 'linear' });
        // Colonne de feu
        this.fxSprite(bt.beam, x, y + 20, { tint: 0xff7a2a, life: 0.7, scale: [1, 1], alpha: [1, 0], anchorY: 1, sx: 5, sy: 4.2 });
        this.fxSprite(bt.beam, x, y + 20, { tint: 0xffe0a0, life: 0.45, scale: [1, 1], alpha: [1, 0], anchorY: 1, sx: 2, sy: 4.6 });
        this.fxSprite(fx.glow, x, y - 60, { tint: 0xff7a2a, life: 0.7, scale: [1, 6], alpha: [1, 0] });
        this.fire.burst(90, x, y - 20);
        this.debris.burst(40, x, y - 10);
        this.smoke.burst(18, x, y - 10, 0x4a3a30);
        break;
      }
      case 'lyra_blink': {
        if (!e.u) return;
        audio.play('blink', { pan, vol: 0.7 });
        this.streak(e.x!, e.y! - 80, e.u.x, e.u.y - 80, 0xff2a4a, 1.2, 0.3);
        this.smoke.burst(6, e.x!, e.y! - 60, 0x2a0a14);
        this.motes.burst(8, e.u.x, e.u.y - 80, 0xff2a4a);
        break;
      }
      case 'lyra_slash': {
        if (!e.target) return;
        const tv = this.views.get(e.target.uid);
        if (!tv) return;
        audio.play('swing_l', { pan, vol: 0.8 });
        const c = tv.chest;
        const rot = rand(-0.9, 0.9);
        this.fxSprite(bt.slash, c.x, c.y, { tint: 0xff2a4a, life: 0.28, scale: [0.7, 1.45], alpha: [1, 0], rot, vrot: 3 });
        this.fxSprite(bt.claw, c.x, c.y, { tint: 0xffd0d8, life: 0.2, scale: [0.5, 1.1], alpha: [0.9, 0], rot: rot + 0.8 });
        this.streak(c.x - Math.cos(rot) * 260, c.y - Math.sin(rot) * 260, c.x + Math.cos(rot) * 260, c.y + Math.sin(rot) * 260, 0xff4a6a, 0.8, 0.22);
        this.sparks.burst(14, c.x, c.y, 0xff2a4a);
        break;
      }
      case 'lyra_ult_start':
        this.flashScreen(0xff1a3a, 0.25);
        break;
      case 'lyra_ult_end':
        break;
      case 'morwen_summon': {
        audio.play('summon', { pan, vol: 0.6 });
        const x = e.x!, y = e.y!;
        this.fxSprite(bt.rune, x, y, { tint: 0x7affc0, life: 1, scale: [0.2, 0.55], alpha: [1, 0], vrot: 3, flatten: 0.32 });
        this.fxSprite(fx.spiral, x, y, { tint: 0x7affc0, life: 1, scale: [0.4, 1.0], alpha: [0.9, 0], vrot: 5, flatten: 0.32 });
        this.pulse(x, y, 0xb055ff, 20, 200, 0.6);
        this.wisps.burst(10, x, y);
        break;
      }
      case 'morwen_charge':
        audio.play('summon', { pan, rate: 0.85 });
        break;
      case 'morwen_plague': {
        audio.play('plague', { pan });
        audio.play('explosion', { rate: 1.35, vol: 0.45, pan: 0.3 });
        this.flashScreen(0x8a2aff, 0.3);
        if (uv) this.fxSprite(fx.glow, uv.chest.x, uv.chest.y - 60, { tint: 0xb055ff, life: 0.8, scale: [0.5, 2.5], alpha: [1, 0] });
        for (const t of e.targets ?? []) {
          const tv = this.views.get(t.uid);
          if (!tv) continue;
          const c = tv.chest;
          this.plague.burst(18, c.x, c.y);
          this.wisps.burst(10, t.x, t.y - 20);
          this.fxSprite(fx.spiralSoft, t.x, t.y, { tint: 0x8a2aff, life: 1.4, scale: [0.3, 0.9], alpha: [0.8, 0], vrot: -3, flatten: 0.3 });
        }
        break;
      }
      case 'dot_tick': {
        const tv = this.view(e.target);
        if (tv) this.plague.burst(3, tv.chest.x, tv.chest.y);
        break;
      }
      case 'seren_skyshot':
        audio.play('bow', { pan, rate: 0.75, vol: 1.2 });
        audio.play('arrow_rain', { delay: 0.25 });
        break;
      case 'seren_volley': {
        for (const t of e.targets ?? []) {
          for (let i = 0; i < 4; i++) {
            const tx = t.x + rand(-70, 70);
            const ty = t.y - rand(10, 90);
            this.fallingArrow(tx - 200, ty - 760, tx, ty, 0.28 + i * 0.03);
          }
          this.fxSprite(bt.beam, t.x, t.y, { tint: 0x6ab8ff, life: 0.45, scale: [1, 1], alpha: [0.3, 0], anchorY: 1, sx: 1.1, sy: 2.4 });
          audio.play('arrow_hit', { delay: 0.3, pan: audio.panX(t.x), vol: 0.6 });
        }
        break;
      }
      case 'aldric_heal': {
        if (!e.target) return;
        audio.play('heal', { pan: audio.panX(e.target.x), vol: 0.7 });
        const t = e.target;
        this.fxSprite(bt.beam, t.x, t.y + 10, { tint: 0xffe08a, life: 0.9, scale: [1, 1], alpha: [0.85, 0], anchorY: 1, sx: 1.6, sy: 2.2 });
        this.pulse(t.x, t.y, 0xffd36a, 30, 200, 0.6);
        this.motes.burst(16, t.x, t.y - 20, 0xfff0a0);
        if (uv) this.fxSprite(fx.glow, uv.chest.x - 30, uv.chest.y - 40, { tint: 0xffd36a, life: 0.5, scale: [0.4, 1.6], alpha: [1, 0] });
        break;
      }
      case 'aldric_charge':
        audio.play('light_cast', { pan, rate: 0.8 });
        break;
      case 'aldric_sanctuary': {
        audio.play('choir');
        audio.play('heal', { vol: 0.8 });
        this.flashScreen(0xffd36a, 0.35);
        const allies = e.targets ?? [];
        const cx = allies.reduce((s, a) => s + a.x, 0) / Math.max(1, allies.length);
        const cy = allies.reduce((s, a) => s + a.y, 0) / Math.max(1, allies.length);
        this.fxSprite(fx.rays, cx, cy, { tint: 0xffd36a, life: 1.6, scale: [0.8, 2], alpha: [0.8, 0], vrot: 0.6, flatten: 0.3 });
        this.pulse(cx, cy, 0xffe08a, 60, 900, 0.9);
        for (const a of allies) {
          this.fxSprite(bt.beam, a.x, a.y + 10, { tint: 0xfff0b0, life: 1.2, scale: [1, 1], alpha: [0.95, 0], anchorY: 1, sx: 2.2, sy: 5 });
          this.motes.burst(14, a.x, a.y - 30, 0xfff0a0);
          this.feathers.burst(5, a.x + rand(-60, 60), a.y - 520);
        }
        break;
      }
      case 'orlan_bell': {
        const bx = e.x ?? e.u?.x ?? 960;
        const by = e.y ?? e.u?.y ?? 760;
        audio.play('choir', { vol: 0.7 });
        audio.play('shield_up', { vol: 0.6, pan });
        this.flashScreen(0xffe9b0, 0.26);
        this.pulse(bx, by, 0xffe08a, 40, 780, 0.7);
        this.fxSprite(fx.ring, bx, by, { tint: 0xffe9b0, life: 0.7, scale: [0.2, 2.6], alpha: [0.9, 0], flatten: 0.35 });
        this.fxSprite(fx.ring, bx, by, { tint: 0xd8c48a, life: 0.95, scale: [0.2, 3.4], alpha: [0.55, 0], flatten: 0.35 });
        this.motes.burst(26, bx, by - 40, 0xffe9b0);
        break;
      }
      case 'orlan_charge': {
        if (!e.u) return;
        const oc = this.view(e.u)?.chest;
        if (!oc) return;
        this.fxSprite(fx.glow, oc.x, oc.y, { tint: 0xffe9b0, life: e.dur ?? 0.5, scale: [0.4, 1.9], alpha: [0.9, 0] });
        this.motes.burst(18, oc.x, oc.y, 0xffe9b0);
        break;
      }
      case 'gorm_charge': {
        if (!e.u) return;
        const gc = this.view(e.u)?.chest;
        this.debris.burst(14, e.u.x, e.u.y - 20);
        this.smoke.burst(8, e.u.x, e.u.y, 0x6a6a5a);
        if (gc) this.fxSprite(fx.ring, gc.x, e.u.y, { tint: 0x8ad46a, life: e.dur ?? 0.5, scale: [0.3, 1.7], alpha: [0.7, 0], flatten: 0.35 });
        break;
      }
      case 'gorm_slam': {
        const gx = e.x!, gy = e.y!;
        audio.play('ult_impact', { pan });
        audio.play('land', { pan, vol: 0.9 });
        this.cam.shake(1.0);
        this.flashScreen(0x8ad46a, 0.3);
        this.shockwave(gx, gy - 20, 1.4);
        this.pulse(gx, gy, 0x8ad46a, 40, 820, 0.6);
        this.fxSprite(bt.crack, gx, gy + 4, { tint: 0x140804, life: 2.2, scale: [1.5, 1.6], alpha: [0.95, 0], ease: 'linear', normal: true, flatten: 0.3 });
        this.debris.burst(46, gx, gy - 10);
        this.smoke.burst(20, gx, gy - 10, 0x6a6a5a);
        this.fire.burst(22, gx, gy - 10);
        break;
      }
      case 'warden_windup': {
        audio.play('boss_windup', { pan });
        const x = e.x!, y = e.y!;
        this.fxSprite(fx.glowSoft, x, y, { tint: 0xff1a4a, life: 0.65, scale: [1.4, 1.7], alpha: [0.2, 0.7], flatten: 0.3, ease: 'linear' });
        this.fxSprite(bt.rune, x, y, { tint: 0xff1a4a, life: 0.65, scale: [0.6, 0.9], alpha: [0.2, 0.9], flatten: 0.3, vrot: -2, ease: 'linear' });
        if (uv) this.fxSprite(fx.glow, uv.chest.x - 60, uv.chest.y - 30, { tint: 0xff3bd0, life: 0.65, scale: [0.4, 1.8], alpha: [0.4, 1], ease: 'linear' });
        break;
      }
      case 'warden_cleave': {
        const x = e.x!, y = e.y!;
        audio.play('boss_slam', { pan });
        audio.play('hit_heavy', { pan });
        audio.duck(0.5, 0.2, 0.8);
        this.cam.shake(0.8);
        this.cam.punch(0.04);
        this.hitstop(0.09);
        this.shockwave(x, y - 40, 0.8);
        this.fxSprite(bt.slash, x + 20, y - 110, { tint: 0xff3bd0, life: 0.35, scale: [1.2, 2.6], alpha: [1, 0], rot: Math.PI, vrot: -2 });
        this.fxSprite(bt.crack, x, y + 4, { tint: 0x10040c, life: 1.8, scale: [0.8, 0.9], alpha: [0.85, 0], ease: 'linear', normal: true, flatten: 0.3 });
        this.pulse(x, y, 0xff3bd0, 30, 480, 0.45);
        this.sparks.burst(28, x, y - 60, 0xff3bd0);
        this.debris.burst(16, x, y);
        this.smoke.burst(10, x, y, 0x3a2040);
        break;
      }
      /* ---------- Thorne ---------- */
      case 'thorne_spin': {
        if (!e.u || !uv) return;
        const c = uv.chest;
        audio.play('swing_h', { pan, rate: 0.75 });
        audio.play('blink', { pan, rate: 1.35, vol: 0.6 });
        audio.play('block', { pan, rate: 1.8, vol: 0.5, delay: 0.2 });
        for (let i = 0; i < 2; i++) {
          this.fxSprite(bt.slash, c.x, c.y + 30, { tint: 0x8ae0ff, life: 0.42, scale: [1.2, 2.1], alpha: [1, 0], rot: i * Math.PI, vrot: 16 * e.u.facing, flatten: 0.55 });
        }
        this.pulse(e.u.x, e.u.y, 0x8ae0ff, 40, 520, 0.5);
        this.fxSprite(fx.glowSoft, e.u.x, e.u.y, { tint: 0xbff0ff, life: 0.8, scale: [1, 2.4], alpha: [0.7, 0], flatten: 0.3 });
        this.sparks.burst(26, c.x, c.y + 20, 0xcff4ff);
        this.smoke.burst(6, e.u.x, e.u.y - 30, 0x4a6a8a);
        break;
      }
      case 'thorne_charge': {
        if (!e.u || !uv) return;
        audio.play('summon', { pan, rate: 1.4, vol: 0.6 });
        audio.play('shield_up', { pan, rate: 0.7, vol: 0.7 });
        this.fxSprite(fx.glow, uv.chest.x + 70, uv.chest.y - 20, { tint: 0x5ab8ff, life: 0.5, scale: [0.5, 1.8], alpha: [0.6, 0] });
        this.fxSprite(bt.rune, e.u.x, e.u.y, { tint: 0x8ae0ff, life: 0.7, scale: [0.4, 1.2], alpha: [1, 0], vrot: 3, flatten: 0.3 });
        this.motes.burst(24, e.u.x, e.u.y - 60, 0xcff4ff);
        break;
      }
      case 'thorne_wave': {
        this.iceWave(e.x!, e.x2 ?? FIELD.maxX + 160);
        break;
      }
      case 'freeze': {
        const t = e.target;
        const tv = this.view(t);
        if (!t || !tv) return;
        audio.play('block', { pan: audio.panX(t.x), rate: 1.9, vol: 0.45, vary: 0.15 });
        this.sparks.burst(7, tv.chest.x, tv.chest.y, 0xcff4ff);
        this.pulse(t.x, t.y, 0x8ae0ff, 20, 220, 0.4);
        this.smoke.burst(2, t.x, t.y - 20, 0x4a6a8a);
        break;
      }
      /* ---------- Nyx ---------- */
      case 'nyx_singularity': {
        const x = e.x!, y = e.y!;
        audio.play('summon', { pan: audio.panX(x), rate: 0.55 });
        audio.play('plague', { pan: audio.panX(x), rate: 0.6, vol: 0.55 });
        audio.play('orb_hit', { pan: audio.panX(x), rate: 0.55, delay: (e.dur ?? 2) - 0.05 });
        this.blackHole(x, y - 95, 0.55, e.dur ?? 2.2, 330);
        break;
      }
      case 'nyx_charge': {
        if (!e.u || !uv) return;
        audio.play('orb_cast', { pan, rate: 0.5 });
        const m = { x: e.u.x + e.u.facing * 78, y: e.u.y - 178 };
        this.fxSprite(fx.glow, m.x, m.y, { tint: 0xa86bff, life: 0.5, scale: [0.4, 2.2], alpha: [1, 0] });
        this.suck(m.x, m.y, 160, 0xd0b0ff, 12);
        break;
      }
      case 'nyx_eclipse': {
        const x = e.x!, y = e.y!;
        audio.play('boss_windup', { rate: 0.6, vol: 0.9 });
        audio.play('summon', { rate: 0.45 });
        audio.play('choir', { rate: 0.55, vol: 0.45 });
        audio.duck(0.4, 0.3, 1.6);
        this.flashScreen(0x6a2aff, 0.3);
        this.blackHole(x, y - 300, 1.5, NYX_ECLIPSE + 0.12, 900);
        this.fxSprite(fx.spiralSoft, x, y, { tint: 0x6a2aff, life: NYX_ECLIPSE + 0.3, scale: [1, 3.2], alpha: [0.8, 0], vrot: -2.5, flatten: 0.3, ease: 'linear' });
        break;
      }
      case 'nyx_implode': {
        const x = e.x!, y = e.y!;
        audio.play('ult_impact', { rate: 0.8 });
        audio.play('explosion', { rate: 0.7, vol: 0.9 });
        audio.play('orb_hit', { rate: 0.5, vol: 0.8 });
        audio.duck(0.3, 0.3, 1.2);
        this.cam.shake(1);
        this.flashScreen(0xd8b0ff, 0.5);
        this.shockwave(x, y - 200, 1.4);
        this.pulse(x, y, 0xa86bff, 40, 900, 0.7);
        this.pulse(x, y, 0xffffff, 20, 520, 0.45);
        this.fxSprite(fx.glow, x, y - 300, { tint: 0xd8b0ff, life: 0.6, scale: [1, 7], alpha: [1, 0] });
        this.fxSprite(fx.rays, x, y - 300, { tint: 0xa86bff, life: 0.9, scale: [1, 4], alpha: [0.9, 0], vrot: 1 });
        for (const f of this.sim?.units ?? []) {
          if (!f.alive || f.side !== 'enemy') continue;
          const v = this.view(f);
          if (!v) continue;
          this.plague.burst(14, v.chest.x, v.chest.y, 0xa86bff);
          this.fxSprite(fx.spiral, f.x, f.y, { tint: 0xa86bff, life: 0.7, scale: [0.3, 1], alpha: [1, 0], vrot: -6, flatten: 0.3 });
        }
        this.sparks.burst(50, x, y - 300, 0xe0c8ff);
        break;
      }
      /* ---------- Ashka ---------- */
      case 'ashka_chain': {
        const t = e.target;
        const tv = this.view(t);
        if (!t || !tv) return;
        audio.play('stun', { pan: audio.panX(t.x), rate: 1.5, vol: 0.6 });
        audio.play('light_cast', { pan: audio.panX(t.x), rate: 1.9, vol: 0.4 });
        this.lightning(e.x!, e.y!, tv.chest.x, tv.chest.y, 0x6ad8ff, 5, 0.3);
        this.sparks.burst(16, tv.chest.x, tv.chest.y, 0xbff4ff);
        this.fxSprite(fx.glow, tv.chest.x, tv.chest.y, { tint: 0x6ad8ff, life: 0.25, scale: [0.3, 1.3], alpha: [1, 0] });
        break;
      }
      case 'ashka_charge': {
        if (!e.u) return;
        audio.play('stun', { pan, rate: 0.8 });
        audio.play('light_cast', { pan, rate: 0.7, vol: 0.6 });
        const mx = e.u.x + e.u.facing * 50, my = e.u.y - 200;
        this.fxSprite(fx.glow, mx, my, { tint: 0x6ad8ff, life: 0.5, scale: [0.5, 2.4], alpha: [1, 0] });
        for (let i = 0; i < 4; i++) {
          const a = rand(0, Math.PI * 2);
          this.lightning(mx, my, mx + Math.cos(a) * 150, my + Math.sin(a) * 110, 0x8ae8ff, 3, 0.22);
        }
        this.feathers.burst(6, mx, my);
        break;
      }
      case 'ashka_haste': {
        audio.play('boss_roar', { rate: 1.7, vol: 0.5 });
        audio.play('explosion', { rate: 0.8, vol: 0.7 });
        audio.play('choir', { rate: 1.25, vol: 0.4 });
        this.flashScreen(0x6ad8ff, 0.35);
        const allies = e.targets ?? [];
        const cx = allies.reduce((s2, a) => s2 + a.x, 0) / Math.max(1, allies.length);
        this.thunderbird(cx, 300);
        for (const a of allies) {
          const v = this.view(a);
          this.lightning(a.x + rand(-60, 60), a.y - 900, a.x, (v?.chest.y ?? a.y - 100), 0x8ae8ff, 5, 0.3);
          this.fxSprite(bt.beam, a.x, a.y + 10, { tint: 0x6ad8ff, life: 0.8, scale: [1, 1], alpha: [0.9, 0], anchorY: 1, sx: 1.6, sy: 4 });
          this.pulse(a.x, a.y, 0x6ad8ff, 30, 240, 0.5);
          this.sparks.burst(10, a.x, a.y - 60, 0xbff4ff);
        }
        break;
      }
      case 'ashka_strike': {
        const t = e.target;
        const tv = this.view(t);
        if (!t || !tv) return;
        const tp = audio.panX(t.x);
        audio.play('explosion', { pan: tp, rate: 1.15, vol: 0.55 });
        audio.play('crit', { pan: tp, rate: 0.6, vol: 0.7 });
        this.lightning(t.x + rand(-160, 160), t.y - 1050, tv.chest.x, tv.chest.y, 0x8ae8ff, 9, 0.34);
        this.fxSprite(bt.crack, t.x, t.y + 4, { tint: 0x6ad8ff, life: 0.9, scale: [0.45, 0.6], alpha: [1, 0], flatten: 0.3, ease: 'linear' });
        this.fxSprite(fx.glow, t.x, t.y - 40, { tint: 0xbff4ff, life: 0.3, scale: [0.5, 3], alpha: [1, 0] });
        this.sparks.burst(20, tv.chest.x, tv.chest.y, 0xbff4ff);
        this.flashScreen(0x8ae8ff, 0.18);
        this.cam.shake(0.35);
        break;
      }
      /* ---------- Marais ---------- */
      case 'drowned_grab': {
        const tv = this.view(e.target);
        if (tv) this.smoke.burst(5, tv.chest.x, tv.chest.y + 40, 0x2a6a7a);
        break;
      }
      /* ---------- Mira : pièges et salve ---------- */
      case 'mira_trap': {
        const e2 = e as FxEvent & { x: number; y: number; dur: number };
        // Le piège s'arme : deux mâchoires s'écartent autour d'un disque de verre.
        this.fxSprite(this.bt.disc, e2.x, e2.y, { tint: 0x4ae0c8, life: e2.dur, scale: [0.22, 0.3], alpha: [0.75, 0.28], flatten: 0.42 });
        this.fxSprite(this.bt.rune, e2.x, e2.y, { tint: 0x9afff0, life: e2.dur, scale: [0.32, 0.4], alpha: [0.5, 0], rot: 0, vrot: 1.6, flatten: 0.42 });
        this.sparks.burst(6, e2.x, e2.y, 0x4ae0c8);
        break;
      }
      case 'mira_trap_clamp': {
        const tv = this.view(e.target);
        if (!tv) return;
        const c = tv.chest;
        this.fxSprite(this.bt.star, c.x, c.y, { tint: 0x9afff0, life: 0.26, scale: [0.5, 1.3], alpha: [1, 0] });
        this.sparks.burst(14, c.x, c.y, 0x4ae0c8);
        this.cam.shake(0.28);
        audio.play('hit_metal', { pan: audio.panX(c.x), vol: 0.5 });
        break;
      }
      case 'mira_salvo':
        if (!uv) return;
        this.sparks.burst(10, uv.chest.x, uv.chest.y, 0x4ae0c8);
        break;
      case 'mira_shot': {
        if (!e.u || !e.target) return;
        const tv = this.view(e.target);
        if (!tv) return;
        const m = this.sim ? { x: e.u.x + 80, y: e.u.y - 150 } : { x: e.u.x, y: e.u.y };
        const c = tv.chest;
        // Trait tendu du bras mécanique vers la cible, puis impact sec.
        const dx = c.x - m.x, dy = c.y - m.y;
        const len = Math.hypot(dx, dy);
        this.fxSprite(this.bt.beam, m.x + dx / 2, m.y + dy / 2, {
          tint: 0x7afff0, life: 0.14, scale: [1, 1], alpha: [0.95, 0],
          rot: Math.atan2(dy, dx), sx: len / 256, sy: 0.3,
        });
        this.sparks.burst(5, c.x, c.y, 0x9afff0);
        break;
      }
      case 'mira_reload':
        if (!uv) return;
        this.sparks.burst(8, uv.chest.x, uv.chest.y, 0xffc46a);
        break;

      /* ---------- Corvin : contrition et jugement ---------- */
      case 'corvin_slam': {
        const e2 = e as FxEvent & { x: number; y: number };
        this.fxSprite(this.bt.disc, e2.x + 40, e2.y, { tint: 0xe3c077, life: 0.4, scale: [0.3, 1.6], alpha: [0.9, 0], flatten: 0.3 });
        this.debris.burst(10, e2.x + 40, e2.y, 0xd8c8a8);
        this.cam.shake(0.5);
        audio.play('hit_heavy', { pan: audio.panX(e2.x), vol: 0.55 });
        break;
      }
      case 'corvin_charge':
        if (!uv) return;
        this.fxSprite(this.bt.sigil, uv.chest.x, uv.chest.y, { tint: 0xffe9a8, life: 0.5, scale: [0.6, 1.9], alpha: [0.9, 0] });
        this.sparks.burst(14, uv.chest.x, uv.chest.y, 0xffe9a8);
        break;
      case 'corvin_judgement': {
        const e2 = e as FxEvent & { x: number; y: number };
        // Un pilier de lumière descend du ciel et balaie vers la droite.
        this.fxSprite(this.bt.beam, e2.x + 380, e2.y - 200, {
          tint: 0xfff0c0, life: 0.55, scale: [1, 1], alpha: [0.95, 0],
          rot: Math.PI / 2 - 0.22, vrot: 0, sx: 1000 / 256, sy: 2.4,
        });
        for (let i = 0; i < 5; i++) {
          const gx = e2.x + 120 + i * 150;
          this.laterFx(0.05 * i, () => {
            this.fxSprite(this.bt.star, gx, e2.y - 40, { tint: 0xfff6d0, life: 0.3, scale: [0.4, 1.2], alpha: [1, 0], vrot: 2 });
            this.sparks.burst(7, gx, e2.y - 60, 0xffe9a8);
          });
        }
        this.flashScreen(0xfff0c0, 0.3);
        this.cam.shake(0.7);
        break;
      }

      /* ---------- Elara : le chœur ---------- */
      case 'elara_choir':
        if (!uv) return;
        this.fxSprite(this.bt.sigil, uv.chest.x, uv.chest.y, { tint: 0xfff0c0, life: 0.9, scale: [0.5, 2.2], alpha: [0.9, 0.1], vrot: 0.7 });
        this.cineMotes.burst(18, uv.chest.x, uv.chest.y, 0xfff0c0);
        break;
      case 'elara_wave': {
        if (!uv) return;
        const c = uv.chest;
        // Trois anneaux concentriques qui partent du sol.
        for (let i = 0; i < 3; i++) {
          this.laterFx(0.08 * i, () => {
            this.fxSprite(this.bt.disc, c.x, uv.unit.y, {
              tint: 0xfff6d0, life: 0.75, scale: [0.35, 2.6], alpha: [0.8 - i * 0.2, 0], flatten: 0.34,
            });
          });
        }
        this.fxSprite(this.bt.star, c.x, c.y, { tint: 0xfff0c0, life: 0.5, scale: [0.6, 2.0], alpha: [1, 0], vrot: 1.5 });
        this.sparks.burst(24, c.x, c.y, 0xfff6d0);
        audio.play('heal_burst', { vol: 0.5 });
        break;
      }

      case 'ghoul_rake': {
        if (!e.u || !e.target) return;
        const tv = this.view(e.target);
        if (!tv) return;
        const c = tv.chest;
        this.fxSprite(this.bt.claw, c.x, c.y, { tint: 0xff6a5a, life: 0.28, scale: [0.7, 1.25], alpha: [0.95, 0], rot: rand(-0.4, 0.4), vrot: 1.4 });
        this.sparks.burst(8, c.x, c.y, 0xc42a2a);
        break;
      }
      case 'skeleton_aim': {
        if (!e.u || !e.target) return;
        const tv = this.view(e.target);
        if (!tv) return;
        const c = tv.chest;
        this.fxSprite(this.bt.beam, (e.u.x + c.x) / 2, c.y, {
          tint: 0x9ae8ff, life: 0.35, scale: [1, 1], alpha: [0.45, 0],
          rot: 0, sx: Math.abs(c.x - e.u.x) / 256, sy: 0.22,
        });
        break;
      }
      case 'skeleton_pierce': {
        if (!e.target) return;
        const tv = this.view(e.target);
        if (!tv) return;
        const c = tv.chest;
        this.fxSprite(this.bt.star, c.x, c.y, { tint: 0xdff6ff, life: 0.22, scale: [0.4, 0.95], alpha: [1, 0], vrot: 3 });
        this.sparks.burst(9, c.x, c.y, 0xbfe8ff);
        break;
      }
      case 'boss_phase': {
        if (!e.u) return;
        const bv = this.view(e.u);
        if (!bv) return;
        const c = bv.chest;
        this.shockwave(c.x, c.y, 1.2);
        this.fxSprite(this.bt.sigil, c.x, c.y, { tint: 0xff3a2a, life: 0.7, scale: [0.6, 2.4], alpha: [0.9, 0] });
        this.sparks.burst(26, c.x, c.y, 0xff6a2a);
        this.director.bossPhase?.();
        break;
      }
      case 'witch_hex': {
        if (!e.u || !uv || !e.target) return;
        const tv = this.view(e.target);
        audio.play('plague', { pan, rate: 1.35, vol: 0.55 });
        audio.play('ghoul_atk', { pan, rate: 1.9, vol: 0.3 });
        this.fxSprite(fx.glow, e.u.x - 92, e.u.y - 158, { tint: 0xffb02a, life: 0.5, scale: [0.4, 2], alpha: [1, 0] });
        if (tv) {
          this.fxSprite(bt.rune, tv.head.x, tv.head.y - 40, { tint: 0xffa82a, life: 1, scale: [0.15, 0.32], alpha: [1, 0], vrot: 4 });
          this.lightning(e.u.x - 92, e.u.y - 158, tv.chest.x, tv.chest.y, 0xffa82a, 3, 0.35);
          this.fire.burst(10, tv.chest.x, tv.chest.y);
        }
        break;
      }
      case 'queen_tide_windup': {
        if (!e.u || !uv) return;
        audio.play('boss_windup', { pan, rate: 0.85 });
        audio.play('arrow_rain', { pan, rate: 0.5, vol: 0.55 });
        this.fxSprite(fx.glowSoft, uv.chest.x, uv.chest.y, { tint: 0x4ae0d0, life: 0.8, scale: [0.6, 2.6], alpha: [0.3, 0.9], ease: 'linear' });
        this.fxSprite(bt.rune, e.u.x, e.u.y, { tint: 0x2ac8c0, life: 0.8, scale: [0.6, 1.3], alpha: [0.3, 1], vrot: -2, flatten: 0.3, ease: 'linear' });
        this.suck(uv.chest.x, uv.chest.y, 260, 0x9afff0, 14);
        break;
      }
      case 'queen_tide': {
        if (!e.u) return;
        audio.play('explosion', { pan, rate: 0.55 });
        audio.play('arrow_rain', { pan: -0.3, rate: 0.45, vol: 0.9 });
        audio.play('boss_slam', { pan, rate: 0.9, vol: 0.8 });
        audio.duck(0.5, 0.2, 0.8);
        this.cam.shake(0.8);
        this.tidalWave(e.u.x - 80);
        break;
      }
      case 'queen_grab_windup': {
        const t = e.target;
        if (!t) return;
        audio.play('ghoul_atk', { pan: audio.panX(t.x), rate: 0.55, vol: 0.7 });
        this.fxSprite(bt.disc, t.x, t.y + 2, { tint: 0x02181a, life: 0.6, scale: [0.2, 0.8], alpha: [0.2, 0.85], flatten: 0.3, normal: true, ease: 'linear' });
        this.fxSprite(bt.rune, t.x, t.y, { tint: 0x2ac8c0, life: 0.6, scale: [0.2, 0.6], alpha: [0.4, 1], vrot: 3, flatten: 0.3, ease: 'linear' });
        break;
      }
      case 'queen_grab': {
        if (!e.u || !e.target) return;
        audio.play('blink', { pan, rate: 0.6 });
        audio.play('swing_h', { pan, rate: 0.7 });
        this.tentacle(e.u, e.target, (e.dur ?? 0.4) + 0.25);
        break;
      }
      /* ---------- Vaelen ---------- */
      case 'vaelen_wall': {
        if (!e.u) return;
        audio.play('shield_up', { pan, rate: 0.7 });
        audio.play('fire_burst', { pan, rate: 0.6, vol: 0.7 });
        const x = e.x ?? e.u.x, y = e.y ?? e.u.y;
        for (let i = 0; i < 10; i++) {
          const dx = x - 400 + i * 88;
          this.fxSprite(fx.flame, dx, y + 10, {
            tint: i % 2 ? 0xff7a2a : 0xffc46a, life: 0.9 + i * 0.03,
            scale: [0.6, 2.6], alpha: [1, 0], flatten: 0.9, ease: 'out',
          });
        }
        this.pulse(x, y, 0xff7a2a, 120, 520, 0.8);
        this.flashScreen(0xffb454, 0.28);
        break;
      }
      case 'vaelen_burst': {
        audio.play('explosion', { pan, rate: 0.85, vol: 0.9 });
        audio.play('ult_impact', { pan, rate: 1.1 });
        const x = e.x ?? 0, y = e.y ?? 0;
        this.flashScreen(0xffd08a, 0.5);
        this.pulse(x, y, 0xffb454, 90, 640, 0.7);
        this.pulse(x, y, 0xff6a2a, 60, 420, 0.55);
        this.sparks.burst(40, x, y - 40, 0xffc46a);
        for (let i = 0; i < 12; i++) {
          const a = rand(0, Math.PI * 2);
          this.fxSprite(fx.flame, x + Math.cos(a) * rand(60, 300), y + Math.sin(a) * rand(30, 90), {
            tint: 0xff8a3a, life: rand(0.5, 0.9), scale: [0.8, 2.2], alpha: [1, 0], ease: 'out',
          });
        }
        break;
      }
      /* ---------- Sylvaine ---------- */
      case 'sylvaine_forest': {
        if (!e.u) return;
        audio.play('light_cast', { pan, rate: 0.7 });
        audio.play('choir', { pan, rate: 1.4, vol: 0.45 });
        const x = e.x ?? e.u.x, y = e.y ?? e.u.y;
        for (let i = 0; i < 9; i++) {
          const dx = x - 380 + i * 95 + rand(-20, 20);
          this.fxSprite(fx.spark, dx, y, {
            tint: 0x7ae08a, life: 0.8, scale: [0.2, 1.5], alpha: [1, 0], flatten: 0.25,
          });
        }
        this.pulse(x, y, 0x7ae08a, 120, 560, 0.8);
        break;
      }
      case 'sylvaine_thorn': {
        const t = e.target;
        const tv = this.view(t);
        if (!t || !tv) return;
        audio.play('arrow_hit', { pan: audio.panX(t.x), rate: 1.5, vol: 0.6 });
        this.lightning(tv.chest.x, tv.chest.y - 260, tv.chest.x, tv.chest.y, 0x7ae08a, 4, 0.22);
        this.sparks.burst(12, tv.chest.x, tv.chest.y, 0xbaffc8);
        this.pulse(t.x, t.y, 0x7ae08a, 40, 200, 0.4);
        break;
      }
      /* ---------- Pyrrha ---------- */
      case 'pyrrha_meteor': {
        if (!e.u) return;
        audio.play('fire_burst', { pan, rate: 0.8 });
        const x = e.x ?? 0, y = e.y ?? 0;
        const d = e.dur ?? 0.75;
        this.fxSprite(fx.glow, x, y - 700, {
          tint: 0xff6a2a, life: d, scale: [0.4, 2.6], alpha: [0.6, 1], ease: 'linear', vy: 900,
        });
        this.fxSprite(fx.flame, x, y - 660, {
          tint: 0xffb454, life: d, scale: [0.9, 2.4], alpha: [0.8, 1], ease: 'linear', vy: 900,
        });
        this.pulse(x, y, 0xff6a2a, 10, 300, d);
        break;
      }
      case 'pyrrha_impact': {
        audio.play('explosion', { pan, rate: 0.9, vol: 0.95 });
        const x = e.x ?? 0, y = e.y ?? 0;
        this.flashScreen(0xff9a4a, 0.35);
        this.pulse(x, y, 0xffc46a, 80, 520, 0.6);
        this.sparks.burst(34, x, y - 30, 0xffb454);
        this.smoke.burst(14, x, y - 40, 0x4a2a1a);
        break;
      }
      case 'pyrrha_pyre': {
        if (!e.u) return;
        audio.play('riser', { pan, vol: 0.8 });
        audio.play('choir', { pan, rate: 0.85, vol: 0.5 });
        const x = e.u.x, y = e.u.y;
        this.flashScreen(0xff6a2a, 0.3);
        for (let i = 0; i < 8; i++) {
          const a = (i / 8) * Math.PI * 2;
          this.fxSprite(fx.flame, x + Math.cos(a) * 90, y + Math.sin(a) * 32, {
            tint: 0xff7a2a, life: 1.1, scale: [0.7, 2.8], alpha: [1, 0], ease: 'out',
          });
        }
        this.pulse(x, y, 0xff9a4a, 60, 480, 0.9);
        break;
      }
      case 'pyrrha_wave': {
        const x = e.x ?? 0, y = e.y ?? 0;
        audio.play('fire_burst', { pan: audio.panX(x), rate: 0.7, vol: 0.8 });
        this.pulse(x, y, 0xff6a2a, 140, 900, 0.75);
        for (let i = 0; i < 16; i++) {
          this.fxSprite(fx.flame, x + rand(-500, 500), y + rand(-40, 40), {
            tint: i % 3 === 0 ? 0xffd08a : 0xff6a2a, life: rand(0.5, 1.0),
            scale: [0.7, 2.6], alpha: [1, 0], ease: 'out',
          });
        }
        this.sparks.burst(20, x, y - 30, 0xffb454);
        break;
      }
      case 'enrage':
        audio.play('boss_roar', { pan, rate: e.u?.def.id === 'queen' ? 1.15 : 1 });
        audio.duck(0.4, 0.8, 1);
        this.emit('banner', { text: `${e.u?.def.name ?? 'Le boss'} entre en rage !`, kind: 'boss' });
        break;
      case 'stun':
        audio.play('stun', { pan: audio.panX(e.target?.x ?? e.u?.x ?? 960) });
        break;
      case 'expire':
        if (e.u) this.smoke.burst(8, e.u.x, e.u.y - 50, 0x3a8a6a);
        break;
    }
  }


  /* =========================== Effets des nouveaux héros =========================== */

  /** Particules aspirées vers un point (trous noirs, charges). */
  suck(x: number, y: number, r: number, color: number, n: number): void {
    for (let i = 0; i < n; i++) {
      const s = new Sprite(this.fx.spark);
      s.anchor.set(0.5);
      s.tint = color;
      const a = Math.random() * Math.PI * 2;
      const d = r * (0.6 + Math.random() * 0.4);
      const sx = x + Math.cos(a) * d, sy = y + Math.sin(a) * d * 0.6;
      const life = 0.3 + Math.random() * 0.25;
      this.anim(s, this.fxLayer, life, (k) => {
        const e = k * k;
        s.position.set(sx + (x - sx) * e, sy + (y - sy) * e);
        s.scale.set(1.4 * (1 - k * 0.6), 0.6);
        s.rotation = a;
        s.alpha = Math.min(1, k * 5);
      });
    }
  }

  /** Trou noir : disque d'ombre, couronne violette, spirales et aspiration de particules. */
  private blackHole(x: number, y: number, size: number, dur: number, pullR: number): void {
    const holder = new Container();
    holder.position.set(x, y);
    const corona = new Sprite(this.fx.glowSoft);
    corona.anchor.set(0.5);
    corona.tint = 0x8a3aff;
    corona.blendMode = 'add';
    const rays = new Sprite(this.fx.rays);
    rays.anchor.set(0.5);
    rays.tint = 0xa86bff;
    rays.blendMode = 'add';
    const spiral = new Sprite(this.fx.spiral);
    spiral.anchor.set(0.5);
    spiral.tint = 0xc89aff;
    spiral.blendMode = 'add';
    const disc = new Sprite(this.bt.disc);
    disc.anchor.set(0.5);
    disc.tint = 0x050008;
    const rim = new Sprite(this.fx.ring);
    rim.anchor.set(0.5);
    rim.tint = 0xe0c8ff;
    rim.blendMode = 'add';
    holder.addChild(corona, rays, spiral, disc, rim);
    let acc = 0;
    this.anim(holder, this.fxNormal, dur, (k, dt) => {
      const grow = Math.min(1, k / 0.15);
      const g = 1 - Math.pow(1 - grow, 3);
      const collapse = k > 0.9 ? 1 - (k - 0.9) / 0.1 : 1;
      const pulse = 1 + Math.sin(k * dur * 14) * 0.04;
      const sc = size * g * collapse * pulse;
      disc.scale.set(sc * 0.62);
      rim.scale.set(sc * 0.82);
      rim.alpha = 0.8;
      spiral.scale.set(sc * 1.25);
      spiral.rotation -= dt * 7;
      spiral.alpha = 0.85;
      rays.scale.set(sc * 1.6);
      rays.rotation += dt * 0.8;
      rays.alpha = 0.55;
      corona.scale.set(sc * 2.4);
      corona.alpha = 0.75;
      acc += dt;
      if (acc > 0.035 && k < 0.9) {
        acc = 0;
        this.suck(x, y, pullR * 0.5 * (0.6 + size * 0.3), Math.random() < 0.5 ? 0xa86bff : 0xe0c8ff, size > 1 ? 3 : 2);
      }
    });
  }

  /** Mur de pics de glace qui balaie le terrain de gauche à droite (synchronisé avec la simulation). */
  private iceWave(x0: number, x1: number): void {
    const step = 58;
    const cols = Math.ceil((x1 - x0) / step);
    const dur = (x1 - x0) / THORNE_WAVE_SPEED;
    let spawned = 0;
    let sound = 0;
    const front = new Sprite(this.fx.glowSoft);
    front.anchor.set(0.5);
    front.tint = 0x4aa8ff;
    front.blendMode = 'add';
    audio.play('explosion', { rate: 1.5, vol: 0.55 });
    audio.play('arrow_rain', { rate: 1.3, vol: 0.8 });
    audio.play('boss_slam', { rate: 1.3, vol: 0.7 });
    audio.duck(0.4, 0.2, 1.2);
    this.anim(front, this.fxLayer, dur + 0.1, (k, dt) => {
      const fx = x0 + (x1 - x0) * Math.min(1, k * (dur + 0.1) / dur);
      front.position.set(fx, (FIELD.minY + FIELD.maxY) / 2 - 60);
      front.scale.set(2.4, 4.5);
      front.alpha = 0.3 * (1 - k * 0.5);
      if (dt > 0) this.cam.shake(0.08);
      while (spawned < cols && x0 + spawned * step <= fx) {
        const cx = x0 + spawned * step;
        for (let j = 0; j < 4; j++) {
          const y = FIELD.minY - 10 + ((j + (spawned % 2) * 0.5) / 3.5) * (FIELD.maxY - FIELD.minY + 30) + rand(-12, 12);
          this.iceSpike(cx + rand(-18, 18), y, 0.75 + Math.random() * 0.6, 1.1 + Math.random() * 0.5);
        }
        if (spawned % 2 === 0) this.smoke.burst(1, cx, (FIELD.minY + FIELD.maxY) / 2 + rand(-80, 80), 0x5a8ab8);
        this.sparks.burst(3, cx, FIELD.minY + Math.random() * (FIELD.maxY - FIELD.minY) - 30, 0xdff8ff);
        if (spawned - sound >= 4) { sound = spawned; audio.play('block', { rate: 1.6 + Math.random() * 0.4, vol: 0.4, pan: audio.panX(cx) }); }
        spawned++;
      }
    });
    // Givre au sol qui reste un instant après le passage du mur
    const midX = (x0 + Math.min(x1, FIELD.maxX)) / 2;
    this.fxSprite(this.fx.glowSoft, midX, (FIELD.minY + FIELD.maxY) / 2, { tint: 0x6ac8ff, life: 2.4, scale: [1, 1], alpha: [0.45, 0], flatten: 1, sx: (x1 - x0) / 200, sy: 1.2, ease: 'linear' });
  }

  /** Un pic de glace qui jaillit du sol, reste, puis se brise. Trié en profondeur avec les combattants. */
  private iceSpike(x: number, y: number, size: number, hold: number): void {
    const s = new Sprite(this.bt.ice[Math.floor(Math.random() * 3)]!);
    s.anchor.set(0.5, 0.93);
    s.position.set(x, y + 6);
    s.zIndex = y;
    const rot = rand(-0.35, 0.35);
    s.rotation = rot;
    const sc = size * (0.55 + (y - FIELD.minY) / (FIELD.maxY - FIELD.minY) * 0.25);
    const life = hold + 0.35;
    let shattered = false;
    this.anim(s, this.unitsLayer, life, (k) => {
      const t = k * life;
      const up = Math.min(1, t / 0.09);
      const e = 1 - Math.pow(1 - up, 3);
      s.scale.set(sc * (0.8 + e * 0.2), sc * e * (t < 0.14 ? 1.12 - (t / 0.14) * 0.12 : 1));
      if (t > hold) {
        const q = (t - hold) / 0.35;
        s.alpha = 1 - q;
        s.y = y + 6 + q * 30;
        s.rotation = rot + q * 0.3;
        if (!shattered) { shattered = true; if (Math.random() < 0.35) this.sparks.burst(4, x, y - 50 * sc, 0xdff8ff); }
      }
    });
  }

  /** L'Oiseau-Tonnerre d'Ashka : grande silhouette de lumière qui traverse le ciel. */
  private thunderbird(cx: number, cy: number): void {
    const holder = new Container();
    holder.blendMode = 'add';
    const body = new Sprite(this.fx.glow);
    body.anchor.set(0.5);
    body.tint = 0x8ae8ff;
    const wings: Sprite[] = [];
    for (const side of [-1, 1]) {
      const w = new Sprite(this.bt.slash);
      w.anchor.set(0.5);
      w.tint = 0x6ad8ff;
      w.scale.set(side * 2.6, 1.6);
      wings.push(w);
    }
    const core = new Sprite(this.fx.glowSoft);
    core.anchor.set(0.5);
    core.tint = 0xffffff;
    holder.addChild(...wings, body, core);
    this.anim(holder, this.fxLayer, 1.4, (k, dt) => {
      holder.position.set(cx - 500 + k * 1100, cy - Math.sin(k * Math.PI) * 60);
      const flap = Math.sin(k * 26);
      wings[0]!.rotation = 0.4 + flap * 0.35;
      wings[1]!.rotation = -0.4 - flap * 0.35;
      body.scale.set(2.2, 1.2);
      core.scale.set(0.8);
      holder.alpha = Math.min(1, k * 6) * (1 - Math.pow(k, 4));
      if (dt > 0 && Math.random() < 0.5) this.feathers.burst(1, holder.x + rand(-80, 80), holder.y + rand(-20, 30));
      if (dt > 0 && Math.random() < 0.15) this.lightning(holder.x, holder.y, holder.x + rand(-200, 200), holder.y + rand(200, 500), 0x8ae8ff, 3, 0.18);
    });
  }

  /** Raz-de-marée de la Reine : un mur d'eau balaie l'équipe vers la gauche. */
  private tidalWave(x0: number): void {
    const x1 = FIELD.minX - 150;
    const dur = 0.5;
    const holder = new Container();
    holder.blendMode = 'add';
    const parts: Sprite[] = [];
    for (let i = 0; i < 5; i++) {
      const w = new Sprite(this.fx.glowSoft);
      w.anchor.set(0.5, 1);
      w.tint = i % 2 ? 0x4ae0d0 : 0x2a9ab8;
      parts.push(w);
      holder.addChild(w);
    }
    let acc = 0;
    this.anim(holder, this.fxLayer, dur + 0.25, (k, dt) => {
      const q = Math.min(1, k * (dur + 0.25) / dur);
      const x = x0 + (x1 - x0) * q;
      parts.forEach((w, i) => {
        const y = FIELD.minY + (i / 4) * (FIELD.maxY - FIELD.minY) + 40;
        w.position.set(x + Math.sin(i * 1.7 + k * 9) * 25, y);
        w.scale.set(1.3, 2.6 + Math.sin(i + k * 12) * 0.3);
      });
      holder.alpha = Math.min(1, k * 8) * (k > 0.75 ? (1 - k) * 4 : 1) * 0.85;
      acc += dt;
      if (acc > 0.03) {
        acc = 0;
        this.sparks.burst(5, x, FIELD.minY + Math.random() * (FIELD.maxY - FIELD.minY) - 40, 0xdffcff);
        this.smoke.burst(1, x + 30, FIELD.minY + Math.random() * (FIELD.maxY - FIELD.minY), 0x3a7a8a);
      }
    });
  }

  /** Tentacule des abysses qui agrippe un héros et le ramène vers la Reine. */
  private tentacle(src: Unit, tgt: Unit, life: number): void {
    const g = new Graphics();
    this.anim(g, this.fxNormal, life, (k) => {
      const sv = this.view(src), tv = this.view(tgt);
      if (!sv || !tv) return;
      const ax = src.x - 120, ay = sv.chest.y + 20;
      const bx = tv.chest.x, by = tv.chest.y;
      g.clear();
      const n = 14;
      const len = Math.hypot(bx - ax, by - ay) || 1;
      const nx = -(by - ay) / len, ny = (bx - ax) / len;
      const reach = Math.min(1, k * 5);
      const pts: Array<[number, number]> = [];
      for (let i = 0; i <= n; i++) {
        const t = (i / n) * reach;
        const wave = Math.sin(t * 9 - k * 20) * 22 * Math.sin(t * Math.PI);
        pts.push([ax + (bx - ax) * t + nx * wave, ay + (by - ay) * t + ny * wave]);
      }
      for (const [w, c, a] of [[26, 0x031a1e, 0.95], [14, 0x1a5a64, 1], [5, 0x6ae0d0, 0.8]] as const) {
        g.moveTo(pts[0]![0], pts[0]![1]);
        for (let i = 1; i < pts.length; i++) g.lineTo(pts[i]![0], pts[i]![1]);
        g.stroke({ width: w * (1 - k * 0.3), color: c, alpha: a * (k > 0.8 ? (1 - k) * 5 : 1), cap: 'round', join: 'round' });
      }
    });
  }

  /* =========================== Effets =========================== */

  fxSprite(
    texture: Texture, x: number, y: number,
    o: { tint: number; life: number; scale: readonly [number, number]; alpha: readonly [number, number]; rot?: number; vrot?: number; flatten?: number; ease?: FxSprite['ease']; normal?: boolean; anchorY?: number; sx?: number; sy?: number; vx?: number; vy?: number },
  ): Sprite {
    const s = new Sprite(texture);
    s.anchor.set(0.5, o.anchorY ?? 0.5);
    s.position.set(x, y);
    s.tint = o.tint;
    s.rotation = o.rot ?? 0;
    (o.normal ? (o.flatten ? this.groundNormal : this.fxNormal) : o.flatten ? this.groundFx : this.fxLayer).addChild(s);
    const item: FxSprite = { s, life: 0, max: o.life, scale: o.scale, alpha: o.alpha, vx: o.vx ?? 0, vy: o.vy ?? 0, vrot: o.vrot ?? 0, flatten: o.flatten ?? 1, ease: o.ease ?? 'out' };
    if (o.sx || o.sy) { (item as FxSprite & { sx: number; sy: number }).sx = o.sx ?? 1; (item as FxSprite & { sx: number; sy: number }).sy = o.sy ?? 1; }
    this.fxSprites.push(item);
    this.applyFx(item);
    return s;
  }

  private applyFx(f: FxSprite): void {
    const k = Math.min(1, f.life / f.max);
    const e = f.ease === 'linear' ? k : f.ease === 'inout' ? k * k * (3 - 2 * k) : 1 - Math.pow(1 - k, 3);
    const sc = f.scale[0] + (f.scale[1] - f.scale[0]) * e;
    const ext = f as FxSprite & { sx?: number; sy?: number };
    const base = 1 / Math.max(f.s.texture.width, 1) * 256;
    // Les sprites « au sol » sont aplatis ; leur rotation se fait dans le plan du sol
    if (ext.sx !== undefined) f.s.scale.set(ext.sx * sc, (ext.sy ?? 1) * sc * (1 - k * 0.1));
    else f.s.scale.set(sc * base * 0.8, sc * base * 0.8 * f.flatten);
    f.s.alpha = f.alpha[0] + (f.alpha[1] - f.alpha[0]) * k;
  }

  pulse(x: number, y: number, tint: number, from: number, to: number, life: number): void {
    this.fxSprite(this.fx.ring, x, y, { tint, life, scale: [from / 200, to / 200], alpha: [1, 0], flatten: 0.32 });
  }

  fallingArrow(sx: number, sy: number, tx: number, ty: number, dur: number): void {
    const s = new Sprite(this.bt.arrow);
    s.anchor.set(1, 0.5);
    s.tint = 0xcfeaff;
    s.position.set(sx, sy);
    s.rotation = Math.atan2(ty - sy, tx - sx);
    s.scale.set(1.1, 0.9);
    this.fxLayer.addChild(s);
    const item: FxSprite & { sx2: number; sy2: number; tx: number; ty: number } = {
      s, life: 0, max: dur, scale: [1, 1], alpha: [1, 1], vx: 0, vy: 0, vrot: 0, flatten: 1, ease: 'linear', dy: -2,
      sx2: sx, sy2: sy, tx, ty,
    };
    this.fxSprites.push(item);
  }

  private prewarmed = false;

  /**
   * Compile une fois pour toutes les shaders des effets (onde de choc, flou radial, bloom) et envoie
   * la police des chiffres à la carte graphique, pendant la transition d'écran. Sans ça, le premier
   * ultime provoquait un à-coup (compilation au moment de l'impact).
   */
  private prewarm(): void {
    if (this.prewarmed) return;
    this.prewarmed = true;
    BattleScene.ensureNumberFont();
    const r = this.game.app.renderer;
    const rt = RenderTexture.create({ width: 96, height: 96 });
    const probe = new BitmapText({ text: '0123456789!+', style: { fontFamily: 'BattleNumbers', fontSize: 28 } });
    this.textLayer.addChild(probe);
    const prevWorld = this.world.filters;
    this.world.filters = [this.bloom];
    this.root.filters = [this.shock, this.zoomBlur];
    try {
      r.render({ container: this.root, target: rt, clear: true });
    } finally {
      this.root.filters = [];
      this.rootFxKey = '';
      this.world.filters = prevWorld ? [...prevWorld] : [];
      probe.destroy();
      // Détruite un peu plus tard : les bind groups des filtres la référencent jusqu'au prochain rendu
      setTimeout(() => rt.destroy(true), 500);
    }
  }

  private static fontReady = false;

  /** Police bitmap des chiffres : les glyphes (contour + ombre) sont dessinés une seule fois puis teintés. */
  private static ensureNumberFont(): void {
    if (BattleScene.fontReady) return;
    BattleScene.fontReady = true;
    BitmapFont.install({
      name: 'BattleNumbers',
      style: {
        fontFamily: 'Cinzel, Georgia, serif', fontWeight: '900', fontSize: 48, fill: 0xffffff,
        stroke: { color: 0x14060a, width: 8, join: 'round' },
        dropShadow: { color: 0x000000, alpha: 0.6, blur: 4, distance: 3, angle: Math.PI / 2 },
      },
      chars: [['0', '9'], '!+-%', 'BloquéEsquive '],
      resolution: 2,
      padding: 8,
    });
  }

  private static readonly NUM_STYLE: Record<'dmg' | 'crit' | 'hurt' | 'heal' | 'dot' | 'block', { fill: number; size: number }> = {
    dmg: { fill: 0xffffff, size: 28 },
    crit: { fill: 0xffd84a, size: 44 },
    hurt: { fill: 0xff6a6a, size: 26 },
    heal: { fill: 0x7aff8a, size: 28 },
    dot: { fill: 0xd2a8ff, size: 22 },
    block: { fill: 0xd0d0e0, size: 20 },
  };

  private number(text: string, x: number, y: number, kind: 'dmg' | 'crit' | 'hurt' | 'heal' | 'dot' | 'block', tint?: number): void {
    BattleScene.ensureNumberFont();
    // Décale les chiffres qui apparaissent au même endroit pour qu'ils restent lisibles
    let near = 0;
    for (const n of this.texts) if (n.life < 0.5 && Math.abs(n.t.x - x) < 110 && Math.abs(n.baseY - y) < 80) near++;
    const baseY = y;
    // Les chiffres s'empilaient exactement les uns sur les autres : on les étage
    // davantage et on alterne gauche/droite pour rester lisible dans la mêlée.
    const side = near % 2 === 0 ? 1 : -1;
    y -= near * 34;
    x += side * (near > 0 ? 30 : 0);
    const st = BattleScene.NUM_STYLE[kind];
    const t = this.numPool.pop() ?? new BitmapText({ text: '', style: { fontFamily: 'BattleNumbers', fontSize: 28 } });
    t.text = kind === 'crit' ? `${text}!` : text;
    t.style.fontSize = st.size;
    // Une couleur de classe signale un avantage (ou un malus) d'affinité.
    t.tint = tint ?? st.fill;
    t.anchor.set(0.5);
    t.alpha = 1;
    t.scale.set(1);
    t.position.set(x + rand(-10, 10), y);
    this.textLayer.addChild(t);
    this.texts.push({ t, life: 0, vx: rand(-30, 30), vy: kind === 'heal' ? -70 : -95, s0: kind === 'crit' ? 2.1 : 1.4, baseY });
  }

  /**
   * Réaction de défense : une gerbe d'étincelles de la couleur de la défense touchée
   * (bleu acier = armure, violet = résistance). Quand l'affinité de classe joue,
   * un anneau doré s'ajoute par-dessus : le joueur VOIT pourquoi il tape plus fort.
   */
  private deflectFx(x: number, y: number, kind: string, cls: number): void {
    if (kind === 'true') return;
    const magic = kind === 'magic';
    this.sparks.burst(magic ? 5 : 7, x, y, magic ? 0xb07aff : 0x8fc8ff);
    if (cls > 1) {
      // Anneau doré + éclat : l'avantage d'affinité se lit d'un coup d'œil.
      this.fxSprite(this.bt.star, x, y, { tint: 0xffe9a8, life: 0.3, scale: [0.5, 1.15], alpha: [0.95, 0], rot: rand(0, 6), vrot: 2.2 });
      this.fxSprite(this.bt.sigil, x, y, { tint: 0xe3c077, life: 0.34, scale: [0.35, 0.85], alpha: [0.8, 0] });
    } else if (cls < 1) {
      this.sparks.burst(4, x, y, 0x6a5f7a);
    }
  }

  private releaseNumber(t: BitmapText): void {
    t.removeFromParent();
    if (this.numPool.length < 80) this.numPool.push(t);
    else t.destroy();
  }

  /* =========================== Projectiles =========================== */

  private addProj(p: Projectile): void {
    const color = PROJ_COLOR[p.kind] ?? 0xffffff;
    const holder = new Container();
    holder.blendMode = 'add';
    const glow = new Sprite(this.fx.glow);
    glow.anchor.set(0.5);
    glow.tint = color;
    let head: Sprite;
    let trail: ParticleEmitter | undefined;
    const pan = audio.panX(p.sx);
    if (p.kind === 'arrow' || p.kind === 'bone' || p.kind === 'pierce') {
      head = new Sprite(this.bt.arrow);
      head.anchor.set(0.85, 0.5);
      head.tint = color;
      const big = p.kind === 'pierce';
      head.scale.set(big ? 2.4 : 0.85, big ? 2 : 0.85);
      glow.scale.set(big ? 1.4 : 0.25, big ? 0.6 : 0.15);
      if (big) {
        trail = new ParticleEmitter({
          texture: this.fx.spark, rate: 160, max: 160, life: [0.25, 0.5], area: { x: 0, y: 0 },
          vx: [-60, 20], vy: [-40, 40], scale: { start: [1.4, 2.2], end: [0.1, 0.3] }, alpha: 1, tint: [0x9ad8ff, 0xffffff], blend: 'add',
        });
        audio.play('bow', { pan, rate: 0.8, vol: 1.3 });
        audio.play('blink', { pan, rate: 1.3, vol: 0.6 });
      } else {
        audio.play(p.kind === 'bone' ? 'skel_atk' : 'bow', { pan });
      }
    } else if (p.kind === 'light') {
      // Lance de lumière : une vraie lame, effilée, qui file droit devant.
      head = new Sprite(this.bt.bolt);
      head.anchor.set(0.93, 0.5);
      head.tint = 0xffffff;
      head.scale.set(1.25, 1.25);
      glow.scale.set(0.42, 0.2);
      trail = new ParticleEmitter({
        texture: this.fx.spark, rate: 70, max: 80, life: [0.18, 0.34], area: { x: 0, y: 0 },
        vx: [-30, 30], vy: [-30, 30], scale: { start: [0.8, 1.3], end: [0.1, 0.2] }, alpha: 1,
        tint: [0xffe9a8, 0xffffff], blend: 'add',
      });
      audio.play('light_cast', { pan });
    } else if (p.kind === 'spark') {
      // Éclair : un zigzag concret, pas un point lumineux.
      head = new Sprite(this.bt.arc);
      head.anchor.set(0.9, 0.5);
      head.tint = 0xffffff;
      head.scale.set(1.3, 1.3);
      glow.scale.set(0.3);
      trail = new ParticleEmitter({
        texture: this.fx.spark, rate: 170, max: 90, life: [0.1, 0.22], area: { x: 0, y: 0 },
        vx: [-30, 30], vy: [-30, 30], scale: { start: [0.9, 1.5], end: [0.1, 0.2] }, alpha: 1,
        tint: [0x8ae8ff, 0xffffff], blend: 'add',
      });
      audio.play('light_cast', { pan, rate: 1.7, vol: 0.55 });
    } else if (p.kind === 'orb' || p.kind === 'void') {
      // Sceau arcanique : un cercle de runes qui tourne sur lui-même.
      head = new Sprite(this.bt.sigil);
      head.anchor.set(0.5);
      head.tint = p.kind === 'void' ? 0xc8a0ff : 0xbff0ff;
      head.scale.set(p.kind === 'void' ? 0.66 : 0.58);
      glow.scale.set(0.5);
      trail = new ParticleEmitter({
        texture: this.fx.spark, rate: 90, max: 90, life: [0.25, 0.5], area: { x: 0, y: 0 },
        vx: [-30, 30], vy: [-30, 30], scale: { start: [0.9, 1.5], end: [0.1, 0.2] }, alpha: 1,
        tint: p.kind === 'void' ? [0xa86bff, 0xe0c8ff, 0x6a3aff] : [color, 0xffffff], blend: 'add',
      });
      if (p.kind === 'orb') audio.play('orb_cast', { pan });
      else audio.play('orb_cast', { pan, rate: 0.62, vol: 0.9 });
    } else if (p.kind === 'hex') {
      // Braise hérissée : une masse de flammes à pointes.
      head = new Sprite(this.bt.spike);
      head.anchor.set(0.5);
      head.tint = 0xffb45a;
      head.scale.set(0.72);
      glow.scale.set(0.42);
      trail = new ParticleEmitter({
        texture: this.fx.spark, rate: 110, max: 90, life: [0.22, 0.45], area: { x: 0, y: 0 },
        vx: [-30, 30], vy: [-40, 10], scale: { start: [1, 1.6], end: [0.1, 0.2] }, alpha: 1,
        tint: [0xffa82a, 0xffe27a], blend: 'add',
      });
      audio.play('orb_cast', { pan, rate: 1.25, vol: 0.8 });
    } else {
      head = new Sprite(this.fx.spark);
      head.anchor.set(0.5);
      head.tint = 0xffffff;
      head.scale.set(1.15);
      glow.scale.set(0.34);
      trail = new ParticleEmitter({
        texture: this.fx.spark, rate: 80, max: 90, life: [0.25, 0.5], area: { x: 0, y: 0 },
        vx: [-30, 30], vy: [-30, 30], scale: { start: [0.9, 1.5], end: [0.1, 0.2] }, alpha: 1,
        tint: [color, 0xffffff], blend: 'add',
      });
      audio.play('light_cast', { pan });
    }
    // ---- Détails : queue de comète, cœur surchauffé, anneau tournoyant ----
    const heavy = p.kind === 'pierce';
    const magic = p.kind === 'orb' || p.kind === 'void' || p.kind === 'hex';
    const tailLen = heavy ? 210 : magic ? 120 : p.kind === 'light' ? 90 : 62;
    const tailHalf = heavy ? 26 : magic ? 15 : 9;
    const tail = new Graphics();
    drawTail(tail, tailLen, tailHalf, color, heavy ? 0.55 : 0.42);
    tail.blendMode = 'add';

    const core = new Sprite(this.fx.glow);
    core.anchor.set(0.5);
    core.tint = 0xffffff;
    core.blendMode = 'add';
    core.scale.set(heavy ? 0.5 : magic ? 0.3 : 0.18);
    core.alpha = 0.95;

    let ring: Sprite | null = null;
    if (p.kind === 'hex' || p.kind === 'light' || heavy) {
      ring = new Sprite(this.fx.ring);
      ring.anchor.set(0.5);
      ring.tint = color;
      ring.blendMode = 'add';
      ring.alpha = heavy ? 0.5 : 0.33;
      ring.scale.set(heavy ? 1.1 : 0.55);
    }

    if (trail) this.fxLayer.addChild(trail.container);
    holder.addChild(tail, glow);
    if (ring) holder.addChild(ring);
    holder.addChild(head, core);
    this.fxLayer.addChild(holder);
    const pv: ProjView = {
      p, holder, head, glow, trail, lastX: p.sx, lastY: p.sy, color, tail, core, ring,
      ringBase: ring ? ring.scale.x : 0, coreBase: core.scale.x, spin: 0,
    };
    this.projViews.set(p.id, pv);
    this.updateProj(pv, 0);
  }

  private updateProj(pv: ProjView, dt: number): void {
    const p = pv.p;
    const k = clamp(p.t / p.dur, 0, 1);
    let ex = p.ex, ey = p.ey;
    if (p.to) {
      const tv = this.views.get(p.to.uid);
      if (tv) { const c = tv.chest; ex = c.x; ey = c.y; }
    }
    const wavy = p.kind === 'orb' || p.kind === 'void' || p.kind === 'hex';
    const arc = p.kind === 'arrow' || p.kind === 'bone' ? Math.min(90, Math.abs(ex - p.sx) * 0.12) : wavy ? 30 : 0;
    const x = p.sx + (ex - p.sx) * k;
    const y = p.sy + (ey - p.sy) * k - Math.sin(k * Math.PI) * arc + (wavy ? Math.sin(k * 18) * 6 : 0) + (p.kind === 'spark' && dt > 0 ? rand(-7, 7) : 0);
    if (dt > 0) {
      const ang = Math.atan2(y - pv.lastY, x - pv.lastX);
      // Les sceaux et braises tournoient ; la lance, l'éclair et les flèches visent.
      pv.head.rotation = wavy ? pv.head.rotation + dt * 7 : ang;
      pv.glow.rotation = ang;
    } else if (!wavy) {
      pv.head.rotation = Math.atan2(ey - p.sy, ex - p.sx);
    }
    // La queue suit le sens du vol (et s'étire avec la vitesse)
    const ang = Math.atan2(y - pv.lastY, x - pv.lastX);
    if (dt > 0 && (Math.abs(x - pv.lastX) > 0.01 || Math.abs(y - pv.lastY) > 0.01)) pv.tail.rotation = ang;
    pv.spin += dt * 9;
    if (pv.ring) {
      pv.ring.rotation = pv.spin;
      const rs = pv.ringBase * (1 + Math.sin(pv.spin * 1.7) * 0.13);
      pv.ring.scale.set(rs);
    }
    const cs = pv.coreBase * (1 + Math.sin(pv.spin * 3.1) * 0.18);
    pv.core.scale.set(cs);
    pv.holder.position.set(x, y);
    pv.lastX = x;
    pv.lastY = y;
    if (pv.trail) {
      pv.trail.setArea({ x: x - 6, y: y - 6, w: 12, h: 12 });
      pv.trail.update(dt);
    }
  }

  private removeProj(pv: ProjView): void {
    pv.holder.destroy({ children: true });
    if (pv.trail) {
      // La traînée s'éteint doucement
      const trail = pv.trail;
      trail.enabled = false;
      const item: FxSprite & { emitter: ParticleEmitter } = {
        s: new Sprite(Texture.EMPTY), life: 0, max: 0.6, scale: [1, 1], alpha: [0, 0], vx: 0, vy: 0, vrot: 0, flatten: 1, ease: 'linear', dy: -3, emitter: trail,
      };
      this.fxLayer.addChild(item.s);
      this.fxSprites.push(item);
    }
  }

  /* =========================== Caméra automatique =========================== */

  /** Cadrage dynamique de la mêlée (léger zoom quand les combattants se regroupent). */
  autoFrame(): Partial<CamState> {
    const sim = this.sim;
    if (!sim) return { x: VIEW_W / 2, y: VIEW_H / 2, zoom: 1, roll: 0, pitch: 0, yaw: 0 };
    const us = sim.units.filter((u) => u.alive && !u.isSummon);
    if (!us.length) return { x: VIEW_W / 2, y: VIEW_H / 2, zoom: 1, roll: 0, pitch: 0, yaw: 0 };
    let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity;
    for (const u of us) {
      x0 = Math.min(x0, u.x); x1 = Math.max(x1, u.x);
      y0 = Math.min(y0, u.y - u.def.height); y1 = Math.max(y1, u.y);
    }
    const zoom = clamp(Math.min(VIEW_W / (x1 - x0 + 640), VIEW_H / (y1 - y0 + 420)), 1, 1.12);
    return { x: (x0 + x1) / 2, y: VIEW_H / 2 + ((y0 + y1) / 2 - VIEW_H / 2) * 0.5, zoom, roll: 0, pitch: 0, yaw: 0 };
  }

  /* =========================== Boucle =========================== */

  update(rawDt: number): void {
    if (this.phase === 'idle') return;
    const realDt = Math.min(rawDt, 1 / 20);
    this.time += realDt;
    if (this.training && this.sim) {
      this.trainingAcc += realDt;
      if (this.trainingAcc >= 0.2) {
        this.trainingAcc = 0;
        const t = this.sim.time;
        this.emit('trainingTick', { total: this.sim.heroDamage, dps: t > 0.6 ? this.sim.heroDamage / t : 0, time: t });
      }
    }
    const w = this.game.app.screen.width, h = this.game.app.screen.height;

    // Décor (toujours animé, même en pause, pour que l'écran reste vivant)
    this.fog.update(realDt, 0);
    this.fgFog.update(realDt, 0);
    this.ambient.forEach((e) => e.update(realDt));
    this.flames.forEach((e) => e.update(realDt));
    for (let i = 0; i < this.glows.length; i++) {
      const g = this.glows[i]!;
      if (g.bob) {
        g.s.alpha = g.a * (0.75 + Math.sin(this.time * 2.3 + i * 1.7) * 0.25);
        g.s.y = g.y0 + Math.sin(this.time * 1.4 + i * 2.3) * g.bob;
      } else {
        g.s.alpha = g.a + Math.sin(this.time * 9 + i * 2.1) * 0.06 + Math.sin(this.time * 23 + i) * 0.04;
      }
    }
    if (this.moonRays) this.moonRays.rotation += realDt * 0.03;
    audio.update(realDt, 0, 0);

    if (this.paused) { this.cam.apply(w, h, this.cover); return; }

    // Temps de jeu : vitesse ×1/×2, ralentis, arrêts sur impact, gel pendant l'élan des ultimes
    this.timeScale += (this.tsTarget - this.timeScale) * (this.tsRate === Infinity ? 1 : 1 - Math.exp(-this.tsRate * realDt));
    let dt = realDt * this.speed * this.timeScale;
    if (this.hitstopT > 0) { this.hitstopT -= realDt; dt *= 0.06; }
    const frozen = this.director.frozen;
    if (frozen) dt = 0;

    this.director.update(realDt, dt);

    if (this.phase === 'intro') this.updateIntro(realDt);
    else if (this.sim && (this.phase === 'fight' || this.phase === 'ending')) {
      this.sim.update(dt);
      // Mode AUTO : lance les ultimes prêts, un par un, avec une courte pause entre deux
      this.autoCd -= realDt;
      if (this.auto && this.phase === 'fight' && !this.director.busy && this.autoCd <= 0) {
        const u = this.sim.heroes.find((x) => this.sim!.canUltimate(x));
        if (u && this.requestUltimate(u)) this.autoCd = 1.2;
      }
    }

    if (this.phase === 'ending') {
      this.endT += realDt;
      if (this.endT > 2.6) this.finish();
    }

    // Combattants : pendant le gel, seul le héros qui lance son ultime bouge
    const caster = this.director.caster;
    const spot = this.spot;
    this.updateSeparation(dt);

    // Cible concentrée : l'ennemi que le plus de héros frappent en même temps.
    // Un seul anneau au sol suffit à dire « c'est lui qu'on tape ».
    let focus: Unit | null = null;
    if (this.sim) {
      const counts = new Map<number, { u: Unit; n: number }>();
      for (const u of this.sim.units) {
        if (u.side !== 'hero' || !u.alive || !u.target || !u.target.alive) continue;
        const e = counts.get(u.target.uid) ?? { u: u.target, n: 0 };
        e.n++;
        counts.set(u.target.uid, e);
      }
      let best = 1;
      for (const e of counts.values()) if (e.n > best) { best = e.n; focus = e.u; }
    }

    for (const v of this.views.values()) {
      v.dimK = spot && v.unit !== spot ? 1 : 0;
      v.focused = v.unit === focus && !spot;
      v.front = v.unit === caster;
      v.silhouette = this.impactT > this.impactDur * 0.45;
      v.update(frozen ? (v.unit === caster ? realDt : realDt * 0.08) : dt, realDt);
    }

    // Flaque de lumière sous le héros en pleine mise en scène d'ultime.
    if (spot) {
      const p = this.views.get(spot.uid)?.root.position;
      this.ultPool.visible = !!p;
      if (p) {
        const t = performance.now() / 1000;
        const w = 520 + Math.sin(t * 3.1) * 60;
        this.ultPool.position.set(p.x, p.y + 6);
        this.ultPool.width = w;
        this.ultPool.height = w * 0.34;
        this.ultPool.tint = spot.def.color;
        this.ultPool.alpha = 0.34 + Math.sin(t * 5.3) * 0.06;
      }
    } else if (this.ultPool.visible) {
      this.ultPool.visible = false;
    }
    const fxDt = frozen ? realDt * 0.08 : dt;
    for (const pv of this.projViews.values()) this.updateProj(pv, fxDt);
    this.updateFx(fxDt, realDt);
    for (const e of this.fxEmitters) e.update(fxDt);
    this.cineMotes.update(realDt);

    // Boss fissuré : plus il perd de PV, plus sa carapace se lézarde (75 / 50 / 25 %).
    if (this.sim && dt > 0 && this.bossUid >= 0) {
      const b = this.sim.units.find((u) => u.uid === this.bossUid);
      const bv = b ? this.views.get(b.uid) : undefined;
      if (b && bv) bv.setCracks(b.hp / Math.max(1, b.maxHp));
    }

    // Nuages de peste qui suivent les ennemis maudits
    if (this.sim && dt > 0) {
      for (const u of this.sim.units) {
        if (u.alive && u.dots.length && Math.random() < dt * 7) {
          const v = this.views.get(u.uid);
          // Maléfice des Sorcières : braises orangées ; peste de Morwen : fumée violette
          const hex = u.dots[0]!.src.def.id === 'witch';
          if (v) this.plague.burst(1, v.chest.x + rand(-30, 30), v.chest.y + rand(-40, 40), hex ? (Math.random() < 0.5 ? 0xd8701a : 0x8a3a10) : undefined);
        }
      }
    }

    this.updateScreen(realDt, w, h);
  }

  /** Effets plein écran : caméra, image d'impact, onde de choc, flou, lignes de vitesse, bandes noires. */
  private updateScreen(realDt: number, w: number, h: number): void {
    if (!this.director.controlsCamera) this.cam.go(this.autoFrame(), this.phase === 'intro' ? 1.4 : 1.6);
    this.cam.update(realDt);
    this.cam.apply(w, h, this.cover);
    this.updateBgPlanes();
    // Grain : on décale la tuile à chaque image → scintillement de pellicule.
    if (this.grain.alpha > 0) this.grain.tilePosition.set(-rand(0, 256), -rand(0, 256));

    // Image d'impact : blanc / silhouettes noires, puis noir
    if (this.impactT > 0) {
      this.impactT -= realDt;
      const first = this.impactT > this.impactDur * 0.45;
      this.impactBg.visible = this.impactT > 0;
      this.impactBg.tint = first ? this.impactCol : 0x000000;
      this.impactBg.alpha = 1;
      if (!first && this.impactT > 0) for (const v of this.views.values()) v.hit(false);
    } else this.impactBg.visible = false;

    const filters = [];
    if (this.shockT >= 0) {
      this.shockT += realDt;
      this.shock.time = this.shockT;
      this.shock.amplitude *= Math.exp(-realDt * 2.2);
      if (this.shockT > 1.2) this.shockT = -1;
      else filters.push(this.shock);
    }
    if (this.zoomBlurT > 0) {
      this.zoomBlurT -= realDt;
      this.zoomBlur.strength = this.zoomBlurMax * Math.max(0, this.zoomBlurT / this.zoomBlurDur);
      filters.push(this.zoomBlur);
    }
    if (this.rgbT > 0) {
      this.rgbT -= realDt;
      const v = this.rgbMax * Math.max(0, this.rgbT / this.rgbDur);
      this.rgb.redX = -v;
      this.rgb.blueX = v;
      filters.push(this.rgb);
    }
    // Désaturation de fin de boss : le monde se vide, le boss reste blanc.
    if (this.drainT > 0) {
      this.drainT = Math.max(0, this.drainT - realDt);
      const k = 1 - this.drainT / this.drainDur;
      const amt = Math.min(1, k * 1.6);
      this.drain.reset();
      this.drain.saturate(-0.85 * amt, true);
      this.drain.brightness(1 - 0.18 * amt, true);
      filters.push(this.drain);
    }

    // Négatif : prioritaire, il s'ajoute à tout le reste (2 à 4 images seulement).
    if (this.negT > 0) {
      this.negT -= realDt;
      this.negate.reset();
      this.negate.negative(false);
      // En premier : c'est le seul filtre conservé en qualité basse, et c'est
      // aussi le plus spectaculaire pour le moins de calcul.
      filters.unshift(this.negate);
    }
    const active = filters.length && this.quality !== 'low' ? filters : filters.length ? [filters[0]!] : [];
    // Ne réassigne les filtres que s'ils changent (chaque affectation recopie le tableau)
    const key = active.map((f) => (f === this.shock ? 's' : f === this.rgb ? 'r' : f === this.negate ? 'n' : f === this.drain ? 'd' : 'z')).join('');
    if (key !== this.rootFxKey) { this.rootFxKey = key; this.root.filters = active; }

    // Lignes de vitesse : elles TOURNENT (4,5 rad/s) au lieu de sauter au hasard.
    // C'est ce mouvement continu qui donne l'impression que le monde pivote.
    if (this.speedT > 0) {
      this.speedT -= realDt;
      const fade = Math.min(1, this.speedT / 0.15);
      this.speedLines.alpha = this.speedMax * fade * (0.78 + Math.sin(this.speedSpin * 9.3) * 0.16);
      this.speedLines.rotation = this.speedSpin;
      this.speedSpin += realDt * 4.5;
    } else {
      this.speedLines.alpha = 0;
      this.speedSpin = 0;
    }

    // Verre brisé : apparition nette, disparition en fondu accéléré.
    if (this.glassT > 0) {
      this.glassT -= realDt;
      const k = Math.max(0, this.glassT / this.glassDur);
      this.glass.alpha = Math.pow(k, 0.6) * 0.9;
      this.glass.scale.set(1 + (1 - k) * 0.05);
      this.glass.visible = this.glassT > 0;
    } else if (this.glass.visible) {
      this.glass.visible = false;
      this.glass.alpha = 0;
    }

    // Bandes cinéma
    this.barsK += (this.barsTarget - this.barsK) * Math.min(1, realDt * 10);
    const bh = h * 0.085 * this.barsK;
    const showBars = bh > 0.5;
    this.barTop.visible = this.barBot.visible = showBars;
    if (showBars) {
      this.barTop.position.set(0, 0);
      this.barTop.setSize(w, bh);
      this.barBot.position.set(0, h - bh);
      this.barBot.setSize(w, bh);
    }

    this.flashT = Math.max(0, this.flashT - realDt * 1.8);
    this.flash.alpha = this.flashT;
    this.dim.alpha += (this.dimTarget - this.dim.alpha) * Math.min(1, realDt * 8);
  }

  private updateIntro(dt: number): void {
    const sim = this.sim!;
    this.introT += dt;
    // Les héros courent jusqu'à leur position
    for (const u of sim.units) {
      const home = this.homes.get(u.uid) ?? u.x;
      if (u.side === 'hero' && u.x < home) u.x = Math.min(home, u.x + 620 * dt);
    }
    // Carte de titre du boss : elle s'ouvre AVANT le « Combat ! », pendant l'arrivée.
    if (this.bossName && this.introT > 0.05 && this.introT - dt <= 0.05) {
      this.emit('bossTitle', { name: this.bossName, title: this.stageName });
      this.director.bossIntro();
    }
    if (this.introT > 0.9 && this.introT - dt <= 0.9) this.emit('banner', { text: 'Combat !', kind: 'start' });
    if (this.introT > 1.9) {
      this.phase = 'fight';
      for (const u of sim.units) { const home = this.homes.get(u.uid); if (home !== undefined && u.side === 'hero') u.x = home; }
    }
  }

  private updateFx(dt: number, realDt: number): void {
    for (let i = this.fxSprites.length - 1; i >= 0; i--) {
      const f = this.fxSprites[i]!;
      f.life += dt;
      const ext = f as FxSprite & { emitter?: ParticleEmitter; sx2?: number; sy2?: number; tx?: number; ty?: number };
      if (f.dy === -3 && ext.emitter) {
        ext.emitter.update(dt);
      } else if (f.dy === -2) {
        // Flèche qui tombe du ciel
        const k = Math.min(1, f.life / f.max);
        f.s.position.set(ext.sx2! + (ext.tx! - ext.sx2!) * k, ext.sy2! + (ext.ty! - ext.sy2!) * k);
        if (k >= 1) {
          this.sparks.burst(3, ext.tx!, ext.ty!, 0x9ad8ff);
          if (Math.random() < 0.3) this.smoke.burst(1, ext.tx!, ext.ty!, 0x3a3048);
          f.life = f.max;
        }
      } else {
        f.s.rotation += f.vrot * dt;
        f.s.x += f.vx * dt;
        f.s.y += f.vy * dt;
        this.applyFx(f);
      }
      if (f.life >= f.max) {
        if (ext.emitter) ext.emitter.container.destroy({ children: true });
        f.s.destroy();
        this.fxSprites.splice(i, 1);
      }
    }
    for (let i = this.anims.length - 1; i >= 0; i--) {
      const a = this.anims[i]!;
      const d = a.real ? realDt : dt;
      a.life += d;
      const k = Math.min(1, a.life / a.max);
      a.fn(k, d);
      if (k >= 1) { a.obj.destroy({ children: true }); this.anims.splice(i, 1); }
    }
    for (let i = this.texts.length - 1; i >= 0; i--) {
      const n = this.texts[i]!;
      n.life += dt;
      const k = n.life / 1.0;
      const pop = n.life < 0.12 ? n.s0 - (n.s0 - 1) * (n.life / 0.12) : 1;
      n.t.scale.set(pop);
      n.t.x += n.vx * dt;
      n.t.y += n.vy * dt * (1 - k);
      n.t.alpha = k > 0.65 ? 1 - (k - 0.65) / 0.35 : 1;
      if (k >= 1) { this.releaseNumber(n.t); this.texts.splice(i, 1); }
    }
  }

  /**
   * Anti-chevauchement de mêlée.
   *
   * Deux combattants qui se superposent deviennent illisibles. On les écarte
   * franchement À L'ÉCRAN — en largeur ET en profondeur — sans jamais toucher
   * leurs positions logiques (`u.x`, `u.y`) : le combat, les portées et les
   * 2 280 simulations automatiques restent rigoureusement identiques.
   *
   * C'est le réglage qui règle la « mêlée magma » : l'ancien plafond de 24 px
   * était dérisoire face à des personnages de 150 à 250 px de large.
   */
  private updateSeparation(dt: number): void {
    const list: UnitView[] = [];
    for (const v of this.views.values()) if (!v.gone && !v.isDead) list.push(v);
    for (const v of list) { v.sepTarget = 0; v.sepYTarget = 0; }

    // Un personnage mesure 150 à 250 px de large : en dessous de ~150 px d'écart,
    // deux silhouettes se lisent comme une seule masse. On les écarte donc
    // franchement À L'ÉCRAN (jamais dans la simulation).
    const R = 190;      // distance sous laquelle deux corps se gênent
    const MAX_X = 78;   // écart horizontal maximal
    const MAX_Y = 34;   // écart de profondeur maximal (décalage vertical)
    for (let i = 0; i < list.length; i++) {
      const a = list[i]!;
      for (let j = i + 1; j < list.length; j++) {
        const b = list[j]!;
        let dx = b.unit.x - a.unit.x;
        let dy = b.unit.y - a.unit.y;
        // Exactement au même endroit : on tranche par l'identifiant, sinon ça tremble.
        if (Math.abs(dx) < 0.5) dx = a.unit.uid < b.unit.uid ? -0.5 : 0.5;
        if (Math.abs(dy) < 0.5) dy = a.unit.uid < b.unit.uid ? -0.5 : 0.5;
        // La profondeur « pèse » plus que la largeur à l'écran : on la compte double.
        const d = Math.hypot(dx, dy * 2);
        if (d >= R) continue;
        const k = 1 - d / R;
        const len = Math.max(1, Math.hypot(dx, dy));
        const push = k * 44;
        // Écartement le long de l'axe qui les sépare : les corps se rangent
        // naturellement en quinconce au lieu de former une seule ligne.
        const nx = dx / len, ny = dy / len;
        a.sepTarget -= nx * push;
        b.sepTarget += nx * push;
        a.sepYTarget -= ny * push * 0.7;
        b.sepYTarget += ny * push * 0.7;
      }
    }
    for (const v of list) {
      v.sepTarget = Math.max(-MAX_X, Math.min(MAX_X, v.sepTarget));
      v.sepYTarget = Math.max(-MAX_Y, Math.min(MAX_Y, v.sepYTarget));
      // Lissage : jamais de saut, même quand un corps traverse un autre.
      const k = Math.min(1, dt * 9);
      v.sepX += (v.sepTarget - v.sepX) * k;
      v.sepY += (v.sepYTarget - v.sepY) * k;
    }
  }

  private finish(): void {
    if (this.phase !== 'ending' || !this.sim) return;
    this.phase = 'done';
    const sim = this.sim;
    this.emit('finished', {
      winner: sim.winner ?? 'enemy',
      stars: starsFor(sim),
      time: sim.time,
      stats: sim.heroes.map((x) => ({ id: x.def.id, name: x.def.name, dealt: x.dealt, healed: x.healed, taken: x.taken, alive: x.alive })),
    });
  }

  /** Émis par le réalisateur au bon moment de la séquence d'ultime. */
  emitCutin(u: Unit): void {
    this.emit('cutin', u);
  }
}
