import { TACO_FOODS, normalizeText } from "../data/taco_foods";
import type { Meal } from "../diet/types";
import type { Recipe, RecipeIngredient } from "./types";

export type RecipeMacros = {
  kcal: number;
  protein_g: number;
  carb_g: number;
  fat_g: number;
};

/** Macros totais da receita. Ingredientes que não batem com a base TACO
 * (texto livre digitado pelo usuário) simplesmente não entram na soma. */
export function computeRecipeMacros(recipe: { ingredients: RecipeIngredient[] }): RecipeMacros {
  return recipe.ingredients.reduce<RecipeMacros>(
    (totals, ing) => {
      const food = TACO_FOODS.find((f) => normalizeText(f.name) === normalizeText(ing.food_name));
      if (!food) return totals;
      // TACO values are per 100g/100ml. An ingredient given in g/ml is used as-is;
      // any other unit (unidade/colher/fatia...) counts as N portions of the
      // food's default_qty in grams.
      const unit = normalizeText(ing.unit.trim());
      const baseQty = unit === "g" || unit === "ml" ? ing.quantity : ing.quantity * food.default_qty;
      const factor = baseQty / 100;
      return {
        kcal: totals.kcal + food.kcal * factor,
        protein_g: totals.protein_g + food.protein_g * factor,
        carb_g: totals.carb_g + food.carb_g * factor,
        fat_g: totals.fat_g + food.fat_g * factor,
      };
    },
    { kcal: 0, protein_g: 0, carb_g: 0, fat_g: 0 },
  );
}

// Words like "cozido"/"grelhado"/"crua" show up in almost every TACO name and
// carry no identifying signal on their own — ignoring them (plus very short
// words) avoids matches on prep-method alone.
const STOP_WORDS = new Set(["de", "da", "do", "em", "com", "cozida", "cozido", "grelhado", "grelhada", "cru", "crua"]);

function significantWords(s: string): string[] {
  return normalizeText(s)
    .split(/\s+/)
    .filter((w) => w.length > 2 && !STOP_WORDS.has(w));
}

/** True if the ingredient name and the plan item description share at least
 * one significant word — robust to TACO's word order (e.g. "Frango peito
 * grelhado" vs. a plan item written as "Frango grelhado"). */
export function ingredientMatchesItem(ingredientFoodName: string, itemDescription: string): boolean {
  const ingWords = new Set(significantWords(ingredientFoodName));
  return significantWords(itemDescription).some((w) => ingWords.has(w));
}

/** Sugere receitas para uma refeição do plano a partir do livro do usuário
 * (próprias + salvas + públicas/sistema, vindo de GET /recipes?scope=all).
 * Em caso de empate, receitas próprias e salvas aparecem primeiro. */
export function suggestRecipesForMeal(meal: Meal, recipes: Recipe[], limit = 3): Recipe[] {
  const itemDescriptions = meal.items.map((i) => i.item_description);
  const mealNameNorm = normalizeText(meal.name);

  const scored = recipes.map((recipe) => {
    const ingredientMatches = recipe.ingredients.filter((ing) =>
      itemDescriptions.some((desc) => ingredientMatchesItem(ing.food_name, desc)),
    ).length;

    const typeMatch = recipe.meal_types.some((t) => {
      const typeNorm = normalizeText(t);
      return mealNameNorm.includes(typeNorm) || typeNorm.includes(mealNameNorm);
    });

    const score = ingredientMatches + (typeMatch ? 1 : 0);
    const personal = recipe.is_owner || recipe.is_saved ? 1 : 0;
    return { recipe, score, personal };
  });

  return scored
    .filter((s) => s.score > 0)
    .sort((a, b) => b.score - a.score || b.personal - a.personal)
    .slice(0, limit)
    .map((s) => s.recipe);
}

/** Busca simples por título ou ingrediente, usada no livro de receitas. */
export function recipeMatchesQuery(recipe: { title: string; ingredients: RecipeIngredient[] }, query: string): boolean {
  const q = normalizeText(query.trim());
  if (!q) return true;
  return (
    normalizeText(recipe.title).includes(q) ||
    recipe.ingredients.some((ing) => normalizeText(ing.food_name).includes(q))
  );
}
