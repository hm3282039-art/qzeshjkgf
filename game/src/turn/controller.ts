/**
 * CONTRÔLEUR du combat tour par tour joué DANS la scène du jeu.
 *
 * Il fait tourner le moteur (`TurnBattle`), traduit chaque événement en événements de
 * la simulation d'origine (`SimEvents`) que la scène écoute — c'est ce qui rend les
 * attaques, les chiffres de dégâts, les morts, les cinématiques d'ultime — et attend
 * le choix du joueur (capacité + cible cliquée sur le terrain) quand c'est à un héros
 * de jouer.
 *
 * Tout ce qui est affichage passe par les crochets `TurnUi` : la barre de capacités du
 * HUD, l'anneau de ciblage sur le terrain, les messages. Ce module ne touche pas au DOM.
 */
import type { Unit } from '../battle/Sim';
import type { TurnBridge } from './bridge';
import type { TurnBattle, TUnit } from './engine';
import { type FxType } from '../battle/Sim';
import { SOUL_BURN_COST, type BattleEvent } from './types';

export interface TurnChoice { skill: number; target: number | null; burn: boolean; }

export interface TurnUi {
  /** Rafraîchit la barre du bas (acteur, capacités, recharges, âmes). */
  state(): void;
  hint(text: string): void;
  /** Entoure les unités cliquables pour le choix de la cible (`null` = fin de ciblage). */
  pick(uids: number[] | null): void;
  /** Attend la fin de la cinématique d'ultime en cours (le réalisateur gele la scène). */
  waitCine(): Promise<void>;
}

const wait = (ms: number): Promise<void> => new Promise((r) => setTimeout(r, Math.max(0, ms)));

/**
 * Chorégraphies DÉDIÉES par héros et par capacité (les effets du combat temps
 * réel d'origine : bouclier, saut, slam…), complétées UN PAR UN à mesure qu'on
 * recrée chaque perso. `cast` = effet au lancement (sur le lanceur),
 * `impact` = effet dédié à l'impact (à la place du générique).
 */
const HERO_FX: Record<string, { cast: string[][]; impact: string[] }> = {
  kael: {
    // [0] Lame de Braise : petites braises qui montent, puis fente.
    // [1] Bouclier de Cendres : le bouclier se plante, dôme visible.
    // [2] Cœur de Braise : PASSIF, aucune animation (jamais utilisé).
    // [3] Jugement Ardent : cinématique complète, bond, puis onde de choc.
    cast: [[], ['kael_shield', 'shield_dome'], [], ['kael_leap']],
    impact: ['kael_leap', 'arc_flurry', 'kael_slam', 'kael_slam'],
  },
};

export class TurnController {
  auto = false;
  speed: 1 | 2 | 4 = 1;
  /** Nombre de tours déjà joués (0 = le placement peut encore être changé). */
  turns = 0;
  private epoch = 0;
  private dead = false;
  private burn = false;
  private pending: ((c: TurnChoice | null) => void) | null = null;
  /** Identifiants de projectiles et nature du coup en cours (pour les chorégraphies). */
  private pid = 1;
  /** Dernier `cast` vu : héros + index de capacité, pour les effets dédiés. */
  private casterHid = '';
  private casterIdx = 0;
  private curHits = 1;
  private pendingSkill: number | null = null;
  private started = 0;

  constructor(readonly battle: TurnBattle, readonly bridge: TurnBridge, readonly ui: TurnUi) {}

  /** Arrête tout (sortie du combat, relance, « rejouer »). */
  cancel(): void {
    this.dead = true;
    this.epoch++;
    this.pending?.(null);
    this.pending = null;
    this.ui.pick(null);
  }

  get acting(): TUnit | null { return this.battle.current ?? null; }

  /** Embrasement armé pour le prochain coup. */
  get burning(): boolean { return this.burn; }

  /* --------------------------- entrées du joueur --------------------------- */

  /** Le joueur a cliqué une capacité de la barre du bas. */
  tapSkill(i: number): void {
    const b = this.battle;
    const u = this.acting;
    if (!u || u.side !== 'hero' || this.auto || !this.pending) return;
    const sk = u.skills[i];
    if (!sk) return;
    if (sk.passive) { this.ui.hint(`${sk.name} est un passif : il est toujours actif, rien à lancer.`); return; }
    if (!u.ready(i)) { this.ui.hint(`${sk.name} recharge encore : ${Math.max(0, u.cd[i] ?? 0)} tour(s).`); return; }
    const legal = b.legalTargets(u, sk);
    if (legal.length === 0) { this.ui.hint(`Aucune cible valable pour ${sk.name}.`); return; }
    if (this.burn && b.soul.hero < SOUL_BURN_COST) { this.burn = false; this.ui.hint('Plus assez d’âmes : embrasement annulé.'); this.ui.state(); }

    // Les capacités de zone / soi / équipe / allié le plus blessé partent tout de suite.
    const multi = sk.target === 'enemyAll' || sk.target === 'enemyFrontRow' || sk.target === 'allAllies'
      || sk.target === 'allyLowest' || sk.target === 'self';
    if (multi || legal.length === 1) {
      this.finishPick({ skill: i, target: legal[0]?.uid ?? null, burn: this.burn });
      return;
    }
    this.pendingSkill = i;
    this.ui.pick(legal.map((t) => this.bridge.view(t.uid)).filter((v): v is Unit => !!v).map((v) => v.uid));
    this.ui.hint(`${sk.name} : clique une cible entourée sur le terrain (Échap pour annuler).`);
  }

