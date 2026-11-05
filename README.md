# Ecossistema 🌿

Uma simulação de evolução que roda sozinha. Criaturas nascem, comem, fogem,
se reproduzem com mutações e morrem. Espécies surgem, se separam e somem.
Tudo fica anotado num diário que você lê pelo site.

## No ar

- **O site:** https://isamachadon.github.io/ecossistema/
- **O robô:** a cada hora (por volta do minuto 17) o GitHub avança o planeta 1 dia e
  republica o site sozinho. Dá pra acompanhar em
  https://github.com/isamachadon/ecossistema/actions
- **O save do mundo** fica no branch `estado`, que o robô substitui a cada hora.
- **Trocar um nome** sem abrir o computador: edite `site/nomes.json` direto no site do
  GitHub (ícone de lápis) e salve. O robô republica o site em 1 ou 2 minutos.

O planeta no seu computador virou um "laboratório": dá pra testar à vontade com
`avancar.bat` e `ver_site.bat` sem mexer no planeta oficial.

## Como usar no seu computador

**Avançar a simulação:** dê dois cliques em `avancar.bat`.
Cada vez avança 1 dia (um "período"). Pelo terminal também dá:

    python simulacao/avancar.py          (avança 1 dia)
    python simulacao/avancar.py 24       (avança 24 dias de uma vez)
    python simulacao/avancar.py --novo   (apaga tudo e cria um planeta novinho)

**Ver o site:** dê dois cliques em `ver_site.bat`. O navegador abre em
http://localhost:8000. Pra desligar o site, feche a janela preta.
Depois de avançar a simulação, é só recarregar a página (F5).

## Nomes das espécies

A naturalista batiza sozinha cada espécie nova. Se quiser trocar algum nome:

1. No site, cada espécie mostra um número (ex: Nº 0012, ou seja, 12).
2. Abra o arquivo `site/nomes.json` no Bloco de Notas.
3. Escreva assim (aspas duplas, vírgula entre as linhas, sem vírgula na última):

```json
{
  "3": "Lesmão Guloso",
  "12": "Dona Pantufa"
}
```

4. Salve e recarregue o site. Se o site avisar que tem erro no arquivo,
   quase sempre é uma vírgula ou aspas faltando.

## Pra que serve cada arquivo

| Arquivo | O que faz |
|---|---|
| `avancar.bat` | Atalho de dois cliques que avança a simulação 1 dia |
| `ver_site.bat` | Atalho de dois cliques que liga o site no seu computador |
| `simulacao/avancar.py` | O comando principal: carrega o mundo, roda 1 dia e salva |
| `simulacao/genes.py` | O "DNA": quais genes existem, herança e mutação |
| `simulacao/mundo.py` | O planeta: biomas, comida, e as regras de comer, fugir, reproduzir e morrer |
| `simulacao/especies.py` | O "cartório": detecta espécies novas e extinções e monta a árvore |
| `simulacao/eventos.py` | As surpresas: seca, praga, inverno, migração, meteoros e companhia |
| `simulacao/nomes.py` | A fábrica de nomes científicos, apelidos e nome do planeta |
| `dados/estado.json` | O "save" do mundo (criado sozinho, não precisa mexer) |
| `site/index.html` | A estrutura da página |
| `site/estilo.css` | A aparência (diário de naturalista) |
| `site/app.js` | Monta a página e roda o mundo ao vivo (bichos comendo, caçando, fugindo) |
| `site/retratos.js` | O desenhista de bichos: 12 tipos de corpo, desenhados a partir dos genes |
| `site/cenario.js` | O pintor de paisagens: chão, árvores, água, neve, borboletas e o clima dos eventos |
| `site/diario.json` | Resumo que a simulação escreve pro site ler (criado sozinho) |
| `site/nomes.json` | Nomes que VOCÊ quiser trocar (opcional) |
| `.gitignore` | Lista de arquivos que o Git deve ignorar |

## Glossário rapidinho

- **Tique:** um instante da simulação (todo mundo dá um passo).
- **Período / dia:** 300 tiques. É o que o comando avança de cada vez.
- **Genoma:** o conjunto de genes de uma criatura.
- **Holótipo:** o exemplar "oficial" que representa uma espécie.
- **Commit:** uma versão salva do projeto no Git, tipo um "save" de videogame.
