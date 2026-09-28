# Status Atual do Backend

> Última atualização: 28/09/2026

## Resumo do estágio atual

O backend cobre todo o domínio principal do produto e ganhou, entre agosto e setembro de 2026, quatro frentes novas: **lembretes e notificações**, **presets de planos alimentares**, **envio de imagens (chat e foto de perfil)** e **adesão real à dieta** registrada no servidor, com dashboard agregado para o nutricionista. Também passou a ter os primeiros testes automatizados e está publicado no Render.

Hoje o backend expõe **54 endpoints** distribuídos em 9 routers (`health`, `auth`, `profile`, `care_link`, `diet`, `diet_preset`, `message`, `reminder`, `notification`), todos registrados em `backend/app/main.py` sob o prefixo `/api/v1`.

## O que já foi implementado

### Infraestrutura
- FastAPI com organização em camadas (`routes` → `schemas` → `services` → `core`)
- Integração com Supabase via dois clientes: `supabase_public` (anon, usado em Auth) e `supabase_admin` (service role, usado em todas as queries de dados — contorna RLS de propósito)
- Supabase Storage para imagens (buckets `chat-attachments` e `avatars`)
- Scripts SQL em `backend/sql/` e de criação de buckets em `backend/scripts/` para reproduzir o ambiente
- Documentação Swagger automática e health check
- Deploy no Render (dependências `email-validator` e `python-multipart` adicionadas para isso)

### Autenticação (`/auth`) — 4 endpoints
- `POST /auth/signup` — cria usuário no Supabase Auth (email/senha)
- `POST /auth/login` — retorna `access_token` + `refresh_token`
- `POST /auth/refresh` — renova a sessão a partir do `refresh_token`
- `GET /auth/me` — retorna o usuário autenticado a partir do JWT

O login social (Google/Apple) **não passa pelo backend** — é feito pelo cliente Supabase no frontend.

### Perfil (`/profile`) — 8 endpoints
- `POST /profile/setup` — cria perfil base + perfil específico por papel
- `GET /profile/me` e `GET /profile/me/details` — perfil base e perfil completo por papel
- `PATCH /profile/me` — atualiza perfil base e sub-payloads (`nutritionist_profile`, `patient_profile`)
- `POST /profile/me/avatar` — **novo:** upload real de foto de perfil (multipart), reaproveitando a validação de imagem do chat
- `GET /profile/weight-history`, `POST /profile/weight-entry`, `DELETE /profile/weight-entry/{date}` — histórico de peso do paciente (JSON em `patient_profiles.weight_history`)

### Vínculo nutricionista-paciente (`/care`) — 7 endpoints
- `POST /care/links` — cria vínculo (direto ou como convite, via `send_invitation`); convite gera notificação para o paciente
- `GET /care/links` — lista vínculos do usuário autenticado
- `GET /care/invitations` — convites pendentes do paciente
- `POST /care/links/{id}/accept` / `POST /care/links/{id}/reject` — responde ao convite e notifica o nutricionista
- `GET /care/patients` — lista todos os pacientes do sistema (select de "vincular paciente")
- `GET /care/patients/overview` — **novo:** visão agregada do nutricionista em um único request: paciente, se tem plano ativo, adesão dos últimos 7 dias e mensagens não lidas

### Dietas (`/diet`) — 11 endpoints
- `POST /diet/plans` — cria plano (status `draft`, gera os 7 `diet_plan_days`)
- `GET /diet/plans` — lista planos do nutricionista
- `GET /diet/my-plans` / `GET /diet/my-plan` — histórico e plano ativo do paciente
- `GET /diet/plans/{id}` — detalhe do plano
- `PATCH /diet/plans/{id}` — atualiza metadados; notifica o paciente **apenas quando o plano é ativado**
- `PUT /diet/plans/{id}/days/{day_of_week}/meals` — substitui as refeições de um dia
- `PUT /diet/plans/{id}/meals` — replica as mesmas refeições para os 7 dias
- `DELETE /diet/plans/{id}` — remove o plano
- `POST /diet/meal-items/{id}/toggle` — **novo:** paciente marca/desmarca o consumo de um item numa data real (`meal_completions`)
- `GET /diet/my-plan/adherence` — **novo:** esperado × consumido por dia em um intervalo de datas

### Presets de planos alimentares (`/diet/presets`) — 7 endpoints (novo)
- `GET /diet/presets` e `GET /diet/presets/{id}` — lista/detalhe dos presets visíveis
- `POST /diet/presets`, `PATCH /diet/presets/{id}`, `DELETE /diet/presets/{id}` — CRUD dos presets do próprio nutricionista
- `POST /diet/presets/{id}/duplicate` — copia qualquer preset visível como preset próprio
- `POST /diet/presets/{id}/assign` — cria um plano alimentar para um paciente vinculado a partir do preset

