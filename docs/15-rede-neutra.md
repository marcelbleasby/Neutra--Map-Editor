# Rede neutra: o foco do editor

A Neutra+ é o marketplace dos provedores. O que ela oferece a um provedor que tem
rede são três coisas — **gestão**, **ofertas** e **monitoramento** — e o editor é onde
as três se apoiam: é ele que sabe quais portas existem, onde estão e de quem são.

O vocabulário está em `GLOSSARY.md`; as decisões, em `docs/adr/`.

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
| **Viabilidade** num ponto: CTOs a até 250 m com porta livre, separando próprias de compartilhadas, com a distância de cada uma | Botão "Viabilidade" |
| Cobertura no mesmo ponto, para as duas perguntas não se confundirem | Mesmo painel |
| Impacto de falha contando as portas compartilhadas atingidas | Painel de qualquer elemento |

As regras estão em `src/features/neutral/neutral.ts`, puras e testadas.

A consulta de viabilidade responde a duas perguntas de uma vez:

- **Posso atender aqui?** — há porta própria livre no raio.
- **Outra Empresa poderia atender aqui pela minha rede?** — há porta compartilhada
  livre no raio. É a mesma pergunta que o marketplace precisa responder a quem compra.

## Ofertas — o que falta ligar

Hoje a oferta de CTO no marketplace tem `portCount` digitado e uma cobertura enviada
à parte. O editor já tem os dois dados; falta a ponte.

| Passo | Situação |
| --- | --- |
| Selecionar CTOs e ver quantas portas compartilhadas livres somam | Os dados existem (`networkInventory`); falta a seleção em área |
| Gerar a área de cobertura da oferta a partir dessas CTOs (raio de 250 m em volta de cada uma) | A fazer; é a "mancha calculada" do Geosite |
| Enviar quantidade e área para uma oferta do marketplace | Depende do marketplace e do pedido G4 (`docs/13`) |
| Quando o pedido é aceito, indicar quais portas o atendem | Depende do pedido M1 |
| Impedir que se oferte mais portas do que há livres | Depende dos dois anteriores |

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

Ver a rodada de perguntas na conversa que originou este documento; as respostas
entram no glossário e em ADRs.
