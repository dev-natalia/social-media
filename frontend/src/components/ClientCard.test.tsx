import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import ClientCard from './ClientCard'
import type { ClientSummary } from '../api/types'

const base: ClientSummary = {
  id: 7,
  name: 'Padaria Trigo',
  color: '#c9b6f2',
  has_logo: false,
  logo_version: '',
  archived: false,
  week_total: 5,
  counts: { a_fazer: 2, editando: 1, agendado: 1, postado: 1 },
  next_post: { date: '2026-11-03', title: 'Pão de fermentação natural' },
}

describe('ClientCard', () => {
  it('shows initials, counts and next post', () => {
    render(<ClientCard client={base} onOpen={() => {}} onEdit={() => {}} />)
    expect(screen.getByText('PT')).toBeInTheDocument()
    expect(screen.getByText('Esta semana: 5 posts')).toBeInTheDocument()
    expect(screen.getByText('2 a fazer')).toBeInTheDocument()
    expect(screen.getByText('1 editando')).toBeInTheDocument()
    expect(screen.getByText('Próximo: Ter 3/11 · Pão de fermentação natural')).toBeInTheDocument()
  })

  it('hides zero counts', () => {
    const c = { ...base, week_total: 3, counts: { a_fazer: 3, editando: 0, agendado: 0, postado: 0 } }
    render(<ClientCard client={c} onOpen={() => {}} onEdit={() => {}} />)
    expect(screen.queryByText(/editando/)).not.toBeInTheDocument()
  })

  it('shows the logo when there is one', () => {
    const c = { ...base, has_logo: true, logo_version: 'abc123' }
    render(<ClientCard client={c} onOpen={() => {}} onEdit={() => {}} />)
    expect(screen.getByRole('img', { name: 'Logo de Padaria Trigo' })).toHaveAttribute(
      'src',
      '/api/clients/7/logo?v=abc123',
    )
    expect(screen.queryByText('PT')).not.toBeInTheDocument()
  })

  it('flags an empty week', () => {
    const c = { ...base, week_total: 0, counts: { a_fazer: 0, editando: 0, agendado: 0, postado: 0 }, next_post: null }
    render(<ClientCard client={c} onOpen={() => {}} onEdit={() => {}} />)
    expect(screen.getByText('Esta semana: nenhum post')).toBeInTheDocument()
    expect(screen.getByText('semana vazia')).toBeInTheDocument()
  })

  it('opens on click and edits from the menu button without opening', async () => {
    const onOpen = vi.fn()
    const onEdit = vi.fn()
    render(<ClientCard client={base} onOpen={onOpen} onEdit={onEdit} />)
    await userEvent.click(screen.getByRole('button', { name: 'Editar Padaria Trigo' }))
    expect(onEdit).toHaveBeenCalledWith(base)
    expect(onOpen).not.toHaveBeenCalled()
    await userEvent.click(screen.getByText('Padaria Trigo'))
    expect(onOpen).toHaveBeenCalledWith(7)
  })
})
