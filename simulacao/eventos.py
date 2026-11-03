"""
eventos.py: as surpresas da natureza.

De vez em quando o planeta resolve testar seus moradores: seca, praga,
inverno longo, migração e mais um monte de coisa. Cada evento é montado
na hora juntando peças (tipo, intensidade, lugar, duração e nome), então
é difícil dois serem iguais.
"""

import especies
import genes
import mundo

CHANCE_POR_PERIODO = 0.12
MAX_SIMULTANEOS = 3

LUGARES = {
    "campo": ("do Campo", "no Campo"),
    "floresta": ("da Floresta", "na Floresta"),
    "pantano": ("do Pântano", "no Pântano"),
    "deserto": ("do Deserto", "no Deserto"),
    "tundra": ("da Tundra", "na Tundra"),
}

QUALIFICADORES = ["Implacável", "Inesquecível", "Colossal", "Sem Precedentes", "do Século",
                  "Inexplicável", "Brutal", "Feroz", "Sem Fim", "de Respeito", "Infame", "Memorável",
                  "Imprevisível", "Fenomenal", "Lamentável", "Incrível", "Monumental",
                  "Que Ninguém Pediu", "Sem Noção", "Inacreditável"]

# Cada tipo: chance relativa, gênero (pra frase de fim), duração em dias (None = instantâneo),
# chance de ser regional, nomes possíveis e frases de anúncio.
# Nas frases: {nome}, {de} = " do Campo", {em} = " no Campo", {n} = número, {esp} = espécie.
TIPOS = {
    "seca": {"peso": 10, "genero": "f", "duracao": (1, 4), "regional": 0.5,
             "nomes": ["Seca", "Estiagem", "Grande Secura", "Sede Coletiva"],
             "frases": ["Começou a {nome}{de}. As plantas entraram em greve e ninguém sabe quando voltam.",
                        "{nome}{de}: a comida sumiu e a fila do bufê ficou gigante.",
                        "Não chove há tanto tempo que os bichos esqueceram o que é molhado. É a {nome}{de}."]},
    "praga": {"peso": 8, "genero": "f", "duracao": (1, 3),
              "nomes": ["Praga", "Peste", "Febre Esquisita", "Tosse Coletiva", "Gripe Misteriosa",
                        "Coceira Generalizada"],
              "frases": ["Chegou a {nome} e escolheu a espécie {esp} como alvo. Ninguém lavou as patas.",
                         "A espécie {esp} acordou espirrando: é a {nome}. Chazinho ainda não foi inventado.",
                         "{nome} à vista! A espécie {esp} está com cara de quem precisa de atestado."]},
    "inverno": {"peso": 7, "genero": "m", "duracao": (2, 5),
                "nomes": ["Inverno Longo", "Inverno Eterno", "Frio Absurdo", "Congelamento Geral",
                          "Inverno Que Não Acaba"],
                "frases": ["Começou o {nome}. Os pequenos tremem, os grandes fingem que está tudo bem.",
                           "{nome}: as plantas pararam de crescer e todo mundo anda devagar.",
                           "Chegou o {nome}. Cobertor ainda não evoluiu, infelizmente."]},
    "migracao": {"peso": 9, "genero": "f", "duracao": None,
                 "nomes": ["Migração", "Grande Migração", "Chegada dos Forasteiros", "Invasão Turística"],
                 "frases": ["{nome}! {n} forasteiros chegaram de longe. Bem-vinda, espécie {esp}.",
                            "A {nome} trouxe {n} visitantes esquisitos: a espécie {esp} agora mora aqui.",
                            "{nome}: desembarcaram {n} criaturas de origem desconhecida. Ninguém pediu "
                            "passaporte. Bem-vinda, espécie {esp}."]},
    "meteoros": {"peso": 3, "genero": "f", "duracao": (1, 2), "regional": 1.0,
                 "nomes": ["Chuva de Meteoros", "Chuva de Pedras Espaciais", "Tempestade de Meteoritos",
                           "Pancada Cósmica"],
                 "frases": ["Caiu uma {nome}{em}! {n} criaturas não tiveram tempo nem de reclamar. "
                            "A poeira estelar deixou todo mundo mais mutante.",
                            "{nome}{em}: {n} baixas e uma cratera nova pra turistas. "
                            "Os filhotes vão nascer diferentões."]},
    "floracao": {"peso": 7, "genero": "f", "duracao": (1, 3), "regional": 0.5,
                 "nomes": ["Floração", "Primavera Exagerada", "Explosão Verde", "Festa das Plantas"],
                 "frases": ["Começou a {nome}{de}! Tem comida até no teto.",
                            "{nome}{de}: as plantas estão brotando mais rápido que fofoca.",
                            "É a {nome}{de}. Os herbívoros não acreditam na própria sorte."]},
    "calor": {"peso": 6, "genero": "f", "duracao": (1, 3),
              "nomes": ["Onda de Calor", "Fornalha", "Torradeira Global", "Canícula"],
              "frases": ["Começou a {nome}! Os grandalhões procuram uma sombra que não existe.",
                         "{nome}: ser pequeno nunca foi tão vantajoso.",
                         "Chegou a {nome}. Até as pedras estão suando."]},
    "neblina": {"peso": 5, "genero": "f", "duracao": (1, 2),
                "nomes": ["Neblina", "Cerração", "Névoa Densa", "Neblina de Novela"],
                "frases": ["Baixou uma {nome}. Ninguém enxerga nada, nem o almoço, nem o predador.",
                           "{nome}: os bichos andam esbarrando uns nos outros e pedindo desculpas."]},
    "radiacao": {"peso": 4, "genero": "f", "duracao": (1, 3),
                 "nomes": ["Chuva de Raios Cósmicos", "Tempestade Solar", "Aurora Mutante",
                           "Passagem do Cometa"],
                 "frases": ["{nome}! Os filhotes vão nascer, digamos, criativos.",
                            "Começou a {nome}: as mutações estão a todo vapor. Aguarde surpresas.",
                            "A {nome} pintou o céu de cores estranhas. O DNA de todo mundo ficou animadinho."]},
    "enchente": {"peso": 5, "genero": "f", "duracao": (1, 2), "regional": 1.0,
                 "nomes": ["Enchente", "Cheia", "Inundação", "Tromba-d'água"],
                 "frases": ["A {nome}{de} levou {n} criaturas correnteza abaixo. Quem sabia nadar, agradece.",
                            "{nome}{em}! {n} criaturas foram dar um mergulho involuntário e não voltaram."]},
    "eclipse": {"peso": 3, "genero": "m", "duracao": (1, 1),
                "nomes": ["Eclipse", "Apagão Celeste", "Grande Apagão"],
                "frases": ["Começou um {nome}. Todo mundo achou que era o fim do mundo. Não era (ainda).",
                           "{nome}! Ficou tudo escuro e os predadores estão tropeçando nas presas."]},
    "terremoto": {"peso": 3, "genero": "m", "duracao": None,
                  "nomes": ["Terremoto", "Tremor", "Chacoalhão", "Sacolejo Geral"],
                  "frases": ["Um {nome} sacudiu o planeta! {n} criaturas não se seguraram.",
                             "{nome}! O chão dançou e {n} criaturas saíram da pista pra sempre."]},
    "chuva_frutas": {"peso": 3, "genero": "f", "duracao": None,
                     "nomes": ["Chuva de Frutas", "Chuva de Salada", "Chuva de Sementes"],
                     "frases": ["Caiu uma {nome}! Ninguém sabe de onde veio e ninguém está reclamando.",
                                "{nome}: {n} petiscos despencaram do céu. Os herbívoros fizeram fila."]},
}

