import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Bell, Calendar, CheckCheck, MessageSquare, Settings2, UserPlus, Utensils } from "lucide-react";

import { api } from "../lib/api";
import type { NotificationItem, NotificationType } from "../notifications/types";

const ICONS: Record<NotificationType, React.ReactNode> = {
  reminder: <Bell className="h-5 w-5 text-orange-500" />,
  invite: <UserPlus className="h-5 w-5 text-blue-500" />,
  diet_plan_assigned: <Utensils className="h-5 w-5 text-green-500" />,
  chat_summary: <MessageSquare className="h-5 w-5 text-purple-500" />,
};

function destinationFor(item: NotificationItem): string | null {
  switch (item.type) {
    case "chat_summary":
      return "/app/mensagens";
    case "invite":
      return "/app";
    case "diet_plan_assigned":
      return "/app/minha-dieta";
    case "reminder":
      return "/app/lembretes";
    default:
      return null;
  }
}

export default function Inbox() {
  const navigate = useNavigate();
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get<NotificationItem[]>("/notifications")
      .then((res) => setItems(res.data))
      .finally(() => setLoading(false));
  }, []);

  function handleClick(item: NotificationItem) {
    if (typeof item.id === "number" && !item.read_at) {
      api.post(`/notifications/${item.id}/read`).catch(() => {});
      setItems((prev) =>
        prev.map((i) => (i.id === item.id ? { ...i, read_at: new Date().toISOString() } : i)),
      );
    }
    const destination = destinationFor(item);
    if (destination) navigate(destination);
  }

  function handleMarkAllRead() {
    api
      .post("/notifications/read-all")
      .then(() => {
        setItems((prev) =>
          prev.map((i) =>
            typeof i.id === "number" ? { ...i, read_at: i.read_at ?? new Date().toISOString() } : i,
          ),
        );
      })
      .catch(() => {});
  }

  return (
    <main className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="mx-auto max-w-3xl flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link to="/app" className="text-sm text-gray-400 hover:text-gray-600">
              ← Voltar
            </Link>
            <h1 className="text-lg font-bold text-gray-900">Caixa de Entrada</h1>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleMarkAllRead}
              className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs text-gray-500 hover:bg-gray-100 hover:text-orange-500 transition"
            >
              <CheckCheck className="h-3.5 w-3.5" />
              Marcar tudo como lido
            </button>
            <span className="h-4 w-px bg-gray-200" />
            <Link
              to="/app/notificacoes/preferencias"
              className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs text-gray-500 hover:bg-gray-100 hover:text-orange-500 transition"
            >
              <Settings2 className="h-3.5 w-3.5" />
              Preferências
            </Link>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-3xl px-6 py-8 space-y-3">
        {loading && <p className="text-sm text-gray-400">Carregando...</p>}

        {!loading && items.length === 0 && (
          <p className="text-sm text-gray-400">Nenhuma notificação por aqui ainda.</p>
        )}

        {items.map((item) => (
          <button
            key={item.id}
            onClick={() => handleClick(item)}
            className={`w-full flex items-start gap-3 rounded-2xl border p-4 text-left transition hover:border-orange-300 ${
              item.read_at ? "bg-white border-gray-200" : "bg-orange-50 border-orange-200"
            }`}
          >
            <div className="mt-0.5 shrink-0 rounded-xl bg-gray-50 p-2">{ICONS[item.type]}</div>
            <div className="flex-1 min-w-0">
              <p className={`text-sm ${item.read_at ? "text-gray-700" : "font-semibold text-gray-900"}`}>
                {item.title}
              </p>
              {item.body && <p className="mt-0.5 text-xs text-gray-500">{item.body}</p>}
              <p className="mt-1 flex items-center gap-1 text-[11px] text-gray-400">
                <Calendar className="h-3 w-3" />
                {new Date(item.created_at).toLocaleString("pt-BR")}
              </p>
            </div>
          </button>
        ))}
      </div>
    </main>
  );
}
