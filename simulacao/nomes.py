"""
nomes.py: a fábrica de nomes.

Gera nomes científicos de mentirinha (em latim macarrônico), apelidos
sugeridos em português e o nome do planeta. As peças se combinam de
milhões de jeitos, então os nomes praticamente nunca se repetem.
O apelido aqui é só SUGESTÃO: o nome oficial quem dá é você, no
arquivo site/nomes.json.
"""

INICIO = ["Bro", "Cal", "Dra", "Fu", "Gli", "Ka", "Lu", "Mor", "Nim", "Pla", "Quo", "Ru", "Sel",
          "Tri", "Vex", "Zor", "Pi", "Ba", "Cro", "Ele", "Ix", "Ou", "Ste", "Gam", "Hel", "Ort",
          "Psi", "Tham", "Yl", "Zan", "Mu", "Fla", "Gor", "Rha", "Skel", "Wum"]
MEIO = ["ba", "ci", "do", "fe", "gu", "li", "mo", "na", "ro", "si", "ta", "vu", "xe", "za", "pi",
        "lo", "the", "ri", "cu", "ne", "bra", "tro"]
FIM = ["us", "ix", "on", "odon", "saurus", "pus", "ella", "ops", "ium", "ax", "oides", "phila",
       "ura", "pteryx", "morpha", "gnathus", "cephalus", "onyx", "ellus", "aria"]
FIM_PLANETA = ["on", "ia", "ar", "eth", "us", "ara", "ion", "ea", "or", "ul"]
SUFIXO_PLANETA = ["Prime", "II", "III", "IV", "V", "VII", "Menor", "Maior", "Azul", "Verde", "B", "Sigma"]


def genero(rng):
    meio = "".join(rng.choice(MEIO) for _ in range(rng.choice([0, 1, 1, 2])))
    return rng.choice(INICIO) + meio + rng.choice(FIM)


def nome_planeta(rng):
    meio = "".join(rng.choice(MEIO) for _ in range(rng.choice([1, 1, 2])))
    return rng.choice(INICIO) + meio + rng.choice(FIM_PLANETA) + " " + rng.choice(SUFIXO_PLANETA)


def _cor_latim(g):
    if g["saturacao"] < 0.25:
        return "griseus"
    h = g["matiz"]
    for limite, nome in [(15, "ruber"), (40, "aurantius"), (65, "aureus"), (160, "viridis"),
                         (200, "cyaneus"), (255, "caeruleus"), (290, "violaceus"),
                         (335, "purpureus"), (361, "roseus")]:
        if h < limite:
            return nome
    return "ruber"


def epiteto(g, rng):
    """A segunda parte do nome científico, inspirada na característica mais marcante."""
    op = [_cor_latim(g)]
    if g["tamanho"] > 2.3:
        op += ["gigas", "maximus", "colossalis"]
    if g["tamanho"] < 0.8:
        op += ["minimus", "pusillus", "nanus"]
    if g["velocidade"] > 2.0:
        op += ["velox", "fulminans", "turbinatus"]
    if g["velocidade"] < 0.6:
        op += ["lentus", "tardigradus", "preguicensis"]
    if g["visao"] > 40:
        op += ["perspicax", "telescopicus"]
    if round(g["olhos"]) >= 5:
        op += ["multioculatus", "argus"]
    if round(g["patas"]) >= 8:
        op += ["centipes", "multipes"]
    if round(g["patas"]) == 0:
        op += ["apodus", "rastejans"]
    if g["espinhos"] > 0.5:
        op += ["spinosus", "horridus", "naoabracensis"]
    if g["dieta"] > 0.75:
        op += ["vorax", "carnivorus", "famelicus"]
    elif g["dieta"] < 0.2:
        op += ["herbivorus", "saladensis", "phytophagus"]
    else:
        op += ["omnivorus", "comilonis"]
    if g["cauda"] > 0.6:
        op += ["caudatus", "longicauda"]
    if round(g["antenas"]) >= 3:
        op += ["antennatus"]
    if len(g["enfeites"]) >= 4:
        op += ["ornatissimus", "fashionista"]
    return rng.choice(op)


SUBST = [("Bolota", "f"), ("Trambolho", "m"), ("Lesma", "f"), ("Pantufa", "f"), ("Biscoito", "m"),
         ("Croquete", "m"), ("Pudim", "m"), ("Rabanete", "m"), ("Pipoca", "f"), ("Coxinha", "f"),
         ("Muriçoca", "f"), ("Fuçador", "m"), ("Bicho", "m"), ("Fofura", "f"), ("Torresmo", "m"),
         ("Pastel", "m"), ("Jujuba", "f"), ("Bolinho", "m"), ("Tamanco", "m"), ("Chinelo", "m"),
         ("Peteca", "f"), ("Cuscuz", "m"), ("Mandioca", "f"), ("Paçoca", "f"), ("Quindim", "m"),
         ("Brigadeiro", "m"), ("Esfirra", "f"), ("Abajur", "m"), ("Almôndega", "f"), ("Pamonha", "f")]
