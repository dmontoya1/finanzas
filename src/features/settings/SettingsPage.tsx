import { useEffect, useState, type FormEvent } from 'react'
import { Trash2 } from 'lucide-react'
import { useApp } from '../../context/useApp'
import { supabase } from '../../lib/supabase'
import { formatMoney } from '../../lib/money'
import { Button, Card, CopyField, Field, Modal } from '../../components/ui'
import type { Category, Currency, RecurringRule, TxType } from '../../types'

interface Rule { id: string; pattern: string; category_id: string }

const listItem = 'flex flex-wrap items-center justify-between gap-2 rounded-xl bg-surface-sunk px-4 py-1.5 text-sm'
const iconBtn = 'grid size-11 shrink-0 cursor-pointer place-items-center rounded-lg text-text-soft hover:bg-text/5 hover:text-negative'

export default function SettingsPage() {
  const { household, categories } = useApp()
  const [rules, setRules] = useState<Rule[]>([])
  const [pattern, setPattern] = useState('')
  const [categoryId, setCategoryId] = useState('')
  const [error, setError] = useState<string | null>(null)

  const webhookUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/applepay-webhook`

  useEffect(() => { loadRules() }, [household?.id])

  async function loadRules() {
    const { data } = await supabase.from('merchant_rules').select('*').order('pattern')
    setRules((data as Rule[]) ?? [])
  }

  async function addRule(e: FormEvent) {
    e.preventDefault()
    if (!household || !categoryId) return
    setError(null)
    const { error: err } = await supabase.from('merchant_rules')
      .insert({ household_id: household.id, pattern, category_id: categoryId })
    if (err) { setError(err.message); return }
    setPattern('')
    loadRules()
  }

  async function removeRule(id: string) {
    setError(null)
    const { error: err } = await supabase.from('merchant_rules').delete().eq('id', id)
    if (err) setError(err.message)
    loadRules()
  }

  if (!household) return null

  return (
    <div className="space-y-6">
      <h2 className="display text-2xl font-semibold">Ajustes</h2>

      <Card className="space-y-3">
        <h3 className="font-semibold">Invitar a tu pareja</h3>
        <p className="text-sm text-text-soft">Comparte este código. Al registrarse, elige "Unirme" e ingresa:</p>
        <CopyField label="Código de invitación" value={household.invite_code} />
      </Card>

      <Card className="space-y-4">
        <h3 className="font-semibold">Webhook de Apple Pay</h3>
        <p className="text-sm text-text-soft">
          Configura el Atajo de iOS con estos dos valores (instrucciones completas en el README del proyecto):
        </p>
        <CopyField label="URL del webhook" value={webhookUrl} />
        <CopyField label="Secreto (header x-webhook-secret)" value={household.webhook_secret} secret />
      </Card>

      <Card className="space-y-4">
        <h3 className="font-semibold">Reglas de categorización automática</h3>
        <p className="text-sm text-text-soft">
          Si el nombre del comercio contiene el patrón, el pago de Apple Pay se clasifica solo
          (ej. patrón <span className="num text-brand">MERCADONA</span> → Mercado).
        </p>
        <form onSubmit={addRule} className="flex flex-wrap items-start gap-3">
          <Field label="Texto del comercio" className="min-w-40 flex-1">
            <input required value={pattern} onChange={(e) => setPattern(e.target.value)} placeholder="Ej. MERCADONA" />
          </Field>
          <Field label="Categoría">
            <select required value={categoryId} onChange={(e) => setCategoryId(e.target.value)} className="min-h-11 w-auto">
              <option value="">Elige…</option>
              {categories.filter((c) => c.kind === 'expense').map((c) => (
                <option key={c.id} value={c.id}>{c.emoji} {c.name}</option>
              ))}
            </select>
          </Field>
          <Button type="submit" className="self-end">Añadir</Button>
        </form>
        {error && <p role="alert" className="text-sm text-negative">{error}</p>}
        {rules.length === 0 && <p className="text-sm text-text-faint">Aún no hay reglas.</p>}
        <ul className="space-y-2">
          {rules.map((r) => {
            const cat = categories.find((c) => c.id === r.category_id)
            return (
              <li key={r.id} className={listItem}>
                <span><span className="num text-brand">{r.pattern}</span> → {cat ? `${cat.emoji} ${cat.name}` : '—'}</span>
                <button type="button" onClick={() => removeRule(r.id)} aria-label={`Eliminar regla ${r.pattern}`} className={iconBtn}>
                  <Trash2 className="size-4" aria-hidden />
                </button>
              </li>
            )
          })}
        </ul>
      </Card>

      <RecurringSection householdId={household.id} categories={categories} />

      <Button variant="ghost" onClick={() => supabase.auth.signOut()}>Cerrar sesión</Button>
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
  const [error, setError] = useState<string | null>(null)
  const [toDelete, setToDelete] = useState<RecurringRule | null>(null)

  useEffect(() => { load() }, [householdId])

  async function load() {
    const { data } = await supabase.from('recurring_rules').select('*').order('day_of_month')
    setRules((data as RecurringRule[]) ?? [])
  }

  async function add(e: FormEvent) {
    e.preventDefault()
    const value = Number(amount)
    if (!Number.isFinite(value) || value <= 0) { setError('Monto inválido'); return }
    setError(null)
    const { error: err } = await supabase.from('recurring_rules').insert({
      household_id: householdId,
      description, type, currency,
      amount: value,
      category_id: categoryId || null,
      day_of_month: Number(day),
    })
    if (err) { setError(err.message); return }
    setDescription(''); setAmount(''); setCategoryId('')
    load()
  }

  async function toggle(r: RecurringRule) {
    setError(null)
    const { error: err } = await supabase.from('recurring_rules').update({ active: !r.active }).eq('id', r.id)
    if (err) setError(err.message)
    load()
  }

  // Not safely deferrable (generated rows would keep appearing), so confirm in a Modal.
  async function confirmRemove() {
    if (!toDelete) return
    setError(null)
    const { error: err } = await supabase.from('recurring_rules').delete().eq('id', toDelete.id)
    if (err) setError(err.message)
    setToDelete(null)
    load()
  }

  return (
    <Card className="space-y-4">
      <h3 className="font-semibold">Recurrentes</h3>
      <p className="text-sm text-text-soft">
        Alquiler, nómina, suscripciones… se registran solas el día elegido de cada mes (al abrir la app).
      </p>
      <form onSubmit={add} className="flex flex-wrap items-start gap-3">
        <Field label="Descripción" className="min-w-36 flex-1">
          <input required value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Ej. Alquiler" />
        </Field>
        <Field label="Monto" className="w-28">
          <input required type="number" min="0.01" step="0.01" inputMode="decimal"
            value={amount} onChange={(e) => setAmount(e.target.value)} />
        </Field>
        <Field label="Moneda">
          <select value={currency} onChange={(e) => setCurrency(e.target.value as Currency)} className="min-h-11 w-auto">
            <option value="EUR">EUR</option>
            <option value="COP">COP</option>
          </select>
        </Field>
        <Field label="Tipo">
          <select value={type} onChange={(e) => { setType(e.target.value as TxType); setCategoryId('') }} className="min-h-11 w-auto">
            <option value="expense">Gasto</option>
            <option value="income">Ingreso</option>
          </select>
        </Field>
        <Field label="Categoría">
          <select value={categoryId} onChange={(e) => setCategoryId(e.target.value)} className="min-h-11 w-auto">
            <option value="">Sin categoría</option>
            {categories.filter((c) => c.kind === type).map((c) => (
              <option key={c.id} value={c.id}>{c.emoji} {c.name}</option>
            ))}
          </select>
        </Field>
        <Field label="Día (1-28)" className="w-24">
          <input required type="number" min="1" max="28" value={day} onChange={(e) => setDay(e.target.value)} />
        </Field>
        <Button type="submit" className="self-end">Añadir</Button>
      </form>
      {error && <p role="alert" className="text-sm text-negative">{error}</p>}
      {rules.length === 0 && <p className="text-sm text-text-faint">Aún no hay recurrentes.</p>}
      <ul className="space-y-2">
        {rules.map((r) => {
          const cat = categories.find((c) => c.id === r.category_id)
          return (
            <li key={r.id} className={`${listItem} ${r.active ? '' : 'opacity-60'}`}>
              <span>
                {r.type === 'income' ? '💰' : '💸'} <span className="font-medium">{r.description}</span>
                {' · '}<span className="num">{formatMoney(r.amount, r.currency)}</span>
                {' · '}el {r.day_of_month} de cada mes
                {cat && <> · {cat.emoji} {cat.name}</>}
                {!r.active && ' · en pausa'}
              </span>
              <span className="flex items-center gap-1">
                <Button variant="ghost" size="sm" className="min-h-11" onClick={() => toggle(r)}>
                  {r.active ? 'Pausar' : 'Activar'}
                </Button>
                <button type="button" onClick={() => setToDelete(r)} aria-label={`Eliminar recurrente ${r.description}`} className={iconBtn}>
                  <Trash2 className="size-4" aria-hidden />
                </button>
              </span>
            </li>
          )
        })}
      </ul>

      <Modal open={toDelete !== null} onClose={() => setToDelete(null)} title="¿Eliminar recurrente?">
        <p className="text-sm text-text-soft">
          Se eliminará «{toDelete?.description}». Las transacciones ya generadas se conservan.
        </p>
        <div className="mt-5 flex justify-end gap-2">
          <Button variant="ghost" onClick={() => setToDelete(null)}>Cancelar</Button>
          <Button variant="danger" onClick={confirmRemove}>Eliminar</Button>
        </div>
      </Modal>
    </Card>
  )
}
