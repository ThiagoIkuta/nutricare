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
