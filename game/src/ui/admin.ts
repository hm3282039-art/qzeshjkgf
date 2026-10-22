/**
 * Panneau d'administration — PRÉPARÉ, MAIS DÉSACTIVÉ.
 *
 * Il ne s'affiche JAMAIS tout seul. Pour l'ouvrir, il faut ajouter `?admin`
 * à la fin de l'adresse :
 *
 *     https://hm3282039-art.github.io/qzeshjkgf/?admin
 *
 * Sans ce paramètre, ce fichier ne fait strictement rien : aucun bouton,
 * aucun accès, aucun risque qu'un joueur tombe dessus par hasard.
 */
import { store } from '../state/store';
import { icon } from './icons';

const STYLE = `
.adm {
  position: fixed; left: 1rem; bottom: 1rem; z-index: 900; width: 22rem;
  padding: 0.8rem; border-radius: 0.8rem;
  background: linear-gradient(180deg, rgba(22,16,36,.97), rgba(8,6,15,.98));
  border: 1px solid rgba(227,192,119,.45);
  box-shadow: 0 1rem 2.6rem rgba(0,0,0,.7), 0 0 2rem rgba(227,192,119,.14), inset 0 1px 0 rgba(255,255,255,.08);
  font-family: var(--font-body); color: #f4eeff;
}
.adm header { display: flex; align-items: center; justify-content: space-between; margin-bottom: .6rem; }
.adm header b { font-family: var(--font-title); font-size: .78rem; letter-spacing: .22em; color: #e3c077; }
.adm header button { width: 1.5rem; height: 1.5rem; border-radius: 50%; background: #ffffff14; color: #f4eeff; font-size: 1rem; line-height: 1; }
.adm header button:hover { background: #c2183c; }
.adm-row { display: grid; grid-template-columns: repeat(3, 1fr); gap: .35rem; margin-bottom: .35rem; }
.adm-row button {
  display: flex; flex-direction: column; align-items: center; gap: .2rem;
  padding: .45rem .2rem; border-radius: .45rem; font-size: .66rem; font-weight: 700;
  background: linear-gradient(180deg, #ffffff12, #00000040);
  border: 1px solid rgba(227,192,119,.25); color: #fff3e0;
  transition: border-color .15s, background .15s, transform .12s;
}
.adm-row button:hover { border-color: #e3c077; background: rgba(227,192,119,.16); transform: translateY(-1px); }
.adm-row .ico { width: 1rem; height: 1rem; }
.adm small { display: block; margin-top: .35rem; font-size: .6rem; color: #a99cc4; text-align: center; letter-spacing: .06em; }
`;

export function installAdmin(): void {
  const ask = new URLSearchParams(window.location.search);
  if (!ask.has('admin')) return;

  const style = document.createElement('style');
  style.textContent = STYLE;
  document.head.appendChild(style);

  const panel = document.createElement('div');
  panel.className = 'adm';
  panel.innerHTML = `
    <header><b>ADMINISTRATION</b><button data-x title="Fermer">×</button></header>
    <div class="adm-row">
      <button data-gold="1000">${icon('coin')}+1 000</button>
      <button data-gold="50000">${icon('coin')}+50 000</button>
      <button data-gold="1000000">${icon('coin')}+1 M</button>
    </div>
    <div class="adm-row">
      <button data-gems="100">${icon('gem')}+100</button>
      <button data-gems="5000">${icon('gem')}+5 000</button>
      <button data-gems="100000">${icon('gem')}+100 000</button>
    </div>
    <small>Ajout immédiat · sauvegarde automatique</small>`;
  document.body.appendChild(panel);

  panel.addEventListener('click', (e) => {
    const btn = (e.target as HTMLElement).closest<HTMLElement>('button');
    if (!btn) return;
    if (btn.dataset.x !== undefined) { panel.remove(); return; }
    if (btn.dataset.gold) store.updatePlayer({ gold: store.player.gold + Number(btn.dataset.gold) });
    if (btn.dataset.gems) store.updatePlayer({ gems: store.player.gems + Number(btn.dataset.gems) });
  });
}
