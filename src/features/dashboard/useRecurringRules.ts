import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import type { RecurringRule } from '../../types'

/** Active recurring rules of the household. State is only set inside the promise callback. */
export function useRecurringRules(householdId: string) {
  const [state, setState] = useState<{ id: string; rules: RecurringRule[] } | null>(null)

  useEffect(() => {
    let ignore = false
    supabase.from('recurring_rules').select('*').eq('household_id', householdId).eq('active', true)
      .then(({ data }) => { if (!ignore) setState({ id: householdId, rules: (data as RecurringRule[]) ?? [] }) })
    return () => { ignore = true }
  }, [householdId])

  const ready = state?.id === householdId
  return { rules: ready ? state.rules : [], loading: !ready }
}
