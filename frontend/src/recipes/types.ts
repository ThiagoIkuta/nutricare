export type RecipeVisibility = "private" | "public";

export type RecipeScope = "all" | "mine" | "saved" | "public";

export type RecipeIngredient = {
  food_name: string; // quando bate com um TacoFood.name, entra no cálculo de macros
  quantity: number;
  unit: string;
};

/** Conteúdo de uma receita — também é o formato do snapshot enviado no chat. */
export type RecipeContent = {
  title: string;
  description: string | null;
  meal_types: string[];
  ingredients: RecipeIngredient[];
  instructions: string[];
  prep_time_min: number;
  servings: number;
};

export type Recipe = RecipeContent & {
  id: number;
  owner_id: string | null;
  owner_username: string | null;
  visibility: RecipeVisibility;
  is_builtin: boolean;
  is_owner: boolean;
  is_saved: boolean;
  can_edit: boolean;
  created_at: string;
  updated_at: string;
};

export type RecipePayload = RecipeContent & { visibility: RecipeVisibility };

export const MEAL_TYPE_OPTIONS = ["Café da manhã", "Almoço", "Lanche da tarde", "Jantar", "Lanche", "Ceia"];

/** Rótulo de origem exibido nos cards/listas do livro. */
export function recipeSourceLabel(recipe: Recipe): string {
  if (recipe.is_builtin) return "Sistema";
  if (recipe.is_owner) return recipe.visibility === "public" ? "Minha · Pública" : "Minha · Privada";
  if (recipe.is_saved) return "Salva";
  return "Pública";
}
