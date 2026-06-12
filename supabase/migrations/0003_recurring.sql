-- ============================================================
-- Transacciones recurrentes: reglas mensuales (alquiler, nómina…)
-- generadas por el cliente al abrir la app, idempotentes por índice único.
-- Ejecutar en: Supabase Dashboard > SQL Editor
-- ============================================================

create table recurring_rules (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references households(id) on delete cascade,
  type tx_type not null,
  amount numeric(14,2) not null check (amount > 0),
  currency currency_code not null,
  category_id uuid references categories(id) on delete set null,
  description text not null,
  day_of_month int not null check (day_of_month between 1 and 28),
  active boolean not null default true,
  created_at timestamptz not null default now()
);

alter table recurring_rules enable row level security;

create policy "members all recurring_rules" on recurring_rules
  for all using (is_member(household_id)) with check (is_member(household_id));

-- Vínculo transacción ↔ regla + mes generado ('yyyy-MM')
alter table transactions add column recurring_rule_id uuid references recurring_rules(id) on delete set null;
alter table transactions add column recurring_month text;

-- Idempotencia: una transacción por regla y mes, aunque dos dispositivos
-- generen a la vez (el segundo insert recibe 23505 y se ignora).
create unique index uq_tx_recurring on transactions (recurring_rule_id, recurring_month)
  where recurring_rule_id is not null;
