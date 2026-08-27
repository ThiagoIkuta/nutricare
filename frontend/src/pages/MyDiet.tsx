import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { CheckCircle2, ChefHat, Circle, FileText, RefreshCw, Scale, ShoppingCart, Trash2, TrendingUp } from "lucide-react";

import { api } from "../lib/api";
import BackLink from "../components/BackLink";
import RecipeModal from "../components/RecipeModal";
import { suggestRecipesForMeal } from "../data/recipes";
import type { DietPlan, DietPlanDay, Meal, MealItem } from "../diet/types";

// ── Mock ────────────────────────────────────────────────────────────────────
const MOCK_MEALS: Meal[] = [
  { id: 1, diet_plan_day_id: 1, name: "Café da manhã", scheduled_time: "07:00", instructions: "Consumir até 30 min após acordar", display_order: 1, items: [
    { id: 1, meal_id: 1, item_description: "Aveia", quantity: 50, unit: "g", preparation_notes: null, display_order: 1 },
    { id: 2, meal_id: 1, item_description: "Banana", quantity: 1, unit: "unidade", preparation_notes: null, display_order: 2 },
  ]},
  { id: 2, diet_plan_day_id: 1, name: "Almoço", scheduled_time: "12:30", instructions: null, display_order: 2, items: [
    { id: 3, meal_id: 2, item_description: "Arroz integral", quantity: 120, unit: "g", preparation_notes: null, display_order: 1 },
    { id: 4, meal_id: 2, item_description: "Frango grelhado", quantity: 150, unit: "g", preparation_notes: "Temperado com ervas", display_order: 2 },
    { id: 5, meal_id: 2, item_description: "Salada mista", quantity: 1, unit: "porção", preparation_notes: null, display_order: 3 },
  ]},
  { id: 3, diet_plan_day_id: 1, name: "Lanche da tarde", scheduled_time: "16:00", instructions: null, display_order: 3, items: [
    { id: 6, meal_id: 3, item_description: "Iogurte grego", quantity: 170, unit: "g", preparation_notes: null, display_order: 1 },
  ]},
  { id: 4, diet_plan_day_id: 1, name: "Jantar", scheduled_time: "19:30", instructions: null, display_order: 4, items: [
    { id: 7, meal_id: 4, item_description: "Salmão", quantity: 150, unit: "g", preparation_notes: null, display_order: 1 },
    { id: 8, meal_id: 4, item_description: "Batata doce", quantity: 100, unit: "g", preparation_notes: null, display_order: 2 },
  ]},
];

const MOCK_PLAN: DietPlan = {
  id: 0, care_link_id: 0, title: "Plano emagrecimento — Fase 1",
  objective: "Déficit calórico moderado. Beba 2L de água por dia.",
  status: "active", start_date: "2026-05-20", end_date: "2026-06-20",
  notes: null, created_at: new Date().toISOString(), updated_at: new Date().toISOString(),
  patient_id: null, patient_username: null,
  days: Array.from({ length: 7 }, (_, i) => ({
    id: i, diet_plan_id: 0, day_of_week: i,
    label: ["Segunda","Terça","Quarta","Quinta","Sexta","Sábado","Domingo"][i],
    meals: MOCK_MEALS,
  })),
};

// ── Types ───────────────────────────────────────────────────────────────────
type WeightEntry = { date: string; weight_kg: number; notes?: string };
type Checked = Record<string, boolean>;
type ViewMode = "dia" | "semana";

// ── Helpers ─────────────────────────────────────────────────────────────────
const DAYS = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"];

function checklistKey(planId: number, day: number) { return `nutricare.checklist.${planId}.day${day}`; }
function loadChecked(planId: number, day: number): Checked {
  try { return JSON.parse(localStorage.getItem(checklistKey(planId, day)) || "{}"); } catch { return {}; }
}
function saveChecked(planId: number, day: number, data: Checked) {
  localStorage.setItem(checklistKey(planId, day), JSON.stringify(data));
}
function todayIndex() { return (new Date().getDay() + 6) % 7; }

