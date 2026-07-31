# FERDA

Live golf tournament scoring — Ryder Cup–style team events with match play,
best ball, scramble, and 2v1 formats, 9- or 18-hole rounds, USGA handicapping,
live leaderboards, and payouts.

## Architecture

- **Frontend** — React + Vite + Tailwind SPA (`src/`), deployed on Vercel.
- **API** — one Vercel serverless function, `api/exec.ts`, backed by Postgres:
  - `GET /api/exec?action=getTournament` → full tournament JSON
  - `GET /api/exec?action=saveScore&matchId=...&hole=...&side=...&player=...&grossScore=...`
  - `POST /api/exec` with `{ action, ... }` for setup writes (see below)
  - Optional `&t=<slug>` selects a tournament when more than one exists.
- **Database** — Postgres (Supabase recommended). Schema in `db/schema.sql`,
  incremental changes in `db/migrations/`.

### Routes

| Route | Purpose |
| --- | --- |
| `/` | Landing page — every tournament, newest first |
| `/new` | Name a new tournament, then land on its setup page |
| `/t/:slug` | A tournament's leaderboard |
| `/t/:slug/setup`, `/t/:slug/manual`, `/t/:slug/match/:matchId` | Scoped to that tournament |
| `/setup`, `/manual`, `/match/:matchId` | The default tournament (`DEFAULT_TOURNAMENT_SLUG`, or the only one) |

The unslugged routes are kept so links and bookmarks from the single-tournament
era still resolve. The leaderboard is no longer among them: `/` lists all
tournaments, so the default one lives at `/t/<slug>` like the rest.

There is no sign-in, so the landing page is a public index — anyone with the
site URL can see and open every tournament on it.

### Setup actions

Reads are GETs on `/api/exec`: `?action=getTournament` (optionally `?t=<slug>`)
and `?action=listTournaments` for the landing page.

Writes all POST to `/api/exec` with a JSON body, optionally `?t=<slug>`:
`createTournament`, `updateTournament`, `deleteTournament`, `saveCourse`, `deleteCourse`,
`savePlayer`, `deletePlayer`, `saveSession`, `deleteSession`,
`reorderSessions`, `saveMatch`, `deleteMatch`.

Validation lives in `api/_lib/validate.ts` and is authoritative — the UI
mirrors some checks for instant feedback, but nothing reaches Postgres
without passing server-side. Because the schema joins on names (matches
carry player-name arrays, sessions carry a course name), renames cascade
inside a transaction: renaming a player rewrites their matches and scores,
renaming a course repoints its sessions, renaming a session repoints its
matches.

Setup stays editable while scoring is underway — a handicap typo found on
Sunday is fixable on Sunday. Deletes are guarded where they'd orphan data:
a course still used by a session, or a player still in a match, must be
freed first.

> `apps-script/` is the legacy Google Sheets backend from the beta and is no
> longer used by the app. It's kept only as a reference until the migration
> is confirmed, then it can be deleted.

## Creating a tournament

Go to `/new`, name the event, and the setup page covers the rest:

- **Teams** — tournament name and the two team names.
- **Courses** — rating, slope, and the 18-hole card (par + stroke index).
  New courses start as 18 par-4s with stroke indexes 1–18 already filled in,
  so the card is valid from the outset and gets corrected rather than typed
  from blank. Total par is summed from the holes.
- **Players** — name, **handicap index** (the GHIN index, not a course
  handicap — strokes are derived per course), team, and an optional phone
  number for sharing the link.
- **Sessions** — name, game type (Singles / Best Ball / Scramble / 2v1),
  scoring, course, which holes are played, and whether handicaps apply. Each
  session carries its own settings, so a weekend can mix formats freely.
- **Pairings** — matches per session. Side sizes are enforced per format,
  players can only be listed on their own team, and anyone already playing
  that session is greyed out.

There is no sign-in yet, so the tournament URL is the only way back to an
event and anyone holding it can enter scores. The setup page shows the link
for that reason.

### Deleting a tournament

Setup → Teams, at the bottom. It removes the event and everything under it —
courses, players, sessions, pairings and every score — via the schema's
cascades, and there is no undo.

Since a shared link is all it takes to reach setup, the organiser has to type
the tournament's name to confirm. That check runs on the server too, not just
in the UI, so `deleteTournament` can't be driven by a stray request. Links to
a deleted tournament return 404 with a message saying so, rather than an
error page.

### Session rules

**Scoring** decides what a session is worth.

| Scoring | How it settles |
| --- | --- |
| Match Play | Holes won. One point per match, halves split. |
| Stroke Play | Lowest total wins the match. Still one point per match. |
| Total Stroke Play | Every match's total is pooled per team; the margin pays out. |

Total Stroke Play is a session-level result, so no individual match wins
anything. If one team's pairings go 70 and 71 (141) against 69 and 70 (139),
the second team is 2 strokes clear and banks `2 × pointsPerStroke` — one point
at the default rate of 0.5. Level totals are a margin of zero and score
nothing for either side. Each match contributes the score it competes with:
the scramble ball, the best ball on a Best Ball hole, the player's own score in
Singles.

**Holes** — a session plays All 18, the Front 9, or the Back 9. A nine is not
just a shorter round: stroke indexes are re-ranked 1–9 within that nine, and
the handicap is derived from half the index against half the rating. Without
the re-ranking a nine would hand out roughly half the strokes it should, since
courses spread indexes 1–18 across the full round. See `src/lib/holes.ts`.

**Handicaps** — on by default, applying the format's USGA allowance. Switched
off, the session is played gross and no strokes are given anywhere in it.

All three are per session and stay editable mid-tournament like everything
else in setup.

## Backend setup

1. Create a Postgres database. With [Supabase](https://supabase.com): create a
   project, then paste `db/schema.sql` into the SQL editor and run it (or
   `psql "$DATABASE_URL" -f db/schema.sql`). Apply anything in
   `db/migrations/` on top of an existing database.
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
   results and the tournament winner.

   Setup now closes the *source* of this: the course picker is required,
   `sessions.course_name` is `not null`, the API rejects a session naming a
   course that doesn't exist, and course renames repoint their sessions. So
   a tournament built in the app can't reach the fallback. The `?? courses[0]`
   expressions themselves are still there for data imported by other means,
   and should be made loud rather than silent.

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
