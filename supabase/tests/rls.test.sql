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


-- ── 003: item_interactions ───────────────────────────────────────────────────
select pg_temp.as_admin();
select id as ramen_id from public.saved_items where title = 'Ramen' \gset
-- bob reacts to alice's find
select pg_temp.as_user('00000000-0000-0000-0000-00000000000b');
insert into public.item_interactions (couple_id, saved_item_id, interaction_type) values (:'a_couple', :'ramen_id', 'like');
select pg_temp.expect_error(format($$insert into public.item_interactions (couple_id, saved_item_id, interaction_type) values (%L, %L, 'like')$$, :'a_couple', :'ramen_id'), 'duplicate key');   -- toggle, not stack
select pg_temp.expect_error(format($$insert into public.item_interactions (couple_id, saved_item_id, user_id, interaction_type) values (%L, %L, '00000000-0000-0000-0000-00000000000a', 'like')$$, :'a_couple', :'ramen_id'), 'row-level security');  -- can't react as her
select pg_temp.expect_error(format($$insert into public.item_interactions (couple_id, saved_item_id, interaction_type) values (%L, %L, 'love')$$, :'a_couple', :'ramen_id'), 'check constraint');
-- alice sees bob's reaction, can't delete it, and can add her own
select pg_temp.as_user('00000000-0000-0000-0000-00000000000a');
select pg_temp.expect_count($$select 1 from public.item_interactions$$, 1);
delete from public.item_interactions;   -- not hers → 0 rows
select pg_temp.expect_count($$select 1 from public.item_interactions$$, 1);
insert into public.item_interactions (couple_id, saved_item_id, interaction_type) values (:'a_couple', :'ramen_id', 'saturday');
-- carol (outsider) sees nothing and can't react to alice's item, even claiming her own couple id
select pg_temp.as_user('00000000-0000-0000-0000-00000000000c');
select pg_temp.expect_count($$select 1 from public.item_interactions$$, 0);
select pg_temp.expect_error(format($$insert into public.item_interactions (couple_id, saved_item_id, interaction_type) values (%L, %L, 'like')$$, :'a_couple', :'ramen_id'), 'row-level security');
select pg_temp.expect_error(format($$insert into public.item_interactions (couple_id, saved_item_id, interaction_type) select id, %L, 'like' from public.couples$$, :'ramen_id'), 'row-level security');  -- her own couple id + alice's item
-- bob can undo his own
select pg_temp.as_user('00000000-0000-0000-0000-00000000000b');
delete from public.item_interactions where interaction_type = 'like';
select pg_temp.expect_count($$select 1 from public.item_interactions where interaction_type = 'like'$$, 0);
select pg_temp.expect_count($$select 1 from public.item_interactions$$, 1);
select pg_temp.as_admin();
select pg_temp.expect_count($$select 1 from pg_publication_tables where pubname = 'supabase_realtime' and tablename = 'item_interactions'$$, 1);

-- ── 004: memories ────────────────────────────────────────────────────────────
select pg_temp.as_admin();
select id as ramen_id2 from public.saved_items where title = 'Ramen' \gset
select pg_temp.as_user('00000000-0000-0000-0000-00000000000a');
insert into public.memories (couple_id, title, description, date, location, saved_item_id) values (:'a_couple', 'Ramen night', 'so good', '2026-09-12', 'Koramangala', :'ramen_id2');
select id as mem_id from public.memories where title = 'Ramen night' \gset
insert into public.memory_photos (memory_id, storage_path, display_order) values (:'mem_id', 'sb:x/1.jpg', 0), (:'mem_id', 'sb:x/2.jpg', 1);
select pg_temp.expect_error(format($$insert into public.memory_photos (memory_id, storage_path, display_order) values (%L, 'sb:x/1.jpg', 5)$$, :'mem_id'), 'duplicate key');
select pg_temp.expect_error(format($$insert into public.memories (couple_id, title, created_by) values (%L, 'spoof', '00000000-0000-0000-0000-00000000000b')$$, :'a_couple'), 'row-level security');
-- partner sees it, can edit the caption and add a photo, but not change who made it
select pg_temp.as_user('00000000-0000-0000-0000-00000000000b');
select pg_temp.expect_count($$select 1 from public.memories$$, 1);
select pg_temp.expect_count($$select 1 from public.memory_photos$$, 2);
update public.memories set description = 'best broth ever' where id = :'mem_id';
insert into public.memory_photos (memory_id, storage_path, display_order) values (:'mem_id', 'sb:x/3.jpg', 2);
select pg_temp.expect_error(format($$update public.memories set created_by = auth.uid() where id = %L$$, :'mem_id'), 'created_by cannot be changed');
-- outsider: sees nothing; can't add photos to it, edit it, or link it to her own item
select pg_temp.as_user('00000000-0000-0000-0000-00000000000c');
select pg_temp.expect_count($$select 1 from public.memories$$, 0);
select pg_temp.expect_count($$select 1 from public.memory_photos$$, 0);
select pg_temp.expect_error(format($$insert into public.memory_photos (memory_id, storage_path, display_order) values (%L, 'sb:evil.jpg', 0)$$, :'mem_id'), 'row-level security');
update public.memories set title = 'HACKED';
delete from public.memories;
select pg_temp.as_admin();
select pg_temp.expect_count($$select 1 from public.memories where title = 'Ramen night' and description = 'best broth ever'$$, 1);
-- can't point a memory at another couple's item (carol's own couple + alice's item)
select pg_temp.as_user('00000000-0000-0000-0000-00000000000c');
select pg_temp.expect_count($$select 1 from public.couples$$, 1);   -- precondition: she can see exactly her own couple, so the insert below really attempts a row
select pg_temp.expect_error(format($$insert into public.memories (couple_id, title, saved_item_id) select id, 'x', %L from public.couples$$, :'ramen_id2'), 'row-level security');
-- deleting a memory takes its photo rows; deleting the item only unlinks
select pg_temp.as_user('00000000-0000-0000-0000-00000000000a');
delete from public.memories where id = :'mem_id';
select pg_temp.expect_count($$select 1 from public.memory_photos$$, 0);
select pg_temp.as_admin();
select pg_temp.expect_count($$select 1 from pg_publication_tables where pubname = 'supabase_realtime' and tablename in ('memories','memory_photos')$$, 2);

