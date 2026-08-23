# Status Atual do Frontend

## Resumo do estágio atual

O frontend deixou de ser um protótipo de telas públicas e hoje é uma aplicação integrada de ponta a ponta com o backend: autenticação real com refresh automático de token, fluxo completo do nutricionista (pacientes, planos, edição por dia) e do paciente (dieta, lista de compras, histórico, relatório em PDF), além de mensagens com notificações nativas do navegador.

A aplicação tem **14 rotas** (`frontend/src/routes/index.tsx`), das quais 10 ficam atrás do guard `RequireAuth`.

## O que já foi implementado

### Estrutura da aplicação
- Vite + React 19 + TypeScript + Tailwind
- React Router DOM v7, com rotas protegidas via `<RequireAuth />` (padrão `<Outlet />`)
- Axios centralizado em `lib/api.ts`, com interceptor de resposta que renova o JWT automaticamente em 401 (padrão singleton `refreshPromise`, evita múltiplos refreshes em paralelo)

### Telas públicas
- `/` — landing page (hero, funcionalidades, planos de preço)
- `/login`, `/register` — autenticação por email/senha
- `/auth/callback` — callback do login social (ver limitações abaixo)

### Telas autenticadas — Nutricionista
- `/app/pacientes` — gestão de vínculos, vincular paciente (direto ou via convite)
- `/app/dietas`, `/app/dietas/nova`, `/app/dietas/:id`, `/app/dietas/:id/editar` — listagem, criação (com autocomplete TACO), detalhe com editor inline por dia, edição de metadados

### Telas autenticadas — Paciente
- `/app/minha-dieta` — checklist diário reativo, gráfico de adesão semanal, histórico de peso, exportação de PDF
- `/app/lista-de-compras` — gerada a partir do plano ativo, com toggle dia/semana, itens manuais e compartilhamento via WhatsApp
- `/app/meus-planos` — histórico de planos (ativo + anteriores)
- `/app/relatorio-adesao` — relatório de adesão em PDF (`window.print()`)

### Telas comuns
- `/app` — Dashboard com cards por papel, badge de mensagens não lidas, banner de convites pendentes
- `/profile/setup`, `/profile/edit` — onboarding inicial e edição completa de perfil (avatar por URL, dados de saúde por papel)
- `/app/mensagens` — chat por polling (5s), com indicador de lida e notificação nativa do navegador quando a aba está em segundo plano

### Login social (Google) — parcialmente funcional
- O botão "Entrar com Google" em `Login.tsx` dispara `supabase.auth.signInWithOAuth({ provider: "google" })` de verdade e redireciona para a tela de consentimento do Google.
- O retorno cai em `/auth/callback` (`AuthCallback.tsx`), que tenta extrair a sessão via `supabase.auth.getSessionFromUrl()`.
- **Esse método não existe no `@supabase/supabase-js` v2** (era da v1) — então a chamada sempre cai no branch de erro, mostra "Falha ao processar callback de autenticação." e redireciona de volta para `/login` após 2 segundos.
- O botão "Entrar com Apple", ao lado, existe só visualmente — não tem nenhum handler.

## O que já foi testado com sucesso

Validado manualmente: build (`npm run build`) e dev server, navegação entre todas as 14 rotas, fluxo de cadastro/login/logout por email-senha, criação e edição de plano alimentar (incluindo edição por dia e "aplicar para todos os dias"), checklist da dieta com persistência em localStorage, geração e compartilhamento da lista de compras, envio/leitura de mensagens com notificação nativa, edição de perfil com preview de avatar, exportação do relatório de adesão em PDF.

O clique no botão "Entrar com Google" foi validado até o redirecionamento para o Google — o retorno (criação de sessão) ainda não funciona (ver limitações).

## O que ainda não foi implementado

- conclusão do login social (Google e qualquer outro provider)
- testes automatizados (unitários ou E2E) — toda validação é manual
- upload real de imagem de avatar (hoje é só campo de URL)
- paginação ou virtualização em listas que podem crescer (planos, pacientes, mensagens)
- tratamento de erro mais granular nas chamadas de API (a maioria usa `getApiErrorMessage` genérico)

## Limites da implementação atual

- O fluxo de login social não fecha sessão real — é a lacuna mais visível hoje, e está documentada com a causa exata na seção acima para facilitar a correção.
- Não há testes automatizados, então qualquer regressão de UI só é percebida manualmente.
- Alguns dados (checklist da dieta, lista de compras) são persistidos em `localStorage` por dispositivo, não sincronizados entre dispositivos do mesmo usuário.

## Próximo passo natural

1. Corrigir `AuthCallback.tsx`: substituir `getSessionFromUrl()` por `supabase.auth.exchangeCodeForSession(window.location.href)` (fluxo PKCE da v2) ou habilitar `detectSessionInUrl: true` no cliente e ouvir `onAuthStateChange`.
2. Decidir se o botão "Entrar com Apple" deve ser implementado ou removido enquanto não há provider configurado.
3. Começar testes automatizados, priorizando os fluxos críticos (login, criação de plano, checklist da dieta).

## Estado do projeto em uma frase

O frontend está integrado de ponta a ponta com o backend para login por email/senha e para todo o domínio nutricional (planos, dieta, mensagens, perfil), faltando principalmente fechar o login social e adicionar testes automatizados.
