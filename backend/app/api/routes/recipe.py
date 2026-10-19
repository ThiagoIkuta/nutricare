from typing import Annotated, Any

from fastapi import APIRouter, Depends, status

from app.api.deps import get_current_user
from app.schemas.recipe import RecipeCreate, RecipeResponse, RecipeUpdate
from app.services.recipe_service import RecipeService

router = APIRouter(prefix="/recipes", tags=["recipes"])


@router.get("", response_model=list[RecipeResponse])
def list_recipes(
    current_user: Annotated[Any, Depends(get_current_user)],
    scope: str = "all",
):
    """scope: all (próprias + salvas + públicas/sistema), mine, saved ou public."""
    return RecipeService.list_book(current_user, scope)


@router.post("", response_model=RecipeResponse, status_code=status.HTTP_201_CREATED)
def create_recipe(
    payload: RecipeCreate,
    current_user: Annotated[Any, Depends(get_current_user)],
):
    return RecipeService.create_recipe(current_user, payload)


@router.get("/{recipe_id}", response_model=RecipeResponse)
def get_recipe(
    recipe_id: int,
    current_user: Annotated[Any, Depends(get_current_user)],
):
    return RecipeService.get_recipe(current_user, recipe_id)


@router.patch("/{recipe_id}", response_model=RecipeResponse)
def update_recipe(
    recipe_id: int,
    payload: RecipeUpdate,
    current_user: Annotated[Any, Depends(get_current_user)],
):
    return RecipeService.update_recipe(current_user, recipe_id, payload)


@router.delete("/{recipe_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_recipe(
    recipe_id: int,
    current_user: Annotated[Any, Depends(get_current_user)],
):
    RecipeService.delete_recipe(current_user, recipe_id)


@router.post("/{recipe_id}/save", response_model=dict)
def save_recipe(
    recipe_id: int,
    current_user: Annotated[Any, Depends(get_current_user)],
):
    return RecipeService.save_recipe(current_user, recipe_id)


@router.delete("/{recipe_id}/save", response_model=dict)
def unsave_recipe(
    recipe_id: int,
    current_user: Annotated[Any, Depends(get_current_user)],
):
    return RecipeService.unsave_recipe(current_user, recipe_id)