Regras: só nutricionistas usam presets; presets padrão (`is_builtin`) são visíveis a todos e somente leitura; presets próprios são editáveis só pelo dono; presets `public` de outros nutricionistas são visíveis, mas não editáveis. O banco já vem com 5 presets padrão (ganho de massa, perda de peso, perda de peso vegano, low-carb/manutenção, definição muscular).

### Mensagens (`/messages`) — 6 endpoints
- `GET /messages/links` — conversas ativas, enriquecidas com `other_username`
- `GET /messages/{care_link_id}` — histórico da conversa (anexos retornam com signed URL de curta duração)
- `POST /messages/{care_link_id}` — envia mensagem de texto
- `POST /messages/{care_link_id}/attachment` — **novo:** envia imagem (multipart, bucket privado, validação de tipo por magic bytes, limite de 5 MB)
- `POST /messages/{care_link_id}/read` — marca as mensagens do outro usuário como lidas
- `GET /messages/unread-counts` — não lidas agrupadas por `care_link_id`

### Lembretes (`/reminders`) — 4 endpoints (novo)
- `GET /reminders` — lista lembretes do paciente (nutricionista precisa informar `patient_id` e ter vínculo ativo; não vê os lembretes que o paciente criou para si)
- `POST /reminders`, `PUT /reminders/{id}`, `DELETE /reminders/{id}` — CRUD

Categorias: `meal`, `water`, `medication`, `custom`. Recorrência: `fixed_times` (lista de horários) ou `interval` (a cada N horas dentro de uma janela), com filtro de dias da semana. O próximo disparo (`next_fire_at`) é calculado em `services/recurrence.py`.

### Notificações (`/notifications`) — 6 endpoints (novo)
- `GET /notifications` — feed (lembretes vencidos, avisos do sistema e resumos de conversas com mensagens não lidas)
- `GET /notifications/unread-counts` — total de não lidas
- `POST /notifications/{id}/read` e `POST /notifications/read-all`
- `GET /notifications/preferences` e `PUT /notifications/preferences` — liga/desliga lembretes, chat e sistema, e define horário de silêncio

### Health — 1 endpoint
- `GET /health/`

## O que já foi testado com sucesso

- **Automatizado:** 12 testes pytest (recorrência de lembretes e regras de permissão de presets).
- **Manual:** subida do servidor, fluxo completo de signup/login/refresh/me, setup e edição de perfil (incluindo histórico de peso e upload de avatar), vínculo com e sem convite, CRUD de planos (incluindo edição por dia), envio de texto e imagem no chat, lembretes, feed e preferências de notificação, presets.
- **Ponta a ponta com dados reais de teste:** toggle de consumo, cálculo de adesão e agregação do nutricionista conferidos contra a conta manual; exclusão/edição de plano após o paciente registrar adesão (antes dava 500, corrigido).

## O que ainda não foi implementado

- cobertura de testes para os services centrais (`diet`, `care_link`, `message`, `notification`)
- paginação nas listagens (`GET /diet/plans`, `GET /care/links`, `GET /messages/{id}`, etc. retornam tudo de uma vez)
- rate limiting / proteção contra abuso nos endpoints públicos (`signup`, `login`)
- envio de notificações fora do app (push, e-mail) — hoje só existem no feed consultado pelo frontend
- SQL versionado para as tabelas antigas e para `reminders` / `notifications` / `notification_preferences`

## Limites da implementação atual

- **Login social não fecha sessão** (problema do frontend, ver [`frontend-current-status.md`](frontend-current-status.md)). O backend não precisa mudar para isso.
- **Lembretes só "disparam" quando o usuário consulta o feed.** Sem worker em segundo plano, um lembrete vencido vira notificação apenas na próxima chamada a `/notifications` ou `/notifications/unread-counts` (o frontend faz isso a cada 30s enquanto o app está aberto).
- **Fuso horário dos lembretes:** o disparo compara com `datetime.now()` do servidor. No Render o relógio está em UTC, enquanto os horários são cadastrados em horário de Brasília — vale confirmar esse comportamento antes de depender dos horários exatos.
- **Instabilidade do plano gratuito do Render:** cold start e conexões derrubadas sob requisições simultâneas logo após a navegação (aparecem no navegador como falso erro de CORS). Mitigado no frontend com retry automático.
- Adesão registrada antes de 01/09/2026 vivia só no `localStorage` de cada paciente e não foi migrada.

## Próximo marco lógico

1. Testes automatizados para `diet_service` (toggle/adesão/exclusão) e `care_link_service` (overview).
2. Versionar em `backend/sql/` o schema completo, para permitir subir um ambiente do zero.
3. Revisar fuso horário no cálculo/disparo de lembretes.
4. Paginação em mensagens e listagens do nutricionista.

## Estado do projeto em uma frase

O backend cobre todo o domínio do MVP e mais (lembretes, notificações, presets, imagens e adesão real), com 54 endpoints publicados no Render e os primeiros testes automatizados, faltando principalmente ampliar os testes, versionar o schema completo e adicionar paginação.
