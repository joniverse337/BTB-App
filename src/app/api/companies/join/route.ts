import { NextResponse } from 'next/server'
import { createAuthenticatedRoute, parseJsonBody } from '@/lib/api-utils'
import { joinCompanySchema, type JoinCompanyData } from '@/lib/validations/company'
import { isJoinRateLimited } from '@/lib/rate-limit'
import { validateCsrfToken } from '@/lib/csrf'

// Generic error message to prevent enumeration attacks
const INVALID_CODE_ERROR = 'Dieser Code ist nicht gültig.'

export const POST = createAuthenticatedRoute(async (request, { user, serviceClient }) => {
  const csrfError = validateCsrfToken(request)
  if (csrfError) return csrfError

  // 1. Rate limit check (per userId)
  if (await isJoinRateLimited(user.id)) {
    return NextResponse.json(
      { error: 'Zu viele Versuche. Bitte warte eine Minute.' },
      { status: 429 }
    )
  }

  // 2. Parse and validate request body
  const parsed = await parseJsonBody<JoinCompanyData>(request, joinCompanySchema)
  if (parsed instanceof NextResponse) return parsed

  const { code } = parsed

  // 3. Check if user already has a company
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

  // 4. Look up company by code
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

  // 5. Link user to company
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

  // 6. Return success
  return NextResponse.json({
    company: {
      id: company.id,
      name: company.name,
      code: company.code,
    },
  })
})
