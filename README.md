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
2. SQL Editor → run **[`supabase/schema.sql`](supabase/schema.sql)**, then **[`002_photos_and_realtime.sql`](supabase/002_photos_and_realtime.sql)**, then **[`003_interactions.sql`](supabase/003_interactions.sql)**, then **[`004_memories.sql`](supabase/004_memories.sql)**, then **[`005_drawings_trips_games_calendar.sql`](supabase/005_drawings_trips_games_calendar.sql)** (in that order; 002–005 are safe to re-run, in any order). 005 adds the drawing board, trips, games and the private calendar link. 003 adds the ❤️ 👀 📅 reactions and 004 the memory journal's extras; without them the app still works, just without those features. 002 adds the private photo bucket, avatar emoji, realtime, and fixes the sharing policies so your partner can edit things you saved.
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
- `npm run test:remote`: the app's actual data layer (`lib/remote.ts`) against real Postgres + PostgREST as 3 different users (30 steps, including reactions, memories, drawings, trips, games).
- `npm run test:logic`: the shared-interest rules, Saturday candidates, picker weighting, insights (which must stay silent without enough data), the activity feed, trips/budget maths, the word-game and remember-when rules, the iCal reader (time zones, repeats), the drawing helpers, and the link-preview safety checks (SSRF guards). No database needed.

**Not covered by automated tests:** Supabase Auth (GoTrue), Storage signed URLs and Realtime against a *real* Supabase project. I drove the full UI (sign-up → create → join → photo upload → partner edit) against a throwaway fake of auth/storage in front of the real Postgres. Do one real run-through on your project before relying on it.

## Save from Instagram on iPhone

iOS doesn't let web apps appear in the Share menu, so there are two ways:

**No setup (easiest):** in Instagram tap Share → **Copy link**, open the app, tap **🔗 paste a link** on Home. It saves instantly.

