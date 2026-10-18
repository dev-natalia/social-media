import { describe, expect, it } from 'vitest'
import {
  addDays,
  addMonths,
  formatDayLong,
  formatMonth,
  formatShortDate,
  formatWeekRange,
  isSameMonth,
  monthGrid,
  parseISODate,
  startOfWeek,
  toISODate,
  weekDays,
  weekdayShort,
} from './dates'

describe('dates', () => {
  it('runs in the São Paulo timezone', () => {
    expect(process.env.TZ).toBe('America/Sao_Paulo')
  })

  it('round-trips an ISO date without shifting the day', () => {
    expect(toISODate(parseISODate('2026-11-02'))).toBe('2026-11-02')
    expect(parseISODate('2026-11-02').getDate()).toBe(2)
  })

  it('finds the Sunday that starts the week', () => {
    expect(startOfWeek('2026-11-04')).toBe('2026-11-01')
    expect(startOfWeek('2026-11-01')).toBe('2026-11-01')
    expect(startOfWeek('2026-11-07')).toBe('2026-11-01')
  })

  it('lists the 7 days of a week', () => {
    const days = weekDays('2026-11-01')
    expect(days).toHaveLength(7)
    expect(days[0]).toBe('2026-11-01')
    expect(days[6]).toBe('2026-11-07')
  })

  it('builds the month grid from Sunday to Saturday', () => {
    const grid = monthGrid('2026-11-15')
    expect(grid).toHaveLength(5)
    expect(grid[0][0]).toBe('2026-11-01')
    expect(grid[4][6]).toBe('2026-12-05')
    expect(monthGrid('2026-08-10')).toHaveLength(6)
  })

  it('adds days and months across boundaries', () => {
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01')
    expect(addDays('2026-03-01', -1)).toBe('2026-02-28')
    expect(addMonths('2026-01-31', 1)).toBe('2026-02-01')
    expect(addMonths('2026-01-15', -1)).toBe('2025-12-01')
  })

  it('compares months', () => {
    expect(isSameMonth('2026-11-01', '2026-11-30')).toBe(true)
    expect(isSameMonth('2026-11-30', '2026-12-01')).toBe(false)
  })

  it('formats labels in Portuguese', () => {
    expect(formatWeekRange('2026-11-01')).toBe('1–7 nov 2026')
    expect(formatWeekRange('2026-11-29')).toBe('29 nov – 5 dez 2026')
    expect(formatWeekRange('2026-12-27')).toBe('27 dez 2026 – 2 jan 2027')
    expect(weekdayShort('2026-11-02')).toBe('Seg')
    expect(formatMonth('2026-11-15')).toBe('novembro 2026')
    expect(formatDayLong('2026-11-03')).toBe('Ter, 3 nov 2026')
    expect(formatShortDate('2026-11-03')).toBe('Ter 3/11')
  })
})
