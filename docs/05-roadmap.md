# Roadmap

## Fase 0 — Fundação (feita)

- Next.js + Mapbox GL Draw; projetos; desenho de nós, cabos e áreas.
- Encaixe de cabos nos nós, comprimento automático, portas de CTO por provedor.
- Persistência local, exportação GeoJSON.
- Modelo de domínio completo em `src/domain/types.ts`.

## Fase 1 — Integração com a API existente

Depende de receber o repositório da API.

- Comparar o modelo da API com `src/domain/types.ts` e alinhar nomes e entidades.
- Login e sessão usando a autenticação da API; empresas, membros e papéis por projeto.
- `src/lib/storage.ts` passa a chamar a API no lugar do `localStorage`.
- Cadastro de provedores.
- Portas de CTO deixam de ser `CtoPort` e passam a `Port` + `Lease` + `Service`.
- Configuração por ambiente e publicação na VPS.

## Fase 2 — Topologia óptica

- Equipamentos dentro dos nós (OLT, DIO, splitter) e suas portas.
- Fibras geradas a partir dos cabos, com tubos e cores.
- Diagrama de fusões por caixa.
- Caminho óptico porta PON → ONU e cálculo de potência.
- Regras físicas restantes (tipo de cabo × tipo de nó, pontos de passagem).

## Fase 3 — Rede neutra e assinantes

- Cessões com vigência; ocupação por provedor.
- Assinantes e serviços ligados à porta da CTO.
- Consulta de viabilidade por endereço (CTOs próximas com porta livre).
- Relatórios de ocupação por provedor, CTO e área.
- Integração com ERP/CRM dos provedores.

## Fase 4 — Monitoramento e notificações

- Ligação com o coletor SNMP existente (depende de receber o repositório).
- Alarmes no mapa com correlação pela topologia.
- Central de notificações, preferências e canais.

## Fase 5 — Escala e campo

- Vector tiles e carregamento por área visível.
- Importação KML/KMZ/GeoJSON/Shapefile.
- Uso em campo (PWA): localizar caixa, conferir, registrar foto.
- Portal do provedor com acesso restrito.
- Histórico e auditoria por elemento.

## Decisões tomadas

| Decisão | Definição |
| --- | --- |
| Dados | API já existente, em repositório próprio. Sem banco nem ORM neste projeto. |
| Hospedagem | VPS própria, com ambientes separados. |
| Modelo de cessão | Começa por porta de CTO; o tipo já admite saída de splitter, porta PON e fibra apagada. |
| SNMP | Coletor já existente, em repositório próprio. |

## Decisões em aberto

| Decisão | Opções | Recomendação |
| --- | --- | --- |
| Autenticação | A que a API oferece | Confirmar ao analisar o repositório da API |
| Visão do provedor | Mesmo app com papel restrito, ou portal separado | Mesmo app, até haver demanda |
| Contrato SNMP | Webhook ou fila; formato do evento | Levantar no repositório do coletor |
| Mapa base | Só Mapbox, ou também satélite/ortofoto própria | Mapbox ruas + satélite |
| Campo | PWA ou app nativo | PWA primeiro |

## A conferir com o produto de referência

O site do Geosite Telecom não estava acessível na elaboração destes documentos. Itens
a validar contra o produto real antes de detalhar cada fase:

- Como o diagrama de fusões é apresentado e editado.
- Fluxo de viabilidade (por endereço, por raio, por CTO).
- O que o aplicativo de campo permite fazer offline.
- Quais integrações com ERP/CRM são oferecidas.
