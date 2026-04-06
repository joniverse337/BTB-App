import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { isAuthRateLimited } from '@/lib/rate-limit'

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  const authRoutes = ['/login', '/register', '/reset-password']
  const publicRoutes = ['/impressum', '/datenschutz']
  const isAuthRoute = authRoutes.some(route => pathname.startsWith(route))
  const isPublicRoute = publicRoutes.some(route => pathname.startsWith(route))
  const isCallbackRoute = pathname.startsWith('/auth/callback')

  // Rate limit auth pages (POST only — schützt vor Brute-Force, nicht vor normalen Seitenaufrufen)
  if (isAuthRoute && request.method === 'POST') {
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0].trim()
      ?? request.headers.get('x-real-ip')
      ?? 'unknown'

    if (await isAuthRateLimited(ip)) {
      return new NextResponse('Too Many Requests', {
        status: 429,
        headers: { 'Retry-After': '900' },
      })
    }
  }

  let supabaseResponse = NextResponse.next({ request })

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
          supabaseResponse = NextResponse.next({ request })
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
    return supabaseResponse
  }

  // Invalid/expired refresh token → clear stale cookies and redirect to login
  if (authError && !isAuthRoute && !isPublicRoute) {
    const response = NextResponse.redirect(new URL('/login', request.url))
    request.cookies.getAll()
      .filter(c => c.name.startsWith('sb-'))
      .forEach(c => response.cookies.delete(c.name))
    return response
  }

  // Root: logged in → /projekte, not logged in → /login (no landing page)
  if (pathname === '/') {
    return NextResponse.redirect(new URL(user ? '/projekte' : '/login', request.url))
  }

  // Auth pages (login/register/reset): logged in → /projekte
  if (isAuthRoute && user) {
    return NextResponse.redirect(new URL('/projekte', request.url))
  }

  // Protected routes: not logged in → /login
  if (!isAuthRoute && !isPublicRoute && !user) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
