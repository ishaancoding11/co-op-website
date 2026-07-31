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

## Iteration 3 decisions (2026-07-24)
- **Roles locked at signup** (item 9): enforced in three layers — UI (no create/switch paths), route guards (onboarding + auth callback redirect to the existing role's home), and DB trigger `enforce_single_role()` (0007). Existing dual-role accounts keep both profiles; the lock applies to *adding* a second role.
- **Account deletion** (item 8): `delete_account()` security-definer RPC deletes the auth user; FK cascades wipe all app rows. Uploaded storage files are NOT auto-deleted (no FK from storage.objects) — V2 cleanup job.
- **Signup gate** (item 3): non-dismissable by design, every page, scroll-triggered; exempt on /login, /verify/*, /auth/* so signup itself isn't blocked.
- **Business "needs"** (item 2): free-text `needs_description` replaces the category-array picker in the form; old `needs` column kept for existing rows (display falls back to it).
- **Geolocation** (item 11): browser permission → nearest-city snap via hardcoded CITY_COORDS (no external geocoding API); lat/lng stored as soft signal only.
- **Role homes**: business = /browse (logo + landing redirect), creative = /jobs. Distinct nav shells per role (item 10).

## Iteration 4 — subscriptions (2026-07-31)
Adapted from a teammate's separate project (public repo `eroxa090/Co-Op`), technical foundation only:
- **Taken**: the `plan_limits`/`subscriptions` table pattern, `current_plan()`-style lookups, `apply_subscription()` as a service-role-only RPC called exclusively from the Stripe webhook, and the Stripe wiring shape (lazy client, env-driven Price ids, Checkout, billing portal, signature-verified webhook).
- **Discarded entirely**: his 10% commission/escrow system (`payment_intents`, `payouts`, `payout_accounts`, `ledger_entries`, Stripe Connect), his 6-plan structure and `$4/$9/$15/$39` pricing, his permanent free tier, and all Kazakhstan/KZT/multi-currency/multi-language scaffolding. Co-op takes no cut of any job — subscriptions are platform-access only.
- **Our plans** (`plan_limits`, seeded in 0008): `creative_basic` ($11.99/mo or $119.99/yr, 5 accepted jobs/month), `creative_premium` ($19.99/mo only, unlimited + priority placement), `business_standard` ($54.99/mo or $559.99/yr, up to 15 active job posts + priority placement).
- **Trial ≠ his permanent free tier.** Every profile gets `trial_ends_at = created_at + 1 month`. During the trial the allowance is **one lifetime item** (1 accepted job for creatives, 1 posted job for businesses) — not monthly, not renewing. After the trial window OR after that one slot is used (whichever first) without an active subscription, new accepts/posts are blocked; existing matches, messages, and agreements remain fully usable.
- **Quota is charged at agreement creation**, not at job application — applying stays free/unlimited, matching the existing app flow. This differs from the teammate's repo where application-accept and agreement-creation are one atomic step; in our schema they're separate (`matches.application_status` vs. the `agreements` table), so `agreements_quota_guard` (BEFORE INSERT trigger) is the enforcement point. `jobs_quota_guard` (BEFORE INSERT trigger) does the equivalent for business job posts.
- **Priority placement** (not present in the teammate's repo): creative_premium ranks above other creatives in `/browse` and `/discover`; subscribed businesses rank above non-subscribers in `/jobs`. V2 could extend ranking to a proper weighted score.
- Requires new env vars: `SUPABASE_SERVICE_ROLE_KEY`, `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, and 5 `STRIPE_PRICE_*` ids (see `.env.local`). Without them, `/billing` renders and the trial/quota logic works fully — only the actual Checkout/webhook calls need the keys.

## Iteration 4 — remaining items (2026-07-31)
- **Guest job browsing** (item 1): `/jobs` now uses the same card-grid layout as `/browse`; signed-out visitors see title/category/price/days-remaining but not the posting business's name (shown only after sign-in) — mirrors the existing signed-out preview pattern already used on `/browse`.
- **Log in + session persistence** (item 2): added a "Log in" entry point (nav + landing) separate from "Get started." While implementing this I found `proxy.ts` was only calling `supabase.auth.getUser()` (the call that actually refreshes and rewrites session cookies) on `/creatives/[id]` requests — a **pre-existing bug from the original scaffold**, not something introduced this iteration, but it meant sessions on every other route were never refreshed and would silently expire after the access-token TTL (~1h). Fixed: `getUser()` now runs on every matched request; the guest-profile-view gate logic reuses that same result instead of calling it a second time.
- **Visual consistency** (item 3): `/jobs` cards now match `/browse` cards structurally (same `Card`, header-block sizing, badge placement). `/business/[id]` was rebuilt to mirror `/creatives/[id]`'s structure exactly — same gradient-ring avatar header, stats row, info block, section styling — just without a portfolio grid (businesses don't have one).
- **Custom dropdowns** (item 4): every native `<select>` in the app now renders through a new `Select` component (`components/ui.tsx`) — real `<select>` under the hood (native keyboard/a11y/form behavior preserved) with OS chrome stripped via `appearance-none` and our own chevron/colors drawn on top. `LocationSelect` and the geolocation-aware `LocationField` both route through it.
- **Profile pictures + inline business edit** (item 5): `avatars` storage bucket already existed from the original schema (RLS policies, unused until now) — `saveCreativeProfile`/`saveBusinessProfile` now accept an optional file and upload to it. `/business/[id]` gained an "Edit profile" button for the owner, same position/pattern as the creative profile's.
- **Email/password auth** (item 8): added alongside Google OAuth, not replacing it. Sign-up calls `supabase.auth.signUp()`; if the project requires email confirmation (no session returned), the UI shows a "check your inbox" state instead of assuming success. New sign-ups pass through the same role-cookie logic as the OAuth callback. Login/signup share one toggling client component (`app/login/email-password-form.tsx`).
- Item 7 was explicitly skipped per instructions — revisit later.

## Operational
- Migration: `supabase/migrations/0001_init.sql` — run in Supabase SQL editor.
- Seed: `supabase/seed.sql` — demo creatives/businesses/jobs (inserts demo rows into auth.users; dev only).
- Env: see README (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `RESEND_API_KEY`, `NEXT_PUBLIC_SITE_URL`).
- Google OAuth must be enabled in Supabase Auth providers (dashboard) with the app's callback URL.
