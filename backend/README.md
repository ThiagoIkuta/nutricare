# Nutri Backend

Backend da plataforma de acompanhamento nutricional NutriCare.

## Visão geral
Este backend é responsável por:
- autenticação de usuários via Supabase Auth
- validação de sessão e token no servidor
- perfil base e perfil específico por papel (`patient` ou `nutritionist`), incluindo foto e histórico de peso
- vínculos nutricionista-paciente, com convites e visão agregada dos pacientes
- planos alimentares, presets de planos e registro de adesão (itens consumidos por data)
- mensagens de texto e imagem entre nutricionista e paciente
- lembretes recorrentes, notificações e preferências de notificação

## Stack
- Python
- FastAPI + Uvicorn
- Pydantic / pydantic-settings
- Supabase (Auth, Postgres e Storage)
- pytest

## Estrutura do projeto

```text
backend/
├─ app/
│  ├─ api/
│  │  ├─ routes/
│  │  │  ├─ auth.py
│  │  │  ├─ care_link.py
│  │  │  ├─ diet.py
│  │  │  ├─ diet_preset.py
│  │  │  ├─ health.py
│  │  │  ├─ message.py
│  │  │  ├─ notification.py
│  │  │  ├─ profile.py
│  │  │  └─ reminder.py
│  │  └─ deps.py              # get_current_user (valida o JWT)
│  ├─ core/
│  │  ├─ config.py
│  │  └─ supabase.py          # clientes anon (Auth) e service role (dados)
│  ├─ schemas/                # contratos de entrada/saída por domínio
│  ├─ services/               # regras de negócio (+ recurrence.py e image_utils.py)
│  └─ main.py
├─ sql/                       # scripts SQL aplicados manualmente no Supabase
├─ scripts/                   # criação dos buckets do Supabase Storage
├─ tests/                     # testes pytest
├─ .env.example
├─ pytest.ini
├─ requirements.txt
└─ README.md
```

## Endpoints

Todos sob o prefixo `/api/v1` — 54 endpoints no total. A documentação interativa fica em `/docs` (Swagger).

| Domínio | Endpoints |
|---|---|
| Auth | `POST /auth/signup`, `POST /auth/login`, `POST /auth/refresh`, `GET /auth/me` |
| Perfil | `POST /profile/setup`, `GET /profile/me`, `GET /profile/me/details`, `PATCH /profile/me`, `POST /profile/me/avatar`, `GET /profile/weight-history`, `POST /profile/weight-entry`, `DELETE /profile/weight-entry/{date}` |
| Vínculos | `POST /care/links`, `GET /care/links`, `GET /care/invitations`, `POST /care/links/{id}/accept`, `POST /care/links/{id}/reject`, `GET /care/patients`, `GET /care/patients/overview` |
| Dietas | `POST /diet/plans`, `GET /diet/plans`, `GET /diet/plans/{id}`, `PATCH /diet/plans/{id}`, `DELETE /diet/plans/{id}`, `PUT /diet/plans/{id}/days/{day}/meals`, `PUT /diet/plans/{id}/meals`, `GET /diet/my-plan`, `GET /diet/my-plans`, `POST /diet/meal-items/{id}/toggle`, `GET /diet/my-plan/adherence` |
| Presets | `GET /diet/presets`, `POST /diet/presets`, `GET /diet/presets/{id}`, `PATCH /diet/presets/{id}`, `DELETE /diet/presets/{id}`, `POST /diet/presets/{id}/duplicate`, `POST /diet/presets/{id}/assign` |
| Mensagens | `GET /messages/links`, `GET /messages/unread-counts`, `GET /messages/{care_link_id}`, `POST /messages/{care_link_id}`, `POST /messages/{care_link_id}/attachment`, `POST /messages/{care_link_id}/read` |
| Lembretes | `GET /reminders`, `POST /reminders`, `PUT /reminders/{id}`, `DELETE /reminders/{id}` |
| Notificações | `GET /notifications`, `GET /notifications/unread-counts`, `POST /notifications/{id}/read`, `POST /notifications/read-all`, `GET /notifications/preferences`, `PUT /notifications/preferences` |
| Health | `GET /health/` |

## Como rodar

```bash
cd backend
python -m venv .venv
source .venv/bin/activate
# ou .venv\Scripts\activate no Windows
pip install -r requirements.txt
uvicorn app.main:app --reload
```

Swagger em `http://localhost:8000/docs`.

## Testes

```bash
pytest
```

Hoje são 12 testes: cálculo de recorrência dos lembretes (`tests/test_recurrence.py`) e regras de visibilidade/edição de presets (`tests/test_preset_service.py`).

## Configuração do ambiente
Crie um arquivo `.env` com base no `.env.example`:

```env
SUPABASE_URL=            # Settings → API → Project URL
SUPABASE_KEY=            # chave anon (usada nas operações de Auth)
SUPABASE_SECRET_KEY=     # chave service_role — nunca expor no frontend
FRONTEND_URL=http://localhost:5173   # origem liberada no CORS
```

Opcionais (têm valor padrão em `app/core/config.py`): `PROJECT_NAME`, `ENVIRONMENT`, `API_V1_PREFIX` (padrão `/api/v1`) e `SUPABASE_SERVICE_ROLE_KEY` (alternativa a `SUPABASE_SECRET_KEY`).

## Banco de dados e Storage
Não há ferramenta de migrations. As alterações de schema mais recentes estão em `sql/` e devem ser aplicadas à mão no SQL Editor do Supabase:
- `0001_chat_attachments.sql` — anexos de imagem nas mensagens
- `0002_diet_plan_presets.sql` — tabela de presets + 5 presets padrão
- `0002_meal_completions.sql` — registro de adesão (itens consumidos por data)

Os buckets de imagem são criados pelos scripts `scripts/create_chat_attachments_bucket.py` e `scripts/create_avatars_bucket.py`.

As tabelas mais antigas (perfis, vínculos, planos, mensagens) e as de lembretes/notificações ainda não têm SQL versionado no repositório.

## Observações de implementação
- Todas as queries de dados usam o cliente `supabase_admin` (service role), que ignora o RLS de propósito: as permissões (papel do usuário, vínculo ativo, dono do recurso) são checadas nos services.
- Lembretes não têm worker em segundo plano: viram notificação quando o usuário consulta `/notifications` ou `/notifications/unread-counts`.
- Imagens do chat ficam num bucket privado e são entregues por signed URLs de curta duração; o tipo do arquivo é validado pelos bytes reais.
- Em produção, o backend roda no Render.

## Status
O backend cobre todo o domínio do MVP. Pendências:
- ampliar os testes automatizados para os services centrais
- paginação de listagens
- versionar o schema completo em `sql/`
- revisar o fuso horário usado no disparo de lembretes (o servidor usa `datetime.now()` sem fuso)

O login social (Google/Apple) é feito inteiramente no frontend, e o problema pendente nesse fluxo também está lá.

---

Veja também `docs/backend-current-status.md` e `docs/backend-architecture.md`.
