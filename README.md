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
   project, then run `db/schema.sql` in the SQL editor (or
   `psql "$DATABASE_URL" -f db/schema.sql`).
2. Grab the **Transaction pooler** connection string
   (Project Settings → Database → Connection string → Transaction) and set it
   as `DATABASE_URL` in your Vercel project env vars.
3. Import a tournament:

   ```sh
   # from the old Apps Script / existing deployment...
   DATABASE_URL=... node scripts/seed.mjs \
     --source https://your-app.vercel.app/api/exec \
     --slug ferda-2026 --name "FERDA Invitational"

   # ...or from a TournamentData JSON file (see src/lib/types.ts for the shape)
   DATABASE_URL=... node scripts/seed.mjs --source tournament.json --slug ferda-2026
   ```

   Re-run with `--force` to replace an existing tournament.
4. Set `VITE_API_URL=/api/exec` in the Vercel env vars and redeploy.

See `.env.example` for all variables.

## Local development

```sh
npm install
npm run dev        # frontend on http://localhost:5173 (mock data when VITE_API_URL is unset)
npm run build      # typecheck + production build
npx tsc -p api --noEmit   # typecheck the serverless API
```

Without `VITE_API_URL` the app renders the built-in mock tournament from
`src/lib/mockData.ts`, so UI work needs no backend at all.
