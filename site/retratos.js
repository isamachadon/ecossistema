// retratos.js: o desenhista de bichos.
// Desenha o retrato de uma espécie só a partir dos genes. O gene "plano" escolhe o tipo
// de corpo (são 12), e os outros genes mudam cor, padrão, olhos, patas, enfeites e
// proporções. Por isso dois bichos dificilmente saem iguais.

"use strict";

const TINTA = "#17241c";
const NOMES_PLANOS = ["oval", "lagarta", "geleia", "aranha", "caracol", "ave",
  "cogumelo", "estrela", "cristal", "balão", "lagarto", "peixe"];

function hsl(h, s, l, a = 1) {
  return `hsla(${h.toFixed(1)}, ${(s * 100).toFixed(1)}%, ${(l * 100).toFixed(1)}%, ${a})`;
}
// sorteio "previsível": a mesma semente sempre dá os mesmos números (o retrato não muda a cada recarga)
function sorteador(semente) {
  let a = semente >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function hashGenes(g) {
  const s = `${g.matiz}|${g.padrao}|${g.formato}|${g.densidade_padrao}|${g.enfeites.length}|${g.plano}`;
  let h = 2166136261;
  for (const ch of s) { h ^= ch.charCodeAt(0); h = Math.imul(h, 16777619); }
  return h;
}

// ---------------------------------------------------------------- peças comuns

const elipse = (x, y, rx, ry, rot = 0) => { const p = new Path2D(); p.ellipse(x, y, rx, ry, rot, 0, Math.PI * 2); return p; };
const circulo = (x, y, r) => elipse(x, y, r, r);
// encaixa o bicho no quadro: devolve uma "unidade" que cabe na altura e na largura
const caber = (k, alturaU, larguraU) => Math.min(k.U, (k.H * 0.8) / alturaU, (k.W * 0.92) / larguraU);

function sombra(k, rx, y = k.chao, alfa = 0.14) {
  k.ctx.fillStyle = `rgba(23, 36, 28, ${alfa})`;
  k.ctx.beginPath(); k.ctx.ellipse(k.cx, y, rx, k.H * 0.035, 0, 0, Math.PI * 2); k.ctx.fill();
}

// pinta uma parte do corpo: cor, padrão (listras, pintas...), luz e contorno
function pintar(k, caminho, caixa, cor = k.cor, comPadrao = true) {
  const { ctx, g } = k;
  ctx.fillStyle = cor; ctx.fill(caminho);
  ctx.save();
  ctx.clip(caminho);
  if (comPadrao) desenharPadrao(ctx, g, caixa.cx, caixa.cy, caixa.rx, caixa.ry, k.corPadrao, k.rnd);
  const r = Math.max(caixa.rx, caixa.ry);
  const luz = ctx.createRadialGradient(caixa.cx - caixa.rx * 0.35, caixa.cy - caixa.ry * 0.45, 1, caixa.cx, caixa.cy, r * 1.25);
  luz.addColorStop(0, "rgba(255, 255, 255, 0.35)");
  luz.addColorStop(0.5, "rgba(255, 255, 255, 0)");
  luz.addColorStop(1, "rgba(40, 25, 10, 0.28)");
  ctx.fillStyle = luz;
  ctx.fillRect(caixa.cx - r * 1.6, caixa.cy - r * 1.6, r * 3.2, r * 3.2);
  ctx.restore();
  ctx.strokeStyle = TINTA; ctx.lineWidth = k.lw; ctx.stroke(caminho);
}

// pontos ao longo das costas, onde vão espinhos e enfeites (com a direção "pra fora")
function arcoCostas(cx, cy, rx, ry, a0 = Math.PI * 1.1, a1 = Math.PI * 1.9, n = 12) {
  const l = [];
  for (let i = 0; i < n; i++) {
    const a = a0 + ((a1 - a0) * i) / (n - 1);
    l.push({ x: cx + rx * Math.cos(a), y: cy + ry * Math.sin(a), a: Math.atan2(Math.sin(a) / ry, Math.cos(a) / rx) });
  }
  return l;
}

// um traço grosso com contorno (pescoço, cauda, tentáculo)
function tracoGrosso(k, caminho, largura, cor) {
  const { ctx } = k;
  caminho(); ctx.strokeStyle = TINTA; ctx.lineWidth = largura + k.lw * 2; ctx.stroke();
  caminho(); ctx.strokeStyle = cor; ctx.lineWidth = largura; ctx.stroke();
}

function perna(k, x0, y0, x1, y1, dobra = 0, grossura = 1.4) {
  const { ctx } = k;
  ctx.strokeStyle = TINTA; ctx.lineWidth = k.lw * grossura;
  ctx.beginPath(); ctx.moveTo(x0, y0);
  ctx.quadraticCurveTo(x0 + dobra * 2, (y0 + y1) / 2 + k.H * 0.02, x1, y1); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(x1 - k.W * 0.011, y1); ctx.lineTo(x1 + k.W * 0.013, y1); ctx.stroke();
}

function cauda(k, x0, y0, ref) {
  const { ctx, g, W, H } = k;
  if (g.cauda <= 0.08) return;
  const L = W * 0.06 + g.cauda * W * 0.24;
  const ponta = [x0 - ref * 0.2 - L, y0 - ref * 0.45 - g.cauda * H * 0.1];
  tracoGrosso(k, () => {
    ctx.beginPath(); ctx.moveTo(x0, y0);
    ctx.quadraticCurveTo(x0 - L * 0.5, y0 + ref * 0.3, ponta[0], ponta[1]);
  }, k.lw * (1 + g.cauda * 4), k.cor);
  ctx.fillStyle = k.corPadrao; ctx.strokeStyle = TINTA; ctx.lineWidth = k.lw;
  ctx.beginPath(); ctx.arc(ponta[0], ponta[1], k.lw * (1.5 + g.cauda * 2.5), 0, Math.PI * 2); ctx.fill(); ctx.stroke();
}

function olho(k, x, y, r) {
  const { ctx } = k;
  ctx.fillStyle = "#fffdf6"; ctx.strokeStyle = TINTA; ctx.lineWidth = k.lw * 0.8;
  ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  ctx.fillStyle = "#14100c";
  ctx.beginPath(); ctx.arc(x + r * 0.35, y + r * 0.05, r * 0.5, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = "#fff";
  ctx.beginPath(); ctx.arc(x + r * 0.5, y - r * 0.15, r * 0.16, 0, Math.PI * 2); ctx.fill();
}

function olhos(k, cab) {
  const n = Math.max(1, Math.round(k.g.olhos));
  const rO = Math.max(k.W * 0.014, cab.r * (n === 1 ? 0.6 : 0.8 / Math.sqrt(n)));
  for (let i = 0; i < n; i++) {
    let x = cab.x, y = cab.y;
    if (n > 1) {   // espalha os olhos em espiral, tipo miolo de girassol
      const d = cab.r * 0.7 * Math.sqrt((i + 0.5) / n), a = i * 2.39996 + 0.6;
      x += Math.cos(a) * d; y += Math.sin(a) * d * 0.9;
    }
    olho(k, x, y, rO * (0.85 + k.rnd() * 0.3));
  }
}

// boca: dentuça pros carnívoros, sorriso pros herbívoros, careta pros onívoros
function boca(k, b, s) {
  const { ctx, g, lw } = k;
  const m = Math.max(k.W * 0.025, s * 0.9);
  ctx.strokeStyle = TINTA; ctx.lineWidth = lw;
  if (g.dieta > 0.66) {
    ctx.fillStyle = "#6b2a22";
    ctx.beginPath();
    ctx.moveTo(b.x - m * 0.9, b.y);
    ctx.quadraticCurveTo(b.x - m * 0.4, b.y + m * 0.8, b.x + m * 0.12, b.y - m * 0.1);
    ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.fillStyle = "#fffdf6";
    for (const dx of [-0.68, -0.3]) {
      ctx.beginPath();
      ctx.moveTo(b.x + m * dx, b.y - m * 0.02);
      ctx.lineTo(b.x + m * (dx + 0.1), b.y + m * 0.38);
      ctx.lineTo(b.x + m * (dx + 0.2), b.y - m * 0.02);
      ctx.closePath(); ctx.fill(); ctx.stroke();
    }
  } else if (g.dieta < 0.33) {
    ctx.beginPath(); ctx.arc(b.x - m * 0.35, b.y - m * 0.25, m * 0.4, 0.2 * Math.PI, 0.8 * Math.PI); ctx.stroke();
  } else {
    ctx.beginPath(); ctx.moveTo(b.x - m * 0.7, b.y);
    ctx.quadraticCurveTo(b.x - m * 0.47, b.y + m * 0.22, b.x - m * 0.24, b.y);
    ctx.quadraticCurveTo(b.x, b.y - m * 0.22, b.x + m * 0.05, b.y); ctx.stroke();
  }
}

function antenas(k, cab) {
  const { ctx, g, W, H, lw } = k;
  const n = Math.round(g.antenas);
  for (let i = 0; i < n; i++) {
    const a = -Math.PI * (0.3 + i * 0.09);
    const bx = cab.x + cab.r * 1.1 * Math.cos(a), by = cab.y + cab.r * 1.1 * Math.sin(a);
    const tx = bx + W * (0.04 + i * 0.02), ty = by - H * (0.12 + 0.03 * (i % 2));
    ctx.strokeStyle = TINTA; ctx.lineWidth = lw;
    ctx.beginPath(); ctx.moveTo(bx, by); ctx.quadraticCurveTo(bx - W * 0.02, ty + H * 0.05, tx, ty); ctx.stroke();
    ctx.fillStyle = k.corPadrao;
    ctx.beginPath(); ctx.arc(tx, ty, lw * 2.2, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  }
}

function espinhos(k, costas) {
  const { ctx, g, lw } = k;
  if (!costas || !costas.length || g.espinhos <= 0.12) return;
  const n = 3 + Math.floor(g.espinhos * 9);
  const comp = k.U * (0.15 + g.espinhos * 0.4), base = k.W * 0.013;
  ctx.fillStyle = hsl(g.matiz, g.saturacao * 0.6, g.luz * 0.7);
  ctx.strokeStyle = TINTA; ctx.lineWidth = lw;
  for (let i = 0; i < n; i++) {
    const p = costas[Math.min(costas.length - 1, Math.floor(((i + 0.5) / n) * costas.length))];
    const nx = Math.cos(p.a), ny = Math.sin(p.a);
    ctx.beginPath();
    ctx.moveTo(p.x - ny * base, p.y + nx * base);
    ctx.lineTo(p.x + nx * comp, p.y + ny * comp);
    ctx.lineTo(p.x + ny * base, p.y - nx * base);
    ctx.closePath(); ctx.fill(); ctx.stroke();
  }
}

function enfeite(k, e, f) {
  const { ctx, lw } = k;
  const s = k.U * 0.3 * (0.5 + e.tam);
  const cor = hsl(e.matiz, 0.6, 0.58);
  ctx.fillStyle = cor; ctx.strokeStyle = TINTA; ctx.lineWidth = lw * 0.9;
  if (e.tipo === 5) {   // bigode, sempre perto da boca
    const bx = f.boca.x + s * 0.1, by = f.boca.y - s * 0.25;
    for (let j = -1; j <= 1; j++) {
      ctx.beginPath(); ctx.moveTo(bx, by);
      ctx.quadraticCurveTo(bx + s, by + j * s * 0.2, bx + s * 1.7, by + j * s * 0.6); ctx.stroke();
    }
    return;
  }
  if (e.tipo === 9) {   // brilho: bolinhas luminosas pelo corpo
    const r = sorteador(Math.floor(e.pos * 1e6)), c = f.caixa;
    for (let j = 0; j < 5; j++) {
      const x = c.cx + (r() * 2 - 1) * c.rx * 0.7, y = c.cy + (r() * 2 - 1) * c.ry * 0.6;
      const gr = ctx.createRadialGradient(x, y, 0, x, y, s * 0.5);
      gr.addColorStop(0, hsl(e.matiz, 1, 0.85, 0.95)); gr.addColorStop(1, hsl(e.matiz, 1, 0.85, 0));
      ctx.fillStyle = gr; ctx.beginPath(); ctx.arc(x, y, s * 0.5, 0, Math.PI * 2); ctx.fill();
    }
    return;
  }
  if (!f.costas || !f.costas.length) return;
  const p = f.costas[Math.min(f.costas.length - 1, Math.floor(e.pos * f.costas.length))];
  ctx.save();
  ctx.translate(p.x, p.y);
  ctx.rotate(p.a + Math.PI / 2);   // daqui pra frente, "pra cima" é pra fora do corpo
  switch (e.tipo) {
    case 0: // crista
      for (let j = -1; j <= 1; j++) {
        ctx.beginPath(); ctx.arc(j * s * 0.55, -s * 0.1, s * 0.4, Math.PI, 0); ctx.fill(); ctx.stroke();
      }
      break;
    case 1: // babado
      for (let j = 0; j < 5; j++) {
        const a = -Math.PI * (0.15 + j * 0.17);
        ctx.beginPath(); ctx.ellipse(Math.cos(a) * s * 0.6, Math.sin(a) * s * 0.6, s * 0.45, s * 0.2, a, 0, Math.PI * 2);
        ctx.fill(); ctx.stroke();
      }
      break;
    case 2: // chifre
      ctx.fillStyle = "#efe3c4";
      ctx.beginPath();
      ctx.moveTo(-s * 0.25, s * 0.1);
      ctx.quadraticCurveTo(s * 0.05, -s * 1.3, s * 0.6, -s * 1.6);
      ctx.quadraticCurveTo(s * 0.2, -s * 0.8, s * 0.28, s * 0.1);
      ctx.closePath(); ctx.fill(); ctx.stroke();
      break;
    case 3: // barbatana
      ctx.globalAlpha = 0.9;
      ctx.beginPath(); ctx.moveTo(-s, s * 0.4); ctx.lineTo(-s * 0.1, -s * 1.7); ctx.lineTo(s, s * 0.4);
      ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.globalAlpha = 1;
      break;
    case 4: { // lanterna
      const tx = s, ty = -s * 1.9;
      ctx.beginPath(); ctx.moveTo(0, 0); ctx.quadraticCurveTo(-s * 0.3, ty, tx, ty); ctx.stroke();
      const brilho = ctx.createRadialGradient(tx, ty, 0, tx, ty, s * 0.9);
      brilho.addColorStop(0, hsl(e.matiz, 0.95, 0.75, 0.9)); brilho.addColorStop(1, hsl(e.matiz, 0.95, 0.75, 0));
      ctx.fillStyle = brilho; ctx.beginPath(); ctx.arc(tx, ty, s * 0.9, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = hsl(e.matiz, 0.9, 0.7);
      ctx.beginPath(); ctx.arc(tx, ty, s * 0.3, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      break;
    }
    case 6: // asinha
      ctx.fillStyle = hsl(e.matiz, 0.6, 0.85, 0.75);
      ctx.beginPath(); ctx.ellipse(-s * 0.3, -s * 0.7, s * 1.4, s * 0.6, -0.6, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(-s * 0.8, 0); ctx.lineTo(s * 0.4, -s * 1.3); ctx.stroke();
      break;
    case 7: // casco
      ctx.globalAlpha = 0.92;
      ctx.beginPath(); ctx.ellipse(0, s * 0.5, s * 1.8, s * 1.5, 0, Math.PI, 2 * Math.PI); ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.globalAlpha = 1;
      for (let j = -1; j <= 1; j++) { ctx.beginPath(); ctx.moveTo(j * s * 0.7, s * 0.5); ctx.lineTo(j * s * 0.5, -s * 0.8); ctx.stroke(); }
      break;
    case 8: // topete
      for (let j = -1; j <= 1; j++) {
        ctx.beginPath(); ctx.moveTo(j * s * 0.3, 0);
        ctx.bezierCurveTo(j * s * 0.8, -s * 1.2, j * s * 0.1 + s * 0.5, -s * 1.5, j * s * 0.2 + s * 0.3, -s * 0.9);
        ctx.stroke();
      }
      break;
  }
  ctx.restore();
}

function desenharPadrao(ctx, g, cx, cy, rx, ry, cor, rnd) {
  const tipo = Math.floor(g.padrao), dens = g.densidade_padrao;
  ctx.fillStyle = cor; ctx.strokeStyle = cor;
  if (tipo === 1) {                                        // listras
    const n = 3 + Math.round(dens * 7), larg = (rx * 2) / n;
    for (let i = 0; i < n; i += 2) {
      ctx.save(); ctx.translate(cx - rx + i * larg + larg / 2, cy); ctx.rotate(0.25);
      ctx.fillRect(-larg * 0.35, -ry * 1.5, larg * 0.7, ry * 3); ctx.restore();
    }
  } else if (tipo === 2) {                                 // pintas
    const n = 6 + Math.round(dens * 25);
    for (let i = 0; i < n; i++) {
      ctx.beginPath();
      ctx.arc(cx + (rnd() * 2 - 1) * rx, cy + (rnd() * 2 - 1) * ry, Math.max(rx, ry) * (0.04 + rnd() * 0.08), 0, Math.PI * 2);
      ctx.fill();
    }
  } else if (tipo === 3) {                                 // anéis
    const n = 2 + Math.round(dens * 4);
    ctx.lineWidth = Math.max(rx, ry) * 0.07;
    for (let i = 0; i < n; i++) {
      const f = (i + 1) / (n + 0.5);
      ctx.beginPath(); ctx.ellipse(cx + rx * 0.15, cy, rx * f, ry * f, 0, 0, Math.PI * 2); ctx.stroke();
    }
  } else if (tipo === 4) {                                 // escamas
    const s = Math.max(4, Math.max(rx, ry) * (0.24 - dens * 0.12));
    ctx.lineWidth = Math.max(1, s * 0.16);
    let linha = 0;
    for (let y = cy - ry; y < cy + ry + s; y += s * 0.7, linha++) {
      for (let x = cx - rx + (linha % 2 ? s / 2 : 0); x < cx + rx + s; x += s) {
        ctx.beginPath(); ctx.arc(x, y, s / 2, 0, Math.PI); ctx.stroke();
      }
    }
  } else if (tipo === 5) {                                 // manchas
    const n = 2 + Math.round(dens * 4);
    for (let i = 0; i < n; i++) {
      ctx.beginPath();
      ctx.ellipse(cx + (rnd() * 2 - 1) * rx * 0.8, cy + (rnd() * 2 - 1) * ry * 0.8,
        rx * (0.15 + rnd() * 0.25), ry * (0.12 + rnd() * 0.2), rnd() * Math.PI, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

// ---------------------------------------------------------------- os 12 planos corporais
// Cada um desenha o corpo e devolve onde ficam a cabeça, a boca, as costas e a "caixa" do corpo.

const PLANOS = [
  // 0: oval
  (k) => {
    const { g, W, H, cx, chao } = k;
    const rx = k.U * (W / H) * 0.96 * (0.8 + g.formato * 0.55);
    const ry = k.U * (1.1 - g.formato * 0.45);
    const patas = Math.round(g.patas);
    const cy = chao - ry - (patas ? H * 0.1 : H * 0.02);
    sombra(k, rx * 1.05);
    cauda(k, cx - rx * 0.8, cy + ry * 0.1, ry);
    if (patas === 0) {
      const pe = elipse(cx, cy + ry * 0.85, rx * 1.05, ry * 0.3);
      k.ctx.fillStyle = k.corEscura; k.ctx.fill(pe); k.ctx.strokeStyle = TINTA; k.ctx.lineWidth = k.lw; k.ctx.stroke(pe);
    }
    for (let i = 0; i < patas; i++) {
      const x = cx - rx * 0.7 + (patas === 1 ? 0.5 : i / (patas - 1)) * rx * 1.4;
      const dobra = (i % 2 ? 1 : -1) * W * 0.012;
      perna(k, x, cy + ry * 0.5, x + dobra, chao, dobra);
    }
    const caixa = { cx, cy, rx, ry };
    pintar(k, elipse(cx, cy, rx, ry), caixa);
    return { caixa, cab: { x: cx + rx * 0.5, y: cy - ry * 0.22, r: ry * 0.45 }, boca: { x: cx + rx * 0.8, y: cy + ry * 0.28 },
      costas: arcoCostas(cx, cy, rx, ry) };
  },

  // 1: lagarta de segmentos
  (k) => {
    const { g, W, cx, chao } = k;
    const n = Math.round(g.segmentos ?? 4) + 1;
    const temPatas = Math.round(g.patas) > 0;
    const r0 = k.U * 0.6 * (0.8 + (g.cabeca ?? 0.5) * 0.4);
    const L = Math.min(W * 0.8, n * r0 * 1.3);
    const passo = L / n, ond = g.ondulacao ?? 0.3, pern = temPatas ? r0 * 0.35 : 0;
    const segs = [];
    for (let i = 0; i < n; i++) {
      const r = Math.min(passo * 0.95, r0 * (0.55 + 0.45 * (i / (n - 1)))) * (0.95 + g.formato * 0.2);
      segs.push({ x: cx - L / 2 + passo * (i + 0.5), y: chao - r - pern - Math.abs(Math.sin(i * 1.1 + 0.5)) * ond * k.U * 0.35, r });
    }
    sombra(k, L * 0.55);
    for (const s of segs) {
      if (temPatas) for (const d of [-0.35, 0.35]) perna(k, s.x + d * s.r, s.y + s.r * 0.6, s.x + d * s.r * 1.4, chao, 0, 1.2);
      pintar(k, circulo(s.x, s.y, s.r), { cx: s.x, cy: s.y, rx: s.r, ry: s.r });
    }
    const c = segs[n - 1];
    return { caixa: { cx, cy: c.y, rx: L / 2, ry: c.r }, cab: { x: c.x + c.r * 0.2, y: c.y - c.r * 0.15, r: c.r * 0.62 },
      boca: { x: c.x + c.r * 0.72, y: c.y + c.r * 0.42 },
      costas: segs.slice(0, -1).map((s) => ({ x: s.x, y: s.y - s.r, a: -Math.PI / 2 })) };
  },

  // 2: geleia molenga com tentáculos
  (k) => {
    const { g, ctx, cx, chao } = k;
    const U = caber(k, 2.6, 2.9);
    const R = U * 1.05, larg = 0.9 + g.formato * 0.35;
    const cy = chao - R * 0.95 - U * 0.25;
    const ond = g.ondulacao ?? 0.4, lobos = 3 + Math.floor(ond * 5), fase = k.rnd() * 6;
    const corpo = new Path2D();
    for (let i = 0; i <= 72; i++) {
      const t = (i / 72) * Math.PI * 2;
      const r = R * (1 + 0.16 * ond * Math.sin(lobos * t + fase));
      const x = cx + Math.cos(t) * r * larg, y = cy + Math.sin(t) * r * (Math.sin(t) > 0 ? 0.75 : 1);
      if (i) corpo.lineTo(x, y); else corpo.moveTo(x, y);
    }
    corpo.closePath();
    sombra(k, R * larg);
    const n = Math.max(2, Math.round(g.patas));
    for (let i = 0; i < n; i++) {
      const x = cx - R * larg * 0.7 + R * larg * 1.4 * (i / (n - 1));
      tracoGrosso(k, () => {
        ctx.beginPath(); ctx.moveTo(x, cy + R * 0.4);
        ctx.bezierCurveTo(x - U * 0.25, cy + R * 0.8, x + U * 0.25, chao - U * 0.25, x + (i % 2 ? U * 0.12 : -U * 0.12), chao - k.H * 0.01);
      }, k.lw * 2.4, k.corEscura);
    }
    ctx.globalAlpha = 0.9;
    pintar(k, corpo, { cx, cy, rx: R * larg, ry: R });
    ctx.globalAlpha = 1;
    ctx.fillStyle = "rgba(255, 255, 255, 0.55)";   // brilho de gelatina
    ctx.beginPath(); ctx.ellipse(cx - R * larg * 0.45, cy - R * 0.5, R * 0.22, R * 0.12, -0.5, 0, Math.PI * 2); ctx.fill();
    return { caixa: { cx, cy, rx: R * larg, ry: R }, cab: { x: cx + R * larg * 0.25, y: cy - R * 0.15, r: R * 0.4 },
      boca: { x: cx + R * larg * 0.55, y: cy + R * 0.3 }, costas: arcoCostas(cx, cy, R * larg, R) };
  },

  // 3: aranha de pernas longas
  (k) => {
    const { g, ctx, cx, chao, lw } = k;
    const U = caber(k, 2.7, 4.3);
    const ra = U * 0.7 * (0.8 + g.formato * 0.4), rb = U * 0.58, yb = chao - U * 1.35, xa = cx - U * 0.35;
    const rh = U * 0.36 * (0.7 + (g.cabeca ?? 0.5) * 0.6), xh = xa + ra * 0.95 + rh * 0.6, yh = yb + U * 0.12;
    const n = Math.min(12, Math.max(4, Math.round(g.patas)));
    sombra(k, U * 1.8);
    for (let i = 0; i < n; i++) {
      const lado = i % 2 ? 1 : -1;
      const ordem = Math.floor(i / 2) / Math.max(1, Math.ceil(n / 2) - 1);
      const bx = xa + ra * 0.3 + ordem * (xh - xa - ra * 0.3) * 0.8, by = yb + rb * 0.3;
      const joelho = [bx + lado * U * (lado < 0 ? 1.0 - ordem * 0.2 : 0.5 + ordem * 0.3), yb - U * (0.45 + 0.2 * Math.sin(i))];
      ctx.strokeStyle = TINTA; ctx.lineWidth = lw * 1.6;
      ctx.beginPath(); ctx.moveTo(bx, by); ctx.lineTo(joelho[0], joelho[1]); ctx.lineTo(bx + lado * U * (lado < 0 ? 1.6 - ordem * 0.4 : 0.9 + ordem * 0.6), chao); ctx.stroke();
      ctx.fillStyle = k.corEscura; ctx.beginPath(); ctx.arc(joelho[0], joelho[1], lw * 1.5, 0, Math.PI * 2); ctx.fill();
    }
    pintar(k, elipse(xa, yb, ra, rb), { cx: xa, cy: yb, rx: ra, ry: rb });
    pintar(k, circulo(xh, yh, rh), { cx: xh, cy: yh, rx: rh, ry: rh }, k.corEscura, false);
    return { caixa: { cx: xa, cy: yb, rx: ra, ry: rb }, cab: { x: xh + rh * 0.15, y: yh - rh * 0.15, r: rh * 0.8 },
      boca: { x: xh + rh * 0.7, y: yh + rh * 0.45 }, costas: arcoCostas(xa, yb, ra, rb, Math.PI * 1.1, Math.PI * 1.75) };
  },

  // 4: caracol com concha espiral
  (k) => {
    const { g, ctx, cx, chao, lw } = k;
    const U = caber(k, 2.5, 3.5);
    const x0 = cx - U * 1.3, x1 = cx + U * 1.25;
    const pe = new Path2D();
    pe.moveTo(x0, chao);
    pe.lineTo(x1 - U * 0.2, chao);
    pe.quadraticCurveTo(x1 + U * 0.35, chao, x1 + U * 0.3, chao - U * 0.6);
    pe.quadraticCurveTo(x1 + U * 0.25, chao - U * 1.05, x1 - U * 0.2, chao - U * 0.95);
    pe.lineTo(x0 + U * 0.6, chao - U * 0.38);
    pe.quadraticCurveTo(x0 - U * 0.1, chao - U * 0.3, x0, chao);
    pe.closePath();
    sombra(k, U * 1.5);
    const nOlhos = Math.min(4, Math.max(1, Math.round(g.olhos)));
    const hx = x1 - U * 0.05, hy = chao - U * 0.9, pontas = [];
    ctx.strokeStyle = TINTA; ctx.lineWidth = lw * 1.3;
    for (let i = 0; i < nOlhos; i++) {
      const tx = hx + U * (0.05 + i * 0.22), ty = hy - U * (0.75 + 0.1 * (i % 2));
      ctx.beginPath(); ctx.moveTo(hx - U * 0.1 + i * U * 0.08, hy + U * 0.1); ctx.quadraticCurveTo(tx - U * 0.1, hy - U * 0.3, tx, ty); ctx.stroke();
      pontas.push([tx, ty]);
    }
    pintar(k, pe, { cx, cy: chao - U * 0.4, rx: U * 1.3, ry: U * 0.5 }, k.corClara, false);
    const Rs = U * 0.95 * (0.85 + g.formato * 0.3), sx = cx - U * 0.25, sy = chao - U * 0.35 - Rs * 0.85;
    pintar(k, circulo(sx, sy, Rs), { cx: sx, cy: sy, rx: Rs, ry: Rs });
    const voltas = 2 + (g.segmentos ?? 4) * 0.25;
    ctx.strokeStyle = TINTA; ctx.lineWidth = lw;
    ctx.beginPath();
    for (let i = 0; i <= 140; i++) {
      const t = i / 140, a = t * voltas * Math.PI * 2, r = Rs * 0.92 * (1 - t);
      if (i) ctx.lineTo(sx + Math.cos(a) * r, sy + Math.sin(a) * r); else ctx.moveTo(sx + Math.cos(a) * r, sy + Math.sin(a) * r);
    }
    ctx.stroke();
    for (const [tx, ty] of pontas) olho(k, tx, ty, U * 0.16);
    return { semOlhos: true, semAntenas: true, caixa: { cx: sx, cy: sy, rx: Rs, ry: Rs }, cab: { x: hx, y: hy, r: U * 0.3 },
      boca: { x: x1 + U * 0.12, y: chao - U * 0.5 }, costas: arcoCostas(sx, sy, Rs, Rs, Math.PI * 1.05, Math.PI * 1.95) };
  },

  // 5: ave pernalta
  (k) => {
    const { g, ctx, cx, chao, lw } = k;
    const pesc = g.pescoco ?? 0.5, tamCab = g.cabeca ?? 0.5;
    const U = caber(k, 3.4 + pesc * 0.9, 3.4);
    const hipY = chao - U * 1.3, bx = cx - U * 0.3, by = hipY - U * 0.35;
    const rx = U * 0.85 * (0.85 + g.formato * 0.3), ry = U * 0.62;
    const rh = U * 0.34 * (0.7 + tamCab * 0.6);
    const hx = bx + rx * 0.75 + U * (0.25 + pesc * 0.35), hy = by - ry * 0.6 - U * (0.45 + pesc * 0.9);
    sombra(k, rx);
    for (const d of [-0.2, 0.2]) {
      const x = bx + d * rx;
      ctx.strokeStyle = TINTA; ctx.lineWidth = lw * 1.6;
      ctx.beginPath(); ctx.moveTo(x, by + ry * 0.6); ctx.lineTo(x + U * 0.14, hipY + U * 0.65); ctx.lineTo(x, chao); ctx.stroke();
      for (const a of [-0.5, 0, 0.5]) { ctx.beginPath(); ctx.moveTo(x, chao); ctx.lineTo(x + Math.cos(a) * U * 0.2, chao - Math.abs(Math.sin(a)) * U * 0.02); ctx.stroke(); }
    }
    const nPenas = 3 + Math.round(g.cauda * 3);
    for (let i = 0; i < nPenas; i++) {
      const a = Math.PI * (0.88 + (0.3 * i) / Math.max(1, nPenas - 1));
      const px = bx - rx * 0.75 + Math.cos(a) * U * 0.45, py = by - ry * 0.1 + Math.sin(a) * U * 0.45;
      const pena = elipse(px, py, U * (0.35 + g.cauda * 0.25), U * 0.1, a);
      ctx.fillStyle = k.corPadrao; ctx.fill(pena); ctx.strokeStyle = TINTA; ctx.lineWidth = lw * 0.8; ctx.stroke(pena);
    }
    tracoGrosso(k, () => {
      ctx.beginPath(); ctx.moveTo(bx + rx * 0.55, by - ry * 0.3);
      ctx.quadraticCurveTo(hx - U * 0.1, by - ry * 0.2, hx, hy);
    }, U * 0.3, k.cor);
    pintar(k, elipse(bx, by, rx, ry, -0.15), { cx: bx, cy: by, rx, ry });
    const asa = elipse(bx - rx * 0.1, by - ry * 0.02, rx * 0.6, ry * 0.45, -0.3);
    ctx.fillStyle = k.corEscura; ctx.fill(asa); ctx.strokeStyle = TINTA; ctx.lineWidth = lw; ctx.stroke(asa);
    for (let i = 0; i < 3; i++) {
      ctx.beginPath(); ctx.moveTo(bx - rx * (0.5 - i * 0.2), by + ry * 0.05); ctx.lineTo(bx - rx * (0.65 - i * 0.2), by + ry * 0.3); ctx.stroke();
    }
    pintar(k, circulo(hx, hy, rh), { cx: hx, cy: hy, rx: rh, ry: rh });
    ctx.fillStyle = "#e3a83b"; ctx.strokeStyle = TINTA; ctx.lineWidth = lw;
    ctx.beginPath(); ctx.moveTo(hx + rh * 0.8, hy - rh * 0.25);
    if (g.dieta > 0.66) {   // bico de gancho
      ctx.quadraticCurveTo(hx + rh * 2.1, hy - rh * 0.2, hx + rh * 1.7, hy + rh * 0.5);
      ctx.lineTo(hx + rh * 0.8, hy + rh * 0.2);
    } else {
      ctx.lineTo(hx + rh * (1.6 + pesc * 0.6), hy + rh * 0.05);
      ctx.lineTo(hx + rh * 0.8, hy + rh * 0.25);
    }
    ctx.closePath(); ctx.fill(); ctx.stroke();
    return { semBoca: true, caixa: { cx: bx, cy: by, rx, ry }, cab: { x: hx + rh * 0.05, y: hy - rh * 0.2, r: rh * 0.6 },
      boca: { x: hx + rh, y: hy }, costas: arcoCostas(bx, by, rx, ry, Math.PI * 1.1, Math.PI * 1.6) };
  },

  // 6: cogumelo com rosto no pé
  (k) => {
    const { g, ctx, cx, chao, lw } = k;
    const U = caber(k, 3.0, 3.6);
    const sw = U * 0.85 * (0.8 + g.formato * 0.35), sh = U * 1.05;
    const patas = Math.round(g.patas), pe = patas ? U * 0.18 : 0;
    const topo = chao - pe - sh;
    const crx = U * 1.45 * (0.85 + (g.cabeca ?? 0.5) * 0.35), cry = U * 0.95;
    sombra(k, crx * 0.8);
    for (let i = 0; i < patas; i++) {
      const x = cx - sw * 0.45 + sw * 0.9 * (patas === 1 ? 0.5 : i / (patas - 1));
      const p = elipse(x, chao - pe * 0.45, sw * 0.13, pe * 0.6);
      ctx.fillStyle = k.corEscura; ctx.fill(p); ctx.strokeStyle = TINTA; ctx.lineWidth = lw; ctx.stroke(p);
    }
    const caule = new Path2D(); caule.roundRect(cx - sw / 2, topo, sw, sh, sw * 0.35);
    pintar(k, caule, { cx, cy: topo + sh / 2, rx: sw / 2, ry: sh / 2 }, hsl(g.matiz, 0.25, 0.9), false);
    const chapeu = new Path2D();
    chapeu.ellipse(cx, topo + U * 0.1, crx, cry, 0, Math.PI, 0);
    chapeu.quadraticCurveTo(cx, topo + U * 0.5, cx - crx, topo + U * 0.1);
    chapeu.closePath();
    pintar(k, chapeu, { cx, cy: topo - cry * 0.4, rx: crx, ry: cry });
    return { caixa: { cx, cy: topo - cry * 0.4, rx: crx, ry: cry * 0.6 }, cab: { x: cx + sw * 0.1, y: topo + sh * 0.45, r: sw * 0.3 },
      boca: { x: cx + sw * 0.28, y: topo + sh * 0.78 }, costas: arcoCostas(cx, topo + U * 0.1, crx, cry, Math.PI * 1.08, Math.PI * 1.92) };
  },

  // 7: estrela
  (k) => {
    const { g, ctx, cx, chao } = k;
    const U = caber(k, 2.7, 2.9);
    const n = Math.round(g.lados ?? 5);
    const R = U * 1.25, ri = R * (0.38 + g.formato * 0.25), cy = chao - R * 0.92;
    const rot = -Math.PI / 2 + (k.rnd() - 0.5) * 0.3;
    const corpo = new Path2D(), pontas = [];
    for (let i = 0; i < n * 2; i++) {
      const a = rot + (i * Math.PI) / n;
      const r = i % 2 ? ri : R * (1 + (k.rnd() - 0.5) * 0.25 * (g.ondulacao ?? 0.3));
      const x = cx + Math.cos(a) * r, y = cy + Math.sin(a) * r;
      if (i) corpo.lineTo(x, y); else corpo.moveTo(x, y);
      if (!(i % 2)) pontas.push({ x, y, a });
    }
    corpo.closePath();
    sombra(k, R * 0.8);
    pintar(k, corpo, { cx, cy, rx: R, ry: R });
    ctx.fillStyle = "rgba(255, 255, 255, 0.4)";   // ventosinhas nas pontas
    for (const p of pontas) {
      ctx.beginPath(); ctx.arc(cx + (p.x - cx) * 0.7, cy + (p.y - cy) * 0.7, U * 0.07, 0, Math.PI * 2); ctx.fill();
    }
    const altas = pontas.filter((p) => Math.sin(p.a) < 0.3);
    return { caixa: { cx, cy, rx: R * 0.7, ry: R * 0.7 }, cab: { x: cx + ri * 0.1, y: cy - ri * 0.2, r: ri * 0.75 },
      boca: { x: cx + ri * 0.35, y: cy + ri * 0.45 }, costas: altas.length ? altas : pontas };
  },

  // 8: cristal facetado
  (k) => {
    const { g, ctx, cx, chao, lw } = k;
    const U = caber(k, 3.0, 2.6);
    const n = Math.round(g.lados ?? 6);
    const Rx = U * 0.8 * (0.8 + g.formato * 0.4), Ry = U * 1.15;
    const patas = Math.round(g.patas), pern = patas ? U * 0.45 : U * 0.05;
    const cy = chao - pern - Ry * 0.95;
    const pts = [];
    for (let i = 0; i < n; i++) {
      const a = -Math.PI / 2 + (i * 2 * Math.PI) / n, j = 1 + (k.rnd() - 0.5) * 0.35 * (g.ondulacao ?? 0.3);
      pts.push([cx + Math.cos(a) * Rx * j, cy + Math.sin(a) * Ry * j, a]);
    }
    sombra(k, Rx);
    for (let i = 0; i < patas; i++) {
      const x = cx - Rx * 0.5 + Rx * (patas === 1 ? 0.5 : i / (patas - 1));
      perna(k, x, cy + Ry * 0.5, x + (i % 2 ? 1 : -1) * U * 0.15, chao, 0, 1.3);
    }
    const corpo = new Path2D();
    pts.forEach(([x, y], i) => (i ? corpo.lineTo(x, y) : corpo.moveTo(x, y)));
    corpo.closePath();
    ctx.save(); ctx.shadowColor = hsl(g.matiz, 0.9, 0.7, 0.8); ctx.shadowBlur = U * 0.5;
    ctx.fillStyle = k.cor; ctx.fill(corpo); ctx.restore();
    const grad = ctx.createLinearGradient(cx - Rx, cy - Ry, cx + Rx, cy + Ry);
    grad.addColorStop(0, k.corClara); grad.addColorStop(0.55, k.cor); grad.addColorStop(1, k.corEscura);
    ctx.fillStyle = grad; ctx.fill(corpo);
    ctx.strokeStyle = "rgba(255, 255, 255, 0.5)"; ctx.lineWidth = lw * 0.8;
    const fx = cx - Rx * 0.15, fy = cy - Ry * 0.2;
    for (const [x, y] of pts) { ctx.beginPath(); ctx.moveTo(fx, fy); ctx.lineTo(x, y); ctx.stroke(); }
    ctx.strokeStyle = TINTA; ctx.lineWidth = lw; ctx.stroke(corpo);
    return { caixa: { cx, cy, rx: Rx, ry: Ry }, cab: { x: cx + Rx * 0.15, y: cy - Ry * 0.05, r: Rx * 0.42 },
      boca: { x: cx + Rx * 0.35, y: cy + Ry * 0.35 },
      costas: pts.filter((p) => Math.sin(p[2]) < -0.1).map(([x, y, a]) => ({ x, y, a })) };
  },

  // 9: balão que flutua
  (k) => {
    const { g, ctx, cx, chao, lw } = k;
    const U = caber(k, 3.4, 2.6);
    const R = U * (0.95 + g.formato * 0.2), cy = chao - U * 1.3 - R;
    sombra(k, R * 0.6, chao, 0.08);
    const n = Math.max(2, Math.round(g.patas));
    for (let i = 0; i < n; i++) {
      const x = cx - R * 0.55 + R * 1.1 * (i / (n - 1)), y0 = cy + R * 0.8;
      tracoGrosso(k, () => {
        ctx.beginPath(); ctx.moveTo(x, y0);
        ctx.bezierCurveTo(x - U * 0.3, y0 + U * 0.35, x + U * 0.3, chao - U * 0.7, x + (i % 2 ? U * 0.15 : -U * 0.15), chao - U * 0.3);
      }, lw * 1.4, k.corEscura);
    }
    ctx.fillStyle = k.corEscura; ctx.strokeStyle = TINTA; ctx.lineWidth = lw;
    ctx.beginPath(); ctx.moveTo(cx - U * 0.12, cy + R * 1.08); ctx.lineTo(cx, cy + R * 0.95); ctx.lineTo(cx + U * 0.12, cy + R * 1.08);
    ctx.closePath(); ctx.fill(); ctx.stroke();
    pintar(k, elipse(cx, cy, R * (1 + (g.ondulacao ?? 0) * 0.12), R * 1.05), { cx, cy, rx: R, ry: R });
    ctx.fillStyle = "rgba(255, 255, 255, 0.5)";
    ctx.beginPath(); ctx.ellipse(cx - R * 0.45, cy - R * 0.5, R * 0.22, R * 0.12, -0.6, 0, Math.PI * 2); ctx.fill();
    return { caixa: { cx, cy, rx: R, ry: R }, cab: { x: cx + R * 0.22, y: cy - R * 0.12, r: R * 0.42 },
      boca: { x: cx + R * 0.55, y: cy + R * 0.32 }, costas: arcoCostas(cx, cy, R, R * 1.05) };
  },

  // 10: lagarto
  (k) => {
    const { g, ctx, cx, chao, lw } = k;
    const pesc = g.pescoco ?? 0.4, tamCab = g.cabeca ?? 0.5;
    const U = caber(k, 2.0, 4.4 + g.cauda * 1.6 + pesc * 0.5);
    const rx = U * 1.1 * (0.85 + g.formato * 0.3), ry = U * 0.42;
    const bx = cx + U * 0.45, by = chao - U * 0.72;
    const hrx = U * 0.5 * (0.7 + tamCab * 0.6), hry = hrx * 0.62;
    const hx = bx + rx + U * (0.15 + pesc * 0.5) + hrx * 0.6, hy = by - U * (0.15 + pesc * 0.35);
    sombra(k, rx * 1.4);
    const L = U * (1.0 + g.cauda * 1.6);
    const rabo = new Path2D();
    rabo.moveTo(bx - rx * 0.6, by - ry * 0.55);
    rabo.quadraticCurveTo(bx - rx - L * 0.5, by - ry * 0.6, bx - rx - L, by + ry * 0.9);
    rabo.quadraticCurveTo(bx - rx - L * 0.45, by + ry * 0.5, bx - rx * 0.6, by + ry * 0.6);
    rabo.closePath();
    pintar(k, rabo, { cx: bx - rx - L / 2, cy: by, rx: L / 2, ry });
    const n = Math.min(6, Math.max(2, Math.round(g.patas / 2) * 2));
    for (let i = 0; i < n; i++) {
      const par = Math.floor(i / 2), x = bx - rx * 0.6 + rx * 1.2 * (par / Math.max(1, n / 2 - 1)) + (i % 2 ? rx * 0.1 : -rx * 0.1);
      const jx = x + (i % 2 ? 1 : -1) * U * 0.22, jy = by + ry * 1.2;
      tracoGrosso(k, () => {
        ctx.beginPath(); ctx.moveTo(x, by + ry * 0.3); ctx.lineTo(jx, jy); ctx.lineTo(jx + U * 0.06, chao);
      }, lw * 2, k.corEscura);
    }
    tracoGrosso(k, () => {
      ctx.beginPath(); ctx.moveTo(bx + rx * 0.7, by - ry * 0.1);
      ctx.quadraticCurveTo(hx - hrx * 0.8, by - ry * 0.3, hx - hrx * 0.3, hy);
    }, ry * 1.1, k.cor);
    pintar(k, elipse(bx, by, rx, ry), { cx: bx, cy: by, rx, ry });
    pintar(k, elipse(hx, hy, hrx, hry, 0.08), { cx: hx, cy: hy, rx: hrx, ry: hry });
    return { caixa: { cx: bx, cy: by, rx, ry }, cab: { x: hx + hrx * 0.05, y: hy - hry * 0.35, r: hry * 0.6 },
      boca: { x: hx + hrx * 0.75, y: hy + hry * 0.3 }, costas: arcoCostas(bx, by, rx, ry, Math.PI * 1.15, Math.PI * 1.85) };
  },

  // 11: peixe com perninhas
  (k) => {
    const { g, ctx, cx, chao, lw } = k;
    const U = caber(k, 2.4, 3.9);
    const L = U * 2.4 * (0.85 + g.formato * 0.3), A = U * 0.75 * (1.2 - g.formato * 0.4);
    const patas = Math.max(2, Math.round(g.patas)), pern = U * 0.3;
    const cy = chao - pern - A * 0.55;
    const x0 = cx - L / 2 + U * 0.3, x1 = cx + L / 2 + U * 0.3, meio = (x0 + x1) / 2;
    sombra(k, L * 0.5);
    for (let i = 0; i < patas; i++) {
      const x = x0 + L * 0.25 + L * 0.5 * (i / (patas - 1));
      perna(k, x, cy + A * 0.35, x + (i % 2 ? 1 : -1) * U * 0.08, chao, 0, 1.3);
    }
    const rabo = new Path2D();
    rabo.moveTo(x0 + U * 0.15, cy); rabo.lineTo(x0 - U * 0.75, cy - U * 0.65);
    rabo.quadraticCurveTo(x0 - U * 0.45, cy, x0 - U * 0.75, cy + U * 0.65); rabo.closePath();
    pintar(k, rabo, { cx: x0 - U * 0.4, cy, rx: U * 0.4, ry: U * 0.65 }, k.corPadrao, false);
    const dors = new Path2D();
    dors.moveTo(meio - L * 0.2, cy - A * 0.4);
    dors.quadraticCurveTo(meio - L * 0.05, cy - A * 1.5, meio + L * 0.15, cy - A * 0.45); dors.closePath();
    pintar(k, dors, { cx: meio, cy: cy - A, rx: L * 0.2, ry: A * 0.5 }, k.corPadrao, false);
    const corpo = new Path2D();
    corpo.moveTo(x0, cy); corpo.quadraticCurveTo(meio, cy - A * 1.25, x1, cy);
    corpo.quadraticCurveTo(meio, cy + A * 1.15, x0, cy); corpo.closePath();
    pintar(k, corpo, { cx: meio, cy, rx: L / 2, ry: A * 0.6 });
    ctx.strokeStyle = TINTA; ctx.lineWidth = lw;
    ctx.beginPath(); ctx.arc(x1 - L * 0.3, cy, A * 0.4, -0.9, 0.9); ctx.stroke();
    const costas = [];
    for (let i = 0; i < 10; i++) {
      const t = 0.15 + (0.7 * i) / 9;
      const x = (1 - t) * (1 - t) * x0 + 2 * (1 - t) * t * meio + t * t * x1;
      const y = (1 - t) * (1 - t) * cy + 2 * (1 - t) * t * (cy - A * 1.25) + t * t * cy;
      const dx = 2 * (1 - t) * (meio - x0) + 2 * t * (x1 - meio), dy = 2 * (1 - t) * (-A * 1.25) + 2 * t * (A * 1.25);
      costas.push({ x, y, a: Math.atan2(dy, dx) - Math.PI / 2 });
    }
    return { caixa: { cx: meio, cy, rx: L / 2, ry: A * 0.5 }, cab: { x: x1 - L * 0.17, y: cy - A * 0.18, r: A * 0.33 },
      boca: { x: x1 - L * 0.03, y: cy + A * 0.12 }, costas };
  },
];

// ---------------------------------------------------------------- o retrato completo

function desenharRetrato(tela, g) {
  const ctx = tela.getContext("2d");
  const W = tela.width, H = tela.height;
  ctx.clearRect(0, 0, W, H);
  ctx.lineCap = "round"; ctx.lineJoin = "round";
  const escala = 0.62 + 0.38 * Math.min(1, (g.tamanho - 0.4) / 3.0);  // os grandões enchem mais o quadro
  const k = {
    ctx, W, H, g, rnd: sorteador(hashGenes(g)),
    lw: Math.max(1.5, W / 140),
    U: H * 0.27 * escala,
    cx: W * 0.48, chao: H * 0.86,
    cor: hsl(g.matiz, g.saturacao, g.luz),
    corEscura: hsl(g.matiz, g.saturacao * 0.8, g.luz * 0.62),
    corClara: hsl(g.matiz, g.saturacao * 0.5, Math.min(0.92, g.luz + 0.28)),
    corPadrao: hsl(g.matiz_padrao, Math.min(1, g.saturacao + 0.1), g.luz < 0.5 ? g.luz + 0.22 : g.luz - 0.22),
  };
  const desenhar = PLANOS[Math.floor(g.plano ?? 0)] || PLANOS[0];
  const f = desenhar(k);
  espinhos(k, f.costas);
  for (const e of g.enfeites) enfeite(k, e, f);
  if (!f.semAntenas) antenas(k, f.cab);
  if (!f.semOlhos) olhos(k, f.cab);
  if (!f.semBoca) boca(k, f.boca, f.cab.r);
}
