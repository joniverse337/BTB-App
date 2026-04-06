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
}
