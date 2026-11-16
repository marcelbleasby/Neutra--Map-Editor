# Rede neutra: o foco do editor

A Neutra+ é o marketplace dos provedores. O que ela oferece a um provedor que tem
rede são três coisas — **gestão**, **ofertas** e **monitoramento** — e o editor é onde
as três se apoiam: é ele que sabe quais portas existem, onde estão e de quem são.

O vocabulário está em `GLOSSARY.md`; as decisões, em `docs/adr/`.

## O papel do editor

O editor é **o ponto principal de gestão e controle da rede neutra da Empresa**: é
nele que ela atualiza os seus arquivos e, ao publicar, já tem disponibilidade para o
marketplace (ADR 0008).

```
 abrir o arquivo  ──▶  atualizar a rede  ──▶  publicar   ──▶  aplicar às ofertas
 (versão atual)        e as portas            (nova versão)    (cobertura + portas)
       ▲                                                              │
       └──────────────────── a ocupação muda ◀────────────────────────┘
```

| Passo | Situação |
| --- | --- |
| Abrir um KMZ e continuar de onde parou | Feito: o KMZ gerado pelo editor volta com tipos, portas, splitter, fibras e cabos ligados |
| Atualizar rede e portas | Feito |
| Publicar: gerar o KMZ no formato da geo | Feito: botão "Gerar KMZ". Envio direto à geo depende da integração |
| Aplicar às ofertas: pontos da cobertura e quantidade de portas | Os dados existem ("Portas para ofertar"); envio depende da integração |
| Saber quais ofertas estão numa versão antiga | Depende da integração (`GET /coverageFile/{id}/offers`) |

O KMZ gerado:

- declara o tipo de cada elemento no esquema `neutra-assets-v1` (`cto`,
  `splice_closure`, `pole`, `fiber_cable`, `coverage_area`), para a geo classificar
  como declarado e não adivinhar;
- leva em `ExtendedData` o que a geo não tem: POP, assinante, tipo do cabo, situação,
  fibras, splitter e cada porta da CTO (em uso, reservada, com defeito, compartilhada);
- leva sempre a **área atendida pela rede** — o raio de atendimento em volta de cada
  CTO —, porque só polígono dá cobertura. Ela é marcada como gerada e refeita a cada
  publicação.

## O ciclo

```
   GESTÃO                  OFERTA                 COMPARTILHAMENTO         MONITORAMENTO
documentar a rede  ──▶  publicar o que há  ──▶  outra Empresa usa   ──▶  saber quando falha
e marcar as portas      para compartilhar       as portas                e quem é atingido
   (editor)             (marketplace)           (pedido aceito)          (SNMP + editor)
```

Cada passo depende do anterior. Sem a rede documentada porta a porta, a oferta é um
número digitado à mão; sem saber qual porta atende qual pedido, uma falha não diz
quem foi atingido.

## Gestão — o que o editor já faz

| Capacidade | Onde |
| --- | --- |
| Marcar porta compartilhada, uma a uma ou todas as livres de uma CTO | Painel da CTO |
| Ver no mapa quais CTOs têm porta compartilhada (anel violeta; cheio quando há porta livre) | Mapa |
| Estoque do projeto: portas livres para ofertar, CTOs com oferta, portas em uso por outras Empresas | Resumo do projeto, seção "Rede neutra" |
| **Portas próximas** de um ponto: CTOs a até 250 m com porta livre, separando próprias de compartilhadas, com a distância de cada uma | Botão "Portas próximas" |
| Impacto de falha contando as portas compartilhadas atingidas | Painel de qualquer elemento |

As regras estão em `src/features/neutral/` (`neutral.ts` e `offer.ts`), puras e
testadas.

A consulta de portas próximas responde a duas perguntas de uma vez:

- **Consigo atender um assinante meu aqui?** — há porta própria livre no raio.
- **Consigo atender um pedido de outra Empresa aqui?** — há porta compartilhada livre
  no raio. Serve para confirmar antes de aceitar o pedido.

Ela **não é a viabilidade**. Viabilidade é a geo que responde, pela cobertura da
oferta (`docs/01-produto.md`).

