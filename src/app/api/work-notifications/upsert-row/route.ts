import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createAuthenticatedRoute, parseJsonBody } from '@/lib/api-utils'
import { isMutationRateLimited } from '@/lib/rate-limit'
import { validateCsrfToken } from '@/lib/csrf'
import { upsertWorkNotificationSchema } from '@/lib/validations/work-notification'

const requestSchema = z.object({
  row: upsertWorkNotificationSchema,
})

type UpsertRowBody = z.infer<typeof requestSchema>

/**
 * POST /api/work-notifications/upsert-row
 *
 * Speichert eine einzelne Arbeitsanmeldungs-Zeile (upsert).
 * Ersetzt direkten Supabase-Client-Aufruf — CSRF + Rate-Limiting + Server-Auth.
 */
export const POST = createAuthenticatedRoute(async (request, { user, supabase }) => {
  const csrfError = validateCsrfToken(request)
  if (csrfError) return csrfError

  if (await isMutationRateLimited(user.id)) {
    return NextResponse.json({ error: 'Zu viele Anfragen. Bitte kurz warten.' }, { status: 429 })
  }

  const parsed = await parseJsonBody<UpsertRowBody>(request, requestSchema)
  if (parsed instanceof NextResponse) return parsed

  const { row } = parsed
  const { id, ...rowData } = row
  const upsertData = id ? { id, ...rowData } : rowData

  const { error } = await supabase
    .from('work_notifications')
    .upsert(upsertData, { onConflict: 'project_id,year,calendar_week,weekday_nr' })

  if (error) {
    return NextResponse.json({ error: 'Speichern fehlgeschlagen.' }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
})
