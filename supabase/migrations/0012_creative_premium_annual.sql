-- Adds the annual option for Creative Premium ($199.99/year), previously
-- null (0008_subscriptions.sql) by explicit design decision until a real
-- Stripe annual price existed for it. plan_limits is meant to be updated in
-- place for pricing changes (see its comment in 0008), not re-migrated.

update plan_limits set price_annual_cents = 19999 where plan = 'creative_premium';
