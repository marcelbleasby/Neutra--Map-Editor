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
- Portas da CTO com situação, provedor e cliente.
- Diagrama de ligações de cada POP, CEO e CTO: fibras em cor, OLT, DIO e splitters,
  ligação por clique e caminho do sinal até a porta PON.
- Topologia: caminho de cada ponto até o POP, o que cai se um elemento falhar (com os
  provedores afetados), orçamento óptico estimado e lista de pendências do desenho.
- Resumo do projeto (contagem, metragem de cabo, ocupação de portas) e exportação GeoJSON.

Os dados ficam no `localStorage` do navegador. Integração com a API, autenticação,
diagrama de fusões, SNMP e notificações estão planejados em [`docs/05-roadmap.md`](docs/05-roadmap.md).

## Documentação

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
