# O que o portal de documentação muda

Levantamento do repositório `B-M-O-Be-More/developer-portal-neutra` no commit
`9dfa19d` (13/11/2026). O portal acompanha versões mais novas dos serviços do que as
que foram analisadas em `docs/06` a `docs/09`; **onde houver conflito, vale este
documento**.

## Plataforma

- A Neutra+ é um **marketplace**: empresas com perfil **Seller** publicam ofertas e
  empresas com perfil **Buyer** compram. Uma mesma empresa pode ter os dois perfis,
  mas a identidade nunca mistura as permissões: o usuário escolhe o perfil da sessão.
- Um usuário pertence a **uma única organização**.
- "Rede neutra" não é um conceito definido na plataforma, e não existe
  compartilhamento de porta entre empresas. O que existe é **CTO como tipo de oferta**
  no marketplace (`serviceType: cto`, com `portCount` obrigatório).
- Há 17 serviços documentados; os que interessam ao editor são Identity, Geo,
  Notification, SNMP e Marketplace.
- Não há aplicativo de mapa documentado. Os front-ends citados são Admin, Seller e
  Buyer, ainda sem documentação.

## Acesso

- Há um **nginx de borda** em `hom-api.neutramais.com` que roteia por prefixo
  (`/identity/`, `/geo/`…). O prefixo é removido, então a geo fica em
  `https://hom-api.neutramais.com/geo/api/v2/geo/...`. Não é um BFF.
- Só o ambiente de homologação está documentado.
- **A identidade não tem CORS.** A documentação dela recomenda: "Chame a Identity
  pelo servidor do front (proxy) ou peça a configuração de CORS no nginx".
- O token trafega só em `Authorization: Bearer`; vem no corpo da resposta do login.

## Identity (substitui `docs/09`)

| Antes (`docs/09`) | Agora |
| --- | --- |
| Login em `/api/v2/party/authentication` | `POST /api/v1/auth/login` |
| Sem renovação de sessão | `POST /api/v1/auth/refresh`; token de acesso 15 min, de renovação 14 dias |
| Sem logout | `POST /api/v1/auth/logout` e `/auth/revoke` |
| Papéis `owner`, `admin`, `technician`… | `seller_owner`, `seller_commercial`, `seller_finance`, `seller_operations`, `seller_support`, `seller_technical` (e os equivalentes `buyer_*`) |
| — | Perfil da sessão: `POST /api/v1/auth/context` com `{"profile": "seller"}` |
| — | MFA obrigatório no login para todo papel de Seller |

Pontos de atenção:

- O token de renovação é de **uso único**: reutilizá-lo revoga a sessão inteira. Duas
  abas renovando ao mesmo tempo derrubam o usuário. A renovação precisa acontecer em
  um lugar só — mais um motivo para ficar no servidor do editor.
- A geo exige token de perfil **Seller** com `transaction_eligible` para escrever, e
  revalida o contexto na identidade a cada chamada.
- Escrita na geo (`geo:coverage:write`) hoje é de `seller_owner`,
  `seller_commercial` e `seller_operations`. **`seller_technical` não tem.**
- A lista de membros devolve só `user_id` e `role`, sem nome.

## Geo (substitui boa parte de `docs/07`)

A geo guarda muito mais do que áreas e pontos:

| Recurso | O que é |
| --- | --- |
| Versão de cobertura (KMZ) | Cada envio de KMZ vira uma versão imutável, com linhagem. Aceita ponto, **linha** e polígono. Limite de 50 MiB. Prévia assíncrona antes de confirmar. |
| Elementos do KMZ | Cada Placemark da versão, com nome, pasta, estilo, geometria e **classificação**. Leitura por área visível (`bbox`), paginada, com simplificação. |
| Classificação | Tipo do ativo: `cto`, `fiber_cable`, `splice_closure`, `pole`, `coverage_area`, `unknown`. Sugerida automaticamente, validada por pessoa, com histórico. |
| Topologia óptica | Nós, cabos, junções e ligações **inferidos** do KMZ, com alertas (`dangling_cable_end`, `isolated_node`, `forbidden_connection`…). Só leitura. Ainda em PR, não publicada. |
| Rascunho de cobertura | "Projetos editáveis de cobertura": pontos, linhas e polígonos com `asset_type`, pasta, estilo e atributos; controle de versão por feição; leitura por `bbox`. Até 20.000 feições. **Não há rota para publicar o rascunho.** |
| Pontos de rede e áreas | O que `docs/07` descreveu. Ficam fora do KMZ e fora da viabilidade. |
| Viabilidade | `POST /feasibility`: ponto dentro do polígono da versão ligada a uma **oferta**, com evidência que expira em 300 s. |

O que **não existe**: porta, fibra, ligação, ocupação e compartilhamento. Capacidade,
splitter e ocupação aparecem só como exemplos de atributo livre.

Privacidade (regra RN-GEO-01): o KMZ é privado do Seller. O Buyer vê só a área
pública agregada e o resultado `covered`; "traçados físicos, rotas e PoPs ficam
confidenciais".

Consequências para o editor:

- **Há onde guardar cabos.** O rascunho de cobertura é um armazenamento editável de
  pontos e linhas, com leitura por área visível e controle de versão — o que
  `docs/07` listava como faltando.
- **Há dois motores de topologia.** O da geo infere a partir do KMZ; o do editor
  (`src/features/editor/network.ts`) trabalha sobre o que o usuário liga. Precisam de
  um papel claro cada um, ou vão discordar.
- **Há dois classificadores de KMZ.** O da geo e o de `src/features/import/classify.ts`.
- **Os tipos não batem.** A geo não tem POP, caixa subterrânea, reserva, cliente nem
  distinção entre backbone, distribuição e drop (esta última só aparece na topologia
  inferida).
- **A viabilidade da plataforma é o que o glossário do editor chama de Cobertura.**

## Notification (substitui a conclusão de `docs/08`)

O serviço **tem caixa de avisos dentro do aplicativo**:

- `GET /api/v2/notification/inbox`, `/inbox/unreadCount`,
  `PUT /inbox/{id}/read`, `PUT /inbox/{id}/archive`;
- preferências (`emailEnabled`, `pushEnabled`) e *push* por Firebase.

Não há tempo real (WebSocket ou SSE) para avisos, e não há nenhum evento de rede ou
de geo entre os modelos — todos são de pedido, contrato e pagamento.

## SNMP (complementa `docs/06`)

- A API está **indisponível** em homologação: o nginx devolve 403 e a coleta está
  desligada.
- Pela regra RN-MON-01, **quem cadastra dispositivos é a equipe da Neutra, não o
  Seller**.
- Potência óptica, ONUs por porta PON, *dying gasp* e abertura automática de chamado
  em "queda massiva de ONUs na mesma porta PON ou splitter" estão planejados, não
  implementados.
