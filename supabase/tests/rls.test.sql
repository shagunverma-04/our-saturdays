-- RLS behaviour tests. Run on plain Postgres after stubs.sql + schema.sql + 002_photos_and_realtime.sql
-- (see README). Any failed assertion raises an exception; success prints "ALL RLS TESTS PASSED".
\set ON_ERROR_STOP on

create function pg_temp.as_user(u uuid) returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claim.sub', coalesce(u::text, ''), false);
  execute 'set role authenticated';
end $$;
create function pg_temp.as_admin() returns void language plpgsql as $$
begin execute 'reset role'; perform set_config('request.jwt.claim.sub', '', false); end $$;
create function pg_temp.expect_error(sql text, needle text) returns void language plpgsql as $$
begin
  begin execute sql; exception when others then
    if sqlerrm ilike '%' || needle || '%' then return; end if;
    raise exception 'wrong error for [%]: got "%", wanted "%"', sql, sqlerrm, needle;
  end;
  raise exception 'expected an error containing "%" from [%] but it succeeded', needle, sql;
end $$;
create function pg_temp.expect_count(sql text, want int) returns void language plpgsql as $$
declare got int;
begin execute 'select count(*) from (' || sql || ') q' into got;
  if got <> want then raise exception 'count mismatch for [%]: got %, wanted %', sql, got, want; end if; end $$;

select pg_temp.as_admin();
insert into auth.users (id, email, raw_user_meta_data) values
  ('00000000-0000-0000-0000-00000000000a', 'alice@x.test', '{"name":"Alice"}'),
  ('00000000-0000-0000-0000-00000000000b', 'bob@x.test',   '{"name":"Bob"}'),
  ('00000000-0000-0000-0000-00000000000c', 'carol@x.test', '{}'),
  ('00000000-0000-0000-0000-00000000000d', 'dave@x.test',  '{}');

-- profile trigger
select pg_temp.expect_count($$select 1 from public.profiles where name = 'Alice'$$, 1);
select pg_temp.expect_count($$select 1 from public.profiles where name = 'carol'$$, 1); -- falls back to email prefix

-- couples: create + join + full
select pg_temp.as_user('00000000-0000-0000-0000-00000000000a');
select public.create_couple('A&B') as code \gset a_
select pg_temp.expect_error($$select public.create_couple('again')$$, 'already in a couple');
select pg_temp.as_user('00000000-0000-0000-0000-00000000000b');
select pg_temp.expect_error($$select public.join_couple('nope')$$, 'invalid invite code');
select public.join_couple(upper(:'a_code'));  -- case-insensitive
select pg_temp.as_user('00000000-0000-0000-0000-00000000000d');
select pg_temp.expect_error(format($$select public.join_couple(%L)$$, :'a_code'), 'couple is full');
select pg_temp.as_user('00000000-0000-0000-0000-00000000000c');
select public.create_couple('C');
select pg_temp.expect_error($$insert into public.couple_members (couple_id, user_id) select id, auth.uid() from public.couples limit 1$$, 'row-level security');

-- anon can't use the RPCs
select pg_temp.as_admin();
set role anon;
select pg_temp.expect_error($$select public.create_couple('x')$$, 'permission denied');
reset role;

-- isolation of saved_items
select pg_temp.as_user('00000000-0000-0000-0000-00000000000a');
insert into public.saved_items (couple_id, title, category, image_url)
  select couple_id, 'Ramen', 'eat', 'sb:x' from public.couple_members where user_id = auth.uid();
select pg_temp.expect_count($$select 1 from public.saved_items$$, 1);
select pg_temp.expect_error($$insert into public.saved_items (couple_id, title, category, created_by)
  select couple_id, 'Spoof', 'eat', '00000000-0000-0000-0000-00000000000b' from public.couple_members where user_id = auth.uid()$$, 'row-level security');
select pg_temp.expect_error($$insert into public.saved_items (couple_id, title, category, status)
  select couple_id, 'Bad', 'eat', 'nonsense' from public.couple_members where user_id = auth.uid()$$, 'check constraint');

