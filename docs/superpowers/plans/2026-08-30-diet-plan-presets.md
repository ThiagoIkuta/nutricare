# Presets de Planos Alimentares Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let a nutritionist create reusable diet-plan presets (private or public), assign one to a linked patient to instantly generate an editable draft plan, and ship with 5 ready-to-use default presets.

**Architecture:** New `diet_plan_presets` table (one row per preset, meals stored as a JSON blob — same pattern as `patient_profiles.weight_history`) behind a new `PresetService`/`/diet/presets` API that reuses the existing `DietService.create_plan` for the "assign" action. Frontend adds a "Presets" tab to the existing Planos Alimentares page, plus create/edit forms that share a `MealsEditor` component extracted from the existing plan-create form.

**Tech Stack:** FastAPI + Pydantic + Supabase (Postgres) on the backend; React + TypeScript + react-router + Tailwind on the frontend. No new dependencies.

**Spec:** `docs/superpowers/specs/2026-08-30-diet-plan-presets-design.md`

---

## Task 1: Database schema + seed data

**Files:**
- Create: `backend/sql/0002_diet_plan_presets.sql`

- [ ] **Step 1: Write the migration + seed SQL**

```sql
-- Diet plan presets (feat: presets de planos alimentares).
-- Apply by hand via the Supabase SQL Editor — this repo has no migration
-- tool wired up (see 0001_chat_attachments.sql for the same note).

CREATE TABLE IF NOT EXISTS diet_plan_presets (
  id serial PRIMARY KEY,
  nutritionist_id uuid REFERENCES profiles(id),
  title text NOT NULL,
  objective text,
  notes text,
  meals_json text NOT NULL DEFAULT '[]',
  is_builtin boolean NOT NULL DEFAULT false,
  visibility text NOT NULL DEFAULT 'private',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE diet_plan_presets DROP CONSTRAINT IF EXISTS diet_plan_presets_visibility_check;
ALTER TABLE diet_plan_presets ADD CONSTRAINT diet_plan_presets_visibility_check
  CHECK (visibility = ANY (ARRAY['private'::text, 'public'::text]));

CREATE INDEX IF NOT EXISTS idx_diet_plan_presets_nutritionist ON diet_plan_presets(nutritionist_id);

-- 5 built-in presets: nutritionist_id NULL, is_builtin = true, visible to
-- every nutritionist, read-only (enforced in PresetService, not here).
-- meals_json mirrors the MealCreate/MealItemCreate shape used by
-- POST /diet/plans, using the exact food names already in
-- frontend/src/data/taco_foods.ts.

INSERT INTO diet_plan_presets (nutritionist_id, title, objective, notes, meals_json, is_builtin, visibility)
VALUES
(
  NULL,
  'Ganho de massa',
  'Plano hipercalórico com foco em proteína, para pacientes em fase de ganho de massa muscular.',
  NULL,
  '[
    {"name":"Café da manhã","scheduled_time":"07:00","instructions":null,"display_order":1,"items":[
      {"item_description":"Aveia em flocos","quantity":60,"unit":"g","preparation_notes":null,"display_order":1},
      {"item_description":"Banana prata","quantity":1,"unit":"unidade","preparation_notes":null,"display_order":2},
      {"item_description":"Leite integral","quantity":250,"unit":"ml","preparation_notes":null,"display_order":3},
      {"item_description":"Pasta de amendoim","quantity":1,"unit":"colher de sopa","preparation_notes":null,"display_order":4}
    ]},
    {"name":"Almoço","scheduled_time":"12:30","instructions":null,"display_order":2,"items":[
      {"item_description":"Arroz branco cozido","quantity":200,"unit":"g","preparation_notes":null,"display_order":1},
      {"item_description":"Feijão carioca cozido","quantity":100,"unit":"g","preparation_notes":null,"display_order":2},
      {"item_description":"Frango peito grelhado","quantity":200,"unit":"g","preparation_notes":null,"display_order":3},
      {"item_description":"Brócolis cozido","quantity":100,"unit":"g","preparation_notes":null,"display_order":4},
      {"item_description":"Azeite de oliva","quantity":1,"unit":"colher de sopa","preparation_notes":null,"display_order":5}
    ]},
    {"name":"Lanche da tarde","scheduled_time":"16:00","instructions":null,"display_order":3,"items":[
      {"item_description":"Pão integral","quantity":2,"unit":"fatia","preparation_notes":null,"display_order":1},
      {"item_description":"Ovo inteiro cozido","quantity":2,"unit":"unidade","preparation_notes":null,"display_order":2},
      {"item_description":"Queijo mussarela","quantity":30,"unit":"g","preparation_notes":null,"display_order":3}
    ]},
    {"name":"Jantar","scheduled_time":"19:30","instructions":null,"display_order":4,"items":[
      {"item_description":"Batata doce cozida","quantity":200,"unit":"g","preparation_notes":null,"display_order":1},
      {"item_description":"Patinho bovino grelhado","quantity":180,"unit":"g","preparation_notes":null,"display_order":2},
      {"item_description":"Alface crespa crua","quantity":50,"unit":"g","preparation_notes":null,"display_order":3},
      {"item_description":"Tomate","quantity":1,"unit":"unidade","preparation_notes":null,"display_order":4}
    ]}
  ]',
  true,
  'public'
),
(
  NULL,
  'Perda de peso',
  'Déficit calórico moderado com boa saciedade, foco em proteínas magras e fibras.',
  NULL,
  '[
    {"name":"Café da manhã","scheduled_time":"07:00","instructions":null,"display_order":1,"items":[
      {"item_description":"Iogurte natural desnatado","quantity":170,"unit":"g","preparation_notes":null,"display_order":1},
      {"item_description":"Morango","quantity":100,"unit":"g","preparation_notes":null,"display_order":2},
      {"item_description":"Aveia em flocos","quantity":30,"unit":"g","preparation_notes":null,"display_order":3}
    ]},
    {"name":"Almoço","scheduled_time":"12:30","instructions":null,"display_order":2,"items":[
      {"item_description":"Arroz integral cozido","quantity":100,"unit":"g","preparation_notes":null,"display_order":1},
      {"item_description":"Feijão preto cozido","quantity":80,"unit":"g","preparation_notes":null,"display_order":2},
      {"item_description":"Filé de tilápia grelhado","quantity":150,"unit":"g","preparation_notes":null,"display_order":3},
      {"item_description":"Abobrinha cozida","quantity":100,"unit":"g","preparation_notes":null,"display_order":4},
      {"item_description":"Alface crespa crua","quantity":50,"unit":"g","preparation_notes":null,"display_order":5}
    ]},
    {"name":"Lanche da tarde","scheduled_time":"16:00","instructions":null,"display_order":3,"items":[
      {"item_description":"Maçã fuji","quantity":1,"unit":"unidade","preparation_notes":null,"display_order":1},
      {"item_description":"Castanha de caju torrada","quantity":15,"unit":"g","preparation_notes":null,"display_order":2}
    ]},
    {"name":"Jantar","scheduled_time":"19:30","instructions":null,"display_order":4,"items":[
      {"item_description":"Abóbora cozida","quantity":100,"unit":"g","preparation_notes":null,"display_order":1},
      {"item_description":"Cenoura crua","quantity":80,"unit":"g","preparation_notes":null,"display_order":2},
      {"item_description":"Frango peito grelhado","quantity":120,"unit":"g","preparation_notes":null,"display_order":3}
    ]}
  ]',
  true,
  'public'
),
(
  NULL,
  'Perda de peso vegano',
  'Déficit calórico moderado, 100% à base de plantas.',
  NULL,
  '[
    {"name":"Café da manhã","scheduled_time":"07:00","instructions":null,"display_order":1,"items":[
      {"item_description":"Tapioca (goma)","quantity":50,"unit":"g","preparation_notes":null,"display_order":1},
      {"item_description":"Pasta de amendoim","quantity":1,"unit":"colher de sopa","preparation_notes":null,"display_order":2},
      {"item_description":"Suco de laranja natural","quantity":200,"unit":"ml","preparation_notes":null,"display_order":3}
    ]},
    {"name":"Almoço","scheduled_time":"12:30","instructions":null,"display_order":2,"items":[
      {"item_description":"Arroz integral cozido","quantity":100,"unit":"g","preparation_notes":null,"display_order":1},
      {"item_description":"Lentilha cozida","quantity":100,"unit":"g","preparation_notes":null,"display_order":2},
      {"item_description":"Grão-de-bico cozido","quantity":80,"unit":"g","preparation_notes":null,"display_order":3},
      {"item_description":"Brócolis cozido","quantity":100,"unit":"g","preparation_notes":null,"display_order":4},
      {"item_description":"Azeite de oliva","quantity":1,"unit":"colher de sopa","preparation_notes":null,"display_order":5}
    ]},
    {"name":"Lanche da tarde","scheduled_time":"16:00","instructions":null,"display_order":3,"items":[
      {"item_description":"Banana prata","quantity":1,"unit":"unidade","preparation_notes":null,"display_order":1},
      {"item_description":"Amendoim torrado","quantity":30,"unit":"g","preparation_notes":null,"display_order":2}
    ]},
    {"name":"Jantar","scheduled_time":"19:30","instructions":null,"display_order":4,"items":[
      {"item_description":"Proteína de soja texturizada cozida","quantity":100,"unit":"g","preparation_notes":null,"display_order":1},
      {"item_description":"Batata doce cozida","quantity":150,"unit":"g","preparation_notes":null,"display_order":2},
      {"item_description":"Couve-flor cozida","quantity":100,"unit":"g","preparation_notes":null,"display_order":3}
    ]}
  ]',
  true,
  'public'
),
(
  NULL,
  'Low-carb / manutenção',
  'Carboidrato controlado, indicado para manutenção de peso.',
  NULL,
  '[
    {"name":"Café da manhã","scheduled_time":"07:00","instructions":null,"display_order":1,"items":[
      {"item_description":"Ovo inteiro cozido","quantity":2,"unit":"unidade","preparation_notes":null,"display_order":1},
      {"item_description":"Abacate","quantity":100,"unit":"g","preparation_notes":null,"display_order":2},
      {"item_description":"Café preto (sem açúcar)","quantity":150,"unit":"ml","preparation_notes":null,"display_order":3}
    ]},
    {"name":"Almoço","scheduled_time":"12:30","instructions":null,"display_order":2,"items":[
      {"item_description":"Alcatra grelhada","quantity":180,"unit":"g","preparation_notes":null,"display_order":1},
      {"item_description":"Brócolis cozido","quantity":100,"unit":"g","preparation_notes":null,"display_order":2},
      {"item_description":"Couve-flor cozida","quantity":100,"unit":"g","preparation_notes":null,"display_order":3},
      {"item_description":"Azeite de oliva","quantity":1,"unit":"colher de sopa","preparation_notes":null,"display_order":4}
    ]},
    {"name":"Lanche da tarde","scheduled_time":"16:00","instructions":null,"display_order":3,"items":[
      {"item_description":"Iogurte grego integral","quantity":170,"unit":"g","preparation_notes":null,"display_order":1},
      {"item_description":"Amêndoas torradas","quantity":30,"unit":"g","preparation_notes":null,"display_order":2}
    ]},
    {"name":"Jantar","scheduled_time":"19:30","instructions":null,"display_order":4,"items":[
      {"item_description":"Salmão grelhado","quantity":150,"unit":"g","preparation_notes":null,"display_order":1},
      {"item_description":"Espinafre cozido","quantity":100,"unit":"g","preparation_notes":null,"display_order":2},
      {"item_description":"Abobrinha cozida","quantity":100,"unit":"g","preparation_notes":null,"display_order":3}
    ]}
  ]',
  true,
  'public'
),
(
  NULL,
  'Definição muscular',
  'Alta proteína e carboidrato controlado, foco em definição.',
  NULL,
  '[
    {"name":"Café da manhã","scheduled_time":"07:00","instructions":null,"display_order":1,"items":[
      {"item_description":"Ovo clara cozida","quantity":4,"unit":"unidade","preparation_notes":null,"display_order":1},
      {"item_description":"Aveia em flocos","quantity":40,"unit":"g","preparation_notes":null,"display_order":2},
      {"item_description":"Morango","quantity":100,"unit":"g","preparation_notes":null,"display_order":3}
    ]},
    {"name":"Almoço","scheduled_time":"12:30","instructions":null,"display_order":2,"items":[
      {"item_description":"Arroz branco cozido","quantity":150,"unit":"g","preparation_notes":null,"display_order":1},
      {"item_description":"Frango peito grelhado","quantity":200,"unit":"g","preparation_notes":null,"display_order":2},
      {"item_description":"Vagem cozida","quantity":80,"unit":"g","preparation_notes":null,"display_order":3},
      {"item_description":"Tomate","quantity":1,"unit":"unidade","preparation_notes":null,"display_order":4},
      {"item_description":"Alface crespa crua","quantity":50,"unit":"g","preparation_notes":null,"display_order":5}
    ]},
    {"name":"Lanche da tarde","scheduled_time":"16:00","instructions":null,"display_order":3,"items":[
      {"item_description":"Whey protein (pó)","quantity":30,"unit":"g","preparation_notes":null,"display_order":1},
      {"item_description":"Banana prata","quantity":1,"unit":"unidade","preparation_notes":null,"display_order":2}
    ]},
    {"name":"Jantar","scheduled_time":"19:30","instructions":null,"display_order":4,"items":[
      {"item_description":"Filé de tilápia grelhado","quantity":150,"unit":"g","preparation_notes":null,"display_order":1},
      {"item_description":"Batata doce cozida","quantity":100,"unit":"g","preparation_notes":null,"display_order":2},
      {"item_description":"Brócolis cozido","quantity":100,"unit":"g","preparation_notes":null,"display_order":3}
    ]}
  ]',
  true,
  'public'
);
```

