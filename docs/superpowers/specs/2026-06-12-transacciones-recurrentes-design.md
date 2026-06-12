# Diseño: Transacciones recurrentes

**Fecha:** 2026-06-12
**Estado:** Aprobado por Daniel

## Objetivo

Alquiler, nómina y suscripciones se registran solos cada mes. Elimina el grueso del registro manual repetitivo.

## Decisiones de diseño

| Decisión | Elección | Razón |
|---|---|---|
| Generación | Cliente, al abrir la app (tras cargar household) | Cero infra nueva; la app se usa a diario. Idempotencia vía índice único en DB |
| Cadencia | Solo mensual, `day_of_month` 1-28 | Cubre el caso real (YAGNI). 1-28 evita lógica de meses cortos |
| Idempotencia | Índice único parcial `(recurring_rule_id, recurring_month)` en `transactions` | Dos dispositivos generando a la vez: uno inserta, el otro recibe 23505 y lo ignora |
| Backfill | No. Solo mes actual, y solo si `day_of_month <= hoy` | Si nadie abrió la app en marzo, marzo no se inventa |
| Tasa FX | `getEurCopRate()` existente (caché 12h + fallback) al momento de generar | Misma fuente que el resto de la app |
| UI | Sección "Recurrentes" en Ajustes | Página existente, encaja con configuración. Sin ruta nueva |
| Edición de reglas | No (borrar + crear cubre el caso) | YAGNI; toggle activo/inactivo sí existe |

## Esquema

Migración `supabase/migrations/0003_recurring.sql`:

- Tabla `recurring_rules`: `id, household_id, type tx_type, amount > 0, currency, category_id (nullable, set null on delete), description not null, day_of_month int 1-28, active bool default true, created_at`. RLS: política `members all` con `is_member`, igual que el resto.
- `transactions` gana `recurring_rule_id uuid null` (FK set null) y `recurring_month text null` (formato `yyyy-MM`).
- Índice único parcial sobre `(recurring_rule_id, recurring_month) where recurring_rule_id is not null`.

## Tipos (`src/types.ts`)

- `Transaction.source` pasa a `'manual' | 'apple_pay' | 'recurring'`; gana `recurring_rule_id: string | null` y `recurring_month: string | null`.
- Interface nueva `RecurringRule` espejo de la tabla.

## Generación (`src/lib/recurring.ts`)

`generateDueRecurring(householdId: string): Promise<void>`:

1. Carga reglas `active = true` del hogar.
2. Filtra las vencidas: `day_of_month <= día de hoy`.
3. Consulta transacciones existentes del mes actual con `recurring_rule_id` no nulo → set de reglas ya generadas.
4. Para cada regla pendiente: inserta transacción `status: 'confirmed'`, `source: 'recurring'`, `occurred_at` = `yyyy-MM-<day_of_month>`, `fx_rate` = `getEurCopRate()`, `recurring_rule_id` + `recurring_month` = mes actual, `user_id: null`.
5. Error `23505` (duplicado por carrera) → ignorar en silencio: es la idempotencia. Otros errores → `console.error` (no bloquear el arranque de la app).

Disparo: en `AppContext`, tras resolver `household` (una vez por sesión). No bloquea el render. La transacción insertada llega a la UI por el realtime existente.

## UI: Ajustes, sección "Recurrentes"

Entre "Reglas de categorización" y "Cerrar sesión":

- Formulario: descripción, monto, moneda (EUR/COP), tipo (gasto/ingreso), categoría (filtrada por tipo; opcional para ingreso, recomendable para gasto), día del mes (1-28).
- Lista de reglas: descripción, monto formateado, día ("el 5 de cada mes"), categoría, toggle activo (update `active`), borrar (delete; transacciones pasadas conservan su copia, FK set null).
- Patrón visual idéntico a la sección de reglas de comercio existente.

## Manejo de errores

- Generación: nunca rompe el arranque; 23505 silencioso, resto a console.
- CRUD de reglas: patrón existente de la página (sin estados de error elaborados, igual que merchant_rules).

## Testing

Sin suite (igual que el resto). `generateDueRecurring` aislada en `lib/`. Verificación manual: crear regla con día <= hoy → recargar app → transacción aparece (una sola vez aunque recargues); regla con día futuro → no genera; toggle inactivo → no genera.

## Fuera de alcance

Cadencias no mensuales, backfill histórico, edición de reglas, notificaciones.
