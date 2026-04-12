import { NextResponse } from 'next/server'
import { createAuthenticatedRoute } from '@/lib/api-utils'
import { validateCsrfToken } from '@/lib/csrf'

export const POST = createAuthenticatedRoute(async (_request, { user, serviceClient }) => {
  // CSRF protection
  const csrfError = validateCsrfToken(_request)
  if (csrfError) return csrfError

  // 1. Check if user has a company
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

  // 2. Set company_id to NULL
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

  // 3. Return success
  return NextResponse.json({ success: true })
})
