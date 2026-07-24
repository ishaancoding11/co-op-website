# Co-op

Two-sided local marketplace connecting small businesses with nearby freelance creatives (Newport Beach & Corona del Mar pilot). Swipe-style discovery, Indeed-style job posts, Fiverr-style profiles & reviews — and **zero platform fees**.

## Stack
Next.js 16 (App Router, TS, Tailwind v4) · Supabase (Postgres + RLS, Auth w/ Google, Storage, Realtime) · Resend (email) · Framer Motion.

## Setup

1. **Env** — `.env.local`:
   ```
   NEXT_PUBLIC_SUPABASE_URL=...
   NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=...
   NEXT_PUBLIC_SITE_URL=http://localhost:3000
   RESEND_API_KEY=...            # optional in dev; emails are logged/skipped without it
   RESEND_FROM="Co-op <notify@yourdomain.com>"   # optional
   ```
2. **Database** — in the Supabase SQL editor run, in order:
   - `supabase/migrations/0001_init.sql` (schema, RLS, triggers, buckets)
   - `supabase/seed.sql` (demo creatives/businesses/jobs — dev only)
3. **Google OAuth** — Supabase dashboard → Auth → Providers → Google: enable, add your Google OAuth client, and add `http://localhost:3000/auth/callback` (and your prod URL) to redirect allow-lists.
4. **Run**:
   ```
   npm install
   npm run dev
   ```

## Key flows
- Landing → choose role → Google sign-in → onboarding (creative profile, or business profile + email verification).
- Business verification requires a non-freemail email (editable blocklist in `freemail_domains` table) + Resend confirmation link. Unverified businesses cannot post jobs (enforced by RLS, not just UI).
- Discovery: businesses swipe creatives (`/discover`) or browse/filter (`/browse`); creatives browse/apply to jobs (`/jobs`). Mutual interest (or an accepted application) = match → DM thread unlocks (`/matches`, `/messages/[id]`).
- Agreements (`/agreements`): scope + price, both parties mark complete → job auto-added to creative's portfolio (hideable), review requests go out. Reviews are public, both directions.
- No payments anywhere by design — see NOTES.md.

See `NOTES.md` for decisions, RLS notes, and V2 items.
