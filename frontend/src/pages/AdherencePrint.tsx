import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";

import { api } from "../lib/api";
import type { DietPlan } from "../diet/types";

const DAYS_LONG = ["Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado", "Domingo"];

type AdherenceDay = { date: string; expected: number; completed: number; completed_item_ids: number[] };

function startOfWeek(d: Date): Date {
  const copy = new Date(d);
  copy.setDate(copy.getDate() - ((d.getDay() + 6) % 7));
  copy.setHours(0, 0, 0, 0);
  return copy;
}
function toISODate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}
function formatShort(iso: string): string {
  const [, m, d] = iso.split("-");
  return `${d}/${m}`;
}

export default function AdherencePrint() {
  const navigate = useNavigate();
  const [plan, setPlan] = useState<DietPlan | null>(null);
  const [weekDays, setWeekDays] = useState<AdherenceDay[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get<DietPlan>("/diet/my-plan")
      .then((res) => {
        setPlan(res.data);
        const monday = startOfWeek(new Date());
        const sunday = new Date(monday);
        sunday.setDate(monday.getDate() + 6);
        return api.get<{ days: AdherenceDay[] }>("/diet/my-plan/adherence", {
          params: { start: toISODate(monday), end: toISODate(sunday) },
        });
      })
      .then((res) => setWeekDays(res.data.days))
      .catch(() => navigate("/app/minha-dieta"))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!loading && plan) {
      setTimeout(() => window.print(), 400);
    }
  }, [loading, plan]);

  if (loading || !plan) {
    return <div className="p-8 text-sm text-gray-400">Preparando relatório...</div>;
  }

  const monday = startOfWeek(new Date());
  function dateForDay(dayOfWeek: number): string {
    const d = new Date(monday);
    d.setDate(monday.getDate() + dayOfWeek);
    return toISODate(d);
  }

  return (
    <div className="p-8 max-w-2xl mx-auto font-sans text-sm print:p-4">
      <div className="mb-6 border-b pb-4">
        <h1 className="text-2xl font-bold text-gray-900">NutriCare — Relatório de Adesão</h1>
        <p className="text-gray-500 mt-1">{plan.title}</p>
        <p className="text-xs text-gray-400 mt-0.5">
          Gerado em {new Date().toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" })}
        </p>
      </div>

      {/* Adherence summary per day */}
      <section className="mb-6">
        <h2 className="font-semibold text-gray-700 mb-3">Adesão semanal</h2>
        <table className="w-full text-xs border-collapse">
          <thead>
            <tr className="bg-gray-50">
              <th className="text-left px-3 py-2 border border-gray-200">Dia</th>
              <th className="text-center px-3 py-2 border border-gray-200">Itens marcados</th>
              <th className="text-center px-3 py-2 border border-gray-200">Total</th>
              <th className="text-center px-3 py-2 border border-gray-200">%</th>
            </tr>
          </thead>
          <tbody>
            {plan.days.map((day) => {
              const iso = dateForDay(day.day_of_week);
              const entry = weekDays.find((d) => d.date === iso);
              const total = entry?.expected ?? 0;
              const done = entry?.completed ?? 0;
              const pct = total > 0 ? Math.round((done / total) * 100) : 0;
              return (
                <tr key={day.day_of_week} className="border-b border-gray-100">
                  <td className="px-3 py-2 border border-gray-200 font-medium">
                    {DAYS_LONG[day.day_of_week]} <span className="font-normal text-gray-400">({formatShort(iso)})</span>
                  </td>
                  <td className="px-3 py-2 border border-gray-200 text-center">{done}</td>
                  <td className="px-3 py-2 border border-gray-200 text-center">{total}</td>
                  <td className={`px-3 py-2 border border-gray-200 text-center font-semibold ${pct >= 80 ? "text-green-600" : pct >= 40 ? "text-yellow-600" : "text-red-500"}`}>
                    {pct}%
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </section>

      {/* Plan meals (day 0 as reference) */}
      <section>
        <h2 className="font-semibold text-gray-700 mb-3">Plano alimentar (refeições por dia)</h2>
        {(plan.days[0]?.meals ?? []).map((meal) => (
          <div key={meal.id} className="mb-4 border border-gray-200 rounded-lg overflow-hidden">
            <div className="bg-gray-50 px-3 py-2 flex items-center justify-between">
              <span className="font-medium text-gray-800">{meal.name}</span>
              {meal.scheduled_time && <span className="text-gray-400 text-xs">{meal.scheduled_time}</span>}
            </div>
            <ul className="divide-y divide-gray-100">
              {meal.items.map((item) => (
                <li key={item.id} className="px-3 py-1.5 flex items-center justify-between">
                  <span className="text-gray-700">{item.item_description}</span>
                  {(item.quantity != null || item.unit) && (
                    <span className="text-gray-400 text-xs">{item.quantity} {item.unit}</span>
                  )}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </section>

      {plan.objective && (
        <div className="mt-6 border-t pt-4 text-xs text-gray-500">
          <strong>Orientações: </strong>{plan.objective}
        </div>
      )}

      <button
        onClick={() => navigate("/app/minha-dieta")}
        className="mt-6 print:hidden flex items-center gap-1.5 rounded-xl border border-gray-200 px-4 py-2 text-sm text-gray-600 hover:bg-gray-50"
      >
        <ArrowLeft className="h-5 w-5" />
        Voltar
      </button>
    </div>
  );
}
