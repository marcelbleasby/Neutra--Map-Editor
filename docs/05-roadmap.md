# Roadmap

## Fase 0 — Fundação (feita)

- Next.js + Mapbox GL Draw; projetos; desenho de nós, cabos e áreas.
- Encaixe de cabos nos nós, comprimento automático, portas de CTO por provedor.
- Persistência local, exportação GeoJSON.
- Modelo de domínio completo em `src/domain/types.ts`.

## Fase 1 — Base de dados e acesso

- PostgreSQL + PostGIS com o modelo de `docs/03-modelo-de-dados.md`.
- Autenticação, empresas, membros e papéis por projeto.
- API por projeto; `src/lib/storage.ts` passa a usá-la.
- Cadastro de provedores.
- Migração do formato local (desdobrar `CtoPort` em `Port` + `Lease` + `Service`).

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

- Ingestão de eventos dos serviços SNMP.
- Alarmes no mapa com correlação pela topologia.
- Central de notificações, preferências e canais.

## Fase 5 — Escala e campo

- Vector tiles e carregamento por área visível.
- Importação KML/KMZ/GeoJSON/Shapefile.
- Uso em campo (PWA): localizar caixa, conferir, registrar foto.
- Portal do provedor com acesso restrito.
- Histórico e auditoria por elemento.

## Decisões em aberto

| Decisão | Opções | Recomendação |
| --- | --- | --- |
| ORM | Drizzle, Prisma, SQL direto | Drizzle — lida melhor com tipos PostGIS |
| Autenticação | Auth.js, Clerk, Supabase Auth, própria | Depende de onde o banco ficará hospedado |
| Hospedagem | Vercel + Postgres gerenciado, VPS própria | Confirmar se há restrição de dados no Brasil |
| Modelo de cessão | Porta de CTO, saída de splitter, porta PON, fibra apagada | Começar por porta de CTO; o tipo já admite os demais |
| Visão do provedor | Mesmo app com papel restrito, ou portal separado | Mesmo app, até haver demanda |
| Contrato SNMP | Webhook ou fila; formato do evento | Definir com o time dos serviços existentes |
| Mapa base | Só Mapbox, ou também satélite/ortofoto própria | Mapbox ruas + satélite |
| Campo | PWA ou app nativo | PWA primeiro |

## A conferir com o produto de referência

O site do Geosite Telecom não estava acessível na elaboração destes documentos. Itens
a validar contra o produto real antes de detalhar cada fase:

- Como o diagrama de fusões é apresentado e editado.
- Fluxo de viabilidade (por endereço, por raio, por CTO).
- O que o aplicativo de campo permite fazer offline.
- Quais integrações com ERP/CRM são oferecidas.
