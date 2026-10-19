from pydantic import BaseModel

VALID_VISIBILITY = {"private", "public"}
VALID_SCOPES = {"all", "mine", "saved", "public"}


class RecipeIngredient(BaseModel):
    food_name: str
    quantity: float
    unit: str


class RecipeCreate(BaseModel):
    title: str
    description: str | None = None
    meal_types: list[str] = []
    ingredients: list[RecipeIngredient] = []
    instructions: list[str] = []
    prep_time_min: int = 0
    servings: int = 1
    visibility: str = "private"


class RecipeUpdate(BaseModel):
    title: str | None = None
    description: str | None = None
    meal_types: list[str] | None = None
    ingredients: list[RecipeIngredient] | None = None
    instructions: list[str] | None = None
    prep_time_min: int | None = None
    servings: int | None = None
    visibility: str | None = None


class RecipeShareRequest(BaseModel):
    recipe_id: int


class RecipeResponse(BaseModel):
    id: int
    owner_id: str | None = None
    owner_username: str | None = None
    title: str
    description: str | None = None
    meal_types: list[str] = []
    ingredients: list[RecipeIngredient] = []
    instructions: list[str] = []
    prep_time_min: int
    servings: int
    visibility: str
    is_builtin: bool
    is_owner: bool
    is_saved: bool
    can_edit: bool
    created_at: str
    updated_at: str
