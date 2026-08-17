# Lembretes/Notificações + Caixa de Entrada Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add reminders (custom, scheduled, recurring) and a unified inbox (reminders fired + system events + chat summary) to the NutriCare backend and frontend, per `docs/superpowers/specs/2026-08-17-lembretes-notificacoes-design.md`.

**Architecture:** Two new FastAPI routers (`/reminders`, `/notifications`) backed by three new Supabase tables. A "lazy tick" recalculates due reminders and materializes notification rows on every poll — no background worker. Chat unread messages are summarized live into the feed, not persisted as notification rows. Frontend polls the same way the existing chat unread-counter does (`useUnreadMessages` pattern), with three new pages: Inbox, Reminders, Notification Settings.

**Tech Stack:** FastAPI, Pydantic, Supabase (Postgres via `supabase-py`), pytest (new dev dependency). React 19 + TypeScript + Vite, axios, react-router-dom, Tailwind, lucide-react icons.

---

## Before you start

- Branch: `old-9d6c33c` (already checked out). Work happens here.
- Backend venv already exists at `backend/.venv`. Activate with `backend\.venv\Scripts\activate` before running Python/pytest commands.
- All backend services in this codebase call `supabase_admin` (service-role client) directly — there is no repository/DAO abstraction and no existing DB-mocking test setup. This plan follows that pattern: automated tests cover the **pure recurrence-calculation logic only** (no I/O, fully testable). Everything that touches Supabase is verified manually with the commands given in Task 13 — introducing a mocking framework solely for this feature would be new infrastructure not used anywhere else in the codebase.
- Reminder times (`fixed_times`, `window_start`/`window_end`) are treated as **naive local wall-clock strings**, matching how `meals.scheduled_time` already works elsewhere in this codebase (plain `"HH:MM"` string, no timezone attached). `next_fire_at` is stored as a plain `timestamp` (no timezone) column for the same reason — this avoids pulling in `zoneinfo`/`tzdata` for a MVP feature. This is called out explicitly so nobody "fixes" it into a UTC conversion without realizing the rest of the app doesn't have timezone handling either.
- Weekday convention: Python's `date.weekday()` — Monday=0 … Sunday=6. `days_of_week` is a list of these integers.

---

## Part A — Backend: recurrence engine (TDD)

### Task 1: Recurrence calculator — fixed_times mode

**Files:**
- Create: `backend/requirements.txt` (add `pytest`)
- Create: `backend/pytest.ini`
- Create: `backend/tests/__init__.py`
- Create: `backend/tests/test_recurrence.py`
- Create: `backend/app/services/recurrence.py`

- [ ] **Step 1: Add pytest to requirements and install it**

Append to `backend/requirements.txt`:
```
pytest
```

Run:
```bash
backend\.venv\Scripts\pip install pytest
```
Expected: `Successfully installed pytest-...`

- [ ] **Step 2: Add pytest config so `app` imports resolve**

Create `backend/pytest.ini`:
```ini
[pytest]
pythonpath = .
```

- [ ] **Step 3: Create the tests package**

Create `backend/tests/__init__.py` (empty file).

- [ ] **Step 4: Write the failing test for fixed_times same-day**

Create `backend/tests/test_recurrence.py`:
```python
from datetime import datetime

from app.services.recurrence import compute_next_fire_at

ALL_DAYS = [0, 1, 2, 3, 4, 5, 6]


def test_fixed_times_returns_next_time_same_day():
    after = datetime(2026, 8, 17, 7, 0)  # Monday 07:00
    result = compute_next_fire_at(
        recurrence_type="fixed_times",
        fixed_times=["08:00", "12:00", "19:00"],
        interval_hours=None,
        window_start=None,
        window_end=None,
        days_of_week=ALL_DAYS,
        after=after,
    )
    assert result == datetime(2026, 8, 17, 8, 0)


def test_fixed_times_rolls_to_next_day_when_all_times_passed():
    after = datetime(2026, 8, 17, 20, 0)  # Monday, after 19:00
    result = compute_next_fire_at(
        recurrence_type="fixed_times",
        fixed_times=["08:00", "12:00", "19:00"],
        interval_hours=None,
        window_start=None,
        window_end=None,
        days_of_week=ALL_DAYS,
        after=after,
    )
    assert result == datetime(2026, 8, 18, 8, 0)


def test_fixed_times_respects_days_of_week():
    after = datetime(2026, 8, 17, 20, 0)  # Monday
    result = compute_next_fire_at(
        recurrence_type="fixed_times",
        fixed_times=["08:00"],
        interval_hours=None,
        window_start=None,
        window_end=None,
        days_of_week=[2],  # Wednesday only
        after=after,
    )
    assert result == datetime(2026, 8, 19, 8, 0)
```

- [ ] **Step 5: Run the tests and verify they fail**

Run:
```bash
backend\.venv\Scripts\python -m pytest backend/tests/test_recurrence.py -v
```
Expected: `ModuleNotFoundError: No module named 'app.services.recurrence'` (or collection error) — the module doesn't exist yet.

- [ ] **Step 6: Implement `compute_next_fire_at` for `fixed_times`**

Create `backend/app/services/recurrence.py`:
```python
from datetime import datetime, timedelta


def compute_next_fire_at(
    recurrence_type: str,
    fixed_times: list[str] | None,
    interval_hours: float | None,
    window_start: str | None,
    window_end: str | None,
    days_of_week: list[int],
    after: datetime,
) -> datetime:
    """
    Returns the next datetime (naive, local wall-clock) strictly after `after`
    at which this reminder should fire, given its recurrence rule.

    Searches up to 8 days ahead so it always finds an answer even when every
    slot on the current day has already passed.
    """
    if recurrence_type == "fixed_times":
        return _next_fixed_time(fixed_times or [], days_of_week, after)
    if recurrence_type == "interval":
        return _next_interval_time(
            interval_hours or 0, window_start, window_end, days_of_week, after
        )
    raise ValueError(f"recurrence_type inválido: {recurrence_type}")


def _next_fixed_time(
    fixed_times: list[str], days_of_week: list[int], after: datetime
) -> datetime:
    sorted_times = sorted(_parse_hhmm(t) for t in fixed_times)
    for day_offset in range(8):
        candidate_date = (after + timedelta(days=day_offset)).date()
        if candidate_date.weekday() not in days_of_week:
            continue
        for hour, minute in sorted_times:
            candidate = datetime(
                candidate_date.year, candidate_date.month, candidate_date.day,
                hour, minute,
            )
            if candidate > after:
                return candidate
    raise ValueError("Não foi possível calcular o próximo horário (fixed_times vazio?).")


def _next_interval_time(
    interval_hours: float,
    window_start: str | None,
    window_end: str | None,
    days_of_week: list[int],
    after: datetime,
) -> datetime:
    start_h, start_m = _parse_hhmm(window_start or "00:00")
    end_h, end_m = _parse_hhmm(window_end or "23:59")
    step = timedelta(hours=interval_hours)

    for day_offset in range(8):
        candidate_date = (after + timedelta(days=day_offset)).date()
        if candidate_date.weekday() not in days_of_week:
            continue
        window_start_dt = datetime(
            candidate_date.year, candidate_date.month, candidate_date.day, start_h, start_m
        )
        window_end_dt = datetime(
            candidate_date.year, candidate_date.month, candidate_date.day, end_h, end_m
        )
        candidate = window_start_dt
        while candidate <= window_end_dt:
            if candidate > after:
                return candidate
            candidate += step
    raise ValueError("Não foi possível calcular o próximo horário (janela/intervalo inválidos).")


def _parse_hhmm(value: str) -> tuple[int, int]:
    hour_str, minute_str = value.split(":")
    return int(hour_str), int(minute_str)
```

- [ ] **Step 7: Run the tests and verify they pass**

Run:
```bash
backend\.venv\Scripts\python -m pytest backend/tests/test_recurrence.py -v
```
Expected: `3 passed`

- [ ] **Step 8: Commit**

```bash
git add backend/requirements.txt backend/pytest.ini backend/tests/__init__.py backend/tests/test_recurrence.py backend/app/services/recurrence.py
git commit -m "feat(backend): add recurrence calculator for fixed_times reminders"
```

---

### Task 2: Recurrence calculator — interval mode

**Files:**
- Modify: `backend/tests/test_recurrence.py`
- Modify: `backend/app/services/recurrence.py` (no changes expected — this task only adds coverage; if it fails, fix `_next_interval_time`)

- [ ] **Step 1: Write the failing tests for interval mode**

Append to `backend/tests/test_recurrence.py`:
```python
def test_interval_returns_next_slot_within_window():
    after = datetime(2026, 8, 17, 9, 30)
    result = compute_next_fire_at(
        recurrence_type="interval",
        fixed_times=None,
        interval_hours=2,
        window_start="08:00",
        window_end="20:00",
        days_of_week=ALL_DAYS,
        after=after,
    )
    assert result == datetime(2026, 8, 17, 10, 0)


def test_interval_rolls_to_next_day_after_window_closes():
    after = datetime(2026, 8, 17, 20, 0)  # exactly window_end
    result = compute_next_fire_at(
        recurrence_type="interval",
        fixed_times=None,
        interval_hours=2,
        window_start="08:00",
        window_end="20:00",
        days_of_week=ALL_DAYS,
        after=after,
    )
    assert result == datetime(2026, 8, 18, 8, 0)


def test_interval_respects_days_of_week():
    after = datetime(2026, 8, 17, 20, 0)  # Monday, window closed
    result = compute_next_fire_at(
        recurrence_type="interval",
        fixed_times=None,
        interval_hours=2,
        window_start="08:00",
        window_end="20:00",
        days_of_week=[2],  # Wednesday only
        after=after,
    )
    assert result == datetime(2026, 8, 19, 8, 0)
```

