-- our saturdays — migration 004: memories (the private photo journal).
-- Run AFTER schema.sql, 002 and 003. Idempotent.
--
-- The memories / memory_photos tables and their row-level security already exist (schema.sql + 002).
-- This adds: a link from a memory back to the find it came from ("it can become a memory"), a guard so
-- that link can only point at YOUR couple's items, no duplicate photo rows, and realtime.

-- Helper (also defined in 003): which couple owns an item. Repeated here so this file works on its own.
create or replace function public.item_couple(iid uuid)
returns uuid language sql stable security definer set search_path = public as $$
  select couple_id from public.saved_items where id = iid;
$$;

alter table public.memories add column if not exists saved_item_id uuid references public.saved_items(id) on delete set null;

create unique index if not exists memory_photos_unique on public.memory_photos (memory_id, storage_path);
create index if not exists memory_photos_memory_idx on public.memory_photos (memory_id, display_order);
create index if not exists memories_couple_date_idx on public.memories (couple_id, date desc);

-- Guard: a memory may only link to an item of its own couple.
-- RESTRICTIVE policies are ANDed with the normal ones and live under their own names, so re-running 002
-- (which recreates the ordinary memories policies) can never silently remove this protection.
drop policy if exists memories_item_guard_insert on public.memories;
drop policy if exists memories_item_guard_update on public.memories;
create policy memories_item_guard_insert on public.memories as restrictive for insert to authenticated
  with check (saved_item_id is null or public.item_couple(saved_item_id) = couple_id);
create policy memories_item_guard_update on public.memories as restrictive for update to authenticated
  using (true)
  with check (saved_item_id is null or public.item_couple(saved_item_id) = couple_id);

do $$
declare t text;
begin
  foreach t in array array['memories', 'memory_photos'] loop
    begin
      execute format('alter publication supabase_realtime add table public.%I', t);
    exception when duplicate_object then null;
    end;
  end loop;
end $$;
