export interface Shift {
  id: string
  project_id: string
  datum: string
  typ: 'tag' | 'nacht'
  beg: string | null
  end: string | null
  pau: number | null
  temp: number | null
  wit: string | null
  bod: string | null
  gl: string | null
  kv: string | null
  kb: string | null
  arb: string | null
  vor: string | null
  created_at: string
  updated_at: string
}

export interface ShiftWorker {
  id: string
  shift_id: string
  beruf: string
  anz: number
  std: number
}

export interface ShiftEquipment {
  id: string
  shift_id: string
  typ: string
  anz: number
  std: number
}

export interface ShiftWithDetails extends Shift {
  shift_workers: ShiftWorker[]
  shift_equipment: ShiftEquipment[]
}

export const WITTERUNG_OPTIONS = [
  '\u2600\uFE0F Sonnig',
  '\u26C5 Wechselhaft',
  '\u2601\uFE0F Bew\u00F6lkt',
  '\uD83C\uDF27 Regen',
  '\uD83C\uDF28 Schnee',
  '\u2744\uFE0F Frost',
  '\uD83D\uDCA8 Windig',
  '\uD83C\uDF2B Nebel',
] as const

export const BODENZUSTAND_OPTIONS = [
  'Trocken',
  'Feucht',
  'Nass',
  'Gefroren',
  'Schneebedeckt',
] as const

export const DEFAULT_WORKER_CATEGORIES = [
  'Bauleiter',
  'Polier',
  'Vorarbeiter',
  'Facharbeiter',
  'Logistiker',
  'NU',
] as const

export const DEFAULT_EQUIPMENT_CATEGORIES = [
  'ZWB',
  'Kettenbagger',
  'Gleisbauanhänger',
  'Gleisbauanhänger + Mulde',
  'Radlader',
  'Stromaggregat',
  'Merlo',
] as const
