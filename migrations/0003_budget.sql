-- Shared association ledger. One row so phone and computer see the same books.
create table if not exists budget_ledger (
  id text primary key,
  payload jsonb not null,
  updated_at timestamptz not null default now()
);
