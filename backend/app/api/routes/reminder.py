from typing import Annotated, Any

from fastapi import APIRouter, Depends, status

from app.api.deps import get_current_user
from app.schemas.reminder import ReminderCreate, ReminderResponse, ReminderUpdate
from app.services.reminder_service import ReminderService

router = APIRouter(prefix="/reminders", tags=["reminders"])


@router.get("", response_model=list[ReminderResponse])
def list_reminders(
    current_user: Annotated[Any, Depends(get_current_user)],
    patient_id: str | None = None,
):
    return ReminderService.list_for_patient(current_user, patient_id)


@router.post("", response_model=ReminderResponse, status_code=status.HTTP_201_CREATED)
def create_reminder(
    payload: ReminderCreate,
    current_user: Annotated[Any, Depends(get_current_user)],
):
    return ReminderService.create(current_user, payload)


@router.put("/{reminder_id}", response_model=ReminderResponse)
def update_reminder(
    reminder_id: int,
    payload: ReminderUpdate,
    current_user: Annotated[Any, Depends(get_current_user)],
):
    return ReminderService.update(current_user, reminder_id, payload)


@router.delete("/{reminder_id}", response_model=dict)
def delete_reminder(
    reminder_id: int,
    current_user: Annotated[Any, Depends(get_current_user)],
):
    return ReminderService.delete(current_user, reminder_id)
