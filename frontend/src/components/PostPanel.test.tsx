import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import PostPanel from './PostPanel'
import { makePost, PLATFORMS, TYPES } from '../test/fixtures'
import { mockFetch, jsonBody } from '../test/fetchMock'

function renderPanel(over: Partial<Parameters<typeof PostPanel>[0]> = {}) {
  const props = {
    clientId: 7,
    contentTypes: TYPES,
    platforms: PLATFORMS,
    onClose: vi.fn(),
    onSaved: vi.fn(),
    ...over,
  }
  render(<PostPanel {...props} />)
  return props
}

describe('PostPanel', () => {
  it('creates a post with defaults', async () => {
    const spy = mockFetch(() => ({ status: 201, body: makePost() }))
    const props = renderPanel({ defaultDate: '2026-11-03' })
    await userEvent.type(screen.getByLabelText('Título'), 'Novo post')
    await userEvent.click(screen.getByRole('button', { name: 'Salvar' }))
    const [url, init] = spy.mock.calls[0]
    expect(url).toBe('/api/clients/7/posts')
    expect(init!.method).toBe('POST')
    expect(jsonBody(init)).toMatchObject({
      title: 'Novo post',
      date: '2026-11-03',
      content_type_id: TYPES[0].id,
      status: 'a_fazer',
      platform_ids: [],
      time: null,
      drive_url: null,
    })
    expect(props.onSaved).toHaveBeenCalled()
  })

  it('edits the checklist and shows progress', async () => {
    const post = makePost({ checklist: { roteiro: true, captacao: true, edicao: false, aprovacao: false, agendamento: false } })
    const spy = mockFetch(() => ({ body: post }))
    renderPanel({ post })
    expect(screen.getByText('2/5')).toBeInTheDocument()
    await userEvent.click(screen.getByLabelText('Aprovação'))
    expect(screen.getByText('3/5')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Salvar' }))
    const [url, init] = spy.mock.calls[0]
    expect(url).toBe(`/api/posts/${post.id}`)
    expect(init!.method).toBe('PATCH')
    expect(jsonBody(init).checklist.aprovacao).toBe(true)
  })

  it('toggles platforms and status', async () => {
    const post = makePost({ platforms: [PLATFORMS[0]], status: 'a_fazer' })
    const spy = mockFetch(() => ({ body: post }))
    renderPanel({ post })
    await userEvent.click(screen.getByRole('button', { name: 'TikTok' }))
    await userEvent.click(screen.getByRole('button', { name: 'Instagram' }))
    await userEvent.click(screen.getByRole('radio', { name: 'Postado' }))
    await userEvent.click(screen.getByRole('button', { name: 'Salvar' }))
    const body = jsonBody(spy.mock.calls[0][1])
    expect(body.platform_ids).toEqual([PLATFORMS[1].id])
    expect(body.status).toBe('postado')
  })

  it('picks the format with buttons', async () => {
    const post = makePost({ format: 'Reels' })
    const spy = mockFetch(() => ({ body: post }))
    renderPanel({ post })
    const group = screen.getByRole('group', { name: 'Formato' })
    expect(within(group).getByRole('button', { name: 'Reels' })).toHaveAttribute('aria-pressed', 'true')
    await userEvent.click(within(group).getByRole('button', { name: 'Carrossel' }))
    expect(within(group).getByRole('button', { name: 'Reels' })).toHaveAttribute('aria-pressed', 'false')
    await userEvent.click(screen.getByRole('button', { name: 'Salvar' }))
    expect(jsonBody(spy.mock.calls[0][1]).format).toBe('Carrossel')
  })

  it('clears the format when the selected button is clicked again', async () => {
    const post = makePost({ format: 'Reels' })
    const spy = mockFetch(() => ({ body: post }))
    renderPanel({ post })
    await userEvent.click(within(screen.getByRole('group', { name: 'Formato' })).getByRole('button', { name: 'Reels' }))
    await userEvent.click(screen.getByRole('button', { name: 'Salvar' }))
    expect(jsonBody(spy.mock.calls[0][1]).format).toBeNull()
  })

  it('types a custom format with Outro', async () => {
    const spy = mockFetch(() => ({ body: makePost() }))
    renderPanel({ post: makePost({ format: null }) })
    expect(screen.queryByLabelText('Qual formato?')).not.toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Outro' }))
    await userEvent.type(screen.getByLabelText('Qual formato?'), 'Live')
    await userEvent.click(screen.getByRole('button', { name: 'Salvar' }))
    expect(jsonBody(spy.mock.calls[0][1]).format).toBe('Live')
  })

  it('shows a custom format already saved under Outro', () => {
    mockFetch(() => undefined)
    renderPanel({ post: makePost({ format: 'Live' }) })
    expect(screen.getByRole('button', { name: 'Outro' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByLabelText('Qual formato?')).toHaveValue('Live')
  })

  it('shows the backend 422 detail', async () => {
    mockFetch(() => ({ status: 422, body: { detail: [{ msg: 'Value error, O link precisa começar com http:// ou https://' }] } }))
    const props = renderPanel({ post: makePost() })
    await userEvent.type(screen.getByLabelText('Link do Google Drive'), 'drive.google.com/x')
    await userEvent.click(screen.getByRole('button', { name: 'Salvar' }))
    expect(await screen.findByText('O link precisa começar com http:// ou https://')).toBeInTheDocument()
    expect(props.onSaved).not.toHaveBeenCalled()
  })

  it('shows an Abrir link only for http links', () => {
    mockFetch(() => undefined)
    renderPanel({ post: makePost({ drive_url: 'https://drive.google.com/x' }) })
    const link = screen.getByRole('link', { name: 'Abrir' })
    expect(link).toHaveAttribute('href', 'https://drive.google.com/x')
    expect(link).toHaveAttribute('target', '_blank')
    expect(link).toHaveAttribute('rel', 'noopener noreferrer')
  })

  it('asks before deleting', async () => {
    const spy = mockFetch(() => ({ status: 204 }))
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(false)
    const props = renderPanel({ post: makePost() })
    await userEvent.click(screen.getByRole('button', { name: 'Excluir' }))
    expect(confirm).toHaveBeenCalledWith('Excluir este post?')
    expect(spy).not.toHaveBeenCalled()
    confirm.mockReturnValue(true)
    await userEvent.click(screen.getByRole('button', { name: 'Excluir' }))
    expect(spy.mock.calls[0][1]!.method).toBe('DELETE')
    expect(props.onSaved).toHaveBeenCalled()
  })

  it('duplicates', async () => {
    const post = makePost()
    const spy = mockFetch(() => ({ status: 201, body: makePost() }))
    const props = renderPanel({ post })
    await userEvent.click(screen.getByRole('button', { name: 'Duplicar' }))
    expect(spy.mock.calls[0][0]).toBe(`/api/posts/${post.id}/duplicate`)
    expect(props.onSaved).toHaveBeenCalled()
  })

  it('closes on Escape when nothing changed', async () => {
    mockFetch(() => undefined)
    const props = renderPanel({ post: makePost() })
    await userEvent.keyboard('{Escape}')
    expect(props.onClose).toHaveBeenCalled()
  })

  it('asks before discarding edits on Escape', async () => {
    mockFetch(() => undefined)
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(false)
    const props = renderPanel({ post: makePost() })
    await userEvent.type(screen.getByLabelText('Descrição'), 'roteiro novo')
    await userEvent.keyboard('{Escape}')
    expect(confirm).toHaveBeenCalledWith('Descartar as alterações deste post?')
    expect(props.onClose).not.toHaveBeenCalled()
  })

  it('does not close when a drag starts inside and ends on the backdrop', () => {
    mockFetch(() => undefined)
    const props = renderPanel({ post: makePost() })
    const panel = screen.getByRole('dialog')
    const backdrop = panel.parentElement!
    fireEvent.mouseDown(screen.getByLabelText('Descrição'))
    fireEvent.mouseUp(backdrop)
    fireEvent.click(backdrop)
    expect(props.onClose).not.toHaveBeenCalled()
    fireEvent.mouseDown(backdrop)
    fireEvent.click(backdrop)
    expect(props.onClose).toHaveBeenCalled()
  })
})
