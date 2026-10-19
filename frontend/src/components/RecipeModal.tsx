import { Link } from "react-router-dom";
import { X } from "lucide-react";

import RecipeView from "./RecipeView";
import { recipeSourceLabel, type Recipe, type RecipeContent } from "../recipes/types";

type Props = {
  title?: string;
  recipes: (Recipe | RecipeContent)[];
  planItemNames?: string[]; // item_description das refeições do plano do paciente
  emptyMessage?: string;
  onClose: () => void;
};

function isBookRecipe(recipe: Recipe | RecipeContent): recipe is Recipe {
  return "id" in recipe;
}

export default function RecipeModal({
  title = "Receitas sugeridas",
  recipes,
  planItemNames = [],
  emptyMessage = "Nenhuma receita sugerida pra essa combinação de alimentos ainda.",
  onClose,
}: Props) {
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
          <h2 className="text-sm font-semibold text-gray-900">{title}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="divide-y divide-gray-100">
          {recipes.length === 0 && (
            <p className="px-5 py-8 text-center text-sm text-gray-400">{emptyMessage}</p>
          )}

          {recipes.map((recipe, idx) => (
            <div key={isBookRecipe(recipe) ? recipe.id : idx} className="px-5 py-4 space-y-3">
              <RecipeView recipe={recipe} planItemNames={planItemNames} />
              {isBookRecipe(recipe) && (
                <div className="flex items-center justify-between pt-1">
                  <span className="text-[10px] font-medium uppercase tracking-wide text-gray-400">
                    {recipeSourceLabel(recipe)}
                  </span>
                  <Link
                    to={`/app/receitas/${recipe.id}`}
                    className="text-xs font-medium text-orange-500 hover:text-orange-600"
                  >
                    Abrir no livro →
                  </Link>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
