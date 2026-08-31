import uuid
from typing import Any

from fastapi import HTTPException, UploadFile, status

from app.core.supabase import supabase_admin
import json

from app.schemas.profile import ProfileSetupRequest, ProfileUpdateRequest, WeightEntry
from app.services.image_utils import read_and_validate_image

AVATAR_BUCKET = "avatars"
MAX_AVATAR_SIZE = 5 * 1024 * 1024  # 5MB, matches the bucket's file_size_limit


class ProfileService:
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
    def _get_user_email(current_user: Any) -> str | None:
        return getattr(current_user, "email", None)

    @staticmethod
    def _normalize_profile(row: dict, email: str | None = None) -> dict:
        return {
            "id": str(row.get("id", "")),
            "email": email,
            "role": row.get("role"),
            "username": row.get("username"),
            "phone": row.get("phone"),
            "avatar_url": row.get("avatar_url"),
            "is_active": row.get("is_active", True),
            "created_at": row.get("created_at"),
            "updated_at": row.get("updated_at"),
        }

    @staticmethod
    def get_profile_row(user_id: str) -> dict | None:
        response = (
            supabase_admin
            .table("profiles")
            .select("*")
            .eq("id", user_id)
            .limit(1)
            .execute()
        )

        rows = response.data or []
        return rows[0] if rows else None

    @staticmethod
    def setup_profile(current_user: Any, payload: ProfileSetupRequest) -> dict:
        user_id = ProfileService._get_user_id(current_user)
        email = ProfileService._get_user_email(current_user)

        existing_profile = ProfileService.get_profile_row(user_id)
        if existing_profile:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Perfil já foi configurado para este usuário.",
            )

        if payload.role == "nutritionist" and not payload.nutritionist_profile:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="nutritionist_profile é obrigatório para role=nutritionist.",
            )

        profile_insert = (
            supabase_admin
            .table("profiles")
            .insert({
                "id": user_id,
                "role": payload.role,
                "username": payload.username,
                "phone": payload.phone,
                "avatar_url": payload.avatar_url,
            })
            .execute()
        )

        profile_rows = profile_insert.data or []
        if not profile_rows:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Não foi possível criar o perfil base.",
            )

        try:
            if payload.role == "nutritionist":
                supabase_admin.table("nutritionist_profiles").insert({
                    "profile_id": user_id,
                    "crn": payload.nutritionist_profile.crn,
                    "specialty": payload.nutritionist_profile.specialty,
                    "bio": payload.nutritionist_profile.bio,
                }).execute()

            elif payload.role == "patient":
                patient_data = (
                    payload.patient_profile.model_dump(exclude_none=True)
                    if payload.patient_profile else {}
                )

                supabase_admin.table("patient_profiles").insert({
                    "profile_id": user_id,
                    **patient_data,
                }).execute()

        except Exception as exc:
            supabase_admin.table("profiles").delete().eq("id", user_id).execute()
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Perfil base foi criado, mas a tabela específica falhou.",
            ) from exc

        return ProfileService.get_my_profile_details(current_user)

    @staticmethod
    def get_my_profile(current_user: Any) -> dict:
        user_id = ProfileService._get_user_id(current_user)
        email = ProfileService._get_user_email(current_user)

        row = ProfileService.get_profile_row(user_id)
        if not row:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Perfil ainda não configurado. Use /profile/setup primeiro.",
            )

        return ProfileService._normalize_profile(row, email=email)

    @staticmethod
    def update_my_profile(current_user: Any, payload: ProfileUpdateRequest) -> dict:
        user_id = ProfileService._get_user_id(current_user)
        email = ProfileService._get_user_email(current_user)

        current_row = ProfileService.get_profile_row(user_id)
        if not current_row:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Perfil ainda não configurado. Use /profile/setup primeiro.",
            )

        # Update base profile fields
        base_update = payload.model_dump(
            exclude_none=True,
            exclude={"nutritionist_profile", "patient_profile"},
        )
        updated_row = current_row
        if base_update:
            response = (
                supabase_admin
                .table("profiles")
                .update(base_update)
                .eq("id", user_id)
                .execute()
            )
            rows = response.data or []
            if rows:
                updated_row = rows[0]

        # Update nutritionist-specific fields
        if payload.nutritionist_profile:
            nutri_data = payload.nutritionist_profile.model_dump(exclude_none=True)
            if nutri_data:
                supabase_admin.table("nutritionist_profiles").update(nutri_data).eq(
                    "profile_id", user_id
                ).execute()

        # Update patient-specific fields
        if payload.patient_profile:
            patient_data = payload.patient_profile.model_dump(exclude_none=True)
            if patient_data:
                supabase_admin.table("patient_profiles").update(patient_data).eq(
                    "profile_id", user_id
                ).execute()

        return ProfileService._normalize_profile(updated_row, email=email)

    @staticmethod
    def upload_avatar(current_user: Any, file: UploadFile) -> dict:
        user_id = ProfileService._get_user_id(current_user)
        email = ProfileService._get_user_email(current_user)

        current_row = ProfileService.get_profile_row(user_id)
        if not current_row:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Perfil ainda não configurado. Use /profile/setup primeiro.",
            )

        _content_type, file_bytes, ext = read_and_validate_image(file, MAX_AVATAR_SIZE)
        path = f"{user_id}/{uuid.uuid4()}.{ext}"

        try:
            supabase_admin.storage.from_(AVATAR_BUCKET).upload(
                path, file_bytes, {"content-type": _content_type}
            )
        except Exception as exc:
            detail = getattr(exc, "message", None) or str(exc)
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail=f"Falha ao enviar a foto: {detail}",
            ) from exc

        public_url = supabase_admin.storage.from_(AVATAR_BUCKET).get_public_url(path)
        previous_url = current_row.get("avatar_url")

        response = (
            supabase_admin
            .table("profiles")
            .update({"avatar_url": public_url})
            .eq("id", user_id)
            .execute()
        )
        rows = response.data or []
        if not rows:
            supabase_admin.storage.from_(AVATAR_BUCKET).remove([path])
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Falha ao salvar a nova foto de perfil.",
            )

        # Best-effort cleanup of the previous avatar file, if any.
        if previous_url and f"/{AVATAR_BUCKET}/" in previous_url:
            previous_path = previous_url.split(f"/{AVATAR_BUCKET}/", 1)[1]
            try:
                supabase_admin.storage.from_(AVATAR_BUCKET).remove([previous_path])
            except Exception:
                pass

        return ProfileService._normalize_profile(rows[0], email=email)

    @staticmethod
    def get_weight_history(current_user: Any) -> list[dict]:
        user_id = ProfileService._get_user_id(current_user)
        resp = (
            supabase_admin.table("patient_profiles")
            .select("weight_history")
            .eq("profile_id", user_id)
            .limit(1)
            .execute()
        )
        rows = resp.data or []
        if not rows or not rows[0].get("weight_history"):
            return []
        try:
            return json.loads(rows[0]["weight_history"])
        except (json.JSONDecodeError, TypeError):
            return []

    @staticmethod
    def add_weight_entry(current_user: Any, entry: WeightEntry) -> list[dict]:
        user_id = ProfileService._get_user_id(current_user)

        # Fetch existing history
        resp = (
            supabase_admin.table("patient_profiles")
            .select("weight_history")
            .eq("profile_id", user_id)
            .limit(1)
            .execute()
        )
        rows = resp.data or []
        if not rows:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Perfil de paciente não encontrado.",
            )

        try:
            history: list[dict] = json.loads(rows[0].get("weight_history") or "[]")
        except (json.JSONDecodeError, TypeError):
            history = []

        new_entry = entry.model_dump(exclude_none=True)
        # Replace existing entry for same date if present
        history = [e for e in history if e.get("date") != entry.date]
        history.append(new_entry)
        history.sort(key=lambda e: e["date"])

        supabase_admin.table("patient_profiles").update(
            {"weight_history": json.dumps(history)}
        ).eq("profile_id", user_id).execute()

        return history

    @staticmethod
    def delete_weight_entry(current_user: Any, date: str) -> list[dict]:
        user_id = ProfileService._get_user_id(current_user)
        resp = (
            supabase_admin.table("patient_profiles")
            .select("weight_history")
            .eq("profile_id", user_id)
            .limit(1)
            .execute()
        )
        rows = resp.data or []
        if not rows:
            return []
        try:
            history = json.loads(rows[0].get("weight_history") or "[]")
        except (json.JSONDecodeError, TypeError):
            history = []

        history = [e for e in history if e.get("date") != date]
        supabase_admin.table("patient_profiles").update(
            {"weight_history": json.dumps(history)}
        ).eq("profile_id", user_id).execute()
        return history

    @staticmethod
    def get_my_profile_details(current_user: Any) -> dict:
        user_id = ProfileService._get_user_id(current_user)
        email = ProfileService._get_user_email(current_user)

        profile_row = ProfileService.get_profile_row(user_id)
        if not profile_row:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Perfil ainda não configurado. Use /profile/setup primeiro.",
            )

        nutritionist_response = (
            supabase_admin
            .table("nutritionist_profiles")
            .select("*")
            .eq("profile_id", user_id)
            .limit(1)
            .execute()
        )

        patient_response = (
            supabase_admin
            .table("patient_profiles")
            .select("*")
            .eq("profile_id", user_id)
            .limit(1)
            .execute()
        )

        nutritionist_rows = nutritionist_response.data or []
        patient_rows = patient_response.data or []

        return {
            "profile": ProfileService._normalize_profile(profile_row, email=email),
            "nutritionist_profile": nutritionist_rows[0] if nutritionist_rows else None,
            "patient_profile": patient_rows[0] if patient_rows else None,
        }