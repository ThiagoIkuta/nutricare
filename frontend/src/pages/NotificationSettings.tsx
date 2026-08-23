import { useEffect, useState } from "react";

import { api, getApiErrorMessage } from "../lib/api";
import ToggleSwitch from "../components/ToggleSwitch";
import BackLink from "../components/BackLink";
import type { NotificationPreferences } from "../notifications/types";

const EMPTY: NotificationPreferences = {
  user_id: "",
  reminders_enabled: true,
  chat_enabled: true,
  system_enabled: true,
  quiet_hours_start: null,
  quiet_hours_end: null,
};

export default function NotificationSettings() {
  const [prefs, setPrefs] = useState<NotificationPreferences>(EMPTY);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .get<NotificationPreferences>("/notifications/preferences")
      .then((res) => setPrefs(res.data))
      .catch((err) => setError(getApiErrorMessage(err)))
      .finally(() => setLoading(false));
  }, []);

  function toggle(field: "reminders_enabled" | "chat_enabled" | "system_enabled") {
    setPrefs((prev) => ({ ...prev, [field]: !prev[field] }));
  }

  function save() {
    setSaving(true);
    setError(null);
    api
      .put<NotificationPreferences>("/notifications/preferences", {
        reminders_enabled: prefs.reminders_enabled,
        chat_enabled: prefs.chat_enabled,
        system_enabled: prefs.system_enabled,
        quiet_hours_start: prefs.quiet_hours_start,
        quiet_hours_end: prefs.quiet_hours_end,
      })
      .then((res) => setPrefs(res.data))
      .catch((err) => setError(getApiErrorMessage(err)))
      .finally(() => setSaving(false));
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-sm text-gray-400">Carregando preferências...</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="mx-auto max-w-2xl flex items-center gap-3">
          <BackLink to="/app/notificacoes" />
          <h1 className="text-lg font-bold text-gray-900">Preferências de Notificação</h1>
        </div>
      </header>

      <div className="mx-auto max-w-2xl px-6 py-8 space-y-6">
        <div className="rounded-2xl bg-white shadow-sm p-6 space-y-4">
          <ToggleRow
            label="Lembretes"
            description="Avisos de refeição, água, medicação e outros lembretes configurados."
            checked={prefs.reminders_enabled}
            onChange={() => toggle("reminders_enabled")}
          />
          <ToggleRow
            label="Mensagens"
            description="Resumo de novas mensagens de chat."
            checked={prefs.chat_enabled}
            onChange={() => toggle("chat_enabled")}
          />
          <ToggleRow
            label="Avisos do sistema"
            description="Convites de vínculo e planos de dieta atribuídos."
            checked={prefs.system_enabled}
            onChange={() => toggle("system_enabled")}
          />
        </div>

        <div className="rounded-2xl bg-white shadow-sm p-6 space-y-3">
          <p className="text-sm font-semibold text-gray-900">Horário de silêncio</p>
          <p className="text-xs text-gray-500">
            Lembretes não geram notificação nesse intervalo (o próximo horário continua sendo calculado normalmente).
          </p>
          <div className="flex items-center gap-3">
            <input
              type="time"
              value={prefs.quiet_hours_start ?? ""}
              onChange={(e) => setPrefs((prev) => ({ ...prev, quiet_hours_start: e.target.value || null }))}
              className="rounded-lg border border-gray-200 px-3 py-2 text-sm"
            />
            <span className="text-sm text-gray-400">até</span>
            <input
              type="time"
              value={prefs.quiet_hours_end ?? ""}
              onChange={(e) => setPrefs((prev) => ({ ...prev, quiet_hours_end: e.target.value || null }))}
              className="rounded-lg border border-gray-200 px-3 py-2 text-sm"
            />
          </div>
        </div>

        {error && <p className="text-sm text-red-500">{error}</p>}

        <button
          onClick={save}
          disabled={saving}
          className="rounded-xl bg-orange-500 px-5 py-2.5 text-sm font-semibold text-white hover:bg-orange-600 transition disabled:opacity-50"
        >
          {saving ? "Salvando..." : "Salvar preferências"}
        </button>
      </div>
    </main>
  );
}

function ToggleRow({
  label,
  description,
  checked,
  onChange,
}: {
  label: string;
  description: string;
  checked: boolean;
  onChange: () => void;
}) {
  return (
    <label className="flex items-start justify-between gap-4 cursor-pointer">
      <div>
        <p className="text-sm font-medium text-gray-800">{label}</p>
        <p className="text-xs text-gray-400">{description}</p>
      </div>
      <ToggleSwitch checked={checked} onChange={onChange} />
    </label>
  );
}
