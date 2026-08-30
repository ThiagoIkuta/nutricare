-- Diet plan presets (feat: presets de planos alimentares).
-- Apply by hand via the Supabase SQL Editor — this repo has no migration
-- tool wired up (see 0001_chat_attachments.sql for the same note).

CREATE TABLE IF NOT EXISTS diet_plan_presets (
  id serial PRIMARY KEY,
  nutritionist_id uuid REFERENCES profiles(id),
  title text NOT NULL,
  objective text,
  notes text,
  meals_json text NOT NULL DEFAULT '[]',
  is_builtin boolean NOT NULL DEFAULT false,
  visibility text NOT NULL DEFAULT 'private',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE diet_plan_presets DROP CONSTRAINT IF EXISTS diet_plan_presets_visibility_check;
ALTER TABLE diet_plan_presets ADD CONSTRAINT diet_plan_presets_visibility_check
  CHECK (visibility = ANY (ARRAY['private'::text, 'public'::text]));

CREATE INDEX IF NOT EXISTS idx_diet_plan_presets_nutritionist ON diet_plan_presets(nutritionist_id);

-- Tables created via the SQL Editor don't automatically inherit the grants
-- Supabase's Table Editor UI applies — without this, the backend's
-- service_role client gets "permission denied for table diet_plan_presets"
-- even though it bypasses RLS.
GRANT ALL ON TABLE diet_plan_presets TO anon, authenticated, service_role;
GRANT USAGE, SELECT ON SEQUENCE diet_plan_presets_id_seq TO anon, authenticated, service_role;

-- 5 built-in presets: nutritionist_id NULL, is_builtin = true, visible to
-- every nutritionist, read-only (enforced in PresetService, not here).
-- meals_json mirrors the MealCreate/MealItemCreate shape used by
-- POST /diet/plans, using the exact food names already in
-- frontend/src/data/taco_foods.ts.
-- Wrapped in a DO block guarded on is_builtin so re-running this file
-- after it already succeeded is a safe no-op instead of duplicating rows.

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM diet_plan_presets WHERE is_builtin) THEN
    INSERT INTO diet_plan_presets (nutritionist_id, title, objective, notes, meals_json, is_builtin, visibility)
    VALUES
