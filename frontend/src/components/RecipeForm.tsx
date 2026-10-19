import { useState } from "react";
import { Globe, Lock, Plus, Trash2 } from "lucide-react";

import FoodSearch from "./FoodSearch";
import ToggleSwitch from "./ToggleSwitch";
import { RecipeStats } from "./RecipeView";
import type { TacoFood } from "../data/taco_foods";
import { MEAL_TYPE_OPTIONS, type RecipePayload, type RecipeVisibility } from "../recipes/types";

type IngredientDraft = { food_name: string; quantity: string; unit: string };

type Props = {
  initial?: RecipePayload;
  submitLabel: string;
  isSubmitting: boolean;
  error: string | null;
  onSubmit: (payload: RecipePayload) => void;
  onValidationError: (message: string) => void;
};

const inputClass =
  "w-full h-10 px-3 rounded-xl border border-gray-300 bg-white text-sm outline-none focus:ring-2 focus:ring-orange-400";

function emptyIngredient(): IngredientDraft {
  return { food_name: "", quantity: "", unit: "g" };
}

export default function RecipeForm({ initial, submitLabel, isSubmitting, error, onSubmit, onValidationError }: Props) {
  const [title, setTitle] = useState(initial?.title ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [mealTypes, setMealTypes] = useState<string[]>(initial?.meal_types ?? []);
  const [prepTime, setPrepTime] = useState(String(initial?.prep_time_min ?? 15));
  const [servings, setServings] = useState(String(initial?.servings ?? 1));
  const [visibility, setVisibility] = useState<RecipeVisibility>(initial?.visibility ?? "private");
  const [ingredients, setIngredients] = useState<IngredientDraft[]>(
    initial?.ingredients.length
      ? initial.ingredients.map((i) => ({ food_name: i.food_name, quantity: String(i.quantity), unit: i.unit }))
      : [emptyIngredient()],
  );
  const [steps, setSteps] = useState<string[]>(initial?.instructions.length ? initial.instructions : [""]);

  function setIngredientField(idx: number, field: keyof IngredientDraft, value: string) {
    setIngredients((prev) => prev.map((ing, i) => (i === idx ? { ...ing, [field]: value } : ing)));
  }

  function toggleMealType(type: string) {
    setMealTypes((prev) => (prev.includes(type) ? prev.filter((t) => t !== type) : [...prev, type]));
  }

  const validIngredients = ingredients
    .filter((i) => i.food_name.trim() && Number(i.quantity) > 0)
    .map((i) => ({ food_name: i.food_name.trim(), quantity: Number(i.quantity), unit: i.unit.trim() || "g" }));

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) {
      onValidationError("O título da receita é obrigatório.");
      return;
    }
    if (validIngredients.length === 0) {
      onValidationError("Adicione pelo menos um ingrediente com quantidade.");
      return;
    }
    const servingsNum = parseInt(servings, 10);
    if (!servingsNum || servingsNum < 1) {
      onValidationError("A receita precisa render pelo menos 1 porção.");
      return;
    }
    onSubmit({
      title: title.trim(),
      description: description.trim() || null,
      meal_types: mealTypes,
      ingredients: validIngredients,
      instructions: steps.map((s) => s.trim()).filter(Boolean),
      prep_time_min: Math.max(0, parseInt(prepTime, 10) || 0),
      servings: servingsNum,
      visibility,
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <section className="rounded-2xl bg-white p-6 shadow-sm space-y-4">
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">Título *</label>
          <input value={title} onChange={(e) => setTitle(e.target.value)} className={inputClass} placeholder="Ex.: Omelete de espinafre" />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">Descrição</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={2}
            className="w-full px-3 py-2 rounded-xl border border-gray-300 bg-white text-sm outline-none focus:ring-2 focus:ring-orange-400"
            placeholder="Uma frase sobre a receita (opcional)"
          />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Tempo de preparo (min)</label>
            <input type="number" min={0} value={prepTime} onChange={(e) => setPrepTime(e.target.value)} className={inputClass} />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Porções</label>
            <input type="number" min={1} value={servings} onChange={(e) => setServings(e.target.value)} className={inputClass} />
          </div>
        </div>
        <div>
          <p className="mb-2 text-sm font-medium text-gray-700">Indicada para</p>
          <div className="flex flex-wrap gap-2">
            {MEAL_TYPE_OPTIONS.map((type) => {
              const active = mealTypes.includes(type);
              return (
                <button
                  key={type}
                  type="button"
                  onClick={() => toggleMealType(type)}
                  className={`rounded-full px-3 py-1 text-xs font-medium border transition ${
                    active ? "bg-orange-500 border-orange-500 text-white" : "bg-white border-gray-200 text-gray-600 hover:border-orange-300"
                  }`}
                >
                  {type}
                </button>
              );
            })}
          </div>
        </div>
        <label className="flex items-start justify-between gap-4 cursor-pointer rounded-xl border border-gray-100 p-3">
          <div>
            <p className="flex items-center gap-1.5 text-sm font-medium text-gray-800">
              {visibility === "public" ? <Globe className="h-4 w-4 text-orange-500" /> : <Lock className="h-4 w-4 text-gray-400" />}
              {visibility === "public" ? "Receita pública" : "Receita privada"}
            </p>
            <p className="mt-0.5 text-xs text-gray-400">
              {visibility === "public"
                ? "Todos os usuários do NutriCare podem ver e salvar esta receita."
                : "Só você vê esta receita no seu livro."}
            </p>
          </div>
          <ToggleSwitch
            checked={visibility === "public"}
            onChange={() => setVisibility((v) => (v === "public" ? "private" : "public"))}
          />
        </label>
      </section>

      <section className="rounded-2xl bg-white p-6 shadow-sm space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-gray-900">Ingredientes *</h2>
          <button
            type="button"
            onClick={() => setIngredients((prev) => [...prev, emptyIngredient()])}
            className="flex items-center gap-1 text-xs font-medium text-orange-500 hover:text-orange-600"
          >
            <Plus className="h-3.5 w-3.5" /> Ingrediente
          </button>
        </div>
        <p className="text-xs text-gray-400">
          Escolha um alimento da Tabela TACO para calcular calorias e macros automaticamente — ou digite livremente.
        </p>
        {ingredients.map((ing, idx) => (
          <div key={idx} className="flex items-center gap-2">
            <FoodSearch
              value={ing.food_name}
              onChange={(v) => setIngredientField(idx, "food_name", v)}
              onSelect={(food: TacoFood) => {
                const massUnit = food.default_unit === "g" || food.default_unit === "ml";
                setIngredientField(idx, "food_name", food.name);
                setIngredientField(idx, "quantity", massUnit ? String(food.default_qty) : "1");
                setIngredientField(idx, "unit", food.default_unit);
              }}
              placeholder="Alimento"
              className="min-w-0 flex-[3]"
            />
            <input
              type="number"
              min={0}
              step="any"
              value={ing.quantity}
              onChange={(e) => setIngredientField(idx, "quantity", e.target.value)}
              placeholder="Qtd"
              className="h-9 w-20 px-2 rounded-lg border border-gray-300 text-sm outline-none focus:ring-2 focus:ring-orange-400"
            />
            <input
              value={ing.unit}
              onChange={(e) => setIngredientField(idx, "unit", e.target.value)}
              placeholder="Unidade"
              className="h-9 min-w-0 flex-1 px-2 rounded-lg border border-gray-300 text-sm outline-none focus:ring-2 focus:ring-orange-400"
            />
            <button
              type="button"
              onClick={() => setIngredients((prev) => (prev.length > 1 ? prev.filter((_, i) => i !== idx) : [emptyIngredient()]))}
              className="shrink-0 text-gray-300 hover:text-red-500 transition"
              title="Remover ingrediente"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        ))}
        {validIngredients.length > 0 && (
          <div className="rounded-xl bg-gray-50 px-3 py-2">
            <RecipeStats
              recipe={{
                title,
                description: null,
                meal_types: mealTypes,
                ingredients: validIngredients,
                instructions: [],
                prep_time_min: parseInt(prepTime, 10) || 0,
                servings: parseInt(servings, 10) || 1,
              }}
            />
          </div>
        )}
      </section>

      <section className="rounded-2xl bg-white p-6 shadow-sm space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-gray-900">Modo de preparo</h2>
          <button
            type="button"
            onClick={() => setSteps((prev) => [...prev, ""])}
            className="flex items-center gap-1 text-xs font-medium text-orange-500 hover:text-orange-600"
          >
            <Plus className="h-3.5 w-3.5" /> Passo
          </button>
        </div>
        {steps.map((step, idx) => (
          <div key={idx} className="flex items-start gap-2">
            <span className="mt-2.5 w-5 shrink-0 text-right text-xs font-semibold text-gray-400">{idx + 1}.</span>
            <textarea
              value={step}
              onChange={(e) => setSteps((prev) => prev.map((s, i) => (i === idx ? e.target.value : s)))}
              rows={2}
              className="flex-1 px-3 py-2 rounded-xl border border-gray-300 bg-white text-sm outline-none focus:ring-2 focus:ring-orange-400"
              placeholder="Descreva este passo"
            />
            <button
              type="button"
              onClick={() => setSteps((prev) => (prev.length > 1 ? prev.filter((_, i) => i !== idx) : [""]))}
              className="mt-2.5 shrink-0 text-gray-300 hover:text-red-500 transition"
              title="Remover passo"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        ))}
      </section>

      {error && <p className="rounded-xl bg-red-50 px-4 py-2.5 text-sm text-red-600">{error}</p>}

      <div className="flex justify-end">
        <button
          type="submit"
          disabled={isSubmitting}
          className="rounded-xl bg-orange-500 px-6 py-2.5 text-sm font-semibold text-white hover:bg-orange-600 disabled:opacity-60 transition"
        >
          {isSubmitting ? "Salvando..." : submitLabel}
        </button>
      </div>
    </form>
  );
}
