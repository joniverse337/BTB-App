import { z } from 'zod'

// ── Stroke type (drawing data) ─────────────────────────────

// ── Contact Snapshot (stored as JSON in contacts_json) ─────

const contactSnapshotSchema = z.object({
  id: z.string().uuid(),
  funktion: z.string().max(200).nullable(),
  name: z.string().min(1).max(200),
  phone: z.string().max(50).nullable(),
})

const contactsJsonSchema = z.string()
  .max(10000)
  .nullable()
  .optional()
  .refine(
    (val) => {
      if (!val) return true
      try {
        const parsed = JSON.parse(val)
        return z.array(contactSnapshotSchema).max(20).safeParse(parsed).success
      } catch { return false }
    },
    'Ungueltige Kontaktdaten'
  )

// ── Stroke type (drawing data) ─────────────────────────────

export const strokeSchema = z.object({
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/, 'Ungueltige Farbe'),
  width: z.number().int().min(1).max(50),
  points: z.array(z.object({
    x: z.number().finite(),
    y: z.number().finite(),
  })).min(1).max(3000),
})

export type Stroke = z.infer<typeof strokeSchema>

// ── Row type (matches DB schema) ────────────────────────────

export interface StorageLocation {
  id: string
  project_id: string
  name: string
  address: string | null
  address_street: string | null
  address_number: string | null
  address_zip: string | null
  address_city: string | null
  description: string | null
  screenshot_url: string | null
  drawing_data: Stroke[] | null
  map_zoom: number | null
  map_center_lat: number | null
  map_center_lng: number | null
  contacts_json: string | null
  sort_order: number
  created_at: string
  updated_at: string
}

// ── Zod schemas for validation ──────────────────────────────

/** Schema for creating a new storage location */
export const createStorageLocationSchema = z.object({
  project_id: z.string().uuid(),
  name: z.string().min(1, 'Name ist erforderlich').max(500),
  sort_order: z.number().int().default(0),
})

export type CreateStorageLocationInput = z.infer<typeof createStorageLocationSchema>

/** Schema for updating an existing storage location (all fields optional) */
export const updateStorageLocationSchema = z.object({
  name: z.string().min(1).max(500).optional(),
  address: z.string().max(1000).nullable().optional(),
  address_street: z.string().max(200).nullable().optional(),
  address_number: z.string().max(20).nullable().optional(),
  address_zip: z.string().max(20).nullable().optional(),
  address_city: z.string().max(200).nullable().optional(),
  description: z.string().max(5000).nullable().optional(),
  // screenshot_url wird ausschliesslich server-seitig via /api/storage-locations/screenshot gesetzt
  drawing_data: z.array(strokeSchema).max(500).nullable().optional(),
  map_zoom: z.number().int().min(0).max(22).nullable().optional(),
  map_center_lat: z.number().min(-90).max(90).nullable().optional(),
  map_center_lng: z.number().min(-180).max(180).nullable().optional(),
  contacts_json: contactsJsonSchema,
  sort_order: z.number().int().optional(),
})

export type UpdateStorageLocationInput = z.infer<typeof updateStorageLocationSchema>

/** Schema for screenshot upload request body */
export const uploadScreenshotSchema = z.object({
  storage_location_id: z.string().uuid(),
  project_id: z.string().uuid(),
  /** Base64-encoded PNG image data (without data:image/png;base64, prefix) */
  image_base64: z.string().min(1, 'Screenshot-Daten fehlen').max(15_000_000, 'Screenshot zu gross'),
})

export type UploadScreenshotInput = z.infer<typeof uploadScreenshotSchema>
