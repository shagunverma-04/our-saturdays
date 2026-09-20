-- our saturdays — Supabase schema + Row Level Security
-- Run this whole file once in Supabase → SQL Editor. Safe to read top to bottom.
-- Model: exactly two people share one "couple". Every row hangs off a couple_id (directly or via its parent),
-- and RLS only lets members of that couple see or change it. Nothing is public.

create extension if not exists pgcrypto;

-- ── tables ───────────────────────────────────────────────────────────────────

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  name text not null default 'Us',
  avatar_url text,
  created_at timestamptz not null default now()
);

create table public.couples (
  id uuid primary key default gen_random_uuid(),
  name text not null default 'our saturdays',
  invite_code text not null unique default encode(gen_random_bytes(5), 'hex'),
  created_at timestamptz not null default now()
);

create table public.couple_members (
  couple_id uuid not null references public.couples(id) on delete cascade,
  user_id uuid not null unique references auth.users(id) on delete cascade, -- one couple per person
  joined_at timestamptz not null default now(),
  primary key (couple_id, user_id)
);

create table public.saved_items (
  id uuid primary key default gen_random_uuid(),
  couple_id uuid not null references public.couples(id) on delete cascade,
  created_by uuid not null references auth.users(id) default auth.uid(),
  title text not null,
  category text not null check (category in ('places','eat','watch','do','shop','travel','ideas')),
  description text not null default '',
  image_url text not null default '',
  source_url text not null default '',
  location_name text not null default '',
  latitude double precision,
  longitude double precision,
  status text not null default 'saved' check (status in ('saved','planned','done','maybe','archived')),
  release_date date,
  notes text not null default '',
  tags text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index on public.saved_items (couple_id, created_at desc);

create table public.trips (
  id uuid primary key default gen_random_uuid(),
  couple_id uuid not null references public.couples(id) on delete cascade,
  title text not null,
  destination text not null default '',
  cover_image_url text,
  start_date date,
  end_date date,
  notes text not null default '',
  created_at timestamptz not null default now()
);

create table public.trip_items (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references public.trips(id) on delete cascade,
  saved_item_id uuid references public.saved_items(id) on delete set null,
  item_type text not null check (item_type in ('place','food','stay','activity','other')),
  scheduled_date date,
  scheduled_time time,
  notes text not null default ''
);

create table public.trip_expenses (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references public.trips(id) on delete cascade,
  category text not null check (category in ('stay','food','travel','activities','shopping','other')),
  amount numeric(12,2) not null check (amount >= 0),
  description text not null default '',
  paid_by uuid references auth.users(id),
  created_at timestamptz not null default now()
);

create table public.memories (
  id uuid primary key default gen_random_uuid(),
  couple_id uuid not null references public.couples(id) on delete cascade,
  created_by uuid not null references auth.users(id) default auth.uid(),
  title text not null,
  description text not null default '',
  date date not null default current_date,
  location text not null default '',
  trip_id uuid references public.trips(id) on delete set null,
  created_at timestamptz not null default now()
);

create table public.memory_photos (
  id uuid primary key default gen_random_uuid(),
  memory_id uuid not null references public.memories(id) on delete cascade,
  storage_path text not null,
  display_order int not null default 0
);

create table public.games (
  id uuid primary key default gen_random_uuid(),
  couple_id uuid not null references public.couples(id) on delete cascade,
  type text not null check (type in ('guess_word','who_saved','remember_when')),
  created_by uuid not null references auth.users(id) default auth.uid(),
  prompt text not null default '',
  answer text not null default '',  -- NOTE: visible to both members by design; this is a game between two, not a secret vault
  hint text not null default '',
  created_at timestamptz not null default now()
);

create table public.game_attempts (
  id uuid primary key default gen_random_uuid(),
  game_id uuid not null references public.games(id) on delete cascade,
  user_id uuid not null references auth.users(id) default auth.uid(),
  guess text not null,
  correct boolean not null default false,
  created_at timestamptz not null default now()
);

create table public.plans (
  id uuid primary key default gen_random_uuid(),
  couple_id uuid not null references public.couples(id) on delete cascade,
  title text not null,
  date date not null,
  category text not null,
  saved_item_id uuid references public.saved_items(id) on delete set null,
  created_at timestamptz not null default now()
);

-- ── membership helpers (security definer avoids RLS recursion on couple_members) ─

create or replace function public.is_couple_member(cid uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.couple_members where couple_id = cid and user_id = auth.uid());
$$;

create or replace function public.trip_couple(tid uuid)
returns uuid language sql stable security definer set search_path = public as $$
  select couple_id from public.trips where id = tid;
$$;

create or replace function public.memory_couple(mid uuid)
returns uuid language sql stable security definer set search_path = public as $$
  select couple_id from public.memories where id = mid;
$$;

create or replace function public.game_couple(gid uuid)
returns uuid language sql stable security definer set search_path = public as $$
  select couple_id from public.games where id = gid;
$$;

-- People you share a couple with (to read your partner's name/avatar).
create or replace function public.shares_couple_with(uid uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.couple_members a join public.couple_members b on a.couple_id = b.couple_id
    where a.user_id = auth.uid() and b.user_id = uid
  );
$$;

-- ── creating / joining a couple (RPCs, since members can't insert into couples directly) ─

-- First person: creates the space and becomes its first member. Returns the invite code to send to your partner.
create or replace function public.create_couple(couple_name text default 'our saturdays')
returns text language plpgsql security definer set search_path = public as $$
declare cid uuid; code text;
begin
  if auth.uid() is null then raise exception 'not signed in'; end if;
  if exists (select 1 from couple_members where user_id = auth.uid()) then raise exception 'already in a couple'; end if;
  insert into couples (name) values (couple_name) returning id, invite_code into cid, code;
  insert into couple_members (couple_id, user_id) values (cid, auth.uid());
  return code;
end $$;

-- Second person: joins with the code. Refuses if the couple already has two members.
create or replace function public.join_couple(code text)
returns uuid language plpgsql security definer set search_path = public as $$
declare cid uuid;
begin
  if auth.uid() is null then raise exception 'not signed in'; end if;
  if exists (select 1 from couple_members where user_id = auth.uid()) then raise exception 'already in a couple'; end if;
  select id into cid from couples where invite_code = lower(trim(code));
  if cid is null then raise exception 'invalid invite code'; end if;
  if (select count(*) from couple_members where couple_id = cid) >= 2 then raise exception 'this couple is full'; end if;
  insert into couple_members (couple_id, user_id) values (cid, auth.uid());
  return cid;
end $$;

revoke all on function public.create_couple(text), public.join_couple(text) from public, anon;
grant execute on function public.create_couple(text), public.join_couple(text) to authenticated;

-- Auto-create a profile row when someone signs up.
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, name) values (new.id, coalesce(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)));
  return new;
end $$;

create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- keep updated_at honest
create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$ begin new.updated_at = now(); return new; end $$;
create trigger saved_items_touch before update on public.saved_items for each row execute function public.touch_updated_at();

-- ── row level security ───────────────────────────────────────────────────────

alter table public.profiles       enable row level security;
alter table public.couples        enable row level security;
alter table public.couple_members enable row level security;
alter table public.saved_items    enable row level security;
alter table public.trips          enable row level security;
alter table public.trip_items     enable row level security;
alter table public.trip_expenses  enable row level security;
alter table public.memories       enable row level security;
alter table public.memory_photos  enable row level security;
alter table public.games          enable row level security;
alter table public.game_attempts  enable row level security;
alter table public.plans          enable row level security;

-- profiles: you and your partner can read; only you can edit yours
create policy profiles_read   on public.profiles for select to authenticated using (id = auth.uid() or public.shares_couple_with(id));
create policy profiles_update on public.profiles for update to authenticated using (id = auth.uid()) with check (id = auth.uid());

-- couples: members can read their own couple (creation goes through create_couple())
create policy couples_read   on public.couples for select to authenticated using (public.is_couple_member(id));
create policy couples_update on public.couples for update to authenticated using (public.is_couple_member(id)) with check (public.is_couple_member(id));

-- couple_members: see your own couple's members; leaving is allowed, adding is RPC-only
create policy members_read   on public.couple_members for select to authenticated using (public.is_couple_member(couple_id));
create policy members_delete on public.couple_members for delete to authenticated using (user_id = auth.uid());

-- direct couple_id tables
-- (saved_items / memories / games policies are created in 002_photos_and_realtime.sql, split per-command
--  so a partner can edit things you saved. Until 002 runs those tables deny everything — safe by default.)
create policy trips_all on public.trips for all to authenticated
  using (public.is_couple_member(couple_id)) with check (public.is_couple_member(couple_id));
create policy plans_all on public.plans for all to authenticated
  using (public.is_couple_member(couple_id)) with check (public.is_couple_member(couple_id));

-- child tables: access follows the parent's couple
create policy trip_items_all on public.trip_items for all to authenticated
  using (public.is_couple_member(public.trip_couple(trip_id))) with check (public.is_couple_member(public.trip_couple(trip_id)));
create policy trip_expenses_all on public.trip_expenses for all to authenticated
  using (public.is_couple_member(public.trip_couple(trip_id))) with check (public.is_couple_member(public.trip_couple(trip_id)));
create policy memory_photos_all on public.memory_photos for all to authenticated
  using (public.is_couple_member(public.memory_couple(memory_id))) with check (public.is_couple_member(public.memory_couple(memory_id)));
create policy game_attempts_read on public.game_attempts for select to authenticated
  using (public.is_couple_member(public.game_couple(game_id)));
create policy game_attempts_insert on public.game_attempts for insert to authenticated
  with check (public.is_couple_member(public.game_couple(game_id)) and user_id = auth.uid());

-- ── storage: private bucket for memory photos, path = <couple_id>/<file> ────

insert into storage.buckets (id, name, public) values ('memories', 'memories', false) on conflict do nothing;

create policy memories_bucket_read on storage.objects for select to authenticated
  using (bucket_id = 'memories' and public.is_couple_member(((storage.foldername(name))[1])::uuid));
create policy memories_bucket_write on storage.objects for insert to authenticated
  with check (bucket_id = 'memories' and public.is_couple_member(((storage.foldername(name))[1])::uuid));
create policy memories_bucket_delete on storage.objects for delete to authenticated
  using (bucket_id = 'memories' and public.is_couple_member(((storage.foldername(name))[1])::uuid));
