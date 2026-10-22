import { Texture } from 'pixi.js';

/** Textures d'effets de combat dessinées par le code (blanches, teintées ensuite). */

function canvas(w: number, h: number): [HTMLCanvasElement, CanvasRenderingContext2D] {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  return [c, c.getContext('2d')!];
}

/** Croissant de lame (coups d'épée, entailles). */
function createSlash(size = 256): Texture {
  const [c, ctx] = canvas(size, size);
  const cx = size / 2, cy = size / 2;
  for (let i = 0; i < 26; i++) {
    const k = i / 25;
    ctx.beginPath();
    const r = size * (0.3 + k * 0.14);
    ctx.arc(cx, cy, r, -Math.PI * 0.85, Math.PI * 0.05);
    ctx.strokeStyle = `rgba(255,255,255,${0.05 + Math.pow(1 - Math.abs(k - 0.65) / 0.65, 3) * 0.5})`;
    ctx.lineWidth = size * 0.012 * (1 + (1 - k) * 2);
    ctx.lineCap = 'round';
    ctx.stroke();
  }
  // Fondu aux extrémités
  ctx.globalCompositeOperation = 'destination-in';
  const g = ctx.createConicGradient(-Math.PI * 0.9, cx, cy);
  g.addColorStop(0, 'rgba(0,0,0,0)');
  g.addColorStop(0.12, 'rgba(0,0,0,1)');
  g.addColorStop(0.42, 'rgba(0,0,0,1)');
  g.addColorStop(0.53, 'rgba(0,0,0,0)');
  g.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);
  return Texture.from(c);
}

/** Flèche (pointe vers la droite). */
function createArrow(): Texture {
  const [c, ctx] = canvas(128, 24);
  const g = ctx.createLinearGradient(0, 0, 128, 0);
  g.addColorStop(0, 'rgba(255,255,255,0)');
  g.addColorStop(0.5, 'rgba(255,255,255,0.7)');
  g.addColorStop(1, 'rgba(255,255,255,1)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 10.5, 108, 3);
  ctx.fillStyle = '#fff';
  ctx.beginPath();
  ctx.moveTo(128, 12); ctx.lineTo(104, 3); ctx.lineTo(109, 12); ctx.lineTo(104, 21); ctx.closePath();
  ctx.fill();
  // empennage
  ctx.globalAlpha = 0.8;
  ctx.beginPath(); ctx.moveTo(14, 12); ctx.lineTo(2, 4); ctx.lineTo(22, 12); ctx.lineTo(2, 20); ctx.closePath(); ctx.fill();
  return Texture.from(c);
}

/** Colonne de lumière verticale (soins, rayons de lune). */
function createBeam(): Texture {
  const [c, ctx] = canvas(64, 256);
  const img = ctx.createImageData(64, 256);
  for (let y = 0; y < 256; y++) {
    const vy = y / 255;
    const fade = Math.pow(Math.sin(vy * Math.PI * 0.5 + 0.05), 1.2) * (1 - Math.pow(vy, 8));
    for (let x = 0; x < 64; x++) {
      const dx = Math.abs(x - 31.5) / 32;
      const v = Math.pow(Math.max(0, 1 - dx), 2.4) * fade;
      const i = (y * 64 + x) * 4;
      img.data[i] = img.data[i + 1] = img.data[i + 2] = 255;
      img.data[i + 3] = Math.round(v * 255);
    }
  }
  ctx.putImageData(img, 0, 0);
  return Texture.from(c);
}

/** Étoile à 4 branches (scintillement, étourdissement). */
function createStar(size = 64): Texture {
  const [c, ctx] = canvas(size, size);
  const h = size / 2;
  const g = ctx.createRadialGradient(h, h, 0, h, h, h);
  g.addColorStop(0, 'rgba(255,255,255,1)');
  g.addColorStop(0.25, 'rgba(255,255,255,0.6)');
  g.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = g;
  ctx.beginPath();
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2 - Math.PI / 2;
    const r = i % 2 === 0 ? h : h * 0.18;
    ctx.lineTo(h + Math.cos(a) * r, h + Math.sin(a) * r);
  }
  ctx.closePath();
  ctx.fill();
  return Texture.from(c);
}

/** Ellipse sombre (ombre portée, fissure au sol). */
function createShadow(): Texture {
  const [c, ctx] = canvas(128, 64);
  const g = ctx.createRadialGradient(64, 32, 0, 64, 32, 64);
  g.addColorStop(0, 'rgba(0,0,0,0.75)');
  g.addColorStop(0.6, 'rgba(0,0,0,0.35)');
  g.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.setTransform(1, 0, 0, 0.5, 0, 16);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 128, 128);
  return Texture.from(c);
}


const rng = (seed: number) => () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646;

