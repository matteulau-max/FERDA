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
| `/t/:slug/manual` | That tournament's manual — schedule, rules, wagers, roster, lodging |
| `/t/:slug/setup`, `/t/:slug/manual`, `/t/:slug/match/:matchId` | Scoped to that tournament |
| `/setup`, `/manual`, `/match/:matchId` | The default tournament (`DEFAULT_TOURNAMENT_SLUG`, or the only one) |

The unslugged routes are kept so links and bookmarks from the single-tournament
era still resolve. The leaderboard is no longer among them: `/` lists all
tournaments, so the default one lives at `/t/<slug>` like the rest.

There is no sign-in, so the landing page is a public index — anyone with the
site URL can see and open every tournament on it.

### Setup actions

Reads are GETs on `/api/exec`: `?action=getTournament` (optionally `?t=<slug>`)
and `?action=listTournaments` for the landing page. `readScorecard` is a POST
because it carries an image, but it touches no tournament data — see
[Reading a scorecard from a photo](#reading-a-scorecard-from-a-photo).

Writes all POST to `/api/exec` with a JSON body, optionally `?t=<slug>`:
`createTournament`, `updateTournament`, `deleteTournament`, `saveCourse`, `deleteCourse`,
`savePlayer`, `deletePlayer`, `saveSession`, `deleteSession`,
`reorderSessions`, `saveMatch`, `deleteMatch`, `reorderMatches`, `saveManual`.

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
  from blank. Total par is summed from the holes. A photo of the scorecard
  can fill it in — see below.
- **Players** — name, **handicap index** (the GHIN index, not a course
  handicap — strokes are derived per course), team, and an optional phone
  number for sharing the link.
- **Sessions** — name, game type (Singles / Best Ball / Scramble / 2v1),
  scoring, course, which holes are played, and whether handicaps apply. Each
  session carries its own settings, so a weekend can mix formats freely.
- **Pairings** — matches per session. Side sizes are enforced per format,
  players can only be listed on their own team, and anyone already playing
  that session is greyed out.

Those five are *the competition* — the minimum to score an event. A second row,
*the manual*, covers what the players read. All of it is optional:

- **Schedule** — the dates and location under the tournament name, plus rows of
  Day / Time / Event, each markable as a meal and optionally linked to a
  session so it carries that round's badges.
- **Rules** — see below.
- **Wagers** — a buy-in per pool.
- **Lodging** — off by default; switching it on adds a Lodging tab.

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

### Running order

Sessions appear on the leaderboard in the order set under **Setup → Sessions**,
and each session's matches in the order set under **Setup → Pairings**. Both
use the ▲/▼ buttons on each row, and both save the moment they're tapped.

Not drag-and-drop, deliberately: this gets used one-handed on a phone, and a
drag begun inside a scrolling list is easy to start by accident and easy to
drop in the wrong place.

The server reconciles the order it's sent against what actually exists, so a
session or match added from another phone in the meantime is kept and trails
the rows that were listed, rather than being dropped or left fighting for the
same position. Matches are reordered within their own session's positions, so
putting one session in order never disturbs another.

### Tee times

Each match can carry a tee time — set it under **Setup → Pairings**, on the
match. It shows on the leaderboard directly above that match's status, inside
the score pill:

```
                8:00 AM
Christopher     thru 5      Konstantinos
```

The pill's centre column is a fixed width, so a tee time can never widen it and
squeeze the player names on either side; text too long for the column shrinks
to fit instead.

Times are stored as `HH:MM` on a 24-hour clock (`matches.tee_time`) and shown
on a 12-hour one. They're wall-clock times at the course, deliberately not
timestamps: there's no date behind them and no time zone, so an 8:10 tee time
reads as 8:10 to everyone, including someone following the leaderboard three
states away.

Tee times are optional. A match without one shows just its status, exactly as
before.

### Tee boxes

**One course row is one set of tees.** A course is rated separately from each
tee box — the back tees of the same course might be 74.1/141 where the forward
tees are 69.4/126 — and rating and slope are what the course-handicap formula
turns an index into. Par and stroke index are shared across the whole card.

So to play two tee sets, add two courses: *Patriot Hills — Blue* and
*Patriot Hills — White*, same hole card, different rating and slope. Sessions
pick a course, which means a session picks a tee set — a morning round off the
blues and an afternoon round off the whites is just two sessions on two course
rows.

The cost is that the hole card gets entered twice, and a stroke-index
correction has to be made in both places. Scanning the same photo twice makes
that cheap, but tees are not a first-class concept in the schema, and every
player in a session plays the same tees. Mixed tees within one match would need
a per-player tee and a change to how the relative handicap offset is computed.

### Reading a scorecard from a photo

Setup → Courses → **Photograph a scorecard**. The photo goes to Claude, which
reads the par and stroke index for each hole plus the rating and slope of
**every tee set on the card**, and the card is filled in for the organiser to
check.

Tee sets are offered rather than chosen: a card rating three tees comes back
with all three, the hole card applies immediately, and rating and slope stay at
their defaults until one is picked — the picker shows each tee's numbers so the
choice is visible. Picking one names the course for it (*Patriot Hills GC —
Blue*), which is what keeps two tee sets from becoming two identically named
courses. Where a card rates a tee separately for men and women, both come back
as separate entries.

**It is a draft, never a save.** The read lands in the form and only the
organiser's Save button writes anything. This is deliberate: a misread stroke
index silently misallocates handicap strokes in every match on that course, and
nothing downstream would catch it. Holes that came from the photo are marked, so
it's obvious which rows are a machine's reading and which are still defaults.

Nothing about the read is trusted. Structured outputs constrain the JSON shape,
but not whether a par is 4 or 40 — so `api/_lib/scorecard.ts` re-checks every
value and drops anything out of range with a note rather than passing it
through. A hole the reader skips keeps its existing values instead of
inheriting a neighbour's.

**Setting it up.** The feature is off unless `ANTHROPIC_API_KEY` is set; without
it the button returns a message saying so and the rest of setup is unaffected.

1. Sign up at [console.anthropic.com](https://console.anthropic.com), then
   **Settings → Billing** and add credit. Reads are billed per use, not monthly.
2. **API keys → Create key**, and copy it. It's shown once.
3. In Vercel: **Project → Settings → Environment Variables**, add
   `ANTHROPIC_API_KEY` with that value, ticked for **Production** *and*
   **Preview**. Redeploy.

The key is read on the server, in `api/exec.ts`. Never give it a `VITE_`
prefix — those are compiled into the browser bundle and readable by anyone who
opens devtools.

**Cost and abuse.** A read is one Claude call on a downsized photo — roughly a
couple of US cents at the time of writing; check current
[pricing](https://claude.com/pricing#api). The browser shrinks the photo to
2000px on the long edge before uploading, which keeps the print legible without
paying for pixels nobody reads.

Because there's no sign-in, anyone holding a tournament link can call this
endpoint, so it's capped at **40 reads per tournament per UTC day**, counted in
Postgres (`ai_usage`). A cap held in process memory would reset every time a
serverless instance recycled and cap nothing. Requests rejected for a bad image
or missing configuration don't count against it.

## The manual

Every tournament gets its own manual at `/t/:slug/manual` — schedule, rules,
wagers, roster, lodging, and how to work the app. It's built from three
sources, and keeping them apart is the point:

| | Where it comes from |
| --- | --- |
| Rounds, roster, points on the board, payouts | The tournament itself |
| How handicaps and format allowances work | Fixed copy, driven by `constants.ts` |
| Local rules, schedule, stakes, lodging | Setup → the manual sections |

Nothing derivable is ever typed twice, so the manual can't drift from what's
being scored. The handicap cards aren't editable for the same reason: editing
them would change the description of the maths, not the maths.

Every rule has a recommended default, so an organiser who fills in none of this
still gets a complete manual. Tabs with nothing behind them are dropped rather
than shown empty — an untouched tournament has two tabs, a four-day trip has
six.

The stored document is a patch over those defaults (`manualDoc()` in
`src/lib/manual.ts`), which is why a tournament created before any of this
existed still renders. It lives in one `tournaments.manual` jsonb column;
sections are written one at a time and merged with `||`, so editing the
schedule on a phone can't wipe rules set on a laptop. Validation is in
`api/_lib/manual.ts` and is authoritative — the column enforces nothing.

**What the rules cover.** Code of conduct (free text), out of bounds and lost
ball (penalty strokes, drop or back to the tee, search time, gallery drops),
maximum score, mulligans, concessions, pace of play, equipment, scramble
placement, and any number of the organiser's own rules. The app does not
enforce a maximum score — it accepts any gross — and the manual says so
wherever the cap is mentioned.

**Wagers.** Four buy-ins: matchups, the Cup, Golfer of the Tournament, and
skills. How each settles is fixed logic in `src/lib/payouts.ts`; only the
amounts are configurable. Every figure is net, so each pool ties to zero. A
pool left at 0 drops off the board, and with all four at 0 the Wagers tab still
shows the points race but no money. Golfer of the Tournament scales with the
field: the winner takes `buyIn × (players − 1)`.

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
