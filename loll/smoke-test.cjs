/**
 * Test de démarrage sans navigateur (jsdom).
 * Charge dist/index.html + le bundle, simule canvas et images,
 * puis vérifie que le jeu s'initialise et tourne vraiment.
 *
 * Usage : node smoke-test.cjs
 */
const fs = require('fs');
const path = require('path');
const { JSDOM, VirtualConsole } = require('jsdom');

const distDir = path.join(__dirname, 'dist');
const html = fs.readFileSync(path.join(distDir, 'index.html'), 'utf8');
const jsFile = fs.readdirSync(path.join(distDir, 'assets')).find(f => f.endsWith('.js') && !f.endsWith('.map'));
const js = fs.readFileSync(path.join(distDir, 'assets', jsFile), 'utf8');

const problems = [];
const infos = [];

const virtualConsole = new VirtualConsole();
virtualConsole.on('error', (...a) => problems.push('console.error: ' + a.join(' ')));
virtualConsole.on('warn', (...a) => infos.push('warn: ' + a.join(' ')));
virtualConsole.on('log', (...a) => infos.push('log: ' + a.join(' ')));

const dom = new JSDOM(html, {
  runScripts: 'dangerously',
  pretendToBeVisual: true,
  url: 'http://localhost:3000/',
  virtualConsole,
});

const win = dom.window;

// --- Stub du contexte canvas 2D (jsdom n'a pas de canvas) ---
function makeCtx(canvas) {
  const grad = { addColorStop() {} };
  const base = {
    canvas,
    measureText: () => ({ width: 12, actualBoundingBoxAscent: 8, actualBoundingBoxDescent: 2 }),
    createLinearGradient: () => grad,
    createRadialGradient: () => grad,
    createPattern: () => null,
    getImageData: () => ({ data: new Uint8ClampedArray(4) }),
    isPointInPath: () => false,
  };
  return new Proxy(base, {
    get(t, p) {
      if (p in t) return t[p];
      return () => {};
    },
    set() { return true; },
  });
}
win.HTMLCanvasElement.prototype.getContext = function () {
  if (!this.__ctx) this.__ctx = makeCtx(this);
  return this.__ctx;
};

// --- Stub des images : onload immédiat (jsdom ne télécharge rien) ---
class FakeImage {
  constructor() {
    this.width = 64;
    this.height = 64;
    this.naturalWidth = 64;
    this.naturalHeight = 64;
    this.complete = false;
    this._src = '';
  }
  get src() { return this._src; }
  set src(v) {
    this._src = v;
    setTimeout(() => { this.complete = true; if (this.onload) this.onload(); }, 0);
  }
}
win.Image = FakeImage;

// --- Erreurs non capturées ---
win.addEventListener('error', e => problems.push('window.onerror: ' + (e.error && e.error.stack || e.message)));
win.addEventListener('unhandledrejection', e => problems.push('unhandledrejection: ' + e.reason));

// --- Exécution du bundle (aucun import/export : évaluable en script classique) ---
try {
  win.eval(js);
} catch (err) {
  problems.push('EXCEPTION à l\'exécution du bundle: ' + err.stack);
}

// Le jeu démarre sur l'événement "load"
win.dispatchEvent(new win.Event('load'));

setTimeout(() => {
  const g = win.game;
  const report = [];
  report.push('bundle évalué                 : ' + (problems.some(p => p.includes('EXCEPTION')) ? 'NON' : 'oui'));
  report.push('window.game créé              : ' + (g ? 'oui' : 'NON'));
  if (g) {
    report.push('héros chargé                  : ' + (g.heroes ? `${g.heroes.name || g.heroes.type || 'ok'} (niv. ${g.heroes.level})` : 'NON'));
    report.push('managers                      : ' + ['assetManager', 'battleManager', 'resourceManager', 'storageManager', 'uiManager']
      .map(k => `${k}=${g[k] ? 'ok' : 'MANQUANT'}`).join(', '));
    report.push('palier / ennemis              : ' + g.currentStage + ' / ' + (g.battleManager && g.battleManager.enemies ? g.battleManager.enemies.length : '?'));
    report.push('or / gemmes                   : ' + Math.round(g.resourceManager.gold) + ' / ' + Math.round(g.resourceManager.gems));
    report.push('boucle de jeu active          : ' + (g.isRunning ? 'oui' : 'non'));
    const gold0 = g.resourceManager.gold;
    const stage0 = g.currentStage;
    setTimeout(() => {
      report.push('après 3 s : or                : ' + Math.round(gold0) + ' -> ' + Math.round(g.resourceManager.gold));
      report.push('après 3 s : palier            : ' + stage0 + ' -> ' + g.currentStage);
      report.push('après 3 s : PV ennemis bougent: ' + (g.battleManager.enemies.some(e => e.currentHealth !== e.maxHealth) ? 'oui' : 'non'));
      finish(report);
    }, 3000);
  } else {
    finish(report);
  }
}, 1500);

function finish(report) {
  console.log('===== RAPPORT DE DÉMARRAGE =====');
  report.forEach(l => console.log('  ' + l));
  const real = problems.filter(p => !/canvas|getContext|Not implemented/i.test(p));
  console.log('\n----- problèmes (' + real.length + ') -----');
  real.slice(0, 12).forEach(p => console.log('  ✗ ' + p.slice(0, 400)));
  const refErrs = problems.filter(p => /is not defined|ReferenceError|is not a constructor|Cannot access/i.test(p));
  console.log('\nErreurs de type "global manquant" : ' + refErrs.length);
  console.log('Derniers logs du jeu :');
  infos.slice(-6).forEach(l => console.log('  · ' + l.slice(0, 160)));
  process.exit(real.length === 0 ? 0 : 1);
}
