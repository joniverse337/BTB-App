import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createAuthenticatedRoute, parseJsonBody } from '@/lib/api-utils'
import { isMutationRateLimited } from '@/lib/rate-limit'
import { validateCsrfToken } from '@/lib/csrf'
import { updateShiftSchema } from '@/lib/validations/shift-update'

const requestSchema = z.object({
  id:                  z.string().uuid(),
  fields:              updateShiftSchema,
  // Optionaler std-Sync bei beg/end/pau-Änderung — alles in einem DB-Roundtrip
  syncStdWorkerIds:    z.array(z.string().uuid()).optional(),
  syncStdEquipmentIds: z.array(z.string().uuid()).optional(),
  syncStdValue:        z.number().min(0).max(24).optional(),
})

type UpdateShiftBody = z.infer<typeof requestSchema>

/**
 * POST /api/shifts/update-field
 *
 * Speichert Shift-Feldänderungen server-seitig — Citrix-Kompatibilität (PATCH geblockt).
 * Optionaler std-Sync für shift_workers und shift_equipment in einem einzigen Request.
 */
export const POST = createAuthenticatedRoute(async (request, { user, supabase }) => {
  const csrfError = validateCsrfToken(request)
  if (csrfError) return csrfError

  if (await isMutationRateLimited(user.id)) {
    return NextResponse.json({ error: 'Zu viele Anfragen. Bitte kurz warten.' }, { status: 429 })
  }

  const parsed = await parseJsonBody<UpdateShiftBody>(request, requestSchema)
  if (parsed instanceof NextResponse) return parsed

  const { id, fields, syncStdWorkerIds, syncStdEquipmentIds, syncStdValue } = parsed

  const { error } = await supabase
    .from('shifts')
    .update(fields)
    .eq('id', id)

  if (error) {
    return NextResponse.json({ error: 'Speichern fehlgeschlagen.' }, { status: 500 })
  }

  if (syncStdValue !== undefined && syncStdValue > 0) {
    if (syncStdWorkerIds && syncStdWorkerIds.length > 0) {
      await supabase.from('shift_workers').update({ std: syncStdValue }).in('id', syncStdWorkerIds)
    }
    if (syncStdEquipmentIds && syncStdEquipmentIds.length > 0) {
      await supabase.from('shift_equipment').update({ std: syncStdValue }).in('id', syncStdEquipmentIds)
    }
  }

  return NextResponse.json({ ok: true })
})
