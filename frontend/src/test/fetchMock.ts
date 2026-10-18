import { vi } from 'vitest'

type Handler = (url: string, init: RequestInit) => { status?: number; body?: unknown } | undefined

/** Substitui fetch: cada chamada vai para `handler`; retorna o spy para inspecionar chamadas. */
export function mockFetch(handler: Handler) {
  const spy = vi.fn(async (input: RequestInfo | URL, init: RequestInit = {}) => {
    const url = typeof input === 'string' ? input : input.toString()
    const res = handler(url, init) ?? { status: 404, body: { detail: 'not mocked: ' + url } }
    const status = res.status ?? 200
    const body = res.body === undefined ? null : JSON.stringify(res.body)
    return new Response(status === 204 ? null : body, {
      status,
      headers: { 'Content-Type': 'application/json' },
    })
  })
  vi.stubGlobal('fetch', spy)
  return spy
}

export function jsonBody(init: RequestInit | undefined) {
  return JSON.parse(String(init?.body ?? 'null'))
}
