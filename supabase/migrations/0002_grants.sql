-- Base table-level grants for Supabase's anon/authenticated roles.
-- RLS policies (0001_init.sql) restrict *rows*; Postgres also requires a
-- table-level GRANT before it will even evaluate those policies. Tables
-- created via the dashboard get this automatically — tables created via
-- raw SQL (as in 0001_init.sql) do not, hence "permission denied for table X".

grant usage on schema public to anon, authenticated;

grant select, insert, update, delete on all tables in schema public to authenticated;
grant select on all tables in schema public to anon;

grant execute on all functions in schema public to anon, authenticated;

-- Ensure any tables/functions added later also get these grants automatically.
alter default privileges in schema public grant select, insert, update, delete on tables to authenticated;
alter default privileges in schema public grant select on tables to anon;
alter default privileges in schema public grant execute on functions to anon, authenticated;
