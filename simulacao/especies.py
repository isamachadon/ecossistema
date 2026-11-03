"""
especies.py: o cartório da evolução.

Agrupa criaturas parecidas em espécies, percebe quando um grupo se afastou
tanto da sua espécie de origem que já virou outra coisa (especiação) e
anota quando uma espécie some de vez (extinção). Também guarda quem veio
de quem, pra montar a árvore genealógica.
"""

from genes import distancia, representante
import nomes

LIMIAR = 0.10     # quão diferente um grupo precisa ficar pra virar espécie nova
MIN_GRUPO = 8    # quantos indivíduos parecidos precisa ter pra contar como espécie

FRASES_NOVA = [
    "Surgiu uma espécie nova: {nova}, descendente de {pai}. Já chegou se achando.",
    "Os parentes nem reconhecem mais: um ramo de {pai} virou a espécie {nova}.",
    "Evolução em ação! Nasce {nova}, filha rebelde de {pai}.",
    "{nova} se separou de {pai}. Dizem que foi por divergências culinárias.",
    "Novidade no pedaço: {nova}, uma versão 2.0 de {pai}.",
    "{nova} apareceu por aqui. Quem conhece {pai} jura que é parecida, só que não.",
    "Um grupo de {pai} cansou da família e fundou a própria espécie: {nova}.",
]
FRASES_EXTINCAO = [
    "A espécie {esp} foi extinta depois de {idade} de existência. Deixou saudade (em alguns).",
    "Fim da linha para {esp}. Ninguém sobrou pra contar a história.",
    "{esp} não existe mais. Descanse em paz, campeã.",
    "Extinção confirmada: {esp}. O planeta ficou um pouco mais sem graça.",
    "Adeus, {esp}. Viveu {idade} e lutou até o fim.",
]


def registro(periodo, tipo, texto, especies=()):
    """Uma anotação no diário. {esp:12} no texto vira o nome da espécie 12 no site."""
    return {"periodo": periodo, "tipo": tipo, "texto": texto, "especies": list(especies)}


def marca(eid):
    return "{esp:%d}" % eid


def _dias(n):
    return "1 dia" if n == 1 else f"{n} dias"


def nova_especie(estado, rng, holotipo, pai, origem):
    eid = estado["proximo_id_especie"]
    estado["proximo_id_especie"] += 1
    genero = None
    if pai is not None and rng.random() < 0.7:
        genero = estado["especies"][str(pai)]["genero"]  # filhas costumam ficar no mesmo gênero
    if genero is None:
        genero = nomes.genero(rng)
    usados = {(e["genero"], e["epiteto"]) for e in estado["especies"].values()}
    epiteto = nomes.epiteto(holotipo, rng)
    for _ in range(10):
        if (genero, epiteto) not in usados:
            break
        epiteto = nomes.epiteto(holotipo, rng)
    if (genero, epiteto) in usados:
        genero = nomes.genero(rng)
    esp = {"id": eid, "pai": pai, "nascimento": estado["periodo"], "extincao": None,
           "origem": origem, "genero": genero, "epiteto": epiteto,
           "apelido_sugerido": nomes.apelido(holotipo, rng),
           "tipo": holotipo, "pop": 0, "pico": 0}
    estado["especies"][str(eid)] = esp
    return esp


def classificar(estado, rng):
    """Confere quem virou espécie nova e quem foi extinto. Devolve as anotações do diário."""
    p = estado["periodo"]
    registros = []
    grupos = {}
    for c in estado["criaturas"]:
        grupos.setdefault(c["esp"], []).append(c)

    for eid, membros in grupos.items():
        tipo = estado["especies"][str(eid)]["tipo"]
        distantes = [c for c in membros if distancia(c["g"], tipo) > LIMIAR]
        while len(distantes) >= MIN_GRUPO:
            semente = max(distantes, key=lambda c: distancia(c["g"], tipo))
            grupo = [c for c in distantes if distancia(c["g"], semente["g"]) < LIMIAR]
            if len(grupo) < MIN_GRUPO:
                distantes.remove(semente)  # era só um esquisitão solitário
                continue
            nova = nova_especie(estado, rng, representante([c["g"] for c in grupo]), eid, "especiacao")
            for c in grupo:
                c["esp"] = nova["id"]
            texto = rng.choice(FRASES_NOVA).format(nova=marca(nova["id"]), pai=marca(eid))
            registros.append(registro(p, "especie_nova", texto, [nova["id"], eid]))
            distantes = [c for c in distantes if c["esp"] == eid]

    registros += contar(estado, rng)
    return registros


def contar(estado, rng):
    """Atualiza a população de cada espécie e anota as extinções."""
    p = estado["periodo"]
    registros = []
    contagem = {}
    for c in estado["criaturas"]:
        contagem[c["esp"]] = contagem.get(c["esp"], 0) + 1
    for esp in estado["especies"].values():
        if esp["extincao"] is not None:
            continue
        n = contagem.get(esp["id"], 0)
        esp["pop"] = n
        esp["pico"] = max(esp["pico"], n)
        if n == 0:
            esp["extincao"] = p
            texto = rng.choice(FRASES_EXTINCAO).format(esp=marca(esp["id"]),
                                                        idade=_dias(p - esp["nascimento"]))
            registros.append(registro(p, "extincao", texto, [esp["id"]]))
    return registros