- [ ] **Step 2: Run the tests**

Run:
```bash
backend\.venv\Scripts\python -m pytest backend/tests/test_recurrence.py -v
```
Expected: `6 passed` (the interval implementation was already written in Task 1, this task just proves it). If any interval test fails, fix `_next_interval_time` in `backend/app/services/recurrence.py` until all 6 pass.

- [ ] **Step 3: Commit**

```bash
git add backend/tests/test_recurrence.py
git commit -m "test(backend): cover interval-mode recurrence calculation"
```

---

## Part B — Backend: database tables (manual step)

### Task 3: Create the Supabase tables

**Files:** none in the repo — this is a manual step against the Supabase project referenced in `backend/.env`. There is no migrations folder in this codebase (existing tables like `care_links`/`messages` were also created directly in Supabase), so this plan follows the same convention.

- [ ] **Step 1: Run this SQL in the Supabase SQL Editor for the project configured in `backend/.env`**

```sql
create table if not exists reminders (
    id serial primary key,
    patient_id uuid not null references profiles(id) on delete cascade,
    created_by uuid not null references profiles(id) on delete cascade,
    care_link_id integer references care_links(id) on delete cascade,
    category text not null,
    title text not null,
    message text,
    recurrence_type text not null,
    fixed_times jsonb,
    interval_hours numeric,
    window_start text,
    window_end text,
    days_of_week jsonb not null default '[0,1,2,3,4,5,6]',
    is_active boolean not null default true,
    next_fire_at timestamp,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create table if not exists notifications (
    id serial primary key,
    recipient_id uuid not null references profiles(id) on delete cascade,
    type text not null,
    title text not null,
    body text,
    reference_id integer,
    read_at timestamptz,
    created_at timestamptz not null default now()
);

create table if not exists notification_preferences (
    user_id uuid primary key references profiles(id) on delete cascade,
    reminders_enabled boolean not null default true,
    chat_enabled boolean not null default true,
    system_enabled boolean not null default true,
    quiet_hours_start text,
    quiet_hours_end text,
    updated_at timestamptz not null default now()
);

create index if not exists idx_reminders_patient_due on reminders (patient_id, is_active, next_fire_at);
create index if not exists idx_notifications_recipient on notifications (recipient_id, read_at);
```

- [ ] **Step 2: Verify the tables exist**

In the Supabase Table Editor, confirm `reminders`, `notifications`, and `notification_preferences` appear with the columns above.

- [ ] **Step 3: Match Row Level Security to the existing tables**

Check how `care_links` and `messages` are configured for RLS (Table Editor → the table → RLS toggle/policies). All backend queries use the service-role client (`supabase_admin`), which bypasses RLS, so this step is about keeping the new tables consistent with the project's existing security posture, not about unblocking the API. Apply whatever RLS setting `care_links` already uses (enabled-with-service-role-bypass, or disabled) to the three new tables.

No commit for this task (no repo files changed).

---

## Part C — Backend: reminders CRUD

### Task 4: Reminder schemas

**Files:**
- Create: `backend/app/schemas/reminder.py`

- [ ] **Step 1: Create the schema file**

Create `backend/app/schemas/reminder.py`:
```python
from pydantic import BaseModel


class ReminderCreate(BaseModel):
    care_link_id: int | None = None
    category: str
    title: str
    message: str | None = None
    recurrence_type: str
    fixed_times: list[str] | None = None
    interval_hours: float | None = None
    window_start: str | None = None
    window_end: str | None = None
    days_of_week: list[int] = [0, 1, 2, 3, 4, 5, 6]


class ReminderUpdate(BaseModel):
    category: str | None = None
    title: str | None = None
    message: str | None = None
    recurrence_type: str | None = None
    fixed_times: list[str] | None = None
    interval_hours: float | None = None
    window_start: str | None = None
    window_end: str | None = None
    days_of_week: list[int] | None = None
    is_active: bool | None = None


class ReminderResponse(BaseModel):
    id: int
    patient_id: str
    created_by: str
    care_link_id: int | None = None
    category: str
    title: str
    message: str | None = None
    recurrence_type: str
    fixed_times: list[str] | None = None
    interval_hours: float | None = None
    window_start: str | None = None
    window_end: str | None = None
    days_of_week: list[int]
    is_active: bool
    next_fire_at: str | None = None
    created_at: str
    updated_at: str
```

- [ ] **Step 2: Commit**

```bash
git add backend/app/schemas/reminder.py
git commit -m "feat(backend): add reminder pydantic schemas"
```

---

### Task 5: Reminder service (CRUD + permissions)

**Files:**
- Create: `backend/app/services/reminder_service.py`

- [ ] **Step 1: Create the service**

Create `backend/app/services/reminder_service.py`:
```python
from datetime import datetime
from typing import Any

from fastapi import HTTPException, status

from app.core.supabase import supabase_admin
from app.schemas.reminder import ReminderCreate, ReminderUpdate
from app.services.recurrence import compute_next_fire_at

ALL_DAYS = [0, 1, 2, 3, 4, 5, 6]


class ReminderService:
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
    def _get_role(user_id: str) -> str | None:
        resp = (
            supabase_admin.table("profiles")
            .select("role")
            .eq("id", user_id)
            .limit(1)
            .execute()
        )
        rows = resp.data or []
        return rows[0].get("role") if rows else None

    @staticmethod
    def _validate_recurrence(payload: ReminderCreate | dict) -> None:
        get = payload.get if isinstance(payload, dict) else lambda k: getattr(payload, k)
        recurrence_type = get("recurrence_type")
        if recurrence_type == "fixed_times":
            if not get("fixed_times"):
                raise HTTPException(
                    status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                    detail="fixed_times não pode ser vazio para recurrence_type='fixed_times'.",
                )
        elif recurrence_type == "interval":
            if not get("interval_hours") or not get("window_start") or not get("window_end"):
                raise HTTPException(
                    status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                    detail="interval_hours, window_start e window_end são obrigatórios para recurrence_type='interval'.",
                )
        else:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="recurrence_type deve ser 'fixed_times' ou 'interval'.",
            )

    @staticmethod
    def create(current_user: Any, payload: ReminderCreate) -> dict:
        user_id = ReminderService._get_user_id(current_user)
        role = ReminderService._get_role(user_id)
        ReminderService._validate_recurrence(payload)

        if role == "nutritionist":
            if not payload.care_link_id:
                raise HTTPException(
                    status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                    detail="care_link_id é obrigatório para nutricionista criar lembrete.",
                )
            link_resp = (
                supabase_admin.table("care_links")
                .select("patient_id")
                .eq("id", payload.care_link_id)
                .eq("nutritionist_id", user_id)
                .eq("status", "active")
                .limit(1)
                .execute()
            )
            rows = link_resp.data or []
            if not rows:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Vínculo não encontrado ou inativo.",
                )
            patient_id = rows[0]["patient_id"]
            care_link_id = payload.care_link_id
        else:
            patient_id = user_id
            care_link_id = None

        now = datetime.now()
        next_fire = compute_next_fire_at(
            recurrence_type=payload.recurrence_type,
            fixed_times=payload.fixed_times,
            interval_hours=payload.interval_hours,
            window_start=payload.window_start,
            window_end=payload.window_end,
            days_of_week=payload.days_of_week or ALL_DAYS,
            after=now,
        )

        resp = (
            supabase_admin.table("reminders")
            .insert({
                "patient_id": patient_id,
                "created_by": user_id,
                "care_link_id": care_link_id,
                "category": payload.category,
                "title": payload.title,
                "message": payload.message,
                "recurrence_type": payload.recurrence_type,
                "fixed_times": payload.fixed_times,
                "interval_hours": payload.interval_hours,
                "window_start": payload.window_start,
                "window_end": payload.window_end,
                "days_of_week": payload.days_of_week or ALL_DAYS,
                "is_active": True,
                "next_fire_at": next_fire.isoformat(),
            })
            .execute()
        )
        rows = resp.data or []
        if not rows:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Falha ao criar lembrete.",
            )
        return rows[0]

    @staticmethod
    def list_for_patient(current_user: Any, patient_id: str | None) -> list[dict]:
        user_id = ReminderService._get_user_id(current_user)
        role = ReminderService._get_role(user_id)

        if role == "nutritionist":
            if not patient_id:
                raise HTTPException(
                    status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                    detail="patient_id é obrigatório para nutricionista listar lembretes.",
                )
            link_resp = (
                supabase_admin.table("care_links")
                .select("id")
                .eq("nutritionist_id", user_id)
                .eq("patient_id", patient_id)
                .eq("status", "active")
                .limit(1)
                .execute()
            )
            if not (link_resp.data or []):
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Você não tem vínculo ativo com este paciente.",
                )
            target_patient_id = patient_id
        else:
            target_patient_id = user_id

        resp = (
            supabase_admin.table("reminders")
            .select("*")
            .eq("patient_id", target_patient_id)
            .order("created_at", desc=True)
            .execute()
        )
        return resp.data or []

    @staticmethod
    def _get_reminder_or_404_for_user(reminder_id: int, user_id: str, role: str | None) -> dict:
        resp = (
            supabase_admin.table("reminders")
            .select("*")
            .eq("id", reminder_id)
            .limit(1)
            .execute()
        )
        rows = resp.data or []
        if not rows:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Lembrete não encontrado.",
            )
        reminder = rows[0]

        if role == "patient":
            if reminder["patient_id"] != user_id:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Você não pode acessar este lembrete.",
                )
            return reminder

        # nutritionist: must be the creator via an active care_link to that patient
        care_link_id = reminder.get("care_link_id")
        if not care_link_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Você não pode acessar este lembrete.",
            )
        link_resp = (
            supabase_admin.table("care_links")
            .select("id")
            .eq("id", care_link_id)
            .eq("nutritionist_id", user_id)
            .eq("status", "active")
            .limit(1)
            .execute()
        )
        if not (link_resp.data or []):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Você não pode acessar este lembrete.",
            )
        return reminder

    @staticmethod
    def update(current_user: Any, reminder_id: int, payload: ReminderUpdate) -> dict:
        user_id = ReminderService._get_user_id(current_user)
        role = ReminderService._get_role(user_id)
        reminder = ReminderService._get_reminder_or_404_for_user(reminder_id, user_id, role)

        update_data = payload.model_dump(exclude_none=True)
        if not update_data:
            return reminder

        merged = {**reminder, **update_data}
        recurrence_fields = (
            "recurrence_type", "fixed_times", "interval_hours",
            "window_start", "window_end", "days_of_week",
        )
        if any(field in update_data for field in recurrence_fields):
            ReminderService._validate_recurrence(merged)
            next_fire = compute_next_fire_at(
                recurrence_type=merged["recurrence_type"],
                fixed_times=merged.get("fixed_times"),
                interval_hours=merged.get("interval_hours"),
                window_start=merged.get("window_start"),
                window_end=merged.get("window_end"),
                days_of_week=merged.get("days_of_week") or ALL_DAYS,
                after=datetime.now(),
            )
            update_data["next_fire_at"] = next_fire.isoformat()

        resp = (
            supabase_admin.table("reminders")
            .update(update_data)
            .eq("id", reminder_id)
            .execute()
        )
        rows = resp.data or []
        if not rows:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Falha ao atualizar lembrete.",
            )
        return rows[0]

    @staticmethod
    def delete(current_user: Any, reminder_id: int) -> dict:
        user_id = ReminderService._get_user_id(current_user)
        role = ReminderService._get_role(user_id)
        ReminderService._get_reminder_or_404_for_user(reminder_id, user_id, role)
        supabase_admin.table("reminders").delete().eq("id", reminder_id).execute()
        return {"ok": True}
```

