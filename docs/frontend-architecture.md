# Arquitetura do Frontend

## Visão geral

O frontend é uma aplicação React com Vite, hoje integrada de ponta a ponta com o backend. A estrutura separa autenticação, perfil, domínio de dieta, páginas e componentes reutilizáveis, e cobre os 14 fluxos principais do produto (landing, autenticação, dashboard por papel, gestão de pacientes, planos alimentares, dieta do paciente, lista de compras, mensagens e perfil).

A navegação é feita com React Router e os formulários com React Hook Form. O estado de sessão e de perfil é compartilhado via Context (`auth/`, `profile/`).

## Tecnologias utilizadas

- React 19
- TypeScript
- Vite
- React Router DOM v7
- React Hook Form
- Tailwind CSS
- Lucide React
- Axios
- Zod
- `@supabase/supabase-js` v2 (login social)

## Organização do projeto

```text
src/
├─ main.tsx
├─ App.tsx
├─ index.css
├─ routes/
│  └─ index.tsx                # todas as 14 rotas da aplicação
├─ auth/
│  ├─ AuthProvider.tsx / context.ts / useAuth.ts
│  ├─ storage.ts                # persistência da sessão (local/session storage)
│  ├─ types.ts
│  └─ RequireAuth.tsx           # guard de rotas protegidas (padrão <Outlet />)
├─ profile/
│  ├─ ProfileProvider.tsx / context.ts / useProfile.ts
│  ├─ setupPrefill.ts
│  └─ types.ts
├─ diet/
│  └─ types.ts                  # DietPlan, DietPlanDay, Meal, MealItem, CareLink
├─ lib/
│  ├─ api.ts                    # Axios + interceptor de refresh JWT (singleton promise)
│  └─ supabase.ts                # cliente Supabase para login social
├─ hooks/
│  └─ useUnreadMessages.ts       # polling 30s de mensagens não lidas
├─ data/
│  └─ taco_foods.ts              # base local TACO (~80 alimentos brasileiros)
├─ components/
│  ├─ Navbar.tsx
│  └─ FoodSearch.tsx             # autocomplete TACO com dropdown
└─ pages/
   ├─ Home.tsx                   # landing page
   ├─ Login.tsx                  # email/senha + Google (parcial) + Apple (placeholder)
   ├─ Register.tsx
   ├─ AuthCallback.tsx           # processa retorno do OAuth — ver limitações
   ├─ ProfileSetup.tsx
   ├─ ProfileEdit.tsx
   ├─ Dashboard.tsx              # hub principal, cards por papel, badges, convites
   ├─ Patients.tsx                # gestão de pacientes (nutricionista)
   ├─ DietPlans.tsx               # lista de planos (nutricionista)
   ├─ DietPlanCreate.tsx          # criação com autocomplete TACO
   ├─ DietPlanDetail.tsx          # detalhe + editor inline por dia
   ├─ DietPlanEdit.tsx            # edição de metadados do plano
   ├─ MyDiet.tsx                  # checklist, gráfico de adesão, peso, PDF (paciente)
   ├─ ShoppingList.tsx            # lista de compras com share WhatsApp
   ├─ Messages.tsx                # chat com notificações nativas
   ├─ PatientPlanHistory.tsx      # histórico de planos (paciente)
   └─ AdherencePrint.tsx          # relatório PDF de adesão
```

### Responsabilidades por camada

- `routes` centraliza as rotas e decide quais ficam atrás de `RequireAuth`
- `auth` e `profile` concentram o estado compartilhado de sessão e perfil via Context
- `diet` define os tipos do domínio central (planos, dias, refeições, itens)
- `pages` concentra as telas principais, uma por rota
- `components` reúne elementos reutilizáveis entre páginas
- `lib` centraliza a comunicação externa (API própria via Axios, e Supabase para login social)
- `hooks` e `data` guardam lógica/dado reaproveitável fora do ciclo de uma página específica

## Fluxo da aplicação

1. `main.tsx` monta a aplicação no DOM, envolvida por `AuthProvider` e `ProfileProvider`.
2. `App.tsx` renderiza `routes/index.tsx`.
3. Rotas públicas (`/`, `/login`, `/register`, `/auth/callback`) ficam fora do guard; as demais (`/app/*`, `/profile/*`) ficam dentro de `<RequireAuth />`.
4. Cada página chama `lib/api.ts` para falar com o backend; o interceptor de resposta renova o token automaticamente em 401, sem que a página precise tratar isso.
5. O login social (Google) sai do fluxo normal: a página `Login.tsx` chama `supabase.auth.signInWithOAuth` direto no Supabase (sem passar pelo backend), e o retorno é tratado em `AuthCallback.tsx` — etapa que hoje tem um bug conhecido (ver abaixo).

## Decisões técnicas relevantes

- Vite para reduzir custo de configuração e acelerar o desenvolvimento local.
- Estado de autenticação e perfil centralizado em Context (`auth/`, `profile/`) em vez de prop drilling entre páginas.
- Interceptor Axios com **singleton `refreshPromise`** evita que múltiplas requisições em 401 disparem vários refreshes em paralelo — só a primeira dispara, as demais aguardam o mesmo promise.
- Tailwind CSS para manter a UI consistente sem multiplicar arquivos de estilo.
- Dados de UI que não precisam de backend (checklist diário, lista de compras) ficam em `localStorage` por simplicidade — não sincronizam entre dispositivos.
- Login social via Supabase JS direto no cliente, sem rota própria no backend — mais simples, mas acopla o frontend à versão exata do SDK do Supabase (ver limitação abaixo).

## Banco de dados

Esta camada não possui banco de dados próprio. O frontend consome a API do backend (`lib/api.ts`) para todo o domínio de negócio, e o cliente Supabase (`lib/supabase.ts`) apenas para iniciar o login social — a sessão resultante é normalizada para o mesmo formato usado pelo restante da aplicação (`auth/types.ts`).

## Instruções de instalação

Dentro da pasta `frontend`:

```bash
npm install
```

## Instruções de execução

```bash
npm run dev       # desenvolvimento
npm run build     # build de produção
npm run lint      # qualidade de código
npm run preview   # pré-visualizar a build
```

## Evidências de testes

Não há testes automatizados. A validação é manual, cobrindo build, lint e os 14 fluxos de navegação. Detalhamento completo do que foi validado e do que está pendente em [`frontend-current-status.md`](frontend-current-status.md).

## Estado atual

O frontend está integrado de ponta a ponta com o backend para o domínio nutricional completo (dietas, perfil, mensagens, vínculos) e para login por email/senha. O login social (Google) inicia o redirecionamento real, mas o callback ainda não fecha a sessão — ver [`frontend-current-status.md`](frontend-current-status.md) para a causa exata.

## Próximo passo natural

Corrigir `AuthCallback.tsx` para usar a API correta do `supabase-js` v2 (`exchangeCodeForSession` ou `detectSessionInUrl` + `onAuthStateChange`) e, em seguida, iniciar testes automatizados para os fluxos críticos (login, criação de plano, checklist da dieta).
