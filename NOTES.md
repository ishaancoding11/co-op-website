# Co-op — decisions & assumptions

## Confirmed with founder
- Schema approved 2026-07-23 with three amendments (below).
- `musician_details` is its own 1:1 table, not JSON on `creative_profiles`.

## Amendments from schema review
1. **Freemail blocklist is data, not DDL.** `freemail_domains` table (seeded with 16 common providers) checked at runtime by `start_business_verification()`. Edit the list in the Supabase dashboard; no migration needed.
2. **Passes are final in the MVP UI, reversible in data.** Each side owns its `business_action`/`creative_action` column and may UPDATE it (`passed → liked`); rows are never deleted. A "review passed profiles" screen is pure-UI V2. Accepting a job application from someone you previously passed flips the same row and can still match.
3. **Blocking is enforced in RLS**, via `is_blocked(a,b)` security-definer helper used in the jobs/creative_profiles/business_profiles select policies, matches insert, and messages insert (blocking mid-thread freezes the thread). See 0001_init.sql.

## Architecture decisions
- **Role = which profile rows exist.** One auth user may hold both a creative and a business profile. UI picks an "active side" via a `role` cookie set at role-choose; switchable in Settings.
- **One `matches` table** for swipes, applications, and direct outreach (`source` column). `is_matched` + `matched_at` are trigger-owned (`match_guard`): mutual `liked` OR `application_status = 'accepted'` ⇒ matched. Clients cannot write match state; a BEFORE trigger also stops each side writing the other side's columns.
- **Both-parties-complete**: per-side timestamps on `agreements`; BEFORE trigger flips `status='completed'` when both set; AFTER trigger marks the job completed, auto-inserts a `portfolio_items` row (`source='completed_job'`, hideable), and sends review-request notifications.
- **Verification is server-only.** Tokens hashed (sha256) in `business_verifications` (no client RLS access). `start_business_verification` RPC returns the raw token to the server action, which emails the confirm link via Resend. `confirm_business_verification` flips `is_verified`; the business_update policy prevents self-verifying.
- **Notifications** are inserted only by DB triggers (`notify()` security definer). Emails are sent best-effort from server actions via Resend; `emailed_at` stamps sends. If `RESEND_API_KEY` is unset, email sending is skipped gracefully (in-app notifications still work).
- **No payments.** No fee/commission/escrow anywhere. `agreements.payment_status`/`payment_ref` exist but are frozen by the `agreement_guard` trigger (not client-writable) — reserved for V2 optional zero-commission pass-through. Agreement UI states: "Payments are handled directly between you two — Co-op charges no fees."
- **Neighborhoods are plain text** (no geolocation/maps in MVP).
- **UI kit:** hand-rolled design-system components (Button, Card, Tag, Avatar, Rating, PriceTag, StatusBadge, VerifiedBadge, EmptyState, BottomNav) in the shadcn idiom rather than the shadcn CLI — keeps the coastal/editorial look fully custom; Framer Motion powers swipe + match moment.
- **Next.js 16 note:** root middleware convention is `proxy.ts` (not `middleware.ts`).

## V2 / out of scope (deliberate)
- Optional zero-fee pass-through payments (schema stub only), subscriptions/premium tiers (future monetization — never per-transaction fees), deeper identity verification, geolocation/maps, push notifications, admin/moderation dashboard (reports are data-capture only, review via Supabase dashboard), dispute resolution, "review passed profiles" screen, response-time auto-computation from message latency.

## Operational
- Migration: `supabase/migrations/0001_init.sql` — run in Supabase SQL editor.
- Seed: `supabase/seed.sql` — demo creatives/businesses/jobs (inserts demo rows into auth.users; dev only).
- Env: see README (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `RESEND_API_KEY`, `NEXT_PUBLIC_SITE_URL`).
- Google OAuth must be enabled in Supabase Auth providers (dashboard) with the app's callback URL.
