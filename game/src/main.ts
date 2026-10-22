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
import { HEROES, STAGES, type StageDef, type TeamMember } from './data/heroes';
import { trainingStage } from './data/training';
import { isTowerStage, towerFloorOf, towerStage } from './data/tower';
import { hookFullscreen, inIframe } from './ui/fullscreen';
import { installAdmin } from './ui/admin';

const $ = <T extends HTMLElement>(sel: string) => document.querySelector<T>(sel)!;

/* ---------------- Diagnostic de démarrage ----------------
 * Le jeu ne doit jamais rester bloqué sur l'écran de chargement sans dire pourquoi.
 * Chaque étape est nommée, un garde-fou se déclenche au bout de 30 s, et toute
 * erreur (WebGL, image, code) s'affiche en clair avec un bouton « Recharger ».
 */
let bootStep = 'préparation';
let bootDone = false;

function loaderPanel(title: string, detail: string, retry = true): void {
  if (bootDone) return;
  const box = document.querySelector<HTMLElement>('#loader-error');
  const bar = document.querySelector<HTMLElement>('.loader-bar');
  const text = document.querySelector<HTMLElement>('#loader-text');
  if (!box) return;
  const t = box.querySelector<HTMLElement>('.le-title');
  const d = box.querySelector<HTMLElement>('.le-detail');
  const r = box.querySelector<HTMLElement>('.le-retry');
  if (t) t.textContent = title;
  if (d) d.textContent = detail;
  if (r) r.style.display = retry ? '' : 'none';
  box.classList.add('on');
  if (bar) bar.style.display = 'none';
  if (text) text.style.display = 'none';
}

function step(msg: string): void {
  bootStep = msg;
  const text = document.querySelector<HTMLElement>('#loader-text');
  if (text) text.textContent = msg;
}

/** WebGL2 est obligatoire (PixiJS 8 n'a plus de moteur de secours). */
function checkWebGL(): string | null {
  try {
    const c = document.createElement('canvas');
    if (c.getContext('webgl2')) return null;
    if (c.getContext('webgl') || c.getContext('experimental-webgl')) {
      return "Ton navigateur ne fournit que WebGL 1. Active l'accélération matérielle (Paramètres → Système du navigateur) puis recharge la page.";
    }
    return "WebGL est désactivé dans ton navigateur. Active l'accélération matérielle (Paramètres → Système) puis recharge la page.";
  } catch (err) {
    return `Le navigateur a refusé de créer un contexte graphique : ${err instanceof Error ? err.message : String(err)}`;
  }
}

