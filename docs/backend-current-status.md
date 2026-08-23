# Status Atual do Backend

## Resumo do estágio atual

O backend deixou de ser só identidade/perfil e hoje cobre o domínio principal do produto: autenticação (com refresh de token e início de login social), perfil completo por papel (incluindo histórico de peso), vínculo nutricionista-paciente com fluxo de convite, planos alimentares com edição por dia, e mensagens com contagem de não lidas.

Hoje o backend expõe **32 endpoints** distribuídos em 6 routers (`health`, `auth`, `profile`, `care_link`, `diet`, `message`), todos registrados em `backend/app/main.py` sob o prefixo `/api/v1`.

## O que já foi implementado

### Infraestrutura
- FastAPI com organização em camadas (`routes` → `schemas` → `services` → `core`)
- Integração com Supabase via dois clientes: `supabase_public` (chave anon, usado em Auth) e `supabase_admin` (service role, usado em todas as queries de dados — contorna RLS de propósito, pois o backend é a camada segura entre frontend e banco)
- Tipagem mais forte em `core/supabase.py` (`TypedDict`/`Protocol` para `SupabaseUser`, `SupabaseSession`, `SupabaseClientProtocol`)
- Documentação Swagger automática
- Health check

### Autenticação (`api/routes/auth.py`)
- `POST /auth/signup` — cria usuário no Supabase Auth (email/senha)
- `POST /auth/login` — retorna `access_token` + `refresh_token`
- `POST /auth/refresh` — renova a sessão a partir do `refresh_token`
- `GET /auth/me` — retorna o usuário autenticado a partir do JWT

O login social (Google) **não passa pelo backend** — é feito inteiramente pelo cliente Supabase no frontend (`signInWithOAuth`). O backend só volta a participar quando a sessão resultante chama `/auth/refresh` ou `/auth/me`, como qualquer outra sessão.

### Perfil (`api/routes/profile.py`)
- `POST /profile/setup` — cria perfil base + perfil específico por papel
- `GET /profile/me` — perfil base
- `GET /profile/me/details` — perfil base + dados detalhados por papel
- `PATCH /profile/me` — atualiza perfil base e sub-payloads (`nutritionist_profile`, `patient_profile`), incluindo `avatar_url` (URL, sem upload de arquivo)
- `GET /profile/weight-history`, `POST /profile/weight-entry`, `DELETE /profile/weight-entry/{date}` — histórico de peso do paciente, persistido como JSON em `patient_profiles.weight_history`

### Vínculo nutricionista-paciente (`api/routes/care_link.py`)
- `POST /care/links` — cria vínculo (direto ou como convite, via `send_invitation`)
- `GET /care/links` — lista vínculos do usuário autenticado (nutricionista vê pacientes, paciente vê nutricionistas)
- `GET /care/invitations` — convites pendentes do paciente
- `POST /care/links/{id}/accept` / `POST /care/links/{id}/reject` — responde a convite
- `GET /care/patients` — lista todos os pacientes do sistema (para o select de "vincular paciente")

### Dietas (`api/routes/diet.py`)
- `POST /diet/plans` — cria plano (status `draft`, gera os 7 `diet_plan_days`)
- `GET /diet/plans` — lista planos do nutricionista
- `GET /diet/my-plans` / `GET /diet/my-plan` — histórico e plano ativo do paciente
- `GET /diet/plans/{id}` — detalhe do plano
- `PATCH /diet/plans/{id}` — atualiza metadados (título, objetivo, datas, status)
- `PUT /diet/plans/{id}/days/{day_of_week}/meals` — substitui as refeições de um dia específico
- `PUT /diet/plans/{id}/meals` — replica as mesmas refeições para os 7 dias
- `DELETE /diet/plans/{id}` — remove o plano

### Mensagens (`api/routes/message.py`)
- `GET /messages/links` — conversas ativas do usuário, enriquecidas com `other_username`
- `GET /messages/{care_link_id}` — histórico de mensagens de uma conversa
- `POST /messages/{care_link_id}` — envia mensagem
- `POST /messages/{care_link_id}/read` — marca mensagens do outro usuário como lidas
- `GET /messages/unread-counts` — contagem de não lidas agrupada por `care_link_id`

## O que já foi testado com sucesso

Validado manualmente: subida do servidor, fluxo completo de signup/login/refresh/me, setup e edição de perfil (incluindo histórico de peso), criação de vínculo com e sem convite, aceite/rejeição de convite, criação/edição/exclusão de plano alimentar (incluindo edição por dia), envio/leitura de mensagens e contagem de não lidas.

O login Google foi testado de forma parcial — ver seção de limitações abaixo.

## O que ainda não foi implementado

- testes automatizados (toda a validação até aqui é manual)
- paginação nas listagens (`GET /diet/plans`, `GET /care/links`, etc. retornam tudo de uma vez)
- upload real de avatar (hoje é só uma URL informada pelo usuário)
- rate limiting / proteção contra abuso nos endpoints públicos (`signup`, `login`)
- regras de permissão mais refinadas (ex.: paciente não pode editar plano, mas isso ainda não é validado explicitamente em todos os endpoints de `diet`)
- callback de OAuth tratado no backend (hoje é 100% client-side)

## Limites da implementação atual

- **Login com Google está incompleto.** O botão dispara o redirecionamento real para o Google (`supabase.auth.signInWithOAuth`), mas a tela de callback (`/auth/callback` no frontend) chama `supabase.auth.getSessionFromUrl()`, um método que não existe mais no `@supabase/supabase-js` v2 (instalado: `^2.108.2`) — esse método era da v1. Hoje isso faz o callback sempre cair no branch de erro e redirecionar de volta para `/login` após 2s. Ou seja: o usuário consegue ir até a tela de consentimento do Google, mas a sessão não é finalizada no app. Commit relevante: `cb0166c "Botão do google quase funcionando"`.
- O botão "Entrar com Apple" no Login existe apenas visualmente, sem nenhum handler.
- Sem testes automatizados, qualquer regressão só é percebida em teste manual.

## Próximo marco lógico

1. Corrigir o callback do Google: trocar `getSessionFromUrl` por `supabase.auth.exchangeCodeForSession(...)` (fluxo PKCE) ou habilitar `detectSessionInUrl: true` e usar `onAuthStateChange` — ambos compatíveis com supabase-js v2.
2. Iniciar testes automatizados (ao menos para `auth` e `diet`, que são o núcleo do domínio).
3. Adicionar paginação nas listagens que já têm potencial de crescer (`diet/plans`, `care/patients`).

## Estado do projeto em uma frase

O backend cobre hoje todo o domínio funcional do MVP (identidade, perfil, vínculo, dietas e mensagens) com 32 endpoints validados manualmente, faltando principalmente testes automatizados, paginação e o fechamento do fluxo de login social.
