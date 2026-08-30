# Presets de Planos Alimentares — Design

Data: 2026-08-30
Branch: `old-9d6c33c`

## Contexto

O NutriCare hoje permite que um nutricionista crie um plano alimentar (`diet_plans` → `diet_plan_days` → `meals` → `meal_items`) diretamente para um paciente vinculado, via [DietPlanCreate.tsx](../../../frontend/src/pages/DietPlanCreate.tsx) → `POST /diet/plans`. Cada plano nasce em `draft`, replicado nos 7 dias da semana com o mesmo conjunto de refeições, e pode ser editado depois em [DietPlanEdit.tsx](../../../frontend/src/pages/DietPlanEdit.tsx). Não existe hoje nenhum conceito de "modelo reutilizável" — todo plano é criado do zero para um paciente específico.

Esta feature adiciona **presets**: modelos de plano alimentar (título + objetivo + refeições) que um nutricionista pode criar, reutilizar e atribuir a qualquer paciente vinculado, gerando um novo plano de dieta editável a partir do preset. Vêm também 5 presets padrão do sistema, prontos para uso imediato.

## Decisões de escopo (alinhadas com o usuário)

1. **Presets custom têm visibilidade escolhida pelo nutricionista que os cria**: `private` (só o dono vê/usa/edita) ou `public` (todo nutricionista vê e pode usar/atribuir, mas só o dono edita ou exclui).
2. **Presets padrão do sistema (`is_builtin`)** são sempre públicos, visíveis a todos os nutricionistas, e **somente leitura** — ninguém edita ou exclui. Podem ser **duplicados**: a cópia vira um preset custom (privado por padrão) de quem duplicou, livremente editável.
3. **UI integrada**: a página existente "Planos Alimentares" ganha uma aba "Presets" ao lado da aba de listagem de planos — sem novo item de navegação no Dashboard.
4. **Atribuir um preset a um paciente cria um novo `DietPlan` em `draft`**, reaproveitando o fluxo de criação já existente (`DietService.create_plan`) — mesmo comportamento de um plano criado manualmente: o nutricionista revisa/edita e ativa quando quiser. Não há vínculo permanente entre o plano criado e o preset de origem (editar o plano depois não altera o preset, e vice-versa).
5. **Sem infraestrutura nova de entrega/armazenamento** — reaproveita Postgres/Supabase já em uso, mesmo padrão de tabela única com dados aninhados em JSON já usado em `patient_profiles.weight_history`.

## Modelo de dados (Supabase/Postgres, tabela nova)

### `diet_plan_presets`

| coluna | tipo | notas |
|---|---|---|
| id | serial pk | |
| nutritionist_id | uuid (fk profiles.id), nullable | dono do preset custom; `NULL` nos presets padrão do sistema |
| title | text | |
| objective | text, nullable | |
| notes | text, nullable | |
| meals_json | text | JSON de `MealCreate[]` — mesma forma usada em `DietPlanCreate.meals` (nome, `scheduled_time`, `instructions`, `display_order`, `items[]`) |
| is_builtin | bool | default `false`; presets padrão do sistema |
| visibility | text | `private` \| `public`, default `private`; ignorado (tratado como `public`) quando `is_builtin = true` |
| created_at / updated_at | timestamptz | |

Reaproveita os schemas Pydantic `MealCreate`/`MealItemCreate` já existentes em [diet.py](../../../backend/app/schemas/diet.py) para o conteúdo de `meals_json` — sem novo formato a manter.

**Regras de acesso** (aplicadas no `PresetService`, análogas a `DietService._require_nutritionist`):
- Listagem: `is_builtin = true` OR `nutritionist_id = <user>` OR `visibility = 'public'`.
- Editar/excluir: apenas quando `nutritionist_id = <user>` AND `is_builtin = false` — senão 403.
- Duplicar: qualquer preset visível na listagem acima. Duplicar sempre exige que o preset esteja em uma das quatro condições acima (senão 404, mesmo padrão de `_get_plan_or_404`).
- Atribuir a um paciente: qualquer preset visível na listagem acima; o `care_link_id` de destino precisa pertencer ao nutricionista autenticado (mesma checagem que já existe em `create_plan`).

