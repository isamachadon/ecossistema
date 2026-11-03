// cenario.js: o pintor de paisagens.
// Monta o chão de cada bioma (água, lama, areia, neve, folhas...), as coisas altas que
// balançam com o vento (árvores, juncos, cactos, pinheiros) e a "vida de enfeite"
// (borboletas, vaga-lumes, folhas caindo, neve, poeira). Também desenha o clima dos eventos.

"use strict";

function criarCenario(D) {
  const LW = D.largura, LH = D.altura, CEL = D.cel;
  const COLS = D.biomas[0].length, LINHAS = D.biomas.length;
  const LISTA = ["campo", "floresta", "pantano", "deserto", "tundra"];
  const CAMPO = 0, FLORESTA = 1, PANTANO = 2, DESERTO = 3, TUNDRA = 4;
  const rnd = sorteador(((D.semente || 7) % 100000) + 17);
  const climas = new Set((D.eventos_ativos || []).map((e) => e.tipo));

  // ---------------------------------------------------------------- ruído suave
  // dá formas orgânicas: bordas tortas entre biomas, poças, manchas de musgo
  function ruido(semente) {
    const r = sorteador(semente);
    const p = Array.from({ length: 256 }, (_, i) => i);
    for (let i = 255; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [p[i], p[j]] = [p[j], p[i]]; }
    const perm = new Uint8Array(512);
    for (let i = 0; i < 512; i++) perm[i] = p[i & 255];
    const v = (x, y) => perm[perm[x & 255] + (y & 255)] / 255;
    return (x, y) => {
      const x0 = Math.floor(x), y0 = Math.floor(y), fx = x - x0, fy = y - y0;
      const sx = fx * fx * (3 - 2 * fx), sy = fy * fy * (3 - 2 * fy);
      const a = v(x0, y0), b = v(x0 + 1, y0), c = v(x0, y0 + 1), d = v(x0 + 1, y0 + 1);
      return (a + (b - a) * sx) * (1 - sy) + (c + (d - c) * sx) * sy;
    };
  }
  const nA = ruido(11), nB = ruido(23), nC = ruido(37), nD = ruido(51);
  const fbm = (n, x, y) => n(x, y) * 0.65 + n(x * 2.1 + 17, y * 2.1 + 9) * 0.35;
  const mix = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];

  // ---------------------------------------------------------------- o chão, pixel a pixel
  const grade = D.biomas.map((l) => l.map((b) => LISTA.indexOf(b)));
  const RES = 3, FW = LW * RES, FH = LH * RES;
  const bio = new Uint8Array(FW * FH);
  const tipoChao = new Uint8Array(FW * FH);   // 0 normal, 1 água, 2 margem, 3 gelo, 4 barro rachado
  const px = new Uint8ClampedArray(FW * FH * 4);
  for (let py = 0; py < FH; py++) {
    for (let qx = 0; qx < FW; qx++) {
      const x = qx / RES, y = py / RES, i = py * FW + qx;
      const wx = x / CEL + (fbm(nA, x * 0.04, y * 0.04) - 0.5) * 1.2 + (nB(x * 0.16 + 70, y * 0.16) - 0.5) * 0.45;
      const wy = y / CEL + (fbm(nB, x * 0.04, y * 0.04) - 0.5) * 1.2 + (nA(x * 0.16, y * 0.16 + 70) - 0.5) * 0.45;
      const b = grade[Math.min(LINHAS - 1, Math.max(0, Math.floor(wy)))][Math.min(COLS - 1, Math.max(0, Math.floor(wx)))];
      bio[i] = b;
      const m = nC(x * 0.08, y * 0.08), fino = nD(x * 0.7, y * 0.7);
      let c, t = 0;
      if (b === CAMPO) {
        c = mix([216, 226, 162], [184, 205, 126], m);
      } else if (b === FLORESTA) {
        c = mix([128, 172, 104], [92, 140, 82], m);
        if (fino > 0.7) c = mix(c, [150, 128, 78], 0.45);   // folhas secas no chão
      } else if (b === PANTANO) {
        const w = fbm(nC, x * 0.045 + 40, y * 0.045 + 40);
        if (w > 0.56) { t = 1; c = mix([146, 198, 194], [88, 154, 164], Math.min(1, (w - 0.56) / 0.18)); }
        else if (w > 0.52) { t = 2; c = [148, 150, 104]; }
        else c = mix([162, 196, 148], [126, 168, 122], m);
      } else if (b === DESERTO) {
        c = mix([243, 222, 168], [228, 194, 134], m);
        const onda = 0.965 + 0.035 * Math.sin(x * 1.3 + y * 0.45 + m * 9);   // ondinhas de areia
        c = c.map((v) => v * onda);
        if (m < 0.26) { t = 4; c = mix(c, [212, 168, 116], 0.6); }
      } else {
        c = [238, 243, 247];
        if (m < 0.32) c = mix([190, 200, 178], c, (m / 0.32) * 0.7);   // musgo aparecendo na neve
        if (fbm(nC, x * 0.05 + 90, y * 0.05 + 90) > 0.63) { t = 3; c = [202, 228, 239]; }
      }
      tipoChao[i] = t;
      const gr = (fino - 0.5) * 12;
      px[i * 4] = c[0] + gr; px[i * 4 + 1] = c[1] + gr; px[i * 4 + 2] = c[2] + gr; px[i * 4 + 3] = 255;
    }
  }
  // bordas: escurece a divisa entre biomas e clareia a beira d'água (espuma)
  for (let py = 1; py < FH - 2; py++) {
    for (let qx = 1; qx < FW - 2; qx++) {
      const i = py * FW + qx;
      let f = 1;
      if (bio[i] !== bio[i + 2] || bio[i] !== bio[i + 2 * FW]) f = 0.9;
      if (tipoChao[i] === 1 && (tipoChao[i + 1] !== 1 || tipoChao[i + FW] !== 1 || tipoChao[i - 1] !== 1 || tipoChao[i - FW] !== 1)) f = 1.12;
      if (f !== 1) { px[i * 4] *= f; px[i * 4 + 1] *= f; px[i * 4 + 2] *= f; }
    }
  }
  const campo = document.createElement("canvas");
  campo.width = FW; campo.height = FH;
  campo.getContext("2d").putImageData(new ImageData(px, FW, FH), 0, 0);

  const FR = 6;   // o fundo final tem 6 pixels por unidade do mundo
  const fundo = document.createElement("canvas");
  fundo.width = LW * FR; fundo.height = LH * FR;
  const f = fundo.getContext("2d");
  f.imageSmoothingEnabled = true; f.imageSmoothingQuality = "high";
  f.drawImage(campo, 0, 0, fundo.width, fundo.height);
  f.scale(FR, FR);
  f.lineCap = "round"; f.lineJoin = "round";

  const idx = (x, y) => Math.min(FH - 1, Math.max(0, Math.floor(y * RES))) * FW + Math.min(FW - 1, Math.max(0, Math.floor(x * RES)));
  const bioEm = (x, y) => bio[idx(x, y)];
  const chaoEm = (x, y) => tipoChao[idx(x, y)];
  const sorteia = (l) => l[Math.floor(rnd() * l.length)];

  // ---------------------------------------------------------------- detalhes pintados no chão
  function tufo(c, x, y, c1, c2) {
    c.lineWidth = 0.22;
    for (let i = 0; i < 3; i++) {
      c.strokeStyle = i % 2 ? c1 : c2;
      const a = -Math.PI / 2 + (i - 1) * 0.35 + (rnd() - 0.5) * 0.2, h = 1 + rnd() * 1.2, bx = x + (i - 1) * 0.3;
      c.beginPath(); c.moveTo(bx, y); c.quadraticCurveTo(bx, y - h * 0.6, bx + Math.cos(a) * h, y + Math.sin(a) * h); c.stroke();
    }
  }
  function flores(c, x, y) {
    const cor = sorteia(["#f2a7c3", "#f6d55c", "#ffffff", "#c9a6f0", "#f28c6b"]);
    for (let i = 0, n = 3 + Math.floor(rnd() * 4); i < n; i++) {
      const fx = x + (rnd() - 0.5) * 3, fy = y + (rnd() - 0.5) * 2;
      c.fillStyle = cor;
      for (let p = 0; p < 5; p++) { const a = p * 1.2566; c.beginPath(); c.arc(fx + Math.cos(a) * 0.32, fy + Math.sin(a) * 0.32, 0.26, 0, 7); c.fill(); }
      c.fillStyle = "#e0a020"; c.beginPath(); c.arc(fx, fy, 0.18, 0, 7); c.fill();
    }
  }
  function pedrinha(c, x, y, cor = "#9fa59a") {
    const r = 0.4 + rnd() * 0.7;
    c.fillStyle = "rgba(23, 36, 28, 0.15)"; c.beginPath(); c.ellipse(x + 0.15, y + 0.2, r, r * 0.6, 0, 0, 7); c.fill();
    c.fillStyle = cor; c.beginPath(); c.ellipse(x, y, r, r * 0.65, 0, 0, 7); c.fill();
    c.fillStyle = "rgba(255, 255, 255, 0.35)"; c.beginPath(); c.ellipse(x - r * 0.3, y - r * 0.25, r * 0.35, r * 0.2, 0, 0, 7); c.fill();
  }
  function folha(c, x, y) {
    c.fillStyle = sorteia(["#c9822e", "#a9652a", "#d9a441", "#8a7b3a", "#b5532b"]);
    c.beginPath(); c.ellipse(x, y, 0.55, 0.28, rnd() * Math.PI, 0, 7); c.fill();
  }
  function samambaia(c, x, y) {
    c.strokeStyle = "#4a7a42"; c.lineWidth = 0.16;
    for (let j = 0; j < 3; j++) {
      const a = -Math.PI / 2 + (j - 1) * 0.7, len = 2.2 + rnd();
      const ex = x + Math.cos(a) * len, ey = y + Math.sin(a) * len;
      c.beginPath(); c.moveTo(x, y); c.lineTo(ex, ey); c.stroke();
      for (let s = 1; s < 6; s++) {
        const t = s / 6, bx = x + (ex - x) * t, by = y + (ey - y) * t, l = 0.6 * (1 - t);
        c.beginPath();
        c.moveTo(bx, by); c.lineTo(bx + Math.cos(a + 1.3) * l, by + Math.sin(a + 1.3) * l);
        c.moveTo(bx, by); c.lineTo(bx + Math.cos(a - 1.3) * l, by + Math.sin(a - 1.3) * l);
        c.stroke();
      }
    }
  }
  function cogumelinho(c, x, y) {
    c.fillStyle = "#f3ecdc"; c.fillRect(x - 0.15, y - 0.7, 0.3, 0.7);
    c.fillStyle = rnd() < 0.7 ? "#c8442c" : "#b07a3a";
    c.beginPath(); c.arc(x, y - 0.7, 0.55, Math.PI, 0); c.fill();
    c.fillStyle = "#fff";
    for (const [dx, dy] of [[-0.25, -0.9], [0.15, -1.05], [0.3, -0.8]]) { c.beginPath(); c.arc(x + dx, y + dy, 0.08, 0, 7); c.fill(); }
  }
  function musgo(c, x, y) {
    c.fillStyle = "rgba(60, 110, 55, 0.3)";
    for (let i = 0; i < 6; i++) { c.beginPath(); c.arc(x + (rnd() - 0.5) * 2, y + (rnd() - 0.5) * 1.2, 0.4 + rnd() * 0.5, 0, 7); c.fill(); }
  }
  function tronco(c, x, y) {
    c.save(); c.translate(x, y); c.rotate((rnd() - 0.5) * 0.6);
    c.fillStyle = "rgba(23, 36, 28, 0.15)"; c.beginPath(); c.ellipse(0.2, 0.6, 3.2, 0.6, 0, 0, 7); c.fill();
    c.fillStyle = "#7a5636"; c.strokeStyle = "rgba(23, 36, 28, 0.5)"; c.lineWidth = 0.15;
    c.beginPath(); c.roundRect(-3, -0.7, 6, 1.4, 0.7); c.fill(); c.stroke();
    c.strokeStyle = "rgba(40, 25, 10, 0.35)";
    for (const dx of [-1.6, -0.2, 1.2]) { c.beginPath(); c.moveTo(dx, -0.4); c.lineTo(dx + 0.8, -0.3); c.stroke(); }
    c.fillStyle = "#c9a57a"; c.strokeStyle = "rgba(23, 36, 28, 0.5)";
    c.beginPath(); c.ellipse(3, 0, 0.35, 0.7, 0, 0, 7); c.fill(); c.stroke();
    c.restore();
  }
  function vitoria(c, x, y) {
    const r = 0.9 + rnd() * 0.8, a0 = rnd() * 6.28;
    c.fillStyle = rnd() < 0.5 ? "#5f9a4c" : "#72b05a"; c.strokeStyle = "rgba(23, 36, 28, 0.35)"; c.lineWidth = 0.1;
    c.beginPath(); c.moveTo(x, y); c.arc(x, y, r, a0, a0 + Math.PI * 2 - 0.5); c.closePath(); c.fill(); c.stroke();
    if (rnd() < 0.25) {
      c.fillStyle = "#f4b6cc";
      for (let p = 0; p < 6; p++) { const a = p * 1.047; c.beginPath(); c.ellipse(x + Math.cos(a) * 0.35, y + Math.sin(a) * 0.35, 0.35, 0.18, a, 0, 7); c.fill(); }
      c.fillStyle = "#f6d55c"; c.beginPath(); c.arc(x, y, 0.2, 0, 7); c.fill();
    }
  }
  function ondinha(c, x, y) {
    c.strokeStyle = "rgba(255, 255, 255, 0.55)"; c.lineWidth = 0.15;
    c.beginPath(); c.arc(x, y, 0.8 + rnd() * 1.2, Math.PI * 1.15, Math.PI * 1.85); c.stroke();
  }
  function lama(c, x, y) {
    c.fillStyle = "rgba(105, 90, 55, 0.3)";
    c.beginPath(); c.ellipse(x, y, 1 + rnd(), 0.5 + rnd() * 0.4, rnd(), 0, 7); c.fill();
  }
  function rachadura(c, x, y, cor = "rgba(120, 80, 40, 0.45)") {
    c.strokeStyle = cor; c.lineWidth = 0.12;
    c.beginPath(); c.moveTo(x, y);
    let a = rnd() * 6.28, cx = x, cy = y;
    for (let i = 0; i < 5; i++) {
      a += (rnd() - 0.5) * 1.4; cx += Math.cos(a) * 0.9; cy += Math.sin(a) * 0.9; c.lineTo(cx, cy);
      if (rnd() < 0.3) { c.moveTo(cx, cy); c.lineTo(cx + Math.cos(a + 1.2) * 0.7, cy + Math.sin(a + 1.2) * 0.7); c.moveTo(cx, cy); }
    }
    c.stroke();
  }
  function galho(c, x, y) {
    c.strokeStyle = "#8a6a45"; c.lineWidth = 0.15;
    for (let i = 0; i < 5; i++) {
      const a = -Math.PI / 2 + (rnd() - 0.5) * 2.2, l = 0.8 + rnd() * 1.2;
      c.beginPath(); c.moveTo(x, y); c.lineTo(x + Math.cos(a) * l, y + Math.sin(a) * l); c.stroke();
    }
  }
  function osso(c, x, y) {
    c.save(); c.translate(x, y); c.rotate(rnd() * Math.PI);
    c.fillStyle = "#f4efe2"; c.strokeStyle = "rgba(23, 36, 28, 0.4)"; c.lineWidth = 0.08;
    c.beginPath(); c.rect(-0.8, -0.13, 1.6, 0.26);
    for (const [dx, dy] of [[-0.85, -0.15], [-0.85, 0.15], [0.85, -0.15], [0.85, 0.15]]) { c.moveTo(dx + 0.2, dy); c.arc(dx, dy, 0.2, 0, 7); }
    c.fill(); c.stroke(); c.restore();
  }
  function brilhoNeve(c, x, y) {
    c.fillStyle = rnd() < 0.5 ? "rgba(255, 255, 255, 0.95)" : "rgba(160, 195, 225, 0.6)";
    c.beginPath(); c.arc(x, y, 0.15 + rnd() * 0.15, 0, 7); c.fill();
  }

  for (let n = 0; n < 16000; n++) {
    const x = rnd() * LW, y = rnd() * LH, b = bioEm(x, y), t = chaoEm(x, y), v = rnd();
    if (b === CAMPO) {
      if (v < 0.55) tufo(f, x, y, "#8faa55", "#6f8f3e");
      else if (v < 0.62) flores(f, x, y);
      else if (v < 0.64) pedrinha(f, x, y);
    } else if (b === FLORESTA) {
      if (v < 0.45) folha(f, x, y);
      else if (v < 0.52) samambaia(f, x, y);
      else if (v < 0.545) cogumelinho(f, x, y);
      else if (v < 0.6) musgo(f, x, y);
      else if (v < 0.605) tronco(f, x, y);
    } else if (b === PANTANO) {
      if (t === 1) { if (v < 0.14) vitoria(f, x, y); else if (v < 0.26) ondinha(f, x, y); }
      else if (t === 2) { if (v < 0.35) lama(f, x, y); }
      else if (v < 0.5) tufo(f, x, y, "#6f9a66", "#557d52");
      else if (v < 0.53) lama(f, x, y);
    } else if (b === DESERTO) {
      if (t === 4 && v < 0.3) rachadura(f, x, y);
      else if (v < 0.1) pedrinha(f, x, y, "#c9a77a");
      else if (v < 0.14) galho(f, x, y);
      else if (v < 0.146) osso(f, x, y);
    } else {
      if (t === 3) { if (v < 0.25) rachadura(f, x, y, "rgba(255, 255, 255, 0.85)"); }
      else if (v < 0.3) brilhoNeve(f, x, y);
      else if (v < 0.36) tufo(f, x, y, "#b8a670", "#9c8c5a");
      else if (v < 0.38) pedrinha(f, x, y, "#a9b0b4");
    }
  }

  // ---------------------------------------------------------------- coisas altas (balançam e escondem bichos)
  const altos = [];
  for (let n = 0; n < 5000; n++) {
    const x = 2 + rnd() * (LW - 4), y = 5 + rnd() * (LH - 6), b = bioEm(x, y), t = chaoEm(x, y), v = rnd();
    let tipo = null;
    if (b === FLORESTA) { if (v < 0.2) tipo = rnd() < 0.2 ? "conifera" : rnd() < 0.12 ? "betula" : "arvore"; }
    else if (b === CAMPO) { if (v < 0.006) tipo = "arvore"; else if (v < 0.022) tipo = "arbusto"; else if (v < 0.04) tipo = "girassol"; }
    else if (b === PANTANO) {
      if (t === 2 && v < 0.4) tipo = "junco";
      else if (t === 0 && v < 0.07) tipo = "junco";
      else if (t === 0 && v < 0.08) tipo = "arvoreSeca";
    } else if (b === DESERTO) { if (v < 0.012) tipo = "saguaro"; else if (v < 0.024) tipo = "barril"; else if (v < 0.034) tipo = "rocha"; }
    else if (t !== 3) { if (v < 0.032) tipo = "pinheiro"; else if (v < 0.042) tipo = "pedra"; else if (v < 0.048) tipo = "cristalGelo"; }
    if (tipo) altos.push({ tipo, x, y, s: 0.55 + rnd() * 0.4, fase: rnd() * 6.28, v: rnd() });
  }
  altos.sort((a, b) => a.y - b.y);

  function sombraChao(c, x, y, r) {
    c.fillStyle = "rgba(23, 36, 28, 0.16)";
    c.beginPath(); c.ellipse(x + r * 0.15, y, r, r * 0.3, 0, 0, 7); c.fill();
  }
  function bolas(c, lista, cor, contorno) {
    c.fillStyle = cor;
    for (const [x, y, r] of lista) {
      c.beginPath(); c.arc(x, y, r, 0, 7); c.fill();
      if (contorno) c.stroke();
    }
  }

  function desenharAlto(c, o, t, px) {
    const s = o.s, x = o.x, y = o.y;
    const vento = Math.sin(t / 1300 + o.fase) * 0.35 * s;
    c.lineWidth = px * 1.1;
    c.strokeStyle = "rgba(23, 36, 28, 0.55)";
    switch (o.tipo) {
      case "arvore": {
        sombraChao(c, x, y, 4.5 * s);
        c.fillStyle = "#7a5636";
        c.beginPath(); c.moveTo(x - 0.9 * s, y); c.lineTo(x - 0.45 * s, y - 7 * s); c.lineTo(x + 0.45 * s, y - 7 * s); c.lineTo(x + 0.9 * s, y);
        c.closePath(); c.fill(); c.stroke();
        const cx = x + vento, cy = y - 10 * s;
        const tons = o.v < 0.5 ? ["#3e7845", "#529352", "#74b066"] : ["#4b8640", "#61a04e", "#8cc26a"];
        bolas(c, [[cx - 3 * s, cy + 1.4 * s, 3.4 * s], [cx + 3 * s, cy + 1.4 * s, 3.4 * s], [cx, cy - 2 * s, 4 * s], [cx, cy + 1.5 * s, 3.6 * s]], tons[0], true);
        bolas(c, [[cx - 2.2 * s, cy - 0.2 * s, 2.3 * s], [cx + 1 * s, cy - 2.6 * s, 2.4 * s], [cx + 2.6 * s, cy + 0.6 * s, 2 * s]], tons[1], false);
        bolas(c, [[cx - 1.4 * s, cy - 2.4 * s, 1.1 * s], [cx + 0.8 * s, cy - 3.6 * s, 0.9 * s], [cx - 2.8 * s, cy + 0.2 * s, 0.8 * s]], tons[2], false);
        if (o.v > 0.8) bolas(c, [[cx - 1.5 * s, cy + 1.2 * s, 0.45 * s], [cx + 2 * s, cy - 0.8 * s, 0.45 * s], [cx + 0.4 * s, cy + 2.4 * s, 0.45 * s]], "#d2453a", false);
        break;
      }
      case "conifera": {
        sombraChao(c, x, y, 3.5 * s);
        c.fillStyle = "#6b4a30"; c.fillRect(x - 0.5 * s, y - 3 * s, 1 * s, 3 * s);
        for (let i = 0; i < 4; i++) {
          const ty = y - 3 * s - i * 3.2 * s, w = (4.2 - i * 0.8) * s, sw = vento * (i / 3);
          c.fillStyle = i % 2 ? "#2f6a46" : "#3a7a50";
          c.beginPath(); c.moveTo(x - w + sw * 0.5, ty); c.lineTo(x + sw, ty - 5 * s); c.lineTo(x + w + sw * 0.5, ty); c.closePath(); c.fill(); c.stroke();
        }
        break;
      }
      case "betula": {
        sombraChao(c, x, y, 3.5 * s);
        c.fillStyle = "#f1efe6"; c.fillRect(x - 0.55 * s, y - 9 * s, 1.1 * s, 9 * s); c.strokeRect(x - 0.55 * s, y - 9 * s, 1.1 * s, 9 * s);
        c.fillStyle = "#2b2b2b";
        for (let i = 1; i < 6; i++) c.fillRect(x - 0.55 * s + (i % 2) * 0.4 * s, y - i * 1.5 * s, 0.5 * s, 0.18 * s);
        const cx = x + vento, cy = y - 11 * s;
        bolas(c, [[cx - 2.2 * s, cy + 1 * s, 2.6 * s], [cx + 2.2 * s, cy + 1 * s, 2.6 * s], [cx, cy - 1.4 * s, 3 * s]], "#9cc25a", true);
        bolas(c, [[cx - 1 * s, cy - 1.8 * s, 1.2 * s], [cx + 1.6 * s, cy, 1 * s]], "#c6dc7c", false);
        break;
      }
      case "arbusto": {
        sombraChao(c, x, y, 2.6 * s);
        const cx = x + vento * 0.3;
        bolas(c, [[cx - 1.4 * s, y - 1.3 * s, 1.6 * s], [cx + 1.4 * s, y - 1.3 * s, 1.6 * s], [cx, y - 2.3 * s, 1.9 * s]], "#5e9a4b", true);
        bolas(c, [[cx - 0.6 * s, y - 2.8 * s, 0.8 * s]], "#7fb860", false);
        if (o.v > 0.5) bolas(c, [[cx - 1.2 * s, y - 1.6 * s, 0.35 * s], [cx + 0.9 * s, y - 2.4 * s, 0.35 * s], [cx + 1.6 * s, y - 1.1 * s, 0.35 * s]], o.v > 0.75 ? "#3b4fa8" : "#d2453a", false);
        break;
      }
      case "girassol": {
        const tx = x + vento * 2, ty = y - 7 * s;
        c.strokeStyle = "#4f8a3c"; c.lineWidth = Math.max(px * 1.4, 0.35 * s);
        c.beginPath(); c.moveTo(x, y); c.quadraticCurveTo(x, y - 4 * s, tx, ty); c.stroke();
        c.fillStyle = "#5f9a4c";
        c.beginPath(); c.ellipse(x + 0.9 * s, y - 3 * s, 1 * s, 0.4 * s, -0.5, 0, 7); c.fill();
        c.fillStyle = "#f2c230";
        for (let p = 0; p < 10; p++) { const a = p * 0.628; c.beginPath(); c.ellipse(tx + Math.cos(a) * 1.1 * s, ty + Math.sin(a) * 1.1 * s, 0.7 * s, 0.3 * s, a, 0, 7); c.fill(); }
        c.fillStyle = "#6b4626"; c.strokeStyle = "rgba(23, 36, 28, 0.55)"; c.lineWidth = px * 1.1;
        c.beginPath(); c.arc(tx, ty, 0.75 * s, 0, 7); c.fill(); c.stroke();
        break;
      }
      case "junco": {
        const n = 4 + Math.floor(o.v * 3);
        for (let i = 0; i < n; i++) {
          const bx = x + (i - n / 2) * 0.5 * s, h = (5 + ((i * 7) % 4)) * s;
          const tx = bx + vento * (1.2 + i * 0.1), ty = y - h;
          c.strokeStyle = i % 2 ? "#5f8a52" : "#4d7a46"; c.lineWidth = Math.max(px, 0.22 * s);
          c.beginPath(); c.moveTo(bx, y); c.quadraticCurveTo(bx, y - h * 0.5, tx, ty); c.stroke();
          if (i % 2 === 0) { c.fillStyle = "#7a5233"; c.beginPath(); c.ellipse(tx, ty + 0.9 * s, 0.4 * s, 1 * s, 0, 0, 7); c.fill(); }
        }
        break;
      }
      case "arvoreSeca": {
        sombraChao(c, x, y, 3 * s);
        c.strokeStyle = "#4d3a2a"; c.lineCap = "round";
        c.lineWidth = 1.1 * s; c.beginPath(); c.moveTo(x, y); c.quadraticCurveTo(x - 0.8 * s, y - 5 * s, x + 0.3 * s, y - 9 * s); c.stroke();
        c.lineWidth = 0.5 * s;
        c.beginPath(); c.moveTo(x - 0.2 * s, y - 5 * s); c.lineTo(x - 3 * s, y - 8 * s);
        c.moveTo(x + 0.1 * s, y - 7 * s); c.lineTo(x + 2.8 * s, y - 9.5 * s); c.lineTo(x + 3.6 * s, y - 9 * s); c.stroke();
        break;
      }
      case "saguaro": {
        sombraChao(c, x, y, 2.4 * s);
        c.fillStyle = "#5f9a58";
        const corpo = (bx, by, w, h) => { c.beginPath(); c.roundRect(bx, by, w, h, w / 2); c.fill(); c.stroke(); };
        corpo(x - 2.6 * s, y - 7 * s, 1.3 * s, 3.6 * s);
        corpo(x - 2.6 * s, y - 4.6 * s, 2.4 * s, 1.2 * s);
        if (o.v > 0.4) { corpo(x + 1.3 * s, y - 8.5 * s, 1.3 * s, 3.4 * s); corpo(x + 0.2 * s, y - 6.2 * s, 2.4 * s, 1.2 * s); }
        corpo(x - 1 * s, y - 11 * s, 2 * s, 11 * s);
        c.strokeStyle = "rgba(255, 255, 255, 0.35)";
        for (const dx of [-0.4, 0.4]) { c.beginPath(); c.moveTo(x + dx * s, y - 10 * s); c.lineTo(x + dx * s, y - 0.5 * s); c.stroke(); }
        if (o.v > 0.6) { c.fillStyle = "#ef7fa6"; c.beginPath(); c.arc(x, y - 11 * s, 0.6 * s, 0, 7); c.fill(); }
        break;
      }
      case "barril": {
        sombraChao(c, x, y, 2 * s);
        c.fillStyle = "#6aa35f";
        c.beginPath(); c.ellipse(x, y - 1.6 * s, 1.8 * s, 1.7 * s, 0, 0, 7); c.fill(); c.stroke();
        c.strokeStyle = "rgba(255, 255, 255, 0.35)";
        for (const dx of [-0.9, 0, 0.9]) { c.beginPath(); c.ellipse(x + dx * s * 0.4, y - 1.6 * s, Math.abs(dx) * s + 0.1, 1.6 * s, 0, -1.2, 1.2); c.stroke(); }
        c.fillStyle = o.v > 0.5 ? "#f2c230" : "#ef7fa6";
        for (let p = 0; p < 5; p++) { const a = p * 1.2566; c.beginPath(); c.arc(x + Math.cos(a) * 0.4 * s, y - 3.2 * s + Math.sin(a) * 0.3 * s, 0.3 * s, 0, 7); c.fill(); }
        break;
      }
      case "rocha": {
        sombraChao(c, x, y, 3.2 * s);
        c.fillStyle = "#c39466";
        c.beginPath(); c.moveTo(x - 3 * s, y); c.lineTo(x - 2.6 * s, y - 3 * s); c.lineTo(x - 0.8 * s, y - 4.2 * s);
        c.lineTo(x + 1.8 * s, y - 3.6 * s); c.lineTo(x + 3 * s, y - 1.4 * s); c.lineTo(x + 2.8 * s, y); c.closePath(); c.fill(); c.stroke();
        c.fillStyle = "#dfb88a";
        c.beginPath(); c.moveTo(x - 2.6 * s, y - 3 * s); c.lineTo(x - 0.8 * s, y - 4.2 * s); c.lineTo(x + 1.8 * s, y - 3.6 * s); c.lineTo(x + 0.4 * s, y - 2.6 * s); c.closePath(); c.fill();
        c.strokeStyle = "rgba(90, 60, 30, 0.35)"; c.beginPath(); c.moveTo(x - 2 * s, y - 1.2 * s); c.lineTo(x + 2 * s, y - 1.6 * s); c.stroke();
        break;
      }
      case "pinheiro": {
        sombraChao(c, x, y, 3.2 * s);
        c.fillStyle = "#5b4430"; c.fillRect(x - 0.45 * s, y - 2.5 * s, 0.9 * s, 2.5 * s);
        for (let i = 0; i < 4; i++) {
          const ty = y - 2.5 * s - i * 3 * s, w = (3.8 - i * 0.75) * s, sw = vento * (i / 3);
          c.fillStyle = "#2d5e45";
          c.beginPath(); c.moveTo(x - w + sw * 0.5, ty); c.lineTo(x + sw, ty - 4.6 * s); c.lineTo(x + w + sw * 0.5, ty); c.closePath(); c.fill(); c.stroke();
          c.fillStyle = "#f4f8fb";
          c.beginPath(); c.moveTo(x - w * 0.45 + sw * 0.75, ty - 2.5 * s); c.lineTo(x + sw, ty - 4.6 * s); c.lineTo(x + w * 0.45 + sw * 0.75, ty - 2.5 * s);
          c.quadraticCurveTo(x + sw, ty - 2 * s, x - w * 0.45 + sw * 0.75, ty - 2.5 * s); c.fill();
        }
        break;
      }
      case "pedra": {
        sombraChao(c, x, y, 2.6 * s);
        c.fillStyle = "#9aa3a8";
        c.beginPath(); c.ellipse(x, y - 1.4 * s, 2.6 * s, 1.7 * s, 0, 0, 7); c.fill(); c.stroke();
        c.fillStyle = "#f6f9fb";
        c.beginPath(); c.ellipse(x - 0.3 * s, y - 2.4 * s, 1.8 * s, 0.75 * s, 0, 0, 7); c.fill();
        break;
      }
      case "cristalGelo": {
        sombraChao(c, x, y, 2 * s);
        for (const [dx, h, inc] of [[-1.1, 4.5, -0.25], [0.2, 7, 0.05], [1.2, 3.8, 0.3]]) {
          const bx = x + dx * s;
          c.fillStyle = "rgba(190, 230, 246, 0.88)"; c.strokeStyle = "rgba(80, 130, 165, 0.7)";
          c.beginPath(); c.moveTo(bx - 0.75 * s, y); c.lineTo(bx + inc * h * s, y - h * s); c.lineTo(bx + 0.75 * s, y); c.closePath(); c.fill(); c.stroke();
          c.strokeStyle = "rgba(255, 255, 255, 0.85)";
          c.beginPath(); c.moveTo(bx - 0.2 * s, y - 0.6 * s); c.lineTo(bx + inc * h * s * 0.8 - 0.1 * s, y - h * s * 0.8); c.stroke();
        }
        break;
      }
    }
  }

  // ---------------------------------------------------------------- vida de enfeite
  const amostra = [0, 0, 0, 0, 0];
  for (let i = 0; i < bio.length; i += 97) amostra[bio[i]]++;
  function pontoEm(b) {
    for (let i = 0; i < 60; i++) { const x = rnd() * LW, y = rnd() * LH; if (bioEm(x, y) === b) return [x, y]; }
    return [rnd() * LW, rnd() * LH];
  }
  const parts = [];
  function criar(tipo, b, n) {
    if (b >= 0 && !amostra[b]) return;
    for (let i = 0; i < n; i++) {
      const [x, y] = b >= 0 ? pontoEm(b) : [rnd() * LW, rnd() * LH];
      parts.push({ tipo, b, x, y, ang: rnd() * 6.28, fase: rnd() * 6.28, vida: rnd(), rot: rnd() * 6.28,
        cor: sorteia(["#f2a23c", "#e46fa0", "#7aa7e6", "#f6e05c", "#ffffff"]) });
    }
  }
  criar("borboleta", CAMPO, 14);
  criar("folhaCaindo", FLORESTA, 20);
  criar("vagalume", FLORESTA, 10);
  criar("vagalume", PANTANO, 18);
  criar("libelula", PANTANO, 5);
  criar("poeira", DESERTO, 24);
  criar("feno", DESERTO, 2);
  criar("neve", TUNDRA, 50);
  if (climas.has("inverno")) criar("neve", -1, 260);
  if (climas.has("enchente")) criar("chuva", -1, 220);
  const aneis = [];
  const temAgua = tipoChao.some((t) => t === 1);

  function atualizar(dt, t) {
    for (const p of parts) {
      switch (p.tipo) {
        case "borboleta": p.ang += (rnd() - 0.5) * dt * 4; p.x += Math.cos(p.ang) * dt * 7; p.y += Math.sin(p.ang) * dt * 7; break;
        case "vagalume": p.ang += (rnd() - 0.5) * dt * 2; p.x += Math.cos(p.ang) * dt * 2; p.y += Math.sin(p.ang) * dt * 2; break;
        case "libelula":
          if (rnd() < dt * 1.5) p.ang = rnd() * 6.28;
          p.x += Math.cos(p.ang) * dt * 16; p.y += Math.sin(p.ang) * dt * 16; break;
        case "poeira": p.x += dt * 5; p.y += Math.sin(t / 700 + p.fase) * dt * 1.5; break;
        case "feno": p.x += dt * 9; p.rot += dt * 4; break;
        case "folhaCaindo": p.vida += dt * 0.12; break;
        case "neve": p.vida += dt * (p.b < 0 ? 0.1 : 0.07); break;
        case "chuva": p.vida += dt * 1.6; break;
      }
      const fora = p.x < 0 || p.x > LW || p.y < 0 || p.y > LH;
      if (p.vida > 1 || fora || (p.b >= 0 && bioEm(p.x, p.y) !== p.b)) {
        if (p.vida > 1 || p.tipo === "feno" || p.tipo === "poeira") {
          const [x, y] = p.b >= 0 ? pontoEm(p.b) : [rnd() * LW, rnd() * LH];
          p.x = x; p.y = y; p.vida = p.vida > 1 ? 0 : p.vida;
        } else {   // quem anda e saiu do seu bioma dá meia-volta
          p.ang += Math.PI; p.x = Math.min(Math.max(p.x, 0.5), LW - 0.5); p.y = Math.min(Math.max(p.y, 0.5), LH - 0.5);
        }
      }
    }
    if (temAgua && aneis.length < 25 && rnd() < dt * 3) {
      for (let i = 0; i < 20; i++) {
        const x = rnd() * LW, y = rnd() * LH;
        if (chaoEm(x, y) === 1) { aneis.push({ x, y, t0: t }); break; }
      }
    }
  }

  // anéis na água (desenhados no chão, antes dos bichos)
  function desenharChaoAnimado(c, t, px) {
    for (let i = aneis.length - 1; i >= 0; i--) {
      const a = aneis[i], idade = (t - a.t0) / 2200;
      if (idade >= 1) { aneis.splice(i, 1); continue; }
      const r = 0.5 + idade * 3.5;
      c.strokeStyle = `rgba(255, 255, 255, ${0.7 * (1 - idade)})`; c.lineWidth = px * 1.2;
      c.beginPath(); c.ellipse(a.x, a.y, r, r * 0.45, 0, 0, 7); c.stroke();
    }
  }

  function desenharParticulas(c, t, px, dentro) {
    for (const p of parts) {
      if (!dentro(p.x, p.y, 30)) continue;
      switch (p.tipo) {
        case "borboleta": {
          const asa = Math.abs(Math.sin(t / 90 + p.fase)), y = p.y - 4 - Math.sin(t / 400 + p.fase) * 0.8;
          c.fillStyle = "rgba(23, 36, 28, 0.12)"; c.beginPath(); c.ellipse(p.x, p.y, 0.6, 0.2, 0, 0, 7); c.fill();
          c.fillStyle = p.cor; c.strokeStyle = "rgba(23, 36, 28, 0.6)"; c.lineWidth = px;
          for (const lado of [-1, 1]) { c.beginPath(); c.ellipse(p.x + lado * 0.45 * asa, y, 0.5 * asa + 0.05, 0.4, 0, 0, 7); c.fill(); c.stroke(); }
          c.strokeStyle = "#2b2b2b"; c.beginPath(); c.moveTo(p.x, y - 0.35); c.lineTo(p.x, y + 0.35); c.stroke();
          break;
        }
        case "folhaCaindo": {
          const z = (1 - p.vida) * 14, x = p.x + Math.sin(p.vida * 12 + p.fase) * 1.5;
          c.globalAlpha = p.vida > 0.9 ? (1 - p.vida) * 10 : 1;
          c.fillStyle = p.cor === "#ffffff" ? "#c9822e" : p.cor === "#7aa7e6" ? "#a9652a" : "#d9a441";
          c.beginPath(); c.ellipse(x, p.y - z, 0.55, 0.28, p.vida * 9 + p.fase, 0, 7); c.fill();
          c.globalAlpha = 1;
          break;
        }
        case "vagalume": {
          const brilho = Math.max(0, Math.sin(t / 500 + p.fase)) * (climas.has("eclipse") ? 1 : 0.8);
          if (brilho < 0.05) break;
          const y = p.y - 3 - Math.sin(t / 700 + p.fase) * 0.6;
          const gr = c.createRadialGradient(p.x, y, 0, p.x, y, 1.6);
          gr.addColorStop(0, `rgba(240, 255, 150, ${brilho})`); gr.addColorStop(1, "rgba(240, 255, 150, 0)");
          c.fillStyle = gr; c.beginPath(); c.arc(p.x, y, 1.6, 0, 7); c.fill();
          break;
        }
        case "libelula": {
          const y = p.y - 5, a = p.ang;
          c.save(); c.translate(p.x, y); c.rotate(a);
          c.fillStyle = "rgba(220, 240, 255, 0.6)"; c.strokeStyle = "rgba(23, 36, 28, 0.4)"; c.lineWidth = px * 0.8;
          const bate = Math.sin(t / 30) * 0.3;
          for (const lado of [-1, 1]) for (const dx of [-0.2, 0.3]) { c.beginPath(); c.ellipse(dx, lado * 0.7, 0.25, 0.8, bate * lado, 0, 7); c.fill(); c.stroke(); }
          c.strokeStyle = "#2f8f9a"; c.lineWidth = Math.max(px, 0.25);
          c.beginPath(); c.moveTo(-1.4, 0); c.lineTo(0.8, 0); c.stroke();
          c.restore();
          break;
        }
        case "poeira": {
          c.fillStyle = "rgba(190, 150, 95, 0.4)";
          c.beginPath(); c.arc(p.x, p.y - 2 - Math.sin(t / 500 + p.fase), 0.25, 0, 7); c.fill();
          break;
        }
        case "feno": {
          const y = p.y - 1.4 - Math.abs(Math.sin(t / 250 + p.fase)) * 0.8;
          c.fillStyle = "rgba(23, 36, 28, 0.12)"; c.beginPath(); c.ellipse(p.x, p.y, 1.3, 0.35, 0, 0, 7); c.fill();
          c.save(); c.translate(p.x, y); c.rotate(p.rot);
          c.strokeStyle = "#a07c46"; c.lineWidth = Math.max(px, 0.15);
          for (let i = 0; i < 7; i++) { c.beginPath(); c.arc(0, 0, 0.6 + (i % 3) * 0.25, i, i + 2.5); c.stroke(); }
          c.restore();
          break;
        }
        case "neve": {
          const z = (1 - p.vida) * 30, x = p.x + Math.sin(t / 900 + p.fase) * 1.2;
          c.fillStyle = "rgba(255, 255, 255, 0.95)"; c.strokeStyle = "rgba(120, 150, 180, 0.4)"; c.lineWidth = px * 0.6;
          c.beginPath(); c.arc(x, p.y - z, 0.35, 0, 7); c.fill(); c.stroke();
          break;
        }
        case "chuva": {
          const z = (1 - p.vida) * 30;
          c.strokeStyle = "rgba(110, 145, 190, 0.55)"; c.lineWidth = Math.max(px, 0.12);
          c.beginPath(); c.moveTo(p.x, p.y - z); c.lineTo(p.x - 0.5, p.y - z + 2.2); c.stroke();
          break;
        }
      }
    }
  }

  // ---------------------------------------------------------------- clima dos eventos (por cima de tudo)
  function desenharClima(c, W, H, t) {
    if (climas.has("inverno")) { c.fillStyle = "rgba(200, 220, 255, 0.12)"; c.fillRect(0, 0, W, H); }
    if (climas.has("calor") || climas.has("seca")) { c.fillStyle = "rgba(255, 170, 60, 0.1)"; c.fillRect(0, 0, W, H); }
    if (climas.has("enchente")) { c.fillStyle = "rgba(90, 120, 160, 0.1)"; c.fillRect(0, 0, W, H); }
    if (climas.has("eclipse")) { c.fillStyle = "rgba(15, 20, 50, 0.38)"; c.fillRect(0, 0, W, H); }
    if (climas.has("neblina")) {
      c.fillStyle = "rgba(240, 240, 236, 0.25)"; c.fillRect(0, 0, W, H);
      for (let i = 0; i < 6; i++) {
        const x = ((t / 35 + i * 260) % (W + 600)) - 300, y = H * (0.12 + 0.16 * i);
        const gr = c.createRadialGradient(x, y, 0, x, y, 280);
        gr.addColorStop(0, "rgba(250, 250, 248, 0.5)"); gr.addColorStop(1, "rgba(250, 250, 248, 0)");
        c.fillStyle = gr; c.fillRect(x - 280, y - 280, 560, 560);
      }
    }
    if (climas.has("radiacao")) {
      for (let i = 0; i < 3; i++) {
        const y = H * (0.08 + i * 0.08) + Math.sin(t / 1500 + i) * 14;
        const gr = c.createLinearGradient(0, 0, W, 0);
        const h = (t / 40 + i * 60) % 360;
        gr.addColorStop(0, `hsla(${h}, 80%, 60%, 0)`); gr.addColorStop(0.5, `hsla(${(h + 60) % 360}, 80%, 60%, 0.18)`); gr.addColorStop(1, `hsla(${(h + 120) % 360}, 80%, 60%, 0)`);
        c.fillStyle = gr; c.fillRect(0, y - 18, W, 36);
      }
    }
    if (climas.has("meteoros")) {
      const m = Math.floor(t / 1400), prog = (t % 1400) / 1400;
      if (prog < 0.5) {
        const r = sorteador(m), x0 = r() * W, y0 = r() * H * 0.3, x = x0 - prog * 400, y = y0 + prog * 260;
        const gr = c.createLinearGradient(x, y, x + 120, y - 78);
        gr.addColorStop(0, "rgba(255, 240, 200, 0.95)"); gr.addColorStop(1, "rgba(255, 200, 120, 0)");
        c.strokeStyle = gr; c.lineWidth = 3;
        c.beginPath(); c.moveTo(x, y); c.lineTo(x + 120, y - 78); c.stroke();
      }
    }
  }

  return { fundo, altos, desenharAlto, atualizar, desenharChaoAnimado, desenharParticulas, desenharClima, bioEm };
}
