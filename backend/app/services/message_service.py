import uuid
from typing import Any

from fastapi import HTTPException, UploadFile, status

from app.core.supabase import supabase_admin
from app.schemas.message import MessageSend
from app.services.image_utils import read_and_validate_image

ATTACHMENTS_BUCKET = "chat-attachments"
MAX_ATTACHMENT_SIZE = 5 * 1024 * 1024  # 5MB, matches the bucket's file_size_limit
SIGNED_URL_TTL_SECONDS = 600  # re-generated on every list/send, so a short TTL is fine


class MessageService:
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
    def _get_care_link_for_user(user_id: str, care_link_id: int) -> dict:
        """Verify the user is part of this care_link (either nutritionist or patient)."""
        resp = (
            supabase_admin.table("care_links")
            .select("*")
            .eq("id", care_link_id)
            .execute()
        )
        rows = resp.data or []
        if not rows:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Vínculo não encontrado.",
            )
        link = rows[0]
        if link["nutritionist_id"] != user_id and link["patient_id"] != user_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Você não faz parte deste vínculo.",
            )
        return link

    @staticmethod
    def _enrich_messages(messages: list[dict]) -> list[dict]:
        """Add sender_username, and turn stored attachment paths into signed URLs."""
        sender_ids = list({m["sender_id"] for m in messages})
        name_map: dict[str, str | None] = {}
        if sender_ids:
            profiles_resp = (
                supabase_admin.table("profiles")
                .select("id, username")
                .in_("id", sender_ids)
                .execute()
            )
            name_map = {p["id"]: p["username"] for p in (profiles_resp.data or [])}

        # `attachment_url` stores the private Storage *path*, not a public URL —
        # resolve it to a short-lived signed URL fresh on every read.
        paths = [m["attachment_url"] for m in messages if m.get("attachment_url")]
        signed_url_map: dict[str, str] = {}
        if paths:
            results = supabase_admin.storage.from_(ATTACHMENTS_BUCKET).create_signed_urls(
                paths, SIGNED_URL_TTL_SECONDS
            )
            for r in results:
                if not r.get("error") and r.get("path"):
                    signed_url_map[r["path"]] = r.get("signedURL") or r.get("signedUrl")

        return [
            {
                **m,
                "sender_username": name_map.get(m["sender_id"]),
                "attachment_url": signed_url_map.get(m["attachment_url"])
                if m.get("attachment_url")
                else None,
            }
            for m in messages
        ]

    @staticmethod
    def list_care_links(current_user: Any) -> list[dict]:
        """Return all active care_links for the current user (both roles)."""
        user_id = MessageService._get_user_id(current_user)

        # Check in both directions
        nutri_resp = (
            supabase_admin.table("care_links")
            .select("*")
            .eq("nutritionist_id", user_id)
            .eq("status", "active")
            .execute()
        )
        patient_resp = (
            supabase_admin.table("care_links")
            .select("*")
            .eq("patient_id", user_id)
            .eq("status", "active")
            .execute()
        )

        links = (nutri_resp.data or []) + (patient_resp.data or [])

        # Enrich with the other party's username
        enriched = []
        for link in links:
            is_nutri = link["nutritionist_id"] == user_id
            other_id = link["patient_id"] if is_nutri else link["nutritionist_id"]
            other_resp = (
                supabase_admin.table("profiles")
                .select("username")
                .eq("id", other_id)
                .limit(1)
                .execute()
            )
            other_rows = other_resp.data or []
            other_username = other_rows[0]["username"] if other_rows else None
            enriched.append({
                **link,
                "other_username": other_username,
                "other_id": other_id,
            })

        return enriched

    @staticmethod
    def list_messages(current_user: Any, care_link_id: int) -> list[dict]:
        user_id = MessageService._get_user_id(current_user)
        MessageService._get_care_link_for_user(user_id, care_link_id)

        resp = (
            supabase_admin.table("messages")
            .select("*")
            .eq("care_link_id", care_link_id)
            .eq("is_deleted", False)
            .order("sent_at")
            .execute()
        )
        messages = resp.data or []
        return MessageService._enrich_messages(messages)

    @staticmethod
    def send_message(current_user: Any, care_link_id: int, payload: MessageSend) -> dict:
        user_id = MessageService._get_user_id(current_user)
        MessageService._get_care_link_for_user(user_id, care_link_id)

        if not payload.content.strip():
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="A mensagem não pode ser vazia.",
            )

        resp = (
            supabase_admin.table("messages")
            .insert({
                "care_link_id": care_link_id,
                "sender_id": user_id,
                "content": payload.content.strip(),
                "message_type": "text",
            })
            .execute()
        )
        rows = resp.data or []
        if not rows:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Falha ao enviar mensagem.",
            )

        enriched = MessageService._enrich_messages(rows)
        return enriched[0]

    @staticmethod
    def send_attachment(current_user: Any, care_link_id: int, file: UploadFile) -> dict:
        user_id = MessageService._get_user_id(current_user)
        MessageService._get_care_link_for_user(user_id, care_link_id)

        content_type, file_bytes, ext = read_and_validate_image(file, MAX_ATTACHMENT_SIZE)
        path = f"{care_link_id}/{uuid.uuid4()}.{ext}"

        try:
            supabase_admin.storage.from_(ATTACHMENTS_BUCKET).upload(
                path, file_bytes, {"content-type": content_type}
            )
        except Exception as exc:
            detail = getattr(exc, "message", None) or str(exc)
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail=f"Falha ao enviar a imagem: {detail}",
            ) from exc

        try:
            resp = (
                supabase_admin.table("messages")
                .insert({
                    "care_link_id": care_link_id,
                    "sender_id": user_id,
                    "content": None,
                    "attachment_url": path,
                    "message_type": "image",
                })
                .execute()
            )
            rows = resp.data or []
            if not rows:
                raise RuntimeError("insert returned no rows")
        except Exception as exc:
            # Don't leak an orphaned object into Storage if the DB write failed.
            supabase_admin.storage.from_(ATTACHMENTS_BUCKET).remove([path])
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Falha ao registrar a mensagem da imagem.",
            ) from exc

        enriched = MessageService._enrich_messages(rows)
        return enriched[0]

    @staticmethod
    def get_unread_counts(current_user: Any) -> dict:
        """Returns total unread count and per-link breakdown for the current user."""
        user_id = MessageService._get_user_id(current_user)

        nutri_resp = (
            supabase_admin.table("care_links")
            .select("id")
            .eq("nutritionist_id", user_id)
            .eq("status", "active")
            .execute()
        )
        patient_resp = (
            supabase_admin.table("care_links")
            .select("id")
            .eq("patient_id", user_id)
            .eq("status", "active")
            .execute()
        )
        link_ids = [r["id"] for r in (nutri_resp.data or []) + (patient_resp.data or [])]
        if not link_ids:
            return {"total": 0, "by_link": {}}

        resp = (
            supabase_admin.table("messages")
            .select("care_link_id")
            .in_("care_link_id", link_ids)
            .neq("sender_id", user_id)
            .is_("read_at", "null")
            .eq("is_deleted", False)
            .execute()
        )
        by_link: dict[str, int] = {}
        for row in resp.data or []:
            k = str(row["care_link_id"])
            by_link[k] = by_link.get(k, 0) + 1

        return {"total": sum(by_link.values()), "by_link": by_link}

    @staticmethod
    def mark_read(current_user: Any, care_link_id: int) -> dict:
        """Mark all messages NOT sent by current user as read."""
        user_id = MessageService._get_user_id(current_user)
        MessageService._get_care_link_for_user(user_id, care_link_id)

        from datetime import datetime, timezone
        now = datetime.now(timezone.utc).isoformat()

        supabase_admin.table("messages").update({"read_at": now}).eq(
            "care_link_id", care_link_id
        ).neq("sender_id", user_id).is_("read_at", "null").execute()

        return {"ok": True}
