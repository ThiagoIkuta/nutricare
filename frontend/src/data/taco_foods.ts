export type TacoFood = {
  name: string;
  kcal: number;
  protein_g: number;
  carb_g: number;
  fat_g: number;
  fiber_g: number;
  default_unit: string;
  default_qty: number;
  category: string;
};

// Subset da TACO (Tabela Brasileira de Composição de Alimentos) — valores por 100g
export const TACO_FOODS: TacoFood[] = [
  // Cereais e grãos
  { name: "Arroz branco cozido", kcal: 128, protein_g: 2.5, carb_g: 28.1, fat_g: 0.2, fiber_g: 1.6, default_unit: "g", default_qty: 150, category: "Cereais" },
  { name: "Arroz integral cozido", kcal: 124, protein_g: 2.6, carb_g: 25.8, fat_g: 1.0, fiber_g: 2.7, default_unit: "g", default_qty: 150, category: "Cereais" },
  { name: "Macarrão cozido", kcal: 107, protein_g: 3.5, carb_g: 22.0, fat_g: 0.5, fiber_g: 1.5, default_unit: "g", default_qty: 120, category: "Cereais" },
  { name: "Pão francês", kcal: 300, protein_g: 8.0, carb_g: 58.6, fat_g: 3.1, fiber_g: 2.3, default_unit: "unidade", default_qty: 50, category: "Cereais" },
  { name: "Pão integral", kcal: 253, protein_g: 8.0, carb_g: 47.6, fat_g: 3.6, fiber_g: 5.2, default_unit: "fatia", default_qty: 30, category: "Cereais" },
  { name: "Aveia em flocos", kcal: 394, protein_g: 13.9, carb_g: 66.6, fat_g: 8.5, fiber_g: 9.1, default_unit: "g", default_qty: 50, category: "Cereais" },
  { name: "Granola", kcal: 421, protein_g: 9.6, carb_g: 65.4, fat_g: 13.0, fiber_g: 4.7, default_unit: "g", default_qty: 40, category: "Cereais" },
  { name: "Tapioca (goma)", kcal: 341, protein_g: 0.3, carb_g: 84.8, fat_g: 0.1, fiber_g: 0.0, default_unit: "g", default_qty: 50, category: "Cereais" },
  { name: "Cuscuz de milho cozido", kcal: 74, protein_g: 1.7, carb_g: 15.5, fat_g: 0.5, fiber_g: 1.1, default_unit: "g", default_qty: 100, category: "Cereais" },
  { name: "Farinha de aveia", kcal: 394, protein_g: 13.9, carb_g: 66.6, fat_g: 8.5, fiber_g: 9.1, default_unit: "g", default_qty: 30, category: "Cereais" },

  // Leguminosas
  { name: "Feijão carioca cozido", kcal: 77, protein_g: 4.8, carb_g: 13.6, fat_g: 0.5, fiber_g: 8.5, default_unit: "g", default_qty: 100, category: "Leguminosas" },
  { name: "Feijão preto cozido", kcal: 77, protein_g: 4.5, carb_g: 14.0, fat_g: 0.5, fiber_g: 8.4, default_unit: "g", default_qty: 100, category: "Leguminosas" },
  { name: "Lentilha cozida", kcal: 93, protein_g: 6.3, carb_g: 16.5, fat_g: 0.5, fiber_g: 3.7, default_unit: "g", default_qty: 80, category: "Leguminosas" },
  { name: "Grão-de-bico cozido", kcal: 164, protein_g: 8.9, carb_g: 27.4, fat_g: 2.6, fiber_g: 7.6, default_unit: "g", default_qty: 100, category: "Leguminosas" },
  { name: "Ervilha cozida", kcal: 70, protein_g: 5.3, carb_g: 10.1, fat_g: 0.4, fiber_g: 5.4, default_unit: "g", default_qty: 80, category: "Leguminosas" },
  { name: "Soja cozida", kcal: 140, protein_g: 14.6, carb_g: 11.5, fat_g: 5.7, fiber_g: 9.6, default_unit: "g", default_qty: 80, category: "Leguminosas" },

  // Carnes e ovos
  { name: "Frango peito grelhado", kcal: 163, protein_g: 31.5, carb_g: 0.0, fat_g: 3.7, fiber_g: 0.0, default_unit: "g", default_qty: 150, category: "Carnes" },
  { name: "Frango coxa grelhada", kcal: 167, protein_g: 25.0, carb_g: 0.0, fat_g: 7.1, fiber_g: 0.0, default_unit: "g", default_qty: 120, category: "Carnes" },
  { name: "Patinho bovino grelhado", kcal: 219, protein_g: 30.7, carb_g: 0.0, fat_g: 10.5, fiber_g: 0.0, default_unit: "g", default_qty: 150, category: "Carnes" },
  { name: "Alcatra grelhada", kcal: 175, protein_g: 29.0, carb_g: 0.0, fat_g: 6.2, fiber_g: 0.0, default_unit: "g", default_qty: 150, category: "Carnes" },
  { name: "Filé de tilápia grelhado", kcal: 96, protein_g: 20.1, carb_g: 0.0, fat_g: 1.7, fiber_g: 0.0, default_unit: "g", default_qty: 150, category: "Carnes" },
  { name: "Salmão grelhado", kcal: 183, protein_g: 24.5, carb_g: 0.0, fat_g: 9.3, fiber_g: 0.0, default_unit: "g", default_qty: 150, category: "Carnes" },
  { name: "Atum em água (lata)", kcal: 111, protein_g: 25.2, carb_g: 0.0, fat_g: 0.8, fiber_g: 0.0, default_unit: "g", default_qty: 120, category: "Carnes" },
  { name: "Sardinha em lata", kcal: 171, protein_g: 21.1, carb_g: 0.0, fat_g: 9.4, fiber_g: 0.0, default_unit: "g", default_qty: 100, category: "Carnes" },
  { name: "Ovo inteiro cozido", kcal: 146, protein_g: 13.3, carb_g: 0.6, fat_g: 9.5, fiber_g: 0.0, default_unit: "unidade", default_qty: 60, category: "Carnes" },
  { name: "Ovo clara cozida", kcal: 52, protein_g: 11.1, carb_g: 0.7, fat_g: 0.2, fiber_g: 0.0, default_unit: "unidade", default_qty: 35, category: "Carnes" },
  { name: "Carne de porco lombo grelhado", kcal: 197, protein_g: 27.4, carb_g: 0.0, fat_g: 9.7, fiber_g: 0.0, default_unit: "g", default_qty: 120, category: "Carnes" },

  // Laticínios
  { name: "Leite integral", kcal: 61, protein_g: 3.2, carb_g: 4.8, fat_g: 3.3, fiber_g: 0.0, default_unit: "ml", default_qty: 200, category: "Laticínios" },
  { name: "Leite desnatado", kcal: 35, protein_g: 3.4, carb_g: 5.0, fat_g: 0.2, fiber_g: 0.0, default_unit: "ml", default_qty: 200, category: "Laticínios" },
  { name: "Iogurte grego integral", kcal: 97, protein_g: 9.0, carb_g: 3.6, fat_g: 5.0, fiber_g: 0.0, default_unit: "g", default_qty: 170, category: "Laticínios" },
  { name: "Iogurte natural desnatado", kcal: 37, protein_g: 3.8, carb_g: 4.9, fat_g: 0.2, fiber_g: 0.0, default_unit: "g", default_qty: 170, category: "Laticínios" },
  { name: "Queijo mussarela", kcal: 300, protein_g: 21.6, carb_g: 2.0, fat_g: 23.1, fiber_g: 0.0, default_unit: "g", default_qty: 30, category: "Laticínios" },
  { name: "Queijo cottage", kcal: 98, protein_g: 12.4, carb_g: 3.4, fat_g: 3.9, fiber_g: 0.0, default_unit: "g", default_qty: 100, category: "Laticínios" },
  { name: "Requeijão cremoso", kcal: 244, protein_g: 8.4, carb_g: 4.2, fat_g: 21.7, fiber_g: 0.0, default_unit: "colher de sopa", default_qty: 20, category: "Laticínios" },
  { name: "Whey protein (pó)", kcal: 373, protein_g: 75.0, carb_g: 11.0, fat_g: 5.0, fiber_g: 0.0, default_unit: "g", default_qty: 30, category: "Laticínios" },

  // Frutas
  { name: "Banana prata", kcal: 98, protein_g: 1.3, carb_g: 26.0, fat_g: 0.1, fiber_g: 2.0, default_unit: "unidade", default_qty: 90, category: "Frutas" },
  { name: "Maçã fuji", kcal: 56, protein_g: 0.3, carb_g: 15.2, fat_g: 0.1, fiber_g: 1.3, default_unit: "unidade", default_qty: 130, category: "Frutas" },
  { name: "Laranja pera", kcal: 37, protein_g: 1.0, carb_g: 8.9, fat_g: 0.1, fiber_g: 0.8, default_unit: "unidade", default_qty: 180, category: "Frutas" },
  { name: "Mamão papaia", kcal: 45, protein_g: 0.5, carb_g: 11.4, fat_g: 0.1, fiber_g: 1.8, default_unit: "g", default_qty: 150, category: "Frutas" },
  { name: "Melancia", kcal: 33, protein_g: 0.6, carb_g: 7.7, fat_g: 0.2, fiber_g: 0.4, default_unit: "g", default_qty: 200, category: "Frutas" },
  { name: "Morango", kcal: 30, protein_g: 0.8, carb_g: 7.1, fat_g: 0.3, fiber_g: 1.6, default_unit: "g", default_qty: 100, category: "Frutas" },
  { name: "Uva italiana", kcal: 69, protein_g: 0.7, carb_g: 17.5, fat_g: 0.3, fiber_g: 0.9, default_unit: "g", default_qty: 100, category: "Frutas" },
  { name: "Manga tommy", kcal: 64, protein_g: 0.8, carb_g: 16.4, fat_g: 0.3, fiber_g: 1.3, default_unit: "unidade", default_qty: 200, category: "Frutas" },
  { name: "Abacate", kcal: 96, protein_g: 1.2, carb_g: 6.0, fat_g: 8.4, fiber_g: 6.3, default_unit: "g", default_qty: 100, category: "Frutas" },
  { name: "Kiwi", kcal: 61, protein_g: 1.0, carb_g: 14.7, fat_g: 0.5, fiber_g: 2.7, default_unit: "unidade", default_qty: 70, category: "Frutas" },

  // Verduras e legumes
  { name: "Alface crespa crua", kcal: 11, protein_g: 1.3, carb_g: 1.7, fat_g: 0.2, fiber_g: 1.8, default_unit: "g", default_qty: 50, category: "Verduras" },
  { name: "Tomate", kcal: 15, protein_g: 1.1, carb_g: 3.1, fat_g: 0.2, fiber_g: 1.2, default_unit: "unidade", default_qty: 100, category: "Verduras" },
  { name: "Brócolis cozido", kcal: 34, protein_g: 4.3, carb_g: 4.0, fat_g: 0.5, fiber_g: 3.4, default_unit: "g", default_qty: 100, category: "Verduras" },
  { name: "Cenoura crua", kcal: 34, protein_g: 1.3, carb_g: 7.7, fat_g: 0.2, fiber_g: 3.2, default_unit: "unidade", default_qty: 80, category: "Verduras" },
  { name: "Abobrinha cozida", kcal: 16, protein_g: 0.7, carb_g: 2.9, fat_g: 0.3, fiber_g: 1.0, default_unit: "g", default_qty: 100, category: "Verduras" },
  { name: "Espinafre cozido", kcal: 23, protein_g: 2.9, carb_g: 2.4, fat_g: 0.5, fiber_g: 2.2, default_unit: "g", default_qty: 80, category: "Verduras" },
  { name: "Batata inglesa cozida", kcal: 52, protein_g: 1.4, carb_g: 12.0, fat_g: 0.1, fiber_g: 1.8, default_unit: "g", default_qty: 150, category: "Verduras" },
  { name: "Batata doce cozida", kcal: 77, protein_g: 1.1, carb_g: 18.4, fat_g: 0.1, fiber_g: 2.2, default_unit: "g", default_qty: 150, category: "Verduras" },
  { name: "Mandioca cozida", kcal: 125, protein_g: 0.6, carb_g: 30.1, fat_g: 0.3, fiber_g: 1.9, default_unit: "g", default_qty: 100, category: "Verduras" },
  { name: "Pepino cru", kcal: 10, protein_g: 0.7, carb_g: 1.9, fat_g: 0.2, fiber_g: 0.8, default_unit: "unidade", default_qty: 100, category: "Verduras" },
  { name: "Chuchu cozido", kcal: 18, protein_g: 0.7, carb_g: 3.9, fat_g: 0.1, fiber_g: 1.3, default_unit: "g", default_qty: 100, category: "Verduras" },
  { name: "Couve-flor cozida", kcal: 23, protein_g: 1.9, carb_g: 2.9, fat_g: 0.3, fiber_g: 2.4, default_unit: "g", default_qty: 100, category: "Verduras" },
  { name: "Vagem cozida", kcal: 28, protein_g: 1.7, carb_g: 5.7, fat_g: 0.2, fiber_g: 2.9, default_unit: "g", default_qty: 80, category: "Verduras" },
  { name: "Abóbora cozida", kcal: 24, protein_g: 0.7, carb_g: 5.4, fat_g: 0.3, fiber_g: 1.1, default_unit: "g", default_qty: 100, category: "Verduras" },

  // Gorduras e óleos
  { name: "Azeite de oliva", kcal: 884, protein_g: 0.0, carb_g: 0.0, fat_g: 100.0, fiber_g: 0.0, default_unit: "colher de sopa", default_qty: 13, category: "Gorduras" },
  { name: "Manteiga", kcal: 726, protein_g: 0.5, carb_g: 0.0, fat_g: 83.2, fiber_g: 0.0, default_unit: "colher de chá", default_qty: 5, category: "Gorduras" },
  { name: "Pasta de amendoim", kcal: 600, protein_g: 25.1, carb_g: 21.5, fat_g: 49.5, fiber_g: 5.9, default_unit: "colher de sopa", default_qty: 30, category: "Gorduras" },
  { name: "Amendoim torrado", kcal: 570, protein_g: 23.7, carb_g: 21.6, fat_g: 43.9, fiber_g: 6.0, default_unit: "g", default_qty: 30, category: "Gorduras" },

  // Bebidas
  { name: "Café preto (sem açúcar)", kcal: 2, protein_g: 0.3, carb_g: 0.0, fat_g: 0.0, fiber_g: 0.0, default_unit: "ml", default_qty: 150, category: "Bebidas" },
  { name: "Chá verde (infusão)", kcal: 1, protein_g: 0.0, carb_g: 0.2, fat_g: 0.0, fiber_g: 0.0, default_unit: "ml", default_qty: 200, category: "Bebidas" },
  { name: "Suco de laranja natural", kcal: 45, protein_g: 0.7, carb_g: 10.4, fat_g: 0.2, fiber_g: 0.3, default_unit: "ml", default_qty: 200, category: "Bebidas" },
  { name: "Água de coco", kcal: 22, protein_g: 0.7, carb_g: 4.7, fat_g: 0.1, fiber_g: 1.0, default_unit: "ml", default_qty: 300, category: "Bebidas" },

  // Outros
  { name: "Mel", kcal: 309, protein_g: 0.3, carb_g: 84.0, fat_g: 0.0, fiber_g: 0.2, default_unit: "colher de sopa", default_qty: 15, category: "Outros" },
  { name: "Castanha-do-pará", kcal: 643, protein_g: 14.3, carb_g: 15.1, fat_g: 63.5, fiber_g: 7.9, default_unit: "unidade", default_qty: 15, category: "Outros" },
  { name: "Castanha de caju torrada", kcal: 570, protein_g: 18.5, carb_g: 29.1, fat_g: 46.3, fiber_g: 3.7, default_unit: "g", default_qty: 30, category: "Outros" },
  { name: "Nozes", kcal: 620, protein_g: 15.2, carb_g: 14.7, fat_g: 59.4, fiber_g: 5.2, default_unit: "g", default_qty: 30, category: "Outros" },
  { name: "Amêndoas torradas", kcal: 613, protein_g: 21.3, carb_g: 18.6, fat_g: 52.0, fiber_g: 10.0, default_unit: "g", default_qty: 30, category: "Outros" },
  { name: "Chia (semente)", kcal: 489, protein_g: 16.5, carb_g: 44.0, fat_g: 30.7, fiber_g: 34.4, default_unit: "colher de sopa", default_qty: 15, category: "Outros" },
  { name: "Linhaça dourada", kcal: 495, protein_g: 25.8, carb_g: 28.9, fat_g: 42.2, fiber_g: 27.3, default_unit: "colher de sopa", default_qty: 12, category: "Outros" },
  { name: "Proteína de soja texturizada cozida", kcal: 323, protein_g: 52.6, carb_g: 32.9, fat_g: 1.0, fiber_g: 16.2, default_unit: "g", default_qty: 80, category: "Outros" },
];

export function normalizeText(s: string): string {
  return s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
}

export function searchTacoFoods(query: string, limit = 8): TacoFood[] {
  if (!query || query.length < 2) return [];
  const q = normalizeText(query);
  return TACO_FOODS.filter((f) => {
    const name = normalizeText(f.name);
    return name.includes(q);
  }).slice(0, limit);
}
