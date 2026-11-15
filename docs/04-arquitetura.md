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
| Dados | `geo-api-neutra` (áreas e pontos); topologia ainda sem serviço dono | a integrar |
| Autenticação | JWT da plataforma Neutra+ (`neutramais-auth-lib`) | a confirmar |
| Coletor SNMP | serviço já existente, em repositório próprio | a integrar |
| Hospedagem | VPS própria, com ambientes separados | definido |

Este repositório é o **front-end**. Banco de dados, regras de acesso e ingestão de
SNMP pertencem à API e ao coletor, que têm repositórios próprios.

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

## Persistência e API

Este projeto não terá banco nem ORM próprios: `src/lib/storage.ts` passa a chamar
os serviços da plataforma Neutra+, e suas assinaturas viram assíncronas.

O serviço analisado até aqui é a `geo-api-neutra` (ver `docs/07-integracao-geo.md`):

- Guarda **áreas de cobertura** (polígonos) e **pontos de rede**, por organização.
  Áreas e nós do editor encaixam nela.
- **Não guarda linhas nem topologia.** Cabos, fibras, portas, fusões e cessões não têm
  serviço dono hoje — é a principal pendência da integração.
- Não tem conceito de projeto, nem leitura por área visível, nem controle de versão.
- A organização é informada por quem chama, e não há CORS: o navegador fala com um
  intermediário (Route Handler do Next ou *gateway* da plataforma) que injeta a
  organização a partir da sessão.

O que o editor precisa e a API talvez ainda não tenha vira pedido para o time da API,
não regra de negócio aqui. Route Handlers do Next ficam reservados a intermediar as
chamadas (sessão, organização, segredos), sem guardar dados.

## Integração SNMP (futura)

O coletor é o `snmp-api-neutra`, serviço em Go com repositório próprio. A análise
completa está em `docs/06-integracao-snmp.md`. Em resumo:

- Ele faz *polling* periódico e expõe leituras por API REST (TMF628). **Não gera
  alarmes, não recebe traps, não publica eventos e não lê dados de PON** — só OIDs
  genéricos de equipamento.
- Sua API não autentica; o navegador não a chama direto. O acesso passa pela API
  principal.
- Com o coletor como está, o editor consegue mostrar se a OLT está alcançável.
  Alarmes de ONU, de PON e de potência dependem de evolução do coletor.

O desenho-alvo continua sendo:

```
OLTs ──SNMP──▶ Coletor ──alarmes──▶ API principal ──▶ Alarm ──▶ Notification
                                                        │
                                                        ▼
                                               correlação pela topologia
```

- **Correlação:** o valor do mapa está aqui. Várias ONUs offline na mesma CTO apontam
  para o cabo de distribuição; todas as CTOs de uma CEO, para o backbone. O alarme
  ganha `rootCauseElementId` e o mapa destaca o elemento suspeito.
- **Métricas:** potência Rx/Tx da ONU comparada com o esperado por `pathLossDb` — a
  diferença indica fusão ruim ou fibra degradada.
- **Tipos de alarme previstos:** OLT inacessível, PON fora, ONU offline, dying gasp
  (queda de energia no assinante), potência baixa, temperatura alta.

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

- Toda consulta filtra por `projectId`, e o acesso ao projeto é verificado na API.
- Acesso de provedor (fase futura) enxerga só as próprias cessões e assinantes, e a
  viabilidade sem dados de concorrentes.
- O token `NEXT_PUBLIC_MAPBOX_TOKEN` é público por natureza: restringi-lo por URL no
  painel do Mapbox.
