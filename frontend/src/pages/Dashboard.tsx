import { useEffect, useState } from "react";
import { Link, Navigate } from "react-router-dom";
import {
  Bell,
  BellRing,
  ClipboardList,
  History,
  LogOut,
  MessageSquare,
  Pencil,
  Salad,
  ShoppingCart,
  Users,
} from "lucide-react";

import { useAuth } from "../auth/useAuth";
import { useProfile } from "../profile/useProfile";
import { useUnreadMessages } from "../hooks/useUnreadMessages";
import { useNotificationCounts } from "../hooks/useNotifications";
import { api } from "../lib/api";
import type { ProfileDetails } from "../profile/types";

const DEMO_NUTRITIONIST: ProfileDetails = {
  profile: {
    id: "demo",
    email: "nutricionista@nutricare.com",
    role: "nutritionist",
    username: "Dra. Ana Silva",
    phone: "(11) 99999-9999",
    avatar_url: null,
    is_active: true,
    created_at: null,
    updated_at: null,
  },
  nutritionist_profile: {
    profile_id: "demo",
    crn: "CRN-3 12345",
    specialty: "Nutrição Esportiva",
    bio: null,
    created_at: null,
    updated_at: null,
  },
  patient_profile: null,
};

type Invitation = {
  id: number;
  nutritionist_id: string;
  nutritionist_username: string | null;
  status: string;
  created_at: string;
};

function getInitials(name: string) {
  return name
    .split(" ")
    .slice(0, 2)
    .map((n) => n[0])
    .join("")
    .toUpperCase();
}

const ROLE_LABEL: Record<string, string> = {
  nutritionist: "Nutricionista",
  patient: "Paciente",
};

