# Presupuestos por categoría — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Tope de gasto mensual por categoría con barras de progreso en el Dashboard.

**Architecture:** Dos columnas nullable en `categories` (sin tabla nueva, hereda RLS). Cálculo puro en `lib/money.ts` (`budgetProgress`). Edición en CategoriesPage; visualización en componente nuevo `BudgetSection` que el Dashboard monta con las transacciones del mes ya cargadas.

**Tech Stack:** React 19 + TypeScript + Tailwind v4 + Framer Motion + Supabase (Postgres/RLS).

**Spec:** `docs/superpowers/specs/2026-06-12-presupuestos-por-categoria-design.md`

**Nota sobre tests:** El repo no tiene suite de tests (decisión de spec: verificación manual). Los pasos de verificación usan `npm run build` + `npm run lint` + verificación manual en el navegador. `budgetProgress` queda pura para testearse cuando exista suite.

---

### Task 1: Migración de esquema

**Files:**
- Create: `supabase/migrations/0002_budgets.sql`

- [ ] **Step 1: Crear el archivo de migración**

```sql
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
```

- [ ] **Step 2: Aplicar la migración en Supabase**

El proyecto aplica migraciones pegándolas en el SQL Editor del dashboard de Supabase (patrón del README, la 0001 se aplicó así). Pedir al usuario que la ejecute, o si la CLI está logueada y linkeada:

Run: `supabase db push --include-all`
Expected: `Applying migration 0002_budgets.sql... Finished.`

Si `db push` falla porque 0001 no está en el historial de migraciones, usar el SQL Editor manualmente.

- [ ] **Step 3: Verificar columnas**

En SQL Editor: `select budget_amount, budget_currency from categories limit 1;`
Expected: consulta válida, valores `null`.

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/0002_budgets.sql
git commit -m "feat: migración de presupuestos por categoría"
```

---

### Task 2: Tipos

**Files:**
- Modify: `src/types.ts:12-18` (interface `Category`)

- [ ] **Step 1: Añadir campos a `Category`**

```ts
export interface Category {
  id: string
  household_id: string
  name: string
  emoji: string
  kind: TxType
  /** Tope mensual fijo; null = sin presupuesto. Ambos campos van juntos. */
  budget_amount: number | null
  budget_currency: Currency | null
}
```

- [ ] **Step 2: Verificar compilación**

Run: `npm run build`
Expected: PASS (las columnas llegan solas: AppContext hace `select('*')`).

- [ ] **Step 3: Commit**

```bash
git add src/types.ts
git commit -m "feat: tipos de presupuesto en Category"
```

---

### Task 3: Lógica de cálculo `budgetProgress`

**Files:**
- Modify: `src/lib/money.ts` (añadir al final; añadir `Category` al import de tipos)

- [ ] **Step 1: Implementar**

```ts
import type { Category, Currency, Transaction } from '../types'
```

```ts
export interface BudgetProgress {
  spent: number
  limit: number
  /** spent / limit; > 1 = pasado del tope */
  ratio: number
  currency: Currency
}

/** Progreso del presupuesto de una categoría contra las transacciones del mes.
 *  null si la categoría no tiene tope. Convierte cada gasto a la moneda del
 *  presupuesto con su tasa histórica. */
export function budgetProgress(category: Category, monthTxs: Transaction[]): BudgetProgress | null {
  if (category.budget_amount == null || category.budget_currency == null) return null
  const spent = sumIn(
    monthTxs.filter((t) => t.type === 'expense' && t.category_id === category.id),
    category.budget_currency,
  )
  return {
    spent,
    limit: category.budget_amount,
    ratio: spent / category.budget_amount,
    currency: category.budget_currency,
  }
}
```

- [ ] **Step 2: Verificar**

Run: `npm run build && npm run lint`
Expected: PASS ambos.

- [ ] **Step 3: Commit**

```bash
git add src/lib/money.ts
git commit -m "feat: budgetProgress en lib/money"
```

---

### Task 4: Edición de topes en CategoriesPage

**Files:**
- Modify: `src/features/categories/CategoriesPage.tsx`

- [ ] **Step 1: Añadir componente `BudgetEditor` y montarlo en las filas de gasto**

Imports: añadir `Category` y `Currency` al import de tipos y mantener los existentes:

```tsx
import type { Category, Currency, TxType } from '../../types'
```

Componente (al final del archivo, tras `CategoriesPage`):

```tsx
function BudgetEditor({ category, onSaved }: { category: Category; onSaved: () => void }) {
  const [amount, setAmount] = useState(category.budget_amount?.toString() ?? '')
  const [currency, setCurrency] = useState<Currency>(category.budget_currency ?? 'EUR')
  const [error, setError] = useState<string | null>(null)

  async function save(curr: Currency) {
    const value = amount.trim() === '' ? null : Number(amount)
    if (value !== null && (!Number.isFinite(value) || value <= 0)) {
      setError('Tope inválido')
      return
    }
    // Sin cambios: no toques la red
    if (value === category.budget_amount && (value === null || curr === category.budget_currency)) return
    setError(null)
    const { error } = await supabase.from('categories')
      .update({ budget_amount: value, budget_currency: value === null ? null : curr })
      .eq('id', category.id)
    if (error) setError(error.message)
    else onSaved()
  }

  return (
    <div className="mt-2">
      <div className="flex items-center gap-2">
        <input
          type="number" min="0" step="0.01" inputMode="decimal"
          value={amount} placeholder="Tope mensual"
          onChange={(e) => setAmount(e.target.value)}
          onBlur={() => save(currency)}
          className="w-28 text-sm"
        />
        <select
          value={currency}
          onChange={(e) => { const c = e.target.value as Currency; setCurrency(c); save(c) }}
          className="w-auto text-sm"
        >
          <option value="EUR">EUR</option>
          <option value="COP">COP</option>
        </select>
      </div>
      {error && <p className="mt-1 text-xs text-coral">{error}</p>}
    </div>
  )
}
```

Reemplazar el cuerpo de la fila (líneas 64-70 actuales, el `motion.div`):

```tsx
<motion.div key={c.id}
  initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}
  className="card group px-4 py-3">
  <div className="flex items-center justify-between">
    <span className="font-medium">{c.emoji} {c.name}</span>
    <button onClick={() => remove(c.id)}
      className="text-cream-faint opacity-100 transition hover:text-coral sm:opacity-0 sm:group-hover:opacity-100">✕</button>
  </div>
  {c.kind === 'expense' && <BudgetEditor category={c} onSaved={refreshCategories} />}
