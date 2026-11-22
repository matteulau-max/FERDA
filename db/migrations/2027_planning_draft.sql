-- Ferda 2027 planning schema. Apply only after organizer auth/API authorization is ready.
create table if not exists public.event_organizers (
 tournament_id uuid not null references public.tournaments(id) on delete cascade,
 user_id uuid not null references auth.users(id) on delete cascade,
 role text not null check (role in ('owner','organizer')),
 created_at timestamptz not null default now(),
 primary key (tournament_id,user_id)
);
create table if not exists public.planning_tasks (
 id uuid primary key default gen_random_uuid(),
 tournament_id uuid not null references public.tournaments(id) on delete cascade,
 title text not null check (length(trim(title)) between 1 and 240),
 owner_user_id uuid references auth.users(id),
 due_at timestamptz,
 status text not null default 'todo' check (status in ('todo','doing','done')),
 created_at timestamptz not null default now()
);
create table if not exists public.event_invitations (
 id uuid primary key default gen_random_uuid(),
 tournament_id uuid not null references public.tournaments(id) on delete cascade,
 player_id uuid references public.players(id) on delete set null,
 invitee_name text not null,
 status text not null default 'invited' check (status in ('invited','yes','no','maybe')),
 created_at timestamptz not null default now()
);
create table if not exists public.event_schedule (
 id uuid primary key default gen_random_uuid(),
 tournament_id uuid not null references public.tournaments(id) on delete cascade,
 title text not null,
 starts_at timestamptz not null,
 ends_at timestamptz,
 location text,
 visibility text not null default 'draft' check (visibility in ('draft','published')),
 check (ends_at is null or ends_at >= starts_at)
);
create table if not exists public.event_expenses (
 id uuid primary key default gen_random_uuid(),
 tournament_id uuid not null references public.tournaments(id) on delete cascade,
 category text not null,
 description text not null,
 estimated_cents bigint not null default 0 check (estimated_cents >= 0),
 actual_cents bigint check (actual_cents >= 0),
 status text not null default 'estimate' check (status in ('estimate','committed','paid'))
);
create table if not exists public.expense_allocations (
 expense_id uuid not null references public.event_expenses(id) on delete cascade,
 player_id uuid not null references public.players(id) on delete cascade,
 amount_cents bigint not null check (amount_cents >= 0),
 primary key (expense_id,player_id)
);
create table if not exists public.event_payments (
 id uuid primary key default gen_random_uuid(),
 tournament_id uuid not null references public.tournaments(id) on delete cascade,
 player_id uuid not null references public.players(id) on delete cascade,
 amount_cents bigint not null check (amount_cents > 0),
 received_at timestamptz not null default now(),
 note text
);
create table if not exists public.event_publications (
 tournament_id uuid not null references public.tournaments(id) on delete cascade,
 section text not null,
 published_at timestamptz not null default now(),
 published_by uuid not null references auth.users(id),
 primary key(tournament_id,section)
);
create table if not exists public.event_audit_log (
 id bigint generated always as identity primary key,
 tournament_id uuid references public.tournaments(id) on delete set null,
 actor_user_id uuid references auth.users(id),
 action text not null,
 created_at timestamptz not null default now()
);
-- No client direct access: privileged server endpoints must verify organizer membership.
alter table public.event_organizers enable row level security;
alter table public.planning_tasks enable row level security;
alter table public.event_invitations enable row level security;
alter table public.event_schedule enable row level security;
alter table public.event_expenses enable row level security;
alter table public.expense_allocations enable row level security;
alter table public.event_payments enable row level security;
alter table public.event_publications enable row level security;
alter table public.event_audit_log enable row level security;
revoke all on public.event_organizers,public.planning_tasks,public.event_invitations,public.event_schedule,public.event_expenses,public.expense_allocations,public.event_payments,public.event_publications,public.event_audit_log from anon,authenticated;
create index if not exists planning_tasks_tournament_idx on public.planning_tasks(tournament_id);
create index if not exists event_schedule_tournament_idx on public.event_schedule(tournament_id,starts_at);
create index if not exists event_expenses_tournament_idx on public.event_expenses(tournament_id);
create index if not exists event_payments_tournament_idx on public.event_payments(tournament_id,player_id);
