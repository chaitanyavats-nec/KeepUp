# The Upkeep Ledger

A personal habit and progress-tracking web app, built with React, Vite, and Neon Serverless Postgres.

## Tech Stack
- React + Vite
- Neon (Serverless Postgres)
- Vercel Serverless Functions (API)
- Recharts
- Plain CSS

## Local Development

1. Clone the repository
2. Install dependencies: `npm install`
3. Create a `.env.local` file in the root directory and add your Neon connection string:

```
DATABASE_URL=your_neon_database_url
```

4. Since this uses Vercel Serverless Functions to securely connect to the database, install the Vercel CLI globally if you haven't already:
```
npm i -g vercel
```
5. Run the local development server with the Vercel CLI:
```
vercel dev
```

## Deployment

Deploy this project on Vercel. Ensure you add the following Environment Variable in your Vercel project settings:
- `DATABASE_URL`

## Database Setup
Run the following SQL in your Neon SQL editor:

```sql
create table categories (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  color text not null default '#3F5E4E',
  sort_order integer not null default 0,
  created_at timestamptz default now()
);

create table habits (
  id uuid primary key default gen_random_uuid(),
  category_id uuid references categories(id) on delete set null,
  name text not null,
  type text not null check (type in ('boolean', 'numeric', 'duration', 'checklist', 'scale', 'choice')),
  unit text,
  archived boolean not null default false,
  sort_order integer not null default 0,
  goal_target numeric,
  goal_period text, -- 'day' or 'week'
  scale_min integer, -- used only by type = 'scale'
  scale_max integer,
  created_at timestamptz default now()
);

create table habit_options (
  id uuid primary key default gen_random_uuid(),
  habit_id uuid references habits(id) on delete cascade not null,
  label text not null,
  value numeric,               -- optional weight (grams/points); null = worth 1 when summed
  sort_order integer not null default 0,
  created_at timestamptz default now()
);

create table logs (
  id uuid primary key default gen_random_uuid(),
  habit_id uuid references habits(id) on delete cascade not null,
  log_date date not null,
  value numeric not null,
  note text, -- for 'checklist'/'choice' logs: JSON array of selected habit_options ids
  created_at timestamptz default now(),
  unique (habit_id, log_date)
);
```

`habit_options` holds the user-defined items for `checklist` and `choice` habits (e.g. a protein habit's food list, or a "workout type" habit's Run/Lift/Rest options).

If you already have a database from before goals/notes/checklist support existed, run [migrations.sql](migrations.sql) in the Neon SQL editor instead of recreating the tables — it also migrates any existing `protein`-type habits into the new generic `checklist` type and seeds their items from the old built-in food list.