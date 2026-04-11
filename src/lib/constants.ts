// ── Zoom ──────────────────────────────────────────────
export const ZOOM_STORAGE_KEY = 'btb-zoom'
export const ZOOM_DEFAULT = 75
export const ZOOM_MIN = 40
export const ZOOM_MAX = 100

// ── Rate Limiting ─────────────────────────────────────
export const RATE_LIMIT = {
  /** Max attempts within window */
  AUTH_MAX: 20,
  /** Window duration in ms (15 min) */
  AUTH_WINDOW_MS: 15 * 60 * 1000,
  /** Max join-company attempts per user within window */
  JOIN_MAX: 5,
  /** Window duration in ms (1 min) */
  JOIN_WINDOW_MS: 60 * 1000,
  /** Max screenshot uploads per user within window */
  SCREENSHOT_MAX: 20,
  /** Window duration in ms (1 min) */
  SCREENSHOT_WINDOW_MS: 60 * 1000,
  /** Max mutation requests (create/update) per user within window */
  MUTATION_MAX: 30,
  /** Window duration in ms (1 min) */
  MUTATION_WINDOW_MS: 60 * 1000,
} as const

// ── Category Presets ──────────────────────────────────
export const PERSONAL_PRESETS = [
  'Bauleiter',
  'Polier',
  'Vorarbeiter',
  'Facharbeiter',
] as const

export const EQUIPMENT_PRESETS = [
  'ZWB',
  'Wanne + Wagen',
  'Kettenbagger',
  'Radlader',
] as const

// ── Weekday Names ─────────────────────────────────────
export const WEEKDAY_NAMES = [
  'Montag',
  'Dienstag',
  'Mittwoch',
  'Donnerstag',
  'Freitag',
  'Samstag',
  'Sonntag',
] as const