**One-time Shortcut** (then it's Share → our saturdays):
1. Open the **Shortcuts** app → tap **+** (top right) → tap the name at the top and call it `our saturdays`.
2. Turn on sharing: back on the shortcut list, **press and hold** `our saturdays` → **Details** → switch on **Show in Share Sheet**. (Inside the editor the same settings are behind the ⓘ / settings icon near the ▶ button; its position varies by iOS version.) Then, at the top of the editor, tap **Any** in "Receive **Any** input from Share Sheet" and keep only **URLs** ticked.
3. Tap **Add Action** → search **Text** → add it. Type your app's address followed by `/share?url=` (for example `https://your-app.vercel.app/share?url=`). Then tap at the end of that text, tap the **Shortcut Input** variable that appears above the keyboard, and pick it.
4. Add another action: **Open URLs** (search "Open URLs"). It should already use the Text from step 3. Tap **Done**.
5. In Instagram, YouTube, or Maps: **Share → scroll the share sheet → our saturdays.**

The link opens in Safari, so stay signed in there as well as in the installed app.

## Install on iPhone

Open the deployed site in **Safari** → Share → **Add to Home Screen**. It launches full-screen with no browser chrome. (iOS needs HTTPS, so deploy first, e.g. Vercel free tier.)

## What's built

- Design system: light + dark themes (follows your phone, or pick one in us → look), paper/ink palette, glass pills, spring interactions, pastel "object" category tiles, map-style backdrop (pure SVG)
- **Login + shared space**: email/password (Supabase Auth), create/join with an invite code, sign out
- **Shared data**: everything you save syncs between your two phones (optimistic UI, live updates via Realtime, and a refresh whenever you reopen the app)
- **Photos**: add photos to anything you save; set a profile photo (or pick an emoji). Photos are resized in the browser and stored privately
- **Shared finds, no maintenance**: one saved item has one creator; ❤️ 👀 📅 reactions (tap again to undo) live in their own table, so nothing is ever copied. *my finds / their finds / our list* fill themselves: it lands in **our list** once you both show interest (saving counts as the creator's interest). Lines like "you both like this ❤️" or "Aarav wants to do this Saturday 👀" are derived from reactions, not stored statuses. "Not for us" (in •••) quietly removes it from our list and the picker.
- **Home**: greeting, **saturday? 👀** (what you both like or said "saturday?" to, with *lock it*, plus 🎲 pick for us, weighted toward mutual interest and never repeating what it just showed), *from you / from them* with a one-tap ❤️, **lately** (a true sentence about your week, plus observations that only appear when the data supports them), a small activity feed (`/activity`), and the little who-saved-this game
- **Capture from outside**: Android share menu (installed PWA), an iPhone Shortcut (see *Save from Instagram on iPhone* below), or **paste a link** on Home. It saves instantly ("Saved from Instagram") and fills in a real title/image if a safe preview exists (YouTube, Google Maps place names, normal websites). Instagram/TikTok/Facebook are never fetched, only the link is kept. Re-sharing a link doesn't duplicate it
- **Memories**: a full-screen **swipe** view: swipe up/down between memories, left/right through a memory's photos (a ▦ button switches to a month-by-month wall). **+** on this screen opens your photo picker directly; the sheet then asks only for *where* and (optionally) a few words, because **the date is read from the photo itself** (EXIF, earliest across the photos you picked; never GPS, and the stored copy carries no EXIF). If a photo has no date you're asked to pick one. [older description follows] a private photo wall grouped by month. Add up to 10 photos, a title, when/where, and a few words; a finished find has a **📸 add a memory** button that prefills it and links the two. Photos are private (signed links), partners can edit each other's memories, and a new memory shows on Home and in the activity feed
- **Drawing board** (`/draw`, or 🎨 on Home): a shared doodle canvas (finger or pencil, colours, sizes, eraser, undo). Send it and it shows on your partner's Home ("new drawing") and in the activity feed; drawings live in a gallery under *ours*
- **Trips** (`/trips`): a mini-space per trip: overview, places, food, stay, things to do, a day-by-day itinerary, an optional budget (with who paid), and memories tagged to the trip. Saved finds that mention the destination are suggested ("looks like these are for Goa"). The next trip appears on Home. Tag any memory to a trip from its ••• menu
- **Games** (`/games`, also from us): *guess the word* (leave a word + hint, unlimited guesses, history), the full *who saved this?* with history and score, and *remember when?* (which month, or where, a photo was taken)
- **Small things**: an embedded OpenStreetMap preview on a saved place (tap "show on map"; free, no key), and grouped feed lines like "you both saved 3 things for Goa"
- **Saturday time + calendar**: optionally give the plan a time ("Saturday · 6 PM"), **add it to your calendar** (an .ics file or Google Calendar link), and see what's already on **your** calendar that day. To connect it: us → *your calendar* → paste your calendar's private iCal address (Google Calendar: Settings → your calendar → Integrate → *Secret address in iCal format*). It is read-only, stored so only you can read it, and fetched by the server on demand
- **Resilient**: reactions update instantly; if a save fails the reaction reverts and a "retry" notice appears; offline banner; unsent add-form text survives a reload
- **Later**: category bar, status filters, search, cards, `•••` menu (done / maybe / archive / edit / delete)
- **Add sheet**: category → title → done. Links are detected (Instagram / YouTube / Maps / any URL; saved, never scraped)
- **Item detail**, **Us** (stats, profiles), PWA manifest + icons
- **Demo mode** still works with no env vars (local seed data, no login)

## Not built yet

| area | state |
| --- | --- |
| App lock (PIN / passkey / couple challenge) | pending |
| Password reset ("forgot password") | not built. Reset from the Supabase dashboard for now |
| "Together since" date | pending |
| Offline queue / cached data | you get an offline banner, a retry on failed reactions, and kept form drafts; there's no offline cache or queued writes |
| Server-side route protection | not needed for privacy (the shell has no private data; RLS guards the API) but no middleware yet |
| Real calendar write-back | "add to calendar" hands you a file/link; it never writes to your calendar itself. Only *your own* calendar can be read, not your partner's |

Known limits: a guess-the-word answer is stored as plain text, so someone determined with dev tools could peek; map lookups use free OpenStreetMap/Nominatim (a place it can't find gets no map).

## Free-tier notes

- Supabase free: 500 MB DB, 1 GB storage, projects pause after ~1 week of inactivity (open the dashboard to wake it).
- Storage free tier is 1 GB. Photos are resized to ≤1400px (~150–300 KB each), so that's thousands of photos.
- Realtime free tier is plenty for two people. Phones suspend background connections, so the app also re-syncs when you reopen it.
- Demo mode stores photos as small JPEGs in `localStorage` (~5 MB browser limit).
- Only free/open assets are used. No paid APIs, no AI, no analytics.
- Category icons are hand-drawn SVG (`components/ui/Icon3D.tsx`): no image assets or licenses involved.
