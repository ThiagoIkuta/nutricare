import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Calendar, ClipboardList, Utensils } from "lucide-react";

import { api } from "../lib/api";
import BackLink from "../components/BackLink";
import type { DietPlanSummary } from "../diet/types";

type PatientSummary = DietPlanSummary & { nutritionist_username: string | null };

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

function formatDate(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" });
}

export default function PatientPlanHistory() {
  const [plans, setPlans] = useState<PatientSummary[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get<PatientSummary[]>("/diet/my-plans")
      .then((res) => setPlans(res.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const active = plans.filter((p) => p.status === "active");
  const others = plans.filter((p) => p.status !== "active");

  return (
    <main className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="mx-auto max-w-3xl">
          <BackLink to="/app" label="Dashboard" />
          <h1 className="mt-0.5 text-xl font-bold text-gray-900">Meus Planos Alimentares</h1>
          <p className="mt-0.5 text-xs text-gray-400">Histórico de todos os planos criados pelo seu nutricionista</p>
        </div>
      </header>

      <div className="mx-auto max-w-3xl px-6 py-8 space-y-6">
        {loading && (
          <div className="rounded-2xl bg-white p-8 shadow-sm text-center text-sm text-gray-400">
            Carregando seus planos...
          </div>
        )}

        {!loading && plans.length === 0 && (
          <div className="rounded-2xl bg-white p-12 shadow-sm flex flex-col items-center gap-4 text-center">
            <ClipboardList className="h-10 w-10 text-gray-200" />
            <div>
              <p className="text-sm font-semibold text-gray-600">Nenhum plano ainda</p>
              <p className="text-xs text-gray-400 mt-1">Seu nutricionista ainda não criou um plano para você.</p>
            </div>
          </div>
        )}

        {!loading && active.length > 0 && (
          <div>
            <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-gray-400">Plano ativo</h2>
            <div className="space-y-3">
              {active.map((plan) => <PlanCard key={plan.id} plan={plan} />)}
            </div>
          </div>
        )}

        {!loading && others.length > 0 && (
          <div>
            <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-gray-400">
              Histórico ({others.length})
            </h2>
            <div className="space-y-3">
              {others.map((plan) => <PlanCard key={plan.id} plan={plan} />)}
            </div>
          </div>
        )}
      </div>
    </main>
  );
}

function PlanCard({ plan }: { plan: PatientSummary }) {
  return (
    <div className="rounded-2xl bg-white shadow-sm border border-gray-100 p-5 space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h2 className="font-semibold text-gray-900">{plan.title}</h2>
            <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_CLASS[plan.status] ?? STATUS_CLASS.draft}`}>
              {STATUS_LABEL[plan.status] ?? plan.status}
            </span>
          </div>
          {plan.nutritionist_username && (
            <p className="text-xs text-gray-400 mt-0.5">por {plan.nutritionist_username}</p>
          )}
          {plan.objective && (
            <p className="text-sm text-gray-500 mt-1 line-clamp-2">{plan.objective}</p>
          )}
        </div>
      </div>

      <div className="flex flex-wrap gap-x-5 gap-y-1 text-xs text-gray-400">
        <span className="flex items-center gap-1">
          <Utensils className="h-3 w-3" />
          {plan.meal_count} {plan.meal_count === 1 ? "refeição" : "refeições"}/dia
        </span>
        <span className="flex items-center gap-1">
          <Calendar className="h-3 w-3" />
          {plan.start_date
            ? `${formatDate(plan.start_date)} → ${formatDate(plan.end_date)}`
            : "Sem datas"}
        </span>
        <span>Criado em {formatDate(plan.created_at)}</span>
      </div>

      {plan.status === "active" && (
        <Link
          to="/app/minha-dieta"
          className="inline-flex items-center gap-1.5 rounded-xl bg-green-500 px-4 py-2 text-xs font-semibold text-gray-900 hover:bg-green-600 transition"
        >
          Ver minha dieta →
        </Link>
      )}
    </div>
  );
}
