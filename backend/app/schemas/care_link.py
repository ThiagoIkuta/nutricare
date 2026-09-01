from pydantic import BaseModel


class CareLinkCreate(BaseModel):
    patient_id: str
    send_invitation: bool = False


class CareLinkResponse(BaseModel):
    id: int
    nutritionist_id: str
    patient_id: str
    status: str
    start_date: str | None = None
    end_date: str | None = None
    notes: str | None = None
    created_at: str
    updated_at: str
    patient_username: str | None = None
    nutritionist_username: str | None = None


class PatientListItem(BaseModel):
    id: str
    username: str | None = None
    created_at: str | None = None


class PatientOverviewItem(BaseModel):
    care_link_id: int
    patient_id: str
    patient_username: str | None = None
    status: str
    has_active_plan: bool
    adherence_pct: float | None = None  # None quando não há plano ativo
    unread_count: int
