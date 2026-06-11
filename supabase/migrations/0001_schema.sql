-- ============================================================
-- Esquema: control de presupuesto multi-moneda (COP / EUR)
-- Ejecutar en: Supabase Dashboard > SQL Editor
-- ============================================================

create extension if not exists pgcrypto;

-- ---------- Tipos ----------
create type tx_type as enum ('income', 'expense');
create type tx_status as enum ('confirmed', 'pending_review');
create type currency_code as enum ('COP', 'EUR');

-- ---------- Hogares (espacio compartido pareja/familia) ----------
create table households (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  invite_code text not null unique default upper(substr(md5(random()::text), 1, 8)),
  webhook_secret text not null unique default encode(gen_random_bytes(24), 'hex'),
  created_at timestamptz not null default now()
);

create table household_members (
  household_id uuid not null references households(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  display_name text not null,
  joined_at timestamptz not null default now(),
  primary key (household_id, user_id)
);

-- ---------- Categorías ----------
create table categories (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references households(id) on delete cascade,
  name text not null,
  emoji text not null default '🏷️',
  kind tx_type not null,
  unique (household_id, name, kind)
);

-- Reglas: comercio (Apple Pay) -> categoría automática
create table merchant_rules (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references households(id) on delete cascade,
  pattern text not null, -- substring case-insensitive del nombre del comercio
  category_id uuid not null references categories(id) on delete cascade
);

-- ---------- Transacciones ----------
create table transactions (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references households(id) on delete cascade,
  user_id uuid references auth.users(id) on delete set null,
  type tx_type not null,
  status tx_status not null default 'confirmed',
  amount numeric(14,2) not null check (amount > 0),
  currency currency_code not null,
  -- Tasa histórica: COP por 1 EUR en la fecha de la transacción.
  -- Permite consolidar el dashboard en cualquiera de las dos monedas
  -- sin reescribir historia cuando la tasa cambia.
  fx_rate numeric(12,4) not null check (fx_rate > 0),
  category_id uuid references categories(id) on delete set null,
  description text,
  merchant text,
  source text not null default 'manual', -- 'manual' | 'apple_pay'
  occurred_at date not null default current_date,
  created_at timestamptz not null default now()
);

create index idx_tx_household_date on transactions (household_id, occurred_at desc);
create index idx_tx_status on transactions (household_id, status);

-- ============================================================
-- RLS
-- ============================================================
alter table households enable row level security;
alter table household_members enable row level security;
alter table categories enable row level security;
alter table merchant_rules enable row level security;
alter table transactions enable row level security;

-- security definer evita recursión infinita en políticas de household_members
create or replace function is_member(h_id uuid)
returns boolean language sql security definer set search_path = public as $$
  select exists (
    select 1 from household_members
    where household_id = h_id and user_id = auth.uid()
  );
$$;

-- households: los miembros leen; cualquiera autenticado crea;
-- unirse por código se hace vía RPC (abajo), no exponiendo select global.
create policy "members read household" on households
  for select using (is_member(id));
create policy "auth users create household" on households
  for insert with check (auth.uid() is not null);

-- household_members
create policy "members read members" on household_members
  for select using (is_member(household_id));
create policy "user inserts self" on household_members
  for insert with check (user_id = auth.uid());
create policy "user removes self" on household_members
  for delete using (user_id = auth.uid());

-- categories / merchant_rules / transactions: CRUD para miembros
create policy "members all categories" on categories
  for all using (is_member(household_id)) with check (is_member(household_id));
create policy "members all rules" on merchant_rules
  for all using (is_member(household_id)) with check (is_member(household_id));
create policy "members all transactions" on transactions
  for all using (is_member(household_id)) with check (is_member(household_id));

-- ============================================================
-- RPC: unirse a un hogar con código de invitación
-- (security definer: busca el hogar sin exponer la tabla completa)
-- ============================================================
create or replace function join_household(code text, name text)
returns uuid language plpgsql security definer set search_path = public as $$
declare h_id uuid;
begin
  select id into h_id from households where invite_code = upper(code);
  if h_id is null then
    raise exception 'Código de invitación inválido';
  end if;
  insert into household_members (household_id, user_id, display_name)
  values (h_id, auth.uid(), name)
  on conflict do nothing;
  return h_id;
end;
$$;