FRASES_FIM = {
    "f": ["Acabou a {nome}. Ufa!", "Fim da {nome}. Os sobreviventes merecem um troféu.",
          "A {nome} foi embora sem nem se despedir.", "Terminou a {nome}. O planeta respira aliviado."],
    "m": ["Acabou o {nome}. Ufa!", "Fim do {nome}. Quem sobreviveu vai ter história pra contar no almoço.",
          "O {nome} foi embora sem nem se despedir.", "Terminou o {nome}. O planeta respira aliviado."],
}
FRASES_SOCORRO = [
    "O planeta estava quase vazio, então {n} forasteiros apareceram pra repovoar. Bem-vinda, espécie {esp}.",
    "A natureza detesta um planeta vazio: chegaram {n} criaturas da espécie {esp}, de mala e cuia.",
]
FRASES_PREDADORES = [
    "Os herbívoros estavam tranquilos demais. Aí chegaram {n} caçadores de fora: espécie {esp}. Acabou a paz.",
    "Boatos de bufê livre se espalharam: {n} predadores da espécie {esp} vieram conferir pessoalmente.",
    "Atenção, moradores: {n} carnívoros da espécie {esp} desembarcaram e já estão olhando o cardápio.",
]


def mods_base():
    """Os 'botões' da natureza. 1.0 = normal."""
    return {"fertilidade": 1.0, "bioma": {}, "custo": 1.0, "velocidade": 1.0, "visao": 1.0,
            "mutacao": 1.0, "calor": 1.0, "frio": 1.0, "praga": {}}


