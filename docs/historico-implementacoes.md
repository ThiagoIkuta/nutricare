# NutriCare — Histórico Completo de Implementações

> Registro de tudo que foi construído no projeto, do zero ao estado atual (setembro/2026), com detalhes de como cada feature foi implementada.

---

## FUNDAÇÃO — Infraestrutura base

Antes de qualquer feature visível, toda a base técnica do projeto foi montada.

### Backend (FastAPI + Supabase)

O `backend/app/main.py` configura o servidor FastAPI com middleware CORS, registra todos os routers e define o prefixo `/api/v1`. O cliente Supabase existe em duas versões: `supabase_public` (usa a chave anon, para operações de Auth) e `supabase_admin` (usa a service_role key, bypassa o RLS para todas as queries do backend). Decisão arquitetural deliberada: o backend é uma camada segura entre o frontend e o Supabase, então `supabase_admin` é usado em todas as queries ao banco.

### Frontend (React 19 + Vite + TypeScript + Tailwind)

O `frontend/src/lib/api.ts` centraliza todas as chamadas HTTP via Axios com um interceptor de resposta que, ao receber 401, tenta renovar o JWT automaticamente usando o `refresh_token` salvo. O padrão **singleton `refreshPromise`** garante que múltiplas requisições simultâneas em 401 não disparem vários refreshes em paralelo — apenas o primeiro dispara, os demais aguardam o mesmo promise. Após o refresh, o token é persistido no localStorage e a requisição original é repetida transparentemente.

### Sistema de autenticação

Três endpoints em `backend/app/api/routes/auth.py`:
- `POST /auth/signup` — cria usuário no Supabase Auth
- `POST /auth/login` — retorna `access_token` + `refresh_token`
- `POST /auth/refresh` — renova a sessão

No frontend, `Login.tsx` e `Register.tsx` consomem esses endpoints. O hook `useAuth` gerencia o estado da sessão em memória + localStorage. O componente `RequireAuth` protege todas as rotas `/app/*` — redireciona para `/login` se não há sessão.

### Sistema de perfil

Após o signup, o usuário cai em `ProfileSetup.tsx`, que pede nome, role (nutricionista ou paciente) e dados específicos. Para nutricionistas, o CRN é obrigatório. O backend em `profile_service.py` cria a entrada na tabela `profiles` (base) e depois em `nutritionist_profiles` ou `patient_profiles` conforme a role. Se a tabela específica falhar, o perfil base é revertido (cleanup manual). O hook `useProfile` carrega o perfil após login e redireciona para `/profile/setup` se `status === "missing"`.

### Roteamento

`frontend/src/routes/index.tsx` usa React Router DOM v7 com `BrowserRouter`. Todas as rotas sob `/app` ficam dentro de `<RequireAuth />` que implementa o `<Outlet />` pattern.

---

## SPRINT 1 — Páginas principais e fluxo do nutricionista

### Landing Page (`Home.tsx`)

Página de apresentação do produto com:
- Hero em laranja com CTAs "Começar grátis" e "Já tenho conta"
- Seção de funcionalidades em grid de 4 cards
- Tabela de preços com 3 planos (Básico / Profissional / Clínica), com o Profissional destacado em laranja com badge "Mais popular"
- Footer com copyright dinâmico

### Dashboard (`Dashboard.tsx`)

Tela inicial após login. Exibe card de perfil com iniciais, nome, role e email. Abaixo, grid de `ToolCard`s que variam conforme a role:
- **Nutricionista:** Pacientes, Planos Alimentares, Mensagens
- **Paciente:** Minha Dieta, Lista de Compras, Mensagens, Meus Planos

Modo demo detectado automaticamente quando o backend não responde — exibe banner amarelo com aviso.

### Gestão de Pacientes (`Patients.tsx`)

Página exclusiva do nutricionista. Lista todos os care_links com status badge (Ativo, Pendente, Encerrado, Cancelado, Rejeitado). Botão "Vincular paciente" abre painel inline com select dos pacientes cadastrados no sistema. Separa ativos dos demais. Cada `PatientCard` exibe iniciais, data de vínculo e botão "Novo plano" para vínculos ativos.

### Criação de planos alimentares (`DietPlanCreate.tsx`)

Formulário completo para o nutricionista:
- Seleciona paciente entre os care_links ativos
- Título, objetivo, datas de início/término, observações gerais
- Refeições com nome (via `<datalist>` de sugestões), horário e alimentos (descrição, quantidade, unidade, observação de preparo)

