-- Adds the optional phone number captured during roster setup.
-- Safe to run against a database already holding tournament data.
alter table players add column if not exists phone text;
