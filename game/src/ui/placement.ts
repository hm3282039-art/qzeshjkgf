/**
 * Écran de PLACEMENT avant un combat tour par tour : tes 5 héros sur les 6 emplacements
 * (2 DEVANT, 2 MILIEU, 2 DERRIÈRE). C'est un calque au-dessus de l'interface du jeu ;
 * le combat démarre derrière, dans la vraie scène de bataille.
 *
 * Le choix est enregistré dans la sauvegarde (`store.saveSlots`) : au combat suivant,
 * tu retrouves ton placement tel quel.
 */
import { PORTRAITS } from '../assets';
import type { TeamMember } from '../data/heroes';
import { ROW_BONUS, ROW_LABEL, type Row } from '../turn/types';
import { MAX_TEAM } from '../turn/formation';
import { icon } from './icons';
import './placement.css';

export interface PlacementHandle { close(): void; }

const SLOT_ROWS: Row[] = ['front', 'front', 'mid', 'mid', 'back', 'back'];
const ROLE_ROW: Record<string, Row> = {
  Tank: 'front', Guerrier: 'front', Mage: 'mid', Soutien: 'mid', Tireur: 'back', Assassin: 'back',
};

/**
 * Ouvre le calque de placement. `onDone` reçoit les 6 cases (une par emplacement,
 * `null` = laissée vide) quand le joueur lance le combat.
 */
export function openPlacement(
  host: HTMLElement,
  team: TeamMember[],
  initial: (TeamMember | null)[],
  onDone: (slots: (TeamMember | null)[]) => void,
): PlacementHandle {
  const slots: (TeamMember | null)[] = initial.slice(0, MAX_TEAM);
  while (slots.length < MAX_TEAM) slots.push(null);

  const root = document.createElement('div');
  root.className = 'plc';
  root.innerHTML = `
    <div class="plc-box panel ornate">
      <i class="corner tl"></i><i class="corner tr"></i><i class="corner bl"></i><i class="corner br"></i>
      <h2>${icon('swords')} Place ton équipe</h2>
      <p class="plc-sub">${team.length} héros pour ${MAX_TEAM} emplacements — tu décides lequel reste vide.
        La ligne change les chiffres : <b>${ROW_BONUS.front.text}</b> · <b>${ROW_BONUS.mid.text}</b> · <b>${ROW_BONUS.back.text}</b>.</p>
      <div class="plc-grid" data-grid></div>
      <div class="plc-list" data-list hidden></div>
      <div class="btn-row">
        <button class="btn dark" data-auto>${icon('refresh')} Placement auto</button>
        <button class="btn" data-go>${icon('swords')} Commencer le combat</button>
      </div>
    </div>`;
  host.appendChild(root);

  const grid = root.querySelector<HTMLElement>('[data-grid]')!;
  const list = root.querySelector<HTMLElement>('[data-list]')!;

  const render = (): void => {
    grid.innerHTML = SLOT_ROWS.map((row, i) => {
      const m = slots[i];
      return `<button class="plc-slot ${m ? '' : 'free'}" data-slot="${i}">
        <em class="plc-row">${ROW_LABEL[row]} · ${i % 2 === 0 ? '1' : '2'}</em>
        ${m
          ? `<img src="${PORTRAITS[m.def.id]}" alt="" draggable="false"/><b>${m.def.name}</b><span>niv. ${m.level} · ${m.def.role}</span>`
          : `${icon('plus')}<b>Libre</b><span>emplacement vide</span>`}
      </button>`;
    }).join('');
    grid.querySelectorAll('[data-slot]').forEach((el) => {
      el.addEventListener('click', () => openList(Number((el as HTMLElement).dataset.slot)));
    });
  };

  const openList = (idx: number): void => {
    const taken = new Map<string, number>();
    slots.forEach((m, i) => { if (m) taken.set(m.def.id, i); });
    list.hidden = false;
    list.innerHTML = `
      <div class="plc-list-head"><b>Emplacement ${idx + 1} — ${ROW_LABEL[SLOT_ROWS[idx]!]}</b>
        <button class="btn dark" data-free>${icon('close')} Laisser vide</button></div>
      <div class="plc-picks">
        ${team.map((m) => {
          const ailleurs = taken.get(m.def.id);
          const pris = ailleurs !== undefined && ailleurs !== idx;
          return `<button class="plc-pick" data-hero="${m.def.id}">
            <img src="${PORTRAITS[m.def.id]}" alt="" draggable="false"/>
            <span><b>${m.def.name}</b><em>niv. ${m.level} · ${m.def.role} · ${'★'.repeat(m.stars)}${pris ? ' · déjà placé (cliquer = échanger)' : ''}</em></span>
          </button>`;
        }).join('')}
      </div>`;
    list.querySelector('[data-free]')?.addEventListener('click', () => { slots[idx] = null; list.hidden = true; render(); });
    list.querySelectorAll('[data-hero]').forEach((el) => {
      el.addEventListener('click', () => {
        const id = (el as HTMLElement).dataset.hero!;
        const m = team.find((x) => x.def.id === id);
        if (!m) return;
        const ailleurs = taken.get(id);
        const occupe = slots[idx] ?? null;
        if (ailleurs !== undefined && ailleurs !== idx) slots[ailleurs] = occupe; // échange
        slots[idx] = m;
        list.hidden = true;
        render();
      });
    });
  };

  root.querySelector('[data-auto]')?.addEventListener('click', () => {
    const out: (TeamMember | null)[] = [null, null, null, null, null, null];
    for (const m of team) {
      const veut = ROLE_ROW[m.def.role] ?? 'mid';
      let idx = out.findIndex((v, i) => v === null && SLOT_ROWS[i] === veut);
      if (idx < 0) idx = out.findIndex((v) => v === null);
      if (idx >= 0) out[idx] = m;
    }
    for (let i = 0; i < MAX_TEAM; i++) slots[i] = out[i] ?? null;
    list.hidden = true;
    render();
  });

  root.querySelector('[data-go]')?.addEventListener('click', () => {
    const copie = slots.slice();
    root.remove();
    onDone(copie);
  });

  render();
  return { close: () => root.remove() };
}
