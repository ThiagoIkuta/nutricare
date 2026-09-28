# Status Atual do Frontend

> Última atualização: 28/09/2026

## Resumo do estágio atual

O frontend é uma aplicação integrada de ponta a ponta com o backend. Além dos fluxos do MVP (autenticação, pacientes, planos, dieta, lista de compras, mensagens, perfil), ganhou entre agosto e setembro de 2026: **caixa de entrada de notificações, preferências e lembretes**, **presets de planos alimentares**, **envio de imagens no chat e upload de foto de perfil**, **sugestão de receitas**, **checklist da dieta persistido no backend** e **visão agregada de pacientes** para o nutricionista. Também recebeu identidade visual própria (logo) e está publicado na Vercel.

A aplicação tem **23 rotas** (`frontend/src/routes/index.tsx`), das quais 19 ficam atrás do guard `RequireAuth`.

## O que já foi implementado

### Estrutura da aplicação
- Vite + React 19 + TypeScript + Tailwind
- React Router DOM v7, com rotas protegidas via `<RequireAuth />`; usuário logado que abre `/login` ou `/register` vai direto para `/app`
- Axios centralizado em `lib/api.ts`: retry automático (até 2x) em falhas de rede e refresh do JWT em 401 com singleton `refreshPromise`
- Token aplicado de forma síncrona no `AuthProvider` (corrige a corrida em que a primeira chamada de uma página saía sem `Authorization` e caía em modo demo)
- Componentes reutilizáveis: `BackLink`, `ToggleSwitch`, `MealsEditor`, `FoodSearch`, `RecipeModal`, `ReminderForm`, `PresetsTab`
- Identidade visual: logo na navbar, login, cadastro, dashboard e favicon; laranja como cor primária

### Telas públicas
- `/` — landing page (hero, funcionalidades, planos de preço)
- `/login`, `/register` — autenticação por email/senha, com navbar pública
- `/auth/callback` — callback do login social (ver limitações)

### Telas autenticadas — Nutricionista
- `/app/pacientes` — vínculos (direto ou via convite) e **visão agregada dos pacientes ativos**, ordenada por quem precisa de atenção primeiro (sem plano, depois menor adesão), com badge de adesão dos últimos 7 dias e contador de mensagens não lidas
- `/app/dietas` — abas **Planos** e **Presets**
- `/app/dietas/nova`, `/app/dietas/:id`, `/app/dietas/:id/editar` — criação (autocomplete TACO), detalhe com editor inline por dia, edição de metadados
- `/app/dietas/presets/novo`, `/app/dietas/presets/:id/editar` — criação/edição de presets; na aba de presets é possível duplicar, excluir e atribuir um preset a um paciente
- `/app/lembretes` — lembretes dos pacientes vinculados

### Telas autenticadas — Paciente
- `/app/minha-dieta` — checklist diário salvo no backend por data real (atualização otimista, erro visível se falhar), gráfico de adesão semanal com dados do servidor, histórico de peso e botão **"Ver receitas"** em cada refeição
- `/app/lista-de-compras` — gerada a partir do plano ativo, toggle dia/semana, itens manuais, compartilhamento via WhatsApp
- `/app/meus-planos` — histórico de planos (ativo + anteriores)
- `/app/relatorio-adesao` — relatório de adesão em PDF (`window.print()`) — ver limitações
- `/app/lembretes` — lembretes próprios (refeição, água, medicação, outro), por horários fixos ou intervalo, com dias da semana e switch de ativo/inativo

### Telas comuns
- `/app` — Dashboard com cards por papel (incluindo Lembretes), badges de mensagens e de notificações não lidas, banner de convites pendentes; erro ao carregar perfil tem tela própria com "tentar novamente"
- `/profile/setup`, `/profile/edit` — onboarding e edição completa de perfil, com **upload real de foto**
- `/app/mensagens` — chat por polling (5s), com **envio de imagens** (validação no cliente, preview na bolha), indicador de lida e notificação nativa do navegador com a aba em segundo plano
- `/app/notificacoes` — caixa de entrada (lembretes, avisos de convite/plano, resumos de conversas), marcar como lida / marcar todas
- `/app/notificacoes/preferencias` — liga/desliga categorias e define horário de silêncio

### Login social (Google / Apple) — parcialmente funcional
- Os botões "Entrar com Google" e "Entrar com Apple" em `Login.tsx` chamam `supabase.auth.signInWithOAuth` e redirecionam para o provedor (Apple depende de o provider estar configurado no Supabase).
- O retorno cai em `/auth/callback` (`AuthCallback.tsx`), que tenta extrair a sessão via `supabase.auth.getSessionFromUrl()`.
- **Esse método não existe no `@supabase/supabase-js` v2** (era da v1), e o cliente está com `detectSessionInUrl: false`. A chamada sempre cai no branch de erro, mostra "Falha ao processar callback de autenticação." e volta para `/login` após 2 segundos.
- O commit `0161d0c` ("botão de login com google 100% funcional") alterou apenas o `.env.example` — o código do callback continua o mesmo.

## O que já foi testado com sucesso

Validado manualmente: build e dev server, navegação pelas 23 rotas, cadastro/login/logout por email-senha, criação e edição de plano (incluindo edição por dia e "aplicar para todos os dias"), presets (criar, editar, duplicar, atribuir), checklist da dieta persistindo após F5, gráfico de adesão, lista de compras, mensagens com imagem, notificações, preferências e lembretes, edição de perfil com upload de foto.

Verificado com Playwright no navegador: upload de imagem no chat, matching de receitas nas refeições de exemplo, dashboard agregado e persistência do checklist.

## O que ainda não foi implementado

- conclusão do login social (Google e Apple)
- testes automatizados (unitários ou E2E)
- paginação ou virtualização em listas que podem crescer (planos, pacientes, mensagens, notificações)
- sincronização da lista de compras entre dispositivos (ainda em `localStorage`)
- notificações push reais (hoje as notificações só aparecem com o app aberto, via polling)

## Limites da implementação atual

- **Login social não fecha sessão** — lacuna mais visível; causa exata descrita acima.
- **Relatório de adesão desatualizado:** `AdherencePrint.tsx` ainda calcula a adesão a partir do `localStorage` do checklist antigo, enquanto `MyDiet.tsx` já usa `GET /diet/my-plan/adherence`. O PDF pode mostrar 0% (ou dados antigos) mesmo com o paciente marcando os itens.
- **Instabilidade do backend no plano gratuito do Render** (cold start, conexões derrubadas). O retry automático reduz o problema, mas a primeira carga ainda pode ser lenta.
- Sem testes automatizados, regressões de UI só são percebidas manualmente.
- Dependências não usadas em `package.json` (`firebase`, `@react-oauth/google`).

## Próximo passo natural

1. Corrigir `AuthCallback.tsx`: usar `supabase.auth.exchangeCodeForSession(window.location.href)` (fluxo PKCE da v2) ou habilitar `detectSessionInUrl: true` e ouvir `onAuthStateChange`.
2. Fazer `AdherencePrint.tsx` usar `GET /diet/my-plan/adherence`, como `MyDiet.tsx`.
3. Começar testes automatizados pelos fluxos críticos (login, criação de plano, checklist da dieta).
4. Remover dependências não usadas.

## Estado do projeto em uma frase

O frontend cobre todos os fluxos do MVP e mais (notificações, lembretes, presets, imagens, receitas, adesão real e visão agregada do nutricionista), publicado na Vercel, faltando principalmente fechar o login social, alinhar o relatório de adesão ao backend e adicionar testes automatizados.
