import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Plus, Trash2, ChevronDown, ChevronUp } from "lucide-react";

import { api, getApiErrorMessage } from "../lib/api";
import type { CareLink, DietPlan } from "../diet/types";
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
      meals: meals
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
        })),
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

          {/* Refeições */}
          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-semibold text-gray-800">
                Refeições ({meals.length})
              </h2>
              <button
                type="button"
                onClick={addMeal}
                className="flex items-center gap-1.5 rounded-xl bg-orange-500 px-4 py-2 text-sm font-semibold text-white hover:bg-orange-600 transition"
              >
                <Plus className="h-4 w-4" />
                Adicionar refeição
              </button>
            </div>

            {meals.length === 0 && (
              <div className="rounded-2xl bg-white p-8 shadow-sm text-center text-sm text-gray-400">
                Nenhuma refeição adicionada.
              </div>
            )}

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
                        placeholder="Ex: Consumir até 30 min após acordar"
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
