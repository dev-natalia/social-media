import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import Modal from './Modal'

describe('Modal', () => {
  it('only closes when the click starts and ends on the backdrop', () => {
    const onClose = vi.fn()
    render(
      <Modal title="Editar cliente" onClose={onClose}>
        <input aria-label="Nome" />
      </Modal>,
    )
    const backdrop = screen.getByRole('dialog').parentElement!
    fireEvent.mouseDown(screen.getByLabelText('Nome'))
    fireEvent.click(backdrop)
    expect(onClose).not.toHaveBeenCalled()
    fireEvent.mouseDown(backdrop)
    fireEvent.click(backdrop)
    expect(onClose).toHaveBeenCalledTimes(1)
  })
})
