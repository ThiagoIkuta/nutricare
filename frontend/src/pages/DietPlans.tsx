import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ClipboardList, Plus, Calendar, Utensils } from "lucide-react";

import { api } from "../lib/api";
import BackLink from "../components/BackLink";
import PresetsTab from "../components/PresetsTab";
import type { DietPlanSummary } from "../diet/types";

const MOCK_PLANS: DietPlanSummary[] = [
  {
    id: 1,
    care_link_id: 1,
    title: "Plano emagrecimento — Fase 1",
    objective:
      "Déficit calórico moderado com foco em proteína e controle de carboidratos.",
    start_date: "2026-05-20",
    end_date: "2026-06-20",
    status: "active",
    created_at: new Date().toISOString(),
    meal_count: 5,
  },
  {
    id: 2,
    care_link_id: 1,
    title: "Plano ganho de massa — Verão",
    objective: null,
    start_date: null,
    end_date: null,
    status: "draft",
    created_at: new Date(Date.now() - 86400000 * 3).toISOString(),
    meal_count: 6,
  },
  {
    id: 3,
    care_link_id: 2,
    title: "Dieta low-carb — Manutenção",
    objective: "Plano de manutenção após atingir o peso ideal.",
    start_date: "2026-04-01",
    end_date: "2026-04-30",
    status: "archived",
    created_at: new Date(Date.now() - 86400000 * 50).toISOString(),
    meal_count: 4,
  },
];

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

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "short",
  });
}

type Filter = "todos" | "active" | "draft" | "archived";
type Tab = "planos" | "presets";

