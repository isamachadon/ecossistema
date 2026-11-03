// app.js: o "pintor" do site.
// Lê o diario.json (que a simulação escreve) e o nomes.json (que você edita)
// e desenha tudo: o mundo ao vivo, os retratos, a linha do tempo e a árvore.

"use strict";

const BIOMAS = {
  campo:    { nome: "Campo",    cor: "#dbe2ae", fert: 1.0 },
  floresta: { nome: "Floresta", cor: "#a8c992", fert: 1.6 },
  pantano:  { nome: "Pântano",  cor: "#acd1c8", fert: 1.2 },
  deserto:  { nome: "Deserto",  cor: "#efd7a0", fert: 0.25 },
  tundra:   { nome: "Tundra",   cor: "#e3eaef", fert: 0.45 },
};
const TIPOS_HIST = {
  inicio:       { nome: "Começo",      cor: "#4f87a3" },
  especie_nova: { nome: "Espécie nova", cor: "#2f6b45" },
  extincao:     { nome: "Extinção",    cor: "#7d8a80" },
  evento:       { nome: "Evento",      cor: "#c2522b" },
  fim_evento:   { nome: "Fim de evento", cor: "#c98f1f" },
  migracao:     { nome: "Migração",    cor: "#4f87a3" },
};
const TINTA = "#17241c";

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
const tom = (g) => hsl(g.matiz, Math.min(0.5, g.saturacao * 0.6), 0.9);
const numero = (id) => "Nº " + String(id).padStart(4, "0");

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
function rotuloCurto(id) { return nomeDado(id) || numero(id); }
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
  const r = sorteador(hashGenes(g) ^ 99);  // embaralha de um jeito fixo pra cada genoma
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
  ctx.fillStyle = "rgba(23, 36, 28, 0.14)";
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
    ctx.fillStyle = "#14100c";
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
  $("#kicker").textContent = D.semente !== undefined ? `Planeta nº ${D.semente}` : "Planeta";
  $("#dia-topo").textContent = `Dia ${D.periodo}`;
  $("#st-dia").textContent = D.periodo;
  $("#st-pop").textContent = D.populacao;
  $("#st-vivas").textContent = vivas;
  $("#st-extintas").textContent = todas.length - vivas;
  $("#atualizado").textContent = "Última anotação em " + new Date(D.atualizado).toLocaleString("pt-BR");
  document.title = `${D.planeta} · Diário do Ecossistema`;

  const s = D.ultimo_resumo || {};
  if (s.nascimentos !== undefined) {
    $("#balanco").textContent = `Balanço do último dia: ${s.nascimentos} nascimentos · ${s.fome} de fome · ` +
      `${s.predacao} viraram almoço · ${s.velhice} de velhice` + (s.praga ? ` · ${s.praga} de praga` : "");
  }
  $("#eventos-ativos").innerHTML = D.eventos_ativos.map((ev) =>
    `<div class="evento-ativo"><span class="tag">${ev.restam === 1 ? "Último dia" : `Faltam ${ev.restam} dias`}</span>
     <strong>${esc(ev.nome)}</strong><p>${textoComNomes(ev.texto)}</p></div>`).join("");
}

// ---------------------------------------------------------------- mundo ao vivo
// Uma mini simulação de comportamento que roda no navegador, começando da última
// "foto" do planeta. Os bichos procuram comida, caçam, fogem e descansam, sem parar.