def _somar_mods(eventos):
    mods = mods_base()
    for ev in eventos:
        for chave, valor in ev["efeitos"].items():
            if chave == "bioma":
                for b, mult in valor.items():
                    mods["bioma"][b] = mods["bioma"].get(b, 1.0) * mult
            elif chave == "praga":
                for e, chance in valor.items():
                    mods["praga"][e] = mods["praga"].get(e, 0.0) + chance
            else:
                mods[chave] *= valor
    return mods


def _efeitos(tipo, i, bioma, alvo):
    if tipo == "seca":
        return {"bioma": {bioma: max(0.05, 1 - 0.9 * i)}} if bioma else {"fertilidade": 1 - 0.6 * i}
    if tipo == "praga":
        return {"praga": {str(alvo): 0.0008 + 0.0025 * i}}
    if tipo == "inverno":
        return {"frio": 1 + 1.2 * i, "fertilidade": 1 - 0.5 * i, "velocidade": 1 - 0.25 * i}
    if tipo == "meteoros":
        return {"mutacao": 1 + 2 * i}
    if tipo == "floracao":
        return {"bioma": {bioma: 1 + 2 * i}} if bioma else {"fertilidade": 1 + 1.2 * i}
    if tipo == "calor":
        return {"calor": 1 + 1.5 * i, "fertilidade": 1 - 0.25 * i}
    if tipo == "neblina":
        return {"visao": 1 - 0.6 * i}
    if tipo == "radiacao":
        return {"mutacao": 1 + 3 * i}
    if tipo == "enchente":
        return {"bioma": {bioma: 0.5}}
    if tipo == "eclipse":
        return {"visao": 0.5, "velocidade": 0.85}
    return {}


