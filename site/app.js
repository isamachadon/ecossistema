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

let D = null;      // o diário
let NOMES = {};    // os nomes que você deu

const $ = (sel) => document.querySelector(sel);

// ---------------------------------------------------------------- utilidades

function esc(t) {
  return String(t).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
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
  return nomeDado(id) || e.apelido_sugerido;
}
function rotuloCurto(id) { return rotulo(id); }
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

  const cen = criarCenario(D);   // o cenário vem do cenario.js

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
  const tamFigura = (b) => 12 + b.tam * 5.5;   // largura da figurinha, em unidades do mundo

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
    $("#p-etq").textContent = `${numero(b.esp)} · ${e.dieta} · ${NOMES_PLANOS[e.retrato.plano ?? 0]}`;
    $("#p-nome").textContent = rotulo(b.esp);
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
    ctx.drawImage(cen.fundo, 0, 0, LW, LH);

    const [x0, y0] = paraMundo(-20, -20), [x1, y1] = paraMundo(W + 20, H + 40);
    const dentro = (x, y, m = 0) => x > x0 - m && x < x1 + m && y > y0 - m && y < y1 + m;

    cen.desenharChaoAnimado(ctx, agora, px);

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
    // árvores, cactos e companhia entram na mesma fila, pra quem está atrás ficar escondido
    const altosVis = cen.altos.filter((o) => dentro(o.x, o.y - 8, 24));
    let ia = 0;
    const altosAte = (yLim) => { while (ia < altosVis.length && altosVis[ia].y <= yLim) cen.desenharAlto(ctx, altosVis[ia++], agora, px); };
    for (const b of visiveis) {
      altosAte(b.y);
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
    altosAte(Infinity);
    cen.desenharParticulas(ctx, agora, px, dentro);

    // daqui pra baixo, coisas desenhadas em pixels da tela
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    cen.desenharClima(ctx, W, H, agora);
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
      const texto = rotulo(sob.esp);
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
        cen.atualizar(dt * velocidade, agora);
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
  const g = e.retrato;
  div.innerHTML = `
    <div class="retrato" style="--tom:${tom(g)}">
      <span class="etiqueta">${numero(e.id)} · ${e.dieta} · ${NOMES_PLANOS[g.plano ?? 0]}</span>
    </div>
    <div class="corpo">
      <h3>${esc(rotulo(e.id))}</h3>
      <p class="cientifico">${esc(cientifico(e))}</p>
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
  $("#nota-especies").textContent = "Todas batizadas pela naturalista, do jeito dela. Clique num cartão pra ver a ficha completa.";
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
        <p class="etiqueta">${numero(e.id)} · ${e.dieta} · ${NOMES_PLANOS[g.plano ?? 0]}</p>
        <h3>${esc(rotulo(id))}</h3>
        <p class="cientifico">${esc(cientifico(e))}</p>
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
