import {
  BrowserRouter,
  Navigate,
  Outlet,
  Route,
  Routes,
} from 'react-router-dom'

import DashboardLayout from './layouts/DashboardLayout'
import DashboardPage from './pages/DashboardPage'
import InventoryPage from './pages/InventoryPage'
import LoginPage from './pages/LoginPage'
import PurchasesPage from './pages/PurchasesPage'
import RegisterPage from './pages/RegisterPage'
import SalesPage from './pages/SalesPage'
import ServicesPage from './pages/ServicesPage'
import UsersPage from './pages/UsersPage'
import { useAuth } from './context/AuthContext'
import type { Role } from './types'
import './App.css'

function ProtectedRoute() {
  const { user, loading } = useAuth()

  if (loading) {
    return <div className="app-loading">Memuat sesi pengguna…</div>
  }

  if (!user) {
    return <Navigate to="/login" replace />
  }

  return <Outlet />
}

function RoleRoute({ roles }: { roles: Role[] }) {
  const { user } = useAuth()

  if (!user || !roles.includes(user.role)) {
    return <Navigate to="/dashboard" replace />
  }

  return <Outlet />
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />

        <Route element={<ProtectedRoute />}>
          <Route element={<DashboardLayout />}>
            <Route index element={<Navigate to="/dashboard" replace />} />
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/inventory" element={<InventoryPage />} />

            <Route element={<RoleRoute roles={['owner', 'admin']} />}>
              <Route path="/sales" element={<SalesPage />} />
              <Route path="/purchases" element={<PurchasesPage />} />
            </Route>

            <Route
              element={<RoleRoute roles={['owner', 'admin', 'mekanik']} />}
            >
              <Route path="/services" element={<ServicesPage />} />
            </Route>

            <Route element={<RoleRoute roles={['owner']} />}>
              <Route path="/users" element={<UsersPage />} />
            </Route>
          </Route>
        </Route>

        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