function computeWeekAdherence(
  planId: number,
  refMeals: Meal[],
  currentDay: number,
  currentChecked: Checked,
): number[] {
  const total = refMeals.flatMap((m) => m.items).length;
  if (total === 0) return Array(7).fill(0);
  return Array.from({ length: 7 }, (_, day) => {
    // For the active day use the live React state; for others read localStorage
    const dayChecked = day === currentDay ? currentChecked : loadChecked(planId, day);
    const done = Object.values(dayChecked).filter(Boolean).length;
    return Math.round((done / total) * 100);
  });
}

// ── Charts ───────────────────────────────────────────────────────────────────
const CHART_HEIGHT = 56; // px — altura máxima das barras

function AdherenceChart({ values }: { values: number[] }) {
  const today = todayIndex();
  return (
    <div>
      <div className="flex items-end gap-1.5" style={{ height: CHART_HEIGHT }}>
        {values.map((v, i) => {
          const barH = Math.max(Math.round((v / 100) * CHART_HEIGHT), 3);
          const color =
            i === today ? "#f97316" : v >= 80 ? "#22c55e" : v >= 40 ? "#facc15" : "#e5e7eb";
          return (
            <div key={i} className="flex-1 flex flex-col items-center gap-1">
              <div
                className="w-full rounded-t transition-all duration-300"
                style={{ height: barH, backgroundColor: color }}
              />
              <span className="text-[10px] text-gray-400 leading-none">{DAYS[i]}</span>
            </div>
          );
        })}
      </div>
      <div className="flex gap-4 mt-3">
        {[["#22c55e", "≥80%"], ["#facc15", "40–79%"], ["#f97316", "Hoje"]].map(([c, l]) => (
          <span key={l} className="flex items-center gap-1 text-[10px] text-gray-400">
            <span className="inline-block h-2 w-2 rounded" style={{ backgroundColor: c }} />
            {l}
          </span>
        ))}
      </div>
    </div>
  );
}

function WeightChart({ entries }: { entries: WeightEntry[] }) {
  if (entries.length < 2) return null;
  const ws = entries.map((e) => e.weight_kg);
  const min = Math.min(...ws), max = Math.max(...ws), range = max - min || 1;
  const W = 280, H = 56, p = 8;
  const pts = ws.map((w, i) => {
    const x = p + (i / (ws.length - 1)) * (W - 2 * p);
    const y = H - p - ((w - min) / range) * (H - 2 * p);
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  });
  return (
    <svg width={W} height={H} className="w-full overflow-visible">
      <polyline points={pts.join(" ")} fill="none" stroke="#f97316" strokeWidth="2" strokeLinejoin="round" />
      {ws.map((_, i) => {
        const [x, y] = pts[i].split(",").map(Number);
        return <circle key={i} cx={x} cy={y} r="3" fill="#f97316" />;
      })}
    </svg>
  );
}

