export interface ProjectSettings {
  project_id: string
  firma: string | null
  adr: string | null
  logo_url: string | null
  logo_x: number
  logo_y: number
  logo_size: number
  aa_logo_x: number | null
  aa_logo_y: number | null
  aa_logo_size: number | null
}

export interface ProjectCategory {
  id: string
  project_id: string
  typ: 'personal' | 'equipment'
  label: string
  sort_order: number
}

export const DEFAULT_PROJECT_SETTINGS: Omit<ProjectSettings, 'project_id'> = {
  firma: null,
  adr: null,
  logo_url: null,
  logo_x: 0.5,
  logo_y: 0.5,
  logo_size: 0.2,
  aa_logo_x: null,
  aa_logo_y: null,
  aa_logo_size: null,
}

export interface ProjectContact {
  id: string
  project_id: string
  funktion: string | null
  name: string
  phone: string | null
  sort_order: number
}

export const MAX_LOGO_SIZE_BYTES = 2 * 1024 * 1024 // 2MB
export const ALLOWED_LOGO_TYPES = ['image/png', 'image/jpeg']
