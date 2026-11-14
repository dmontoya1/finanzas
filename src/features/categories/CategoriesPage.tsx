import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react'
import { useReducedMotion } from 'framer-motion'
import { Trash2 } from 'lucide-react'
import { useApp } from '../../context/useApp'
import { supabase } from '../../lib/supabase'
import { categoryColor } from '../../lib/categoryColor'
import { Button, Card, Field, Toast, type ToastData } from '../../components/ui'
import type { Category, Currency, TxType } from '../../types'

const UNDO_MS = 5000

export default function CategoriesPage() {
  const { household, categories, refreshCategories } = useApp()
  const reduce = useReducedMotion()
  const [name, setName] = useState('')
  const [emoji, setEmoji] = useState('🏷️')
  const [kind, setKind] = useState<TxType>('expense')
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [pending, setPending] = useState<Category | null>(null)
  const [toastError, setToastError] = useState<string | null>(null)
  const pendingRef = useRef<{ cat: Category; timer: number } | null>(null)

  async function add(e: FormEvent) {
    e.preventDefault()
    if (!household) return
    setError(null)
    setSaving(true)
    const { error } = await supabase.from('categories')
      .insert({ household_id: household.id, name, emoji, kind })
    setSaving(false)
    if (error) setError(error.code === '23505' ? 'Esa categoría ya existe' : error.message)
    else { setName(''); refreshCategories() }
  }

  // Deletion is deferred (hide now, delete after UNDO_MS) so it can be undone;
  // the DB delete is the same call as before and failures bring the card back.
  const commitDelete = useCallback(async () => {
    const p = pendingRef.current
    if (!p) return
    window.clearTimeout(p.timer)
    pendingRef.current = null
    const { error: err } = await supabase.from('categories').delete().eq('id', p.cat.id)
    if (err) setToastError(`No se pudo eliminar: ${err.message}`)
    await refreshCategories()
    setPending((cur) => (cur?.id === p.cat.id ? null : cur))
  }, [refreshCategories])

  function remove(cat: Category) {
    void commitDelete()
    setToastError(null)
    setPending(cat)
    pendingRef.current = { cat, timer: window.setTimeout(() => void commitDelete(), UNDO_MS) }
  }

  function undo() {
    if (pendingRef.current) window.clearTimeout(pendingRef.current.timer)
    pendingRef.current = null
    setPending(null)
  }

  // Leaving the page must not lose the delete the user already confirmed.
  useEffect(() => () => { void commitDelete() }, [commitDelete])

  const toast: ToastData | null = pending
    ? { message: `Categoría «${pending.name}» eliminada. Sus movimientos quedan sin categoría.`, actionLabel: 'Deshacer', onAction: undo }
    : toastError ? { message: toastError, tone: 'error', onClose: () => setToastError(null) } : null

  const groups: { kind: TxType; title: string }[] = [
    { kind: 'expense', title: 'Gastos' },
    { kind: 'income', title: 'Ingresos' },
  ]

  return (
    <div className="space-y-6">
      <h2 className="display text-2xl font-semibold">Categorías</h2>

      <Card>
        <form onSubmit={add} className="flex flex-wrap items-start gap-3">
          <Field label="Emoji" className="w-20">
            <input value={emoji} onChange={(e) => setEmoji(e.target.value)} maxLength={4} className="text-center" />
          </Field>
          <Field label="Nombre" className="min-w-40 flex-1">
            <input required value={name} onChange={(e) => setName(e.target.value)} placeholder="Ej. Mascotas" />
          </Field>
          <Field label="Tipo">
            <select value={kind} onChange={(e) => setKind(e.target.value as TxType)} className="min-h-11 w-auto">
              <option value="expense">Gasto</option>
              <option value="income">Ingreso</option>
            </select>
          </Field>
          <Button type="submit" loading={saving} className="self-end">Añadir</Button>
          {error && <p role="alert" className="w-full text-sm text-negative">{error}</p>}
        </form>
      </Card>

      {categories.length === 0 && (
        <Card className="p-10 text-center">
          <p className="font-medium">Aún no tienes categorías</p>
          <p className="mt-1 text-sm text-text-soft">Crea la primera arriba para clasificar tus movimientos.</p>
        </Card>
      )}

      {groups.map((g) => {
        const items = categories.filter((c) => c.kind === g.kind && c.id !== pending?.id)
        if (items.length === 0) return null
        return (
          <section key={g.kind} aria-label={g.title}>
            <h3 className="mb-3 text-sm uppercase tracking-widest text-text-faint">{g.title}</h3>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {items.map((c, i) => (
                <Card
                  key={c.id} animate={!reduce}
                  transition={{ type: 'spring', stiffness: 260, damping: 26, delay: Math.min(i, 8) * 0.04 }}
                  className="px-4 py-3"
                >
                  <div className="flex items-center gap-3">
                    <span aria-hidden className="size-3 shrink-0 rounded-full" style={{ backgroundColor: categoryColor(c.id) }} />
                    <span className="min-w-0 flex-1 truncate font-medium">{c.emoji} {c.name}</span>
                    <button type="button" onClick={() => remove(c)} aria-label={`Eliminar categoría ${c.name}`}
                      className="grid size-11 shrink-0 cursor-pointer place-items-center rounded-lg text-text-soft hover:bg-text/5 hover:text-negative">
                      <Trash2 className="size-4" aria-hidden />
                    </button>
                  </div>
                  {c.kind === 'expense' && <BudgetEditor category={c} onSaved={refreshCategories} />}
                </Card>
              ))}
            </div>
          </section>
        )
      })}
      <Toast toast={toast} />
    </div>
  )
}

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
    <div className="mt-2 flex items-start gap-2">
      <Field label="Tope mensual" error={error ?? undefined} className="min-w-0 flex-1">
        <input
          type="number" min="0.01" step="0.01" inputMode="decimal"
          value={amount} placeholder="Sin tope"
          onChange={(e) => setAmount(e.target.value)}
          onBlur={() => save(currency)}
        />
      </Field>
      <Field label="Moneda">
        <select
          value={currency}
          onChange={(e) => { const c = e.target.value as Currency; setCurrency(c); save(c) }}
          className="min-h-11 w-auto"
        >
          <option value="EUR">EUR</option>
          <option value="COP">COP</option>
        </select>
      </Field>
    </div>
  )
}
