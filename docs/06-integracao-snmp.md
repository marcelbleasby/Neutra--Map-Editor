# Integração com o coletor SNMP

Análise do repositório `B-M-O-Be-More/snmp-api-neutra` no commit `f245775`
(13/05/2026). Refazer se o coletor mudar.

## O que o coletor é

Serviço em Go que faz *polling* SNMP periódico de dispositivos cadastrados e guarda
as leituras em PostgreSQL próprio. Expõe uma API REST no padrão TMF628 (Performance
Management). Faz parte da plataforma Neutra+.

```
Monolito ──RabbitMQ (snmp.device.events)──▶ snmp-api-neutra ──SNMP GET──▶ dispositivos
                                                  │
                                           PostgreSQL (devices,
                                           snmp_readings, discovery_results)
                                                  │
                                           REST /api/v2/performanceManagement
```

- **Entrada de dispositivos:** eventos `created` / `updated` / `deleted` vindos do
  monolito pela fila, ou `POST /device`.
- **Coleta:** a cada 60 s (configurável), um `GET` SNMP por dispositivo ativo, com
  até 100 em paralelo. Cada ciclo grava uma leitura; se falhar, grava a leitura com
  `errorMessage`.
- **Saída:** só a API REST. O coletor **não publica eventos**.

## API

Base: `/api/v2/performanceManagement`. Toda resposta vem em
`{ "message", "data", "metadata" }`.

| Método | Caminho | Uso |
| --- | --- | --- |
| `GET` | `/device?organizationId=&limit=&offset=` | Lista dispositivos |
| `POST` | `/device` | Cadastra dispositivo |
| `GET` | `/device/{id}` | Detalhe |
| `DELETE` | `/device/{id}` | Remove |
| `POST` | `/device/{id}/discover` | Testa alcance; devolve `status` e `latencyMs` |
| `GET` | `/measurement?deviceId=&organizationId=&limit=&offset=` | Leituras, mais recentes primeiro |
| `GET` | `/measurement/{id}` | Uma leitura |
| `POST` | `/measurement` | Deveria disparar coleta imediata (ver lacunas) |
| `GET` | `/health` | Saúde do serviço |

Dispositivo: `id`, `organizationId`, `hostname`, `ipAddress`, `snmpVersion`,
`deviceType` (`olt`, `onu`, `router`, `switch`, `generic`), `port`, `isActive`,
`pollingInterval`, `oids`.

Leitura: `deviceId`, `measurementDate`, `granularity`, `errorMessage` e
`measurementValue[]` com `measurementType`, `oid`, `value`, `numericValue`,
`unitOfMeasure`.

## Como se encaixa no modelo do editor

| Coletor | Editor (`src/domain/types.ts`) |
| --- | --- |
| `Device` | `Equipment` com `monitoringDeviceId`; casa também por `ipAddress` = `managementAddress` |
| `organizationId` | `Company.id` |
| `deviceType` `olt` / `onu` | `EquipmentKind` `olt` / `onu` |
| Leitura com `errorMessage` | Base para o alarme `olt_unreachable` |
| `discover` → `status` | Verificação sob demanda no painel do equipamento |

O coletor não conhece projeto, nó do mapa, porta PON nem assinante. Essa ligação
precisa viver do lado da API principal ou do editor.

## Lacunas para o que o editor precisa

O editor quer mostrar alarmes no mapa e correlacioná-los pela topologia. Hoje o
coletor não entrega isso:

1. **Não há alarmes.** Alertas por limiar e *traps* SNMP estão declarados como fora
   do escopo ("planejado") no `SDD.md`. O que existe é série de leituras. Alguém
   precisa transformar leitura em alarme (quando abriu, quando fechou, severidade).
2. **Não há dados de PON.** Os OIDs padrão são genéricos (descrição, tempo ligado,
   número de interfaces, estado de interface). Estado de ONU, potência óptica e
   *dying gasp* ficam em MIBs de fabricante, que não estão mapeadas.
3. **Só `GET`, sem `WALK`.** Dois dos OIDs padrão são colunas de tabela sem índice
   (`ifAdminStatus`, `ifOperStatus`); um `GET` nelas não devolve as interfaces. Para
   ler todas as portas PON ou todas as ONUs de uma OLT é preciso percorrer a tabela.
4. **Não há como ser avisado.** Sem eventos de saída, o editor só saberia de uma
   mudança consultando a API de tempos em tempos.

Consequência: com o coletor como está, o editor consegue mostrar **equipamento
alcançável ou não** e os valores brutos lidos. ONU offline, PON fora e potência
baixa dependem de evolução do coletor.

## Pontos a tratar antes de integrar

Observados no código; nenhum foi alterado.

- **A API não autentica.** `JWKS_URL` e `AUTH_DISABLED` existem na configuração, mas
  nenhum middleware os usa. `organizationId` vem da *query string*, e a listagem sem
  ele devolve dispositivos de todas as organizações. O navegador não deve chamar o
  coletor direto: o acesso passa pela API principal, que conhece o usuário.
- **Não há CORS**, o que reforça o ponto anterior.
- **`community` SNMP** é guardada em texto puro. A API não a devolve, mas é segredo
  de rede.
- **`POST /measurement` não coleta.** Responde "polling triggered" sem disparar nada.
- **`POST /device` ignora `pollingInterval` e `oids`** enviados: aplica depois de
  gravar, então a resposta mostra os valores mas o banco fica com os padrões.
- **`pollingInterval` por dispositivo não é usado**: o ciclo é global.
- **SNMP v3** é aceito como versão, mas não há campos de usuário e senha.
- **O evento da fila não traz `device_type`**: todo dispositivo sincronizado entra
  como `generic`, então não dá para saber pelo coletor o que é OLT.
- **`ip_address` é único no banco inteiro**, não por organização. Duas empresas com
  a mesma faixa privada de gerência colidem.
- **Documentação divergente:** `README.md` e `.env.example` usam nomes de variáveis
  diferentes; o `SDD.md` descreve uma tabela `measurements` que não é a do código
  (`snmp_readings`).

## Proposta de integração

Por ordem de dependência:

1. **Vincular.** No painel de um POP, associar cada OLT a um dispositivo do coletor
   (`Equipment.monitoringDeviceId`). Via API principal.
2. **Estado de alcance.** Mostrar no mapa a OLT como alcançável ou não, pela última
   leitura. É o que o coletor já sustenta hoje.
3. **Alarmes.** Definir onde nascem: no coletor (que já tem a série e o ciclo) ou na
   API principal. Recomendo no coletor, publicando na fila que ele já usa.
4. **Dados de PON.** Perfis de OID por fabricante e `WALK` de tabelas, para ter
   estado e potência por ONU.
5. **Correlação pela topologia.** Só faz sentido depois de 3 e 4 e do grafo óptico
   (Fase 2 do roadmap).

Os itens 3 e 4 são trabalho no repositório do coletor, não neste.

## Perguntas em aberto

- O "monolito" que publica os eventos de dispositivo é a API principal que o editor
  vai consumir?
- Quais fabricantes de OLT estão em campo? Isso define os perfis de OID.
- O editor acessa o coletor só através da API principal, ou haverá um *gateway*?
