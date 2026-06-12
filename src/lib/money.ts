import type { Category, Currency, Transaction } from '../types'

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
