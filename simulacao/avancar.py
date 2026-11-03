"""
avancar.py: O COMANDO que faz o tempo passar.

Uso (no terminal, dentro da pasta ecossistema):
    python simulacao/avancar.py              avança 1 dia
    python simulacao/avancar.py 10           avança 10 dias
    python simulacao/avancar.py --novo       apaga tudo e cria um planeta novinho

Ele carrega o mundo salvo (dados/estado.json), roda um dia, salva de volta
e escreve o resumo que o site lê (site/diario.json).
"""

import argparse
import json
import os
import random
import sys
import time
from datetime import datetime, timezone

import eventos
import especies
import genes
import mundo
import nomes

RAIZ = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ARQ_ESTADO = os.path.join(RAIZ, "dados", "estado.json")
ARQ_DIARIO = os.path.join(RAIZ, "site", "diario.json")
ARQ_NOMES = os.path.join(RAIZ, "site", "nomes.json")


def criar_mundo(semente):
    rng = random.Random(semente)
    estado = {"versao": 1, "semente": semente, "periodo": 0, "tique": 0,
              "planeta": nomes.nome_planeta(rng), "biomas": mundo.gerar_biomas(rng),
              "criaturas": [], "comida": [], "especies": {}, "historia": [],
              "eventos_ativos": [], "pop_hist": [], "ultimo_resumo": {},
              "proximo_id_criatura": 1, "proximo_id_especie": 1}
    pioneiras = [("herbivora", 30)] * 4 + [("onivora", 16)] + [("carnivora", 10)] * 2
    ids = []
    for dieta, n in pioneiras:
        g = genes.genoma_aleatorio(rng, dieta)
        esp = especies.nova_especie(estado, rng, g, None, "fundadora")
        ids.append(esp["id"])
        cx, cy = rng.uniform(40, mundo.LARGURA - 40), rng.uniform(30, mundo.ALTURA - 30)
        for _ in range(n):
            gf = genes.mutar(g, rng, 0.5)
            estado["criaturas"].append(mundo.nova_criatura(
                estado, gf, esp["id"], cx + rng.gauss(0, 25), cy + rng.gauss(0, 25),
                genes.energia_max(gf) * 0.6, rng))
    mundo.semear_comida(estado, rng, 600, mundo.pesos_comida(estado["biomas"], {}))
    especies.contar(estado, rng)
    texto = (f"Nasce o planeta {estado['planeta']}. Sete espécies pioneiras olham em volta "
             "e pensam: e agora?")
    estado["historia"].append(especies.registro(0, "inicio", texto, ids))
    return estado, rng


def salvar(estado, rng):
    estado["rng"] = [rng.getstate()[0], list(rng.getstate()[1]), rng.getstate()[2]]
    for c in estado["criaturas"]:
        c["x"], c["y"], c["e"], c["dir"] = round(c["x"], 2), round(c["y"], 2), round(c["e"], 3), round(c["dir"], 3)
    os.makedirs(os.path.dirname(ARQ_ESTADO), exist_ok=True)
    temporario = ARQ_ESTADO + ".tmp"  # salva num rascunho e troca no fim: nunca fica pela metade
    with open(temporario, "w", encoding="utf-8") as f:
        json.dump(estado, f, ensure_ascii=False, separators=(",", ":"))
    os.replace(temporario, ARQ_ESTADO)


def carregar():
    with open(ARQ_ESTADO, encoding="utf-8") as f:
        estado = json.load(f)
    rng = random.Random()
    s = estado["rng"]
    rng.setstate((s[0], tuple(s[1]), s[2]))
    return estado, rng


def avancar_periodo(estado, rng):
    estado["periodo"] += 1
    p = estado["periodo"]
    mods, registros = eventos.atualizar(estado, rng)
    stats, quadros, info = mundo.rodar_periodo(estado, rng, mods)
    registros += especies.classificar(estado, rng)
    estado["historia"].extend(registros)
    contagem = {}
    for c in estado["criaturas"]:
        contagem[str(c["esp"])] = contagem.get(str(c["esp"]), 0) + 1
    estado["pop_hist"] = (estado["pop_hist"] + [{"p": p, "n": contagem}])[-120:]
    estado["ultimo_resumo"] = stats
    return stats, quadros, info, registros


