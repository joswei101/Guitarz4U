-- Database-level access restrictions.
--
-- The website talks to the database only from the server, using the private
-- DATABASE_URL. Supabase additionally exposes tables through its public "Data
-- API" to anyone holding the project's anon key. To make sure that route can
-- never read customer data, we:
--   1. enable Row Level Security on every table with NO policies (deny-all for
--      the anon/authenticated API roles; the server's owner role is unaffected), and
--   2. revoke all table privileges from those roles where they exist.
do $$
declare
  t record;
begin
  for t in select tablename from pg_tables where schemaname = 'public' loop
    execute format('alter table public.%I enable row level security', t.tablename);
  end loop;

  if exists (select 1 from pg_roles where rolname = 'anon') then
    execute 'revoke all on all tables in schema public from anon';
    execute 'revoke all on all sequences in schema public from anon';
    execute 'alter default privileges in schema public revoke all on tables from anon';
  end if;
  if exists (select 1 from pg_roles where rolname = 'authenticated') then
    execute 'revoke all on all tables in schema public from authenticated';
    execute 'revoke all on all sequences in schema public from authenticated';
    execute 'alter default privileges in schema public revoke all on tables from authenticated';
  end if;
end $$;
