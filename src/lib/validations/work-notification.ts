import { z } from 'zod'

export const upsertWorkNotificationSchema = z.object({
  id:                   z.string().uuid().optional(),
  project_id:           z.string().uuid(),
  calendar_week:        z.number().int().min(1).max(53),
  year:                 z.number().int().min(2000).max(2100),
  weekday_nr:           z.number().int().min(1).max(7),
  weekday_name:         z.string().max(20),
  date:                 z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  day_start:            z.string().regex(/^\d{2}:\d{2}$/).nullable(),
  day_end:              z.string().regex(/^\d{2}:\d{2}$/).nullable(),
  night_start:          z.string().regex(/^\d{2}:\d{2}$/).nullable(),
  night_end:            z.string().regex(/^\d{2}:\d{2}$/).nullable(),
  location:             z.string().max(500).nullable(),
  bauspitzen:           z.string().max(10).nullable(),
  workers:              z.string().max(10).nullable(),
  machines:             z.string().max(5000).nullable(),
  work_description:     z.string().max(10000).nullable(),
  site_manager:         z.string().max(200).nullable(),
  safety_plan_enabled:  z.boolean(),
  safety_plan_number:   z.string().max(100).nullable(),
  track_work_enabled:   z.boolean(),
  betra_number:         z.string().max(100).nullable(),
  contacts_json:        z.string().max(50000).nullable(),
})

export type UpsertWorkNotificationInput = z.infer<typeof upsertWorkNotificationSchema>

export interface WorkNotificationRow {
  id?: string
  project_id: string
  calendar_week: number
  year: number
  weekday_nr: number
  weekday_name: string
  date: string
  day_start: string | null
  day_end: string | null
  night_start: string | null
  night_end: string | null
  location: string | null
  bauspitzen: string | null
  workers: string | null
  machines: string | null
  work_description: string | null
  site_manager: string | null
  safety_plan_enabled: boolean
  safety_plan_number: string | null
  track_work_enabled: boolean
  betra_number: string | null
  contacts_json: string | null
}
