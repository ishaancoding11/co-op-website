-- Item 3: weekly availability picker; Item 6: portfolio highlights
alter table creative_profiles add column if not exists available_days text[] not null default '{}';
alter table portfolio_items add column if not exists is_favorite boolean not null default false;
