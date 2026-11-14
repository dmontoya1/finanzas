import { useEffect, useState, type FormEvent } from 'react'
import { format } from 'date-fns'
import { Button, Field, Modal } from '../../components/ui'
import { useApp } from '../../context/useApp'
import { getEurCopRate } from '../../lib/fx'
import { saveTransaction, parseAmountInput } from './saveTransaction'
import type { Currency, Transaction, TxType } from '../../types'

interface Props {
  open: boolean
  transaction: Transaction | null
  onClose: () => void
  onSaved: () => void
}

const seg = (active: boolean) =>
  `min-h-11 flex-1 rounded-lg px-3 text-sm font-semibold cursor-pointer ${active ? 'bg-brand text-white' : 'border border-line text-text hover:bg-text/5'}`

export default function TransactionModal({ open, transaction, onClose, onSaved }: Props) {
  return (
    <Modal open={open} onClose={onClose} title={transaction ? 'Editar movimiento' : 'Nuevo movimiento'}>
      {/* Mounted only while open, so form state is fresh for every transaction. */}
      <TransactionForm transaction={transaction} onClose={onClose} onSaved={onSaved} />
    </Modal>
  )
}

function TransactionForm({ transaction, onClose, onSaved }: Omit<Props, 'open'>) {
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

  // For new transactions, preload today's rate
  useEffect(() => {
    if (!transaction) getEurCopRate().then(setRate)
  }, [transaction])

  const cats = categories.filter((c) => c.kind === type)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!household || !session) return
    const parsed = parseAmountInput(amount)
    if (parsed === null) { setError('Introduce un importe mayor que 0'); return }
    setBusy(true); setError(null)
    const { error: err } = await saveTransaction({
      householdId: household.id,
      userId: session.user.id,
      type,
      amount: parsed,
      currency,
      fxRate: rate,
      categoryId: categoryId || null,
      description: description || null,
      date,
    }, transaction?.id)
    setBusy(false)
    if (err) setError(err)
    else onSaved()
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="flex gap-3">
        <Field label="Monto" className="flex-1">
          <input inputMode="decimal" autoFocus autoComplete="off" required value={amount}
            onChange={(e) => setAmount(e.target.value)} placeholder="0,00" className="num text-lg" />
        </Field>
        <Field label="Moneda" className="w-32">
          <select value={currency} onChange={(e) => setCurrency(e.target.value as Currency)}>
            <option value="EUR">€ EUR</option>
            <option value="COP">$ COP</option>
          </select>
        </Field>
      </div>

      <div className="flex gap-2" role="group" aria-label="Tipo">
        {(['expense', 'income'] as TxType[]).map((t) => (
          <button type="button" key={t} aria-pressed={type === t} className={seg(type === t)}
            onClick={() => { setType(t); setCategoryId('') }}>
            {t === 'income' ? 'Ingreso' : 'Gasto'}
          </button>
        ))}
      </div>

      <Field label="Categoría">
        <select value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
          <option value="">Sin categoría</option>
          {cats.map((c) => <option key={c.id} value={c.id}>{c.emoji} {c.name}</option>)}
        </select>
      </Field>

      <Field label="Descripción (opcional)">
        <input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Ej. arriendo apto Bogotá" />
      </Field>

      <div className="flex gap-3">
        <Field label="Fecha" className="flex-1">
          <input type="date" required value={date} onChange={(e) => setDate(e.target.value)} />
        </Field>
        <Field label="Tasa COP/EUR" className="flex-1">
          <input type="number" step="0.01" min="1" required value={rate ?? ''}
            onChange={(e) => setRate(parseFloat(e.target.value))} className="num" />
        </Field>
      </div>

      {error && <p role="alert" className="text-sm text-negative">{error}</p>}
      <div className="flex gap-2 pt-1">
        <Button type="button" variant="ghost" className="flex-1" onClick={onClose}>Cancelar</Button>
        <Button type="submit" loading={busy} className="flex-1">Guardar</Button>
      </div>
    </form>
  )
}
