import { useReducedMotion } from 'framer-motion'
import { Card } from '../../components/ui'
import { categoryColor } from '../../lib/categoryColor'
import { convert, formatMoney, type UpcomingPayment } from '../../lib/money'
import type { Category, Currency, Transaction } from '../../types'

// Spring entrance is skipped when the user prefers reduced motion.
function useTile(i: number) {
  const reduce = useReducedMotion()
  return reduce ? { animate: false } : { animate: true, transition: { type: 'spring' as const, stiffness: 260, damping: 26, delay: i * 0.06 } }
}

const catOf = (categories: Category[], id: string | null) => categories.find((c) => c.id === id)

export function IncomeExpenseTiles({ income, expense, view }: { income: number; expense: number; view: Currency }) {
  const a = useTile(0)
  const b = useTile(1)
  return (
    <>
      <Card {...a}>
        <p className="text-sm text-text-soft">Ingresos</p>
        <p className="num mt-1 text-xl font-semibold sm:text-2xl">+{formatMoney(income, view)}</p>
      </Card>
      <Card {...b}>
        <p className="text-sm text-text-soft">Gastos</p>
        <p className="num mt-1 text-xl font-semibold sm:text-2xl">−{formatMoney(expense, view)}</p>
      </Card>
    </>
  )
}

export function TopSpending({ transactions, categories, view }: { transactions: Transaction[]; categories: Category[]; view: Currency }) {
  const a = useTile(2)
  const map = new Map<string, { name: string; value: number }>()
  for (const t of transactions) {
    if (t.type !== 'expense') continue
    const cat = catOf(categories, t.category_id)
    const key = cat?.id ?? 'none'
    const prev = map.get(key) ?? { name: cat ? `${cat.emoji} ${cat.name}` : '❓ Sin categoría', value: 0 }
    prev.value += convert(t, view)
    map.set(key, prev)
  }
  const top = [...map.entries()].map(([key, v]) => ({ key, ...v })).sort((x, y) => y.value - x.value).slice(0, 4)
  const total = top.reduce((s, x) => s + x.value, 0)

  return (
    <Card {...a} className="col-span-2 lg:row-span-2">
      <h3 className="font-semibold">Mayores gastos</h3>
      {top.length === 0 ? (
        <p className="py-6 text-center text-text-faint">Sin gastos este mes</p>
      ) : (
        <>
          <div className="mt-3 flex h-3 overflow-hidden rounded-full" aria-hidden>
            {top.map((x) => <span key={x.key} style={{ width: `${(x.value / total) * 100}%`, background: categoryColor(x.key) }} />)}
          </div>
          <ul className="mt-3 space-y-2 text-sm">
            {top.map((x) => (
              <li key={x.key} className="flex items-center justify-between gap-2">
                <span className="flex min-w-0 items-center gap-2">
                  <span className="size-2.5 shrink-0 rounded-full" style={{ background: categoryColor(x.key) }} />
                  <span className="truncate">{x.name}</span>
                </span>
                <span className="num text-text-soft">−{formatMoney(x.value, view)}</span>
              </li>
            ))}
          </ul>
        </>
      )}
    </Card>
  )
}

export function UpcomingTile({ items, view }: { items: UpcomingPayment[]; view: Currency }) {
  const a = useTile(3)
  if (items.length === 0) return null
  const total = items.reduce((s, u) => s + u.amountInView, 0)
  return (
    <Card {...a} className="col-span-2">
      <h3 className="font-semibold">Próximos pagos</h3>
      <ul className="mt-3 space-y-2 text-sm">
        {items.slice(0, 3).map((u) => (
          <li key={u.rule.id} className="flex items-center justify-between gap-2">
            <span className="min-w-0 truncate">
              {u.rule.description} <span className="text-text-faint">· {u.daysUntil === 0 ? 'hoy' : u.daysUntil === 1 ? 'mañana' : `en ${u.daysUntil} días`}</span>
            </span>
            <span className="num text-text-soft">−{formatMoney(u.amountInView, view)}</span>
          </li>
        ))}
      </ul>
      <p className="num mt-3 border-t border-line pt-2 text-sm font-medium">Total: −{formatMoney(total, view)}</p>
    </Card>
  )
}

