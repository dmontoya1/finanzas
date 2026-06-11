import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import type { Transaction } from '../../types'

/** Carga transacciones en un rango de fechas (ISO yyyy-MM-dd) con realtime opcional. */
export function useTransactions(from: string, to: string) {
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(async () => {
    const { data } = await supabase
      .from('transactions')
      .select('*')
      .gte('occurred_at', from)
      .lte('occurred_at', to)
      .order('occurred_at', { ascending: false })
      .order('created_at', { ascending: false })
    setTransactions((data as Transaction[]) ?? [])
    setLoading(false)
  }, [from, to])

  useEffect(() => {
    setLoading(true)
    refresh()
    // Realtime: los pagos del atajo de Apple Pay aparecen sin recargar
    const channel = supabase
      .channel('tx-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'transactions' }, refresh)
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [refresh])

  return { transactions, loading, refresh }
}
