import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { Plus, Trash2, ChevronDown, ChevronUp } from "lucide-react";

import { api, getApiErrorMessage } from "../lib/api";
import type { DietPlan } from "../diet/types";
import FoodSearch from "../components/FoodSearch";
import BackLink from "../components/BackLink";
import type { TacoFood } from "../data/taco_foods";

type ItemDraft = {
  item_description: string;
  quantity: string;
  unit: string;
  preparation_notes: string;
};

type MealDraft = {
  name: string;
  scheduled_time: string;
  instructions: string;
  items: ItemDraft[];
  collapsed: boolean;
};

const EMPTY_ITEM: ItemDraft = {
  item_description: "",
  quantity: "",
  unit: "g",
  preparation_notes: "",
};

const MEAL_SUGGESTIONS = [
  "Café da manhã",
  "Lanche da manhã",
  "Almoço",
  "Lanche da tarde",
  "Jantar",
  "Ceia",
];

const UNITS = [
  "g",
  "ml",
  "unidade",
  "colher de sopa",
  "colher de chá",
  "xícara",
  "fatia",
  "porção",
];

function newMeal(name = ""): MealDraft {
  return {
    name,
    scheduled_time: "",
    instructions: "",
    items: [{ ...EMPTY_ITEM }],
    collapsed: false,
  };
}