const MAX_CHIPS = 4

export function PendingTile({ items, categories, monthTxs, onClassify, busy = false }: {
  items: Transaction[]; categories: Category[]; monthTxs: Transaction[]; busy?: boolean
  onClassify: (t: Transaction, category: Category) => void
}) {
  const a = useTile(4)
  if (items.length === 0) return null
  const expenseCats = categories.filter((c) => c.kind === 'expense')
  // Chips: most used categories among confirmed expenses first, alphabetical as tiebreak.
  const uses = new Map<string, number>()
  for (const t of monthTxs) {
    if (t.type === 'expense' && t.status === 'confirmed' && t.category_id) uses.set(t.category_id, (uses.get(t.category_id) ?? 0) + 1)
  }
  const ranked = [...expenseCats].sort((x, y) => (uses.get(y.id) ?? 0) - (uses.get(x.id) ?? 0) || x.name.localeCompare(y.name, 'es'))
  const chips = ranked.slice(0, MAX_CHIPS)
  const rest = ranked.slice(MAX_CHIPS)
  return (
    <Card {...a} className="col-span-2 lg:col-span-4">
      <h3 className="mb-3 font-semibold">⏳ {items.length} pago(s) de Apple Pay por clasificar</h3>
      <ul className="space-y-2">
        {items.map((t) => (
          <li key={t.id} className="rounded-xl bg-surface px-4 py-2.5">
            <p className="font-medium">{t.merchant || 'Comercio desconocido'}</p>
            <p className="num text-sm text-text-soft">−{formatMoney(t.amount, t.currency)} · {t.occurred_at}</p>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              {chips.map((c) => (
                <button
                  key={c.id} type="button" onClick={() => onClassify(t, c)} disabled={busy} aria-disabled={busy}
                  aria-label={`Clasificar ${t.merchant || 'comercio'} como ${c.name}`}
                  className="flex min-h-11 cursor-pointer items-center gap-2 rounded-full border border-line px-3 text-sm hover:bg-text/5 disabled:cursor-wait disabled:opacity-50"
                >
                  <span className="size-2.5 shrink-0 rounded-full" style={{ background: categoryColor(c.id) }} aria-hidden />
                  {c.emoji} {c.name}
                </button>
              ))}
              {rest.length > 0 && (
                <select
                  key={`${t.id}-${rest.length}`} defaultValue="" aria-label={`Otra categoría para ${t.merchant || 'comercio'}`} disabled={busy}
                  onChange={(e) => { const c = rest.find((x) => x.id === e.target.value); if (c) onClassify(t, c) }}
                  className="min-h-11 w-auto text-sm disabled:cursor-wait disabled:opacity-50"
                >
                  <option value="" disabled>Otra…</option>
                  {rest.map((c) => <option key={c.id} value={c.id}>{c.emoji} {c.name}</option>)}
                </select>
              )}
            </div>
          </li>
        ))}
      </ul>
    </Card>
  )
}

export function RecentTransactions({ transactions, categories, view }: { transactions: Transaction[]; categories: Category[]; view: Currency }) {
  const a = useTile(5)
  const recent = [...transactions].sort((x, y) => y.occurred_at.localeCompare(x.occurred_at)).slice(0, 5)
  return (
    <Card {...a} className="col-span-2 lg:col-span-4">
      <h3 className="font-semibold">Últimos movimientos</h3>
      {recent.length === 0 ? (
        <p className="py-6 text-center text-text-faint">
          Aún no hay movimientos este mes. Pulsa «Añadir» (botón +, o la tecla N) para registrar el primero.
        </p>
      ) : (
        <ul className="mt-3 space-y-2 text-sm">
          {recent.map((t) => {
            const cat = catOf(categories, t.category_id)
            return (
              <li key={t.id} className="flex items-center justify-between gap-2">
                <span className="min-w-0 truncate">
                  {cat?.emoji ?? '❓'} {t.merchant || t.description || cat?.name || 'Movimiento'} <span className="text-text-faint">· {t.occurred_at}</span>
                </span>
                <span className="num">{t.type === 'income' ? '+' : '−'}{formatMoney(convert(t, view), view)}</span>
              </li>
            )
          })}
        </ul>
      )}
    </Card>
  )
}
