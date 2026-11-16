# Topologia

O que o editor entende por topologia, o que já faz e o que falta. O vocabulário está
em `docs/02-dominio-ftth.md`.

## Dois níveis

| Nível | Responde | Feito de | Onde está |
| --- | --- | --- | --- |
| **Físico** | Por onde o cabo passa? O que cai se este poste cair? | Nós e cabos no mapa | `src/features/editor/topology.ts`, `network.ts` |
| **Óptico** | Este assinante está em qual porta PON? Qual a potência exata aqui? | Fibras, portas e conexões dentro dos nós | `src/domain/opticalGraph.ts` |

O nível físico é desenhado no mapa. O nível óptico é editado no **diagrama de
ligações** de cada POP, CEO e CTO (`src/features/diagram/`).

O nível físico dá respostas **estimadas** (supõe que tudo que entra numa caixa está
ligado); o óptico dá respostas **exatas** (segue cada fusão). Enquanto uma caixa não
tiver fusões cadastradas, vale a estimativa.

## Nível físico

### Como um desenho vira topologia

| Característica | Comportamento | Situação |
| --- | --- | --- |
| Encaixe das pontas | A ponta do cabo gruda em POP, CEO, CTO ou assinante a até 14 px e registra `fromNodeId` / `toNodeId` | Feito |
| Pontos de passagem | Vértice intermediário gruda em poste, caixa subterrânea ou reserva e registra `viaNodeIds` | Feito |
| Nó movido | Pontas e vértices de passagem dos cabos acompanham | Feito |
| Nó excluído | Os cabos perdem a referência e viram pendência | Feito |
| Comprimento | Medido pelo traçado a cada alteração | Feito |
| Sangria | Cabo aberto no meio do lance por uma caixa, sem ser cortado | A fazer |
| Reserva técnica | Metragem da reserva somada ao comprimento real | A fazer |
| Dividir e unir cabos | Cortar um cabo em uma caixa nova; emendar dois lances | A fazer |

### Regras de ligação

| Cabo | Termina em |
| --- | --- |
| Backbone | POP, CEO |
| Distribuição | POP, CEO, CTO |
| Drop | Uma CTO e um assinante |

As regras estão em `CABLE_ENDPOINTS` (`src/domain/catalog.ts`). Violação **não
bloqueia** o desenho: vira pendência. Rede em campo nem sempre segue o manual, e um
projeto em andamento passa por estados incompletos.

### Rota até o POP

Para cada nó, o caminho de cabos até o POP mais próximo (`computeRoutes`). É a base
de tudo que vem abaixo. Em rede em árvore há um só caminho; se o desenho tiver anel,
vale o mais curto.

Na interface: ao selecionar CEO, CTO ou assinante, o painel mostra o caminho com cada
nó clicável e a metragem total.

### Impacto de falha

"Se este elemento falhar, o que cai?" (`impactOf`) — para qualquer nó, cabo ou ponto
de passagem:

- CTOs e assinantes que perdem o caminho até o POP;
- portas em uso nessas CTOs;
- **portas compartilhadas** reservadas ou em uso nessas CTOs.

Um poste conta: derrubá-lo leva junto todos os cabos que passam por ele.

É a mesma conta que a correlação de alarmes vai usar ao contrário: dado um conjunto
de ONUs fora do ar, qual é o elemento comum rio acima (`docs/06-integracao-snmp.md`).
A contagem de portas compartilhadas diz quando a falha atinge outra Empresa.

### Orçamento óptico estimado

Para CTO e assinante (`estimateLoss`), a atenuação do POP até o ponto:

- comprimento dos cabos × 0,35 dB/km;
- splitter de cada CEO no caminho (campo "Splitter de 1º nível") e o da CTO (o número
  de portas);
- uma emenda por caixa atravessada e dois conectores.

Mostra divisão total, atenuação e folga em relação a 28 dB (GPON classe B+). Os
valores típicos estão em `src/domain/optics.ts` e devem virar configuração por
projeto.

### Pendências

Lista sempre visível no resumo do projeto (`findIssues`); clicar leva ao elemento.

| Pendência | Gravidade |
| --- | --- |
| Cabo com uma ou duas pontas soltas | Aviso |
| CEO, CTO ou assinante sem caminho até um POP | Aviso |
| Nome repetido no mesmo tipo | Aviso |
| Cabo terminando em tipo de nó não permitido | Erro |
| Drop que não liga uma CTO a um assinante | Erro |
| Mais drops do que portas na CTO | Erro |
| Atenuação estimada acima do orçamento | Erro |

A fazer: CTO alimentada por mais de um caminho, anel não intencional, cabo com mais
fibras em uso do que tem, elemento ativo dependendo de elemento planejado.

## Nível óptico

### Modelo

- **Fibras** não são desenhadas: nascem de `fiberCount` e `fibersPerTube` do cabo
  (`generateFibers`), com tubo e posição para a cor ABNT.
- **Equipamentos** ficam dentro de um nó: OLT e DIO no POP, splitter em CEO e CTO,
  ONU no assinante. Cada um tem **portas** com um papel (`pon`, `splitter_in`,
  `splitter_out`, `drop`, `dio`…).
