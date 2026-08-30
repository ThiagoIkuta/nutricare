export type MealItem = {
  id: number;
  meal_id: number;
  item_description: string;
  quantity: number | null;
  unit: string | null;
  preparation_notes: string | null;
  display_order: number;
};

export type Meal = {
  id: number;
  diet_plan_day_id: number;
  name: string;
  scheduled_time: string | null;
  instructions: string | null;
  display_order: number;
  items: MealItem[];
};

export type DietPlanDay = {
  id: number;
  diet_plan_id: number;
  day_of_week: number;
  label: string | null;
  meals: Meal[];
};

export type DietPlan = {
  id: number;
  care_link_id: number;
  title: string;
  objective: string | null;
  status: "draft" | "active" | "archived";
  start_date: string | null;
  end_date: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  patient_id: string | null;
  patient_username: string | null;
  days: DietPlanDay[];
};

export type DietPlanSummary = {
  id: number;
  care_link_id: number;
  title: string;
  objective: string | null;
  status: "draft" | "active" | "archived";
  start_date: string | null;
  end_date: string | null;
  created_at: string;
  meal_count: number;
};

export type CareLink = {
  id: number;
  nutritionist_id: string;
  patient_id: string;
  status: string;
  patient_username: string | null;
  nutritionist_username: string | null;
  start_date: string | null;
  end_date: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

export type PresetVisibility = "private" | "public";

export type PresetMealItem = {
  item_description: string;
  quantity: number | null;
  unit: string | null;
  preparation_notes: string | null;
  display_order: number;
};

export type PresetMeal = {
  name: string;
  scheduled_time: string | null;
  instructions: string | null;
  display_order: number;
  items: PresetMealItem[];
};

export type DietPlanPreset = {
  id: number;
  nutritionist_id: string | null;
  title: string;
  objective: string | null;
  notes: string | null;
  is_builtin: boolean;
  visibility: PresetVisibility;
  meals: PresetMeal[];
  created_at: string;
  updated_at: string;
};
