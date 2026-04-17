import { createClient } from '@/lib/supabase'
import { logger } from '@/lib/logger'
import type {
  EquipmentItem,
  EquipmentStatus,
  CreateEquipmentInput,
  UpdateEquipmentInput,
} from '@/lib/validations/equipment'
import {
  createEquipmentSchema,
  updateEquipmentSchema,
  isValidTransition,
} from '@/lib/validations/equipment'

// ── Fetch ───────────────────────────────────────────────────

/**
 * Fetch all equipment items for a project, ordered by status group and sort_order.
 * RLS ensures only items from user's company are returned.
 */
export async function fetchEquipmentItems(projectId: string): Promise<EquipmentItem[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('equipment_items')
    .select('*')
    .eq('project_id', projectId)
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: true })
    .limit(500)

  if (error) {
    logger.error('equipment.fetch', 'Geraete konnten nicht geladen werden')
    return []
  }

  return (data ?? []) as EquipmentItem[]
}

// ── Create ──────────────────────────────────────────────────

/**
 * Create a new equipment item. Validates input with Zod before inserting.
 * Returns the created item or null on failure.
 */
export async function createEquipmentItem(
  input: CreateEquipmentInput
): Promise<EquipmentItem | null> {
  const parsed = createEquipmentSchema.safeParse(input)
  if (!parsed.success) {
    logger.warn('equipment.create', 'Validierung fehlgeschlagen')
    return null
  }

  const supabase = createClient()
  const { data, error } = await supabase
    .from('equipment_items')
    .insert(parsed.data)
    .select()
    .single()

  if (error) {
    logger.error('equipment.create', 'Geraet konnte nicht erstellt werden')
    return null
  }

  return data as EquipmentItem
}

// ── Update ──────────────────────────────────────────────────

/**
 * Update an existing equipment item. Validates input with Zod.
 * Returns the updated item or null on failure.
 */
export async function updateEquipmentItem(
  id: string,
  input: UpdateEquipmentInput
): Promise<EquipmentItem | null> {
  const parsed = updateEquipmentSchema.safeParse(input)
  if (!parsed.success) {
    logger.warn('equipment.update', 'Validierung fehlgeschlagen')
    return null
  }

  const supabase = createClient()
  const { data, error } = await supabase
    .from('equipment_items')
    .update(parsed.data)
    .eq('id', id)
    .select()
    .single()

  if (error) {
    logger.error('equipment.update', 'Geraet konnte nicht aktualisiert werden')
    return null
  }

  return data as EquipmentItem
}

// ── Status Change ───────────────────────────────────────────

/**
 * Change equipment item status with transition validation.
 * Caller must supply projectId and nextSortOrder (computed from cached data)
 * so that only a single DB round-trip is needed — important for Citrix environments
 * where sequential async calls time out silently.
 */
export async function changeEquipmentStatus(
  id: string,
  currentStatus: EquipmentStatus,
  targetStatus: EquipmentStatus,
  nextSortOrder: number
): Promise<{ ok: true } | { ok: false; reason: string }> {
  if (!isValidTransition(currentStatus, targetStatus)) {
    logger.warn('equipment.statusChange', 'Ungueltiger Status-Uebergang')
    return { ok: false, reason: `Ungültiger Übergang: ${currentStatus} → ${targetStatus}` }
  }

  // Statuswechsel läuft über eine API-Route (POST) statt direktem Supabase-PATCH.
  // In Citrix-Umgebungen werden PATCH-Requests durch den Proxy geblockt,
  // POST-Requests funktionieren jedoch zuverlässig.
  try {
    const res = await fetch('/api/equipment/status-change', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id,
        from: currentStatus,
        to: targetStatus,
        sort_order: nextSortOrder,
      }),
    })

    if (!res.ok) {
      const body = await res.json().catch(() => ({ error: `HTTP ${res.status}` }))
      logger.error('equipment.statusChange', 'Status konnte nicht geaendert werden')
      return { ok: false, reason: body.error ?? `HTTP ${res.status}` }
    }

    return { ok: true }
  } catch (err) {
    logger.error('equipment.statusChange', 'Netzwerkfehler beim Statuswechsel')
    return { ok: false, reason: `Netzwerkfehler: ${err instanceof Error ? err.message : String(err)}` }
  }
}

// ── Delete ──────────────────────────────────────────────────

/**
 * Delete an equipment item by ID.
 * RLS ensures only items from user's company can be deleted.
 * Returns true on success, false on failure.
 */
export async function deleteEquipmentItem(id: string): Promise<boolean> {
  const supabase = createClient()
  const { error } = await supabase
    .from('equipment_items')
    .delete()
    .eq('id', id)

  if (error) {
    logger.error('equipment.delete', 'Geraet konnte nicht geloescht werden')
    return false
  }

  return true
}
