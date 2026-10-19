from datetime import datetime, timezone
from typing import Any

from fastapi import HTTPException, status

from app.core.supabase import supabase_admin
from app.schemas.recipe import VALID_SCOPES, VALID_VISIBILITY, RecipeCreate, RecipeUpdate

SNAPSHOT_FIELDS = (
    "title",
    "description",
    "meal_types",
    "ingredients",
    "instructions",
    "prep_time_min",
    "servings",
)


def _is_visible(recipe_row: dict, user_id: str) -> bool:
    if recipe_row.get("is_builtin"):
        return True
    if recipe_row.get("owner_id") == user_id:
        return True
    return recipe_row.get("visibility") == "public"


def _can_edit(recipe_row: dict, user_id: str) -> bool:
    if recipe_row.get("is_builtin"):
        return False
    return recipe_row.get("owner_id") == user_id


def _snapshot(recipe_row: dict) -> dict:
    """Content-only copy of a recipe, stored on chat messages so the shared
    recipe keeps rendering even if the original is later deleted or made private."""
    return {field: recipe_row.get(field) for field in SNAPSHOT_FIELDS}


def _copy_from_snapshot(snapshot: dict, user_id: str, message_id: int) -> dict:
    """Insert payload for the private copy created by "Aceitar e salvar" in the chat."""
    return {
        "owner_id": user_id,
        "title": snapshot.get("title") or "Receita",
        "description": snapshot.get("description"),
        "meal_types": snapshot.get("meal_types") or [],
        "ingredients": snapshot.get("ingredients") or [],
        "instructions": snapshot.get("instructions") or [],
        "prep_time_min": snapshot.get("prep_time_min") or 0,
        "servings": snapshot.get("servings") or 1,
        "visibility": "private",
        "is_builtin": False,
        "source_message_id": message_id,
    }


def _validate_fields(
    title: str | None,
    servings: int | None,
    prep_time_min: int | None,
    ingredients: list | None,
    visibility: str | None,
) -> None:
    if title is not None and not title.strip():
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="O título da receita é obrigatório.",
        )
    if servings is not None and servings < 1:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="A receita precisa render pelo menos 1 porção.",
        )
    if prep_time_min is not None and prep_time_min < 0:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="O tempo de preparo não pode ser negativo.",
        )
    if ingredients is not None and len(ingredients) == 0:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Adicione pelo menos um ingrediente.",
        )
    if visibility is not None and visibility not in VALID_VISIBILITY:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Visibilidade inválida. Use: {', '.join(sorted(VALID_VISIBILITY))}.",
        )