export default function Dashboard() {
  const { clearSession, session } = useAuth();
  const { profile: apiProfile, status } = useProfile();
  const unread = useUnreadMessages();
  const notificationCounts = useNotificationCounts();
  const [invitations, setInvitations] = useState<Invitation[]>([]);

  useEffect(() => {
    if (!session) return;
    api
      .get<Invitation[]>("/care/invitations")
      .then((res) => setInvitations(res.data))
      .catch(() => {});
  }, [session]);

  function handleInvite(id: number, accept: boolean) {
    const endpoint = accept ? `/care/links/${id}/accept` : `/care/links/${id}/reject`;
    api.post(endpoint).then(() => {
      setInvitations((prev) => prev.filter((i) => i.id !== id));
    }).catch(() => {});
  }

  if (status === "loading") {
    return (
      <main className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-sm text-gray-400">Carregando perfil...</div>
      </main>
    );
  }

  if (status === "missing") {
    return <Navigate to="/profile/setup" replace />;
  }

  const profile = apiProfile ?? DEMO_NUTRITIONIST;
  const isDemo = !apiProfile;
  const { profile: base, nutritionist_profile: nutri, patient_profile: patient } = profile;

  return (
    <main className="min-h-screen bg-gray-50">

      {/* Top bar */}
      <header className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="mx-auto max-w-4xl flex items-center justify-between">
          <span className="text-lg font-bold text-gray-900">NutriCare</span>
          <div className="flex items-center gap-3">
            <Link
              to="/app/notificacoes"
              className="relative flex items-center gap-1.5 rounded-xl border border-gray-200 px-3 py-1.5 text-xs font-semibold text-gray-500 hover:border-orange-300 hover:text-orange-500 transition"
            >
              <BellRing className="h-3.5 w-3.5" />
              Notificações
              {notificationCounts.total > 0 && (
                <span className="absolute -top-1.5 -right-1.5 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-red-500 px-1 text-[9px] font-bold text-white">
                  {notificationCounts.total > 99 ? "99+" : notificationCounts.total}
                </span>
              )}
            </Link>
            {unread.total > 0 && (
              <Link
                to="/app/mensagens"
                className="relative flex items-center gap-1.5 rounded-xl bg-orange-50 border border-orange-200 px-3 py-1.5 text-xs font-semibold text-orange-600 hover:bg-orange-100 transition"
              >
                <Bell className="h-3.5 w-3.5" />
                {unread.total} {unread.total === 1 ? "mensagem" : "mensagens"} não {unread.total === 1 ? "lida" : "lidas"}
              </Link>
            )}
            <button
              onClick={clearSession}
              className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-red-500 transition"
            >
              <LogOut className="h-4 w-4" />
              Sair
            </button>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-4xl px-6 py-10 space-y-6">

        {isDemo && (
          <div className="rounded-xl bg-yellow-50 border border-yellow-200 px-4 py-2.5 text-xs text-yellow-700">
            Modo demonstração — dados fictícios. Conecte o backend para ver seus dados reais.
          </div>
        )}

        {/* Pending invitations banner (patient only) */}
        {invitations.length > 0 && (
          <div className="rounded-2xl bg-orange-50 border border-orange-200 p-5 space-y-3">
            <div className="flex items-center gap-2">
              <Bell className="h-4 w-4 text-orange-500" />
              <p className="text-sm font-semibold text-orange-700">
                {invitations.length === 1
                  ? "Você tem 1 convite pendente"
                  : `Você tem ${invitations.length} convites pendentes`}
              </p>
            </div>
            {invitations.map((inv) => (
              <div
                key={inv.id}
                className="flex items-center justify-between gap-4 bg-white rounded-xl px-4 py-3"
              >
                <div>
                  <p className="text-sm font-medium text-gray-800">
                    {inv.nutritionist_username ?? "Nutricionista"}
                  </p>
                  <p className="text-xs text-gray-400">
                    Enviado em{" "}
                    {new Date(inv.created_at).toLocaleDateString("pt-BR", {
                      day: "2-digit",
                      month: "short",
                    })}
                  </p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleInvite(inv.id, true)}
                    className="rounded-lg bg-green-500 px-3 py-1.5 text-xs font-semibold text-white hover:bg-green-600 transition"
                  >
                    Aceitar
                  </button>
                  <button
                    onClick={() => handleInvite(inv.id, false)}
                    className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs text-gray-500 hover:bg-gray-50 transition"
                  >
                    Recusar
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Profile card */}
        <div className="rounded-2xl bg-white shadow-sm p-6 flex items-center gap-5">
          <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-orange-100 text-xl font-bold text-orange-500 overflow-hidden">
            {base.avatar_url ? (
              <img
                src={base.avatar_url}
                alt={base.username}
                className="h-full w-full object-cover"
                onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
              />
            ) : (
              getInitials(base.username)
            )}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl font-bold text-gray-900">{base.username}</h1>
              <span className="rounded-full bg-orange-100 px-2.5 py-0.5 text-xs font-semibold text-orange-600">
                {ROLE_LABEL[base.role] ?? base.role}
              </span>
            </div>
            <p className="mt-0.5 text-sm text-gray-500">{session?.user.email ?? base.email}</p>

            {nutri && (
              <p className="mt-1 text-xs text-gray-400">
                {nutri.crn}{nutri.specialty ? ` · ${nutri.specialty}` : ""}
              </p>
            )}
            {patient && patient.goal_summary && (
              <p className="mt-1 text-xs text-gray-400">Objetivo: {patient.goal_summary}</p>
            )}
          </div>

          {!isDemo && (
            <Link
              to="/profile/edit"
              className="shrink-0 flex items-center gap-1.5 rounded-xl border border-gray-200 px-3 py-2 text-sm text-gray-500 hover:border-orange-300 hover:text-orange-500 transition"
            >
              <Pencil className="h-4 w-4" />
              Editar
            </Link>
          )}
        </div>

        {/* Tools */}
        <div>
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-gray-400">
            Ferramentas
          </h2>

          {base.role === "nutritionist" && (
            <div className="grid gap-4 sm:grid-cols-2">
              <ToolCard
                to="/app/pacientes"
                icon={<Users className="h-6 w-6 text-orange-500" />}
                title="Pacientes"
                description="Gerencie vínculos com seus pacientes"
                color="orange"
              />
              <ToolCard
                to="/app/dietas"
                icon={<ClipboardList className="h-6 w-6 text-orange-500" />}
                title="Planos Alimentares"
                description="Crie e gerencie dietas para seus pacientes"
                color="orange"
              />
              <ToolCard
                to="/app/mensagens"
                icon={<MessageSquare className="h-6 w-6 text-orange-500" />}
                title="Mensagens"
                description="Converse com seus pacientes"
                color="orange"
                badge={unread.total}
              />
              <ToolCard
                to="/app/lembretes"
                icon={<Bell className="h-6 w-6 text-orange-500" />}
                title="Lembretes"
                description="Configure lembretes de refeição e água para seus pacientes"
                color="orange"
              />
            </div>
          )}

          {base.role === "patient" && (
            <div className="grid gap-4 sm:grid-cols-2">
              <ToolCard
                to="/app/minha-dieta"
                icon={<Salad className="h-6 w-6 text-orange-500" />}
                title="Minha Dieta"
                description="Veja suas refeições e marque como consumido"
                color="orange"
              />
              <ToolCard
                to="/app/lista-de-compras"
                icon={<ShoppingCart className="h-6 w-6 text-green-500" />}
                title="Lista de Compras"
                description="Gerada automaticamente da sua dieta"
                color="green"
              />
              <ToolCard
                to="/app/mensagens"
                icon={<MessageSquare className="h-6 w-6 text-orange-500" />}
                title="Mensagens"
                description="Fale com seu nutricionista"
                color="orange"
                badge={unread.total}
              />
              <ToolCard
                to="/app/meus-planos"
                icon={<History className="h-6 w-6 text-orange-500" />}
                title="Meus Planos"
                description="Histórico de todos os planos alimentares"
                color="orange"
              />
              <ToolCard
                to="/app/lembretes"
                icon={<Bell className="h-6 w-6 text-orange-500" />}
                title="Lembretes"
                description="Seus lembretes de refeição, água e outros"
                color="orange"
              />
            </div>
          )}
        </div>
      </div>
    </main>
  );
}

function ToolCard({
  to,
  icon,
  title,
  description,
  color,
  badge = 0,
}: {
  to: string;
  icon: React.ReactNode;
  title: string;
  description: string;
  color: "orange" | "green";
  badge?: number;
}) {
  const hover =
    color === "orange"
      ? "hover:border-orange-300 hover:shadow-md"
      : "hover:border-green-300 hover:shadow-md";

  return (
    <Link
      to={to}
      className={`relative flex items-start gap-4 rounded-2xl border border-gray-200 bg-white p-5 transition ${hover} group`}
    >
      <div className="mt-0.5 shrink-0 rounded-xl bg-gray-50 p-2.5">{icon}</div>
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-gray-900 group-hover:text-gray-700">{title}</p>
        <p className="mt-0.5 text-xs text-gray-400">{description}</p>
      </div>
      {badge > 0 && (
        <span className="absolute top-3 right-3 flex h-5 min-w-[20px] items-center justify-center rounded-full bg-red-500 px-1.5 text-[10px] font-bold text-white">
          {badge > 99 ? "99+" : badge}
        </span>
      )}
    </Link>
  );
}
