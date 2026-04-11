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
  equipment_bedarf_contacts: string | null
  equipment_baustelle_contacts: string | null
  equipment_frei_contacts: string | null
  print_lagerplaetze_with_geraete: boolean
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
  equipment_bedarf_contacts: null,
  equipment_baustelle_contacts: null,
  equipment_frei_contacts: null,
  print_lagerplaetze_with_geraete: false,
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