export default function DietPlans() {
  const [plans, setPlans] = useState<DietPlanSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDemo, setIsDemo] = useState(false);
  const [filter, setFilter] = useState<Filter>("todos");
  const [tab, setTab] = useState<Tab>("planos");

  useEffect(() => {
    api
      .get<DietPlanSummary[]>("/diet/plans")
      .then((res) => setPlans(res.data))
      .catch(() => {
        setPlans(MOCK_PLANS);
        setIsDemo(true);
      })
      .finally(() => setLoading(false));
  }, []);

  const filtered =
    filter === "todos" ? plans : plans.filter((p) => p.status === filter);

  const counts = {
    todos: plans.length,
    active: plans.filter((p) => p.status === "active").length,
    draft: plans.filter((p) => p.status === "draft").length,
    archived: plans.filter((p) => p.status === "archived").length,
  };

  return (
    <main className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="mx-auto max-w-4xl flex items-center justify-between">
          <div>
            <BackLink to="/app" label="Dashboard" />
            <h1 className="mt-0.5 text-xl font-bold text-gray-900">
              Planos Alimentares
            </h1>
          </div>
          {tab === "planos" && (
            <Link
              to="/app/dietas/nova"
              className="flex items-center gap-1.5 rounded-xl bg-orange-500 px-4 py-2 text-sm font-semibold text-white hover:bg-orange-600 transition shadow-sm"
            >
              <Plus className="h-4 w-4" />
              Novo plano
            </Link>
          )}
        </div>
      </header>

      <div className="mx-auto max-w-4xl px-6 py-8 space-y-5">
        <div className="flex rounded-xl bg-white shadow-sm overflow-hidden border border-gray-200 w-fit">
          {(["planos", "presets"] as Tab[]).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-5 py-2 text-sm font-medium transition ${
                t === tab ? "bg-orange-500 text-white" : "text-gray-500 hover:text-gray-700"
              }`}
            >
              {t === "planos" ? "Planos" : "Presets"}
            </button>
          ))}
        </div>

        {tab === "presets" && <PresetsTab />}

        {tab === "planos" && (
          <>
            {isDemo && (
              <div className="rounded-xl bg-yellow-50 border border-yellow-200 px-4 py-2.5 text-xs text-yellow-700">
                Modo demonstração — dados fictícios.
              </div>
            )}

            {/* Stats */}
            {!loading && (
              <div className="grid grid-cols-3 gap-3">
                {[
                  {
                    label: "Ativos",
                    count: counts.active,
                    color: "text-green-600 bg-green-50",
                  },
                  {
                    label: "Rascunhos",
                    count: counts.draft,
                    color: "text-gray-500 bg-gray-50",
                  },
                  {
                    label: "Concluídos",
                    count: counts.archived,
                    color: "text-blue-600 bg-blue-50",
                  },
                ].map((s) => (
                  <div
                    key={s.label}
                    className={`rounded-2xl ${s.color} p-4 text-center`}
                  >
                    <p className="text-2xl font-bold">{s.count}</p>
                    <p className="text-xs font-medium mt-0.5">{s.label}</p>
                  </div>
                ))}
              </div>
            )}

            {/* Filter tabs */}
            {!loading && plans.length > 0 && (
              <div className="flex gap-1 rounded-xl bg-white border border-gray-200 p-1 w-fit shadow-sm">
                {(["todos", "active", "draft", "archived"] as Filter[]).map((f) => (
                  <button
                    key={f}
                    onClick={() => setFilter(f)}
                    className={`rounded-lg px-3 py-1.5 text-xs font-medium transition ${
                      filter === f
                        ? "bg-orange-500 text-white shadow"
                        : "text-gray-500 hover:text-gray-700"
                    }`}
                  >
                    {f === "todos" ? "Todos" : STATUS_LABEL[f]}{" "}
                    <span className="opacity-70">({counts[f]})</span>
                  </button>
                ))}
              </div>
            )}

            {/* Loading */}
            {loading && (
              <div className="rounded-2xl bg-white p-10 shadow-sm text-center text-sm text-gray-400">
                Carregando planos...
              </div>
            )}

            {/* Empty */}
            {!loading && filtered.length === 0 && plans.length === 0 && (
              <div className="rounded-2xl bg-white p-12 shadow-sm flex flex-col items-center gap-4 text-center">
                <ClipboardList className="h-10 w-10 text-gray-200" />
                <div>
                  <p className="text-sm font-semibold text-gray-600">
                    Nenhum plano ainda
                  </p>
                  <p className="text-xs text-gray-400 mt-1">
                    Crie seu primeiro plano alimentar para um paciente.
                  </p>
                </div>
                <Link
                  to="/app/dietas/nova"
                  className="flex items-center gap-1.5 rounded-xl bg-orange-500 px-4 py-2.5 text-sm font-semibold text-white hover:bg-orange-600 transition"
                >
                  <Plus className="h-4 w-4" />
                  Criar primeiro plano
                </Link>
              </div>
            )}

            {/* Empty filter */}
            {!loading && filtered.length === 0 && plans.length > 0 && (
              <div className="rounded-2xl bg-white p-8 shadow-sm text-center text-sm text-gray-400">
                Nenhum plano com status "{STATUS_LABEL[filter as string] ?? filter}
                ".
              </div>
            )}

            {/* List */}
            {!loading && filtered.length > 0 && (
              <div className="space-y-3">
                {filtered.map((plan) => (
                  <div
                    key={plan.id}
                    className="rounded-2xl bg-white shadow-sm border border-gray-100 hover:border-orange-200 hover:shadow-md transition p-5 flex items-start justify-between gap-4"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <h2 className="font-semibold text-gray-900">
                          {plan.title}
                        </h2>
                        <span
                          className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_CLASS[plan.status] ?? STATUS_CLASS.draft}`}
                        >
                          {STATUS_LABEL[plan.status] ?? plan.status}
                        </span>
                      </div>

                      {plan.objective && (
                        <p className="text-sm text-gray-500 line-clamp-1 mb-2">
                          {plan.objective}
                        </p>
                      )}

                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-gray-400">
                        <span className="flex items-center gap-1">
                          <Utensils className="h-3 w-3" />
                          {plan.meal_count}{" "}
                          {plan.meal_count === 1 ? "refeição" : "refeições"}
                        </span>
                        {plan.start_date && (
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {formatDate(plan.start_date)}
                            {plan.end_date ? ` → ${formatDate(plan.end_date)}` : ""}
                          </span>
                        )}
                      </div>
                    </div>

                    <Link
                      to={`/app/dietas/${plan.id}`}
                      className="shrink-0 self-center rounded-xl border border-gray-200 px-3 py-2 text-sm text-gray-600 hover:border-orange-400 hover:text-orange-500 transition"
                    >
                      Ver / Editar
                    </Link>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </main>
  );
}
