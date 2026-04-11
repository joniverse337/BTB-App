import { z } from 'zod'

// ── Status ──────────────────────────────────────────────────

export const EQUIPMENT_STATUSES = ['bedarf', 'baustelle', 'frei'] as const
export type EquipmentStatus = (typeof EQUIPMENT_STATUSES)[number]

// ── Row type (matches DB schema) ────────────────────────────

export interface EquipmentItem {
  id: string
  project_id: string
  name: string | null
  nummer: string | null
  lieferadresse: string | null
  lieferdatum: string | null        // ISO date string (YYYY-MM-DD)
  anmerkungen: string | null
  status: EquipmentStatus
  status_ts: number | null           // Unix timestamp
  sort_order: number
  created_at: string
  updated_at: string
}

// ── Zod schemas for client-side validation ──────────────────

/** Schema for creating a new equipment item */
export const createEquipmentSchema = z.object({
  project_id: z.string().uuid(),
  name: z.string().max(500).nullable().optional(),
  nummer: z.string().max(200).nullable().optional(),
  lieferadresse: z.string().max(1000).nullable().optional(),
  lieferdatum: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Ungültiges Datumsformat').nullable().optional(),
  anmerkungen: z.string().max(2000).nullable().optional(),
  status: z.enum(EQUIPMENT_STATUSES).default('bedarf'),
  sort_order: z.number().int().default(0),
})

export type CreateEquipmentInput = z.infer<typeof createEquipmentSchema>

/** Schema for updating an existing equipment item (all fields optional) */
export const updateEquipmentSchema = z.object({
  name: z.string().max(500).nullable().optional(),
  nummer: z.string().max(200).nullable().optional(),
  lieferadresse: z.string().max(1000).nullable().optional(),
  lieferdatum: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Ungültiges Datumsformat').nullable().optional(),
  anmerkungen: z.string().max(2000).nullable().optional(),
})

export type UpdateEquipmentInput = z.infer<typeof updateEquipmentSchema>

/** Schema for status change — validates target status and sets timestamp */
export const changeStatusSchema = z.object({
  status: z.enum(EQUIPMENT_STATUSES),
  status_ts: z.number().int(),
  sort_order: z.number().int(),
})

export type ChangeStatusInput = z.infer<typeof changeStatusSchema>

// ── Status transition rules ─────────────────────────────────

/** Valid status transitions (from → to[]) */
export const VALID_TRANSITIONS: Record<EquipmentStatus, EquipmentStatus[]> = {
  bedarf: ['baustelle'],
  baustelle: ['bedarf', 'frei'],
  frei: ['baustelle'],
}

/** Check if a status transition is valid */
export function isValidTransition(from: EquipmentStatus, to: EquipmentStatus): boolean {
  return VALID_TRANSITIONS[from]?.includes(to) ?? false
}

// ── Display labels ──────────────────────────────────────────

export const STATUS_LABELS: Record<EquipmentStatus, string> = {
  bedarf: 'BEDARF',
  baustelle: 'AUF DER BAUSTELLE',
  frei: 'FREIGEMELDET',
}
