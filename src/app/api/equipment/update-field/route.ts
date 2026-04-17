import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createAuthenticatedRoute, parseJsonBody } from '@/lib/api-utils'
import { isMutationRateLimited } from '@/lib/rate-limit'
import { validateCsrfToken } from '@/lib/csrf'
import { updateEquipmentSchema } from '@/lib/validations/equipment'

const requestSchema = z.object({
  id: z.string().uuid(),
  fields: updateEquipmentSchema,
})

type UpdateFieldBody = z.infer<typeof requestSchema>

/**
 * POST /api/equipment/update-field
 *
 * Speichert Feldänderungen server-seitig — notwendig für Citrix-Umgebungen,
 * wo PATCH-Requests durch den Proxy geblockt werden.
 *
 * Sicherheit: Verwendet den RLS-enforced supabase-Client (User-Session).
 * RLS stellt sicher, dass nur Geräte der eigenen Firma bearbeitet werden können.
 */
export const POST = createAuthenticatedRoute(async (request, { user, supabase }) => {
  const csrfError = validateCsrfToken(request)
  if (csrfError) return csrfError

  if (await isMutationRateLimited(user.id)) {
    return NextResponse.json({ error: 'Zu viele Anfragen. Bitte kurz warten.' }, { status: 429 })
  }

  const parsed = await parseJsonBody<UpdateFieldBody>(request, requestSchema)
  if (parsed instanceof NextResponse) return parsed

  const { id, fields } = parsed

  const { data, error } = await supabase
    .from('equipment_items')
    .update(fields)
    .eq('id', id)
    .select('id')
    .maybeSingle()

  if (error || !data) {
    return NextResponse.json(
      { error: 'Speichern fehlgeschlagen.' },
      { status: 500 }
    )
  }

  return NextResponse.json({ ok: true })
})
