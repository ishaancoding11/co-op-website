-- Split out into its own migration on purpose: ALTER TYPE ... ADD VALUE
-- cannot safely be used in the same transaction that also references the new
-- value (Postgres restriction). Run this migration by itself, let it commit,
-- then run 0020_pay_on_first_match.sql.
--
-- 'pending' represents the new "$0, unbilled" subscription state used by the
-- new business model (subscribe now, don't pay until your first match) —
-- see 0020_pay_on_first_match.sql for the full change.

alter type subscription_status add value 'pending';
