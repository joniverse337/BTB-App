import { NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { createServiceClient } from '@/lib/supabase'
import { joinCompanySchema } from '@/lib/validations/company'

// In-memory rate limiter: 5 attempts per minute per user
const rateLimitMap = new Map<string, { count: number; resetAt: number }>()
const RATE_LIMIT_MAX = 5
const RATE_LIMIT_WINDOW_MS = 60 * 1000 // 1 minute

function isRateLimited(userId: string): boolean {
  const now = Date.now()
  const entry = rateLimitMap.get(userId)

  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(userId, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS })
    return false
  }

  if (entry.count >= RATE_LIMIT_MAX) {
    return true
  }

  entry.count++
  return false
}

// Generic error message to prevent enumeration attacks
const INVALID_CODE_ERROR = 'Dieser Code ist nicht gültig.'

export async function POST(request: Request) {
  // 1. Check authentication
  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll() {
          // Read-only in API routes
        },
      },
    }
  )

  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json(
      { error: 'Nicht authentifiziert.' },
      { status: 401 }
    )
  }

  // 2. Rate limit check (per userId)
  if (isRateLimited(user.id)) {
    return NextResponse.json(
      { error: 'Zu viele Versuche. Bitte warte eine Minute.' },
      { status: 429 }
    )
  }

  // 3. Parse and validate request body
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json(
      { error: 'Ungültige Anfrage.' },
      { status: 400 }
    )
  }

  const parsed = joinCompanySchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: INVALID_CODE_ERROR },
      { status: 400 }
    )
  }

  const { code } = parsed.data

  // 4. Check if user already has a company
  const serviceClient = createServiceClient()

  const { data: profile, error: profileError } = await serviceClient
    .from('profiles')
    .select('company_id')
    .eq('user_id', user.id)
    .single()

  if (profileError) {
    return NextResponse.json(
      { error: 'Profil konnte nicht geladen werden.' },
      { status: 500 }
    )
  }

  if (profile.company_id) {
    return NextResponse.json(
      { error: 'Du bist bereits mit einer Firma verbunden.' },
      { status: 400 }
    )
  }

  // 5. Look up company by code
  // ALWAYS return the same error for not found AND inactive (prevents enumeration)
  const { data: company, error: companyError } = await serviceClient
    .from('companies')
    .select('id, name, code, is_active')
    .eq('code', code)
    .single()

  if (companyError || !company || !company.is_active) {
    return NextResponse.json(
      { error: INVALID_CODE_ERROR },
      { status: 400 }
    )
  }

  // 6. Link user to company
  const { error: updateError } = await serviceClient
    .from('profiles')
    .update({ company_id: company.id })
    .eq('user_id', user.id)

  if (updateError) {
    return NextResponse.json(
      { error: 'Beitritt fehlgeschlagen. Bitte versuche es erneut.' },
      { status: 500 }
    )
  }

  // 7. Return success
  return NextResponse.json({
    company: {
      id: company.id,
      name: company.name,
      code: company.code,
    },
  })
}