- [ ] **Step 2: Sanity-check the module imports cleanly**

Run:
```bash
backend\.venv\Scripts\python -c "from app.services.reminder_service import ReminderService; print('ok')"
```
Expected: `ok`

- [ ] **Step 3: Commit**

```bash
git add backend/app/services/reminder_service.py
git commit -m "feat(backend): add ReminderService with CRUD and care_link-based permissions"
```

---

### Task 6: Reminder routes

**Files:**
- Create: `backend/app/api/routes/reminder.py`
- Modify: `backend/app/main.py`

- [ ] **Step 1: Create the router**

Create `backend/app/api/routes/reminder.py`:
```python
from typing import Annotated, Any

from fastapi import APIRouter, Depends, status

from app.api.deps import get_current_user
from app.schemas.reminder import ReminderCreate, ReminderResponse, ReminderUpdate
from app.services.reminder_service import ReminderService

router = APIRouter(prefix="/reminders", tags=["reminders"])


@router.get("", response_model=list[ReminderResponse])
def list_reminders(
    current_user: Annotated[Any, Depends(get_current_user)],
    patient_id: str | None = None,
):
    return ReminderService.list_for_patient(current_user, patient_id)


@router.post("", response_model=ReminderResponse, status_code=status.HTTP_201_CREATED)
def create_reminder(
    payload: ReminderCreate,
    current_user: Annotated[Any, Depends(get_current_user)],
):
    return ReminderService.create(current_user, payload)


@router.put("/{reminder_id}", response_model=ReminderResponse)
def update_reminder(
    reminder_id: int,
    payload: ReminderUpdate,
    current_user: Annotated[Any, Depends(get_current_user)],
):
    return ReminderService.update(current_user, reminder_id, payload)


@router.delete("/{reminder_id}", response_model=dict)
def delete_reminder(
    reminder_id: int,
    current_user: Annotated[Any, Depends(get_current_user)],
):
    return ReminderService.delete(current_user, reminder_id)
```

- [ ] **Step 2: Register the router in `main.py`**

Modify `backend/app/main.py` — add the import next to the other route imports:
```python
from app.api.routes.profile import router as profile_router
from app.api.routes.reminder import router as reminder_router
```

And register it next to the other `include_router` calls:
```python
app.include_router(diet_router, prefix=settings.API_V1_PREFIX)
app.include_router(message_router, prefix=settings.API_V1_PREFIX)
app.include_router(reminder_router, prefix=settings.API_V1_PREFIX)
```

- [ ] **Step 3: Verify the app starts and the routes are registered**

Run:
```bash
backend\.venv\Scripts\python -c "from app.main import app; print([r.path for r in app.routes if 'reminders' in r.path])"
```
Expected: a list containing `/api/v1/reminders` and `/api/v1/reminders/{reminder_id}`.

- [ ] **Step 4: Commit**

```bash
git add backend/app/api/routes/reminder.py backend/app/main.py
git commit -m "feat(backend): expose /reminders CRUD endpoints"
```

---

## Part D — Backend: notifications + inbox

### Task 7: Notification schemas

**Files:**
- Create: `backend/app/schemas/notification.py`

- [ ] **Step 1: Create the schema file**

Create `backend/app/schemas/notification.py`:
```python
from pydantic import BaseModel


class NotificationResponse(BaseModel):
    id: int | str
    type: str
    title: str
    body: str | None = None
    reference_id: int | None = None
    read_at: str | None = None
    created_at: str


class NotificationPreferencesResponse(BaseModel):
    user_id: str
    reminders_enabled: bool
    chat_enabled: bool
    system_enabled: bool
    quiet_hours_start: str | None = None
    quiet_hours_end: str | None = None


class NotificationPreferencesUpdate(BaseModel):
    reminders_enabled: bool | None = None
    chat_enabled: bool | None = None
    system_enabled: bool | None = None
    quiet_hours_start: str | None = None
    quiet_hours_end: str | None = None
```

`id` is `int | str` because persisted notifications use the integer `notifications.id`, while live chat-summary entries are synthesized with a string id like `"chat-42"` (see Task 8).

- [ ] **Step 2: Commit**

```bash
git add backend/app/schemas/notification.py
git commit -m "feat(backend): add notification pydantic schemas"
```

---

### Task 8: Notification service — tick, feed, preferences

**Files:**
- Create: `backend/app/services/notification_service.py`

- [ ] **Step 1: Create the service**