- [ ] **Step 2: Validate the JSON blobs parse correctly before touching the real database**

Run (from `backend/`, with the venv active):
```bash
python -c "
import re, json
sql = open('sql/0002_diet_plan_presets.sql', encoding='utf-8').read()
blobs = re.findall(r\"'(\[\s*\n.*?\n\s*\])'\", sql, re.S)
assert len(blobs) == 5, f'expected 5 JSON blobs, found {len(blobs)}'
for i, b in enumerate(blobs):
    meals = json.loads(b)
    assert len(meals) == 4, f'preset {i} has {len(meals)} meals, expected 4'
    for m in meals:
        assert m['items'], f'preset {i} meal {m[\"name\"]!r} has no items'
print('All 5 preset JSON blobs are valid and have 4 meals each.')
"
```
Expected: `All 5 preset JSON blobs are valid and have 4 meals each.`

- [ ] **Step 3: Apply the migration — requires explicit user confirmation first**

This step modifies the shared Supabase project (creates a new table + inserts rows). **Ask the user to confirm before running it**, the same way the chat-attachments and avatars buckets were confirmed earlier in this project. Once confirmed, run the contents of `backend/sql/0002_diet_plan_presets.sql` in the Supabase SQL Editor (same manual-apply process as `0001_chat_attachments.sql` — this repo has no migration tool).

- [ ] **Step 4: Verify the seed landed correctly**

Run (from `backend/`, venv active, requires `.env` with Supabase credentials):
```bash
python -c "
from app.core.supabase import supabase_admin
resp = supabase_admin.table('diet_plan_presets').select('id, title, is_builtin, visibility').eq('is_builtin', True).execute()
rows = resp.data or []
print(f'{len(rows)} built-in presets found:')
for r in rows:
    print(' -', r['title'], r['visibility'])
assert len(rows) == 5
"
```
Expected: `5 built-in presets found:` followed by the 5 titles.

- [ ] **Step 5: Commit**

```bash
git add backend/sql/0002_diet_plan_presets.sql
git commit -m "feat(backend): add diet_plan_presets table + 5 seeded defaults"
```

---

## Task 2: Pydantic schemas

**Files:**
- Create: `backend/app/schemas/preset.py`

- [ ] **Step 1: Write the schemas**

```python
from pydantic import BaseModel

from app.schemas.diet import MealCreate

VALID_VISIBILITY = {"private", "public"}


class PresetCreate(BaseModel):
    title: str
    objective: str | None = None
    notes: str | None = None
    visibility: str = "private"
    meals: list[MealCreate] = []


class PresetUpdate(BaseModel):
    title: str | None = None
    objective: str | None = None
    notes: str | None = None
    visibility: str | None = None
    meals: list[MealCreate] | None = None


class PresetAssignRequest(BaseModel):
    care_link_id: int


class PresetResponse(BaseModel):
    id: int
    nutritionist_id: str | None = None
    title: str
    objective: str | None = None
    notes: str | None = None
    is_builtin: bool
    visibility: str
    meals: list[MealCreate] = []
    created_at: str
    updated_at: str
```

`VALID_VISIBILITY` lives here (not in the service) so both the schema layer and the service can import the single source of truth for the allowed values.

- [ ] **Step 2: Verify it imports cleanly**

Run (from `backend/`, venv active):
```bash
python -c "from app.schemas.preset import PresetCreate, PresetUpdate, PresetAssignRequest, PresetResponse, VALID_VISIBILITY; print('OK')"
```
Expected: `OK`

- [ ] **Step 3: Commit**

```bash
git add backend/app/schemas/preset.py
git commit -m "feat(backend): add preset request/response schemas"
```

---

## Task 3: Preset visibility/edit rules (TDD)

**Files:**
- Create: `backend/app/services/preset_service.py` (pure helpers only in this task)
- Test: `backend/tests/test_preset_service.py`

These two functions decide, for any preset row, whether the current user can see it and whether they can edit/delete it. They're pure (dict in, bool out) so they can be unit-tested without a live Supabase connection — same style as `backend/app/services/recurrence.py` / `backend/tests/test_recurrence.py`, the only precedent for automated tests in this backend.

- [ ] **Step 1: Write the failing tests**

```python
from app.services.preset_service import _can_edit, _is_visible


def test_builtin_preset_is_visible_to_anyone():
    row = {"is_builtin": True, "nutritionist_id": None, "visibility": "private"}
    assert _is_visible(row, "user-a") is True


def test_private_preset_visible_only_to_owner():
    row = {"is_builtin": False, "nutritionist_id": "user-a", "visibility": "private"}
    assert _is_visible(row, "user-a") is True
    assert _is_visible(row, "user-b") is False


def test_public_preset_visible_to_everyone():
    row = {"is_builtin": False, "nutritionist_id": "user-a", "visibility": "public"}
    assert _is_visible(row, "user-a") is True
    assert _is_visible(row, "user-b") is True


def test_builtin_preset_cannot_be_edited_by_anyone():
    row = {"is_builtin": True, "nutritionist_id": None, "visibility": "private"}
    assert _can_edit(row, "user-a") is False


def test_owner_can_edit_own_custom_preset():
    row = {"is_builtin": False, "nutritionist_id": "user-a", "visibility": "public"}
    assert _can_edit(row, "user-a") is True
    assert _can_edit(row, "user-b") is False
```

Save as `backend/tests/test_preset_service.py`.

- [ ] **Step 2: Run the tests to verify they fail**

