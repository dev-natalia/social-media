import { describe, expect, it } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { AuthProvider, RequireAdmin } from '../auth/AuthContext'
import HolidaysPage from './HolidaysPage'
import ImportantDatesPage from './ImportantDatesPage'
import UsersPage from './UsersPage'
import { mockFetch, jsonBody } from '../test/fetchMock'

const YEAR = new Date().getFullYear()

describe('HolidaysPage', () => {
  it('hides a holiday', async () => {
    const spy = mockFetch((url, init) => {
      if (url.startsWith('/api/holidays?')) return { body: [{ date: `${YEAR}-11-02`, name: 'Finados', hidden: false }] }
      if (init.method === 'POST') return { status: 204 }
    })
    render(<HolidaysPage />)
    const row = (await screen.findByText('Finados')).closest('li')!
    await userEvent.click(within(row).getByRole('button', { name: 'Ocultar' }))
    const call = spy.mock.calls.find(([, i]) => i?.method === 'POST')!
    expect(call[0]).toBe(`/api/holidays/${YEAR}-11-02/hide`)
    expect(await within(row).findByRole('button', { name: 'Mostrar' })).toBeInTheDocument()
  })

  it('explains when holidays could not be loaded', async () => {
    mockFetch(() => ({ body: [] }))
    render(<HolidaysPage />)
    expect(await screen.findByText('Não foi possível carregar os feriados agora. Tente mais tarde.')).toBeInTheDocument()
  })
})

describe('ImportantDatesPage', () => {
  it('adds a general date', async () => {
    const spy = mockFetch((url, init) => {
      if (url.startsWith('/api/clients')) return { body: [] }
      if (url.startsWith('/api/important-dates?')) return { body: [] }
      if (init.method === 'POST') return { status: 201, body: { id: 1, date: '2026-05-10', name: 'Dia das Mães', client_id: null, recurring_yearly: true } }
    })
    render(
      <MemoryRouter>
        <ImportantDatesPage />
      </MemoryRouter>,
    )
    const general = await screen.findByRole('region', { name: 'Gerais (todos os clientes)' })
    await userEvent.type(within(general).getByLabelText('Nome'), 'Dia das Mães')
    await userEvent.type(within(general).getByLabelText('Data'), '2026-05-10')
    await userEvent.click(within(general).getByLabelText('Repete todo ano'))
    await userEvent.click(within(general).getByRole('button', { name: 'Adicionar' }))
    const post = spy.mock.calls.find(([, i]) => i?.method === 'POST')!
    expect(jsonBody(post[1])).toEqual({ date: '2026-05-10', name: 'Dia das Mães', client_id: null, recurring_yearly: true })
  })
})

describe('UsersPage', () => {
  it('redirects non-admins away', async () => {
    mockFetch((url) => (url === '/api/auth/me' ? { body: { id: 1, email: 'ana@x.com', is_admin: false } } : undefined))
    render(
      <AuthProvider>
        <MemoryRouter initialEntries={['/usuarios']}>
          <Routes>
            <Route path="/" element={<p>Início</p>} />
            <Route path="/usuarios" element={<RequireAdmin><UsersPage /></RequireAdmin>} />
          </Routes>
        </MemoryRouter>
      </AuthProvider>,
    )
    expect(await screen.findByText('Início')).toBeInTheDocument()
  })

  it('creates a user', async () => {
    const spy = mockFetch((url, init) => {
      if (url === '/api/users' && !init.method) return { body: [] }
      if (init.method === 'POST') return { status: 201, body: { id: 2, email: 'bia@x.com', is_admin: false, is_active: true, created_at: '' } }
    })
    render(<UsersPage />)
    await userEvent.type(await screen.findByLabelText('E-mail'), 'bia@x.com')
    await userEvent.type(screen.getByLabelText('Senha provisória'), '12345678')
    await userEvent.click(screen.getByRole('button', { name: 'Criar usuário' }))
    const post = spy.mock.calls.find(([, i]) => i?.method === 'POST')!
    expect(jsonBody(post[1])).toEqual({ email: 'bia@x.com', password: '12345678' })
    expect(await screen.findByText('bia@x.com')).toBeInTheDocument()
  })
})
