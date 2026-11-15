# Arquitetura

## Stack

| Camada | Escolha | Situação |
| --- | --- | --- |
| Aplicação | Next.js 16 (App Router, `cacheComponents`), React 19, TypeScript | em uso |
| Estilo | Tailwind CSS 4 | em uso |
| Mapa | Mapbox GL JS 3 + Mapbox GL Draw 1.5 | em uso |
| Geometria | Turf (`@turf/length`) | em uso |
| Testes | Vitest (regras puras) | em uso |
| Persistência | `localStorage` atrás de `src/lib/storage.ts` | provisório |
| Banco | PostgreSQL + PostGIS | proposto |
| Autenticação | a decidir | — |
| Coletor SNMP | serviço separado | proposto |

## Estrutura do código

```
src/
  domain/              tipos e regras puras
    types.ts           entidades (referência canônica)
    catalog.ts         tipos de elemento: rótulo, cor, geometria, prefixo
    optics.ts          perdas, orçamento óptico, cores de fibra
  features/
    editor/
      useNetworkEditor.ts  liga Mapbox GL Draw ao modelo
      topology.ts          encaixe de cabos, seguir nó, desligar nó (puro)
      model.ts             formato das features, nomes, resumo (puro)
      drawStyles.ts        estilos do Draw derivados do catálogo
      Editor.tsx, Palette.tsx, Inspector.tsx
    projects/
  lib/storage.ts       persistência
  app/                 rotas
```

Regra de dependência: `domain` não importa nada do resto; `features` importa `domain`
e `lib`; `app` importa `features`.

## Editor de mapa

### Como o Draw é usado

- O Draw é a fonte de verdade das geometrias enquanto a página está aberta. O estado
  React (`features`) é um espelho para os painéis.
- `userProperties: true` faz as propriedades chegarem ao estilo com prefixo `user_`,
  o que permite colorir e dimensionar por `user_kind` e `user_status`.
- Escolher uma ferramenta na paleta guarda o tipo pendente e ativa `draw_point`,
  `draw_line_string` ou `draw_polygon`. Em `draw.create` a feature recebe as
  propriedades padrão do tipo.
- Em `draw.create` e `draw.update`, cabos passam por `snapCable` (encaixe nas pontas a
  até 14 px) e têm o comprimento recalculado. Nós movidos puxam os cabos ligados
  (`followNode`). Em `draw.delete`, cabos perdem a referência ao nó (`detachNodes`).
- Toda alteração termina em `commit`, que atualiza o espelho e persiste.

### Limite conhecido e caminho de escala

Hoje **todas** as features do projeto vivem dentro do Draw. Isso serve bem até alguns
milhares de elementos; uma cidade inteira passa disso.

Caminho planejado:

1. Rede renderizada em camadas comuns do Mapbox (fonte GeoJSON, depois vector tiles
   servidos do PostGIS).
2. Draw recebe apenas o que está sendo editado: clicar num elemento o move da camada
   de visualização para o Draw; ao terminar, volta.
3. Carregamento por área visível (bbox) em vez do projeto inteiro.

`useNetworkEditor` é o único arquivo que conhece o Draw, então essa troca não deve
vazar para os painéis.

### Diagrama de fusões

Não é uma tela de mapa: é um editor esquemático aberto a partir de uma CEO, CTO ou
POP, mostrando os cabos que entram, suas fibras por tubo/cor, os splitters e as
conexões entre eles. Opera sobre `Fiber`, `Port` e `Connection`.

## Persistência e API (proposta)

- Route Handlers em `src/app/api/` com o projeto na rota:
  `/api/projects/[projectId]/elements`, `/connections`, `/leases`…
- Leitura por bbox para o mapa; escrita por elemento (não a coleção inteira).
- Edição concorrente: versão por elemento e rejeição de escrita desatualizada, com
  notificação de conflito. Colaboração em tempo real fica para depois.
- `src/lib/storage.ts` passa a chamar essa API; as assinaturas viram assíncronas.

## Integração SNMP (futura)

Os serviços de SNMP já existem fora deste projeto. A integração proposta:

```
OLTs ──SNMP──▶ Coletor ──eventos──▶ API de ingestão ──▶ Alarm ──▶ Notification
                (existente)          (este projeto)       │
                                                          ▼
                                                 correlação pela topologia
```

- **O coletor fica fora do Next.js.** Polling e traps são processos de longa duração
  e precisam de alcance de rede até as OLTs; não cabem em função serverless.
- **Contrato de entrada:** o coletor envia eventos normalizados (OLT, slot/porta PON,
  serial da ONU, tipo, valor). O sistema resolve para `Equipment`/`Port`/`Service`
  usando `managementAddress` e `serialNumber`.
- **Correlação:** o valor do mapa está aqui. Várias ONUs offline na mesma CTO apontam
  para o cabo de distribuição; todas as CTOs de uma CEO, para o backbone. O alarme
  ganha `rootCauseElementId` e o mapa destaca o elemento suspeito.
- **Métricas:** potência Rx/Tx da ONU comparada com o esperado por `pathLossDb` — a
  diferença indica fusão ruim ou fibra degradada.
- **Tipos de alarme previstos:** OLT inacessível, PON fora, ONU offline, dying gasp
  (queda de energia no assinante), potência baixa, temperatura alta.

A definir com o time dos serviços SNMP: formato do evento, se a entrega é por webhook
ou fila, e quais fabricantes de OLT estão cobertos.

## Avisos e notificações (futuro)

Duas origens, um só modelo (`Notification`):

- **Alarmes de rede** — vindos do SNMP, com severidade.
- **Avisos do sistema** — convite para projeto, exportação concluída, conflito de
  edição, cessão perto do vencimento.

Decisões de desenho:

- Destinatários resolvidos pelos membros do projeto e suas preferências (severidade
  mínima, canal).
- Canais: no aplicativo primeiro; e-mail e webhook depois.
- Agrupamento: um corte de cabo gera uma notificação com a causa raiz, não uma por ONU.
- Entrega em tempo real por Server-Sent Events; polling é aceitável na primeira versão.
- Toda notificação de alarme leva ao elemento no mapa.

## Segurança e isolamento

- Toda consulta filtra por `projectId`, e o acesso ao projeto é verificado no
  servidor; reforço por Row-Level Security no banco.
- Acesso de provedor (fase futura) enxerga só as próprias cessões e assinantes, e a
  viabilidade sem dados de concorrentes.
- O token `NEXT_PUBLIC_MAPBOX_TOKEN` é público por natureza: restringi-lo por URL no
  painel do Mapbox.
