from typing import Annotated, Any

from fastapi import APIRouter, Depends, File, UploadFile, status

from app.api.deps import get_current_user
from app.schemas.message import MessageResponse, MessageSend
from app.services.message_service import MessageService

router = APIRouter(prefix="/messages", tags=["messages"])


@router.get("/unread-counts", response_model=dict)
def get_unread_counts(current_user: Annotated[Any, Depends(get_current_user)]):
    """Returns {total, by_link} unread message counts for the current user."""
    return MessageService.get_unread_counts(current_user)


@router.get("/links", response_model=list[dict])
def list_care_links(current_user: Annotated[Any, Depends(get_current_user)]):
    """List all active care_links for the current user — used to populate the chat sidebar."""
    return MessageService.list_care_links(current_user)


@router.get("/{care_link_id}", response_model=list[MessageResponse])
def list_messages(
    care_link_id: int,
    current_user: Annotated[Any, Depends(get_current_user)],
):
    return MessageService.list_messages(current_user, care_link_id)


@router.post("/{care_link_id}", response_model=MessageResponse, status_code=status.HTTP_201_CREATED)
def send_message(
    care_link_id: int,
    payload: MessageSend,
    current_user: Annotated[Any, Depends(get_current_user)],
):
    return MessageService.send_message(current_user, care_link_id, payload)


@router.post(
    "/{care_link_id}/attachment",
    response_model=MessageResponse,
    status_code=status.HTTP_201_CREATED,
)
def send_attachment(
    care_link_id: int,
    current_user: Annotated[Any, Depends(get_current_user)],
    file: UploadFile = File(...),
):
    return MessageService.send_attachment(current_user, care_link_id, file)


@router.post("/{care_link_id}/read", response_model=dict)
def mark_read(
    care_link_id: int,
    current_user: Annotated[Any, Depends(get_current_user)],
):
    return MessageService.mark_read(current_user, care_link_id)
