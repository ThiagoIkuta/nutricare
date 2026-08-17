from typing import Any

from fastapi import HTTPException, status

from app.core.supabase import supabase_admin
from app.schemas.diet import DietPlanCreate, DietPlanMealsReplace, DietPlanUpdate
from app.services.notification_service import NotificationService

VALID_STATUSES = {"draft", "active", "archived"}

DAY_NAMES = ["Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado", "Domingo"]


class DietService:
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
    def _get_profile_role(user_id: str) -> str | None:
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
    def _require_nutritionist(user_id: str) -> None:
        role = DietService._get_profile_role(user_id)
        if role != "nutritionist":
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Apenas nutricionistas podem gerenciar planos alimentares.",
            )

    @staticmethod
    def _get_nutritionist_care_link_ids(user_id: str) -> list[int]:
        resp = (
            supabase_admin.table("care_links")
            .select("id")
            .eq("nutritionist_id", user_id)
            .execute()
        )
        return [r["id"] for r in (resp.data or [])]

    @staticmethod
    def _get_plan_or_404(plan_id: int, nutritionist_id: str) -> dict:
        care_link_ids = DietService._get_nutritionist_care_link_ids(nutritionist_id)
        if not care_link_ids:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Plano alimentar não encontrado.",
            )
        resp = (
            supabase_admin.table("diet_plans")
            .select("*")
            .eq("id", plan_id)
            .in_("care_link_id", care_link_ids)
            .limit(1)
            .execute()
        )
        rows = resp.data or []
        if not rows:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Plano alimentar não encontrado.",
            )
        return rows[0]

    @staticmethod
    def _enrich_with_patient(plan_row: dict) -> dict:
        care_link_id = plan_row.get("care_link_id")
        if not care_link_id:
            return {**plan_row, "patient_id": None, "patient_username": None}

        link_resp = (
            supabase_admin.table("care_links")
            .select("patient_id")
            .eq("id", care_link_id)
            .limit(1)
            .execute()
        )
        link_rows = link_resp.data or []
        patient_id = link_rows[0]["patient_id"] if link_rows else None
        patient_username = None

        if patient_id:
            profile_resp = (
                supabase_admin.table("profiles")
                .select("username")
                .eq("id", patient_id)
                .limit(1)
                .execute()
            )
            profile_rows = profile_resp.data or []
            patient_username = profile_rows[0]["username"] if profile_rows else None

        return {**plan_row, "patient_id": patient_id, "patient_username": patient_username}

    @staticmethod
    def _build_full_plan(plan_row: dict) -> dict:
        plan_id = plan_row["id"]
        enriched = DietService._enrich_with_patient(plan_row)

        days_resp = (
            supabase_admin.table("diet_plan_days")
            .select("*")
            .eq("diet_plan_id", plan_id)
            .order("day_of_week")
            .execute()
        )
        days = days_resp.data or []

        if not days:
            return {**enriched, "days": []}

        day_ids = [d["id"] for d in days]
        meals_resp = (
            supabase_admin.table("meals")
            .select("*")
            .in_("diet_plan_day_id", day_ids)
            .order("display_order")
            .execute()
        )
        meals_by_day: dict[int, list] = {d["id"]: [] for d in days}
        for meal in meals_resp.data or []:
            did = meal["diet_plan_day_id"]
            if did in meals_by_day:
                meals_by_day[did].append(meal)

        all_meal_ids = [m["id"] for ms in meals_by_day.values() for m in ms]
        items_by_meal: dict[int, list] = {}
        if all_meal_ids:
            items_resp = (
                supabase_admin.table("meal_items")
                .select("*")
                .in_("meal_id", all_meal_ids)
                .order("display_order")
                .execute()
            )
            for item in items_resp.data or []:
                mid = item["meal_id"]
                items_by_meal.setdefault(mid, []).append(item)

        assembled_days = []
        for day in days:
            day_meals = meals_by_day.get(day["id"], [])
            assembled_meals = [
                {**m, "items": items_by_meal.get(m["id"], [])}
                for m in day_meals
            ]
            assembled_days.append({**day, "meals": assembled_meals})

        return {**enriched, "days": assembled_days}

    @staticmethod
    def create_plan(current_user: Any, payload: DietPlanCreate) -> dict:
        user_id = DietService._get_user_id(current_user)
        DietService._require_nutritionist(user_id)

        link_resp = (
            supabase_admin.table("care_links")
            .select("id")
            .eq("id", payload.care_link_id)
            .eq("nutritionist_id", user_id)
            .limit(1)
            .execute()
        )
        if not (link_resp.data or []):
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Vínculo com paciente não encontrado.",
            )

        plan_resp = (
            supabase_admin.table("diet_plans")
            .insert({
                "care_link_id": payload.care_link_id,
                "title": payload.title,
                "objective": payload.objective,
                "start_date": payload.start_date,
                "end_date": payload.end_date,
                "notes": payload.notes,
                "status": "draft",
            })
            .execute()
        )
        plan_rows = plan_resp.data or []
        if not plan_rows:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Falha ao criar o plano alimentar.",
            )
        plan = plan_rows[0]
        plan_id = plan["id"]
        try:
            NotificationService.notify_diet_plan_assigned(payload.care_link_id, payload.title, plan_id)
        except Exception:
            pass

        # Create 7 days (Mon=0 … Sun=6) and replicate meals across all days
        for day_idx in range(7):
            day_resp = (
                supabase_admin.table("diet_plan_days")
                .insert({
                    "diet_plan_id": plan_id,
                    "day_of_week": day_idx,
                    "label": DAY_NAMES[day_idx],
                })
                .execute()
            )
            day_rows = day_resp.data or []
            if not day_rows:
                continue
            day_id = day_rows[0]["id"]

            for meal in payload.meals:
                meal_resp = (
                    supabase_admin.table("meals")
                    .insert({
                        "diet_plan_day_id": day_id,
                        "name": meal.name,
                        "scheduled_time": meal.scheduled_time,
                        "instructions": meal.instructions,
                        "display_order": meal.display_order,
                    })
                    .execute()
                )
                meal_rows = meal_resp.data or []
                if not meal_rows or not meal.items:
                    continue
                meal_id = meal_rows[0]["id"]

                items_data = [
                    {
                        "meal_id": meal_id,
                        "item_description": item.item_description,
                        "quantity": item.quantity,
                        "unit": item.unit,
                        "preparation_notes": item.preparation_notes,
                        "display_order": item.display_order,
                    }
                    for item in meal.items
                ]
                supabase_admin.table("meal_items").insert(items_data).execute()

        return DietService._build_full_plan(plan)

    @staticmethod
    def list_plans(current_user: Any) -> list[dict]:
        user_id = DietService._get_user_id(current_user)
        DietService._require_nutritionist(user_id)

        care_link_ids = DietService._get_nutritionist_care_link_ids(user_id)
        if not care_link_ids:
            return []

        plans_resp = (
            supabase_admin.table("diet_plans")
            .select("*")
            .in_("care_link_id", care_link_ids)
            .order("created_at", desc=True)
            .execute()
        )
        plans = plans_resp.data or []
        if not plans:
            return []

        plan_ids = [p["id"] for p in plans]

        # Count meals from day 0 only (representative day)
        day0_resp = (
            supabase_admin.table("diet_plan_days")
            .select("id, diet_plan_id")
            .in_("diet_plan_id", plan_ids)
            .eq("day_of_week", 0)
            .execute()
        )
        day0_map = {row["diet_plan_id"]: row["id"] for row in (day0_resp.data or [])}

        meal_counts: dict[int, int] = {}
        if day0_map:
            rev_map = {v: k for k, v in day0_map.items()}
            meals_resp = (
                supabase_admin.table("meals")
                .select("diet_plan_day_id")
                .in_("diet_plan_day_id", list(day0_map.values()))
                .execute()
            )
            for row in meals_resp.data or []:
                pid = rev_map.get(row["diet_plan_day_id"])
                if pid:
                    meal_counts[pid] = meal_counts.get(pid, 0) + 1

        return [{**p, "meal_count": meal_counts.get(p["id"], 0)} for p in plans]

    @staticmethod
    def get_plan(current_user: Any, plan_id: int) -> dict:
        user_id = DietService._get_user_id(current_user)
        DietService._require_nutritionist(user_id)
        plan = DietService._get_plan_or_404(plan_id, user_id)
        return DietService._build_full_plan(plan)

    @staticmethod
    def update_plan(current_user: Any, plan_id: int, payload: DietPlanUpdate) -> dict:
        user_id = DietService._get_user_id(current_user)
        DietService._require_nutritionist(user_id)
        DietService._get_plan_or_404(plan_id, user_id)

        update_data = payload.model_dump(exclude_none=True)

        if "status" in update_data and update_data["status"] not in VALID_STATUSES:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail=f"Status inválido. Use: {', '.join(VALID_STATUSES)}.",
            )

        if not update_data:
            plan = DietService._get_plan_or_404(plan_id, user_id)
            return DietService._build_full_plan(plan)

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
        try:
            NotificationService.notify_diet_plan_assigned(
                rows[0]["care_link_id"], rows[0]["title"], plan_id
            )
        except Exception:
            pass
        return DietService._build_full_plan(rows[0])

    @staticmethod
    def replace_day_meals(
        current_user: Any, plan_id: int, day_of_week: int, payload: DietPlanMealsReplace
    ) -> dict:
        """Replace meals for a single day_of_week within a plan."""
        user_id = DietService._get_user_id(current_user)
        DietService._require_nutritionist(user_id)
        DietService._get_plan_or_404(plan_id, user_id)

        if not (0 <= day_of_week <= 6):
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="day_of_week deve ser entre 0 (Segunda) e 6 (Domingo).",
            )

        # Get or create the day row
        day_resp = (
            supabase_admin.table("diet_plan_days")
            .select("id")
            .eq("diet_plan_id", plan_id)
            .eq("day_of_week", day_of_week)
            .limit(1)
            .execute()
        )
        day_rows = day_resp.data or []

        if day_rows:
            day_id = day_rows[0]["id"]
            # Delete existing meals bottom-up
            meals_resp = (
                supabase_admin.table("meals")
                .select("id")
                .eq("diet_plan_day_id", day_id)
                .execute()
            )
            meal_ids = [m["id"] for m in (meals_resp.data or [])]
            if meal_ids:
                supabase_admin.table("meal_items").delete().in_("meal_id", meal_ids).execute()
                supabase_admin.table("meals").delete().in_("id", meal_ids).execute()
        else:
            new_day = (
                supabase_admin.table("diet_plan_days")
                .insert({
                    "diet_plan_id": plan_id,
                    "day_of_week": day_of_week,
                    "label": DAY_NAMES[day_of_week],
                })
                .execute()
            )
            day_id = (new_day.data or [])[0]["id"]

        # Insert new meals
        for meal in payload.meals:
            meal_resp = (
                supabase_admin.table("meals")
                .insert({
                    "diet_plan_day_id": day_id,
                    "name": meal.name,
                    "scheduled_time": meal.scheduled_time,
                    "instructions": meal.instructions,
                    "display_order": meal.display_order,
                })
                .execute()
            )
            meal_rows = meal_resp.data or []
            if not meal_rows or not meal.items:
                continue
            meal_id = meal_rows[0]["id"]
            items_data = [
                {
                    "meal_id": meal_id,
                    "item_description": item.item_description,
                    "quantity": item.quantity,
                    "unit": item.unit,
                    "preparation_notes": item.preparation_notes,
                    "display_order": item.display_order,
                }
                for item in meal.items
            ]
            supabase_admin.table("meal_items").insert(items_data).execute()

        plan = DietService._get_plan_or_404(plan_id, user_id)
        return DietService._build_full_plan(plan)

    @staticmethod
    def replace_meals(current_user: Any, plan_id: int, payload: DietPlanMealsReplace) -> dict:
        """Delete all existing days/meals/items and recreate from payload."""
        user_id = DietService._get_user_id(current_user)
        DietService._require_nutritionist(user_id)
        DietService._get_plan_or_404(plan_id, user_id)

        # Fetch existing days
        days_resp = (
            supabase_admin.table("diet_plan_days")
            .select("id")
            .eq("diet_plan_id", plan_id)
            .execute()
        )
        day_ids = [d["id"] for d in (days_resp.data or [])]

        if day_ids:
            # Fetch meals for those days
            meals_resp = (
                supabase_admin.table("meals")
                .select("id")
                .in_("diet_plan_day_id", day_ids)
                .execute()
            )
            meal_ids = [m["id"] for m in (meals_resp.data or [])]

            # Delete bottom-up: items → meals → days
            if meal_ids:
                supabase_admin.table("meal_items").delete().in_("meal_id", meal_ids).execute()
                supabase_admin.table("meals").delete().in_("id", meal_ids).execute()
            supabase_admin.table("diet_plan_days").delete().in_("id", day_ids).execute()

        # Recreate 7 days with new meals
        for day_idx in range(7):
            day_resp = (
                supabase_admin.table("diet_plan_days")
                .insert({
                    "diet_plan_id": plan_id,
                    "day_of_week": day_idx,
                    "label": DAY_NAMES[day_idx],
                })
                .execute()
            )
            day_rows = day_resp.data or []
            if not day_rows:
                continue
            day_id = day_rows[0]["id"]

            for meal in payload.meals:
                meal_resp = (
                    supabase_admin.table("meals")
                    .insert({
                        "diet_plan_day_id": day_id,
                        "name": meal.name,
                        "scheduled_time": meal.scheduled_time,
                        "instructions": meal.instructions,
                        "display_order": meal.display_order,
                    })
                    .execute()
                )
                meal_rows = meal_resp.data or []
                if not meal_rows or not meal.items:
                    continue
                meal_id = meal_rows[0]["id"]

                items_data = [
                    {
                        "meal_id": meal_id,
                        "item_description": item.item_description,
                        "quantity": item.quantity,
                        "unit": item.unit,
                        "preparation_notes": item.preparation_notes,
                        "display_order": item.display_order,
                    }
                    for item in meal.items
                ]
                supabase_admin.table("meal_items").insert(items_data).execute()

        plan = DietService._get_plan_or_404(plan_id, user_id)
        return DietService._build_full_plan(plan)

    @staticmethod
    def delete_plan(current_user: Any, plan_id: int) -> None:
        user_id = DietService._get_user_id(current_user)
        DietService._require_nutritionist(user_id)
        DietService._get_plan_or_404(plan_id, user_id)
        supabase_admin.table("diet_plans").delete().eq("id", plan_id).execute()

    @staticmethod
    def list_my_plans(current_user: Any) -> list[dict]:
        """Patient gets all plans across all their care_links (any status)."""
        user_id = DietService._get_user_id(current_user)
        role = DietService._get_profile_role(user_id)
        if role != "patient":
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Apenas pacientes podem acessar este endpoint.",
            )

        link_resp = (
            supabase_admin.table("care_links")
            .select("id, nutritionist_id, status")
            .eq("patient_id", user_id)
            .execute()
        )
        links = link_resp.data or []
        if not links:
            return []

        care_link_ids = [l["id"] for l in links]
        link_nutri_map = {l["id"]: l["nutritionist_id"] for l in links}

        plans_resp = (
            supabase_admin.table("diet_plans")
            .select("*")
            .in_("care_link_id", care_link_ids)
            .order("created_at", desc=True)
            .execute()
        )
        plans = plans_resp.data or []
        if not plans:
            return []

        # Count meals from day 0
        plan_ids = [p["id"] for p in plans]
        day0_resp = (
            supabase_admin.table("diet_plan_days")
            .select("id, diet_plan_id")
            .in_("diet_plan_id", plan_ids)
            .eq("day_of_week", 0)
            .execute()
        )
        day0_map = {row["diet_plan_id"]: row["id"] for row in (day0_resp.data or [])}
        meal_counts: dict[int, int] = {}
        if day0_map:
            rev = {v: k for k, v in day0_map.items()}
            meals_resp = (
                supabase_admin.table("meals")
                .select("diet_plan_day_id")
                .in_("diet_plan_day_id", list(day0_map.values()))
                .execute()
            )
            for row in meals_resp.data or []:
                pid = rev.get(row["diet_plan_day_id"])
                if pid:
                    meal_counts[pid] = meal_counts.get(pid, 0) + 1

        # Enrich with nutritionist username
        nutri_ids = list({link_nutri_map[p["care_link_id"]] for p in plans if p["care_link_id"] in link_nutri_map})
        nutri_name_map: dict[str, str] = {}
        if nutri_ids:
            nutri_resp = (
                supabase_admin.table("profiles")
                .select("id, username")
                .in_("id", nutri_ids)
                .execute()
            )
            nutri_name_map = {r["id"]: r["username"] for r in (nutri_resp.data or [])}

        result = []
        for p in plans:
            nutri_id = link_nutri_map.get(p["care_link_id"])
            result.append({
                **p,
                "meal_count": meal_counts.get(p["id"], 0),
                "nutritionist_username": nutri_name_map.get(nutri_id) if nutri_id else None,
            })
        return result

    @staticmethod
    def get_my_plan(current_user: Any) -> dict:
        user_id = DietService._get_user_id(current_user)

        role = DietService._get_profile_role(user_id)
        if role != "patient":
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Apenas pacientes possuem plano alimentar associado.",
            )

        link_resp = (
            supabase_admin.table("care_links")
            .select("id")
            .eq("patient_id", user_id)
            .eq("status", "active")
            .limit(1)
            .execute()
        )
        if not (link_resp.data or []):
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Nenhum vínculo ativo com nutricionista encontrado.",
            )

        care_link_id = link_resp.data[0]["id"]

        plan_resp = (
            supabase_admin.table("diet_plans")
            .select("*")
            .eq("care_link_id", care_link_id)
            .eq("status", "active")
            .order("created_at", desc=True)
            .limit(1)
            .execute()
        )
        if not (plan_resp.data or []):
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Nenhum plano alimentar ativo. Aguarde seu nutricionista ativar um plano.",
            )

        return DietService._build_full_plan(plan_resp.data[0])
