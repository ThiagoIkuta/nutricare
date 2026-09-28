# Arquitetura do Backend

## Visão geral

O backend é organizado em camadas para separar responsabilidades e permitir que o domínio cresça sem virar um conjunto de arquivos misturados. A estrutura cobre hoje 8 domínios do produto: autenticação, perfil, vínculo nutricionista-paciente, dietas (incluindo adesão real), presets de planos alimentares, mensagens (texto e imagem), lembretes e notificações.

A arquitetura segue esta ideia:

- `routes` recebem e expõem as requisições HTTP
- `schemas` definem os contratos de entrada e saída
- `services` concentram a regra de negócio
- `core` centraliza configuração e integração com Supabase

## Tecnologias utilizadas

- FastAPI
- Python
- Pydantic (+ `email-validator` para `EmailStr`)
- `python-multipart` (upload de imagens)
- Supabase (Auth + Postgres + Storage via `supabase-py`)
- pytest
- Swagger / OpenAPI

## Organização do projeto

```text
backend/
├─ app/
│  ├─ main.py
│  ├─ core/
│  │  ├─ config.py
│  │  └─ supabase.py              # clientes public (anon) e admin (service role) + tipos (TypedDict/Protocol)
│  ├─ api/
│  │  ├─ deps.py                  # get_current_user — valida JWT via Supabase
│  │  └─ routes/
│  │     ├─ health.py
│  │     ├─ auth.py               # signup / login / refresh / me
│  │     ├─ profile.py            # setup / me / details / update / avatar / histórico de peso
│  │     ├─ care_link.py          # links / invitations / accept / reject / patients / patients/overview
│  │     ├─ diet.py               # plans CRUD / my-plan / my-plans / meals por dia / toggle de item / adesão
│  │     ├─ diet_preset.py        # presets CRUD / duplicate / assign
│  │     ├─ message.py            # links / mensagens / send / attachment / read / unread-counts
│  │     ├─ reminder.py           # lembretes CRUD
│  │     └─ notification.py       # feed / unread-counts / read / read-all / preferences
│  ├─ schemas/
│  │  ├─ auth.py / profile.py / care_link.py / diet.py / message.py
│  │  ├─ preset.py
│  │  ├─ reminder.py
│  │  └─ notification.py
│  └─ services/
│     ├─ profile_service.py
│     ├─ care_link_service.py
│     ├─ diet_service.py
│     ├─ preset_service.py
│     ├─ message_service.py
│     ├─ reminder_service.py
│     ├─ notification_service.py
│     ├─ recurrence.py            # cálculo puro do próximo disparo de um lembrete
│     └─ image_utils.py           # validação de imagem (tamanho + magic bytes), usada no chat e no avatar
├─ sql/                           # scripts SQL aplicados manualmente no Supabase
│  ├─ 0001_chat_attachments.sql
│  ├─ 0002_diet_plan_presets.sql
│  └─ 0002_meal_completions.sql
├─ scripts/                       # criação dos buckets do Supabase Storage
│  ├─ create_chat_attachments_bucket.py
│  └─ create_avatars_bucket.py
├─ tests/
│  ├─ test_recurrence.py
│  └─ test_preset_service.py
├─ pytest.ini
└─ requirements.txt
```

### Responsabilidades por camada

- `main.py` inicializa a aplicação FastAPI, configura CORS (origem única via `FRONTEND_URL`) e registra os 9 routers (`health`, `auth`, `profile`, `care_link`, `diet`, `diet_preset`, `message`, `reminder`, `notification`) sob o prefixo `/api/v1`
- `core` concentra configuração (`config.py`) e os dois clientes Supabase (`supabase.py`)
- `api/routes` expõe os endpoints HTTP de cada domínio
- `api/deps.py` centraliza a validação de JWT compartilhada por todas as rotas autenticadas
- `schemas` define os contratos de entrada/saída por domínio
- `services` implementa a lógica de negócio e conversa diretamente com o Supabase; `recurrence.py` e `image_utils.py` são utilitários puros compartilhados entre services

## Fluxo da aplicação

1. `main.py` sobe a aplicação e registra os routers.
2. As rotas recebem a requisição HTTP.
3. `api/deps.get_current_user` valida o JWT no Supabase e identifica o usuário.
4. Os schemas validam e estruturam os dados de entrada/saída.
5. Os services executam a regra de negócio e falam com o Supabase via `supabase_admin` (bypassa RLS de propósito — o backend é a camada segura entre frontend e banco). Toda checagem de permissão (papel do usuário, vínculo ativo, dono do preset etc.) é feita nos services.

## Decisões técnicas relevantes

