import { NextResponse } from 'next/server'
import { createAuthenticatedRoute, parseJsonBody } from '@/lib/api-utils'
import { createCompanySchema, type CreateCompanyData } from '@/lib/validations/company'
import { isMutationRateLimited } from '@/lib/rate-limit'
import { validateCsrfToken } from '@/lib/csrf'

function generateCompanyCode(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
  const bytes = crypto.getRandomValues(new Uint8Array(6))
  let code = 'BTB-'
  for (const byte of bytes) {
    code += chars[byte % chars.length]
  }
  return code
}

export const POST = createAuthenticatedRoute(async (request, { user, serviceClient }) => {
  // CSRF protection
  const csrfError = validateCsrfToken(request)
  if (csrfError) return csrfError

  if (await isMutationRateLimited(user.id)) {
    return NextResponse.json(
      { error: 'Zu viele Anfragen. Bitte kurz warten.' },
      { status: 429 }
    )
  }

  // 1. Parse and validate request body
  const parsed = await parseJsonBody<CreateCompanyData>(request, createCompanySchema)
  if (parsed instanceof NextResponse) return parsed

  const { name, adr } = parsed

  // 2. Check if user already has a company
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

  // 3. Generate code and insert company (retry once on collision)
  let company = null
  let attempts = 0
  const maxAttempts = 2

  while (!company && attempts < maxAttempts) {
    attempts++
    const code = generateCompanyCode()

    const { data, error: insertError } = await serviceClient
      .from('companies')
      .insert({ name, adr: adr || null, code, is_active: true })
      .select('id, name, code')
      .single()

    if (insertError) {
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

  // 4. Link user to company
  const { error: updateError } = await serviceClient
    .from('profiles')
    .update({ company_id: company.id })
    .eq('user_id', user.id)

  if (updateError) {
    // Attempt to clean up the created company
    await serviceClient.from('companies').delete().eq('id', company.id)
    return NextResponse.json(
      { error: 'Firma konnte nicht verknüpft werden. Bitte versuche es erneut.' },
      { status: 500 }
    )
  }

  // 5. Return success
  return NextResponse.json({
    company: {
      id: company.id,
      name: company.name,
      code: company.code,
    },
  })
})
