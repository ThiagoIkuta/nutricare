import { useState } from "react";
import { Trash2 } from "lucide-react";

import { getApiErrorMessage } from "../lib/api";
import { CATEGORY_LABEL, DAY_LABELS } from "../reminders/format";
import { EMPTY_FORM, reminderToFormState, type FormState, type ReminderFormPayload } from "../reminders/form-state";
import { CATEGORY_ICON } from "../reminders/icons";
import type { Reminder, ReminderCategory } from "../notifications/types";

const CATEGORIES: ReminderCategory[] = ["meal", "water", "medication", "custom"];

type ReminderFormProps = {
  mode: "create" | "edit";
  initialValue?: Reminder;
  presetOverride?: Partial<FormState>;
  onSubmit: (payload: ReminderFormPayload) => Promise<void>;
  onCancel?: () => void;
};

export default function ReminderForm({ mode, initialValue, presetOverride, onSubmit, onCancel }: ReminderFormProps) {
  const [form, setForm] = useState<FormState>(() => {
    if (initialValue) return reminderToFormState(initialValue);
    if (presetOverride) return { ...EMPTY_FORM, ...presetOverride };
    return EMPTY_FORM;
  });
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  function toggleDay(day: number) {
    setForm((prev) => ({
      ...prev,
      days_of_week: prev.days_of_week.includes(day)
        ? prev.days_of_week.filter((d) => d !== day)
        : [...prev.days_of_week, day].sort((a, b) => a - b),
    }));
  }

  function addTime() {
    setForm((prev) => {
      if (prev.fixed_times.includes(prev.pendingTime)) return prev;
      return { ...prev, fixed_times: [...prev.fixed_times, prev.pendingTime].sort() };
    });
  }

  function removeTime(index: number) {
    setForm((prev) => ({ ...prev, fixed_times: prev.fixed_times.filter((_, i) => i !== index) }));
  }

  async function handleSubmit() {
    setError(null);

    if (form.days_of_week.length === 0) {
      setError("Selecione pelo menos um dia da semana.");
      return;
    }
    if (form.recurrence_type === "fixed_times" && form.fixed_times.length === 0) {
      setError("Adicione pelo menos um horário.");
      return;
    }
    let interval_hours: number | null = null;
    if (form.recurrence_type === "interval") {
      const value = Number(form.interval_value);
      if (!value || value <= 0) {
        setError("Informe um intervalo maior que zero.");
        return;
      }
      if (form.window_start >= form.window_end) {
        setError("O horário inicial da janela precisa ser antes do horário final.");
        return;
      }
      interval_hours = form.interval_unit === "minutes" ? value / 60 : value;
    }

    const payload: ReminderFormPayload = {
      category: form.category,
      title: form.title.trim(),
      message: form.message.trim() || null,
      recurrence_type: form.recurrence_type,
      fixed_times: form.recurrence_type === "fixed_times" ? form.fixed_times : null,
      interval_hours,
      window_start: form.recurrence_type === "interval" ? form.window_start : null,
      window_end: form.recurrence_type === "interval" ? form.window_end : null,
      days_of_week: form.days_of_week,
    };

    setSubmitting(true);
    try {
      await onSubmit(payload);
      if (mode === "create") setForm(EMPTY_FORM);
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-4">
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
        {CATEGORIES.map((cat) => (
          <button
            key={cat}
            type="button"
            onClick={() => setForm((prev) => ({ ...prev, category: cat }))}
            className={`flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs ${
              form.category === cat
                ? "border-green-400 bg-green-50 text-green-900"
                : "border-gray-200 text-gray-500"
            }`}
          >
            {CATEGORY_ICON[cat]} {CATEGORY_LABEL[cat]}
          </button>
        ))}
      </div>

      <div>
        <p className="mb-1.5 text-xs font-semibold uppercase text-gray-400">Dias da semana</p>
        <div className="flex gap-1.5">
          {DAY_LABELS.map((label, day) => (
            <button
              key={day}
              type="button"
              onClick={() => toggleDay(day)}
              className={`rounded-lg border px-2.5 py-1.5 text-xs ${
                form.days_of_week.includes(day)
                  ? "border-green-400 bg-green-50 text-green-900"
                  : "border-gray-200 text-gray-500"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => setForm((prev) => ({ ...prev, recurrence_type: "fixed_times" }))}
          className={`rounded-lg border px-3 py-1.5 text-xs ${
            form.recurrence_type === "fixed_times"
              ? "border-green-400 bg-green-50 text-green-900"
              : "border-gray-200 text-gray-500"
          }`}
        >
          Horários fixos
        </button>
        <button
          type="button"
          onClick={() => setForm((prev) => ({ ...prev, recurrence_type: "interval" }))}
          className={`rounded-lg border px-3 py-1.5 text-xs ${
            form.recurrence_type === "interval"
              ? "border-green-400 bg-green-50 text-green-900"
              : "border-gray-200 text-gray-500"
          }`}
        >
          Intervalo
        </button>
      </div>

      {form.recurrence_type === "fixed_times" ? (
        <div className="space-y-2">
          <div className="flex gap-2">
            <input
              type="time"
              value={form.pendingTime}
              onChange={(e) => setForm((prev) => ({ ...prev, pendingTime: e.target.value }))}
              className="rounded-lg border border-gray-200 px-3 py-2 text-sm"
            />
            <button
              type="button"
              onClick={addTime}
              className="rounded-lg border border-gray-200 px-3 py-2 text-xs text-gray-600 hover:border-green-400 hover:text-green-900 transition"
            >
              Adicionar horário
            </button>
          </div>
          <div className="flex flex-wrap gap-2">
            {form.fixed_times.map((time, index) => (
              <span
                key={`${time}-${index}`}
                className="flex items-center gap-1.5 rounded-full border border-green-200 bg-green-50 px-3 py-1 text-xs text-green-900"
              >
                {time}
                <button
                  type="button"
                  onClick={() => removeTime(index)}
                  className="text-green-700 hover:text-green-900"
                >
                  <Trash2 className="h-3 w-3" />
                </button>
              </span>
            ))}
            {form.fixed_times.length === 0 && (
              <span className="text-xs text-gray-400">Nenhum horário adicionado ainda.</span>
            )}
          </div>
        </div>
      ) : (
        <div className="flex flex-wrap items-center gap-2">
          <input
            type="number"
            min={form.interval_unit === "minutes" ? 1 : 0.1}
            step={form.interval_unit === "minutes" ? 1 : 0.5}
            placeholder="A cada"
            value={form.interval_value}
            onChange={(e) => setForm((prev) => ({ ...prev, interval_value: e.target.value }))}
            className="w-24 rounded-lg border border-gray-200 px-3 py-2 text-sm"
          />
          <div className="flex gap-1">
            <button
              type="button"
              onClick={() => setForm((prev) => ({ ...prev, interval_unit: "minutes" }))}
              className={`rounded-lg border px-2.5 py-1.5 text-xs ${
                form.interval_unit === "minutes"
                  ? "border-green-400 bg-green-50 text-green-900"
                  : "border-gray-200 text-gray-500"
              }`}
            >
              minutos
            </button>
            <button
              type="button"
              onClick={() => setForm((prev) => ({ ...prev, interval_unit: "hours" }))}
              className={`rounded-lg border px-2.5 py-1.5 text-xs ${
                form.interval_unit === "hours"
                  ? "border-green-400 bg-green-50 text-green-900"
                  : "border-gray-200 text-gray-500"
              }`}
            >
              horas
            </button>
          </div>
          <input
            type="time"
            value={form.window_start}
            onChange={(e) => setForm((prev) => ({ ...prev, window_start: e.target.value }))}
            className="rounded-lg border border-gray-200 px-3 py-2 text-sm"
          />
          <span className="text-xs text-gray-400">até</span>
          <input
            type="time"
            value={form.window_end}
            onChange={(e) => setForm((prev) => ({ ...prev, window_end: e.target.value }))}
            className="rounded-lg border border-gray-200 px-3 py-2 text-sm"
          />
        </div>
      )}

      {error && <p className="text-xs text-red-500">{error}</p>}

      <div className="flex gap-2">
        <button
          onClick={handleSubmit}
          disabled={!form.title.trim() || submitting}
          className="rounded-xl bg-green-500 px-5 py-2.5 text-sm font-semibold text-gray-900 hover:bg-green-600 transition disabled:opacity-50"
        >
          {submitting ? "Salvando..." : mode === "create" ? "Criar lembrete" : "Salvar alterações"}
        </button>
        {onCancel && (
          <button
            onClick={onCancel}
            disabled={submitting}
            className="rounded-xl border border-gray-200 px-5 py-2.5 text-sm text-gray-500 hover:border-gray-300 transition disabled:opacity-50"
          >
            Cancelar
          </button>
        )}
      </div>
    </div>
  );
}
