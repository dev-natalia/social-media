import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import WeekView from './WeekView'
import { weekCalendar } from '../test/fixtures'
import { weekDays } from '../lib/dates'

function renderWeek(over: Partial<Parameters<typeof WeekView>[0]> = {}) {
  const props = {
    days: weekDays('2026-11-01'),
    calendar: weekCalendar(),
    today: '2026-11-04',
    onOpenPost: vi.fn(),
    onCreate: vi.fn(),
    onMove: vi.fn(),
    ...over,
  }
  render(<WeekView {...props} />)
  return props
}

const column = (label: string) => screen.getByRole('region', { name: label })

describe('WeekView', () => {
  it('places holidays, dates and posts in the right day', () => {
    renderWeek()
    expect(within(column('Seg 2')).getByText('Finados')).toBeInTheDocument()
    expect(within(column('Ter 3')).getByText('Pão de fermentação natural')).toBeInTheDocument()
    expect(within(column('Qua 4')).getByText('Aniversário da loja')).toBeInTheDocument()
    expect(within(column('Qua 4')).getByText('5 anos de Trigo!')).toBeInTheDocument()
    expect(within(column('Dom 1')).queryByRole('button', { name: /Pão/ })).not.toBeInTheDocument()
  })

  it('marks today', () => {
    renderWeek()
    expect(column('Qua 4')).toHaveClass('today')
    expect(column('Ter 3')).not.toHaveClass('today')
  })

  it('creates a post on the clicked day', async () => {
    const props = renderWeek()
    await userEvent.click(within(column('Sex 6')).getByRole('button', { name: 'Novo post em Sex 6' }))
    expect(props.onCreate).toHaveBeenCalledWith('2026-11-06')
  })

  it('moves a post when dropped on another day', () => {
    const props = renderWeek()
    const data = new Map<string, string>()
    const dataTransfer = {
      setData: (k: string, v: string) => data.set(k, v),
      getData: (k: string) => data.get(k) ?? '',
      effectAllowed: 'move',
      dropEffect: 'move',
    }
    const block = within(column('Ter 3')).getByRole('button', { name: /Pão de fermentação natural/ })
    fireEvent.dragStart(block, { dataTransfer })
    fireEvent.dragOver(column('Sex 6'), { dataTransfer })
    fireEvent.drop(column('Sex 6'), { dataTransfer })
    expect(props.onMove).toHaveBeenCalledWith(1, '2026-11-06')
  })

  it('does not move when dropped on the same day', () => {
    const props = renderWeek()
    const data = new Map<string, string>()
    const dataTransfer = { setData: (k: string, v: string) => data.set(k, v), getData: (k: string) => data.get(k) ?? '' }
    const block = within(column('Ter 3')).getByRole('button', { name: /Pão de fermentação natural/ })
    fireEvent.dragStart(block, { dataTransfer })
    fireEvent.drop(column('Ter 3'), { dataTransfer })
    expect(props.onMove).not.toHaveBeenCalled()
  })
})
