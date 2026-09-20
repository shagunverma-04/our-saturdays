-- Minimal stand-ins for Supabase's auth/storage/realtime so schema.sql can be tested on plain Postgres.
create role anon nologin; create role authenticated nologin; create role service_role nologin;
create schema auth; create schema storage;
create table auth.users (id uuid primary key default gen_random_uuid(), email text, raw_user_meta_data jsonb default '{}'::jsonb);
-- like Supabase: read the caller from the JWT claims (PostgREST sets request.jwt.claims; the SQL tests set the legacy GUC)
create function auth.uid() returns uuid language sql stable as $$
  select coalesce(nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'sub',
                  nullif(current_setting('request.jwt.claim.sub', true), ''))::uuid $$;
create table storage.buckets (id text primary key, name text, public boolean default false, file_size_limit bigint, allowed_mime_types text[]);
create table storage.objects (id uuid primary key default gen_random_uuid(), bucket_id text references storage.buckets(id), name text);
create function storage.foldername(name text) returns text[] language sql immutable as $$ select string_to_array(name, '/') $$;
alter table storage.objects enable row level security;
create publication supabase_realtime;
grant usage on schema public, auth, storage to anon, authenticated;
-- Supabase gives new public tables/functions to these roles by default; RLS is what actually restricts them
alter default privileges in schema public grant all on tables to authenticated;
alter default privileges in schema public grant execute on functions to anon, authenticated;
grant all on all tables in schema storage to authenticated;
create role authenticator login noinherit; grant anon, authenticated to authenticator;