Create `backend/app/services/notification_service.py`:
```python
from datetime import datetime, timezone
from typing import Any

from fastapi import HTTPException, status

from app.core.supabase import supabase_admin
from app.schemas.notification import NotificationPreferencesUpdate
from app.services.message_service import MessageService
from app.services.recurrence import compute_next_fire_at

ALL_DAYS = [0, 1, 2, 3, 4, 5, 6]


class NotificationService:
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
    def _get_or_create_preferences(user_id: str) -> dict:
        resp = (
            supabase_admin.table("notification_preferences")
            .select("*")
            .eq("user_id", user_id)
            .limit(1)
            .execute()
        )
        rows = resp.data or []
        if rows:
            return rows[0]
        insert_resp = (
            supabase_admin.table("notification_preferences")
            .insert({"user_id": user_id})
            .execute()
        )
        return (insert_resp.data or [{}])[0]

    @staticmethod
    def _in_quiet_hours(now: datetime, prefs: dict) -> bool:
        start = prefs.get("quiet_hours_start")
        end = prefs.get("quiet_hours_end")
        if not start or not end:
            return False
        start_h, start_m = (int(p) for p in start.split(":"))
        end_h, end_m = (int(p) for p in end.split(":"))
        start_t = now.replace(hour=start_h, minute=start_m, second=0, microsecond=0).time()
        end_t = now.replace(hour=end_h, minute=end_m, second=0, microsecond=0).time()
        now_t = now.time()
        if start_t <= end_t:
            return start_t <= now_t < end_t
        return now_t >= start_t or now_t < end_t  # window crosses midnight

    @staticmethod
    def tick_due_reminders(current_user: Any) -> None:
        """Materialize notifications for any due reminder belonging to the current user, then reschedule it."""
        user_id = NotificationService._get_user_id(current_user)
        now = datetime.now()

        resp = (
            supabase_admin.table("reminders")
            .select("*")
            .eq("patient_id", user_id)
            .eq("is_active", True)
            .lte("next_fire_at", now.isoformat())
            .execute()
        )
        due = resp.data or []
        if not due:
            return

        prefs = NotificationService._get_or_create_preferences(user_id)

        for reminder in due:
            try:
                if prefs.get("reminders_enabled", True) and not NotificationService._in_quiet_hours(now, prefs):
                    supabase_admin.table("notifications").insert({
                        "recipient_id": user_id,
                        "type": "reminder",
                        "title": reminder["title"],
                        "body": reminder.get("message"),
                        "reference_id": reminder["id"],
                    }).execute()

                next_fire = compute_next_fire_at(
                    recurrence_type=reminder["recurrence_type"],
                    fixed_times=reminder.get("fixed_times"),
                    interval_hours=reminder.get("interval_hours"),
                    window_start=reminder.get("window_start"),
                    window_end=reminder.get("window_end"),
                    days_of_week=reminder.get("days_of_week") or ALL_DAYS,
                    after=now,
                )
                supabase_admin.table("reminders").update(
                    {"next_fire_at": next_fire.isoformat()}
                ).eq("id", reminder["id"]).execute()
            except Exception:
                # one broken reminder must not block the others
                continue

    @staticmethod
    def _build_chat_summaries(current_user: Any) -> list[dict]:
        links = MessageService.list_care_links(current_user)
        if not links:
            return []
        user_id = NotificationService._get_user_id(current_user)
        link_ids = [link["id"] for link in links]

        resp = (
            supabase_admin.table("messages")
            .select("care_link_id, sent_at")
            .in_("care_link_id", link_ids)
            .neq("sender_id", user_id)
            .is_("read_at", "null")
            .eq("is_deleted", False)
            .order("sent_at", desc=True)
            .execute()
        )
        by_link: dict[int, dict] = {}
        for row in resp.data or []:
            link_id = row["care_link_id"]
            if link_id not in by_link:
                by_link[link_id] = {"count": 0, "last_sent_at": row["sent_at"]}
            by_link[link_id]["count"] += 1

        link_by_id = {link["id"]: link for link in links}
        summaries = []
        for link_id, info in by_link.items():
            link = link_by_id.get(link_id)
            if not link:
                continue
            other_name = link.get("other_username") or "usuário"
            plural = "mensagens" if info["count"] > 1 else "mensagem"
            summaries.append({
                "id": f"chat-{link_id}",
                "type": "chat_summary",
                "title": f"{info['count']} nova(s) {plural} de {other_name}",
                "body": None,
                "reference_id": link_id,
                "read_at": None,
                "created_at": info["last_sent_at"],
            })
        return summaries

    @staticmethod
    def list_feed(current_user: Any, limit: int = 50) -> list[dict]:
        NotificationService.tick_due_reminders(current_user)
        user_id = NotificationService._get_user_id(current_user)

        notif_resp = (
            supabase_admin.table("notifications")
            .select("*")
            .eq("recipient_id", user_id)
            .order("created_at", desc=True)
            .limit(limit)
            .execute()
        )
        entries = list(notif_resp.data or [])
        entries.extend(NotificationService._build_chat_summaries(current_user))
        entries.sort(key=lambda e: e["created_at"], reverse=True)
        return entries[:limit]

    @staticmethod
    def get_unread_counts(current_user: Any) -> dict:
        NotificationService.tick_due_reminders(current_user)
        user_id = NotificationService._get_user_id(current_user)

        resp = (
            supabase_admin.table("notifications")
            .select("id", count="exact")
            .eq("recipient_id", user_id)
            .is_("read_at", "null")
            .execute()
        )
        persisted_unread = resp.count or 0
        chat_conversations_with_unread = len(NotificationService._build_chat_summaries(current_user))
        return {"total": persisted_unread + chat_conversations_with_unread}

    @staticmethod
    def mark_read(current_user: Any, notification_id: int) -> dict:
        user_id = NotificationService._get_user_id(current_user)
        now = datetime.now(timezone.utc).isoformat()
        resp = (
            supabase_admin.table("notifications")
            .update({"read_at": now})
            .eq("id", notification_id)
            .eq("recipient_id", user_id)
            .execute()
        )
        rows = resp.data or []
        if not rows:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Notificação não encontrada.",
            )
        return rows[0]

    @staticmethod
    def mark_all_read(current_user: Any) -> dict:
        user_id = NotificationService._get_user_id(current_user)
        now = datetime.now(timezone.utc).isoformat()
        supabase_admin.table("notifications").update({"read_at": now}).eq(
            "recipient_id", user_id
        ).is_("read_at", "null").execute()
        return {"ok": True}

    @staticmethod
    def get_preferences(current_user: Any) -> dict:
        user_id = NotificationService._get_user_id(current_user)
        return NotificationService._get_or_create_preferences(user_id)

    @staticmethod
    def update_preferences(current_user: Any, payload: NotificationPreferencesUpdate) -> dict:
        user_id = NotificationService._get_user_id(current_user)
        NotificationService._get_or_create_preferences(user_id)

        update_data = payload.model_dump(exclude_none=True)
        if not update_data:
            return NotificationService._get_or_create_preferences(user_id)

        resp = (
            supabase_admin.table("notification_preferences")
            .update(update_data)
            .eq("user_id", user_id)
            .execute()
        )
        rows = resp.data or []
        if not rows:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Falha ao atualizar preferências.",
            )
        return rows[0]

    # --- system-event notifications, called from other services ---

    @staticmethod
    def _create_system_notification(
        recipient_id: str, notification_type: str, title: str, body: str, reference_id: int
    ) -> None:
        prefs = NotificationService._get_or_create_preferences(recipient_id)
        if not prefs.get("system_enabled", True):
            return
        supabase_admin.table("notifications").insert({
            "recipient_id": recipient_id,
            "type": notification_type,
            "title": title,
            "body": body,
            "reference_id": reference_id,
        }).execute()

    @staticmethod
    def notify_invite_sent(patient_id: str, nutritionist_username: str | None, care_link_id: int) -> None:
        NotificationService._create_system_notification(
            recipient_id=patient_id,
            notification_type="invite",
            title="Novo convite de vínculo",
            body=f"{nutritionist_username or 'Um nutricionista'} quer se conectar com você.",
            reference_id=care_link_id,
        )

    @staticmethod
    def notify_invite_response(
        nutritionist_id: str, patient_username: str | None, accepted: bool, care_link_id: int
    ) -> None:
        action = "aceitou" if accepted else "recusou"
        NotificationService._create_system_notification(
            recipient_id=nutritionist_id,
            notification_type="invite",
            title="Resposta ao convite",
            body=f"{patient_username or 'O paciente'} {action} seu convite de vínculo.",
            reference_id=care_link_id,
        )

    @staticmethod
    def notify_diet_plan_assigned(care_link_id: int, plan_title: str, plan_id: int) -> None:
        link_resp = (
            supabase_admin.table("care_links")
            .select("patient_id")
            .eq("id", care_link_id)
            .limit(1)
            .execute()
        )
        rows = link_resp.data or []
        if not rows:
            return
        NotificationService._create_system_notification(
            recipient_id=rows[0]["patient_id"],
            notification_type="diet_plan_assigned",
            title="Novo plano alimentar",
            body=f'Seu nutricionista atribuiu o plano "{plan_title}".',
            reference_id=plan_id,
        )
```

- [ ] **Step 2: Sanity-check the module imports cleanly**

Run:
```bash
backend\.venv\Scripts\python -c "from app.services.notification_service import NotificationService; print('ok')"
```
Expected: `ok`

- [ ] **Step 3: Commit**

```bash
git add backend/app/services/notification_service.py
git commit -m "feat(backend): add NotificationService with lazy tick, feed, preferences"
```

---

### Task 9: Notification routes

**Files:**
- Create: `backend/app/api/routes/notification.py`
- Modify: `backend/app/main.py`

- [ ] **Step 1: Create the router**

Create `backend/app/api/routes/notification.py`:
```python
from typing import Annotated, Any

from fastapi import APIRouter, Depends

from app.api.deps import get_current_user
from app.schemas.notification import (
    NotificationPreferencesResponse,
    NotificationPreferencesUpdate,
    NotificationResponse,
)
from app.services.notification_service import NotificationService

router = APIRouter(prefix="/notifications", tags=["notifications"])


@router.get("", response_model=list[NotificationResponse])
def list_notifications(current_user: Annotated[Any, Depends(get_current_user)]):
    return NotificationService.list_feed(current_user)


@router.get("/unread-counts", response_model=dict)
def get_unread_counts(current_user: Annotated[Any, Depends(get_current_user)]):
    return NotificationService.get_unread_counts(current_user)


@router.post("/{notification_id}/read", response_model=dict)
def mark_read(
    notification_id: int,
    current_user: Annotated[Any, Depends(get_current_user)],
):
    return NotificationService.mark_read(current_user, notification_id)


@router.post("/read-all", response_model=dict)
def mark_all_read(current_user: Annotated[Any, Depends(get_current_user)]):
    return NotificationService.mark_all_read(current_user)


@router.get("/preferences", response_model=NotificationPreferencesResponse)
def get_preferences(current_user: Annotated[Any, Depends(get_current_user)]):
    return NotificationService.get_preferences(current_user)


@router.put("/preferences", response_model=NotificationPreferencesResponse)
def update_preferences(
    payload: NotificationPreferencesUpdate,
    current_user: Annotated[Any, Depends(get_current_user)],
):
    return NotificationService.update_preferences(current_user, payload)
```

- [ ] **Step 2: Register the router in `main.py`**

Modify `backend/app/main.py` — add the import:
```python
from app.api.routes.notification import router as notification_router
```

And register it:
```python
app.include_router(reminder_router, prefix=settings.API_V1_PREFIX)
app.include_router(notification_router, prefix=settings.API_V1_PREFIX)
```

- [ ] **Step 3: Verify the app starts and routes are registered**

Run:
```bash
backend\.venv\Scripts\python -c "from app.main import app; print([r.path for r in app.routes if 'notifications' in r.path])"
```
Expected: a list containing `/api/v1/notifications`, `/api/v1/notifications/unread-counts`, `/api/v1/notifications/{notification_id}/read`, `/api/v1/notifications/read-all`, `/api/v1/notifications/preferences`.

- [ ] **Step 4: Commit**

```bash
git add backend/app/api/routes/notification.py backend/app/main.py
git commit -m "feat(backend): expose /notifications inbox and preferences endpoints"
```

---

### Task 10: Wire system notifications into care_link invites

**Files:**
- Modify: `backend/app/services/care_link_service.py`

