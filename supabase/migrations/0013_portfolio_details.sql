-- Richer portfolio pieces: creatives can attach an external project link, the
-- year the work was made, and free-form tags. All optional and additive — old
-- rows keep working with these left null/empty.

alter table portfolio_items add column if not exists project_url text;
alter table portfolio_items add column if not exists project_year int
  check (project_year is null or (project_year between 1900 and 2100));
alter table portfolio_items add column if not exists tags text[] not null default '{}';