function montarMundo() {
  const janela = $("#janela"), tela = $("#tela"), ctx = tela.getContext("2d");
  const LW = D.largura, LH = D.altura, CEL = D.cel;
  const COLS = D.biomas[0].length, LINHAS = D.biomas.length;
  const rnd = sorteador(D.periodo * 7919 + 13);

  const presentes = new Set(D.biomas.flat());
  $("#legenda").innerHTML = Object.entries(BIOMAS).filter(([k]) => presentes.has(k))
    .map(([, b]) => `<span><i style="background:${b.cor}"></i>${b.nome}</span>`).join("");

  // --- os retratos de cada espécie viram "figurinhas" pra desenhar no mapa
  const sprites = new Map();
  function sprite(esp) {
    let s = sprites.get(esp);
    if (!s) {
      s = document.createElement("canvas");
      s.width = 180; s.height = 132;
      if (D.especies[esp]) desenharRetrato(s, D.especies[esp].retrato);
      sprites.set(esp, s);
    }
    return s;
  }

  // --- os bichos, a partir da última foto
  const foto = D.quadros.length ? D.quadros[D.quadros.length - 1] : [];
  const bichos = [];
  for (let i = 0; i < foto.length; i += 3) {
    const info = D.criaturas[foto[i]];
    if (!info) continue;
    const [esp, tam, matiz, sat, luz, dieta, vel = 1, visao = 20] = info;
    bichos.push({
      id: foto[i], esp, tam, matiz, sat, luz, dieta, vel, visao,
      x: foto[i + 1], y: foto[i + 2], px: foto[i + 1], py: foto[i + 2],
      ang: rnd() * Math.PI * 2, flip: rnd() < 0.5, fase: rnd() * 6, andou: 0,
      estado: "", ameaca: null, presa: null, prato: null,
      descanso: 0, saciado: Math.floor(rnd() * 80), impulso: 0,
    });
  }

  // --- a comida (brotinhos)
  let comida = [];
  for (let k = 0; k < D.comida.length; k += 2) comida.push({ x: D.comida[k], y: D.comida[k + 1], t: -1e9 });
  const META_COMIDA = Math.max(200, comida.length);
  const pesos = [];
  let somaPesos = 0;
  D.biomas.forEach((linha, cy) => linha.forEach((b, cx) => { somaPesos += BIOMAS[b].fert; pesos.push([somaPesos, cx, cy]); }));
  function brotar(agora) {
    const r = rnd() * somaPesos;
    const p = pesos.find((q) => q[0] >= r) || pesos[pesos.length - 1];
    comida.push({ x: (p[1] + rnd()) * CEL, y: (p[2] + rnd()) * CEL, t: agora });
  }

  // --- o cenário: cores suaves dos biomas + desenhos nítidos (árvores, capim, juncos...)
  const mapaCores = document.createElement("canvas");
  mapaCores.width = COLS; mapaCores.height = LINHAS;
  const mc = mapaCores.getContext("2d");
  D.biomas.forEach((linha, cy) => linha.forEach((b, cx) => { mc.fillStyle = BIOMAS[b].cor; mc.fillRect(cx, cy, 1, 1); }));
  const fundo = document.createElement("canvas");
  fundo.width = LW * 4; fundo.height = LH * 4;
  const fc = fundo.getContext("2d");
  fc.imageSmoothingEnabled = true; fc.imageSmoothingQuality = "high";
  fc.drawImage(mapaCores, -0.5 * (fundo.width / COLS), -0.5 * (fundo.height / LINHAS),
    fundo.width * (COLS + 1) / COLS, fundo.height * (LINHAS + 1) / LINHAS);
  const rf = sorteador(99);
  for (let k = 0; k < 2500; k++) {   // textura de terra
    fc.fillStyle = `rgba(23, 36, 28, ${0.02 + rf() * 0.04})`;
    fc.beginPath(); fc.arc(rf() * fundo.width, rf() * fundo.height, 1 + rf() * 3, 0, Math.PI * 2); fc.fill();
  }

  const decor = [];
  const QTD = { floresta: 5, campo: 3, pantano: 3, deserto: 2, tundra: 3 };
  D.biomas.forEach((linha, cy) => linha.forEach((b, cx) => {
    for (let i = 0; i < QTD[b]; i++) decor.push({ b, x: (cx + rf()) * CEL, y: (cy + rf()) * CEL, s: 0.7 + rf() * 0.6, v: rf() });
  }));
  decor.sort((a, b) => a.y - b.y);

  function desenharDecor(d, px) {
    const s = d.s;
    ctx.lineWidth = px * 1.1;
    ctx.strokeStyle = "rgba(23, 36, 28, 0.55)";
    if (d.b === "floresta") {
      ctx.fillStyle = "#7a5a3a";
      ctx.fillRect(d.x - 0.6 * s, d.y - 3 * s, 1.2 * s, 3 * s);
      ctx.fillStyle = d.v < 0.5 ? "#4f8a52" : "#679c5d";
      for (const [ox, oy, r] of [[-1.6, -4.2, 2.4], [1.6, -4.2, 2.4], [0, -5.8, 2.8]]) {
        ctx.beginPath(); ctx.arc(d.x + ox * s, d.y + oy * s, r * s, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      }
    } else if (d.b === "campo") {
      ctx.strokeStyle = "#7f9a4c"; ctx.lineWidth = px * 1.4;
      for (const k of [-1, 0, 1]) {
        ctx.beginPath(); ctx.moveTo(d.x + k * 0.6 * s, d.y); ctx.lineTo(d.x + k * 1.4 * s, d.y - 2.4 * s); ctx.stroke();
      }
      if (d.v > 0.8) {
        ctx.fillStyle = d.v > 0.9 ? "#e8a33d" : "#d9667b";
        ctx.beginPath(); ctx.arc(d.x + 1.6 * s, d.y - 1.2 * s, 0.7 * s, 0, Math.PI * 2); ctx.fill();
      }
    } else if (d.b === "pantano") {
      if (d.v < 0.45) {
        ctx.strokeStyle = "rgba(60, 120, 130, 0.45)";
        ctx.beginPath(); ctx.ellipse(d.x, d.y, 3 * s, 1 * s, 0, 0, Math.PI * 2); ctx.stroke();
      } else {
        ctx.strokeStyle = "#5f8a5a"; ctx.lineWidth = px * 1.3;
        for (const k of [-1, 0.2, 1.1]) {
          ctx.beginPath(); ctx.moveTo(d.x + k * s, d.y); ctx.lineTo(d.x + k * 1.2 * s, d.y - 4 * s); ctx.stroke();
        }
        ctx.fillStyle = "#7a5233";
        ctx.beginPath(); ctx.ellipse(d.x + 0.25 * s, d.y - 3.6 * s, 0.45 * s, 1 * s, 0, 0, Math.PI * 2); ctx.fill();
      }
    } else if (d.b === "deserto") {
      if (d.v > 0.75) {
        ctx.fillStyle = "#6f9a58";
        ctx.beginPath(); ctx.roundRect(d.x - 0.8 * s, d.y - 4.5 * s, 1.6 * s, 4.5 * s, 0.8 * s); ctx.fill(); ctx.stroke();
        ctx.beginPath(); ctx.roundRect(d.x + 0.8 * s, d.y - 3.2 * s, 1.4 * s, 1 * s, 0.5 * s); ctx.fill(); ctx.stroke();
      } else {
        ctx.strokeStyle = "rgba(170, 120, 50, 0.45)"; ctx.lineWidth = px * 1.4;
        ctx.beginPath(); ctx.arc(d.x, d.y + 2 * s, 3.4 * s, Math.PI * 1.15, Math.PI * 1.85); ctx.stroke();
      }
    } else if (d.b === "tundra") {
      if (d.v < 0.45) {
        ctx.fillStyle = "#b9c0c4";
        ctx.beginPath(); ctx.ellipse(d.x, d.y - 0.8 * s, 2 * s, 1.2 * s, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      } else {
        ctx.strokeStyle = "rgba(90, 130, 160, 0.55)";
        for (let k = 0; k < 3; k++) {
          const a = (k * Math.PI) / 3;
          ctx.beginPath();
          ctx.moveTo(d.x - Math.cos(a) * 1.2 * s, d.y - Math.sin(a) * 1.2 * s);
          ctx.lineTo(d.x + Math.cos(a) * 1.2 * s, d.y + Math.sin(a) * 1.2 * s); ctx.stroke();
        }
      }
    }
  }

  // --- câmera
  const cam = { x: LW / 2, y: LH / 2, zoom: 1, zoomAlvo: 1 };
  let W = 0, H = 0, dpr = 1, base = 1;
  const escala = () => base * cam.zoom;
  function limitarCam() {
    const s = escala(), mw = W / s / 2, mh = H / s / 2;
    cam.x = mw * 2 >= LW ? LW / 2 : Math.min(Math.max(cam.x, mw), LW - mw);
    cam.y = mh * 2 >= LH ? LH / 2 : Math.min(Math.max(cam.y, mh), LH - mh);
  }
  function medir() {
    const r = janela.getBoundingClientRect();
    dpr = window.devicePixelRatio || 1;
    W = r.width; H = r.height;
    tela.width = Math.round(W * dpr); tela.height = Math.round(H * dpr);
    base = Math.max(W / LW, H / LH);
    limitarCam();
  }
  new ResizeObserver(medir).observe(janela);
  medir();
  const paraMundo = (sx, sy) => [(sx - W / 2) / escala() + cam.x, (sy - H / 2) / escala() + cam.y];
  const paraTela = (x, y) => [(x - cam.x) * escala() + W / 2, (y - cam.y) * escala() + H / 2];
  const tamFigura = (b) => 8 + b.tam * 4.5;   // largura da figurinha, em unidades do mundo

  function zoomEm(fator, sx = W / 2, sy = H / 2) {
    const [mx, my] = paraMundo(sx, sy);
    cam.zoom = cam.zoomAlvo = Math.min(7, Math.max(1, cam.zoom * fator));
    cam.x = mx - (sx - W / 2) / escala();
    cam.y = my - (sy - H / 2) / escala();
    limitarCam();
  }

  // --- seguir um bicho
  let seguindo = null, painelRelogio = 0;
  function bichoEm(sx, sy) {
    let melhor = null, melhorD = Infinity;
    for (const b of bichos) {
      const [tx, ty] = paraTela(b.x, b.y);
      const r = Math.max(10, (tamFigura(b) * escala()) / 2);
      const d = Math.hypot(tx - sx, ty - r * 0.5 - sy);
      if (d < r && d < melhorD) { melhor = b; melhorD = d; }
    }
    return melhor;
  }
  function seguir(b) {
    seguindo = b;
    $("#painel").hidden = !b;
    if (!b) return;
    if (cam.zoom < 3) cam.zoomAlvo = 3.2;
    const e = D.especies[b.esp];
    const t = document.createElement("canvas");
    t.width = 360; t.height = 230;
    desenharRetrato(t, e.retrato);
    const caixa = $("#p-retrato");
    caixa.innerHTML = "";
    caixa.style.background = tom(e.retrato);
    caixa.appendChild(t);
    $("#p-etq").textContent = `${numero(b.esp)} · ${e.dieta}`;
    $("#p-nome").textContent = nomeDado(b.esp) || "Sem nome";
    $("#p-cient").textContent = cientifico(e);
    $("#p-estado").textContent = b.estado;
  }
  $("#p-fechar").onclick = () => seguir(null);
  $("#p-ficha").onclick = () => seguindo && abrirFicha(seguindo.esp);

  // --- mouse, toque e botões
  let arrasto = null, mouse = null;
  tela.addEventListener("pointerdown", (ev) => {
    tela.setPointerCapture(ev.pointerId);
    arrasto = { x: ev.offsetX, y: ev.offsetY, cx: cam.x, cy: cam.y, moveu: false };
  });
  tela.addEventListener("pointermove", (ev) => {
    mouse = [ev.offsetX, ev.offsetY];
    if (!arrasto) return;
    const dx = ev.offsetX - arrasto.x, dy = ev.offsetY - arrasto.y;
    if (Math.abs(dx) + Math.abs(dy) > 5) { arrasto.moveu = true; tela.classList.add("arrastando"); }
    if (arrasto.moveu) {
      seguindo = null; $("#painel").hidden = true;
      cam.x = arrasto.cx - dx / escala(); cam.y = arrasto.cy - dy / escala();
      limitarCam();
    }
  });
  tela.addEventListener("pointerup", (ev) => {
    if (arrasto && !arrasto.moveu) seguir(bichoEm(ev.offsetX, ev.offsetY));
    arrasto = null; tela.classList.remove("arrastando");
  });
  tela.addEventListener("pointerleave", () => { mouse = null; });
  tela.addEventListener("wheel", (ev) => {
    ev.preventDefault();
    zoomEm(Math.exp(-ev.deltaY * 0.0015), ev.offsetX, ev.offsetY);
  }, { passive: false });

  let velocidade = 1, pausado = false;
  $("#bt-pausa").onclick = () => {
    pausado = !pausado;
    $("#bt-pausa").textContent = pausado ? "▶" : "❚❚";
    $("#bt-pausa").title = pausado ? "Continuar" : "Pausar";
    $(".ao-vivo").classList.toggle("pausado", pausado);
  };
  document.querySelectorAll(".controles [data-vel]").forEach((bt) => {
    bt.onclick = () => {
      velocidade = Number(bt.dataset.vel);
      document.querySelectorAll(".controles [data-vel]").forEach((x) => x.classList.toggle("ativo", x === bt));
    };
  });
  $("#bt-mais").onclick = () => zoomEm(1.5);
  $("#bt-menos").onclick = () => zoomEm(1 / 1.5);
  $("#bt-centro").onclick = () => { seguir(null); cam.zoom = cam.zoomAlvo = 1; limitarCam(); };

  // --- balõezinhos ("nham", "nhac!", "!")
  const baloes = [];
  function balao(b, texto, cor, agora) {
    if (baloes.length > 30) return;
    baloes.push({ b, texto, cor, t: agora });
  }

  // --- o cérebro dos bichos
  const TIQUE = 1 / 15;
  let tique = 0;
  let grade = new Map(), gradeComida = new Map();
  const chave = (gx, gy) => gx * 64 + gy;
  function vizinhos(mapa, x, y, r, fn) {
    const x0 = Math.floor((x - r) / CEL), x1 = Math.floor((x + r) / CEL);
    const y0 = Math.floor((y - r) / CEL), y1 = Math.floor((y + r) / CEL);
    for (let gx = x0; gx <= x1; gx++) for (let gy = y0; gy <= y1; gy++) {
      const l = mapa.get(chave(gx, gy));
      if (l) for (const o of l) fn(o);
    }
  }

  function pensar(b) {
    const v2 = b.visao * b.visao;
    let dA = v2 * 0.3, dP = v2, dC = v2;
    b.ameaca = null; b.presa = null; b.prato = null;
    vizinhos(grade, b.x, b.y, b.visao, (o) => {
      if (o === b || o.esp === b.esp) return;
      const d2 = (o.x - b.x) ** 2 + (o.y - b.y) ** 2;
      if (d2 > v2) return;
      // predador de barriga cheia não assusta ninguém
      if (o.dieta > 0.5 && o.tam > b.tam && o.descanso <= 0 && d2 < dA) { dA = d2; b.ameaca = o; }
      if (b.dieta > 0.3 && b.descanso <= 0 && o.tam < b.tam * 1.3 && d2 < dP) { dP = d2; b.presa = o; }
    });
    if (b.dieta < 0.9 && b.saciado <= 0) {
      vizinhos(gradeComida, b.x, b.y, b.visao, (c) => {
        if (c.comida) return;
        const d2 = (c.x - b.x) ** 2 + (c.y - b.y) ** 2;
        if (d2 < dC) { dC = d2; b.prato = c; }
      });
    }
    if (b.presa && b.prato) {   // onívoro escolhe o que compensa mais
      if ((1 - b.dieta) / Math.sqrt(dC + 1) > b.dieta / Math.sqrt(dP + 1)) b.presa = null;
      else b.prato = null;
    }
  }

  function passo(agora) {
    grade = new Map();
    for (const b of bichos) {
      const k = chave(Math.floor(b.x / CEL), Math.floor(b.y / CEL));
      (grade.get(k) || grade.set(k, []).get(k)).push(b);
    }
    gradeComida = new Map();
    for (const c of comida) {
      const k = chave(Math.floor(c.x / CEL), Math.floor(c.y / CEL));
      (gradeComida.get(k) || gradeComida.set(k, []).get(k)).push(c);
    }

    for (const b of bichos) {
      b.px = b.x; b.py = b.y;
      if (b.descanso > 0) b.descanso--;
      if (b.saciado > 0) b.saciado--;
      if (b.impulso > 0) b.impulso--;
      if ((tique + b.id) % 4 === 0) pensar(b);

      let rapidez = b.vel * 0.9, rumo = null;
      const alcance = 1.5 + b.tam;
      if (b.ameaca) {
        const a = b.ameaca;
        rumo = Math.atan2(b.y - a.y, b.x - a.x);
        rapidez *= 1.1;
        if (!b.estado.startsWith("Fugindo")) balao(b, "!", "#c2522b", agora);
        b.estado = `Fugindo de ${rotuloCurto(a.esp)}`;
      } else if (b.presa) {
        const p = b.presa;
        rumo = Math.atan2(p.y - b.y, p.x - b.x);
        rapidez *= 1.2;
        b.estado = `Caçando ${rotuloCurto(p.esp)}`;
        if (Math.hypot(p.x - b.x, p.y - b.y) < alcance + 1) {
          balao(b, "nhac!", "#c2522b", agora);
          balao(p, "ufa!", "#4f87a3", agora);
          b.descanso = 150 + Math.floor(rnd() * 120);
          p.impulso = 25;
          p.ang = Math.atan2(p.y - b.y, p.x - b.x);
          b.presa = null;
        }
      } else if (b.prato && !b.prato.comida) {
        const c = b.prato;
        rumo = Math.atan2(c.y - b.y, c.x - b.x);
        rapidez = Math.min(rapidez, Math.hypot(c.x - b.x, c.y - b.y));
        b.estado = "Indo comer um brotinho";
        if (Math.hypot(c.x - b.x, c.y - b.y) < alcance) {
          c.comida = true;
          b.saciado = 60 + Math.floor(rnd() * 140);
          b.prato = null;
          if (rnd() < 0.35) balao(b, "nham", "#2f6b45", agora);
        }
      } else {
        b.prato = null;
        rapidez *= 0.45;
        if (b.descanso > 0) { rapidez *= 0.25; b.estado = "De barriga cheia, cochilando"; }
        else if (b.saciado > 0) b.estado = "Passeando, sem pressa nenhuma";
        else b.estado = "Procurando o que comer";
        b.ang += (rnd() - 0.5) * 0.6;
      }
      if (rumo !== null) {   // vira aos pouquinhos, não de uma vez
        let d = rumo - b.ang;
        d = Math.atan2(Math.sin(d), Math.cos(d));
        b.ang += d * 0.5;
      }
      if (b.impulso > 0) rapidez *= 1.8;

      b.x += Math.cos(b.ang) * rapidez;
      b.y += Math.sin(b.ang) * rapidez;
      if (b.x < 1 || b.x > LW - 1) { b.ang = Math.PI - b.ang; b.x = Math.min(Math.max(b.x, 1), LW - 1); }
      if (b.y < 2 || b.y > LH - 1) { b.ang = -b.ang; b.y = Math.min(Math.max(b.y, 2), LH - 1); }
      const andou = Math.hypot(b.x - b.px, b.y - b.py);
      b.andou = andou;
      b.fase += andou * 0.9;
      if (Math.abs(b.x - b.px) > 0.05) b.flip = b.x < b.px;
    }

    comida = comida.filter((c) => !c.comida);
    if (comida.length < META_COMIDA && rnd() < 0.7) brotar(agora);
    tique++;
  }

  // --- desenho
  function desenhar(agora, alfa) {
    const s = escala(), px = 1 / s;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.fillStyle = "#e2e3c4"; ctx.fillRect(0, 0, W, H);
    ctx.setTransform(dpr * s, 0, 0, dpr * s, dpr * (W / 2 - cam.x * s), dpr * (H / 2 - cam.y * s));
    ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = "high";
    ctx.drawImage(fundo, 0, 0, LW, LH);

    const [x0, y0] = paraMundo(-20, -20), [x1, y1] = paraMundo(W + 20, H + 40);
    const dentro = (x, y, m = 0) => x > x0 - m && x < x1 + m && y > y0 - m && y < y1 + m;

    ctx.globalAlpha = 0.75;   // cenário mais discreto, pros bichos aparecerem
    for (const d of decor) if (dentro(d.x, d.y, 8)) desenharDecor(d, px);
    ctx.globalAlpha = 1;

    // brotinhos de comida
    for (const c of comida) {
      if (!dentro(c.x, c.y)) continue;
      const k = Math.min(1, (agora - c.t) / 700);
      if (k <= 0) continue;
      ctx.strokeStyle = "#4c7a34"; ctx.lineWidth = Math.max(px, 0.25);
      ctx.beginPath(); ctx.moveTo(c.x, c.y); ctx.lineTo(c.x, c.y - 1.2 * k); ctx.stroke();
      ctx.fillStyle = "#6aa84a";
      ctx.beginPath(); ctx.ellipse(c.x - 0.6 * k, c.y - 1.3 * k, 0.75 * k, 0.4 * k, -0.5, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.ellipse(c.x + 0.6 * k, c.y - 1.4 * k, 0.75 * k, 0.4 * k, 0.5, 0, Math.PI * 2); ctx.fill();
    }

    // bichos, de trás pra frente (quem está mais embaixo fica na frente)
    const visiveis = bichos.filter((b) => dentro(b.x, b.y, 10)).sort((a, b) => a.y - b.y);
    for (const b of visiveis) {
      const x = b.px + (b.x - b.px) * alfa, y = b.py + (b.y - b.py) * alfa;
      const larg = tamFigura(b), alt = (larg * 132) / 180;
      if (b === seguindo) {
        ctx.strokeStyle = "rgba(194, 82, 43, 0.5)"; ctx.lineWidth = px * 1.5;
        ctx.setLineDash([px * 6, px * 5]);
        ctx.beginPath(); ctx.arc(x, y, b.visao, 0, Math.PI * 2); ctx.stroke();
        ctx.setLineDash([]);
        ctx.strokeStyle = "#c2522b"; ctx.lineWidth = px * 2.5;
        ctx.beginPath(); ctx.ellipse(x, y - alt * 0.1, larg * 0.45, larg * 0.14, 0, 0, Math.PI * 2); ctx.stroke();
      } else if (b.dieta > 0.66) {
        ctx.strokeStyle = "rgba(194, 82, 43, 0.85)"; ctx.lineWidth = px * 1.5;
        ctx.beginPath(); ctx.ellipse(x, y - alt * 0.1, larg * 0.4, larg * 0.12, 0, 0, Math.PI * 2); ctx.stroke();
      }
      if (larg * s < 9) {   // de muito longe vira bolinha
        ctx.fillStyle = hsl(b.matiz, b.sat, b.luz);
        ctx.beginPath(); ctx.arc(x, y - larg * 0.3, larg * 0.35, 0, Math.PI * 2); ctx.fill();
        continue;
      }
      const pulo = b.andou > 0.05 ? Math.abs(Math.sin(b.fase)) * alt * 0.09 : Math.sin(agora / 600 + b.id) * alt * 0.015;
      ctx.save();
      ctx.translate(x, y - pulo);
      if (b.flip) ctx.scale(-1, 1);
      ctx.rotate(b.andou > 0.05 ? Math.sin(b.fase) * 0.06 : 0);
      ctx.drawImage(sprite(b.esp), -larg / 2, -alt * 0.84, larg, alt);
      ctx.restore();
    }

    // daqui pra baixo, coisas desenhadas em pixels da tela
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    for (let i = baloes.length - 1; i >= 0; i--) {
      const bl = baloes[i], idade = (agora - bl.t) / 1100;
      if (idade >= 1) { baloes.splice(i, 1); continue; }
      const [tx, ty] = paraTela(bl.b.x, bl.b.y);
      const y = ty - tamFigura(bl.b) * escala() * 0.7 - 10 - idade * 18;
      ctx.globalAlpha = 1 - idade * idade;
      ctx.font = "600 13px 'Instrument Sans', system-ui, sans-serif";
      const w = ctx.measureText(bl.texto).width + 14;
      ctx.fillStyle = "#fbf8f1"; ctx.strokeStyle = bl.cor; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.roundRect(tx - w / 2, y - 12, w, 22, 11); ctx.fill(); ctx.stroke();
      ctx.fillStyle = bl.cor; ctx.textAlign = "center"; ctx.fillText(bl.texto, tx, y + 4);
      ctx.textAlign = "start"; ctx.globalAlpha = 1;
    }

    // etiqueta de quem está debaixo do mouse
    const sob = mouse && !arrasto ? bichoEm(mouse[0], mouse[1]) : null;
    tela.classList.toggle("sobre-bicho", !!sob);
    if (sob && sob !== seguindo) {
      const [tx, ty] = paraTela(sob.x, sob.y);
      const texto = nomeDado(sob.esp) || `Sem nome · ${numero(sob.esp)}`;
      ctx.font = "500 13px 'Instrument Sans', system-ui, sans-serif";
      const w = ctx.measureText(texto).width + 20;
      let lx = tx - w / 2, ly = ty - tamFigura(sob) * escala() * 0.75 - 34;
      lx = Math.min(Math.max(lx, 6), W - w - 6);
      if (ly < 6) ly = ty + 10;
      ctx.fillStyle = "rgba(23, 36, 28, 0.92)";
      ctx.beginPath(); ctx.roundRect(lx, ly, w, 26, 13); ctx.fill();
      ctx.fillStyle = "#f3eee3"; ctx.fillText(texto, lx + 10, ly + 17);
    }
  }

  // --- o relógio
  let acumulado = 0, ultimoT = performance.now(), visivel = true;
  new IntersectionObserver((es) => { visivel = es[0].isIntersecting; }).observe(janela);
  function quadro(agora) {
    const dt = Math.min(0.25, (agora - ultimoT) / 1000);
    ultimoT = agora;
    if (visivel) {
      if (!pausado) {
        acumulado += dt * velocidade;
        while (acumulado >= TIQUE) { passo(agora); acumulado -= TIQUE; }
      }
      if (cam.zoom !== cam.zoomAlvo) {
        cam.zoom += (cam.zoomAlvo - cam.zoom) * 0.12;
        if (Math.abs(cam.zoomAlvo - cam.zoom) < 0.01) cam.zoom = cam.zoomAlvo;
      }
      if (seguindo) {
        cam.x += (seguindo.x - cam.x) * 0.1;
        cam.y += (seguindo.y - cam.y) * 0.1;
      }
      limitarCam();
      desenhar(agora, pausado ? 1 : acumulado / TIQUE);
      if (seguindo && agora - painelRelogio > 250) {
        $("#p-estado").textContent = seguindo.estado;
        painelRelogio = agora;
      }
    }
    requestAnimationFrame(quadro);
  }
  requestAnimationFrame(quadro);
}

// ---------------------------------------------------------------- espécies

function grafico(id, cor) {
  const pontos = D.pop_hist.map((h) => h.n[id] || 0);
  if (pontos.length < 2) return "";
  const max = Math.max(...pontos, 1);
  const W = 240, H = 36;
  const xy = pontos.map((v, i) => [(i / (pontos.length - 1)) * W, H - 2 - (v / max) * (H - 6)]);
  const linha = xy.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(" ");
  return `<svg class="grafico" viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" aria-label="População ao longo dos dias">
    <polygon points="0,${H} ${linha} ${W},${H}" fill="${cor}" opacity=".18"/>
    <polyline points="${linha}" fill="none" stroke="${cor}" stroke-width="1.6" vector-effect="non-scaling-stroke"/></svg>`;
}

function cartao(e) {
  const div = document.createElement("article");
  div.className = "cartao";
  const nome = nomeDado(e.id);
  const g = e.retrato;
  div.innerHTML = `
    <div class="retrato" style="--tom:${tom(g)}">
      <span class="etiqueta">${numero(e.id)} · ${e.dieta}</span>
      ${nome ? "" : `<span class="selo">Batize-me</span>`}
    </div>
    <div class="corpo">
      <h3 class="${nome ? "" : "sem-nome"}">${nome ? esc(nome) : "Sem nome"}</h3>
      <p class="cientifico">${esc(cientifico(e))}</p>
      ${nome ? "" : `<p class="sugestao">Sugestão: <b>${esc(e.apelido_sugerido)}</b></p>`}
      <div class="numeros">
        <div><b>${e.pop}</b><span>População</span></div>
        <div><b>${e.pico}</b><span>Recorde</span></div>
        <div><b>${D.periodo - e.nascimento}</b><span>Dias</span></div>
      </div>
      <p class="origem">${origem(e)}</p>
      <ul class="notas">${descricoes(g).map((t) => `<li>${esc(t)}</li>`).join("")}</ul>
      ${grafico(e.id, hsl(g.matiz, Math.max(0.4, g.saturacao), 0.38))}
    </div>`;
  const tela = document.createElement("canvas");
  tela.width = 400; tela.height = 280;
  desenharRetrato(tela, g);
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
    : semNome === 1 ? "Uma espécie está esperando batismo. Clique num cartão pra ver a ficha completa."
    : `${semNome} espécies estão esperando batismo. Clique num cartão pra ver a ficha completa.`;
  if (!vivas.length) lista.innerHTML = `<p class="desc">Ninguém vivo no momento. Um silêncio constrangedor.</p>`;
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
    ol.innerHTML = lista.slice(0, mostrar).map((h) => {
      const t = TIPOS_HIST[h.tipo] || { nome: h.tipo, cor: "#7d8a80" };
      return `<li class="h-${h.tipo}"><span class="dia">Dia ${String(h.periodo).padStart(3, "0")}</span>` +
        `<span class="tipo"><i style="background:${t.cor}"></i>${t.nome}</span>` +
        `<span class="texto">${textoComNomes(h.texto)}</span></li>`;
    }).join("") || `<li><span></span><span></span><span class="texto">Nada anotado por aqui ainda.</span></li>`;
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

  const LINHA = 28, ESQ = 24, TOPO = 36;
  const total = Math.max(1, D.periodo);
  const pxDia = Math.max(6, Math.min(48, 760 / total));
  const W = ESQ + total * pxDia + 320, H = TOPO + ordem.length * LINHA + 12;
  const linhaDe = {};
  ordem.forEach((e, i) => { linhaDe[e.id] = i; });
  const X = (p) => ESQ + p * pxDia, Y = (i) => TOPO + i * LINHA + LINHA / 2;

  const partes = [];
  let passo = 1;
  for (const p of [1, 2, 5, 10, 20, 50, 100, 200, 500, 1000, 2000, 5000]) { passo = p; if (p * pxDia >= 70) break; }
  for (let d = 0; d <= total; d += passo) {
    partes.push(`<line x1="${X(d)}" x2="${X(d)}" y1="${TOPO - 10}" y2="${H}" stroke="rgba(23,36,28,.08)"/>`);
    partes.push(`<text class="eixo" x="${X(d)}" y="${TOPO - 16}" text-anchor="middle">DIA ${d}</text>`);
  }
  for (const e of ordem) {
    const viva = e.extincao === null;
    const y = Y(linhaDe[e.id]);
    const x0 = X(e.nascimento), x1 = Math.max(X(viva ? D.periodo : e.extincao), x0 + 4);
    const g = e.retrato;
    const cor = viva ? hsl(g.matiz, Math.max(0.45, g.saturacao), Math.min(0.42, g.luz)) : "#b3b8ae";
    if (e.pai != null && linhaDe[e.pai] !== undefined) {
      const yp = Y(linhaDe[e.pai]);
      partes.push(`<path d="M${x0} ${yp} C${x0 + 10} ${yp}, ${x0 - 4} ${y}, ${x0 + 6} ${y}" stroke="${cor}" stroke-width="1.6" fill="none"/>`);
    }
    partes.push(`<line x1="${x0}" x2="${x1}" y1="${y}" y2="${y}" stroke="${cor}" stroke-width="${viva ? 6 : 3}" stroke-linecap="round"${viva ? "" : ' stroke-dasharray="5 4"'}/>`);
    partes.push(`<circle cx="${x0}" cy="${y}" r="4" fill="#fbf8f1" stroke="${cor}" stroke-width="2"/>`);
    partes.push(`<text class="rotulo${viva ? "" : " extinta"}" data-id="${e.id}" x="${x1 + 10}" y="${y + 4.5}">${viva ? "" : "† "}${esc(rotulo(e.id))}</text>`);
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
    return `<span>${rot}</span><div class="barra"><span style="width:${pct}%"></span></div><span class="valor">${valor}</span>`;
  }).join("");
  $("#ficha-conteudo").innerHTML = `
    <div class="ficha-topo">
      <div class="retrato" style="--tom:${tom(g)}"></div>
      <div class="ficha-info">
        <p class="etiqueta">${numero(e.id)} · ${e.dieta}</p>
        <h3>${nome ? esc(nome) : "Sem nome"}</h3>
        <p class="cientifico">${esc(cientifico(e))}</p>
        ${nome ? "" : `<p class="sugestao">Sugestão: <b>${esc(e.apelido_sugerido)}</b></p>`}
        <dl class="dados">
          <dt>Situação</dt><dd>${e.extincao === null ? `Viva, ${e.pop} indivíduos` : `Extinta no dia ${e.extincao}`}</dd>
          <dt>Surgiu</dt><dd>Dia ${e.nascimento}</dd>
          <dt>Recorde</dt><dd>${e.pico} indivíduos</dd>
          <dt>Origem</dt><dd>${origem(e)}</dd>
          <dt>Filhas</dt><dd>${descendentes.length ? descendentes.map((x) => linkEsp(x.id)).join(", ") : "Nenhuma (ainda)"}</dd>
        </dl>
      </div>
    </div>
    <div class="ficha-baixo">
      <h5>Anotações da naturalista</h5>
      <ul class="notas">${descricoes(g, 5).map((t) => `<li>${esc(t)}</li>`).join("")}</ul>
      <h5>Genes</h5>
      <div class="genes">${genes}<span>Enfeites</span><span></span><span class="valor">${g.enfeites.length}</span></div>
    </div>`;
  const tela = document.createElement("canvas");
  tela.width = 480; tela.height = 360;
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
    $("#atualizado").textContent = "Rode a simulação pelo menos uma vez (avancar.bat) e recarregue esta página.";
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
