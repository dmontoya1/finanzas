import { Link } from 'react-router-dom'
import { AnimatedNumber, Skeleton } from '../../components/ui'
import { formatMoney, type HeroSummary } from '../../lib/money'
import type { Currency } from '../../types'

interface Props {
  summary: HeroSummary
  view: Currency
  monthLabel: string
  /** Sum of upcoming recurring payments in view currency, or null when none. */
  upcomingTotal: number | null
  loading: boolean
}

const R = 30
const CIRC = 2 * Math.PI * R

function Ring({ ratio }: { ratio: number }) {
  const pct = Math.min(Math.max(ratio, 0), 1)
  return (
    <svg viewBox="0 0 72 72" className="size-20 shrink-0 -rotate-90" role="img" aria-label={`${Math.round(ratio * 100)}% del presupuesto usado`}>
      <circle cx="36" cy="36" r={R} fill="none" stroke="rgba(255,255,255,.25)" strokeWidth="7" />
      <circle cx="36" cy="36" r={R} fill="none" stroke="#fff" strokeWidth="7" strokeLinecap="round"
        strokeDasharray={CIRC} strokeDashoffset={CIRC * (1 - pct)} />
    </svg>
  )
}

function title(s: HeroSummary, monthLabel: string, view: Currency) {
  switch (s.mode) {
    case 'remaining': return 'Te quedan para gastar'
    case 'over': return 'Te pasaste'
    case 'balance': return 'Balance del mes'
    case 'closed': return `Cerró ${monthLabel} con ${formatMoney(Math.abs(s.amount), view)} de ${s.amount >= 0 ? 'margen' : 'exceso'}`
  }
}

export default function Hero({ summary: s, view, monthLabel, upcomingTotal, loading }: Props) {
  if (loading) return <Skeleton className="h-52 w-full rounded-2xl" />

  const over = s.mode === 'over'
  const closed = s.mode === 'closed'
  const fmt = (n: number) => formatMoney(n, view)
  const signed = (n: number) => `${n < 0 ? '−' : s.mode === 'balance' ? '+' : ''}${fmt(Math.abs(n))}`
  const projectedOver = s.projectedSpent != null && s.projectedSpent > s.limit

  return (
    <section className={`${over ? 'hero-gradient-over' : 'hero-gradient'} flex items-center justify-between gap-4 rounded-2xl p-5 text-white shadow-lg sm:p-6`}>
      <div className="min-w-0 space-y-1.5">
        <p className="text-sm font-medium opacity-90">{title(s, monthLabel, view)}</p>
        {!closed && (
          <AnimatedNumber value={s.amount} format={signed} className="num block text-4xl font-semibold sm:text-5xl" />
        )}
        {s.perDay != null && s.mode === 'remaining' && (
          <p className="num text-sm opacity-90">≈ {fmt(s.perDay)} al día{s.perDay > 0 ? ` · ${Math.round(s.amount / s.perDay)} días` : ''}</p>
        )}
        {s.projectedSpent != null && (
          <p className={`text-sm ${projectedOver ? 'font-semibold' : 'opacity-90'}`}>
            {projectedOver && '⚠ '}Al ritmo actual cerrarás en {fmt(s.projectedSpent)} de {fmt(s.limit)}
          </p>
        )}
        {upcomingTotal != null && s.mode === 'remaining' && (
          <p className="num text-sm opacity-90">Libre de verdad: {fmt(s.amount - upcomingTotal)} tras pagos recurrentes</p>
        )}
        {s.unbudgetedSpent > 0 && (
          <p className="num text-sm opacity-90">{fmt(s.unbudgetedSpent)} sin presupuesto</p>
        )}
        {s.mode === 'balance' && (
          <Link to="/categorias" className="mt-1 inline-flex min-h-11 items-center rounded-full bg-white/20 px-4 text-sm font-medium underline-offset-2 hover:bg-white/30">
            Define presupuestos por categoría
          </Link>
        )}
      </div>
      {s.mode !== 'balance' && <Ring ratio={s.usedRatio} />}
    </section>
  )
}
