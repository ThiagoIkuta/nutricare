import { useEffect, useState } from "react";
import {
  CheckSquare,
  Square,
  Plus,
  Trash2,
  Copy,
  Share2,
  ShoppingBasket,
} from "lucide-react";

import { api } from "../lib/api";
import BackLink from "../components/BackLink";
import type { DietPlan, MealItem } from "../diet/types";

// Mock baseado no novo schema
const MOCK_ITEMS_DAY0: MealItem[] = [
  { id: 1, meal_id: 1, item_description: "Aveia", quantity: 50, unit: "g", preparation_notes: null, display_order: 1 },
  { id: 2, meal_id: 1, item_description: "Banana", quantity: 1, unit: "unidade", preparation_notes: null, display_order: 2 },
  { id: 3, meal_id: 1, item_description: "Leite desnatado", quantity: 200, unit: "ml", preparation_notes: null, display_order: 3 },
  { id: 4, meal_id: 2, item_description: "Arroz integral", quantity: 120, unit: "g", preparation_notes: null, display_order: 1 },
  { id: 5, meal_id: 2, item_description: "Feijão", quantity: 80, unit: "g", preparation_notes: null, display_order: 2 },
  { id: 6, meal_id: 2, item_description: "Frango grelhado", quantity: 150, unit: "g", preparation_notes: null, display_order: 3 },
  { id: 7, meal_id: 2, item_description: "Salada mista", quantity: 1, unit: "porção", preparation_notes: null, display_order: 4 },
  { id: 8, meal_id: 3, item_description: "Iogurte grego", quantity: 170, unit: "g", preparation_notes: null, display_order: 1 },
  { id: 9, meal_id: 3, item_description: "Maçã", quantity: 1, unit: "unidade", preparation_notes: null, display_order: 2 },
  { id: 10, meal_id: 4, item_description: "Salmão", quantity: 150, unit: "g", preparation_notes: null, display_order: 1 },
  { id: 11, meal_id: 4, item_description: "Batata doce", quantity: 100, unit: "g", preparation_notes: null, display_order: 2 },
  { id: 12, meal_id: 4, item_description: "Brócolis", quantity: 100, unit: "g", preparation_notes: null, display_order: 3 },
];

const MOCK_PLAN: DietPlan = {
  id: 0,
  care_link_id: 0,
  title: "Plano emagrecimento — Fase 1",
  objective: null,
  status: "active",
  start_date: null,
  end_date: null,
  notes: null,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  patient_id: null,
  patient_username: null,
  days: [
    {
      id: 0,
      diet_plan_id: 0,
      day_of_week: 0,
      label: "Segunda",
      meals: [
        { id: 1, diet_plan_day_id: 0, name: "Café da manhã", scheduled_time: "07:00", instructions: null, display_order: 1, items: MOCK_ITEMS_DAY0.slice(0, 3) },
        { id: 2, diet_plan_day_id: 0, name: "Almoço", scheduled_time: "12:30", instructions: null, display_order: 2, items: MOCK_ITEMS_DAY0.slice(3, 7) },
        { id: 3, diet_plan_day_id: 0, name: "Lanche da tarde", scheduled_time: "16:00", instructions: null, display_order: 3, items: MOCK_ITEMS_DAY0.slice(7, 9) },
        { id: 4, diet_plan_day_id: 0, name: "Jantar", scheduled_time: "19:30", instructions: null, display_order: 4, items: MOCK_ITEMS_DAY0.slice(9) },
      ],
    },
  ],
};

type Period = "dia" | "semana";

type ShopItem = {
  id: string;
  food_name: string;
  quantity: number;
  unit: string;
  bought: boolean;
  custom?: boolean;
};

const STORAGE_KEY = (planId: number, period: Period) =>
  `nutricare.shoplist.${planId}.${period}`;

function buildFromPlan(plan: DietPlan, period: Period): ShopItem[] {
  const multiplier = period === "semana" ? 7 : 1;
  const map = new Map<string, ShopItem>();

  // Use day 0 as the base (all days have the same meals)
  const baseDay = plan.days.find((d) => d.day_of_week === 0) ?? plan.days[0];
  if (!baseDay) return [];

  for (const meal of baseDay.meals) {
    for (const item of meal.items) {
      const key = `${item.item_description.toLowerCase()}|${item.unit ?? ""}`;
      const qty = (item.quantity ?? 1) * multiplier;
      if (map.has(key)) {
        map.get(key)!.quantity += qty;
      } else {
        map.set(key, {
          id: `${item.id}-${period}`,
          food_name: item.item_description,
          quantity: qty,
          unit: item.unit ?? "unidade",
          bought: false,
        });
      }
    }
  }

  return Array.from(map.values());
}

