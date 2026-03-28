import { NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { createServiceClient } from '@/lib/supabase'
import { createCompanySchema } from '@/lib/validations/company'

function generateCompanyCode(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
  const bytes = crypto.getRandomValues(new Uint8Array(6))
  let code = 'BTB-'
  for (const byte of bytes) {
    code += chars[byte % chars.length]
  }
  return code
}

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

  // 2. Parse and validate request body
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json(
      { error: 'Ungültige Anfrage.' },
      { status: 400 }
    )
  }

  const parsed = createCompanySchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? 'Ungültige Eingabe.' },
      { status: 400 }
    )
  }

  const { name, adr } = parsed.data

  // 3. Check if user already has a company
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

  // 4. Generate code and insert company (retry once on collision)
  let company = null
  let attempts = 0
  const maxAttempts = 2

  while (!company && attempts < maxAttempts) {
    attempts++
    const code = generateCompanyCode()

    const { data, error: insertError } = await serviceClient
      .from('companies')
      .insert({ name, adr: adr || null, code })
      .select('id, name, code')
      .single()

    if (insertError) {
      console.error('[companies/create] Insert error:', insertError)
      // Check for unique constraint violation on code
      if (insertError.code === '23505' && attempts < maxAttempts) {
        continue // Retry with new code
      }
      return NextResponse.json(
        { error: 'Firma konnte nicht erstellt werden.' },
        { status: 500 }
      )
    }

    company = data
  }

  if (!company) {
    return NextResponse.json(
      { error: 'Firma konnte nicht erstellt werden.' },
      { status: 500 }
    )
  }

  // 5. Link user to company
  const { error: updateError } = await serviceClient
    .from('profiles')
    .update({ company_id: company.id })
    .eq('user_id', user.id)

  if (updateError) {
    console.error('[companies/create] Profile update error:', updateError)
    // Attempt to clean up the created company
    await serviceClient.from('companies').delete().eq('id', company.id)
    return NextResponse.json(
      { error: 'Firma konnte nicht verknüpft werden. Bitte versuche es erneut.' },
      { status: 500 }
    )
  }

  // 6. Return success
  return NextResponse.json({
    company: {
      id: company.id,
      name: company.name,
      code: company.code,
    },
  })
}
