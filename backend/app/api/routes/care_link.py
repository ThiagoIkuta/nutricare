from typing import Annotated, Any

from fastapi import APIRouter, Depends, status

from app.api.deps import get_current_user
from app.schemas.care_link import (
    CareLinkCreate,
    CareLinkResponse,
    PatientListItem,
    PatientOverviewItem,
)
from app.services.care_link_service import CareLinkService

router = APIRouter(prefix="/care", tags=["care"])


@router.post("/links", response_model=CareLinkResponse, status_code=status.HTTP_201_CREATED)
def create_link(
    payload: CareLinkCreate,
    current_user: Annotated[Any, Depends(get_current_user)],
):
    return CareLinkService.create_link(
        current_user, payload.patient_id, send_invitation=payload.send_invitation
    )


@router.get("/links", response_model=list[CareLinkResponse])
def list_links(current_user: Annotated[Any, Depends(get_current_user)]):
    return CareLinkService.list_links(current_user)


@router.get("/invitations", response_model=list[CareLinkResponse])
def list_invitations(current_user: Annotated[Any, Depends(get_current_user)]):
    return CareLinkService.list_invitations(current_user)


@router.post("/links/{link_id}/accept", response_model=dict)
def accept_invitation(
    link_id: int,
    current_user: Annotated[Any, Depends(get_current_user)],
):
    return CareLinkService.respond_invitation(current_user, link_id, accept=True)


@router.post("/links/{link_id}/reject", response_model=dict)
def reject_invitation(
    link_id: int,
    current_user: Annotated[Any, Depends(get_current_user)],
):
    return CareLinkService.respond_invitation(current_user, link_id, accept=False)


@router.get("/patients", response_model=list[PatientListItem])
def list_all_patients(current_user: Annotated[Any, Depends(get_current_user)]):
    return CareLinkService.list_all_patients(current_user)


@router.get("/patients/overview", response_model=list[PatientOverviewItem])
def get_patients_overview(current_user: Annotated[Any, Depends(get_current_user)]):
    return CareLinkService.get_patients_overview(current_user)
