import { useState, type FormEvent } from 'react'
import { format } from 'date-fns'
import { Button, Field, Modal } from '../../components/ui'
import { useApp } from '../../context/useApp'
import { categoryColor } from '../../lib/categoryColor'
import { saveTransaction, parseAmountInput } from './saveTransaction'
import type { Currency, TxType } from '../../types'

interface Props { open: boolean; onClose: () => void; onSaved: () => void }

const VISIBLE_CATEGORIES = 8
const seg = (active: boolean) =>
  `min-h-11 flex-1 rounded-lg px-3 text-sm font-semibold cursor-pointer ${active ? 'bg-brand text-white' : 'border border-line text-text hover:bg-text/5'}`

export function QuickAdd({ open, onClose, onSaved }: Props) {
  return (
    <Modal open={open} onClose={onClose} title="Nuevo movimiento">
      {/* Mounted only while open, so state is fresh (and viewCurrency re-synced) on every open. */}
      <QuickAddForm onClose={onClose} onSaved={onSaved} />
    </Modal>
  )
}

function QuickAddForm({ onClose, onSaved }: Omit<Props, 'open'>) {
  const { household, session, categories, viewCurrency } = useApp()
  const [amount, setAmount] = useState('')
  const [type, setType] = useState<TxType>('expense')
  const [currency, setCurrency] = useState<Currency>(viewCurrency)
  const [categoryId, setCategoryId] = useState('')
  const [showAll, setShowAll] = useState(false)
  const [note, setNote] = useState('')
  const [date, setDate] = useState(() => format(new Date(), 'yyyy-MM-dd'))
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const cats = categories.filter((c) => c.kind === type).sort((a, b) => a.name.localeCompare(b.name))
  const shown = showAll ? cats : cats.slice(0, VISIBLE_CATEGORIES)

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
      fxRate: null,
      categoryId: categoryId || null,
      description: note.trim() || null,
      date,
    })
    setBusy(false)
    if (err) return setError(err)
    onSaved()
    onClose()
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Amount stays first in DOM: Modal focuses the first focusable element on open. */}
      <Field label="Importe">
        <input inputMode="decimal" autoFocus autoComplete="off" placeholder="0,00" className="num text-lg"
          value={amount} onChange={(e) => setAmount(e.target.value)} />
      </Field>

      <div className="flex gap-2" role="group" aria-label="Tipo">
        {(['expense', 'income'] as TxType[]).map((t) => (
          <button type="button" key={t} aria-pressed={type === t} className={seg(type === t)}
            onClick={() => { setType(t); setCategoryId(''); setShowAll(false) }}>
            {t === 'income' ? 'Ingreso' : 'Gasto'}
          </button>
        ))}
      </div>

      <div className="flex gap-2" role="group" aria-label="Moneda">
        {(['EUR', 'COP'] as Currency[]).map((c) => (
          <button type="button" key={c} aria-pressed={currency === c} className={seg(currency === c)}
            onClick={() => setCurrency(c)}>
            {c === 'EUR' ? '€ EUR' : '$ COP'}
          </button>
        ))}
      </div>

      {cats.length > 0 && (
        <div role="group" aria-label="Categoría" className="flex flex-wrap gap-2">
          {shown.map((c) => (
            <button type="button" key={c.id} aria-pressed={categoryId === c.id}
              onClick={() => setCategoryId(categoryId === c.id ? '' : c.id)}
              className={`inline-flex min-h-11 items-center gap-2 rounded-full border px-3 text-sm cursor-pointer ${categoryId === c.id ? 'border-brand bg-brand/10 font-semibold' : 'border-line hover:bg-text/5'}`}>
              <span aria-hidden className="size-2.5 rounded-full" style={{ backgroundColor: categoryColor(c.id) }} />
              <span aria-hidden>{c.emoji}</span>
              {c.name}
            </button>
          ))}
          {cats.length > VISIBLE_CATEGORIES && (
            <button type="button" aria-expanded={showAll} onClick={() => setShowAll(!showAll)}
              className="min-h-11 rounded-full px-3 text-sm font-medium text-text-soft cursor-pointer hover:bg-text/5">
              {showAll ? 'Menos' : 'Más'}
            </button>
          )}
        </div>
      )}

      <Field label="Nota (opcional)">
        <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Ej. cena con amigos" />
      </Field>

      <Field label="Fecha">
        <input type="date" required value={date} onChange={(e) => setDate(e.target.value)} />
      </Field>

      {error && <p role="alert" className="text-sm text-negative">{error}</p>}

      <Button type="submit" loading={busy} className="w-full">Guardar</Button>
    </form>
  )
}
