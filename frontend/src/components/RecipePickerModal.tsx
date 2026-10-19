import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Search, X } from "lucide-react";

import { api, getApiErrorMessage } from "../lib/api";
import { RecipeStats } from "./RecipeView";
import { recipeMatchesQuery } from "../recipes/logic";
import { recipeSourceLabel, type Recipe } from "../recipes/types";

type Props = {
  onPick: (recipe: Recipe) => void;
  onClose: () => void;
};

/** Lista o livro de receitas do usuário para escolher uma e enviar no chat. */
export default function RecipePickerModal({ onPick, onClose }: Props) {
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .get<Recipe[]>("/recipes", { params: { scope: "all" } })
      .then((res) => setRecipes(res.data))
      .catch((err) => setError(getApiErrorMessage(err)))
      .finally(() => setLoading(false));
  }, []);

  const filtered = recipes.filter((r) => recipeMatchesQuery(r, query));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4 py-8" onClick={onClose}>
      <div className="flex w-full max-w-md max-h-full flex-col rounded-2xl bg-white shadow-lg" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
          <h2 className="text-sm font-semibold text-gray-900">Compartilhar receita</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="px-5 pt-4">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-300" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar por nome ou ingrediente"
              className="h-10 w-full rounded-xl border border-gray-200 bg-gray-50 pl-9 pr-3 text-sm outline-none focus:bg-white focus:ring-2 focus:ring-orange-400"
            />
          </div>
        </div>
        <div className="flex-1 overflow-y-auto px-5 py-3 space-y-2">
          {loading && <p className="text-xs text-gray-400">Carregando receitas...</p>}
          {error && <p className="text-xs text-red-500">{error}</p>}
          {!loading && filtered.length === 0 && (
            <p className="py-6 text-center text-xs text-gray-400">
              Nenhuma receita encontrada.{" "}
              <Link to="/app/receitas/nova" className="font-medium text-orange-500">Criar receita</Link>
            </p>
          )}
          {filtered.map((recipe) => (
            <button
              key={recipe.id}
              onClick={() => onPick(recipe)}
              className="w-full rounded-xl border border-gray-100 px-3 py-2.5 text-left hover:border-orange-300 transition"
            >
              <div className="flex items-center justify-between gap-2">
                <p className="truncate text-sm font-medium text-gray-800">{recipe.title}</p>
                <span className="shrink-0 text-[10px] font-medium uppercase text-gray-400">{recipeSourceLabel(recipe)}</span>
              </div>
              <div className="mt-1">
                <RecipeStats recipe={recipe} />
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
