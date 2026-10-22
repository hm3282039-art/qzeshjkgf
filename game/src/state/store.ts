import { gearBonus, itemScore, makeItem, SLOT_LIST, type GearBonus, type Item, type Slot } from '../data/items';
import { HEROES, STAGES, heroById, levelUpCost, skillTiers, teamPower, tierProgress, type HeroDef, type TeamMember } from '../data/heroes';
import { COST, ITEMS, performSummon, type PullResult } from '../data/summon';
import { towerRewards } from '../data/tower';
import { Emitter } from '../utils/Emitter';

export type Quality = 'ultra' | 'high' | 'low';

export interface PlayerState {
  name: string;
  /** Cadre de profil affiché (identifiant de FRAMES). */
  frame: string;
  /** Titre affiché sous le pseudo (identifiant de TITLES). */
  title: string;
  level: number;
  xp: number;
  xpMax: number;
  power: number;
  gold: number;
  gems: number;
  energy: number;
  energyMax: number;
  /**
   * Date (ms) de la dernière mise à jour de l'énergie. L'énergie se recharge
   * toute seule : sans ça, un joueur se retrouve bloqué après huit combats et
   * n'a plus aucun moyen de continuer.
   */
  energyAt: number;
}

/** Une unité d'énergie par minute. */
export const ENERGY_REGEN_MS = 60 * 1000;

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
  /**
   * Plafond d'images par seconde. `0` = aucune limite : le jeu suit l'écran
   * (144 Hz → 144 images/seconde). Utile de le baisser si le PC chauffe.
   */
  fpsCap: number;
}

/** Étoiles obtenues par niveau de campagne (0 = jamais gagné). */
export type CampaignProgress = Record<string, number>;

export interface RewardOutcome {
  levelUp: boolean;
  newLevel: number;
  firstClear: boolean;
  /** Objet tombé à la fin du niveau. */
  drop?: Item | null;
  /** Ressources réellement gagnées (0 pour une récompense déjà touchée). */
  gold?: number;
  gems?: number;
  xp?: number;
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
  /** Objets possédés (pool partagé entre tous les héros). */
  inventory: Item[];
  /** Objets portés : héros → emplacement → identifiant d'objet. */
  equipped: Record<string, Partial<Record<Slot, string>>>;
  /** Tour de l'Infini : étage courant et record personnel. */
  tower: TowerState;
}

export interface TowerState {
  /** Prochain étage à gravir. */
  floor: number;
  /** Étage le plus haut jamais atteint. */
  best: number;
}

/** Cadeau de bienvenue de la v0.5 (aussi offert aux anciennes sauvegardes). */
export const WELCOME_GIFT = { id: 'v05-autel', gems: 1500 };

const STARTERS = (): Roster => Object.fromEntries(HEROES.filter((h) => h.starter).map((h) => [h.id, h.stars]));

const SAVE_KEY = 'legendes-tour-infinie/save';

