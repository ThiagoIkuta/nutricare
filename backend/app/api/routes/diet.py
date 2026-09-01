from typing import Annotated, Any

from fastapi import APIRouter, Depends, status

from app.api.deps import get_current_user
from app.schemas.diet import (
    AdherenceResponse,
    DietPlanCreate,
    DietPlanMealsReplace,
    DietPlanResponse,
    DietPlanSummaryResponse,
    DietPlanUpdate,
    MealItemToggleRequest,
    MealItemToggleResponse,
)
from app.services.diet_service import DietService

router = APIRouter(prefix="/diet", tags=["diet"])


@router.post("/plans", response_model=DietPlanResponse, status_code=status.HTTP_201_CREATED)
def create_plan(
    payload: DietPlanCreate,
    current_user: Annotated[Any, Depends(get_current_user)],
):
    return DietService.create_plan(current_user, payload)


@router.get("/plans", response_model=list[DietPlanSummaryResponse])
def list_plans(current_user: Annotated[Any, Depends(get_current_user)]):
    return DietService.list_plans(current_user)


@router.get("/my-plans", response_model=list[DietPlanSummaryResponse])
def list_my_plans(current_user: Annotated[Any, Depends(get_current_user)]):
    """Patient: list all plans from all care_links."""
    return DietService.list_my_plans(current_user)


@router.get("/my-plan", response_model=DietPlanResponse)
def get_my_plan(current_user: Annotated[Any, Depends(get_current_user)]):
    return DietService.get_my_plan(current_user)


@router.get("/plans/{plan_id}", response_model=DietPlanResponse)
def get_plan(
    plan_id: int,
    current_user: Annotated[Any, Depends(get_current_user)],
):
    return DietService.get_plan(current_user, plan_id)


@router.patch("/plans/{plan_id}", response_model=DietPlanResponse)
def update_plan(
    plan_id: int,
    payload: DietPlanUpdate,
    current_user: Annotated[Any, Depends(get_current_user)],
):
    return DietService.update_plan(current_user, plan_id, payload)


@router.put("/plans/{plan_id}/days/{day_of_week}/meals", response_model=DietPlanResponse)
def replace_day_meals(
    plan_id: int,
    day_of_week: int,
    payload: DietPlanMealsReplace,
    current_user: Annotated[Any, Depends(get_current_user)],
):
    return DietService.replace_day_meals(current_user, plan_id, day_of_week, payload)


@router.put("/plans/{plan_id}/meals", response_model=DietPlanResponse)
def replace_plan_meals(
    plan_id: int,
    payload: DietPlanMealsReplace,
    current_user: Annotated[Any, Depends(get_current_user)],
):
    return DietService.replace_meals(current_user, plan_id, payload)


@router.delete("/plans/{plan_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_plan(
    plan_id: int,
    current_user: Annotated[Any, Depends(get_current_user)],
):
    DietService.delete_plan(current_user, plan_id)


@router.post("/meal-items/{meal_item_id}/toggle", response_model=MealItemToggleResponse)
def toggle_meal_item(
    meal_item_id: int,
    payload: MealItemToggleRequest,
    current_user: Annotated[Any, Depends(get_current_user)],
):
    """Patient marks/unmarks a meal item as consumed on a given date."""
    return DietService.toggle_meal_item(current_user, meal_item_id, payload.completed_on)


@router.get("/my-plan/adherence", response_model=AdherenceResponse)
def get_my_plan_adherence(
    start: str,
    end: str,
    current_user: Annotated[Any, Depends(get_current_user)],
):
    """Patient: expected vs. completed item counts per date in [start, end]."""
    return DietService.get_my_plan_adherence(current_user, start, end)
