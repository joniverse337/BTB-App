import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createAuthenticatedRoute, parseJsonBody } from '@/lib/api-utils'
import { isMutationRateLimited } from '@/lib/rate-limit'
import { validateCsrfToken } from '@/lib/csrf'
import { EQUIPMENT_STATUSES, isValidTransition } from '@/lib/validations/equipment'

const statusChangeSchema = z.object({
  id: z.string().uuid(),
  to: z.enum(EQUIPMENT_STATUSES),
  sort_order: z.number().int().min(0).max(1_000_000),
  lieferdatum: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
})

type StatusChangeBody = z.infer<typeof statusChangeSchema>

/**
 * POST /api/equipment/status-change
 *
 * Führt den Statuswechsel server-seitig durch — notwendig für Citrix-Umgebungen,
 * wo PATCH-Requests durch den Proxy geblockt werden (nur GET/POST erlaubt).
 *
 * Sicherheit: Verwendet den RLS-enforced supabase-Client (User-Session).
 * RLS stellt sicher, dass nur Geräte der eigenen Firma bearbeitet werden können.
 * Der aktuelle Status wird aus der DB gelesen (nicht vom Client übernommen),
 * um Transition-Bypässe zu verhindern.
 */
export const POST = createAuthenticatedRoute(async (request, { user, supabase }) => {
  const csrfError = validateCsrfToken(request)
  if (csrfError) return csrfError

  if (await isMutationRateLimited(user.id)) {
    return NextResponse.json({ error: 'Zu viele Anfragen. Bitte kurz warten.' }, { status: 429 })
  }

  const parsed = await parseJsonBody<StatusChangeBody>(request, statusChangeSchema)
  if (parsed instanceof NextResponse) return parsed

  const { id, to, sort_order, lieferdatum } = parsed

  // Aktuellen Status aus DB lesen — verhindert, dass der Client einen falschen
  // "from"-Wert sendet, um ungültige Transitionen zu erzwingen (TOCTOU-Schutz).
  // RLS stellt gleichzeitig sicher, dass nur Geräte der eigenen Firma gelesen werden.
  const { data: current, error: fetchError } = await supabase
    .from('equipment_items')
    .select('status')
    .eq('id', id)
    .maybeSingle()

  if (fetchError || !current) {
    return NextResponse.json(
      { error: 'Gerät nicht gefunden oder keine Berechtigung.' },
      { status: 404 }
    )
  }

  if (!isValidTransition(current.status, to)) {
    return NextResponse.json(
      { error: `Ungültiger Statuswechsel.` },
      { status: 400 }
    )
  }

  const { data, error } = await supabase
    .from('equipment_items')
    .update({
      status: to,
      status_ts: Math.floor(Date.now() / 1000),
      sort_order,
      ...(lieferdatum !== undefined && { lieferdatum }),
    })
    .eq('id', id)
    .select('id')
    .maybeSingle()

  if (error || !data) {
    return NextResponse.json(
      { error: 'Statuswechsel fehlgeschlagen.' },
      { status: 500 }
    )
  }

  return NextResponse.json({ ok: true })
})
