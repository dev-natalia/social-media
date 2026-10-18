import { describe, expect, it } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import ColorListEditor from './ColorListEditor'
import { mockFetch, jsonBody } from '../test/fetchMock'
import { TYPES } from '../test/fixtures'

describe('ColorListEditor', () => {
  it('lists items and shows the 409 detail on delete', async () => {
    mockFetch((url, init) => {
      if (url === '/api/content-types' && !init.method) return { body: TYPES }
      if (init.method === 'DELETE') return { status: 409, body: { detail: 'Em uso por 3 post(s)' } }
    })
    render(<ColorListEditor endpoint="/api/content-types" title="Tipos de conteúdo" />)
    const row = (await screen.findByDisplayValue('Dica')).closest('li')!
    await userEvent.click(within(row).getByRole('button', { name: 'Excluir Dica' }))
    expect(await screen.findByText('Em uso por 3 post(s)')).toBeInTheDocument()
  })

  it('renames on blur', async () => {
    const spy = mockFetch((url, init) => {
      if (url === '/api/content-types' && !init.method) return { body: TYPES }
      if (init.method === 'PATCH') return { body: { ...TYPES[0], name: 'Dicas' } }
    })
    render(<ColorListEditor endpoint="/api/content-types" title="Tipos de conteúdo" />)
    const input = await screen.findByDisplayValue('Dica')
    await userEvent.type(input, 's')
    await userEvent.tab()
    const patch = spy.mock.calls.find(([, i]) => i?.method === 'PATCH')!
    expect(patch[0]).toBe(`/api/content-types/${TYPES[0].id}`)
    expect(jsonBody(patch[1])).toEqual({ name: 'Dicas' })
  })

  it('adds a new item', async () => {
    const spy = mockFetch((url, init) => {
      if (url === '/api/platforms' && !init.method) return { body: [] }
      if (init.method === 'POST') return { status: 201, body: { id: 50, name: 'Novo item', color: '#888888', position: 0 } }
    })
    render(<ColorListEditor endpoint="/api/platforms" title="Redes" />)
    await userEvent.click(await screen.findByRole('button', { name: '+ Adicionar' }))
    const post = spy.mock.calls.find(([, i]) => i?.method === 'POST')!
    expect(jsonBody(post[1])).toMatchObject({ name: 'Novo item' })
    expect(await screen.findByDisplayValue('Novo item')).toBeInTheDocument()
  })

  it('moves an item down', async () => {
    const spy = mockFetch((url, init) => {
      if (url === '/api/content-types' && !init.method) return { body: TYPES }
      if (init.method === 'PUT') return { status: 204 }
    })
    render(<ColorListEditor endpoint="/api/content-types" title="Tipos de conteúdo" />)
    const row = (await screen.findByDisplayValue('Dica')).closest('li')!
    await userEvent.click(within(row).getByRole('button', { name: 'Descer Dica' }))
    const put = spy.mock.calls.find(([, i]) => i?.method === 'PUT')!
    expect(put[0]).toBe('/api/content-types/reorder')
    expect(jsonBody(put[1])).toEqual({ ids: [TYPES[1].id, TYPES[0].id, TYPES[2].id] })
  })
})
