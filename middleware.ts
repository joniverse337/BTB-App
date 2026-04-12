import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { isAuthRateLimited } from '@/lib/rate-limit'
import { CSRF_COOKIE_NAME, generateCsrfToken } from '@/lib/csrf'

function generateNonce(): string {
  const array = new Uint8Array(16)
  crypto.getRandomValues(array)
  return btoa(String.fromCharCode(...array))
}

function buildCSP(nonce: string): string {
  return [
    "default-src 'self'",
    // 'nonce-...' erlaubt explizit markierte Inline-Scripts
    // 'strict-dynamic' vertraut allen Scripts, die von einem Nonce-Script geladen werden
    // 'unsafe-inline' ist Fallback für ältere Browser (wird von strict-dynamic ignoriert)
    `script-src 'nonce-${nonce}' 'strict-dynamic' 'self' 'unsafe-inline'`,
    // Styles: Nonce für Inline-Styles + Google Fonts
    `style-src-elem 'self' 'nonce-${nonce}' 'unsafe-inline' https://fonts.googleapis.com`,
    "style-src-attr 'unsafe-inline'",
    `connect-src 'self' ${process.env.NEXT_PUBLIC_SUPABASE_URL} https://*.supabase.co https://*.mapbox.com`,
    `img-src 'self' data: blob: https://*.supabase.co https://*.mapbox.com`,
    "worker-src blob:",
    "font-src 'self' https://fonts.gstatic.com",
    "frame-ancestors 'none'",
    "form-action 'self'",
  ].join('; ')
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  const authRoutes = ['/login', '/register', '/reset-password']
  const publicRoutes = ['/impressum', '/datenschutz']
  const isAuthRoute = authRoutes.some(route => pathname.startsWith(route))
  const isPublicRoute = publicRoutes.some(route => pathname.startsWith(route))
  const isCallbackRoute = pathname.startsWith('/auth/callback')

  // Nonce einmal pro Request generieren — vor createServerClient,
  // damit requestHeaders in beiden NextResponse.next()-Aufrufen verfügbar ist
  const nonce = generateNonce()
  const csp = buildCSP(nonce)

  // x-nonce in Request-Headers injecten — das Root-Layout liest diesen Header
  // via headers().get('x-nonce'), wodurch Next.js die Nonce auf seine eigenen
  // Inline-<script>-Tags anwendet (Hydration, Chunk-Loading, etc.)
  const requestHeaders = new Headers(request.headers)
  requestHeaders.set('x-nonce', nonce)

  // Rate limit auth pages (POST only — schützt vor Brute-Force, nicht vor normalen Seitenaufrufen)
  if (isAuthRoute && request.method === 'POST') {
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0].trim()
      ?? request.headers.get('x-real-ip')
      ?? 'unknown'

    if (await isAuthRateLimited(ip)) {
      return new NextResponse('Too Many Requests', {
        status: 429,
        headers: { 'Retry-After': '900', 'Content-Security-Policy': csp },
      })
    }
  }

  let supabaseResponse = NextResponse.next({ request: { headers: requestHeaders } })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? '',
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '',
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          // requestHeaders wiederverwenden → x-nonce bleibt erhalten wenn setAll supabaseResponse ersetzt
          supabaseResponse = NextResponse.next({ request: { headers: requestHeaders } })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const { data: { user }, error: authError } = await supabase.auth.getUser()

  // Skip middleware for callback route
  if (isCallbackRoute) {
    supabaseResponse.headers.set('Content-Security-Policy', csp)
    return supabaseResponse
  }

  // Invalid/expired refresh token → clear stale cookies and redirect to login
  if (authError && !isAuthRoute && !isPublicRoute) {
    const response = NextResponse.redirect(new URL('/login', request.url))
    request.cookies.getAll()
      .filter(c => c.name.startsWith('sb-'))
      .forEach(c => response.cookies.delete(c.name))
    response.headers.set('Content-Security-Policy', csp)
    return response
  }

  // Root: logged in → /projekte, not logged in → /login (no landing page)
  if (pathname === '/') {
    const response = NextResponse.redirect(new URL(user ? '/projekte' : '/login', request.url))
    response.headers.set('Content-Security-Policy', csp)
    return response
  }

  // Auth pages (login/register/reset): logged in → /projekte
  if (isAuthRoute && user) {
    const response = NextResponse.redirect(new URL('/projekte', request.url))
    response.headers.set('Content-Security-Policy', csp)
    return response
  }

  // Protected routes: not logged in → /login
  if (!isAuthRoute && !isPublicRoute && !user) {
    const response = NextResponse.redirect(new URL('/login', request.url))
    response.headers.set('Content-Security-Policy', csp)
    return response
  }

  // CSRF-Cookie setzen (nur wenn noch nicht vorhanden)
  if (!request.cookies.get(CSRF_COOKIE_NAME)) {
    supabaseResponse.cookies.set(CSRF_COOKIE_NAME, generateCsrfToken(), {
      httpOnly: false, // Client muss den Wert lesen können
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      path: '/',
    })
  }

  // CSP nach Supabase-Verarbeitung setzen — setAll kann supabaseResponse ersetzt haben
  supabaseResponse.headers.set('Content-Security-Policy', csp)
  return supabaseResponse
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
