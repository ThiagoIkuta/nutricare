from typing import Annotated, Any

from fastapi import APIRouter, Depends, status

from app.api.deps import get_current_user
from app.schemas.diet import DietPlanResponse
from app.schemas.preset import (
    PresetAssignRequest,
    PresetCreate,
    PresetResponse,
    PresetUpdate,
)
from app.services.preset_service import PresetService

router = APIRouter(prefix="/diet/presets", tags=["diet-presets"])


@router.get("", response_model=list[PresetResponse])
def list_presets(current_user: Annotated[Any, Depends(get_current_user)]):
    return PresetService.list_presets(current_user)


@router.post("", response_model=PresetResponse, status_code=status.HTTP_201_CREATED)
def create_preset(
    payload: PresetCreate,
    current_user: Annotated[Any, Depends(get_current_user)],
):
    return PresetService.create_preset(current_user, payload)


@router.get("/{preset_id}", response_model=PresetResponse)
def get_preset(
    preset_id: int,
    current_user: Annotated[Any, Depends(get_current_user)],
):
    return PresetService.get_preset(current_user, preset_id)


@router.patch("/{preset_id}", response_model=PresetResponse)
def update_preset(
    preset_id: int,
    payload: PresetUpdate,
    current_user: Annotated[Any, Depends(get_current_user)],
):
    return PresetService.update_preset(current_user, preset_id, payload)


@router.delete("/{preset_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_preset(
    preset_id: int,
    current_user: Annotated[Any, Depends(get_current_user)],
):
    PresetService.delete_preset(current_user, preset_id)


@router.post("/{preset_id}/duplicate", response_model=PresetResponse, status_code=status.HTTP_201_CREATED)
def duplicate_preset(
    preset_id: int,
    current_user: Annotated[Any, Depends(get_current_user)],
):
    return PresetService.duplicate_preset(current_user, preset_id)


@router.post("/{preset_id}/assign", response_model=DietPlanResponse, status_code=status.HTTP_201_CREATED)
def assign_preset(
    preset_id: int,
    payload: PresetAssignRequest,
    current_user: Annotated[Any, Depends(get_current_user)],
):
    return PresetService.assign_preset(current_user, preset_id, payload.care_link_id)
