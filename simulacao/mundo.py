"""
mundo.py: o planeta e as leis da natureza.

Aqui moram o mapa (com biomas), a comida que brota e o "tique" da vida:
a cada tique, toda criatura gasta energia, procura comida (ou presa),
foge de predadores, come, se reproduz e, se der azar, morre.
Ninguém decide quem vence: quem come sobrevive, quem não come some.
"""

import bisect
import math

from genes import energia_max, idade_max, massa, mutar

LARGURA, ALTURA = 400.0, 250.0
CEL = 25.0                                      # tamanho de cada quadradinho do mapa
COLS, LINHAS = int(LARGURA // CEL), int(ALTURA // CEL)

TIQUES_POR_PERIODO = 300
QUADROS_GRAVADOS = 1           # o site só precisa da última "foto" pra começar o modo ao vivo
COMIDA_POR_TIQUE = 2.4
COMIDA_MAX = 900
ENERGIA_PLANTA = 9.0
POP_MAX = 600                  # trava de segurança pra simulação não ficar lenta demais

# quanto cada bioma produz de comida
FERTILIDADE_BIOMA = {"campo": 1.0, "floresta": 1.6, "pantano": 1.2, "deserto": 0.25, "tundra": 0.45}
# onde é mais fácil se esconder de predador (multiplica a chance do ataque dar certo)
ESCONDERIJO = {"floresta": 0.35, "pantano": 0.6}


def _bioma_em(estado, x, y):
    return estado["biomas"][min(int(y // CEL), LINHAS - 1)][min(int(x // CEL), COLS - 1)]


def gerar_biomas(rng):
    """Desenha o mapa: sorteia umidade e temperatura suaves e decide o bioma de cada quadradinho."""
    def ruido():
        grade = [[rng.random() for _ in range(6)] for _ in range(5)]

        def valor(cx, cy):
            gx, gy = cx / (COLS - 1) * 5, cy / (LINHAS - 1) * 4
            x0, y0 = int(gx), int(gy)
            x1, y1 = min(x0 + 1, 5), min(y0 + 1, 4)
            fx, fy = gx - x0, gy - y0
            fx, fy = fx * fx * (3 - 2 * fx), fy * fy * (3 - 2 * fy)
            topo = grade[y0][x0] * (1 - fx) + grade[y0][x1] * fx
            base = grade[y1][x0] * (1 - fx) + grade[y1][x1] * fx
            return topo * (1 - fy) + base * fy
        return valor

    umidade, temperatura = ruido(), ruido()
    mapa = []
    for cy in range(LINHAS):
        linha = []
        for cx in range(COLS):
            u, t = umidade(cx, cy), temperatura(cx, cy)
            if t < 0.3:
                bioma = "tundra"
            elif u < 0.3:
                bioma = "deserto"
            elif u > 0.62 and t > 0.5:
                bioma = "floresta"
            elif u > 0.6:
                bioma = "pantano"
            else:
                bioma = "campo"
            linha.append(bioma)
        mapa.append(linha)
    return mapa


def _dentro(v, maximo):
    return min(max(v, 0.0), maximo - 0.01)


def nova_criatura(estado, genoma, especie, x, y, energia, rng):
    cid = estado["proximo_id_criatura"]
    estado["proximo_id_criatura"] += 1
    return {"id": cid, "esp": especie, "x": _dentro(x, LARGURA), "y": _dentro(y, ALTURA),
            "dir": rng.uniform(0, 2 * math.pi), "e": energia, "idade": 0, "ger": 0, "g": genoma}


def pesos_comida(biomas, mult_bioma):
    """Lista acumulada de 'chances' de cada quadradinho receber comida."""
    acumulado, total = [], 0.0
    for linha in biomas:
        for bioma in linha:
            total += FERTILIDADE_BIOMA[bioma] * mult_bioma.get(bioma, 1.0)
            acumulado.append(total)
    return acumulado


def semear_comida(estado, rng, quantidade, pesos, limite=COMIDA_MAX):
    comida = estado["comida"]
    total = pesos[-1]
    for _ in range(quantidade):
        if len(comida) >= limite or total <= 0:
            break
        i = bisect.bisect_left(pesos, rng.random() * total)
        cx, cy = i % COLS, i // COLS
        comida.append([round((cx + rng.random()) * CEL, 1), round((cy + rng.random()) * CEL, 1)])


def rodar_periodo(estado, rng, mods):
    """Roda um período inteiro (vários tiques) e devolve as estatísticas e os fotogramas."""
    stats = {"nascimentos": 0, "fome": 0, "velhice": 0, "predacao": 0, "praga": 0}
    pesos = pesos_comida(estado["biomas"], mods["bioma"])
    quadros, info = [], {}
    comeca_gravar = TIQUES_POR_PERIODO - QUADROS_GRAVADOS * 2
    for t in range(TIQUES_POR_PERIODO):
        _tique(estado, rng, mods, pesos, stats)
        estado["tique"] += 1
        if t >= comeca_gravar and t % 2 == 0:
            quadros.append(_fotografar(estado, info))
    return stats, quadros, info


def _fotografar(estado, info):
    quadro = []
    for c in estado["criaturas"]:
        quadro.extend((c["id"], round(c["x"], 1), round(c["y"], 1)))
        if c["id"] not in info:
            g = c["g"]
            info[c["id"]] = [c["esp"], round(g["tamanho"], 2), round(g["matiz"]),
                             round(g["saturacao"], 2), round(g["luz"], 2), round(g["dieta"], 2),
                             round(g["velocidade"] * (0.7 + 0.3 * g["metabolismo"]), 2), round(g["visao"], 1)]
    return quadro


def _morrer(c, causa, stats):
    c["morto"] = True
    stats[causa] += 1


def _tique(estado, rng, mods, pesos, stats):
    # 1) Comida brota, mais nos biomas férteis
    quantidade = COMIDA_POR_TIQUE * mods["fertilidade"]
    semear_comida(estado, rng, int(quantidade) + (1 if rng.random() < quantidade % 1 else 0), pesos)
    comida = estado["comida"]
    criaturas = estado["criaturas"]

    # 2) Separa tudo em "gavetas" (por quadradinho) pra achar vizinhos rápido
    gav_comida = {}
    for i, (x, y) in enumerate(comida):
        gav_comida.setdefault((int(x // CEL), int(y // CEL)), []).append(i)
    gav_criat = {}
    for c in criaturas:
        gav_criat.setdefault((int(c["x"] // CEL), int(c["y"] // CEL)), []).append(c)

    comidas_comidas = set()
    nascidos = []
    populacao = len(criaturas)
    rng.shuffle(criaturas)  # ordem justa: ninguém age sempre primeiro

    for c in criaturas:
        if c.get("morto"):
            continue
        g = c["g"]
        m = massa(g)
        met = g["metabolismo"]
        dieta = g["dieta"]
        tam = g["tamanho"]
        c["idade"] += 1

        # 3) Gasta energia só por existir (ser grande, rápido e enxergar longe custa caro)
        custo = met * (0.03 * m ** 0.75 + 0.012 * g["velocidade"] ** 2 * m ** 0.5
                       + 0.0012 * g["visao"] + 0.02 * g["espinhos"] * m ** 0.5)
        custo *= mods["custo"]
        custo *= 1 + (mods["calor"] - 1) * min(1.0, m / 4)     # calor castiga os grandalhões
        custo *= 1 + (mods["frio"] - 1) * max(0.0, 1 - m / 4)  # frio castiga os pequenos
        c["e"] -= custo

        chance_praga = mods["praga"].get(str(c["esp"]))
        if chance_praga and rng.random() < chance_praga:
            _morrer(c, "praga", stats)
            continue
        if c["e"] <= 0:
            _morrer(c, "fome", stats)
            continue
        if c["idade"] * met > idade_max(g):
            _morrer(c, "velhice", stats)
            continue

        # 4) Olha em volta: comida, presas e ameaças
        x, y = c["x"], c["y"]
        visao = g["visao"] * mods["visao"]
        vel = g["velocidade"] * (0.7 + 0.3 * met) * mods["velocidade"]
        alcance = 1.5 + tam
        v2 = visao * visao
        x0, x1 = int((x - visao) // CEL), int((x + visao) // CEL)
        y0, y1 = int((y - visao) // CEL), int((y + visao) // CEL)

        digerindo = c.get("dig", 0)  # de barriga cheia, predador não caça
        if digerindo > 0:
            c["dig"] = digerindo - 1
        alvo, alvo_valor, alvo_tipo = None, 0.0, None
        presas_vistas = 0
        ameaca, ameaca_d2 = None, v2 * 0.2   # só percebe o perigo quando ele já está perto

        if dieta < 0.9:
            ganho = ENERGIA_PLANTA * (1 - dieta)
            for gx in range(x0, x1 + 1):
                for gy in range(y0, y1 + 1):
                    for i in gav_comida.get((gx, gy), ()):
                        if i in comidas_comidas:
                            continue
                        fx, fy = comida[i]
                        d2 = (fx - x) ** 2 + (fy - y) ** 2
                        if d2 > v2:
                            continue
                        valor = ganho / (math.sqrt(d2) + 3)
                        if valor > alvo_valor:
                            alvo, alvo_valor, alvo_tipo = i, valor, "planta"

        for gx in range(x0, x1 + 1):
            for gy in range(y0, y1 + 1):
                for o in gav_criat.get((gx, gy), ()):
                    if o is c or o.get("morto") or o["esp"] == c["esp"]:
                        continue
                    d2 = (o["x"] - x) ** 2 + (o["y"] - y) ** 2
                    if d2 > v2:
                        continue
                    og = o["g"]
                    if og["dieta"] > 0.5 and og["tamanho"] > tam and d2 < ameaca_d2:
                        ameaca, ameaca_d2 = o, d2
                    if dieta > 0.3 and digerindo <= 0 and og["tamanho"] < tam * 1.3:
                        presas_vistas += 1
                        valor = ((og["tamanho"] ** 2 * 12 + 8) * dieta * (1 - 0.7 * og["espinhos"])
                                 / (math.sqrt(d2) + 3))
                        if valor > alvo_valor:
                            alvo, alvo_valor, alvo_tipo = o, valor, "presa"

        # 5) Decide pra onde ir
        if ameaca is not None and (alvo is None or ameaca_d2 < 0.25 * v2):
            ang = math.atan2(y - ameaca["y"], x - ameaca["x"]) + rng.gauss(0, 0.3)
            passo = vel
        elif alvo is not None:
            tx, ty = comida[alvo] if alvo_tipo == "planta" else (alvo["x"], alvo["y"])
            ang = math.atan2(ty - y, tx - x)
            arrancada = 1.0
            if alvo_tipo == "presa":  # o pique do bote: mais rápido, mas cansa
                arrancada = 1.2
                c["e"] -= 0.02 * m ** 0.5
            passo = min(vel * arrancada, math.hypot(tx - x, ty - y))
        else:
            ang = c["dir"] + rng.gauss(0, 0.5)
            passo = vel * 0.6

        nx, ny = x + math.cos(ang) * passo, y + math.sin(ang) * passo
        if nx < 0 or nx >= LARGURA:
            ang = math.pi - ang
            nx = _dentro(nx, LARGURA)
        if ny < 0 or ny >= ALTURA:
            ang = -ang
            ny = _dentro(ny, ALTURA)
        c["x"], c["y"], c["dir"] = nx, ny, ang

        # 6) Come, se alcançar
        if alvo is not None:
            if alvo_tipo == "planta":
                fx, fy = comida[alvo]
                if (fx - nx) ** 2 + (fy - ny) ** 2 <= alcance * alcance:
                    comidas_comidas.add(alvo)
                    c["e"] += ENERGIA_PLANTA * (1 - dieta)
            elif not alvo.get("morto"):
                if (alvo["x"] - nx) ** 2 + (alvo["y"] - ny) ** 2 <= (alcance + 1) ** 2:
                    og = alvo["g"]
                    chance = 0.3 * min(1.6, tam / og["tamanho"]) * (1 - 0.75 * og["espinhos"])
                    chance *= ESCONDERIJO.get(_bioma_em(estado, alvo["x"], alvo["y"]), 1.0)
                    if presas_vistas < 3:
                        chance *= 0.35  # presa rara é presa difícil de achar e encurralar
                    if rng.random() < chance:
                        c["e"] += (max(alvo["e"], 0) * 0.6 + og["tamanho"] ** 2 * 20 + 10) * dieta
                        c["dig"] = 40
                        _morrer(alvo, "predacao", stats)
                    else:
                        c["e"] -= 1 + 8 * og["espinhos"]  # levou uma espetada

        # 7) Reproduz, se estiver adulto e bem alimentado
        emax = energia_max(g)
        if c["e"] > emax:
            c["e"] = emax
        # quanto mais carnívoro, mais bem alimentado precisa estar pra ter filhote
        if (c["idade"] * met >= g["idade_reproducao"] and c["e"] > (0.6 + 0.3 * dieta) * emax
                and populacao + len(nascidos) < POP_MAX):
            filhos = max(1, round(g["ninhada"]))
            doacao = c["e"] * 0.5
            c["e"] -= doacao
            for _ in range(filhos):
                filho = nova_criatura(estado, mutar(g, rng, mods["mutacao"]), c["esp"],
                                      nx + rng.uniform(-3, 3), ny + rng.uniform(-3, 3),
                                      doacao / filhos * 0.85, rng)
                filho["ger"] = c["ger"] + 1
                nascidos.append(filho)
            stats["nascimentos"] += filhos

    # 8) Limpa a bagunça: tira comida comida e criaturas mortas, chegam os filhotes
    if comidas_comidas:
        estado["comida"] = [f for i, f in enumerate(comida) if i not in comidas_comidas]
    estado["criaturas"] = [c for c in criaturas if not c.get("morto")] + nascidos