O backend cria o plano como `draft`, gera 7 `diet_plan_days` (seg–dom) e replica as refeições para todos os dias.

### Lista de planos (`DietPlans.tsx`)

Lista todos os planos do nutricionista com título, paciente, status badge, contagem de refeições e datas. Separa ativos dos demais. Link para criar novo plano.

### Detalhe do plano (`DietPlanDetail.tsx`)

Visualização do plano com seletor de dia da semana, listagem de refeições com itens (collapsível por refeição). Botões de ação: ativar / arquivar / reativar, editar metadados, excluir (com confirmação de 2 cliques).

---

## SPRINT 2 — Mensagens, dieta do paciente e lista de compras

### Sistema de mensagens (`Messages.tsx`)

Chat em tempo real por polling (5s) entre nutricionista e paciente:
- Sidebar com todas as conversas ativas, cada uma enriquecida com `other_username`
- Histórico de mensagens com horário formatado (hoje: só hora; outros dias: data + hora)
- Mensagens próprias à direita em laranja; mensagens da outra pessoa à esquerda em cinza
- Indicador "Lida" nas mensagens próprias que já foram lidas
- Mark-as-read automático ao abrir a conversa
- Scroll automático para a última mensagem via `ref`

**Backend (`message_service.py`):**
- `list_care_links()` — retorna todos os vínculos ativos do usuário (como nutricionista ou paciente), enriquecidos com `other_username`
- `list_messages()` — filtra `is_deleted = false`, ordena por `sent_at`
- `send_message()` — valida conteúdo não vazio, insere na tabela `messages`
- `mark_read()` — atualiza `read_at` com timestamp UTC para todas as mensagens do outro usuário na conversa

### Minha Dieta (`MyDiet.tsx`)

Página central do paciente. Busca o plano ativo via `GET /diet/my-plan` e exibe:
- Refeições do dia com checklist interativo — cada alimento tem ícone `Circle`/`CheckCircle2`; ao clicar, risca o item e persiste o estado no localStorage com chave `nutricare.checklist.{planId}.day{N}`
- Barra de progresso diária (itens marcados / total)
- Seletor de dia da semana com toggle de view "Dia" e "Semana"
- Modo demo com dados fictícios quando o backend não está disponível

### Lista de compras (`ShoppingList.tsx`)

Gerada automaticamente do plano ativo:
- Toggle "Hoje / Semana" multiplica quantidades por 7
- Itens agrupados em "A comprar" e "Comprado"
- Marcar como comprado, editar quantidade inline, remover item
- Adicionar item manualmente (com tag "manual")
- Regenerar da dieta, copiar como texto formatado
- Compartilhar via WhatsApp (abre `api.whatsapp.com` com o texto codificado)
- Tudo persistido no localStorage por `planId + period`

### Vínculo de cuidado — backend (`care_link_service.py`)

- `create_link()` — verifica se o target tem role `patient`, checa duplicata ativo/pending, insere
- `list_links()` — nutricionista vê seus pacientes; paciente vê seus nutricionistas; ambos com enrich de username
- `list_all_patients()` — nutricionista lista todos os pacientes do sistema para o select

---

## SPRINT 3 — Badges, editor por dia, peso, convites, gráfico de adesão

### Badge de mensagens não lidas no Dashboard

Criamos o hook `frontend/src/hooks/useUnreadMessages.ts` com polling a cada 30s em `GET /messages/unread-counts`. No backend, `get_unread_counts()` conta `messages WHERE sender_id != user_id AND read_at IS NULL`, agrupado por `care_link_id`. No Dashboard:
- `ToolCard` ganhou prop `badge?: number` que renderiza círculo vermelho no canto superior direito
- Alerta laranja no header quando `unread.total > 0` com link direto para Mensagens

### Customização de refeições por dia (`DietPlanDetail.tsx` — reescrita)

Antes apenas visualização; agora o nutricionista clica em "Editar este dia" e um painel inline laranja substitui a listagem de refeições. O editor tem formulário completo para adicionar/remover refeições e alimentos.

Dois modos de salvar:
- **"Salvar dia"** → `PUT /diet/plans/{id}/days/{dayOfWeek}/meals` (somente aquele dia)
- **"Aplicar para todos os dias"** → `PUT /diet/plans/{id}/meals` (replica para os 7 dias)

O backend em `replace_day_meals()` faz delete bottom-up (`meal_items` → `meals`) e recria do payload. Cria o `diet_plan_day` se ainda não existir.

### Histórico de peso do paciente

