import { createClient } from '@/lib/supabase'
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
    console.error('fetchEquipmentItems error:', error.message)
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
    console.error('createEquipmentItem validation error:', parsed.error.flatten())
    return null
  }

  const supabase = createClient()
  const { data, error } = await supabase
    .from('equipment_items')
    .insert(parsed.data)
    .select()
    .single()

  if (error) {
    console.error('createEquipmentItem error:', error.message)
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
    console.error('updateEquipmentItem validation error:', parsed.error.flatten())
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
    console.error('updateEquipmentItem error:', error.message)
    return null
  }

  return data as EquipmentItem
}

// ── Status Change ───────────────────────────────────────────

/**
 * Change equipment item status with transition validation.
 * Validates that the transition is allowed (bedarf→baustelle, baustelle→frei, etc.)
 * Sets status_ts to current Unix timestamp and assigns sort_order for target column.
 */
export async function changeEquipmentStatus(
  id: string,
  currentStatus: EquipmentStatus,
  targetStatus: EquipmentStatus
): Promise<EquipmentItem | null> {
  if (!isValidTransition(currentStatus, targetStatus)) {
    console.error(`Invalid status transition: ${currentStatus} → ${targetStatus}`)
    return null
  }

  const supabase = createClient()

  // Get the max sort_order in the target status group for this project
  const { data: existing } = await supabase
    .from('equipment_items')
    .select('project_id')
    .eq('id', id)
    .single()

  if (!existing) {
    console.error('changeEquipmentStatus: item not found')
    return null
  }

  const { data: maxOrderData } = await supabase
    .from('equipment_items')
    .select('sort_order')
    .eq('project_id', existing.project_id)
    .eq('status', targetStatus)
    .order('sort_order', { ascending: false })
    .limit(1)
    .single()

  // Place at end of target column (max + 1)
  const nextSortOrder = (maxOrderData?.sort_order ?? -1) + 1

  const { data, error } = await supabase
    .from('equipment_items')
    .update({
      status: targetStatus,
      status_ts: Math.floor(Date.now() / 1000),
      sort_order: nextSortOrder,
    })
    .eq('id', id)
    .select()
    .single()

  if (error) {
    console.error('changeEquipmentStatus error:', error.message)
    return null
  }

  return data as EquipmentItem
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
    console.error('deleteEquipmentItem error:', error.message)
    return false
  }

  return true
}