def _bioma_de(estado, x, y):
    return estado["biomas"][min(int(y // mundo.CEL), mundo.LINHAS - 1)][min(int(x // mundo.CEL), mundo.COLS - 1)]


def _matar(estado, rng, fracao, filtro):
    vivos, mortos = [], 0
    for c in estado["criaturas"]:
        if filtro(c) and rng.random() < fracao:
            mortos += 1
        else:
            vivos.append(c)
    estado["criaturas"] = vivos
    return mortos


def _chegar_forasteiros(estado, rng, n, dieta=None):
    g = genes.genoma_aleatorio(rng, dieta)
    esp = especies.nova_especie(estado, rng, g, None, "migracao")
    cx, cy = rng.uniform(20, mundo.LARGURA - 20), rng.uniform(20, mundo.ALTURA - 20)
    for _ in range(n):
        gf = genes.mutar(g, rng, 0.5)
        estado["criaturas"].append(mundo.nova_criatura(
            estado, gf, esp["id"], cx + rng.gauss(0, 15), cy + rng.gauss(0, 15),
            genes.energia_max(gf) * 0.7, rng))
    return esp


def _sortear(estado, rng):
    p = estado["periodo"]
    tipos = list(TIPOS)
    tipo = rng.choices(tipos, weights=[TIPOS[t]["peso"] for t in tipos])[0]
    info = TIPOS[tipo]
    i = rng.uniform(0.3, 1.0)
    nome = rng.choice(info["nomes"])
    if rng.random() < 0.6:
        nome += " " + rng.choice(QUALIFICADORES)
    bioma = None
    if rng.random() < info.get("regional", 0):
        bioma = rng.choice(sorted({b for linha in estado["biomas"] for b in linha}))
    dados = {"nome": nome, "de": "", "em": "", "n": 0, "esp": ""}
    if bioma:
        dados["de"], dados["em"] = " " + LUGARES[bioma][0], " " + LUGARES[bioma][1]
    envolvidas, alvo = [], None

    if tipo == "praga":
        contagem = {}
        for c in estado["criaturas"]:
            contagem[c["esp"]] = contagem.get(c["esp"], 0) + 1
        if not contagem:
            return []
        alvo = max(contagem, key=contagem.get)  # a praga sempre pega a espécie mais populosa
        dados["esp"] = especies.marca(alvo)
        envolvidas.append(alvo)
    elif tipo == "migracao":
        n = rng.randint(6, 18)
        esp = _chegar_forasteiros(estado, rng, n)
        dados["n"], dados["esp"] = n, especies.marca(esp["id"])
        envolvidas.append(esp["id"])
    elif tipo in ("meteoros", "enchente"):
        fracao = (0.25 + 0.5 * i) if tipo == "meteoros" else (0.15 + 0.35 * i)
        dados["n"] = _matar(estado, rng, fracao, lambda c: _bioma_de(estado, c["x"], c["y"]) == bioma)
    elif tipo == "terremoto":
        dados["n"] = _matar(estado, rng, 0.05 + 0.12 * i, lambda c: True)
    elif tipo == "chuva_frutas":
        n = int(200 + 400 * i)
        mundo.semear_comida(estado, rng, n, mundo.pesos_comida(estado["biomas"], {}),
                            limite=mundo.COMIDA_MAX + 600)
        dados["n"] = n

    texto = rng.choice(info["frases"]).format(**dados)
    if info["duracao"]:
        estado["eventos_ativos"].append({
            "tipo": tipo, "nome": nome, "texto": texto, "restam": rng.randint(*info["duracao"]),
            "intensidade": round(i, 2), "bioma": bioma, "inicio": p,
            "efeitos": _efeitos(tipo, i, bioma, alvo)})
    return [especies.registro(p, "migracao" if tipo == "migracao" else "evento", texto, envolvidas)]


def atualizar(estado, rng):
    """Chamado no começo de cada dia: encerra eventos velhos, talvez sorteia um novo.
    Devolve os 'botões' da natureza ajustados e as anotações do diário."""
    p = estado["periodo"]
    registros = []
    continuam = []
    for ev in estado["eventos_ativos"]:
        ev["restam"] -= 1
        if ev["restam"] <= 0:
            frase = rng.choice(FRASES_FIM[TIPOS[ev["tipo"]]["genero"]]).format(nome=ev["nome"])
            registros.append(especies.registro(p, "fim_evento", frase))
        else:
            continuam.append(ev)
    estado["eventos_ativos"] = continuam

    if len(estado["criaturas"]) < 15:
        n = rng.randint(15, 30)
        esp = _chegar_forasteiros(estado, rng, n)
        texto = rng.choice(FRASES_SOCORRO).format(n=n, esp=especies.marca(esp["id"]))
        registros.append(especies.registro(p, "migracao", texto, [esp["id"]]))

    sem_predador = not any(c["g"]["dieta"] > 0.66 for c in estado["criaturas"])
    if sem_predador and len(estado["criaturas"]) > 60 and rng.random() < 0.15:
        n = rng.randint(8, 14)
        esp = _chegar_forasteiros(estado, rng, n, "carnivora")
        texto = rng.choice(FRASES_PREDADORES).format(n=n, esp=especies.marca(esp["id"]))
        registros.append(especies.registro(p, "migracao", texto, [esp["id"]]))

    if len(estado["eventos_ativos"]) < MAX_SIMULTANEOS and rng.random() < CHANCE_POR_PERIODO:
        registros += _sortear(estado, rng)

    return _somar_mods(estado["eventos_ativos"]), registros
