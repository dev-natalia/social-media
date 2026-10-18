import { useState } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import StatusFilter from './StatusFilter'
import type { PostStatus } from '../api/types'

function Harness({ onChange }: { onChange: (v: PostStatus[]) => void }) {
  const [value, setValue] = useState<PostStatus[]>([])
  return (
    <StatusFilter
      value={value}
      onChange={(v) => {
        setValue(v)
        onChange(v)
      }}
    />
  )
}

describe('StatusFilter', () => {
  it('toggles statuses and resets with Todos', async () => {
    const onChange = vi.fn()
    render(<Harness onChange={onChange} />)
    expect(screen.getByRole('button', { name: 'Todos' })).toHaveAttribute('aria-pressed', 'true')
    await userEvent.click(screen.getByRole('button', { name: 'A fazer' }))
    await userEvent.click(screen.getByRole('button', { name: 'Editando' }))
    expect(onChange).toHaveBeenLastCalledWith(['a_fazer', 'editando'])
    expect(screen.getByRole('button', { name: 'Todos' })).toHaveAttribute('aria-pressed', 'false')
    await userEvent.click(screen.getByRole('button', { name: 'A fazer' }))
    expect(onChange).toHaveBeenLastCalledWith(['editando'])
    await userEvent.click(screen.getByRole('button', { name: 'Todos' }))
    expect(onChange).toHaveBeenLastCalledWith([])
  })
})
