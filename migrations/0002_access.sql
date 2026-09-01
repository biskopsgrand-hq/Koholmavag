-- Invite-only access list. The owner always starts approved.
create table if not exists access_members (
  email text primary key,
  user_id text,
  name text,
  status text not null check (status in ('pending', 'approved', 'denied')),
  token text unique,
  requested_at timestamptz not null default now(),
  decided_at timestamptz,
  decided_by text
);

create index if not exists access_members_status_idx on access_members (status);
create index if not exists access_members_token_idx on access_members (token);

insert into access_members (email, name, status, decided_at, decided_by)
values (
  'biskopsgrand@gmail.com',
  'Ägare',
  'approved',
  now(),
  'system'
)
on conflict (email) do nothing;
