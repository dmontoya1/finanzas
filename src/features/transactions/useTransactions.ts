import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import type { Transaction } from '../../types'

/** Carga transacciones en un rango de fechas (ISO yyyy-MM-dd) con realtime opcional. */
export function useTransactions(from: string, to: string) {
  const [transactions, setTransactions] = useState<Transaction[]>([])
  // loading derivado: true mientras lo cargado no corresponda al rango pedido
  const [loadedKey, setLoadedKey] = useState<string | null>(null)
  const key = `${from}|${to}`

  // Lectura pura (sin setState) para poder usarla dentro del efecto
  const load = useCallback(async () => {
    const { data } = await supabase
      .from('transactions')
      .select('*')
      .gte('occurred_at', from)
      .lte('occurred_at', to)
      .order('occurred_at', { ascending: false })
      .order('created_at', { ascending: false })
    return (data as Transaction[]) ?? []
  }, [from, to])

  const refresh = useCallback(async () => {
    setTransactions(await load())
    setLoadedKey(key)
  }, [load, key])

  useEffect(() => {
    let ignore = false
    load().then((d) => {
      if (ignore) return
      setTransactions(d)
      setLoadedKey(key)
    })
    // Realtime: los pagos del atajo de Apple Pay aparecen sin recargar
    const channel = supabase
      .channel('tx-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'transactions' }, refresh)
      .subscribe()
    return () => {
      ignore = true
      supabase.removeChannel(channel)
    }
  }, [load, key, refresh])

  return { transactions, loading: loadedKey !== key, refresh }
}
