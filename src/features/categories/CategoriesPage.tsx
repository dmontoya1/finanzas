import { useState, type FormEvent } from 'react'
import { motion } from 'framer-motion'
import { useApp } from '../../context/AppContext'
import { supabase } from '../../lib/supabase'
import type { TxType } from '../../types'

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
                className="card group flex items-center justify-between px-4 py-3">
                <span className="font-medium">{c.emoji} {c.name}</span>
                <button onClick={() => remove(c.id)}
                  className="text-cream-faint opacity-100 transition hover:text-coral sm:opacity-0 sm:group-hover:opacity-100">✕</button>
              </motion.div>
            ))}
          </div>
        </section>
      ))}
    </div>
  )
}
