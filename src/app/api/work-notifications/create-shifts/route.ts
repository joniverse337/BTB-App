import { NextResponse } from 'next/server'
import { createAuthenticatedRoute, parseJsonBody } from '@/lib/api-utils'
import { z } from 'zod'

const requestSchema = z.object({
  project_id: z.string().uuid(),
  year: z.number().int().min(2000).max(2100),
  calendar_week: z.number().int().min(1).max(53),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  typ: z.enum(['tag', 'nacht']).optional(),
})

type CreateShiftsData = z.infer<typeof requestSchema>

export const POST = createAuthenticatedRoute(async (request, { user, supabase, serviceClient }) => {
  // 1. Validate input
  const parsed = await parseJsonBody<CreateShiftsData>(request, requestSchema)
  if (parsed instanceof NextResponse) return parsed

  const { project_id, year, calendar_week, date: filterDate, typ: filterTyp } = parsed

  // 2. Verify project ownership: user must own the project or be in the same company
  const { data: project, error: projectError } = await serviceClient
    .from('projects')
    .select('id, company_id, created_by')
    .eq('id', project_id)
    .single()

  if (projectError || !project) {
    return NextResponse.json(
      { error: 'Projekt nicht gefunden.' },
      { status: 404 }
    )
  }

  // Check if user owns the project directly
  let hasAccess = project.created_by === user.id

  // Or check if user belongs to the same company
  if (!hasAccess && project.company_id) {
    const { data: profile } = await serviceClient
      .from('profiles')
      .select('company_id')
      .eq('user_id', user.id)
      .single()

    hasAccess = !!profile?.company_id && profile.company_id === project.company_id
  }

  if (!hasAccess) {
    return NextResponse.json(
      { error: 'Zugriff verweigert.' },
      { status: 403 }
    )
  }

  // 3. Fetch work notification rows for this KW
  let query = supabase
    .from('work_notifications')
    .select('*')
    .eq('project_id', project_id)
    .eq('year', year)
    .eq('calendar_week', calendar_week)
    .order('weekday_nr', { ascending: true })

  if (filterDate) query = query.eq('date', filterDate)

  const { data: aaRows, error: aaError } = await query

  if (aaError) {
    return NextResponse.json(
      { error: 'Fehler beim Laden der Arbeitsanmeldung.' },
      { status: 500 }
    )
  }

  if (!aaRows || aaRows.length === 0) {
    return NextResponse.json(
      { error: `Keine Arbeitsanmeldung für KW ${calendar_week} vorhanden.` },
      { status: 404 }
    )
  }

  // 4. Fetch existing shifts for this KW to avoid duplicates
  const aaDates = aaRows.map((r: { date: string }) => r.date)
  const { data: existingShifts } = await supabase
    .from('shifts')
    .select('datum, typ')
    .eq('project_id', project_id)
    .in('datum', aaDates)

  const existingSet = new Set(
    (existingShifts ?? []).map((s: { datum: string; typ: string }) => `${s.datum}:${s.typ}`)
  )

  // 5. Create shifts from AA rows
  let created = 0
  let skipped = 0

  // Parse machines field: supports JSON array [{name, anz}] or legacy plain text
  function parseMachineEntries(raw: string | null): { typ: string; anz: number }[] {
    if (!raw || !raw.trim()) return []
    try {
      const parsed = JSON.parse(raw)
      if (Array.isArray(parsed)) {
        return parsed
          .filter((e) => e.name && e.name.trim())
          .map((e) => ({ typ: String(e.name).trim(), anz: Number(e.anz) || 1 }))
      }
    } catch {}
    return [{ typ: raw.trim(), anz: 1 }]
  }

  async function insertEquipment(shiftId: string, machines: string | null) {
    const entries = parseMachineEntries(machines)
    if (entries.length === 0) return
    const { error } = await supabase.from('shift_equipment').insert(
      entries.map((e) => ({ shift_id: shiftId, typ: e.typ, anz: e.anz, std: 0 }))
    )
    if (error) {
      // Non-critical: shift was created, equipment insert failed silently
    }
  }

  for (const row of aaRows) {
    const datum = row.date

    // Tagschicht
    if (row.day_start && (!filterTyp || filterTyp === 'tag')) {
      const key = `${datum}:tag`
      if (existingSet.has(key)) {
        skipped++
      } else {
        const { data: newShift, error: insertError } = await supabase
          .from('shifts')
          .insert({
            project_id,
            datum,
            typ: 'tag',
            beg: row.day_start,
            end: row.day_end || null,
            pau: 30,
            gl: row.location || null,
            arb: row.work_description || null,
          })
          .select('id')
          .single()

        if (!insertError && newShift) {
          created++
          existingSet.add(key)
          await insertEquipment(newShift.id, row.machines)
        }
      }
    }

    // Nachtschicht
    if (row.night_start && (!filterTyp || filterTyp === 'nacht')) {
      const key = `${datum}:nacht`
      if (existingSet.has(key)) {
        skipped++
      } else {
        const { data: newShift, error: insertError } = await supabase
          .from('shifts')
          .insert({
            project_id,
            datum,
            typ: 'nacht',
            beg: row.night_start,
            end: row.night_end || null,
            pau: 30,
            gl: row.location || null,
            arb: row.work_description || null,
          })
          .select('id')
          .single()

        if (!insertError && newShift) {
          created++
          existingSet.add(key)
          await insertEquipment(newShift.id, row.machines)
        }
      }
    }
  }

  return NextResponse.json({ created, skipped })
})