Painel togglável no `MyDiet.tsx` com botão "Peso" no header. Três endpoints:
- `GET /profile/weight-history` — lista entradas ordenadas por data
- `POST /profile/weight-entry` — adiciona ou substitui entrada da mesma data
- `DELETE /profile/weight-entry/{date}` — remove entrada

O gráfico `WeightChart` é SVG puro com `<polyline>` e `<circle>` nos pontos. Mostra variação total (ex: "-2.3 kg" em verde). Backend persiste o histórico como JSON no campo `weight_history` da tabela `patient_profiles`, sempre ordenando por data após cada operação.

### Fluxo de convite (care_links)

No `Patients.tsx`, o nutricionista tem um checkbox "Enviar como convite (paciente precisa aceitar)" ao vincular um paciente. O payload inclui `send_invitation: boolean`. No backend, `create_link()` define o status do vínculo como `"pending"` quando `send_invitation=True`.

Três novos endpoints em `care_link.py`:
- `GET /care/invitations` — lista convites pendentes para o paciente
- `POST /care/links/{id}/accept` — define status como `"active"`
- `POST /care/links/{id}/reject` — define status como `"rejected"`

No Dashboard, pacientes vêem um banner laranja com convites pendentes e botões Aceitar / Recusar.

### Gráfico de adesão semanal

Componente `AdherenceChart` no `MyDiet.tsx` com 7 barras coloridas por faixa:
- Verde ≥80%
- Amarelo 40–79%
- Laranja = hoje
- Cinza = sem registro

A função `computeWeekAdherence()` aceita `currentDay` e `currentChecked` como parâmetros — usa o estado React direto para o dia ativo e lê localStorage para os demais dias. Isso garante reatividade imediata ao clicar nos itens.

---

## SPRINT 4 — TACO, histórico de planos, notificações, PDF, avatar

### Busca de alimentos TACO

**`frontend/src/data/taco_foods.ts`** — base local com ~80 alimentos brasileiros da Tabela TACO, contendo `kcal, protein_g, carb_g, fat_g, fiber_g, default_unit, default_qty, category`. A função `searchTacoFoods()` normaliza acentos para matching insensível a acentuação.

**`frontend/src/components/FoodSearch.tsx`** — input com dropdown autocomplete. Ao selecionar um alimento, preenche automaticamente descrição, quantidade e unidade no formulário. Exibe nome, categoria e kcal estimado para a quantidade padrão. Click-outside via listener `mousedown` fecha o dropdown sem conflito com o `onFocus`. Integrado ao `DietPlanCreate.tsx` para facilitar o cadastro de alimentos.

### Histórico de planos do paciente (`PatientPlanHistory.tsx`)

Nova página em `/app/meus-planos`, acessível pelo card "Meus Planos" no Dashboard do paciente. Endpoint `GET /diet/my-plans` no backend:
- Consulta todos os care_links do paciente (qualquer status)
- Busca todos os planos associados
- Conta refeições do dia 0 como referência
- Enriquece cada plano com `nutritionist_username`

Frontend separa "Plano ativo" do "Histórico", mostrando nutricionista, objetivo, número de refeições/dia, datas e status badge. Plano ativo tem botão "Ver minha dieta →".

### Notificações do browser (`Messages.tsx`)

- `requestNotificationPermission()` chamada no mount da página — pede permissão ao sistema operacional
- `showBrowserNotification()` só dispara quando `document.hidden === true` (usuário em outra aba ou janela minimizada)
- Ref `lastMsgCount` rastreia a contagem anterior; novos itens do outro usuário disparam a notificação nativa com nome do remetente e conteúdo da mensagem

### Exportar relatório de adesão como PDF (`AdherencePrint.tsx`)

Página em `/app/relatorio-adesao`. Ao carregar:
1. Busca o plano ativo via `GET /diet/my-plan`
2. Lê o localStorage de cada dia para calcular adesão
3. Após 400ms chama `window.print()` automaticamente

Conteúdo do relatório:
- Cabeçalho com nome do plano e data de geração
- Tabela "Dia | Itens marcados | Total | %" com cores por faixa
- Lista completa do plano alimentar com refeições e alimentos

Elementos de UI usam classe `print:hidden` para desaparecer na impressão. Botão `FileText` no header do `MyDiet.tsx` navega para essa rota.

### Avatar de URL no perfil (`ProfileEdit.tsx`)

Campo de URL no formulário de edição com preview ao vivo em círculo de 64px. `onError` no `<img>` esconde a imagem se a URL for inválida, exibindo a inicial como fallback. Payload `PATCH /profile/me` inclui `avatar_url: string | null`.