/** Trois griffures parallèles (attaques de goule, entailles de l'ultime de Lyra). */
function createClaw(size = 256): Texture {
  const [c, ctx] = canvas(size, size);
  ctx.lineCap = 'round';
  for (let i = -1; i <= 1; i++) {
    for (let pass = 0; pass < 2; pass++) {
      ctx.beginPath();
      const steps = 24;
      for (let s = 0; s <= steps; s++) {
        const k = s / steps;
        const x = size * (0.15 + k * 0.7) + i * size * 0.09;
        const y = size * (0.12 + k * 0.76) + Math.sin(k * Math.PI) * size * -0.08 - i * size * 0.06;
        if (s === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      }
      ctx.strokeStyle = pass === 0 ? 'rgba(255,255,255,0.35)' : 'rgba(255,255,255,1)';
      ctx.lineWidth = pass === 0 ? size * 0.07 : size * 0.025;
      ctx.stroke();
    }
  }
  // Effilage aux extrémités
  ctx.globalCompositeOperation = 'destination-in';
  const g = ctx.createLinearGradient(size * 0.12, size * 0.1, size * 0.88, size * 0.9);
  g.addColorStop(0, 'rgba(0,0,0,0)');
  g.addColorStop(0.3, 'rgba(0,0,0,1)');
  g.addColorStop(0.7, 'rgba(0,0,0,1)');
  g.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);
  return Texture.from(c);
}

/** Sol fissuré en étoile (vue de dessus, à aplatir). */
function createCrack(size = 512): Texture {
  const [c, ctx] = canvas(size, size);
  const r = rng(11);
  const h = size / 2;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  const branch = (x: number, y: number, a: number, len: number, w: number, depth: number): void => {
    ctx.beginPath();
    ctx.moveTo(x, y);
    let cx = x, cy = y;
    const segs = 6;
    for (let i = 0; i < segs; i++) {
      a += (r() - 0.5) * 0.7;
      cx += Math.cos(a) * len / segs;
      cy += Math.sin(a) * len / segs;
      ctx.lineTo(cx, cy);
      if (depth > 0 && r() < 0.35) {
        ctx.lineWidth = w;
        ctx.stroke();
        branch(cx, cy, a + (r() < 0.5 ? -1 : 1) * (0.5 + r() * 0.6), len * 0.45, w * 0.6, depth - 1);
        ctx.beginPath();
        ctx.moveTo(cx, cy);
      }
      w *= 0.86;
    }
    ctx.lineWidth = Math.max(1, w);
    ctx.stroke();
  };
  ctx.strokeStyle = '#fff';
  const n = 11;
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2 + r() * 0.4;
    branch(h + Math.cos(a) * 14, h + Math.sin(a) * 14, a, h * (0.55 + r() * 0.4), 9, 2);
  }
  // Cratère central
  const g = ctx.createRadialGradient(h, h, 0, h, h, size * 0.14);
  g.addColorStop(0, 'rgba(255,255,255,0.9)');
  g.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);
  return Texture.from(c);
}

/** Cercle runique (sorts de zone, sanctuaire). */
function createRune(size = 512): Texture {
  const [c, ctx] = canvas(size, size);
  const h = size / 2;
  ctx.strokeStyle = '#fff';
  ctx.fillStyle = '#fff';
  ctx.shadowColor = '#fff';
  ctx.shadowBlur = 10;
  const ring = (r: number, w: number): void => { ctx.beginPath(); ctx.arc(h, h, r, 0, Math.PI * 2); ctx.lineWidth = w; ctx.stroke(); };
  ring(h * 0.96, 5);
  ring(h * 0.86, 2.5);
  ring(h * 0.58, 3);
  ring(h * 0.2, 2);
  // Glyphes entre les deux anneaux extérieurs
  const r = rng(5);
  const glyphs = 28;
  for (let i = 0; i < glyphs; i++) {
    const a = (i / glyphs) * Math.PI * 2;
    ctx.save();
    ctx.translate(h + Math.cos(a) * h * 0.91, h + Math.sin(a) * h * 0.91);
    ctx.rotate(a + Math.PI / 2);
    ctx.lineWidth = 2.2;
    ctx.beginPath();
    const kind = Math.floor(r() * 4);
    const s = h * 0.035;
    if (kind === 0) { ctx.moveTo(-s, s); ctx.lineTo(0, -s); ctx.lineTo(s, s); }
    else if (kind === 1) { ctx.moveTo(0, -s); ctx.lineTo(0, s); ctx.moveTo(-s, 0); ctx.lineTo(s, -s * 0.6); }
    else if (kind === 2) { ctx.arc(0, 0, s * 0.8, 0, Math.PI * 1.5); }
    else { ctx.moveTo(-s, -s); ctx.lineTo(s, -s); ctx.lineTo(-s, s); ctx.lineTo(s, s); }
    ctx.stroke();
    ctx.restore();
  }
  // Étoile à 6 branches (deux triangles)
  ctx.lineWidth = 3;
  for (let t = 0; t < 2; t++) {
    ctx.beginPath();
    for (let i = 0; i <= 3; i++) {
      const a = (i / 3) * Math.PI * 2 + t * Math.PI / 3 - Math.PI / 2;
      const x = h + Math.cos(a) * h * 0.84, y = h + Math.sin(a) * h * 0.84;
      if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
    ctx.stroke();
  }
  // Petits cercles aux pointes
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2 - Math.PI / 2;
    ctx.beginPath();
    ctx.arc(h + Math.cos(a) * h * 0.58, h + Math.sin(a) * h * 0.58, h * 0.05, 0, Math.PI * 2);
    ctx.lineWidth = 2;
    ctx.stroke();
  }
  return Texture.from(c);
}

