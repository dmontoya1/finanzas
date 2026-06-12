export type Currency = 'COP' | 'EUR'
export type TxType = 'income' | 'expense'
export type TxStatus = 'confirmed' | 'pending_review'

export interface Household {
  id: string
  name: string
  invite_code: string
  webhook_secret: string
}

export interface Category {
  id: string
  household_id: string
  name: string
  emoji: string
  kind: TxType
  /** Tope mensual fijo; null = sin presupuesto. Ambos campos van juntos. */
  budget_amount: number | null
  budget_currency: Currency | null
}

export interface Transaction {
  id: string
  household_id: string
  user_id: string | null
  type: TxType
  status: TxStatus
  amount: number
  currency: Currency
  /** COP por 1 EUR en la fecha de la transacción */
  fx_rate: number
  category_id: string | null
  description: string | null
  merchant: string | null
  source: 'manual' | 'apple_pay'
  occurred_at: string
  created_at: string
}
