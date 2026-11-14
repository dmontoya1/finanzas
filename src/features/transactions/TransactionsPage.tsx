import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion'
import { endOfMonth, format, startOfMonth } from 'date-fns'
import { Pencil, Trash2 } from 'lucide-react'
import { useApp } from '../../context/useApp'
import { useTransactions } from './useTransactions'
import TransactionModal from './TransactionModal'
import MonthPicker from '../../components/MonthPicker'
import { Button, Card, Skeleton, Toast, type ToastData } from '../../components/ui'
import { categoryColor } from '../../lib/categoryColor'
import { convert, formatMoney } from '../../lib/money'
import { supabase } from '../../lib/supabase'
import type { Currency, Transaction, TxType } from '../../types'

const UNDO_MS = 5000

export default function TransactionsPage() {
  const { categories, viewCurrency } = useApp()
  const reduce = useReducedMotion()
  const [month, setMonth] = useState(() => startOfMonth(new Date()))
  const [typeFilter, setTypeFilter] = useState<TxType | 'all'>('all')
  const [currencyFilter, setCurrencyFilter] = useState<Currency | 'all'>('all')
  const [editing, setEditing] = useState<Transaction | null | 'new'>(null)
  const [pending, setPending] = useState<Transaction | null>(null)
  const [error, setError] = useState<string | null>(null)
  const pendingRef = useRef<{ tx: Transaction; timer: number } | null>(null)

  const from = format(startOfMonth(month), 'yyyy-MM-dd')
  const to = format(endOfMonth(month), 'yyyy-MM-dd')
  const { transactions, loading, refresh } = useTransactions(from, to)

  const filtered = useMemo(
    () => transactions.filter(
      (t) => t.id !== pending?.id &&
             (typeFilter === 'all' || t.type === typeFilter) &&
             (currencyFilter === 'all' || t.currency === currencyFilter),
    ),
    [transactions, typeFilter, currencyFilter, pending],
  )

  // Fires the deferred DB delete; on failure the row comes back and the error is shown.
  const commitDelete = useCallback(async () => {
    const p = pendingRef.current
    if (!p) return
    window.clearTimeout(p.timer)
    pendingRef.current = null
    const { error: err } = await supabase.from('transactions').delete().eq('id', p.tx.id)
    if (err) setError(`No se pudo eliminar: ${err.message}`)
    await refresh()
    setPending((cur) => (cur?.id === p.tx.id ? null : cur))
  }, [refresh])

  function remove(tx: Transaction) {
    void commitDelete() // a newer delete flushes the previous one
    setError(null)
    setPending(tx)
    pendingRef.current = { tx, timer: window.setTimeout(() => void commitDelete(), UNDO_MS) }
  }

  function undo() {
    if (pendingRef.current) window.clearTimeout(pendingRef.current.timer)
    pendingRef.current = null
    setPending(null)
  }

  // Leaving the page must not lose the delete the user already confirmed.
  useEffect(() => () => { void commitDelete() }, [commitDelete])

  const catOf = (id: string | null) => categories.find((c) => c.id === id)

  const toast: ToastData | null = pending
    ? { message: 'Movimiento eliminado', actionLabel: 'Deshacer', onAction: undo }
    : error ? { message: error, tone: 'error', onClose: () => setError(null) } : null

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h2 className="display text-2xl font-semibold">Movimientos</h2>
        <div className="flex flex-wrap items-center gap-3">
          <MonthPicker month={month} onChange={(d) => setMonth(startOfMonth(d))} />
          <Button onClick={() => setEditing('new')}>+ Nuevo</Button>
        </div>
      </div>

      <div className="flex flex-wrap gap-3">
        <select aria-label="Filtrar por tipo" value={typeFilter} onChange={(e) => setTypeFilter(e.target.value as TxType | 'all')} className="min-h-11 w-auto text-sm">
          <option value="all">Todo</option>
          <option value="income">Ingresos</option>
          <option value="expense">Gastos</option>
        </select>
        <select aria-label="Filtrar por moneda" value={currencyFilter} onChange={(e) => setCurrencyFilter(e.target.value as Currency | 'all')} className="min-h-11 w-auto text-sm">
          <option value="all">€ y $</option>
          <option value="EUR">Solo EUR</option>
          <option value="COP">Solo COP</option>
        </select>
      </div>

      <Card className="divide-y divide-line overflow-hidden p-0">
        {loading && (
          <div className="space-y-3 p-4" aria-busy="true" aria-label="Cargando movimientos">
            {[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-12 w-full" />)}
          </div>
        )}
        {!loading && filtered.length === 0 && (
          <div className="p-10 text-center">
            <p className="font-medium">Aún no hay movimientos aquí</p>
            <p className="mt-1 text-sm text-text-soft">Prueba otro mes o filtro, o añade uno nuevo.</p>
            <Button className="mt-4" onClick={() => setEditing('new')}>Añadir movimiento</Button>
          </div>
        )}
        <AnimatePresence initial={false}>
          {!loading && filtered.map((t) => {
            const cat = catOf(t.category_id)
            const label = t.description || t.merchant || cat?.name || 'Movimiento'
            const sign = t.type === 'income' ? '+' : '−'
            return (
              <motion.div
                key={t.id}
                layout={!reduce}
                initial={reduce ? false : { opacity: 0, x: -12 }}
                animate={{ opacity: 1, x: 0 }}
                exit={reduce ? { opacity: 0, transition: { duration: 0 } } : { opacity: 0, height: 0 }}
                className="flex items-center gap-3 px-4 py-2 sm:px-5"
              >
                <span aria-hidden className="grid size-10 shrink-0 place-items-center rounded-xl bg-surface-sunk text-lg">
                  {cat?.emoji ?? '❓'}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">
                    {label}
                    {t.source === 'apple_pay' && <span className="ml-2 rounded-full bg-warning-fill/20 px-2 py-0.5 text-[10px] font-semibold text-warning">PAY</span>}
                  </p>
                  <p className="flex min-w-0 items-center gap-1.5 text-xs text-text-soft">
                    <span aria-hidden className="size-2.5 shrink-0 rounded-full" style={{ backgroundColor: cat ? categoryColor(cat.id) : 'var(--color-line)' }} />
                    <span className="truncate">{cat?.name ?? 'Sin categoría'} · {t.occurred_at}</span>
                  </p>
                </div>
                <div className="text-right">
                  <p className={`num font-semibold ${t.type === 'income' ? 'text-positive' : 'text-negative'}`}>
                    {sign}{formatMoney(t.amount, t.currency)}
                  </p>
                  {t.currency !== viewCurrency && (
                    <p className="num text-xs text-text-soft">≈ {sign}{formatMoney(convert(t, viewCurrency), viewCurrency)}</p>
                  )}
                </div>
                <div className="flex shrink-0">
                  <button type="button" aria-label={`Editar ${label}`} onClick={() => setEditing(t)}
                    className="grid size-11 cursor-pointer place-items-center rounded-lg text-text-soft hover:bg-text/5 hover:text-text">
                    <Pencil className="size-4" aria-hidden />
                  </button>
                  <button type="button" aria-label={`Eliminar ${label}`} onClick={() => remove(t)}
                    className="grid size-11 cursor-pointer place-items-center rounded-lg text-text-soft hover:bg-text/5 hover:text-negative">
                    <Trash2 className="size-4" aria-hidden />
                  </button>
                </div>
              </motion.div>
            )
          })}
        </AnimatePresence>
      </Card>

      <TransactionModal
        open={editing !== null}
        transaction={editing === 'new' ? null : editing}
        onClose={() => setEditing(null)}
        onSaved={() => { setEditing(null); refresh() }}
      />
      <Toast toast={toast} />
    </div>
  )
}
