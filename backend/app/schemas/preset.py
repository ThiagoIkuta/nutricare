from pydantic import BaseModel

from app.schemas.diet import MealCreate

VALID_VISIBILITY = {"private", "public"}


class PresetCreate(BaseModel):
    title: str
    objective: str | None = None
    notes: str | None = None
    visibility: str = "private"
    meals: list[MealCreate] = []


class PresetUpdate(BaseModel):
    title: str | None = None
    objective: str | None = None
    notes: str | None = None
    visibility: str | None = None
    meals: list[MealCreate] | None = None


class PresetAssignRequest(BaseModel):
    care_link_id: int


class PresetResponse(BaseModel):
    id: int
    nutritionist_id: str | None = None
    title: str
    objective: str | None = None
    notes: str | None = None
    is_builtin: bool
    visibility: str
    meals: list[MealCreate] = []
    created_at: str
    updated_at: str
