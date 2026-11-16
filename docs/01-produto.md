# Produto

O vocabulário está em [`GLOSSARY.md`](../GLOSSARY.md); as decisões difíceis de
reverter, em [`docs/adr/`](adr/).

## Em uma frase

Um editor de mapas onde um provedor documenta toda a sua rede FTTH — do POP à porta
da CTO — e marca quais portas compartilha com outras empresas pela plataforma Neutra+.

## Onde ele se encaixa

A Neutra+ é um marketplace: empresas com perfil **Seller** publicam ofertas e empresas
com perfil **Buyer** compram. Uma das coisas que se vende é CTO, com quantidade de
portas.

O editor é a ferramenta do Seller para **manter a rede por trás dessas ofertas**:

- desenhar ou importar a rede e manter sua topologia correta;
- saber, porta a porta, o que está livre, em uso, com defeito ou compartilhado;
- montar a cobertura das ofertas a partir das CTOs com porta para compartilhar;
- confirmar se há porta livre perto de um endereço;
- saber o que cai se um elemento falhar.

Quem compra **não entra no editor**. A regra da plataforma é que traçados, POPs e
CTOs são privados de quem vende; o comprador vê só a área pública e "coberto: sim ou
não".

## Rede neutra aqui

"Rede neutra" não é uma entidade da plataforma. No editor, ela se resume a isto:

- A Empresa é dona da rede e atende os próprios assinantes.
- Parte das portas de uma CTO pode ser **porta compartilhada**, marcada uma a uma.
- O **compartilhamento** — outra Empresa usando aquela porta — nasce de um pedido
  aceito no marketplace. O editor não cria; só indica qual porta atende o pedido.
- Da porta compartilhada, a dona da rede sabe a ocupação, não quem é o assinante.

## Organização

- Uma **Empresa** divide sua rede em **Projetos**: uma cidade, várias, ou parte de uma.
- Dentro de um projeto, cada **Topologia** é tudo que um POP alimenta. Nenhum cabo
  cruza projetos.
- Na plataforma, um usuário pertence a uma única Empresa.

## Quem usa

Os papéis são os de Seller do serviço de identidade.

| Papel | No editor |
| --- | --- |
| `seller_owner`, `seller_operations` | Editam a rede |
| `seller_technical` | Edita ligações e a situação de elementos e portas |
| `seller_commercial`, `seller_support` | Consultam, inclusive portas próximas |
| `seller_finance` | Não acessa |

## Viabilidade

**Viabilidade é definida pela geo**, não pelo editor: um ponto tem viabilidade para
uma oferta quando está dentro da **cobertura da oferta**. Cada consulta gera uma
evidência com prazo de 300 s, que o pedido usa no checkout; a Empresa dona da rede
ainda confirma ao aceitar o pedido (regra RN-GEO-01).

O papel do editor é **alimentar a cobertura da oferta com a rede real**. A geo aceita
montar a cobertura como círculos em volta de pontos da rede (`coverageNetworkPoints`);
o editor entrega esses pontos — as CTOs com porta compartilhada livre, com o raio de
atendimento de 250 m. Assim a viabilidade que o comprador vê nasce de onde há porta
para ele, e não de um polígono desenhado à mão.

Para a própria Empresa, o editor tem a consulta de **portas próximas**: dado um ponto,
quais CTOs a até 250 m têm porta livre, separando próprias de compartilhadas. Ela
serve para confirmar que dá para atender — por exemplo, antes de aceitar um pedido —
e não substitui a viabilidade.

## Referência: Geosite Telecom

O Geosite Telecom é a referência de mercado para a parte de documentação de rede. A
comparação funcionalidade a funcionalidade, feita sobre as notas de versão públicas
dele, está em [`docs/14-referencia-geosite.md`](14-referencia-geosite.md), com a lista
do que vale trazer.

## Fora do escopo

- Visão para quem compra, e cadastro de empresas parceiras.
- Criar compartilhamentos, preços e pedidos: são do marketplace.
- Cadastro de assinantes: é do sistema de gestão da Empresa. No editor o assinante é
  um nome ou código anotado na porta.
- Provisionamento de ONU na OLT.
- Monitoramento por SNMP e avisos de rede: ficam para outra fase.