## API (backend)

Novo `PresetService` em `backend/app/services/preset_service.py` + rotas em `backend/app/api/routes/diet_preset.py`, prefixo `/diet/presets`:

| método/rota | descrição |
|---|---|
| `GET /diet/presets` | lista builtins + próprios + públicos de outros nutricionistas |
| `POST /diet/presets` | cria preset custom (`title`, `objective`, `notes`, `meals`, `visibility`) — `nutritionist_id` = usuário atual, `is_builtin = false` |
| `GET /diet/presets/{id}` | detalhe (se visível, senão 404) |
| `PATCH /diet/presets/{id}` | edita campos (só dono, não-builtin — senão 403) |
| `DELETE /diet/presets/{id}` | exclui (só dono, não-builtin — senão 403) |
| `POST /diet/presets/{id}/duplicate` | clona um preset visível para um novo preset custom do usuário atual (`visibility='private'`, título com sufixo "(cópia)") |
| `POST /diet/presets/{id}/assign` | body `{care_link_id}` → monta um `DietPlanCreate` (título/objetivo/notas/refeições do preset) e chama `DietService.create_plan` — retorna o `DietPlanResponse` do plano recém-criado |

Todas exigem `_require_nutritionist`, igual ao restante de `diet.py`.

## Frontend

- [DietPlans.tsx](../../../frontend/src/pages/DietPlans.tsx) ganha abas "Planos" / "Presets" no topo da listagem (estado local, sem mudar rota).
- Aba **Presets**: grid de cards. Cada card mostra título, objetivo (truncado), contagem de refeições, e badges: "Padrão" (builtin), "Público"/"Privado" (custom, ícone globo/cadeado). Ações por card:
  - **Atribuir a paciente** — abre modal simples (reaproveita o `<select>` de pacientes vinculados já usado em `DietPlanCreate.tsx`) → `POST /diet/presets/{id}/assign` → navega para `/app/dietas/{novo_id}` (tela de edição do plano criado).
  - **Duplicar** — `POST /diet/presets/{id}/duplicate` → recarrega a lista com o novo preset.
  - **Editar** / **Excluir** — só visíveis quando o preset pertence ao usuário atual e não é builtin.
  - Nenhum paciente vinculado → botão "Atribuir" desabilitado com mesma mensagem de aviso já usada em `DietPlanCreate.tsx` ("Nenhum paciente vinculado. Vincular paciente primeiro →").
- Botão "Novo preset" no topo da aba → `/app/dietas/presets/novo`.
- Novas páginas `DietPresetCreate.tsx` (cria) e `DietPresetEdit.tsx` (edita) — reaproveitam o editor de refeições/itens de `DietPlanCreate.tsx`, extraído para um componente compartilhado `MealsEditor` (props: `meals`, `onChange`) usado pelos três formulários (criar plano, criar preset, editar preset). Diferenças do formulário de preset em relação ao de plano:
  - Sem seletor de paciente/`care_link_id`.
  - Campo extra: toggle "Visível para outros nutricionistas" (público) vs "Só eu vejo" (privado).
- Rotas novas em `routes/index.tsx`: `/app/dietas/presets/novo`, `/app/dietas/presets/:id/editar`.

## Presets padrão (seed)

5 presets `is_builtin = true`, `visibility = 'public'`, `nutritionist_id = NULL`, cada um com 4 refeições (Café da manhã, Almoço, Lanche da tarde, Jantar), usando nomes de alimentos já cadastrados em [taco_foods.ts](../../../frontend/src/data/taco_foods.ts) (mesmos nomes exatos, para casar com a busca de alimentos e a sugestão de receitas já existentes):

**1. Ganho de massa**
- Café da manhã: Aveia em flocos (60g), Banana prata (1 unidade), Leite integral (250ml), Pasta de amendoim (1 colher de sopa)
- Almoço: Arroz branco cozido (200g), Feijão carioca cozido (100g), Frango peito grelhado (200g), Brócolis cozido (100g), Azeite de oliva (1 colher de sopa)
- Lanche da tarde: Pão integral (2 fatias), Ovo inteiro cozido (2 unidades), Queijo mussarela (30g)
- Jantar: Batata doce cozida (200g), Patinho bovino grelhado (180g), Alface crespa crua (50g), Tomate (1 unidade)

