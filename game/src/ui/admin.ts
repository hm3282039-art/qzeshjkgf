/**
 * PANNEAU D'ADMINISTRATION — complet, mais invisible par défaut.
 *
 * Il ne s'ouvre QUE si l'adresse contient `?admin` :
 *
 *     https://hm3282039-art.github.io/qzeshjkgf/?admin
 *
 * Sans ce paramètre, ce module ne fait rien du tout.
 *
 * Onglets : Joueur · Héros · Progression · Système.
 * Tout agit immédiatement sur la sauvegarde (pas de bouton "appliquer").
 */
import { HEROES, STAGES } from '../data/heroes';
import { GUILDS } from '../data/guilds';
import { store } from '../state/store';
import { icon } from './icons';

const CSS = `
.adm { position: fixed; right: 1rem; bottom: 1rem; z-index: 950; width: 30rem; max-width: calc(100vw - 2rem);
  border-radius: .8rem; background: linear-gradient(180deg, rgba(20,14,32,.985), rgba(6,4,12,.995));
  border: 1px solid rgba(227,192,119,.5); color: #f2ecff; font-family: var(--font-body);
  box-shadow: 0 1.4rem 3rem rgba(0,0,0,.75), 0 0 2.4rem rgba(227,192,119,.16); overflow: hidden; }
.adm header { display: flex; align-items: center; gap: .5rem; padding: .55rem .7rem;
  background: linear-gradient(90deg, rgba(227,192,119,.18), transparent); border-bottom: 1px solid rgba(227,192,119,.25); }
.adm header b { flex: 1; font-family: var(--font-title); font-size: .72rem; letter-spacing: .26em; color: #e3c077; }
.adm header .adm-live { font-size: .58rem; color: #8ff0b4; letter-spacing: .1em; }
.adm header button { width: 1.45rem; height: 1.45rem; border-radius: 50%; background: #ffffff14; color: #fff; }
.adm header button:hover { background: #c2183c; }
.adm-tabs { display: flex; gap: .25rem; padding: .45rem .55rem 0; }
.adm-tab { flex: 1; padding: .35rem .2rem; font-size: .62rem; font-weight: 800; letter-spacing: .1em; text-transform: uppercase;
  color: #a99cc4; border-bottom: 2px solid transparent; }
.adm-tab.on { color: #ffe9b0; border-color: #e3c077; }
.adm-body { padding: .6rem .7rem .8rem; max-height: 62vh; overflow-y: auto; }
.adm-sec { margin-bottom: .55rem; }
.adm-sec > span { display: block; font-size: .56rem; letter-spacing: .2em; text-transform: uppercase; color: #8a7aa8; margin-bottom: .25rem; }
.adm-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: .3rem; }
.adm-grid button { display: flex; flex-direction: column; align-items: center; gap: .12rem; padding: .38rem .15rem;
  border-radius: .4rem; border: 1px solid rgba(227,192,119,.22); background: linear-gradient(180deg,#ffffff10,#00000038);
  color: #fff3e0; font-size: .58rem; font-weight: 700; transition: .14s; }
.adm-grid button:hover { border-color: #e3c077; background: rgba(227,192,119,.16); transform: translateY(-1px); }
.adm-grid button .ico { width: .9rem; height: .9rem; }
.adm-grid button.danger { border-color: #7a2a3a; color: #ffb4c2; }
.adm-grid button.danger:hover { background: rgba(255,59,92,.18); border-color: #ff3b5c; }
.adm-stat { display: grid; grid-template-columns: repeat(3, 1fr); gap: .3rem; margin-bottom: .5rem; }
.adm-stat div { padding: .3rem .4rem; border-radius: .35rem; background: #120c1e; border: 1px solid #2a2140; }
.adm-stat small { display: block; font-size: .5rem; color: #8a7aa8; text-transform: uppercase; letter-spacing: .1em; }
.adm-stat b { font-size: .74rem; color: #ffe9b0; }
.adm-heroes { display: grid; grid-template-columns: repeat(3, 1fr); gap: .25rem; max-height: 12rem; overflow-y: auto; }
.adm-h { display: flex; align-items: center; gap: .3rem; padding: .2rem .3rem; border-radius: .3rem; background: #120c1e; border: 1px solid #241a38; font-size: .56rem; }
.adm-h i { width: .4rem; height: .4rem; border-radius: 50%; background: #3a3050; }
.adm-h.own i { background: #56e08a; box-shadow: 0 0 6px #56e08a; }
.adm-h b { font-weight: 700; color: #ddd2f2; }
.adm-note { margin-top: .4rem; font-size: .54rem; color: #7a6f96; line-height: 1.35; }
.adm textarea { width: 100%; height: 5rem; margin-top: .3rem; padding: .3rem; border-radius: .35rem; background: #0a0714;
  border: 1px solid #2a2140; color: #b9aed2; font-family: ui-monospace, monospace; font-size: .55rem; resize: vertical; }
`;

