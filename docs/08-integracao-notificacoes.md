# Integração com o serviço de notificações

> **Atenção:** análise feita sobre uma versão antiga do serviço. O portal de
> documentação da plataforma é mais recente e corrige partes deste documento; veja
> `docs/12-portal-da-plataforma.md`.

Análise do repositório `B-M-O-Be-More/notification-api-neutra` no commit `b2f43b1`
(13/05/2026). Refazer se o serviço mudar.

## O que o serviço é

Serviço em Python (FastAPI) da plataforma Neutra+ que **envia e-mail**. Ele consome
um evento do RabbitMQ, renderiza um modelo HTML da biblioteca
`neutramais-templates-lib`, envia por SMTP e registra o resultado em banco próprio.

```
outro serviço ──RabbitMQ──▶ notification-api-neutra ──SMTP──▶ caixa de entrada
                                    │
                             notification_logs
```

É só e-mail. *Push*, SMS e envio direto por REST estão declarados fora do escopo no
`SDD.md`.

## Contrato

**Entrada** — uma mensagem na chave `events:notification:email_requested`:

```json
{
  "to": "pessoa@exemplo.com",
  "template": "nome_do_modelo",
  "context": { "variavel": "valor" },
  "locale": "pt-BR"
}
```

`locale` é opcional (padrão `pt-BR`; a biblioteca tem `pt-BR` e `en`). O modelo
precisa existir na `neutramais-templates-lib`; se não existir, o envio é registrado
como `failed`.

**Saída** — `GET /api/v2/notification/logs?page=&size=` lista os envios de toda a
plataforma: `recipient`, `template_name`, `locale`, `status` (`sent` / `failed`),
`error_message`, `sent_at`.

O `README.md` e o `SDD.md` listam sete eventos de domínio (`order.created`,
`payment.confirmed` etc.) e as rotas `/notification` e `/notification/{id}`. No
código existe **um** evento, o genérico acima, e **uma** rota, `/notification/logs`.

## Como se encaixa no editor

O editor previa dois tipos de aviso (`docs/04-arquitetura.md`): os que aparecem
dentro do aplicativo e os que saem por outros canais.

| Necessidade do editor | O serviço atende? |
| --- | --- |
| E-mail de alarme de rede ou de aviso do sistema | Sim, publicando o evento — desde que o modelo exista |
| Sino com avisos dentro do aplicativo | **Não** |
| Marcar aviso como lido | **Não** |
| Listar os avisos de um usuário | **Não**: o registro é por endereço de e-mail e a listagem é global |
| Preferências (severidade mínima, canal) | **Não** |
| Agrupar um corte de cabo em um aviso só | **Não**: cada evento vira um e-mail |
| Atualização em tempo real | **Não** |
| *Webhook* para sistemas do provedor | **Não** |

O serviço cobre o canal de e-mail. A central de avisos dentro do aplicativo não tem
onde morar hoje.

## Pontos a tratar antes de integrar

- **A listagem de envios não tem autenticação nenhuma** e devolve os endereços de
  e-mail de todos os destinatários da plataforma. A biblioteca de autenticação está
  nas dependências, mas não é usada.
- **O front-end não publica na fila.** Navegador não fala com RabbitMQ: quem publica
  o pedido de e-mail é um serviço de *backend*.
- **Não há novo envio em caso de falha.** O erro de SMTP é capturado e registrado
  como `failed`; a mensagem não volta para a fila.
- **`EMAIL_ADAPTER=ses` não tem efeito.** A configuração existe, mas o serviço sempre
  usa SMTP.
- **O consumidor pode não iniciar em silêncio.** O código importa
  `neutramais_event_lib` e o `pyproject.toml` declara `neutramais-events-lib`; se o
  nome do módulo não bater, o erro é só registrado em log e a API sobe sem consumir
  nada. Não consegui conferir o nome real, porque a biblioteca não está nesta sessão.
- **A gravação do registro merece conferência.** O consumidor recebe uma sessão de
  banco aberta uma única vez na partida, dentro de uma transação que só fecha quando
  a função de consumo retorna. Dependendo de como a biblioteca de eventos se
  comporta, os registros ficam sem `commit` ou usam uma sessão já fechada. Vale um
  teste com banco e fila reais; os testes atuais usam substitutos.
- **Dependências com caminho local de Windows** no `pyproject.toml`
  (`file:///C:/Users/…`), como na `geo-api-neutra`: não instala em outra máquina.

## Proposta de integração

1. **E-mail.** Criar na `neutramais-templates-lib` os modelos que o editor precisa
   (alarme de rede aberto, alarme encerrado, convite para projeto) e publicar
   `email_requested` a partir do serviço que gerar o alarme. Nada muda neste
   repositório.
2. **Avisos dentro do aplicativo.** Precisa de dono. O modelo `Notification` de
   `src/domain/types.ts` descreve o que guardar: destinatário por usuário, origem,
   projeto, lido ou não. Opções:
   - ampliar o `notification-api-neutra` com um segundo canal (`in_app`), rotas por
     usuário autenticado e marcação de leitura — recomendado, porque mantém um único
     ponto para "avisar alguém" e permite preferências por canal;
   - guardar junto de quem gera o alarme.
3. **Agrupamento e preferências.** Ficam em quem decide avisar, antes de publicar o
   evento; o serviço de notificações só entrega.

## Perguntas em aberto

- A central de avisos dentro do aplicativo entra no `notification-api-neutra` ou em
  outro serviço?
- Quem publica os avisos do editor — o coletor SNMP, a `geo-api-neutra` ou um serviço
  novo?
- Os modelos de e-mail de rede serão criados pelo mesmo time da
  `neutramais-templates-lib`?