// ── Component ────────────────────────────────────────────────────────────────
export default function MyDiet() {
  const [plan, setPlan] = useState<DietPlan | null>(null);
  const [loading, setLoading] = useState(true);
  const [isDemo, setIsDemo] = useState(false);
  const [view, setView] = useState<ViewMode>("dia");
  const [selectedDay, setSelectedDay] = useState(todayIndex());
  const [checked, setChecked] = useState<Checked>({});

  const [weightHistory, setWeightHistory] = useState<WeightEntry[]>([]);
  const [newWeight, setNewWeight] = useState("");
  const [newWeightDate, setNewWeightDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [addingWeight, setAddingWeight] = useState(false);
  const [showWeight, setShowWeight] = useState(false);
  const [recipeMeal, setRecipeMeal] = useState<Meal | null>(null);

  function fetchPlan() {
    setLoading(true);
    api.get<DietPlan>("/diet/my-plan")
      .then((res) => { setPlan(res.data); setIsDemo(false); setChecked(loadChecked(res.data.id, selectedDay)); })
      .catch(() => { setPlan(MOCK_PLAN); setIsDemo(true); setChecked(loadChecked(MOCK_PLAN.id, selectedDay)); })
      .finally(() => setLoading(false));
  }

  useEffect(() => { fetchPlan(); }, []);
  useEffect(() => { if (plan) setChecked(loadChecked(plan.id, selectedDay)); }, [selectedDay, plan?.id]);
  useEffect(() => {
    if (!isDemo) api.get<WeightEntry[]>("/profile/weight-history").then((r) => setWeightHistory(r.data)).catch(() => {});
  }, [isDemo]);

  const currentDayData: DietPlanDay | undefined = plan?.days.find((d) => d.day_of_week === selectedDay);
  const meals: Meal[] = currentDayData?.meals ?? [];
  const refMeals = plan?.days[0]?.meals ?? meals;

  function toggle(key: string) {
    if (!plan) return;
    const next = { ...checked, [key]: !checked[key] };
    saveChecked(plan.id, selectedDay, next);
    setChecked(next);
  }

  async function handleAddWeight() {
    if (!newWeight || !newWeightDate) return;
    setAddingWeight(true);
    try {
      const res = await api.post<WeightEntry[]>("/profile/weight-entry", { date: newWeightDate, weight_kg: parseFloat(newWeight) });
      setWeightHistory(res.data);
      setNewWeight("");
    } catch { /* noop */ } finally { setAddingWeight(false); }
  }

  async function handleDeleteWeight(date: string) {
    try {
      const res = await api.delete<WeightEntry[]>(`/profile/weight-entry/${date}`);
      setWeightHistory(res.data);
    } catch { /* noop */ }
  }

  const totalItems = meals.flatMap((m) => m.items).length;
  const doneItems = Object.values(checked).filter(Boolean).length;
  const progress = totalItems > 0 ? Math.round((doneItems / totalItems) * 100) : 0;
  const weekAdherence = plan
    ? computeWeekAdherence(plan.id, refMeals, selectedDay, checked)
    : Array(7).fill(0);
  const weekAvg = Math.round(weekAdherence.reduce((a, b) => a + b, 0) / 7);

  return (
    <main className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="mx-auto max-w-3xl flex items-center justify-between">
          <div>
            <BackLink to="/app" label="Dashboard" />
            <h1 className="mt-0.5 text-xl font-bold text-gray-900">Minha Dieta</h1>
            {plan && <p className="mt-0.5 text-xs text-gray-400">{plan.title}</p>}
          </div>
          <div className="flex items-center gap-2">
            {!isDemo && (
              <button onClick={() => setShowWeight((p) => !p)}
                className={`flex items-center gap-1.5 rounded-xl border px-3 py-2 text-sm transition ${showWeight ? "border-orange-300 text-orange-500 bg-orange-50" : "border-gray-200 text-gray-600 hover:border-orange-300 hover:text-orange-500"}`}>
                <Scale className="h-4 w-4" /> Peso
              </button>
            )}
            <Link to="/app/lista-de-compras"
              className="flex items-center gap-1.5 rounded-xl border border-gray-200 px-3 py-2 text-sm text-gray-600 hover:border-orange-300 hover:text-orange-500 transition">
              <ShoppingCart className="h-4 w-4" />
            </Link>
            {!isDemo && (
              <Link to="/app/relatorio-adesao"
                className="flex items-center gap-1.5 rounded-xl border border-gray-200 px-3 py-2 text-sm text-gray-600 hover:border-orange-300 hover:text-orange-500 transition"
                title="Exportar relatório PDF">
                <FileText className="h-4 w-4" />
              </Link>
            )}
            <button onClick={fetchPlan}
              className="flex items-center gap-1.5 rounded-xl border border-gray-200 px-3 py-2 text-sm text-gray-600 hover:border-orange-300 hover:text-orange-500 transition">
              <RefreshCw className="h-4 w-4" />
            </button>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-3xl px-6 py-8 space-y-5">
        {loading && <div className="rounded-2xl bg-white p-8 shadow-sm text-center text-sm text-gray-400">Carregando sua dieta...</div>}

        {!loading && plan && (
          <>
            {isDemo && (
              <div className="rounded-xl bg-yellow-50 border border-yellow-200 px-4 py-2.5 text-xs text-yellow-700">
                Modo demonstração — dados fictícios.
              </div>
            )}

            {/* Weight panel */}
            {showWeight && !isDemo && (
              <div className="rounded-2xl bg-white shadow-sm p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Scale className="h-4 w-4 text-orange-400" />
                    <p className="text-sm font-semibold text-gray-800">Histórico de peso</p>
                  </div>
                  {weightHistory.length >= 2 && (() => {
                    const diff = weightHistory[weightHistory.length - 1].weight_kg - weightHistory[0].weight_kg;
                    return (
                      <span className="text-xs text-gray-500">
                        {weightHistory[weightHistory.length - 1].weight_kg} kg
                        <span className={`ml-1 font-semibold ${diff < 0 ? "text-green-500" : "text-red-400"}`}>
                          ({diff > 0 ? "+" : ""}{diff.toFixed(1)} kg)
                        </span>
                      </span>
                    );
                  })()}
                </div>
                <WeightChart entries={weightHistory} />
                <div className="flex gap-2">
                  <input type="date" value={newWeightDate} onChange={(e) => setNewWeightDate(e.target.value)}
                    className="h-9 px-3 rounded-xl border border-gray-200 text-sm outline-none focus:ring-2 focus:ring-orange-400" />
                  <input type="number" value={newWeight} onChange={(e) => setNewWeight(e.target.value)}
                    placeholder="Peso (kg)" step="0.1" min="30" max="300"
                    className="flex-1 h-9 px-3 rounded-xl border border-gray-200 text-sm outline-none focus:ring-2 focus:ring-orange-400" />
                  <button onClick={handleAddWeight} disabled={addingWeight || !newWeight}
                    className="h-9 px-4 rounded-xl bg-orange-500 text-sm font-semibold text-white hover:bg-orange-600 disabled:opacity-60 transition">
                    {addingWeight ? "..." : "Registrar"}
                  </button>
                </div>
                {weightHistory.length > 0 && (
                  <ul className="divide-y divide-gray-50 max-h-32 overflow-y-auto">
                    {[...weightHistory].reverse().map((e) => (
                      <li key={e.date} className="flex items-center justify-between py-2">
                        <span className="text-xs text-gray-500">{new Date(e.date + "T12:00").toLocaleDateString("pt-BR", { day: "2-digit", month: "short" })}</span>
                        <span className="text-sm font-semibold text-gray-800">{e.weight_kg} kg</span>
                        <button onClick={() => handleDeleteWeight(e.date)} className="text-gray-300 hover:text-red-400 transition">
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}

            {/* Progress */}
            <div className="rounded-2xl bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-700">Progresso do dia</span>
                <span className="text-sm font-semibold text-orange-500">{doneItems}/{totalItems}</span>
              </div>
              <div className="h-2.5 w-full rounded-full bg-gray-100 overflow-hidden">
                <div className="h-full rounded-full bg-orange-400 transition-all duration-300" style={{ width: `${progress}%` }} />
              </div>
            </div>

            {/* Adherence */}
            <div className="rounded-2xl bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-orange-400" />
                  <p className="text-sm font-semibold text-gray-800">Adesão semanal</p>
                </div>
                <span className={`text-sm font-bold ${weekAvg >= 70 ? "text-green-500" : weekAvg >= 40 ? "text-yellow-500" : "text-gray-400"}`}>
                  {weekAvg}%
                </span>
              </div>
              <AdherenceChart values={weekAdherence} />
            </div>

            {/* View toggle */}
            <div className="flex rounded-xl bg-white shadow-sm overflow-hidden border border-gray-200 w-fit">
              {(["dia", "semana"] as ViewMode[]).map((v) => (
                <button key={v} onClick={() => setView(v)}
                  className={`px-5 py-2 text-sm font-medium transition ${v === view ? "bg-orange-500 text-white" : "text-gray-500 hover:text-gray-700"}`}>
                  {v === "dia" ? "Dia" : "Semana"}
                </button>
              ))}
            </div>

            {/* Week tabs */}
            {view === "semana" && (
              <div className="flex gap-2">
                {DAYS.map((d, i) => (
                  <button key={d} onClick={() => setSelectedDay(i)}
                    className={`flex-1 rounded-xl py-2 text-xs font-semibold transition ${
                      selectedDay === i ? "bg-orange-500 text-white shadow"
                      : i === todayIndex() ? "bg-orange-100 text-orange-600"
                      : "bg-white text-gray-500 shadow-sm hover:bg-gray-50"
                    }`}>{d}</button>
                ))}
              </div>
            )}

            {/* Meals */}
            <div className="space-y-4">
              {meals.map((meal) => (
                <MealCard
                  key={meal.id}
                  meal={meal}
                  planId={plan.id}
                  day={selectedDay}
                  checked={checked}
                  onToggle={toggle}
                  onShowRecipes={() => setRecipeMeal(meal)}
                />
              ))}
              {meals.length === 0 && (
                <div className="rounded-2xl bg-white p-8 shadow-sm text-center text-sm text-gray-400">Nenhuma refeição para este dia.</div>
              )}
            </div>

            {plan.objective && (
              <div className="rounded-2xl bg-orange-50 border border-orange-100 p-5">
                <p className="text-xs font-semibold uppercase tracking-wide text-orange-400 mb-1">Orientações</p>
                <p className="text-sm text-gray-700">{plan.objective}</p>
              </div>
            )}
          </>
        )}
      </div>

      {recipeMeal && (
        <RecipeModal
          recipes={suggestRecipesForMeal(recipeMeal)}
          planItemNames={recipeMeal.items.map((i) => i.item_description)}
          onClose={() => setRecipeMeal(null)}
        />
      )}
    </main>
  );
}

function MealCard({ meal, planId, day, checked, onToggle, onShowRecipes }: { meal: Meal; planId: number; day: number; checked: Checked; onToggle: (k: string) => void; onShowRecipes: () => void }) {
  const key = (item: MealItem) => `${planId}.${day}.${item.id}`;
  const done = meal.items.filter((i) => checked[key(i)]).length;
  return (
    <div className="rounded-2xl bg-white shadow-sm overflow-hidden">
      <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
        <div>
          <h2 className="font-semibold text-gray-900">{meal.name}</h2>
          {meal.scheduled_time && <p className="text-xs text-gray-400 mt-0.5">{meal.scheduled_time}</p>}
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={onShowRecipes}
            title="Ver receitas sugeridas"
            className="flex items-center gap-1 text-xs text-gray-400 hover:text-orange-500 transition"
          >
            <ChefHat className="h-4 w-4" />
          </button>
          <span className="text-xs text-gray-400">{done}/{meal.items.length}</span>
        </div>
      </div>
      {meal.instructions && <div className="px-5 pt-3"><p className="text-xs text-gray-500 italic">{meal.instructions}</p></div>}
      <ul className="divide-y divide-gray-50 px-5 py-2">
        {meal.items.map((item) => {
          const k = key(item);
          return <ItemRow key={item.id} item={item} checked={!!checked[k]} onToggle={() => onToggle(k)} />;
        })}
      </ul>
    </div>
  );
}

function ItemRow({ item, checked, onToggle }: { item: MealItem; checked: boolean; onToggle: () => void }) {
  return (
    <li className="flex items-start gap-3 py-3">
      <button onClick={onToggle} className="mt-0.5 shrink-0 text-gray-300 hover:text-orange-400 transition">
        {checked ? <CheckCircle2 className="h-5 w-5 text-orange-400" /> : <Circle className="h-5 w-5" />}
      </button>
      <div className="flex-1 min-w-0">
        <p className={`text-sm font-medium ${checked ? "line-through text-gray-400" : "text-gray-800"}`}>
          {item.item_description}
          {(item.quantity != null || item.unit) && (
            <span className="ml-2 font-normal text-gray-500">{item.quantity ?? ""} {item.unit ?? ""}</span>
          )}
        </p>
        {item.preparation_notes && <p className="mt-0.5 text-xs text-orange-500">{item.preparation_notes}</p>}
      </div>
    </li>
  );
}
