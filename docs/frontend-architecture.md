# Arquitetura do Frontend

## Visão geral

O frontend é uma aplicação React com Vite, integrada de ponta a ponta com o backend. A estrutura separa autenticação, perfil, domínios (dieta, notificações, lembretes), páginas e componentes reutilizáveis, e cobre **23 rotas** (4 públicas e 19 protegidas): landing, autenticação, dashboard por papel, gestão de pacientes, planos alimentares e presets, dieta do paciente, lista de compras, mensagens, notificações, lembretes e perfil.

A navegação é feita com React Router e os formulários com React Hook Form. O estado de sessão e de perfil é compartilhado via Context (`auth/`, `profile/`).

## Tecnologias utilizadas

- React 19
- TypeScript
- Vite
- React Router DOM v7
- React Hook Form + Zod
- Tailwind CSS
- Lucide React
- Axios
- `@supabase/supabase-js` v2 (login social)

> `package.json` ainda lista `firebase` e `@react-oauth/google`, que não são usados no código atual.

## Organização do projeto

```text
src/
├─ main.tsx
├─ App.tsx
├─ index.css
├─ config/
│  └─ env.ts                     # VITE_API_URL (fallback http://127.0.0.1:8000/api/v1)
├─ routes/
│  └─ index.tsx                  # todas as 23 rotas da aplicação
├─ auth/
│  ├─ AuthProvider.tsx / context.ts / useAuth.ts
│  ├─ storage.ts                 # persistência da sessão (local/session storage)
│  ├─ types.ts
│  └─ RequireAuth.tsx            # guard de rotas protegidas (padrão <Outlet />)
├─ profile/
│  ├─ ProfileProvider.tsx / context.ts / useProfile.ts
│  ├─ setupPrefill.ts
│  └─ types.ts
├─ diet/
│  └─ types.ts                   # DietPlan, Meal, MealItem, CareLink, presets, adesão
├─ notifications/
│  └─ types.ts                   # notificações, preferências, lembretes
├─ reminders/
│  ├─ form-state.ts              # estado/validação do formulário de lembrete
│  ├─ format.ts                  # rótulos PT-BR (categorias, dias, intervalo em min/h)
│  └─ icons.tsx
├─ lib/
│  ├─ api.ts                     # Axios + retry de falha de rede + refresh JWT (singleton promise)
│  └─ supabase.ts                # cliente Supabase para login social
├─ hooks/
│  ├─ useUnreadMessages.ts       # polling 30s de mensagens não lidas
│  └─ useNotifications.ts        # polling 30s de notificações não lidas
├─ data/
│  ├─ taco_foods.ts              # base local TACO (~80 alimentos brasileiros)
│  └─ recipes.ts                 # ~24 receitas brasileiras ligadas à base TACO
├─ assets/                       # logo, imagem do hero
├─ components/
│  ├─ Navbar.tsx                 # navbar pública (Home, Login, Register)
│  ├─ BackLink.tsx               # link "voltar" padronizado
│  ├─ ToggleSwitch.tsx           # switch reutilizável
│  ├─ FoodSearch.tsx             # autocomplete TACO com dropdown
│  ├─ MealsEditor.tsx            # editor de refeições (plano e preset)
│  ├─ PresetsTab.tsx             # aba de presets em Planos Alimentares
│  ├─ RecipeModal.tsx            # receitas sugeridas por refeição
│  └─ ReminderForm.tsx           # formulário de lembrete
└─ pages/
   ├─ Home.tsx                   # landing page
   ├─ Login.tsx / Register.tsx   # email/senha + Google/Apple (callback quebrado)
   ├─ AuthCallback.tsx           # retorno do OAuth — ver limitações
   ├─ ProfileSetup.tsx / ProfileEdit.tsx   # onboarding e edição (upload de foto)
   ├─ Dashboard.tsx              # hub, cards por papel, badges, convites
   ├─ Patients.tsx               # visão agregada dos pacientes (nutricionista)
   ├─ DietPlans.tsx              # abas "Planos" e "Presets"
   ├─ DietPlanCreate.tsx / DietPlanDetail.tsx / DietPlanEdit.tsx
   ├─ DietPresetCreate.tsx / DietPresetEdit.tsx
   ├─ MyDiet.tsx                 # checklist com adesão real, gráfico, peso, receitas (paciente)
   ├─ ShoppingList.tsx           # lista de compras com share WhatsApp
   ├─ Messages.tsx               # chat com imagens e notificações nativas
   ├─ Inbox.tsx                  # caixa de entrada de notificações
   ├─ NotificationSettings.tsx   # preferências de notificação
   ├─ Reminders.tsx              # lembretes (paciente e nutricionista)
   ├─ PatientPlanHistory.tsx     # histórico de planos (paciente)
   └─ AdherencePrint.tsx         # relatório PDF de adesão
```

### Responsabilidades por camada

