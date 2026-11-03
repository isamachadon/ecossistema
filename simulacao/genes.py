"""
genes.py: o "DNA" das criaturas.

Cada criatura carrega um genoma: um dicionário de números mais uma lista
de enfeites. O filhote recebe uma cópia do genoma do pai com pequenas
mutações aleatórias. Alguns genes mudam a sobrevivência (tamanho,
velocidade, visão...), outros só mudam a aparência (olhos, patas,
padrões, enfeites). Como os números são contínuos e os enfeites podem
surgir e sumir, as combinações possíveis são praticamente infinitas.
"""

import math

# nome do gene: (mínimo, máximo, tamanho do passo de mutação, peso na hora de comparar espécies)
GENES = {
    # genes que mexem na sobrevivência
    "tamanho":          (0.4, 4.0, 0.08, 2.0),
    "velocidade":       (0.2, 3.5, 0.08, 2.0),
    "visao":            (4.0, 70.0, 1.5, 2.0),
    "metabolismo":      (0.4, 2.5, 0.05, 2.0),
    "dieta":            (0.0, 1.0, 0.03, 3.0),    # 0 = só planta, 1 = só carne
    "idade_reproducao": (15.0, 250.0, 5.0, 2.0),
    "ninhada":          (1.0, 5.0, 0.15, 1.5),    # filhotes por vez (arredondado)
    "espinhos":         (0.0, 1.0, 0.03, 1.5),    # defesa contra predadores, mas custa energia
    # genes de aparência
    "matiz":            (0.0, 360.0, 6.0, 1.5),   # a cor, no "círculo das cores"
    "saturacao":        (0.15, 0.95, 0.03, 0.5),
    "luz":              (0.25, 0.75, 0.02, 0.5),
    "formato":          (0.0, 1.0, 0.04, 1.0),    # de redondinho a comprido
    "patas":            (0.0, 12.0, 0.3, 1.0),
    "olhos":            (1.0, 9.0, 0.2, 1.0),
    "antenas":          (0.0, 4.0, 0.15, 0.7),
    "cauda":            (0.0, 1.0, 0.04, 0.7),
    "padrao":           (0.0, 5.99, 0.15, 1.0),   # liso, listras, pintas, anéis, escamas, manchas
    "densidade_padrao": (0.0, 1.0, 0.05, 0.5),
    "matiz_padrao":     (0.0, 360.0, 8.0, 0.5),
    # genes de forma: o plano corporal muda o corpo inteiro (só muda em saltos raros)
    "plano":            (0.0, 11.99, 0.0, 4.0),   # oval, lagarta, geleia, aranha, caracol, ave,
                                                  # cogumelo, estrela, cristal, balão, lagarto, peixe
    "segmentos":        (2.0, 9.0, 0.2, 0.8),
    "cabeca":           (0.0, 1.0, 0.04, 0.8),
    "pescoco":          (0.0, 1.0, 0.04, 0.6),
    "lados":            (3.0, 9.0, 0.2, 0.6),
    "ondulacao":        (0.0, 1.0, 0.04, 0.6),
}
GENES_FORMA = ["plano", "segmentos", "cabeca", "pescoco", "lados", "ondulacao"]
PLANOS = 12

GENES_CIRCULARES = {"matiz", "matiz_padrao"}  # cores dão a volta: 359 fica pertinho de 0

# crista, babado, chifre, barbatana, lanterna, bigode, asinha, casco, topete, brilho
TIPOS_ENFEITE = 10
MAX_ENFEITES = 8


def _limitar(nome, valor):
    minimo, maximo = GENES[nome][0], GENES[nome][1]
    if nome == "plano":
        return int(max(0, min(PLANOS - 1, valor)))
    if nome in GENES_CIRCULARES:
        return round(valor % 360.0, 3)
    return round(max(minimo, min(maximo, valor)), 4)


def enfeite_aleatorio(rng):
    return {"tipo": rng.randrange(TIPOS_ENFEITE), "pos": round(rng.random(), 3),
            "tam": round(rng.random(), 3), "matiz": round(rng.uniform(0, 360), 1)}


def copiar(g):
    novo = dict(g)
    novo["enfeites"] = [dict(e) for e in g.get("enfeites", [])]
    return novo


def genoma_aleatorio(rng, dieta=None):
    """Cria um genoma do zero. dieta: 'herbivora', 'carnivora', 'onivora' ou None (sorteia)."""
    g = {nome: _limitar(nome, rng.uniform(minimo, maximo))
         for nome, (minimo, maximo, _, _) in GENES.items()}
    # valores iniciais mais razoáveis, pra vida não começar no modo difícil
    g["tamanho"] = rng.uniform(0.7, 1.6)
    g["velocidade"] = rng.uniform(0.7, 1.5)
    g["visao"] = rng.uniform(12, 30)
    g["metabolismo"] = rng.uniform(0.8, 1.2)
    g["idade_reproducao"] = rng.uniform(40, 90)
    g["ninhada"] = rng.uniform(1, 2.5)
    g["espinhos"] = rng.uniform(0, 0.3)
    if dieta is None:
        dieta = rng.choice(["herbivora", "herbivora", "onivora", "carnivora"])
    if dieta == "herbivora":
        g["dieta"] = rng.uniform(0.0, 0.15)
    elif dieta == "carnivora":
        g["dieta"] = rng.uniform(0.85, 1.0)
        g["tamanho"] = rng.uniform(1.3, 2.0)
        g["velocidade"] = rng.uniform(1.4, 1.9)  # caçador nasce caçador
        g["visao"] = rng.uniform(25, 40)
        g["idade_reproducao"] = rng.uniform(100, 150)  # predador tem filhote devagar
        g["ninhada"] = 1.0
    else:
        g["dieta"] = rng.uniform(0.4, 0.6)
    for nome in list(GENES):
        g[nome] = _limitar(nome, g[nome])
    g["enfeites"] = [enfeite_aleatorio(rng) for _ in range(rng.randrange(0, 3))]
    return g


