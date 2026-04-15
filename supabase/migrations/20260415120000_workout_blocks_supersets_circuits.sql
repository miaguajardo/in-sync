-- Blocks: single exercise, superset (2+), circuit (2+). Optional rounds / rest per block.
-- Migrates existing workout_exercises (workout_id) → one single-type block per exercise.

create table if not exists public.workout_blocks (
  id uuid primary key default gen_random_uuid(),
  workout_id uuid not null references public.workouts (id) on delete cascade,
  position integer not null,
  type text not null check (type in ('single', 'superset', 'circuit')),
  name text,
  rounds integer,
  rest_seconds integer,
  created_at timestamptz not null default now()
);

create index if not exists workout_blocks_workout_id_idx on public.workout_blocks (workout_id);

create unique index if not exists workout_blocks_workout_position_uniq
  on public.workout_blocks (workout_id, position);

-- Add FK column (backfill before NOT NULL)
alter table public.workout_exercises
  add column if not exists workout_block_id uuid references public.workout_blocks (id) on delete cascade;

-- One single-type block per existing exercise; preserve workout order via exercise.position
do $$
declare
  r record;
  new_block_id uuid;
begin
  for r in
    select we.id as exercise_id, we.workout_id, we.position
    from public.workout_exercises we
    where we.workout_block_id is null
    order by we.workout_id, we.position
  loop
    insert into public.workout_blocks (workout_id, position, type, name, rounds, rest_seconds)
    values (r.workout_id, r.position, 'single', null, null, null)
    returning id into new_block_id;

    update public.workout_exercises
    set workout_block_id = new_block_id
    where id = r.exercise_id;
  end loop;
end $$;

alter table public.workout_exercises drop constraint if exists workout_exercises_workout_id_fkey;

drop index if exists public.workout_exercises_workout_id_idx;

alter table public.workout_exercises drop column if exists workout_id;

alter table public.workout_exercises alter column workout_block_id set not null;

create index if not exists workout_exercises_workout_block_id_idx
  on public.workout_exercises (workout_block_id);

create unique index if not exists workout_exercises_block_position_uniq
  on public.workout_exercises (workout_block_id, position);
