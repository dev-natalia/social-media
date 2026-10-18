import type { Calendar, Holiday, Occurrence, Post } from '../api/types'

export interface DayData {
  posts: Post[]
  holidays: Holiday[]
  dates: Occurrence[]
}

/** Agrupa o conteúdo do calendário por data (YYYY-MM-DD). */
export function groupByDay(calendar: Calendar | null): Map<string, DayData> {
  const map = new Map<string, DayData>()
  const get = (date: string) => {
    let d = map.get(date)
    if (!d) map.set(date, (d = { posts: [], holidays: [], dates: [] }))
    return d
  }
  if (!calendar) return map
  calendar.posts.forEach((p) => get(p.date).posts.push(p))
  calendar.holidays.forEach((h) => get(h.date).holidays.push(h))
  calendar.important_dates.forEach((o) => get(o.date).dates.push(o))
  return map
}

export const EMPTY_DAY: DayData = { posts: [], holidays: [], dates: [] }

/** Arrastar só faz sentido com mouse; no toque a data é trocada no painel do post. */
export function canDragPosts(): boolean {
  if (typeof window.matchMedia !== 'function') return true
  return window.matchMedia('(pointer: fine)').matches
}
