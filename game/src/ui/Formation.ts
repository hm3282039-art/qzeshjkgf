import { ART, PORTRAITS, SCENE_BG } from '../assets';
import { audio } from '../audio/AudioEngine';
import { formationSlots, HEROES, heroById, heroPower, isMelee, teamPower, type StageDef } from '../data/heroes';
import { store } from '../state/store';
import { icon } from './icons';
import { starsHTML } from './stars';
import type { UI } from './UI';
import { ROLE_ICON } from './roles';

const fmt = (n: number): string => n.toLocaleString('fr-FR');
/** Le terrain de combat (repère 1920×1080) affiché dans l'aperçu : x 0…1920, y 560…960. */
const VIEW = { x0: 0, x1: 1920, y0: 520, y1: 960 };

/**
 * Préparation du combat : choix des 5 héros (ordre libre), aperçu du placement sur le terrain
 * face aux ennemis du niveau, puissance de l'équipe comparée à la puissance conseillée.
 */
export class FormationScreen {
  constructor(private readonly ui: UI) {}

  open(stage: StageDef, onStart: () => void): void {
    let team = [...store.teamIds];
    const modal = this.ui.openModal(`
      <div class="modal-medal">${icon('swords')}</div>
      <h2>Préparer l’équipe</h2>
      <div class="subtitle">${stage.id} · ${stage.name} — choisis jusqu’à 5 héros</div>
      <div class="fm">
        <div class="fm-field" style="--bg:url('${SCENE_BG[stage.scene]}')"><div class="fm-units"></div><div class="fm-vs">VS</div></div>
        <div class="fm-bar">
          <div class="fm-slots"></div>
          <div class="fm-power"></div>
        </div>
        <div class="fm-roster"></div>
        <div class="fm-foot">
          <button class="btn dark" data-fm="auto">${icon('refresh')} Équipe la plus puissante</button>
          <button class="btn big fight" data-fm="go">${icon('swords')} Combattre <small>${icon('bolt')} ${stage.energy}</small></button>
        </div>
      </div>`, '#c2183caa', 'xl');
    const field = modal.querySelector<HTMLElement>('.fm-units')!;
    const slots = modal.querySelector<HTMLElement>('.fm-slots')!;
    const roster = modal.querySelector<HTMLElement>('.fm-roster')!;
    const powerEl = modal.querySelector<HTMLElement>('.fm-power')!;

    const owned = HEROES.filter((h) => store.owns(h.id));
    const pos = (x: number, y: number) => ({ l: ((x - VIEW.x0) / (VIEW.x1 - VIEW.x0)) * 100, t: ((y - VIEW.y0) / (VIEW.y1 - VIEW.y0)) * 100 });
    const depth = (y: number) => 0.86 + ((y - 690) / 210) * 0.22;

    const render = () => {
      const defs = team.map((id) => heroById(id)!).filter(Boolean);
      const places = formationSlots(defs);
      // Aperçu du terrain : héros à gauche à leur vraie position de départ, ennemis à droite
      const unit = (art: string, x: number, y: number, h: number, extra: string, attrs = '') => {
        const p = pos(x, y);
        return `<div class="fm-u ${extra}" style="left:${p.l}%;top:${p.t}%;--h:${(h * depth(y) / (VIEW.y1 - VIEW.y0)) * 100}%;z-index:${Math.round(y)}" ${attrs}><img src="${art}" alt="" draggable="false"/></div>`;
      };
      field.innerHTML = [
        ...defs.map((d, i) => unit(ART[d.texture], places[i]![0], places[i]![1], d.height, 'hero', `data-rm="${d.id}" title="Retirer ${d.name}" style-c="${d.css}"`)),
        ...stage.enemies.map((e) => unit(ART[e.def.texture], e.x, e.y, e.def.height, e.boss ? 'foe boss' : 'foe', `title="${e.def.name}"`)),
      ].join('');
      slots.innerHTML = Array.from({ length: 5 }, (_, i) => {
        const h = defs[i];
        if (!h) return `<div class="fm-slot empty"><span>${icon('plus')}</span><small>Vide</small></div>`;
        return `<button class="fm-slot" data-rm="${h.id}" style="--c:${h.css}" title="Retirer">
          <img src="${PORTRAITS[h.id]}" alt=""/><b>${h.name.replace('Frère ', '')}</b>
          <small>${isMelee(h) ? 'Avant' : 'Arrière'}</small><i class="fm-x">${icon('close')}</i></button>`;
      }).join('');
      const power = teamPower(defs.map((d) => ({ def: d, stars: store.starsOf(d), level: store.levelOf(d) })));
      powerEl.innerHTML = `${icon('swords')} <b class="${power >= stage.power ? 'ok' : 'low'}">${fmt(power)}</b><small>conseillé ${fmt(stage.power)}</small>`;
      roster.innerHTML = owned.map((h) => {
        const k = team.indexOf(h.id);
        return `<button class="fm-card ${k >= 0 ? 'on' : ''}" data-pick="${h.id}" style="--c:${h.css}">
          <img src="${PORTRAITS[h.id]}" alt="" draggable="false"/>
          <span class="hl-rar ${h.rarity}">${h.rarity}</span>
          ${k >= 0 ? `<span class="fm-num">${k + 1}</span>` : ''}
          <div class="fm-cname">${icon(ROLE_ICON[h.role])}${h.name.replace('Frère ', '')}</div>
          ${starsHTML(store.starsOf(h), 'mini')}
          <small>${fmt(heroPower(h, store.starsOf(h)))}</small>
        </button>`;
      }).join('') + (owned.length < HEROES.length ? `<button class="fm-card more" data-fm="summon">${icon('crystal')}<div class="fm-cname">+${HEROES.length - owned.length} à invoquer</div><small>Autel</small></button>` : '');
      field.querySelectorAll<HTMLElement>('.fm-u.hero').forEach((el) => el.style.setProperty('--c', el.getAttribute('style-c') ?? '#fff'));
    };

    modal.addEventListener('click', (e) => {
      const t = e.target as HTMLElement;
      const rm = t.closest<HTMLElement>('[data-rm]')?.dataset.rm;
      const pick = t.closest<HTMLElement>('[data-pick]')?.dataset.pick;
      const act = t.closest<HTMLElement>('[data-fm]')?.dataset.fm;
      if (rm) {
        if (team.length <= 1) { this.ui.toast('Il faut au moins un héros'); return; }
        team = team.filter((x) => x !== rm);
        audio.play('ui_close', { vol: 0.6 });
        render();
      } else if (pick) {
        if (team.includes(pick)) {
          if (team.length <= 1) { this.ui.toast('Il faut au moins un héros'); return; }
          team = team.filter((x) => x !== pick);
          audio.play('ui_close', { vol: 0.6 });
        } else {
          if (team.length >= 5) { this.ui.toast('Équipe complète : retire d’abord un héros'); return; }
          team.push(pick);
          audio.play('ui_confirm', { vol: 0.7 });
        }
        render();
      } else if (act === 'auto') {
        audio.click();
        team = [...owned].sort((a, b) => heroPower(b, store.starsOf(b)) - heroPower(a, store.starsOf(a))).slice(0, 5).map((h) => h.id);
        // Garde au moins un combattant au corps à corps devant si possible
        const ids = new Set(team);
        if (!team.some((id) => isMelee(heroById(id)!))) {
          const tank = owned.filter((h) => isMelee(h)).sort((a, b) => b.stats.armor - a.stats.armor)[0];
          if (tank && !ids.has(tank.id)) team[team.length - 1] = tank.id;
        }
        render();
      } else if (act === 'summon') {
        store.setTeam(team);
        this.ui.openSummon();
      } else if (act === 'go') {
        audio.click();
        if (store.player.energy < stage.energy) { this.ui.toast('Pas assez d’énergie'); return; }
        store.setTeam(team);
        this.ui.closeModal();
        onStart();
      }
    });
    render();
  }
}