O backend `update_my_profile()` foi estendido para aceitar sub-payloads junto aos campos base:
- `nutritionist_profile: { specialty, bio }`
- `patient_profile: { goal_summary, food_restrictions, birth_date, sex, height_cm, activity_level, medical_notes }`

O Dashboard exibe o avatar com o mesmo padrão de fallback para iniciais.

### Edição completa de perfil (`ProfileEdit.tsx`)

Além do avatar, o formulário permite editar todos os dados pessoais e de saúde:
- **Base:** nome de exibição, telefone, avatar URL
- **Nutricionista:** especialidade, bio / apresentação
- **Paciente:** data de nascimento, sexo, altura, nível de atividade, objetivo, restrições alimentares, observações médicas

Ao salvar com sucesso, navega de volta ao Dashboard após 1.2s.

---

## SPRINT 5 (PENDENTE) — Login social com Google e Apple

### O que foi feito

`Login.tsx` ganhou um botão "Entrar com Google" que chama `supabase.auth.signInWithOAuth({ provider: "google", options: { redirectTo: ".../auth/callback" } })` usando um cliente Supabase próprio (`frontend/src/lib/supabase.ts`), configurado com `persistSession: false` e `detectSessionInUrl: false` (a aplicação gerencia a sessão sozinha via `auth/storage.ts`, não pelo Supabase). Uma nova rota pública `/auth/callback` (`AuthCallback.tsx`) recebe o retorno do provedor, deveria extrair a sessão e convertê-la para o formato `AuthSession` já usado pelo resto do app, e então navegar para `/app`.

Em 24/06 o botão "Entrar com Apple" ganhou o mesmo tratamento (`provider: "apple"`, commit `172d8fe`) — antes era só visual. Ele depende de o provider Apple estar configurado no Supabase e usa o mesmo callback.

No backend, o commit que trouxe essa mudança (`cb0166c`) também endureceu a tipagem de `core/supabase.py` e `api/deps.py` (`TypedDict`/`Protocol` para usuário e sessão), sem criar nenhuma rota nova — o OAuth é resolvido inteiramente no frontend.

### Por que ainda não funciona

`AuthCallback.tsx` chama `supabase.auth.getSessionFromUrl()` para extrair a sessão da URL de retorno. Esse método existia no `@supabase/supabase-js` v1 e **foi removido na v2** — a versão instalada é `^2.108.2`. Como o cliente também desliga `detectSessionInUrl`, nenhum outro mecanismo captura a sessão. Resultado: o callback sempre cai no branch de erro, mostra "Falha ao processar callback de autenticação." e volta para `/login` depois de 2 segundos.

O commit `0161d0c` ("botão de login com google 100% funcional") alterou apenas o `frontend/.env.example`; o código do callback não mudou. Em setembro/2026 o problema continua o mesmo.

### Como destravar

Duas opções compatíveis com supabase-js v2:
1. Trocar `getSessionFromUrl()` por `await supabase.auth.exchangeCodeForSession(window.location.href)` (fluxo PKCE, recomendado pela Supabase para v2).
2. Ou habilitar `detectSessionInUrl: true` no cliente e capturar a sessão via `supabase.auth.onAuthStateChange`.

---

## SPRINT 6 (17/08/2026) — Lembretes, notificações e caixa de entrada

Planejada com spec e plano de implementação próprios (`docs/superpowers/`).

### Lembretes (backend)

- **`services/recurrence.py`** — função pura `compute_next_fire_at()` que calcula o próximo disparo de um lembrete em dois modos: `fixed_times` (lista de horários `HH:MM`) e `interval` (a cada N horas dentro de uma janela `window_start`–`window_end`), sempre respeitando `days_of_week`. Guarda contra `interval_hours` inválido. Coberta por testes pytest (`tests/test_recurrence.py`) — primeiros testes automatizados do projeto.
- **`services/reminder_service.py`** + rotas `/reminders` (GET, POST, PUT, DELETE). Categorias `meal`, `water`, `medication`, `custom`. Permissões baseadas em `care_links`: o paciente gerencia os próprios lembretes; o nutricionista cria/lista lembretes apenas para pacientes com vínculo ativo (e precisa informar `care_link_id` / `patient_id`). Os lembretes que o paciente cria para si não aparecem para o nutricionista. Ao editar, `next_fire_at` é recalculado e campos de recorrência obsoletos são limpos.

### Notificações (backend)

