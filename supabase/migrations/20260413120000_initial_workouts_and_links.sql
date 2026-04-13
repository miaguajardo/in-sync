-- In-Sync v1: gym workouts + manual Oura workout links
-- Run in Supabase SQL editor or via Supabase CLI.

create extension if not exists "pgcrypto";

create table if not exists public.workouts (
  id uuid primary key default gen_random_uuid(),
  title text not null default '',
  started_at timestamptz not null,
  notes text,
  created_at timestamptz not null default now()
);

create index if not exists workouts_started_at_idx on public.workouts (started_at);

create table if not exists public.workout_exercises (
  id uuid primary key default gen_random_uuid(),
  workout_id uuid not null references public.workouts (id) on delete cascade,
  position integer not null,
  name text not null
);

create index if not exists workout_exercises_workout_id_idx
  on public.workout_exercises (workout_id);

create table if not exists public.workout_sets (
  id uuid primary key default gen_random_uuid(),
  workout_exercise_id uuid not null references public.workout_exercises (id) on delete cascade,
  position integer not null,
  reps integer not null default 0,
  weight_kg numeric,
  notes text
);

create index if not exists workout_sets_exercise_id_idx
  on public.workout_sets (workout_exercise_id);

create table if not exists public.oura_workout_links (
  oura_workout_id text primary key,
  workout_id uuid not null references public.workouts (id) on delete cascade,
  created_at timestamptz not null default now()
);

create index if not exists oura_workout_links_workout_id_idx
  on public.oura_workout_links (workout_id);
