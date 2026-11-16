# Fluxos de entrada

Um projeto pode começar de três formas:

| Como começa | Situação |
| --- | --- |
| Do zero, desenhando no mapa | Feito |
| De um KMZ gerado pelo próprio editor (versão publicada) | Feito: tipos, portas e cabos voltam sem perda |
| De um arquivo KML/KMZ | Feito |
| Do SNMP, a partir dos equipamentos monitorados | Desenhado; depende de integração |

## Importação de KML/KMZ

### Onde aparece

- **Na criação do projeto:** campo "Começar de um KML/KMZ". O mapa abre centrado na
  rede do arquivo e o editor já mostra a revisão.
- **Dentro do editor:** botão "Importar KML/KMZ". Os elementos se somam ao que já
  existe, e os cabos importados também se ligam a nós que já estavam no projeto.

### O que acontece

1. **Leitura** (`src/features/import/kml.ts`). KMZ é descompactado no navegador; o
   arquivo não sai da máquina do usuário. Pontos, linhas e polígonos de cada
   Placemark são lidos, com nome, descrição e pastas. Aceita `MultiGeometry`,
   prefixos de namespace e codificação antiga do Windows.
2. **Classificação** (`classify.ts`). O tipo de cada item é sugerido pelo nome e, na
   falta dele, pelo nome da pasta.
3. **Revisão** (`ImportDialog.tsx`). Os itens aparecem em grupos, com quantidade e
   exemplos; para cada grupo o usuário escolhe o tipo ou "Ignorar".
4. **Montagem** (`build.ts`). Os itens viram elementos e a topologia é montada: a
   ponta de cada cabo é ligada ao nó que estiver a até 5 m, e vértices sobre postes
   viram pontos de passagem.
5. **Pendências.** O que não ligou aparece na lista de pendências do projeto, com
   clique que leva ao elemento (`docs/10-topologia.md`).

### Regras de classificação

| Geometria | Nome contém | Vira |
| --- | --- | --- |
| Ponto | `RT`, `RESERVA` | Reserva técnica |
| Ponto | `CTO`, `NAP`, `CAIXA DE ATENDIMENTO` | CTO |
| Ponto | `CEO`, `EMENDA` | CEO |
| Ponto | `POP`, `OLT`, `CENTRAL`, `DATACENTER` | POP |
| Ponto | `POSTE`, `PST`, `P_12` | Poste |
| Ponto | `CS`, `SUBTERRANEA`, `CAIXA DE PASSAGEM` | Caixa subterrânea |
| Ponto | `CLIENTE`, `ASSINANTE`, `ONU` | Assinante |
| Ponto | nada disso | Sugestão: ignorar |
| Linha | `DROP` | Drop |
| Linha | `BACKBONE`, `TRONCO`, `ANEL`, `INTERLIGACAO`, ou só `CEO`/`POP` nas duas pontas | Cabo backbone |
| Linha | `CTO` | Cabo distribuição |
| Linha | nada disso | Sugestão: cabo distribuição |
| Polígono | qualquer | Área de cobertura |

A ordem importa: "RT 30m inserir CEO" é reserva, não CEO. Além do tipo, são lidos a
quantidade de fibras do cabo (`12FO`, `Cabo 72`) e as portas da CTO na descrição
(`Portas: 16`).

Elementos importados entram como **Ativo**, porque um KML normalmente documenta rede
que já existe.

### Limites

- **5.000 elementos por importação.** Hoje todos os elementos vivem no Mapbox GL Draw
  (`docs/04-arquitetura.md`). Um arquivo maior precisa ser dividido ou ter grupos
  ignorados.
- **Armazenamento do navegador.** Enquanto os dados ficam no `localStorage`, uma rede
  grande pode não caber; o editor avisa quando isso acontece.
- **Só os 40 maiores grupos** entram na revisão; os menores não reconhecidos ficam de
  fora.
- **Estilos e ícones do KML não são usados** para classificar; só nome e pasta.
- **Não há detecção de duplicados:** importar o mesmo arquivo duas vezes duplica.
- **A viabilidade da plataforma espera outra coisa.** O `SDD.md` da `geo-api-neutra`
  prevê upload de KMZ com versão imutável para cobertura. A importação daqui é uma
  ferramenta de edição; quando a geo tiver esse upload, definir se o editor passa a
  enviar o arquivo para lá.

## O repositório `ml-neutramais-kml-kmz`

Analisado no commit `0d4c039` (29/05/2026).

