# Lembretes/Notificações + Caixa de Entrada — Design

Data: 2026-08-17
Branch: `old-9d6c33c` (base: commit `9d6c33c`)

## Contexto

O NutriCare hoje tem vínculo nutricionista↔paciente (`care_links`), chat 1:1 por vínculo (`messages`, com contagem de não-lidas via polling a cada 30s no front) e planos de dieta com horário por refeição (`scheduled_time` em `meals`). Não existe nenhuma infraestrutura de lembretes, notificações ou caixa de entrada unificada.

Esta feature adiciona:
- Lembretes personalizados (criados por nutricionista para um paciente vinculado, ou pelo próprio paciente), com horário e recorrência.
- Uma Caixa de Entrada unificada, mostrando lembretes disparados, avisos do sistema (convites, planos atribuídos) e um resumo de mensagens de chat não lidas.
- Preferências de notificação por categoria + horário de silêncio.

## Decisões de escopo (alinhadas com o usuário)

1. **Entrega só dentro do app, via polling** — mesmo padrão já usado no chat (`useUnreadMessages`, 30s). Sem push do navegador, sem e-mail, sem infra nova de entrega.
2. **Chat no inbox é resumido, não duplicado** — a caixa de entrada mostra uma entrada por vínculo com mensagens não lidas ("3 mensagens novas de João"), que leva para a tela de chat existente (`Messages.tsx`). O conteúdo das mensagens não é replicado como notificações persistidas.
3. **Recorrência suporta dois modos**: horários fixos diários (com filtro opcional por dia da semana) OU intervalo em horas dentro de uma janela (ex.: a cada 2h das 08h às 20h).
4. **Edição de lembrete é compartilhada** — não existe "override pessoal": paciente e nutricionista editam o mesmo registro. Quem editar por último vale para os dois lados.
5. **Paciente pode criar lembretes próprios**, independente de o nutricionista ter criado algo antes (ex.: paciente sem nutricionista vinculado ainda pode ter lembrete de água).
6. **Preferências de notificação**: toggle por categoria (lembretes / chat / sistema) + horário de silêncio (janela em que lembretes não disparam notificação — o próximo horário é recalculado normalmente, só não gera notificação para a ocorrência dentro da janela).
7. **Avisos automáticos do sistema cobertos nesta versão**: convite de vínculo recebido/aceito/recusado, novo plano de dieta atribuído, lembrete disparado.
8. **Motor de disparo: "lazy tick"** — sem worker/cron 24/7. A cada chamada aos endpoints de notificação, o backend verifica lembretes vencidos do usuário, materializa a notificação e recalcula `next_fire_at`. Evita infra nova (thread em background, APScheduler) e mantém histórico persistido, ao contrário de calcular tudo "ao vivo" sem salvar.

## Modelo de dados (Supabase/Postgres, tabelas novas)

### `reminders`
| coluna | tipo | notas |
|---|---|---|
| id | serial pk | |
| patient_id | uuid (fk profiles.id) | para quem é o lembrete |
| created_by | uuid (fk profiles.id) | quem criou (nutricionista ou o próprio paciente) |
| care_link_id | int (fk care_links.id), nullable | presente quando criado por nutricionista; nulo quando o paciente cria pra si mesmo |
| category | text | `meal` \| `water` \| `medication` \| `custom` |
| title | text | |
| message | text, nullable | corpo mostrado na notificação |
| recurrence_type | text | `fixed_times` \| `interval` |
| fixed_times | jsonb, nullable | lista de strings `"HH:MM"`, usado quando `recurrence_type = fixed_times` |
| interval_hours | numeric, nullable | usado quando `recurrence_type = interval` |
| window_start | text `"HH:MM"`, nullable | início da janela, modo `interval` |
| window_end | text `"HH:MM"`, nullable | fim da janela, modo `interval` |
| days_of_week | jsonb | lista de inteiros 0-6; default todos os dias |
| is_active | bool | default true |
| next_fire_at | timestamptz, nullable | próxima ocorrência; motor do lazy tick |
| created_at / updated_at | timestamptz | |

Validação (422 se violado): `fixed_times` não pode ser vazio quando `recurrence_type = fixed_times`; `interval_hours`, `window_start` e `window_end` obrigatórios quando `recurrence_type = interval`.

### `notifications`
| coluna | tipo | notas |
|---|---|---|
| id | serial pk | |
| recipient_id | uuid (fk profiles.id) | |
| type | text | `reminder` \| `invite` \| `diet_plan_assigned` \| `chat_summary` |
| title | text | |
| body | text, nullable | |
| reference_id | int, nullable | id do lembrete/vínculo/plano relacionado, pra deep-link |
| read_at | timestamptz, nullable | |
| created_at | timestamptz | |

