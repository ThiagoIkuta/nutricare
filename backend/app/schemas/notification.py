from pydantic import BaseModel


class NotificationResponse(BaseModel):
    id: int | str
    type: str
    title: str
    body: str | None = None
    reference_id: int | None = None
    read_at: str | None = None
    created_at: str


class NotificationPreferencesResponse(BaseModel):
    user_id: str
    reminders_enabled: bool
    chat_enabled: bool
    system_enabled: bool
    quiet_hours_start: str | None = None
    quiet_hours_end: str | None = None


class NotificationPreferencesUpdate(BaseModel):
    reminders_enabled: bool | None = None
    chat_enabled: bool | None = None
    system_enabled: bool | None = None
    quiet_hours_start: str | None = None
    quiet_hours_end: str | None = None