- [ ] **Step 1: Import NotificationService**

Add near the top of `backend/app/services/care_link_service.py`, after the existing `from app.core.supabase import supabase_admin` line:
```python
from app.services.notification_service import NotificationService
```

- [ ] **Step 2: Notify the patient when a nutritionist sends an invite**

In `create_link`, find this existing block:
```python
        link_status = "pending" if send_invitation else "active"
        link_resp = (
            supabase_admin.table("care_links")
            .insert({
                "nutritionist_id": user_id,
                "patient_id": patient_id,
                "status": link_status,
            })
            .execute()
        )
        link = (link_resp.data or [])[0]
        link["patient_username"] = patient_rows[0].get("username")
        return link
```

Replace it with:
```python
        link_status = "pending" if send_invitation else "active"
        link_resp = (
            supabase_admin.table("care_links")
            .insert({
                "nutritionist_id": user_id,
                "patient_id": patient_id,
                "status": link_status,
            })
            .execute()
        )
        link = (link_resp.data or [])[0]
        link["patient_username"] = patient_rows[0].get("username")

        if link_status == "pending":
            nutri_resp = (
                supabase_admin.table("profiles")
                .select("username")
                .eq("id", user_id)
                .limit(1)
                .execute()
            )
            nutri_username = (nutri_resp.data or [{}])[0].get("username")
            NotificationService.notify_invite_sent(patient_id, nutri_username, link["id"])

        return link
```

- [ ] **Step 3: Notify the nutritionist when the patient responds**

In `respond_invitation`, find this existing block:
```python
        resp = (
            supabase_admin.table("care_links")
            .select("*")
            .eq("id", link_id)
            .eq("patient_id", user_id)
            .eq("status", "pending")
            .limit(1)
            .execute()
        )
        if not (resp.data or []):
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Convite não encontrado ou já respondido.",
            )
        new_status = "active" if accept else "rejected"
        update_resp = (
            supabase_admin.table("care_links")
            .update({"status": new_status})
            .eq("id", link_id)
            .execute()
        )
        return (update_resp.data or [{}])[0]
```

Replace it with:
```python
        resp = (
            supabase_admin.table("care_links")
            .select("*")
            .eq("id", link_id)
            .eq("patient_id", user_id)
            .eq("status", "pending")
            .limit(1)
            .execute()
        )
        if not (resp.data or []):
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Convite não encontrado ou já respondido.",
            )
        link = resp.data[0]

        new_status = "active" if accept else "rejected"
        update_resp = (
            supabase_admin.table("care_links")
            .update({"status": new_status})
            .eq("id", link_id)
            .execute()
        )

        patient_resp = (
            supabase_admin.table("profiles")
            .select("username")
            .eq("id", user_id)
            .limit(1)
            .execute()
        )
        patient_username = (patient_resp.data or [{}])[0].get("username")
        NotificationService.notify_invite_response(
            link["nutritionist_id"], patient_username, accept, link_id
        )

        return (update_resp.data or [{}])[0]
```

- [ ] **Step 4: Sanity-check the module imports cleanly**

Run:
```bash
backend\.venv\Scripts\python -c "from app.services.care_link_service import CareLinkService; print('ok')"
```
Expected: `ok`

- [ ] **Step 5: Commit**

```bash
git add backend/app/services/care_link_service.py
git commit -m "feat(backend): notify patient/nutritionist on invite send and response"
```

---

### Task 11: Wire system notification into diet plan assignment

**Files:**
- Modify: `backend/app/services/diet_service.py`

- [ ] **Step 1: Import NotificationService**

Add near the top of `backend/app/services/diet_service.py`, after `from app.schemas.diet import ...`:
```python
from app.services.notification_service import NotificationService
```

- [ ] **Step 2: Notify on plan creation**

In `create_plan`, find:
```python
        plan_rows = plan_resp.data or []
        if not plan_rows:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Falha ao criar o plano alimentar.",
            )
        plan = plan_rows[0]
        plan_id = plan["id"]
```

Add right after `plan_id = plan["id"]`:
```python
        NotificationService.notify_diet_plan_assigned(payload.care_link_id, payload.title, plan_id)
```

- [ ] **Step 3: Notify on plan update**

In `update_plan`, find:
```python
        resp = (
            supabase_admin.table("diet_plans")
            .update(update_data)
            .eq("id", plan_id)
            .execute()
        )
        rows = resp.data or []
        if not rows:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Plano não encontrado para atualização.",
            )
        return DietService._build_full_plan(rows[0])
```

Replace with:
```python
        resp = (
            supabase_admin.table("diet_plans")
            .update(update_data)
            .eq("id", plan_id)
            .execute()
        )
        rows = resp.data or []
        if not rows:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Plano não encontrado para atualização.",
            )
        NotificationService.notify_diet_plan_assigned(
            rows[0]["care_link_id"], rows[0]["title"], plan_id
        )
        return DietService._build_full_plan(rows[0])
```

- [ ] **Step 4: Sanity-check the module imports cleanly**

Run:
```bash
backend\.venv\Scripts\python -c "from app.services.diet_service import DietService; print('ok')"
```
Expected: `ok`

- [ ] **Step 5: Commit**

```bash
git add backend/app/services/diet_service.py
git commit -m "feat(backend): notify patient when a diet plan is assigned or updated"
```

---

### Task 12: Manual end-to-end verification of the backend

**Files:** none — this is verification only, no code changes.

- [ ] **Step 1: Start the backend**

Run (in a separate terminal, keep it running):
```bash
cd backend
.venv\Scripts\activate
python -m uvicorn app.main:app --reload
```
Expected: `Uvicorn running on http://127.0.0.1:8000`

- [ ] **Step 2: Open the interactive docs**

Open `http://127.0.0.1:8000/docs` in a browser. Confirm the `reminders` and `notifications` tags appear with all the endpoints listed in Tasks 6 and 9.

- [ ] **Step 3: Log in as a test patient and get a bearer token**

Use an existing test account (or `/api/v1/auth/login`) to obtain an `access_token`. Use the "Authorize" button in `/docs` with `Bearer <token>`.

- [ ] **Step 4: Create a reminder due in the past, and confirm the tick fires it exactly once**

Via `/docs`, call `POST /api/v1/reminders` as a patient with:
```json
{
  "category": "water",
  "title": "Beba água",
  "recurrence_type": "interval",
  "interval_hours": 2,
  "window_start": "08:00",
  "window_end": "20:00",
  "days_of_week": [0, 1, 2, 3, 4, 5, 6]
}
```
Note the returned `id`. In the Supabase Table Editor, manually set that reminder's `next_fire_at` to a timestamp a few minutes in the past.

Call `GET /api/v1/notifications/unread-counts` twice in a row. Expected: `total` is `1` after the first call (the tick fired once and created a notification), and stays `1` after the second call (no duplicate — `next_fire_at` was already advanced to the future by the first tick). Confirm in the Supabase Table Editor that the `notifications` table has exactly one new row for this reminder.

- [ ] **Step 5: Confirm the inbox feed shows it and mark-as-read works**

Call `GET /api/v1/notifications`. Expected: the reminder notification from Step 4 appears with `type: "reminder"`. Call `POST /api/v1/notifications/{id}/read` with that id, then `GET /api/v1/notifications/unread-counts` again. Expected: `total` drops back to `0`.

No commit for this task (verification only).

---

## Part E — Frontend

### Task 13: Notification/reminder TypeScript types and polling hook

**Files:**
- Create: `frontend/src/notifications/types.ts`
- Create: `frontend/src/hooks/useNotifications.ts`

- [ ] **Step 1: Create the types file**

Create `frontend/src/notifications/types.ts`:
```typescript
export type NotificationType = "reminder" | "invite" | "diet_plan_assigned" | "chat_summary";

export type NotificationItem = {
  id: number | string;
  type: NotificationType;
  title: string;
  body: string | null;
  reference_id: number | null;
  read_at: string | null;
  created_at: string;
};

export type NotificationPreferences = {
  user_id: string;
  reminders_enabled: boolean;
  chat_enabled: boolean;
  system_enabled: boolean;
  quiet_hours_start: string | null;
  quiet_hours_end: string | null;
};

export type ReminderCategory = "meal" | "water" | "medication" | "custom";
export type RecurrenceType = "fixed_times" | "interval";

export type Reminder = {
  id: number;
  patient_id: string;
  created_by: string;
  care_link_id: number | null;
  category: ReminderCategory;
  title: string;
  message: string | null;
  recurrence_type: RecurrenceType;
  fixed_times: string[] | null;
  interval_hours: number | null;
  window_start: string | null;
  window_end: string | null;
  days_of_week: number[];
  is_active: boolean;
  next_fire_at: string | null;
  created_at: string;
  updated_at: string;
};
```

- [ ] **Step 2: Create the polling hook**

Create `frontend/src/hooks/useNotifications.ts` (mirrors the existing `frontend/src/hooks/useUnreadMessages.ts`):
```typescript
import { useEffect, useState } from "react";
import { api } from "../lib/api";
import { useAuth } from "../auth/useAuth";

type NotificationCounts = { total: number };

const POLL_MS = 30_000;

export function useNotificationCounts() {
  const { session } = useAuth();
  const [data, setData] = useState<NotificationCounts>({ total: 0 });

  useEffect(() => {
    if (!session) return;

    function fetchCounts() {
      api
        .get<NotificationCounts>("/notifications/unread-counts")
        .then((res) => setData(res.data))
        .catch(() => {});
    }

    fetchCounts();
    const id = setInterval(fetchCounts, POLL_MS);
    return () => clearInterval(id);
  }, [session]);

  return data;
}
```

