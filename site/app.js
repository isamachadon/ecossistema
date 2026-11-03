// app.js: o "pintor" do site.
// Lê o diario.json (que a simulação escreve) e o nomes.json (que você edita)
// e desenha tudo: o mundo animado, os retratos, a linha do tempo e a árvore.

"use strict";

const BIOMAS = {
  campo:    { nome: "Campo",    cor: "#e2e5b0" },
  floresta: { nome: "Floresta", cor: "#b5d19b" },
  pantano:  { nome: "Pântano",  cor: "#b9d6cd" },
  deserto:  { nome: "Deserto",  cor: "#f1d9a6" },
  tundra:   { nome: "Tundra",   cor: "#e3e9ef" },
};
const ICONES = { inicio: "🌍", especie_nova: "🌱", extincao: "🪦", evento: "⚡", fim_evento: "🌤️", migracao: "🧳" };
const TINTA = "#3a2e24";

let D = null;      // o diário
let NOMES = {};    // os nomes que você deu

const $ = (sel) => document.querySelector(sel);

// ---------------------------------------------------------------- utilidades

function esc(t) {
  return String(t).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}
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
  const s = `${g.matiz}|${g.padrao}|${g.formato}|${g.densidade_padrao}|${g.enfeites.length}`;
  let h = 2166136261;
  for (const ch of s) { h ^= ch.charCodeAt(0); h = Math.imul(h, 16777619); }
  return h;
}
function aviso(texto) {
  const div = document.createElement("div");
  div.className = "aviso";
  div.textContent = texto;
  $("#avisos").appendChild(div);
}

// ---------------------------------------------------------------- nomes

function cientifico(e) { return `${e.genero} ${e.epiteto}`; }
function nomeDado(id) {
  const n = NOMES[String(id)];
  return typeof n === "string" && n.trim() ? n.trim() : null;
}
function rotulo(id) {
  const e = D.especies[id];
  if (!e) return "espécie desconhecida";
  return nomeDado(id) || `sem nome (${cientifico(e)})`;
}
function linkEsp(id) {
  return `<a href="#" class="link-esp" data-id="${id}">${esc(rotulo(id))}</a>`;
}
function textoComNomes(t) {
  return esc(t).replace(/\{esp:(\d+)\}/g, (_, id) => linkEsp(id));
}
function dias(n) { return n === 0 ? "recém-chegada" : n === 1 ? "1 dia" : `${n} dias`; }
function origem(e) {
  if (e.origem === "fundadora") return "Pioneira do planeta";
  if (e.origem === "migracao") return "Imigrante, chegou de fora";
  return `Descende de ${linkEsp(e.pai)}`;
}

// ---------------------------------------------------------------- frases sobre os genes

function descricoes(g, quantas = 3) {
  const d = [];
  const patas = Math.round(g.patas), olhos = Math.round(g.olhos);
  const tipos = new Set(g.enfeites.map((e) => e.tipo));
  if (g.velocidade > 2.2) d.push("Corre como quem esqueceu o fogão ligado.");
  else if (g.velocidade < 0.6) d.push("Anda com a calma de quem tem a vida toda pela frente (spoiler: não tem).");
  if (g.tamanho > 2.5) d.push("Grandalhona. Ocupa duas vagas no estacionamento.");
  else if (g.tamanho < 0.7) d.push("Cabe num dedal, com espaço pra um lanche.");
  if (g.visao > 45) d.push("Enxerga longe. Nenhuma fofoca escapa.");
  else if (g.visao < 10) d.push("Míope de carteirinha.");
  if (olhos >= 5) d.push(`Tem ${olhos} olhos e mesmo assim tropeça.`);
  if (olhos === 1) d.push("Um olho só, bem no centro. Muito estilosa.");
  if (patas >= 8) d.push(`${patas} patas: sapato é um investimento sério.`);
  if (patas === 0) d.push("Sem patas. Se locomove na base da determinação.");
  if (g.espinhos > 0.6) d.push("Abraço não recomendado.");
  if (g.dieta > 0.8) d.push("Olha pros vizinhos e pensa em almoço.");
  else if (g.dieta < 0.15) d.push("Vegana desde sempre e faz questão de avisar.");
  else if (g.dieta > 0.33 && g.dieta < 0.66) d.push("Come de tudo. Literalmente de tudo.");
  if (g.metabolismo > 1.8) d.push("Vive no modo turbo: cresce rápido, cansa rápido.");
  if (g.metabolismo < 0.6) d.push("Metabolismo de bicho-preguiça em dia de folga.");
  if (Math.round(g.ninhada) >= 4) d.push("Família enorme. O Natal deve ser um caos.");
  if (g.idade_reproducao > 180) d.push("Demora pra ter filhos. Primeiro quer viajar.");
  if (g.enfeites.length >= 5) d.push("Exagerada nos acessórios, e com muito orgulho.");
  if (tipos.has(4)) d.push("Tem uma lanterna na cabeça. Economiza na conta de luz.");
  if (tipos.has(6)) d.push("Tem asinhas que não servem pra voar. Servem pra charme.");
  if (tipos.has(2)) d.push("Usa chifre como acessório de moda.");
  if (tipos.has(5)) d.push("Ostenta um bigode respeitável.");
  if (tipos.has(7)) d.push("Carrega a casa nas costas. Aluguel zero.");
  if (tipos.has(0)) d.push("Crista sempre arrumada, nunca despenteada.");
  const padrao = Math.floor(g.padrao);
  if (padrao === 1) d.push("Listrada como pijama de vó.");
  if (padrao === 2) d.push("Cheia de pintinhas. Parece que espirrou tinta.");
  if (padrao === 4) d.push("Escamas brilhantes, nível peixe de aquário chique.");
  if (d.length === 0) d.push("Uma espécie discreta. Prefere não chamar atenção.");
  // embaralha de um jeito fixo pra cada genoma
  const r = sorteador(hashGenes(g) ^ 99);
  for (let i = d.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [d[i], d[j]] = [d[j], d[i]]; }
  return d.slice(0, quantas);
}