const defaults = (): SaveData => ({
  version: 1,
  player: {
    name: 'Invocateur',
    frame: 'bronze',
    title: 'invocateur',
    level: 1,
    xp: 0,
    xpMax: 100,
    power: 0,
    gold: 5000,
    gems: 300,
    energy: 60,
    energyMax: 60,
    energyAt: Date.now(),
  },
  settings: { quality: 'high', showLabels: true, volume: 0.7, muted: false, battleAuto: true, battleSpeed: 1, showFps: false, fpsCap: 0 },
  campaign: {},
  heroes: STARTERS(),
  levels: Object.fromEntries(HEROES.filter((h) => h.starter).map((h) => [h.id, 1])),
  team: HEROES.filter((h) => h.starter).map((h) => h.id),
  pity: 0,
  summons: 0,
  gifts: [],
  inventory: [],
  equipped: {},
  tower: { floor: 1, best: 0 },
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
          inventory: parsed.inventory ?? [],
          equipped: parsed.equipped ?? {},
          tower: { floor: Math.max(1, parsed.tower?.floor ?? 1), best: Math.max(0, parsed.tower?.best ?? 0) },
        };
      } catch {
        this.data = defaults();
      }
    }
    this.grantWelcome();
    this.grantStarterGear();
    this.refreshPower();
  }

  /** Petit lot de départ : un objet commun par emplacement, une seule fois. */
  private grantStarterGear(): void {
    const FLAG = 'gear-starter';
    if (this.data.gifts.includes(FLAG)) return;
    this.data.gifts.push(FLAG);
    if (!this.data.inventory.length) {
      for (const sl of SLOT_LIST) this.data.inventory.push(makeItem(0, { rarity: 'C', slot: sl.id }));
    }
    this.persist();
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

  /**
   * Rend l'énergie accumulée depuis la dernière visite (1 toutes les 2 minutes).
   * Appelée au chargement, à l'ouverture d'un écran et par une horloge légère.
   */
  tickEnergy(now = Date.now()): number {
    const p = this.data.player;
    if (p.energy >= p.energyMax) { p.energyAt = now; return 0; }
    const gain = Math.floor((now - (p.energyAt || now)) / ENERGY_REGEN_MS);
    if (gain <= 0) return 0;
    const before = p.energy;
    p.energy = Math.min(p.energyMax, p.energy + gain);
    p.energyAt = now;
    const delta = p.energy - before;
    if (delta > 0) {
      this.persist();
      this.emit('player', p);
    }
    return delta;
  }

  /** Secondes restantes avant la prochaine unité d'énergie (0 si plein). */
  nextEnergyIn(now = Date.now()): number {
    const p = this.data.player;
    if (p.energy >= p.energyMax) return 0;
    const left = ENERGY_REGEN_MS - ((now - (p.energyAt || now)) % ENERGY_REGEN_MS);
    return Math.ceil(left / 1000);
  }

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
      .map((def) => ({ def, stars: this.starsOf(def), level: this.levelOf(def), gear: this.gearOf(def.id) }));
  }

  /** Objets portés par un héros. */
  equippedIn(heroId: string): Partial<Record<Slot, Item>> {
    const map = this.data.equipped[heroId] ?? {};
    const out: Partial<Record<Slot, Item>> = {};
    for (const sl of SLOT_LIST) {
      const id = map[sl.id];
      if (!id) continue;
      const it = this.data.inventory.find((x) => x.id === id);
      if (it) out[sl.id] = it;
    }
    return out;
  }

  /** Bonus cumulés de l'équipement d'un héros. */
  gearOf(heroId: string): GearBonus {
    const eq = this.equippedIn(heroId);
    return gearBonus(SLOT_LIST.map((sl) => eq[sl.id]));
  }

  /** Objets libres pour un emplacement, du plus puissant au plus faible. */
  inventoryFor(slot: Slot): Item[] {
    const used = this.usedItemIds();
    return this.data.inventory
      .filter((it) => it.slot === slot && !used.has(it.id))
      .sort((a, b) => itemScore(b) - itemScore(a));
  }

  private usedItemIds(): Set<string> {
    const used = new Set<string>();
    for (const map of Object.values(this.data.equipped)) {
      for (const id of Object.values(map)) if (id) used.add(id);
    }
    return used;
  }

  /** Équipe un objet. Le pool étant partagé, il est retiré aux autres héros. */
  equip(heroId: string, itemId: string): boolean {
    const it = this.data.inventory.find((x) => x.id === itemId);
    if (!it) return false;
    for (const map of Object.values(this.data.equipped)) {
      for (const sl of SLOT_LIST) if (map[sl.id] === itemId) delete map[sl.id];
    }
    const cur = this.data.equipped[heroId] ?? (this.data.equipped[heroId] = {});
    cur[it.slot] = itemId;
    this.refreshPower();
    this.persist();
    this.emit('player', this.data.player);
    this.emit('heroes', this.data.heroes);
    return true;
  }

  unequip(heroId: string, slot: Slot): void {
    const map = this.data.equipped[heroId];
    if (map) delete map[slot];
    this.refreshPower();
    this.persist();
    this.emit('player', this.data.player);
    this.emit('heroes', this.data.heroes);
  }

  /** Fait tomber un objet. Si l'inventaire est saturé, on jette le plus ancien objet libre. */
  dropItem(tier: number): Item | null {
    const it = makeItem(tier);
    if (this.data.inventory.length >= 150) {
      const used = this.usedItemIds();
      const idx = this.data.inventory.findIndex((x) => !used.has(x.id));
      if (idx >= 0) this.data.inventory.splice(idx, 1);
    }
    this.data.inventory.push(it);
    return it;
  }

  get inventory(): readonly Item[] { return this.data.inventory; }

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

  /** Paie l'énergie d'un niveau. Renvoie false si le joueur n'en a pas assez. */
  spendEnergy(amount: number): boolean {
    const p = this.data.player;
    this.tickEnergy();
    if (p.energy < amount) return false;
    if (p.energy >= p.energyMax) p.energyAt = Date.now();
    p.energy -= amount;
    this.persist();
    this.emit('player', p);
    return true;
  }

  /** Enregistre une victoire : étoiles, or, gemmes, expérience (avec montée de niveau) et énergie. */
  completeStage(id: string, stars: number, rewards: { gold: number; gems: number; xp: number }, energy: number): RewardOutcome {
    const p = this.data.player;
    const firstClear = !this.data.campaign[id];
    this.data.campaign[id] = Math.max(this.data.campaign[id] ?? 0, stars);
    p.gold += rewards.gold;
    p.gems += rewards.gems;
    void energy;
    const levelUp = this.addXp(rewards.xp);
    // Butin : un objet à chaque fin de niveau, plus fort dans les chapitres avancés.
    const tier = Math.max(0, STAGES.findIndex((st) => st.id === id));
    const drop = this.dropItem(tier);
    this.persist();
    this.emit('player', p);
    this.emit('campaign', this.data.campaign);
    return { levelUp, newLevel: p.level, firstClear, drop, gold: rewards.gold, gems: rewards.gems, xp: rewards.xp };
  }
  /* ====================== Tour de l'Infini ====================== */

  get towerFloor(): number { return this.data.tower.floor; }
  get towerBest(): number { return this.data.tower.best; }

  /**
   * Enregistre le résultat d'un étage.
   * Première victoire : or + gemmes + XP + objet. Été déjà conquis : XP seule.
   * Défaite : rien ne bouge — on ne perd jamais de progression dans la Tour.
   */
  completeTower(floor: number, win: boolean): RewardOutcome | null {
    if (!win) return null;
    const p = this.data.player;
    const firstClear = floor > this.data.tower.best;
    const rw = towerRewards(floor);
    const xp = firstClear ? rw.xp : Math.round(rw.xp * 0.35);
    if (firstClear) {
      p.gold += rw.gold;
      p.gems += rw.gems;
    }
    const levelUp = this.addXp(xp);
    const drop = firstClear ? this.dropItem(Math.min(40, Math.round(floor * 0.7))) : null;
    this.data.tower.best = Math.max(this.data.tower.best, floor);
    this.data.tower.floor = Math.max(this.data.tower.floor, floor + 1);
    this.persist();
    this.emit('player', p);
    return { levelUp, newLevel: p.level, firstClear, drop, gold: firstClear ? rw.gold : 0, gems: firstClear ? rw.gems : 0, xp };
  }

  get settings(): Readonly<Settings> { return this.data.settings; }

  /** Change le cadre affiché (aucune condition ici : l'interface ne propose que les cadres débloqués). */
  setFrame(frame: string): void { this.updatePlayer({ frame }); }

  /** Change le titre affiché. */
  setTitle(title: string): void { this.updatePlayer({ title }); }

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
