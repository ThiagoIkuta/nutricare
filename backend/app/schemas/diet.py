from pydantic import BaseModel


class MealItemCreate(BaseModel):
    item_description: str
    quantity: float | None = None
    unit: str | None = None
    preparation_notes: str | None = None
    display_order: int = 1


class MealCreate(BaseModel):
    name: str
    scheduled_time: str | None = None
    instructions: str | None = None
    display_order: int = 1
    items: list[MealItemCreate] = []


class DietPlanCreate(BaseModel):
    care_link_id: int
    title: str
    objective: str | None = None
    start_date: str | None = None
    end_date: str | None = None
    notes: str | None = None
    meals: list[MealCreate] = []


class DietPlanUpdate(BaseModel):
    title: str | None = None
    objective: str | None = None
    start_date: str | None = None
    end_date: str | None = None
    notes: str | None = None
    status: str | None = None


class DietPlanMealsReplace(BaseModel):
    meals: list[MealCreate] = []


class MealItemResponse(BaseModel):
    id: int
    meal_id: int
    item_description: str
    quantity: float | None = None
    unit: str | None = None
    preparation_notes: str | None = None
    display_order: int


class MealResponse(BaseModel):
    id: int
    diet_plan_day_id: int
    name: str
    scheduled_time: str | None = None
    instructions: str | None = None
    display_order: int
    items: list[MealItemResponse] = []


class DietPlanDayResponse(BaseModel):
    id: int
    diet_plan_id: int
    day_of_week: int
    label: str | None = None
    meals: list[MealResponse] = []


class DietPlanResponse(BaseModel):
    id: int
    care_link_id: int
    title: str
    objective: str | None = None
    status: str
    start_date: str | None = None
    end_date: str | None = None
    notes: str | None = None
    created_at: str
    updated_at: str
    patient_id: str | None = None
    patient_username: str | None = None
    days: list[DietPlanDayResponse] = []


class DietPlanSummaryResponse(BaseModel):
    id: int
    care_link_id: int
    title: str
    objective: str | None = None
    status: str
    start_date: str | None = None
    end_date: str | None = None
    created_at: str
    meal_count: int
    nutritionist_username: str | None = None


class MealItemToggleRequest(BaseModel):
    completed_on: str  # "YYYY-MM-DD"


class MealItemToggleResponse(BaseModel):
    meal_item_id: int
    completed_on: str
    completed: bool  # true = marcado agora, false = desmarcado agora


class AdherenceDay(BaseModel):
    date: str  # "YYYY-MM-DD"
    expected: int
    completed: int
    completed_item_ids: list[int] = []


class AdherenceResponse(BaseModel):
    days: list[AdherenceDay]
