'use client'

import { CSRF_HEADER_NAME } from '@/lib/csrf'

/**
 * Read the CSRF token from the cookie.
 * Returns the token string or null if not set.
 */
function getCsrfToken(): string {
  const meta = document.querySelector('meta[name="csrf-token"]')
  return meta?.getAttribute('content') || '1'
}

/**
 * Build headers object with CSRF token for fetch requests.
 * Merges with any existing headers.
 *
 * Usage:
 * ```ts
 * const res = await fetch('/api/account/delete', {
 *   method: 'POST',
 *   headers: csrfHeaders({ 'Content-Type': 'application/json' }),
 *   body: JSON.stringify(data),
 * })
 * ```
 */
export function csrfHeaders(
  existing?: HeadersInit
): Record<string, string> {
  const token = getCsrfToken()
  const headers: Record<string, string> = {}

  // Merge existing headers
  if (existing) {
    if (existing instanceof Headers) {
      existing.forEach((value, key) => {
        headers[key] = value
      })
    } else if (Array.isArray(existing)) {
      existing.forEach(([key, value]) => {
        headers[key] = value
      })
    } else {
      Object.assign(headers, existing)
    }
  }

  if (token) {
    headers[CSRF_HEADER_NAME] = token
  }

  return headers
}
