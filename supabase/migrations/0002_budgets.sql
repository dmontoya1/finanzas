-- ============================================================
-- Presupuestos por categoría: tope mensual fijo en EUR o COP.
-- Ejecutar en: Supabase Dashboard > SQL Editor
-- ============================================================

alter table categories
  add column budget_amount numeric(14,2) check (budget_amount > 0),
  add column budget_currency currency_code;

-- Coherencia: o ambas columnas o ninguna
alter table categories
  add constraint budget_complete
  check ((budget_amount is null) = (budget_currency is null));
