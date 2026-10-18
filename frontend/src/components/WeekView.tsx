import { useEffect, useMemo, useRef, useState, type DragEvent } from 'react'
import type { Calendar, Post } from '../api/types'
import { canDragPosts, EMPTY_DAY, groupByDay } from '../lib/calendar'
import { parseISODate, weekdayShort } from '../lib/dates'
import DayTags from './DayTags'
import PostBlock, { DRAG_TYPE } from './PostBlock'

interface Props {
  days: string[]
  calendar: Calendar | null
  today: string
  onOpenPost: (post: Post) => void
  onCreate: (date: string) => void
  onMove: (postId: number, date: string) => void
}

export default function WeekView({ days, calendar, today, onOpenPost, onCreate, onMove }: Props) {
  const byDay = useMemo(() => groupByDay(calendar), [calendar])
  const draggable = useMemo(canDragPosts, [])
  const [dropTarget, setDropTarget] = useState<string | null>(null)
  const scroller = useRef<HTMLDivElement>(null)

  // No celular (uma coluna por vez), começa mostrando o dia de hoje.
  const firstDay = days[0]
  useEffect(() => {
    const el = scroller.current
    const idx = days.indexOf(today)
    if (!el || idx < 0) return
    const col = el.children[idx] as HTMLElement | undefined
    if (col && el.scrollWidth > el.clientWidth) el.scrollLeft = col.offsetLeft - el.offsetLeft
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [firstDay, today])

  function onDrop(e: DragEvent, date: string) {
    e.preventDefault()
    setDropTarget(null)
    const raw = e.dataTransfer.getData(DRAG_TYPE)
    if (!raw) return
    const { id, date: from } = JSON.parse(raw) as { id: number; date: string }
    if (from !== date) onMove(id, date)
  }

  return (
    <div className="week" ref={scroller}>
      {days.map((date) => {
        const label = `${weekdayShort(date)} ${parseISODate(date).getDate()}`
        const day = byDay.get(date) ?? EMPTY_DAY
        const classes = ['day-col', date === today && 'today', dropTarget === date && 'drop-target']
        return (
          <section
            key={date}
            aria-label={label}
            className={classes.filter(Boolean).join(' ')}
            onDragOver={(e) => {
              e.preventDefault()
              if (dropTarget !== date) setDropTarget(date)
            }}
            onDragLeave={() => setDropTarget((d) => (d === date ? null : d))}
            onDrop={(e) => onDrop(e, date)}
          >
            <header className="day-head">
              <span>{weekdayShort(date)}</span>
              <span className="day-num">{parseISODate(date).getDate()}</span>
            </header>
            <DayTags holidays={day.holidays} dates={day.dates} />
            {day.posts.map((p) => (
              <PostBlock key={p.id} post={p} draggable={draggable} onClick={onOpenPost} />
            ))}
            <button type="button" className="add-post" aria-label={`Novo post em ${label}`} onClick={() => onCreate(date)}>
              +
            </button>
          </section>
        )
      })}
    </div>
  )
}
