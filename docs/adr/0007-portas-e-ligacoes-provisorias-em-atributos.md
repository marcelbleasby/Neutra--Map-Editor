# Portas e ligações ficam provisoriamente em atributos do rascunho

A geo ainda não tem porta, fibra nem ligação como entidades (ADR 0002 prevê que
passe a ter). Para a equipe de uma Empresa já trabalhar junta, guardamos esses dados
como atributos livres da feição da CTO, da CEO e do POP no rascunho de cobertura, em
vez de deixá-los só no navegador de cada pessoa.

É uma solução provisória e deliberada: atributo livre a geo não valida, não consulta
e não protege contra duas pessoas editando a mesma caixa além do controle de versão
da feição inteira.

## Consequences

- Viabilidade ("CTO com porta livre a até 250 m") não pode ser respondida pela geo
  enquanto as portas forem atributo; o editor calcula sobre o projeto carregado.
- Quando a geo tiver as entidades, há uma migração a fazer. Nada novo deve ser
  construído contando com o formato dos atributos.
- O pedido das entidades à geo fica aberto desde o início da integração.
