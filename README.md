# our saturdays

*Things we want to do together.* A private, mobile-first PWA for two people.

Next.js 16 · TypeScript · Tailwind 4 · Framer Motion · Supabase (optional until you connect it). $0 to run.

## Run it

```bash
npm install
npm run dev        # http://localhost:3000
```

With no env vars it runs in **demo mode**: realistic seed data, saved in `localStorage` on that device.

## Environment variables

Copy `.env.example` → `.env.local`:

| var | where from |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase → Project Settings → API |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | same page (the *anon* key) |

Never add the `service_role` key to this app.

## Supabase setup (free tier)

1. Create a project at supabase.com.
2. SQL Editor → run **[`supabase/schema.sql`](supabase/schema.sql)**, then **[`supabase/002_photos_and_realtime.sql`](supabase/002_photos_and_realtime.sql)** (in that order; 002 is safe to re-run). 002 adds the private photo bucket, avatar emoji, realtime, and fixes the sharing policies so your partner can edit things you saved.
3. Authentication → Providers → Email: on. For a two-person app, turn **off** "Confirm email" so sign-up is instant (otherwise the confirmation email must be clicked first; the free tier's built-in mailer is rate-limited).
4. Put the project URL + anon key in `.env.local` (see above) and on your host.
5. Storage should now show a **private** bucket called `media`. Don't make it public.

### First-time setup, in the app

1. Person 1: open the app → "first time? make an account" → then **start our space**. You get an invite code.
2. Person 2: make an account → **I have a code** → paste it. A space holds exactly two people; a third is refused.
3. Both of you can now edit your own name, photo or emoji on the **us** tab. The invite code stays visible there until your person joins.

## How "only between us" works

- **Login gate:** nothing renders until you're signed in *and* in a space.
- **Row Level Security** on every table: you can only read/write rows of your own couple. Tested (see below).
- **Photos are private.** Files live in a non-public bucket under `<couple_id>/…`; the database stores a reference, and the app shows them via 1-hour signed URLs. A copied link stops working.
- No private data is cached in `localStorage` in shared mode. `robots: noindex`.
- Only the public anon key is in the browser; never the service-role key.

## Tests (no Supabase account needed)

Requires local `postgres` (and `postgrest` for the second one): `brew install postgresql@16 postgrest`, then `npm run test:db` / `npm run test:remote`.

- `npm run test:db`: schema + migration (run twice) + RLS behaviour with two couples and an outsider. Caught a real bug (partners couldn't edit each other's items).
- `npm run test:remote`: the app's actual data layer (`lib/remote.ts`) against real Postgres + PostgREST as 3 different users.

**Not covered by automated tests:** Supabase Auth (GoTrue), Storage signed URLs and Realtime against a *real* Supabase project. I drove the full UI (sign-up → create → join → photo upload → partner edit) against a throwaway fake of auth/storage in front of the real Postgres. Do one real run-through on your project before relying on it.

## Install on iPhone

Open the deployed site in **Safari** → Share → **Add to Home Screen**. It launches full-screen with no browser chrome. (iOS needs HTTPS, so deploy first, e.g. Vercel free tier.)

## What's built

- Design system: light + dark themes (follows your phone, or pick one in us → look), paper/ink palette, glass pills, spring interactions, pastel "object" category tiles, map-style backdrop (pure SVG)
- **Login + shared space**: email/password (Supabase Auth), create/join with an invite code, sign out
- **Shared data**: everything you save syncs between your two phones (optimistic UI, live updates via Realtime, and a refresh whenever you reopen the app)
- **Photos**: add photos to anything you save; set a profile photo (or pick an emoji). Photos are resized in the browser and stored privately
- **Home**: next saturday, recently saved, this week, 🎲 surprise us, little-moment mini game (needs both of you in the space)
- **Later**: category bar, status filters, search, cards, `•••` menu (done / maybe / archive / edit / delete)
- **Add sheet**: category → title → done. Links are detected (Instagram / YouTube / Maps / any URL; saved, never scraped)
- **Item detail**, **Us** (stats, profiles), PWA manifest + icons
- **Demo mode** still works with no env vars (local seed data, no login)

## Not built yet

| area | state |
| --- | --- |
| Trips (itinerary, budget) | placeholder screen. Tables + RLS exist |
| Memories (photo wall) | placeholder screen. The private `media` bucket and RLS are ready for it |
| Games | "who saved this?" mini card on Home only; full games + history pending |
| App lock (PIN / passkey / couple challenge) | pending |
| Password reset ("forgot password") | not built. Reset from the Supabase dashboard for now |
| Server-side route protection | not needed for privacy (the shell has no private data; RLS guards the API) but no middleware yet |
| Offline / service worker | pending |

## Free-tier notes

- Supabase free: 500 MB DB, 1 GB storage, projects pause after ~1 week of inactivity (open the dashboard to wake it).
- Storage free tier is 1 GB. Photos are resized to ≤1400px (~150–300 KB each), so that's thousands of photos.
- Realtime free tier is plenty for two people. Phones suspend background connections, so the app also re-syncs when you reopen it.
- Demo mode stores photos as small JPEGs in `localStorage` (~5 MB browser limit).
- Only free/open assets are used. No paid APIs, no AI, no analytics.
- Category icons are hand-drawn SVG (`components/ui/Icon3D.tsx`): no image assets or licenses involved.