def escrever_diario(estado, quadros, info):
    """O resumo leve que o site lê."""
    vivos = {}
    for c in estado["criaturas"]:
        vivos.setdefault(c["esp"], []).append(c["g"])
    lista = {}
    for chave, e in estado["especies"].items():
        item = {k: v for k, v in e.items() if k != "tipo"}
        retrato = genes.representante(vivos[e["id"]]) if e["id"] in vivos else e["tipo"]
        item["retrato"] = retrato
        item["dieta"] = genes.dieta_nome(retrato)
        lista[chave] = item
    diario = {
        "planeta": estado["planeta"], "periodo": estado["periodo"],
        "atualizado": datetime.now(timezone.utc).isoformat(timespec="seconds"),
        "largura": mundo.LARGURA, "altura": mundo.ALTURA, "cel": mundo.CEL,
        "biomas": estado["biomas"], "populacao": len(estado["criaturas"]),
        "ultimo_resumo": estado["ultimo_resumo"],
        "eventos_ativos": [{"nome": ev["nome"], "texto": ev["texto"], "restam": ev["restam"]}
                           for ev in estado["eventos_ativos"]],
        "especies": lista,
        "historia": estado["historia"][-600:],
        "pop_hist": estado["pop_hist"],
        "quadros": quadros,
        "criaturas": {str(k): v for k, v in info.items()},
        "comida": [v for f in estado["comida"] for v in f],
    }
    with open(ARQ_DIARIO, "w", encoding="utf-8") as f:
        json.dump(diario, f, ensure_ascii=False, separators=(",", ":"))


def _legivel(texto, estado, apelidos):
    """Troca {esp:12} pelo nome da espécie, pra mostrar no terminal."""
    import re

    def trocar(m):
        e = estado["especies"][m.group(1)]
        return apelidos.get(m.group(1)) or f"{e['genero']} {e['epiteto']}"
    return re.sub(r"\{esp:(\d+)\}", trocar, texto)


def main():
    parser = argparse.ArgumentParser(description="Avança a simulação do Ecossistema.")
    parser.add_argument("dias", nargs="?", type=int, default=1, help="quantos dias avançar (padrão: 1)")
    parser.add_argument("--novo", action="store_true", help="apaga o mundo e cria um planeta novo")
    parser.add_argument("--semente", type=int, help="número que define o planeta novo (opcional)")
    args = parser.parse_args()

    if args.novo or not os.path.exists(ARQ_ESTADO):
        semente = args.semente if args.semente is not None else random.randrange(1_000_000_000)
        estado, rng = criar_mundo(semente)
        print(f"Planeta novo criado: {estado['planeta']} (semente {semente})")
    else:
        estado, rng = carregar()

    try:
        with open(ARQ_NOMES, encoding="utf-8") as f:
            apelidos = json.load(f)
    except (OSError, ValueError):
        apelidos = {}

    quadros, info = [], {}
    for _ in range(args.dias):
        inicio = time.time()
        stats, quadros, info, registros = avancar_periodo(estado, rng)
        vivas = sum(1 for e in estado["especies"].values() if e["extincao"] is None)
        print(f"\nDia {estado['periodo']} no planeta {estado['planeta']} ({time.time() - inicio:.1f}s)")
        print(f"  População: {len(estado['criaturas'])} criaturas em {vivas} espécies")
        print(f"  Nasceram {stats['nascimentos']} | fome {stats['fome']} | velhice {stats['velhice']}"
              f" | viraram almoço {stats['predacao']} | praga {stats['praga']}")
        for r in registros:
            print("  * " + _legivel(r["texto"], estado, apelidos))

    salvar(estado, rng)
    escrever_diario(estado, quadros, info)
    print("\nTudo salvo. Recarregue o site pra ver as novidades.")


if __name__ == "__main__":
    sys.exit(main())
