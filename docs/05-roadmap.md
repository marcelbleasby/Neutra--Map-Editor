# Roadmap

## Fase 0 — Fundação (feita)

- Next.js + Mapbox GL Draw; projetos; desenho de nós, cabos e áreas.
- Encaixe de cabos nos nós, comprimento automático, portas de CTO por provedor.
- Topologia física: regras de ligação, pontos de passagem, rota até o POP, impacto de
  falha por provedor, orçamento óptico estimado e lista de pendências.
- Motor do grafo óptico (fibras, portas, conexões, rastreamento até a PON), sem tela.
- Importação de KML/KMZ com classificação pelo nome e montagem da topologia
  (`docs/11-fluxos-de-entrada.md`).
- Persistência local, exportação GeoJSON.
- Modelo de domínio completo em `src/domain/types.ts`.

## Fase 1 — Integração com a plataforma Neutra+

Ver `docs/07-integracao-geo.md`.

- Login pelo `identity-api-neutra`, sessão em *cookie* `httpOnly` e intermediário que
  injeta a organização (`docs/09-integracao-identidade.md`). **Uso no dia a dia
  depende de a identidade ganhar renovação de sessão**: hoje o token vale 15 minutos.
- Áreas de cobertura e nós gravados na `geo-api-neutra`; busca por endereço via
  `/geocode`.
- **Definir onde moram cabos e topologia** — hoje nenhum serviço os guarda. Até lá,
  cabos continuam no `localStorage`.
- Empresas, membros e papéis por projeto (a plataforma não tem projeto hoje).
- Cadastro de provedores.
- Portas de CTO deixam de ser `CtoPort` e passam a `Port` + `Lease` + `Service`.
- Configuração por ambiente e publicação na VPS.

## Fase 2 — Topologia óptica

Ver `docs/10-topologia.md`. O motor já existe (`src/domain/opticalGraph.ts`); falta
a interface.

- Cadastro de equipamentos dentro dos nós (OLT, DIO, splitter) e suas portas.
- Diagrama de fusões por caixa, com tubos e fibras em cor.
- Rastreamento exato substituindo a estimativa onde houver fusões; sentido inverso
  (da PON aos assinantes).
- Sangria, reserva técnica no comprimento, dividir e unir cabos.

## Fase 3 — Rede neutra e assinantes

- Cessões com vigência; ocupação por provedor.
- Assinantes e serviços ligados à porta da CTO.
- Consulta de viabilidade por endereço (CTOs próximas com porta livre).
- Relatórios de ocupação por provedor, CTO e área.
- Integração com ERP/CRM dos provedores.

## Fase 4 — Monitoramento e notificações

Ver `docs/06-integracao-snmp.md`.

- Projeto a partir do SNMP: listar os dispositivos do coletor, posicionar os POPs e
  vincular cada OLT (`docs/11-fluxos-de-entrada.md`); mostrar no mapa se está
  alcançável (o coletor já sustenta isso).
- Alarmes no mapa com correlação pela topologia — **depende de o coletor passar a
  gerar alarmes e a ler dados de PON**, o que hoje ele não faz.
- E-mail de alarme pelo `notification-api-neutra` (precisa de modelos novos na
  `neutramais-templates-lib`).
- Central de avisos dentro do aplicativo, preferências e agrupamento — **sem serviço
  dono hoje** (`docs/08-integracao-notificacoes.md`).

## Fase 5 — Escala e campo

- Vector tiles e carregamento por área visível.
- Importação de GeoJSON e Shapefile; KML acima de 5.000 elementos.
- Uso em campo (PWA): localizar caixa, conferir, registrar foto.
- Portal do provedor com acesso restrito.
- Histórico e auditoria por elemento.

## Decisões tomadas

| Decisão | Definição |
| --- | --- |
| Dados | Serviços da plataforma Neutra+. Sem banco nem ORM neste projeto. Áreas e pontos na `geo-api-neutra` (`docs/07-integracao-geo.md`). |
| Hospedagem | VPS própria, com ambientes separados. |
| Modelo de cessão | Começa por porta de CTO; o tipo já admite saída de splitter, porta PON e fibra apagada. |
| Identidade | `identity-api-neutra`; `organization_id` é o identificador da empresa. |
| SNMP | Coletor `snmp-api-neutra`, em repositório próprio; analisado em `docs/06-integracao-snmp.md`. |

## Decisões em aberto

| Decisão | Opções | Recomendação |
| --- | --- | --- |
| Dono da topologia | Ampliar a `geo-api-neutra` ou criar serviço de inventário | Ampliar a geo: já tem PostGIS e os pontos de rede |
| Projeto | Existe na plataforma ou o editor introduz | Confirmar com o time |
| Dono dos avisos no aplicativo | Ampliar o `notification-api-neutra` ou outro serviço | Ampliar: um ponto único para avisar, com canal `in_app` |
| Visão do provedor | Mesmo app com papel restrito, ou portal separado | Mesmo app, até haver demanda |
| Onde nascem os alarmes | No coletor ou na API principal | No coletor, publicando na fila RabbitMQ que ele já usa |
| Provedores | Organizações na identidade ou cadastro próprio do editor | Organizações na identidade |
| Mapa base | Só Mapbox, ou também satélite/ortofoto própria | Mapbox ruas + satélite |
| Campo | PWA ou app nativo | PWA primeiro |

## A conferir com o produto de referência

O site do Geosite Telecom não estava acessível na elaboração destes documentos. Itens
a validar contra o produto real antes de detalhar cada fase:

- Como o diagrama de fusões é apresentado e editado.
- Fluxo de viabilidade (por endereço, por raio, por CTO).
- O que o aplicativo de campo permite fazer offline.
- Quais integrações com ERP/CRM são oferecidas.
