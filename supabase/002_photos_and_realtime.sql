-- our saturdays — migration 002: private photos, avatar emoji, realtime.
-- Run AFTER schema.sql. Idempotent: safe to run twice.

-- ── profiles: an emoji avatar (avatar_url holds an optional photo reference) ──
alter table public.profiles add column if not exists avatar_emoji text not null default '🙂';

-- ── private media bucket ────────────────────────────────────────────────────
-- One private bucket for everything visual (item photos, profile photos, later memories).
-- Objects live at  <couple_id>/<anything>  and only that couple's members can touch them.
-- The bucket is NOT public: the app shows images through short-lived signed URLs.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('media', 'media', false, 5242880, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update
  set public = false, file_size_limit = 5242880, allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp'];

drop policy if exists media_read   on storage.objects;
drop policy if exists media_insert on storage.objects;
drop policy if exists media_delete on storage.objects;

create policy media_read on storage.objects for select to authenticated
  using (bucket_id = 'media' and public.is_couple_member(((storage.foldername(name))[1])::uuid));
create policy media_insert on storage.objects for insert to authenticated
  with check (bucket_id = 'media' and public.is_couple_member(((storage.foldername(name))[1])::uuid));
create policy media_delete on storage.objects for delete to authenticated
  using (bucket_id = 'media' and public.is_couple_member(((storage.foldername(name))[1])::uuid));

-- ── realtime: your partner's changes show up without refreshing ─────────────
-- (RLS still applies to what each person receives.)
do $$
declare t text;
begin
  foreach t in array array['saved_items', 'plans', 'profiles'] loop
    begin
      execute format('alter publication supabase_realtime add table public.%I', t);
    exception when duplicate_object then null;  -- already added
    end;
  end loop;
end $$;

-- ── fix: split the "own it or share it" policies ─────────────────────────────
-- Anyone in the couple may read/update/delete shared rows; only *you* may create rows as yourself.
-- (A single FOR ALL policy with created_by = auth.uid() would stop your partner editing what you saved.)
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

do $$
declare t text;
begin
  foreach t in array array['saved_items', 'memories', 'games'] loop
    execute format('drop policy if exists %I on public.%I', t || '_all', t);
    execute format('drop policy if exists %I on public.%I', t || '_select', t);
    execute format('drop policy if exists %I on public.%I', t || '_insert', t);
    execute format('drop policy if exists %I on public.%I', t || '_update', t);
    execute format('drop policy if exists %I on public.%I', t || '_delete', t);
    execute format('create policy %I on public.%I for select to authenticated using (public.is_couple_member(couple_id))', t || '_select', t);
    execute format('create policy %I on public.%I for insert to authenticated with check (public.is_couple_member(couple_id) and created_by = auth.uid())', t || '_insert', t);
    execute format('create policy %I on public.%I for update to authenticated using (public.is_couple_member(couple_id)) with check (public.is_couple_member(couple_id))', t || '_update', t);
    execute format('create policy %I on public.%I for delete to authenticated using (public.is_couple_member(couple_id))', t || '_delete', t);
  end loop;
  foreach t in array array['saved_items', 'memories', 'games', 'trips', 'plans'] loop
    execute format('drop trigger if exists lock_owner on public.%I', t);
    execute format('create trigger lock_owner before update on public.%I for each row execute function public.lock_owner_columns()', t);
  end loop;
end $$;