- [ ] **Step 3: Type-check the new files**

Run:
```bash
cd frontend
npx tsc --noEmit
```
Expected: no errors referencing the two new files (pre-existing unrelated errors, if any, are not this task's concern).

- [ ] **Step 4: Commit**

```bash
git add frontend/src/notifications/types.ts frontend/src/hooks/useNotifications.ts
git commit -m "feat(frontend): add notification types and unread-count polling hook"
```

---

### Task 14: Inbox page

**Files:**
- Create: `frontend/src/pages/Inbox.tsx`
- Modify: `frontend/src/routes/index.tsx`

- [ ] **Step 1: Create the Inbox page**

Create `frontend/src/pages/Inbox.tsx`:
```tsx
import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Bell, Calendar, MessageSquare, UserPlus, Utensils } from "lucide-react";

import { api } from "../lib/api";
import type { NotificationItem, NotificationType } from "../notifications/types";

const ICONS: Record<NotificationType, React.ReactNode> = {
  reminder: <Bell className="h-5 w-5 text-orange-500" />,
  invite: <UserPlus className="h-5 w-5 text-blue-500" />,
  diet_plan_assigned: <Utensils className="h-5 w-5 text-green-500" />,
  chat_summary: <MessageSquare className="h-5 w-5 text-purple-500" />,
};

function destinationFor(item: NotificationItem): string | null {
  switch (item.type) {
    case "chat_summary":
      return "/app/mensagens";
    case "invite":
      return "/app";
    case "diet_plan_assigned":
      return "/app/minha-dieta";
    case "reminder":
      return "/app/lembretes";
    default:
      return null;
  }
}

export default function Inbox() {
  const navigate = useNavigate();
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get<NotificationItem[]>("/notifications")
      .then((res) => setItems(res.data))
      .finally(() => setLoading(false));
  }, []);

  function handleClick(item: NotificationItem) {
    if (typeof item.id === "number" && !item.read_at) {
      api.post(`/notifications/${item.id}/read`).catch(() => {});
      setItems((prev) =>
        prev.map((i) => (i.id === item.id ? { ...i, read_at: new Date().toISOString() } : i)),
      );
    }
    const destination = destinationFor(item);
    if (destination) navigate(destination);
  }

  function handleMarkAllRead() {
    api.post("/notifications/read-all").then(() => {
      setItems((prev) => prev.map((i) => ({ ...i, read_at: i.read_at ?? new Date().toISOString() })));
    });
  }

  return (
    <main className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="mx-auto max-w-3xl flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link to="/app" className="text-sm text-gray-400 hover:text-gray-600">
              ← Voltar
            </Link>
            <h1 className="text-lg font-bold text-gray-900">Caixa de Entrada</h1>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={handleMarkAllRead}
              className="text-xs text-gray-500 hover:text-orange-500 transition"
            >
              Marcar tudo como lido
            </button>
            <Link
              to="/app/notificacoes/preferencias"
              className="text-xs text-gray-500 hover:text-orange-500 transition"
            >
              Preferências
            </Link>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-3xl px-6 py-8 space-y-3">
        {loading && <p className="text-sm text-gray-400">Carregando...</p>}

        {!loading && items.length === 0 && (
          <p className="text-sm text-gray-400">Nenhuma notificação por aqui ainda.</p>
        )}

        {items.map((item) => (
          <button
            key={item.id}
            onClick={() => handleClick(item)}
            className={`w-full flex items-start gap-3 rounded-2xl border p-4 text-left transition hover:border-orange-300 ${
              item.read_at ? "bg-white border-gray-200" : "bg-orange-50 border-orange-200"
            }`}
          >
            <div className="mt-0.5 shrink-0 rounded-xl bg-gray-50 p-2">{ICONS[item.type]}</div>
            <div className="flex-1 min-w-0">
              <p className={`text-sm ${item.read_at ? "text-gray-700" : "font-semibold text-gray-900"}`}>
                {item.title}
              </p>
              {item.body && <p className="mt-0.5 text-xs text-gray-500">{item.body}</p>}
              <p className="mt-1 flex items-center gap-1 text-[11px] text-gray-400">
                <Calendar className="h-3 w-3" />
                {new Date(item.created_at).toLocaleString("pt-BR")}
              </p>
            </div>
          </button>
        ))}
      </div>
    </main>
  );
}
```

- [ ] **Step 2: Register the route**

Modify `frontend/src/routes/index.tsx` — add the import next to the other page imports:
```typescript
import Inbox from "../pages/Inbox";
```

And add the route inside the `<Route element={<RequireAuth />}>` block, next to `/app/mensagens`:
```tsx
          <Route path="/app/notificacoes" element={<Inbox />} />
```

- [ ] **Step 3: Type-check**

Run:
```bash
cd frontend
npx tsc --noEmit
```
Expected: no errors referencing `Inbox.tsx` or `routes/index.tsx`.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/pages/Inbox.tsx frontend/src/routes/index.tsx
git commit -m "feat(frontend): add Inbox page listing notifications"
```

---

### Task 15: Notification preferences page

**Files:**
- Create: `frontend/src/pages/NotificationSettings.tsx`
- Modify: `frontend/src/routes/index.tsx`

- [ ] **Step 1: Create the page**

Create `frontend/src/pages/NotificationSettings.tsx`:
```tsx
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

import { api } from "../lib/api";
import type { NotificationPreferences } from "../notifications/types";

const EMPTY: NotificationPreferences = {
  user_id: "",
  reminders_enabled: true,
  chat_enabled: true,
  system_enabled: true,
  quiet_hours_start: null,
  quiet_hours_end: null,
};

export default function NotificationSettings() {
  const [prefs, setPrefs] = useState<NotificationPreferences>(EMPTY);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api.get<NotificationPreferences>("/notifications/preferences").then((res) => setPrefs(res.data));
  }, []);

  function toggle(field: "reminders_enabled" | "chat_enabled" | "system_enabled") {
    setPrefs((prev) => ({ ...prev, [field]: !prev[field] }));
  }

  function save() {
    setSaving(true);
    api
      .put<NotificationPreferences>("/notifications/preferences", {
        reminders_enabled: prefs.reminders_enabled,
        chat_enabled: prefs.chat_enabled,
        system_enabled: prefs.system_enabled,
        quiet_hours_start: prefs.quiet_hours_start,
        quiet_hours_end: prefs.quiet_hours_end,
      })
      .then((res) => setPrefs(res.data))
      .finally(() => setSaving(false));
  }

  return (
    <main className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="mx-auto max-w-2xl flex items-center gap-3">
          <Link to="/app/notificacoes" className="text-sm text-gray-400 hover:text-gray-600">
            ← Voltar
          </Link>
          <h1 className="text-lg font-bold text-gray-900">Preferências de Notificação</h1>
        </div>
      </header>

      <div className="mx-auto max-w-2xl px-6 py-8 space-y-6">
        <div className="rounded-2xl bg-white shadow-sm p-6 space-y-4">
          <ToggleRow
            label="Lembretes"
            description="Avisos de refeição, água, medicação e outros lembretes configurados."
            checked={prefs.reminders_enabled}
            onChange={() => toggle("reminders_enabled")}
          />
          <ToggleRow
            label="Mensagens"
            description="Resumo de novas mensagens de chat."
            checked={prefs.chat_enabled}
            onChange={() => toggle("chat_enabled")}
          />
          <ToggleRow
            label="Avisos do sistema"
            description="Convites de vínculo e planos de dieta atribuídos."
            checked={prefs.system_enabled}
            onChange={() => toggle("system_enabled")}
          />
        </div>

        <div className="rounded-2xl bg-white shadow-sm p-6 space-y-3">
          <p className="text-sm font-semibold text-gray-900">Horário de silêncio</p>
          <p className="text-xs text-gray-500">
            Lembretes não geram notificação nesse intervalo (o próximo horário continua sendo calculado normalmente).
          </p>
          <div className="flex items-center gap-3">
            <input
              type="time"
              value={prefs.quiet_hours_start ?? ""}
              onChange={(e) => setPrefs((prev) => ({ ...prev, quiet_hours_start: e.target.value || null }))}
              className="rounded-lg border border-gray-200 px-3 py-2 text-sm"
            />
            <span className="text-sm text-gray-400">até</span>
            <input
              type="time"
              value={prefs.quiet_hours_end ?? ""}
              onChange={(e) => setPrefs((prev) => ({ ...prev, quiet_hours_end: e.target.value || null }))}
              className="rounded-lg border border-gray-200 px-3 py-2 text-sm"
            />
          </div>
        </div>

        <button
          onClick={save}
          disabled={saving}
          className="rounded-xl bg-orange-500 px-5 py-2.5 text-sm font-semibold text-white hover:bg-orange-600 transition disabled:opacity-50"
        >
          {saving ? "Salvando..." : "Salvar preferências"}
        </button>
      </div>
    </main>
  );
}

function ToggleRow({
  label,
  description,
  checked,
  onChange,
}: {
  label: string;
  description: string;
  checked: boolean;
  onChange: () => void;
}) {
  return (
    <label className="flex items-start justify-between gap-4 cursor-pointer">
      <div>
        <p className="text-sm font-medium text-gray-800">{label}</p>
        <p className="text-xs text-gray-400">{description}</p>
      </div>
      <input
        type="checkbox"
        checked={checked}
        onChange={onChange}
        className="mt-1 h-5 w-5 accent-orange-500"
      />
    </label>
  );
}
```

- [ ] **Step 2: Register the route**

Modify `frontend/src/routes/index.tsx` — add the import:
```typescript
import NotificationSettings from "../pages/NotificationSettings";
```

And the route, next to `/app/notificacoes`:
```tsx
          <Route path="/app/notificacoes/preferencias" element={<NotificationSettings />} />
