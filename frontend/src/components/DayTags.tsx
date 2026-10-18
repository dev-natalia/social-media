import type { Holiday, Occurrence } from '../api/types'

interface Props {
  holidays: Holiday[]
  dates: Occurrence[]
  compact?: boolean
}

export default function DayTags({ holidays, dates, compact = false }: Props) {
  if (holidays.length === 0 && dates.length === 0) return null
  return (
    <div className={`day-tags${compact ? ' compact' : ''}`}>
      {holidays.map((h) => (
        <span key={`h-${h.date}`} className="tag holiday" title={h.name}>
          <span aria-hidden>🇧🇷 </span>
          <span>{h.name}</span>
        </span>
      ))}
      {dates.map((d) => (
        <span key={`d-${d.id}-${d.date}`} className="tag important" title={d.name}>
          <span aria-hidden>★ </span>
          <span>{d.name}</span>
        </span>
      ))}
    </div>
  )
}
