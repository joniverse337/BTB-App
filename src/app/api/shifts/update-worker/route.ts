import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createAuthenticatedRoute, parseJsonBody } from '@/lib/api-utils'
import { isMutationRateLimited } from '@/lib/rate-limit'
import { validateCsrfToken } from '@/lib/csrf'
import { updateShiftWorkerSchema } from '@/lib/validations/shift-update'

const requestSchema = z.object({
  id:     z.string().uuid(),
  fields: updateShiftWorkerSchema,
})

type UpdateWorkerBody = z.infer<typeof requestSchema>

/**
 * POST /api/shifts/update-worker
 *
 * Speichert shift_worker-Feldänderungen — Citrix-Kompatibilität (PATCH geblockt).
 */
export const POST = createAuthenticatedRoute(async (request, { user, supabase }) => {
  const csrfError = validateCsrfToken(request)
  if (csrfError) return csrfError

  if (await isMutationRateLimited(user.id)) {
    return NextResponse.json({ error: 'Zu viele Anfragen. Bitte kurz warten.' }, { status: 429 })
  }

  const parsed = await parseJsonBody<UpdateWorkerBody>(request, requestSchema)
  if (parsed instanceof NextResponse) return parsed

  const { id, fields } = parsed

  const { error } = await supabase
    .from('shift_workers')
    .update(fields)
    .eq('id', id)

  if (error) {
    return NextResponse.json({ error: 'Speichern fehlgeschlagen.' }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
})