**2. Perda de peso**
- Café da manhã: Iogurte natural desnatado (170g), Morango (100g), Aveia em flocos (30g)
- Almoço: Arroz integral cozido (100g), Feijão preto cozido (80g), Filé de tilápia grelhado (150g), Abobrinha cozida (100g), Alface crespa crua (50g)
- Lanche da tarde: Maçã fuji (1 unidade), Castanha de caju torrada (15g)
- Jantar: Abóbora cozida (100g), Cenoura crua (80g), Frango peito grelhado (120g)

**3. Perda de peso vegano**
- Café da manhã: Tapioca (goma) (50g), Pasta de amendoim (1 colher de sopa), Suco de laranja natural (200ml)
- Almoço: Arroz integral cozido (100g), Lentilha cozida (100g), Grão-de-bico cozido (80g), Brócolis cozido (100g), Azeite de oliva (1 colher de sopa)
- Lanche da tarde: Banana prata (1 unidade), Amendoim torrado (30g)
- Jantar: Proteína de soja texturizada cozida (100g), Batata doce cozida (150g), Couve-flor cozida (100g)

**4. Low-carb / manutenção**
- Café da manhã: Ovo inteiro cozido (2 unidades), Abacate (100g), Café preto sem açúcar (150ml)
- Almoço: Alcatra grelhada (180g), Brócolis cozido (100g), Couve-flor cozida (100g), Azeite de oliva (1 colher de sopa)
- Lanche da tarde: Iogurte grego integral (170g), Amêndoas torradas (30g)
- Jantar: Salmão grelhado (150g), Espinafre cozido (100g), Abobrinha cozida (100g)

**5. Definição muscular**
- Café da manhã: Ovo clara cozida (4 unidades), Aveia em flocos (40g), Morango (100g)
- Almoço: Arroz branco cozido (150g), Frango peito grelhado (200g), Vagem cozida (80g), Tomate (1 unidade), Alface crespa crua (50g)
- Lanche da tarde: Whey protein - pó (30g), Banana prata (1 unidade)
- Jantar: Filé de tilápia grelhado (150g), Batata doce cozida (100g), Brócolis cozido (100g)

Seed via SQL (`backend/sql/0002_diet_plan_presets.sql`), aplicado manualmente no Supabase SQL Editor — mesmo processo já documentado em `0001_chat_attachments.sql` (repo sem ferramenta de migração).

## Erros / edge cases

- Editar/excluir preset builtin ou privado de outro nutricionista → `403 Forbidden`.
- Duplicar/atribuir preset não visível (privado de outro, ou id inexistente) → `404 Not Found`.
- Atribuir a um `care_link_id` que não pertence ao nutricionista autenticado → `404 Not Found` (mesma checagem de `create_plan`).
- Criar/editar preset sem nenhuma refeição válida → permitido (mesma tolerância do plano manual, que também aceita `meals: []`), mas o formulário mantém pelo menos uma refeição em branco por padrão, igual a `DietPlanCreate.tsx`.
- Nenhum paciente vinculado → ação "Atribuir" desabilitada com aviso, plano/preset continuam navegáveis normalmente.

## Testes

Sem suíte automatizada de API neste projeto além de testes pontuais (`pytest` está no `requirements.txt`, mas não há testes de rotas hoje); a verificação será manual via skill `/run`:
1. Login como nutricionista → aba Presets → conferir os 5 presets padrão.
2. Criar preset privado → confirmar que não aparece para outro nutricionista.
3. Criar preset público → confirmar que aparece (somente uso/duplicação, sem editar/excluir) para outro nutricionista.
4. Duplicar um preset builtin → editar a cópia → confirmar que o original não muda.
5. Atribuir um preset a um paciente vinculado → confirmar que o plano é criado em `draft`, com as refeições do preset, editável na tela de edição existente.
6. Confirmar que o paciente só vê o plano depois de ativado (comportamento já existente, não deve regredir).