-- ── 005: drawings, trips, plans.time, games, calendar_links ─────────────────────────────────────────────
select pg_temp.as_user('00000000-0000-0000-0000-00000000000a');
insert into public.drawings (couple_id, storage_path, caption) values (:'a_couple', 'sb:x/drawings/1.png', 'for you');
select id as draw_id from public.drawings \gset
select pg_temp.expect_error(format($$insert into public.drawings (couple_id, storage_path, created_by) values (%L, 'sb:x/2.png', '00000000-0000-0000-0000-00000000000b')$$, :'a_couple'), 'row-level security');
select pg_temp.as_user('00000000-0000-0000-0000-00000000000b');
select pg_temp.expect_count($$select 1 from public.drawings$$, 1);
update public.drawings set seen_by = array[auth.uid()] where id = :'draw_id';                      -- partner may mark it seen
select pg_temp.expect_error(format($$update public.drawings set caption = 'defaced' where id = %L$$, :'draw_id'), 'only the artist');
select pg_temp.expect_error(format($$update public.drawings set storage_path = 'sb:evil.png' where id = %L$$, :'draw_id'), 'only the artist');
select pg_temp.expect_error(format($$update public.drawings set seen_by = '{}' where id = %L$$, :'draw_id'), 'can only grow');
delete from public.drawings where id = :'draw_id';                                                 -- not the artist: 0 rows
select pg_temp.expect_count($$select 1 from public.drawings$$, 1);
select pg_temp.as_user('00000000-0000-0000-0000-00000000000c');
select pg_temp.expect_count($$select 1 from public.drawings$$, 0);
select pg_temp.expect_error(format($$insert into public.drawings (couple_id, storage_path) values (%L, 'sb:evil.png')$$, :'a_couple'), 'row-level security');
select pg_temp.as_user('00000000-0000-0000-0000-00000000000a');
update public.drawings set caption = 'still mine' where id = :'draw_id';
delete from public.drawings where id = :'draw_id';
select pg_temp.expect_count($$select 1 from public.drawings$$, 0);