- **`services/notification_service.py`** + rotas `/notifications` (feed, unread-counts, read, read-all, preferences).
- **Lazy tick:** não existe worker em segundo plano. Toda vez que o usuário consulta o feed ou o contador, `tick_due_reminders()` materializa em `notifications` os lembretes vencidos e reagenda o próximo disparo. O tick é idempotente sob concorrência (duas requisições simultâneas não duplicam a notificação).
- **Preferências** (`notification_preferences`): liga/desliga lembretes, chat e sistema, e horário de silêncio (inclusive atravessando a meia-noite, e podendo ser limpo). Criadas sob demanda via `upsert` para evitar corrida no primeiro acesso.
- **Resumos de chat:** o feed inclui entradas sintetizadas `chat_summary` (id `"chat-{care_link_id}"`) para conversas com mensagens não lidas, sem gravar linha no banco — por isso `NotificationResponse.id` é `int | str`.
- **Notificações de sistema:** convite enviado (para o paciente), convite aceito/recusado (para o nutricionista) e plano **ativado** (para o paciente — inicialmente disparava em qualquer atualização, corrigido para só na ativação). Falhas ao notificar são isoladas e não derrubam o fluxo de vínculo/dieta.

### Frontend

- `notifications/types.ts` e hook `useNotifications.ts` (polling de 30s do contador).
- **`Inbox.tsx`** (`/app/notificacoes`) — lista notificações, marca como lida ao abrir e "marcar todas" (excluindo os resumos de chat, que não são linhas reais).
- **`NotificationSettings.tsx`** (`/app/notificacoes/preferencias`) — switches por categoria e horário de silêncio, com estados de carregamento/erro.
- **`Reminders.tsx`** (`/app/lembretes`) + `ReminderForm.tsx` — CRUD ciente do papel: o nutricionista escolhe entre os pacientes com vínculo ativo; o paciente gerencia os próprios lembretes.
- Dashboard ganhou badge de notificações não lidas e card "Lembretes" para os dois papéis.

---

## DEPLOY (18/08/2026) — Render + Vercel

- Backend publicado no Render e frontend na Vercel.
- `email-validator` adicionado ao `requirements.txt` (o `EmailStr` do Pydantic quebrava o deploy sem ele).
- `frontend/vercel.json` com rewrite de SPA, para o React Router funcionar ao recarregar qualquer rota.
- `frontend/.env.example` passou a documentar `VITE_API_URL`, `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY`.

---

## SPRINT 7 (23/08/2026) — Identidade visual e acabamento de UX

- **Lembretes em PT-BR** (`reminders/format.ts`): categorias traduzidas, dias da semana abreviados e intervalo exibido em minutos/horas.
- **`ToggleSwitch.tsx`** — switch reutilizável (ativar/desativar lembretes, preferências), após corrigir o "thumb" que não deslizava.
- **`BackLink.tsx`** — o link "voltar" existia em dois padrões diferentes espalhados por 14 páginas; foi consolidado num único componente com ícone `ArrowLeft` e rótulo por página.
- **Logo e cores:** logo aplicado na navbar pública, Login, Register, header do Dashboard e favicon. Houve um experimento com azul/menta como cores de destaque, revertido — o laranja continua como cor primária.
- Login e Register passaram a exibir a `Navbar` pública.

---

## SPRINT 8 (25/08 – 30/08/2026) — Imagens, receitas e presets de planos

### Envio de imagens no chat

- Novo endpoint `POST /messages/{care_link_id}/attachment` (multipart). A imagem vai para o bucket `chat-attachments` do Supabase Storage e a mensagem é registrada com `message_type = "image"`.
- Schema: `messages.content` passou a aceitar nulo, nova coluna `attachment_url` e `image` liberado na constraint de `message_type` (`backend/sql/0001_chat_attachments.sql`).
- Correções feitas na revisão da feature:
  - o Axios serializava o `FormData` como JSON por causa do `Content-Type` padrão — o header agora é removido por chamada;
  - bucket privado: `attachment_url` guarda o caminho no Storage e as leituras geram signed URLs de curta duração;
  - leitura do arquivo limitada a `MAX_ATTACHMENT_SIZE + 1` bytes;
  - `Content-Type` declarado validado contra os magic bytes reais;
  - se o insert da mensagem falha, o arquivo órfão é removido do Storage;
  - trocar de conversa durante o upload não injeta mais a imagem na conversa errada.
- Frontend: botão de anexar, validação no cliente e preview da imagem na bolha.

### Sugestão de receitas