</motion.div>
```

(Nota: se quita `flex items-center justify-between` del card exterior y se mueve a un div interno, para que el editor quede debajo.)

- [ ] **Step 2: Verificar**

Run: `npm run build && npm run lint`
Expected: PASS.

- [ ] **Step 3: Verificación manual**

Run: `npm run dev` → ir a Categorías.
Expected: categorías de gasto muestran campo "Tope mensual" + selector EUR/COP; las de ingreso no. Poner tope, salir del campo, recargar página → el valor persiste. Vaciar campo, salir → vuelve a placeholder tras recarga (null en DB).

- [ ] **Step 4: Commit**

```bash
git add src/features/categories/CategoriesPage.tsx
git commit -m "feat: edición de topes de presupuesto en Categorías"
```

---

### Task 5: BudgetSection en Dashboard

**Files:**
- Create: `src/features/dashboard/BudgetSection.tsx`
- Modify: `src/features/dashboard/Dashboard.tsx` (import + montar tras las tarjetas resumen, línea ~116)

- [ ] **Step 1: Crear `BudgetSection.tsx`**

```tsx
import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import { budgetProgress, formatMoney, type BudgetProgress } from '../../lib/money'
import type { Category, Transaction } from '../../types'

interface Row {
  category: Category
  progress: BudgetProgress
}

export default function BudgetSection({ categories, monthTxs }: {
  categories: Category[]
  monthTxs: Transaction[]
}) {
  const rows: Row[] = categories
    .filter((c) => c.kind === 'expense')
    .flatMap((c) => {
      const progress = budgetProgress(c, monthTxs)
      return progress ? [{ category: c, progress }] : []
    })
    .sort((a, b) => b.progress.ratio - a.progress.ratio)

  if (rows.length === 0) {
    return (
      <div className="card p-5">
        <h3 className="mb-1 font-semibold">Presupuestos</h3>
        <p className="text-sm text-cream-faint">
          Define topes mensuales en <Link to="/categorias" className="underline hover:text-cream">Categorías</Link>.
        </p>
      </div>
    )
  }

  return (
    <div className="card p-5">
      <h3 className="mb-4 font-semibold">Presupuestos</h3>
      <ul className="space-y-3">
        {rows.map(({ category, progress }) => {
          const over = progress.ratio > 1
          const warn = !over && progress.ratio >= 0.8
          const barColor = over ? 'bg-coral' : warn ? 'bg-amber' : 'bg-mint'
          return (
            <li key={category.id}>
              <div className="mb-1 flex items-baseline justify-between gap-2 text-sm">
                <span className="truncate">{category.emoji} {category.name}</span>
                <span className="num text-cream-dim">
                  {formatMoney(progress.spent, progress.currency)} / {formatMoney(progress.limit, progress.currency)}
                  {over && (
                    <span className="ml-1 text-coral">
                      +{formatMoney(progress.spent - progress.limit, progress.currency)}
                    </span>
                  )}
                </span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-ink-950/60">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${Math.min(progress.ratio, 1) * 100}%` }}
                  transition={{ duration: 0.6, ease: 'easeOut' }}
                  className={`h-full rounded-full ${barColor}`}
                />
              </div>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
```

- [ ] **Step 2: Montar en Dashboard**

En `src/features/dashboard/Dashboard.tsx`, añadir import:

```tsx
import BudgetSection from './BudgetSection'
```

Insertar tras el cierre del grid de tarjetas resumen (después de la línea `</div>` que cierra `<div className="grid gap-4 sm:grid-cols-3">`, actual línea 116) y antes del grid de gráficos:

```tsx
{/* Presupuestos del mes */}
<motion.div custom={2.5} variants={cardVariants} initial="hidden" animate="show">
  <BudgetSection categories={categories} monthTxs={monthTxs} />
</motion.div>
```

- [ ] **Step 3: Verificar**

Run: `npm run build && npm run lint`
Expected: PASS.

- [ ] **Step 4: Verificación manual completa**

Run: `npm run dev`

1. Sin topes definidos → Dashboard muestra card "Presupuestos" con hint y link a Categorías.
2. Definir tope EUR en una categoría → registrar gasto EUR del mes en ella → barra verde con `gastado / tope`.
3. Registrar gasto COP en la misma categoría → `spent` sube convertido con la tasa histórica de esa transacción (no la tasa de hoy).
4. Subir gasto por encima del 80% → barra ámbar. Por encima del tope → barra roja + exceso.
5. Cambiar el toggle EUR/COP global → las cifras de presupuesto NO cambian (moneda propia del presupuesto).
6. Cambiar mes en MonthPicker → barras recalculan con ese mes.

- [ ] **Step 5: Commit**

```bash
git add src/features/dashboard/BudgetSection.tsx src/features/dashboard/Dashboard.tsx
git commit -m "feat: barras de presupuesto en Dashboard"
```
