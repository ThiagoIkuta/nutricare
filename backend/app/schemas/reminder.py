from pydantic import BaseModel


class ReminderCreate(BaseModel):
    care_link_id: int | None = None
    category: str
    title: str
    message: str | None = None
    recurrence_type: str
    fixed_times: list[str] | None = None
    interval_hours: float | None = None
    window_start: str | None = None
    window_end: str | None = None
    days_of_week: list[int] = [0, 1, 2, 3, 4, 5, 6]


class ReminderUpdate(BaseModel):
    category: str | None = None
    title: str | None = None
    message: str | None = None
    recurrence_type: str | None = None
    fixed_times: list[str] | None = None
    interval_hours: float | None = None
    window_start: str | None = None
    window_end: str | None = None
    days_of_week: list[int] | None = None
    is_active: bool | None = None


class ReminderResponse(BaseModel):
    id: int
    patient_id: str
    created_by: str
    care_link_id: int | None = None
    category: str
    title: str
    message: str | None = None
    recurrence_type: str
    fixed_times: list[str] | None = None
    interval_hours: float | None = None
    window_start: str | None = None
    window_end: str | None = None
    days_of_week: list[int]
    is_active: bool
    next_fire_at: str | None = None
    created_at: str
    updated_at: str
