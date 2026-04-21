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
  '☀️ Sonnig',
  '⛅ Wechselhaft',
  '☁️ Bewölkt',
  '🌧 Regen',
  '🌨 Schnee',
  '❄️ Frost',
  '💨 Windig',
  '🌫 Nebel',
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
