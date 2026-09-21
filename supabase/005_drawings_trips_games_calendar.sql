-- our saturdays — migration 005: drawing board, trips (full), games, saturday time, calendar link.
-- Run AFTER schema.sql and 002. Independent of 003/004. Idempotent, and safe to re-run in any order.
--
-- trips / trip_items / trip_expenses / games / game_attempts / plans and their row-level security already exist
-- (schema.sql + 002). This file adds what those were missing and the new drawings + calendar tables.

-- ── shared helpers (also defined by other migrations; repeated so this file stands alone) ─────────────
create or replace function public.lock_owner_columns()
returns trigger language plpgsql as $$
begin
  if to_jsonb(new) ? 'couple_id' and to_jsonb(new)->>'couple_id' is distinct from to_jsonb(old)->>'couple_id' then
    raise exception 'couple_id cannot be changed';
  end if;
  if to_jsonb(new) ? 'created_by' and to_jsonb(new)->>'created_by' is distinct from to_jsonb(old)->>'created_by' then
    raise exception 'created_by cannot be changed';
  end if;
  return new;
end $$;

-- ── drawings: a doodle one of you sends the other ─────────────────────────────────────────────────────
create table if not exists public.drawings (
  id uuid primary key default gen_random_uuid(),
  couple_id uuid not null references public.couples(id) on delete cascade,
  created_by uuid not null references auth.users(id) default auth.uid(),
  storage_path text not null,            -- "sb:<couple>/drawings/<uuid>.png" in the private media bucket
  caption text not null default '',
  seen_by uuid[] not null default '{}',  -- who has opened it (drives the "new drawing" nudge)
  created_at timestamptz not null default now()
);
create index if not exists drawings_couple_idx on public.drawings (couple_id, created_at desc);
alter table public.drawings enable row level security;

drop policy if exists drawings_select on public.drawings;
drop policy if exists drawings_insert on public.drawings;
drop policy if exists drawings_update on public.drawings;
drop policy if exists drawings_delete on public.drawings;
create policy drawings_select on public.drawings for select to authenticated using (public.is_couple_member(couple_id));
create policy drawings_insert on public.drawings for insert to authenticated
  with check (public.is_couple_member(couple_id) and created_by = auth.uid());
create policy drawings_update on public.drawings for update to authenticated
  using (public.is_couple_member(couple_id)) with check (public.is_couple_member(couple_id));
-- only the artist may delete their own drawing
create policy drawings_delete on public.drawings for delete to authenticated
  using (public.is_couple_member(couple_id) and created_by = auth.uid());

-- Your partner may only mark your drawing as SEEN. They can't repaint or retitle it.
create or replace function public.drawings_guard()
returns trigger language plpgsql as $$
begin
  if auth.uid() is distinct from old.created_by then
    if new.storage_path is distinct from old.storage_path or new.caption is distinct from old.caption then
      raise exception 'only the artist can change a drawing';
    end if;
    if not (new.seen_by @> old.seen_by) then
      raise exception 'seen_by can only grow';
    end if;
  end if;
  return new;
end $$;
drop trigger if exists drawings_guard on public.drawings;
create trigger drawings_guard before update on public.drawings for each row execute function public.drawings_guard();
drop trigger if exists lock_owner on public.drawings;
create trigger lock_owner before update on public.drawings for each row execute function public.lock_owner_columns();

-- ── trips: what the original tables were missing ──────────────────────────────────────────────────────
alter table public.trips       add column if not exists budget_estimate numeric(12,2) check (budget_estimate is null or budget_estimate >= 0);
alter table public.trip_items  add column if not exists title    text not null default '';
alter table public.trip_items  add column if not exists location text not null default '';
alter table public.memories    add column if not exists trip_id uuid references public.trips(id) on delete set null;  -- present in schema.sql; ensured here
create index if not exists trip_items_trip_idx    on public.trip_items (trip_id, scheduled_date, scheduled_time);
create index if not exists trip_expenses_trip_idx on public.trip_expenses (trip_id);

-- a memory may only be tagged to a trip of its own couple (restrictive: survives re-running other migrations)
create or replace function public.trip_couple(tid uuid)
returns uuid language sql stable security definer set search_path = public as $$
  select couple_id from public.trips where id = tid;
$$;
drop policy if exists memories_trip_guard_insert on public.memories;
drop policy if exists memories_trip_guard_update on public.memories;
create policy memories_trip_guard_insert on public.memories as restrictive for insert to authenticated
  with check (trip_id is null or public.trip_couple(trip_id) = couple_id);
create policy memories_trip_guard_update on public.memories as restrictive for update to authenticated
  using (true) with check (trip_id is null or public.trip_couple(trip_id) = couple_id);

-- ── plans: an optional time ("saturday · 6 pm") ───────────────────────────────────────────────────────
alter table public.plans add column if not exists time time;

-- ── games ─────────────────────────────────────────────────────────────────────────────────────────────
-- who_saved / remember_when: one row per item/memory (prompt = its id), shared by both of you, so re-playing never duplicates
create unique index if not exists games_one_per_subject on public.games (couple_id, type, prompt) where type in ('who_saved', 'remember_when');
create index if not exists game_attempts_game_idx on public.game_attempts (game_id, created_at);

-- ── calendar link: YOUR private iCal address, visible to nobody else (not even your partner) ─────────
create table if not exists public.calendar_links (
  user_id uuid primary key references auth.users(id) on delete cascade default auth.uid(),
  url text not null check (url ~* '^https?://'),
  updated_at timestamptz not null default now()
);
alter table public.calendar_links enable row level security;
drop policy if exists calendar_links_owner on public.calendar_links;
create policy calendar_links_owner on public.calendar_links for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- ── realtime ───────────────────────────────────────────────────────────────────────────────────────────
do $$
declare t text;
begin
  foreach t in array array['drawings', 'trips', 'trip_items', 'trip_expenses', 'games', 'game_attempts', 'plans'] loop
    begin
      execute format('alter publication supabase_realtime add table public.%I', t);
    exception when duplicate_object then null;
    end;
  end loop;
end $$;
