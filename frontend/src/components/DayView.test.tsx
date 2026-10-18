import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import DayView from './DayView'
import { makePost } from '../test/fixtures'

describe('DayView', () => {
  const post = makePost({
    date: '2026-11-03',
    description: 'Roteiro do reels',
    drive_url: 'https://drive.google.com/abc',
    checklist: { roteiro: true, captacao: true, edicao: true, aprovacao: false, agendamento: false },
  })

  function renderDay() {
    const props = {
      date: '2026-11-03',
      calendar: { posts: [post], holidays: [], important_dates: [{ id: 1, date: '2026-11-03', name: 'Black week', client_id: null, recurring_yearly: false }] },
      onOpenPost: vi.fn(),
      onCreate: vi.fn(),
    }
    render(<DayView {...props} />)
    return props
  }

  it('shows post details with checklist progress and drive link', () => {
    renderDay()
    expect(screen.getByText('Pão de fermentação natural')).toBeInTheDocument()
    expect(screen.getByText('3/5')).toBeInTheDocument()
    expect(screen.getByText('Roteiro do reels')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Pasta no Drive' })).toHaveAttribute('href', 'https://drive.google.com/abc')
    expect(screen.getByText('Black week')).toBeInTheDocument()
  })

  it('opens the post and creates new ones', async () => {
    const props = renderDay()
    await userEvent.click(screen.getByRole('button', { name: 'Editar Pão de fermentação natural' }))
    expect(props.onOpenPost).toHaveBeenCalledWith(post)
    await userEvent.click(screen.getByRole('button', { name: '+ Novo post' }))
    expect(props.onCreate).toHaveBeenCalledWith('2026-11-03')
  })

  it('says when the day is empty', () => {
    render(<DayView date="2026-11-05" calendar={{ posts: [], holidays: [], important_dates: [] }} onOpenPost={() => {}} onCreate={() => {}} />)
    expect(screen.getByText('Nenhum post neste dia.')).toBeInTheDocument()
  })
})
