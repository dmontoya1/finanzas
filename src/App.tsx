import { lazy, Suspense } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import { Analytics } from '@vercel/analytics/react'
import { SpeedInsights } from '@vercel/speed-insights/react'
import { useApp } from './context/useApp'
import AuthPage from './features/auth/AuthPage'
import Onboarding from './features/onboarding/Onboarding'
import Layout from './components/Layout'
import { Skeleton } from './components/ui/Skeleton'

// Auth/Onboarding stay eager: they are the first paint for new visitors and are small.
const Dashboard = lazy(() => import('./features/dashboard/Dashboard'))
const TransactionsPage = lazy(() => import('./features/transactions/TransactionsPage'))
const CategoriesPage = lazy(() => import('./features/categories/CategoriesPage'))
const SettingsPage = lazy(() => import('./features/settings/SettingsPage'))

function RouteFallback() {
  return (
    <div role="status" aria-label="Cargando" className="space-y-4">
      <Skeleton className="h-32 w-full rounded-2xl" />
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Skeleton className="h-28" />
        <Skeleton className="h-28" />
        <Skeleton className="h-28" />
        <Skeleton className="h-28" />
      </div>
    </div>
  )
}

function Splash() {
  return (
    <div role="status" aria-label="Cargando" className="grid min-h-dvh place-items-center">
      <div className="flex flex-col items-center gap-4">
        <span className="hero-gradient grid size-14 animate-pulse place-items-center rounded-2xl text-2xl font-bold text-white display">C</span>
        <p className="display text-2xl font-bold tracking-tight text-text">Cuentas</p>
      </div>
    </div>
  )
}

function Screen() {
  const { session, loading, householdLoading, household } = useApp()

  if (loading) return <Splash />
  if (!session) return <AuthPage />
  if (householdLoading && !household) return <Splash />
  if (!household) return <Onboarding />

  return (
    <Layout>
      <Suspense fallback={<RouteFallback />}>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/movimientos" element={<TransactionsPage />} />
          <Route path="/categorias" element={<CategoriesPage />} />
          <Route path="/ajustes" element={<SettingsPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
      <SpeedInsights />
    </Layout>
  )
}

export default function App() {
  return (
    <>
      <Screen />
      <Analytics />
    </>
  )
}