  /** Le joueur a cliqué une unité entourée sur le terrain. */
  tapTarget(uid: number): void {
    const b = this.battle;
    const u = this.acting;
    if (this.pendingSkill === null || !u || !this.pending) return;
    const sk = u.skills[this.pendingSkill]!;
    if (!b.legalTargets(u, sk).some((t) => {
      const v = this.bridge.view(t.uid);
      return v?.uid === uid;
    })) return;
    const t = b.units.find((x) => this.bridge.view(x.uid)?.uid === uid);
    if (!t) return;
    this.finishPick({ skill: this.pendingSkill, target: t.uid, burn: this.burn });
  }

  /** Échap / recliquer : annule le choix de cible en cours. */
  cancelPick(): void {
    if (this.pendingSkill === null) return;
    this.pendingSkill = null;
    this.ui.pick(null);
    this.ui.state();
    this.ui.hint('Coup annulé — choisis une capacité.');
  }

  toggleBurn(): void {
    if (this.battle.soul.hero < SOUL_BURN_COST) { this.ui.hint(`Il faut ${SOUL_BURN_COST} âmes pour embraser un coup.`); return; }
    this.burn = !this.burn;
    this.ui.state();
    this.ui.hint(this.burn ? 'Embrasement armé : le prochain coup fera ×1,5 et ses effets passeront plus sûrement.' : 'Embrasement annulé, les âmes sont gardées.');
  }

  private finishPick(c: TurnChoice): void {
    this.pendingSkill = null;
    this.ui.pick(null);
    const p = this.pending;
    this.pending = null;
    p?.(c);
  }

  /* ------------------------------- la boucle ------------------------------- */

  async run(): Promise<void> {
    const here = this.epoch;
    this.started = Date.now();
    await wait(1500 / this.speed); // les héros finissent leur entrée
    if (here !== this.epoch || this.dead) return;

    while (!this.battle.over && !this.dead && here === this.epoch) {
      const { actor, events } = this.battle.advance();
      await this.play(events, here);
      if (this.dead || here !== this.epoch) return;
      if (!actor) break;
      this.turns = Math.max(this.turns, this.battle.turn);

      if (actor.side === 'enemy') {
        this.ui.hint(`${actor.name} joue…`);
        await wait(430 / this.speed);
        if (this.dead || here !== this.epoch) return;
        const c = this.battle.aiChoice(actor);
        await this.play(this.battle.resolve(c.skill, c.target, c.burn), here);
        if (this.dead || here !== this.epoch) return;
        await wait(180 / this.speed);
        continue;
      }

      if (this.auto) {
        await wait(330 / this.speed);
        if (this.dead || here !== this.epoch) return;
        const c = this.battle.aiChoice(actor);
        await this.play(this.battle.resolve(c.skill, c.target, c.burn), here);
        if (this.dead || here !== this.epoch) return;
        await wait(160 / this.speed);
        continue;
      }

      // Au joueur de jouer : la barre du bas propose les capacités.
      this.ui.state();
      const s = actor.skills;
      this.ui.hint(`À ${actor.name} de jouer : ${s[0]!.name}, ${s[1]!.name}, ${s[2]!.name}${actor.ready(3) ? ` ou ULTIME ${s[3]!.name}` : ` (ultime dans ${actor.cd[3] ?? 0} tour(s))`}.`);
      const choice = await new Promise<TurnChoice | null>((resolve) => { this.pending = resolve; });
      if (this.dead || here !== this.epoch) return;
      if (!choice) continue;
      await this.play(this.battle.resolve(choice.skill, choice.target, choice.burn), here);
      if (this.dead || here !== this.epoch) return;
      await wait(160 / this.speed);
    }

    if (this.dead || here !== this.epoch) return;
    this.bridge.time = (Date.now() - this.started) / 1000;
    this.bridge.winner = this.battle.winner ?? 'enemy';
    this.bridge.syncAll();
    this.ui.pick(null);
    this.ui.state();
    // La scène joue la fin (musique, fondu) puis émet `finished` : récompenses identiques.
    this.bridge.emit('end', { winner: this.bridge.winner });
  }

  /* --------------------- événements moteur → scène --------------------- */

