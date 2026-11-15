# Pedidos a outros times

O editor não tem banco próprio (ADR 0001): o que ele precisa e nenhum serviço oferece
vira pedido ao serviço dono. Esta é a lista, por ordem de quanto destrava.

## Geo

| # | Pedido | Por quê | Enquanto não houver |
| --- | --- | --- | --- |
| G1 | Tipos de ativo novos: POP, caixa subterrânea, reserva técnica, assinante; e cabo backbone, de distribuição e drop | Hoje só existem `cto`, `fiber_cable`, `splice_closure` e `pole`. Sem POP não há Topologia; sem o tipo do cabo não há regra de ligação | O tipo real vai num atributo livre, que a geo não valida |
| G2 | Entidades de porta, fibra e ligação | É o que responde "de quem é esta porta" e "este assinante está em qual PON" (ADR 0002) | Ficam em atributos da feição (ADR 0007) |
| G3 | Consulta de viabilidade: CTOs com porta livre num raio (250 m), devolvendo distância | Depende de G2. Hoje a *feasibility* é só ponto em polígono | O editor calcula sobre o projeto carregado |
| G4 | Publicar um rascunho de cobertura como cobertura de oferta | Hoje não há rota. Sem ela, a rede do editor e o KMZ da oferta são dois arquivos que divergem | A Empresa mantém os dois à mão |
| G5 | Conferir se as regras de ligação da topologia inferida batem com as do editor | A sugestão aceita num lado não pode virar pendência no outro (ADR 0006) | — |

Regras do editor para comparar em G5: `CABLE_ENDPOINTS` em `src/domain/catalog.ts` e
`findIssues` em `src/features/editor/network.ts`. A geo usa encaixe de 1,5 m e 10 m;
o editor, 5 m na importação.

## Identity

| # | Pedido | Por quê |
| --- | --- | --- |
| I1 | Permissão `geo:coverage:write` para `seller_technical` | É o papel de quem liga fibras e altera situação de portas; hoje só `seller_owner`, `seller_commercial` e `seller_operations` escrevem na geo |
| I2 | Nome do membro na lista de membros | A lista devolve só `user_id` e `role`; o editor não consegue mostrar quem alterou o quê |

## Marketplace

| # | Pedido | Por quê |
| --- | --- | --- |
| M1 | Leitura dos pedidos aceitos de oferta de CTO, com a Empresa compradora e a quantidade de portas | O compartilhamento nasce do pedido (ADR 0005). Sem isso o editor marca a porta como compartilhada, mas não diz com quem |

## Para outra fase

- **SNMP:** dados de PON (ONUs por porta, potência) e alarmes. O serviço está
  indisponível e quem cadastra dispositivos é a equipe da Neutra.
- **Notification:** modelos de aviso de rede. A caixa de avisos já existe.