```

- [ ] **Step 3: Type-check**

Run:
```bash
cd frontend
npx tsc --noEmit
```
Expected: no errors referencing `NotificationSettings.tsx` or `routes/index.tsx`.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/pages/NotificationSettings.tsx frontend/src/routes/index.tsx
git commit -m "feat(frontend): add notification preferences page"
```

---

### Task 16: Reminders page (CRUD, role-aware)

**Files:**
- Create: `frontend/src/pages/Reminders.tsx`
- Modify: `frontend/src/routes/index.tsx`

- [ ] **Step 1: Create the page**

Create `frontend/src/pages/Reminders.tsx`:
```tsx
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Droplet, Pill, Salad, Sparkles, Trash2 } from "lucide-react";

import { api, getApiErrorMessage } from "../lib/api";
import { useProfile } from "../profile/useProfile";
import type { Reminder, ReminderCategory, RecurrenceType } from "../notifications/types";

type CareLinkOption = { id: number; patient_id: string; patient_username: string | null };

const CATEGORY_ICON: Record<ReminderCategory, React.ReactNode> = {
  meal: <Salad className="h-4 w-4" />,
  water: <Droplet className="h-4 w-4" />,
  medication: <Pill className="h-4 w-4" />,
  custom: <Sparkles className="h-4 w-4" />,
};

type FormState = {
  care_link_id: number | null;
  category: ReminderCategory;
  title: string;
  recurrence_type: RecurrenceType;
  fixed_times: string;
  interval_hours: string;
  window_start: string;
  window_end: string;
};

const EMPTY_FORM: FormState = {
  care_link_id: null,
  category: "custom",
  title: "",
  recurrence_type: "fixed_times",
  fixed_times: "08:00",
  interval_hours: "2",
  window_start: "08:00",
  window_end: "20:00",
};

export default function Reminders() {
  const { profile } = useProfile();
  const isNutritionist = profile?.profile.role === "nutritionist";

  const [careLinks, setCareLinks] = useState<CareLinkOption[]>([]);
  const [selectedPatient, setSelectedPatient] = useState<string | null>(null);
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isNutritionist) {
      api.get<CareLinkOption[]>("/care/links").then((res) => {
        setCareLinks(res.data);
        if (res.data.length > 0) setSelectedPatient(res.data[0].patient_id);
      });
    }
  }, [isNutritionist]);

  useEffect(() => {
    if (isNutritionist && !selectedPatient) return;
    const params = isNutritionist ? { patient_id: selectedPatient } : {};
    api.get<Reminder[]>("/reminders", { params }).then((res) => setReminders(res.data));
  }, [isNutritionist, selectedPatient]);

  function refresh() {
    const params = isNutritionist ? { patient_id: selectedPatient } : {};
    api.get<Reminder[]>("/reminders", { params }).then((res) => setReminders(res.data));
  }

  function handleCreate() {
    setError(null);
    const careLink = careLinks.find((l) => l.patient_id === selectedPatient);
    const payload = {
      care_link_id: isNutritionist ? careLink?.id ?? null : null,
      category: form.category,
      title: form.title,
      recurrence_type: form.recurrence_type,
      fixed_times:
        form.recurrence_type === "fixed_times"
          ? form.fixed_times.split(",").map((t) => t.trim()).filter(Boolean)
          : null,
      interval_hours: form.recurrence_type === "interval" ? Number(form.interval_hours) : null,
      window_start: form.recurrence_type === "interval" ? form.window_start : null,
      window_end: form.recurrence_type === "interval" ? form.window_end : null,
      days_of_week: [0, 1, 2, 3, 4, 5, 6],
    };
    api
      .post("/reminders", payload)
      .then(() => {
        setForm(EMPTY_FORM);
        refresh();
      })
      .catch((err) => setError(getApiErrorMessage(err)));
  }

  function handleToggleActive(reminder: Reminder) {
    api.put(`/reminders/${reminder.id}`, { is_active: !reminder.is_active }).then(refresh);
  }

  function handleDelete(reminder: Reminder) {
    api.delete(`/reminders/${reminder.id}`).then(refresh);
  }

  return (
    <main className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="mx-auto max-w-3xl flex items-center gap-3">
          <Link to="/app" className="text-sm text-gray-400 hover:text-gray-600">
            ← Voltar
          </Link>
          <h1 className="text-lg font-bold text-gray-900">Lembretes</h1>
        </div>
      </header>

      <div className="mx-auto max-w-3xl px-6 py-8 space-y-6">
        {isNutritionist && (
          <div className="rounded-2xl bg-white shadow-sm p-4">
            <label className="text-xs font-semibold uppercase text-gray-400">Paciente</label>
            <select
              value={selectedPatient ?? ""}
              onChange={(e) => setSelectedPatient(e.target.value)}
              className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
            >
              {careLinks.map((link) => (
                <option key={link.id} value={link.patient_id}>
                  {link.patient_username ?? link.patient_id}
                </option>
              ))}
            </select>
          </div>
        )}

        <div className="rounded-2xl bg-white shadow-sm p-6 space-y-4">
          <p className="text-sm font-semibold text-gray-900">Novo lembrete</p>

          <input
            placeholder="Título (ex: Hora do almoço)"
            value={form.title}
            onChange={(e) => setForm((prev) => ({ ...prev, title: e.target.value }))}
            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
          />

          <div className="flex gap-2">
            {(["meal", "water", "medication", "custom"] as ReminderCategory[]).map((cat) => (
              <button
                key={cat}
                onClick={() => setForm((prev) => ({ ...prev, category: cat }))}
                className={`flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs ${
                  form.category === cat
                    ? "border-orange-400 bg-orange-50 text-orange-600"
                    : "border-gray-200 text-gray-500"
                }`}
              >
                {CATEGORY_ICON[cat]} {cat}
              </button>
            ))}
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => setForm((prev) => ({ ...prev, recurrence_type: "fixed_times" }))}
              className={`rounded-lg border px-3 py-1.5 text-xs ${
                form.recurrence_type === "fixed_times"
                  ? "border-orange-400 bg-orange-50 text-orange-600"
                  : "border-gray-200 text-gray-500"
              }`}
            >
              Horários fixos
            </button>
            <button
              onClick={() => setForm((prev) => ({ ...prev, recurrence_type: "interval" }))}
              className={`rounded-lg border px-3 py-1.5 text-xs ${
                form.recurrence_type === "interval"
                  ? "border-orange-400 bg-orange-50 text-orange-600"
                  : "border-gray-200 text-gray-500"
              }`}
            >
              Intervalo
            </button>
          </div>

          {form.recurrence_type === "fixed_times" ? (
            <input
              placeholder="Horários separados por vírgula (ex: 08:00, 12:00, 19:00)"
              value={form.fixed_times}
              onChange={(e) => setForm((prev) => ({ ...prev, fixed_times: e.target.value }))}
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
            />
          ) : (
            <div className="flex gap-2">
              <input
                type="number"
                min={1}
                placeholder="A cada quantas horas"
                value={form.interval_hours}
                onChange={(e) => setForm((prev) => ({ ...prev, interval_hours: e.target.value }))}
                className="w-32 rounded-lg border border-gray-200 px-3 py-2 text-sm"
              />
              <input
                type="time"
                value={form.window_start}
                onChange={(e) => setForm((prev) => ({ ...prev, window_start: e.target.value }))}
                className="rounded-lg border border-gray-200 px-3 py-2 text-sm"
              />
              <input
                type="time"
                value={form.window_end}
                onChange={(e) => setForm((prev) => ({ ...prev, window_end: e.target.value }))}
                className="rounded-lg border border-gray-200 px-3 py-2 text-sm"
              />
            </div>
          )}

          {error && <p className="text-xs text-red-500">{error}</p>}

          <button
            onClick={handleCreate}
            disabled={!form.title.trim()}
            className="rounded-xl bg-orange-500 px-5 py-2.5 text-sm font-semibold text-white hover:bg-orange-600 transition disabled:opacity-50"
          >
            Criar lembrete
          </button>
        </div>

        <div className="space-y-3">
          {reminders.map((reminder) => (
            <div
              key={reminder.id}
              className="flex items-center justify-between gap-4 rounded-2xl bg-white shadow-sm p-4"
            >
              <div className="flex items-center gap-3">
                <div className="rounded-xl bg-gray-50 p-2">{CATEGORY_ICON[reminder.category]}</div>
                <div>
                  <p className="text-sm font-medium text-gray-800">{reminder.title}</p>
                  <p className="text-xs text-gray-400">
                    {reminder.recurrence_type === "fixed_times"
                      ? (reminder.fixed_times ?? []).join(", ")
                      : `a cada ${reminder.interval_hours}h (${reminder.window_start}–${reminder.window_end})`}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <label className="flex items-center gap-1.5 text-xs text-gray-500">
                  <input
                    type="checkbox"
                    checked={reminder.is_active}
                    onChange={() => handleToggleActive(reminder)}
                    className="accent-orange-500"
                  />
                  ativo
                </label>
                <button onClick={() => handleDelete(reminder)} className="text-gray-400 hover:text-red-500">
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
          {reminders.length === 0 && <p className="text-sm text-gray-400">Nenhum lembrete configurado ainda.</p>}
        </div>
      </div>
    </main>
  );
}
```

- [ ] **Step 2: Register the route**

Modify `frontend/src/routes/index.tsx` — add the import:
```typescript
import Reminders from "../pages/Reminders";
```