export default function DietPlanEdit() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [plan, setPlan] = useState<DietPlan | null>(null);
  const [title, setTitle] = useState("");
  const [objective, setObjective] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [notes, setNotes] = useState("");
  const [meals, setMeals] = useState<MealDraft[]>([newMeal()]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    api
      .get<DietPlan>(`/diet/plans/${id}`)
      .then((res) => {
        const p = res.data;
        setPlan(p);
        setTitle(p.title);
        setObjective(p.objective ?? "");
        setStartDate(p.start_date ?? "");
        setEndDate(p.end_date ?? "");
        setNotes(p.notes ?? "");

        // Pre-fill meals from day 0
        const day0 = p.days.find((d) => d.day_of_week === 0);
        if (day0 && day0.meals.length > 0) {
          setMeals(
            day0.meals.map((m) => ({
              name: m.name,
              scheduled_time: m.scheduled_time ?? "",
              instructions: m.instructions ?? "",
              collapsed: false,
              items: m.items.length > 0
                ? m.items.map((item) => ({
                    item_description: item.item_description,
                    quantity: item.quantity != null ? String(item.quantity) : "",
                    unit: item.unit ?? "g",
                    preparation_notes: item.preparation_notes ?? "",
                  }))
                : [{ ...EMPTY_ITEM }],
            }))
          );
        }
      })
      .catch((err) => setError(getApiErrorMessage(err) || "Plano não encontrado."))
      .finally(() => setLoading(false));
  }, [id]);

  function addMeal() {
    setMeals((prev) => [...prev, newMeal()]);
  }

  function removeMeal(i: number) {
    setMeals((prev) => prev.filter((_, idx) => idx !== i));
  }

  function toggleMeal(i: number) {
    setMeals((prev) =>
      prev.map((m, idx) => (idx === i ? { ...m, collapsed: !m.collapsed } : m))
    );
  }

  function setMealField(
    i: number,
    field: keyof Omit<MealDraft, "items" | "collapsed">,
    value: string
  ) {
    setMeals((prev) =>
      prev.map((m, idx) => (idx === i ? { ...m, [field]: value } : m))
    );
  }

  function addItem(mealIdx: number) {
    setMeals((prev) =>
      prev.map((m, i) =>
        i === mealIdx ? { ...m, items: [...m.items, { ...EMPTY_ITEM }] } : m
      )
    );
  }

  function removeItem(mealIdx: number, itemIdx: number) {
    setMeals((prev) =>
      prev.map((m, i) =>
        i === mealIdx
          ? { ...m, items: m.items.filter((_, j) => j !== itemIdx) }
          : m
      )
    );
  }

  function setItemField(
    mealIdx: number,
    itemIdx: number,
    field: keyof ItemDraft,
    value: string
  ) {
    setMeals((prev) =>
      prev.map((m, i) =>
        i === mealIdx
          ? {
              ...m,
              items: m.items.map((item, j) =>
                j === itemIdx ? { ...item, [field]: value } : item
              ),
            }
          : m
      )
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!id) return;
    if (!title.trim()) {
      setError("O título do plano é obrigatório.");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    const mealsPayload = meals
      .filter((m) => m.name.trim())
      .map((m, i) => ({
        name: m.name.trim(),
        scheduled_time: m.scheduled_time || null,
        instructions: m.instructions.trim() || null,
        display_order: i + 1,
        items: m.items
          .filter((item) => item.item_description.trim())
          .map((item, j) => ({
            item_description: item.item_description.trim(),
            quantity: item.quantity ? parseFloat(item.quantity) : null,
            unit: item.unit || null,
            preparation_notes: item.preparation_notes.trim() || null,
            display_order: j + 1,
          })),
      }));

    try {
      // Update metadata
      await api.patch<DietPlan>(`/diet/plans/${id}`, {
        title: title.trim(),
        objective: objective.trim() || null,
        start_date: startDate || null,
        end_date: endDate || null,
        notes: notes.trim() || null,
      });

      // Replace meals
      await api.put<DietPlan>(`/diet/plans/${id}/meals`, { meals: mealsPayload });

      navigate(`/app/dietas/${id}`);
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setIsSubmitting(false);
    }
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-sm text-gray-400">Carregando plano...</p>
      </main>
    );
  }

  if (!plan && error) {
    return (
      <main className="min-h-screen bg-gray-50 flex items-center justify-center px-6">
        <div className="text-center">
          <p className="text-sm text-red-500 mb-3">{error}</p>
          <BackLink to="/app/dietas" label="Voltar aos planos" />
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="mx-auto max-w-3xl flex items-center justify-between">
          <div>
            <BackLink to={`/app/dietas/${id}`} label="Detalhes do plano" />
            <h1 className="mt-0.5 text-xl font-bold text-gray-900">Editar Plano</h1>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-3xl px-6 py-8">
        <form onSubmit={handleSubmit} className="space-y-6">

          {/* Informações do plano */}
          <section className="rounded-2xl bg-white p-6 shadow-sm border border-gray-100 space-y-4">
            <h2 className="text-base font-semibold text-gray-800">Informações do Plano</h2>

            {plan?.patient_username && (
              <p className="text-sm text-gray-500">
                Paciente: <span className="font-medium text-gray-700">{plan.patient_username}</span>
              </p>
            )}

            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Título <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
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
                className="w-full h-11 px-4 rounded-xl border border-gray-300 text-sm outline-none focus:ring-2 focus:ring-orange-400"
              />
            </div>
          </section>

          {/* Refeições */}
          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base font-semibold text-gray-800">
                  Refeições ({meals.length})
                </h2>
                <p className="text-xs text-gray-400 mt-0.5">
                  As refeições são aplicadas em todos os dias da semana.
                </p>
              </div>
              <button
                type="button"
                onClick={addMeal}
                className="flex items-center gap-1.5 rounded-xl bg-orange-500 px-4 py-2 text-sm font-semibold text-white hover:bg-orange-600 transition"
              >
                <Plus className="h-4 w-4" />
                Adicionar refeição
              </button>
            </div>

            {meals.map((meal, mealIdx) => (
              <div key={mealIdx} className="rounded-2xl bg-white shadow-sm overflow-hidden">
                <div className="flex items-center gap-3 px-5 py-4 border-b border-gray-100">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-orange-100 text-xs font-bold text-orange-600">
                    {mealIdx + 1}
                  </span>

                  <input
                    type="text"
                    value={meal.name}
                    onChange={(e) => setMealField(mealIdx, "name", e.target.value)}
                    list={`meal-names-${mealIdx}`}
                    placeholder="Nome da refeição"
                    className="flex-1 h-9 px-3 rounded-xl border border-gray-300 text-sm outline-none focus:ring-2 focus:ring-orange-400"
                  />
                  <datalist id={`meal-names-${mealIdx}`}>
                    {MEAL_SUGGESTIONS.map((s) => (
                      <option key={s} value={s} />
                    ))}
                  </datalist>

                  <input
                    type="time"
                    value={meal.scheduled_time}
                    onChange={(e) => setMealField(mealIdx, "scheduled_time", e.target.value)}
                    className="w-32 h-9 px-3 rounded-xl border border-gray-300 text-sm outline-none focus:ring-2 focus:ring-orange-400"
                    title="Horário sugerido"
                  />

                  <button
                    type="button"
                    onClick={() => toggleMeal(mealIdx)}
                    className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 transition"
                  >
                    {meal.collapsed ? (
                      <ChevronDown className="h-4 w-4" />
                    ) : (
                      <ChevronUp className="h-4 w-4" />
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => removeMeal(mealIdx)}
                    className="rounded-lg p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-500 transition"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>

                {!meal.collapsed && (
                  <div className="px-5 py-4 space-y-4">
                    <div>
                      <label className="mb-1 block text-xs font-medium text-gray-500 uppercase tracking-wide">
                        Instruções da refeição
                      </label>
                      <input
                        type="text"
                        value={meal.instructions}
                        onChange={(e) => setMealField(mealIdx, "instructions", e.target.value)}
                        className="w-full h-9 px-3 rounded-xl border border-gray-300 text-sm outline-none focus:ring-2 focus:ring-orange-400"
                      />
                    </div>

                    <div>
                      <p className="mb-2 text-xs font-medium text-gray-500 uppercase tracking-wide">
                        Alimentos
                      </p>
                      <div className="space-y-2">
                        {meal.items.map((item, itemIdx) => (
                          <div
                            key={itemIdx}
                            className="rounded-xl border border-gray-100 bg-gray-50 p-3 space-y-2"
                          >
                            <div className="flex items-center gap-2">
                              <FoodSearch
                                value={item.item_description}
                                onChange={(v) => setItemField(mealIdx, itemIdx, "item_description", v)}
                                onSelect={(food: TacoFood) => {
                                  setItemField(mealIdx, itemIdx, "item_description", food.name);
                                  setItemField(mealIdx, itemIdx, "quantity", String(food.default_qty));
                                  setItemField(mealIdx, itemIdx, "unit", food.default_unit);
                                }}
                                className="min-w-0 flex-[3]"
                              />
                              <input
                                type="number"
                                value={item.quantity}
                                onChange={(e) =>
                                  setItemField(mealIdx, itemIdx, "quantity", e.target.value)
                                }
                                placeholder="Qtd"
                                min="0"
                                step="any"
                                className="w-20 h-9 px-3 rounded-lg border border-gray-300 bg-white text-sm outline-none focus:ring-2 focus:ring-orange-400"
                              />
                              <select
                                value={item.unit}
                                onChange={(e) =>
                                  setItemField(mealIdx, itemIdx, "unit", e.target.value)
                                }
                                className="w-32 h-9 px-2 rounded-lg border border-gray-300 bg-white text-sm outline-none focus:ring-2 focus:ring-orange-400"
                              >
                                {UNITS.map((u) => (
                                  <option key={u} value={u}>
                                    {u}
                                  </option>
                                ))}
                              </select>
                              <button
                                type="button"
                                onClick={() => removeItem(mealIdx, itemIdx)}
                                disabled={meal.items.length === 1}
                                className="shrink-0 rounded-lg p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-500 transition disabled:opacity-30 disabled:cursor-not-allowed"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </div>

                            <input
                              type="text"
                              value={item.preparation_notes}
                              onChange={(e) =>
                                setItemField(mealIdx, itemIdx, "preparation_notes", e.target.value)
                              }
                              placeholder="Observação de preparo (opcional)"
                              className="w-full h-9 px-3 rounded-lg border border-gray-200 bg-white text-sm outline-none focus:ring-2 focus:ring-orange-400"
                            />
                          </div>
                        ))}
                      </div>

                      <button
                        type="button"
                        onClick={() => addItem(mealIdx)}
                        className="mt-2 flex items-center gap-1 text-xs font-medium text-orange-500 hover:text-orange-600 transition"
                      >
                        <Plus className="h-3 w-3" />
                        Adicionar alimento
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </section>

          {error && (
            <p className="text-sm text-red-600 rounded-xl bg-red-50 px-4 py-3">{error}</p>
          )}

          <div className="flex items-center justify-end gap-4 pt-2 pb-8">
            <Link
              to={`/app/dietas/${id}`}
              className="text-sm text-gray-500 hover:text-gray-700"
            >
              Cancelar
            </Link>
            <button
              type="submit"
              disabled={isSubmitting}
              className="h-11 px-6 rounded-xl bg-yellow-400 font-semibold text-gray-900 hover:bg-yellow-500 disabled:opacity-70 disabled:cursor-not-allowed transition"
            >
              {isSubmitting ? "Salvando..." : "Salvar alterações"}
            </button>
          </div>
        </form>
      </div>
    </main>
  );
}
