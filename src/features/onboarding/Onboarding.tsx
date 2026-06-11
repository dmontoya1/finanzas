import { useState, type FormEvent } from 'react'
import { motion } from 'framer-motion'
import { supabase } from '../../lib/supabase'
import { useApp } from '../../context/AppContext'

export default function Onboarding() {
  const { session, refreshHousehold, refreshCategories } = useApp()
  const [tab, setTab] = useState<'create' | 'join'>('create')
  const [name, setName] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [code, setCode] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function handleCreate(e: FormEvent) {
    e.preventDefault()
    if (!session) return
    setBusy(true); setError(null)
    try {
      const { error } = await supabase.rpc('create_household', {
        household_name: name,
        member_name: displayName,
      })
      if (error) throw error
      await refreshHousehold(); await refreshCategories()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error inesperado')
    } finally { setBusy(false) }
  }

  async function handleJoin(e: FormEvent) {
    e.preventDefault()
    setBusy(true); setError(null)
    const { error } = await supabase.rpc('join_household', { code, name: displayName })
    if (error) setError(error.message)
    else { await refreshHousehold(); await refreshCategories() }
    setBusy(false)
  }

  return (
    <div className="grid min-h-dvh place-items-center px-4">
      <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} className="card w-full max-w-md p-8">
        <h1 className="display mb-1 text-3xl font-bold">Tu espacio compartido</h1>
        <p className="mb-6 text-sm text-cream-dim">Crea un hogar o únete al de tu pareja con un código.</p>
        <div className="mb-6 flex gap-2">
          <button onClick={() => setTab('create')} className={`btn flex-1 ${tab === 'create' ? 'btn-primary' : 'btn-ghost'}`}>Crear hogar</button>
          <button onClick={() => setTab('join')} className={`btn flex-1 ${tab === 'join' ? 'btn-primary' : 'btn-ghost'}`}>Unirme</button>
        </div>
        <form onSubmit={tab === 'create' ? handleCreate : handleJoin} className="space-y-4">
          <input required placeholder="Tu nombre (ej. Dani)" value={displayName} onChange={(e) => setDisplayName(e.target.value)} />
          {tab === 'create'
            ? <input required placeholder="Nombre del hogar (ej. Casa Madrid)" value={name} onChange={(e) => setName(e.target.value)} />
            : <input required placeholder="Código de invitación" value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} className="num uppercase" />}
          {error && <p className="text-sm text-coral">{error}</p>}
          <button className="btn btn-primary w-full" disabled={busy}>{busy ? '…' : 'Continuar'}</button>
        </form>
      </motion.div>
    </div>
  )
}
