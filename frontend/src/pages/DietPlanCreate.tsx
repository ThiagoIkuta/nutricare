import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";

import { api, getApiErrorMessage } from "../lib/api";
import type { CareLink, DietPlan } from "../diet/types";
import BackLink from "../components/BackLink";
import MealsEditor, { mealsToPayload, newMeal, type MealDraft } from "../components/MealsEditor";

export default function DietPlanCreate() {
  const navigate = useNavigate();

  const [careLinks, setCareLinks] = useState<CareLink[]>([]);
  const [careLinkId, setCareLinkId] = useState<string>("");
  const [title, setTitle] = useState("");
  const [objective, setObjective] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [notes, setNotes] = useState("");
  const [meals, setMeals] = useState<MealDraft[]>([newMeal()]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .get<CareLink[]>("/care/links")
      .then((res) => {
        const active = res.data.filter((l) => l.status === "active");
        setCareLinks(active);
        if (active.length === 1) setCareLinkId(String(active[0].id));
      })
      .catch(() => {});
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!careLinkId) {
      setError("Selecione um paciente para o plano.");
      return;
    }
    if (!title.trim()) {
      setError("O título do plano é obrigatório.");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    const payload = {
      care_link_id: Number(careLinkId),
      title: title.trim(),
      objective: objective.trim() || null,
      start_date: startDate || null,
      end_date: endDate || null,
      notes: notes.trim() || null,
      meals: mealsToPayload(meals),
    };

    try {
      await api.post<DietPlan>("/diet/plans", payload);
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
            <h1 className="mt-0.5 text-xl font-bold text-gray-900">Novo Plano Alimentar</h1>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-3xl px-6 py-8">
        <form onSubmit={handleSubmit} className="space-y-6">

          {/* Paciente */}
          <section className="rounded-2xl bg-white p-6 shadow-sm border border-gray-100 space-y-4">
            <h2 className="text-base font-semibold text-gray-800">Paciente</h2>

            {careLinks.length === 0 ? (
              <div className="rounded-xl bg-yellow-50 border border-yellow-200 px-4 py-3 text-sm text-yellow-700">
                Nenhum paciente vinculado.{" "}
                <Link to="/app/pacientes" className="font-semibold underline">
                  Vincular paciente primeiro →
                </Link>
              </div>
            ) : (
              <select
                value={careLinkId}
                onChange={(e) => setCareLinkId(e.target.value)}
                className="w-full h-11 px-4 rounded-xl border border-gray-300 text-sm outline-none focus:ring-2 focus:ring-orange-400"
              >
                <option value="">Selecione um paciente...</option>
                {careLinks.map((l) => (
                  <option key={l.id} value={String(l.id)}>
                    {l.patient_username ?? `Paciente ${l.patient_id.slice(0, 8)}`}
                  </option>
                ))}
              </select>
            )}
          </section>

          {/* Informações do plano */}
          <section className="rounded-2xl bg-white p-6 shadow-sm border border-gray-100 space-y-4">
            <h2 className="text-base font-semibold text-gray-800">Informações do Plano</h2>

            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Título <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Ex: Plano de emagrecimento — fase 1"
                className="w-full h-11 px-4 rounded-xl border border-gray-300 text-sm outline-none focus:ring-2 focus:ring-orange-400"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Objetivo / Descrição
              </label>
              <textarea
                value={objective}
                onChange={(e) => setObjective(e.target.value)}
                rows={3}
                placeholder="Descreva o objetivo e orientações gerais do plano"
                className="w-full px-4 py-3 rounded-xl border border-gray-300 text-sm outline-none focus:ring-2 focus:ring-orange-400 resize-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Início</label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full h-11 px-4 rounded-xl border border-gray-300 text-sm outline-none focus:ring-2 focus:ring-orange-400"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Término</label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full h-11 px-4 rounded-xl border border-gray-300 text-sm outline-none focus:ring-2 focus:ring-orange-400"
                />
              </div>
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Observações gerais
              </label>
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Ex: Beber 2L de água por dia"
                className="w-full h-11 px-4 rounded-xl border border-gray-300 text-sm outline-none focus:ring-2 focus:ring-orange-400"
              />
            </div>
          </section>

          <MealsEditor meals={meals} onChange={setMeals} />

          {error && (
            <p className="text-sm text-red-600 rounded-xl bg-red-50 px-4 py-3">{error}</p>
          )}

          <div className="flex items-center justify-end gap-4 pt-2 pb-8">
            <Link to="/app/dietas" className="text-sm text-gray-500 hover:text-gray-700">
              Cancelar
            </Link>
            <button
              type="submit"
              disabled={isSubmitting}
              className="h-11 px-6 rounded-xl bg-yellow-400 font-semibold text-gray-900 hover:bg-yellow-500 disabled:opacity-70 disabled:cursor-not-allowed transition"
            >
              {isSubmitting ? "Salvando..." : "Salvar Plano"}
            </button>
          </div>
        </form>
      </div>
    </main>
  );
}
