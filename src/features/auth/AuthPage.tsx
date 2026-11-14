import { useState, type FormEvent } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import { supabase } from '../../lib/supabase'
import { Button, Card, Field } from '../../components/ui'

export default function AuthPage() {
  const [mode, setMode] = useState<'login' | 'signup'>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [info, setInfo] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const reduce = useReducedMotion()

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setBusy(true); setError(null); setInfo(null)
    const action = mode === 'login'
      ? supabase.auth.signInWithPassword({ email, password })
      : supabase.auth.signUp({ email, password })
    const { error } = await action
    if (error) setError(error.message)
    else if (mode === 'signup') setInfo('Revisa tu correo para confirmar la cuenta.')
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
      <Card animate className="relative w-full max-w-sm p-8">
        <motion.p {...rise(0)} className="num mb-1 text-xs uppercase tracking-[0.3em] text-brand">COP ⇄ EUR</motion.p>
        <motion.h1 {...rise(1)} className="display mb-6 text-3xl font-bold">
          {mode === 'login' ? 'Entrar' : 'Crear cuenta'}
        </motion.h1>
        <motion.form {...rise(2)} onSubmit={handleSubmit} className="space-y-4">
          <Field label="Correo electrónico">
            <input
              type="email" inputMode="email" autoComplete="email" required
              placeholder="correo@ejemplo.com"
              value={email} onChange={(e) => setEmail(e.target.value)}
            />
          </Field>
          <Field label="Contraseña" hint={mode === 'signup' ? 'Mínimo 8 caracteres.' : undefined}>
            <input
              type="password" required minLength={8}
              autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
              value={password} onChange={(e) => setPassword(e.target.value)}
            />
          </Field>
          <div role="alert" aria-live="assertive">
            {error && <p className="text-sm text-negative">{error}</p>}
          </div>
          <div role="status" aria-live="polite">
            {info && <p className="text-sm text-positive">{info}</p>}
          </div>
          <Button type="submit" loading={busy} className="w-full">
            {mode === 'login' ? 'Entrar' : 'Registrarme'}
          </Button>
        </motion.form>
        <motion.div {...rise(3)} className="mt-4">
          <Button
            type="button" variant="ghost" className="w-full border-transparent"
            onClick={() => { setMode(mode === 'login' ? 'signup' : 'login'); setError(null); setInfo(null) }}
          >
            {mode === 'login' ? '¿Sin cuenta? Regístrate' : '¿Ya tienes cuenta? Entra'}
          </Button>
        </motion.div>
      </Card>
    </div>
  )
}
