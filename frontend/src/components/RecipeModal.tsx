import { Check, Clock, Flame, Users, X } from "lucide-react";

import { computeRecipeMacros, ingredientMatchesItem, type Recipe } from "../data/recipes";

type Props = {
  recipes: Recipe[];
  planItemNames: string[]; // item_description das refeições do plano do paciente
  onClose: () => void;
};

export default function RecipeModal({ recipes, planItemNames, onClose }: Props) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4 py-8"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg max-h-full overflow-y-auto rounded-2xl bg-white shadow-lg"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 flex items-center justify-between border-b border-gray-100 bg-white px-5 py-4">
          <h2 className="text-sm font-semibold text-gray-900">Receitas sugeridas</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="divide-y divide-gray-100">
          {recipes.length === 0 && (
            <p className="px-5 py-8 text-center text-sm text-gray-400">
              Nenhuma receita sugerida pra essa combinação de alimentos ainda.
            </p>
          )}

          {recipes.map((recipe) => {
            const macros = computeRecipeMacros(recipe);
            return (
              <div key={recipe.id} className="px-5 py-4 space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <h3 className="font-semibold text-gray-900">{recipe.name}</h3>
                  <span className="shrink-0 flex items-center gap-1 text-xs font-semibold text-orange-500">
                    <Flame className="h-3.5 w-3.5" />
                    {Math.round(macros.kcal)} kcal
                  </span>
                </div>

                <div className="flex items-center gap-4 text-xs text-gray-400">
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

                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-1.5">
                    Ingredientes
                  </p>
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
                          {inPlan && (
                            <span className="text-[10px] text-green-500 font-medium">já no seu plano</span>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                </div>

                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-1.5">
                    Modo de preparo
                  </p>
                  <ol className="space-y-1 list-decimal list-inside">
                    {recipe.instructions.map((step, idx) => (
                      <li key={idx} className="text-sm text-gray-700">{step}</li>
                    ))}
                  </ol>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
