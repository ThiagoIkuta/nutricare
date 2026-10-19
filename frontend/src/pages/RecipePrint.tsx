import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Printer } from "lucide-react";

import { api } from "../lib/api";
import { computeRecipeMacros } from "../recipes/logic";
import type { Recipe } from "../recipes/types";

/** Versão para impressão de uma receita — o navegador oferece "Salvar como PDF". */
export default function RecipePrint() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [recipe, setRecipe] = useState<Recipe | null>(null);

  useEffect(() => {
    api
      .get<Recipe>(`/recipes/${id}`)
      .then((res) => setRecipe(res.data))
      .catch(() => navigate("/app/receitas"));
  }, [id, navigate]);

  useEffect(() => {
    if (!recipe) return;
    const timer = setTimeout(() => window.print(), 400);
    return () => clearTimeout(timer);
  }, [recipe]);

  if (!recipe) {
    return <div className="p-8 text-sm text-gray-400">Preparando receita...</div>;
  }

  const macros = computeRecipeMacros(recipe);

  return (
    <div className="p-8 max-w-2xl mx-auto font-sans text-sm print:p-4">
      <div className="mb-6 border-b pb-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-orange-500">NutriCare — Receita</p>
        <h1 className="mt-1 text-2xl font-bold text-gray-900">{recipe.title}</h1>
        {recipe.description && <p className="mt-1 text-gray-600">{recipe.description}</p>}
        <p className="mt-1 text-xs text-gray-400">
          {recipe.owner_username ? `Por ${recipe.owner_username} · ` : ""}
          Gerado em {new Date().toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" })}
        </p>
      </div>

      <table className="mb-6 w-full text-xs border-collapse">
        <thead>
          <tr className="bg-gray-50">
            <th className="px-3 py-2 border border-gray-200">Preparo</th>
            <th className="px-3 py-2 border border-gray-200">Porções</th>
            <th className="px-3 py-2 border border-gray-200">Calorias</th>
            <th className="px-3 py-2 border border-gray-200">Proteínas</th>
            <th className="px-3 py-2 border border-gray-200">Carboidratos</th>
            <th className="px-3 py-2 border border-gray-200">Gorduras</th>
          </tr>
        </thead>
        <tbody>
          <tr className="text-center">
            <td className="px-3 py-2 border border-gray-200">{recipe.prep_time_min} min</td>
            <td className="px-3 py-2 border border-gray-200">{recipe.servings}</td>
            <td className="px-3 py-2 border border-gray-200">{Math.round(macros.kcal)} kcal</td>
            <td className="px-3 py-2 border border-gray-200">{Math.round(macros.protein_g)} g</td>
            <td className="px-3 py-2 border border-gray-200">{Math.round(macros.carb_g)} g</td>
            <td className="px-3 py-2 border border-gray-200">{Math.round(macros.fat_g)} g</td>
          </tr>
        </tbody>
      </table>
      <p className="-mt-4 mb-6 text-[10px] text-gray-400">
        Valores estimados pela Tabela TACO para a receita inteira; ingredientes fora da tabela não entram na conta.
      </p>

      {recipe.meal_types.length > 0 && (
        <p className="mb-4 text-xs text-gray-500">
          <strong>Indicada para: </strong>
          {recipe.meal_types.join(", ")}
        </p>
      )}

      <section className="mb-6">
        <h2 className="mb-2 font-semibold text-gray-700">Ingredientes</h2>
        <ul className="list-disc list-inside space-y-1 text-gray-700">
          {recipe.ingredients.map((ing, idx) => (
            <li key={idx}>
              {ing.quantity} {ing.unit} de {ing.food_name}
            </li>
          ))}
        </ul>
      </section>

      {recipe.instructions.length > 0 && (
        <section>
          <h2 className="mb-2 font-semibold text-gray-700">Modo de preparo</h2>
          <ol className="list-decimal list-inside space-y-1.5 text-gray-700">
            {recipe.instructions.map((step, idx) => (
              <li key={idx}>{step}</li>
            ))}
          </ol>
        </section>
      )}

      <div className="mt-8 flex gap-2 print:hidden">
        <button
          onClick={() => navigate(`/app/receitas/${recipe.id}`)}
          className="flex items-center gap-1.5 rounded-xl border border-gray-200 px-4 py-2 text-sm text-gray-600 hover:bg-gray-50"
        >
          <ArrowLeft className="h-5 w-5" />
          Voltar
        </button>
        <button
          onClick={() => window.print()}
          className="flex items-center gap-1.5 rounded-xl bg-orange-500 px-4 py-2 text-sm font-semibold text-white hover:bg-orange-600"
        >
          <Printer className="h-4 w-4" />
          Imprimir / salvar PDF
        </button>
      </div>
    </div>
  );
}
