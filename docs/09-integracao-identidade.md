# Integração com o serviço de identidade

Análise do repositório `B-M-O-Be-More/identity-api-neutra` no commit `305c6db`
(22/06/2026). Refazer se o serviço mudar.

## O que o serviço é

Serviço em Python (FastAPI) da plataforma Neutra+, dono de usuários, organizações e
vínculos entre eles. Autentica por e-mail e senha e emite um JWT assinado (RS256) que
os outros serviços validam pela chave pública.

**`organization_id` é o identificador da empresa.** No editor, `Company.id` é esse
valor.

## Modelo

| Identidade | Editor (`src/domain/types.ts`) |
| --- | --- |
| `Organization` (nome, CNPJ, contato, endereço) | `Company` |
| `User` / *individual* (nome, e-mail) | `User` |
| `OrganizationMember` (`role`, `is_owner`, `status`) | `CompanyMembership` |
| Papéis: `owner`, `admin`, `technician`, `sales`, `lead_technician` | `CompanyRole` (alinhado a estes valores) |
| — | `Project`, `ProjectMembership`: **não existem na plataforma** |

O banco permite um usuário em várias organizações, mas o login usa **o primeiro
vínculo ativo que encontrar** e não há como escolher nem trocar de organização. Na
prática, hoje é uma organização por usuário.

## Login e token

`POST /api/v2/party/authentication` com `{ "email", "password" }` devolve, dentro do
envelope `{ message, data, … }`:

```json
{
  "accessToken": "…",
  "refreshToken": "…",
  "individual": { "id", "name", "email", "roleName", "organizationId", "isOwner" },
  "organization": { "id", "name", "taxId", … }
}
```

Conteúdo do token de acesso:

| Campo | Significado |
| --- | --- |
| `sub` | Id do usuário |
| `org` | Id da organização |
| `role` | Papel na organização |
| `is_owner` | Se é o dono |
| `exp` | Validade: **15 minutos** |

A chave pública fica em `GET /api/v2/party/.well-known/jwks`.

## Rotas

Base `/api/v2/party`. Todas, exceto login, cadastro e redefinição de senha, pedem
`Authorization: Bearer <token>`.

| Método | Caminho | Uso |
| --- | --- | --- |
| `POST` | `/authentication` | Login |
| `GET` | `/.well-known/jwks` | Chave pública |
| `POST` | `/organization` | Cadastra organização e responsável |
| `GET` `PATCH` | `/organization/{id}` | Lê e altera a organização |
| `GET` | `/organization/{id}/members` | Lista membros |
| `POST` | `/organization/{id}/memberInvitations` | Convida por e-mail |
| `POST` | `/memberRegistrations` | Conclui cadastro a partir do convite |
| `PATCH` `DELETE` | `/organization/{id}/members/{memberId}` | Altera e remove membro |
| `GET` `PATCH` | `/individual/{id}` | Lê e altera o próprio perfil |
| `POST` | `/password/reset-request`, `/reset-confirm`, `/change` | Senha |

O convite publica o pedido de e-mail que o `notification-api-neutra` consome, com o
modelo `employee-invitation`.

## Pontos a tratar antes de integrar

- **Não há renovação de sessão.** O login devolve um `refreshToken` de 7 dias, mas a
  rota que o trocaria por um novo token de acesso não existe (o `SDD.md` a descreve
  em `/token/refresh`; o código não tem). Como o token de acesso dura 15 minutos, o
  usuário teria de entrar de novo a cada 15 minutos. Para um editor de mapa, isso é
  impeditivo.
- **Não há saída (*logout*) nem revogação**, também descritas no `SDD.md` e ausentes.
- **A chave pública não está no formato que a `geo-api-neutra` lê.** A identidade
  publica a chave como `n` e `e`; a geo procura o campo `x5c` em `keys[0]`. Com isso a
  geo configura a validação com chave vazia. Os dois lados precisam combinar o
  formato — vale um teste real entre os serviços.
- **Sem chaves configuradas, o serviço gera um par novo a cada partida.** Todo token
  emitido antes de um reinício deixa de valer, e duas instâncias em paralelo não
  aceitam os tokens uma da outra. Em produção, `JWT_PRIVATE_KEY` e `JWT_PUBLIC_KEY`
  têm de estar definidas.
- **Não há CORS.** O navegador não consegue chamar o serviço direto de outro domínio.
- **O limite de tentativas de login fica em memória**, por processo: reinício zera e
  várias instâncias não compartilham a contagem.
- **Não há troca de organização** para quem pertence a mais de uma.

## Proposta de integração

O editor não guarda tokens no navegador. O fluxo passa por Route Handlers do Next,
que funcionam como intermediário:

```
Navegador ──cookie httpOnly──▶ Next (Route Handlers) ──Bearer──▶ identity / geo / …
```

1. **Login.** Um Route Handler recebe e-mail e senha, chama `/authentication` e
   grava os tokens em *cookie* `httpOnly`, `Secure`, `SameSite=Lax`. O navegador
   nunca vê o token.
2. **Chamadas aos serviços.** Outro Route Handler repassa a chamada com
   `Authorization: Bearer`, e preenche `organization_id` **a partir do `org` do
   token**, ignorando o que vier do navegador. Isso resolve, do lado do editor, o
   fato de a geo aceitar a organização informada por quem chama.
3. **Proteção de rotas.** Sem sessão válida, as páginas redirecionam para o login.
4. **Papéis.** O `role` do token decide o que a interface libera. Proposta inicial:

   | Papel na plataforma | No editor |
   | --- | --- |
   | `owner`, `admin` | Tudo, inclusive criar projeto e gerir membros |
   | `lead_technician` | Editar topologia |
   | `technician` | Alterar situação de elementos e portas |
   | `sales` | Consultar e ver viabilidade |

   Papel por projeto fica para quando houver projeto na plataforma.

Isso também elimina a dependência de CORS nos serviços.

**Depende do serviço de identidade:** a rota de renovação de sessão. Sem ela dá para
desenvolver e demonstrar, mas não para usar no dia a dia.

## Perguntas em aberto

- **Os provedores da rede neutra são organizações na identidade?** Se forem,
  `Provider.id` passa a ser o `organization_id` do provedor e o cadastro próprio de
  provedores no editor deixa de existir. Recomendo que sejam.
- **Onde mora o projeto?** Continua sem dono: nem a identidade nem a geo o têm.
- **Há um *gateway* na frente dos serviços**, ou cada um é acessado pelo seu
  endereço? Define as URLs que o intermediário do Next usa.
