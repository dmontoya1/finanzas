import { useState, type FormEvent } from 'react'
import { motion } from 'framer-motion'
import { useApp } from '../../context/AppContext'
import { supabase } from '../../lib/supabase'
import type { Category, Currency, TxType } from '../../types'

export default function CategoriesPage() {
  const { household, categories, refreshCategories } = useApp()
  const [name, setName] = useState('')
  const [emoji, setEmoji] = useState('🏷️')
  const [kind, setKind] = useState<TxType>('expense')
  const [error, setError] = useState<string | null>(null)

  async function add(e: FormEvent) {
    e.preventDefault()
    if (!household) return
    setError(null)
    const { error } = await supabase.from('categories')
      .insert({ household_id: household.id, name, emoji, kind })
    if (error) setError(error.code === '23505' ? 'Esa categoría ya existe' : error.message)
    else { setName(''); refreshCategories() }
  }

  async function remove(id: string) {
    if (!confirm('¿Eliminar? Los movimientos quedarán sin categoría.')) return
    await supabase.from('categories').delete().eq('id', id)
    refreshCategories()
  }

  const groups: { kind: TxType; title: string }[] = [
    { kind: 'expense', title: 'Gastos' },
    { kind: 'income', title: 'Ingresos' },
  ]

  return (
    <div className="space-y-6">
      <h2 className="display text-2xl font-semibold">Categorías</h2>

      <form onSubmit={add} className="card flex flex-wrap items-end gap-3 p-5">
        <div className="w-20">
          <label className="mb-1 block text-xs text-cream-faint">Emoji</label>
          <input value={emoji} onChange={(e) => setEmoji(e.target.value)} maxLength={4} className="text-center" />
        </div>
        <div className="min-w-40 flex-1">
          <label className="mb-1 block text-xs text-cream-faint">Nombre</label>
          <input required value={name} onChange={(e) => setName(e.target.value)} placeholder="Ej. Mascotas" />
        </div>
        <div>
          <label className="mb-1 block text-xs text-cream-faint">Tipo</label>
          <select value={kind} onChange={(e) => setKind(e.target.value as TxType)} className="w-auto">
            <option value="expense">Gasto</option>
            <option value="income">Ingreso</option>
          </select>
        </div>
        <button className="btn btn-primary">Añadir</button>
        {error && <p className="w-full text-sm text-coral">{error}</p>}
      </form>

      {groups.map((g) => (
        <section key={g.kind}>
          <h3 className="mb-3 text-sm uppercase tracking-widest text-cream-faint">{g.title}</h3>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {categories.filter((c) => c.kind === g.kind).map((c, i) => (
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
            ))}
          </div>
        </section>
      ))}
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
