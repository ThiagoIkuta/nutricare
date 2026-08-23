import type { ReminderCategory } from "../notifications/types";

export const CATEGORY_LABEL: Record<ReminderCategory, string> = {
  meal: "Refeição",
  water: "Água",
  medication: "Medicação",
  custom: "Outro",
};

export const DAY_LABELS = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"];

export function formatInterval(hours: number): string {
  const totalMinutes = Math.round(hours * 60);
  if (totalMinutes % 60 === 0) return `${totalMinutes / 60}h`;
  if (totalMinutes < 60) return `${totalMinutes} min`;
  return `${hours.toFixed(1)}h`;
}

export function formatDaysOfWeek(days: number[]): string {
  if (days.length === 7) return "Todos os dias";
  if (days.length === 0) return "Nenhum dia selecionado";
  return [...days]
    .sort((a, b) => a - b)
    .map((d) => DAY_LABELS[d])
    .join(", ");
}

export function formatNextFireAt(iso: string | null): string {
  if (!iso) return "—";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "—";
  const datePart = date.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
  const timePart = date.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
  return `${datePart} ${timePart}`;
}
