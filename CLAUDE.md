# Neutra Map Editor

Editor de mapas para documentar e operar redes FTTH **neutras**: a empresa dona da
infraestrutura mapeia toda a topologia (do POP à porta da CTO e ao assinante) e cede
capacidade a vários provedores. Referência de produto: Geosite Telecom.

@AGENTS.md

Este repositório é o **front-end** e faz parte da plataforma Neutra+. Os dados virão
dos serviços dela — `identity-api-neutra` (login, empresas, membros),
`geo-api-neutra` (áreas e pontos), `snmp-api-neutra` (leituras SNMP) e
`notification-api-neutra` (e-mail) — ainda não integrados; a hospedagem é em VPS própria. Não crie banco, ORM nem
coletor aqui. Cabos, topologia e avisos dentro do aplicativo ainda não têm serviço
dono na plataforma.

## Leia antes de mexer

| Assunto | Arquivo |
| --- | --- |
| O que é o produto, para quem, o que é rede neutra | `docs/01-produto.md` |
| Glossário FTTH e regras de topologia | `docs/02-dominio-ftth.md` |
| Entidades e relacionamentos | `docs/03-modelo-de-dados.md` + `src/domain/types.ts` |
| Stack, estrutura, mapa, SNMP e notificações | `docs/04-arquitetura.md` |
| Fases e decisões em aberto | `docs/05-roadmap.md` |
| Funcionalidades de topologia: o que existe e o que falta | `docs/10-topologia.md` |
| O que o coletor SNMP entrega e o que falta | `docs/06-integracao-snmp.md` |
| O que a API de viabilidade entrega e o que falta | `docs/07-integracao-geo.md` |
| O que o serviço de notificações entrega e o que falta | `docs/08-integracao-notificacoes.md` |
| Login, token, papéis e como o editor mantém a sessão | `docs/09-integracao-identidade.md` |

`src/domain/types.ts` é a referência canônica das entidades. Se mudar uma entidade,
atualize `docs/03-modelo-de-dados.md` no mesmo commit.

## Comandos

```bash
npm run dev         # servidor de desenvolvimento (precisa de NEXT_PUBLIC_MAPBOX_TOKEN em .env.local)
npm test            # Vitest: regras puras de domínio e topologia
npm run typecheck   # next typegen + tsc
npm run lint
npm run build
```

## Estrutura

```
src/domain/             regras e tipos puros — sem React, sem Mapbox, sem I/O
src/features/editor/    editor de mapa (Mapbox GL Draw) e seus painéis
  topology.ts           encaixe de cabos em nós e pontos de passagem
  network.ts            grafo físico: rota até o POP, impacto, pendências
src/domain/opticalGraph.ts  grafo óptico: fibras, conexões, rastreamento até a PON
src/features/projects/  lista e criação de projetos
src/lib/storage.ts      única porta de entrada para persistência (hoje localStorage)
src/app/                rotas; páginas só compõem features
```

## Convenções

- **Idioma:** interface e documentação em pt-BR; identificadores em inglês. Siglas do
  setor não se traduzem: CTO, CEO, POP, OLT, ONU, DIO, PON.
- **Catálogo único:** tipos de elemento, cores, rótulos e prefixos vivem em
  `src/domain/catalog.ts`. Paleta, estilos do mapa e nomes automáticos derivam dele —
  não repita cor nem rótulo em componente.
- **Topologia é dado, não desenho:** um cabo só faz parte da rede quando tem
  `fromNodeId`/`toNodeId`. Toda regra de conexão fica em função pura
  (`features/editor/topology.ts`, `features/editor/network.ts`,
  `domain/opticalGraph.ts`) com teste.
- **Regra violada vira pendência, não bloqueio.** O desenho passa por estados
  incompletos; `findIssues` aponta o que corrigir.
- **Persistência só via `src/lib/storage.ts`.** Componentes não tocam em `localStorage`
  nem fazem `fetch` direto; isso mantém a troca pela API contida em um arquivo.
- **Escopo por projeto:** todo registro de rede carrega `projectId`; todo projeto,
  `companyId` (o `organization_id` da plataforma). Nenhuma consulta futura pode omitir esse filtro.
- **Unidades:** metros, dB, dBm. Coordenadas em `[lng, lat]` (ordem do GeoJSON).

## Armadilhas conhecidas

- O CSS do Mapbox aplica `position: relative` ao contêiner do mapa. Dê tamanho por um
  wrapper, nunca com `absolute` no próprio contêiner (o mapa fica com altura zero).
- `mapbox-gl` e `localStorage` não existem no servidor: editor e lista de projetos são
  carregados com `next/dynamic` e `ssr: false` (`*Loader.tsx`).
- O Draw repassa propriedades ao estilo com prefixo `user_` (`user_kind`,
  `user_status`). Para alterar uma feature existente use `draw.add()` com o mesmo `id`;
  `setFeatureProperty` não redesenha.
- O projeto usa `cacheComponents`: ler `params`/`searchParams` no servidor exige
  `<Suspense>`.
