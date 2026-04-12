/**
 * CSRF Protection – Double Submit Cookie Pattern
 *
 * How it works:
 * 1. Middleware sets a `csrf-token` cookie with a cryptographically random value
 * 2. Client reads the cookie and sends the value in an `X-CSRF-Token` header
 * 3. Critical API routes verify that header matches cookie
 *
 * This prevents cross-site attackers from submitting forms/fetch requests
 * because they can't read the cookie value from another origin.
 */

import { NextResponse } from 'next/server'

export const CSRF_COOKIE_NAME = 'csrf-token'
export const CSRF_HEADER_NAME = 'x-csrf-token'

/**
 * Generate a cryptographically secure CSRF token.
 */
export function generateCsrfToken(): string {
  const bytes = new Uint8Array(32)
  crypto.getRandomValues(bytes)
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('')
}

/**
 * Parse a cookie value from the raw Cookie header string.
 */
function parseCookieValue(cookieHeader: string | null, name: string): string | undefined {
  if (!cookieHeader) return undefined
  for (const part of cookieHeader.split(';')) {
    const [key, ...rest] = part.trim().split('=')
    if (key.trim() === name) return rest.join('=').trim()
  }
  return undefined
}

/**
 * Validate the CSRF token from the request header against the cookie.
 * Works with both Request and NextRequest (Edge-compatible, no next/headers).
 * Returns an error response if validation fails, or null if valid.
 */
export function validateCsrfToken(
  request: Request
): NextResponse | null {
  const cookieToken = parseCookieValue(request.headers.get('cookie'), CSRF_COOKIE_NAME)
  const headerToken = request.headers.get(CSRF_HEADER_NAME)

  if (!cookieToken || !headerToken) {
    return NextResponse.json(
      { error: 'CSRF-Token fehlt.' },
      { status: 403 }
    )
  }

  // Constant-time comparison to prevent timing attacks
  if (!timingSafeEqual(cookieToken, headerToken)) {
    return NextResponse.json(
      { error: 'Ungültiger CSRF-Token.' },
      { status: 403 }
    )
  }

  return null // Valid
}

/**
 * Constant-time string comparison to prevent timing attacks.
 */
function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false
  const encoder = new TextEncoder()
  const bufA = encoder.encode(a)
  const bufB = encoder.encode(b)
  let result = 0
  for (let i = 0; i < bufA.length; i++) {
    result |= bufA[i] ^ bufB[i]
  }
  return result === 0
}
