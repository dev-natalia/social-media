import { describe, expect, it, vi } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import MonthView from './MonthView'
import { makePost } from '../test/fixtures'
import { monthGrid } from '../lib/dates'
import type { Calendar } from '../api/types'

function renderMonth(calendar: Calendar) {
  const props = { grid: monthGrid('2026-11-15'), month: '2026-11-15', today: '2026-11-04', calendar, onOpenDay: vi.fn(), onOpenPost: vi.fn() }
  render(<MonthView {...props} />)
  return props
}

const cell = (date: string) => screen.getByTestId(`day-${date}`)

describe('MonthView', () => {
  it('shows at most 3 posts per day and a +N counter', () => {
    const posts = Array.from({ length: 5 }, (_, i) => makePost({ id: i + 1, date: '2026-11-10', title: `Post ${i + 1}` }))
    renderMonth({ posts, holidays: [], important_dates: [] })
    const day = cell('2026-11-10')
    expect(within(day).getAllByRole('button', { name: /Post \d/ })).toHaveLength(3)
    expect(within(day).getByText('+2')).toBeInTheDocument()
  })

  it('opens the day when the cell is clicked', async () => {
    const props = renderMonth({ posts: [], holidays: [], important_dates: [] })
    await userEvent.click(within(cell('2026-11-18')).getByRole('button', { name: '18' }))
    expect(props.onOpenDay).toHaveBeenCalledWith('2026-11-18')
  })

  it('opens a post without opening the day', async () => {
    const post = makePost({ date: '2026-11-03' })
    const props = renderMonth({ posts: [post], holidays: [], important_dates: [] })
    await userEvent.click(within(cell('2026-11-03')).getByRole('button', { name: /Pão/ }))
    expect(props.onOpenPost).toHaveBeenCalledWith(post)
    expect(props.onOpenDay).not.toHaveBeenCalled()
  })

  it('dims days outside the month and shows holidays', () => {
    renderMonth({ posts: [], holidays: [{ date: '2026-11-02', name: 'Finados', hidden: false }], important_dates: [] })
    expect(cell('2026-12-01')).toHaveClass('outside')
    expect(cell('2026-11-30')).not.toHaveClass('outside')
    expect(within(cell('2026-11-02')).getByText('Finados')).toBeInTheDocument()
  })
})