- `routes` centraliza as rotas e decide quais ficam atrás de `RequireAuth`
- `auth` e `profile` concentram o estado compartilhado de sessão e perfil via Context
- `diet`, `notifications` e `reminders` definem tipos e utilitários de cada domínio
- `pages` concentra as telas principais, uma por rota
- `components` reúne elementos reutilizáveis entre páginas (inclusive editores inteiros, como `MealsEditor`, compartilhado entre plano e preset)
- `lib` e `config` centralizam a comunicação externa (API própria via Axios, Supabase para login social)
- `hooks` e `data` guardam lógica/dado reaproveitável fora do ciclo de uma página

## Fluxo da aplicação

1. `main.tsx` monta a aplicação no DOM, envolvida por `AuthProvider` e `ProfileProvider`.
2. `AuthProvider` lê a sessão salva e aplica o token no Axios **dentro do inicializador de estado** (síncrono), antes de qualquer efeito das páginas filhas — evita a primeira requisição sair sem `Authorization`.
3. `App.tsx` renderiza `routes/index.tsx`.
4. Rotas públicas (`/`, `/login`, `/register`, `/auth/callback`) ficam fora do guard; as demais (`/app/*`, `/profile/*`) ficam dentro de `<RequireAuth />`. Usuário já logado que abre `/login` ou `/register` é redirecionado para `/app`.
5. Cada página chama `lib/api.ts`. O interceptor de resposta (a) repete até 2 vezes, com backoff curto, requisições que falharam sem resposta do servidor e (b) renova o token automaticamente em 401.
6. O login social sai do fluxo normal: `Login.tsx` chama `supabase.auth.signInWithOAuth` direto no Supabase e o retorno é tratado em `AuthCallback.tsx` — etapa com bug conhecido (ver [`frontend-current-status.md`](frontend-current-status.md)).

## Decisões técnicas relevantes

- Vite para reduzir custo de configuração e acelerar o desenvolvimento local.
- Estado de autenticação e perfil em Context (`auth/`, `profile/`) em vez de prop drilling.
- Interceptor Axios com **singleton `refreshPromise`**: só a primeira requisição em 401 dispara o refresh, as demais aguardam o mesmo promise.
- **Retry de falha de rede**: sem resposta nenhuma, o servidor não processou a requisição, então repetir é seguro. Mitiga conexões derrubadas pelo plano gratuito do Render.
- **Uploads com `FormData`**: o header `Content-Type: application/json` padrão do Axios é removido por chamada, senão o arquivo é serializado como JSON.
- **Atualização otimista** no checklist de `MyDiet.tsx`: o item é marcado na hora e revertido, com mensagem de erro visível, se a API falhar.
- **Polling** em vez de WebSocket: chat a cada 5s, contadores de mensagens e notificações a cada 30s.
- **Dados locais sem backend**: base TACO e receitas são arquivos TypeScript no próprio frontend (sem IA, sem custo); a sugestão de receitas é por sobreposição de palavras-chave entre ingredientes da receita e itens da refeição.
- **Lista de compras em `localStorage`** por simplicidade (não sincroniza entre dispositivos). O checklist da dieta, que também era local, migrou para o backend em 01/09/2026.
- **Identidade visual**: laranja como cor primária, logo aplicado em navbar, login, cadastro, dashboard e favicon; navegação de volta padronizada em `BackLink`.
- **Modo demonstração**: telas como Dashboard e MyDiet exibem dados fictícios quando não há perfil/plano; erro real de rede/perfil tem tela própria com "tentar novamente" em vez de cair no modo demo.
- Login social via Supabase JS no cliente, sem rota no backend — mais simples, mas acopla o frontend à versão do SDK.

## Banco de dados

O frontend não tem banco próprio. Consome a API do backend (`lib/api.ts`) para todo o domínio de negócio e o cliente Supabase (`lib/supabase.ts`) apenas para iniciar o login social. `localStorage` guarda a sessão (quando "lembrar-me"), a lista de compras e dados legados do checklist antigo.

## Instruções de instalação

Dentro da pasta `frontend`:

```bash
npm install
```

Copie `.env.example` para `.env` e preencha `VITE_API_URL`, `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY`.

## Instruções de execução

```bash
npm run dev       # desenvolvimento (http://localhost:5173)
npm run build     # build de produção
npm run lint      # qualidade de código
npm run preview   # pré-visualizar a build
```

Em produção, o frontend é publicado na Vercel; `vercel.json` faz o rewrite de SPA para o React Router funcionar ao recarregar qualquer rota.

## Evidências de testes

Não há testes automatizados no frontend. A validação é manual (build, lint e navegação pelas 23 rotas), e as features mais recentes (upload de imagem, receitas, dashboard agregado, persistência do checklist após F5) foram verificadas no navegador com Playwright durante o desenvolvimento. Detalhes em [`frontend-current-status.md`](frontend-current-status.md).

## Estado atual

O frontend está integrado de ponta a ponta com o backend para todo o domínio nutricional, comunicação, lembretes e notificações, com login por email/senha. O login social inicia o redirecionamento, mas o callback ainda não fecha a sessão.

## Próximo passo natural

Corrigir `AuthCallback.tsx` para usar a API do `supabase-js` v2, fazer o relatório de adesão (`AdherencePrint.tsx`) ler a adesão real do backend e iniciar testes automatizados dos fluxos críticos (login, criação de plano, checklist da dieta).
