import type { ReactNode } from 'react'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AuthProvider, RequireAdmin, RequireAuth } from './auth/AuthContext'
import TopNav from './components/TopNav'
import ClientsPage from './pages/ClientsPage'
import LoginPage from './pages/LoginPage'

function Shell({ children }: { children: ReactNode }) {
  return (
    <RequireAuth>
      <TopNav />
      <main className="page">{children}</main>
    </RequireAuth>
  )
}

const Placeholder = ({ title }: { title: string }) => <h1>{title}</h1>

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/" element={<Shell><ClientsPage /></Shell>} />
          <Route path="/clientes/:id" element={<Shell><Placeholder title="Planner" /></Shell>} />
          <Route path="/config/tipos" element={<Shell><Placeholder title="Tipos de conteúdo" /></Shell>} />
          <Route path="/config/redes" element={<Shell><Placeholder title="Redes" /></Shell>} />
          <Route path="/config/datas" element={<Shell><Placeholder title="Datas importantes" /></Shell>} />
          <Route path="/config/feriados" element={<Shell><Placeholder title="Feriados" /></Shell>} />
          <Route
            path="/usuarios"
            element={
              <Shell>
                <RequireAdmin>
                  <Placeholder title="Usuários" />
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
