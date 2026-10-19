import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { BookOpen, Globe, Lock, Plus, Search } from "lucide-react";

import { api, getApiErrorMessage } from "../lib/api";
import BackLink from "../components/BackLink";
import { RecipeStats } from "../components/RecipeView";
import { recipeMatchesQuery } from "../recipes/logic";
import { recipeSourceLabel, type Recipe, type RecipeScope } from "../recipes/types";

const TABS: { scope: RecipeScope; label: string }[] = [
  { scope: "all", label: "Todas" },
  { scope: "mine", label: "Minhas" },
  { scope: "saved", label: "Salvas" },
  { scope: "public", label: "Públicas" },
];

const EMPTY_MESSAGES: Record<RecipeScope, string> = {
  all: "Nenhuma receita no seu livro ainda.",
  mine: "Você ainda não criou nenhuma receita.",
  saved: "Você ainda não salvou nenhuma receita pública. Abra uma receita da aba Públicas e toque em Salvar.",
  public: "Nenhuma receita pública ainda.",
};

export default function RecipeBook() {
  const [scope, setScope] = useState<RecipeScope>("all");
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  function changeScope(next: RecipeScope) {
    if (next === scope) return;
    setLoading(true);
    setError(null);
    setScope(next);
  }

  useEffect(() => {
    api
      .get<Recipe[]>("/recipes", { params: { scope } })
      .then((res) => setRecipes(res.data))
      .catch((err) => setError(getApiErrorMessage(err)))
      .finally(() => setLoading(false));
  }, [scope]);

  const filtered = recipes.filter((r) => recipeMatchesQuery(r, query));

  return (
    <main className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="mx-auto max-w-4xl flex items-center justify-between gap-4">
          <div>
            <BackLink to="/app" label="Dashboard" />
            <h1 className="mt-0.5 text-xl font-bold text-gray-900">Livro de Receitas</h1>
          </div>
          <Link
            to="/app/receitas/nova"
            className="flex items-center gap-1.5 rounded-xl bg-orange-500 px-4 py-2 text-sm font-semibold text-white hover:bg-orange-600 transition"
          >
            <Plus className="h-4 w-4" /> Nova receita
          </Link>
        </div>
      </header>

      <div className="mx-auto max-w-4xl px-6 py-6 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex gap-1 rounded-xl bg-white p-1 shadow-sm">
            {TABS.map((tab) => (
              <button
                key={tab.scope}
                onClick={() => changeScope(tab.scope)}
                className={`rounded-lg px-3 py-1.5 text-sm font-medium transition ${
                  scope === tab.scope ? "bg-orange-500 text-white" : "text-gray-500 hover:text-gray-800"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
          <div className="relative w-full sm:w-64">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-300" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar por nome ou ingrediente"
              className="h-10 w-full rounded-xl border border-gray-200 bg-white pl-9 pr-3 text-sm outline-none focus:ring-2 focus:ring-orange-400"
            />
          </div>
        </div>

        {error && <p className="rounded-xl bg-red-50 px-4 py-2.5 text-sm text-red-600">{error}</p>}
        {loading && <p className="text-sm text-gray-400">Carregando receitas...</p>}

        {!loading && !error && filtered.length === 0 && (
          <div className="rounded-2xl bg-white p-10 text-center shadow-sm">
            <BookOpen className="mx-auto mb-3 h-10 w-10 text-gray-200" />
            <p className="text-sm text-gray-400">{query ? "Nenhuma receita encontrada para essa busca." : EMPTY_MESSAGES[scope]}</p>
          </div>
        )}

        <div className="grid gap-3 sm:grid-cols-2">
          {filtered.map((recipe) => (
            <Link
              key={recipe.id}
              to={`/app/receitas/${recipe.id}`}
              className="rounded-2xl border border-gray-200 bg-white p-4 transition hover:border-orange-300 hover:shadow-md"
            >
              <div className="flex items-start justify-between gap-2">
                <h2 className="font-semibold text-gray-900">{recipe.title}</h2>
                {recipe.is_owner &&
                  (recipe.visibility === "public" ? (
                    <Globe className="h-4 w-4 shrink-0 text-orange-400" />
                  ) : (
                    <Lock className="h-4 w-4 shrink-0 text-gray-300" />
                  ))}
              </div>
              {recipe.description && <p className="mt-1 line-clamp-2 text-xs text-gray-500">{recipe.description}</p>}
              <div className="mt-2">
                <RecipeStats recipe={recipe} />
              </div>
              <p className="mt-2 text-[10px] font-medium uppercase tracking-wide text-gray-400">
                {recipeSourceLabel(recipe)}
                {!recipe.is_owner && recipe.owner_username && ` · por ${recipe.owner_username}`}
              </p>
            </Link>
          ))}
        </div>
      </div>
    </main>
  );
}
