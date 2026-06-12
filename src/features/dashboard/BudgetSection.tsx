import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import { budgetProgress, formatMoney, type BudgetProgress } from '../../lib/money'
import type { Category, Transaction } from '../../types'

interface Row {
  category: Category
  progress: BudgetProgress
}

export default function BudgetSection({ categories, monthTxs }: {
  categories: Category[]
  monthTxs: Transaction[]
}) {
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
        <p className="text-sm text-cream-faint">
          Define topes mensuales en <Link to="/categorias" className="underline hover:text-cream">Categorías</Link>.
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
          const warn = !over && progress.ratio >= 0.8
          const barColor = over ? 'bg-coral' : warn ? 'bg-amber' : 'bg-mint'
          return (
            <li key={category.id}>
              <div className="mb-1 flex items-baseline justify-between gap-2 text-sm">
                <span className="truncate">{category.emoji} {category.name}</span>
                <span className="num text-cream-dim">
                  {formatMoney(progress.spent, progress.currency)} / {formatMoney(progress.limit, progress.currency)}
                  {over && (
                    <span className="ml-1 text-coral">
                      +{formatMoney(progress.spent - progress.limit, progress.currency)}
                    </span>
                  )}
                </span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-ink-950/60">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${Math.min(progress.ratio, 1) * 100}%` }}
                  transition={{ duration: 0.6, ease: 'easeOut' }}
                  className={`h-full rounded-full ${barColor}`}
                />
              </div>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
