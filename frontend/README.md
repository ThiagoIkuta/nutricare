# Frontend - NutriCare

Aplicação web do projeto NutriCare, desenvolvida em React + TypeScript com Vite.

## Visão geral
O frontend fornece a interface principal para:
- autenticação de usuários
- onboarding e edição de perfil (com upload de foto)
- navegação por papéis (`nutritionist` e `patient`)
- criação e edição de planos alimentares e presets
- gestão de pacientes e vínculos, com visão agregada de adesão
- dieta do paciente com checklist, adesão, receitas e lista de compras
- livro de receitas (públicas e privadas, salvar, PDF, compartilhar no chat)
- mensagens (texto, imagem e receita), lembretes e notificações
- relatório de adesão em PDF

## Stack
- React 19
- TypeScript
- Vite
- Tailwind CSS
- React Router DOM v7
- React Hook Form + Zod
- Axios
- Lucide React
- Supabase client (login social)

## Estrutura principal

```text
frontend/
├─ public/
├─ src/
│  ├─ auth/            # sessão, AuthProvider, RequireAuth
│  ├─ components/      # BackLink, ToggleSwitch, FoodSearch, MealsEditor, PresetsTab, ReminderForm, Navbar, componentes de receita
│  ├─ config/          # env.ts (VITE_API_URL)
│  ├─ data/            # base TACO local
│  ├─ diet/            # tipos de dieta, presets e adesão
│  ├─ hooks/           # polling de mensagens e notificações não lidas
│  ├─ lib/             # api.ts (Axios) e supabase.ts
│  ├─ notifications/   # tipos de notificações e lembretes
│  ├─ pages/           # uma página por rota
│  ├─ profile/         # ProfileProvider, useProfile
│  ├─ recipes/         # tipos de receita, macros, recomendação e busca
│  ├─ reminders/       # estado do formulário e formatação PT-BR
│  ├─ routes/          # todas as rotas
│  ├─ App.tsx
│  ├─ index.css
│  └─ main.tsx
├─ .env.example
├─ eslint.config.js
├─ index.html
├─ package.json
├─ tailwind.config.js
├─ vite.config.ts
├─ vercel.json         # rewrite de SPA para a Vercel
└─ README.md
```

## Rotas principais

### Públicas
- `/` — landing page
- `/login`, `/register` — usuário já logado é redirecionado para `/app`
- `/auth/callback` — retorno do login social

### Protegidas
- `/app` — dashboard por papel
- `/profile/setup`, `/profile/edit`
- `/app/pacientes` — vínculos e visão agregada dos pacientes (nutricionista)
- `/app/dietas` — abas Planos e Presets (nutricionista)
- `/app/dietas/nova`, `/app/dietas/:id`, `/app/dietas/:id/editar`
- `/app/dietas/presets/novo`, `/app/dietas/presets/:id/editar`
- `/app/minha-dieta` — checklist, adesão, peso e receitas sugeridas (paciente)
- `/app/lista-de-compras`
- `/app/meus-planos`
- `/app/relatorio-adesao`
- `/app/mensagens`
- `/app/notificacoes`, `/app/notificacoes/preferencias`
- `/app/lembretes`
- `/app/receitas` — livro de receitas (Todas / Minhas / Salvas / Públicas)
- `/app/receitas/nova`, `/app/receitas/:id`, `/app/receitas/:id/editar`
- `/app/receitas/:id/imprimir` — receita para impressão / PDF

## Como rodar

```bash
cd frontend
npm install
npm run dev       # http://localhost:5173
npm run build     # build de produção
npm run lint
npm run preview
```

## Variáveis de ambiente
Crie um arquivo `.env` com base em `.env.example`:

```env
VITE_API_URL=http://localhost:8000/api/v1
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
```

Sem `VITE_API_URL`, o app usa `http://127.0.0.1:8000/api/v1`. Sem as variáveis do Supabase, o app funciona normalmente, só o login social fica desativado.

## Funcionalidades atuais
- autenticação por email/senha, com refresh automático de token e retry em falhas de rede
- setup e edição de perfil, com upload de foto
- dashboard por papel, com badges de mensagens e notificações não lidas e convites pendentes
- pacientes ativos ordenados por quem precisa de atenção (sem plano, menor adesão)
- criação e edição de planos alimentares (busca TACO, edição por dia)
- presets: 5 modelos prontos + modelos próprios, com duplicar e atribuir a paciente
- checklist da dieta salvo no servidor e gráfico de adesão semanal
- livro de receitas: criar, editar e excluir receitas públicas ou privadas, salvar receitas públicas de outros, exportar PDF
- sugestão de receitas por refeição a partir das receitas próprias, salvas e públicas
- histórico de peso e histórico de planos
- lista de compras com compartilhamento via WhatsApp
- chat com envio de imagens e de receitas (box com "Aceitar e salvar") e notificação nativa do navegador
- caixa de entrada de notificações, preferências e lembretes
- relatório de adesão em PDF

## Observações importantes
- **Login social incompleto:** os botões do Google e da Apple redirecionam para o provedor, mas `AuthCallback.tsx` usa `getSessionFromUrl()`, que não existe no `supabase-js` v2. Por isso o retorno sempre falha e volta para `/login`.
- A lista de compras fica no `localStorage` e não sincroniza entre dispositivos.
- `firebase` e `@react-oauth/google` estão no `package.json`, mas não são usados.

## Status
O frontend cobre todos os fluxos do MVP e está publicado na Vercel. Faltam:
- fechamento do login social
- testes automatizados
- paginação/virtualização de listas

---

Consulte também `docs/frontend-current-status.md` e `docs/frontend-architecture.md`.