class RecipeService:
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
    def _saved_ids(user_id: str) -> set[int]:
        resp = (
            supabase_admin.table("recipe_saves")
            .select("recipe_id")
            .eq("user_id", user_id)
            .execute()
        )
        return {r["recipe_id"] for r in (resp.data or [])}

    @staticmethod
    def _serialize(rows: list[dict], user_id: str, saved_ids: set[int]) -> list[dict]:
        owner_ids = list({r["owner_id"] for r in rows if r.get("owner_id")})
        name_map: dict[str, str | None] = {}
        if owner_ids:
            profiles_resp = (
                supabase_admin.table("profiles")
                .select("id, username")
                .in_("id", owner_ids)
                .execute()
            )
            name_map = {p["id"]: p["username"] for p in (profiles_resp.data or [])}

        return [
            {
                **r,
                "owner_username": name_map.get(r["owner_id"]) if r.get("owner_id") else None,
                "is_owner": r.get("owner_id") == user_id,
                "is_saved": r["id"] in saved_ids,
                "can_edit": _can_edit(r, user_id),
            }
            for r in rows
        ]

    @staticmethod
    def get_visible_row_or_404(recipe_id: int, user_id: str) -> dict:
        resp = (
            supabase_admin.table("recipes")
            .select("*")
            .eq("id", recipe_id)
            .limit(1)
            .execute()
        )
        rows = resp.data or []
        if not rows or not _is_visible(rows[0], user_id):
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Receita não encontrada.",
            )
        return rows[0]

    @staticmethod
    def list_book(current_user: Any, scope: str = "all") -> list[dict]:
        user_id = RecipeService._get_user_id(current_user)
        if scope not in VALID_SCOPES:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail=f"Escopo inválido. Use: {', '.join(sorted(VALID_SCOPES))}.",
            )

        resp = (
            supabase_admin.table("recipes")
            .select("*")
            .or_(f"is_builtin.eq.true,visibility.eq.public,owner_id.eq.{user_id}")
            .order("is_builtin")
            .order("created_at", desc=True)
            .execute()
        )
        rows = [r for r in (resp.data or []) if _is_visible(r, user_id)]
        saved_ids = RecipeService._saved_ids(user_id)

        if scope == "mine":
            rows = [r for r in rows if r.get("owner_id") == user_id]
        elif scope == "saved":
            rows = [r for r in rows if r["id"] in saved_ids]
        elif scope == "public":
            rows = [r for r in rows if r.get("is_builtin") or r.get("visibility") == "public"]

        return RecipeService._serialize(rows, user_id, saved_ids)

    @staticmethod
    def get_recipe(current_user: Any, recipe_id: int) -> dict:
        user_id = RecipeService._get_user_id(current_user)
        row = RecipeService.get_visible_row_or_404(recipe_id, user_id)
        return RecipeService._serialize([row], user_id, RecipeService._saved_ids(user_id))[0]

    @staticmethod
    def create_recipe(current_user: Any, payload: RecipeCreate) -> dict:
        user_id = RecipeService._get_user_id(current_user)
        _validate_fields(
            payload.title, payload.servings, payload.prep_time_min, payload.ingredients, payload.visibility
        )

        resp = (
            supabase_admin.table("recipes")
            .insert({
                "owner_id": user_id,
                "title": payload.title.strip(),
                "description": payload.description,
                "meal_types": payload.meal_types,
                "ingredients": [i.model_dump() for i in payload.ingredients],
                "instructions": [s for s in payload.instructions if s.strip()],
                "prep_time_min": payload.prep_time_min,
                "servings": payload.servings,
                "visibility": payload.visibility,
                "is_builtin": False,
            })
            .execute()
        )
        rows = resp.data or []
        if not rows:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Falha ao criar a receita.",
            )
        return RecipeService._serialize(rows, user_id, set())[0]

    @staticmethod
    def update_recipe(current_user: Any, recipe_id: int, payload: RecipeUpdate) -> dict:
        user_id = RecipeService._get_user_id(current_user)
        row = RecipeService.get_visible_row_or_404(recipe_id, user_id)
        if not _can_edit(row, user_id):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Você não pode editar esta receita.",
            )
        _validate_fields(
            payload.title, payload.servings, payload.prep_time_min, payload.ingredients, payload.visibility
        )

        update_data: dict[str, Any] = {}
        if payload.title is not None:
            update_data["title"] = payload.title.strip()
        if payload.description is not None:
            update_data["description"] = payload.description
        if payload.meal_types is not None:
            update_data["meal_types"] = payload.meal_types
        if payload.ingredients is not None:
            update_data["ingredients"] = [i.model_dump() for i in payload.ingredients]
        if payload.instructions is not None:
            update_data["instructions"] = [s for s in payload.instructions if s.strip()]
        if payload.prep_time_min is not None:
            update_data["prep_time_min"] = payload.prep_time_min
        if payload.servings is not None:
            update_data["servings"] = payload.servings
        if payload.visibility is not None:
            update_data["visibility"] = payload.visibility

        saved_ids = RecipeService._saved_ids(user_id)
        if not update_data:
            return RecipeService._serialize([row], user_id, saved_ids)[0]

        update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
        resp = (
            supabase_admin.table("recipes")
            .update(update_data)
            .eq("id", recipe_id)
            .execute()
        )
        rows = resp.data or []
        if not rows:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Falha ao atualizar a receita.",
            )
        return RecipeService._serialize(rows, user_id, saved_ids)[0]

    @staticmethod
    def delete_recipe(current_user: Any, recipe_id: int) -> None:
        user_id = RecipeService._get_user_id(current_user)
        row = RecipeService.get_visible_row_or_404(recipe_id, user_id)
        if not _can_edit(row, user_id):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Você não pode excluir esta receita.",
            )
        # recipe_saves cascades; messages.recipe_id is set to NULL and the chat
        # box keeps rendering from recipe_snapshot.
        supabase_admin.table("recipes").delete().eq("id", recipe_id).execute()

    @staticmethod
    def save_recipe(current_user: Any, recipe_id: int) -> dict:
        user_id = RecipeService._get_user_id(current_user)
        row = RecipeService.get_visible_row_or_404(recipe_id, user_id)
        if row.get("owner_id") == user_id:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="Esta receita já é sua.",
            )
        supabase_admin.table("recipe_saves").upsert(
            {"user_id": user_id, "recipe_id": recipe_id},
            on_conflict="user_id,recipe_id",
        ).execute()
        return {"ok": True}

    @staticmethod
    def unsave_recipe(current_user: Any, recipe_id: int) -> dict:
        user_id = RecipeService._get_user_id(current_user)
        supabase_admin.table("recipe_saves").delete().eq("user_id", user_id).eq(
            "recipe_id", recipe_id
        ).execute()
        return {"ok": True}

    @staticmethod
    def accept_from_message(user_id: str, message: dict) -> dict:
        """Create (or return the existing) private copy of a recipe shared in the chat."""
        existing = (
            supabase_admin.table("recipes")
            .select("*")
            .eq("owner_id", user_id)
            .eq("source_message_id", message["id"])
            .limit(1)
            .execute()
        )
        rows = existing.data or []
        if not rows:
            snapshot = message.get("recipe_snapshot") or {}
            resp = (
                supabase_admin.table("recipes")
                .insert(_copy_from_snapshot(snapshot, user_id, message["id"]))
                .execute()
            )
            rows = resp.data or []
            if not rows:
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail="Falha ao salvar a receita.",
                )
        return RecipeService._serialize(rows, user_id, set())[0]
