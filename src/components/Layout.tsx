import { useEffect, useState, type ReactNode } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import { motion, MotionConfig } from 'framer-motion'
import { ArrowLeftRight, LayoutDashboard, Plus, Settings, Tags } from 'lucide-react'
import { Button } from './ui/Button'
import { QuickAdd } from '../features/transactions/QuickAdd'
import { useApp } from '../context/useApp'
import type { Currency } from '../types'

const NAV = [
  { to: '/', label: 'Resumen', icon: LayoutDashboard },
  { to: '/movimientos', label: 'Movimientos', icon: ArrowLeftRight },
  { to: '/categorias', label: 'Categorías', icon: Tags },
  { to: '/ajustes', label: 'Ajustes', icon: Settings },
]

const pillSpring = { type: 'spring', stiffness: 500, damping: 35 } as const

function isTyping(el: Element | null) {
  return el instanceof HTMLElement && (el.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(el.tagName))
}

export function CurrencyToggle() {
  const { viewCurrency, setViewCurrency } = useApp()
  return (
    <div className="relative flex rounded-full border border-line bg-surface-raised p-1 text-sm font-semibold">
      {(['EUR', 'COP'] as Currency[]).map((c) => (
        <button
          key={c}
          onClick={() => setViewCurrency(c)}
          className={`relative z-10 rounded-full px-4 py-1.5 transition-colors ${
            viewCurrency === c ? 'text-surface' : 'text-text-soft hover:text-text'
          }`}
        >
          {viewCurrency === c && (
            <motion.span
              layoutId="currency-pill"
              className="absolute inset-0 -z-10 rounded-full bg-warning"
              transition={{ type: 'spring', stiffness: 500, damping: 35 }}
            />
          )}
          {c === 'EUR' ? '€ EUR' : '$ COP'}
        </button>
      ))}
    </div>
  )
}

export default function Layout({ children }: { children: ReactNode }) {
  const { household } = useApp()
  const { pathname } = useLocation()
  const [quickOpen, setQuickOpen] = useState(false)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'n' || e.ctrlKey || e.metaKey || e.altKey || e.repeat) return
      if (isTyping(document.activeElement) || document.querySelector('[role="dialog"]')) return
      e.preventDefault()
      setQuickOpen(true)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  return (
    <MotionConfig reducedMotion="user">
      <aside className="fixed inset-y-0 left-0 z-20 hidden w-60 flex-col border-r border-line bg-surface-raised p-4 lg:flex">
        <p className="display mb-8 px-3 pt-2 text-2xl font-bold tracking-tight text-text">Cuentas</p>
        <nav aria-label="Principal" className="flex flex-col gap-1">
          {NAV.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              className={({ isActive }) =>
                `relative flex min-h-11 items-center gap-3 rounded-xl px-3 text-sm font-semibold outline-none transition-colors focus-visible:ring-2 focus-visible:ring-brand ${
                  isActive ? 'text-white' : 'text-text-soft hover:text-text'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  {isActive && (
                    <motion.span layoutId="sidebar-pill" className="absolute inset-0 -z-10 rounded-xl bg-brand" transition={pillSpring} />
                  )}
                  <Icon className="size-5" aria-hidden />
                  {label}
                </>
              )}
            </NavLink>
          ))}
        </nav>
      </aside>

      <div className="lg:pl-60">
        <div className="mx-auto max-w-6xl px-4 pb-28 pt-6 sm:px-6 lg:pb-12">
          <header className="mb-8 flex flex-wrap items-center justify-between gap-4">
            <div>
              <h1 className="display text-3xl font-bold tracking-tight">{household?.name ?? 'Cuentas'}</h1>
              <p className="text-sm text-text-faint">Presupuesto en dos monedas, sin perder el hilo.</p>
            </div>
            <CurrencyToggle />
          </header>

          <motion.main key={pathname} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }}>
            {children}
          </motion.main>
        </div>
      </div>

      <nav
        aria-label="Principal"
        className="fixed inset-x-0 bottom-0 z-20 flex border-t border-line bg-surface-raised pb-[env(safe-area-inset-bottom)] lg:hidden"
      >
        {NAV.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) =>
              `relative flex min-h-14 flex-1 flex-col items-center justify-center gap-0.5 text-xs font-semibold outline-none transition-colors focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand ${
                isActive ? 'text-brand' : 'text-text-soft'
              }`
            }
          >
            {({ isActive }) => (
              <>
                {isActive && (
                  <motion.span layoutId="tabbar-pill" className="absolute inset-x-3 top-0 h-0.5 rounded-full bg-brand" transition={pillSpring} />
                )}
                <Icon className="size-5" aria-hidden />
                {label}
              </>
            )}
          </NavLink>
        ))}
      </nav>

      <Button
        aria-label="Añadir movimiento"
        onClick={() => setQuickOpen(true)}
        className="hero-gradient fixed bottom-24 right-4 z-30 size-14 rounded-full text-white shadow-lg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand sm:right-6 lg:bottom-8 lg:right-8"
      >
        <Plus className="size-6" aria-hidden />
      </Button>

      <QuickAdd open={quickOpen} onClose={() => setQuickOpen(false)} onSaved={() => {}} />
    </MotionConfig>
  )
}