- `frontend/src/data/recipes.ts` — ~24 receitas brasileiras que referenciam alimentos de `taco_foods.ts` como fonte única de dados nutricionais.
- `RecipeModal.tsx` — botão "Ver receitas" em cada refeição do `MyDiet.tsx`. As receitas são ordenadas por sobreposição de palavras-chave entre seus ingredientes e os itens da refeição (o match por substring falhava em casos como "Frango peito grelhado" × "Frango grelhado").
- 100% client-side: sem IA, sem backend novo e sem custo.

### Presets de planos alimentares

- Tabela `diet_plan_presets` com as refeições em JSON (`meals_json`, mesmo formato de `MealCreate`) e **5 presets padrão**: ganho de massa, perda de peso, perda de peso vegano, low-carb/manutenção e definição muscular (`backend/sql/0002_diet_plan_presets.sql`, seguro para rodar mais de uma vez).
- `services/preset_service.py` + rotas `/diet/presets`: listar, detalhar, criar, editar, excluir, **duplicar** e **atribuir a um paciente** (cria um plano de verdade a partir do preset). Regras: só nutricionistas; presets padrão são somente leitura; presets `public` de outros nutricionistas são visíveis mas não editáveis. Regras de visibilidade/edição cobertas por testes pytest. Preset com JSON inválido na atribuição retorna 422 em vez de 500.
- Frontend: `MealsEditor.tsx` extraído de `DietPlanCreate.tsx` e reaproveitado; novas páginas `DietPresetCreate.tsx` e `DietPresetEdit.tsx` (com tela de erro própria se o preset não carrega); `PresetsTab.tsx` como segunda aba de `DietPlans.tsx`, com duplicar, excluir e modal de atribuição.

### Upload de foto de perfil

- `POST /profile/me/avatar` — upload real para o bucket `avatars`, reaproveitando a validação do chat, agora extraída para `services/image_utils.py`.
- `ProfileEdit.tsx` troca o campo de URL por seleção de arquivo com preview.
- Scripts `backend/scripts/create_avatars_bucket.py` e `create_chat_attachments_bucket.py` documentam a criação dos buckets em um ambiente novo.

---

## SPRINT 9 (01/09/2026) — Adesão real e dashboard agregado do nutricionista

Até aqui, "marcar item como consumido" só existia no `localStorage` do paciente, e o nutricionista não tinha como ver a adesão de ninguém.

### Backend

- Tabela `meal_completions` (paciente + item + **data real**, única por combinação) — substitui os "slots" por dia da semana que se reciclavam toda semana (`backend/sql/0002_meal_completions.sql`).
- `POST /diet/meal-items/{id}/toggle` — o paciente marca/desmarca o consumo em uma data, com checagem de propriedade via `care_link`.
- `GET /diet/my-plan/adherence` — esperado × consumido por dia em um intervalo.
- `GET /care/patients/overview` — em um único request, para cada paciente ativo: se tem plano ativo, adesão dos últimos 7 dias e mensagens não lidas.

### Frontend

- `MyDiet.tsx` — checklist com atualização otimista contra a API real e gráfico de adesão com datas reais. O modo demo continua local, sem chamar endpoints.
- `Patients.tsx` — pacientes ativos ordenados por quem precisa de atenção primeiro (sem plano, depois menor adesão), com badge de adesão colorido e contador de não lidas.

Efeito colateral aceito: a adesão de todos começou zerada a partir dessa data, pois o histórico antigo vivia só no `localStorage` e não havia como migrá-lo.

---

## ESTABILIZAÇÃO (18/08 – 25/09/2026)

- **Login/signup sempre falhavam** (401/400): `extract_user_from_response` / `extract_session_from_response` exigiam `dict`, mas o `supabase-py` retorna objetos Pydantic. Corrigido em `core/supabase.py`.
- **Erro de perfil mascarado como modo demo:** quando `/profile/me/details` falhava (ex.: cold start do Render), o Dashboard mostrava o perfil fictício "Dra. Ana Silva". Agora há tela de erro com "tentar novamente".
- **Corrida no token de autenticação:** `setApiAccessToken` rodava num `useEffect` do `AuthProvider`, que executa depois dos efeitos das páginas filhas; em ~1 de cada 4 cargas completas a primeira requisição saía sem token e caía em modo demo. O token passou a ser aplicado no inicializador de estado.
- **Falso erro de CORS em produção:** o plano gratuito do Render derrubava conexões sob requisições simultâneas. `api.ts` repete até 2 vezes requisições sem resposta do servidor; o toggle do checklist, que revertia em silêncio, agora mostra erro visível.
- **500 ao excluir/editar plano com adesão:** `meal_completions.meal_item_id` não tem `ON DELETE CASCADE`. `_purge_completions_for_meal_ids` passou a limpar a adesão antes de apagar `meal_items` em `delete_plan`, `replace_day_meals` e `replace_meals`.
- **Usuário logado em `/login` ou `/register`** agora é redirecionado para `/app`.

