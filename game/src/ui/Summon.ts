import { ART, PORTRAITS } from '../assets';
import { audio } from '../audio/AudioEngine';
import { HEROES, type HeroDef, type Rarity } from '../data/heroes';
import { COST, ITEMS, PITY, RATES, SUMMON_POOL, type PullResult } from '../data/summon';
import { store } from '../state/store';
import { icon } from './icons';
import { starsHTML } from './stars';
import type { UI } from './UI';

const fmt = (n: number): string => n.toLocaleString('fr-FR');
const pct = (x: number): string => `${(x * 100).toLocaleString('fr-FR', { maximumFractionDigits: 2 })} %`;
const RANK: Record<Rarity, number> = { R: 0, SR: 1, SSR: 2 };
const RCOLOR: Record<Rarity, string> = { R: '#6ab8ff', SR: '#b77aff', SSR: '#ffd84a' };

/** Cercle runique de l'autel (SVG inline, aucune ressource externe). */
const RUNE_CIRCLE = `<svg viewBox="-100 -100 200 200" class="rune-svg" aria-hidden="true">
  <g class="r1"><circle r="92" /><circle r="84" />${Array.from({ length: 24 }, (_, i) => {
    const a = (i / 24) * Math.PI * 2;
    return `<path d="M${(Math.cos(a) * 86).toFixed(1)} ${(Math.sin(a) * 86).toFixed(1)} l${(Math.cos(a + 1.2) * 5).toFixed(1)} ${(Math.sin(a + 1.2) * 5).toFixed(1)}"/>`;
  }).join('')}</g>
  <g class="r2"><circle r="70" /><path d="${Array.from({ length: 7 }, (_, i) => {
    const a = (i * 3 / 7) * Math.PI * 2 - Math.PI / 2;
    return `${i ? 'L' : 'M'}${(Math.cos(a) * 70).toFixed(1)} ${(Math.sin(a) * 70).toFixed(1)}`;
  }).join(' ')}Z"/></g>
  <g class="r3"><circle r="44" /><circle r="38" stroke-dasharray="4 6" /></g>
</svg>`;

/**
 * Autel d'invocation : bannière, taux affichés, compteur de garantie,
 * puis grande séquence d'invocation (cercle runique, révélation des cartes, présentation des nouveaux héros).
 */
export class SummonScreen {
  private busy = false;

  constructor(private readonly ui: UI) {}

  open(): void {
    const pityLeft = PITY - store.pity;
    const gems = store.player.gems;
    const poolRow = (r: 'SSR' | 'SR') => SUMMON_POOL[r].map((h) => {
      const owned = store.owns(h.id);
      return `<div class="sm-ph ${owned ? '' : 'missing'}" style="--c:${h.css}" title="${h.name}">
        <img src="${PORTRAITS[h.id]}" alt=""/>${owned ? starsHTML(store.starsOf(h), 'mini') : '<em>NOUVEAU</em>'}</div>`;
    }).join('');
    const each = (r: 'SSR' | 'SR') => RATES[r] / SUMMON_POOL[r].length;
    const modal = this.ui.openModal(`
      <div class="modal-medal">${icon('crystal')}</div>
      <h2>Autel d’invocation</h2>
      <div class="subtitle">Les âmes des héros tombés répondent à l’appel des gemmes</div>
      <div class="sm">
        <div class="sm-banner">
          <div class="sm-bg"></div>
          <div class="sm-rune">${RUNE_CIRCLE}</div>
          <img class="sm-feat side l" src="${ART.hero_kael}" alt="" draggable="false"/>
          <img class="sm-feat side r" src="${ART.hero_thorne}" alt="" draggable="false"/>
          <img class="sm-feat main" src="${ART.hero_nyx}" alt="" draggable="false"/>
          <div class="sm-title">
            <small>Bannière permanente</small>
            <b>Éclipse Naissante</b>
            <em><span class="hd-rar SSR">SSR</span> Nyx, l’Impératrice du Néant</em>
          </div>
          <div class="sm-newtag">${icon('star')} Nouveaux héros : Nyx · Thorne · Ashka</div>
        </div>
        <div class="sm-side">
          <div class="sm-box sm-pity">
            <div class="sm-pity-head">${icon('crown')} SSR garanti dans <b>${pityLeft}</b> invocation${pityLeft > 1 ? 's' : ''}</div>
            <div class="sm-pity-bar"><i style="width:${(store.pity / PITY) * 100}%"></i></div>
            <small>L’invocation ×10 garantit au moins un héros SR ou mieux.</small>
          </div>
          <div class="sm-box">
            <div class="sm-sec">Taux d’apparition</div>
            <div class="sm-rate"><span class="hd-rar SSR">SSR</span><b>${pct(RATES.SSR)}</b><small>${pct(each('SSR'))} par héros</small></div>
            <div class="sm-pool">${poolRow('SSR')}</div>
            <div class="sm-rate"><span class="hd-rar SR">SR</span><b>${pct(RATES.SR)}</b><small>${pct(each('SR'))} par héros</small></div>
            <div class="sm-pool">${poolRow('SR')}</div>
            <div class="sm-rate"><span class="hd-rar R">R</span><b>${pct(RATES.R)}</b><small>${ITEMS.gold.name} · ${ITEMS.elixir.name}</small></div>
            <p class="sm-dupe">${icon('star')} Un héros déjà possédé gagne <b>+1 étoile</b> (+10 % PV et ATQ), jusqu’à 10 étoiles.</p>
          </div>
        </div>
        <div class="sm-actions">
          <div class="sm-gems">${icon('gem')} <b>${fmt(gems)}</b> gemmes · ${fmt(store.summons)} invocation${store.summons > 1 ? 's' : ''} au total</div>
          <button class="btn sm-btn ${gems < COST.one ? 'poor' : ''}" data-pull="1">Invoquer ×1 <small>${icon('gem')} ${COST.one}</small></button>
          <button class="btn sm-btn ten ${gems < COST.ten ? 'poor' : ''}" data-pull="10">Invoquer ×10 <small>${icon('gem')} ${fmt(COST.ten)}</small><em>−10 %</em></button>
        </div>
      </div>`, '#b77affaa', 'xl');
    modal.querySelectorAll<HTMLElement>('[data-pull]').forEach((b) => b.addEventListener('click', () => this.pull(Number(b.dataset.pull) as 1 | 10)));
  }

