import { NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { createServiceClient } from '@/lib/supabase'
import { z } from 'zod'

const updateCompanySchema = z.object({
  name: z.string().min(1, 'Firmenname darf nicht leer sein.').max(200).optional(),
  adr: z.string().max(500).nullable().optional(),
  logo_url: z.string().url().nullable().optional(),
  logo_x: z.number().min(0).max(1).optional(),
  logo_y: z.number().min(0).max(1).optional(),
})

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

  const parsed = updateCompanySchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? 'Ungültige Eingabe.' },
      { status: 400 }
    )
  }

  // 3. Get user's company_id
  const serviceClient = createServiceClient()

  const { data: profile, error: profileError } = await serviceClient
    .from('profiles')
    .select('company_id')
    .eq('user_id', user.id)
    .single()

  if (profileError || !profile?.company_id) {
    return NextResponse.json(
      { error: 'Du bist mit keiner Firma verbunden.' },
      { status: 400 }
    )
  }

  // 4. Update company
  const { error: updateError } = await serviceClient
    .from('companies')
    .update(parsed.data)
    .eq('id', profile.company_id)

  if (updateError) {
    return NextResponse.json(
      { error: 'Firmendaten konnten nicht gespeichert werden.' },
      { status: 500 }
    )
  }

  return NextResponse.json({ success: true })
}
