import { type ReactNode } from 'react'
import { NavLink } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useApp } from '../context/AppContext'
import type { Currency } from '../types'

const NAV = [
  { to: '/', label: 'Resumen' },
  { to: '/movimientos', label: 'Movimientos' },
  { to: '/categorias', label: 'Categorías' },
  { to: '/ajustes', label: 'Ajustes' },
]

export function CurrencyToggle() {
  const { viewCurrency, setViewCurrency } = useApp()
  return (
    <div className="relative flex rounded-full border border-cream/15 bg-ink-900 p-1 text-sm font-semibold">
      {(['EUR', 'COP'] as Currency[]).map((c) => (
        <button
          key={c}
          onClick={() => setViewCurrency(c)}
          className={`relative z-10 rounded-full px-4 py-1.5 transition-colors ${
            viewCurrency === c ? 'text-ink-950' : 'text-cream-dim hover:text-cream'
          }`}
        >
          {viewCurrency === c && (
            <motion.span
              layoutId="currency-pill"
              className="absolute inset-0 -z-10 rounded-full bg-amber"
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
  return (
    <div className="mx-auto max-w-6xl px-4 pb-24 pt-6 sm:px-6">
      <header className="mb-8 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="display text-3xl font-bold tracking-tight">{household?.name ?? 'Cuentas'}</h1>
          <p className="text-sm text-cream-faint">Presupuesto en dos monedas, sin perder el hilo.</p>
        </div>
        <CurrencyToggle />
      </header>

      <nav className="mb-8 flex gap-1 overflow-x-auto rounded-2xl border border-cream/10 bg-ink-900/70 p-1.5 backdrop-blur">
        {NAV.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === '/'}
            className={({ isActive }) =>
              `relative whitespace-nowrap rounded-xl px-4 py-2 text-sm font-semibold transition-colors ${
                isActive ? 'text-ink-950' : 'text-cream-dim hover:text-cream'
              }`
            }
          >
            {({ isActive }) => (
              <>
                {isActive && (
                  <motion.span
                    layoutId="nav-pill"
                    className="absolute inset-0 -z-10 rounded-xl bg-mint"
                    transition={{ type: 'spring', stiffness: 500, damping: 35 }}
                  />
                )}
                {item.label}
              </>
            )}
          </NavLink>
        ))}
      </nav>

      <main>{children}</main>
    </div>
  )
}
