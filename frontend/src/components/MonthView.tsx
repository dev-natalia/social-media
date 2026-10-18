import { useMemo } from 'react'
import type { Calendar, Post } from '../api/types'
import { EMPTY_DAY, groupByDay } from '../lib/calendar'
import { isSameMonth, parseISODate } from '../lib/dates'
import DayTags from './DayTags'
import PostBlock from './PostBlock'

const HEADERS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']
const MAX_VISIBLE = 3

interface Props {
  grid: string[][]
  month: string
  today: string
  calendar: Calendar | null
  onOpenDay: (date: string) => void
  onOpenPost: (post: Post) => void
}

export default function MonthView({ grid, month, today, calendar, onOpenDay, onOpenPost }: Props) {
  const byDay = useMemo(() => groupByDay(calendar), [calendar])
  return (
    <div className="month">
      {HEADERS.map((h) => (
        <div key={h} className="month-head">
          {h}
        </div>
      ))}
      {grid.flat().map((date) => {
        const day = byDay.get(date) ?? EMPTY_DAY
        const extra = day.posts.length - MAX_VISIBLE
        const classes = ['month-cell', !isSameMonth(date, month) && 'outside', date === today && 'today']
        return (
          <div
            key={date}
            data-testid={`day-${date}`}
            className={classes.filter(Boolean).join(' ')}
            onClick={() => onOpenDay(date)}
          >
            <button type="button" className="month-num" onClick={(e) => (e.stopPropagation(), onOpenDay(date))}>
              {parseISODate(date).getDate()}
            </button>
            <DayTags holidays={day.holidays} dates={day.dates} compact />
            <div className="month-posts" onClick={(e) => e.stopPropagation()}>
              {day.posts.slice(0, MAX_VISIBLE).map((p) => (
                <PostBlock key={p.id} post={p} compact onClick={onOpenPost} />
              ))}
              {extra > 0 && (
                <button type="button" className="more" onClick={() => onOpenDay(date)}>
                  +{extra}
                </button>
              )}
            </div>
            <div className="month-dots" aria-hidden>
              {day.posts.map((p) => (
                <span key={p.id} style={{ background: p.content_type.color }} />
              ))}
            </div>
          </div>
        )
      })}
    </div>
  )
}
