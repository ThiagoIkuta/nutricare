import json
from typing import Any

from fastapi import HTTPException, status

from app.core.supabase import supabase_admin
from app.schemas.diet import DietPlanCreate, MealCreate
from app.schemas.preset import VALID_VISIBILITY, PresetCreate, PresetUpdate
from app.services.diet_service import DietService


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
