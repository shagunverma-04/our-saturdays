-- our saturdays — migration 003: lightweight reactions on shared finds.
-- Run AFTER schema.sql and 002. Idempotent.
--
-- Model: a saved item is ONE row belonging to the couple, with one creator (saved_items.created_by).
-- Reactions are separate rows here, so an item can drift from "one person's find" to "we both like it"
-- to "Saturday?" without ever being copied. The creator's interest is implicit (no row needed).

create table if not exists public.item_interactions (
  id uuid primary key default gen_random_uuid(),
  couple_id uuid not null references public.couples(id) on delete cascade,
  saved_item_id uuid not null references public.saved_items(id) on delete cascade,
  user_id uuid not null references auth.users(id) default auth.uid(),
  interaction_type text not null check (interaction_type in ('like', 'interested', 'saturday', 'done', 'dismissed')),
  created_at timestamptz not null default now(),
  unique (saved_item_id, user_id, interaction_type)   -- tapping twice is a toggle, never a duplicate
);
create index if not exists item_interactions_item_idx on public.item_interactions (saved_item_id);
create index if not exists item_interactions_couple_idx on public.item_interactions (couple_id, created_at desc);

create or replace function public.item_couple(iid uuid)
returns uuid language sql stable security definer set search_path = public as $$
  select couple_id from public.saved_items where id = iid;
$$;

alter table public.item_interactions enable row level security;

drop policy if exists item_interactions_select on public.item_interactions;
drop policy if exists item_interactions_insert on public.item_interactions;
drop policy if exists item_interactions_delete on public.item_interactions;

-- both of you can see every reaction in your space
create policy item_interactions_select on public.item_interactions for select to authenticated
  using (public.is_couple_member(couple_id));
-- you can only react as yourself, and only to an item that really belongs to that same couple
create policy item_interactions_insert on public.item_interactions for insert to authenticated
  with check (public.is_couple_member(couple_id) and user_id = auth.uid() and public.item_couple(saved_item_id) = couple_id);
-- you can take back your own reaction, never your partner's
create policy item_interactions_delete on public.item_interactions for delete to authenticated
  using (user_id = auth.uid() and public.is_couple_member(couple_id));
-- (no UPDATE policy on purpose: a reaction is either there or it isn't)

do $$
begin
  alter publication supabase_realtime add table public.item_interactions;
exception when duplicate_object then null;
end $$;
