import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createAuthenticatedRoute, parseJsonBody } from '@/lib/api-utils'
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
 */
export const POST = createAuthenticatedRoute(async (request, { serviceClient }) => {
  const parsed = await parseJsonBody<UpdateFieldBody>(request, requestSchema)
  if (parsed instanceof NextResponse) return parsed

  const { id, fields } = parsed

  const { data, error } = await serviceClient
    .from('equipment_items')
    .update(fields)
    .eq('id', id)
    .select('id')
    .single()

  if (error) {
    return NextResponse.json(
      { error: `DB-Fehler: ${error.message} (Code: ${error.code})` },
      { status: 500 }
    )
  }

  if (!data) {
    return NextResponse.json(
      { error: 'Keine Zeile aktualisiert — fehlende Berechtigung oder ungültige ID' },
      { status: 403 }
    )
  }

  return NextResponse.json({ ok: true })
})
