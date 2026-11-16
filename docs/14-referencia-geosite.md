# Referência: o que o Geosite Telecom faz

Análise da página pública "Notas de versão do Geosite Telecom", salva em 16/11/2026,
cobrindo as versões 2.83 (junho de 2025) a 2.106 (novembro de 2026).

**Limite desta análise:** notas de versão dizem o que mudou, não descrevem o produto
inteiro. Funções antigas e estáveis só aparecem quando são citadas de passagem. A
página "Funcionalidades" do site daria o quadro completo e não foi analisada.

## Como o Geosite se organiza

| Conceito deles | O que é | Equivalente aqui |
| --- | --- | --- |
| Mapa com camadas | Interface principal; "Cadastro (Rede Existente)" e camadas de projeto | Mapa do editor |
| Esquemático | Desenho interno de uma caixa, estação ou prédio: cabos, fibras, splitters, equipamentos e suas conexões | Diagrama de ligações |
| Diagrama topológico | O caminho de uma fibra de ponta a ponta | Rastreamento até a OLT (hoje só em texto) |
| Modo Projeto | Rede **projetada**, separada da existente, que depois é "convertida" | Situação "Planejado" de cada elemento |
| Redes e subredes | Agrupamento manual de elementos, com camada e filtro próprios | Topologia (calculada, não cadastrada) |
| Tenants | Empresas que usam portas da rede, com controle por município | Compartilhamento |
| Análise de Viabilidade | Consulta por endereço, com registro do resultado | Viabilidade |
| Mancha de atendimento | Área atendida, calculada ou personalizada | Área de cobertura |

**Atenção ao vocabulário:** "Projeto" no Geosite é a rede ainda não construída. Aqui,
Projeto é um recorte da rede (`GLOSSARY.md`). Quem vem do Geosite vai estranhar.

## O que eles têm, comparado ao editor

### Topologia e ligações

| Geosite | Editor hoje |
| --- | --- |
| Fibras por tubete, cada uma na sua cor, com condição e serviços | Tem, sem "condição" nem serviço por fibra |
| Quantidade de fibras disponíveis no cabo | **Não tem** (os dados existem) |
| Passar o mouse num lance do esquemático acende o cabo no mapa | **Não tem** |
| Rota e análise ficam destacadas no mapa | **Não tem**: o caminho aparece só em texto |
| **Análise OTDR**: da distância medida, localizar o ponto na rede | **Não tem** |
| Sangria e quebra de cabo em caixa existente | **Não tem** |
| Folga óptica ajustada ao dividir cabo | **Não tem** (reserva técnica não soma no comprimento) |
| Splitter desbalanceado | **Não tem** (o tipo já prevê) |
| Ordenar e inverter splitters na CTO | **Não tem** |
| Excluir cabo remove as conexões dele em cascata | Tem |
| Replicar conexões e informações ao longo da rota | **Não tem**: liga-se uma fibra por vez |
| Ajustar o desenho automaticamente, encaixar na grade, legenda de tubetes | Layout fixo em três faixas; sem legenda |
| Ver só as conexões de um elemento | Tem (as demais ficam esmaecidas) |
| Conexão entre equipamentos (OLT com switch e roteador) | Só OLT, DIO e splitter |
| Renumerar portas em matriz, como no equipamento físico | **Não tem** |
| Exportar esquemático em PNG e PDF, inclusive em lote | **Não tem** |

### Atendimento e rede neutra

| Geosite | Editor hoje |
| --- | --- |
| Drop de atendimento como elemento próprio | Tem (cabo drop) |
| Aviso de cliente a mais de 20 m da caixa | **Não tem** |
| Drop já ocupa a primeira porta livre do splitter | **Não tem**: drop e porta não se ligam sozinhos |
| Viabilidade com "portas de splitter disponíveis" | Decidida, não implementada |
| Log de viabilidade: viável ou inviável, vários cenários, histórico | **Não tem** |
| Mancha de atendimento **calculada** a partir da rede | **Não tem**: a área é desenhada à mão |
| Tenants com portas e **limite de portas por município** | Outro modelo: porta a porta, via marketplace |
| Clientes de tenant no mapa, com mapa de calor | Fora do escopo: o assinante é da outra Empresa |
| Relatório de utilização de portas por tenant | **Não tem** |
| Parceiros e contratos, com vigência e auditoria | É do marketplace |

### Projeto, campo e operação

| Geosite | Editor hoje |
| --- | --- |
| Converter rede projetada em existente | Só elemento por elemento, pela situação |
| Planilha de materiais do projeto | **Não tem** |
| Eventos de rede com elementos impactados, no mapa | Tem o cálculo (impacto de falha); não há registro de evento |
| QR Code em caixas e estações, que abre o esquemático | **Não tem** |
| Aplicativo mobile, com perfis só de leitura | **Não tem** |
| Anexos (fotos, documentos) nos elementos | **Não tem** |
| Papéis prontos: Gestor de rede, Técnico de campo, Projetista | Papéis de Seller da plataforma |

