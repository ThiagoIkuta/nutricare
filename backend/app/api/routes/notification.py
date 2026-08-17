from typing import Annotated, Any

from fastapi import APIRouter, Depends

from app.api.deps import get_current_user
from app.schemas.notification import (
    NotificationPreferencesResponse,
    NotificationPreferencesUpdate,
    NotificationResponse,
)
from app.services.notification_service import NotificationService

router = APIRouter(prefix="/notifications", tags=["notifications"])


@router.get("", response_model=list[NotificationResponse])
def list_notifications(current_user: Annotated[Any, Depends(get_current_user)]):
    return NotificationService.list_feed(current_user)


@router.get("/unread-counts", response_model=dict)
def get_unread_counts(current_user: Annotated[Any, Depends(get_current_user)]):
    return NotificationService.get_unread_counts(current_user)


@router.post("/{notification_id}/read", response_model=dict)
def mark_read(
    notification_id: int,
    current_user: Annotated[Any, Depends(get_current_user)],
):
    return NotificationService.mark_read(current_user, notification_id)


@router.post("/read-all", response_model=dict)
def mark_all_read(current_user: Annotated[Any, Depends(get_current_user)]):
    return NotificationService.mark_all_read(current_user)


@router.get("/preferences", response_model=NotificationPreferencesResponse)
def get_preferences(current_user: Annotated[Any, Depends(get_current_user)]):
    return NotificationService.get_preferences(current_user)


@router.put("/preferences", response_model=NotificationPreferencesResponse)
def update_preferences(
    payload: NotificationPreferencesUpdate,
    current_user: Annotated[Any, Depends(get_current_user)],
):
    return NotificationService.update_preferences(current_user, payload)
