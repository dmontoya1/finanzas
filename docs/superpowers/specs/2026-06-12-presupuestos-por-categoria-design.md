# Diseño: Presupuestos por categoría

**Fecha:** 2026-06-12
**Estado:** Aprobado por Daniel

## Objetivo

Permitir definir un tope de gasto mensual por categoría y ver el progreso del mes en el dashboard. Convierte la app de registro pasivo a herramienta que avisa.

## Decisiones de diseño

| Decisión | Elección | Razón |
|---|---|---|
| Moneda del presupuesto | Una moneda por presupuesto (EUR o COP, elegida al crearlo) | El tope no "baila" con la tasa; el gasto se convierte con la tasa histórica de cada transacción, igual que el dashboard |
| Periodicidad | Fijo mensual: se define una vez, aplica todos los meses | Cero mantenimiento; cubre el caso real. Sin overrides por mes (YAGNI) |
| Ubicación UI | Edición en página Categorías; barras de progreso en Dashboard | Sin página ni ruta nueva |
| Pagos sin clasificar | No cuentan hasta asignarles categoría | Sin categoría no hay tope contra el cual contar; la bandeja de pendientes ya existe como recordatorio |
| Modelo de datos | Columnas en `categories` (no tabla nueva) | Relación 1:1, hereda RLS, llega gratis en el fetch existente de AppContext |

## Esquema

Migración `supabase/migrations/0002_budgets.sql`:

```sql
alter table categories
  add column budget_amount numeric(14,2) check (budget_amount > 0),
  add column budget_currency currency_code;
```

Ambas nullable: categoría sin tope = sin presupuesto. Solo categorías `kind = 'expense'` tendrán tope; validado en UI, no en DB.

## Tipos

`src/types.ts` — `Category` gana:

```ts
budget_amount: number | null
budget_currency: Currency | null
```

## Lógica de cálculo

Función nueva en `src/lib/money.ts`:

```ts
budgetProgress(
  category: Category,
  monthTxs: Transaction[],
): { spent: number; limit: number; ratio: number } | null
```

- Devuelve `null` si la categoría no tiene `budget_amount`/`budget_currency`.
- Filtra `monthTxs` por `category_id === category.id` y `type === 'expense'`.
- Convierte cada transacción a `budget_currency` con su `fx_rate` histórica (reutiliza `convert`).
- `spent` = suma; `limit` = `budget_amount`; `ratio` = `spent / limit`.
- Función pura, sin dependencias de red/estado — testeable aislada.

## UI: página Categorías

En cada fila de categoría de gasto: campo numérico de tope + selector EUR/COP. Guardar ejecuta `update categories set budget_amount, budget_currency`. Vaciar el campo = poner ambas columnas a `null` (quitar presupuesto). Tras guardar, `refreshCategories()` del AppContext.

## UI: Dashboard

Sección nueva "Presupuestos" bajo el resumen del mes:

- Una barra de progreso por categoría de gasto con tope, ordenadas por `ratio` descendente.
- Estados: verde `< 0.8`, ámbar `0.8–1.0`, rojo `> 1.0` mostrando el exceso.
- Texto `gastado / tope` formateado en la **moneda del presupuesto** (no en la moneda de vista — el tope no debe variar con el toggle).
- Usa el mes seleccionado en el `MonthPicker` existente y las transacciones que el Dashboard ya carga vía `useTransactions`.
- Si ninguna categoría tiene tope: hint discreto "Define topes en Categorías".

## Manejo de errores

Sin vías nuevas: errores de Supabase en el update siguen el patrón existente de la página (mensaje inline). `budgetProgress` no falla: devuelve `null` cuando no aplica.

## Testing

No existe suite de tests en el repo. `budgetProgress` queda pura para cuando exista. Verificación manual: definir tope en Categorías → registrar gasto del mes en esa categoría → ver barra y estados de color en Dashboard; probar tope EUR con gasto COP (conversión histórica) y viceversa.

## Fuera de alcance

- Overrides de tope por mes concreto.
- Topes para categorías de ingreso.
- Notificaciones al pasarse del tope.
- Las otras dos features acordadas (transacciones recurrentes, proyección fin de mes) — ciclos de diseño propios.
