import { Link } from "react-router-dom";
import { BookmarkCheck, ChefHat, Clock, Flame } from "lucide-react";

import { computeRecipeMacros } from "../recipes/logic";
import type { RecipeContent } from "../recipes/types";

type Props = {
  recipe: RecipeContent;
  /** true quando a mensagem foi enviada pelo usuário atual — não mostra "Aceitar e salvar". */
  isMine: boolean;
  acceptedRecipeId: number | null;
  accepting: boolean;
  onView: () => void;
  onAccept: () => void;
};

/** Box exibida dentro da bolha do chat quando uma receita é compartilhada. */
export default function RecipeChatBox({ recipe, isMine, acceptedRecipeId, accepting, onView, onAccept }: Props) {
  const kcal = Math.round(computeRecipeMacros(recipe).kcal);

  return (
    <div className="w-64 max-w-full rounded-xl border border-orange-100 bg-white p-3 text-gray-800 shadow-sm mb-1">
      <div className="flex items-start gap-2">
        <div className="shrink-0 rounded-lg bg-orange-50 p-1.5">
          <ChefHat className="h-4 w-4 text-orange-500" />
        </div>
        <div className="min-w-0">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-orange-400">Receita</p>
          <p className="text-sm font-semibold leading-snug break-words">{recipe.title}</p>
        </div>
      </div>

      <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-gray-400">
        <span className="flex items-center gap-1">
          <Flame className="h-3 w-3 text-orange-400" /> {kcal} kcal
        </span>
        <span className="flex items-center gap-1">
          <Clock className="h-3 w-3" /> {recipe.prep_time_min} min
        </span>
        <span>
          {recipe.ingredients.length} {recipe.ingredients.length === 1 ? "ingrediente" : "ingredientes"}
        </span>
      </div>

      <div className="mt-3 flex flex-col gap-1.5">
        <button
          type="button"
          onClick={onView}
          className="w-full rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-600 hover:border-orange-300 hover:text-orange-500 transition"
        >
          Ver receita
        </button>
        {!isMine &&
          (acceptedRecipeId ? (
            <Link
              to={`/app/receitas/${acceptedRecipeId}`}
              className="flex w-full items-center justify-center gap-1 rounded-lg bg-green-50 px-3 py-1.5 text-xs font-semibold text-green-600 hover:bg-green-100 transition"
            >
              <BookmarkCheck className="h-3.5 w-3.5" /> Salva no seu livro →
            </Link>
          ) : (
            <button
              type="button"
              onClick={onAccept}
              disabled={accepting}
              className="w-full rounded-lg bg-orange-500 px-3 py-1.5 text-xs font-semibold text-white hover:bg-orange-600 disabled:opacity-60 transition"
            >
              {accepting ? "Salvando..." : "Aceitar e salvar"}
            </button>
          ))}
      </div>
    </div>
  );
}
