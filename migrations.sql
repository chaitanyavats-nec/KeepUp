-- Run this in your Neon SQL editor if your database was created before
-- goal-tracking, protein-note, and generic checklist/scale/choice support were added.
-- Safe to run multiple times.

ALTER TABLE habits ADD COLUMN IF NOT EXISTS goal_target numeric;
ALTER TABLE habits ADD COLUMN IF NOT EXISTS goal_period text; -- 'day' or 'week'
ALTER TABLE logs ADD COLUMN IF NOT EXISTS note text;

-- Generic checklist/choice item definitions (replaces the old hardcoded protein food list)
CREATE TABLE IF NOT EXISTS habit_options (
  id uuid primary key default gen_random_uuid(),
  habit_id uuid references habits(id) on delete cascade not null,
  label text not null,
  value numeric,               -- optional weight (grams/points); null = worth 1 when summed
  sort_order integer not null default 0,
  created_at timestamptz default now()
);

-- Scale/rating range config (used only by type = 'scale')
ALTER TABLE habits ADD COLUMN IF NOT EXISTS scale_min integer;
ALTER TABLE habits ADD COLUMN IF NOT EXISTS scale_max integer;

-- Migrate existing protein-type habits to the generic checklist type
UPDATE habits SET type = 'checklist' WHERE type = 'protein';

-- Seed migrated checklist habits with the old built-in protein food list,
-- so existing habits and their past logs keep working unchanged.
INSERT INTO habit_options (habit_id, label, value, sort_order)
SELECT h.id, v.label, v.value, v.ord
FROM habits h
CROSS JOIN (VALUES
  ('2 Eggs', 12, 0),
  ('Chicken Breast (100g)', 31, 1),
  ('Paneer (100g)', 18, 2),
  ('Dal / Lentils (1 bowl)', 9, 3),
  ('Greek Yogurt (200g)', 20, 4),
  ('Milk (1 glass)', 8, 5),
  ('Whey Protein (1 scoop)', 25, 6),
  ('Tofu (100g)', 17, 7),
  ('Chickpeas (1 cup)', 15, 8),
  ('Peanut Butter (2 tbsp)', 7, 9),
  ('Almonds (30g)', 6, 10),
  ('Cheese (1 slice)', 7, 11),
  ('Fish (100g)', 22, 12),
  ('Rice (1 bowl)', 4, 13),
  ('Bread (2 slices)', 6, 14),
  ('Soy Milk (1 glass)', 7, 15)
) AS v(label, value, ord)
WHERE h.type = 'checklist'
  AND NOT EXISTS (SELECT 1 FROM habit_options o WHERE o.habit_id = h.id);
