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
- Portas da CTO com situação, provedor e cliente.
- Resumo do projeto (contagem, metragem de cabo, ocupação de portas) e exportação GeoJSON.

Os dados ficam no `localStorage` do navegador. Banco de dados, autenticação, diagrama
de fusões, SNMP e notificações estão planejados em [`docs/05-roadmap.md`](docs/05-roadmap.md).

## Documentação

- [Produto](docs/01-produto.md)
- [Domínio FTTH](docs/02-dominio-ftth.md)
- [Modelo de dados](docs/03-modelo-de-dados.md)
- [Arquitetura](docs/04-arquitetura.md)
- [Roadmap](docs/05-roadmap.md)
