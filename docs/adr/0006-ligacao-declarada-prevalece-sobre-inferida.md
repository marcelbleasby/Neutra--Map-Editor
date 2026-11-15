# Num Projeto vale a ligação declarada; a inferida é só sugestão

A geo terá um motor que infere a topologia de um KMZ pela proximidade entre os
elementos, e o editor tem regras próprias sobre o que o usuário liga. Decidimos que,
num Projeto, vale o que alguém declarou; a inferência da geo entra apenas como
sugestão na importação, para o usuário aceitar ou corrigir.

Decidimos assim porque a inferência erra em casos que só quem conhece a rede resolve
(dois cabos passando pela mesma caixa, um aberto e outro não), e uma documentação que
muda sozinha a cada reprocessamento perde a confiança de quem trabalha em campo.

## Consequences

- O editor não recalcula ligações já declaradas quando a geo reprocessa um arquivo.
- As regras do editor e as da geo precisam concordar sobre o que é uma ligação
  permitida, ou a sugestão aceita num lado vira pendência no outro.