  private pull(count: 1 | 10): void {
    if (this.busy) return;
    const results = store.summon(count);
    if (!results) {
      audio.play('block', { vol: 0.6 });
      this.ui.toast('Pas assez de gemmes — termine des niveaux de campagne pour en gagner !');
      return;
    }
    this.busy = true;
    this.ui.closeModal(true);
    this.play(results, count);
  }

  /* ======================= Séquence d'invocation ======================= */

  private play(results: PullResult[], count: 1 | 10): void {
    const best = results.reduce<Rarity>((m, r) => (RANK[r.rarity] > RANK[m] ? r.rarity : m), 'R');
    const fx = document.createElement('div');
    fx.className = `summon-fx best-${best}`;
    fx.style.setProperty('--bc', RCOLOR[best]);
    const motes = Array.from({ length: 36 }, (_, i) => {
      const a = (i / 36) * Math.PI * 2 + Math.random() * 0.3;
      const d = 30 + Math.random() * 25;
      return `<i style="--x:${(Math.cos(a) * d).toFixed(1)}rem;--y:${(Math.sin(a) * d * 0.7).toFixed(1)}rem;--d:${(Math.random() * 1.1).toFixed(2)}s"></i>`;
    }).join('');
    fx.innerHTML = `
      <div class="sf-bg"></div>
      <div class="sf-stage">
        <div class="sf-circle">${RUNE_CIRCLE}</div>
        <div class="sf-motes">${motes}</div>
        <div class="sf-orb"></div>
        <div class="sf-pillar"></div>
      </div>
      <div class="sf-flash"></div>
      <div class="sf-skip">Clique pour passer</div>`;
    this.ui.root.appendChild(fx);
    audio.play('riser', { vol: 0.9 });
    audio.play('summon', { delay: 0.15, rate: 0.8 });
    audio.duck(0.5, 0.3, 2.5);
    const timers: number[] = [];
    const later = (ms: number, fn: () => void) => timers.push(window.setTimeout(fn, ms));
    // Le cercle change de couleur pour annoncer la rareté (violet → or pour un SSR !)
    if (best !== 'R') later(1050, () => { fx.classList.add('tease'); audio.play(best === 'SSR' ? 'choir' : 'light_cast', { vol: best === 'SSR' ? 0.8 : 0.6, rate: best === 'SSR' ? 1 : 0.8 }); });
    later(1650, () => audio.play('braam', { vol: 0.9 }));
    let revealed = false;
    const reveal = () => {
      if (revealed) return;
      revealed = true;
      timers.forEach(clearTimeout);
      fx.classList.add('flash');
      audio.play('ult_impact', { vol: 0.7, rate: 1.1 });
      window.setTimeout(() => this.showCards(fx, results, count), 260);
    };
    later(1900, reveal);
    fx.addEventListener('click', reveal, { once: true });
  }

