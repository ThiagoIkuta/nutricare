import { TACO_FOODS, normalizeText } from "./taco_foods";
import type { Meal } from "../diet/types";

export type RecipeIngredient = {
  food_name: string; // deve bater com um TacoFood.name existente em taco_foods.ts
  quantity: number;
  unit: string;
};

export type Recipe = {
  id: string;
  name: string;
  meal_types: string[];
  ingredients: RecipeIngredient[];
  instructions: string[];
  prep_time_min: number;
  servings: number;
};

export const RECIPES: Recipe[] = [
  // Café da manhã
  {
    id: "mingau-aveia-banana-mel",
    name: "Mingau de aveia com banana e mel",
    meal_types: ["Café da manhã"],
    ingredients: [
      { food_name: "Aveia em flocos", quantity: 40, unit: "g" },
      { food_name: "Leite integral", quantity: 200, unit: "ml" },
      { food_name: "Banana prata", quantity: 1, unit: "unidade" },
      { food_name: "Mel", quantity: 1, unit: "colher de sopa" },
    ],
    instructions: [
      "Aqueça o leite em fogo baixo e adicione a aveia, mexendo até engrossar.",
      "Corte a banana em rodelas e adicione por cima.",
      "Finalize com o mel.",
    ],
    prep_time_min: 10,
    servings: 1,
  },
  {
    id: "tapioca-queijo",
    name: "Tapioca com queijo",
    meal_types: ["Café da manhã", "Lanche da tarde"],
    ingredients: [
      { food_name: "Tapioca (goma)", quantity: 50, unit: "g" },
      { food_name: "Queijo mussarela", quantity: 30, unit: "g" },
    ],
    instructions: [
      "Espalhe a goma de tapioca numa frigideira antiaderente quente até firmar.",
      "Vire, adicione o queijo, dobre ao meio e deixe derreter.",
    ],
    prep_time_min: 8,
    servings: 1,
  },
  {
    id: "pao-integral-ovo-abacate",
    name: "Pão integral com ovo e abacate",
    meal_types: ["Café da manhã"],
    ingredients: [
      { food_name: "Pão integral", quantity: 2, unit: "fatia" },
      { food_name: "Ovo inteiro cozido", quantity: 1, unit: "unidade" },
      { food_name: "Abacate", quantity: 50, unit: "g" },
    ],
    instructions: [
      "Amasse o abacate e espalhe sobre as fatias de pão.",
      "Corte o ovo cozido em rodelas e distribua por cima.",
    ],
    prep_time_min: 10,
    servings: 1,
  },
  {
    id: "iogurte-granola-morango",
    name: "Iogurte com granola e morango",
    meal_types: ["Café da manhã", "Lanche da tarde"],
    ingredients: [
      { food_name: "Iogurte natural desnatado", quantity: 170, unit: "g" },
      { food_name: "Granola", quantity: 30, unit: "g" },
      { food_name: "Morango", quantity: 60, unit: "g" },
    ],
    instructions: [
      "Corte os morangos ao meio.",
      "Monte em camadas: iogurte, granola e morangos.",
    ],
    prep_time_min: 5,
    servings: 1,
  },
  {
    id: "vitamina-banana-aveia",
    name: "Vitamina de banana com aveia",
    meal_types: ["Café da manhã", "Lanche da tarde"],
    ingredients: [
      { food_name: "Leite desnatado", quantity: 200, unit: "ml" },
      { food_name: "Banana prata", quantity: 1, unit: "unidade" },
      { food_name: "Aveia em flocos", quantity: 20, unit: "g" },
      { food_name: "Mel", quantity: 1, unit: "colher de sopa" },
    ],
    instructions: ["Bata todos os ingredientes no liquidificador até ficar homogêneo."],
    prep_time_min: 5,
    servings: 1,
  },
  {
    id: "panqueca-aveia-whey",
    name: "Panqueca de aveia com whey",
    meal_types: ["Café da manhã"],
    ingredients: [
      { food_name: "Aveia em flocos", quantity: 30, unit: "g" },
      { food_name: "Whey protein (pó)", quantity: 30, unit: "g" },
      { food_name: "Ovo inteiro cozido", quantity: 1, unit: "unidade" },
      { food_name: "Banana prata", quantity: 1, unit: "unidade" },
    ],
    instructions: [
      "Amasse a banana e misture com o ovo, a aveia e o whey até formar uma massa.",
      "Frite pequenas porções numa frigideira antiaderente até dourar dos dois lados.",
    ],
    prep_time_min: 15,
    servings: 1,
  },

  // Almoço
  {
    id: "frango-arroz-integral-brocolis",
    name: "Frango grelhado com arroz integral e brócolis",
    meal_types: ["Almoço", "Jantar"],
    ingredients: [
      { food_name: "Frango peito grelhado", quantity: 150, unit: "g" },
      { food_name: "Arroz integral cozido", quantity: 150, unit: "g" },
      { food_name: "Brócolis cozido", quantity: 100, unit: "g" },
      { food_name: "Azeite de oliva", quantity: 1, unit: "colher de sopa" },
    ],
    instructions: [
      "Tempere e grelhe o peito de frango.",
      "Sirva com o arroz integral e o brócolis, finalizando com um fio de azeite.",
    ],
    prep_time_min: 25,
    servings: 1,
  },
  {
    id: "tilapia-batata-doce-salada",
    name: "Filé de tilápia com batata doce e salada",
    meal_types: ["Almoço", "Jantar"],
    ingredients: [
      { food_name: "Filé de tilápia grelhado", quantity: 150, unit: "g" },
      { food_name: "Batata doce cozida", quantity: 150, unit: "g" },
      { food_name: "Alface crespa crua", quantity: 50, unit: "g" },
      { food_name: "Tomate", quantity: 1, unit: "unidade" },
    ],
    instructions: [
      "Grelhe o filé de tilápia temperado a gosto.",
      "Sirva com a batata doce e uma salada simples de alface e tomate.",
    ],
    prep_time_min: 25,
    servings: 1,
  },
  {
    id: "carne-arroz-feijao",
    name: "Carne bovina com arroz e feijão",
    meal_types: ["Almoço"],
    ingredients: [
      { food_name: "Patinho bovino grelhado", quantity: 150, unit: "g" },
      { food_name: "Arroz branco cozido", quantity: 150, unit: "g" },
      { food_name: "Feijão carioca cozido", quantity: 100, unit: "g" },
      { food_name: "Couve-flor cozida", quantity: 100, unit: "g" },
    ],
    instructions: [
      "Grelhe a carne temperada a gosto.",
      "Monte o prato com arroz, feijão e couve-flor cozida.",
    ],
    prep_time_min: 30,
    servings: 1,
  },
  {
    id: "salmao-legumes",
    name: "Salmão grelhado com legumes",
    meal_types: ["Almoço", "Jantar"],
    ingredients: [
      { food_name: "Salmão grelhado", quantity: 150, unit: "g" },
      { food_name: "Abobrinha cozida", quantity: 100, unit: "g" },
      { food_name: "Cenoura crua", quantity: 1, unit: "unidade" },
      { food_name: "Azeite de oliva", quantity: 1, unit: "colher de sopa" },
    ],
    instructions: [
      "Grelhe o salmão temperado até dourar.",
      "Sirva com abobrinha e cenoura cozidas, finalizando com azeite.",
    ],
    prep_time_min: 25,
    servings: 1,
  },
  {
    id: "frango-batata-doce-vagem",
    name: "Frango com batata doce e vagem",
    meal_types: ["Almoço", "Jantar"],
    ingredients: [
      { food_name: "Frango coxa grelhada", quantity: 120, unit: "g" },
      { food_name: "Batata doce cozida", quantity: 150, unit: "g" },
      { food_name: "Vagem cozida", quantity: 80, unit: "g" },
    ],
    instructions: [
      "Grelhe a coxa de frango.",
      "Sirva acompanhada da batata doce e da vagem cozidas.",
    ],
    prep_time_min: 25,
    servings: 1,
  },
  {
    id: "feijoada-leve-arroz-integral",
    name: "Feijoada leve com arroz integral",
    meal_types: ["Almoço"],
    ingredients: [
      { food_name: "Feijão preto cozido", quantity: 150, unit: "g" },
      { food_name: "Arroz integral cozido", quantity: 150, unit: "g" },
      { food_name: "Couve-flor cozida", quantity: 100, unit: "g" },
    ],
    instructions: [
      "Aqueça o feijão preto já cozido.",
      "Sirva com arroz integral e couve-flor cozida.",
    ],
    prep_time_min: 15,
    servings: 1,
  },
  {
    id: "grao-bico-legumes-salteados",
    name: "Grão-de-bico com legumes salteados",
    meal_types: ["Almoço", "Jantar"],
    ingredients: [
      { food_name: "Grão-de-bico cozido", quantity: 100, unit: "g" },
      { food_name: "Abobrinha cozida", quantity: 100, unit: "g" },
      { food_name: "Cenoura crua", quantity: 1, unit: "unidade" },
      { food_name: "Azeite de oliva", quantity: 1, unit: "colher de sopa" },
    ],
    instructions: [
      "Refogue a cenoura e a abobrinha com um fio de azeite.",
      "Misture o grão-de-bico já cozido e sirva quente.",
    ],
    prep_time_min: 15,
    servings: 1,
  },

  // Jantar
  {
    id: "omelete-salada",
    name: "Omelete simples com salada",
    meal_types: ["Jantar"],
    ingredients: [
      { food_name: "Ovo inteiro cozido", quantity: 2, unit: "unidade" },
      { food_name: "Alface crespa crua", quantity: 50, unit: "g" },
      { food_name: "Tomate", quantity: 1, unit: "unidade" },
      { food_name: "Azeite de oliva", quantity: 1, unit: "colher de chá" },
    ],
    instructions: [
      "Corte os ovos ao meio e disponha sobre a salada de alface e tomate.",
      "Tempere com azeite.",
    ],
    prep_time_min: 10,
    servings: 1,
  },
  {
    id: "sopa-legumes-frango",
    name: "Sopa de legumes com frango desfiado",
    meal_types: ["Jantar"],
    ingredients: [
      { food_name: "Frango peito grelhado", quantity: 100, unit: "g" },
      { food_name: "Abóbora cozida", quantity: 100, unit: "g" },
      { food_name: "Cenoura crua", quantity: 1, unit: "unidade" },
      { food_name: "Chuchu cozido", quantity: 100, unit: "g" },
    ],
    instructions: [
      "Desfie o frango grelhado.",
      "Cozinhe os legumes em água até ficarem macios e amasse parcialmente para engrossar.",
      "Misture o frango desfiado e sirva quente.",
    ],
    prep_time_min: 25,
    servings: 1,
  },
  {
    id: "atum-batata-brocolis",
    name: "Atum com batata inglesa e brócolis",
    meal_types: ["Jantar", "Almoço"],
    ingredients: [
      { food_name: "Atum em água (lata)", quantity: 120, unit: "g" },
      { food_name: "Batata inglesa cozida", quantity: 150, unit: "g" },
      { food_name: "Brócolis cozido", quantity: 100, unit: "g" },
    ],
    instructions: ["Monte o prato com o atum escorrido, a batata e o brócolis cozidos."],
    prep_time_min: 10,
    servings: 1,
  },
  {
    id: "sardinha-salada-folhas",
    name: "Sardinha com salada de folhas",
    meal_types: ["Jantar"],
    ingredients: [
      { food_name: "Sardinha em lata", quantity: 100, unit: "g" },
      { food_name: "Alface crespa crua", quantity: 50, unit: "g" },
      { food_name: "Tomate", quantity: 1, unit: "unidade" },
      { food_name: "Pepino cru", quantity: 1, unit: "unidade" },
    ],
    instructions: [
      "Monte uma salada com alface, tomate e pepino fatiados.",
      "Adicione a sardinha por cima.",
    ],
    prep_time_min: 10,
    servings: 1,
  },
  {
    id: "lentilha-arroz-legumes",
    name: "Lentilha com arroz e legumes",
    meal_types: ["Jantar", "Almoço"],
    ingredients: [
      { food_name: "Lentilha cozida", quantity: 100, unit: "g" },
      { food_name: "Arroz branco cozido", quantity: 120, unit: "g" },
      { food_name: "Cenoura crua", quantity: 1, unit: "unidade" },
    ],
    instructions: [
      "Aqueça a lentilha já cozida com a cenoura picada.",
      "Sirva sobre o arroz.",
    ],
    prep_time_min: 15,
    servings: 1,
  },

  // Lanche
  {
    id: "mix-castanhas-fruta",
    name: "Mix de castanhas com fruta",
    meal_types: ["Lanche da tarde", "Lanche"],
    ingredients: [
      { food_name: "Castanha de caju torrada", quantity: 15, unit: "g" },
      { food_name: "Amêndoas torradas", quantity: 15, unit: "g" },
      { food_name: "Maçã fuji", quantity: 1, unit: "unidade" },
    ],
    instructions: ["Misture as castanhas e sirva acompanhado da maçã fatiada."],
    prep_time_min: 3,
    servings: 1,
  },
  {
    id: "iogurte-chia-mel",
    name: "Iogurte com chia e mel",
    meal_types: ["Lanche da tarde", "Lanche"],
    ingredients: [
      { food_name: "Iogurte grego integral", quantity: 170, unit: "g" },
      { food_name: "Chia (semente)", quantity: 1, unit: "colher de sopa" },
      { food_name: "Mel", quantity: 1, unit: "colher de sopa" },
    ],
    instructions: ["Misture a chia e o mel ao iogurte e deixe descansar 5 minutos antes de consumir."],
    prep_time_min: 5,
    servings: 1,
  },
  {
    id: "vitamina-mamao-linhaca",
    name: "Vitamina de mamão com linhaça",
    meal_types: ["Lanche da tarde", "Café da manhã"],
    ingredients: [
      { food_name: "Leite desnatado", quantity: 200, unit: "ml" },
      { food_name: "Mamão papaia", quantity: 100, unit: "g" },
      { food_name: "Linhaça dourada", quantity: 1, unit: "colher de sopa" },
    ],
    instructions: ["Bata todos os ingredientes no liquidificador."],
    prep_time_min: 5,
    servings: 1,
  },
  {
    id: "queijo-cottage-uva",
    name: "Queijo cottage com uva",
    meal_types: ["Lanche da tarde", "Lanche"],
    ingredients: [
      { food_name: "Queijo cottage", quantity: 100, unit: "g" },
      { food_name: "Uva italiana", quantity: 80, unit: "g" },
    ],
    instructions: ["Sirva o queijo cottage acompanhado das uvas."],
    prep_time_min: 3,
    servings: 1,
  },
  {
    id: "pasta-amendoim-banana",
    name: "Pasta de amendoim com banana",
    meal_types: ["Lanche da tarde", "Café da manhã"],
    ingredients: [
      { food_name: "Pasta de amendoim", quantity: 15, unit: "colher de sopa" },
      { food_name: "Banana prata", quantity: 1, unit: "unidade" },
      { food_name: "Pão integral", quantity: 1, unit: "fatia" },
    ],
    instructions: [
      "Passe a pasta de amendoim no pão.",
      "Corte a banana em rodelas e distribua por cima.",
    ],
    prep_time_min: 5,
    servings: 1,
  },
  {
    id: "whey-leite-morango",
    name: "Whey com leite e morango",
    meal_types: ["Lanche da tarde", "Lanche"],
    ingredients: [
      { food_name: "Whey protein (pó)", quantity: 30, unit: "g" },
      { food_name: "Leite desnatado", quantity: 200, unit: "ml" },
      { food_name: "Morango", quantity: 60, unit: "g" },
    ],
    instructions: ["Bata todos os ingredientes no liquidificador até obter uma mistura homogênea."],
    prep_time_min: 5,
    servings: 1,
  },
];

