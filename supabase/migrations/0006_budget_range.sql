-- Item 2: budget slider needs real numbers instead of the $/$$/$$$ band.
alter table business_profiles add column if not exists budget_min int;
alter table business_profiles add column if not exists budget_max int;

-- Best-effort backfill so existing profiles show something reasonable until re-saved.
update business_profiles set budget_min = 0, budget_max = 250 where budget_band = '$' and budget_min is null;
update business_profiles set budget_min = 250, budget_max = 1000 where budget_band = '$$' and budget_min is null;
update business_profiles set budget_min = 1000, budget_max = 3000 where budget_band = '$$$' and budget_min is null;
