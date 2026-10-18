import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import PostBlock from './PostBlock'
import { makePost } from '../test/fixtures'
import { tint } from '../lib/color'

describe('PostBlock', () => {
  it('uses the content type color and shows the details', () => {
    render(<PostBlock post={makePost()} onClick={() => {}} />)
    const block = screen.getByRole('button', { name: /Pão de fermentação natural/ })
    expect(block).toHaveStyle({ backgroundColor: tint('#e86a7a'), borderLeftColor: '#e86a7a' })
    expect(screen.getByText('Tutorial')).toBeInTheDocument()
    expect(screen.getByText('Instagram · Reels')).toBeInTheDocument()
    expect(screen.getByText('10:00')).toBeInTheDocument()
    expect(screen.getByText('Agendado')).toBeInTheDocument()
  })

  it('shows only the title when compact', () => {
    render(<PostBlock post={makePost()} compact onClick={() => {}} />)
    expect(screen.getByText('Pão de fermentação natural')).toBeInTheDocument()
    expect(screen.queryByText('Tutorial')).not.toBeInTheDocument()
  })

  it('calls onClick with the post', async () => {
    const post = makePost()
    const onClick = vi.fn()
    render(<PostBlock post={post} onClick={onClick} />)
    await userEvent.click(screen.getByRole('button'))
    expect(onClick).toHaveBeenCalledWith(post)
  })
})
