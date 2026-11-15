# Produto

## Em uma frase

Um editor de mapas onde a operadora de uma rede FTTH neutra documenta toda a sua
infraestrutura — do POP à porta da CTO — e enxerga, para cada porta, qual provedor a
ocupa e qual assinante está ligado nela.

## Rede neutra: o que muda

Numa rede FTTH comum, a mesma empresa é dona da fibra e do assinante. Numa **rede
neutra**, a dona da infraestrutura (a *operadora neutra*) não vende internet ao
consumidor: ela cede capacidade a vários **provedores**, que vendem o serviço.

Isso cria três perguntas que um software de documentação comum não responde bem:

1. **De quem é esta porta?** Cada recurso cedível (porta de CTO, saída de splitter,
   porta PON, fibra apagada) tem no máximo um provedor por vez.
2. **O que cada provedor pode ver?** O provedor enxerga a viabilidade e os seus
   próprios assinantes, não os dos concorrentes.
3. **Quanto cada provedor ocupa?** Ocupação por provedor é a base do faturamento.

No modelo de dados isso aparece como a entidade `Lease` (cessão), separada tanto da
porta física quanto do assinante.

## Quem usa

| Persona | O que faz | Papel no projeto |
| --- | --- | --- |
| Projetista | Desenha a rede, define splitters e fusões | `designer` |
| Gestor de rede | Cria projetos, acompanha ocupação e expansão | `manager` |
| Técnico de campo | Confere e corrige o que está instalado, ativa assinante | `field` |
| NOC | Recebe alarmes e localiza a falha no mapa | `viewer` + alarmes |
| Provedor (ISP) | Consulta viabilidade e os próprios assinantes | acesso restrito (fase futura) |

## Organização

- Uma **empresa** tem vários **projetos** (uma cidade, um bairro, uma expansão).
- Um **usuário** pode participar de vários projetos da empresa, com um papel em cada.
- Um **projeto** é a unidade de trabalho do editor: tem seu mapa e seus elementos.
- **Provedores** são cadastrados na empresa e valem para todos os projetos dela.

## Referência: Geosite Telecom

O Geosite Telecom é a referência de mercado para este produto. O que é público sobre
ele: plataforma web e mobile (Android/iOS) para documentar e projetar redes de fibra
óptica, consulta de disponibilidade de atendimento (viabilidade), planejamento de
expansão e integração com ERP/CRM.

> **A conferir.** O site `geositetelecom.com.br` não estava acessível quando este
> documento foi escrito; a lista acima vem de páginas públicas da empresa, não de uso
> do produto. Antes de fechar o escopo de cada fase, comparar com o produto real —
> principalmente diagrama de fusões, fluxo de viabilidade e app de campo.

O que adotamos da categoria (Geosite, Geogrid, OZmap):

- Mapa como interface principal; cada elemento abre seu detalhe ao ser clicado.
- Hierarquia POP → CEO → CTO → assinante, com cabos conectando os nós.
- Diagrama de fusões dentro das caixas.
- Cálculo de potência óptica ao longo do caminho.
- Consulta de viabilidade por endereço.

O que é específico daqui:

- Rede neutra como conceito de primeira classe (provedores, cessões, ocupação).
- Vários projetos por empresa com papéis por projeto.
- Alarmes SNMP correlacionados pela topologia e mostrados no mapa.

## Fora do escopo

- Faturamento e cobrança (o sistema fornece a ocupação; o ERP cobra).
- Provisionamento de ONU na OLT (o sistema lê via SNMP; não configura).
- Redes que não sejam PON (rádio, par metálico, HFC).