---

## BUGS CORRIGIDOS

### JSX parse error no `Patients.tsx`

**Erro:** `[plugin:vite:oxc] Expected ',' or ')' but found 'Identifier'` na linha 156.

**Causa:** O branch positivo de um ternário JSX retornava dois elementos adjacentes (`<div>` + `<label>`) sem wrapper — JSX exige uma única expressão por branch.

**Correção:** Envolver os dois elementos em `<>...</>` (React Fragment).

### Gráfico de adesão semanal estático

**Sintoma:** Ao marcar itens como consumidos, o gráfico de barras da semana não atualizava.

**Três causas combinadas:**

1. **Side effect dentro de updater React** — `saveChecked` era chamado dentro de `setChecked(prev => ...)`. React Strict Mode em desenvolvimento invoca updaters duas vezes, causando escritas duplicadas ou fora de ordem. **Correção:** ler `checked` do closure, chamar `saveChecked` antes, depois `setChecked(next)`.

2. **`computeWeekAdherence` lia localStorage para todos os dias** — incluindo o dia atual, antes de a escrita ser refletida. **Correção:** usar o estado React para o dia ativo e o localStorage apenas para os outros.

3. **`height: X%` em container flex** — o percentual dependia de uma altura não determinística. **Correção:** `CHART_HEIGHT = 56` (px fixo) e `barH` calculado em JavaScript, com transição suave.

> Desde a Sprint 9, o gráfico usa os dados de adesão do backend em vez do localStorage.

### Login e signup falhando com credenciais corretas

**Causa:** extração de usuário/sessão exigia `dict`, mas o `supabase-py` retorna objetos Pydantic. **Correção:** aceitar os objetos retornados pelo SDK.

### Dados fictícios exibidos no lugar do perfil real

**Causas:** (1) qualquer falha em `/profile/me/details` caía no modo demo; (2) corrida em que a primeira requisição da página saía sem o header `Authorization`. **Correções:** tela de erro própria no Dashboard e aplicação síncrona do token no `AuthProvider`.

### Upload de imagem corrompido no navegador

**Causa:** o `Content-Type: application/json` padrão da instância Axios fazia o `FormData` ser serializado como JSON. **Correção:** remover o header na chamada de upload.

### 500 ao excluir ou editar plano já usado pelo paciente

**Causa:** violação de FK entre `meal_completions` e `meal_items`. **Correção:** limpar a adesão dos itens antes de apagá-los.

### Falso erro de CORS em produção

**Causa:** conexões derrubadas pelo Render antes de chegar ao FastAPI. **Correção:** retry automático de falhas de rede em `api.ts`.

---

## EVOLUÇÃO — Início vs. Estado atual

| Área | Início | Estado atual |
|---|---|---|
| **Autenticação** | Login/registro simples, sem renovação | JWT refresh automático com singleton promise, token aplicado sem corrida, retry de falha de rede |
| **Rotas** | ~5 rotas básicas | 23 rotas (19 protegidas via `RequireAuth`) |
| **Dashboard** | Cards estáticos por role | Badges de mensagens e notificações, banner de convites, avatar, card de lembretes, tela de erro própria |
| **Dieta do paciente** | Visualização estática | Checklist salvo no servidor por data real, gráfico de adesão, histórico de peso, receitas sugeridas, PDF |
| **Editor de plano** | Apenas visualização | Editor inline por dia + aplicar para todos os dias + criação a partir de presets |
| **Presets** | Nenhum | 5 modelos prontos + modelos próprios, duplicar e atribuir a paciente |
| **Busca de alimentos** | Campo de texto livre | Autocomplete TACO com 80+ alimentos brasileiros |
| **Mensagens** | Chat básico sem estado de leitura | Mark-as-read, badges, polling, notificações nativas, envio de imagens |
| **Notificações e lembretes** | Nenhum | Caixa de entrada, preferências com horário de silêncio, lembretes recorrentes |
| **Perfil** | Setup obrigatório apenas | Edição completa com upload de foto e dados de saúde por role |
| **Convites** | Vínculo direto e imediato | Convite com aceitar/recusar e notificação para os dois lados |
| **Acompanhamento do nutricionista** | Nenhum | Visão agregada com adesão de 7 dias e não lidas, ordenada por prioridade |
| **Backend** | ~8 endpoints básicos | 54 endpoints em 9 routers |
| **Testes** | Nenhum | 12 testes pytest (recorrência e presets) |
| **Deploy** | Apenas local | Backend no Render, frontend na Vercel |

