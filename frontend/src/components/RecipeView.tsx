import { Check, Clock, Flame, Users } from "lucide-react";

import { computeRecipeMacros, ingredientMatchesItem } from "../recipes/logic";
import type { RecipeContent } from "../recipes/types";

type Props = {
  recipe: RecipeContent;
  /** item_description das refeições do plano — destaca ingredientes que o paciente já segue. */
  planItemNames?: string[];
  showTitle?: boolean;
};

export function RecipeStats({ recipe }: { recipe: RecipeContent }) {
  const macros = computeRecipeMacros(recipe);
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-gray-400">
      <span className="flex items-center gap-1 font-semibold text-orange-500">
        <Flame className="h-3.5 w-3.5" /> {Math.round(macros.kcal)} kcal
      </span>
      <span className="flex items-center gap-1">
        <Clock className="h-3.5 w-3.5" /> {recipe.prep_time_min} min
      </span>
      <span className="flex items-center gap-1">
        <Users className="h-3.5 w-3.5" /> {recipe.servings} {recipe.servings === 1 ? "porção" : "porções"}
      </span>
      <span>
        P: {Math.round(macros.protein_g)}g · C: {Math.round(macros.carb_g)}g · G: {Math.round(macros.fat_g)}g
      </span>
    </div>
  );
}

export default function RecipeView({ recipe, planItemNames = [], showTitle = true }: Props) {
  return (
    <div className="space-y-3">
      {showTitle && <h3 className="font-semibold text-gray-900">{recipe.title}</h3>}
      {recipe.description && <p className="text-sm text-gray-600">{recipe.description}</p>}

      <RecipeStats recipe={recipe} />

      {recipe.meal_types.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {recipe.meal_types.map((t) => (
            <span key={t} className="rounded-full bg-orange-50 px-2 py-0.5 text-[10px] font-medium text-orange-500">
              {t}
            </span>
          ))}
        </div>
      )}

      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-1.5">Ingredientes</p>
        <ul className="space-y-1">
          {recipe.ingredients.map((ing, idx) => {
            const inPlan = planItemNames.some((item) => ingredientMatchesItem(ing.food_name, item));
            return (
              <li key={idx} className="flex items-center gap-2 text-sm text-gray-700">
                {inPlan ? (
                  <Check className="h-3.5 w-3.5 shrink-0 text-green-500" />
                ) : (
                  <span className="h-3.5 w-3.5 shrink-0" />
                )}
                <span>
                  {ing.quantity} {ing.unit} de {ing.food_name}
                </span>
                {inPlan && <span className="text-[10px] text-green-500 font-medium">já no seu plano</span>}
              </li>
            );
          })}
        </ul>
      </div>

      {recipe.instructions.length > 0 && (
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-1.5">Modo de preparo</p>
          <ol className="space-y-1 list-decimal list-inside">
            {recipe.instructions.map((step, idx) => (
              <li key={idx} className="text-sm text-gray-700">{step}</li>
            ))}
          </ol>
        </div>
      )}
    </div>
  );
}