export type RecipeMacros = {
  kcal: number;
  protein_g: number;
  carb_g: number;
  fat_g: number;
};

export function computeRecipeMacros(recipe: Recipe): RecipeMacros {
  return recipe.ingredients.reduce<RecipeMacros>(
    (totals, ing) => {
      const food = TACO_FOODS.find((f) => normalizeText(f.name) === normalizeText(ing.food_name));
      if (!food) return totals;
      // TACO values are per 100g/100ml; scale by the recipe ingredient's quantity
      // when its unit matches the food's own base unit (g/ml), otherwise fall back
      // to the food's default_qty scaling (covers unidade/colher/fatia-style units).
      const baseQty = food.default_unit === "g" || food.default_unit === "ml" ? ing.quantity : ing.quantity * food.default_qty;
      const factor = baseQty / 100;
      return {
        kcal: totals.kcal + food.kcal * factor,
        protein_g: totals.protein_g + food.protein_g * factor,
        carb_g: totals.carb_g + food.carb_g * factor,
        fat_g: totals.fat_g + food.fat_g * factor,
      };
    },
    { kcal: 0, protein_g: 0, carb_g: 0, fat_g: 0 },
  );
}

// Words like "cozido"/"grelhado"/"crua" show up in almost every TACO name and
// carry no identifying signal on their own — ignoring them (plus very short
// words) avoids matches on prep-method alone.
const STOP_WORDS = new Set(["de", "da", "do", "em", "com", "cozida", "cozido", "grelhado", "grelhada", "cru", "crua"]);

