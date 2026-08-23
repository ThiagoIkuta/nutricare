import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  Calendar,
  ChevronDown,
  ChevronUp,
  ClipboardList,
  Copy,
  Pencil,
  Plus,
  Trash2,
  User,
  Utensils,
  X,
} from "lucide-react";

import { api, getApiErrorMessage } from "../lib/api";
import BackLink from "../components/BackLink";
import type { DietPlan, DietPlanDay, Meal, MealItem } from "../diet/types";

const STATUS_LABEL: Record<string, string> = {
  draft: "Rascunho",
  active: "Ativo",
  archived: "Arquivado",
};
const STATUS_CLASS: Record<string, string> = {
  draft: "bg-gray-100 text-gray-500",
  active: "bg-green-100 text-green-700",
  archived: "bg-blue-100 text-blue-700",
};
const DAY_SHORT = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"];
const DAY_LONG = ["Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado", "Domingo"];
const UNITS = ["g", "ml", "unidade", "colher de sopa", "colher de chá", "xícara", "fatia", "porção"];
const MEAL_SUGGESTIONS = ["Café da manhã", "Lanche da manhã", "Almoço", "Lanche da tarde", "Jantar", "Ceia"];

type ItemDraft = { item_description: string; quantity: string; unit: string; preparation_notes: string };
type MealDraft = { name: string; scheduled_time: string; instructions: string; items: ItemDraft[] };

function mealToItemDraft(item: MealItem): ItemDraft {
  return {
    item_description: item.item_description,
    quantity: item.quantity != null ? String(item.quantity) : "",
    unit: item.unit ?? "g",
    preparation_notes: item.preparation_notes ?? "",
  };
}

function mealToDraft(meal: Meal): MealDraft {
  return {
    name: meal.name,
    scheduled_time: meal.scheduled_time ?? "",
    instructions: meal.instructions ?? "",
    items: meal.items.length ? meal.items.map(mealToItemDraft) : [{ item_description: "", quantity: "", unit: "g", preparation_notes: "" }],
  };
}

function formatDate(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" });
}

