-- Livro de receitas (feat: livro de receitas com compartilhamento no chat).
-- Apply by hand via the Supabase SQL Editor — this repo has no migration
-- tool wired up (see 0001_chat_attachments.sql for the same note).
--
-- Antes disso, as receitas eram um array fixo em frontend/src/data/recipes.ts.
-- Agora vivem no banco: receitas de sistema (is_builtin, owner_id NULL,
-- somente leitura) + receitas criadas por pacientes e nutricionistas, cada
-- uma "private" (só o dono vê) ou "public" (qualquer usuário logado vê).

CREATE TABLE IF NOT EXISTS recipes (
  id serial PRIMARY KEY,
  owner_id uuid REFERENCES profiles(id),
  title text NOT NULL,
  description text,
  meal_types jsonb NOT NULL DEFAULT '[]',
  ingredients jsonb NOT NULL DEFAULT '[]',   -- [{food_name, quantity, unit}]
  instructions jsonb NOT NULL DEFAULT '[]',  -- ["passo 1", "passo 2", ...]
  prep_time_min integer NOT NULL DEFAULT 0,
  servings integer NOT NULL DEFAULT 1,
  visibility text NOT NULL DEFAULT 'private',
  is_builtin boolean NOT NULL DEFAULT false,
  -- Preenchido quando a receita é uma cópia aceita pelo chat ("Aceitar e
  -- salvar"); usado para não criar a mesma cópia duas vezes.
  source_message_id bigint,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE recipes DROP CONSTRAINT IF EXISTS recipes_visibility_check;
ALTER TABLE recipes ADD CONSTRAINT recipes_visibility_check
  CHECK (visibility = ANY (ARRAY['private'::text, 'public'::text]));

CREATE INDEX IF NOT EXISTS idx_recipes_owner ON recipes(owner_id);
CREATE INDEX IF NOT EXISTS idx_recipes_source_message ON recipes(owner_id, source_message_id);

-- Receitas públicas de outros usuários que alguém "salvou" no próprio livro.
CREATE TABLE IF NOT EXISTS recipe_saves (
  user_id uuid NOT NULL REFERENCES profiles(id),
  recipe_id integer NOT NULL REFERENCES recipes(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, recipe_id)
);

-- Receita compartilhada no chat: recipe_id aponta para a original (vira NULL
-- se ela for apagada) e recipe_snapshot guarda uma cópia do conteúdo no
-- momento do envio, para a box do chat continuar funcionando mesmo se a
-- original for apagada ou ficar privada.
ALTER TABLE messages
  ADD COLUMN IF NOT EXISTS recipe_id integer REFERENCES recipes(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS recipe_snapshot jsonb;

ALTER TABLE messages DROP CONSTRAINT IF EXISTS messages_message_type_check;
ALTER TABLE messages ADD CONSTRAINT messages_message_type_check
  CHECK (message_type = ANY (ARRAY['text'::text, 'system'::text, 'image'::text, 'recipe'::text]));

-- Same grant note as 0002_diet_plan_presets.sql: tables created via the SQL
-- Editor don't inherit the Table Editor's grants.
GRANT ALL ON TABLE recipes TO anon, authenticated, service_role;
GRANT USAGE, SELECT ON SEQUENCE recipes_id_seq TO anon, authenticated, service_role;
GRANT ALL ON TABLE recipe_saves TO anon, authenticated, service_role;

-- RLS ligado e sem policies: bloqueia acesso direto com as chaves anon /
-- authenticated (a anon fica exposta no frontend), o que exporia receitas
-- privadas de qualquer usuário. O backend usa a service_role, que ignora RLS,
-- então nada muda para a API — todas as regras de permissão continuam em
-- app/services/recipe_service.py.
ALTER TABLE recipes ENABLE ROW LEVEL SECURITY;
ALTER TABLE recipe_saves ENABLE ROW LEVEL SECURITY;

-- 24 receitas de sistema, migradas de frontend/src/data/recipes.ts. Os nomes
-- dos ingredientes batem com taco_foods.ts (usados no cálculo de macros).
-- Guardado por is_builtin: rodar de novo é um no-op.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM recipes WHERE is_builtin) THEN
    INSERT INTO recipes (owner_id, title, meal_types, ingredients, instructions, prep_time_min, servings, visibility, is_builtin)
    VALUES
-- Café da manhã
(NULL, 'Mingau de aveia com banana e mel', '["Café da manhã"]',
 '[{"food_name":"Aveia em flocos","quantity":40,"unit":"g"},{"food_name":"Leite integral","quantity":200,"unit":"ml"},{"food_name":"Banana prata","quantity":1,"unit":"unidade"},{"food_name":"Mel","quantity":1,"unit":"colher de sopa"}]',
 '["Aqueça o leite em fogo baixo e adicione a aveia, mexendo até engrossar.","Corte a banana em rodelas e adicione por cima.","Finalize com o mel."]',
 10, 1, 'public', true),
(NULL, 'Tapioca com queijo', '["Café da manhã","Lanche da tarde"]',
 '[{"food_name":"Tapioca (goma)","quantity":50,"unit":"g"},{"food_name":"Queijo mussarela","quantity":30,"unit":"g"}]',
 '["Espalhe a goma de tapioca numa frigideira antiaderente quente até firmar.","Vire, adicione o queijo, dobre ao meio e deixe derreter."]',
 8, 1, 'public', true),
(NULL, 'Pão integral com ovo e abacate', '["Café da manhã"]',
 '[{"food_name":"Pão integral","quantity":2,"unit":"fatia"},{"food_name":"Ovo inteiro cozido","quantity":1,"unit":"unidade"},{"food_name":"Abacate","quantity":50,"unit":"g"}]',
 '["Amasse o abacate e espalhe sobre as fatias de pão.","Corte o ovo cozido em rodelas e distribua por cima."]',
 10, 1, 'public', true),
(NULL, 'Iogurte com granola e morango', '["Café da manhã","Lanche da tarde"]',
 '[{"food_name":"Iogurte natural desnatado","quantity":170,"unit":"g"},{"food_name":"Granola","quantity":30,"unit":"g"},{"food_name":"Morango","quantity":60,"unit":"g"}]',
 '["Corte os morangos ao meio.","Monte em camadas: iogurte, granola e morangos."]',
 5, 1, 'public', true),
(NULL, 'Vitamina de banana com aveia', '["Café da manhã","Lanche da tarde"]',
 '[{"food_name":"Leite desnatado","quantity":200,"unit":"ml"},{"food_name":"Banana prata","quantity":1,"unit":"unidade"},{"food_name":"Aveia em flocos","quantity":20,"unit":"g"},{"food_name":"Mel","quantity":1,"unit":"colher de sopa"}]',
 '["Bata todos os ingredientes no liquidificador até ficar homogêneo."]',
 5, 1, 'public', true),
(NULL, 'Panqueca de aveia com whey', '["Café da manhã"]',
 '[{"food_name":"Aveia em flocos","quantity":30,"unit":"g"},{"food_name":"Whey protein (pó)","quantity":30,"unit":"g"},{"food_name":"Ovo inteiro cozido","quantity":1,"unit":"unidade"},{"food_name":"Banana prata","quantity":1,"unit":"unidade"}]',
 '["Amasse a banana e misture com o ovo, a aveia e o whey até formar uma massa.","Frite pequenas porções numa frigideira antiaderente até dourar dos dois lados."]',
 15, 1, 'public', true),
-- Almoço
(NULL, 'Frango grelhado com arroz integral e brócolis', '["Almoço","Jantar"]',
 '[{"food_name":"Frango peito grelhado","quantity":150,"unit":"g"},{"food_name":"Arroz integral cozido","quantity":150,"unit":"g"},{"food_name":"Brócolis cozido","quantity":100,"unit":"g"},{"food_name":"Azeite de oliva","quantity":1,"unit":"colher de sopa"}]',
 '["Tempere e grelhe o peito de frango.","Sirva com o arroz integral e o brócolis, finalizando com um fio de azeite."]',
 25, 1, 'public', true),
(NULL, 'Filé de tilápia com batata doce e salada', '["Almoço","Jantar"]',
 '[{"food_name":"Filé de tilápia grelhado","quantity":150,"unit":"g"},{"food_name":"Batata doce cozida","quantity":150,"unit":"g"},{"food_name":"Alface crespa crua","quantity":50,"unit":"g"},{"food_name":"Tomate","quantity":1,"unit":"unidade"}]',
 '["Grelhe o filé de tilápia temperado a gosto.","Sirva com a batata doce e uma salada simples de alface e tomate."]',
 25, 1, 'public', true),
(NULL, 'Carne bovina com arroz e feijão', '["Almoço"]',
 '[{"food_name":"Patinho bovino grelhado","quantity":150,"unit":"g"},{"food_name":"Arroz branco cozido","quantity":150,"unit":"g"},{"food_name":"Feijão carioca cozido","quantity":100,"unit":"g"},{"food_name":"Couve-flor cozida","quantity":100,"unit":"g"}]',
 '["Grelhe a carne temperada a gosto.","Monte o prato com arroz, feijão e couve-flor cozida."]',
 30, 1, 'public', true),
(NULL, 'Salmão grelhado com legumes', '["Almoço","Jantar"]',
 '[{"food_name":"Salmão grelhado","quantity":150,"unit":"g"},{"food_name":"Abobrinha cozida","quantity":100,"unit":"g"},{"food_name":"Cenoura crua","quantity":1,"unit":"unidade"},{"food_name":"Azeite de oliva","quantity":1,"unit":"colher de sopa"}]',
 '["Grelhe o salmão temperado até dourar.","Sirva com abobrinha e cenoura cozidas, finalizando com azeite."]',
 25, 1, 'public', true),
(NULL, 'Frango com batata doce e vagem', '["Almoço","Jantar"]',
 '[{"food_name":"Frango coxa grelhada","quantity":120,"unit":"g"},{"food_name":"Batata doce cozida","quantity":150,"unit":"g"},{"food_name":"Vagem cozida","quantity":80,"unit":"g"}]',
 '["Grelhe a coxa de frango.","Sirva acompanhada da batata doce e da vagem cozidas."]',
 25, 1, 'public', true),
(NULL, 'Feijoada leve com arroz integral', '["Almoço"]',
 '[{"food_name":"Feijão preto cozido","quantity":150,"unit":"g"},{"food_name":"Arroz integral cozido","quantity":150,"unit":"g"},{"food_name":"Couve-flor cozida","quantity":100,"unit":"g"}]',
 '["Aqueça o feijão preto já cozido.","Sirva com arroz integral e couve-flor cozida."]',
 15, 1, 'public', true),
(NULL, 'Grão-de-bico com legumes salteados', '["Almoço","Jantar"]',
 '[{"food_name":"Grão-de-bico cozido","quantity":100,"unit":"g"},{"food_name":"Abobrinha cozida","quantity":100,"unit":"g"},{"food_name":"Cenoura crua","quantity":1,"unit":"unidade"},{"food_name":"Azeite de oliva","quantity":1,"unit":"colher de sopa"}]',
 '["Refogue a cenoura e a abobrinha com um fio de azeite.","Misture o grão-de-bico já cozido e sirva quente."]',
 15, 1, 'public', true),
-- Jantar
(NULL, 'Omelete simples com salada', '["Jantar"]',
 '[{"food_name":"Ovo inteiro cozido","quantity":2,"unit":"unidade"},{"food_name":"Alface crespa crua","quantity":50,"unit":"g"},{"food_name":"Tomate","quantity":1,"unit":"unidade"},{"food_name":"Azeite de oliva","quantity":1,"unit":"colher de chá"}]',
 '["Corte os ovos ao meio e disponha sobre a salada de alface e tomate.","Tempere com azeite."]',
 10, 1, 'public', true),
(NULL, 'Sopa de legumes com frango desfiado', '["Jantar"]',
 '[{"food_name":"Frango peito grelhado","quantity":100,"unit":"g"},{"food_name":"Abóbora cozida","quantity":100,"unit":"g"},{"food_name":"Cenoura crua","quantity":1,"unit":"unidade"},{"food_name":"Chuchu cozido","quantity":100,"unit":"g"}]',
 '["Desfie o frango grelhado.","Cozinhe os legumes em água até ficarem macios e amasse parcialmente para engrossar.","Misture o frango desfiado e sirva quente."]',
 25, 1, 'public', true),
(NULL, 'Atum com batata inglesa e brócolis', '["Jantar","Almoço"]',
 '[{"food_name":"Atum em água (lata)","quantity":120,"unit":"g"},{"food_name":"Batata inglesa cozida","quantity":150,"unit":"g"},{"food_name":"Brócolis cozido","quantity":100,"unit":"g"}]',
 '["Monte o prato com o atum escorrido, a batata e o brócolis cozidos."]',
 10, 1, 'public', true),
(NULL, 'Sardinha com salada de folhas', '["Jantar"]',
 '[{"food_name":"Sardinha em lata","quantity":100,"unit":"g"},{"food_name":"Alface crespa crua","quantity":50,"unit":"g"},{"food_name":"Tomate","quantity":1,"unit":"unidade"},{"food_name":"Pepino cru","quantity":1,"unit":"unidade"}]',
 '["Monte uma salada com alface, tomate e pepino fatiados.","Adicione a sardinha por cima."]',
 10, 1, 'public', true),
(NULL, 'Lentilha com arroz e legumes', '["Jantar","Almoço"]',
 '[{"food_name":"Lentilha cozida","quantity":100,"unit":"g"},{"food_name":"Arroz branco cozido","quantity":120,"unit":"g"},{"food_name":"Cenoura crua","quantity":1,"unit":"unidade"}]',
 '["Aqueça a lentilha já cozida com a cenoura picada.","Sirva sobre o arroz."]',
 15, 1, 'public', true),
-- Lanche
(NULL, 'Mix de castanhas com fruta', '["Lanche da tarde","Lanche"]',
 '[{"food_name":"Castanha de caju torrada","quantity":15,"unit":"g"},{"food_name":"Amêndoas torradas","quantity":15,"unit":"g"},{"food_name":"Maçã fuji","quantity":1,"unit":"unidade"}]',
 '["Misture as castanhas e sirva acompanhado da maçã fatiada."]',
 3, 1, 'public', true),
(NULL, 'Iogurte com chia e mel', '["Lanche da tarde","Lanche"]',
 '[{"food_name":"Iogurte grego integral","quantity":170,"unit":"g"},{"food_name":"Chia (semente)","quantity":1,"unit":"colher de sopa"},{"food_name":"Mel","quantity":1,"unit":"colher de sopa"}]',
 '["Misture a chia e o mel ao iogurte e deixe descansar 5 minutos antes de consumir."]',
 5, 1, 'public', true),
(NULL, 'Vitamina de mamão com linhaça', '["Lanche da tarde","Café da manhã"]',
 '[{"food_name":"Leite desnatado","quantity":200,"unit":"ml"},{"food_name":"Mamão papaia","quantity":100,"unit":"g"},{"food_name":"Linhaça dourada","quantity":1,"unit":"colher de sopa"}]',
 '["Bata todos os ingredientes no liquidificador."]',
 5, 1, 'public', true),
(NULL, 'Queijo cottage com uva', '["Lanche da tarde","Lanche"]',
 '[{"food_name":"Queijo cottage","quantity":100,"unit":"g"},{"food_name":"Uva italiana","quantity":80,"unit":"g"}]',
 '["Sirva o queijo cottage acompanhado das uvas."]',
 3, 1, 'public', true),
(NULL, 'Pasta de amendoim com banana', '["Lanche da tarde","Café da manhã"]',
 '[{"food_name":"Pasta de amendoim","quantity":15,"unit":"g"},{"food_name":"Banana prata","quantity":1,"unit":"unidade"},{"food_name":"Pão integral","quantity":1,"unit":"fatia"}]',
 '["Passe a pasta de amendoim no pão.","Corte a banana em rodelas e distribua por cima."]',
 5, 1, 'public', true),
(NULL, 'Whey com leite e morango', '["Lanche da tarde","Lanche"]',
 '[{"food_name":"Whey protein (pó)","quantity":30,"unit":"g"},{"food_name":"Leite desnatado","quantity":200,"unit":"ml"},{"food_name":"Morango","quantity":60,"unit":"g"}]',
 '["Bata todos os ingredientes no liquidificador até obter uma mistura homogênea."]',
 5, 1, 'public', true);
  END IF;
END $$;
