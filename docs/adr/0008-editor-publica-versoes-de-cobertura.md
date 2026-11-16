# O editor é de onde saem as versões de cobertura

O editor é o ponto principal de gestão da rede neutra da Empresa: é nele que ela
atualiza os seus arquivos e, ao publicar, já tem disponibilidade para o marketplace.
Por isso publicar um Projeto **gera um KMZ e o envia à geo como nova versão do
arquivo de cobertura** (`POST /coverageVersion/kmz` com `predecessor_id`), e não
como algo paralelo ao KMZ que as ofertas usam.

Decidimos assim porque as ofertas do marketplace só enxergam versões de KMZ: um
rascunho, uma área desenhada à parte ou um ponto de rede não entram na viabilidade.
Se o editor não produzisse a versão, a Empresa manteria dois arquivos — o do editor e
o da oferta — que divergem.

## Consequences

- Cada Projeto corresponde a um **arquivo de cobertura** da geo (a linhagem de
  versões). O rascunho de cobertura continua sendo a área de trabalho (ADR 0003);
  publicar transforma o rascunho em versão.
- O KMZ gerado declara o tipo de cada elemento no esquema `neutra-assets-v1` da geo e
  leva os dados do editor em `ExtendedData`, para a mesma versão poder ser reaberta no
  editor sem perda.
- Só polígono dá cobertura. O KMZ leva sempre a **área atendida pela rede** (raio de
  atendimento em volta de cada CTO), para a cobertura das ofertas ter onde ser
  recortada.
- Uma versão nova **não muda as ofertas** (regra RN-GEO-01). Depois de publicar, o
  editor precisa mostrar quais ofertas estão na versão anterior e levar o Seller a
  aplicar a nova, com os pontos da cobertura atualizados.
- As ligações do diagrama ainda não vão no KMZ.
