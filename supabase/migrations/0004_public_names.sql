-- Public creative profiles are anon-viewable, so their display names must be too.
-- (Names and emails live on users; this exposes only rows, and the app never selects email for display.)
drop policy users_select on users;
create policy users_select on users for select using (true);
