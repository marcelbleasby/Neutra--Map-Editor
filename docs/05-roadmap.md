# Roadmap

As decisões que orientam esta ordem estão em [`docs/adr/`](adr/); o que depende de
outros times, em [`docs/13-pedidos-a-outros-times.md`](13-pedidos-a-outros-times.md).

## Feito

- Next.js + Mapbox GL Draw; projetos; desenho de nós, cabos e áreas.
- Topologia física: encaixe de cabos, pontos de passagem, regras de ligação, rota até
  o POP, impacto de falha, orçamento óptico estimado e pendências.
- Diagrama de ligações de POP, CEO e CTO, com rastreamento do sinal até a porta PON.
- Importação de KML/KMZ com classificação pelo nome.
- Portas de CTO com situação, compartilhamento e assinante.
- Rede neutra: estoque de portas para ofertar, CTOs com porta compartilhada no mapa e
  consulta de viabilidade por ponto (`docs/15-rede-neutra.md`).
- Portas para ofertar: soma por projeto ou por área, área de cobertura calculada a
  partir das CTOs e ocupação em planilha.
- Glossário e decisões registradas.

Tudo isso roda no navegador, com os dados no `localStorage`.

## Fase 1 — Entrar na plataforma

Não depende de nenhum pedido a outro time.

- Login pela identidade, com MFA e escolha do perfil Seller; sessão no servidor do
  editor (ADR 0004).
- Permissões da interface pelo papel (`ROLE_ACCESS`).
- Projetos como rascunhos de cobertura da geo (ADR 0003): criar, listar, abrir.
- Nós, cabos e áreas como feições do rascunho, com controle de versão por feição.
- Carregamento por área visível do mapa. Resolve o limite atual de elementos no Draw:
  a rede passa a ser desenhada em camadas comuns e o Draw recebe só o que se edita.
- Portas, equipamentos e ligações em atributos da feição do nó (ADR 0007).
- Busca por endereço pela geocodificação da geo.

## Fase 2 — Importar pela plataforma

- Envio do KMZ para a geo, com prévia; o Projeto nasce como rascunho copiado da versão.
- Revisão da classificação usando a da geo; o classificador do editor é aposentado.
- Sugestões de ligação a partir da topologia inferida pela geo, quando ela for
  publicada; o usuário aceita ou corrige (ADR 0006).

## Fase 3 — Rede neutra e topologia

Dentro do editor, sem depender de outros times. O foco é rede neutra
(`docs/15-rede-neutra.md`); os itens de topologia entram quando servem a ela.

- Viabilidade por endereço (hoje é por clique no mapa) e registro das consultas.
- Reservar no editor as portas que já estão numa oferta.
- Impacto de falha destacado no mapa, com as portas compartilhadas atingidas.

- Ligar várias fibras de uma vez e destacar no mapa o caminho rastreado.
- Sentido inverso: da porta PON, listar CTOs e assinantes.
- Ocupação de fibras por cabo; valor exato no lugar da estimativa nas pendências.
- ONU no assinante, sangria, reserva técnica no comprimento, dividir e unir cabos.

## Fase 4 — Rede neutra de ponta a ponta

Depende dos pedidos G2, G3, G4 e M1.

- Portas, fibras e ligações como entidades da geo, com migração dos atributos.
- Viabilidade respondida pela geo.
- Compartilhamento ligado ao pedido do marketplace: a porta mostra qual Empresa a usa.
- Publicar a área de cobertura do Projeto como cobertura de uma oferta.

## Outra fase

- SNMP: vincular POP a dispositivo, alarmes no mapa, correlação pela topologia.
- Avisos de rede na caixa de avisos da plataforma.
- Integração com o sistema de gestão da Empresa para os assinantes.
- Uso em campo (PWA) e importação de outros formatos.

## Em aberto

| Assunto | Situação |
| --- | --- |
| Ambientes | Só a homologação está documentada no portal; faltam as URLs de desenvolvimento e produção |
| Mapa base | Hoje só ruas do Mapbox; avaliar satélite |
| Funcionalidades da referência | `docs/14-referencia-geosite.md` lista doze candidatas vindas do Geosite; falta decidir quais entram na Fase 3 |
