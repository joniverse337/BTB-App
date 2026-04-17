import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createAuthenticatedRoute, parseJsonBody } from '@/lib/api-utils'
import { EQUIPMENT_STATUSES, isValidTransition } from '@/lib/validations/equipment'

const statusChangeSchema = z.object({
  id: z.string().uuid(),
  from: z.enum(EQUIPMENT_STATUSES),
  to: z.enum(EQUIPMENT_STATUSES),
  sort_order: z.number().int(),
})

type StatusChangeBody = z.infer<typeof statusChangeSchema>

/**
 * POST /api/equipment/status-change
 *
 * Führt den Statuswechsel server-seitig durch — notwendig für Citrix-Umgebungen,
 * wo PATCH-Requests durch den Proxy geblockt werden (nur GET/POST erlaubt).
 * Der Browser sendet POST, der Server macht den Supabase-PATCH direkt.
 */
export const POST = createAuthenticatedRoute(async (request, { serviceClient }) => {
  const parsed = await parseJsonBody<StatusChangeBody>(request, statusChangeSchema)
  if (parsed instanceof NextResponse) return parsed

  const { id, from, to, sort_order } = parsed

  if (!isValidTransition(from, to)) {
    return NextResponse.json(
      { error: `Ungültiger Übergang: ${from} → ${to}` },
      { status: 400 }
    )
  }

  const { data, error } = await serviceClient
    .from('equipment_items')
    .update({
      status: to,
      status_ts: Math.floor(Date.now() / 1000),
      sort_order,
    })
    .eq('id', id)
    .select('id')

  if (error) {
    return NextResponse.json(
      { error: `DB-Fehler: ${error.message} (Code: ${error.code})` },
      { status: 500 }
    )
  }

  if (!data || data.length === 0) {
    return NextResponse.json(
      { error: 'Keine Zeile aktualisiert — fehlende Berechtigung oder ungültige ID' },
      { status: 403 }
    )
  }

  return NextResponse.json({ ok: true })
})
