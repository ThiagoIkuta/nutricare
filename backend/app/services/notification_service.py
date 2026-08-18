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
        # Use upsert (not insert) so two near-simultaneous first-time requests
        # for the same user don't race on the user_id primary key.
        insert_resp = (
            supabase_admin.table("notification_preferences")
            .upsert({"user_id": user_id}, on_conflict="user_id")
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
                next_fire = compute_next_fire_at(
                    recurrence_type=reminder["recurrence_type"],
                    fixed_times=reminder.get("fixed_times"),
                    interval_hours=reminder.get("interval_hours"),
                    window_start=reminder.get("window_start"),
                    window_end=reminder.get("window_end"),
                    days_of_week=reminder.get("days_of_week") or ALL_DAYS,
                    after=now,
                )
            except ValueError:
                # malformed recurrence data: stop retrying forever, surface a
                # one-time, recoverable failure instead of spamming notifications.
                supabase_admin.table("reminders").update(
                    {"is_active": False}
                ).eq("id", reminder["id"]).execute()
                continue

            try:
                original_next_fire_at = reminder["next_fire_at"]
                claim_resp = (
                    supabase_admin.table("reminders")
                    .update({"next_fire_at": next_fire.isoformat()})
                    .eq("id", reminder["id"])
                    .eq("next_fire_at", original_next_fire_at)
                    .execute()
                )
                if not (claim_resp.data or []):
                    # Another concurrent call already claimed this firing — skip
                    # to avoid inserting a duplicate notification.
                    continue

                if prefs.get("reminders_enabled", True) and not NotificationService._in_quiet_hours(now, prefs):
                    supabase_admin.table("notifications").insert({
                        "recipient_id": user_id,
                        "type": "reminder",
                        "title": reminder["title"],
                        "body": reminder.get("message"),
                        "reference_id": reminder["id"],
                    }).execute()
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
        prefs = NotificationService._get_or_create_preferences(user_id)
        if prefs.get("chat_enabled", True):
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

        prefs = NotificationService._get_or_create_preferences(user_id)
        chat_conversations_with_unread = (
            len(NotificationService._build_chat_summaries(current_user))
            if prefs.get("chat_enabled", True)
            else 0
        )
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

        update_data = payload.model_dump(exclude_unset=True)
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
