import { HEROES, heroById, levelUpCost, skillTiers, teamPower, tierProgress, type HeroDef, type TeamMember } from '../data/heroes';
import { COST, ITEMS, performSummon, type PullResult } from '../data/summon';
import { Emitter } from '../utils/Emitter';

export type Quality = 'ultra' | 'high' | 'low';

export interface PlayerState {
  name: string;
  level: number;
  xp: number;
  xpMax: number;
  power: number;
  gold: number;
  gems: number;
  energy: number;
  energyMax: number;
}

export interface Settings {
  quality: Quality;
  showLabels: boolean;
  /** Volume général (0…1). */
  volume: number;
  muted: boolean;
  /** Combat : ultimes automatiques et vitesse. */
  battleAuto: boolean;
  battleSpeed: 1 | 2;
  /** Compteur d'images par seconde. */
  showFps: boolean;
}

/** Étoiles obtenues par niveau de campagne (0 = jamais gagné). */
export type CampaignProgress = Record<string, number>;

export interface RewardOutcome {
  levelUp: boolean;
  newLevel: number;
  firstClear: boolean;
}

/** Héros possédés : identifiant → nombre d'étoiles. */
export type Roster = Record<string, number>;

/** Niveaux des héros possédés : identifiant → niveau (1…∞, aucun maximum). */
export type HeroLevels = Record<string, number>;

export interface SaveData {
  version: 1;
  player: PlayerState;
  settings: Settings;
  campaign: CampaignProgress;
  heroes: Roster;
  /** Niveau de chaque héros (1 = base). Aucun plafond. */
  levels: HeroLevels;
  /** Équipe de combat (5 héros max, dans l'ordre choisi). */
  team: string[];
  /** Invocations faites depuis le dernier SSR. */
  pity: number;
  summons: number;
  /** Cadeaux déjà reçus. */
  gifts: string[];
}

/** Cadeau de bienvenue de la v0.5 (aussi offert aux anciennes sauvegardes). */
export const WELCOME_GIFT = { id: 'v05-autel', gems: 1500 };

const STARTERS = (): Roster => Object.fromEntries(HEROES.filter((h) => h.starter).map((h) => [h.id, h.stars]));

const SAVE_KEY = 'legendes-tour-infinie/save';

const defaults = (): SaveData => ({
  version: 1,
  player: {
    name: 'Invocateur',
    level: 1,
    xp: 0,
    xpMax: 100,
    power: 0,
    gold: 5000,
    gems: 300,
    energy: 60,
    energyMax: 60,
  },
  settings: { quality: 'high', showLabels: true, volume: 0.7, muted: false, battleAuto: true, battleSpeed: 1, showFps: false },
  campaign: {},
  heroes: STARTERS(),
  levels: Object.fromEntries(HEROES.filter((h) => h.starter).map((h) => [h.id, 1])),
  team: HEROES.filter((h) => h.starter).map((h) => h.id),
  pity: 0,
  summons: 0,
  gifts: [],
});

/** Stockage local sécurisé (certains navigateurs / iframes interdisent localStorage). */
const storage = {
  read(): string | null {
    try { return localStorage.getItem(SAVE_KEY); } catch { return null; }
  },
  write(value: string): void {
    try { localStorage.setItem(SAVE_KEY, value); } catch { /* ignoré */ }
  },
};

type StoreEvents = { player: PlayerState; settings: Settings; campaign: CampaignProgress; heroes: Roster; team: string[] };

class Store extends Emitter<StoreEvents> {
  private data: SaveData = defaults();
  /** Gemmes offertes au chargement (affichées une fois par l'interface). */
  pendingGift = 0;

  load(): void {
    const raw = storage.read();
    if (raw) {
      try {
        const parsed = JSON.parse(raw) as Partial<SaveData>;
        const base = defaults();
        const heroes: Roster = { ...base.heroes, ...parsed.heroes };
        const levels: HeroLevels = { ...base.levels, ...(parsed.levels ?? {}) };
        for (const id of Object.keys(heroes)) if (!heroById(id)) delete heroes[id];
        const team = (parsed.team ?? base.team).filter((id, i, a) => heroes[id] !== undefined && a.indexOf(id) === i).slice(0, 5);
        this.data = {
          version: 1,
          player: { ...base.player, ...parsed.player },
          settings: { ...base.settings, ...parsed.settings },
          campaign: { ...parsed.campaign },
          heroes,
          levels,
          team: team.length ? team : base.team,
          pity: parsed.pity ?? 0,
          summons: parsed.summons ?? 0,
          gifts: parsed.gifts ?? [],
        };
      } catch {
        this.data = defaults();
      }
    }
    this.grantWelcome();
    this.refreshPower();
  }

  private grantWelcome(): void {
    if (this.data.gifts.includes(WELCOME_GIFT.id)) return;
    this.data.gifts.push(WELCOME_GIFT.id);
    this.data.player.gems += WELCOME_GIFT.gems;
    this.pendingGift = WELCOME_GIFT.gems;
    this.persist();
  }

  get player(): Readonly<PlayerState> { return this.data.player; }
  get campaign(): Readonly<CampaignProgress> { return this.data.campaign; }
  get heroes(): Readonly<Roster> { return this.data.heroes; }
  get teamIds(): readonly string[] { return this.data.team; }
  get pity(): number { return this.data.pity; }
  get summons(): number { return this.data.summons; }

  owns(id: string): boolean { return this.data.heroes[id] !== undefined; }
  starsOf(h: HeroDef): number { return this.data.heroes[h.id] ?? h.stars; }

