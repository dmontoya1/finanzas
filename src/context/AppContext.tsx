import { useEffect, useRef, useState, useCallback, type ReactNode } from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'
import { generateDueRecurring } from '../lib/recurring'
import type { Category, Currency, Household } from '../types'
import { Ctx } from './useApp'

export function AppProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)
  const [householdLoading, setHouseholdLoading] = useState(false)
  const [household, setHousehold] = useState<Household | null>(null)
  const [categories, setCategories] = useState<Category[]>([])
  const [viewCurrency, setViewCurrencyState] = useState<Currency>(
    () => (localStorage.getItem('view_currency') as Currency) ?? 'EUR',
  )

  const setViewCurrency = (c: Currency) => {
    localStorage.setItem('view_currency', c)
    setViewCurrencyState(c)
  }

  // Lecturas puras (sin setState) para poder usarlas dentro de efectos
  const fetchHousehold = useCallback(async () => {
    const { data } = await supabase
      .from('household_members')
      .select('households(*)')
      .limit(1)
      .maybeSingle()
    return (data?.households as unknown as Household) ?? null
  }, [])

  const fetchCategories = useCallback(async (): Promise<Category[]> => {
    const { data } = await supabase.from('categories').select('*').order('name')
    return data ?? []
  }, [])

  const refreshHousehold = useCallback(async () => setHousehold(await fetchHousehold()), [fetchHousehold])
  const refreshCategories = useCallback(async () => setCategories(await fetchCategories()), [fetchCategories])

  useEffect(() => {
    // El estado derivado de la sesión se limpia en el callback, no en un efecto
    const apply = (s: Session | null) => {
      setSession(s)
      setHouseholdLoading(!!s)
      if (!s) {
        setHousehold(null)
        setCategories([])
      }
    }
    supabase.auth.getSession().then(({ data }) => {
      apply(data.session)
      setLoading(false)
    })
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => apply(s))
    return () => sub.subscription.unsubscribe()
  }, [])

  useEffect(() => {
    if (!session) return
    fetchHousehold()
      .then((h) => {
        setHousehold(h)
        return fetchCategories().then(setCategories)
      })
      .finally(() => setHouseholdLoading(false))
  }, [session, fetchHousehold, fetchCategories])

  // Recurrentes: una sola generación por sesión, sin bloquear el render
  const recurringDone = useRef(false)
  useEffect(() => {
    if (!household || recurringDone.current) return
    recurringDone.current = true
    generateDueRecurring(household.id)
  }, [household])

  return (
    <Ctx.Provider value={{ session, loading, householdLoading, household, categories, viewCurrency, setViewCurrency, refreshHousehold, refreshCategories }}>
      {children}
    </Ctx.Provider>
  )
}