- Separação por camadas para manter o domínio organizado e reduzir acoplamento.
- FastAPI pela tipagem, validação automática e documentação Swagger.
- `supabase_admin` (service role) é usado em todas as queries de dados, enquanto `supabase_public` (anon) é reservado para as operações de Auth — o backend é a única camada com acesso direto ao banco.
- `core/supabase.py` define `TypedDict`/`Protocol` (`SupabaseUser`, `SupabaseSession`, `SupabaseClientProtocol`) para dar tipagem estável sobre um SDK fracamente tipado. A extração de usuário/sessão aceita os objetos Pydantic que o `supabase-py` realmente retorna (antes exigia `dict` e quebrava login/signup).
- **Permissões baseadas em `care_links`**: nutricionista só age sobre pacientes com vínculo ativo (lembretes, adesão, planos); paciente só age sobre os próprios dados.
- **Notificações com "lazy tick"**: não há worker em segundo plano. Os lembretes vencidos são materializados como notificações no momento em que o usuário consulta `GET /notifications` ou `GET /notifications/unread-counts` (o frontend faz polling a cada 30s). O tick é idempotente sob concorrência e respeita as preferências (`reminders_enabled`, horário de silêncio).
- **Resumos de chat sintetizados**: o feed de notificações inclui entradas `chat_summary` (id em string, ex.: `"chat-42"`) geradas na hora a partir das mensagens não lidas, sem persistir linha na tabela `notifications`.
- **Falha de notificação não derruba o fluxo principal**: notificações de convite e de plano ativado são disparadas em `try/except`, isoladas do fluxo de vínculo/dieta.
- **Uploads privados com signed URL**: imagens do chat e avatares vão para buckets do Supabase Storage; o tipo declarado é validado contra os magic bytes reais, a leitura é limitada ao tamanho máximo + 1 byte e, se o insert falhar depois do upload, o objeto órfão é removido. Anexos de chat são servidos por signed URLs de curta duração.
- **Adesão por data real**: o consumo de cada item é registrado em `meal_completions` (paciente + item + data), permitindo histórico real e agregação para o nutricionista. Antes de apagar `meal_items` (exclusão de plano ou substituição de refeições), os registros de adesão correspondentes são removidos, já que a FK não tem `ON DELETE CASCADE`.
- **Presets**: planos-modelo guardam as refeições como JSON (`meals_json`) no mesmo formato de `MealCreate`; ao atribuir um preset a um paciente, o JSON é revalidado e, se inválido, a API responde 422 em vez de 500.
- O login social (Google/Apple) é resolvido inteiramente no frontend via Supabase JS — o backend não tem rota de OAuth, só recebe a sessão resultante como qualquer outra.

## Banco de dados

O banco vive no Supabase. Não há ferramenta de migrations: a partir de agosto/2026, as alterações de schema novas passaram a ser registradas em `backend/sql/` (aplicadas à mão no SQL Editor) e os buckets de Storage em `backend/scripts/`. As tabelas mais antigas continuam sem SQL versionado.

Tabelas usadas pelos services:

| Tabela | Domínio | Versionada em `sql/`? |
|---|---|---|
| `profiles`, `nutritionist_profiles`, `patient_profiles` | perfil | não |
| `care_links` | vínculo | não |
| `diet_plans`, `diet_plan_days`, `meals`, `meal_items` | dietas | não |
| `meal_completions` | adesão | sim (`0002_meal_completions.sql`) |
| `diet_plan_presets` | presets (+ 5 presets padrão) | sim (`0002_diet_plan_presets.sql`) |
| `messages` (colunas `attachment_url`, tipo `image`) | mensagens | parcial (`0001_chat_attachments.sql`) |
| `reminders`, `notifications`, `notification_preferences` | lembretes/notificações | não |

Buckets do Storage: `chat-attachments` (privado, só imagens, 5 MB) e `avatars`.

## Instruções de instalação

Dentro da pasta `backend`:

```bash
python -m venv .venv
.venv\Scripts\activate        # Windows (ou source .venv/bin/activate)
pip install -r requirements.txt
```

Copie `.env.example` para `.env` e preencha `SUPABASE_URL`, `SUPABASE_KEY`, `SUPABASE_SECRET_KEY` e `FRONTEND_URL`. Em um projeto Supabase novo, aplique os arquivos de `sql/` e rode os scripts de `scripts/` para criar os buckets.

## Instruções de execução

```bash
uvicorn app.main:app --reload   # desenvolvimento — Swagger em http://localhost:8000/docs
pytest                          # testes automatizados
```

Em produção, o backend roda no Render (plano gratuito — sujeito a cold start).

## Evidências de testes

- **Automatizados (pytest):** 12 testes — cálculo de recorrência dos lembretes (`test_recurrence.py`, horários fixos e intervalo) e regras de visibilidade/edição de presets (`test_preset_service.py`).
- **Manuais / ponta a ponta:** todos os domínios foram validados manualmente via API e navegador; as features mais recentes (upload de imagem, dashboard agregado, correção de exclusão de plano com adesão) foram reproduzidas ponta a ponta contra a API real. Detalhes em [`backend-current-status.md`](backend-current-status.md).

## Estado atual

O backend cobre todo o domínio funcional do MVP e já foi além dele (lembretes, notificações, presets, adesão real). Ver [`backend-current-status.md`](backend-current-status.md) para o detalhamento endpoint a endpoint e as limitações conhecidas.

## Próximo passo natural

Ampliar a cobertura de testes automatizados para os services centrais (`diet_service`, `care_link_service`, `notification_service`), versionar em `sql/` as tabelas que ainda só existem no painel do Supabase e revisar o uso de fuso horário no disparo de lembretes.
