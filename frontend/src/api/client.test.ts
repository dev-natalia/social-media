import { describe, expect, it, vi } from 'vitest'
import { api, ApiError } from './client'
import { mockFetch, jsonBody } from '../test/fetchMock'

describe('api', () => {
  it('sends json and parses the response', async () => {
    const spy = mockFetch(() => ({ body: { ok: true } }))
    const r = await api<{ ok: boolean }>('/api/x', { method: 'POST', json: { a: 1 } })
    expect(r).toEqual({ ok: true })
    const [url, init] = spy.mock.calls[0]
    expect(url).toBe('/api/x')
    expect(jsonBody(init)).toEqual({ a: 1 })
    expect((init!.headers as Record<string, string>)['Content-Type']).toBe('application/json')
  })

  it('throws ApiError with detail on error', async () => {
    mockFetch(() => ({ status: 500, body: { detail: 'x' } }))
    const err = await api<never>('/api/x').catch((e: ApiError) => e)
    expect(err).toBeInstanceOf(ApiError)
    expect(err.status).toBe(500)
    expect(err.detail).toBe('x')
  })

  it('joins validation errors from 422', async () => {
    mockFetch(() => ({ status: 422, body: { detail: [{ msg: 'Value error, O link precisa começar com http' }] } }))
    const err = await api<never>('/api/x').catch((e: ApiError) => e)
    expect(err.detail).toBe('O link precisa começar com http')
  })

  it('returns null on 204', async () => {
    mockFetch(() => ({ status: 204 }))
    expect(await api('/api/x', { method: 'DELETE' })).toBeNull()
  })

  it('dispatches auth:expired on 401 outside /api/auth', async () => {
    mockFetch(() => ({ status: 401, body: { detail: 'Não autenticado' } }))
    const listener = vi.fn()
    window.addEventListener('auth:expired', listener)
    await api('/api/clients').catch(() => {})
    await api('/api/auth/login').catch(() => {})
    expect(listener).toHaveBeenCalledTimes(1)
    window.removeEventListener('auth:expired', listener)
  })
})
