-- Tracking real de "item consumido" (feat: dashboard agregado do nutricionista).
-- Antes disso, o checklist de MyDiet.tsx só existia no localStorage do
-- navegador do paciente — sem essa tabela, o nutricionista não tem como ver
-- adesão de nenhum paciente. Um registro por paciente + item + data (não por
-- "dia da semana" recorrente), pra permitir histórico real.

CREATE TABLE meal_completions (
  id bigint generated always as identity primary key,
  patient_id uuid not null references profiles(id),
  meal_item_id bigint not null references meal_items(id),
  completed_on date not null,
  completed_at timestamptz not null default now(),
  unique (patient_id, meal_item_id, completed_on)
);

CREATE INDEX meal_completions_patient_date_idx ON meal_completions (patient_id, completed_on);
