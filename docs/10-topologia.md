# Topologia

O que o editor entende por topologia, o que já faz e o que falta. O vocabulário está
em `docs/02-dominio-ftth.md`.

## Dois níveis

| Nível | Responde | Feito de | Onde está |
| --- | --- | --- | --- |
| **Físico** | Por onde o cabo passa? O que cai se este poste cair? | Nós e cabos no mapa | `src/features/editor/topology.ts`, `network.ts` |
| **Óptico** | Este assinante está em qual porta PON? Qual a potência exata aqui? | Fibras, portas e conexões dentro dos nós | `src/domain/opticalGraph.ts` |

O nível físico é desenhado no mapa e já está na interface. O nível óptico tem o motor
pronto e testado, mas ainda não tem tela — é o diagrama de fusões.

O nível físico dá respostas **estimadas** (supõe que tudo que entra numa caixa está
ligado); o óptico dá respostas **exatas** (segue cada fusão). Enquanto uma caixa não
tiver fusões cadastradas, vale a estimativa.

## Nível físico

### Como um desenho vira topologia

| Característica | Comportamento | Situação |
| --- | --- | --- |
| Encaixe das pontas | A ponta do cabo gruda em POP, CEO, CTO ou cliente a até 14 px e registra `fromNodeId` / `toNodeId` | Feito |
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
| Drop | Uma CTO e um cliente |

As regras estão em `CABLE_ENDPOINTS` (`src/domain/catalog.ts`). Violação **não
bloqueia** o desenho: vira pendência. Rede em campo nem sempre segue o manual, e um
projeto em andamento passa por estados incompletos.

### Rota até o POP

Para cada nó, o caminho de cabos até o POP mais próximo (`computeRoutes`). É a base
de tudo que vem abaixo. Em rede em árvore há um só caminho; se o desenho tiver anel,
vale o mais curto.

Na interface: ao selecionar CEO, CTO ou cliente, o painel mostra o caminho com cada
nó clicável e a metragem total.

### Impacto de falha

"Se este elemento falhar, o que cai?" (`impactOf`) — para qualquer nó, cabo ou ponto
de passagem:

- CTOs e clientes que perdem o caminho até o POP;
- portas em uso nessas CTOs;
- **provedores afetados**, pelas portas reservadas ou em uso.

Um poste conta: derrubá-lo leva junto todos os cabos que passam por ele.

É a mesma conta que a correlação de alarmes vai usar ao contrário: dado um conjunto
de ONUs fora do ar, qual é o elemento comum rio acima (`docs/06-integracao-snmp.md`).
A lista de provedores é o que permite avisar só quem foi atingido.

### Orçamento óptico estimado

Para CTO e cliente (`estimateLoss`), a atenuação do POP até o ponto:

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
| CEO, CTO ou cliente sem caminho até um POP | Aviso |
| Nome repetido no mesmo tipo | Aviso |
| Cabo terminando em tipo de nó não permitido | Erro |
| Drop que não liga uma CTO a um cliente | Erro |
| Mais drops do que portas na CTO | Erro |
| Atenuação estimada acima do orçamento | Erro |

A fazer: CTO alimentada por mais de um caminho, anel não intencional, cabo com mais
fibras em uso do que tem, elemento ativo dependendo de elemento planejado.

## Nível óptico

### Modelo

- **Fibras** não são desenhadas: nascem de `fiberCount` e `fibersPerTube` do cabo
  (`generateFibers`), com tubo e posição para a cor ABNT.
- **Equipamentos** ficam dentro de um nó: OLT e DIO no POP, splitter em CEO e CTO,
  ONU no cliente. Cada um tem **portas** com um papel (`pon`, `splitter_in`,
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

### O que falta

| Funcionalidade | Depende de |
| --- | --- |
| Cadastro de equipamentos e portas dentro do nó | Tela |
| Diagrama de fusões por caixa (cabos, tubos, fibras em cor, splitters, ligações) | Tela |
| Rastreamento exato substituindo a estimativa quando houver fusões | As duas acima |
| Sentido inverso: da porta PON, listar todos os assinantes | Motor + tela |
| Ocupação de fibras por cabo (livres, em uso, reservadas) | Fusões cadastradas |
| Splitter desbalanceado | Motor (o tipo já prevê `unbalancedTapPercent`) |
| Fibra apagada cedida a provedor | Fusões + cessões |

## Rede neutra na topologia

- A porta da CTO carrega situação e provedor; é a unidade de cessão.
- Ocupação por provedor aparece no resumo e no impacto de falha.
- A fazer: reserva de porta com prazo, viabilidade ("CTOs com porta livre a até N
  metros de um endereço") e o desdobramento de `CtoPort` em `Port` + `Lease` +
  `Service` (`docs/03-modelo-de-dados.md`).

## Onde isso vai morar

Tudo acima roda no navegador sobre os dados do projeto. Na plataforma, cabos e
topologia ainda não têm serviço dono (`docs/07-integracao-geo.md`). Os módulos são
puros — sem React, Mapbox nem rede — para que as mesmas regras possam rodar num
serviço quando ele existir, e para que as respostas (rota, impacto, pendências) não
mudem de significado na migração.