/** Lignes de vitesse radiales (façon manga), centre vide. */
function createSpeedLines(size = 1024): Texture {
  const [c, ctx] = canvas(size, size);
  const h = size / 2;
  const r = rng(3);
  for (let i = 0; i < 150; i++) {
    const a = r() * Math.PI * 2;
    const w = 0.004 + r() * 0.014;
    const r0 = h * (0.42 + r() * 0.3);
    const r1 = h * 1.45;
    const g = ctx.createLinearGradient(h + Math.cos(a) * r0, h + Math.sin(a) * r0, h + Math.cos(a) * r1, h + Math.sin(a) * r1);
    g.addColorStop(0, 'rgba(255,255,255,0)');
    g.addColorStop(0.35, `rgba(255,255,255,${0.4 + r() * 0.6})`);
    g.addColorStop(1, 'rgba(255,255,255,1)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(h + Math.cos(a) * r0, h + Math.sin(a) * r0);
    ctx.lineTo(h + Math.cos(a - w) * r1, h + Math.sin(a - w) * r1);
    ctx.lineTo(h + Math.cos(a + w) * r1, h + Math.sin(a + w) * r1);
    ctx.closePath();
    ctx.fill();
  }
  return Texture.from(c);
}

/** Traînée lumineuse horizontale (dashs, coups de l'ultime de Lyra). */
function createStreak(): Texture {
  const [c, ctx] = canvas(512, 48);
  const img = ctx.createImageData(512, 48);
  for (let y = 0; y < 48; y++) {
    for (let x = 0; x < 512; x++) {
      const u = x / 511;
      const taper = Math.sin(u * Math.PI) ** 0.6 * (0.3 + 0.7 * u);
      const dy = Math.abs(y - 23.5) / 24 / Math.max(0.05, taper);
      const v = Math.max(0, 1 - dy) ** 2 * taper;
      const i = (y * 512 + x) * 4;
      img.data[i] = img.data[i + 1] = img.data[i + 2] = 255;
      img.data[i + 3] = Math.round(Math.min(1, v * 1.4) * 255);
    }
  }
  ctx.putImageData(img, 0, 0);
  return Texture.from(c);
}

/** Éclat de roche (débris projetés). */
function createDebris(): Texture {
  const [c, ctx] = canvas(32, 32);
  const r = rng(9);
  ctx.beginPath();
  const n = 7;
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2;
    const rr = 9 + r() * 6;
    ctx.lineTo(16 + Math.cos(a) * rr, 16 + Math.sin(a) * rr);
  }
  ctx.closePath();
  const g = ctx.createLinearGradient(4, 4, 28, 28);
  g.addColorStop(0, '#d8ccc0');
  g.addColorStop(1, '#4a4038');
  ctx.fillStyle = g;
  ctx.fill();
  ctx.strokeStyle = 'rgba(0,0,0,0.6)';
  ctx.lineWidth = 1.5;
  ctx.stroke();
  return Texture.from(c);
}

/** Plume (ultime d'Aldric). */
function createFeather(): Texture {
  const [c, ctx] = canvas(32, 80);
  ctx.fillStyle = '#fff';
  ctx.beginPath();
  ctx.moveTo(16, 2);
  ctx.bezierCurveTo(30, 20, 28, 55, 16, 72);
  ctx.bezierCurveTo(4, 55, 2, 20, 16, 2);
  ctx.fill();
  ctx.globalCompositeOperation = 'destination-out';
  ctx.strokeStyle = 'rgba(0,0,0,0.5)';
  ctx.lineWidth = 1;
  for (let i = 0; i < 9; i++) {
    const y = 14 + i * 6.5;
    ctx.beginPath(); ctx.moveTo(16, y); ctx.lineTo(i % 2 ? 28 : 4, y - 6); ctx.stroke();
  }
  ctx.globalCompositeOperation = 'source-over';
  ctx.fillRect(15.3, 4, 1.4, 76);
  return Texture.from(c);
}

