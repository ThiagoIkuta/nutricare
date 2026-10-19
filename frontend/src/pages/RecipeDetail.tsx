import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { Bookmark, BookmarkCheck, FileText, Globe, Lock, Pencil, Share2, Trash2 } from "lucide-react";

import { api, getApiErrorMessage } from "../lib/api";
import BackLink from "../components/BackLink";
import RecipeView from "../components/RecipeView";
import ShareRecipeModal from "../components/ShareRecipeModal";
import { recipeSourceLabel, type Recipe } from "../recipes/types";

export default function RecipeDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [recipe, setRecipe] = useState<Recipe | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [sharing, setSharing] = useState(false);

  useEffect(() => {
    setRecipe(null);
    setLoadError(null);
    api
      .get<Recipe>(`/recipes/${id}`)
      .then((res) => setRecipe(res.data))
      .catch((err) => setLoadError(getApiErrorMessage(err)));
  }, [id]);

  async function handleToggleSave() {
    if (!recipe) return;
    setBusy(true);
    setError(null);
    try {
      if (recipe.is_saved) {
        await api.delete(`/recipes/${recipe.id}/save`);
      } else {
        await api.post(`/recipes/${recipe.id}/save`);
      }
      setRecipe({ ...recipe, is_saved: !recipe.is_saved });
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  async function handleDelete() {
    if (!recipe) return;
    setBusy(true);
    setError(null);
    try {
      await api.delete(`/recipes/${recipe.id}`);
      navigate("/app/receitas");
    } catch (err) {
      setError(getApiErrorMessage(err));
      setBusy(false);
    }
  }

  return (
    <main className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="mx-auto max-w-3xl">
          <BackLink to="/app/receitas" label="Livro de Receitas" />
          <h1 className="mt-0.5 text-xl font-bold text-gray-900">{recipe?.title ?? "Receita"}</h1>
          {recipe && (
            <p className="mt-0.5 flex items-center gap-1.5 text-xs text-gray-400">
              {recipe.is_owner &&
                (recipe.visibility === "public" ? <Globe className="h-3.5 w-3.5" /> : <Lock className="h-3.5 w-3.5" />)}
              {recipeSourceLabel(recipe)}
              {!recipe.is_owner && recipe.owner_username && ` · por ${recipe.owner_username}`}
            </p>
          )}
        </div>
      </header>

      <div className="mx-auto max-w-3xl px-6 py-6 space-y-4">
        {loadError && <p className="rounded-xl bg-red-50 px-4 py-2.5 text-sm text-red-600">{loadError}</p>}
        {!loadError && !recipe && <p className="text-sm text-gray-400">Carregando receita...</p>}

        {recipe && (
          <>
            <div className="flex flex-wrap gap-2">
              {recipe.can_edit && (
                <Link
                  to={`/app/receitas/${recipe.id}/editar`}
                  className="flex items-center gap-1.5 rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs font-semibold text-gray-700 hover:border-orange-300 transition"
                >
                  <Pencil className="h-3.5 w-3.5" /> Editar
                </Link>
              )}
              {!recipe.is_owner && (
                <button
                  onClick={handleToggleSave}
                  disabled={busy}
                  className={`flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-semibold transition disabled:opacity-60 ${
                    recipe.is_saved
                      ? "bg-green-50 text-green-600 hover:bg-green-100"
                      : "bg-orange-500 text-white hover:bg-orange-600"
                  }`}
                >
                  {recipe.is_saved ? <BookmarkCheck className="h-3.5 w-3.5" /> : <Bookmark className="h-3.5 w-3.5" />}
                  {recipe.is_saved ? "Salva — remover" : "Salvar no meu livro"}
                </button>
              )}
              <button
                onClick={() => setSharing(true)}
                className="flex items-center gap-1.5 rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs font-semibold text-gray-700 hover:border-orange-300 transition"
              >
                <Share2 className="h-3.5 w-3.5" /> Compartilhar no chat
              </button>
              <Link
                to={`/app/receitas/${recipe.id}/imprimir`}
                className="flex items-center gap-1.5 rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs font-semibold text-gray-700 hover:border-orange-300 transition"
              >
                <FileText className="h-3.5 w-3.5" /> Exportar PDF
              </Link>
              {recipe.can_edit &&
                (confirmDelete ? (
                  <>
                    <button
                      onClick={handleDelete}
                      disabled={busy}
                      className="rounded-xl bg-red-500 px-3 py-2 text-xs font-semibold text-white hover:bg-red-600 disabled:opacity-60 transition"
                    >
                      Confirmar exclusão
                    </button>
                    <button
                      onClick={() => setConfirmDelete(false)}
                      className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs font-semibold text-gray-500 transition"
                    >
                      Cancelar
                    </button>
                  </>
                ) : (
                  <button
                    onClick={() => setConfirmDelete(true)}
                    className="flex items-center gap-1.5 rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs font-semibold text-red-500 hover:border-red-300 transition"
                  >
                    <Trash2 className="h-3.5 w-3.5" /> Excluir
                  </button>
                ))}
            </div>

            {error && <p className="rounded-xl bg-red-50 px-4 py-2.5 text-sm text-red-600">{error}</p>}

            <div className="rounded-2xl bg-white p-6 shadow-sm">
              <RecipeView recipe={recipe} showTitle={false} />
            </div>
          </>
        )}
      </div>

      {sharing && recipe && (
        <ShareRecipeModal recipeId={recipe.id} recipeTitle={recipe.title} onClose={() => setSharing(false)} />
      )}
    </main>
  );
}
