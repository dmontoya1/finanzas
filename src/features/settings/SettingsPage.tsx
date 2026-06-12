import { useEffect, useState, type FormEvent } from 'react'
import { useApp } from '../../context/AppContext'
import { supabase } from '../../lib/supabase'
import { formatMoney } from '../../lib/money'
import type { Category, Currency, RecurringRule, TxType } from '../../types'

interface Rule { id: string; pattern: string; category_id: string }

export default function SettingsPage() {
  const { household, categories } = useApp()
  const [rules, setRules] = useState<Rule[]>([])
  const [pattern, setPattern] = useState('')
  const [categoryId, setCategoryId] = useState('')
  const [copied, setCopied] = useState<string | null>(null)

  const webhookUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/applepay-webhook`

  useEffect(() => { loadRules() }, [household?.id])

  async function loadRules() {
    const { data } = await supabase.from('merchant_rules').select('*').order('pattern')
    setRules((data as Rule[]) ?? [])
  }

  async function addRule(e: FormEvent) {
    e.preventDefault()
    if (!household || !categoryId) return
    await supabase.from('merchant_rules')
      .insert({ household_id: household.id, pattern, category_id: categoryId })
    setPattern('')
    loadRules()
  }

  async function removeRule(id: string) {
    await supabase.from('merchant_rules').delete().eq('id', id)
    loadRules()
  }

  function copy(label: string, value: string) {
    navigator.clipboard.writeText(value)
    setCopied(label)
    setTimeout(() => setCopied(null), 1500)
  }

  if (!household) return null

  return (
    <div className="space-y-6">
      <h2 className="display text-2xl font-semibold">Ajustes</h2>

      <section className="card space-y-3 p-5">
        <h3 className="font-semibold">👥 Invitar a tu pareja</h3>
        <p className="text-sm text-cream-dim">Comparte este código. Al registrarse, elige "Unirme" e ingresa:</p>
        <button onClick={() => copy('code', household.invite_code)}
          className="num rounded-xl border border-dashed border-amber/50 bg-ink-950 px-5 py-3 text-xl tracking-[0.3em] text-amber">
          {copied === 'code' ? '¡Copiado!' : household.invite_code}
        </button>
      </section>

      <section className="card space-y-4 p-5">
        <h3 className="font-semibold"> Webhook de Apple Pay</h3>
        <p className="text-sm text-cream-dim">
          Configura el Atajo de iOS con estos dos valores (instrucciones completas en el README del proyecto):
        </p>
        <div>
          <p className="mb-1 text-xs text-cream-faint">URL del webhook</p>
          <button onClick={() => copy('url', webhookUrl)}
            className="num block w-full truncate rounded-xl bg-ink-950 px-4 py-2.5 text-left text-sm hover:bg-ink-700">
            {copied === 'url' ? '¡Copiado!' : webhookUrl}
          </button>
        </div>
        <div>
          <p className="mb-1 text-xs text-cream-faint">Secreto (header x-webhook-secret)</p>
          <button onClick={() => copy('secret', household.webhook_secret)}
            className="num block w-full truncate rounded-xl bg-ink-950 px-4 py-2.5 text-left text-sm hover:bg-ink-700">
            {copied === 'secret' ? '¡Copiado!' : household.webhook_secret}
          </button>
        </div>
      </section>

      <section className="card space-y-4 p-5">
        <h3 className="font-semibold">🤖 Reglas de categorización automática</h3>
        <p className="text-sm text-cream-dim">
          Si el nombre del comercio contiene el patrón, el pago de Apple Pay se clasifica solo
          (ej. patrón <span className="num text-amber">MERCADONA</span> → Mercado).
        </p>
        <form onSubmit={addRule} className="flex flex-wrap gap-3">
          <input required value={pattern} onChange={(e) => setPattern(e.target.value)}
            placeholder="Texto del comercio" className="min-w-40 flex-1" />
          <select required value={categoryId} onChange={(e) => setCategoryId(e.target.value)} className="w-auto">
            <option value="">Categoría…</option>
            {categories.filter((c) => c.kind === 'expense').map((c) => (
              <option key={c.id} value={c.id}>{c.emoji} {c.name}</option>
            ))}
          </select>
          <button className="btn btn-primary">Añadir</button>
        </form>
        <ul className="space-y-2">
          {rules.map((r) => {
            const cat = categories.find((c) => c.id === r.category_id)
            return (
              <li key={r.id} className="flex items-center justify-between rounded-xl bg-ink-950/60 px-4 py-2.5 text-sm">
                <span><span className="num text-amber">{r.pattern}</span> → {cat ? `${cat.emoji} ${cat.name}` : '—'}</span>
                <button onClick={() => removeRule(r.id)} className="text-cream-faint hover:text-coral">✕</button>
              </li>
            )
          })}
        </ul>
      </section>

      <RecurringSection householdId={household.id} categories={categories} />

      <button className="btn btn-ghost" onClick={() => supabase.auth.signOut()}>Cerrar sesión</button>
    </div>
  )
}

function RecurringSection({ householdId, categories }: { householdId: string; categories: Category[] }) {
  const [rules, setRules] = useState<RecurringRule[]>([])
  const [description, setDescription] = useState('')
  const [amount, setAmount] = useState('')
  const [currency, setCurrency] = useState<Currency>('EUR')
  const [type, setType] = useState<TxType>('expense')
  const [categoryId, setCategoryId] = useState('')
  const [day, setDay] = useState('1')

  useEffect(() => { load() }, [householdId])

  async function load() {
    const { data } = await supabase.from('recurring_rules').select('*').order('day_of_month')
    setRules((data as RecurringRule[]) ?? [])
  }

  async function add(e: FormEvent) {
    e.preventDefault()
    const value = Number(amount)
    if (!Number.isFinite(value) || value <= 0) return
    await supabase.from('recurring_rules').insert({
      household_id: householdId,
      description, type, currency,
      amount: value,
      category_id: categoryId || null,
      day_of_month: Number(day),
    })
    setDescription(''); setAmount(''); setCategoryId('')
    load()
  }

  async function toggle(r: RecurringRule) {
    await supabase.from('recurring_rules').update({ active: !r.active }).eq('id', r.id)
    load()
  }

  async function remove(id: string) {
    if (!confirm('¿Eliminar la regla? Las transacciones ya generadas se conservan.')) return
    await supabase.from('recurring_rules').delete().eq('id', id)
    load()
  }

  return (
    <section className="card space-y-4 p-5">
      <h3 className="font-semibold">🔁 Recurrentes</h3>
      <p className="text-sm text-cream-dim">
        Alquiler, nómina, suscripciones… se registran solas el día elegido de cada mes (al abrir la app).
      </p>
      <form onSubmit={add} className="flex flex-wrap items-end gap-3">
        <div className="min-w-36 flex-1">
          <label className="mb-1 block text-xs text-cream-faint">Descripción</label>
          <input required value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Ej. Alquiler" />
        </div>
        <div className="w-28">
          <label className="mb-1 block text-xs text-cream-faint">Monto</label>
          <input required type="number" min="0.01" step="0.01" inputMode="decimal"
            value={amount} onChange={(e) => setAmount(e.target.value)} />
        </div>
        <div>
          <label className="mb-1 block text-xs text-cream-faint">Moneda</label>
          <select value={currency} onChange={(e) => setCurrency(e.target.value as Currency)} className="w-auto">
            <option value="EUR">EUR</option>
            <option value="COP">COP</option>
          </select>
        </div>
        <div>
          <label className="mb-1 block text-xs text-cream-faint">Tipo</label>
          <select value={type} onChange={(e) => { setType(e.target.value as TxType); setCategoryId('') }} className="w-auto">
            <option value="expense">Gasto</option>
            <option value="income">Ingreso</option>
          </select>
        </div>
        <div>
          <label className="mb-1 block text-xs text-cream-faint">Categoría</label>
          <select value={categoryId} onChange={(e) => setCategoryId(e.target.value)} className="w-auto">
            <option value="">Sin categoría</option>
            {categories.filter((c) => c.kind === type).map((c) => (
              <option key={c.id} value={c.id}>{c.emoji} {c.name}</option>
            ))}
          </select>
        </div>
        <div className="w-20">
          <label className="mb-1 block text-xs text-cream-faint">Día (1-28)</label>
          <input required type="number" min="1" max="28" value={day} onChange={(e) => setDay(e.target.value)} />
        </div>
        <button className="btn btn-primary">Añadir</button>
      </form>
      <ul className="space-y-2">
        {rules.map((r) => {
          const cat = categories.find((c) => c.id === r.category_id)
          return (
            <li key={r.id}
              className={`flex flex-wrap items-center justify-between gap-2 rounded-xl bg-ink-950/60 px-4 py-2.5 text-sm ${r.active ? '' : 'opacity-50'}`}>
              <span>
                {r.type === 'income' ? '💰' : '💸'} <span className="font-medium">{r.description}</span>
                {' · '}<span className="num">{formatMoney(r.amount, r.currency)}</span>
                {' · '}el {r.day_of_month} de cada mes
                {cat && <> · {cat.emoji} {cat.name}</>}
              </span>
              <span className="flex items-center gap-3">
                <button onClick={() => toggle(r)} className="text-cream-faint hover:text-cream">
                  {r.active ? 'Pausar' : 'Activar'}
                </button>
                <button onClick={() => remove(r.id)} className="text-cream-faint hover:text-coral">✕</button>
              </span>
            </li>
          )
        })}
      </ul>
    </section>
  )
}