type Pane = 'player' | 'heroes' | 'progress' | 'system';

export function installAdmin(): void {
  if (!new URLSearchParams(window.location.search).has('admin')) return;

  const style = document.createElement('style');
  style.textContent = CSS;
  document.head.appendChild(style);

  const panel = document.createElement('div');
  panel.className = 'adm';
  document.body.appendChild(panel);

  let pane: Pane = 'player';

  const fmt = (n: number): string => n.toLocaleString('fr-FR');

  const stats = (): string => `
    <div class="adm-stat">
      <div><small>Or</small><b>${fmt(store.player.gold)}</b></div>
      <div><small>Gemmes</small><b>${fmt(store.player.gems)}</b></div>
      <div><small>Énergie</small><b>${store.player.energy}/${store.player.energyMax}</b></div>
      <div><small>Compte</small><b>Niv. ${store.player.level}</b></div>
      <div><small>Puissance</small><b>${fmt(store.player.power)}</b></div>
      <div><small>Campagne</small><b>${store.campaignDone()}/${STAGES.length}</b></div>
    </div>`;

  const heroList = (): string => `
    <div class="adm-heroes">${HEROES.map((h) => {
      const own = store.owns(h.id);
      return `<div class="adm-h${own ? ' own' : ''}"><i></i><b>${h.name}</b><span>${own ? `${store.starsOf(h)}★${store.redOf(h) ? '+' + store.redOf(h) + '✦' : ''}` : '—'}</span></div>`;
    }).join('')}</div>`;

  const render = (): void => {
    const body = pane === 'player'
      ? `${stats()}
        <div class="adm-sec"><span>Or</span><div class="adm-grid">
          <button data-gold="10000">${icon('coin')}+10 k</button>
          <button data-gold="500000">${icon('coin')}+500 k</button>
          <button data-gold="9999999">${icon('coin')}+10 M</button>
          <button data-gold="0">${icon('coin')}Or = 0</button>
        </div></div>
        <div class="adm-sec"><span>Gemmes</span><div class="adm-grid">
          <button data-gems="1000">${icon('gem')}+1 000</button>
          <button data-gems="50000">${icon('gem')}+50 k</button>
          <button data-gems="999999">${icon('gem')}+1 M</button>
          <button data-gems="0">${icon('gem')}Gemmes = 0</button>
        </div></div>
        <div class="adm-sec"><span>Compte</span><div class="adm-grid">
          <button data-lvl="1">${icon('star')}+1 niv.</button>
          <button data-lvl="5">${icon('star')}+5 niv.</button>
          <button data-lvl="25">${icon('star')}+25 niv.</button>
          <button data-energy>${icon('bolt')}Énergie max</button>
        </div></div>`
      : pane === 'heroes'
      ? `${heroList()}
        <div class="adm-sec" style="margin-top:.5rem"><span>Collection</span><div class="adm-grid">
          <button data-d="give">Tous les héros</button>
          <button data-d="max">Tout à 5★ + ✦</button>
          <button data-d="dupes">+10 doublons</button>
          <button data-d="levels">+10 niveaux</button>
          <button data-d="gear">4 reliques mythiques</button>
          <button data-d="resetstars">Remettre 3★</button>
          <button data-d="allmax">Tout au maximum</button>
          <button data-d="summon">+100 invocations</button>
        </div></div>`
      : pane === 'progress'
      ? `${stats()}
        <div class="adm-sec"><span>Campagne (${STAGES.length} niveaux)</span><div class="adm-grid">
          <button data-p="unlock">Tout débloquer</button>
          <button data-p="unlock50">Jusqu'au ch. 10</button>
          <button data-p="unlock75">Jusqu'au ch. 15</button>
          <button data-p="clearcamp">Effacer la campagne</button>
        </div></div>
        <div class="adm-sec"><span>Tour</span><div class="adm-grid">
          <button data-t="5">+5 étages</button>
          <button data-t="20">+20 étages</button>
          <button data-t="50">+50 étages</button>
          <button data-t="1">Étage 1</button>
        </div></div>
        <div class="adm-sec"><span>Guilde</span><div class="adm-grid">
          <button data-guild="0">Rejoindre la 1re</button>
          <button data-guild="5">Rejoindre la 6e</button>
          <button data-guild="11">Rejoindre la 12e</button>
          <button data-guild="-1" class="danger">Quitter</button>
        </div></div>
        <div class="adm-note">Guilde actuelle : ${store.guild ? GUILDS.find((g) => g.id === store.guild)?.name ?? store.guild : 'aucune'}</div>`
      : `<div class="adm-sec"><span>Sauvegarde</span><div class="adm-grid">
          <button data-s="export">Exporter</button>
          <button data-s="copy">Copier</button>
          <button data-s="resetframe">Cadre max</button>
          <button data-s="reset" class="danger">Tout effacer</button>
        </div>
        <textarea readonly data-out placeholder="La sauvegarde s'affiche ici après « Exporter »."></textarea>
        <div class="adm-note">« Tout effacer » remet le joueur à zéro (or, gemmes, héros, campagne, guilde). Irréversible.</div>`;

    panel.innerHTML = `
      <header><b>ADMINISTRATION</b><span class="adm-live">${pane.toUpperCase()}</span><button data-x title="Fermer">×</button></header>
      <div class="adm-tabs">
        ${(['player', 'heroes', 'progress', 'system'] as Pane[]).map((p) => `<button class="adm-tab${p === pane ? ' on' : ''}" data-pane="${p}">${p === 'player' ? 'Joueur' : p === 'heroes' ? 'Héros' : p === 'progress' ? 'Progression' : 'Système'}</button>`).join('')}
      </div>
      <div class="adm-body">${body}</div>`;
  };

  panel.addEventListener('click', (e) => {
    const btn = (e.target as HTMLElement).closest<HTMLElement>('button');
    if (!btn) return;
    if (btn.dataset.x !== undefined) { panel.remove(); return; }
    if (btn.dataset.pane) { pane = btn.dataset.pane as Pane; render(); return; }

    const p = store.player;
    if (btn.dataset.gold) store.updatePlayer({ gold: Number(btn.dataset.gold) ? p.gold + Number(btn.dataset.gold) : 0 });
    if (btn.dataset.gems) store.updatePlayer({ gems: Number(btn.dataset.gems) ? p.gems + Number(btn.dataset.gems) : 0 });
    if (btn.dataset.lvl) store.updatePlayer({ level: p.level + Number(btn.dataset.lvl) });
    if (btn.dataset.energy !== undefined) store.updatePlayer({ energy: p.energyMax });

    switch (btn.dataset.d) {
      case 'give': store.devGiveAll(); break;
      case 'max': store.devMaxStars(); break;
      case 'dupes': store.devDupes(10); break;
      case 'levels': store.devLevels(10); break;
      case 'gear': store.devGear(); break;
      case 'allmax': store.devGiveAll(); store.devMaxStars(); store.devLevels(50); store.devDupes(20); break;
      case 'resetstars': store.devResetStars(); break;
      case 'summon': store.updatePlayer({ gems: p.gems + 15000 }); break;
      default: break;
    }

    switch (btn.dataset.p) {
      case 'unlock': store.devUnlockAll(); break;
      case 'unlock50': store.devUnlockUpTo(10); break;
      case 'unlock75': store.devUnlockUpTo(15); break;
      case 'clearcamp': store.devClearCampaign(); break;
      default: break;
    }
    if (btn.dataset.t) store.devTower(btn.dataset.t === '1' ? 1 : store.towerFloor + Number(btn.dataset.t));
    if (btn.dataset.guild !== undefined) {
      const i = Number(btn.dataset.guild);
      if (i < 0) store.leaveGuild(); else store.joinGuild(GUILDS[i]!.id);
    }
    if (btn.dataset.s === 'export' || btn.dataset.s === 'copy') {
      const raw = localStorage.getItem('legendes-tour-infinie/save') ?? '{}';
      const ta = panel.querySelector('textarea')!;
      ta.value = raw;
      ta.select();
      if (btn.dataset.s === 'copy') void navigator.clipboard?.writeText(raw).catch(() => undefined);
    }
    if (btn.dataset.s === 'resetframe') store.setFrame('mythe');
    if (btn.dataset.s === 'reset') store.reset();
    render();
  });

  render();
}
