# Design da interface

Plano feito com as skills `frontend-design` e `ui-ux-pro-max`. Persona definida pelo
time: **técnico em redes FTTH**.

## Para quem

O técnico usa o editor em dois lugares:

| No escritório | Em campo |
| --- | --- |
| Notebook, mouse, tempo para projetar | Celular ou tablet, na rua, com sol, às vezes de luva |
| Desenha cabos, liga fibras, revisa pendências | Acha a CTO, confere as portas, marca o que mudou |

O que ele procura primeiro, nos dois casos: **qual é este elemento** (o código
etiquetado na caixa), **como estão as portas** e **o que está errado**.

## Direção

O mundo do técnico tem uma linguagem visual própria e funcional: a **etiqueta de
identificação** amarela presa na caixa e no cabo, o **código de cores das fibras**
(verde, amarelo, branco, azul…) e a sinalização de rua de onde vem a tipografia
condensada dos marcadores. O editor usa essas três coisas, e nada de enfeite.

**O elemento memorável é a etiqueta**: o elemento selecionado aparece no painel como
a etiqueta que o técnico vê na caixa, em amarelo, com o código em letra condensada.
O resto da interface fica quieto para ela e para o mapa.

## Tokens

| Nome | Hex | Papel |
| --- | --- | --- |
| Tinta | `#1B232C` | Texto, botões principais, contorno de foco |
| Concreto | `#E6EBE8` | Fundo da aplicação, entre os painéis |
| Placa | `#FFFFFF` | Painéis |
| Linha | `#C2CCC8` | Bordas |
| Etiqueta | `#FFC700` | Seleção, ferramenta ativa, elemento etiquetado |
| Sinal | `#0B57B7` | Links e ações de navegação |

Situação de porta, de elemento e de pendência usa as cores que já existem no
catálogo, sempre **com forma ou texto junto**: porta em uso é cheia, reservada tem
contorno tracejado, com defeito é hachurada, compartilhada tem a barra violeta.

**Tipografia:** Barlow para tudo e Barlow Condensed para códigos de elemento e
números de porta. Barlow nasceu da sinalização de rodovia, que é o mesmo universo das
placas e marcadores de campo; a versão condensada faz caber `CTO-IUB-00551` numa
etiqueta estreita. Números sempre tabulares.

## Layout

```
Computador
┌──────────────────────────────────────────────────────────────────────┐
│ ← Projetos  Nome do projeto   [Importar] [Gerar KMZ] │ [Portas próximas] [Portas para ofertar] │
├──────────┬──────────────────────────────────────────┬────────────────┤
│ Desenhar │                                          │ ▌CTO           │
│ ● POP    │                  mapa                    │ ▌CTO-IUB-00551 │
│ ● CEO    │                                          │  portas…       │
│ …        │                                          │  topologia…    │
└──────────┴──────────────────────────────────────────┴────────────────┘

Celular
┌────────────────────────┐
│ ← Nome do projeto   ⋯  │
│ [POP][CEO][CTO][…] ⇢   │  ferramentas em faixa rolável
│                        │
│          mapa          │
│                        │
├────────────────────────┤
│ ▌CTO-IUB-00551         │  painel em gaveta, até 45% da altura
│  portas…               │
└────────────────────────┘
```

Tudo alinhado à esquerda. No celular, o mapa nunca some.

## Princípios

1. **O mapa é o protagonista.** Painéis cedem espaço a ele, nunca o contrário.
2. **Estado nunca só por cor.** Porta, pendência e situação levam forma ou texto.
3. **Alvo de toque de 44 px em tela de toque**, 32 px no mouse.
4. **Contraste para o sol:** texto principal com 7:1 ou mais; nada de cinza sobre cinza.
5. **Títulos em frase**, sem caixa alta, sem rótulo decorativo acima do conteúdo.
6. **Movimento só para responder a uma ação** (abrir gaveta, confirmar), e nenhum
   com `prefers-reduced-motion`.

## Revisão contra os padrões genéricos

| Proposta da ferramenta | Decisão | Por quê |
| --- | --- | --- |
| Fundo azul-marinho escuro com verde de destaque | Recusado | É o padrão de painel "tech" em qualquer assunto, e escuro perde leitura ao sol |
| Poppins + Open Sans | Recusado | Pareamento genérico de site corporativo |
| Padrão "Trust & Authority + Conversion" (logos, CTA de vendas) | Recusado | É de página de vendas; isto é uma ferramenta de trabalho |
| Densidade alta, estilo funcional, contraste 4.5:1, 44 px de toque | Mantido | Confere com a persona |
| Busca por tipo de produto ("GIS map editor") | — | A base da skill não tem esse tipo; nenhuma regra veio dela |

Da interface anterior saíram: títulos em caixa alta com espaçamento largo, botões
todos iguais no cabeçalho, caracteres de texto (✓, –) no lugar de ícones e textos
unidos por ponto médio.
