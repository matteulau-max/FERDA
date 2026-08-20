-- Tee times, stored per match.
--
-- The time belongs to the match rather than the session because a session's
-- matches go off in waves — 8:00, 8:10, 8:20 — so one time per session would
-- be wrong for every group but the first.
--
-- Stored as 'HH:MM' text on a 24-hour clock rather than as a timestamp: a tee
-- time is a wall-clock time at the course. It has no date behind it and no
-- time zone, and putting it through either would only create ways to show the
-- wrong time to someone reading the leaderboard from another state.
--
-- Apply with: psql "$DATABASE_URL" -f db/migrations/005_tee_times.sql
-- (or paste into the Supabase SQL editor)

alter table matches add column if not exists tee_time text;

-- Added separately, and guarded, so re-running the migration is safe.
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'matches_tee_time_check') then
    alter table matches add constraint matches_tee_time_check
      check (tee_time is null or tee_time ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$');
  end if;
end $$;