And the route:
```tsx
          <Route path="/app/lembretes" element={<Reminders />} />
```

- [ ] **Step 3: Type-check**

Run:
```bash
cd frontend
npx tsc --noEmit
```
Expected: no errors referencing `Reminders.tsx` or `routes/index.tsx`. `useProfile()` returns `{ profile: ProfileDetails | null, status }` (see `frontend/src/profile/ProfileProvider.tsx`), and `ProfileDetails.profile.role` is the `BaseProfile`'s role — this matches the `profile?.profile.role` access used above, same pattern as `frontend/src/pages/Dashboard.tsx`'s `base.role`.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/pages/Reminders.tsx frontend/src/routes/index.tsx
git commit -m "feat(frontend): add Reminders page with role-aware CRUD"
```

---

### Task 17: Wire the inbox badge and nav links into the Dashboard

**Files:**
- Modify: `frontend/src/pages/Dashboard.tsx`

- [ ] **Step 1: Import the new hook and icon**

Find this line near the top of `frontend/src/pages/Dashboard.tsx`:
```typescript
import { useUnreadMessages } from "../hooks/useUnreadMessages";
```

Add right after it:
```typescript
import { useNotificationCounts } from "../hooks/useNotifications";
```

Find the `lucide-react` import block:
```typescript
import {
  Bell,
  ClipboardList,
  History,
  LogOut,
  MessageSquare,
  Pencil,
  Salad,
  ShoppingCart,
  Users,
} from "lucide-react";
```

Replace with:
```typescript
import {
  Bell,
  BellRing,
  ClipboardList,
  History,
  LogOut,
  MessageSquare,
  Pencil,
  Salad,
  ShoppingCart,
  Users,
} from "lucide-react";
```

- [ ] **Step 2: Call the hook**

Find:
```typescript
  const unread = useUnreadMessages();
```

Add right after it:
```typescript
  const notificationCounts = useNotificationCounts();
```

- [ ] **Step 3: Add an inbox bell button to the top bar**

Find the top bar's action group:
```tsx
          <div className="flex items-center gap-3">
            {unread.total > 0 && (
              <Link
                to="/app/mensagens"
                className="relative flex items-center gap-1.5 rounded-xl bg-orange-50 border border-orange-200 px-3 py-1.5 text-xs font-semibold text-orange-600 hover:bg-orange-100 transition"
              >
                <Bell className="h-3.5 w-3.5" />
                {unread.total} {unread.total === 1 ? "mensagem" : "mensagens"} não {unread.total === 1 ? "lida" : "lidas"}
              </Link>
            )}
            <button
              onClick={clearSession}
              className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-red-500 transition"
            >
              <LogOut className="h-4 w-4" />
              Sair
            </button>
          </div>
```

Replace with:
```tsx
          <div className="flex items-center gap-3">
            <Link
              to="/app/notificacoes"
              className="relative flex items-center gap-1.5 rounded-xl border border-gray-200 px-3 py-1.5 text-xs font-semibold text-gray-500 hover:border-orange-300 hover:text-orange-500 transition"
            >
              <BellRing className="h-3.5 w-3.5" />
              Notificações
              {notificationCounts.total > 0 && (
                <span className="absolute -top-1.5 -right-1.5 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-red-500 px-1 text-[9px] font-bold text-white">
                  {notificationCounts.total > 99 ? "99+" : notificationCounts.total}
                </span>
              )}
            </Link>
            {unread.total > 0 && (
              <Link
                to="/app/mensagens"
                className="relative flex items-center gap-1.5 rounded-xl bg-orange-50 border border-orange-200 px-3 py-1.5 text-xs font-semibold text-orange-600 hover:bg-orange-100 transition"
              >
                <Bell className="h-3.5 w-3.5" />
                {unread.total} {unread.total === 1 ? "mensagem" : "mensagens"} não {unread.total === 1 ? "lida" : "lidas"}
              </Link>
            )}
            <button
              onClick={clearSession}
              className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-red-500 transition"
            >
              <LogOut className="h-4 w-4" />
              Sair
            </button>
          </div>
```

- [ ] **Step 4: Add a "Lembretes" tool card for both roles**

Find the nutritionist `ToolCard` grid:
```tsx
              <ToolCard
                to="/app/mensagens"
                icon={<MessageSquare className="h-6 w-6 text-orange-500" />}
                title="Mensagens"
                description="Converse com seus pacientes"
                color="orange"
                badge={unread.total}
              />
            </div>
          )}

          {base.role === "patient" && (
```

Replace with:
```tsx
              <ToolCard
                to="/app/mensagens"
                icon={<MessageSquare className="h-6 w-6 text-orange-500" />}
                title="Mensagens"
                description="Converse com seus pacientes"
                color="orange"
                badge={unread.total}
              />
              <ToolCard
                to="/app/lembretes"
                icon={<Bell className="h-6 w-6 text-orange-500" />}
                title="Lembretes"
                description="Configure lembretes de refeição e água para seus pacientes"
                color="orange"
              />
            </div>
          )}

          {base.role === "patient" && (
```

Find the patient `ToolCard` grid's closing:
```tsx
              <ToolCard
                to="/app/meus-planos"
                icon={<History className="h-6 w-6 text-orange-500" />}
                title="Meus Planos"
                description="Histórico de todos os planos alimentares"
                color="orange"
              />
            </div>
          )}
        </div>
      </main>
```

Wait — confirm the exact closing tags by checking indentation: it's actually followed by `</div>\n      </div>\n    </main>` per the file. Replace with:
```tsx
              <ToolCard
                to="/app/meus-planos"
                icon={<History className="h-6 w-6 text-orange-500" />}
                title="Meus Planos"
                description="Histórico de todos os planos alimentares"
                color="orange"
              />
              <ToolCard
                to="/app/lembretes"
                icon={<Bell className="h-6 w-6 text-orange-500" />}
                title="Lembretes"
                description="Seus lembretes de refeição, água e outros"
                color="orange"
              />
            </div>
          )}
        </div>
      </div>
    </main>
```

- [ ] **Step 5: Type-check**

Run:
```bash
cd frontend
npx tsc --noEmit
```
Expected: no errors referencing `Dashboard.tsx`.

- [ ] **Step 6: Commit**

```bash
git add frontend/src/pages/Dashboard.tsx
git commit -m "feat(frontend): surface inbox badge and reminders tool card on Dashboard"
```

---

### Task 18: Manual end-to-end verification of the frontend

**Files:** none — verification only.

- [ ] **Step 1: Start both servers**

Terminal 1 (backend, if not already running from Task 12):
```bash
cd backend
.venv\Scripts\activate
python -m uvicorn app.main:app --reload
```

Terminal 2 (frontend):
```bash
cd frontend
npm run dev
```

- [ ] **Step 2: Log in as a patient**

Open the Vite dev URL (typically `http://localhost:5173`), log in as a patient test account, land on `/app`.

- [ ] **Step 3: Confirm the Dashboard shows the new elements**

Confirm: the "Notificações" bell button appears in the top bar, and a "Lembretes" tool card appears in the grid.

- [ ] **Step 4: Create a reminder through the UI**

Click "Lembretes" → fill in a title, pick "Horários fixos", type a time a few minutes from now (24h format, e.g. current time + 2 minutes) → "Criar lembrete". Confirm it appears in the list below with the correct recurrence text.

- [ ] **Step 5: Confirm it fires and shows in the inbox**

Wait until the configured time passes, then wait up to 30 seconds (poll interval) or reload the Dashboard. Confirm the bell badge shows `1`. Click it, land on `/app/notificacoes`, confirm the reminder notification is listed. Click it, confirm it's marked read and the badge clears.

- [ ] **Step 6: Confirm preferences page works**

From the inbox, click "Preferências", toggle "Lembretes" off, save. Confirm `GET /api/v1/notifications/preferences` (via `/docs` or browser devtools network tab) reflects `reminders_enabled: false`.

No commit for this task (verification only).

---

## Self-review notes

- **Spec coverage:** every bullet in the spec's decisions (1–8) and every table/endpoint is implemented by a task above — recurrence engine (Tasks 1–2), tables (Task 3), reminders CRUD API (Tasks 4–6), notifications/inbox/preferences API (Tasks 7–9), system-event wiring for all three required triggers (Tasks 10–11), frontend hook/pages/nav wiring (Tasks 13–17), and manual verification of both layers (Tasks 12, 18).
  - **Known gap found in the post-implementation whole-feature review (2026-08-17):** the backend fully supports editing a reminder's title/category/recurrence and filtering by `days_of_week` (`PUT /reminders/{id}` accepts these fields, the recurrence engine handles the filter), but `Reminders.tsx` only ships create / toggle-active / delete — there is no UI to edit an existing reminder's schedule, and `days_of_week` is hardcoded to "every day" on create with no picker. The `chat_summary` notification's deep-link (`reference_id` = `care_link_id`) is also unused by `Inbox.tsx`, which routes every chat notification to the bare `/app/mensagens` regardless of which conversation it's for. These are scope gaps in the frontend, not spec-compliance failures in the tasks as written — the plan's per-task specs matched what got built; the plan itself just didn't include an edit-UI task. Left as a deliberate follow-up rather than expanded now.
- **No placeholders:** every step that changes code includes the full code, not a description of it.
- **Type consistency:** `Reminder`/`NotificationItem`/`NotificationPreferences` TS types (Task 13) match the Pydantic response schemas (Tasks 4, 7) field-for-field; `ReminderService`/`NotificationService` method names used in the routers (Tasks 6, 9) match the methods defined in Tasks 5 and 8.