SUBST_TRACO = {
    "grande": [("Mastodonte", "m"), ("Bolotão", "m"), ("Jamanta", "f")],
    "pequeno": [("Migalha", "f"), ("Grãozinho", "m"), ("Pingo", "m")],
    "rapido": [("Corisco", "m"), ("Foguete", "m"), ("Ventania", "f")],
    "lento": [("Lesminha", "f"), ("Tartaruguinha", "f"), ("Soneca", "f")],
    "carnivoro": [("Mordedor", "m"), ("Dentuço", "m"), ("Abocanhador", "m"), ("Caçador", "m")],
    "herbivoro": [("Pastador", "m"), ("Mastigador", "m"), ("Ruminante", "m"), ("Comedor de Mato", "m")],
    "espinhos": [("Ouriço", "m"), ("Espeto", "m"), ("Cacto Ambulante", "m")],
    "olhos": [("Olhudo", "m"), ("Vigia", "m")],
    "patas": [("Centopeia", "f"), ("Perninha", "f")],
}
ADJ = [("Guloso", "Gulosa"), ("Ranzinza", "Ranzinza"), ("Saltitante", "Saltitante"),
       ("Desconfiado", "Desconfiada"), ("Preguiçoso", "Preguiçosa"), ("Dramático", "Dramática"),
       ("Fofoqueiro", "Fofoqueira"), ("Atrapalhado", "Atrapalhada"), ("Elegante", "Elegante"),
       ("Medroso", "Medrosa"), ("Sorridente", "Sorridente"), ("Faminto", "Faminta"),
       ("Metido", "Metida"), ("Sonolento", "Sonolenta"), ("Bagunceiro", "Bagunceira"),
       ("Charmoso", "Charmosa"), ("Teimoso", "Teimosa"), ("Distraído", "Distraída"),
       ("Nervoso", "Nervosa"), ("Cheiroso", "Cheirosa"), ("Fanfarrão", "Fanfarrona"),
       ("Tímido", "Tímida"), ("Emburrado", "Emburrada"), ("Valente", "Valente"),
       ("Encrenqueiro", "Encrenqueira"), ("Folgado", "Folgada"), ("Chique", "Chique"),
       ("Cabeludo", "Cabeluda"), ("Desastrado", "Desastrada"), ("Romântico", "Romântica")]
ADJ_COR = [(15, ("Vermelho", "Vermelha")), (40, ("Alaranjado", "Alaranjada")),
           (65, ("Dourado", "Dourada")), (160, ("Esverdeado", "Esverdeada")),
           (200, ("Turquesa", "Turquesa")), (255, ("Azulado", "Azulada")),
           (300, ("Arroxeado", "Arroxeada")), (361, ("Rosado", "Rosada"))]
ADJ_PADRAO = {1: ("Listrado", "Listrada"), 2: ("Pintadinho", "Pintadinha"), 3: ("Anelado", "Anelada"),
              4: ("Escamoso", "Escamosa"), 5: ("Manchado", "Manchada")}
COMPLEMENTOS = ["de Bigode", "de Pijama", "das Dunas", "do Brejo", "de Fim de Semana", "Sem Freio",
                "da Madrugada", "de Estimação", "Que Ninguém Entende", "Cinco Estrelas", "de Plantão",
                "Sem Wi-Fi", "das Antigas", "de Domingo", "Edição Limitada", "do Interior",
                "de Novela", "Gourmet", "Raiz", "Nutella"]


def apelido(g, rng):
    """Sugestão de nome popular, com base na aparência e no jeitão da espécie."""
    tracos = []
    if g["tamanho"] > 2.3:
        tracos.append("grande")
    if g["tamanho"] < 0.8:
        tracos.append("pequeno")
    if g["velocidade"] > 2.0:
        tracos.append("rapido")
    if g["velocidade"] < 0.6:
        tracos.append("lento")
    tracos.append("carnivoro" if g["dieta"] > 0.66 else "herbivoro" if g["dieta"] < 0.33 else None)
    if g["espinhos"] > 0.5:
        tracos.append("espinhos")
    if round(g["olhos"]) >= 5:
        tracos.append("olhos")
    if round(g["patas"]) >= 8:
        tracos.append("patas")
    tracos = [t for t in tracos if t]

    if tracos and rng.random() < 0.5:
        subst, gen = rng.choice(SUBST_TRACO[rng.choice(tracos)])
    else:
        subst, gen = rng.choice(SUBST)

    sorteio = rng.random()
    padrao = int(g["padrao"])
    if sorteio < 0.25 and g["saturacao"] >= 0.25:
        adj = next(a for limite, a in ADJ_COR if g["matiz"] < limite)
    elif sorteio < 0.4 and padrao in ADJ_PADRAO:
        adj = ADJ_PADRAO[padrao]
    else:
        adj = rng.choice(ADJ)
    nome = f"{subst} {adj[0] if gen == 'm' else adj[1]}"
    if rng.random() < 0.25:
        nome += " " + rng.choice(COMPLEMENTOS)
    return nome
