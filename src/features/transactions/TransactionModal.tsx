import { useEffect, useState, type FormEvent } from 'react'
import { motion } from 'framer-motion'
import { format } from 'date-fns'
import { useApp } from '../../context/AppContext'
import { supabase } from '../../lib/supabase'
import { getEurCopRate } from '../../lib/fx'
import type { Currency, Transaction, TxType } from '../../types'

interface Props {
  transaction: Transaction | null
  onClose: () => void
  onSaved: () => void
}

export default function TransactionModal({ transaction, onClose, onSaved }: Props) {
  const { household, session, categories } = useApp()
  const [type, setType] = useState<TxType>(transaction?.type ?? 'expense')
  const [amount, setAmount] = useState(transaction?.amount.toString() ?? '')
  const [currency, setCurrency] = useState<Currency>(transaction?.currency ?? 'EUR')
  const [categoryId, setCategoryId] = useState(transaction?.category_id ?? '')
  const [description, setDescription] = useState(transaction?.description ?? '')
  const [date, setDate] = useState(transaction?.occurred_at ?? format(new Date(), 'yyyy-MM-dd'))
  const [rate, setRate] = useState<number | null>(transaction?.fx_rate ?? null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Para transacciones nuevas, precarga la tasa del día
  useEffect(() => {
    if (!transaction) getEurCopRate().then(setRate)
  }, [transaction])

  const cats = categories.filter((c) => c.kind === type)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!household || !session) return
    setBusy(true); setError(null)
    const payload = {
      household_id: household.id,
      user_id: session.user.id,
      type,
      status: 'confirmed' as const,
      amount: parseFloat(amount),
      currency,
      fx_rate: rate ?? (await getEurCopRate()),
      category_id: categoryId || null,
      description: description || null,
      occurred_at: date,
    }
    const { error } = transaction
      ? await supabase.from('transactions').update(payload).eq('id', transaction.id)
      : await supabase.from('transactions').insert(payload)
    if (error) { setError(error.message); setBusy(false) }
    else onSaved()
  }

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-40 grid place-items-center bg-ink-950/80 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <motion.form
        initial={{ scale: 0.92, y: 24 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.92, y: 24 }}
        transition={{ type: 'spring', stiffness: 400, damping: 32 }}
        onClick={(e) => e.stopPropagation()}
        onSubmit={handleSubmit}
        className="card w-full max-w-md space-y-4 p-6"
      >
        <h3 className="display text-xl font-semibold">{transaction ? 'Editar movimiento' : 'Nuevo movimiento'}</h3>

        <div className="flex gap-2">
          {(['expense', 'income'] as TxType[]).map((t) => (
            <button type="button" key={t}
              onClick={() => { setType(t); setCategoryId('') }}
              className={`btn flex-1 ${type === t ? (t === 'income' ? 'bg-mint text-ink-950' : 'bg-coral text-ink-950') : 'btn-ghost'}`}>
              {t === 'income' ? 'Ingreso' : 'Gasto'}
            </button>
          ))}
        </div>

        <div className="flex gap-3">
          <div className="flex-1">
            <label className="mb-1 block text-xs text-cream-faint">Monto</label>
            <input type="number" step="0.01" min="0.01" required value={amount}
              onChange={(e) => setAmount(e.target.value)} placeholder="0.00" className="num text-lg" autoFocus />
          </div>
          <div className="w-28">
            <label className="mb-1 block text-xs text-cream-faint">Moneda</label>
            <select value={currency} onChange={(e) => setCurrency(e.target.value as Currency)}>
              <option value="EUR">€ EUR</option>
              <option value="COP">$ COP</option>
            </select>
          </div>
        </div>

        <div>
          <label className="mb-1 block text-xs text-cream-faint">Categoría</label>
          <select value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
            <option value="">Sin categoría</option>
            {cats.map((c) => <option key={c.id} value={c.id}>{c.emoji} {c.name}</option>)}
          </select>
        </div>

        <div>
          <label className="mb-1 block text-xs text-cream-faint">Descripción (opcional)</label>
          <input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Ej. arriendo apto Bogotá" />
        </div>

        <div className="flex gap-3">
          <div className="flex-1">
            <label className="mb-1 block text-xs text-cream-faint">Fecha</label>
            <input type="date" required value={date} onChange={(e) => setDate(e.target.value)} />
          </div>
          <div className="flex-1">
            <label className="mb-1 block text-xs text-cream-faint">Tasa COP/EUR</label>
            <input type="number" step="0.01" min="1" required value={rate ?? ''}
              onChange={(e) => setRate(parseFloat(e.target.value))} className="num" />
          </div>
        </div>

        {error && <p className="text-sm text-coral">{error}</p>}
        <div className="flex gap-2 pt-1">
          <button type="button" className="btn btn-ghost flex-1" onClick={onClose}>Cancelar</button>
          <button className="btn btn-primary flex-1" disabled={busy}>{busy ? '…' : 'Guardar'}</button>
        </div>
      </motion.form>
    </motion.div>
  )
}
