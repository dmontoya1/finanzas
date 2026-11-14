import { supabase } from '../../lib/supabase'
import { hasRuleFor, matchesPattern, suggestPattern } from '../../lib/merchantRules'
import type { Transaction } from '../../types'

export interface ClassifyResult {
  /** Fatal: the transaction itself was not classified. */
  error: string | null
  /** Non-fatal: the transaction was classified but learning the rule failed. */
  warning: string | null
  ruleId: string | null
  pattern: string | null
  alsoIds: string[]
  /** Reverts everything this call did; returns an error message or null. */
  undo: () => Promise<string | null>
}

const noop = async () => null

/** Classifies a pending tx, learns a merchant rule from it and applies it to other matching pending txs. */
export async function classifyPending(p: {
  householdId: string
  tx: Transaction
  categoryId: string
  rules: { pattern: string }[]
  pendingTxs: Transaction[]
}): Promise<ClassifyResult> {
  const { householdId, tx, categoryId, rules, pendingTxs } = p
  const base = { warning: null, ruleId: null, pattern: null, alsoIds: [] as string[] }

  const { error } = await supabase.from('transactions')
    .update({ category_id: categoryId, status: 'confirmed' }).eq('id', tx.id)
  if (error) return { ...base, error: error.message, undo: noop }

  const result: ClassifyResult = { ...base, error: null, undo: noop }
  const pattern = suggestPattern(tx.merchant)
  if (pattern && !hasRuleFor(rules, pattern, tx.merchant)) {
    const { data, error: ruleErr } = await supabase.from('merchant_rules')
      .insert({ household_id: householdId, pattern, category_id: categoryId }).select('id').single()
    if (ruleErr || !data) {
      result.warning = `No se pudo recordar el comercio: ${ruleErr?.message ?? 'sin respuesta'}`
    } else {
      result.ruleId = data.id as string
      result.pattern = pattern
      const ids = pendingTxs
        .filter((t) => t.id !== tx.id && t.type === 'expense' && t.status === 'pending_review' && matchesPattern(t.merchant, pattern))
        .map((t) => t.id)
      if (ids.length) {
        // Only rows actually updated count (a partner may have confirmed some meanwhile).
        const { data: updated, error: alsoErr } = await supabase.from('transactions')
          .update({ category_id: categoryId, status: 'confirmed' }).in('id', ids).eq('status', 'pending_review').select('id')
        if (alsoErr) result.warning = `No se pudieron clasificar los demás: ${alsoErr.message}`
        else result.alsoIds = (updated ?? []).map((r) => r.id as string)
      }
    }
  }

  result.undo = async () => {
    // Guarded reverts: rows a partner changed meanwhile (other status/category) are left untouched.
    const revert = (ids: string[]) => supabase.from('transactions')
      .update({ category_id: null, status: 'pending_review' })
      .in('id', ids).eq('status', 'confirmed').eq('category_id', categoryId)
    const { error: e1 } = await revert([tx.id, ...result.alsoIds])
    // Keep the learned rule if the revert failed, so state stays consistent with what the user sees.
    if (e1 || !result.ruleId) return e1?.message ?? null
    const { error: e2 } = await supabase.from('merchant_rules').delete().eq('id', result.ruleId)
    return e2?.message ?? null
  }
  return result
}
