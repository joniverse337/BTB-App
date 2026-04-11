import { NextResponse } from 'next/server'
import { createAuthenticatedRoute, parseJsonBody } from '@/lib/api-utils'
import { isMutationRateLimited } from '@/lib/rate-limit'
import { z } from 'zod'

// Erlaubt nur exakt: https://[project].supabase.co/storage/v1/object/public/company-logos/[uuid]/logo.(png|jpg|jpeg)
// Kein Trailing-Content nach der Dateiendung → verhindert Injection-Payloads
const COMPANY_LOGO_URL_PATTERN = /^https:\/\/[a-z0-9-]+\.supabase\.co\/storage\/v1\/object\/public\/company-logos\/[0-9a-f-]+\/logo\.(png|jpe?g)$/i

const updateCompanySchema = z.object({
  name: z.string().min(1, 'Firmenname darf nicht leer sein.').max(200).optional(),
  adr: z.string().max(500).nullable().optional(),
  logo_url: z.string().url().refine(
    (url) => COMPANY_LOGO_URL_PATTERN.test(url),
    { message: 'Logo-URL muss eine gültige Supabase-Storage-URL sein.' }
  ).nullable().optional(),
  logo_x: z.number().min(0).max(1).optional(),
  logo_y: z.number().min(0).max(1).optional(),
})

type UpdateCompanyData = z.infer<typeof updateCompanySchema>

export const POST = createAuthenticatedRoute(async (request, { user, serviceClient }) => {
  if (await isMutationRateLimited(user.id)) {
    return NextResponse.json(
      { error: 'Zu viele Anfragen. Bitte kurz warten.' },
      { status: 429 }
    )
  }

  // 1. Parse and validate request body
  const parsed = await parseJsonBody<UpdateCompanyData>(request, updateCompanySchema)
  if (parsed instanceof NextResponse) return parsed

  // 2. Get user's company_id
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

  // 3. Update company
  const { error: updateError } = await serviceClient
    .from('companies')
    .update(parsed)
    .eq('id', profile.company_id)

  if (updateError) {
    return NextResponse.json(
      { error: 'Firmendaten konnten nicht gespeichert werden.' },
      { status: 500 }
    )
  }

  return NextResponse.json({ success: true })
})
