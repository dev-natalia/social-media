import { useMemo } from 'react'
import type { Calendar, Post } from '../api/types'
import { EMPTY_DAY, groupByDay } from '../lib/calendar'
import { tint } from '../lib/color'
import { CHECKLIST_ITEMS, STATUS_LABEL } from '../lib/labels'
import DayTags from './DayTags'
import { postMeta } from './PostBlock'

interface Props {
  date: string
  calendar: Calendar | null
  onOpenPost: (post: Post) => void
  onCreate: (date: string) => void
}

export default function DayView({ date, calendar, onOpenPost, onCreate }: Props) {
  const day = useMemo(() => groupByDay(calendar).get(date) ?? EMPTY_DAY, [calendar, date])
  return (
    <div className="day-view">
      <DayTags holidays={day.holidays} dates={day.dates} />
      {day.posts.length === 0 && <p className="muted">Nenhum post neste dia.</p>}
      {day.posts.map((p) => {
        const done = CHECKLIST_ITEMS.filter((i) => p.checklist[i.key]).length
        return (
          <article
            key={p.id}
            className="day-card"
            style={{ borderLeftColor: p.content_type.color, backgroundColor: tint(p.content_type.color, 12) }}
          >
            <header className="day-card-head">
              <div>
                <h3>{p.title}</h3>
                <p className="muted small">
                  {[p.content_type.name, postMeta(p), p.time?.slice(0, 5)].filter(Boolean).join(' · ')}
                </p>
              </div>
              <span className="status-tag">{STATUS_LABEL[p.status]}</span>
              <button type="button" className="btn" aria-label={`Editar ${p.title}`} onClick={() => onOpenPost(p)}>
                Editar
              </button>
            </header>
            <div className="day-card-check">
              <span className="muted small">
                Checklist <strong>{done}/{CHECKLIST_ITEMS.length}</strong>
              </span>
              <ul>
                {CHECKLIST_ITEMS.map((i) => (
                  <li key={i.key} className={p.checklist[i.key] ? 'done' : ''}>
                    {p.checklist[i.key] ? '✓' : '○'} {i.label}
                  </li>
                ))}
              </ul>
            </div>
            {p.description && <p className="day-card-desc">{p.description}</p>}
            {p.drive_url && (
              <a href={p.drive_url} target="_blank" rel="noopener noreferrer" className="small">
                Pasta no Drive
              </a>
            )}
          </article>
        )
      })}
      <button type="button" className="btn" onClick={() => onCreate(date)}>
        + Novo post
      </button>
    </div>
  )
}
