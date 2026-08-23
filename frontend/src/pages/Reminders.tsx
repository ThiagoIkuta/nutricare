import { useEffect, useState } from "react";
import { Pencil, Trash2 } from "lucide-react";

import { api, getApiErrorMessage } from "../lib/api";
import { useProfile } from "../profile/useProfile";
import ReminderForm from "../components/ReminderForm";
import ToggleSwitch from "../components/ToggleSwitch";
import BackLink from "../components/BackLink";
import { formatDaysOfWeek, formatInterval, formatNextFireAt } from "../reminders/format";
import type { FormState, ReminderFormPayload } from "../reminders/form-state";
import { CATEGORY_ICON } from "../reminders/icons";
import type { Reminder } from "../notifications/types";

type CareLinkOption = { id: number; patient_id: string; patient_username: string | null; status: string };

const PRESETS: { label: string; override: Partial<FormState> }[] = [
  {
    label: "Água a cada 2h",
    override: {
      category: "water",
      title: "Beber água",
      recurrence_type: "interval",
      interval_value: "2",
      interval_unit: "hours",
      window_start: "08:00",
      window_end: "20:00",
    },
  },
  {
    label: "Refeições 08h/12h/19h",
    override: {
      category: "meal",
      title: "Hora da refeição",
      recurrence_type: "fixed_times",
      fixed_times: ["08:00", "12:00", "19:00"],
    },
  },
];

