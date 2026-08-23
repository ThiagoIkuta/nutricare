import { Droplet, Pill, Salad, Sparkles } from "lucide-react";

import type { ReminderCategory } from "../notifications/types";

export const CATEGORY_ICON: Record<ReminderCategory, React.ReactNode> = {
  meal: <Salad className="h-4 w-4" />,
  water: <Droplet className="h-4 w-4" />,
  medication: <Pill className="h-4 w-4" />,
  custom: <Sparkles className="h-4 w-4" />,
};
