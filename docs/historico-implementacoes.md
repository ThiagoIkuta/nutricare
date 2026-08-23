# NutriCare — Histórico Completo de Implementações

> Registro de tudo que foi construído no projeto, do zero ao estado atual, com detalhes de como cada feature foi implementada.

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

## SPRINT 5 (EM ANDAMENTO) — Login social com Google

### O que foi feito

`Login.tsx` ganhou um botão "Entrar com Google" que chama `supabase.auth.signInWithOAuth({ provider: "google", options: { redirectTo: ".../auth/callback" } })` usando um cliente Supabase próprio (`frontend/src/lib/supabase.ts`), configurado com `persistSession: false` e `detectSessionInUrl: false` (a aplicação gerencia a sessão sozinha via `auth/storage.ts`, não pelo Supabase). Uma nova rota pública `/auth/callback` (`AuthCallback.tsx`) recebe o retorno do Google, deveria extrair a sessão e convertê-la para o formato `AuthSession` já usado pelo resto do app, e então navegar para `/app`.

No backend, o commit que trouxe essa mudança (`cb0166c`) também endureceu a tipagem de `core/supabase.py` e `api/deps.py` (`TypedDict`/`Protocol` para usuário e sessão), sem criar nenhuma rota nova — o OAuth é resolvido inteiramente no frontend.

### Por que está "quase funcionando" (não 100%)

`AuthCallback.tsx` chama `supabase.auth.getSessionFromUrl()` para extrair a sessão da URL de retorno. Esse método existia no `@supabase/supabase-js` v1 e **foi removido na v2** — a versão instalada no projeto é `^2.108.2`. Como o cliente também desliga `detectSessionInUrl`, não há nenhum outro mecanismo automático capturando a sessão. Resultado: `getSessionFromUrl` é `undefined`, a chamada retorna `null`, e o callback sempre cai no branch de erro, mostrando "Falha ao processar callback de autenticação." e voltando para `/login` depois de 2 segundos.

Em resumo: o redirecionamento para o Google funciona (a tela de consentimento abre normalmente), mas a volta não fecha sessão nenhuma no app.

### Como destravar

Duas opções compatíveis com supabase-js v2:
1. Trocar `getSessionFromUrl()` por `await supabase.auth.exchangeCodeForSession(window.location.href)` (fluxo PKCE, recomendado pela própria Supabase para v2).
2. Ou habilitar `detectSessionInUrl: true` no cliente e capturar a sessão via `supabase.auth.onAuthStateChange`, sem precisar de uma função de extração manual.

Qualquer uma das duas exige ajustar `AuthCallback.tsx` para não depender de um método inexistente no SDK atual.

### Outros detalhes

- O botão "Entrar com Apple", ao lado do Google, existe só visualmente — não tem `onClick` nem qualquer integração.
- `frontend/.env.example` ganhou `VITE_SUPABASE_URL` (falta `VITE_SUPABASE_ANON_KEY`, que também é necessária para o cliente funcionar).

---

## BUGS CORRIGIDOS

### JSX parse error no `Patients.tsx`

**Erro:** `[plugin:vite:oxc] Expected ',' or ')' but found 'Identifier'` na linha 156.

**Causa:** O branch positivo de um ternário JSX retornava dois elementos adjacentes (`<div>` + `<label>`) sem wrapper — JSX exige uma única expressão por branch.

**Correção:** Envolver os dois elementos em `<>...</>` (React Fragment).

### Gráfico de adesão semanal estático

**Sintoma:** Ao marcar itens como consumidos, o gráfico de barras da semana não atualizava.

**Três causas combinadas:**

1. **Side effect dentro de updater React** — `saveChecked` era chamado dentro de `setChecked(prev => ...)`. React Strict Mode em desenvolvimento invoca updaters duas vezes para detectar side effects, causando escritas duplicadas ou fora de ordem. **Correção:** ler `checked` diretamente do closure, chamar `saveChecked` antes, depois `setChecked(next)`.

2. **`computeWeekAdherence` lia localStorage para todos os dias** — incluindo o dia atual. Como `saveChecked` e `setChecked` acontecem na mesma call stack, o render poderia ler o localStorage antes da escrita ser commitada pelo browser. **Correção:** a função aceita `currentDay` e `currentChecked` como parâmetros, usando o estado React para o dia ativo e o localStorage apenas para os outros.

3. **`height: X%` em container flex** — o percentual dependia da altura do flex container, que não era determinística na maioria dos casos. **Correção:** `CHART_HEIGHT = 56` (px fixo), `barH = Math.round((v / 100) * 56)` calculado em JavaScript, com `transition-all duration-300` para animação suave ao atualizar.

---

## EVOLUÇÃO — Início vs. Estado atual