## Ofertas — a ponte com a geo

A viabilidade que o comprador vê é calculada pela geo sobre a **cobertura da oferta**.
Ao ligar a oferta à versão de KMZ, o Seller pode recortar a cobertura de três formas;
uma delas é dar **pontos com raio** (`coverageNetworkPoints`): a geo desenha um círculo
em cada ponto, une com a área enviada e recorta nos polígonos do KMZ.

É aí que o editor entra: os pontos são as CTOs com porta compartilhada livre, com o
raio de atendimento.

| Passo | Situação |
| --- | --- |
| Somar as portas compartilhadas livres do projeto ou de dentro de uma área | Feito: botão "Portas para ofertar" |
| Gerar os pontos da cobertura da oferta (`coverageNetworkPoints`, 250 m por CTO) e ver a prévia no mapa | Feito, no mesmo painel; baixa em JSON |
| Baixar a ocupação por CTO em planilha (CSV) | Feito, no mesmo painel |
| Enviar os pontos ao ligar a oferta à cobertura (`PUT .../productOffering/{id}/coverageVersion`) | Depende da integração com o marketplace |
| Quando o pedido é aceito, indicar quais portas o atendem | Depende do pedido M1 |
| Atualizar a cobertura quando as portas acabam ou novas são compartilhadas | A decidir: a geo não muda a oferta sozinha |

Cuidados que vêm da geo:

- O centro de cada ponto precisa estar **dentro do KMZ**, e o círculo é recortado nos
  polígonos dele. Uma versão de KMZ só com pontos e linhas não dá cobertura nenhuma.
- São até 500 pontos por oferta, sem coordenadas repetidas, com raio de até 100 km.
- A viabilidade da geo **não sabe de portas**: um ponto dentro da cobertura continua
  viável mesmo que as portas daquela CTO tenham acabado. Por isso o Seller confirma
  ao aceitar, e por isso a cobertura precisa acompanhar a ocupação.

## Monitoramento — o que o editor traz

O serviço de SNMP está indisponível e sem dados de PON (`docs/12`). Quando houver, o
que o editor acrescenta é **dizer quem foi atingido**:

- o impacto de falha já liga um elemento às CTOs e portas que dependem dele, e conta
  as compartilhadas;
- o rastreamento pelas ligações já diz em qual porta PON cada CTO está;
- com o pedido do marketplace ligado à porta, a falha passa a dizer **quais Empresas**
  foram atingidas — o que permite avisar só elas e medir o que foi combinado na oferta.

## O que a referência faz diferente

O Geosite tem um "Módulo Rede Neutra" (`docs/14`). Três diferenças importam:

| Geosite | Aqui |
| --- | --- |
| A dona da rede abre a ferramenta para os tenants, que veem e cadastram os próprios clientes | Quem usa a porta não entra no editor; a relação entre as empresas é do marketplace |
| Cota de portas por município para cada tenant | Porta a porta |
| Aluga porta e splitter inteiro | Só porta de CTO |

O que o Geosite não tem, e é a vantagem daqui: **ele não vende**. A dona da rede
precisa achar os tenants e fechar contrato por fora. Aqui a porta marcada como
compartilhada pode virar oferta, pedido e cobrança na mesma plataforma.

## Perguntas em aberto

| Pergunta | Por que importa |
| --- | --- |
| A oferta é criada a partir do editor, ou o editor só fornece quantidade e área para quem cria a oferta no marketplace? | Define se o editor chama o marketplace ou só exporta |
| Portas já ofertadas ficam reservadas no editor, para não serem usadas pela própria Empresa? | Sem isso dá para vender a mesma porta duas vezes |
| Compartilha-se só porta de CTO, ou também splitter inteiro e fibra apagada? | O Geosite aluga splitter; o marketplace tem oferta de fibra apagada |
| O que a Empresa que compra precisa ver da porta que usa (situação, potência, falhas)? | Decidimos que ela não entra no editor; o monitoramento pode exigir uma visão para ela em outro lugar |
| O monitoramento sobe de prioridade em relação ao que ficou para "outra fase"? | O serviço de SNMP está indisponível e sem dados de PON |
