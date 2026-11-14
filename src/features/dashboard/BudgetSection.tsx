import { motion, useReducedMotion } from 'framer-motion'
import { AlertTriangle, CheckCircle2, OctagonAlert } from 'lucide-react'
import { Link } from 'react-router-dom'
import { budgetProgress, formatMoney, type BudgetProgress } from '../../lib/money'
import type { Category, Transaction } from '../../types'

interface Row {
  category: Category
  progress: BudgetProgress
}

// Thresholds: ok < 80%, warning 80-100%, over > 100%. Each state pairs color with an icon and label.
const STATUS = {
  ok: { bar: 'bg-positive', text: 'text-positive', Icon: CheckCircle2, label: 'En rango' },
  warn: { bar: 'bg-warning', text: 'text-warning', Icon: AlertTriangle, label: 'Cerca del límite' },
  over: { bar: 'bg-negative', text: 'text-negative', Icon: OctagonAlert, label: 'Excedido' },
} as const

export default function BudgetSection({ categories, monthTxs }: {
  categories: Category[]
  monthTxs: Transaction[]
}) {
  const reduce = useReducedMotion()
  const rows: Row[] = categories
    .filter((c) => c.kind === 'expense')
    .flatMap((c) => {
      const progress = budgetProgress(c, monthTxs)
      return progress ? [{ category: c, progress }] : []
    })
    .sort((a, b) => b.progress.ratio - a.progress.ratio)

  if (rows.length === 0) {
    return (
      <div className="card p-5">
        <h3 className="mb-1 font-semibold">Presupuestos</h3>
        <p className="text-sm text-text-faint">
          Define topes mensuales en <Link to="/categorias" className="underline hover:text-text">Categorías</Link>.
        </p>
      </div>
    )
  }

  return (
    <div className="card p-5">
      <h3 className="mb-4 font-semibold">Presupuestos</h3>
      <ul className="space-y-3">
        {rows.map(({ category, progress }) => {
          const over = progress.ratio > 1
          const status = STATUS[over ? 'over' : progress.ratio >= 0.8 ? 'warn' : 'ok']
          const pct = Math.round(progress.ratio * 100)
          return (
            <li key={category.id}>
              <div className="mb-1 flex items-baseline justify-between gap-2 text-sm">
                <span className="truncate">{category.emoji} {category.name}</span>
                <span className="num text-text-soft">
                  {formatMoney(progress.spent, progress.currency)} / {formatMoney(progress.limit, progress.currency)}
                </span>
              </div>
              <p className={`mb-1 flex items-center gap-1 text-xs font-semibold ${status.text}`}>
                <status.Icon className="size-3.5" aria-hidden />
                {status.label} · {pct}%
                {over && <span className="num ml-1">+{formatMoney(progress.spent - progress.limit, progress.currency)}</span>}
              </p>
              <div
                role="progressbar"
                aria-label={`Presupuesto de ${category.name}`}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={Math.min(pct, 100)}
                aria-valuetext={`${status.label} · ${pct}%`}
                className="h-2 overflow-hidden rounded-full bg-surface-sunk"
              >
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${Math.min(progress.ratio, 1) * 100}%` }}
                  transition={{ duration: reduce ? 0 : 0.6, ease: 'easeOut' }}
                  className={`h-full rounded-full ${status.bar}`}
                />
              </div>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
