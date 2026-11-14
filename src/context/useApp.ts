import { createContext, useContext } from 'react'
import type { Session } from '@supabase/supabase-js'
import type { Category, Currency, Household } from '../types'

export interface AppState {
  session: Session | null
  loading: boolean
  /** True from the moment a session exists until the household fetch settles. */
  householdLoading: boolean
  household: Household | null
  categories: Category[]
  viewCurrency: Currency
  setViewCurrency: (c: Currency) => void
  refreshHousehold: () => Promise<void>
  refreshCategories: () => Promise<void>
}

export const Ctx = createContext<AppState | null>(null)

export function useApp(): AppState {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error('useApp debe usarse dentro de <AppProvider>')
  return ctx
}
