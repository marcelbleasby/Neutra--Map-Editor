# O editor não tem banco de dados próprio

O editor é um front-end da plataforma Neutra+: todos os dados moram nos serviços dela
(identidade, geo, SNMP, notificações), e este repositório não tem banco, ORM nem
coletor. Decidimos assim porque a plataforma já tem serviços donos de cada dado, e um
segundo banco criaria duas fontes de verdade para a mesma rede.

## Consequences

- O que o editor precisar e nenhum serviço oferecer vira pedido ao serviço dono, não
  tabela nova aqui.
- Route Handlers do Next existem só para intermediar chamadas (sessão, organização,
  segredos); não guardam dados.
- Enquanto um dado não tem serviço dono, ele fica no `localStorage` do navegador, o
  que é provisório e não serve para uso em equipe.
