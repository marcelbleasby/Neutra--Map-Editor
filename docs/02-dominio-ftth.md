# Domínio FTTH

Vocabulário e regras da rede. Os nomes entre crases são os usados no código
(`src/domain/types.ts`).

## O caminho do sinal

```
POP ── backbone ── CEO ── distribuição ── CTO ── drop ── Assinante
 │                  │                      │              │
OLT → DIO        fusões e              splitter 2º      ONU
(porta PON)      splitter 1º nível     nível + portas
```

Uma porta PON da OLT alimenta uma fibra. Essa fibra é dividida por splitters em
cascata (tipicamente 1:8 na CEO e 1:8 na CTO, somando 1:64) até chegar à ONU de cada
assinante. Tudo entre a OLT e a ONU é passivo.

## Glossário

### Pontos no mapa (`NodeKind`)

| Sigla | Código | O que é |
| --- | --- | --- |
| POP | `pop` | Ponto de presença / central. Abriga OLTs e DIOs. É onde a rede começa. |
| CEO | `ceo` | Caixa de emenda óptica. Onde cabos são abertos, fibras são fundidas e ficam os splitters de 1º nível. |
| CTO | `cto` | Caixa de terminação óptica. Tem o splitter de 2º nível e as **portas de atendimento** (8 ou 16) onde ligam os drops. |
| — | `pole` | Poste. Sustenta o cabo aéreo; o cabo passa sem ser aberto. |
| — | `chamber` | Caixa subterrânea, equivalente ao poste em rede enterrada. |
| — | `reserve` | Reserva técnica: sobra de cabo enrolada para manutenção futura. |
| — | `customer` | Ponto de instalação do assinante. |

### Cabos (`CableKind`)

| Código | Liga | Fibras típicas |
| --- | --- | --- |
| `cable_backbone` | POP ↔ CEO, CEO ↔ CEO | 24 a 144 |
| `cable_distribution` | CEO ↔ CTO | 6 a 36 |
| `cable_drop` | CTO ↔ assinante | 1 |

Um cabo tem **tubos** e cada tubo tem **fibras** (2, 6 ou 12). Tubos e fibras seguem a
sequência de cores ABNT (verde, amarelo, branco, azul, vermelho, violeta, marrom, rosa,
preto, cinza, laranja, água-marinha) — ver `FIBER_COLORS` em `src/domain/optics.ts`.

### Equipamentos dentro dos nós (`EquipmentKind`)

| Sigla | Código | Fica em | Portas |
| --- | --- | --- | --- |
| OLT | `olt` | POP | PON (slot/porta) e uplink |
| DIO | `dio` | POP | Posições que terminam as fibras do backbone |
| Splitter | `splitter` | CEO, CTO | 1 entrada, N saídas |
| ONU / ONT | `onu` | Assinante | 1 PON |

### Ligações (`ConnectionKind`)

| Código | O que é | Perda típica |
| --- | --- | --- |
| `fusion` | Emenda por fusão entre duas fibras | 0,1 dB |
| `connector` | Conector (SC/APC) em CTO ou DIO | 0,5 dB |
| `patch_cord` | Cordão entre OLT e DIO | 0,5 dB por conector |

## Dois grafos

A rede é modelada em dois níveis, e confundi-los é a principal fonte de erro:

1. **Grafo físico** — nós e cabos no mapa. Responde "por onde o cabo passa" e
   "quantos metros".
2. **Grafo óptico** — fibras, portas e conexões *dentro* dos nós. Responde "esta ONU
   está em qual porta PON" e "qual a potência esperada aqui".

O grafo óptico se apoia no físico (uma fibra pertence a um cabo; uma conexão acontece
dentro de um nó), mas não é derivável dele: saber que um cabo entra numa CEO não diz
qual fibra foi fundida com qual.

## Regras

O detalhe de cada regra, e o que já está implementado, está em `docs/10-topologia.md`.

**Físicas:**

- A ponta de um cabo só gruda em POP, CEO, CTO ou cliente; um cabo não liga um nó a
  ele mesmo.
- Backbone termina em POP ou CEO; distribuição, em POP, CEO ou CTO; drop liga uma
  CTO a um cliente.
- Poste, caixa subterrânea e reserva são pontos de passagem (`viaNodeIds`), não pontas.
- Mover um nó move os cabos ligados a ele; excluir um nó desliga os cabos.
- Comprimento do cabo é medido pelo traçado, em metros. O real soma reservas e sobras
  (a implementar).

**Ópticas:**

- Cada ponta de fibra e cada porta participa de no máximo uma conexão por nó (posição
  de DIO, duas).
- Conexão só une pontas presentes no mesmo nó.
- O caminho de uma porta de CTO até a OLT termina em exatamente uma porta PON.
- Atenuação total do caminho ≤ orçamento da classe do transceptor (GPON B+: 28 dB).

**Comerciais (rede neutra):**

- Um recurso cedível tem no máximo uma cessão (`Lease`) ativa ou reservada por vez.
- Um assinante pertence a exatamente um provedor.
- Um serviço só ocupa porta cedida ao provedor do assinante.

## Situações

- **Elemento** (`LifecycleStatus`): planejado → em construção → ativo → desativado.
- **Porta** (`PortStatus`): livre, reservada, em uso, defeito.
- **Cessão** (`LeaseStatus`): reservada, ativa, suspensa, encerrada.
- **Serviço** (`ServiceStatus`): aguardando instalação, ativo, suspenso, cancelado.
