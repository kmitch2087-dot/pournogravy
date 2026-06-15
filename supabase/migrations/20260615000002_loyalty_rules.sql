create table if not exists public.loyalty_rules (
  id                      int primary key default 1 check (id = 1),
  points_per_dollar       int not null default 10,
  redemption_threshold    int not null default 100,
  redemption_value_cents  int not null default 500,
  double_points_active    boolean not null default false,
  double_points_start     timestamptz,
  double_points_end       timestamptz,
  updated_at              timestamptz not null default now()
);

insert into public.loyalty_rules (id) values (1) on conflict do nothing;

alter table public.loyalty_rules enable row level security;
create policy "Public read loyalty rules" on public.loyalty_rules for select using (true);
create policy "Admin write loyalty rules" on public.loyalty_rules for update using (
  exists (select 1 from public.profiles where id = auth.uid() and is_admin = true)
);
