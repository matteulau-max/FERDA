-- Per-session rules: which holes are played, whether handicaps apply, and
-- Total Stroke Play's points-per-stroke rate.
--
-- Apply with: psql "$DATABASE_URL" -f db/migrations/002_session_rules.sql
-- (or paste into the Supabase SQL editor)

alter table sessions add column if not exists hole_set text not null default 'All 18';
alter table sessions add column if not exists use_handicap boolean not null default true;
alter table sessions add column if not exists points_per_stroke numeric(4,2) not null default 0.5;

-- Constraints are added separately so re-running the migration is safe.
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'sessions_hole_set_check') then
    alter table sessions add constraint sessions_hole_set_check
      check (hole_set in ('All 18', 'Front 9', 'Back 9'));
  end if;

  if not exists (select 1 from pg_constraint where conname = 'sessions_points_per_stroke_check') then
    alter table sessions add constraint sessions_points_per_stroke_check
      check (points_per_stroke >= 0);
  end if;
end $$;

-- Widen the scoring check to admit Total Stroke Play. The original constraint
-- is unnamed-by-default as sessions_scoring_check; drop it if present.
alter table sessions drop constraint if exists sessions_scoring_check;
alter table sessions add constraint sessions_scoring_check
  check (scoring in ('Match Play', 'Stroke Play', 'Total Stroke Play'));
