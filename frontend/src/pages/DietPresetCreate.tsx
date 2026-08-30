import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";

import { api, getApiErrorMessage } from "../lib/api";
import BackLink from "../components/BackLink";
import MealsEditor, { mealsToPayload, newMeal, type MealDraft } from "../components/MealsEditor";
import type { DietPlanPreset, PresetVisibility } from "../diet/types";

export default function DietPresetCreate() {
  const navigate = useNavigate();

  const [title, setTitle] = useState("");
  const [objective, setObjective] = useState("");
  const [notes, setNotes] = useState("");
  const [visibility, setVisibility] = useState<PresetVisibility>("private");
  const [meals, setMeals] = useState<MealDraft[]>([newMeal()]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) {
      setError("O título do preset é obrigatório.");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    const payload = {
      title: title.trim(),
      objective: objective.trim() || null,
      notes: notes.trim() || null,
      visibility,
      meals: mealsToPayload(meals),
    };

    try {
      await api.post<DietPlanPreset>("/diet/presets", payload);
      navigate("/app/dietas");
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="mx-auto max-w-3xl flex items-center justify-between">
          <div>
            <BackLink to="/app/dietas" label="Planos Alimentares" />
            <h1 className="mt-0.5 text-xl font-bold text-gray-900">Novo Preset</h1>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-3xl px-6 py-8">
        <form onSubmit={handleSubmit} className="space-y-6">
          <section className="rounded-2xl bg-white p-6 shadow-sm border border-gray-100 space-y-4">
            <h2 className="text-base font-semibold text-gray-800">Informações do Preset</h2>

            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Título <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Ex: Plano de definição muscular"
                className="w-full h-11 px-4 rounded-xl border border-gray-300 text-sm outline-none focus:ring-2 focus:ring-orange-400"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Objetivo / Descrição</label>
              <textarea
                value={objective}
                onChange={(e) => setObjective(e.target.value)}
                rows={3}
                placeholder="Descreva o objetivo e orientações gerais do preset"
                className="w-full px-4 py-3 rounded-xl border border-gray-300 text-sm outline-none focus:ring-2 focus:ring-orange-400 resize-none"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Observações gerais</label>
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Ex: Beber 2L de água por dia"
                className="w-full h-11 px-4 rounded-xl border border-gray-300 text-sm outline-none focus:ring-2 focus:ring-orange-400"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Visibilidade</label>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setVisibility("private")}
                  className={`flex-1 h-11 rounded-xl border text-sm font-medium transition ${
                    visibility === "private"
                      ? "border-orange-400 bg-orange-50 text-orange-600"
                      : "border-gray-300 text-gray-600 hover:border-orange-300"
                  }`}
                >
                  Só eu vejo
                </button>
                <button
                  type="button"
                  onClick={() => setVisibility("public")}
                  className={`flex-1 h-11 rounded-xl border text-sm font-medium transition ${
                    visibility === "public"
                      ? "border-orange-400 bg-orange-50 text-orange-600"
                      : "border-gray-300 text-gray-600 hover:border-orange-300"
                  }`}
                >
                  Visível para outros nutricionistas
                </button>
              </div>
            </div>
          </section>

          <MealsEditor meals={meals} onChange={setMeals} />

          {error && <p className="text-sm text-red-600 rounded-xl bg-red-50 px-4 py-3">{error}</p>}

          <div className="flex items-center justify-end gap-4 pt-2 pb-8">
            <Link to="/app/dietas" className="text-sm text-gray-500 hover:text-gray-700">
              Cancelar
            </Link>
            <button
              type="submit"
              disabled={isSubmitting}
              className="h-11 px-6 rounded-xl bg-yellow-400 font-semibold text-gray-900 hover:bg-yellow-500 disabled:opacity-70 disabled:cursor-not-allowed transition"
            >
              {isSubmitting ? "Salvando..." : "Salvar Preset"}
            </button>
          </div>
        </form>
      </div>
    </main>
  );
}
