-- FERDA tournament schema (Postgres / Supabase)
--
-- Multi-tenant: every table hangs off tournaments via tournament_id.
-- Players and courses are referenced by name within a tournament to match
-- the app's data model (src/lib/types.ts), where matches carry player-name
-- arrays and sessions carry a courseName.
--
-- Apply with: psql "$DATABASE_URL" -f db/schema.sql
-- (or paste into the Supabase SQL editor)

create extension if not exists pgcrypto;

create table if not exists tournaments (
  id         uuid primary key default gen_random_uuid(),
  slug       text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  name       text not null,
  team1_name text not null,
  team2_name text not null,
  -- The tournament manual: schedule, local rules, stakes, lodging. One
  -- document rather than a column per answer — see db/migrations/003_manual.sql.
  manual     jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists courses (
  id            uuid primary key default gen_random_uuid(),
  tournament_id uuid not null references tournaments(id) on delete cascade,
  name          text not null,
  rating        numeric(4,1) not null,
  slope         integer not null check (slope between 55 and 155),
  par           integer not null,
  unique (tournament_id, name)
);

create table if not exists holes (
  course_id    uuid not null references courses(id) on delete cascade,
  number       integer not null check (number between 1 and 18),
  par          integer not null check (par between 3 and 6),
  stroke_index integer not null check (stroke_index between 1 and 18),
  primary key (course_id, number)
);

create table if not exists players (
  id             uuid primary key default gen_random_uuid(),
  tournament_id  uuid not null references tournaments(id) on delete cascade,
  name           text not null,
  handicap_index numeric(4,1) not null,
  team           integer not null check (team in (1, 2)),
  -- Optional; used to share the tournament link with the roster.
  phone          text,
  unique (tournament_id, name)
);

create table if not exists sessions (
  id            uuid primary key default gen_random_uuid(),
  tournament_id uuid not null references tournaments(id) on delete cascade,
  name          text not null,
  format        text not null check (format in ('Singles', 'Best Ball', 'Scramble', '2v1')),
  scoring       text check (scoring in ('Match Play', 'Stroke Play', 'Total Stroke Play')),
  sort_order    integer not null,
  course_name   text not null,
  -- Which holes of course_name are played. A nine re-ranks the stroke indexes
  -- within itself and halves the handicap (see src/lib/holes.ts).
  hole_set      text not null default 'All 18'
                check (hole_set in ('All 18', 'Front 9', 'Back 9')),
  -- Off means everyone plays gross: no strokes given anywhere in the session.
  use_handicap  boolean not null default true,
  -- Total Stroke Play only: team points awarded per stroke of the margin.
  points_per_stroke numeric(4,2) not null default 0.5 check (points_per_stroke >= 0),
  unique (tournament_id, name)
);

-- Match ids are short human-readable strings (e.g. 'm1') used in app URLs,
-- so the primary key is (tournament_id, id) rather than a uuid.
create table if not exists matches (
  tournament_id uuid not null references tournaments(id) on delete cascade,
  id            text not null,
  session_name  text not null,
  team1_players text[] not null,
  team2_players text[] not null,
  sort_order    integer not null,
  primary key (tournament_id, id)
);

create table if not exists scores (
  tournament_id uuid not null,
  match_id      text not null,
  hole          integer not null check (hole between 1 and 18),
  side          text not null check (side in ('team1', 'team2')),
  player        text not null,
  gross_score   integer not null check (gross_score between 1 and 20),
  updated_at    timestamptz not null default now(),
  primary key (tournament_id, match_id, hole, player),
  foreign key (tournament_id, match_id) references matches(tournament_id, id) on delete cascade
);

create index if not exists scores_by_tournament on scores (tournament_id);

-- A daily cap on model calls per tournament. The scorecard reader costs money
-- per call and sits behind a public link, so the cap has to live somewhere
-- shared — see db/migrations/004_ai_usage.sql.
create table if not exists ai_usage (
  tournament_id uuid not null references tournaments(id) on delete cascade,
  day           date not null,
  kind          text not null,
  count         integer not null default 0,
  primary key (tournament_id, day, kind)
);

-- Lock the tables down: the app reaches Postgres only through the Vercel
-- serverless functions (service credentials), never from the browser. With
-- RLS enabled and no policies defined, Supabase's anon/authenticated roles
-- can't touch anything. Organizer-facing policies arrive with auth in a
-- later phase.
alter table tournaments enable row level security;
alter table courses     enable row level security;
alter table holes       enable row level security;
alter table players     enable row level security;
alter table sessions    enable row level security;
alter table matches     enable row level security;
alter table scores      enable row level security;
alter table ai_usage    enable row level security;