Run (from `backend/`, venv active):
```bash
pytest tests/test_preset_service.py -v
```
Expected: `ModuleNotFoundError: No module named 'app.services.preset_service'` (the file doesn't exist yet).

- [ ] **Step 3: Create `preset_service.py` with just the two helpers**

```python
def _is_visible(preset_row: dict, user_id: str) -> bool:
    if preset_row.get("is_builtin"):
        return True
    if preset_row.get("nutritionist_id") == user_id:
        return True
    return preset_row.get("visibility") == "public"


def _can_edit(preset_row: dict, user_id: str) -> bool:
    if preset_row.get("is_builtin"):
        return False
    return preset_row.get("nutritionist_id") == user_id
```

Save as `backend/app/services/preset_service.py` (the `PresetService` class is added on top of this in Task 4 — this task only needs the module to exist with these two functions).

- [ ] **Step 4: Run the tests to verify they pass**

Run (from `backend/`, venv active):
```bash
pytest tests/test_preset_service.py -v
```
Expected: 5 passed.

- [ ] **Step 5: Commit**

```bash
git add backend/app/services/preset_service.py backend/tests/test_preset_service.py
git commit -m "feat(backend): add preset visibility/edit permission rules"
```

---

## Task 4: PresetService CRUD (list/get/create/update/delete)

**Files:**
- Modify: `backend/app/services/preset_service.py`

- [ ] **Step 1: Add the CRUD methods on top of the Task 3 helpers**

Replace the full contents of `backend/app/services/preset_service.py` with:

```python
import json
from typing import Any

from fastapi import HTTPException, status

from app.core.supabase import supabase_admin
from app.schemas.diet import MealCreate
from app.schemas.preset import VALID_VISIBILITY, PresetCreate, PresetUpdate


def _is_visible(preset_row: dict, user_id: str) -> bool:
    if preset_row.get("is_builtin"):
        return True
    if preset_row.get("nutritionist_id") == user_id:
        return True
    return preset_row.get("visibility") == "public"


def _can_edit(preset_row: dict, user_id: str) -> bool:
    if preset_row.get("is_builtin"):
        return False
    return preset_row.get("nutritionist_id") == user_id


def _serialize_row(row: dict) -> dict:
    try:
        meals = json.loads(row.get("meals_json") or "[]")
    except (json.JSONDecodeError, TypeError):
        meals = []
    return {**row, "meals": meals}


class PresetService:
    @staticmethod
    def _get_user_id(current_user: Any) -> str:
        user_id = str(getattr(current_user, "id", ""))
        if not user_id:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Usuário autenticado sem ID válido.",
            )
        return user_id

    @staticmethod
    def _require_nutritionist(user_id: str) -> None:
        resp = (
            supabase_admin.table("profiles")
            .select("role")
            .eq("id", user_id)
            .limit(1)
            .execute()
        )
        rows = resp.data or []
        role = rows[0].get("role") if rows else None
        if role != "nutritionist":
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Apenas nutricionistas podem gerenciar presets.",
            )

    @staticmethod
    def _get_preset_or_404(preset_id: int, user_id: str) -> dict:
        resp = (
            supabase_admin.table("diet_plan_presets")
            .select("*")
            .eq("id", preset_id)
            .limit(1)
            .execute()
        )
        rows = resp.data or []
        if not rows or not _is_visible(rows[0], user_id):
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Preset não encontrado.",
            )
        return rows[0]

    @staticmethod
    def list_presets(current_user: Any) -> list[dict]:
        user_id = PresetService._get_user_id(current_user)
        PresetService._require_nutritionist(user_id)

        resp = (
            supabase_admin.table("diet_plan_presets")
            .select("*")
            .order("is_builtin", desc=True)
            .order("created_at")
            .execute()
        )
        rows = resp.data or []
        visible = [r for r in rows if _is_visible(r, user_id)]
        return [_serialize_row(r) for r in visible]

    @staticmethod
    def get_preset(current_user: Any, preset_id: int) -> dict:
        user_id = PresetService._get_user_id(current_user)
        PresetService._require_nutritionist(user_id)
        row = PresetService._get_preset_or_404(preset_id, user_id)
        return _serialize_row(row)

    @staticmethod
    def create_preset(current_user: Any, payload: PresetCreate) -> dict:
        user_id = PresetService._get_user_id(current_user)
        PresetService._require_nutritionist(user_id)

        if payload.visibility not in VALID_VISIBILITY:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail=f"Visibilidade inválida. Use: {', '.join(sorted(VALID_VISIBILITY))}.",
            )

        meals_json = json.dumps([m.model_dump() for m in payload.meals])

        resp = (
            supabase_admin.table("diet_plan_presets")
            .insert({
                "nutritionist_id": user_id,
                "title": payload.title,
                "objective": payload.objective,
                "notes": payload.notes,
                "meals_json": meals_json,
                "is_builtin": False,
                "visibility": payload.visibility,
            })
            .execute()
        )
        rows = resp.data or []
        if not rows:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Falha ao criar o preset.",
            )
        return _serialize_row(rows[0])

    @staticmethod
    def update_preset(current_user: Any, preset_id: int, payload: PresetUpdate) -> dict:
        user_id = PresetService._get_user_id(current_user)
        PresetService._require_nutritionist(user_id)
        row = PresetService._get_preset_or_404(preset_id, user_id)
        if not _can_edit(row, user_id):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Você não pode editar este preset.",
            )

        update_data: dict[str, Any] = {}
        if payload.title is not None:
            update_data["title"] = payload.title
        if payload.objective is not None:
            update_data["objective"] = payload.objective
        if payload.notes is not None:
            update_data["notes"] = payload.notes
        if payload.visibility is not None:
            if payload.visibility not in VALID_VISIBILITY:
                raise HTTPException(
                    status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                    detail=f"Visibilidade inválida. Use: {', '.join(sorted(VALID_VISIBILITY))}.",
                )
            update_data["visibility"] = payload.visibility
        if payload.meals is not None:
            update_data["meals_json"] = json.dumps([m.model_dump() for m in payload.meals])

        if not update_data:
            return _serialize_row(row)

        resp = (
            supabase_admin.table("diet_plan_presets")
            .update(update_data)
            .eq("id", preset_id)
            .execute()
        )
        rows = resp.data or []
        if not rows:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Falha ao atualizar o preset.",
            )
        return _serialize_row(rows[0])

    @staticmethod
    def delete_preset(current_user: Any, preset_id: int) -> None:
        user_id = PresetService._get_user_id(current_user)
        PresetService._require_nutritionist(user_id)
        row = PresetService._get_preset_or_404(preset_id, user_id)
        if not _can_edit(row, user_id):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Você não pode excluir este preset.",
            )
        supabase_admin.table("diet_plan_presets").delete().eq("id", preset_id).execute()
```

`MealCreate` is imported but not yet used in this task — Task 5 uses it. Keep the import; `assign_preset` needs it next.

- [ ] **Step 2: Re-run the Task 3 tests to confirm no regression**

Run (from `backend/`, venv active):
```bash
pytest tests/test_preset_service.py -v
```
Expected: 5 passed.

- [ ] **Step 3: Verify the module still imports cleanly (catches syntax/import errors the tests above don't exercise)**

Run (from `backend/`, venv active):
```bash
python -c "from app.services.preset_service import PresetService; print('OK')"
```
Expected: `OK`

- [ ] **Step 4: Commit**

```bash
git add backend/app/services/preset_service.py
git commit -m "feat(backend): add preset list/get/create/update/delete"
```

---

## Task 5: Duplicate + assign-to-patient

**Files:**
- Modify: `backend/app/services/preset_service.py`

- [ ] **Step 1: Add `duplicate_preset` and `assign_preset`**

Add these two methods to the `PresetService` class (after `delete_preset`), and add the two new imports at the top of the file:

```python
from app.schemas.diet import DietPlanCreate, MealCreate
from app.services.diet_service import DietService
```

(replace the existing `from app.schemas.diet import MealCreate` line with the combined import above)

```python
    @staticmethod
    def duplicate_preset(current_user: Any, preset_id: int) -> dict:
        user_id = PresetService._get_user_id(current_user)
        PresetService._require_nutritionist(user_id)
        row = PresetService._get_preset_or_404(preset_id, user_id)

        resp = (
            supabase_admin.table("diet_plan_presets")
            .insert({
                "nutritionist_id": user_id,
                "title": f"{row['title']} (cópia)",
                "objective": row.get("objective"),
                "notes": row.get("notes"),
                "meals_json": row.get("meals_json") or "[]",
                "is_builtin": False,
                "visibility": "private",
            })
            .execute()
        )
        rows = resp.data or []
        if not rows:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Falha ao duplicar o preset.",
            )
        return _serialize_row(rows[0])

    @staticmethod
    def assign_preset(current_user: Any, preset_id: int, care_link_id: int) -> dict:
        user_id = PresetService._get_user_id(current_user)
        PresetService._require_nutritionist(user_id)
        row = PresetService._get_preset_or_404(preset_id, user_id)
        serialized = _serialize_row(row)

        plan_payload = DietPlanCreate(
            care_link_id=care_link_id,
            title=row["title"],
            objective=row.get("objective"),
            notes=row.get("notes"),
            meals=[MealCreate(**m) for m in serialized["meals"]],
        )
        return DietService.create_plan(current_user, plan_payload)
```

`assign_preset` deliberately does not duplicate any of `DietService.create_plan`'s logic (7-day replication, `care_link_id` ownership check, `draft` status) — it just builds the same `DietPlanCreate` payload the manual "Novo plano" form builds and hands it to the existing method.

- [ ] **Step 2: Verify it imports cleanly (also catches circular-import issues between `preset_service` and `diet_service`)**

Run (from `backend/`, venv active):
```bash
python -c "from app.services.preset_service import PresetService; from app.services.diet_service import DietService; print('OK')"
```
Expected: `OK`

- [ ] **Step 3: Re-run the permission tests once more (still the only automated coverage for this file)**

Run (from `backend/`, venv active):
```bash
pytest tests/test_preset_service.py -v
```
Expected: 5 passed.

- [ ] **Step 4: Commit**

```bash
git add backend/app/services/preset_service.py
git commit -m "feat(backend): add preset duplicate + assign-to-patient"
```

---

## Task 6: API routes

**Files:**
- Create: `backend/app/api/routes/diet_preset.py`
- Modify: `backend/app/main.py`

- [ ] **Step 1: Write the router**

```python
from typing import Annotated, Any

from fastapi import APIRouter, Depends, status

from app.api.deps import get_current_user
from app.schemas.diet import DietPlanResponse
from app.schemas.preset import (
    PresetAssignRequest,
    PresetCreate,
    PresetResponse,
    PresetUpdate,
)
from app.services.preset_service import PresetService

router = APIRouter(prefix="/diet/presets", tags=["diet-presets"])


@router.get("", response_model=list[PresetResponse])
def list_presets(current_user: Annotated[Any, Depends(get_current_user)]):
    return PresetService.list_presets(current_user)


@router.post("", response_model=PresetResponse, status_code=status.HTTP_201_CREATED)
def create_preset(
    payload: PresetCreate,
    current_user: Annotated[Any, Depends(get_current_user)],
):
    return PresetService.create_preset(current_user, payload)


@router.get("/{preset_id}", response_model=PresetResponse)
def get_preset(
    preset_id: int,
    current_user: Annotated[Any, Depends(get_current_user)],
):
    return PresetService.get_preset(current_user, preset_id)


@router.patch("/{preset_id}", response_model=PresetResponse)
def update_preset(
    preset_id: int,
    payload: PresetUpdate,
    current_user: Annotated[Any, Depends(get_current_user)],
):
    return PresetService.update_preset(current_user, preset_id, payload)


@router.delete("/{preset_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_preset(
    preset_id: int,
    current_user: Annotated[Any, Depends(get_current_user)],
):
    PresetService.delete_preset(current_user, preset_id)


@router.post("/{preset_id}/duplicate", response_model=PresetResponse, status_code=status.HTTP_201_CREATED)
def duplicate_preset(
    preset_id: int,
    current_user: Annotated[Any, Depends(get_current_user)],
):
    return PresetService.duplicate_preset(current_user, preset_id)


@router.post("/{preset_id}/assign", response_model=DietPlanResponse, status_code=status.HTTP_201_CREATED)
def assign_preset(
    preset_id: int,
    payload: PresetAssignRequest,
    current_user: Annotated[Any, Depends(get_current_user)],
):
    return PresetService.assign_preset(current_user, preset_id, payload.care_link_id)
```

- [ ] **Step 2: Register the router in `main.py`**

In `backend/app/main.py`, add the import next to the other route imports (alphabetically, after `care_link_router`):

```python
from app.api.routes.diet_preset import router as diet_preset_router
```

And add the `include_router` call next to `diet_router`:

```python
app.include_router(diet_router, prefix=settings.API_V1_PREFIX)
app.include_router(diet_preset_router, prefix=settings.API_V1_PREFIX)
```

- [ ] **Step 3: Verify the app still imports and the new routes are registered**

Run (from `backend/`, venv active):
```bash
python -c "
from app.main import app
paths = set()
for route in app.router.routes:
    for r in getattr(route, 'routes', [route]):
        p = getattr(r, 'path', None)
        if p:
            paths.add(p)
expected = {
    '/api/v1/diet/presets',
    '/api/v1/diet/presets/{preset_id}',
    '/api/v1/diet/presets/{preset_id}/duplicate',
    '/api/v1/diet/presets/{preset_id}/assign',
}
missing = expected - paths
assert not missing, f'missing routes: {missing}'
print('All preset routes registered.')
"
```
Expected: `All preset routes registered.` (if this fails with a different error than a missing-routes AssertionError, first re-run the simpler `from app.main import app` check from Task 6 Step 3's predecessor investigation to confirm the app itself still imports — an import failure elsewhere would surface here too.)

- [ ] **Step 4: Commit**

```bash
git add backend/app/api/routes/diet_preset.py backend/app/main.py
git commit -m "feat(backend): wire up /diet/presets routes"
```

---

## Task 7: Frontend types

**Files:**
- Modify: `frontend/src/diet/types.ts`

- [ ] **Step 1: Append the preset types**

Add to the end of `frontend/src/diet/types.ts`:

```typescript
export type PresetVisibility = "private" | "public";

export type PresetMealItem = {
  item_description: string;
  quantity: number | null;
  unit: string | null;
  preparation_notes: string | null;
  display_order: number;
};

export type PresetMeal = {
  name: string;
  scheduled_time: string | null;
  instructions: string | null;
  display_order: number;
  items: PresetMealItem[];
};

export type DietPlanPreset = {
  id: number;
  nutritionist_id: string | null;
  title: string;
  objective: string | null;
  notes: string | null;
  is_builtin: boolean;
  visibility: PresetVisibility;
  meals: PresetMeal[];
  created_at: string;
  updated_at: string;
};
```

- [ ] **Step 2: Type-check**

Run (from `frontend/`):
```bash
npx tsc --noEmit
```
Expected: no output (no errors).

- [ ] **Step 3: Commit**

```bash
git add frontend/src/diet/types.ts
git commit -m "feat(frontend): add DietPlanPreset types"
```

---

## Task 8: Extract `MealsEditor` and use it in `DietPlanCreate.tsx`

**Files:**
- Create: `frontend/src/components/MealsEditor.tsx`
- Modify: `frontend/src/pages/DietPlanCreate.tsx`

This pulls the meal/item-builder UI (and its draft types/helpers) out of `DietPlanCreate.tsx` into a standalone component so Tasks 9 and 10 (preset create/edit forms) can reuse it instead of duplicating ~250 lines of JSX.

- [ ] **Step 1: Create `MealsEditor.tsx`**

```tsx
import { Plus, Trash2, ChevronDown, ChevronUp } from "lucide-react";

import FoodSearch from "./FoodSearch";
import type { TacoFood } from "../data/taco_foods";

export type ItemDraft = {
  item_description: string;
  quantity: string;
  unit: string;
  preparation_notes: string;
};

export type MealDraft = {
  name: string;
  scheduled_time: string;
  instructions: string;
  items: ItemDraft[];
  collapsed: boolean;
};

export const EMPTY_ITEM: ItemDraft = {
  item_description: "",
  quantity: "",
  unit: "g",
  preparation_notes: "",
};

const MEAL_SUGGESTIONS = [
  "Café da manhã",
  "Lanche da manhã",
  "Almoço",
  "Lanche da tarde",
  "Jantar",
  "Ceia",
];

const UNITS = [
  "g",
  "ml",
  "unidade",
  "colher de sopa",
  "colher de chá",
  "xícara",
  "fatia",
  "porção",
];

export function newMeal(name = ""): MealDraft {
  return {
    name,
    scheduled_time: "",
    instructions: "",
    items: [{ ...EMPTY_ITEM }],
    collapsed: false,
  };
}

export type MealItemPayload = {
  item_description: string;
  quantity: number | null;
  unit: string | null;
  preparation_notes: string | null;
  display_order: number;
};

export type MealPayload = {
  name: string;
  scheduled_time: string | null;
  instructions: string | null;
  display_order: number;
  items: MealItemPayload[];
};

export function mealsToPayload(meals: MealDraft[]): MealPayload[] {
  return meals
    .filter((m) => m.name.trim())
    .map((m, i) => ({
      name: m.name.trim(),
      scheduled_time: m.scheduled_time || null,
      instructions: m.instructions.trim() || null,
      display_order: i + 1,
      items: m.items
        .filter((item) => item.item_description.trim())
        .map((item, j) => ({
          item_description: item.item_description.trim(),
          quantity: item.quantity ? parseFloat(item.quantity) : null,
          unit: item.unit || null,
          preparation_notes: item.preparation_notes.trim() || null,
          display_order: j + 1,
        })),
    }));
}

type Props = {
  meals: MealDraft[];
  onChange: (meals: MealDraft[]) => void;
};

export default function MealsEditor({ meals, onChange }: Props) {
  function addMeal() {
    onChange([...meals, newMeal()]);
  }

  function removeMeal(i: number) {
    onChange(meals.filter((_, idx) => idx !== i));
  }

  function toggleMeal(i: number) {
    onChange(meals.map((m, idx) => (idx === i ? { ...m, collapsed: !m.collapsed } : m)));
  }

  function setMealField(
    i: number,
    field: keyof Omit<MealDraft, "items" | "collapsed">,
    value: string
  ) {
    onChange(meals.map((m, idx) => (idx === i ? { ...m, [field]: value } : m)));
  }

  function addItem(mealIdx: number) {
    onChange(meals.map((m, i) => (i === mealIdx ? { ...m, items: [...m.items, { ...EMPTY_ITEM }] } : m)));
  }

  function removeItem(mealIdx: number, itemIdx: number) {
    onChange(
      meals.map((m, i) =>
        i === mealIdx ? { ...m, items: m.items.filter((_, j) => j !== itemIdx) } : m
      )
    );
  }

  function setItemField(mealIdx: number, itemIdx: number, field: keyof ItemDraft, value: string) {
    onChange(
      meals.map((m, i) =>
        i === mealIdx
          ? { ...m, items: m.items.map((item, j) => (j === itemIdx ? { ...item, [field]: value } : item)) }
          : m
      )
    );
  }

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold text-gray-800">Refeições ({meals.length})</h2>
        <button
          type="button"
          onClick={addMeal}
          className="flex items-center gap-1.5 rounded-xl bg-orange-500 px-4 py-2 text-sm font-semibold text-white hover:bg-orange-600 transition"
        >
          <Plus className="h-4 w-4" />
          Adicionar refeição
        </button>
      </div>

      {meals.length === 0 && (
        <div className="rounded-2xl bg-white p-8 shadow-sm text-center text-sm text-gray-400">
          Nenhuma refeição adicionada.
        </div>
      )}

      {meals.map((meal, mealIdx) => (
        <div key={mealIdx} className="rounded-2xl bg-white shadow-sm overflow-hidden">
          <div className="flex items-center gap-3 px-5 py-4 border-b border-gray-100">
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-orange-100 text-xs font-bold text-orange-600">
              {mealIdx + 1}
            </span>

            <input
              type="text"
              value={meal.name}
              onChange={(e) => setMealField(mealIdx, "name", e.target.value)}
              list={`meal-names-${mealIdx}`}
              placeholder="Nome da refeição"
              className="flex-1 h-9 px-3 rounded-xl border border-gray-300 text-sm outline-none focus:ring-2 focus:ring-orange-400"
            />
            <datalist id={`meal-names-${mealIdx}`}>
              {MEAL_SUGGESTIONS.map((s) => (
                <option key={s} value={s} />
              ))}
            </datalist>

            <input
              type="time"
              value={meal.scheduled_time}
              onChange={(e) => setMealField(mealIdx, "scheduled_time", e.target.value)}
              className="w-32 h-9 px-3 rounded-xl border border-gray-300 text-sm outline-none focus:ring-2 focus:ring-orange-400"
              title="Horário sugerido"
            />

            <button
              type="button"
              onClick={() => toggleMeal(mealIdx)}
              className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 transition"
            >
              {meal.collapsed ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
            </button>

            <button
              type="button"
              onClick={() => removeMeal(mealIdx)}
              className="rounded-lg p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-500 transition"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>

          {!meal.collapsed && (
            <div className="px-5 py-4 space-y-4">
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-500 uppercase tracking-wide">
                  Instruções da refeição
                </label>
                <input
                  type="text"
                  value={meal.instructions}
                  onChange={(e) => setMealField(mealIdx, "instructions", e.target.value)}
                  placeholder="Ex: Consumir até 30 min após acordar"
                  className="w-full h-9 px-3 rounded-xl border border-gray-300 text-sm outline-none focus:ring-2 focus:ring-orange-400"
                />
              </div>

              <div>
                <p className="mb-2 text-xs font-medium text-gray-500 uppercase tracking-wide">
                  Alimentos
                </p>

                <div className="space-y-2">
                  {meal.items.map((item, itemIdx) => (
                    <div
                      key={itemIdx}
                      className="rounded-xl border border-gray-100 bg-gray-50 p-3 space-y-2"
                    >
                      <div className="flex items-center gap-2">
                        <FoodSearch
                          value={item.item_description}
                          onChange={(v) => setItemField(mealIdx, itemIdx, "item_description", v)}
                          onSelect={(food: TacoFood) => {
                            setItemField(mealIdx, itemIdx, "item_description", food.name);
                            setItemField(mealIdx, itemIdx, "quantity", String(food.default_qty));
                            setItemField(mealIdx, itemIdx, "unit", food.default_unit);
                          }}
                          className="min-w-0 flex-[3]"
                        />
                        <input
                          type="number"
                          value={item.quantity}
                          onChange={(e) => setItemField(mealIdx, itemIdx, "quantity", e.target.value)}
                          placeholder="Qtd"
                          min="0"
                          step="any"
                          className="w-20 h-9 px-3 rounded-lg border border-gray-300 bg-white text-sm outline-none focus:ring-2 focus:ring-orange-400"
                        />
                        <select
                          value={item.unit}
                          onChange={(e) => setItemField(mealIdx, itemIdx, "unit", e.target.value)}
                          className="w-32 h-9 px-2 rounded-lg border border-gray-300 bg-white text-sm outline-none focus:ring-2 focus:ring-orange-400"
                        >
                          {UNITS.map((u) => (
                            <option key={u} value={u}>
                              {u}
                            </option>
                          ))}
                        </select>
                        <button
                          type="button"
                          onClick={() => removeItem(mealIdx, itemIdx)}
                          disabled={meal.items.length === 1}
                          className="shrink-0 rounded-lg p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-500 transition disabled:opacity-30 disabled:cursor-not-allowed"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>

                      <input
                        type="text"
                        value={item.preparation_notes}
                        onChange={(e) => setItemField(mealIdx, itemIdx, "preparation_notes", e.target.value)}
                        placeholder="Observação de preparo (opcional)"
                        className="w-full h-9 px-3 rounded-lg border border-gray-200 bg-white text-sm outline-none focus:ring-2 focus:ring-orange-400"
                      />
                    </div>
                  ))}
                </div>

                <button
                  type="button"
                  onClick={() => addItem(mealIdx)}
                  className="mt-2 flex items-center gap-1 text-xs font-medium text-orange-500 hover:text-orange-600 transition"
                >
                  <Plus className="h-3 w-3" />
                  Adicionar alimento
                </button>
              </div>
            </div>
          )}
        </div>
      ))}
    </section>
  );
}
```

- [ ] **Step 2: Rewrite `DietPlanCreate.tsx` to use it**

Replace the full contents of `frontend/src/pages/DietPlanCreate.tsx` with:

```tsx
import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";

import { api, getApiErrorMessage } from "../lib/api";
import type { CareLink, DietPlan } from "../diet/types";
import BackLink from "../components/BackLink";
import MealsEditor, { mealsToPayload, newMeal, type MealDraft } from "../components/MealsEditor";

export default function DietPlanCreate() {
  const navigate = useNavigate();

  const [careLinks, setCareLinks] = useState<CareLink[]>([]);
  const [careLinkId, setCareLinkId] = useState<string>("");
  const [title, setTitle] = useState("");
  const [objective, setObjective] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [notes, setNotes] = useState("");
  const [meals, setMeals] = useState<MealDraft[]>([newMeal()]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .get<CareLink[]>("/care/links")
      .then((res) => {
        const active = res.data.filter((l) => l.status === "active");
        setCareLinks(active);
        if (active.length === 1) setCareLinkId(String(active[0].id));
      })
      .catch(() => {});
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!careLinkId) {
      setError("Selecione um paciente para o plano.");
      return;
    }
    if (!title.trim()) {
      setError("O título do plano é obrigatório.");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    const payload = {
      care_link_id: Number(careLinkId),
      title: title.trim(),
      objective: objective.trim() || null,
      start_date: startDate || null,
      end_date: endDate || null,
      notes: notes.trim() || null,
      meals: mealsToPayload(meals),
    };

    try {
      await api.post<DietPlan>("/diet/plans", payload);
      navigate("/app/dietas");
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="mx-auto max-w-3xl flex items-center justify-between">
          <div>
            <BackLink to="/app/dietas" label="Planos Alimentares" />
            <h1 className="mt-0.5 text-xl font-bold text-gray-900">Novo Plano Alimentar</h1>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-3xl px-6 py-8">
        <form onSubmit={handleSubmit} className="space-y-6">

          {/* Paciente */}
          <section className="rounded-2xl bg-white p-6 shadow-sm border border-gray-100 space-y-4">
            <h2 className="text-base font-semibold text-gray-800">Paciente</h2>

            {careLinks.length === 0 ? (
              <div className="rounded-xl bg-yellow-50 border border-yellow-200 px-4 py-3 text-sm text-yellow-700">
                Nenhum paciente vinculado.{" "}
                <Link to="/app/pacientes" className="font-semibold underline">
                  Vincular paciente primeiro →
                </Link>
              </div>
            ) : (
              <select
                value={careLinkId}
                onChange={(e) => setCareLinkId(e.target.value)}
                className="w-full h-11 px-4 rounded-xl border border-gray-300 text-sm outline-none focus:ring-2 focus:ring-orange-400"
              >
                <option value="">Selecione um paciente...</option>
                {careLinks.map((l) => (
                  <option key={l.id} value={String(l.id)}>
                    {l.patient_username ?? `Paciente ${l.patient_id.slice(0, 8)}`}
                  </option>
                ))}
              </select>
            )}
          </section>

          {/* Informações do plano */}
          <section className="rounded-2xl bg-white p-6 shadow-sm border border-gray-100 space-y-4">
            <h2 className="text-base font-semibold text-gray-800">Informações do Plano</h2>

            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Título <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Ex: Plano de emagrecimento — fase 1"
                className="w-full h-11 px-4 rounded-xl border border-gray-300 text-sm outline-none focus:ring-2 focus:ring-orange-400"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Objetivo / Descrição
              </label>
              <textarea
                value={objective}
                onChange={(e) => setObjective(e.target.value)}
                rows={3}
                placeholder="Descreva o objetivo e orientações gerais do plano"
                className="w-full px-4 py-3 rounded-xl border border-gray-300 text-sm outline-none focus:ring-2 focus:ring-orange-400 resize-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Início</label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full h-11 px-4 rounded-xl border border-gray-300 text-sm outline-none focus:ring-2 focus:ring-orange-400"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Término</label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full h-11 px-4 rounded-xl border border-gray-300 text-sm outline-none focus:ring-2 focus:ring-orange-400"
                />
              </div>
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Observações gerais
              </label>
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Ex: Beber 2L de água por dia"
                className="w-full h-11 px-4 rounded-xl border border-gray-300 text-sm outline-none focus:ring-2 focus:ring-orange-400"
              />
            </div>
          </section>

          <MealsEditor meals={meals} onChange={setMeals} />

          {error && (
            <p className="text-sm text-red-600 rounded-xl bg-red-50 px-4 py-3">{error}</p>
          )}

          <div className="flex items-center justify-end gap-4 pt-2 pb-8">
            <Link to="/app/dietas" className="text-sm text-gray-500 hover:text-gray-700">
              Cancelar
            </Link>
            <button
              type="submit"
              disabled={isSubmitting}
              className="h-11 px-6 rounded-xl bg-yellow-400 font-semibold text-gray-900 hover:bg-yellow-500 disabled:opacity-70 disabled:cursor-not-allowed transition"
            >
              {isSubmitting ? "Salvando..." : "Salvar Plano"}
            </button>
          </div>
        </form>
      </div>
    </main>
  );
}
```

- [ ] **Step 3: Type-check**

Run (from `frontend/`):
```bash
npx tsc --noEmit
```
Expected: no output.

- [ ] **Step 4: Manual smoke check**

Use the `/run` skill (or `npm run dev` manually) to open `/app/dietas/nova` as a nutritionist and confirm the form renders and behaves exactly as before (add/remove meal, add/remove item, food search autofill, submit creates a plan). This is a pure refactor — there should be zero visible change.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/components/MealsEditor.tsx frontend/src/pages/DietPlanCreate.tsx
git commit -m "refactor(frontend): extract MealsEditor out of DietPlanCreate"
```

---

## Task 9: `DietPresetCreate.tsx` page

**Files:**
- Create: `frontend/src/pages/DietPresetCreate.tsx`
- Modify: `frontend/src/routes/index.tsx`

- [ ] **Step 1: Write the page**

```tsx
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";

import { api, getApiErrorMessage } from "../lib/api";
import BackLink from "../components/BackLink";
import MealsEditor, { mealsToPayload, newMeal, type MealDraft } from "../components/MealsEditor";
import type { DietPlanPreset, PresetVisibility } from "../diet/types";

export default function DietPresetCreate() {
  const navigate = useNavigate();

  const [title, setTitle] = useState("");
  const [objective, setObjective] = useState("");
  const [notes, setNotes] = useState("");
  const [visibility, setVisibility] = useState<PresetVisibility>("private");
  const [meals, setMeals] = useState<MealDraft[]>([newMeal()]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) {
      setError("O título do preset é obrigatório.");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    const payload = {
      title: title.trim(),
      objective: objective.trim() || null,
      notes: notes.trim() || null,
      visibility,
      meals: mealsToPayload(meals),
    };

    try {
      await api.post<DietPlanPreset>("/diet/presets", payload);
      navigate("/app/dietas");
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="mx-auto max-w-3xl flex items-center justify-between">
          <div>
            <BackLink to="/app/dietas" label="Planos Alimentares" />
            <h1 className="mt-0.5 text-xl font-bold text-gray-900">Novo Preset</h1>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-3xl px-6 py-8">
        <form onSubmit={handleSubmit} className="space-y-6">
          <section className="rounded-2xl bg-white p-6 shadow-sm border border-gray-100 space-y-4">
            <h2 className="text-base font-semibold text-gray-800">Informações do Preset</h2>

            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Título <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Ex: Plano de definição muscular"
                className="w-full h-11 px-4 rounded-xl border border-gray-300 text-sm outline-none focus:ring-2 focus:ring-orange-400"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Objetivo / Descrição</label>
              <textarea
                value={objective}
                onChange={(e) => setObjective(e.target.value)}
                rows={3}
                placeholder="Descreva o objetivo e orientações gerais do preset"
                className="w-full px-4 py-3 rounded-xl border border-gray-300 text-sm outline-none focus:ring-2 focus:ring-orange-400 resize-none"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Observações gerais</label>
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Ex: Beber 2L de água por dia"
                className="w-full h-11 px-4 rounded-xl border border-gray-300 text-sm outline-none focus:ring-2 focus:ring-orange-400"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Visibilidade</label>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setVisibility("private")}
                  className={`flex-1 h-11 rounded-xl border text-sm font-medium transition ${
                    visibility === "private"
                      ? "border-orange-400 bg-orange-50 text-orange-600"
                      : "border-gray-300 text-gray-600 hover:border-orange-300"
                  }`}
                >
                  Só eu vejo
                </button>
                <button
                  type="button"
                  onClick={() => setVisibility("public")}
                  className={`flex-1 h-11 rounded-xl border text-sm font-medium transition ${
                    visibility === "public"
                      ? "border-orange-400 bg-orange-50 text-orange-600"
                      : "border-gray-300 text-gray-600 hover:border-orange-300"
                  }`}
                >
                  Visível para outros nutricionistas
                </button>
              </div>
            </div>
          </section>

          <MealsEditor meals={meals} onChange={setMeals} />

          {error && <p className="text-sm text-red-600 rounded-xl bg-red-50 px-4 py-3">{error}</p>}

          <div className="flex items-center justify-end gap-4 pt-2 pb-8">
            <Link to="/app/dietas" className="text-sm text-gray-500 hover:text-gray-700">
              Cancelar
            </Link>
            <button
              type="submit"
              disabled={isSubmitting}
              className="h-11 px-6 rounded-xl bg-yellow-400 font-semibold text-gray-900 hover:bg-yellow-500 disabled:opacity-70 disabled:cursor-not-allowed transition"
            >
              {isSubmitting ? "Salvando..." : "Salvar Preset"}
            </button>
          </div>
        </form>
      </div>
    </main>
  );
}
```

- [ ] **Step 2: Register the route**

In `frontend/src/routes/index.tsx`, add the import next to `DietPlanCreate`:

```tsx
import DietPresetCreate from "../pages/DietPresetCreate";
```

And add the route inside the `<RequireAuth />` block, next to `/app/dietas/nova`:

```tsx
<Route path="/app/dietas/presets/novo" element={<DietPresetCreate />} />
```

- [ ] **Step 3: Type-check**

Run (from `frontend/`):
```bash
npx tsc --noEmit
```
Expected: no output.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/pages/DietPresetCreate.tsx frontend/src/routes/index.tsx
git commit -m "feat(frontend): add preset creation page"
```

---

## Task 10: `DietPresetEdit.tsx` page

**Files:**
- Create: `frontend/src/pages/DietPresetEdit.tsx`
- Modify: `frontend/src/routes/index.tsx`

- [ ] **Step 1: Write the page**

```tsx
import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";

import { api, getApiErrorMessage } from "../lib/api";
import BackLink from "../components/BackLink";
import MealsEditor, { mealsToPayload, type ItemDraft, type MealDraft } from "../components/MealsEditor";
import type { DietPlanPreset, PresetVisibility } from "../diet/types";

function presetToDrafts(preset: DietPlanPreset): MealDraft[] {
  if (preset.meals.length === 0) {
    return [
      {
        name: "",
        scheduled_time: "",
        instructions: "",
        collapsed: false,
        items: [{ item_description: "", quantity: "", unit: "g", preparation_notes: "" }],
      },
    ];
  }
  return preset.meals.map((m) => ({
    name: m.name,
    scheduled_time: m.scheduled_time ?? "",
    instructions: m.instructions ?? "",
    collapsed: false,
    items:
      m.items.length > 0
        ? m.items.map(
            (item): ItemDraft => ({
              item_description: item.item_description,
              quantity: item.quantity != null ? String(item.quantity) : "",
              unit: item.unit ?? "g",
              preparation_notes: item.preparation_notes ?? "",
            })
          )
        : [{ item_description: "", quantity: "", unit: "g", preparation_notes: "" }],
  }));
}

export default function DietPresetEdit() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [title, setTitle] = useState("");
  const [objective, setObjective] = useState("");
  const [notes, setNotes] = useState("");
  const [visibility, setVisibility] = useState<PresetVisibility>("private");
  const [meals, setMeals] = useState<MealDraft[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    api
      .get<DietPlanPreset>(`/diet/presets/${id}`)
      .then((res) => {
        const p = res.data;
        setTitle(p.title);
        setObjective(p.objective ?? "");
        setNotes(p.notes ?? "");
        setVisibility(p.visibility);
        setMeals(presetToDrafts(p));
      })
      .catch((err) => setError(getApiErrorMessage(err) || "Preset não encontrado."))
      .finally(() => setLoading(false));
  }, [id]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!id) return;
    if (!title.trim()) {
      setError("O título do preset é obrigatório.");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      await api.patch<DietPlanPreset>(`/diet/presets/${id}`, {
        title: title.trim(),
        objective: objective.trim() || null,
        notes: notes.trim() || null,
        visibility,
        meals: mealsToPayload(meals),
      });
      navigate("/app/dietas");
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setIsSubmitting(false);
    }
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-sm text-gray-400">Carregando preset...</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="mx-auto max-w-3xl flex items-center justify-between">
          <div>
            <BackLink to="/app/dietas" label="Planos Alimentares" />
            <h1 className="mt-0.5 text-xl font-bold text-gray-900">Editar Preset</h1>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-3xl px-6 py-8">
        <form onSubmit={handleSubmit} className="space-y-6">
          <section className="rounded-2xl bg-white p-6 shadow-sm border border-gray-100 space-y-4">
            <h2 className="text-base font-semibold text-gray-800">Informações do Preset</h2>

            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Título <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full h-11 px-4 rounded-xl border border-gray-300 text-sm outline-none focus:ring-2 focus:ring-orange-400"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Objetivo / Descrição</label>
              <textarea
                value={objective}
                onChange={(e) => setObjective(e.target.value)}
                rows={3}
                className="w-full px-4 py-3 rounded-xl border border-gray-300 text-sm outline-none focus:ring-2 focus:ring-orange-400 resize-none"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Observações gerais</label>
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full h-11 px-4 rounded-xl border border-gray-300 text-sm outline-none focus:ring-2 focus:ring-orange-400"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Visibilidade</label>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setVisibility("private")}
                  className={`flex-1 h-11 rounded-xl border text-sm font-medium transition ${
                    visibility === "private"
                      ? "border-orange-400 bg-orange-50 text-orange-600"
                      : "border-gray-300 text-gray-600 hover:border-orange-300"
                  }`}
                >
                  Só eu vejo
                </button>
                <button
                  type="button"
                  onClick={() => setVisibility("public")}
                  className={`flex-1 h-11 rounded-xl border text-sm font-medium transition ${
                    visibility === "public"
                      ? "border-orange-400 bg-orange-50 text-orange-600"
                      : "border-gray-300 text-gray-600 hover:border-orange-300"
                  }`}
                >
                  Visível para outros nutricionistas
                </button>
              </div>
            </div>
          </section>

          <MealsEditor meals={meals} onChange={setMeals} />

          {error && <p className="text-sm text-red-600 rounded-xl bg-red-50 px-4 py-3">{error}</p>}

          <div className="flex items-center justify-end gap-4 pt-2 pb-8">
            <Link to="/app/dietas" className="text-sm text-gray-500 hover:text-gray-700">
              Cancelar
            </Link>
            <button
              type="submit"
              disabled={isSubmitting}
              className="h-11 px-6 rounded-xl bg-yellow-400 font-semibold text-gray-900 hover:bg-yellow-500 disabled:opacity-70 disabled:cursor-not-allowed transition"
            >
              {isSubmitting ? "Salvando..." : "Salvar alterações"}
            </button>
          </div>
        </form>
      </div>
    </main>
  );
}
```

- [ ] **Step 2: Register the route**

In `frontend/src/routes/index.tsx`, add the import next to `DietPresetCreate`:

```tsx
import DietPresetEdit from "../pages/DietPresetEdit";
```

And add the route next to `/app/dietas/presets/novo`:

```tsx
<Route path="/app/dietas/presets/:id/editar" element={<DietPresetEdit />} />
```

- [ ] **Step 3: Type-check**

Run (from `frontend/`):
```bash
npx tsc --noEmit
```
Expected: no output.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/pages/DietPresetEdit.tsx frontend/src/routes/index.tsx
git commit -m "feat(frontend): add preset editing page"
```

---

## Task 11: `PresetsTab` component (list, assign, duplicate, edit/delete)

**Files:**
- Create: `frontend/src/components/PresetsTab.tsx`

- [ ] **Step 1: Write the component**

```tsx
import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Copy, Globe, Lock, Pencil, Plus, Trash2, Users, Utensils } from "lucide-react";

import { api, getApiErrorMessage } from "../lib/api";
import { useAuth } from "../auth/useAuth";
import type { CareLink, DietPlan, DietPlanPreset } from "../diet/types";

export default function PresetsTab() {
  const navigate = useNavigate();
  const { session } = useAuth();
  const myId = session?.user.id;

  const [presets, setPresets] = useState<DietPlanPreset[]>([]);
  const [careLinks, setCareLinks] = useState<CareLink[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<number | null>(null);

  const [assigningId, setAssigningId] = useState<number | null>(null);
  const [assignCareLinkId, setAssignCareLinkId] = useState("");
  const [assignError, setAssignError] = useState<string | null>(null);
  const [assignSubmitting, setAssignSubmitting] = useState(false);

  function load() {
    setLoading(true);
    Promise.all([
      api.get<DietPlanPreset[]>("/diet/presets"),
      api.get<CareLink[]>("/care/links"),
    ])
      .then(([presetsRes, linksRes]) => {
        setPresets(presetsRes.data);
        setCareLinks(linksRes.data.filter((l) => l.status === "active"));
      })
      .catch((err) => setError(getApiErrorMessage(err)))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleDuplicate(presetId: number) {
    setBusyId(presetId);
    setError(null);
    try {
      await api.post<DietPlanPreset>(`/diet/presets/${presetId}/duplicate`);
      load();
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setBusyId(null);
    }
  }

  async function handleDelete(presetId: number) {
    setBusyId(presetId);
    setError(null);
    try {
      await api.delete(`/diet/presets/${presetId}`);
      setPresets((prev) => prev.filter((p) => p.id !== presetId));
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setBusyId(null);
    }
  }

  function openAssign(presetId: number) {
    setAssigningId(presetId);
    setAssignCareLinkId(careLinks.length === 1 ? String(careLinks[0].id) : "");
    setAssignError(null);
  }

  async function handleAssign() {
    if (!assigningId || !assignCareLinkId) return;
    setAssignSubmitting(true);
    setAssignError(null);
    try {
      const res = await api.post<DietPlan>(`/diet/presets/${assigningId}/assign`, {
        care_link_id: Number(assignCareLinkId),
      });
      navigate(`/app/dietas/${res.data.id}`);
    } catch (err) {
      setAssignError(getApiErrorMessage(err));
    } finally {
      setAssignSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div className="rounded-2xl bg-white p-10 shadow-sm text-center text-sm text-gray-400">
        Carregando presets...
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {error && <p className="text-sm text-red-600 rounded-xl bg-red-50 px-4 py-3">{error}</p>}

      <div className="flex justify-end">
        <Link
          to="/app/dietas/presets/novo"
          className="flex items-center gap-1.5 rounded-xl bg-orange-500 px-4 py-2 text-sm font-semibold text-white hover:bg-orange-600 transition shadow-sm"
        >
          <Plus className="h-4 w-4" />
          Novo preset
        </Link>
      </div>

      {presets.length === 0 && (
        <div className="rounded-2xl bg-white p-12 shadow-sm text-center text-sm text-gray-400">
          Nenhum preset disponível.
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {presets.map((preset) => {
          const isMine = preset.nutritionist_id === myId;
          const canEdit = isMine && !preset.is_builtin;
          const mealCount = preset.meals.length;

          return (
            <div
              key={preset.id}
              className="rounded-2xl bg-white shadow-sm border border-gray-100 p-5 flex flex-col gap-3"
            >
              <div>
                <div className="flex items-center gap-2 flex-wrap mb-1">
                  <h3 className="font-semibold text-gray-900">{preset.title}</h3>
                  {preset.is_builtin && (
                    <span className="rounded-full px-2 py-0.5 text-xs font-medium bg-blue-100 text-blue-700">
                      Padrão
                    </span>
                  )}
                  {!preset.is_builtin && (
                    <span className="flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium bg-gray-100 text-gray-500">
                      {preset.visibility === "public" ? (
                        <Globe className="h-3 w-3" />
                      ) : (
                        <Lock className="h-3 w-3" />
                      )}
                      {preset.visibility === "public" ? "Público" : "Privado"}
                    </span>
                  )}
                </div>
                {preset.objective && (
                  <p className="text-sm text-gray-500 line-clamp-2">{preset.objective}</p>
                )}
                <p className="mt-2 flex items-center gap-1 text-xs text-gray-400">
                  <Utensils className="h-3 w-3" />
                  {mealCount} {mealCount === 1 ? "refeição" : "refeições"}
                </p>
              </div>

              <div className="flex items-center gap-2 flex-wrap mt-auto pt-2 border-t border-gray-50">
                <button
                  type="button"
                  onClick={() => openAssign(preset.id)}
                  disabled={careLinks.length === 0}
                  title={careLinks.length === 0 ? "Nenhum paciente vinculado" : "Atribuir a paciente"}
                  className="flex items-center gap-1.5 rounded-lg bg-orange-500 px-3 py-1.5 text-xs font-semibold text-white hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed transition"
                >
                  <Users className="h-3.5 w-3.5" />
                  Atribuir
                </button>
                <button
                  type="button"
                  onClick={() => handleDuplicate(preset.id)}
                  disabled={busyId === preset.id}
                  className="flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-1.5 text-xs text-gray-600 hover:border-orange-300 hover:text-orange-500 disabled:opacity-50 transition"
                >
                  <Copy className="h-3.5 w-3.5" />
                  Duplicar
                </button>
                {canEdit && (
                  <>
                    <Link
                      to={`/app/dietas/presets/${preset.id}/editar`}
                      className="flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-1.5 text-xs text-gray-600 hover:border-orange-300 hover:text-orange-500 transition"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                      Editar
                    </Link>
                    <button
                      type="button"
                      onClick={() => handleDelete(preset.id)}
                      disabled={busyId === preset.id}
                      className="flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-1.5 text-xs text-gray-500 hover:border-red-300 hover:text-red-500 disabled:opacity-50 transition"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      Excluir
                    </button>
                  </>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {careLinks.length === 0 && presets.length > 0 && (
        <div className="rounded-xl bg-yellow-50 border border-yellow-200 px-4 py-3 text-sm text-yellow-700">
          Nenhum paciente vinculado.{" "}
          <Link to="/app/pacientes" className="font-semibold underline">
            Vincular paciente primeiro →
          </Link>
        </div>
      )}

      {assigningId !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-lg space-y-4">
            <h3 className="text-base font-semibold text-gray-800">Atribuir preset a um paciente</h3>

            <select
              value={assignCareLinkId}
              onChange={(e) => setAssignCareLinkId(e.target.value)}
              className="w-full h-11 px-4 rounded-xl border border-gray-300 text-sm outline-none focus:ring-2 focus:ring-orange-400"
            >
              <option value="">Selecione um paciente...</option>
              {careLinks.map((l) => (
                <option key={l.id} value={String(l.id)}>
                  {l.patient_username ?? `Paciente ${l.patient_id.slice(0, 8)}`}
                </option>
              ))}
            </select>

            {assignError && <p className="text-sm text-red-600">{assignError}</p>}

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setAssigningId(null)}
                className="text-sm text-gray-500 hover:text-gray-700"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleAssign}
                disabled={!assignCareLinkId || assignSubmitting}
                className="h-10 px-5 rounded-xl bg-yellow-400 font-semibold text-gray-900 hover:bg-yellow-500 disabled:opacity-60 transition"
              >
                {assignSubmitting ? "Criando..." : "Criar plano"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Type-check**

Run (from `frontend/`):
```bash
npx tsc --noEmit
```
Expected: no output. (This component isn't wired into any page yet — Task 12 does that — but it must still compile standalone.)

- [ ] **Step 3: Commit**

```bash
git add frontend/src/components/PresetsTab.tsx
git commit -m "feat(frontend): add PresetsTab component"
```

---

## Task 12: Wire the "Presets" tab into `DietPlans.tsx`

**Files:**
- Modify: `frontend/src/pages/DietPlans.tsx`

- [ ] **Step 1: Replace the full file contents**

Replace `frontend/src/pages/DietPlans.tsx` with (changes from the current version: `tab` state, `PresetsTab` import, tab switcher UI, the "Novo plano" button now only shows on the "planos" tab, and the existing stats/filter/list block is wrapped in a `tab === "planos"` check):

```tsx
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ClipboardList, Plus, Calendar, Utensils } from "lucide-react";

import { api } from "../lib/api";
import BackLink from "../components/BackLink";
import PresetsTab from "../components/PresetsTab";
import type { DietPlanSummary } from "../diet/types";

const MOCK_PLANS: DietPlanSummary[] = [
  {
    id: 1,
    care_link_id: 1,
    title: "Plano emagrecimento — Fase 1",
    objective:
      "Déficit calórico moderado com foco em proteína e controle de carboidratos.",
    start_date: "2026-05-20",
    end_date: "2026-06-20",
    status: "active",
    created_at: new Date().toISOString(),
    meal_count: 5,
  },
  {
    id: 2,
    care_link_id: 1,
    title: "Plano ganho de massa — Verão",
    objective: null,
    start_date: null,
    end_date: null,
    status: "draft",
    created_at: new Date(Date.now() - 86400000 * 3).toISOString(),
    meal_count: 6,
  },
  {
    id: 3,
    care_link_id: 2,
    title: "Dieta low-carb — Manutenção",
    objective: "Plano de manutenção após atingir o peso ideal.",
    start_date: "2026-04-01",
    end_date: "2026-04-30",
    status: "archived",
    created_at: new Date(Date.now() - 86400000 * 50).toISOString(),
    meal_count: 4,
  },
];

const STATUS_LABEL: Record<string, string> = {
  draft: "Rascunho",
  active: "Ativo",
  archived: "Arquivado",
};

const STATUS_CLASS: Record<string, string> = {
  draft: "bg-gray-100 text-gray-500",
  active: "bg-green-100 text-green-700",
  archived: "bg-blue-100 text-blue-700",
};

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "short",
  });
}

type Filter = "todos" | "active" | "draft" | "archived";
type Tab = "planos" | "presets";

export default function DietPlans() {
  const [plans, setPlans] = useState<DietPlanSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDemo, setIsDemo] = useState(false);
  const [filter, setFilter] = useState<Filter>("todos");
  const [tab, setTab] = useState<Tab>("planos");

  useEffect(() => {
    api
      .get<DietPlanSummary[]>("/diet/plans")
      .then((res) => setPlans(res.data))
      .catch(() => {
        setPlans(MOCK_PLANS);
        setIsDemo(true);
      })
      .finally(() => setLoading(false));
  }, []);

  const filtered =
    filter === "todos" ? plans : plans.filter((p) => p.status === filter);

  const counts = {
    todos: plans.length,
    active: plans.filter((p) => p.status === "active").length,
    draft: plans.filter((p) => p.status === "draft").length,
    archived: plans.filter((p) => p.status === "archived").length,
  };

  return (
    <main className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="mx-auto max-w-4xl flex items-center justify-between">
          <div>
            <BackLink to="/app" label="Dashboard" />
            <h1 className="mt-0.5 text-xl font-bold text-gray-900">
              Planos Alimentares
            </h1>
          </div>
          {tab === "planos" && (
            <Link
              to="/app/dietas/nova"
              className="flex items-center gap-1.5 rounded-xl bg-orange-500 px-4 py-2 text-sm font-semibold text-white hover:bg-orange-600 transition shadow-sm"
            >
              <Plus className="h-4 w-4" />
              Novo plano
            </Link>
          )}
        </div>
      </header>

      <div className="mx-auto max-w-4xl px-6 py-8 space-y-5">
        <div className="flex rounded-xl bg-white shadow-sm overflow-hidden border border-gray-200 w-fit">
          {(["planos", "presets"] as Tab[]).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-5 py-2 text-sm font-medium transition ${
                t === tab ? "bg-orange-500 text-white" : "text-gray-500 hover:text-gray-700"
              }`}
            >
              {t === "planos" ? "Planos" : "Presets"}
            </button>
          ))}
        </div>

        {tab === "presets" && <PresetsTab />}

        {tab === "planos" && (
          <>
            {isDemo && (
              <div className="rounded-xl bg-yellow-50 border border-yellow-200 px-4 py-2.5 text-xs text-yellow-700">
                Modo demonstração — dados fictícios.
              </div>
            )}

            {/* Stats */}
            {!loading && (
              <div className="grid grid-cols-3 gap-3">
                {[
                  {
                    label: "Ativos",
                    count: counts.active,
                    color: "text-green-600 bg-green-50",
                  },
                  {
                    label: "Rascunhos",
                    count: counts.draft,
                    color: "text-gray-500 bg-gray-50",
                  },
                  {
                    label: "Concluídos",
                    count: counts.archived,
                    color: "text-blue-600 bg-blue-50",
                  },
                ].map((s) => (
                  <div
                    key={s.label}
                    className={`rounded-2xl ${s.color} p-4 text-center`}
                  >
                    <p className="text-2xl font-bold">{s.count}</p>
                    <p className="text-xs font-medium mt-0.5">{s.label}</p>
                  </div>
                ))}
              </div>
            )}

            {/* Filter tabs */}
            {!loading && plans.length > 0 && (
              <div className="flex gap-1 rounded-xl bg-white border border-gray-200 p-1 w-fit shadow-sm">
                {(["todos", "active", "draft", "archived"] as Filter[]).map((f) => (
                  <button
                    key={f}
                    onClick={() => setFilter(f)}
                    className={`rounded-lg px-3 py-1.5 text-xs font-medium transition ${
                      filter === f
                        ? "bg-orange-500 text-white shadow"
                        : "text-gray-500 hover:text-gray-700"
                    }`}
                  >
                    {f === "todos" ? "Todos" : STATUS_LABEL[f]}{" "}
                    <span className="opacity-70">({counts[f]})</span>
                  </button>
                ))}
              </div>
            )}

            {/* Loading */}
            {loading && (
              <div className="rounded-2xl bg-white p-10 shadow-sm text-center text-sm text-gray-400">
                Carregando planos...
              </div>
            )}

            {/* Empty */}
            {!loading && filtered.length === 0 && plans.length === 0 && (
              <div className="rounded-2xl bg-white p-12 shadow-sm flex flex-col items-center gap-4 text-center">
                <ClipboardList className="h-10 w-10 text-gray-200" />
                <div>
                  <p className="text-sm font-semibold text-gray-600">
                    Nenhum plano ainda
                  </p>
                  <p className="text-xs text-gray-400 mt-1">
                    Crie seu primeiro plano alimentar para um paciente.
                  </p>
                </div>
                <Link
                  to="/app/dietas/nova"
                  className="flex items-center gap-1.5 rounded-xl bg-orange-500 px-4 py-2.5 text-sm font-semibold text-white hover:bg-orange-600 transition"
                >
                  <Plus className="h-4 w-4" />
                  Criar primeiro plano
                </Link>
              </div>
            )}

            {/* Empty filter */}
            {!loading && filtered.length === 0 && plans.length > 0 && (
              <div className="rounded-2xl bg-white p-8 shadow-sm text-center text-sm text-gray-400">
                Nenhum plano com status "{STATUS_LABEL[filter as string] ?? filter}
                ".
              </div>
            )}

            {/* List */}
            {!loading && filtered.length > 0 && (
              <div className="space-y-3">
                {filtered.map((plan) => (
                  <div
                    key={plan.id}
                    className="rounded-2xl bg-white shadow-sm border border-gray-100 hover:border-orange-200 hover:shadow-md transition p-5 flex items-start justify-between gap-4"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <h2 className="font-semibold text-gray-900">
                          {plan.title}
                        </h2>
                        <span
                          className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_CLASS[plan.status] ?? STATUS_CLASS.draft}`}
                        >
                          {STATUS_LABEL[plan.status] ?? plan.status}
                        </span>
                      </div>

                      {plan.objective && (
                        <p className="text-sm text-gray-500 line-clamp-1 mb-2">
                          {plan.objective}
                        </p>
                      )}

                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-gray-400">
                        <span className="flex items-center gap-1">
                          <Utensils className="h-3 w-3" />
                          {plan.meal_count}{" "}
                          {plan.meal_count === 1 ? "refeição" : "refeições"}
                        </span>
                        {plan.start_date && (
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {formatDate(plan.start_date)}
                            {plan.end_date ? ` → ${formatDate(plan.end_date)}` : ""}
                          </span>
                        )}
                      </div>
                    </div>

                    <Link
                      to={`/app/dietas/${plan.id}`}
                      className="shrink-0 self-center rounded-xl border border-gray-200 px-3 py-2 text-sm text-gray-600 hover:border-orange-400 hover:text-orange-500 transition"
                    >
                      Ver / Editar
                    </Link>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </main>
  );
}
```

- [ ] **Step 2: Type-check**

Run (from `frontend/`):
```bash
npx tsc --noEmit
```
Expected: no output.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/pages/DietPlans.tsx
git commit -m "feat(frontend): add Presets tab to Planos Alimentares page"
```

---

## Task 13: End-to-end manual QA

**Files:** none (verification only)

- [ ] **Step 1: Start the app**

Use the `/run` skill to launch both backend and frontend (or manually: `cd backend && uvicorn app.main:app --reload` and `cd frontend && npm run dev`).

- [ ] **Step 2: Walk through the spec's test checklist**

As a nutritionist user:
1. Open Planos Alimentares → "Presets" tab → confirm the 5 built-in presets appear (Ganho de massa, Perda de peso, Perda de peso vegano, Low-carb / manutenção, Definição muscular), each badged "Padrão", with no Editar/Excluir buttons.
2. Click "Novo preset" → create a preset with visibility "Só eu vejo" → save → confirm it appears in the list with a "Privado" badge and has Editar/Excluir buttons.
3. Create a second preset with visibility "Visível para outros nutricionistas" → confirm it shows a "Público" badge.
4. Click "Duplicar" on one of the built-in presets → confirm a new "(cópia)" preset appears, privately owned, editable — and that editing it does not change the original built-in.
5. Click "Atribuir" on any preset → pick a linked patient → confirm it navigates to the new plan's detail page, that the plan's meals match the preset, and that its status is "Rascunho" (draft).
6. Edit that new plan (change a meal) and confirm the change does not affect the source preset.
7. Log in as a second nutritionist account (or a second browser session) → confirm: the first nutritionist's private preset is NOT visible; their public preset IS visible with only "Atribuir"/"Duplicar" (no Editar/Excluir); all 5 built-ins are visible.
8. As the patient linked to the plan created in step 5, confirm the plan does **not** appear in "Minha Dieta" until the nutritionist activates it (existing behavior, should not have regressed).

- [ ] **Step 3: Report results**

If every point above holds, the feature is complete. If anything deviates, note which step failed and fix it before considering the plan done — do not mark this task complete on a partial pass.

---

## Plan self-review notes

- **Spec coverage:** every section of `2026-08-30-diet-plan-presets-design.md` maps to a task — data model → Task 1, API → Tasks 2–6, frontend → Tasks 7–12, default presets → Task 1, error/edge cases → enforced in Task 4/5 (`_get_preset_or_404`, `_can_edit`, visibility validation) and exercised in Task 13, testing → Task 13.
- **Type consistency verified:** `MealDraft`/`ItemDraft`/`EMPTY_ITEM`/`newMeal`/`mealsToPayload` are defined once in `MealsEditor.tsx` (Task 8) and imported identically by `DietPlanCreate.tsx` (Task 8), `DietPresetCreate.tsx` (Task 9), and `DietPresetEdit.tsx` (Task 10) — no redefinitions. `_is_visible`/`_can_edit` (Task 3) are used with the same signature in every `PresetService` method that needs them (Tasks 4–5). `PresetResponse.meals: list[MealCreate]` (Task 2) matches what `_serialize_row` produces (Task 4) and what the frontend `DietPlanPreset.meals: PresetMeal[]` (Task 7) expects field-for-field.
- **No placeholders:** every step has complete, runnable code or an exact command with expected output.
