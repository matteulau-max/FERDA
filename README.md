# FERDA

Live golf tournament scoring — Ryder Cup–style team events with match play,
best ball, scramble, and 2v1 formats, USGA handicapping, live leaderboards,
and payouts.

## Architecture

- **Frontend** — React + Vite + Tailwind SPA (`src/`), deployed on Vercel.
- **API** — one Vercel serverless function, `api/exec.ts`, backed by Postgres:
  - `GET /api/exec?action=getTournament` → full tournament JSON
  - `GET /api/exec?action=saveScore&matchId=...&hole=...&side=...&player=...&grossScore=...`
  - Optional `&t=<slug>` selects a tournament when more than one exists.
- **Database** — Postgres (Supabase recommended). Schema in `db/schema.sql`.

> `apps-script/` is the legacy Google Sheets backend from the beta and is no
> longer used by the app. It's kept only as a reference until the migration
> is confirmed, then it can be deleted.

## Backend setup

1. Create a Postgres database. With [Supabase](https://supabase.com): create a
   project, then paste `db/schema.sql` into the SQL editor and run it (or
   `psql "$DATABASE_URL" -f db/schema.sql`).
2. Copy the connection string from the dashboard's **Connect** button and set
   it as `DATABASE_URL` in your Vercel project env vars. Prefer the
   transaction pooler (port 6543) for serverless; if it refuses connections,
   use the session pooler (5432).
3. Import a tournament, either directly into the database:

   ```sh
   # from the old Apps Script / existing deployment...
   DATABASE_URL=... node scripts/seed.mjs \
     --source https://your-app.vercel.app/api/exec \
     --slug ferda-2026 --name "FERDA Invitational"

   # ...or from a TournamentData JSON file (see src/lib/types.ts for the shape)
   DATABASE_URL=... node scripts/seed.mjs --source tournament.json --slug ferda-2026
   ```

   ...or, with no database credentials on hand, emit SQL to paste into the
   Supabase SQL editor:

   ```sh
   node scripts/seed.mjs --source tournament.json \
     --slug ferda-2026 --name "FERDA Invitational" --emit-sql seed.sql
   ```

   Re-run with `--force` to replace an existing tournament.

   Older Apps Script deployments did not serve a `courseName`, and the app
   quietly fell back to the first course in the list. Assign courses
   explicitly at import with `--session-course "<session>=<course>"` (repeat
   per session), and/or `--default-course "<name>"` to cover the rest:

   ```sh
   node scripts/seed.mjs --source tournament.json --slug ferda-2026 \
     --session-course "Saturday PM=NYCC" \
     --default-course "Patriot Hills" --emit-sql seed.sql
   ```
4. Set `VITE_API_URL=/api/exec` in the Vercel env vars and redeploy.

See `.env.example` for all variables.

## Known issues to address before general use

Both surfaced while migrating the 2026 tournament. Neither blocks the
Postgres swap; both matter once other people run their own events.

1. **Silent course fallback.** Six call sites resolve a session's course with
   `courses.find((c) => c.name === session.courseName) ?? courses[0]`
   (`matchPlay.ts`, `payouts.ts`, `bestGolfer.ts`, `Leaderboard.tsx`,
   `Scorecard.tsx`, `HeroScoreboard.tsx`). A session with a missing or
   misspelled course silently scores against the wrong card instead of
   failing loudly. The 2026 data had no `courseName` at all, so every session
   was computed against Patriot Hills; correcting it changed five match
   results and the tournament winner. Make the course required in the setup
   wizard and surface the fallback rather than hiding it.

2. **Handicaps are not frozen.** Results are recomputed from *current*
   handicap indexes on every load, so editing a player's index silently
   rewrites the scores of tournaments that already finished. Per-tournament
   `players.handicap_index` (this schema) at least stops one event from
   affecting another, but the index should also be locked once a tournament
   starts — a completed match should keep the strokes it was actually played
   off, not the strokes the roster says today.

## Local development

```sh
npm install
npm run dev        # frontend on http://localhost:5173 (mock data when VITE_API_URL is unset)
npm run build      # typecheck + production build
npx tsc -p api --noEmit   # typecheck the serverless API
```

Without `VITE_API_URL` the app renders the built-in mock tournament from
`src/lib/mockData.ts`, so UI work needs no backend at all.
