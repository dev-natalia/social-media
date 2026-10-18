import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { AuthProvider } from '../auth/AuthContext'
import LoginPage from './LoginPage'
import { mockFetch, jsonBody } from '../test/fetchMock'

function renderLogin() {
  return render(
    <AuthProvider>
      <MemoryRouter initialEntries={['/login']}>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/" element={<p>Página inicial</p>} />
        </Routes>
      </MemoryRouter>
    </AuthProvider>,
  )
}

describe('LoginPage', () => {
  it('logs in and navigates home', async () => {
    const spy = mockFetch((url, init) => {
      if (url === '/api/auth/me') return { status: 401, body: { detail: 'Não autenticado' } }
      if (url === '/api/auth/login' && init.method === 'POST')
        return { body: { id: 1, email: 'ana@x.com', is_admin: false } }
    })
    renderLogin()
    await userEvent.type(await screen.findByLabelText('E-mail'), 'ana@x.com')
    await userEvent.type(screen.getByLabelText('Senha'), 'senha123')
    await userEvent.click(screen.getByRole('button', { name: 'Entrar' }))
    expect(await screen.findByText('Página inicial')).toBeInTheDocument()
    const login = spy.mock.calls.find(([u]) => u === '/api/auth/login')!
    expect(jsonBody(login[1])).toEqual({ email: 'ana@x.com', password: 'senha123' })
  })

  it('shows the error message on 401', async () => {
    mockFetch((url) => {
      if (url === '/api/auth/me') return { status: 401, body: { detail: 'Não autenticado' } }
      if (url === '/api/auth/login') return { status: 401, body: { detail: 'E-mail ou senha inválidos' } }
    })
    renderLogin()
    await userEvent.type(await screen.findByLabelText('E-mail'), 'ana@x.com')
    await userEvent.type(screen.getByLabelText('Senha'), 'errada')
    await userEvent.click(screen.getByRole('button', { name: 'Entrar' }))
    expect(await screen.findByText('E-mail ou senha inválidos')).toBeInTheDocument()
  })
})
