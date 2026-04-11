import { createClient } from '@/lib/supabase'
import type {
  StorageLocation,
  CreateStorageLocationInput,
  UpdateStorageLocationInput,
} from '@/lib/validations/storage-location'
import {
  createStorageLocationSchema,
  updateStorageLocationSchema,
} from '@/lib/validations/storage-location'

// ── Fetch All ──────────────────────────────────────────────

/**
 * Fetch all storage locations for a project, ordered by sort_order then created_at.
 * RLS ensures only locations from user's company are returned.
 */
export async function fetchStorageLocations(projectId: string): Promise<StorageLocation[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('storage_locations')
    .select('*')
    .eq('project_id', projectId)
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: true })
    .limit(100)

  if (error) {
    console.error('fetchStorageLocations error:', error.message)
    return []
  }

  return (data ?? []) as StorageLocation[]
}

// ── Create ─────────────────────────────────────────────────

/**
 * Create a new storage location. Validates input with Zod before inserting.
 * Returns the created location or null on failure.
 */
export async function createStorageLocation(
  input: CreateStorageLocationInput
): Promise<StorageLocation | null> {
  const parsed = createStorageLocationSchema.safeParse(input)
  if (!parsed.success) {
    console.error('createStorageLocation validation error:', parsed.error.flatten())
    return null
  }

  const supabase = createClient()
  const { data, error } = await supabase
    .from('storage_locations')
    .insert(parsed.data)
    .select()
    .single()

  if (error) {
    console.error('createStorageLocation error:', error.message)
    return null
  }

  return data as StorageLocation
}

// ── Update ─────────────────────────────────────────────────

/**
 * Update an existing storage location. Validates input with Zod.
 * Returns the updated location or null on failure.
 */
export async function updateStorageLocation(
  id: string,
  input: UpdateStorageLocationInput
): Promise<StorageLocation | null> {
  const parsed = updateStorageLocationSchema.safeParse(input)
  if (!parsed.success) {
    console.error('updateStorageLocation validation error:', parsed.error.flatten())
    return null
  }

  const supabase = createClient()
  const { data, error } = await supabase
    .from('storage_locations')
    .update(parsed.data)
    .eq('id', id)
    .select()
    .single()

  if (error) {
    console.error('updateStorageLocation error:', error.message)
    return null
  }

  return data as StorageLocation
}

// ── Clear Screenshot ───────────────────────────────────────

/**
 * Clears screenshot_url and drawing_data for a storage location.
 * Separate from updateStorageLocation to keep screenshot_url out of the
 * general update schema (preventing client-side URL injection).
 */
export async function clearLocationScreenshot(id: string): Promise<boolean> {
  const supabase = createClient()
  const { error } = await supabase
    .from('storage_locations')
    .update({ screenshot_url: null, drawing_data: null })
    .eq('id', id)

  if (error) {
    console.error('clearLocationScreenshot error:', error.message)
    return false
  }
  return true
}

// ── Delete ─────────────────────────────────────────────────

/**
 * Delete a storage location by ID.
 * RLS ensures only locations from user's company can be deleted.
 * Also deletes the associated screenshot from Storage if it exists.
 * Returns true on success, false on failure.
 */
export async function deleteStorageLocation(id: string): Promise<boolean> {
  const supabase = createClient()

  // First fetch the location to get the screenshot_url for cleanup
  const { data: location } = await supabase
    .from('storage_locations')
    .select('screenshot_url')
    .eq('id', id)
    .single()

  // Delete the screenshot from Storage if it exists
  if (location?.screenshot_url) {
    try {
      // Extract the path from the public URL
      // URL format: .../storage/v1/object/public/storage-location-screenshots/<path>
      const url = new URL(location.screenshot_url)
      const pathPrefix = '/storage/v1/object/public/storage-location-screenshots/'
      const idx = url.pathname.indexOf(pathPrefix)
      if (idx !== -1) {
        const filePath = url.pathname.slice(idx + pathPrefix.length)
        await supabase.storage
          .from('storage-location-screenshots')
          .remove([decodeURIComponent(filePath)])
      }
    } catch (e) {
      // Screenshot cleanup is best-effort, don't block deletion
      console.error('Screenshot cleanup error:', e)
    }
  }

  // Delete the database row
  const { error } = await supabase
    .from('storage_locations')
    .delete()
    .eq('id', id)

  if (error) {
    console.error('deleteStorageLocation error:', error.message)
    return false
  }

  return true
}

// ── Get Next Sort Order ────────────────────────────────────

/**
 * Get the next sort_order value for a new storage location in a project.
 * Returns the current max sort_order + 1, or 0 if no locations exist.
 */
export async function getNextSortOrder(projectId: string): Promise<number> {
  const supabase = createClient()
  const { data } = await supabase
    .from('storage_locations')
    .select('sort_order')
    .eq('project_id', projectId)
    .order('sort_order', { ascending: false })
    .limit(1)
    .single()

  return (data?.sort_order ?? -1) + 1
}

// ── Get Next Default Name ──────────────────────────────────

/**
 * Generate the next default name for a new storage location.
 * Returns "Lagerplatz N" where N is the next available number.
 */
export async function getNextDefaultName(projectId: string): Promise<string> {
  const supabase = createClient()
  const { data } = await supabase
    .from('storage_locations')
    .select('name')
    .eq('project_id', projectId)
    .limit(100)

  if (!data || data.length === 0) return 'Lagerplatz 1'

  // Find the highest number in existing "Lagerplatz N" names
  let maxNum = 0
  for (const loc of data) {
    const match = loc.name.match(/^Lagerplatz\s+(\d+)$/i)
    if (match) {
      const num = parseInt(match[1], 10)
      if (num > maxNum) maxNum = num
    }
  }

  return `Lagerplatz ${Math.max(maxNum + 1, data.length + 1)}`
}
