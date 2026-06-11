import type { Currency, Transaction } from '../types'

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