(
  NULL,
  'Ganho de massa',
  'Plano hipercalórico com foco em proteína, para pacientes em fase de ganho de massa muscular.',
  NULL,
  '[
    {"name":"Café da manhã","scheduled_time":"07:00","instructions":null,"display_order":1,"items":[
      {"item_description":"Aveia em flocos","quantity":60,"unit":"g","preparation_notes":null,"display_order":1},
      {"item_description":"Banana prata","quantity":1,"unit":"unidade","preparation_notes":null,"display_order":2},
      {"item_description":"Leite integral","quantity":250,"unit":"ml","preparation_notes":null,"display_order":3},
      {"item_description":"Pasta de amendoim","quantity":1,"unit":"colher de sopa","preparation_notes":null,"display_order":4}
    ]},
    {"name":"Almoço","scheduled_time":"12:30","instructions":null,"display_order":2,"items":[
      {"item_description":"Arroz branco cozido","quantity":200,"unit":"g","preparation_notes":null,"display_order":1},
      {"item_description":"Feijão carioca cozido","quantity":100,"unit":"g","preparation_notes":null,"display_order":2},
      {"item_description":"Frango peito grelhado","quantity":200,"unit":"g","preparation_notes":null,"display_order":3},
      {"item_description":"Brócolis cozido","quantity":100,"unit":"g","preparation_notes":null,"display_order":4},
      {"item_description":"Azeite de oliva","quantity":1,"unit":"colher de sopa","preparation_notes":null,"display_order":5}
    ]},
    {"name":"Lanche da tarde","scheduled_time":"16:00","instructions":null,"display_order":3,"items":[
      {"item_description":"Pão integral","quantity":2,"unit":"fatia","preparation_notes":null,"display_order":1},
      {"item_description":"Ovo inteiro cozido","quantity":2,"unit":"unidade","preparation_notes":null,"display_order":2},
      {"item_description":"Queijo mussarela","quantity":30,"unit":"g","preparation_notes":null,"display_order":3}
    ]},
    {"name":"Jantar","scheduled_time":"19:30","instructions":null,"display_order":4,"items":[
      {"item_description":"Batata doce cozida","quantity":200,"unit":"g","preparation_notes":null,"display_order":1},
      {"item_description":"Patinho bovino grelhado","quantity":180,"unit":"g","preparation_notes":null,"display_order":2},
      {"item_description":"Alface crespa crua","quantity":50,"unit":"g","preparation_notes":null,"display_order":3},
      {"item_description":"Tomate","quantity":1,"unit":"unidade","preparation_notes":null,"display_order":4}
    ]}
  ]',
  true,
  'public'
),
(
  NULL,
  'Perda de peso',
  'Déficit calórico moderado com boa saciedade, foco em proteínas magras e fibras.',
  NULL,
  '[
    {"name":"Café da manhã","scheduled_time":"07:00","instructions":null,"display_order":1,"items":[
      {"item_description":"Iogurte natural desnatado","quantity":170,"unit":"g","preparation_notes":null,"display_order":1},
      {"item_description":"Morango","quantity":100,"unit":"g","preparation_notes":null,"display_order":2},
      {"item_description":"Aveia em flocos","quantity":30,"unit":"g","preparation_notes":null,"display_order":3}
    ]},
    {"name":"Almoço","scheduled_time":"12:30","instructions":null,"display_order":2,"items":[
      {"item_description":"Arroz integral cozido","quantity":100,"unit":"g","preparation_notes":null,"display_order":1},
      {"item_description":"Feijão preto cozido","quantity":80,"unit":"g","preparation_notes":null,"display_order":2},
      {"item_description":"Filé de tilápia grelhado","quantity":150,"unit":"g","preparation_notes":null,"display_order":3},
      {"item_description":"Abobrinha cozida","quantity":100,"unit":"g","preparation_notes":null,"display_order":4},
      {"item_description":"Alface crespa crua","quantity":50,"unit":"g","preparation_notes":null,"display_order":5}
    ]},
    {"name":"Lanche da tarde","scheduled_time":"16:00","instructions":null,"display_order":3,"items":[
      {"item_description":"Maçã fuji","quantity":1,"unit":"unidade","preparation_notes":null,"display_order":1},
      {"item_description":"Castanha de caju torrada","quantity":15,"unit":"g","preparation_notes":null,"display_order":2}
    ]},
    {"name":"Jantar","scheduled_time":"19:30","instructions":null,"display_order":4,"items":[
      {"item_description":"Abóbora cozida","quantity":100,"unit":"g","preparation_notes":null,"display_order":1},
      {"item_description":"Cenoura crua","quantity":80,"unit":"g","preparation_notes":null,"display_order":2},
      {"item_description":"Frango peito grelhado","quantity":120,"unit":"g","preparation_notes":null,"display_order":3}
    ]}
  ]',
  true,
  'public'
),
(
  NULL,
  'Perda de peso vegano',
  'Déficit calórico moderado, 100% à base de plantas.',
  NULL,
  '[
    {"name":"Café da manhã","scheduled_time":"07:00","instructions":null,"display_order":1,"items":[
      {"item_description":"Tapioca (goma)","quantity":50,"unit":"g","preparation_notes":null,"display_order":1},
      {"item_description":"Pasta de amendoim","quantity":1,"unit":"colher de sopa","preparation_notes":null,"display_order":2},
      {"item_description":"Suco de laranja natural","quantity":200,"unit":"ml","preparation_notes":null,"display_order":3}
    ]},
    {"name":"Almoço","scheduled_time":"12:30","instructions":null,"display_order":2,"items":[
      {"item_description":"Arroz integral cozido","quantity":100,"unit":"g","preparation_notes":null,"display_order":1},
      {"item_description":"Lentilha cozida","quantity":100,"unit":"g","preparation_notes":null,"display_order":2},
      {"item_description":"Grão-de-bico cozido","quantity":80,"unit":"g","preparation_notes":null,"display_order":3},
      {"item_description":"Brócolis cozido","quantity":100,"unit":"g","preparation_notes":null,"display_order":4},
      {"item_description":"Azeite de oliva","quantity":1,"unit":"colher de sopa","preparation_notes":null,"display_order":5}
    ]},
    {"name":"Lanche da tarde","scheduled_time":"16:00","instructions":null,"display_order":3,"items":[
      {"item_description":"Banana prata","quantity":1,"unit":"unidade","preparation_notes":null,"display_order":1},
      {"item_description":"Amendoim torrado","quantity":30,"unit":"g","preparation_notes":null,"display_order":2}
    ]},
    {"name":"Jantar","scheduled_time":"19:30","instructions":null,"display_order":4,"items":[
      {"item_description":"Proteína de soja texturizada cozida","quantity":100,"unit":"g","preparation_notes":null,"display_order":1},
      {"item_description":"Batata doce cozida","quantity":150,"unit":"g","preparation_notes":null,"display_order":2},
      {"item_description":"Couve-flor cozida","quantity":100,"unit":"g","preparation_notes":null,"display_order":3}
    ]}
  ]',
  true,
  'public'
),
(
  NULL,
  'Low-carb / manutenção',
  'Carboidrato controlado, indicado para manutenção de peso.',
  NULL,
  '[
    {"name":"Café da manhã","scheduled_time":"07:00","instructions":null,"display_order":1,"items":[
      {"item_description":"Ovo inteiro cozido","quantity":2,"unit":"unidade","preparation_notes":null,"display_order":1},
      {"item_description":"Abacate","quantity":100,"unit":"g","preparation_notes":null,"display_order":2},
      {"item_description":"Café preto (sem açúcar)","quantity":150,"unit":"ml","preparation_notes":null,"display_order":3}
    ]},
    {"name":"Almoço","scheduled_time":"12:30","instructions":null,"display_order":2,"items":[
      {"item_description":"Alcatra grelhada","quantity":180,"unit":"g","preparation_notes":null,"display_order":1},
      {"item_description":"Brócolis cozido","quantity":100,"unit":"g","preparation_notes":null,"display_order":2},
      {"item_description":"Couve-flor cozida","quantity":100,"unit":"g","preparation_notes":null,"display_order":3},
      {"item_description":"Azeite de oliva","quantity":1,"unit":"colher de sopa","preparation_notes":null,"display_order":4}
    ]},
    {"name":"Lanche da tarde","scheduled_time":"16:00","instructions":null,"display_order":3,"items":[
      {"item_description":"Iogurte grego integral","quantity":170,"unit":"g","preparation_notes":null,"display_order":1},
      {"item_description":"Amêndoas torradas","quantity":30,"unit":"g","preparation_notes":null,"display_order":2}
    ]},
    {"name":"Jantar","scheduled_time":"19:30","instructions":null,"display_order":4,"items":[
      {"item_description":"Salmão grelhado","quantity":150,"unit":"g","preparation_notes":null,"display_order":1},
      {"item_description":"Espinafre cozido","quantity":100,"unit":"g","preparation_notes":null,"display_order":2},
      {"item_description":"Abobrinha cozida","quantity":100,"unit":"g","preparation_notes":null,"display_order":3}
    ]}
  ]',
  true,
  'public'
),
(
  NULL,
  'Definição muscular',
  'Alta proteína e carboidrato controlado, foco em definição.',
  NULL,
  '[
    {"name":"Café da manhã","scheduled_time":"07:00","instructions":null,"display_order":1,"items":[
      {"item_description":"Ovo clara cozida","quantity":4,"unit":"unidade","preparation_notes":null,"display_order":1},
      {"item_description":"Aveia em flocos","quantity":40,"unit":"g","preparation_notes":null,"display_order":2},
      {"item_description":"Morango","quantity":100,"unit":"g","preparation_notes":null,"display_order":3}
    ]},
    {"name":"Almoço","scheduled_time":"12:30","instructions":null,"display_order":2,"items":[
      {"item_description":"Arroz branco cozido","quantity":150,"unit":"g","preparation_notes":null,"display_order":1},
      {"item_description":"Frango peito grelhado","quantity":200,"unit":"g","preparation_notes":null,"display_order":2},
      {"item_description":"Vagem cozida","quantity":80,"unit":"g","preparation_notes":null,"display_order":3},
      {"item_description":"Tomate","quantity":1,"unit":"unidade","preparation_notes":null,"display_order":4},
      {"item_description":"Alface crespa crua","quantity":50,"unit":"g","preparation_notes":null,"display_order":5}
    ]},
    {"name":"Lanche da tarde","scheduled_time":"16:00","instructions":null,"display_order":3,"items":[
      {"item_description":"Whey protein (pó)","quantity":30,"unit":"g","preparation_notes":null,"display_order":1},
      {"item_description":"Banana prata","quantity":1,"unit":"unidade","preparation_notes":null,"display_order":2}
    ]},
    {"name":"Jantar","scheduled_time":"19:30","instructions":null,"display_order":4,"items":[
      {"item_description":"Filé de tilápia grelhado","quantity":150,"unit":"g","preparation_notes":null,"display_order":1},
      {"item_description":"Batata doce cozida","quantity":100,"unit":"g","preparation_notes":null,"display_order":2},
      {"item_description":"Brócolis cozido","quantity":100,"unit":"g","preparation_notes":null,"display_order":3}
    ]}
  ]',
  true,
  'public'
);
  END IF;
END $$;
