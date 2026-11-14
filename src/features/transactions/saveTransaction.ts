import { supabase } from '../../lib/supabase'
import { getEurCopRate } from '../../lib/fx'
import type { Currency, TxType } from '../../types'

export interface TransactionInput {
  householdId: string; userId: string; type: TxType; amount: number; currency: Currency
  fxRate: number | null            // null means fetch getEurCopRate()
  categoryId: string | null; description: string | null; date: string   // yyyy-MM-dd
}

export async function saveTransaction(
  input: TransactionInput,
  existingId?: string,
): Promise<{ error: string | null }> {
  const payload = {
    household_id: input.householdId,
    user_id: input.userId,
    type: input.type,
    status: 'confirmed' as const,
    amount: input.amount,
    currency: input.currency,
    fx_rate: input.fxRate ?? (await getEurCopRate()),
    category_id: input.categoryId || null,
    description: input.description || null,
    occurred_at: input.date,
  }
  const { error } = existingId
    ? await supabase.from('transactions').update(payload).eq('id', existingId)
    : await supabase.from('transactions').insert(payload)
  return { error: error?.message ?? null }
}

export { parseAmountInput } from './parseAmount'