| Área | Início | Estado atual |
|---|---|---|
| **Autenticação** | Login/registro simples, sem renovação | JWT refresh automático com singleton promise, sem race condition |
| **Rotas** | ~5 rotas básicas | 14 rotas, todas protegidas via `RequireAuth` |
| **Dashboard** | Cards estáticos por role | Badges de não lidas, banner de convites, avatar, cards específicos por role |
| **Dieta do paciente** | Visualização estática | Checklist reativo, gráfico de adesão, view semana/dia, histórico de peso, PDF |
| **Editor de plano** | Apenas visualização | Editor inline por dia + aplicar para todos os dias |
| **Busca de alimentos** | Campo de texto livre | Autocomplete TACO com 80+ alimentos brasileiros, auto-preenchimento de quantidade e unidade |
| **Mensagens** | Chat básico sem estado de leitura | Mark-as-read, badges, polling, notificações nativas do browser |
| **Perfil** | Setup obrigatório apenas | Edição completa com avatar, especialidade, dados de saúde por role |
| **Convites** | Vínculo direto e imediato | Fluxo de convite com aceitar/recusar no Dashboard |
| **Histórico** | Nenhum | Histórico de planos do paciente com status e nutricionista |
| **Backend** | ~8 endpoints básicos | 20+ endpoints, validações de role, enriquecimento entre tabelas |
| **Segurança API** | Token sem renovação | Interceptor Axios com singleton promise evita refreshes paralelos |

---

## MAPA DE ARQUIVOS

```
frontend/src/
├── pages/
│   ├── Home.tsx               # Landing page
│   ├── Login.tsx              # Autenticação (email/senha + Google parcial)
│   ├── Register.tsx           # Cadastro
│   ├── AuthCallback.tsx       # Callback do OAuth (Google) — ver Sprint 5
│   ├── ProfileSetup.tsx       # Configuração inicial de perfil
│   ├── ProfileEdit.tsx        # Edição de perfil + avatar
│   ├── Dashboard.tsx          # Hub principal, cards por role, badges, convites
│   ├── Patients.tsx           # Gestão de pacientes (nutricionista)
│   ├── DietPlans.tsx          # Lista de planos (nutricionista)
│   ├── DietPlanCreate.tsx     # Criação de plano com TACO autocomplete
│   ├── DietPlanDetail.tsx     # Detalhe + editor inline por dia
│   ├── DietPlanEdit.tsx       # Edição de metadados do plano
│   ├── MyDiet.tsx             # Checklist, gráfico, peso, PDF (paciente)
│   ├── ShoppingList.tsx       # Lista de compras com share WhatsApp
│   ├── Messages.tsx           # Chat com notificações nativas
│   ├── PatientPlanHistory.tsx # Histórico de planos (paciente)
│   └── AdherencePrint.tsx     # Relatório PDF de adesão
├── components/
│   ├── Navbar.tsx             # Barra de navegação da landing
│   └── FoodSearch.tsx         # Autocomplete TACO com dropdown
├── hooks/
│   └── useUnreadMessages.ts   # Polling 30s de mensagens não lidas
├── data/
│   └── taco_foods.ts          # Base TACO local (~80 alimentos)
├── lib/
│   ├── api.ts                 # Axios + interceptor JWT refresh singleton
│   └── supabase.ts            # Cliente Supabase para login social (Google)
├── auth/
│   ├── context.ts / useAuth.ts / storage.ts / types.ts
│   └── RequireAuth.tsx        # Guard de rotas protegidas
├── profile/
│   ├── context.ts / useProfile.ts / types.ts / setupPrefill.ts
└── routes/
    └── index.tsx              # Todas as rotas da aplicação

backend/app/
├── main.py                    # FastAPI app, CORS, routers
├── core/
│   ├── config.py              # Settings via env vars
│   └── supabase.py            # Clientes public (anon) e admin (service_role)
├── api/
│   ├── deps.py                # get_current_user (verifica JWT via Supabase)
│   └── routes/
│       ├── auth.py            # signup / login / refresh / me
│       ├── profile.py         # setup / me / details / weight history
│       ├── care_link.py       # links / patients / invitations / accept / reject
│       ├── diet.py            # plans CRUD / my-plan / my-plans / day meals
│       ├── message.py         # links / messages / send / read / unread-counts
│       └── health.py          # GET /health
├── services/
│   ├── profile_service.py     # Lógica de perfil + histórico de peso
│   ├── care_link_service.py   # Vínculos + convites
│   ├── diet_service.py        # Planos + dias + refeições + itens
│   └── message_service.py     # Chat + mark-read + unread counts
└── schemas/
    ├── auth.py / profile.py / care_link.py / diet.py / message.py
```
