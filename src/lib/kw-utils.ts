import {
  startOfISOWeek,
  endOfISOWeek,
  getISOWeek,
  getISOWeekYear,
  addWeeks,
  eachDayOfInterval,
  format,
  isWithinInterval,
  isBefore,
  isAfter,
  parseISO,
  max,
  min,
} from 'date-fns'
import { de } from 'date-fns/locale'

export interface KWInfo {
  /** ISO week number */
  kw: number
  /** ISO week year */
  year: number
  /** First day of the ISO week */
  weekStart: Date
  /** Last day of the ISO week */
  weekEnd: Date
  /** Days within this week that fall inside the Leistungszeitraum */
  daysInRange: Date[]
  /** Formatted label, e.g. "KW 12" */
  label: string
  /** Formatted date range, e.g. "17.–23. Mär" */
  dateRange: string
}

/**
 * Get all calendar weeks that overlap with the given Leistungszeitraum.
 * Each KW only contains the days that actually fall within the range.
 */
export function getKWsForRange(lzVon: string, lzBis: string): KWInfo[] {
  const rangeStart = parseISO(lzVon)
  const rangeEnd = parseISO(lzBis)

  if (isAfter(rangeStart, rangeEnd)) return []

  const weeks: KWInfo[] = []
  let current = startOfISOWeek(rangeStart)

  while (!isAfter(current, rangeEnd)) {
    const weekStart = current
    const weekEnd = endOfISOWeek(current)

    // Get only the days within the Leistungszeitraum
    const intervalStart = max([weekStart, rangeStart])
    const intervalEnd = min([weekEnd, rangeEnd])

    const daysInRange = eachDayOfInterval({
      start: intervalStart,
      end: intervalEnd,
    })

    const kw = getISOWeek(weekStart)
    const year = getISOWeekYear(weekStart)

    // Format date range
    const firstDay = daysInRange[0]
    const lastDay = daysInRange[daysInRange.length - 1]
    const dateRange =
      daysInRange.length === 1
        ? format(firstDay, 'd. MMM', { locale: de })
        : `${format(firstDay, 'd.', { locale: de })}–${format(lastDay, 'd. MMM', { locale: de })}`

    weeks.push({
      kw,
      year,
      weekStart,
      weekEnd,
      daysInRange,
      label: `KW ${kw}`,
      dateRange,
    })

    current = addWeeks(current, 1)
  }

  return weeks
}

/**
 * Find the KW index that contains today, or return 0 (first KW).
 */
export function getCurrentKWIndex(weeks: KWInfo[]): number {
  const today = new Date()
  const idx = weeks.findIndex((w) =>
    isWithinInterval(today, { start: w.weekStart, end: w.weekEnd })
  )
  return idx >= 0 ? idx : 0
}

/**
 * Format a date for display on shift cards.
 * e.g. "Mo, 10. Mär"
 */
export function formatShiftDate(date: Date): string {
  return format(date, 'EEEEEE, d. MMM', { locale: de })
}

/**
 * Format a night shift date label spanning two days.
 * e.g. "Mo/Di, 10./11. Mär"
 */
export function formatNightShiftDate(date: Date): string {
  const nextDay = new Date(date)
  nextDay.setDate(nextDay.getDate() + 1)
  const dayAbbr1 = format(date, 'EEEEEE', { locale: de })
  const dayAbbr2 = format(nextDay, 'EEEEEE', { locale: de })
  const day1 = format(date, 'd.', { locale: de })
  const day2 = format(nextDay, 'd. MMM', { locale: de })
  return `${dayAbbr1}/${dayAbbr2}, ${day1}/${day2}`
}

/**
 * Calculate net hours from start time, end time, and break in minutes.
 * Handles overnight shifts (end < start).
 */
export function calculateNetHours(
  beginn: string | null,
  ende: string | null,
  pauseMinutes: number | null
): number {
  if (!beginn || !ende) return 0

  const [bH, bM] = beginn.split(':').map(Number)
  const [eH, eM] = ende.split(':').map(Number)

  let totalMinutes = eH * 60 + eM - (bH * 60 + bM)

  // Overnight shift
  if (totalMinutes < 0) {
    totalMinutes += 24 * 60
  }

  totalMinutes -= pauseMinutes ?? 0

  if (totalMinutes <= 0) return 0

  return Math.round((totalMinutes / 60) * 100) / 100
}

/**
 * Format a date for A4 card headers (full weekday + dd.MM.yyyy).
 * e.g. "Montag, 10.03.2026"
 */
export function formatCardDate(date: Date): string {
  return format(date, 'EEEE, dd.MM.yyyy', { locale: de })
}

/**
 * Format a date as ISO date string (YYYY-MM-DD) for DB storage.
 */
export function toDateString(date: Date): string {
  return format(date, 'yyyy-MM-dd')
}