// ---------------------------------------------------------------- retrato

function desenharRetrato(tela, g) {
  const ctx = tela.getContext("2d");
  const W = tela.width, H = tela.height;
  ctx.clearRect(0, 0, W, H);
  const rnd = sorteador(hashGenes(g));
  const escala = 0.62 + 0.38 * Math.min(1, (g.tamanho - 0.4) / 3.0);  // os grandões enchem mais o quadro
  const cx = W * 0.47, cy = H * 0.5;
  const rx = W * 0.26 * escala * (0.8 + g.formato * 0.55);
  const ry = H * 0.27 * escala * (1.1 - g.formato * 0.45);
  const cor = hsl(g.matiz, g.saturacao, g.luz);
  const corEscura = hsl(g.matiz, g.saturacao * 0.8, g.luz * 0.6);
  const corPadrao = hsl(g.matiz_padrao, Math.min(1, g.saturacao + 0.1), g.luz < 0.5 ? g.luz + 0.22 : g.luz - 0.22);
  const lw = Math.max(1.5, W / 140);
  const chao = cy + ry + H * 0.1;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";

  // sombra no chão
  ctx.fillStyle = "rgba(70, 50, 30, 0.13)";
  ctx.beginPath(); ctx.ellipse(cx, chao, rx * 1.05, H * 0.035, 0, 0, Math.PI * 2); ctx.fill();

  // cauda (atrás do corpo)
  if (g.cauda > 0.08) {
    const L = W * 0.06 + g.cauda * W * 0.26;
    const ponta = [cx - rx - L, cy - ry * 0.5 - g.cauda * H * 0.12];
    const caminho = () => {
      ctx.beginPath();
      ctx.moveTo(cx - rx * 0.8, cy + ry * 0.1);
      ctx.quadraticCurveTo(cx - rx - L * 0.5, cy + ry * 0.4, ponta[0], ponta[1]);
    };
    caminho(); ctx.strokeStyle = TINTA; ctx.lineWidth = lw * (2 + g.cauda * 5); ctx.stroke();
    caminho(); ctx.strokeStyle = cor; ctx.lineWidth = lw * (2 + g.cauda * 5) - lw * 2; ctx.stroke();
    ctx.fillStyle = corPadrao; ctx.strokeStyle = TINTA; ctx.lineWidth = lw;
    ctx.beginPath(); ctx.arc(ponta[0], ponta[1], lw * (1.5 + g.cauda * 2.5), 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  }

  // enfeites que ficam atrás do corpo (barbatana e asinha)
  for (const e of g.enfeites) if (e.tipo === 3 || e.tipo === 6) desenharEnfeite(ctx, e, g, cx, cy, rx, ry, lw);

  // patas
  const patas = Math.round(g.patas);
  if (patas === 0) {
    ctx.fillStyle = corEscura; ctx.strokeStyle = TINTA; ctx.lineWidth = lw;
    ctx.beginPath(); ctx.ellipse(cx, cy + ry * 0.85, rx * 1.05, ry * 0.3, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  }
  for (let i = 0; i < patas; i++) {
    const fr = patas === 1 ? 0.5 : i / (patas - 1);
    const x = cx - rx * 0.7 + fr * rx * 1.4;
    const dobra = (i % 2 ? 1 : -1) * W * 0.012;
    ctx.strokeStyle = TINTA; ctx.lineWidth = lw * 1.4;
    ctx.beginPath();
    ctx.moveTo(x, cy + ry * 0.5);
    ctx.quadraticCurveTo(x + dobra * 2, cy + ry + H * 0.03, x + dobra, chao);
    ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x + dobra - W * 0.012, chao); ctx.lineTo(x + dobra + W * 0.014, chao); ctx.stroke();
  }

  // corpo
  ctx.beginPath(); ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
  ctx.fillStyle = cor; ctx.fill();
  ctx.save();
  ctx.clip();
  desenharPadrao(ctx, g, cx, cy, rx, ry, corPadrao, rnd);
  ctx.fillStyle = "rgba(255, 255, 255, 0.16)";   // barriguinha clara
  ctx.beginPath(); ctx.ellipse(cx + rx * 0.1, cy + ry * 0.65, rx * 0.7, ry * 0.4, 0, 0, Math.PI * 2); ctx.fill();
  const luz = ctx.createRadialGradient(cx - rx * 0.35, cy - ry * 0.45, 1, cx, cy, rx * 1.25);
  luz.addColorStop(0, "rgba(255, 255, 255, 0.35)");
  luz.addColorStop(0.5, "rgba(255, 255, 255, 0)");
  luz.addColorStop(1, "rgba(40, 25, 10, 0.28)");
  ctx.fillStyle = luz; ctx.fillRect(cx - rx, cy - ry, rx * 2, ry * 2);
  ctx.restore();
  ctx.beginPath(); ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
  ctx.strokeStyle = TINTA; ctx.lineWidth = lw; ctx.stroke();

  // espinhos nas costas
  if (g.espinhos > 0.12) {
    const n = 3 + Math.floor(g.espinhos * 9);
    const comp = ry * (0.18 + g.espinhos * 0.45);
    ctx.fillStyle = hsl(g.matiz, g.saturacao * 0.6, g.luz * 0.7);
    for (let i = 0; i < n; i++) {
      const a = Math.PI * (1.12 + (0.62 * (i + 0.5)) / n);
      const bx = cx + rx * Math.cos(a), by = cy + ry * Math.sin(a);
      let nx = Math.cos(a) / rx, ny = Math.sin(a) / ry;
      const m = Math.hypot(nx, ny); nx /= m; ny /= m;
      const base = W * 0.016;
      ctx.beginPath();
      ctx.moveTo(bx - ny * base, by + nx * base);
      ctx.lineTo(bx + nx * comp, by + ny * comp);
      ctx.lineTo(bx + ny * base, by - nx * base);
      ctx.closePath(); ctx.fill(); ctx.stroke();
    }
  }

  // os outros enfeites
  for (const e of g.enfeites) if (e.tipo !== 3 && e.tipo !== 6) desenharEnfeite(ctx, e, g, cx, cy, rx, ry, lw);

  // antenas
  const antenas = Math.round(g.antenas);
  for (let i = 0; i < antenas; i++) {
    const a = -Math.PI * (0.22 + i * 0.07);
    const bx = cx + rx * Math.cos(a), by = cy + ry * Math.sin(a);
    const tx = bx + W * (0.05 + i * 0.025), ty = by - H * (0.16 + 0.03 * (i % 2));
    ctx.strokeStyle = TINTA; ctx.lineWidth = lw;
    ctx.beginPath(); ctx.moveTo(bx, by); ctx.quadraticCurveTo(bx - W * 0.02, ty + H * 0.05, tx, ty); ctx.stroke();
    ctx.fillStyle = corPadrao;
    ctx.beginPath(); ctx.arc(tx, ty, lw * 2.2, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  }

  // olhos
  const olhos = Math.round(g.olhos);
  const rOlho = Math.max(W * 0.016, (W * 0.05) / Math.sqrt(olhos));
  const ox = cx + rx * 0.5, oy = cy - ry * 0.25;
  for (let i = 0; i < olhos; i++) {
    let px = ox, py = oy;
    if (olhos > 1) {
      const ang = -1.1 + (2.2 * i) / (olhos - 1);
      px = ox + Math.cos(ang) * ry * 0.18 - (i % 2) * rOlho * 0.9;
      py = oy + Math.sin(ang) * ry * 0.42;
    }
    const r = rOlho * (0.85 + rnd() * 0.3);
    ctx.fillStyle = "#fffdf6"; ctx.strokeStyle = TINTA; ctx.lineWidth = lw * 0.8;
    ctx.beginPath(); ctx.arc(px, py, r, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    ctx.fillStyle = "#1f1813";
    ctx.beginPath(); ctx.arc(px + r * 0.35, py + r * 0.05, r * 0.5, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#fff";
    ctx.beginPath(); ctx.arc(px + r * 0.5, py - r * 0.15, r * 0.16, 0, Math.PI * 2); ctx.fill();
  }

  // boca: dentuça pros carnívoros, sorriso pros herbívoros
  const bx = cx + rx * 0.8, by = cy + ry * 0.25;
  ctx.strokeStyle = TINTA; ctx.lineWidth = lw;
  if (g.dieta > 0.66) {
    ctx.fillStyle = "#6b2a22";
    ctx.beginPath();
    ctx.moveTo(bx - W * 0.08, by);
    ctx.quadraticCurveTo(bx - W * 0.035, by + H * 0.07, bx + W * 0.01, by - H * 0.01);
    ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.fillStyle = "#fffdf6";
    for (const dx of [-0.06, -0.025]) {
      ctx.beginPath();
      ctx.moveTo(bx + W * dx, by - H * 0.002);
      ctx.lineTo(bx + W * (dx + 0.009), by + H * 0.035);
      ctx.lineTo(bx + W * (dx + 0.018), by - H * 0.002);
      ctx.closePath(); ctx.fill(); ctx.stroke();
    }
  } else if (g.dieta < 0.33) {
    ctx.beginPath(); ctx.arc(bx - W * 0.03, by - H * 0.02, W * 0.03, 0.2 * Math.PI, 0.8 * Math.PI); ctx.stroke();
  } else {
    ctx.beginPath(); ctx.moveTo(bx - W * 0.06, by);
    ctx.quadraticCurveTo(bx - W * 0.04, by + H * 0.02, bx - W * 0.02, by);
    ctx.quadraticCurveTo(bx, by - H * 0.02, bx + W * 0.005, by); ctx.stroke();
  }
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
      ctx.arc(cx + (rnd() * 2 - 1) * rx, cy + (rnd() * 2 - 1) * ry, rx * (0.04 + rnd() * 0.08), 0, Math.PI * 2);
      ctx.fill();
    }
  } else if (tipo === 3) {                                 // anéis
    const n = 2 + Math.round(dens * 4);
    ctx.lineWidth = rx * 0.07;
    for (let i = 0; i < n; i++) {
      const f = (i + 1) / (n + 0.5);
      ctx.beginPath(); ctx.ellipse(cx + rx * 0.15, cy, rx * f, ry * f, 0, 0, Math.PI * 2); ctx.stroke();
    }
  } else if (tipo === 4) {                                 // escamas
    const s = rx * (0.24 - dens * 0.12);
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

function desenharEnfeite(ctx, e, g, cx, cy, rx, ry, lw) {
  const a = Math.PI * (1.08 + e.pos * 0.8);   // posição ao longo das costas
  const px = cx + rx * Math.cos(a), py = cy + ry * Math.sin(a);
  const s = Math.min(rx, ry) * 0.35 * (0.5 + e.tam);
  const cor = hsl(e.matiz, 0.6, 0.58);
  ctx.fillStyle = cor; ctx.strokeStyle = TINTA; ctx.lineWidth = lw * 0.9;
  switch (e.tipo) {
    case 0: // crista
      for (let k = -1; k <= 1; k++) {
        ctx.beginPath(); ctx.arc(px + k * s * 0.55, py - s * 0.1, s * 0.4, Math.PI, 0); ctx.fill(); ctx.stroke();
      }
      break;
    case 1: // babado
      for (let k = 0; k < 5; k++) {
        const ang = -Math.PI * (0.15 + k * 0.17);
        ctx.beginPath();
        ctx.ellipse(px + Math.cos(ang) * s * 0.6, py + Math.sin(ang) * s * 0.6, s * 0.45, s * 0.2, ang, 0, Math.PI * 2);
        ctx.fill(); ctx.stroke();
      }
      break;
    case 2: // chifre
      ctx.fillStyle = "#efe3c4";
      ctx.beginPath();
      ctx.moveTo(px - s * 0.25, py + s * 0.1);
      ctx.quadraticCurveTo(px + s * 0.05, py - s * 1.3, px + s * 0.6, py - s * 1.6);
      ctx.quadraticCurveTo(px + s * 0.2, py - s * 0.8, px + s * 0.28, py + s * 0.1);
      ctx.closePath(); ctx.fill(); ctx.stroke();
      break;
    case 3: // barbatana
      ctx.globalAlpha = 0.9;
      ctx.beginPath();
      ctx.moveTo(px - s, py + s * 0.4); ctx.lineTo(px - s * 0.1, py - s * 1.7); ctx.lineTo(px + s, py + s * 0.4);
      ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.globalAlpha = 1;
      break;
    case 4: { // lanterna
      const tx = px + s, ty = py - s * 1.9;
      ctx.beginPath(); ctx.moveTo(px, py); ctx.quadraticCurveTo(px - s * 0.3, ty, tx, ty); ctx.stroke();
      const brilho = ctx.createRadialGradient(tx, ty, 0, tx, ty, s * 0.9);
      brilho.addColorStop(0, hsl(e.matiz, 0.95, 0.75, 0.9));
      brilho.addColorStop(1, hsl(e.matiz, 0.95, 0.75, 0));
      ctx.fillStyle = brilho; ctx.beginPath(); ctx.arc(tx, ty, s * 0.9, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = hsl(e.matiz, 0.9, 0.7);
      ctx.beginPath(); ctx.arc(tx, ty, s * 0.3, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      break;
    }
    case 5: { // bigode
      const bx = cx + rx * 0.88, by = cy + ry * 0.12;
      for (let k = -1; k <= 1; k++) {
        ctx.beginPath(); ctx.moveTo(bx, by); ctx.quadraticCurveTo(bx + s, by + k * s * 0.2, bx + s * 1.7, by + k * s * 0.6); ctx.stroke();
      }
      break;
    }
    case 6: // asinha
      ctx.fillStyle = hsl(e.matiz, 0.6, 0.85, 0.7);
      ctx.beginPath(); ctx.ellipse(px, py - s * 0.7, s * 1.4, s * 0.6, -0.6, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(px - s * 0.6, py); ctx.lineTo(px + s * 0.6, py - s * 1.3); ctx.stroke();
      break;
    case 7: // casco
      ctx.globalAlpha = 0.92;
      ctx.beginPath(); ctx.ellipse(cx - rx * 0.05, cy - ry * 0.05, rx * 0.82, ry * 0.95, 0, Math.PI, 2 * Math.PI);
      ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.globalAlpha = 1;
      for (let k = 1; k <= 3; k++) {
        const x = cx - rx * 0.05 - rx * 0.82 + (rx * 1.64 * k) / 4;
        ctx.beginPath(); ctx.moveTo(x, cy - ry * 0.05); ctx.lineTo(x + (k - 2) * rx * 0.08, cy - ry * 0.8); ctx.stroke();
      }
      break;
    case 8: // topete
      for (let k = -1; k <= 1; k++) {
        ctx.beginPath(); ctx.moveTo(px + k * s * 0.3, py);
        ctx.bezierCurveTo(px + k * s * 0.8, py - s * 1.2, px + k * s * 0.1 + s * 0.5, py - s * 1.5, px + k * s * 0.2 + s * 0.3, py - s * 0.9);
        ctx.stroke();
      }
      break;
    case 9: { // brilho
      const r = sorteador(Math.floor(e.pos * 1e6));
      for (let k = 0; k < 5; k++) {
        const x = cx + (r() * 2 - 1) * rx * 0.7, y = cy + (r() * 2 - 1) * ry * 0.6;
        const gr = ctx.createRadialGradient(x, y, 0, x, y, s * 0.5);
        gr.addColorStop(0, hsl(e.matiz, 1, 0.85, 0.95)); gr.addColorStop(1, hsl(e.matiz, 1, 0.85, 0));
        ctx.fillStyle = gr; ctx.beginPath(); ctx.arc(x, y, s * 0.5, 0, Math.PI * 2); ctx.fill();
      }
      break;
    }
  }
}

// ---------------------------------------------------------------- cabeçalho

function montarCabecalho() {
  const todas = Object.values(D.especies);
  const vivas = todas.filter((e) => e.extincao === null).length;
  $("#planeta").textContent = D.planeta;
  $("#resumo").innerHTML = `Dia ${D.periodo} &middot; ${D.populacao} criaturas &middot; ${vivas} espécies vivas &middot; ${todas.length - vivas} extintas`;
  $("#atualizado").textContent = "Última anotação: " + new Date(D.atualizado).toLocaleString("pt-BR");
  document.title = `${D.planeta}: Diário do Ecossistema`;

  const s = D.ultimo_resumo || {};
  if (s.nascimentos !== undefined) {
    $("#balanco").textContent = `Balanço do dia: ${s.nascimentos} nascimentos, ${s.fome} mortes de fome, ` +
      `${s.predacao} viraram almoço, ${s.velhice} de velhice` + (s.praga ? ` e ${s.praga} de praga.` : ".");
  }
  $("#eventos-ativos").innerHTML = D.eventos_ativos.map((ev) =>
    `<div class="evento-ativo"><strong>${esc(ev.nome)}</strong>${textoComNomes(ev.texto)}
     <small>(${ev.restam === 1 ? "último dia" : `faltam ${ev.restam} dias`})</small></div>`).join("");
}

// ---------------------------------------------------------------- mundo animado

function pintarFundo(ESC) {
  const c = document.createElement("canvas");
  c.width = D.largura * ESC; c.height = D.altura * ESC;
  const g = c.getContext("2d");
  g.fillStyle = "#f4ecd8"; g.fillRect(0, 0, c.width, c.height);
  const cel = D.cel * ESC;
  const r = sorteador(7);
  D.biomas.forEach((linha, cy) => linha.forEach((b, cx) => {
    const cor = BIOMAS[b].cor;
    for (let k = 0; k < 4; k++) {   // manchas suaves, tipo aquarela
      const x = (cx + 0.5 + (r() - 0.5) * 0.7) * cel, y = (cy + 0.5 + (r() - 0.5) * 0.7) * cel;
      const raio = cel * (0.75 + r() * 0.45);
      const grad = g.createRadialGradient(x, y, 0, x, y, raio);
      grad.addColorStop(0, cor); grad.addColorStop(0.6, cor + "cc"); grad.addColorStop(1, cor + "00");
      g.fillStyle = grad; g.beginPath(); g.arc(x, y, raio, 0, Math.PI * 2); g.fill();
    }
  }));
  g.strokeStyle = "rgba(120, 90, 60, 0.07)"; g.lineWidth = 1;
  for (let x = 0; x <= c.width; x += cel) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, c.height); g.stroke(); }
  for (let y = 0; y <= c.height; y += cel) { g.beginPath(); g.moveTo(0, y); g.lineTo(c.width, y); g.stroke(); }
  return c;
}

function montarMundo() {
  const tela = $("#tela");
  const ESC = 2;
  tela.width = D.largura * ESC; tela.height = D.altura * ESC;
  const ctx = tela.getContext("2d");
  const fundo = pintarFundo(ESC);

  const presentes = new Set(D.biomas.flat());
  $("#legenda").innerHTML = Object.entries(BIOMAS).filter(([k]) => presentes.has(k))
    .map(([, b]) => `<span><i style="background:${b.cor}"></i>${b.nome}</span>`).join("") +
    `<span><i style="background:#6f8f3a"></i>Comida</span>` +
    `<span><i style="background:#fff;border:2.5px solid #8b2f22"></i>Carnívoro</span>`;

  const quadros = D.quadros.map((q) => {
    const m = new Map();
    for (let i = 0; i < q.length; i += 3) m.set(q[i], [q[i + 1], q[i + 2]]);
    return m;
  });
  if (!quadros.length) quadros.push(new Map());

  let mouse = null;
  tela.addEventListener("mousemove", (ev) => {
    const r = tela.getBoundingClientRect();
    mouse = [((ev.clientX - r.left) / r.width) * D.largura, ((ev.clientY - r.top) / r.height) * D.altura];
  });
  tela.addEventListener("mouseleave", () => { mouse = null; });

  const FPS = 7, inicio = performance.now();

  function bicho(x, y, info, alfa) {
    const [, tam, matiz, sat, luz, dieta] = info;
    const raio = (1.2 + tam * 1.1) * ESC;
    ctx.globalAlpha = alfa;
    ctx.fillStyle = hsl(matiz, sat, luz);
    ctx.beginPath(); ctx.arc(x * ESC, y * ESC, raio, 0, Math.PI * 2); ctx.fill();
    ctx.lineWidth = dieta > 0.66 ? 2.5 : 1;
    ctx.strokeStyle = dieta > 0.66 ? "#8b2f22" : "rgba(58, 46, 36, 0.7)";
    ctx.stroke();
    ctx.globalAlpha = 1;
  }

  function quadro(agora) {
    const total = Math.max(1, quadros.length - 1);
    const pos = (((agora - inicio) / 1000) * FPS) % total;
    const i = Math.floor(pos), a = pos - i;
    const A = quadros[i], B = quadros[i + 1] || A;
    ctx.drawImage(fundo, 0, 0);

    ctx.fillStyle = "#6f8f3a";
    for (let k = 0; k < D.comida.length; k += 2) {
      ctx.beginPath(); ctx.arc(D.comida[k] * ESC, D.comida[k + 1] * ESC, 1.7, 0, Math.PI * 2); ctx.fill();
    }

    let perto = null, pertoD = 36;
    const considerar = (id, x, y) => {
      if (!mouse) return;
      const d = (x - mouse[0]) ** 2 + (y - mouse[1]) ** 2;
      if (d < pertoD) { pertoD = d; perto = { id, x, y }; }
    };
    for (const [id, p] of A) {
      const info = D.criaturas[id];
      if (!info) continue;
      const q = B.get(id);
      const x = q ? p[0] + (q[0] - p[0]) * a : p[0];
      const y = q ? p[1] + (q[1] - p[1]) * a : p[1];
      bicho(x, y, info, q ? 1 : 1 - a);  // sem próximo quadro = morreu, vai sumindo
      considerar(id, x, y);
    }
    for (const [id, q] of B) {
      if (A.has(id) || !D.criaturas[id]) continue;
      bicho(q[0], q[1], D.criaturas[id], a);  // filhote nascendo
    }

    if (perto) {
      const esp = D.criaturas[perto.id][0];
      const texto = rotulo(esp);
      ctx.font = "26px 'EB Garamond', Georgia, serif";
      const w = ctx.measureText(texto).width + 20;
      let x = perto.x * ESC + 14, y = perto.y * ESC - 44;
      if (x + w > tela.width) x = tela.width - w - 4;
      if (y < 4) y = perto.y * ESC + 14;
      ctx.fillStyle = "rgba(255, 250, 240, 0.95)"; ctx.strokeStyle = TINTA; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.rect(x, y, w, 36); ctx.fill(); ctx.stroke();
      ctx.fillStyle = TINTA; ctx.fillText(texto, x + 10, y + 26);
    }
    requestAnimationFrame(quadro);
  }
  requestAnimationFrame(quadro);
}

// ---------------------------------------------------------------- espécies

function grafico(id) {
  const pontos = D.pop_hist.map((h) => h.n[id] || 0);
  if (pontos.length < 2) return "";
  const max = Math.max(...pontos, 1);
  const W = 240, H = 34;
  const xy = pontos.map((v, i) => `${((i / (pontos.length - 1)) * W).toFixed(1)},${(H - 2 - (v / max) * (H - 4)).toFixed(1)}`);
  return `<svg class="grafico" viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" aria-label="População ao longo dos dias">
    <polyline points="${xy.join(" ")}" fill="none" stroke="#9a7b56" stroke-width="1.5" vector-effect="non-scaling-stroke"/></svg>`;
}

function cartao(e) {
  const div = document.createElement("article");
  div.className = "cartao";
  const nome = nomeDado(e.id);
  div.innerHTML = `
    <div class="retrato"></div>
    <h3><span class="numero">nº ${e.id}</span>${nome ? esc(nome) : `Sem nome <span class="selo">batize-me!</span>`}</h3>
    <p class="cientifico">${esc(cientifico(e))}</p>
    ${nome ? "" : `<p class="sugestao">Sugestão da naturalista: “${esc(e.apelido_sugerido)}”</p>`}
    <dl class="dados">
      <dt>População</dt><dd>${e.pop} <small>(recorde: ${e.pico})</small></dd>
      <dt>Idade</dt><dd>${dias(D.periodo - e.nascimento)}</dd>
      <dt>Dieta</dt><dd>${e.dieta}</dd>
      <dt>Origem</dt><dd>${origem(e)}</dd>
    </dl>
    <ul class="notas">${descricoes(e.retrato).map((t) => `<li>${esc(t)}</li>`).join("")}</ul>
    ${grafico(e.id)}`;
  const tela = document.createElement("canvas");
  tela.width = 360; tela.height = 260;
  desenharRetrato(tela, e.retrato);
  div.querySelector(".retrato").appendChild(tela);
  div.addEventListener("click", (ev) => { if (!ev.target.closest("a")) abrirFicha(e.id); });
  return div;
}

function montarEspecies() {
  const vivas = Object.values(D.especies).filter((e) => e.extincao === null).sort((a, b) => b.pop - a.pop);
  const lista = $("#lista-especies");
  lista.innerHTML = "";
  const semNome = vivas.filter((e) => !nomeDado(e.id)).length;
  $("#nota-especies").textContent = semNome === 0 ? "Todo mundo batizado. Que organização!"
    : semNome === 1 ? "1 espécie esperando batismo." : `${semNome} espécies esperando batismo.`;
  if (!vivas.length) lista.innerHTML = `<p class="nota">Ninguém vivo no momento. Um silêncio constrangedor.</p>`;
  for (const e of vivas) lista.appendChild(cartao(e));
}

// ---------------------------------------------------------------- linha do tempo

function montarHistoria() {
  const ol = $("#historia");
  const itens = [...D.historia].reverse();
  let filtro = "tudo", mostrar = 60;
  const passa = (h) => filtro === "tudo" || h.tipo === filtro ||
    (filtro === "evento" && ["evento", "fim_evento", "migracao", "inicio"].includes(h.tipo));
  function render() {
    const lista = itens.filter(passa);
    ol.innerHTML = lista.slice(0, mostrar).map((h) =>
      `<li class="h-${h.tipo}"><span class="dia">Dia ${h.periodo}</span><span class="icone">${ICONES[h.tipo] || "•"}</span>` +
      `<span class="texto">${textoComNomes(h.texto)}</span></li>`).join("") ||
      `<li><span class="texto">Nada anotado por aqui ainda.</span></li>`;
    $("#mais-historia").hidden = mostrar >= lista.length;
  }
  $("#mais-historia").onclick = () => { mostrar += 60; render(); };
  $("#filtros").onclick = (ev) => {
    const b = ev.target.closest("button");
    if (!b) return;
    document.querySelectorAll("#filtros button").forEach((x) => x.classList.toggle("ativo", x === b));
    filtro = b.dataset.f; mostrar = 60; render();
  };
  render();
}

// ---------------------------------------------------------------- árvore genealógica

function montarArvore() {
  const svg = $("#arvore-svg");
  const todas = Object.values(D.especies);
  const filhos = {};
  for (const e of todas) (filhos[e.pai ?? "raiz"] ||= []).push(e);
  for (const l of Object.values(filhos)) l.sort((a, b) => a.nascimento - b.nascimento || a.id - b.id);

  // ordem: cada espécie logo abaixo da mãe, com as irmãs em seguida
  const ordem = [];
  const pilha = [...(filhos.raiz || [])].reverse();
  while (pilha.length) {
    const e = pilha.pop();
    ordem.push(e);
    const f = filhos[e.id] || [];
    for (let i = f.length - 1; i >= 0; i--) pilha.push(f[i]);
  }

  const LINHA = 24, ESQ = 24, TOPO = 34;
  const total = Math.max(1, D.periodo);
  const pxDia = Math.max(5, Math.min(40, 720 / total));
  const W = ESQ + total * pxDia + 300, H = TOPO + ordem.length * LINHA + 12;
  const linhaDe = {};
  ordem.forEach((e, i) => { linhaDe[e.id] = i; });
  const X = (p) => ESQ + p * pxDia, Y = (i) => TOPO + i * LINHA + LINHA / 2;

  const partes = [];
  let passo = 1;
  for (const p of [1, 2, 5, 10, 20, 50, 100, 200, 500, 1000, 2000, 5000]) { passo = p; if (p * pxDia >= 70) break; }
  for (let d = 0; d <= total; d += passo) {
    partes.push(`<line x1="${X(d)}" x2="${X(d)}" y1="${TOPO - 10}" y2="${H}" stroke="rgba(90,70,50,.12)" stroke-dasharray="3 4"/>`);
    partes.push(`<text class="eixo" x="${X(d)}" y="${TOPO - 14}" text-anchor="middle">dia ${d}</text>`);
  }
  for (const e of ordem) {
    const viva = e.extincao === null;
    const y = Y(linhaDe[e.id]);
    const x0 = X(e.nascimento), x1 = Math.max(X(viva ? D.periodo : e.extincao), x0 + 4);
    const g = e.retrato;
    const cor = viva ? hsl(g.matiz, Math.max(0.35, g.saturacao), Math.min(0.45, g.luz)) : "#a39a8c";
    if (e.pai != null && linhaDe[e.pai] !== undefined) {
      partes.push(`<path d="M${x0} ${Y(linhaDe[e.pai])} V${y}" stroke="${cor}" stroke-width="1.5" fill="none" opacity=".8"/>`);
    }
    partes.push(`<line x1="${x0}" x2="${x1}" y1="${y}" y2="${y}" stroke="${cor}" stroke-width="${viva ? 5 : 3}" stroke-linecap="round"${viva ? "" : ' stroke-dasharray="6 3"'}/>`);
    partes.push(`<circle cx="${x0}" cy="${y}" r="3.5" fill="${cor}"/>`);
    partes.push(`<text class="rotulo${viva ? "" : " extinta"}" data-id="${e.id}" x="${x1 + 8}" y="${y + 5}">${viva ? "" : "† "}${esc(rotulo(e.id))}</text>`);
  }
  svg.setAttribute("width", W); svg.setAttribute("height", H);
  svg.setAttribute("viewBox", `0 0 ${W} ${H}`);
  svg.innerHTML = partes.join("");
  svg.onclick = (ev) => { const t = ev.target.closest("[data-id]"); if (t) abrirFicha(Number(t.dataset.id)); };
}

// ---------------------------------------------------------------- ficha

const ROTULOS_GENES = [
  ["tamanho", "Tamanho", 0.4, 4], ["velocidade", "Velocidade", 0.2, 3.5], ["visao", "Alcance da visão", 4, 70],
  ["metabolismo", "Metabolismo", 0.4, 2.5], ["dieta", "Dieta (planta até carne)", 0, 1],
  ["idade_reproducao", "Idade pra ter filhos", 15, 250], ["ninhada", "Filhotes por vez", 1, 5],
  ["espinhos", "Espinhos", 0, 1], ["patas", "Patas", 0, 12], ["olhos", "Olhos", 1, 9],
  ["antenas", "Antenas", 0, 4], ["cauda", "Cauda", 0, 1],
];

function abrirFicha(id) {
  const e = D.especies[id];
  if (!e) return;
  const nome = nomeDado(id);
  const g = e.retrato;
  const descendentes = Object.values(D.especies).filter((x) => x.pai === e.id);
  const genes = ROTULOS_GENES.map(([k, rot, min, max]) => {
    const v = g[k], pct = Math.max(2, Math.min(100, ((v - min) / (max - min)) * 100));
    const valor = ["patas", "olhos", "antenas", "ninhada"].includes(k) ? Math.round(v) : v.toFixed(2);
    return `<span>${rot} <small>(${valor})</small></span><div class="barra"><span style="width:${pct}%"></span></div>`;
  }).join("");
  $("#ficha-conteudo").innerHTML = `
    <div class="ficha-topo">
      <div class="retrato"></div>
      <div>
        <p class="numero" style="float:none">nº ${e.id}</p>
        <h3>${nome ? esc(nome) : "Sem nome"}</h3>
        <p class="cientifico">${esc(cientifico(e))}</p>
        ${nome ? "" : `<p class="sugestao">Sugestão: “${esc(e.apelido_sugerido)}”</p>`}
        <dl class="dados">
          <dt>Situação</dt><dd>${e.extincao === null ? `Viva, ${e.pop} indivíduos` : `Extinta no dia ${e.extincao}`}</dd>
          <dt>Surgiu</dt><dd>Dia ${e.nascimento}</dd>
          <dt>Recorde</dt><dd>${e.pico} indivíduos</dd>
          <dt>Dieta</dt><dd>${e.dieta}</dd>
          <dt>Origem</dt><dd>${origem(e)}</dd>
          <dt>Filhas</dt><dd>${descendentes.length ? descendentes.map((x) => linkEsp(x.id)).join(", ") : "nenhuma (ainda)"}</dd>
        </dl>
      </div>
    </div>
    <ul class="notas">${descricoes(g, 5).map((t) => `<li>${esc(t)}</li>`).join("")}</ul>
    <div class="genes">${genes}<span>Enfeites</span><span>${g.enfeites.length}</span></div>`;
  const tela = document.createElement("canvas");
  tela.width = 480; tela.height = 350;
  desenharRetrato(tela, g);
  $("#ficha-conteudo .retrato").appendChild(tela);
  const dlg = $("#ficha");
  if (!dlg.open) dlg.showModal();
  dlg.scrollTop = 0;
}

// ---------------------------------------------------------------- começo de tudo

async function iniciar() {
  try {
    const r = await fetch("diario.json?v=" + Date.now());
    if (!r.ok) throw new Error();
    D = await r.json();
  } catch (e) {
    $("#planeta").textContent = "Planeta ainda não descoberto";
    $("#resumo").textContent = "Rode a simulação pelo menos uma vez (avancar.bat) e recarregue esta página.";
    return;
  }
  try {
    const r = await fetch("nomes.json?v=" + Date.now());
    if (r.ok) NOMES = await r.json();
  } catch (e) {
    aviso("O arquivo nomes.json tem algum errinho de digitação (talvez uma vírgula ou aspas faltando). " +
      "Os nomes que você deu não vão aparecer até ele ser corrigido.");
  }

  document.addEventListener("click", (ev) => {
    const a = ev.target.closest(".link-esp");
    if (a) { ev.preventDefault(); abrirFicha(Number(a.dataset.id)); }
  });
  const dlg = $("#ficha");
  dlg.querySelector(".fechar").onclick = () => dlg.close();
  dlg.addEventListener("click", (ev) => { if (ev.target === dlg) dlg.close(); });

  montarCabecalho();
  montarMundo();
  montarEspecies();
  montarHistoria();
  montarArvore();
}

iniciar();
