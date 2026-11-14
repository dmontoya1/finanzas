import { useState, type FormEvent } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import { supabase } from '../../lib/supabase'
import { useApp } from '../../context/useApp'
import { Button, Card, Field } from '../../components/ui'

export default function Onboarding() {
  const { session, refreshHousehold, refreshCategories } = useApp()
  const [tab, setTab] = useState<'create' | 'join'>('create')
  const [name, setName] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [code, setCode] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const reduce = useReducedMotion()

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

  // Staggered rise for the card contents; skipped entirely under reduced motion.
  const rise = (i: number) => reduce
    ? {}
    : {
        initial: { opacity: 0, y: 12 },
        animate: { opacity: 1, y: 0 },
        transition: { type: 'spring' as const, stiffness: 260, damping: 26, delay: 0.12 + i * 0.07 },
      }

  return (
    <div className="relative grid min-h-dvh place-items-center overflow-hidden px-4">
      <motion.div
        aria-hidden
        className="hero-gradient pointer-events-none absolute inset-x-0 top-0 h-72 rounded-b-[3rem]"
        initial={reduce ? false : { opacity: 0, y: -40 }}
        animate={{ opacity: 0.16, y: 0 }}
        transition={{ duration: 0.8, ease: 'easeOut' }}
      />
      <Card animate className="relative w-full max-w-md p-8">
        <motion.h1 {...rise(0)} className="display mb-1 text-3xl font-bold">Tu espacio compartido</motion.h1>
        <motion.p {...rise(1)} className="mb-6 text-sm text-text-soft">Crea un hogar o únete al de tu pareja con un código.</motion.p>
        <motion.div {...rise(2)} className="mb-6 flex gap-2">
          <Button type="button" variant={tab === 'create' ? 'primary' : 'ghost'} aria-pressed={tab === 'create'} className="flex-1" onClick={() => { setTab('create'); setError(null) }}>Crear hogar</Button>
          <Button type="button" variant={tab === 'join' ? 'primary' : 'ghost'} aria-pressed={tab === 'join'} className="flex-1" onClick={() => { setTab('join'); setError(null) }}>Unirme</Button>
        </motion.div>
        <motion.form {...rise(3)} onSubmit={tab === 'create' ? handleCreate : handleJoin} className="space-y-4">
          <Field label="Tu nombre">
            <input required autoComplete="given-name" placeholder="Ej. Dani" value={displayName} onChange={(e) => setDisplayName(e.target.value)} />
          </Field>
          {tab === 'create'
            ? (
              <Field label="Nombre del hogar">
                <input required autoComplete="off" placeholder="Ej. Casa Madrid" value={name} onChange={(e) => setName(e.target.value)} />
              </Field>
            )
            : (
              <Field label="Código de invitación">
                <input required autoComplete="off" autoCapitalize="characters" spellCheck={false} value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} className="num uppercase" />
              </Field>
            )}
          <div role="alert" aria-live="assertive">
            {error && <p className="text-sm text-negative">{error}</p>}
          </div>
          <Button type="submit" loading={busy} className="w-full">Continuar</Button>
        </motion.form>
      </Card>
    </div>
  )
}