Entradas do tipo `chat_summary` **não são persistidas** — são calculadas na hora da listagem, reaproveitando a mesma query de `MessageService.get_unread_counts`, e mescladas ao feed antes de retornar.

### `notification_preferences`
| coluna | tipo | notas |
|---|---|---|
| user_id | uuid pk (fk profiles.id) | |
| reminders_enabled | bool | default true |
| chat_enabled | bool | default true |
| system_enabled | bool | default true |
| quiet_hours_start | text `"HH:MM"`, nullable | |
| quiet_hours_end | text `"HH:MM"`, nullable | |
| updated_at | timestamptz | |

## Arquitetura / fluxo

- O front faz polling nos endpoints de notificação no mesmo intervalo já usado para mensagens (30s), via um hook `useNotifications()` que generaliza o `useUnreadMessages` atual.
- Cada chamada a `GET /notifications` ou `GET /notifications/unread-counts` roda primeiro `NotificationService.tick_due_reminders(current_user)`:
  1. Busca lembretes do paciente atual com `is_active = true` e `next_fire_at <= now()`.
  2. Para cada um, isoladamente (falha em um não bloqueia os outros): se `reminders_enabled` e fora do horário de silêncio, insere uma linha em `notifications` (`type=reminder`, `reference_id=reminder.id`); em seguida recalcula `next_fire_at` a partir da regra de recorrência e atualiza o lembrete.
- Eventos de sistema criam a notificação diretamente no ponto de ação (`care_link_service.py`, `diet_service.py`), respeitando `system_enabled` do destinatário. Não passam pelo tick. Destinatário por evento:
  - convite enviado → notifica o **paciente** convidado;
  - convite aceito/recusado → notifica o **nutricionista** que enviou;
  - plano de dieta atribuído/atualizado → notifica o **paciente** do plano.
- Resumo de chat é computado ao vivo na listagem do inbox, sem gravação.

## API (backend)

Novo router `notifications` (prefixo `/notifications`):
- `GET /notifications` — feed unificado paginado (persistidas + resumo de chat ao vivo), ordenado por data
- `GET /notifications/unread-counts` — contador agregado pro badge
- `POST /notifications/{id}/read`
- `POST /notifications/read-all`
- `GET /notifications/preferences`
- `PUT /notifications/preferences`

Novo router `reminders` (prefixo `/reminders`):
- `GET /reminders?patient_id=` — nutricionista informa `patient_id` (obrigatório, precisa ser paciente com vínculo ativo) e recebe os lembretes desse paciente; paciente chama sem `patient_id` (implícito = ele mesmo) e recebe os seus (próprios + criados pelo nutricionista)
- `POST /reminders` — nutricionista informa `care_link_id` + `patient_id`; paciente cria sem `care_link_id`
- `PUT /reminders/{id}` — editar horário/recorrência/`is_active`
- `DELETE /reminders/{id}`

Permissões: nutricionista só acessa lembretes de pacientes com `care_link` ativo; paciente só acessa os seus. 403 caso contrário, 404 se o lembrete não existir.

## Frontend

- `Inbox.tsx` — lista de notificações com ícone por tipo; não lidas em destaque; clique marca como lida e navega para o destino (`reminder` → tela de lembretes; `invite` → convites; `chat_summary` → `Messages.tsx` do vínculo; `diet_plan_assigned` → `MyDiet.tsx`).
- `Reminders.tsx` — nutricionista seleciona um paciente vinculado e faz CRUD dos lembretes dele; paciente vê e edita os seus (próprios e os que o nutricionista configurou).
- `NotificationSettings.tsx` — toggles por categoria + campos de horário de silêncio.
- `useNotifications()` — hook de polling (generaliza `useUnreadMessages`), alimenta badge no `Navbar.tsx`.

## Tratamento de erros

- 403 quando nutricionista tenta acessar lembrete fora de seus vínculos ativos.
- 404 para lembrete/notificação inexistente.
- 422 para configuração de recorrência inválida (ver regras de validação acima).
- O tick nunca deixa a falha em um lembrete bloquear os demais — cada ocorrência é processada isoladamente, com log em caso de erro.

## Testes

- Backend: cálculo de `next_fire_at` para os dois modos de recorrência (horários fixos, intervalo), incluindo virada de meia-noite e filtro por `days_of_week`.
- Backend: idempotência do tick — chamar duas vezes seguidas não duplica a notificação.
- Manual: criar lembrete, forçar `next_fire_at` no passado, dar poll na API e confirmar que a notificação aparece uma única vez na Caixa de Entrada.