async function boot(): Promise<void> {
  (window as unknown as { __gameBooted: boolean }).__gameBooted = true;
  const fill = $('#loader-fill');
  const text = $('#loader-text');
  const retry = document.querySelector<HTMLElement>('#loader-retry');
  retry?.addEventListener('click', () => location.reload());
  document.querySelector<HTMLElement>('#loader-safe')?.addEventListener('click', () => {
    const u = new URL(location.href);
    u.searchParams.set('safe', '1');
    location.href = u.toString();
  });
  const setProgress = (r: number, msg?: string) => {
    fill.style.width = `${Math.round(r * 100)}%`;
    if (msg) { text.textContent = msg; bootStep = msg; }
  };

  // Garde-fou : si une étape ne rend pas la main, on affiche où ça bloque.
  const watchdog = window.setTimeout(() => {
    loaderPanel('Le chargement ne répond plus', `Bloqué à l'étape : « ${bootStep} ». Cela vient le plus souvent de l'accélération matérielle du navigateur.`);
  }, 30000);
  window.addEventListener('error', (e) => {
    loaderPanel('Le jeu a rencontré une erreur', `${e.message}${e.filename ? ` (${e.filename.split('/').pop()}:${e.lineno})` : ''}`);
  });
  window.addEventListener('unhandledrejection', (e) => {
    const r = e.reason as unknown;
    loaderPanel('Le jeu a rencontré une erreur', r instanceof Error ? r.message : String(r));
  });

  // Vérification graphique AVANT Pixi : message clair au lieu d'un écran figé.
  const glProblem = checkWebGL();
  if (glProblem) { window.clearTimeout(watchdog); loaderPanel('Affichage 3D indisponible', glProblem); return; }

  // Mode compatibilité (?safe) : qualité basse, sans filtre de bloom.
  // Utile quand un pilote vidéo ne supporte pas les filtres personnalisés.
  const safeMode = /[?&]safe\b/.test(location.search);
  store.load();
  if (safeMode) store.updateSettings({ quality: 'low' });
  store.refreshPower();
  applyCursors();

  step('Éveil du moteur graphique…');
  const game = new Game();
  // Un moteur graphique qui ne répond pas ne doit pas figer la page pour toujours.
  await Promise.race([
    game.init($('#game')),
    new Promise<never>((_, reject) => {
      window.setTimeout(() => reject(new Error("Le moteur graphique (WebGL) n'a pas répondu en 15 secondes. Le pilote vidéo ou l'accélération matérielle est probablement en cause.")), 15000);
    }),
  ]);
  game.app.renderer.events.cursorStyles.default = CURSORS.default;
  game.app.renderer.events.cursorStyles.pointer = CURSORS.pointer;
  setProgress(0.15, 'Chargement des terres maudites…');

  const loaded = await loadAssets((r, done, total) => setProgress(0.15 + r * 0.6, `Chargement des images… ${done} / ${total}`));
  const textures = loaded.textures;
  if (loaded.failed.length) console.warn('[assets] images manquantes :', loaded.failed.join(', '));
  setProgress(0.8, 'Le brouillard se lève…');
  await new Promise((r) => requestAnimationFrame(r));
  const fx = createFxTextures();

  const camera = new Camera(() => game.viewport.scale);
  camera.attach(game.app.canvas);

  const scene = new HubScene(game, camera, textures, fx);
  const ui = new UI($('#ui'));
  // Énergie : on rend le temps écoulé hors ligne, puis on entretient la jauge.
  store.tickEnergy();
  window.setInterval(() => store.tickEnergy(), 15000);
  installAdmin();
  scene.setQuality(store.settings.quality);
  const applyRender = () => { game.setQuality(store.settings.quality); game.setFrameCap(store.settings.fpsCap); game.perf.showCounter(store.settings.showFps); };
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

  const launch = (stage: StageDef, team = store.team(), training = false) => {
    currentStage = stage;
    battle.start(stage, team, { training });
    game.adaptive = true; // la résolution baisse d'elle-même si la machine peine (> 22 ms/image en moyenne)
    battle.speed = store.settings.battleSpeed;
    battle.setAuto(store.settings.battleAuto);
    hud.show(stage, battle.sim!, store.settings.battleAuto, store.settings.battleSpeed);
    if (training) hud.trainingBar(() => launch(stage, team, true));
  };

  const enterTower = (floor: number) => {
    const stage = towerStage(floor);
    audio.whoosh();
    transition(() => {
      ui.closeModal(true);
      game.root.visible = false;
      audio.setMode('battle');
      launch(stage);
    });
  };

  const enterTraining = (cfg: { heroId: string; armor: number; res: number }) => {
    const member: TeamMember | undefined = store.team().find((m) => m.def.id === cfg.heroId)
      ?? (store.owns(cfg.heroId)
        ? (() => {
            const def = HEROES.find((h) => h.id === cfg.heroId);
            return def ? { def, stars: store.starsOf(def), level: store.levelOf(def), gear: store.gearOf(def.id) } : undefined;
          })()
        : undefined);
    if (!member) return;
    const stage = trainingStage(cfg.armor, cfg.res, member.def.name);
    audio.whoosh();
    transition(() => {
      ui.closeModal(true);
      game.root.visible = false;
      audio.setMode('battle');
      launch(stage, [member], true);
    });
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
    // Sortie déjà en cours ou combat déjà terminé : on ne relance rien.
    if (!battle.active && !battle.sim) return;
    transition(() => {
      // Chaque étape est isolée : même si l'arrêt du combat échoue,
      // le hub redevient visible et le joueur n'est jamais laissé sur un écran noir.
      try { battle.stop(); } catch (err) { console.warn('[sortie] arrêt du combat', err); }
      game.adaptive = false;
      try { hud.hide(); } catch (err) { console.warn('[sortie] interface', err); }
      game.root.visible = true;
      try { audio.setMode('hub'); } catch (err) { console.warn('[sortie] audio', err); }
    });
  };

  ui.on('startStage', enterBattle);
  ui.on('startTower', enterTower);
  ui.on('startTraining', enterTraining);
  battle.on('cutin', (u) => hud.cutin(u));
  battle.on('banner', ({ text, kind }) => hud.banner(text, kind));
  battle.on('bossTitle', ({ name, title }) => hud.bossTitle(name, title));
  battle.on('bosscast', ({ name, kind, color }) => hud.bossCast(name, kind, color));
  battle.on('bossimpact', ({ kind }) => hud.bossImpact(kind));
  battle.on('trainingTick', ({ total, dps, time }) => hud.tickTraining(total, dps, time));
  battle.on('bond', ({ name, line }) => hud.bond(name, line));
  battle.on('finished', (r) => {
    if (!currentStage) return;
    const tower = isTowerStage(currentStage.id);
    const outcome = r.winner === 'hero'
      ? (tower
        ? store.completeTower(towerFloorOf(currentStage.id), true)
        : store.completeStage(currentStage.id, r.stars, currentStage.rewards, currentStage.energy))
      : null;
    if (tower && r.winner !== 'hero') store.completeTower(towerFloorOf(currentStage.id), false);
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
  bootDone = true;
  window.clearTimeout(watchdog);
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
  el.innerHTML = '<div class="st-swirl"></div><div class="st-runes"></div>'
    + '<div class="st-loading"><i class="st-spin"></i><span>Chargement…</span></div>';
  document.body.appendChild(el);

  type Phase = 'idle' | 'cover' | 'reveal';
  let phase: Phase = 'idle';
  /** Demande reçue pendant une transition : rejouée dès que le rideau est libre. */
  let pending: (() => void) | null = null;
  let watchdog = 0;

  /**
   * Relève le rideau. Appelée dans TOUS les cas (succès, erreur, dépassement de délai) :
   * c'est ce qui empêche l'écran de rester noir pour toujours.
   */
  const reveal = (): void => {
    if (phase !== 'cover') return;
    phase = 'reveal';
    window.clearTimeout(watchdog);
    el.classList.remove('in');
    el.classList.add('out');
    window.setTimeout(() => {
      el.classList.remove('out');
      phase = 'idle';
      const next = pending;
      pending = null;
      if (next) run(next);
    }, 700);
  };

  const run = (mid: () => void): void => {
    phase = 'cover';
    el.classList.remove('out');
    el.classList.add('in');
    // Filet de sécurité : même si `mid` ne rend jamais la main, le rideau se relève.
    window.clearTimeout(watchdog);
    watchdog = window.setTimeout(reveal, 5000);
    window.setTimeout(() => {
      try {
        mid();
      } catch (err) {
        console.error('[transition] échec pendant le changement de scène', err);
      } finally {
        // Une seconde image de marge pour laisser le DOM se poser, puis on rouvre.
        window.setTimeout(reveal, 120);
      }
    }, 650);
  };

  return (mid) => {
    if (phase === 'idle') run(mid);
    else pending = mid; // mémorisé : plus jamais de clic perdu
  };
}

/** Première ligne de pile utile (fichier + ligne), pour diagnostiquer vite. */
function stackHint(err: unknown): string {
  if (!(err instanceof Error) || !err.stack) return '';
  const line = err.stack.split('\n').slice(1).find((l) => l.includes(' at ') && !l.includes('main.ts'));
  if (!line) return '';
  return line.trim().replace(/^at\s+/, '').replace(/https?:\/\/[^/]+\//, '').slice(0, 90);
}

boot().catch((err: unknown) => {
  console.error(err);
  const message = err instanceof Error ? err.message : String(err);
  const where = stackHint(err);
  loaderPanel('Le jeu n\'a pas pu démarrer', `Étape : « ${bootStep} ». ${message}${where ? ` [${where}]` : ''}`, true);
});
