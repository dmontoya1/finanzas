import type { Category, Currency, RecurringRule, Transaction } from '../types'

const fmtEUR = new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' })
const fmtCOP = new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 })

export function formatMoney(amount: number, currency: Currency): string {
  return currency === 'EUR' ? fmtEUR.format(amount) : fmtCOP.format(amount)
}

/** Convierte una transacción a la moneda de vista usando su tasa histórica. */
export function convert(tx: Pick<Transaction, 'amount' | 'currency' | 'fx_rate'>, view: Currency): number {
  if (tx.currency === view) return tx.amount
  return view === 'EUR' ? tx.amount / tx.fx_rate : tx.amount * tx.fx_rate
}

export function sumIn(txs: Pick<Transaction, 'amount' | 'currency' | 'fx_rate'>[], view: Currency): number {
  return txs.reduce((acc, t) => acc + convert(t, view), 0)
}

export interface BudgetProgress {
  spent: number
  limit: number
  /** spent / limit; > 1 = pasado del tope */
  ratio: number
  currency: Currency
}

/** Progreso del presupuesto de una categoría contra las transacciones del mes.
 *  null si la categoría no tiene tope. Convierte cada gasto a la moneda del
 *  presupuesto con su tasa histórica. */
export function budgetProgress(category: Category, monthTxs: Transaction[]): BudgetProgress | null {
  if (category.budget_amount == null || category.budget_currency == null) return null
  const spent = sumIn(
    monthTxs.filter((t) => t.type === 'expense' && t.category_id === category.id),
    category.budget_currency,
  )
  return {
    spent,
    limit: category.budget_amount,
    ratio: spent / category.budget_amount,
    currency: category.budget_currency,
  }
}

export interface MonthProjection {
  projectedExpense: number
  projectedBalance: number
}

/** Proyección de cierre de mes por ritmo diario de gasto.
 *  Los ingresos no se extrapolan (son puntuales, tipo nómina):
 *  balance proyectado = ingresos actuales − gasto proyectado.
 *  null si aún no hay gastos en el mes. */
export function projectMonth(
  monthTxs: Pick<Transaction, 'amount' | 'currency' | 'fx_rate' | 'type'>[],
  view: Currency,
  dayOfMonth: number,
  daysInMonth: number,
): MonthProjection | null {
  const expense = sumIn(monthTxs.filter((t) => t.type === 'expense'), view)
  if (expense === 0) return null
  const income = sumIn(monthTxs.filter((t) => t.type === 'income'), view)
  const projectedExpense = (expense / dayOfMonth) * daysInMonth
  return { projectedExpense, projectedBalance: income - projectedExpense }
}

export interface HeroSummary {
  mode: 'remaining' | 'over' | 'balance' | 'closed'
  /** remaining (>= 0) | overspent (> 0) | income - expenses | signed margin for a past month */
  amount: number
  /** Total budgets in view currency; 0 when no category has a budget. */
  limit: number
  /** Expenses in categories that have a budget. */
  spent: number
  /** spent / limit, 0 when limit is 0. */
  usedRatio: number
  /** Only current month and mode 'remaining': amount / daysLeft. */
  perDay: number | null
  /** Current month only: spent / dayOfMonth * daysInMonth. */
  projectedSpent: number | null
  /** Expenses in categories without a budget plus uncategorized. */
  unbudgetedSpent: number
}

/** Hero figures for the dashboard. Limits are forecasts, so they convert at the
 *  current `rate` (COP per 1 EUR); spending uses each tx's own historical fx_rate. */
export function heroSummary(a: {
  categories: Category[]; monthTxs: Transaction[]; view: Currency; rate: number
  isCurrentMonth: boolean; dayOfMonth: number; daysInMonth: number
}): HeroSummary {
  const { categories, monthTxs, view, rate, isCurrentMonth, dayOfMonth, daysInMonth } = a
  const budgeted = new Map<string, number>()
  for (const c of categories) {
    if (c.budget_amount == null || c.budget_currency == null) continue
    // Approximation: for past months the limit is also converted at today's rate.
    const limit = c.budget_currency === view ? c.budget_amount
      : view === 'COP' ? c.budget_amount * rate : c.budget_amount / rate
    budgeted.set(c.id, limit)
  }
  const expenses = monthTxs.filter((t) => t.type === 'expense')
  const spent = sumIn(expenses.filter((t) => t.category_id != null && budgeted.has(t.category_id)), view)
  const unbudgetedSpent = sumIn(expenses.filter((t) => t.category_id == null || !budgeted.has(t.category_id)), view)
  const limit = [...budgeted.values()].reduce((s, v) => s + v, 0)
  const none = { perDay: null, projectedSpent: null }

  if (budgeted.size === 0) {
    const income = sumIn(monthTxs.filter((t) => t.type === 'income'), view)
    return { mode: 'balance', amount: income - spent - unbudgetedSpent, limit: 0, spent, usedRatio: 0, unbudgetedSpent, ...none }
  }
  const usedRatio = spent / limit
  if (!isCurrentMonth) return { mode: 'closed', amount: limit - spent, limit, spent, usedRatio, unbudgetedSpent, ...none }

  const projectedSpent = (spent / dayOfMonth) * daysInMonth
  if (spent > limit) return { mode: 'over', amount: spent - limit, limit, spent, usedRatio, unbudgetedSpent, perDay: null, projectedSpent }
  const amount = limit - spent
  const daysLeft = daysInMonth - dayOfMonth + 1
  return { mode: 'remaining', amount, limit, spent, usedRatio, unbudgetedSpent, perDay: amount / daysLeft, projectedSpent }
}

export interface UpcomingPayment { rule: RecurringRule; dueDate: string; daysUntil: number; amountInView: number }

/** Active recurring rules still due later this month (not yet generated), sorted by day.
 *  Amounts convert at the current `rate` since they have not happened yet. */
export function upcomingRecurring(a: {
  rules: RecurringRule[]; generatedRuleIds: ReadonlySet<string>; today: Date; view: Currency; rate: number
}): UpcomingPayment[] {
  const { rules, generatedRuleIds, today, view, rate } = a
  const day = today.getDate()
  const prefix = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`
  return rules
    .filter((r) => r.active && r.day_of_month > day && !generatedRuleIds.has(r.id))
    .sort((x, y) => x.day_of_month - y.day_of_month)
    .map((rule) => ({
      rule,
      dueDate: `${prefix}-${String(rule.day_of_month).padStart(2, '0')}`,
      daysUntil: rule.day_of_month - day,
      amountInView: convert({ amount: rule.amount, currency: rule.currency, fx_rate: rate }, view),
    }))
}
