import { useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { endOfMonth, format, startOfMonth } from 'date-fns'
import { useApp } from '../../context/AppContext'
import { useTransactions } from './useTransactions'
import TransactionModal from './TransactionModal'
import MonthPicker from '../../components/MonthPicker'
import { convert, formatMoney } from '../../lib/money'
import { supabase } from '../../lib/supabase'
import type { Currency, Transaction, TxType } from '../../types'

export default function TransactionsPage() {
  const { categories, viewCurrency } = useApp()
  const [month, setMonth] = useState(() => startOfMonth(new Date()))
  const [typeFilter, setTypeFilter] = useState<TxType | 'all'>('all')
  const [currencyFilter, setCurrencyFilter] = useState<Currency | 'all'>('all')
  const [editing, setEditing] = useState<Transaction | null | 'new'>(null)

  const from = format(startOfMonth(month), 'yyyy-MM-dd')
  const to = format(endOfMonth(month), 'yyyy-MM-dd')
  const { transactions, loading, refresh } = useTransactions(from, to)

  const filtered = useMemo(
    () => transactions.filter(
      (t) => (typeFilter === 'all' || t.type === typeFilter) &&
             (currencyFilter === 'all' || t.currency === currencyFilter),
    ),
    [transactions, typeFilter, currencyFilter],
  )

  async function remove(id: string) {
    if (!confirm('¿Eliminar este movimiento?')) return
    await supabase.from('transactions').delete().eq('id', id)
    refresh()
  }

  const catOf = (id: string | null) => categories.find((c) => c.id === id)

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h2 className="display text-2xl font-semibold">Movimientos</h2>
        <div className="flex flex-wrap items-center gap-3">
          <MonthPicker month={month} onChange={(d) => setMonth(startOfMonth(d))} />
          <button className="btn btn-primary" onClick={() => setEditing('new')}>+ Nuevo</button>
        </div>
      </div>

      <div className="flex flex-wrap gap-3">
        <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value as TxType | 'all')} className="w-auto text-sm">
          <option value="all">Todo</option>
          <option value="income">Ingresos</option>
          <option value="expense">Gastos</option>
        </select>
        <select value={currencyFilter} onChange={(e) => setCurrencyFilter(e.target.value as Currency | 'all')} className="w-auto text-sm">
          <option value="all">€ y $</option>
          <option value="EUR">Solo EUR</option>
          <option value="COP">Solo COP</option>
        </select>
      </div>

      <div className="card divide-y divide-cream/5 overflow-hidden">
        {loading && <p className="p-6 text-center text-cream-faint">Cargando…</p>}
        {!loading && filtered.length === 0 && (
          <p className="p-10 text-center text-cream-faint">Nada por aquí este mes.</p>
        )}
        <AnimatePresence initial={false}>
          {filtered.map((t) => {
            const cat = catOf(t.category_id)
            return (
              <motion.div
                key={t.id}
                layout
                initial={{ opacity: 0, x: -12 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, height: 0 }}
                className="group flex items-center gap-3 px-4 py-3 transition-colors hover:bg-ink-800/60 sm:px-5"
              >
                <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-ink-950 text-lg">
                  {cat?.emoji ?? '❓'}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">
                    {t.description || t.merchant || cat?.name || 'Movimiento'}
                    {t.source === 'apple_pay' && <span className="ml-2 rounded-full bg-amber/15 px-2 py-0.5 text-[10px] font-semibold text-amber"> PAY</span>}
                  </p>
                  <p className="truncate text-xs text-cream-faint">{cat?.name ?? 'Sin categoría'} · {t.occurred_at}</p>
                </div>
                <div className="text-right">
                  <p className={`num font-semibold ${t.type === 'income' ? 'text-mint' : 'text-coral'}`}>
                    {t.type === 'income' ? '+' : '−'}{formatMoney(t.amount, t.currency)}
                  </p>
                  {t.currency !== viewCurrency && (
                    <p className="num text-xs text-cream-faint">≈ {formatMoney(convert(t, viewCurrency), viewCurrency)}</p>
                  )}
                </div>
                <div className="flex gap-1 opacity-100 transition-opacity sm:opacity-0 sm:group-hover:opacity-100">
                  <button className="btn btn-ghost px-2.5 py-1.5 text-xs" onClick={() => setEditing(t)}>✏️</button>
                  <button className="btn btn-ghost px-2.5 py-1.5 text-xs" onClick={() => remove(t.id)}>🗑️</button>
                </div>
              </motion.div>
            )
          })}
        </AnimatePresence>
      </div>

      <AnimatePresence>
        {editing && (
          <TransactionModal
            transaction={editing === 'new' ? null : editing}
            onClose={() => setEditing(null)}
            onSaved={() => { setEditing(null); refresh() }}
          />
        )}
      </AnimatePresence>
    </div>
  )
}
