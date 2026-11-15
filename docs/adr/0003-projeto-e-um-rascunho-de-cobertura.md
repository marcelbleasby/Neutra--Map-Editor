# Cada Projeto é guardado como um rascunho de cobertura da geo

A geo tem dois lugares onde a rede poderia morar: os pontos de rede e os rascunhos de
cobertura. Guardamos cada Projeto do editor como um rascunho de cobertura, porque só
ele aceita linhas (cabos), lê por área visível do mapa e controla versão por feição;
os pontos de rede não têm nenhuma das três coisas.

## Consequences

- Um projeto comporta até 20.000 feições, que é o limite do rascunho. Redes maiores
  se dividem em mais projetos.
- O rascunho não participa da cobertura nem das ofertas, e a geo ainda não tem rota
  para publicá-lo. Enquanto isso, o que se desenha no editor não chega ao marketplace.
- Os pontos de rede da geo deixam de ser usados pelo editor.
