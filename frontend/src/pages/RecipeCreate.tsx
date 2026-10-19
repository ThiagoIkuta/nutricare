import { useState } from "react";
import { useNavigate } from "react-router-dom";

import { api, getApiErrorMessage } from "../lib/api";
import BackLink from "../components/BackLink";
import RecipeForm from "../components/RecipeForm";
import type { Recipe, RecipePayload } from "../recipes/types";

export default function RecipeCreate() {
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(payload: RecipePayload) {
    setIsSubmitting(true);
    setError(null);
    try {
      const res = await api.post<Recipe>("/recipes", payload);
      navigate(`/app/receitas/${res.data.id}`);
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
          <BackLink to="/app/receitas" label="Livro de Receitas" />
          <h1 className="mt-0.5 text-xl font-bold text-gray-900">Nova receita</h1>
        </div>
      </header>
      <div className="mx-auto max-w-3xl px-6 py-8">
        <RecipeForm
          submitLabel="Criar receita"
          isSubmitting={isSubmitting}
          error={error}
          onSubmit={handleSubmit}
          onValidationError={setError}
        />
      </div>
    </main>
  );
}
