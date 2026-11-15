# Integração com a API de viabilidade (geo)

Análise do repositório `B-M-O-Be-More/geo-api-neutra` no commit `eb97922`
(29/09/2026). Refazer se a API mudar.

## O que a API é

Serviço em Python (FastAPI) com PostgreSQL + PostGIS próprio. Faz parte da plataforma
Neutra+. Guarda duas coisas por organização e responde duas perguntas espaciais:

| Guarda | Geometria | Pergunta que responde |
| --- | --- | --- |
| Áreas de cobertura (`coverage_areas`) | Polígono | Este ponto está dentro de alguma área da organização? |
| Pontos de rede (`network_points`) | Ponto | Quais pontos estão a até N metros daqui, por distância? |

Além disso, converte endereço em coordenada usando o Mapbox.

**Não há conceito de porta.** A viabilidade que existe é de cobertura (ponto dentro
de polígono) e de proximidade (pontos num raio). Ocupação de porta, provedor da porta
e assinante não existem no modelo; só caberiam no campo livre `attributes`.

## API

Base: `/api/v2/geo`. Respostas em `{ "message", "data", "metadata" }`; os dados
geográficos vêm como GeoJSON (`Feature` ou `FeatureCollection`), com os campos em
`properties`.

| Método | Caminho | Uso |
| --- | --- | --- |
| `POST` | `/coverageArea` | Cria área |
| `GET` | `/coverageArea?organization_id=&limit=&offset=` | Lista áreas |
| `GET` `PATCH` `DELETE` | `/coverageArea/{id}` | Lê, altera, remove (remoção lógica) |
| `POST` | `/coverageArea/check` | `{latitude, longitude, organization_id}` → `{covered, areas}` |
| `POST` | `/networkPoint` | Cria ponto |
| `GET` | `/networkPoint?organization_id=&point_type=&limit=&offset=` | Lista pontos |
| `GET` `PATCH` `DELETE` | `/networkPoint/{id}` | Lê, altera, remove |
| `POST` | `/networkPoint/nearby` | `{latitude, longitude, organization_id, radius_meters, point_type?}` → pontos com `distance_meters` |
| `POST` | `/geocode` | `{address}` → coordenada |
| `POST` | `/geocode/batch` | `{addresses[]}` |

Campos de uma área: `id`, `organization_id`, `name`, `color`, `is_public`,
`attributes`. De um ponto: os mesmos mais `point_type` (texto livre, até 50
caracteres).

O `README.md` do repositório lista caminhos que não existem (`/coverage`,
`/viability`); os corretos são os do código, acima.

## Como se encaixa no modelo do editor

| Editor | API geo | Situação |
| --- | --- | --- |
| `coverage_area` (polígono) | `coverageArea` | Encaixa direto |
| `pop`, `ceo`, `cto`, `pole`, `chamber`, `reserve`, `customer` | `networkPoint` com `point_type` = tipo | Encaixa; `point_type` é livre |
| `status`, `notes`, `ports` do elemento | `attributes` (JSON livre) | Cabe, mas sem validação nem consulta |
| `color` | Vem do catálogo do editor | A API guarda cor por registro; o editor ignora |
| Cabos (`cable_*`) | — | **Não há onde guardar**: a API não tem linhas |
| `projectId` | — | **Não existe**: só `organization_id` |
| Fibras, portas, fusões, cessões, serviços | — | **Não existe** |

Ou seja: nós e áreas têm onde morar; **cabos e toda a topologia não têm**.

## Consulta de portas: o que dá para fazer hoje

`POST /networkPoint/nearby` com `point_type: "cto"` devolve as CTOs num raio,
ordenadas por distância, com seus `attributes`. Se o editor gravar as portas em
`attributes`, quem consulta consegue contar as livres.

Limites dessa abordagem:

- A API não filtra por "tem porta livre": devolve todas as CTOs do raio e a contagem
  fica para quem chamou.
- Devolve `attributes` inteiro. Numa rede neutra isso expõe a um provedor os
  assinantes e as portas dos outros.
- Distância em linha reta, não pelo traçado do drop.
- Duas edições simultâneas da mesma CTO se sobrescrevem: `attributes` é trocado por
  inteiro e não há versão.

Serve para um primeiro protótipo interno. Não serve para expor viabilidade a
provedores.

## Pontos a tratar antes de integrar

Os três primeiros já estão registrados pelo próprio time no `SDD.md` do repositório,
como bloqueio para exposição pública.

- **A organização é escolhida por quem chama.** As rotas descartam o usuário
  autenticado e usam o `organization_id` do corpo ou da *query*. Ler, alterar e
  remover por `id` não conferem a quem o registro pertence.
- **A autenticação abre em vez de fechar.** Se a biblioteca de autenticação não
  estiver instalada, ou se `JWKS_URL` estiver vazio, a API roda sem autenticação
  mesmo com `AUTH_DISABLED=false`.
- **`is_public` não é aplicado** em nenhuma consulta.
- **Não há CORS**: o navegador não consegue chamar a API direto.
- **Listagem limitada a 200 por página** e sem filtro por área visível (*bounding
  box*). Carregar o mapa de uma cidade exige paginar tudo.
- **`point_type` é texto livre**: nada impede `CTO`, `cto` e `Cto` convivendo.
- **Dependência com caminho local de Windows** no `pyproject.toml`
  (`file:///C:/Users/…`): o projeto não instala em outra máquina nem no CI como está.
- **Lote de geocodificação sem limite** de tamanho.

## Proposta de integração

1. **Áreas de cobertura.** Trocar o `localStorage` pela API para o tipo
   `coverage_area`. É o encaixe mais direto e já dá viabilidade de cobertura real.
2. **Nós.** Gravar os pontos como `networkPoint`, com `point_type` igual ao `kind` do
   editor e o restante em `attributes`.
3. **Busca por endereço.** Usar `/geocode` para centralizar o mapa e para criar
   projeto por endereço em vez de latitude e longitude.
4. **Acesso.** O navegador fala com um intermediário do próprio editor (Route Handler
   do Next) ou com um *gateway* da plataforma, que injeta a organização a partir da
   sessão. Nunca com `organization_id` vindo do navegador.

O que precisa existir na API (ou em outro serviço) para o editor sair do protótipo:

- Linhas (cabos) com nós de origem e destino.
- Projeto como recorte dentro da organização.
- Portas como entidade, com situação e provedor, e consulta "CTOs com porta livre
  perto de um ponto" que devolva só a contagem, sem dados de terceiros.
- Leitura por área visível.
- Controle de versão por registro.

## Perguntas em aberto

- **Onde a topologia vai morar?** Cabos, fibras, portas e cessões não têm serviço
  dono hoje. As opções são ampliar a `geo-api-neutra` ou criar um serviço de
  inventário de rede. Recomendo ampliar a geo: ela já tem PostGIS e já é dona dos
  pontos de rede e da viabilidade.
- **Existe conceito de projeto na plataforma**, ou o editor é que o introduz?
- **`organization_id` é a operadora neutra ou o provedor?** A mesma dúvida do coletor
  SNMP. O texto do repositório fala em "provedores registram cobertura".
- **Como o front-end obtém o token** (serviço de identidade da plataforma) e por onde
  as chamadas passam?