function significantWords(s: string): string[] {
  return normalizeText(s)
    .split(/\s+/)
    .filter((w) => w.length > 2 && !STOP_WORDS.has(w));
}

/** True if the ingredient name and the plan item description share at least
 * one significant word — robust to TACO's word order (e.g. "Frango peito
 * grelhado" vs. a plan item written as "Frango grelhado"). */
export function ingredientMatchesItem(ingredientFoodName: string, itemDescription: string): boolean {
  const ingWords = new Set(significantWords(ingredientFoodName));
  return significantWords(itemDescription).some((w) => ingWords.has(w));
}

export function suggestRecipesForMeal(meal: Meal, limit = 3): Recipe[] {
  const itemDescriptions = meal.items.map((i) => i.item_description);
  const mealNameNorm = normalizeText(meal.name);

  const scored = RECIPES.map((recipe) => {
    const ingredientMatches = recipe.ingredients.filter((ing) =>
      itemDescriptions.some((desc) => ingredientMatchesItem(ing.food_name, desc)),
    ).length;

    const typeMatch = recipe.meal_types.some((t) => {
      const typeNorm = normalizeText(t);
      return mealNameNorm.includes(typeNorm) || typeNorm.includes(mealNameNorm);
    });

    const score = ingredientMatches + (typeMatch ? 1 : 0);
    return { recipe, score };
  });

  return scored
    .filter((s) => s.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((s) => s.recipe);
}
