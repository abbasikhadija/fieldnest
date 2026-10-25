-- ONLY for the isolated native-PostgreSQL test database. Supabase owns these
-- roles/schema/functions in a real stack. This is never a production migration.
create role anon nologin;
create role authenticated nologin;
create role service_role nologin bypassrls;
create schema auth;
create table auth.users (id uuid primary key, email text unique not null);
create function auth.uid() returns uuid language sql stable as $$
  select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid;
$$;
grant usage on schema auth, public to anon, authenticated, service_role;
grant execute on function auth.uid() to anon, authenticated, service_role;
insert into auth.users(id,email) values
('20000000-0000-4000-8000-000000000001','inspector-a@example.test'),
('20000000-0000-4000-8000-000000000002','inspector-b@example.test'),
('20000000-0000-4000-8000-000000000003','unassigned@example.test');