- **Conexões** unem duas pontas dentro de um nó: fusão, conector ou cordão.

Uma fibra tem duas pontas, uma em cada extremidade do cabo. Por isso toda conexão
registra **em que nó** acontece.

### Regras (`validateConnections`)

- Cada ponta de fibra aceita uma conexão por nó.
- Cada porta aceita uma conexão — exceto posição de DIO, que é passagem (fibra atrás,
  cordão na frente) e aceita duas.
- A fibra só pode ser ligada num nó onde o cabo dela termina.
- A porta só pode ser ligada no nó onde o equipamento dela está.

### Rastreamento (`traceToOlt`)

A partir de uma porta — tipicamente a porta de atendimento de uma CTO — segue o sinal
rio acima até a porta PON: atravessa o splitter, a fusão, percorre a fibra até a
outra ponta do cabo, e assim por diante. Devolve:

- se o caminho está **completo** e em qual porta PON chegou;
- onde **parou**, quando falta uma fusão — o que diz ao projetista o que cadastrar;
- comprimento, splitters atravessados e atenuação **exata**, com a perda de cada
  conexão.

É o que responde "este assinante está em qual PON" e o que liga uma leitura de
potência do coletor SNMP a um ponto do mapa.

### Diagrama de ligações

Aberto pelo botão "Abrir diagrama de ligações" ao selecionar um POP, uma CEO ou uma
CTO. Mostra, em três faixas:

| Nó | Esquerda | Meio | Direita |
| --- | --- | --- | --- |
| POP | OLTs | DIOs e splitters | Cabos |
| CEO, CTO | Cabo de entrada (o que vem do POP) | Splitters | Demais cabos |

- **Cabos** aparecem com todas as fibras, numeradas, com a cor ABNT da fibra e uma
  faixa com a cor do tubo.
- **Equipamentos** aparecem com suas portas. OLT, DIO e splitters extras são
  adicionados no próprio diagrama. O splitter da CTO (uma saída por porta de
  atendimento) e o de 1º nível da CEO vêm das propriedades do mapa e não são
  cadastrados de novo.
- **Ligar:** clicar em uma ponta e depois em outra. O tipo é decidido pelas pontas:
  fibra com fibra ou com splitter é fusão; fibra com DIO ou OLT é conector; porta com
  porta é cordão. A linha leva a cor da fibra.
- **Consultar:** clicar em uma ponta ligada mostra com quem ela está ligada, permite
  desligar e, se for uma porta, mostra o caminho do sinal até a OLT — ou onde ele
  para.
- Uma ligação que viola as regras acima é recusada com a explicação.

No painel do mapa, o nó mostra quantos equipamentos e ligações tem; a CTO mostra
também se o sinal chega a uma OLT pelas fusões, com comprimento, divisão e
atenuação exatos.

Os dados do diagrama ficam separados dos do mapa (`loadOptical` / `saveOptical` em
`src/lib/storage.ts`). Ligações que perdem o sentido — cabo excluído, cabo com menos
fibras, nó removido — são descartadas ao montar o modelo (`buildOpticalModel`).

### O que falta

| Funcionalidade | Observação |
| --- | --- |
| Ligar várias fibras de uma vez (cabo a cabo, em sequência) | Hoje é uma a uma |
| Destacar no mapa o caminho rastreado | O caminho hoje aparece só em texto |
| Sentido inverso: da porta PON, listar as CTOs e os assinantes | Motor + tela |
| Ocupação de fibras por cabo no painel do mapa | Os dados já existem |
| Usar o valor exato no lugar da estimativa nas pendências | Quando houver fusões |
| ONU no assinante e ligação do drop até ela | Hoje o caminho termina na porta da CTO |
| Sangria: abrir um cabo no meio do lance | O modelo só liga fibra nas pontas do cabo |
| Splitter desbalanceado | O tipo já prevê `unbalancedTapPercent` |
| Perda medida por ligação | O motor aceita; falta campo na tela |
| Fibra apagada compartilhada com outra Empresa | Hoje só porta de CTO é compartilhada |

## Rede neutra na topologia

- Cada porta da CTO tem uma situação e pode ser marcada como **compartilhada**.
- O resumo do projeto e o impacto de falha contam as portas compartilhadas, para a
  Empresa saber quando uma falha atinge quem usa a rede dela.
- Feito: consulta de portas próximas e pontos para a cobertura da oferta
  (`docs/15-rede-neutra.md`). A fazer: busca por endereço e
  dizer com qual Empresa a porta está compartilhada, o que depende dos pedidos do
  marketplace (`docs/13-pedidos-a-outros-times.md`).

## Onde isso vai morar

Tudo acima roda no navegador sobre os dados do projeto. Na plataforma, a topologia
vai morar na geo (ADR 0002), com cada Projeto guardado como rascunho de cobertura
(ADR 0003) e, por enquanto, portas e ligações em atributos (ADR 0007).

A geo terá um motor próprio que **infere** ligações de um KMZ. Num Projeto vale a
ligação declarada; a inferida entra como sugestão na importação (ADR 0006). Os
módulos daqui são puros — sem React, Mapbox nem rede — para que as mesmas regras
possam ser comparadas com as da geo.
