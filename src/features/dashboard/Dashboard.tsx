import { useEffect, useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { endOfMonth, format, getDaysInMonth, startOfMonth, subMonths } from 'date-fns'
import { es } from 'date-fns/locale'
import { useApp } from '../../context/useApp'
import { useTransactions } from '../transactions/useTransactions'
import MonthPicker from '../../components/MonthPicker'
import { heroSummary, sumIn, upcomingRecurring } from '../../lib/money'
import { getEurCopRate } from '../../lib/fx'
import Hero from './Hero'
import { useRecurringRules } from './useRecurringRules'
import { IncomeExpenseTiles, TopSpending, UpcomingTile, PendingTile, RecentTransactions } from './BentoTiles'
import BudgetSection from './BudgetSection'
import { supabase } from '../../lib/supabase'
import type { Transaction } from '../../types'

const cardVariants = {
  hidden: { opacity: 0, y: 16 },
  show: (i: number) => ({ opacity: 1, y: 0, transition: { delay: i * 0.08, duration: 0.45, ease: 'easeOut' as const } }),
}

export default function Dashboard() {
  const { viewCurrency, categories, household } = useApp()
  const [month, setMonth] = useState(() => startOfMonth(new Date()))

  // Traemos 6 meses; el mes activo se filtra en memoria
  const from = format(startOfMonth(subMonths(month, 5)), 'yyyy-MM-dd')
  const to = format(endOfMonth(month), 'yyyy-MM-dd')
  const { transactions, loading, refresh } = useTransactions(from, to)

  const monthKey = format(month, 'yyyy-MM')
  const monthTxs = useMemo(
    () => transactions.filter((t) => t.occurred_at.startsWith(monthKey)),
    [transactions, monthKey],
  )

  const income = sumIn(monthTxs.filter((t) => t.type === 'income'), viewCurrency)
  const expense = sumIn(monthTxs.filter((t) => t.type === 'expense'), viewCurrency)
  const pending = transactions.filter((t) => t.status === 'pending_review')

  const today = new Date()
  const [rate, setRate] = useState<number | null>(null)
  useEffect(() => { getEurCopRate().then(setRate) }, [])
  const { rules, loading: rulesLoading } = useRecurringRules(household!.id)
  const isCurrentMonth = monthKey === format(today, 'yyyy-MM')
  const generatedRuleIds = useMemo(
    () => new Set(monthTxs.filter((t) => t.recurring_month === monthKey && t.recurring_rule_id).map((t) => t.recurring_rule_id!)),
    [monthTxs, monthKey],
  )
  const upcoming = useMemo(
    () => (isCurrentMonth && rate != null ? upcomingRecurring({ rules, generatedRuleIds, today: new Date(), view: viewCurrency, rate }) : []),
    [isCurrentMonth, rate, rules, generatedRuleIds, viewCurrency],
  )
  const summary = rate == null ? null : heroSummary({
    categories, monthTxs, view: viewCurrency, rate, isCurrentMonth,
    dayOfMonth: today.getDate(), daysInMonth: getDaysInMonth(today),
  })

  async function confirmTx(t: Transaction, categoryId: string) {
    await supabase.from('transactions')
      .update({ category_id: categoryId, status: 'confirmed' })
      .eq('id', t.id)
    refresh()
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h2 className="display text-2xl font-semibold">Resumen</h2>
        <MonthPicker month={month} onChange={(d) => setMonth(startOfMonth(d))} />
      </div>

      {summary && (
        <Hero
          summary={summary} view={viewCurrency} monthLabel={format(month, 'MMMM', { locale: es })}
          upcomingTotal={upcoming.length ? upcoming.reduce((s, u) => s + u.amountInView, 0) : null}
          loading={loading || rulesLoading}
        />
      )}
      {!summary && <Hero summary={{ mode: 'balance', amount: 0, limit: 0, spent: 0, usedRatio: 0, perDay: null, projectedSpent: null, unbudgetedSpent: 0 }} view={viewCurrency} monthLabel="" upcomingTotal={null} loading />}

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <IncomeExpenseTiles income={income} expense={expense} view={viewCurrency} />
        <TopSpending transactions={monthTxs} categories={categories} view={viewCurrency} />
        <UpcomingTile items={upcoming} view={viewCurrency} />
        <PendingTile items={pending} categories={categories} onConfirm={confirmTx} />
        <RecentTransactions transactions={monthTxs} categories={categories} view={viewCurrency} />
      </div>

      {/* Presupuestos del mes */}
      <motion.div custom={2.5} variants={cardVariants} initial="hidden" animate="show">
        <BudgetSection categories={categories} monthTxs={monthTxs} />
      </motion.div>
    </div>
  )
}
