-- Per-user workouts (user_id), RLS for authenticated users, Oura tokens in Postgres.
-- Resets workout-related rows (v1 had no user scope). Apply in Supabase SQL editor or CLI.

-- 1) Oura OAuth tokens per user (replaces local .data/oura-tokens.json for server deployments)
create table if not exists public.oura_oauth_tokens (
  user_id uuid primary key references auth.users (id) on delete cascade,
  access_token text not null,
  refresh_token text,
  expires_at_ms bigint not null,
  scope text,
  updated_at timestamptz not null default now()
);

alter table public.oura_oauth_tokens enable row level security;

create policy "oura_tokens_select_own"
  on public.oura_oauth_tokens for select to authenticated
  using (user_id = (select auth.uid()));

create policy "oura_tokens_insert_own"
  on public.oura_oauth_tokens for insert to authenticated
  with check (user_id = (select auth.uid()));

create policy "oura_tokens_update_own"
  on public.oura_oauth_tokens for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy "oura_tokens_delete_own"
  on public.oura_oauth_tokens for delete to authenticated
  using (user_id = (select auth.uid()));

grant select, insert, update, delete on table public.oura_oauth_tokens to authenticated;

-- 2) Drop workout-owned data (no per-user migration path for v1)
truncate table public.workouts cascade;

-- 3) Own each workout row
alter table public.workouts
  add column if not exists user_id uuid references auth.users (id) on delete cascade;

alter table public.workouts alter column user_id set not null;

create index if not exists workouts_user_started_idx on public.workouts (user_id, started_at desc);

-- 4) workouts RLS
alter table public.workouts enable row level security;

create policy "workouts_select_own" on public.workouts for select to authenticated
  using (user_id = (select auth.uid()));

create policy "workouts_insert_own" on public.workouts for insert to authenticated
  with check (user_id = (select auth.uid()));

create policy "workouts_update_own" on public.workouts for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy "workouts_delete_own" on public.workouts for delete to authenticated
  using (user_id = (select auth.uid()));

grant select, insert, update, delete on table public.workouts to authenticated;

-- 5) workout_blocks
alter table public.workout_blocks enable row level security;

create policy "workout_blocks_all_own" on public.workout_blocks for all to authenticated
  using (
    exists (
      select 1 from public.workouts w
      where w.id = workout_blocks.workout_id and w.user_id = (select auth.uid())
    )
  )
  with check (
    exists (
      select 1 from public.workouts w
      where w.id = workout_blocks.workout_id and w.user_id = (select auth.uid())
    )
  );

grant select, insert, update, delete on table public.workout_blocks to authenticated;

-- 6) workout_exercises
alter table public.workout_exercises enable row level security;

create policy "workout_exercises_all_own" on public.workout_exercises for all to authenticated
  using (
    exists (
      select 1 from public.workout_blocks wb
      join public.workouts w on w.id = wb.workout_id
      where wb.id = workout_exercises.workout_block_id and w.user_id = (select auth.uid())
    )
  )
  with check (
    exists (
      select 1 from public.workout_blocks wb
      join public.workouts w on w.id = wb.workout_id
      where wb.id = workout_exercises.workout_block_id and w.user_id = (select auth.uid())
    )
  );

grant select, insert, update, delete on table public.workout_exercises to authenticated;

-- 7) workout_sets
alter table public.workout_sets enable row level security;

create policy "workout_sets_all_own" on public.workout_sets for all to authenticated
  using (
    exists (
      select 1 from public.workout_exercises we
      join public.workout_blocks wb on wb.id = we.workout_block_id
      join public.workouts w on w.id = wb.workout_id
      where we.id = workout_sets.workout_exercise_id and w.user_id = (select auth.uid())
    )
  )
  with check (
    exists (
      select 1 from public.workout_exercises we
      join public.workout_blocks wb on wb.id = we.workout_block_id
      join public.workouts w on w.id = wb.workout_id
      where we.id = workout_sets.workout_exercise_id and w.user_id = (select auth.uid())
    )
  );

grant select, insert, update, delete on table public.workout_sets to authenticated;

-- 8) oura_workout_links
alter table public.oura_workout_links enable row level security;

create policy "oura_links_select_own" on public.oura_workout_links for select to authenticated
  using (
    exists (
      select 1 from public.workouts w
      where w.id = oura_workout_links.workout_id and w.user_id = (select auth.uid())
    )
  );

create policy "oura_links_insert_own" on public.oura_workout_links for insert to authenticated
  with check (
    exists (
      select 1 from public.workouts w
      where w.id = oura_workout_links.workout_id and w.user_id = (select auth.uid())
    )
  );

create policy "oura_links_update_own" on public.oura_workout_links for update to authenticated
  using (
    exists (
      select 1 from public.workouts w
      where w.id = oura_workout_links.workout_id and w.user_id = (select auth.uid())
    )
  )
  with check (
    exists (
      select 1 from public.workouts w
      where w.id = oura_workout_links.workout_id and w.user_id = (select auth.uid())
    )
  );

create policy "oura_links_delete_own" on public.oura_workout_links for delete to authenticated
  using (
    exists (
      select 1 from public.workouts w
      where w.id = oura_workout_links.workout_id and w.user_id = (select auth.uid())
    )
  );

grant select, insert, update, delete on table public.oura_workout_links to authenticated;