def mutar(pai, rng, intensidade=1.0):
    """Copia o genoma do pai com pequenas mudanças. intensidade > 1 = mais mutação."""
    filho = {}
    for nome, (minimo, maximo, passo, _) in GENES.items():
        valor = pai[nome]
        if nome == "plano":  # o corpo inteiro só muda num salto raro
            if rng.random() < 0.004 * intensidade:
                valor = rng.randrange(PLANOS)
            filho[nome] = valor
            continue
        if rng.random() < 0.3 * intensidade:
            valor += rng.gauss(0, passo * intensidade)
        if rng.random() < 0.003 * intensidade:  # mutação rara e grande: um "salto"
            valor = rng.uniform(minimo, maximo)
        filho[nome] = _limitar(nome, valor)

    enfeites = [dict(e) for e in pai["enfeites"]]
    for e in enfeites:
        if rng.random() < 0.2:
            e["pos"] = round(min(1, max(0, e["pos"] + rng.gauss(0, 0.05))), 3)
            e["tam"] = round(min(1, max(0, e["tam"] + rng.gauss(0, 0.05))), 3)
            e["matiz"] = round((e["matiz"] + rng.gauss(0, 8)) % 360, 1)
    if rng.random() < 0.02 * intensidade and len(enfeites) < MAX_ENFEITES:
        enfeites.append(enfeite_aleatorio(rng))  # ganhou um enfeite novo!
    if rng.random() < 0.015 * intensidade and enfeites:
        enfeites.pop(rng.randrange(len(enfeites)))  # perdeu um enfeite
    filho["enfeites"] = enfeites
    return filho


def distancia(a, b, enfeites=True):
    """Quão diferentes são dois genomas: 0 = idênticos, 1 = opostos em tudo."""
    total, pesos = 0.0, 0.0
    for nome, (minimo, maximo, _, peso) in GENES.items():
        diff = abs(a[nome] - b[nome])
        if nome == "plano":
            diff = 0.0 if a[nome] == b[nome] else maximo - minimo  # corpo diferente = diferença total
        if nome in GENES_CIRCULARES:
            diff = min(diff, 360 - diff) / 180.0
        else:
            diff = diff / (maximo - minimo)
        total += diff * peso
        pesos += peso
    if enfeites:
        diff = min(1.0, abs(len(a["enfeites"]) - len(b["enfeites"])) / 4)
        tipos_a = {e["tipo"] for e in a["enfeites"]}
        tipos_b = {e["tipo"] for e in b["enfeites"]}
        diff = max(diff, len(tipos_a ^ tipos_b) / 6)
        total += min(1.0, diff) * 1.0
        pesos += 1.0
    return total / pesos


def representante(genomas):
    """Escolhe o genoma mais típico de um grupo (o mais perto da média).
    Naturalistas chamam isso de holótipo: o exemplar que representa a espécie."""
    media = {}
    for nome in GENES:
        if nome == "plano":  # o plano mais comum do grupo
            planos = [g[nome] for g in genomas]
            media[nome] = max(set(planos), key=planos.count)
        elif nome in GENES_CIRCULARES:
            sx = sum(math.cos(math.radians(g[nome])) for g in genomas)
            sy = sum(math.sin(math.radians(g[nome])) for g in genomas)
            media[nome] = math.degrees(math.atan2(sy, sx)) % 360
        else:
            media[nome] = sum(g[nome] for g in genomas) / len(genomas)
    melhor = min(genomas, key=lambda g: distancia(g, media, enfeites=False))
    return copiar(melhor)


def completar_forma(g, rng):
    """Dá genes de forma a um genoma antigo, que nasceu antes deles existirem."""
    for nome in GENES_FORMA:
        if nome not in g:
            minimo, maximo = GENES[nome][0], GENES[nome][1]
            g[nome] = _limitar(nome, rng.uniform(minimo, maximo))


def dieta_nome(g):
    if g["dieta"] < 0.33:
        return "herbívora"
    if g["dieta"] > 0.66:
        return "carnívora"
    return "onívora"


def massa(g):
    return g["tamanho"] ** 2


def energia_max(g):
    return 50.0 * massa(g) ** 0.8 + 20


def idade_max(g):
    return g["idade_reproducao"] * 4 + 150
