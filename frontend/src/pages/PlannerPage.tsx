import { useEffect, useMemo, useState } from 'react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import { api } from '../api/client'
import type { ClientSummary, Post, PostStatus } from '../api/types'
import ClientAvatar from '../components/ClientAvatar'
import StatusFilter from '../components/StatusFilter'
import WeekView from '../components/WeekView'
import { useCalendar } from '../hooks/useCalendar'
import { addDays, formatWeekRange, startOfWeek, todayISO, weekDays } from '../lib/dates'

type View = 'dia' | 'semana' | 'mes'
const VIEWS: { key: View; label: string }[] = [
  { key: 'dia', label: 'Dia' },
  { key: 'semana', label: 'Semana' },
  { key: 'mes', label: 'Mês' },
]

export default function PlannerPage() {
  const clientId = Number(useParams().id)
  const [params, setParams] = useSearchParams()
  const today = todayISO()
  const view = (params.get('view') as View) || 'semana'
  const date = params.get('data') || today
  const [statuses, setStatuses] = useState<PostStatus[]>([])
  const [client, setClient] = useState<ClientSummary | null>(null)

  useEffect(() => {
    api<ClientSummary>(`/api/clients/${clientId}`).then(setClient).catch(() => setClient(null))
  }, [clientId])

  const range = useMemo(() => {
    const start = startOfWeek(date)
    return { start, end: addDays(start, 6), days: weekDays(start), label: formatWeekRange(start) }
  }, [date])

  const { data, setData, error, reload } = useCalendar(clientId, range.start, range.end, statuses)

  function go(next: Partial<{ view: View; data: string }>) {
    const p = new URLSearchParams(params)
    Object.entries(next).forEach(([k, v]) => p.set(k, v))
    setParams(p, { replace: true })
  }

  function step(dir: 1 | -1) {
    go({ data: addDays(date, 7 * dir) })
  }

  async function movePost(postId: number, newDate: string) {
    setData((d) => d && { ...d, posts: d.posts.map((p) => (p.id === postId ? { ...p, date: newDate } : p)) })
    try {
      await api(`/api/posts/${postId}`, { method: 'PATCH', json: { date: newDate } })
    } finally {
      reload()
    }
  }

  const openPost = (_post: Post) => {}
  const createPost = (_date: string) => {}

  return (
    <div className="planner">
      <div className="planner-head">
        <div className="planner-title">
          <Link to="/" className="back" aria-label="Voltar aos clientes">
            ‹
          </Link>
          {client && <ClientAvatar client={client} />}
          <h1>{client?.name ?? '…'}</h1>
        </div>
        <div className="planner-nav">
          <button className="btn" aria-label="Anterior" onClick={() => step(-1)}>
            ‹
          </button>
          <button className="btn" onClick={() => go({ data: today })}>
            Hoje
          </button>
          <button className="btn" aria-label="Próximo" onClick={() => step(1)}>
            ›
          </button>
          <span className="range-label">{range.label}</span>
        </div>
        <div className="tabs" role="tablist">
          {VIEWS.map((v) => (
            <button key={v.key} role="tab" aria-selected={view === v.key} className="tab" onClick={() => go({ view: v.key })}>
              {v.label}
            </button>
          ))}
        </div>
      </div>
      <StatusFilter value={statuses} onChange={setStatuses} />
      {error && <p className="error">{error}</p>}
      <WeekView
        days={range.days}
        calendar={data}
        today={today}
        onOpenPost={openPost}
        onCreate={createPost}
        onMove={movePost}
      />
    </div>
  )
}