export default function Reminders() {
  const { profile, status } = useProfile();
  const isNutritionist = profile?.profile.role === "nutritionist";
  // "ready"/"missing"/"error" all mean the profile fetch has settled and we know
  // the real role (or lack thereof); "idle"/"loading" mean it hasn't resolved yet.
  const profileReady = status === "ready" || status === "missing" || status === "error";

  const [careLinks, setCareLinks] = useState<CareLinkOption[]>([]);
  const [selectedPatient, setSelectedPatient] = useState<string | null>(null);
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [createKey, setCreateKey] = useState(0);
  const [createPreset, setCreatePreset] = useState<Partial<FormState> | undefined>(undefined);

  useEffect(() => {
    if (isNutritionist) {
      api.get<CareLinkOption[]>("/care/links").then((res) => {
        const active = res.data.filter((link) => link.status === "active");
        setCareLinks(active);
        if (active.length > 0) setSelectedPatient(active[0].patient_id);
      });
    }
  }, [isNutritionist]);

  useEffect(() => {
    if (!profileReady) return;
    if (isNutritionist && !selectedPatient) return;
    const params = isNutritionist ? { patient_id: selectedPatient } : {};
    api
      .get<Reminder[]>("/reminders", { params })
      .then((res) => setReminders(res.data))
      .catch(() => {});
  }, [profileReady, isNutritionist, selectedPatient]);

  function refresh() {
    const params = isNutritionist ? { patient_id: selectedPatient } : {};
    api.get<Reminder[]>("/reminders", { params }).then((res) => setReminders(res.data));
  }

  async function handleCreate(payload: ReminderFormPayload) {
    const careLink = careLinks.find((l) => l.patient_id === selectedPatient);
    const fullPayload = {
      care_link_id: isNutritionist ? careLink?.id ?? null : null,
      ...payload,
    };
    await api.post("/reminders", fullPayload);
    setCreatePreset(undefined);
    refresh();
  }

  async function handleUpdate(id: number, payload: ReminderFormPayload) {
    await api.put(`/reminders/${id}`, payload);
    setEditingId(null);
    refresh();
  }

  function handleToggleActive(reminder: Reminder) {
    api
      .put(`/reminders/${reminder.id}`, { is_active: !reminder.is_active })
      .then(refresh)
      .catch((err) => setError(getApiErrorMessage(err)));
  }

  function handleDelete(reminder: Reminder) {
    if (!window.confirm(`Excluir o lembrete "${reminder.title}"?`)) return;
    api
      .delete(`/reminders/${reminder.id}`)
      .then(refresh)
      .catch((err) => setError(getApiErrorMessage(err)));
  }

  function applyPreset(override: Partial<FormState>) {
    setCreatePreset(override);
    setCreateKey((prev) => prev + 1);
  }

  const noPatientsYet = isNutritionist && careLinks.length === 0;

  return (
    <main className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="mx-auto max-w-3xl flex items-center gap-3">
          <BackLink to="/app" />
          <h1 className="text-lg font-bold text-gray-900">Lembretes</h1>
        </div>
      </header>

      <div className="mx-auto max-w-3xl px-6 py-8 space-y-6">
        {error && <p className="text-xs text-red-500">{error}</p>}

        {noPatientsYet ? (
          <div className="rounded-2xl bg-white shadow-sm p-6 text-center">
            <p className="text-sm text-gray-500">Você ainda não tem pacientes vinculados.</p>
            <p className="mt-1 text-xs text-gray-400">
              Vincule um paciente para poder configurar lembretes para ele.
            </p>
          </div>
        ) : (
          <>
            {isNutritionist && (
              <div className="rounded-2xl bg-white shadow-sm p-4">
                <label className="text-xs font-semibold uppercase text-gray-400">Paciente</label>
                <select
                  value={selectedPatient ?? ""}
                  onChange={(e) => setSelectedPatient(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
                >
                  {careLinks.map((link) => (
                    <option key={link.id} value={link.patient_id}>
                      {link.patient_username ?? link.patient_id}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div className="rounded-2xl bg-white shadow-sm p-6 space-y-4">
              <div>
                <p className="text-sm font-semibold text-gray-900">Novo lembrete</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {PRESETS.map((preset) => (
                    <button
                      key={preset.label}
                      type="button"
                      onClick={() => applyPreset(preset.override)}
                      className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs text-gray-500 hover:border-orange-300 hover:text-orange-500 transition"
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>
              </div>

              <ReminderForm key={createKey} mode="create" presetOverride={createPreset} onSubmit={handleCreate} />
            </div>

            <div className="space-y-3">
              {reminders.map((reminder) =>
                editingId === reminder.id ? (
                  <div key={reminder.id} className="rounded-2xl bg-white shadow-sm p-6">
                    <p className="mb-4 text-sm font-semibold text-gray-900">Editar lembrete</p>
                    <ReminderForm
                      mode="edit"
                      initialValue={reminder}
                      onSubmit={(payload) => handleUpdate(reminder.id, payload)}
                      onCancel={() => setEditingId(null)}
                    />
                  </div>
                ) : (
                  <div
                    key={reminder.id}
                    className="flex items-center justify-between gap-4 rounded-2xl bg-white shadow-sm p-4"
                  >
                    <div className="flex items-center gap-3">
                      <div className="rounded-xl bg-gray-50 p-2">{CATEGORY_ICON[reminder.category]}</div>
                      <div>
                        <p className="text-sm font-medium text-gray-800">{reminder.title}</p>
                        <p className="text-xs text-gray-400">
                          {reminder.recurrence_type === "fixed_times"
                            ? (reminder.fixed_times ?? []).join(", ")
                            : `a cada ${formatInterval(reminder.interval_hours ?? 0)} (${reminder.window_start}–${reminder.window_end})`}
                        </p>
                        <p className="text-xs text-gray-400">
                          {formatDaysOfWeek(reminder.days_of_week)} · Próximo: {formatNextFireAt(reminder.next_fire_at)}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <label className="flex cursor-pointer select-none items-center gap-2">
                        <ToggleSwitch checked={reminder.is_active} onChange={() => handleToggleActive(reminder)} />
                        <span
                          className={`text-xs font-medium ${
                            reminder.is_active ? "text-orange-600" : "text-gray-400"
                          }`}
                        >
                          {reminder.is_active ? "Ativado" : "Desativado"}
                        </span>
                      </label>
                      <button
                        onClick={() => setEditingId(reminder.id)}
                        className="text-gray-400 hover:text-orange-500"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button onClick={() => handleDelete(reminder)} className="text-gray-400 hover:text-red-500">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ),
              )}
              {reminders.length === 0 && (
                <p className="text-sm text-gray-400">Nenhum lembrete configurado ainda.</p>
              )}
            </div>
          </>
        )}
      </div>
    </main>
  );
}
