import { useCallback, useEffect, useState } from 'react'
import { api, ApiError } from '../api/client'
import type { Calendar, PostStatus } from '../api/types'

export function useCalendar(clientId: number, start: string, end: string, statuses: PostStatus[]) {
  const [data, setData] = useState<Calendar | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [version, setVersion] = useState(0)
  const statusKey = statuses.join(',')

  useEffect(() => {
    let cancelled = false
    const params = new URLSearchParams({ start, end })
    statusKey.split(',').filter(Boolean).forEach((s) => params.append('status', s))
    setLoading(true)
    api<Calendar>(`/api/clients/${clientId}/calendar?${params}`)
      .then((d) => {
        if (cancelled) return
        setData(d)
        setError('')
      })
      .catch((e) => !cancelled && setError(e instanceof ApiError ? e.detail : 'Não foi possível carregar.'))
      .finally(() => !cancelled && setLoading(false))
    return () => {
      cancelled = true
    }
  }, [clientId, start, end, statusKey, version])

  const reload = useCallback(() => setVersion((v) => v + 1), [])
  return { data, setData, loading, error, reload }
}