  private async play(events: BattleEvent[], here: number): Promise<void> {
    const b = this.bridge;
    for (const e of events) {
      if (this.dead || here !== this.epoch) return;
      switch (e.type) {
        case 'turn':
          this.bridge.syncAll();
          this.ui.state();
          break;
        case 'cast': {
          const u = b.view(e.uid);
          if (!u) break;
          const sk = this.battle.byUid(e.uid)?.skills.find((x) => x.id === e.skill);
          this.curHits = sk?.hits ?? 1;
          if (e.ultimate) {
            // L'aura de charge monte pendant le fondu, la ciné prend le relais.
            b.emit('fx', { type: 'charge_aura', u });
            b.cineCaster = u;
            b.emit('cast', { u, ability: 'ultimate' });
            await this.ui.waitCine();
            b.cineCaster = null;
          } else {
            b.emit('cast', { u, ability: 'skill' });
            if (sk && sk.kind === 'support') {
              b.emit('fx', { type: sk.effects.some((f) => f.id === 'shield') ? 'shield_dome' : 'buff_rise', u });
              await wait(220 / this.speed);
            } else {
              await wait(240 / this.speed);
            }
          }
          // Effets dédiés du héros au lancement (bouclier de Kael, aura, dôme…).
          const tu = this.battle.byUid(e.uid);
          const chid = tu?.hero?.id ?? tu?.def.id ?? '';
          const cidx = Math.max(0, (tu?.skills ?? []).findIndex((sk) => sk.id === e.skill));
          this.casterHid = chid;
          this.casterIdx = cidx;
          const cu = b.view(e.uid);
          for (const f of HERO_FX[chid]?.cast?.[cidx] ?? []) {
            b.emit('fx', { type: f as FxType, u: cu ?? undefined, x: cu?.x, y: cu?.y });
            await wait(170 / this.speed);
          }
          break;
        }
        case 'damage': {
          const tgt = b.view(e.tgt);
          const src = b.view(e.src);
          b.syncAll();
          // Le coup se voit AVANT le chiffre : charge/fente ou projectile, puis impact.
          if (tgt && src) {
            if (src.ranged || e.kind === 'magic') {
              b.emit('projectile', {
                id: this.pid++, kind: e.kind === 'magic' ? 'orb' : 'arrow', from: src, to: tgt,
                sx: src.x, sy: src.y - 150, ex: tgt.x, ey: tgt.y - 140, t: 0, dur: 0.24,
              });
              await wait(230 / this.speed);
            } else {
              b.emit('attack', { u: src, target: tgt });
              await wait(150 / this.speed);
            }
            if (this.dead || here !== this.epoch) return;
          }
          if (tgt) {
            const dedi = this.curHits <= 1 ? HERO_FX[this.casterHid]?.impact?.[this.casterIdx] : undefined;
            if (dedi) b.emit('fx', { type: dedi as FxType, x: tgt.x, y: tgt.y });
            // L'ULTI insiste : onde de choc supplémentaire + retombées de braises.
            if (dedi === 'kael_slam') {
              await wait(90 / this.speed);
              b.emit('fx', { type: 'charge_aura', u: tgt, x: tgt.x, y: tgt.y });
              await wait(110 / this.speed);
              b.emit('fx', { type: 'arc_flurry', u: src ?? undefined, target: tgt });
            }
            b.emit('fx', {
              type: e.kind === 'magic' ? 'magic_nova' : this.curHits >= 2 ? 'arc_flurry' : 'arc_slash',
              u: src ?? undefined, target: tgt,
            });
          }
          if (tgt) b.emit('damage', { target: tgt, source: src ?? null, amount: e.amount, crit: e.crit, absorbed: 0, kind: e.kind, cls: 1 });
          await wait((e.amount === 0 ? 130 : 200) / this.speed);
          break;
        }
        case 'heal': {
          const tgt = b.view(e.tgt);
          const src = b.view(e.src);
          b.syncAll();
          if (tgt) b.emit('fx', { type: 'heal_circle', u: src ?? tgt, target: tgt });
          if (tgt) b.emit('heal', { target: tgt, amount: e.amount, source: src ?? tgt });
          await wait(190 / this.speed);
          break;
        }
        case 'shield':
          b.syncAll();
          await wait(70 / this.speed);
          break;
        case 'status': {
          b.syncAll();
          const tgt = b.view(e.tgt);
          if (tgt && e.applied) {
            const malin = ['poison', 'burn', 'bleed', 'atkDown', 'defDown', 'slow', 'stun', 'freeze'].includes(e.id);
            b.emit('fx', { type: malin ? 'debuff_fall' : 'buff_rise', u: tgt, target: tgt });
            if (e.id === 'stun' || e.id === 'freeze') b.emit('fx', { type: e.id, u: tgt });
          }
          await wait(90 / this.speed);
          break;
        }
        case 'dot': {
          const tgt = b.view(e.tgt);
          b.syncAll();
          if (tgt) b.emit('damage', { target: tgt, source: null, amount: e.amount, crit: false, absorbed: 0, kind: 'magic', cls: 1 });
          await wait(170 / this.speed);
          break;
        }
        case 'death': {
          const u = b.view(e.uid);
          b.syncAll();
          if (u) b.emit('death', u);
          await wait(260 / this.speed);
          break;
        }
        case 'skip':
          await wait(220 / this.speed);
          break;
        case 'soul':
          this.ui.state();
          break;
        case 'move':
        case 'end':
          break;
      }
    }
    if (here === this.epoch && !this.dead) { b.syncAll(); this.ui.state(); }
  }
}
