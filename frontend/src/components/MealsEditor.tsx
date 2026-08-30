import { Plus, Trash2, ChevronDown, ChevronUp } from "lucide-react";

import FoodSearch from "./FoodSearch";
import type { TacoFood } from "../data/taco_foods";

export type ItemDraft = {
  item_description: string;
  quantity: string;
  unit: string;
  preparation_notes: string;
};

export type MealDraft = {
  name: string;
  scheduled_time: string;
  instructions: string;
  items: ItemDraft[];
  collapsed: boolean;
};

export const EMPTY_ITEM: ItemDraft = {
  item_description: "",
  quantity: "",
  unit: "g",
  preparation_notes: "",
};

const MEAL_SUGGESTIONS = [
  "Café da manhã",
  "Lanche da manhã",
  "Almoço",
  "Lanche da tarde",
  "Jantar",
  "Ceia",
];

const UNITS = [
  "g",
  "ml",
  "unidade",
  "colher de sopa",
  "colher de chá",
  "xícara",
  "fatia",
  "porção",
];

export function newMeal(name = ""): MealDraft {
  return {
    name,
    scheduled_time: "",
    instructions: "",
    items: [{ ...EMPTY_ITEM }],
    collapsed: false,
  };
}

export type MealItemPayload = {
  item_description: string;
  quantity: number | null;
  unit: string | null;
  preparation_notes: string | null;
  display_order: number;
};

export type MealPayload = {
  name: string;
  scheduled_time: string | null;
  instructions: string | null;
  display_order: number;
  items: MealItemPayload[];
};

export function mealsToPayload(meals: MealDraft[]): MealPayload[] {
  return meals
    .filter((m) => m.name.trim())
    .map((m, i) => ({
      name: m.name.trim(),
      scheduled_time: m.scheduled_time || null,
      instructions: m.instructions.trim() || null,
      display_order: i + 1,
      items: m.items
        .filter((item) => item.item_description.trim())
        .map((item, j) => ({
          item_description: item.item_description.trim(),
          quantity: item.quantity ? parseFloat(item.quantity) : null,
          unit: item.unit || null,
          preparation_notes: item.preparation_notes.trim() || null,
          display_order: j + 1,
        })),
    }));
}

type Props = {
  meals: MealDraft[];
  onChange: (meals: MealDraft[]) => void;
};

