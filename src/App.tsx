import { Navigate, Route, Routes } from 'react-router-dom'
import { useApp } from './context/AppContext'
import AuthPage from './features/auth/AuthPage'
import Onboarding from './features/onboarding/Onboarding'
import Layout from './components/Layout'
import Dashboard from './features/dashboard/Dashboard'
import TransactionsPage from './features/transactions/TransactionsPage'
import CategoriesPage from './features/categories/CategoriesPage'
import SettingsPage from './features/settings/SettingsPage'

export default function App() {
  const { session, loading, household } = useApp()

  if (loading) {
    return (
      <div className="min-h-dvh grid place-items-center">
        <div className="display text-2xl text-cream-dim animate-pulse">Cargando…</div>
      </div>
    )
  }
  if (!session) return <AuthPage />
  if (!household) return <Onboarding />

  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/movimientos" element={<TransactionsPage />} />
        <Route path="/categorias" element={<CategoriesPage />} />
        <Route path="/ajustes" element={<SettingsPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Layout>
  )
}