### Mapa e produtividade

| Geosite | Editor hoje |
| --- | --- |
| Clicar num ponto com vários elementos mostra uma lista | **Não tem**: seleciona o de cima |
| Depois de salvar, cadastrar outro do mesmo tipo com os dados do último | **Não tem**: a ferramenta desliga a cada elemento |
| Pesquisa global por nome ou código | **Não tem** |
| Filtro espacial e filtro por rede | **Não tem** |
| Régua e cálculo de área | **Não tem** |
| Painel de camadas com liga e desliga | **Não tem** |
| Importar e exportar KML/KMZ, exportar por rede | Importa KML/KMZ; exporta só GeoJSON |
| Indicadores e relatórios em Excel e CSV | Só o resumo do projeto |

### O que eles têm e está fora do nosso escopo

Dutos, subdutos e galerias; cordoalha, aterramento e torres; postes próprios e de
terceiros com controle contratual; prédios com esquemático predial; racks com unidades
ocupadas; DWDM, transponders e amplificadores; integrações com os ERPs IXC e Voalle;
API pública; chamados de suporte dentro do mapa.

São infraestrutura civil, rede de transporte e gestão — relevantes para um provedor
grande, mas não para documentar a rede de acesso e compartilhar portas.

## O que vale trazer

Ordenado por quanto agrega em relação ao esforço, considerando o que o editor já tem.

| # | Funcionalidade | Por que agrega | Esforço |
| --- | --- | --- | --- |
| 1 | **Destacar no mapa o caminho rastreado**, e acender o cabo ao passar o mouse no diagrama | Liga os dois níveis da topologia. Hoje o caminho é uma frase | Baixo: o rastreamento já devolve os cabos |
| 2 | **Localizar falha por distância (OTDR)** | Responde "o OTDR mediu 2.340 m: onde é?". É a pergunta mais cara de responder sem documentação | Médio: percorrer o caminho somando comprimentos |
| 3 | **Drop ocupa a primeira porta livre**, com aviso de assinante distante da CTO | Hoje drop e porta são cadastros separados que podem discordar | Baixo |
| 4 | **Ligar várias fibras de uma vez** e replicar ao longo da rota | Sem isso, documentar um cabo de 48 fibras são 48 pares de cliques | Médio |
| 5 | **Fibras disponíveis por cabo** | Mostra capacidade ociosa; os dados já existem | Baixo |
| 6 | **Área de cobertura calculada** a partir das CTOs com porta livre | Substitui o desenho à mão e fica coerente com a Viabilidade (250 m) | Médio |
| 7 | **Registro das consultas de viabilidade** | Histórico de onde se negou atendimento orienta a expansão | Baixo, mas depende de onde gravar |
| 8 | **Continuar cadastrando** o mesmo tipo e **lista ao clicar em ponto sobreposto** | Produtividade no uso mais repetitivo do mapa | Baixo |
| 9 | **Pesquisa por nome ou código** | Indispensável numa rede de centenas de CTOs | Baixo |
| 10 | **Sangria e dividir cabo numa caixa** | É como a rede cresce em campo | Alto: muda o modelo de cabo |
| 11 | **Converter planejado em ativo em lote** e **lista de materiais** | Fecha o ciclo de um projeto de expansão | Médio |
| 12 | **QR Code** que abre o diagrama da CTO ou CEO | Útil em campo; exige link direto para o diagrama e login | Médio, depois da integração |

Os itens 1, 4, 5 e 10 já estavam na lista do que falta em `docs/10-topologia.md`; a
referência confirma a prioridade. Os itens 2, 3, 6, 7 e 8 são novos.

## Onde o Geosite faz diferente do que decidimos

- **Rede neutra por cota, não por porta.** O Geosite dá a cada tenant um limite de
  portas por município. Aqui decidimos marcar porta a porta, com o compartilhamento
  vindo de um pedido do marketplace (ADR 0005). O modelo deles é mais simples de
  operar quando o que se vende é capacidade numa região; o nosso é mais preciso
  quando importa qual porta está com quem. Vale saber que a referência de mercado foi
  pelo outro caminho.
- **Rede projetada como modo separado.** Eles isolam o que é projeto do que existe e
  convertem depois. Aqui é uma situação em cada elemento, o que é mais simples, mas
  não impede que alguém ligue um elemento ativo a um planejado sem perceber.
- **Agrupamento manual em "redes".** Eles associam elementos a uma rede à mão; aqui a
  Topologia é calculada pelas ligações. O cálculo não fica desatualizado, mas não
  permite agrupar por critério que não seja o POP.
