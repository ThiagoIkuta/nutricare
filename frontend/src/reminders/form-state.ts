import type { Reminder, ReminderCategory, RecurrenceType } from "../notifications/types";

export type FormState = {
  category: ReminderCategory;
  title: string;
  message: string;
  recurrence_type: RecurrenceType;
  fixed_times: string[];
  pendingTime: string;
  interval_value: string;
  interval_unit: "minutes" | "hours";
  window_start: string;
  window_end: string;
  days_of_week: number[];
};

export const EMPTY_FORM: FormState = {
  category: "custom",
  title: "",
  message: "",
  recurrence_type: "fixed_times",
  fixed_times: ["08:00"],
  pendingTime: "08:00",
  interval_value: "2",
  interval_unit: "hours",
  window_start: "08:00",
  window_end: "20:00",
  days_of_week: [0, 1, 2, 3, 4, 5, 6],
};

export type ReminderFormPayload = {
  category: ReminderCategory;
  title: string;
  message: string | null;
  recurrence_type: RecurrenceType;
  fixed_times: string[] | null;
  interval_hours: number | null;
  window_start: string | null;
  window_end: string | null;
  days_of_week: number[];
};

export function reminderToFormState(reminder: Reminder): FormState {
  const isMinutes = reminder.interval_hours != null && reminder.interval_hours < 1;
  return {
    category: reminder.category,
    title: reminder.title,
    message: reminder.message ?? "",
    recurrence_type: reminder.recurrence_type,
    fixed_times: reminder.fixed_times && reminder.fixed_times.length > 0 ? reminder.fixed_times : ["08:00"],
    pendingTime: "08:00",
    interval_value:
      reminder.interval_hours == null
        ? "2"
        : isMinutes
          ? String(Math.round(reminder.interval_hours * 60))
          : String(reminder.interval_hours),
    interval_unit: isMinutes ? "minutes" : "hours",
    window_start: reminder.window_start ?? "08:00",
    window_end: reminder.window_end ?? "20:00",
    days_of_week: reminder.days_of_week.length > 0 ? reminder.days_of_week : [0, 1, 2, 3, 4, 5, 6],
  };
}