/** Pic de glace (couleurs déjà peintes : à utiliser sans teinte, ancré en bas). */
function createIceSpike(seed: number): Texture {
  const W = 120, H = 300;
  const [c, ctx] = canvas(W, H);
  const r = rng(seed);
  const tipX = W / 2 + (r() - 0.5) * 20;
  const lx = 14 + r() * 10, rx = W - 14 - r() * 10;
  const midL = W / 2 - 18 - r() * 10, midR = W / 2 + 14 + r() * 10;
  // Corps : dégradé bleu profond → presque blanc vers la pointe
  const g = ctx.createLinearGradient(0, H, 0, 0);
  g.addColorStop(0, 'rgba(40,110,190,0.95)');
  g.addColorStop(0.45, 'rgba(95,175,240,0.95)');
  g.addColorStop(1, 'rgba(185,232,255,1)');
  ctx.beginPath();
  ctx.moveTo(lx, H);
  ctx.lineTo(midL, H * 0.45);
  ctx.lineTo(tipX, 4);
  ctx.lineTo(midR, H * 0.5);
  ctx.lineTo(rx, H);
  ctx.closePath();
  ctx.fillStyle = g;
  ctx.fill();
  // Facette sombre côté droit
  ctx.beginPath();
  ctx.moveTo(tipX, 4); ctx.lineTo(midR, H * 0.5); ctx.lineTo(rx, H); ctx.lineTo(W / 2 + 4, H); ctx.closePath();
  ctx.fillStyle = 'rgba(20,60,130,0.35)';
  ctx.fill();
  // Arête lumineuse et éclats internes
  ctx.strokeStyle = 'rgba(235,250,255,0.85)';
  ctx.lineWidth = 2.5;
  ctx.beginPath(); ctx.moveTo(tipX, 6); ctx.lineTo(W / 2 + 2, H); ctx.stroke();
  ctx.lineWidth = 1.5;
  ctx.strokeStyle = 'rgba(220,245,255,0.45)';
  for (let i = 0; i < 4; i++) {
    const y = H * (0.3 + r() * 0.6);
    ctx.beginPath(); ctx.moveTo(W / 2 - 4, y); ctx.lineTo(W / 2 - 16 - r() * 14, y + 14 + r() * 20); ctx.stroke();
  }
  ctx.strokeStyle = 'rgba(170,225,255,0.8)';
  ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(lx, H); ctx.lineTo(midL, H * 0.45); ctx.lineTo(tipX, 4); ctx.lineTo(midR, H * 0.5); ctx.lineTo(rx, H); ctx.stroke();
  // La base se fond dans le sol (pas de coupe nette)
  ctx.globalCompositeOperation = 'destination-in';
  const fade = ctx.createLinearGradient(0, 0, 0, H);
  fade.addColorStop(0, 'rgba(0,0,0,1)');
  fade.addColorStop(0.78, 'rgba(0,0,0,1)');
  fade.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = fade;
  ctx.fillRect(0, 0, W, H);
  ctx.globalCompositeOperation = 'source-over';
  return Texture.from(c);
}

/** Disque plein à bord net (soleil noir, trou noir). */
function createDisc(size = 256): Texture {
  const [c, ctx] = canvas(size, size);
  const g = ctx.createRadialGradient(size / 2, size / 2, size * 0.4, size / 2, size / 2, size / 2);
  g.addColorStop(0, 'rgba(255,255,255,1)');
  g.addColorStop(0.75, 'rgba(255,255,255,1)');
  g.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = g;
  ctx.beginPath(); ctx.arc(size / 2, size / 2, size / 2, 0, Math.PI * 2); ctx.fill();
  return Texture.from(c);
}

export interface BattleTextures {
  slash: Texture;
  arrow: Texture;
  beam: Texture;
  star: Texture;
  shadow: Texture;
  claw: Texture;
  crack: Texture;
  rune: Texture;
  speed: Texture;
  streak: Texture;
  debris: Texture;
  feather: Texture;
  ice: Texture[];
  disc: Texture;
}

export const createBattleTextures = (): BattleTextures => ({
  slash: createSlash(),
  arrow: createArrow(),
  beam: createBeam(),
  star: createStar(),
  shadow: createShadow(),
  claw: createClaw(),
  crack: createCrack(),
  rune: createRune(),
  speed: createSpeedLines(),
  streak: createStreak(),
  debris: createDebris(),
  feather: createFeather(),
  ice: [createIceSpike(11), createIceSpike(29), createIceSpike(47)],
  disc: createDisc(),
});
