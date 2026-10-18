import { useState } from 'react'
import { NavLink } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'

export default function TopNav() {
  const { user, logout } = useAuth()
  const [open, setOpen] = useState(false)
  const close = () => setOpen(false)
  return (
    <header className="topnav">
      <NavLink to="/" className="brand" onClick={close}>
        Planner Social
      </NavLink>
      <button className="menu-btn" aria-label="Menu" aria-expanded={open} onClick={() => setOpen(!open)}>
        ☰
      </button>
      <nav className={open ? 'open' : ''}>
        <NavLink to="/" end onClick={close}>
          Meus clientes
        </NavLink>
        <NavLink to="/config/tipos" onClick={close}>
          Tipos de conteúdo
        </NavLink>
        <NavLink to="/config/redes" onClick={close}>
          Redes
        </NavLink>
        <NavLink to="/config/datas" onClick={close}>
          Datas importantes
        </NavLink>
        <NavLink to="/config/feriados" onClick={close}>
          Feriados
        </NavLink>
        {user?.is_admin && (
          <NavLink to="/usuarios" onClick={close}>
            Usuários
          </NavLink>
        )}
        <button
          className="link"
          onClick={() => {
            close()
            logout()
          }}
        >
          Sair
        </button>
      </nav>
    </header>
  )
}