  private showCards(fx: HTMLElement, results: PullResult[], count: 1 | 10): void {
    fx.classList.add('cards');
    const cards = results.map((r, i) => {
      const front = r.kind === 'hero'
        ? `<img src="${PORTRAITS[r.hero.id]}" alt=""/>
           <div class="scf-name">${r.hero.name}</div>
           ${starsHTML(r.stars, 'mini')}
           ${r.isNew ? '<em class="sc-tag new">NOUVEAU</em>' : r.refundGold ? `<em class="sc-tag">+${fmt(r.refundGold)} or</em>` : '<em class="sc-tag up">+1 ★</em>'}`
        : `<div class="sc-item ${r.item}">${icon(r.item === 'gold' ? 'coin' : 'drop')}</div>
           <div class="scf-name">${ITEMS[r.item].name}</div><small>${ITEMS[r.item].text}</small>`;
      const c = r.kind === 'hero' ? r.hero.css : r.item === 'gold' ? '#ffd27a' : '#7affc0';
      return `<div class="sc ${r.rarity} ${count === 1 ? 'solo' : ''}" style="--i:${i};--c:${c}">
        <div class="sc-in">
          <div class="sc-back">${icon('crystal')}</div>
          <div class="sc-front"><span class="hd-rar ${r.rarity}">${r.rarity}</span>${front}</div>
        </div>
        <div class="sc-burst"></div>
      </div>`;
    }).join('');
    const again = count === 10 ? COST.ten : COST.one;
    fx.innerHTML = `
      <div class="sf-bg"></div>
      <div class="sf-results">
        <h3>Résultat de l’invocation</h3>
        <div class="sc-grid n${count}">${cards}</div>
        <div class="sf-btns">
          <button class="btn dark" data-sf="back">${icon('back')} Retour à l’autel</button>
          <button class="btn" data-sf="again">Encore ×${count} <small>${icon('gem')} ${fmt(again)}</small></button>
        </div>
        <div class="sf-gems">${icon('gem')} ${fmt(store.player.gems)} gemmes restantes</div>
      </div>
      <div class="sf-show"></div>`;
    // Chaque carte se retourne avec un son qui dépend de sa rareté
    const step = count === 1 ? 0 : 140;
    results.forEach((r, i) => {
      const t = 250 + i * step;
      audio.play('blink', { delay: t / 1000, vol: 0.35, rate: 1.4 });
      if (r.rarity === 'SSR') { audio.play('crit', { delay: t / 1000 + 0.05, vol: 0.9 }); audio.play('star', { delay: t / 1000 + 0.1, rate: 0.8 }); }
      else if (r.rarity === 'SR') audio.play('star', { delay: t / 1000 + 0.05, rate: 1.1, vol: 0.8 });
      else audio.play('coins', { delay: t / 1000 + 0.05, vol: 0.25, rate: 1.2 });
    });
    const news = results.filter((r): r is Extract<PullResult, { kind: 'hero' }> => r.kind === 'hero' && r.isNew)
      .sort((a, b) => RANK[b.rarity] - RANK[a.rarity]);
    const unique = news.filter((r, i) => news.findIndex((x) => x.hero.id === r.hero.id) === i);
    const done = 250 + results.length * step + 700;
    window.setTimeout(() => this.showcase(fx, unique.map((n) => n.hero)), done);

    fx.querySelector('[data-sf="back"]')?.addEventListener('click', () => { audio.click(); this.close(fx); this.open(); });
    fx.querySelector('[data-sf="again"]')?.addEventListener('click', () => {
      audio.click();
      const res = store.summon(count);
      if (!res) { this.ui.toast('Pas assez de gemmes'); return; }
      fx.remove();
      this.play(res, count);
    });
  }

  /** Présentation plein écran d'un nouveau héros (façon « nouveau personnage obtenu »). */
  private showcase(fx: HTMLElement, heroes: HeroDef[]): void {
    const box = fx.querySelector<HTMLElement>('.sf-show');
    if (!box || !heroes.length || !fx.isConnected) return;
    const [h, ...rest] = heroes as [HeroDef, ...HeroDef[]];
    box.style.setProperty('--c', h.css);
    box.innerHTML = `
      <div class="ss-rays"></div>
      <img class="ss-art" src="${ART[h.texture]}" alt="" draggable="false"/>
      <div class="ss-info">
        <div class="ss-new">Nouveau héros !</div>
        <span class="hd-rar ${h.rarity}">${h.rarity}</span>
        <h2>${h.name}</h2>
        <div class="ss-title">${h.title}</div>
        ${starsHTML(store.starsOf(h))}
        <p>${h.quote}</p>
        <small>Clique pour continuer</small>
      </div>`;
    box.classList.remove('show');
    void box.offsetWidth;
    box.classList.add('show');
    audio.play('cutin');
    audio.play(h.rarity === 'SSR' ? 'ult_impact' : 'braam', { delay: 0.1, vol: 0.8 });
    if (h.rarity === 'SSR') audio.play('choir', { delay: 0.2, vol: 0.6 });
    const next = () => {
      box.classList.remove('show');
      if (rest.length) window.setTimeout(() => this.showcase(fx, rest), 250);
    };
    box.addEventListener('click', next, { once: true });
  }

  private close(fx: HTMLElement): void {
    this.busy = false;
    fx.classList.add('out');
    window.setTimeout(() => fx.remove(), 300);
  }
}

/** Nombre de héros de la collection (pour les sous-titres). */
export const collectionText = (): string => `${HEROES.filter((h) => store.owns(h.id)).length} / ${HEROES.length} héros`;
