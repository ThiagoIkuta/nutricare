# Arquitetura do Backend

## Visão geral

O backend é organizado em camadas para separar responsabilidades e permitir que o domínio cresça sem virar um conjunto de arquivos misturados. A estrutura cobre hoje os 5 domínios do produto: autenticação, perfil, vínculo nutricionista-paciente, dietas e mensagens.

A arquitetura segue esta ideia:

- `routes` recebem e expõem as requisições HTTP
- `schemas` definem os contratos de entrada e saída
- `services` concentram a regra de negócio
- `core` centraliza configuração e integração com Supabase

## Tecnologias utilizadas

- FastAPI
- Python
- Pydantic
- Supabase (Auth + Postgres via `supabase-py`)
- Swagger / OpenAPI

## Organização do projeto

A estrutura principal do backend é esta:

```text
app/
├─ main.py
├─ core/
│  ├─ config.py
│  └─ supabase.py            # clientes public (anon) e admin (service role) + tipos (TypedDict/Protocol)
├─ api/
│  ├─ deps.py                # get_current_user — valida JWT via Supabase
│  └─ routes/
│     ├─ health.py
│     ├─ auth.py              # signup / login / refresh / me
│     ├─ profile.py           # setup / me / details / update / histórico de peso
│     ├─ care_link.py         # links / invitations / accept / reject / patients
│     ├─ diet.py               # plans CRUD / my-plan / my-plans / meals por dia
│     └─ message.py           # links / mensagens / send / read / unread-counts
├─ schemas/
│  ├─ auth.py
│  ├─ profile.py
│  ├─ care_link.py
│  ├─ diet.py
│  └─ message.py
└─ services/
   ├─ profile_service.py
   ├─ care_link_service.py
   ├─ diet_service.py
   └─ message_service.py
```

### Responsabilidades por camada

- `main.py` inicializa a aplicação FastAPI, configura CORS e registra os 6 routers (`health`, `auth`, `profile`, `care_link`, `diet`, `message`) sob o prefixo `/api/v1`
- `core` concentra configuração (`config.py`) e os dois clientes Supabase (`supabase.py`)
- `api/routes` expõe os endpoints HTTP de cada domínio
- `api/deps.py` centraliza a validação de JWT compartilhada por todas as rotas autenticadas
- `schemas` define os contratos de entrada/saída por domínio
- `services` implementa a lógica de negócio e conversa diretamente com o Supabase

## Fluxo da aplicação

1. `main.py` sobe a aplicação e registra os routers.
2. As rotas recebem a requisição HTTP.
3. `api/deps.get_current_user` valida o JWT no Supabase e identifica o usuário.
4. Os schemas validam e estruturam os dados de entrada/saída.
5. Os services executam a regra de negócio e falam com o Supabase via `supabase_admin` (bypassa RLS de propósito — o backend é a camada segura entre frontend e banco).

## Decisões técnicas relevantes

- Separação por camadas para manter o domínio organizado e reduzir acoplamento.
- FastAPI pela tipagem, validação automática e documentação Swagger.
- `supabase_admin` (service role) é usado em todas as queries de dados, enquanto `supabase_public` (anon) é reservado para as operações de Auth — decisão deliberada para manter o backend como única camada com acesso direto ao banco.
- `core/supabase.py` define `TypedDict`/`Protocol` (`SupabaseUser`, `SupabaseSession`, `SupabaseClientProtocol`) para dar tipagem estável sobre um SDK cujo retorno é fracamente tipado.
- O login social (Google) é resolvido inteiramente no frontend via Supabase JS — o backend não tem (e não precisa de) uma rota dedicada para OAuth, só recebe a sessão resultante como qualquer outra.

## Banco de dados

O schema do banco não é versionado neste repositório — vive gerenciado diretamente no painel do Supabase (sem migrations em SQL no repo). As tabelas conhecidas, inferidas do código dos services, são: `profiles`, `nutritionist_profiles`, `patient_profiles`, `care_links`, `diet_plans`, `diet_plan_days`, `meals`, `meal_items`, `messages`.

Domínios já implementados:

- autenticação e renovação de sessão
- perfil base + perfil detalhado por papel, incluindo histórico de peso
- vínculo nutricionista-paciente, com convite/aceite/rejeição
- planos alimentares com dias e refeições, incluindo edição por dia
- mensagens entre nutricionista e paciente, com contagem de não lidas

Áreas ainda não implementadas:

- testes automatizados
- paginação nas listagens
- upload real de arquivo para avatar (hoje só aceita URL)
- rate limiting nos endpoints públicos
- validação de OAuth/callback do lado do backend

## Instruções de instalação

Dentro da pasta `backend`:

```bash
pip install -r requirements.txt
```

## Instruções de execução

Para iniciar o backend em modo de desenvolvimento:

```bash
uvicorn app.main:app --reload
```

## Evidências de testes

Os fluxos já validados manualmente incluem todos os endpoints de `auth`, `profile` (incluindo histórico de peso), `care_link` (incluindo convites), `diet` (incluindo edição por dia) e `message` (incluindo contagem de não lidas). Detalhes completos em [`backend-current-status.md`](backend-current-status.md).

## Estado atual

O backend cobre hoje todo o domínio funcional do MVP. Ver [`backend-current-status.md`](backend-current-status.md) para o detalhamento endpoint a endpoint e as limitações conhecidas (login social incompleto, sem testes automatizados).

## Próximo passo natural

Corrigir o fechamento de sessão do login social (hoje resolvido inteiramente no frontend, mas depende de uma chamada à API do Supabase que está desatualizada) e iniciar testes automatizados para os domínios centrais (`auth`, `diet`).
