import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Droplet, Pill, Salad, Sparkles, Trash2 } from "lucide-react";

import { api, getApiErrorMessage } from "../lib/api";
import { useProfile } from "../profile/useProfile";
import type { Reminder, ReminderCategory, RecurrenceType } from "../notifications/types";

type CareLinkOption = { id: number; patient_id: string; patient_username: string | null; status: string };

const CATEGORY_ICON: Record<ReminderCategory, React.ReactNode> = {
  meal: <Salad className="h-4 w-4" />,
  water: <Droplet className="h-4 w-4" />,
  medication: <Pill className="h-4 w-4" />,
  custom: <Sparkles className="h-4 w-4" />,
};

type FormState = {
  care_link_id: number | null;
  category: ReminderCategory;
  title: string;
  message: string;
  recurrence_type: RecurrenceType;
  fixed_times: string;
  interval_hours: string;
  window_start: string;
  window_end: string;
};

const EMPTY_FORM: FormState = {
  care_link_id: null,
  category: "custom",
  title: "",
  message: "",
  recurrence_type: "fixed_times",
  fixed_times: "08:00",
  interval_hours: "2",
  window_start: "08:00",
  window_end: "20:00",
};

export default function Reminders() {
  const { profile, status } = useProfile();
  const isNutritionist = profile?.profile.role === "nutritionist";
  // "ready"/"missing"/"error" all mean the profile fetch has settled and we know
  // the real role (or lack thereof); "idle"/"loading" mean it hasn't resolved yet.
  const profileReady = status === "ready" || status === "missing" || status === "error";

  const [careLinks, setCareLinks] = useState<CareLinkOption[]>([]);
  const [selectedPatient, setSelectedPatient] = useState<string | null>(null);
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [error, setError] = useState<string | null>(null);

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

  function handleCreate() {
    setError(null);
    const careLink = careLinks.find((l) => l.patient_id === selectedPatient);
    const payload = {
      care_link_id: isNutritionist ? careLink?.id ?? null : null,
      category: form.category,
      title: form.title,
      message: form.message.trim() || null,
      recurrence_type: form.recurrence_type,
      fixed_times:
        form.recurrence_type === "fixed_times"
          ? form.fixed_times.split(",").map((t) => t.trim()).filter(Boolean)
          : null,
      interval_hours: form.recurrence_type === "interval" ? Number(form.interval_hours) : null,
      window_start: form.recurrence_type === "interval" ? form.window_start : null,
      window_end: form.recurrence_type === "interval" ? form.window_end : null,
      days_of_week: [0, 1, 2, 3, 4, 5, 6],
    };
    api
      .post("/reminders", payload)
      .then(() => {
        setForm(EMPTY_FORM);
        refresh();
      })
      .catch((err) => setError(getApiErrorMessage(err)));
  }

  function handleToggleActive(reminder: Reminder) {
    api
      .put(`/reminders/${reminder.id}`, { is_active: !reminder.is_active })
      .then(refresh)
      .catch((err) => setError(getApiErrorMessage(err)));
  }

  function handleDelete(reminder: Reminder) {
    api
      .delete(`/reminders/${reminder.id}`)
      .then(refresh)
      .catch((err) => setError(getApiErrorMessage(err)));
  }

  return (
    <main className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="mx-auto max-w-3xl flex items-center gap-3">
          <Link to="/app" className="text-sm text-gray-400 hover:text-gray-600">
            ← Voltar
          </Link>
          <h1 className="text-lg font-bold text-gray-900">Lembretes</h1>
        </div>
      </header>

      <div className="mx-auto max-w-3xl px-6 py-8 space-y-6">
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
          <p className="text-sm font-semibold text-gray-900">Novo lembrete</p>

          <input
            placeholder="Título (ex: Hora do almoço)"
            value={form.title}
            onChange={(e) => setForm((prev) => ({ ...prev, title: e.target.value }))}
            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
          />

          <input
            placeholder="Mensagem (opcional)"
            value={form.message}
            onChange={(e) => setForm((prev) => ({ ...prev, message: e.target.value }))}
            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
          />

          <div className="flex gap-2">
            {(["meal", "water", "medication", "custom"] as ReminderCategory[]).map((cat) => (
              <button
                key={cat}
                onClick={() => setForm((prev) => ({ ...prev, category: cat }))}
                className={`flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs ${
                  form.category === cat
                    ? "border-orange-400 bg-orange-50 text-orange-600"
                    : "border-gray-200 text-gray-500"
                }`}
              >
                {CATEGORY_ICON[cat]} {cat}
              </button>
            ))}
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => setForm((prev) => ({ ...prev, recurrence_type: "fixed_times" }))}
              className={`rounded-lg border px-3 py-1.5 text-xs ${
                form.recurrence_type === "fixed_times"
                  ? "border-orange-400 bg-orange-50 text-orange-600"
                  : "border-gray-200 text-gray-500"
              }`}
            >
              Horários fixos
            </button>
            <button
              onClick={() => setForm((prev) => ({ ...prev, recurrence_type: "interval" }))}
              className={`rounded-lg border px-3 py-1.5 text-xs ${
                form.recurrence_type === "interval"
                  ? "border-orange-400 bg-orange-50 text-orange-600"
                  : "border-gray-200 text-gray-500"
              }`}
            >
              Intervalo
            </button>
          </div>

          {form.recurrence_type === "fixed_times" ? (
            <input
              placeholder="Horários separados por vírgula (ex: 08:00, 12:00, 19:00)"
              value={form.fixed_times}
              onChange={(e) => setForm((prev) => ({ ...prev, fixed_times: e.target.value }))}
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
            />
          ) : (
            <div className="flex gap-2">
              <input
                type="number"
                min={1}
                placeholder="A cada quantas horas"
                value={form.interval_hours}
                onChange={(e) => setForm((prev) => ({ ...prev, interval_hours: e.target.value }))}
                className="w-32 rounded-lg border border-gray-200 px-3 py-2 text-sm"
              />
              <input
                type="time"
                value={form.window_start}
                onChange={(e) => setForm((prev) => ({ ...prev, window_start: e.target.value }))}
                className="rounded-lg border border-gray-200 px-3 py-2 text-sm"
              />
              <input
                type="time"
                value={form.window_end}
                onChange={(e) => setForm((prev) => ({ ...prev, window_end: e.target.value }))}
                className="rounded-lg border border-gray-200 px-3 py-2 text-sm"
              />
            </div>
          )}

          {error && <p className="text-xs text-red-500">{error}</p>}

          <button
            onClick={handleCreate}
            disabled={!form.title.trim()}
            className="rounded-xl bg-orange-500 px-5 py-2.5 text-sm font-semibold text-white hover:bg-orange-600 transition disabled:opacity-50"
          >
            Criar lembrete
          </button>
        </div>

        <div className="space-y-3">
          {reminders.map((reminder) => (
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
                      : `a cada ${reminder.interval_hours}h (${reminder.window_start}–${reminder.window_end})`}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <label className="flex items-center gap-1.5 text-xs text-gray-500">
                  <input
                    type="checkbox"
                    checked={reminder.is_active}
                    onChange={() => handleToggleActive(reminder)}
                    className="accent-orange-500"
                  />
                  ativo
                </label>
                <button onClick={() => handleDelete(reminder)} className="text-gray-400 hover:text-red-500">
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
          {reminders.length === 0 && <p className="text-sm text-gray-400">Nenhum lembrete configurado ainda.</p>}
        </div>
      </div>
    </main>
  );
}
