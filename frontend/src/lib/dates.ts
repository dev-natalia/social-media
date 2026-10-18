// Toda data do app é "YYYY-MM-DD" em horário local. Nunca use new Date(isoString): ele lê como UTC.

const MONTHS_SHORT = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez']
const MONTHS_LONG = [
  'janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho',
  'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro',
]
const WEEKDAYS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']

export function parseISODate(s: string): Date {
  const [y, m, d] = s.split('-').map(Number)
  return new Date(y, m - 1, d)
}

export function toISODate(d: Date): string {
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `${d.getFullYear()}-${mm}-${dd}`
}

export function todayISO(): string {
  return toISODate(new Date())
}

export function addDays(iso: string, n: number): string {
  const d = parseISODate(iso)
  d.setDate(d.getDate() + n)
  return toISODate(d)
}

/** Primeiro dia do mês deslocado em `n` meses. */
export function addMonths(iso: string, n: number): string {
  const d = parseISODate(iso)
  return toISODate(new Date(d.getFullYear(), d.getMonth() + n, 1))
}

export function startOfWeek(iso: string): string {
  return addDays(iso, -parseISODate(iso).getDay())
}

export function weekDays(startIso: string): string[] {
  return Array.from({ length: 7 }, (_, i) => addDays(startIso, i))
}

export function monthGrid(iso: string): string[][] {
  const d = parseISODate(iso)
  const first = toISODate(new Date(d.getFullYear(), d.getMonth(), 1))
  const last = toISODate(new Date(d.getFullYear(), d.getMonth() + 1, 0))
  const weeks: string[][] = []
  for (let start = startOfWeek(first); start <= last; start = addDays(start, 7)) {
    weeks.push(weekDays(start))
  }
  return weeks
}

export function isSameMonth(a: string, b: string): boolean {
  return a.slice(0, 7) === b.slice(0, 7)
}

export function weekdayShort(iso: string): string {
  return WEEKDAYS[parseISODate(iso).getDay()]
}

function dayMonth(d: Date): string {
  return `${d.getDate()} ${MONTHS_SHORT[d.getMonth()]}`
}

export function formatWeekRange(startIso: string): string {
  const a = parseISODate(startIso)
  const b = parseISODate(addDays(startIso, 6))
  if (a.getFullYear() !== b.getFullYear()) {
    return `${dayMonth(a)} ${a.getFullYear()} – ${dayMonth(b)} ${b.getFullYear()}`
  }
  if (a.getMonth() !== b.getMonth()) return `${dayMonth(a)} – ${dayMonth(b)} ${b.getFullYear()}`
  return `${a.getDate()}–${dayMonth(b)} ${b.getFullYear()}`
}

export function formatMonth(iso: string): string {
  const d = parseISODate(iso)
  return `${MONTHS_LONG[d.getMonth()]} ${d.getFullYear()}`
}

export function formatDayLong(iso: string): string {
  const d = parseISODate(iso)
  return `${WEEKDAYS[d.getDay()]}, ${dayMonth(d)} ${d.getFullYear()}`
}

export function formatShortDate(iso: string): string {
  const d = parseISODate(iso)
  return `${WEEKDAYS[d.getDay()]} ${d.getDate()}/${d.getMonth() + 1}`
}