function loadItems(planId: number, period: Period): ShopItem[] | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY(planId, period));
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function saveItems(planId: number, period: Period, items: ShopItem[]) {
  localStorage.setItem(STORAGE_KEY(planId, period), JSON.stringify(items));
}

function itemsToText(items: ShopItem[], period: Period): string {
  const header = `Lista de compras — ${period === "semana" ? "semana" : "hoje"}\n${"─".repeat(36)}\n`;
  const body = items
    .map(
      (i) =>
        `${i.bought ? "✅" : "☐"} ${i.food_name} — ${i.quantity.toFixed(0)} ${i.unit}`
    )
    .join("\n");
  return header + body;
}

export default function ShoppingList() {
  const [plan, setPlan] = useState<DietPlan | null>(null);
  const [loading, setLoading] = useState(true);
  const [isDemo, setIsDemo] = useState(false);
  const [period, setPeriod] = useState<Period>("semana");
  const [items, setItems] = useState<ShopItem[]>([]);
  const [newItem, setNewItem] = useState("");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    api
      .get<DietPlan>("/diet/my-plan")
      .then((res) => {
        setPlan(res.data);
        setIsDemo(false);
        const saved = loadItems(res.data.id, period);
        setItems(saved ?? buildFromPlan(res.data, period));
      })
      .catch(() => {
        setPlan(MOCK_PLAN);
        setIsDemo(true);
        const saved = loadItems(MOCK_PLAN.id, period);
        setItems(saved ?? buildFromPlan(MOCK_PLAN, period));
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!plan) return;
    const saved = loadItems(plan.id, period);
    setItems(saved ?? buildFromPlan(plan, period));
  }, [period, plan?.id]);

  function persist(next: ShopItem[]) {
    setItems(next);
    if (plan) saveItems(plan.id, period, next);
  }

  function toggleBought(id: string) {
    persist(items.map((i) => (i.id === id ? { ...i, bought: !i.bought } : i)));
  }

  function removeItem(id: string) {
    persist(items.filter((i) => i.id !== id));
  }

  function addCustomItem() {
    const name = newItem.trim();
    if (!name) return;
    const item: ShopItem = {
      id: `custom-${Date.now()}`,
      food_name: name,
      quantity: 1,
      unit: "unidade",
      bought: false,
      custom: true,
    };
    persist([...items, item]);
    setNewItem("");
  }

  function updateQty(id: string, value: string) {
    const qty = parseFloat(value);
    if (isNaN(qty) || qty < 0) return;
    persist(items.map((i) => (i.id === id ? { ...i, quantity: qty } : i)));
  }

  function regenerate() {
    if (!plan) return;
    persist(buildFromPlan(plan, period));
  }

  function copyText() {
    navigator.clipboard.writeText(itemsToText(items, period)).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  function shareWhatsApp() {
    const text = encodeURIComponent(itemsToText(items, period));
    window.open(`https://api.whatsapp.com/send?text=${text}`, "_blank");
  }

  const pending = items.filter((i) => !i.bought);
  const done = items.filter((i) => i.bought);

  return (
    <main className="min-h-screen bg-gray-50">

      <header className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="mx-auto max-w-2xl flex items-center justify-between">
          <div>
            <BackLink to="/app/minha-dieta" label="Minha Dieta" />
            <h1 className="mt-0.5 text-xl font-bold text-gray-900">Lista de Compras</h1>
          </div>

          {items.length > 0 && (
            <div className="flex gap-2">
              <button
                onClick={copyText}
                className="flex items-center gap-1.5 rounded-xl border border-gray-200 px-3 py-2 text-sm text-gray-600 hover:border-orange-300 hover:text-orange-500 transition"
              >
                <Copy className="h-4 w-4" />
                {copied ? "Copiado!" : "Copiar"}
              </button>
              <button
                onClick={shareWhatsApp}
                className="flex items-center gap-1.5 rounded-xl bg-green-500 px-3 py-2 text-sm font-semibold text-white hover:bg-green-600 transition"
              >
                <Share2 className="h-4 w-4" />
                WhatsApp
              </button>
            </div>
          )}
        </div>
      </header>

      <div className="mx-auto max-w-2xl px-6 py-8">

        {loading && (
          <div className="rounded-2xl bg-white p-8 shadow-sm text-center text-sm text-gray-400">
            Carregando lista...
          </div>
        )}

        {!loading && (
          <>
            {isDemo && (
              <div className="mb-4 rounded-xl bg-yellow-50 border border-yellow-200 px-4 py-2.5 text-xs text-yellow-700">
                Modo demonstração — dados fictícios. Seu nutricionista ainda não atribuiu um plano ativo.
              </div>
            )}

            {/* Period + regenerate */}
            <div className="mb-4 flex items-center justify-between">
              <div className="flex rounded-xl bg-white shadow-sm overflow-hidden border border-gray-200 w-fit">
                {(["dia", "semana"] as Period[]).map((p) => (
                  <button
                    key={p}
                    onClick={() => setPeriod(p)}
                    className={`px-5 py-2 text-sm font-medium transition ${
                      period === p
                        ? "bg-orange-500 text-white"
                        : "text-gray-500 hover:text-gray-700"
                    }`}
                  >
                    {p === "dia" ? "Hoje" : "Semana"}
                  </button>
                ))}
              </div>
              <button
                onClick={regenerate}
                className="text-xs text-gray-400 hover:text-orange-500 transition underline"
              >
                Regenerar da dieta
              </button>
            </div>

            {/* Add custom item */}
            <div className="mb-5 flex gap-2">
              <input
                type="text"
                value={newItem}
                onChange={(e) => setNewItem(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && addCustomItem()}
                placeholder="Adicionar item manualmente..."
                className="flex-1 h-10 px-4 rounded-xl border border-gray-300 bg-white text-sm outline-none focus:ring-2 focus:ring-orange-400"
              />
              <button
                onClick={addCustomItem}
                className="flex items-center gap-1 rounded-xl bg-orange-500 px-4 py-2 text-sm font-semibold text-white hover:bg-orange-600 transition"
              >
                <Plus className="h-4 w-4" />
                Add
              </button>
            </div>

            {/* Pending */}
            {pending.length > 0 && (
              <div className="rounded-2xl bg-white shadow-sm overflow-hidden mb-4">
                <div className="px-5 py-3 border-b border-gray-100">
                  <span className="text-sm font-semibold text-gray-700">
                    A comprar ({pending.length})
                  </span>
                </div>
                <ul className="divide-y divide-gray-50">
                  {pending.map((item) => (
                    <ShopRow
                      key={item.id}
                      item={item}
                      onToggle={() => toggleBought(item.id)}
                      onRemove={() => removeItem(item.id)}
                      onQtyChange={(v) => updateQty(item.id, v)}
                    />
                  ))}
                </ul>
              </div>
            )}

            {/* Done */}
            {done.length > 0 && (
              <div className="rounded-2xl bg-white shadow-sm overflow-hidden opacity-60">
                <div className="px-5 py-3 border-b border-gray-100">
                  <span className="text-sm font-semibold text-gray-500">
                    Comprado ({done.length})
                  </span>
                </div>
                <ul className="divide-y divide-gray-50">
                  {done.map((item) => (
                    <ShopRow
                      key={item.id}
                      item={item}
                      onToggle={() => toggleBought(item.id)}
                      onRemove={() => removeItem(item.id)}
                      onQtyChange={(v) => updateQty(item.id, v)}
                    />
                  ))}
                </ul>
              </div>
            )}

            {items.length === 0 && (
              <div className="rounded-2xl bg-white p-10 shadow-sm text-center">
                <ShoppingBasket className="mx-auto h-10 w-10 text-gray-200 mb-3" />
                <p className="text-sm text-gray-400">Nenhum item na lista.</p>
              </div>
            )}
          </>
        )}
      </div>
    </main>
  );
}

function ShopRow({
  item,
  onToggle,
  onRemove,
  onQtyChange,
}: {
  item: ShopItem;
  onToggle: () => void;
  onRemove: () => void;
  onQtyChange: (v: string) => void;
}) {
  return (
    <li className="flex items-center gap-3 px-5 py-3">
      <button
        onClick={onToggle}
        className="shrink-0 text-gray-300 hover:text-orange-400 transition"
      >
        {item.bought ? (
          <CheckSquare className="h-5 w-5 text-orange-400" />
        ) : (
          <Square className="h-5 w-5" />
        )}
      </button>

      <span
        className={`flex-1 text-sm font-medium ${
          item.bought ? "line-through text-gray-400" : "text-gray-800"
        }`}
      >
        {item.food_name}
        {item.custom && (
          <span className="ml-1 text-xs font-normal text-gray-400">(manual)</span>
        )}
      </span>

      <input
        type="number"
        value={item.quantity}
        onChange={(e) => onQtyChange(e.target.value)}
        min="0"
        step="any"
        className="w-16 h-8 px-2 rounded-lg border border-gray-200 text-center text-sm outline-none focus:ring-2 focus:ring-orange-400"
      />

      <span className="w-20 text-xs text-gray-400 shrink-0">{item.unit}</span>

      <button
        onClick={onRemove}
        className="shrink-0 rounded-lg p-1 text-gray-300 hover:bg-red-50 hover:text-red-400 transition"
      >
        <Trash2 className="h-4 w-4" />
      </button>
    </li>
  );
}