select pg_temp.as_user('00000000-0000-0000-0000-00000000000b');
select pg_temp.expect_count($$select 1 from public.saved_items where title = 'Ramen'$$, 1);  -- partner sees it
update public.saved_items set status = 'planned' where title = 'Ramen';                       -- and can edit it
select pg_temp.expect_count($$select 1 from public.saved_items where status = 'planned'$$, 1);
select pg_temp.expect_error($$update public.saved_items set created_by = auth.uid()$$, 'created_by cannot be changed');
select pg_temp.expect_error($$update public.saved_items set couple_id = gen_random_uuid()$$, 'couple_id cannot be changed');
delete from public.saved_items where title = 'temp';

select pg_temp.as_user('00000000-0000-0000-0000-00000000000c');
select pg_temp.expect_count($$select 1 from public.saved_items$$, 0);                          -- outsider sees nothing
update public.saved_items set title = 'HACKED';
delete from public.saved_items;
select pg_temp.as_admin();
select pg_temp.expect_count($$select 1 from public.saved_items where title = 'Ramen'$$, 1);    -- untouched
select id as a_couple from public.couples where name = 'A&B' \gset
select pg_temp.as_user('00000000-0000-0000-0000-00000000000c');
select pg_temp.expect_error(format($$insert into public.saved_items (couple_id, title, category) values (%L, 'Intruder', 'eat')$$, :'a_couple'), 'row-level security');

-- profiles: partner visible, outsider not
select pg_temp.as_user('00000000-0000-0000-0000-00000000000a');
select pg_temp.expect_count($$select 1 from public.profiles$$, 2);
select pg_temp.expect_count($$select 1 from public.profiles where name = 'carol'$$, 0);
update public.profiles set name = 'Nope' where id = '00000000-0000-0000-0000-00000000000b';    -- can't edit partner's profile
update public.profiles set avatar_emoji = '🧢', name = 'Alice2' where id = auth.uid();
select pg_temp.as_admin();
select pg_temp.expect_count($$select 1 from public.profiles where name = 'Bob'$$, 1);
select pg_temp.expect_count($$select 1 from public.profiles where name = 'Alice2' and avatar_emoji = '🧢'$$, 1);

-- child tables follow the parent's couple
select pg_temp.as_user('00000000-0000-0000-0000-00000000000a');
insert into public.trips (couple_id, title) select couple_id, 'Goa' from public.couple_members where user_id = auth.uid();
insert into public.trip_items (trip_id, item_type) select id, 'place' from public.trips;
insert into public.trip_expenses (trip_id, category, amount) select id, 'food', 100 from public.trips;
select pg_temp.as_user('00000000-0000-0000-0000-00000000000b');
select pg_temp.expect_count($$select 1 from public.trip_items$$, 1);
select pg_temp.as_user('00000000-0000-0000-0000-00000000000c');
select pg_temp.expect_count($$select 1 from public.trip_items$$, 0);
select pg_temp.expect_count($$select 1 from public.trip_expenses$$, 0);

-- realtime publication + media bucket (from 002)
select pg_temp.as_admin();
select pg_temp.expect_count($$select 1 from pg_publication_tables where pubname = 'supabase_realtime' and tablename in ('saved_items','plans','profiles')$$, 3);
select pg_temp.expect_count($$select 1 from storage.buckets where id = 'media' and public = false$$, 1);

-- storage: <couple_id>/file paths
select pg_temp.as_user('00000000-0000-0000-0000-00000000000a');
insert into storage.objects (bucket_id, name) values ('media', :'a_couple' || '/pic.jpg');
select pg_temp.as_user('00000000-0000-0000-0000-00000000000b');
select pg_temp.expect_count($$select 1 from storage.objects where bucket_id = 'media'$$, 1);   -- partner can read
select pg_temp.as_user('00000000-0000-0000-0000-00000000000c');
select pg_temp.expect_count($$select 1 from storage.objects where bucket_id = 'media'$$, 0);   -- outsider can't
select pg_temp.expect_error(format($$insert into storage.objects (bucket_id, name) values ('media', %L)$$, :'a_couple' || '/evil.jpg'), 'row-level security');
delete from storage.objects;                                                                     -- outsider delete: no rows visible
select pg_temp.as_admin();
select pg_temp.expect_count($$select 1 from storage.objects$$, 1);

-- 002 is idempotent (re-run safe) — checked by the runner script.
select 'ALL RLS TESTS PASSED' as result;
