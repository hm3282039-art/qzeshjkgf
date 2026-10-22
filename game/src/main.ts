import '@fontsource/cinzel/latin-600.css';
import '@fontsource/cinzel/latin-700.css';
import '@fontsource/cinzel/latin-900.css';
import '@fontsource/cinzel-decorative/latin-700.css';
import './ui/styles.css';

import { loadAssets } from './assets';
import { BUILDINGS } from './data/buildings';
import { Camera } from './core/Camera';
import { Game } from './core/Game';
import { createFxTextures } from './fx/textures';
import { HubScene } from './scene/HubScene';
import { store } from './state/store';
import { UI } from './ui/UI';
import { audio } from './audio/AudioEngine';
import { applyCursors, CURSORS } from './ui/cursors';
import { BattleScene } from './battle/BattleScene';
import { BattleHud } from './ui/BattleHud';
import { STAGES, type StageDef } from './data/heroes';
import { hookFullscreen, inIframe } from './ui/fullscreen';

const $ = <T extends HTMLElement>(sel: string) => document.querySelector<T>(sel)!;

async function boot(): Promise<void> {
  const fill = $('#loader-fill');
  const text = $('#loader-text');
  const setProgress = (r: number, msg?: string) => {
    fill.style.width = `${Math.round(r * 100)}%`;
    if (msg) text.textContent = msg;
  };

  store.load();
  store.refreshPower();
  applyCursors();

  const game = new Game();
  await game.init($('#game'));
  game.app.renderer.events.cursorStyles.default = CURSORS.default;
  game.app.renderer.events.cursorStyles.pointer = CURSORS.pointer;
  setProgress(0.15, 'Chargement des terres maudites…');

  const textures = await loadAssets((r) => setProgress(0.15 + r * 0.6));
  setProgress(0.8, 'Le brouillard se lève…');
  await new Promise((r) => requestAnimationFrame(r));
  const fx = createFxTextures();

  const camera = new Camera(() => game.viewport.scale);
  camera.attach(game.app.canvas);

  const scene = new HubScene(game, camera, textures, fx);
  const ui = new UI($('#ui'));
  scene.setQuality(store.settings.quality);
  const applyRender = () => { game.setQuality(store.settings.quality); game.perf.showCounter(store.settings.showFps); };
  applyRender();
  store.on('settings', applyRender);
  window.addEventListener('keydown', (e) => {
    if ((e.key === 'f' || e.key === 'F') && !(e.target instanceof HTMLInputElement)) store.updateSettings({ showFps: !store.settings.showFps });
  });

  // Plein écran : Entrée ou double-clic (le bouton est dans les Paramètres)
  hookFullscreen(() => {
    // Le navigateur redimensionne la fenêtre : on force le recalcul tout de suite
    // pour éviter une image étirée pendant une fraction de seconde.
    requestAnimationFrame(() => {
      game.applyResolution();
      game.layout();
    });
  });
  if (inIframe()) {
    // Dans un aperçu intégré, le plein écran du navigateur est bloqué : on le signale une fois.
    console.info('[plein écran] Ouvre le jeu dans un onglet pour profiter du plein écran.');
  }

  // Son : démarre au premier geste (règle des navigateurs)
  const applyAudio = () => { audio.setVolume(store.settings.volume); audio.setMuted(store.settings.muted); };
  const unlockAudio = () => { audio.start(); applyAudio(); };
  window.addEventListener('pointerdown', unlockAudio);
  window.addEventListener('keydown', unlockAudio);
  store.on('settings', applyAudio);

  // Liaisons scène ↔ interface
  scene.on('hover', ({ def, hovered }) => {
    ui.setLabelHover(def.id, hovered);
    if (hovered) audio.hover();
  });
  scene.on('select', (def) => ui.openBuilding(def));
  scene.on('talk', ({ id }) => { ui.talk(id); audio.click(); });
  ui.on('labelHover', ({ id, hovered }) => scene.setExternalHover(id, hovered));
  ui.on('selectBuilding', (id) => {
    const def = BUILDINGS.find((b) => b.id === id);
    if (def) ui.openBuilding(def);
  });
  ui.on('recenter', () => camera.panTo(scene.centerCamera, 4));
  store.on('settings', (s) => scene.setQuality(s.quality));
  camera.onFirstMove = () => ui.hideHint();

  // Petite entrée cinématique : la caméra glisse vers le centre de la ville.
  camera.jumpTo(Math.max(0, scene.centerCamera - 420));
  camera.panTo(scene.centerCamera, 1.4);

  /* ---------------- Combat ---------------- */
  const battle = new BattleScene(game, textures, fx);
  battle.setQuality(store.settings.quality);
  store.on('settings', (s) => battle.setQuality(s.quality));
  const hud = new BattleHud($('#ui'));
  const transition = createTransition();
  let currentStage: StageDef | null = null;

  const launch = (stage: StageDef) => {
    currentStage = stage;
    battle.start(stage, store.team());
    game.adaptive = true; // la résolution baisse d'elle-même si la machine peine (> 22 ms/image en moyenne)
    battle.speed = store.settings.battleSpeed;
    battle.setAuto(store.settings.battleAuto);
    hud.show(stage, battle.sim!, store.settings.battleAuto, store.settings.battleSpeed);
  };

  const enterBattle = (stageId: string) => {
    const stage = STAGES.find((s) => s.id === stageId);
    if (!stage) return;
    audio.whoosh();
    transition(() => {
      ui.closeModal(true);
      game.root.visible = false;
      audio.setMode('battle');
      launch(stage);
    });
  };

  const exitBattle = () => {
    transition(() => {
      battle.stop();
      game.adaptive = false;
      hud.hide();
      game.root.visible = true;
      audio.setMode('hub');
    });
  };

  ui.on('startStage', enterBattle);
  battle.on('cutin', (u) => hud.cutin(u));
  battle.on('banner', ({ text, kind }) => hud.banner(text, kind));
  battle.on('finished', (r) => {
    if (!currentStage) return;
    const outcome = r.winner === 'hero' ? store.completeStage(currentStage.id, r.stars, currentStage.rewards, currentStage.energy) : null;
    hud.showResult(r, currentStage, outcome);
  });
  hud.on('ult', (uid) => {
    const u = battle.sim?.units.find((x) => x.uid === uid);
    if (u) battle.requestUltimate(u);
  });
  hud.on('speed', (sp) => { battle.speed = sp; store.updateSettings({ battleSpeed: sp }); });
  hud.on('auto', (a) => { battle.setAuto(a); store.updateSettings({ battleAuto: a }); });
  hud.on('pause', (p) => (battle.paused = p));
  hud.on('quit', exitBattle);
  hud.on('home', exitBattle);
  hud.on('retry', () => { if (currentStage) { const st = currentStage; transition(() => launch(st)); } });

  // Outils de test (uniquement avec ?dev dans l'adresse)
  if (location.search.includes('dev')) {
    (window as unknown as Record<string, unknown>).__dev = { enterBattle, exitBattle, battle, hud, ui, store, camera, scene, game, audio };
  }

  game.on('update', (dt) => {
    if (battle.active) {
      battle.update(dt);
      if (battle.sim) hud.update(battle.sim, dt, battle.usedUlt);
      return;
    }
    camera.update(dt);
    scene.update(dt);
    ui.updateLabels(scene.labelPositions());
    ui.updateBubble((id) => scene.talkerAnchor(id), dt);
  });

  setProgress(1, 'Bienvenue à Cendrebourg');
  setTimeout(() => {
    $('#loader').classList.add('hidden');
    $('#ui').classList.add('ready');
  }, 350);
  // Cadeau de la mise à jour de l'autel (une seule fois par sauvegarde)
  if (store.pendingGift > 0) {
    const gems = store.pendingGift;
    store.pendingGift = 0;
    setTimeout(() => { if (!ui.isModalOpen && !battle.active) ui.showGift(gems); }, 4200);
  }
}

/** Transition plein écran (tourbillon sombre) : `mid` est appelé quand l'écran est couvert. */
function createTransition(): (mid: () => void) => void {
  const el = document.createElement('div');
  el.className = 'screen-transition';
  el.innerHTML = '<div class="st-swirl"></div><div class="st-runes"></div>';
  document.body.appendChild(el);
  let busy = false;
  return (mid) => {
    if (busy) return;
    busy = true;
    el.classList.remove('out');
    el.classList.add('in');
    setTimeout(() => {
      mid();
      el.classList.remove('in');
      el.classList.add('out');
      setTimeout(() => { el.classList.remove('out'); busy = false; }, 700);
    }, 650);
  };
}

boot().catch((err: unknown) => {
  console.error(err);
  const text = document.querySelector('#loader-text');
  if (text) text.textContent = `Erreur au démarrage : ${err instanceof Error ? err.message : String(err)}`;
});