export default function DietPlanDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [plan, setPlan] = useState<DietPlan | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [selectedDay, setSelectedDay] = useState(0);
  const [collapsed, setCollapsed] = useState<Record<number, boolean>>({});

  // Inline day editing
  const [editingDay, setEditingDay] = useState<number | null>(null);
  const [dayMeals, setDayMeals] = useState<MealDraft[]>([]);
  const [savingDay, setSavingDay] = useState(false);
  const [copyingDay, setCopyingDay] = useState(false);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    api
      .get<DietPlan>(`/diet/plans/${id}`)
      .then((res) => setPlan(res.data))
      .catch((err) => setError(getApiErrorMessage(err) || "Plano não encontrado."))
      .finally(() => setLoading(false));
  }, [id]);

  function openDayEdit(dayOfWeek: number) {
    if (!plan) return;
    const day = plan.days.find((d) => d.day_of_week === dayOfWeek);
    setDayMeals(
      day && day.meals.length
        ? day.meals.map(mealToDraft)
        : [{ name: "", scheduled_time: "", instructions: "", items: [{ item_description: "", quantity: "", unit: "g", preparation_notes: "" }] }]
    );
    setEditingDay(dayOfWeek);
  }

  function closeDayEdit() {
    setEditingDay(null);
    setDayMeals([]);
  }

  async function saveDayMeals() {
    if (!id || editingDay === null) return;
    setSavingDay(true);
    setError(null);
    const mealsPayload = dayMeals
      .filter((m) => m.name.trim())
      .map((m, i) => ({
        name: m.name.trim(),
        scheduled_time: m.scheduled_time || null,
        instructions: m.instructions.trim() || null,
        display_order: i + 1,
        items: m.items
          .filter((it) => it.item_description.trim())
          .map((it, j) => ({
            item_description: it.item_description.trim(),
            quantity: it.quantity ? parseFloat(it.quantity) : null,
            unit: it.unit || null,
            preparation_notes: it.preparation_notes.trim() || null,
            display_order: j + 1,
          })),
      }));
    try {
      const res = await api.put<DietPlan>(`/diet/plans/${id}/days/${editingDay}/meals`, { meals: mealsPayload });
      setPlan(res.data);
      closeDayEdit();
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setSavingDay(false);
    }
  }

  async function copyToAllDays() {
    if (!id || editingDay === null) return;
    setCopyingDay(true);
    setError(null);
    const mealsPayload = dayMeals
      .filter((m) => m.name.trim())
      .map((m, i) => ({
        name: m.name.trim(),
        scheduled_time: m.scheduled_time || null,
        instructions: m.instructions.trim() || null,
        display_order: i + 1,
        items: m.items
          .filter((it) => it.item_description.trim())
          .map((it, j) => ({
            item_description: it.item_description.trim(),
            quantity: it.quantity ? parseFloat(it.quantity) : null,
            unit: it.unit || null,
            preparation_notes: it.preparation_notes.trim() || null,
            display_order: j + 1,
          })),
      }));
    try {
      // Replace all 7 days
      const res = await api.put<DietPlan>(`/diet/plans/${id}/meals`, { meals: mealsPayload });
      setPlan(res.data);
      closeDayEdit();
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setCopyingDay(false);
    }
  }

  function addMealToDraft() {
    setDayMeals((prev) => [...prev, { name: "", scheduled_time: "", instructions: "", items: [{ item_description: "", quantity: "", unit: "g", preparation_notes: "" }] }]);
  }

  function removeMealFromDraft(i: number) {
    setDayMeals((prev) => prev.filter((_, idx) => idx !== i));
  }

  function updateMealDraft(i: number, field: keyof Omit<MealDraft, "items">, val: string) {
    setDayMeals((prev) => prev.map((m, idx) => idx === i ? { ...m, [field]: val } : m));
  }

  function addItemToDraft(mealIdx: number) {
    setDayMeals((prev) => prev.map((m, i) => i === mealIdx ? { ...m, items: [...m.items, { item_description: "", quantity: "", unit: "g", preparation_notes: "" }] } : m));
  }

  function removeItemFromDraft(mealIdx: number, itemIdx: number) {
    setDayMeals((prev) => prev.map((m, i) => i === mealIdx ? { ...m, items: m.items.filter((_, j) => j !== itemIdx) } : m));
  }

  function updateItemDraft(mealIdx: number, itemIdx: number, field: keyof ItemDraft, val: string) {
    setDayMeals((prev) => prev.map((m, i) => i === mealIdx ? { ...m, items: m.items.map((it, j) => j === itemIdx ? { ...it, [field]: val } : it) } : m));
  }

  function toggleMeal(mealId: number) {
    setCollapsed((prev) => ({ ...prev, [mealId]: !prev[mealId] }));
  }

  async function updateStatus(newStatus: string) {
    if (!plan) return;
    setActionLoading(true);
    setError(null);
    try {
      const res = await api.patch<DietPlan>(`/diet/plans/${plan.id}`, { status: newStatus });
      setPlan(res.data);
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setActionLoading(false);
    }
  }

  async function handleDelete() {
    if (!plan) return;
    setActionLoading(true);
    try {
      await api.delete(`/diet/plans/${plan.id}`);
      navigate("/app/dietas");
    } catch (err) {
      setError(getApiErrorMessage(err));
      setActionLoading(false);
    }
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-sm text-gray-400">Carregando plano...</p>
      </main>
    );
  }

  if (error && !plan) {
    return (
      <main className="min-h-screen bg-gray-50 flex items-center justify-center px-6">
        <div className="text-center">
          <ClipboardList className="mx-auto h-10 w-10 text-gray-200 mb-3" />
          <p className="text-sm text-red-600 mb-4">{error}</p>
          <BackLink to="/app/dietas" label="Voltar aos planos" />
        </div>
      </main>
    );
  }

  if (!plan) return null;

  const currentDay: DietPlanDay | undefined = plan.days.find((d) => d.day_of_week === selectedDay);
  const mealsToShow = currentDay?.meals ?? [];

  return (
    <main className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="mx-auto max-w-3xl flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <BackLink to="/app/dietas" label="Planos Alimentares" />
            <div className="mt-0.5 flex items-center gap-2 flex-wrap">
              <h1 className="text-xl font-bold text-gray-900 truncate">{plan.title}</h1>
              <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${STATUS_CLASS[plan.status] ?? STATUS_CLASS.draft}`}>
                {STATUS_LABEL[plan.status] ?? plan.status}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0 flex-wrap">
            <Link to={`/app/dietas/${plan.id}/editar`} className="flex items-center gap-1.5 rounded-xl border border-gray-200 px-3 py-2 text-sm text-gray-600 hover:border-green-400 hover:text-green-900 transition">
              <Pencil className="h-4 w-4" />
              Editar
            </Link>
            {plan.status === "draft" && (
              <button onClick={() => updateStatus("active")} disabled={actionLoading} className="rounded-xl bg-green-500 px-4 py-2 text-sm font-semibold text-gray-900 hover:bg-green-600 disabled:opacity-60 transition">Ativar</button>
            )}
            {plan.status === "active" && (
              <button onClick={() => updateStatus("archived")} disabled={actionLoading} className="rounded-xl bg-blue-500 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-600 disabled:opacity-60 transition">Arquivar</button>
            )}
            {plan.status === "archived" && (
              <button onClick={() => updateStatus("active")} disabled={actionLoading} className="rounded-xl border border-gray-300 px-4 py-2 text-sm text-gray-600 hover:border-green-400 hover:text-green-900 disabled:opacity-60 transition">Reativar</button>
            )}
            {!deleteConfirm ? (
              <button onClick={() => setDeleteConfirm(true)} disabled={actionLoading} className="rounded-xl border border-gray-200 p-2 text-gray-400 hover:border-red-300 hover:text-red-500 disabled:opacity-60 transition" title="Excluir plano">
                <Trash2 className="h-4 w-4" />
              </button>
            ) : (
              <div className="flex items-center gap-1">
                <button onClick={handleDelete} disabled={actionLoading} className="rounded-xl bg-red-500 px-3 py-2 text-xs font-semibold text-white hover:bg-red-600 disabled:opacity-60 transition">Confirmar exclusão</button>
                <button onClick={() => setDeleteConfirm(false)} className="rounded-xl border border-gray-200 px-3 py-2 text-xs text-gray-500 hover:bg-gray-50 transition">Cancelar</button>
              </div>
            )}
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-3xl px-6 py-8 space-y-6">
        {error && <p className="rounded-xl bg-red-50 px-4 py-2.5 text-sm text-red-600">{error}</p>}

        {/* Plan info */}
        <div className="rounded-2xl bg-white shadow-sm p-5 space-y-3">
          {plan.patient_username && (
            <div className="flex items-center gap-2 text-sm text-gray-700">
              <User className="h-4 w-4 text-gray-400 shrink-0" />
              <span className="font-medium">{plan.patient_username}</span>
            </div>
          )}
          {plan.objective && <p className="text-sm text-gray-600">{plan.objective}</p>}
          <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-gray-500">
            <span className="flex items-center gap-1.5">
              <Calendar className="h-4 w-4 shrink-0" />
              {plan.start_date ? `${formatDate(plan.start_date)} → ${formatDate(plan.end_date)}` : "Sem datas definidas"}
            </span>
            <span className="flex items-center gap-1.5">
              <Utensils className="h-4 w-4 shrink-0" />
              {mealsToShow.length} {mealsToShow.length === 1 ? "refeição" : "refeições"}
            </span>
          </div>
          {plan.notes && <p className="text-xs text-gray-400 italic">{plan.notes}</p>}
        </div>

        {/* Day selector */}
        {plan.days.length > 0 && (
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-400">Dia da semana</p>
            <div className="flex gap-1.5 flex-wrap">
              {plan.days.map((day) => (
                <button
                  key={day.day_of_week}
                  onClick={() => { setSelectedDay(day.day_of_week); setCollapsed({}); closeDayEdit(); }}
                  className={`rounded-xl px-3 py-1.5 text-xs font-semibold transition ${
                    selectedDay === day.day_of_week
                      ? "bg-green-500 text-gray-900 shadow"
                      : "bg-white border border-gray-200 text-gray-500 hover:border-green-400"
                  }`}
                >
                  {DAY_SHORT[day.day_of_week]}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Inline day editor */}
        {editingDay !== null ? (
          <div className="rounded-2xl bg-orange-50 border border-orange-200 p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-orange-700">
                Editando: {DAY_LONG[editingDay]}
              </h2>
              <button onClick={closeDayEdit} className="rounded-lg p-1.5 text-orange-400 hover:bg-orange-100 transition">
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-3">
              {dayMeals.map((meal, mi) => (
                <div key={mi} className="rounded-xl bg-white border border-gray-100 overflow-hidden">
                  <div className="flex items-center gap-2 px-4 py-3 border-b border-gray-50">
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-orange-100 text-[10px] font-bold text-orange-600">{mi + 1}</span>
                    <input
                      type="text" value={meal.name} onChange={(e) => updateMealDraft(mi, "name", e.target.value)}
                      list={`meal-sg-${mi}`} placeholder="Nome da refeição"
                      className="flex-1 h-8 px-3 rounded-lg border border-gray-200 text-sm outline-none focus:ring-2 focus:ring-orange-400"
                    />
                    <datalist id={`meal-sg-${mi}`}>{MEAL_SUGGESTIONS.map((s) => <option key={s} value={s} />)}</datalist>
                    <input
                      type="time" value={meal.scheduled_time} onChange={(e) => updateMealDraft(mi, "scheduled_time", e.target.value)}
                      className="w-28 h-8 px-2 rounded-lg border border-gray-200 text-sm outline-none focus:ring-2 focus:ring-orange-400"
                    />
                    <button onClick={() => removeMealFromDraft(mi)} className="rounded-lg p-1 text-gray-300 hover:text-red-400 hover:bg-red-50 transition">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                  <div className="px-4 py-3 space-y-2">
                    <input
                      type="text" value={meal.instructions} onChange={(e) => updateMealDraft(mi, "instructions", e.target.value)}
                      placeholder="Instruções (opcional)"
                      className="w-full h-8 px-3 rounded-lg border border-gray-100 bg-gray-50 text-xs outline-none focus:ring-2 focus:ring-orange-400"
                    />
                    {meal.items.map((item, ii) => (
                      <div key={ii} className="flex items-center gap-1.5">
                        <input
                          type="text" value={item.item_description} onChange={(e) => updateItemDraft(mi, ii, "item_description", e.target.value)}
                          placeholder="Alimento" className="flex-1 h-8 px-2 rounded-lg border border-gray-200 text-xs outline-none focus:ring-2 focus:ring-orange-400"
                        />
                        <input
                          type="number" value={item.quantity} onChange={(e) => updateItemDraft(mi, ii, "quantity", e.target.value)}
                          placeholder="Qtd" min="0" step="any" className="w-16 h-8 px-2 rounded-lg border border-gray-200 text-xs outline-none focus:ring-2 focus:ring-orange-400"
                        />
                        <select value={item.unit} onChange={(e) => updateItemDraft(mi, ii, "unit", e.target.value)}
                          className="w-24 h-8 px-1 rounded-lg border border-gray-200 text-xs outline-none focus:ring-2 focus:ring-orange-400">
                          {UNITS.map((u) => <option key={u} value={u}>{u}</option>)}
                        </select>
                        <button onClick={() => removeItemFromDraft(mi, ii)} disabled={meal.items.length === 1}
                          className="p-1 text-gray-300 hover:text-red-400 disabled:opacity-30 transition">
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    ))}
                    <button onClick={() => addItemToDraft(mi)} className="text-[11px] text-orange-400 hover:text-orange-600 flex items-center gap-1 transition">
                      <Plus className="h-3 w-3" /> adicionar alimento
                    </button>
                  </div>
                </div>
              ))}
              <button onClick={addMealToDraft} className="flex items-center gap-1.5 text-xs font-medium text-orange-500 hover:text-orange-700 transition">
                <Plus className="h-3.5 w-3.5" /> Adicionar refeição
              </button>
            </div>

            <div className="flex items-center justify-between pt-1">
              <button onClick={copyToAllDays} disabled={copyingDay || savingDay}
                className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-orange-500 transition disabled:opacity-50">
                <Copy className="h-3.5 w-3.5" />
                {copyingDay ? "Aplicando..." : "Aplicar para todos os dias"}
              </button>
              <div className="flex gap-2">
                <button onClick={closeDayEdit} className="rounded-xl border border-gray-200 px-3 py-2 text-xs text-gray-500 hover:bg-gray-50 transition">Cancelar</button>
                <button onClick={saveDayMeals} disabled={savingDay || copyingDay}
                  className="rounded-xl bg-green-500 px-4 py-2 text-xs font-semibold text-gray-900 hover:bg-green-600 disabled:opacity-60 transition">
                  {savingDay ? "Salvando..." : "Salvar dia"}
                </button>
              </div>
            </div>
          </div>
        ) : (
          <>
            {/* Meals display */}
            {mealsToShow.length === 0 ? (
              <div className="rounded-2xl bg-white shadow-sm p-10 text-center">
                <Utensils className="mx-auto h-8 w-8 text-gray-200 mb-3" />
                <p className="text-sm text-gray-400 mb-3">Nenhuma refeição neste dia.</p>
                <button onClick={() => openDayEdit(selectedDay)}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-green-500 px-4 py-2 text-sm font-semibold text-gray-900 hover:bg-green-600 transition">
                  <Plus className="h-4 w-4" /> Adicionar refeições
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-400">
                    Refeições — {currentDay?.label ?? DAY_SHORT[selectedDay]}
                  </h2>
                  <button onClick={() => openDayEdit(selectedDay)}
                    className="flex items-center gap-1.5 rounded-xl border border-gray-200 px-3 py-1.5 text-xs text-gray-500 hover:border-green-400 hover:text-green-900 transition">
                    <Pencil className="h-3.5 w-3.5" /> Editar este dia
                  </button>
                </div>
                {mealsToShow.map((meal) => (
                  <MealCard key={meal.id} meal={meal} collapsed={!!collapsed[meal.id]} onToggle={() => toggleMeal(meal.id)} />
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </main>
  );
}

function MealCard({ meal, collapsed, onToggle }: { meal: Meal; collapsed: boolean; onToggle: () => void }) {
  return (
    <div className="rounded-2xl bg-white shadow-sm overflow-hidden">
      <button onClick={onToggle} className="w-full flex items-center justify-between px-5 py-4 hover:bg-gray-50 transition text-left">
        <div>
          <p className="font-semibold text-gray-900">{meal.name}</p>
          <p className="text-xs text-gray-400">{meal.scheduled_time && `${meal.scheduled_time} · `}{meal.items.length} {meal.items.length === 1 ? "alimento" : "alimentos"}</p>
        </div>
        {collapsed ? <ChevronDown className="h-4 w-4 text-gray-400" /> : <ChevronUp className="h-4 w-4 text-gray-400" />}
      </button>
      {!collapsed && (
        <div className="border-t border-gray-100">
          {meal.instructions && <p className="px-5 pt-3 text-xs text-gray-500 italic">{meal.instructions}</p>}
          <ul className="divide-y divide-gray-50 px-5 py-2">
            {meal.items.map((item) => <ItemRow key={item.id} item={item} />)}
          </ul>
          {meal.items.length === 0 && <p className="px-5 py-4 text-xs text-gray-400">Nenhum alimento.</p>}
        </div>
      )}
    </div>
  );
}

function ItemRow({ item }: { item: MealItem }) {
  return (
    <li className="flex items-start gap-3 py-3">
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-800">
          {item.item_description}
          {(item.quantity != null || item.unit) && (
            <span className="ml-2 font-normal text-gray-500">{item.quantity != null ? item.quantity : ""} {item.unit ?? ""}</span>
          )}
        </p>
        {item.preparation_notes && <p className="mt-0.5 text-xs text-orange-500">{item.preparation_notes}</p>}
      </div>
    </li>
  );
}
