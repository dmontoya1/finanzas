import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'
import type { Category, Currency, Household } from '../types'

interface AppState {
  session: Session | null
  loading: boolean
  household: Household | null
  categories: Category[]
  viewCurrency: Currency
  setViewCurrency: (c: Currency) => void
  refreshHousehold: () => Promise<void>
  refreshCategories: () => Promise<void>
}

const Ctx = createContext<AppState | null>(null)

export function AppProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)
  const [household, setHousehold] = useState<Household | null>(null)
  const [categories, setCategories] = useState<Category[]>([])
  const [viewCurrency, setViewCurrencyState] = useState<Currency>(
    () => (localStorage.getItem('view_currency') as Currency) ?? 'EUR',
  )

  const setViewCurrency = (c: Currency) => {
    localStorage.setItem('view_currency', c)
    setViewCurrencyState(c)
  }

  const refreshHousehold = useCallback(async () => {
    const { data } = await supabase
      .from('household_members')
      .select('households(*)')
      .limit(1)
      .maybeSingle()
    setHousehold((data?.households as unknown as Household) ?? null)
  }, [])

  const refreshCategories = useCallback(async () => {
    const { data } = await supabase.from('categories').select('*').order('name')
    setCategories(data ?? [])
  }, [])

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      setLoading(false)
    })
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setSession(s))
    return () => sub.subscription.unsubscribe()
  }, [])

  useEffect(() => {
    if (!session) {
      setHousehold(null)
      setCategories([])
      return
    }
    refreshHousehold().then(refreshCategories)
  }, [session, refreshHousehold, refreshCategories])

  return (
    <Ctx.Provider value={{ session, loading, household, categories, viewCurrency, setViewCurrency, refreshHousehold, refreshCategories }}>
      {children}
    </Ctx.Provider>
  )
}

export function useApp(): AppState {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error('useApp debe usarse dentro de <AppProvider>')
  return ctx
}
