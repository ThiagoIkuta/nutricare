import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

import { api, getApiErrorMessage } from "../lib/api";
import BackLink from "../components/BackLink";
import RecipeForm from "../components/RecipeForm";
import type { Recipe, RecipePayload } from "../recipes/types";

export default function RecipeEdit() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [recipe, setRecipe] = useState<Recipe | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .get<Recipe>(`/recipes/${id}`)
      .then((res) => {
        if (!res.data.can_edit) {
          setLoadError("Você não pode editar esta receita.");
          return;
        }
        setRecipe(res.data);
      })
      .catch((err) => setLoadError(getApiErrorMessage(err)));
  }, [id]);

  async function handleSubmit(payload: RecipePayload) {
    setIsSubmitting(true);
    setError(null);
    try {
      await api.patch<Recipe>(`/recipes/${id}`, payload);
      navigate(`/app/receitas/${id}`);
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="mx-auto max-w-3xl">
          <BackLink to={`/app/receitas/${id}`} label="Receita" />
          <h1 className="mt-0.5 text-xl font-bold text-gray-900">Editar receita</h1>
        </div>
      </header>
      <div className="mx-auto max-w-3xl px-6 py-8">
        {loadError && <p className="rounded-xl bg-red-50 px-4 py-2.5 text-sm text-red-600">{loadError}</p>}
        {!loadError && !recipe && <p className="text-sm text-gray-400">Carregando receita...</p>}
        {recipe && (
          <RecipeForm
            initial={recipe}
            submitLabel="Salvar alterações"
            isSubmitting={isSubmitting}
            error={error}
            onSubmit={handleSubmit}
            onValidationError={setError}
          />
        )}
      </div>
    </main>
  );
}
