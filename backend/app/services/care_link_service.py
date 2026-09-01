from typing import Any

from fastapi import HTTPException, status

from app.core.supabase import supabase_admin
from app.services.diet_service import DietService
from app.services.notification_service import NotificationService


class CareLinkService:
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
    def create_link(current_user: Any, patient_id: str, send_invitation: bool = False) -> dict:
        user_id = CareLinkService._get_user_id(current_user)

        if CareLinkService._get_role(user_id) != "nutritionist":
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Apenas nutricionistas podem criar vínculos.",
            )

        patient_resp = (
            supabase_admin.table("profiles")
            .select("id, username, role")
            .eq("id", patient_id)
            .limit(1)
            .execute()
        )
        patient_rows = patient_resp.data or []
        if not patient_rows or patient_rows[0].get("role") != "patient":
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Paciente não encontrado.",
            )

        existing = (
            supabase_admin.table("care_links")
            .select("id")
            .eq("nutritionist_id", user_id)
            .eq("patient_id", patient_id)
            .in_("status", ["active", "pending"])
            .limit(1)
            .execute()
        )
        if existing.data:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Vínculo ativo já existe com este paciente.",
            )

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
            try:
                nutri_resp = (
                    supabase_admin.table("profiles")
                    .select("username")
                    .eq("id", user_id)
                    .limit(1)
                    .execute()
                )
                nutri_username = (nutri_resp.data or [{}])[0].get("username")
                NotificationService.notify_invite_sent(patient_id, nutri_username, link["id"])
            except Exception:
                pass

        return link

    @staticmethod
    def list_links(current_user: Any) -> list[dict]:
        user_id = CareLinkService._get_user_id(current_user)
        role = CareLinkService._get_role(user_id)

        if role == "nutritionist":
            links_resp = (
                supabase_admin.table("care_links")
                .select("*")
                .eq("nutritionist_id", user_id)
                .order("created_at", desc=True)
                .execute()
            )
            links = links_resp.data or []
            if links:
                patient_ids = list({l["patient_id"] for l in links})
                profiles_resp = (
                    supabase_admin.table("profiles")
                    .select("id, username")
                    .in_("id", patient_ids)
                    .execute()
                )
                umap = {p["id"]: p["username"] for p in (profiles_resp.data or [])}
                for link in links:
                    link["patient_username"] = umap.get(link["patient_id"])
            return links

        if role == "patient":
            links_resp = (
                supabase_admin.table("care_links")
                .select("*")
                .eq("patient_id", user_id)
                .order("created_at", desc=True)
                .execute()
            )
            links = links_resp.data or []
            if links:
                nutri_ids = list({l["nutritionist_id"] for l in links})
                profiles_resp = (
                    supabase_admin.table("profiles")
                    .select("id, username")
                    .in_("id", nutri_ids)
                    .execute()
                )
                umap = {p["id"]: p["username"] for p in (profiles_resp.data or [])}
                for link in links:
                    link["nutritionist_username"] = umap.get(link["nutritionist_id"])
            return links

        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Perfil não configurado.",
        )

    @staticmethod
    def list_invitations(current_user: Any) -> list[dict]:
        """Pending invitations received by the current patient."""
        user_id = CareLinkService._get_user_id(current_user)
        if CareLinkService._get_role(user_id) != "patient":
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Apenas pacientes podem ver convites.",
            )
        links_resp = (
            supabase_admin.table("care_links")
            .select("*")
            .eq("patient_id", user_id)
            .eq("status", "pending")
            .order("created_at", desc=True)
            .execute()
        )
        links = links_resp.data or []
        if links:
            nutri_ids = list({l["nutritionist_id"] for l in links})
            profiles_resp = (
                supabase_admin.table("profiles")
                .select("id, username")
                .in_("id", nutri_ids)
                .execute()
            )
            umap = {p["id"]: p["username"] for p in (profiles_resp.data or [])}
            for link in links:
                link["nutritionist_username"] = umap.get(link["nutritionist_id"])
        return links

    @staticmethod
    def respond_invitation(current_user: Any, link_id: int, accept: bool) -> dict:
        """Patient accepts or rejects a pending invitation."""
        user_id = CareLinkService._get_user_id(current_user)
        if CareLinkService._get_role(user_id) != "patient":
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Apenas pacientes podem responder convites.",
            )
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

        try:
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
        except Exception:
            pass

        return (update_resp.data or [{}])[0]

    @staticmethod
    def list_all_patients(current_user: Any) -> list[dict]:
        user_id = CareLinkService._get_user_id(current_user)

        if CareLinkService._get_role(user_id) != "nutritionist":
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Apenas nutricionistas podem listar pacientes.",
            )

        resp = (
            supabase_admin.table("profiles")
            .select("id, username, created_at")
            .eq("role", "patient")
            .execute()
        )
        return resp.data or []

    @staticmethod
    def get_patients_overview(current_user: Any) -> list[dict]:
        """Nutritionist: one row per active patient, with plan status,
        recent adherence and unread-message count bundled into a single
        response so the dashboard needs only one request."""
        user_id = CareLinkService._get_user_id(current_user)
        if CareLinkService._get_role(user_id) != "nutritionist":
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Apenas nutricionistas podem ver essa visão.",
            )

        links_resp = (
            supabase_admin.table("care_links")
            .select("*")
            .eq("nutritionist_id", user_id)
            .eq("status", "active")
            .order("created_at", desc=True)
            .execute()
        )
        links = links_resp.data or []
        if not links:
            return []

        patient_ids = list({l["patient_id"] for l in links})
        profiles_resp = (
            supabase_admin.table("profiles")
            .select("id, username")
            .in_("id", patient_ids)
            .execute()
        )
        umap = {p["id"]: p["username"] for p in (profiles_resp.data or [])}

        link_ids = [l["id"] for l in links]
        unread_resp = (
            supabase_admin.table("messages")
            .select("care_link_id")
            .in_("care_link_id", link_ids)
            .neq("sender_id", user_id)
            .is_("read_at", "null")
            .eq("is_deleted", False)
            .execute()
        )
        unread_by_link: dict[int, int] = {}
        for row in unread_resp.data or []:
            cid = row["care_link_id"]
            unread_by_link[cid] = unread_by_link.get(cid, 0) + 1

        result = []
        for link in links:
            pct = DietService.compute_recent_adherence_pct(link["patient_id"])
            result.append({
                "care_link_id": link["id"],
                "patient_id": link["patient_id"],
                "patient_username": umap.get(link["patient_id"]),
                "status": link["status"],
                "has_active_plan": pct is not None,
                "adherence_pct": pct,
                "unread_count": unread_by_link.get(link["id"], 0),
            })
        return result
