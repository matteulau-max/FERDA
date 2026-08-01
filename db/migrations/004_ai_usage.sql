-- 004: a daily cap on model calls, per tournament.
--
-- Reading a scorecard costs real money, and the endpoint sits behind a public
-- link with no sign-in — anyone holding a tournament URL can call it. A counter
-- in Postgres is the only cap that actually holds: serverless instances come
-- and go, so anything kept in process memory resets constantly and caps
-- nothing.
--
-- One row per tournament per UTC day. Old rows are harmless; delete them
-- whenever, or leave them as a usage record.
--
-- Safe to run more than once.

create table if not exists ai_usage (
  tournament_id uuid not null references tournaments(id) on delete cascade,
  day           date not null,
  kind          text not null,
  count         integer not null default 0,
  primary key (tournament_id, day, kind)
);

alter table ai_usage enable row level security;