  /** Niveau d'un héros (1 s'il n'a jamais été amélioré). */
  levelOf(h: HeroDef): number { return this.data.levels[h.id] ?? 1; }

  /** Paliers de compétence déjà atteints (tous les 10 niveaux). */
  skillTierOf(h: HeroDef): number { return skillTiers(this.levelOf(h)); }

  /** Coût de la prochaine montée de niveau, ou null si pas assez d'or. */
  levelUpPrice(h: HeroDef): number { return levelUpCost(this.levelOf(h), h.rarity); }

  canLevelUp(h: HeroDef): boolean {
    return this.owns(h.id);
  }

  /** Monte un héros d'autant de niveaux que l'or le permet. Renvoie le nombre gagné. */
  levelUp(id: string, count = 1): number {
    const def = heroById(id);
    if (!def || !this.owns(id)) return 0;
    const p = this.data.player;
    let gained = 0;
    for (let i = 0; i < count; i++) {
      const lvl = this.data.levels[id] ?? 1;
      const price = levelUpCost(lvl, def.rarity);
      if (p.gold < price) break;
      p.gold -= price;
      this.data.levels[id] = lvl + 1;
      gained++;
    }
    if (gained > 0) {
      this.refreshPower();
      this.persist();
      this.emit('heroes', this.data.heroes);
      this.emit('player', p);
      this.emit('team', this.data.team);
    }
    return gained;
  }

  /** Progression vers le prochain palier de compétence (0…1). */
  tierProgressOf(h: HeroDef): number { return tierProgress(this.levelOf(h)); }

  /** Équipe de combat avec les étoiles de chaque héros. */
  team(): TeamMember[] {
    return this.data.team
      .map((id) => heroById(id))
      .filter((h): h is HeroDef => !!h)
      .map((def) => ({ def, stars: this.starsOf(def), level: this.levelOf(def) }));
  }

  setTeam(ids: string[]): void {
    const team = ids.filter((id, i) => this.owns(id) && ids.indexOf(id) === i).slice(0, 5);
    if (!team.length) return;
    this.data.team = team;
    this.refreshPower();
    this.persist();
    this.emit('team', this.data.team);
    this.emit('player', this.data.player);
  }

  /** Puissance de l'équipe (recalculée à partir des héros). */
  refreshPower(): void {
    this.data.player.power = teamPower(this.team());
  }

  /**
   * Invocation à l'autel (×1 ou ×10). Renvoie null si les gemmes manquent.
   * Les doublons donnent une étoile ; les objets R sont crédités immédiatement.
   */
  summon(count: 1 | 10): PullResult[] | null {
    const cost = count === 10 ? COST.ten : COST.one;
    const p = this.data.player;
    if (p.gems < cost) return null;
    p.gems -= cost;
    const r = performSummon(count, { heroes: this.data.heroes, pity: this.data.pity });
    this.data.heroes = r.heroes;
    this.data.pity = r.pity;
    this.data.summons += count;
    for (const res of r.results) {
      if (res.kind === 'item') {
        if (res.item === 'gold') p.gold += ITEMS.gold.amount;
        else this.addXp(ITEMS.elixir.amount);
      } else if (res.refundGold) {
        p.gold += res.refundGold;
      }
    }
    this.refreshPower();
    this.persist();
    this.emit('heroes', this.data.heroes);
    this.emit('player', p);
    return r.results;
  }

  private addXp(xp: number): boolean {
    const p = this.data.player;
    p.xp += xp;
    let levelUp = false;
    while (p.xp >= p.xpMax) {
      p.xp -= p.xpMax;
      p.level++;
      p.xpMax = Math.round(p.xpMax * 1.3);
      p.energyMax += 2;
      p.energy = Math.max(p.energy, p.energyMax);
      levelUp = true;
    }
    return levelUp;
  }

  /** Enregistre une victoire : étoiles, or, gemmes, expérience (avec montée de niveau) et énergie. */
  completeStage(id: string, stars: number, rewards: { gold: number; gems: number; xp: number }, energy: number): RewardOutcome {
    const p = this.data.player;
    const firstClear = !this.data.campaign[id];
    this.data.campaign[id] = Math.max(this.data.campaign[id] ?? 0, stars);
    p.gold += rewards.gold;
    p.gems += rewards.gems;
    p.energy = Math.max(0, p.energy - energy);
    const levelUp = this.addXp(rewards.xp);
    this.persist();
    this.emit('player', p);
    this.emit('campaign', this.data.campaign);
    return { levelUp, newLevel: p.level, firstClear };
  }
  get settings(): Readonly<Settings> { return this.data.settings; }

  updatePlayer(patch: Partial<PlayerState>): void {
    Object.assign(this.data.player, patch);
    this.persist();
    this.emit('player', this.data.player);
  }

  updateSettings(patch: Partial<Settings>): void {
    Object.assign(this.data.settings, patch);
    this.persist();
    this.emit('settings', this.data.settings);
  }

  reset(): void {
    this.data = defaults();
    this.pendingGift = 0;
    this.grantWelcome();
    this.refreshPower();
    this.persist();
    this.emit('player', this.data.player);
    this.emit('settings', this.data.settings);
    this.emit('campaign', this.data.campaign);
    this.emit('heroes', this.data.heroes);
    this.emit('team', this.data.team);
  }

  private persist(): void {
    storage.write(JSON.stringify(this.data));
  }
}

export const store = new Store();