| Parte | O que é |
| --- | --- |
| `arquivos_treinamento/` | 12 arquivos KML/KMZ de operadoras, guardados em Git LFS |
| `classifcador_kml_kmz.py` | Divide cada arquivo em um KML por Placemark, separado em pastas por geometria |
| `dataset/` | O resultado: 145.681 Placemarks (119.017 linhas, 18.988 pontos, 7.676 polígonos) |
| `mvp_classfic.py` | Treina um classificador XGBoost |
| `model_out/` | O modelo treinado e um resumo do conjunto em CSV |

**O modelo não classifica elementos de rede.** O rótulo que ele aprende é o nome da
pasta, e as pastas são `Point`, `LineString` e `Polygon`. Ou seja, ele prevê o tipo
de geometria — informação que já está no arquivo e que, além disso, entra no modelo
como dado de entrada (a contagem de pontos, linhas e polígonos). Ele não diz se um
ponto é CTO, CEO ou poste.

**O que o repositório tem de valioso é o conjunto de dados:** nomes reais de
Placemarks de 12 redes. Foi dele que saíram as regras de classificação acima. Alguns
padrões encontrados:

- Pontos: `CTO-IUB-00551`, `CEO 72`, `NAP - 1`, `POP QUEX_JFLO`, `RT 30m`, `P_5`.
- Linhas: `CEO-MCO-00027-X-[]-CTO-MCO-01015-X_12FO-` (pontas e fibras no nome),
  `Cabo 72 interligação POP`, `C-Ceo - 1-Ceo - 12`.
- Também há muito que não é rede FTTH: marcos de rodovia (`KM`), câmeras, áreas por
  código de cidade. Por isso ponto não reconhecido é ignorado por padrão.

Outras observações:

- Os arquivos originais estão em Git LFS e não foram baixados nesta análise; só o
  conjunto já dividido.
- A divisão por Placemark descarta as **pastas** e os **estilos** do arquivo
  original, que são bons indícios do tipo.
- O `README.md` não descreve o projeto e o `requirements.txt` fixa versões de 2022.

**Para um classificador que ajude de fato**, o rótulo teria de ser o tipo de elemento
(CTO, CEO, POP, poste, tipo de cabo), anotado por alguém, e o modelo deveria usar
nome, pasta, estilo e descrição. As escolhas que os usuários fazem na tela de revisão
são exatamente essa anotação: guardá-las, quando houver onde, gera o conjunto de
treino sem esforço extra. Até lá, as regras por nome cobrem os padrões comuns e são
auditáveis.

## Projeto a partir do SNMP

Ainda não implementado. O que o coletor entrega está em
`docs/06-integracao-snmp.md`.

### O que dá para fazer com o coletor como está

O coletor conhece **dispositivos**: endereço IP, nome, tipo e se está alcançável.
Não conhece coordenadas, portas PON nem ONUs.

Fluxo possível hoje:

1. O usuário escolhe "Começar do SNMP".
2. O editor lista os dispositivos da organização (`GET /device`).
3. Cada dispositivo escolhido vira uma OLT dentro de um POP. Como o coletor não tem
   coordenada, **o usuário posiciona o POP no mapa** (ou informa o endereço, que a
   `geo-api-neutra` converte).
4. O POP fica vinculado ao dispositivo (`Equipment.monitoringDeviceId`) e passa a
   mostrar se está alcançável.

Isso dá o ponto de partida da rede — os POPs com suas OLTs —, não a rede.

### O que faria esse fluxo valer a pena

Com o coletor lendo dados de PON (perfis de OID por fabricante e `WALK`), o projeto
poderia nascer com:

- as portas PON de cada OLT;
- as ONUs de cada porta, com número de série e potência;
- portanto, a contagem de assinantes por PON antes de qualquer desenho.

O que **nenhum SNMP entrega** é a parte passiva: cabos, caixas, splitters e fusões.
Essa parte vem do desenho ou do KML. Os dois fluxos se completam: o SNMP traz a ponta
ativa (OLT e ONUs), o KML traz a planta, e o trabalho do usuário é ligar uma à outra —
dizer em qual CTO cada ONU está.

### Dependências

- Acesso autenticado ao coletor pelo intermediário do editor
  (`docs/09-integracao-identidade.md`).
- O evento que cadastra dispositivos precisa trazer o tipo; hoje tudo entra como
  `generic` e não dá para listar só as OLTs.
- Para o fluxo completo: dados de PON no coletor.

## Perguntas em aberto

- No fluxo do SNMP, a expectativa é começar só com as OLTs, ou já com as ONUs?
- Quais fabricantes de OLT estão em campo?
- Os arquivos KML dos clientes costumam ser maiores que 5.000 elementos? Se sim, a
  leitura por área visível sobe de prioridade.
