import { useState, type FormEvent } from 'react'
import { motion } from 'framer-motion'
import { supabase } from '../../lib/supabase'

export default function AuthPage() {
  const [mode, setMode] = useState<'login' | 'signup'>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [info, setInfo] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

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

  return (
    <div className="grid min-h-dvh place-items-center px-4">
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
        className="card w-full max-w-sm p-8"
      >
        <p className="num mb-1 text-xs uppercase tracking-[0.3em] text-amber">COP ⇄ EUR</p>
        <h1 className="display mb-6 text-3xl font-bold">{mode === 'login' ? 'Entrar' : 'Crear cuenta'}</h1>
        <form onSubmit={handleSubmit} className="space-y-4">
          <input type="email" required placeholder="correo@ejemplo.com" value={email} onChange={(e) => setEmail(e.target.value)} />
          <input type="password" required minLength={8} placeholder="Contraseña (mín. 8)" value={password} onChange={(e) => setPassword(e.target.value)} />
          {error && <p className="text-sm text-coral">{error}</p>}
          {info && <p className="text-sm text-mint">{info}</p>}
          <button className="btn btn-primary w-full" disabled={busy}>
            {busy ? '…' : mode === 'login' ? 'Entrar' : 'Registrarme'}
          </button>
        </form>
        <button
          onClick={() => setMode(mode === 'login' ? 'signup' : 'login')}
          className="mt-4 w-full text-center text-sm text-cream-dim hover:text-cream"
        >
          {mode === 'login' ? '¿Sin cuenta? Regístrate' : '¿Ya tienes cuenta? Entra'}
        </button>
      </motion.div>
    </div>
  )
}
