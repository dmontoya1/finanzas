import { useEffect, useState, type FormEvent } from 'react'
import { useApp } from '../../context/AppContext'
import { supabase } from '../../lib/supabase'

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

      <button className="btn btn-ghost" onClick={() => supabase.auth.signOut()}>Cerrar sesión</button>
    </div>
  )
}
