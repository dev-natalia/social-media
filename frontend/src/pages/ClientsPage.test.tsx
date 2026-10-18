import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import ClientsPage from './ClientsPage'
import { mockFetch, jsonBody } from '../test/fetchMock'
import { startOfWeek, todayISO } from '../lib/dates'

const padaria = {
  id: 7,
  name: 'Padaria Trigo',
  color: '#c9b6f2',
  has_logo: false,
  logo_version: '',
  archived: false,
  week_total: 0,
  counts: { a_fazer: 0, editando: 0, agendado: 0, postado: 0 },
  next_post: null,
}

function renderPage() {
  return render(
    <MemoryRouter>
      <Routes>
        <Route path="/" element={<ClientsPage />} />
        <Route path="/clientes/:id" element={<p>Planner aberto</p>} />
      </Routes>
    </MemoryRouter>,
  )
}

describe('ClientsPage', () => {
  it('loads clients for the current week', async () => {
    const spy = mockFetch((url) => (url.startsWith('/api/clients?') ? { body: [padaria] } : undefined))
    renderPage()
    expect(await screen.findByText('Padaria Trigo')).toBeInTheDocument()
    const url = new URL(spy.mock.calls[0][0] as string, 'http://x')
    expect(url.searchParams.get('week_start')).toBe(startOfWeek(todayISO()))
    expect(url.searchParams.get('today')).toBe(todayISO())
  })

  it('opens the planner when a card is clicked', async () => {
    mockFetch(() => ({ body: [padaria] }))
    renderPage()
    await userEvent.click(await screen.findByText('Padaria Trigo'))
    expect(await screen.findByText('Planner aberto')).toBeInTheDocument()
  })

  it('creates a client from the form', async () => {
    const spy = mockFetch((url, init) => {
      if (url === '/api/clients' && init.method === 'POST') return { status: 201, body: { ...padaria, id: 8, name: 'Studio Verde' } }
      if (url.startsWith('/api/clients?')) return { body: [] }
    })
    renderPage()
    await userEvent.click(await screen.findByRole('button', { name: '+ Novo cliente' }))
    await userEvent.type(screen.getByLabelText('Nome'), 'Studio Verde')
    await userEvent.click(screen.getByRole('button', { name: 'Salvar' }))
    const post = spy.mock.calls.find(([u, i]) => u === '/api/clients' && i?.method === 'POST')!
    expect(jsonBody(post[1])).toMatchObject({ name: 'Studio Verde' })
    expect(jsonBody(post[1]).color).toMatch(/^#[0-9a-f]{6}$/)
  })
})
