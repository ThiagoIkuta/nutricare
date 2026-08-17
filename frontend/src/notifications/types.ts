export type NotificationType = "reminder" | "invite" | "diet_plan_assigned" | "chat_summary";

export type NotificationItem = {
  id: number | string;
  type: NotificationType;
  title: string;
  body: string | null;
  reference_id: number | null;
  read_at: string | null;
  created_at: string;
};

export type NotificationPreferences = {
  user_id: string;
  reminders_enabled: boolean;
  chat_enabled: boolean;
  system_enabled: boolean;
  quiet_hours_start: string | null;
  quiet_hours_end: string | null;
};

export type ReminderCategory = "meal" | "water" | "medication" | "custom";
export type RecurrenceType = "fixed_times" | "interval";

export type Reminder = {
  id: number;
  patient_id: string;
  created_by: string;
  care_link_id: number | null;
  category: ReminderCategory;
  title: string;
  message: string | null;
  recurrence_type: RecurrenceType;
  fixed_times: string[] | null;
  interval_hours: number | null;
  window_start: string | null;
  window_end: string | null;
  days_of_week: number[];
  is_active: boolean;
  next_fire_at: string | null;
  created_at: string;
  updated_at: string;
};
