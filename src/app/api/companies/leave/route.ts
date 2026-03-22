import { NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { createServiceClient } from '@/lib/supabase'

export async function POST() {
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

  // 2. Check if user has a company
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

  if (!profile.company_id) {
    return NextResponse.json(
      { error: 'Du bist mit keiner Firma verbunden.' },
      { status: 400 }
    )
  }

  // 3. Set company_id to NULL
  const { error: updateError } = await serviceClient
    .from('profiles')
    .update({ company_id: null })
    .eq('user_id', user.id)

  if (updateError) {
    return NextResponse.json(
      { error: 'Firma konnte nicht verlassen werden. Bitte versuche es erneut.' },
      { status: 500 }
    )
  }

  // 4. Return success
  return NextResponse.json({ success: true })
}
