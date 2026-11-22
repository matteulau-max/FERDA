# Ferda 2027 — planning platform implementation

Status: Phase 1 design and security preparation. This branch is NOT ready for production.

## Existing architecture
React 18 / Vite / TypeScript / Tailwind; Vercel `api/exec.ts` uses privileged Postgres connections. Current public API accepts unauthenticated setup mutations and score writes. The 2026 tournament has a read-only slug guard, but this is not a general authorization mechanism. Existing public-schema tables have RLS enabled with no policies; privileged server connections may bypass RLS. Do not expose organizer routes until server-side authorization is implemented.

## Security gate (must ship first)
1. Remove tracked `.env` from the public repository and its history as appropriate; inspect and rotate any exposed credentials. Never commit secrets.
2. Implement Supabase Auth (email magic link) for organizer login. Provision Matt and PJ through verified user IDs, not self-reported email or client-editable metadata.
3. Verify Supabase JWT on EVERY organizer API mutation, including existing setup, tournament creation/deletion, and paid AI scorecard reads. Look up organizer membership server-side for the requested tournament. Deny by default.
4. Keep attendee pages public only for explicitly published, non-sensitive information. Never send all players' phone numbers, private balances, or planning drafts in the public getTournament payload. Create separate public projection endpoints.
5. Limit score submission to authenticated organizers or scoped, expiring scorer capabilities. Remove the legacy GET mutation `saveScore` and use POST + CSRF/origin controls as applicable.
6. Add request validation, rate limits and audit records; test negative cases (anonymous organizer write, cross-event organizer, expired token, unpublished data, other player's balance).
7. Keep the 2026 tournament immutable and verify history/leaderboard behavior before merge.

## Data model proposal
Existing `tournaments`, `players`, `courses`, `sessions`, `matches`, `scores` stay in place.

- `event_organizers(tournament_id, user_id, role)` for Matt and PJ.
- `event_invitations(id, tournament_id, player_id?, invitee_name, status, nights, rounds)`.
- `planning_tasks(id, tournament_id, title, owner_user_id?, due_at?, status)`.
- `event_schedule(id, tournament_id, starts_at, ends_at?, title, location?, visibility)`.
- `event_lodging(id, tournament_id, property_name, check_in?, check_out?, total_cost?, status, visibility)`.
- `event_expenses(id, tournament_id, category, description, estimated_amount, actual_amount?, status)`.
- `expense_allocations(expense_id, player_id, amount)`.
- `event_payments(id, tournament_id, player_id, amount, received_at, note)`.
- `event_publications(tournament_id, section, published_at, published_by)`.
- `event_audit_log(id, tournament_id, actor_user_id, action, created_at)`.

Use integer cents for money and enforce unique constraints / foreign keys / checks. Prefer a reusable cross-event person ID rather than name matching when migrating player identity.

## UX
- `/t/ferda-2027/organizer`: authenticated overview, RSVP, tasks, courses/tee times, budget, lodging, draft, publish.
- `/t/ferda-2027/info`: public published overview, itinerary, venue, rules, tee times, teams.
- Existing leaderboard and scorecard remain, subject to scoring authorization.
- Individual balances require verified attendee identity; never put them in a public shared URL.

## Delivery sequence
1. Security and organizer auth; integration tests.
2. Add planning schema via reviewed migration, seed 2027 event and organizer memberships.
3. Shared organizer CRUD and concurrent-edit handling.
4. Public attendee projection + per-section publish controls.
5. Import 2026 planning data read-only as historical reference; map 2027 returning players.
6. Test mobile experience and merge after review.

## Acceptance criteria
- Both organizers can sign in independently and edit 2027 planning records.
- Attendee without login sees only published content.
- Unpublished budget, private contact information and individual balances never appear in public API responses.
- A non-organizer cannot mutate event setup or payments through direct API calls.
- 2026 history and scores remain unchanged.
