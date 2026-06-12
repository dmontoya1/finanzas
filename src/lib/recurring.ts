import { format } from 'date-fns'
import { supabase } from './supabase'
import { getEurCopRate } from './fx'
import type { RecurringRule } from '../types'

/** Genera las transacciones recurrentes vencidas del mes actual.
 *  Idempotente: el índice único (recurring_rule_id, recurring_month) hace que
 *  inserts duplicados (otra pestaña/dispositivo) fallen con 23505 y se ignoren.
 *  Nunca lanza: los errores no deben bloquear el arranque de la app. */
export async function generateDueRecurring(householdId: string): Promise<void> {
  try {
    const now = new Date()
    const month = format(now, 'yyyy-MM')
    const today = now.getDate()

    const { data: rules } = await supabase
      .from('recurring_rules')
      .select('*')
      .eq('household_id', householdId)
      .eq('active', true)
      .lte('day_of_month', today)
    if (!rules?.length) return

    const { data: existing } = await supabase
      .from('transactions')
      .select('recurring_rule_id')
      .eq('recurring_month', month)
      .not('recurring_rule_id', 'is', null)
    const done = new Set((existing ?? []).map((t) => t.recurring_rule_id))

    const pending = (rules as RecurringRule[]).filter((r) => !done.has(r.id))
    if (!pending.length) return

    const fxRate = await getEurCopRate()
    for (const r of pending) {
      const { error } = await supabase.from('transactions').insert({
        household_id: householdId,
        user_id: null,
        type: r.type,
        status: 'confirmed',
        amount: r.amount,
        currency: r.currency,
        fx_rate: fxRate,
        category_id: r.category_id,
        description: r.description,
        source: 'recurring',
        occurred_at: `${month}-${String(r.day_of_month).padStart(2, '0')}`,
        recurring_rule_id: r.id,
        recurring_month: month,
      })
      // 23505 = otro dispositivo ganó la carrera: idempotencia funcionando
      if (error && error.code !== '23505') console.error('recurrentes:', error.message)
    }
  } catch (e) {
    console.error('recurrentes:', e)
  }
}
