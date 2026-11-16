# Neutra Map Editor

Editor de mapas para documentação e operação de redes FTTH neutras, feito com
Next.js e Mapbox GL Draw.

## Como rodar

```bash
npm install
cp .env.example .env.local   # preencha NEXT_PUBLIC_MAPBOX_TOKEN
npm run dev
```

Abra http://localhost:3000, crie um projeto e desenhe a rede.

## O que já funciona

- Vários projetos por empresa, cada um com seu mapa.
- Desenho de POP, CEO, CTO, cliente, poste, caixa subterrânea, reserva técnica,
  cabos (backbone, distribuição, drop) e áreas de cobertura.
- Cabos grudam nos nós ao serem desenhados e acompanham o nó quando ele é movido;
  comprimento calculado automaticamente.
- Importação de KML/KMZ, na criação do projeto ou dentro do editor: os elementos são
  reconhecidos pelo nome, revisados em grupos e a topologia é montada automaticamente.
- Portas da CTO com situação, marcação de porta compartilhada e assinante.
- Diagrama de ligações de cada POP, CEO e CTO: fibras em cor, OLT, DIO e splitters,
  ligação por clique e caminho do sinal até a porta PON.
- Rede neutra: marcar portas compartilhadas, ver o estoque para ofertar e consultar as
  portas próximas de um ponto do mapa (CTOs com porta livre a até 250 m).
- Portas para ofertar: soma das portas compartilhadas livres, pontos para a cobertura
  da oferta no formato da geo (`coverageNetworkPoints`) e ocupação em planilha (CSV).
- Topologia: caminho de cada ponto até o POP, o que cai se um elemento falhar (com as
  portas compartilhadas atingidas), orçamento óptico estimado e lista de pendências do desenho.
- Resumo do projeto (contagem, metragem de cabo, ocupação de portas) e exportação GeoJSON.

Os dados ficam no `localStorage` do navegador. A integração com a plataforma Neutra+
(login e projetos na geo) é a próxima fase, descrita em [`docs/05-roadmap.md`](docs/05-roadmap.md).

## Documentação

- [Glossário](GLOSSARY.md) e [decisões](docs/adr/)
- [Produto](docs/01-produto.md)
- [Domínio FTTH](docs/02-dominio-ftth.md)
- [Modelo de dados](docs/03-modelo-de-dados.md)
- [Arquitetura](docs/04-arquitetura.md)
- [Roadmap](docs/05-roadmap.md)
- [Integração com o coletor SNMP](docs/06-integracao-snmp.md)
- [Integração com a API de viabilidade](docs/07-integracao-geo.md)
- [Integração com o serviço de notificações](docs/08-integracao-notificacoes.md)
- [Integração com o serviço de identidade](docs/09-integracao-identidade.md)
- [Topologia](docs/10-topologia.md)
- [Fluxos de entrada: KML/KMZ e SNMP](docs/11-fluxos-de-entrada.md)
- [Estado atual dos serviços da plataforma](docs/12-portal-da-plataforma.md)
- [Pedidos a outros times](docs/13-pedidos-a-outros-times.md)
- [Referência: Geosite Telecom](docs/14-referencia-geosite.md)
- [Rede neutra: o foco do editor](docs/15-rede-neutra.md)