-- trips: new columns; partner edits; outsider blocked; a memory can't be tagged to someone else's trip
select pg_temp.as_user('00000000-0000-0000-0000-00000000000a');
insert into public.trips (couple_id, title, destination, start_date, end_date, budget_estimate) values (:'a_couple', 'Goa 2026', 'Goa', '2026-10-24', '2026-10-28', 12000);
select id as trip_id from public.trips where title = 'Goa 2026' \gset
insert into public.trip_items (trip_id, item_type, title, location, scheduled_date, scheduled_time) values (:'trip_id', 'other', 'Breakfast', 'Fontainhas', '2026-10-25', '09:00');
insert into public.trip_expenses (trip_id, category, amount, description) values (:'trip_id', 'food', 450.50, 'thali');
select pg_temp.expect_error(format($$update public.trips set budget_estimate = -1 where id = %L$$, :'trip_id'), 'check constraint');
select pg_temp.as_user('00000000-0000-0000-0000-00000000000b');
update public.trips set budget_estimate = 15000 where id = :'trip_id';
insert into public.trip_items (trip_id, item_type, title) values (:'trip_id', 'place', 'Fort Aguada');
select pg_temp.expect_count(format($$select 1 from public.trip_items where trip_id = %L$$, :'trip_id'), 2);
select pg_temp.as_user('00000000-0000-0000-0000-00000000000c');
select pg_temp.expect_count($$select 1 from public.trip_items$$, 0);
select pg_temp.expect_count($$select 1 from public.trip_expenses$$, 0);
select pg_temp.expect_error(format($$insert into public.trip_items (trip_id, item_type, title) values (%L, 'place', 'evil')$$, :'trip_id'), 'row-level security');
select pg_temp.expect_error(format($$insert into public.memories (couple_id, title, trip_id) select id, 'x', %L from public.couples$$, :'trip_id'), 'row-level security');
select pg_temp.as_user('00000000-0000-0000-0000-00000000000a');
insert into public.memories (couple_id, title, trip_id) values (:'a_couple', 'beach day', :'trip_id');
select pg_temp.expect_count($$select 1 from public.memories where trip_id is not null$$, 1);
delete from public.trips where id = :'trip_id';                                                     -- items/expenses cascade, memory just untagged
select pg_temp.expect_count($$select 1 from public.trip_items where title in ('Breakfast', 'Fort Aguada')$$, 0);
select pg_temp.expect_count($$select 1 from public.trip_expenses where description = 'thali'$$, 0);
select pg_temp.expect_count($$select 1 from public.memories where title = 'beach day' and trip_id is null$$, 1);

-- plans.time
insert into public.plans (couple_id, title, date, category, time) values (:'a_couple', 'Pottery', '2026-09-26', 'do', '18:00');
select pg_temp.expect_count($$select 1 from public.plans where time = '18:00'$$, 1);

-- games: history via attempts; one shared row per subject; outsider blocked
insert into public.games (couple_id, type, prompt, answer, hint) values (:'a_couple', 'guess_word', 'what is it?', 'pottery', 'we keep saying we should');
insert into public.games (couple_id, type, prompt, answer) values (:'a_couple', 'who_saved', 'item-1', 'alice');
select pg_temp.expect_error(format($$insert into public.games (couple_id, type, prompt, answer) values (%L, 'who_saved', 'item-1', 'x')$$, :'a_couple'), 'duplicate key');
select id as game_id from public.games where type = 'guess_word' \gset
select pg_temp.as_user('00000000-0000-0000-0000-00000000000b');
insert into public.game_attempts (game_id, guess, correct) values (:'game_id', 'ramen', false), (:'game_id', 'pottery', true);
select pg_temp.expect_error(format($$insert into public.game_attempts (game_id, guess, user_id) values (%L, 'x', '00000000-0000-0000-0000-00000000000a')$$, :'game_id'), 'row-level security');
select pg_temp.as_user('00000000-0000-0000-0000-00000000000a');
select pg_temp.expect_count($$select 1 from public.game_attempts$$, 2);
select pg_temp.as_user('00000000-0000-0000-0000-00000000000c');
select pg_temp.expect_count($$select 1 from public.games$$, 0);
select pg_temp.expect_count($$select 1 from public.game_attempts$$, 0);
select pg_temp.expect_error(format($$insert into public.game_attempts (game_id, guess) values (%L, 'pottery')$$, :'game_id'), 'row-level security');

-- calendar_links: private even from your partner
select pg_temp.as_user('00000000-0000-0000-0000-00000000000a');
insert into public.calendar_links (url) values ('https://calendar.google.com/calendar/ical/secret/basic.ics');
select pg_temp.expect_error($$insert into public.calendar_links (url) values ('ftp://nope')$$, 'check constraint');
select pg_temp.as_user('00000000-0000-0000-0000-00000000000b');
select pg_temp.expect_count($$select 1 from public.calendar_links$$, 0);                            -- partner cannot see it
select pg_temp.expect_error($$insert into public.calendar_links (user_id, url) values ('00000000-0000-0000-0000-00000000000a', 'https://evil.example/x.ics')$$, 'row-level security');
update public.calendar_links set url = 'https://evil.example/x.ics';                               -- 0 rows: not his
select pg_temp.as_admin();
select pg_temp.expect_count($$select 1 from public.calendar_links where url like '%secret%'$$, 1);
select pg_temp.expect_count($$select 1 from pg_publication_tables where pubname = 'supabase_realtime' and tablename in ('drawings','trips','trip_items','trip_expenses','games','game_attempts')$$, 6);

-- 002 is idempotent (re-run safe) — checked by the runner script.
select 'ALL RLS TESTS PASSED' as result;
