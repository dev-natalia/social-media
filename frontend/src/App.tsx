import type { ReactNode } from 'react'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AuthProvider, RequireAdmin, RequireAuth } from './auth/AuthContext'
import TopNav from './components/TopNav'
import ClientsPage from './pages/ClientsPage'
import ContentTypesPage from './pages/ContentTypesPage'
import HolidaysPage from './pages/HolidaysPage'
import ImportantDatesPage from './pages/ImportantDatesPage'
import LoginPage from './pages/LoginPage'
import PlannerPage from './pages/PlannerPage'
import PlatformsPage from './pages/PlatformsPage'
import UsersPage from './pages/UsersPage'

function Shell({ children }: { children: ReactNode }) {
  return (
    <RequireAuth>
      <TopNav />
      <main className="page">{children}</main>
    </RequireAuth>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/" element={<Shell><ClientsPage /></Shell>} />
          <Route path="/clientes/:id" element={<Shell><PlannerPage /></Shell>} />
          <Route path="/config/tipos" element={<Shell><ContentTypesPage /></Shell>} />
          <Route path="/config/redes" element={<Shell><PlatformsPage /></Shell>} />
          <Route path="/config/datas" element={<Shell><ImportantDatesPage /></Shell>} />
          <Route path="/config/feriados" element={<Shell><HolidaysPage /></Shell>} />
          <Route
            path="/usuarios"
            element={
              <Shell>
                <RequireAdmin>
                  <UsersPage />
                </RequireAdmin>
              </Shell>
            }
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}
