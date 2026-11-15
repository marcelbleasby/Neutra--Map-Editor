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
| Dados | `geo-api-neutra`: cada Projeto é um rascunho de cobertura | a integrar |
| Autenticação | `identity-api-neutra`, com sessão no servidor do editor | a integrar |
| Coletor SNMP | `snmp-api-neutra` | outra fase |
| Notificações | `notification-api-neutra` (tem caixa de avisos) | outra fase |
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
    opticalGraph.ts    fibras, conexões e rastreamento até a porta PON
  features/
    editor/
      useNetworkEditor.ts  liga Mapbox GL Draw ao modelo
      topology.ts          encaixe de cabos, seguir nó, desligar nó (puro)
      network.ts           rota até o POP, impacto, pendências (puro)
      model.ts             formato das features, nomes, resumo (puro)
      drawStyles.ts        estilos do Draw derivados do catálogo
      Editor.tsx, Palette.tsx, Inspector.tsx
    diagram/             ligações por nó: model.ts, layout.ts (puros), NodeDiagram.tsx
    import/              KML/KMZ: kml.ts (leitura), classify.ts, build.ts, ImportDialog.tsx
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

## Persistência e integração

Hoje tudo fica no `localStorage`, atrás de `src/lib/storage.ts`. O destino está
decidido (ver `docs/adr/`):

- O editor não tem banco próprio (ADR 0001).
- Cada Projeto é um rascunho de cobertura da geo (ADR 0003); a correspondência campo a
  campo está em `docs/03-modelo-de-dados.md`.
- A topologia vai morar na geo (ADR 0002); até lá, portas e ligações vão em atributos
  (ADR 0007).

### Sessão

O navegador fala só com o servidor do editor (ADR 0004):

```
Navegador ──cookie httpOnly──▶ Next (Route Handlers) ──Bearer──▶ nginx da plataforma ──▶ identity / geo
```

- Login em `POST /identity/api/v1/auth/login`, seguido da escolha do perfil Seller
  (`/auth/context`) e de MFA quando exigido.
- O servidor guarda os tokens, renova a sessão em um único lugar — o token de
  renovação é de uso único — e preenche a organização a partir do token.
- Route Handlers só intermedeiam; não guardam dados.

O estado atual de cada serviço está em `docs/12-portal-da-plataforma.md`.

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

## Avisos de rede (outra fase)

A plataforma já tem caixa de avisos no aplicativo (`docs/12-portal-da-plataforma.md`),
hoje só com eventos de pedido e pagamento. Avisos de rede dependem de alarmes, que
dependem do SNMP; os dois ficam para outra fase. Quando vierem:

- um corte de cabo gera um aviso com a causa provável, não um por ONU;
- todo aviso de rede leva ao elemento no mapa;
- o impacto de falha (`impactOf`) diz quais portas compartilhadas foram atingidas.

## Segurança e isolamento

- O editor é só do perfil Seller; quem compra não vê a rede (ADR 0005).
- A organização de cada chamada vem do token, no servidor do editor, nunca do
  navegador (ADR 0004).
- O token `NEXT_PUBLIC_MAPBOX_TOKEN` é público por natureza: restringi-lo por URL no
  painel do Mapbox.