export default function MealsEditor({ meals, onChange }: Props) {
  function addMeal() {
    onChange([...meals, newMeal()]);
  }

  function removeMeal(i: number) {
    onChange(meals.filter((_, idx) => idx !== i));
  }

  function toggleMeal(i: number) {
    onChange(meals.map((m, idx) => (idx === i ? { ...m, collapsed: !m.collapsed } : m)));
  }

  function setMealField(
    i: number,
    field: keyof Omit<MealDraft, "items" | "collapsed">,
    value: string
  ) {
    onChange(meals.map((m, idx) => (idx === i ? { ...m, [field]: value } : m)));
  }

  function addItem(mealIdx: number) {
    onChange(meals.map((m, i) => (i === mealIdx ? { ...m, items: [...m.items, { ...EMPTY_ITEM }] } : m)));
  }

  function removeItem(mealIdx: number, itemIdx: number) {
    onChange(
      meals.map((m, i) =>
        i === mealIdx ? { ...m, items: m.items.filter((_, j) => j !== itemIdx) } : m
      )
    );
  }

  function setItemField(mealIdx: number, itemIdx: number, field: keyof ItemDraft, value: string) {
    onChange(
      meals.map((m, i) =>
        i === mealIdx
          ? { ...m, items: m.items.map((item, j) => (j === itemIdx ? { ...item, [field]: value } : item)) }
          : m
      )
    );
  }

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold text-gray-800">Refeições ({meals.length})</h2>
        <button
          type="button"
          onClick={addMeal}
          className="flex items-center gap-1.5 rounded-xl bg-orange-500 px-4 py-2 text-sm font-semibold text-white hover:bg-orange-600 transition"
        >
          <Plus className="h-4 w-4" />
          Adicionar refeição
        </button>
      </div>

      {meals.length === 0 && (
        <div className="rounded-2xl bg-white p-8 shadow-sm text-center text-sm text-gray-400">
          Nenhuma refeição adicionada.
        </div>
      )}

      {meals.map((meal, mealIdx) => (
        <div key={mealIdx} className="rounded-2xl bg-white shadow-sm overflow-hidden">
          <div className="flex items-center gap-3 px-5 py-4 border-b border-gray-100">
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-orange-100 text-xs font-bold text-orange-600">
              {mealIdx + 1}
            </span>

            <input
              type="text"
              value={meal.name}
              onChange={(e) => setMealField(mealIdx, "name", e.target.value)}
              list={`meal-names-${mealIdx}`}
              placeholder="Nome da refeição"
              className="flex-1 h-9 px-3 rounded-xl border border-gray-300 text-sm outline-none focus:ring-2 focus:ring-orange-400"
            />
            <datalist id={`meal-names-${mealIdx}`}>
              {MEAL_SUGGESTIONS.map((s) => (
                <option key={s} value={s} />
              ))}
            </datalist>

            <input
              type="time"
              value={meal.scheduled_time}
              onChange={(e) => setMealField(mealIdx, "scheduled_time", e.target.value)}
              className="w-32 h-9 px-3 rounded-xl border border-gray-300 text-sm outline-none focus:ring-2 focus:ring-orange-400"
              title="Horário sugerido"
            />

            <button
              type="button"
              onClick={() => toggleMeal(mealIdx)}
              className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 transition"
            >
              {meal.collapsed ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
            </button>

            <button
              type="button"
              onClick={() => removeMeal(mealIdx)}
              className="rounded-lg p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-500 transition"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>

          {!meal.collapsed && (
            <div className="px-5 py-4 space-y-4">
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-500 uppercase tracking-wide">
                  Instruções da refeição
                </label>
                <input
                  type="text"
                  value={meal.instructions}
                  onChange={(e) => setMealField(mealIdx, "instructions", e.target.value)}
                  placeholder="Ex: Consumir até 30 min após acordar"
                  className="w-full h-9 px-3 rounded-xl border border-gray-300 text-sm outline-none focus:ring-2 focus:ring-orange-400"
                />
              </div>

              <div>
                <p className="mb-2 text-xs font-medium text-gray-500 uppercase tracking-wide">
                  Alimentos
                </p>

                <div className="space-y-2">
                  {meal.items.map((item, itemIdx) => (
                    <div
                      key={itemIdx}
                      className="rounded-xl border border-gray-100 bg-gray-50 p-3 space-y-2"
                    >
                      <div className="flex items-center gap-2">
                        <FoodSearch
                          value={item.item_description}
                          onChange={(v) => setItemField(mealIdx, itemIdx, "item_description", v)}
                          onSelect={(food: TacoFood) => {
                            setItemField(mealIdx, itemIdx, "item_description", food.name);
                            setItemField(mealIdx, itemIdx, "quantity", String(food.default_qty));
                            setItemField(mealIdx, itemIdx, "unit", food.default_unit);
                          }}
                          className="min-w-0 flex-[3]"
                        />
                        <input
                          type="number"
                          value={item.quantity}
                          onChange={(e) => setItemField(mealIdx, itemIdx, "quantity", e.target.value)}
                          placeholder="Qtd"
                          min="0"
                          step="any"
                          className="w-20 h-9 px-3 rounded-lg border border-gray-300 bg-white text-sm outline-none focus:ring-2 focus:ring-orange-400"
                        />
                        <select
                          value={item.unit}
                          onChange={(e) => setItemField(mealIdx, itemIdx, "unit", e.target.value)}
                          className="w-32 h-9 px-2 rounded-lg border border-gray-300 bg-white text-sm outline-none focus:ring-2 focus:ring-orange-400"
                        >
                          {UNITS.map((u) => (
                            <option key={u} value={u}>
                              {u}
                            </option>
                          ))}
                        </select>
                        <button
                          type="button"
                          onClick={() => removeItem(mealIdx, itemIdx)}
                          disabled={meal.items.length === 1}
                          className="shrink-0 rounded-lg p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-500 transition disabled:opacity-30 disabled:cursor-not-allowed"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>

                      <input
                        type="text"
                        value={item.preparation_notes}
                        onChange={(e) => setItemField(mealIdx, itemIdx, "preparation_notes", e.target.value)}
                        placeholder="Observação de preparo (opcional)"
                        className="w-full h-9 px-3 rounded-lg border border-gray-200 bg-white text-sm outline-none focus:ring-2 focus:ring-orange-400"
                      />
                    </div>
                  ))}
                </div>

                <button
                  type="button"
                  onClick={() => addItem(mealIdx)}
                  className="mt-2 flex items-center gap-1 text-xs font-medium text-orange-500 hover:text-orange-600 transition"
                >
                  <Plus className="h-3 w-3" />
                  Adicionar alimento
                </button>
              </div>
            </div>
          )}
        </div>
      ))}
    </section>
  );
}
