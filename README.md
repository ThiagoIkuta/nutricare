# Projeto-Integrador - NutriCare

## Integrantes atuais
- João Vitor de Morais Alecrim
- Pedro Vinícius Rodrigues de Pereira Nunes
- Thiago Kenji Ikuta

## Antigos integrantes
- Eliza Freitas de Castro
- Guilherme Santana dos Santos

## Descrição
Este repositório reúne o desenvolvimento de uma plataforma de acompanhamento nutricional voltada para conectar nutricionistas e pacientes em um fluxo completo de gestão de perfil, dietas, mensagens, lembretes, notificações e acompanhamento de evolução clínica.

A proposta da aplicação é facilitar a rotina de ambos os lados do relacionamento: pacientes recebem orientação e organização alimentar de forma mais clara e prática, enquanto nutricionistas conseguem acompanhar histórico, definir planos alimentares e manter comunicação contínua com seus pacientes em um ambiente digital centralizado.

A solução foi estruturada em frontend e backend independentes, com autenticação real, rotas protegidas, gestão de usuários por papel e integração com Supabase para autenticação, banco de dados e armazenamento de dados. O projeto busca representar um MVP funcional de um sistema completo de nutrição digital, cobrindo desde cadastro e onboarding até gestão de dietas, vínculo profissional-paciente e relatórios de adesão.

## Visão geral da solução

### Frontend
- React + TypeScript + Vite
- Tailwind CSS
- React Router
- Axios com refresh automático de token e retry em falhas de rede
- Autenticação por email/senha; login social (Google/Apple) iniciado, com o callback ainda pendente
- Publicado na Vercel

### Backend
- Python + FastAPI
- Supabase Auth + Supabase DB + Supabase Storage (imagens)
- 54 endpoints em 9 routers organizados por domínio
- Gestão de perfis, vínculos, dietas, presets, adesão, mensagens, lembretes e notificações
- Testes automatizados com pytest
- Publicado no Render

## Funcionalidades implementadas

### Autenticação
- cadastro por email/senha
- login
- refresh de token
- validação de sessão autenticada
- perfil de usuário por papel (`patient` / `nutritionist`)

### Perfil
- setup inicial
- edição de dados cadastrais
- upload de foto de perfil
- histórico de peso
- dados específicos por tipo de usuário

### Vínculo nutricionista-paciente
- criação de vínculo direto
- convite para vínculo
- aceite e recusa de convite
- listagem de pacientes e vínculos
- visão agregada dos pacientes para o nutricionista (plano ativo, adesão dos últimos 7 dias, mensagens não lidas), ordenada por quem precisa de atenção primeiro

### Dietas
- criação e edição de planos alimentares, com busca de alimentos da Tabela TACO
- visualização de histórico
- planos ativos e anteriores
- edição por dia/semana
- presets (5 modelos prontos + modelos próprios), com duplicar e atribuir a paciente
- checklist da dieta salvo no servidor e gráfico de adesão
- sugestão de receitas por refeição
- lista de compras com compartilhamento via WhatsApp
- relatório de adesão em PDF

### Mensagens e comunicação
- chat entre nutricionista e paciente
- envio de imagens no chat
- marcação de mensagens como lidas
- contagem de mensagens não lidas
- notificação nativa do navegador

### Lembretes e notificações
- lembretes de refeição, água, medicação ou personalizados, criados pelo paciente ou pelo nutricionista
- recorrência por horários fixos ou por intervalo, com escolha dos dias da semana
- caixa de entrada de notificações (lembretes, convites, plano ativado, conversas com mensagens não lidas)
- preferências de notificação com horário de silêncio

## Estrutura do repositório

```text
Projeto-Integrador/
├─ backend/
│  ├─ app/
│  │  ├─ api/
│  │  │  ├─ routes/
│  │  │  └─ deps.py
│  │  ├─ core/
│  │  ├─ schemas/
│  │  ├─ services/
│  │  └─ main.py
│  ├─ tests/                 # testes pytest
│  ├─ sql/                   # scripts SQL aplicados manualmente no Supabase
│  ├─ scripts/               # criação dos buckets do Supabase Storage
│  ├─ .env.example
│  ├─ pytest.ini
│  ├─ requirements.txt
│  └─ README.md
├─ frontend/
│  ├─ src/
│  ├─ public/
│  ├─ .env.example
│  ├─ package.json
│  ├─ vite.config.ts
│  ├─ vercel.json
│  └─ README.md
├─ python_manipulation/      # script auxiliar para cadastrar usuários direto no Supabase
├─ docs/
│  ├─ backend-architecture.md
│  ├─ backend-current-status.md
│  ├─ frontend-architecture.md
│  ├─ frontend-current-status.md
│  ├─ business.md
│  └─ historico-implementacoes.md
├─ README.md
├─ pyrightconfig.json
└─ package-lock.json
```

## Como executar

### Frontend
```bash
cd frontend
npm install
cp .env.example .env        # preencha VITE_API_URL e as chaves do Supabase
npm run dev                 # http://localhost:5173
```

### Backend
```bash
cd backend
python -m venv .venv
source .venv/bin/activate   # Linux/macOS
# ou .venv\Scripts\activate  # Windows
pip install -r requirements.txt
cp .env.example .env        # preencha as chaves do Supabase e FRONTEND_URL
uvicorn app.main:app --reload   # Swagger em http://localhost:8000/docs
pytest                          # testes automatizados
```

Em um projeto Supabase novo, aplique os arquivos de `backend/sql/` no SQL Editor e rode os scripts de `backend/scripts/` para criar os buckets de imagens.

## Documentação técnica
A pasta `docs/` contém os principais registros de arquitetura e status do projeto:
- `backend-current-status.md`
- `frontend-current-status.md`
- `backend-architecture.md`
- `frontend-architecture.md`
- `business.md`
- `historico-implementacoes.md`

## Status atual
O projeto está em estágio funcional avançado e publicado (backend no Render, frontend na Vercel). Todo o domínio principal está implementado e validado manualmente, com os primeiros testes automatizados no backend. Os pontos pendentes são:
- conclusão do login social (Google/Apple)
- ampliação dos testes automatizados (backend) e início dos testes no frontend
- relatório de adesão em PDF usando os dados de adesão do servidor
- paginação em listagens de grande volume
- versionamento completo do schema do banco em `backend/sql/`

## Observações
- O login social redireciona para o Google/Apple, mas o retorno ao app ainda falha: `AuthCallback.tsx` usa `getSessionFromUrl()`, método que não existe no `supabase-js` v2. Detalhes em `docs/frontend-current-status.md`.
- Lembretes e notificações funcionam dentro do app (por polling), sem push ou e-mail.
- O backend usa o plano gratuito do Render, então a primeira requisição depois de um tempo parado pode demorar (cold start).

## Contribuições

### Membros atuais
- João Vitor de Morais Alecrim: desenvolvimento de telas do frontend
- Pedro Vinícius Rodrigues de Pereira Nunes: apoio em backend e documentação do GitHub
- Thiago Kenji Ikuta: apoio em backend e integração frontend/backend

### Antigos integrantes
- Eliza Freitas de Castro: telas Figma e implementação inicial do login social
- Guilherme Santana dos Santos: documentação do projeto e apoio inicial na organização do material do repositório

---

Projeto em desenvolvimento como parte do Projeto Integrador 4.
