-- 003: the tournament manual.
--
-- The schedule, the local rules, the stakes and the lodging details live in
-- one jsonb document per tournament rather than a column per answer. There's
-- no relational work to do on any of it — it's written whole by one organiser
-- and read whole by the manual page — and a new rule shouldn't need a
-- migration to add.
--
-- Validation is in api/_lib/manual.ts and is authoritative; readers treat the
-- document as a patch over the defaults in src/lib/manual.ts, so a partial or
-- empty document still renders a complete manual.
--
-- Safe to run more than once.

alter table tournaments
  add column if not exists manual jsonb not null default '{}'::jsonb;
