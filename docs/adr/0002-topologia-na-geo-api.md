# A topologia da rede mora na geo-api-neutra

Cabos, fibras, portas e ligações não tinham serviço dono na plataforma. Decidimos
ampliar a `geo-api-neutra` em vez de criar um serviço de inventário de rede: ela já
usa PostGIS, já é dona dos pontos de rede, da cobertura e da viabilidade, e uma
viabilidade que um dia considere porta livre precisaria das portas no mesmo lugar.

## Considered Options

- **Serviço novo de inventário de rede.** Separaria bem as responsabilidades, mas
  dividiria a rede em dois bancos (pontos na geo, cabos e portas no novo) e exigiria
  consulta entre serviços se a viabilidade passar a considerar portas.

## Consequences

- A geo passa a guardar linhas e a rede óptica, além de pontos e polígonos.
- As regras de topologia do editor (`src/features/editor/network.ts`,
  `src/domain/opticalGraph.ts`) são puras para poderem ser reescritas ou reaproveitadas
  do lado do serviço sem mudar de significado.
- A geo já caminha nessa direção: guarda as linhas do KMZ, classifica os ativos, tem
  rascunhos editáveis e uma topologia óptica inferida em desenvolvimento
  (`docs/12-portal-da-plataforma.md`). Portas, fibras e ligações ainda não existem lá.
