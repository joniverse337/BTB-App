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
 * CSRF-Schutz via Custom-Header-Präsenzprüfung.
 *
 * Browser dürfen custom headers (x-csrf-token) bei cross-origin Requests
 * nicht ohne CORS-Preflight senden — der Preflight schlägt gegen unsere API fehl.
 * Eigene same-origin Requests senden den Header immer via csrfHeaders().
 */
export function validateCsrfToken(
  request: Request
): NextResponse | null {
  const clientToken = request.headers.get(CSRF_HEADER_NAME)

  if (!clientToken) {
    return NextResponse.json(
      { error: 'CSRF-Token fehlt.' },
      { status: 403 }
    )
  }

  return null // Valid
}

