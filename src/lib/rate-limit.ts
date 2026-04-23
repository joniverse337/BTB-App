import { Ratelimit } from '@upstash/ratelimit'
import { Redis } from '@upstash/redis'
import { RATE_LIMIT } from '@/lib/constants'

// ── Upstash Redis client ─────────────────────────────
// Falls keine Redis-Credentials gesetzt sind, wird ein In-Memory-Fallback verwendet.
// Das erlaubt lokale Entwicklung ohne Redis-Setup.

const hasRedis =
  process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN


const redis = hasRedis
  ? new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL!,
      token: process.env.UPSTASH_REDIS_REST_TOKEN!,
    })
  : undefined

// ── In-Memory-Fallback (nur für lokale Entwicklung ohne Redis-Credentials) ──
// In Produktion (UPSTASH_REDIS_REST_URL gesetzt) wird dieser Pfad nie erreicht.
// Wenn Redis in Produktion ausfällt, propagiert der Upstash-Client den Fehler
// als unbehandelte Exception → 500 (fail-closed, kein Rate-Limit-Bypass).
const memoryStore = new Map<string, { count: number; resetAt: number }>()

function checkMemoryLimit(
  key: string,
  max: number,
  windowMs: number
): { success: boolean } {
  const now = Date.now()
  const entry = memoryStore.get(key)

  if (!entry || now > entry.resetAt) {
    memoryStore.set(key, { count: 1, resetAt: now + windowMs })
    return { success: true }
  }

  if (entry.count >= max) {
    return { success: false }
  }

  entry.count++
  return { success: true }
}

// ── Rate Limiters ────────────────────────────────────

/** Auth-Routen: 20 Requests pro 15 Minuten (per IP) */
const authLimiter = redis
  ? new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(RATE_LIMIT.AUTH_MAX, '15 m'),
      prefix: 'rl:auth',
    })
  : null

/** Company-Join: 5 Versuche pro Minute (per User) */
const joinLimiter = redis
  ? new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(RATE_LIMIT.JOIN_MAX, '1 m'),
      prefix: 'rl:join',
    })
  : null

/** Screenshot-Upload: 20 Uploads pro Minute (per User) */
const screenshotLimiter = redis
  ? new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(RATE_LIMIT.SCREENSHOT_MAX, '1 m'),
      prefix: 'rl:screenshot',
    })
  : null

/** Mutations (create/update): 30 Requests pro Minute (per User) */
const mutationLimiter = redis
  ? new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(RATE_LIMIT.MUTATION_MAX, '1 m'),
      prefix: 'rl:mutation',
    })
  : null

// ── Exported functions ───────────────────────────────

/**
 * Rate-Limit-Check für Auth-Routen (Login, Register, Reset).
 * @param ip – Client-IP-Adresse
 * @returns true wenn das Limit überschritten ist
 */
export async function isAuthRateLimited(ip: string): Promise<boolean> {
  if (authLimiter) {
    const { success } = await authLimiter.limit(ip)
    return !success
  }
  // Fallback: In-Memory
  return !checkMemoryLimit(`auth:${ip}`, RATE_LIMIT.AUTH_MAX, RATE_LIMIT.AUTH_WINDOW_MS).success
}

/**
 * Rate-Limit-Check für Company-Join.
 * @param userId – Authenticated User ID
 * @returns true wenn das Limit überschritten ist
 */
export async function isJoinRateLimited(userId: string): Promise<boolean> {
  if (joinLimiter) {
    const { success } = await joinLimiter.limit(userId)
    return !success
  }
  // Fallback: In-Memory
  return !checkMemoryLimit(`join:${userId}`, RATE_LIMIT.JOIN_MAX, RATE_LIMIT.JOIN_WINDOW_MS).success
}

/**
 * Rate-Limit-Check für Screenshot-Uploads.
 * @param userId – Authenticated User ID
 * @returns true wenn das Limit überschritten ist
 */
export async function isScreenshotRateLimited(userId: string): Promise<boolean> {
  if (screenshotLimiter) {
    const { success } = await screenshotLimiter.limit(userId)
    return !success
  }
  // Fallback: In-Memory
  return !checkMemoryLimit(`screenshot:${userId}`, RATE_LIMIT.SCREENSHOT_MAX, RATE_LIMIT.SCREENSHOT_WINDOW_MS).success
}

/**
 * Rate-Limit-Check für Mutations (Company create/update, Schicht-Generierung).
 * @param userId – Authenticated User ID
 * @returns true wenn das Limit überschritten ist
 */
export async function isMutationRateLimited(userId: string): Promise<boolean> {
  if (mutationLimiter) {
    const { success } = await mutationLimiter.limit(userId)
    return !success
  }
  // Fallback: In-Memory
  return !checkMemoryLimit(`mutation:${userId}`, RATE_LIMIT.MUTATION_MAX, RATE_LIMIT.MUTATION_WINDOW_MS).success
}