---

## MAPA DE ARQUIVOS

```
frontend/src/
├── pages/
│   ├── Home.tsx                 # Landing page
│   ├── Login.tsx                # Email/senha + Google/Apple (callback pendente)
│   ├── Register.tsx             # Cadastro
│   ├── AuthCallback.tsx         # Callback do OAuth — ver Sprint 5
│   ├── ProfileSetup.tsx         # Configuração inicial de perfil
│   ├── ProfileEdit.tsx          # Edição de perfil + upload de foto
│   ├── Dashboard.tsx            # Hub principal, cards por role, badges, convites
│   ├── Patients.tsx             # Vínculos + visão agregada de pacientes
│   ├── DietPlans.tsx            # Abas Planos / Presets
│   ├── DietPlanCreate.tsx       # Criação de plano
│   ├── DietPlanDetail.tsx       # Detalhe + editor inline por dia
│   ├── DietPlanEdit.tsx         # Edição de metadados do plano
│   ├── DietPresetCreate.tsx     # Criação de preset
│   ├── DietPresetEdit.tsx       # Edição de preset
│   ├── MyDiet.tsx               # Checklist, adesão, peso, receitas (paciente)
│   ├── ShoppingList.tsx         # Lista de compras com share WhatsApp
│   ├── Messages.tsx             # Chat com imagens e notificações nativas
│   ├── Inbox.tsx                # Caixa de entrada de notificações
│   ├── NotificationSettings.tsx # Preferências de notificação
│   ├── Reminders.tsx            # Lembretes
│   ├── PatientPlanHistory.tsx   # Histórico de planos (paciente)
│   └── AdherencePrint.tsx       # Relatório PDF de adesão
├── components/
│   ├── Navbar.tsx / BackLink.tsx / ToggleSwitch.tsx
│   ├── FoodSearch.tsx           # Autocomplete TACO
│   ├── MealsEditor.tsx          # Editor de refeições (plano e preset)
│   ├── PresetsTab.tsx           # Aba de presets
│   ├── RecipeModal.tsx          # Receitas sugeridas
│   └── ReminderForm.tsx         # Formulário de lembrete
├── hooks/
│   ├── useUnreadMessages.ts     # Polling 30s de mensagens não lidas
│   └── useNotifications.ts      # Polling 30s de notificações não lidas
├── data/
│   ├── taco_foods.ts            # Base TACO local (~80 alimentos)
│   └── recipes.ts               # ~24 receitas
├── diet/ / notifications/ / reminders/   # Tipos e utilitários por domínio
├── config/env.ts                # VITE_API_URL
├── lib/
│   ├── api.ts                   # Axios + retry de rede + refresh JWT singleton
│   └── supabase.ts              # Cliente Supabase para login social
├── auth/                        # AuthProvider, storage, RequireAuth
├── profile/                     # ProfileProvider, useProfile, setupPrefill
└── routes/index.tsx             # Todas as rotas da aplicação

backend/
├── app/
│   ├── main.py                  # FastAPI app, CORS, 9 routers
│   ├── core/                    # config.py, supabase.py
│   ├── api/
│   │   ├── deps.py              # get_current_user
│   │   └── routes/              # auth, profile, care_link, diet, diet_preset,
│   │                            # message, reminder, notification, health
│   ├── services/
│   │   ├── profile_service.py       # Perfil, peso, avatar
│   │   ├── care_link_service.py     # Vínculos, convites, overview
│   │   ├── diet_service.py          # Planos, refeições, adesão
│   │   ├── preset_service.py        # Presets
│   │   ├── message_service.py       # Chat, anexos, não lidas
│   │   ├── reminder_service.py      # Lembretes
│   │   ├── notification_service.py  # Feed, lazy tick, preferências
│   │   ├── recurrence.py            # Próximo disparo de lembrete
│   │   └── image_utils.py           # Validação de imagem
│   └── schemas/                 # auth, profile, care_link, diet, preset,
│                                # message, reminder, notification
├── sql/                         # Scripts SQL aplicados manualmente
├── scripts/                     # Criação de buckets do Storage
└── tests/                       # pytest
```
