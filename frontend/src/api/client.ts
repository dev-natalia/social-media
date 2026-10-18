export class ApiError extends Error {
  status: number
  detail: string

  constructor(status: number, detail: string) {
    super(detail)
    this.status = status
    this.detail = detail
  }
}

type ApiInit = RequestInit & { json?: unknown }

function detailOf(body: unknown, status: number): string {
  const detail = (body as { detail?: unknown } | null)?.detail
  if (typeof detail === 'string') return detail
  if (Array.isArray(detail)) {
    return detail
      .map((d) => String((d as { msg?: string }).msg ?? '').replace(/^Value error, /, ''))
      .join('; ')
  }
  return `Erro ${status}`
}

export async function api<T = unknown>(path: string, init: ApiInit = {}): Promise<T> {
  const { json, headers, ...rest } = init
  const finalHeaders: Record<string, string> = { ...(headers as Record<string, string> | undefined) }
  const finalInit: RequestInit = { credentials: 'same-origin', ...rest, headers: finalHeaders }
  if (json !== undefined) {
    finalInit.body = JSON.stringify(json)
    finalHeaders['Content-Type'] = 'application/json'
  }
  const res = await fetch(path, finalInit)
  if (res.status === 204) return null as T
  const text = await res.text()
  const body = text ? JSON.parse(text) : null
  if (!res.ok) {
    if (res.status === 401 && !path.startsWith('/api/auth/')) {
      window.dispatchEvent(new Event('auth:expired'))
    }
    throw new ApiError(res.status, detailOf(body, res.status))
  }
  return body as T
}
