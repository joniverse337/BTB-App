import { createClient } from '@/lib/supabase'
import type { Project } from '@/lib/validations/project'
import type { ShiftWithDetails } from '@/lib/validations/shift'

/**
 * Fetch all projects for the current user with shift counts.
 */
export async function fetchProjects(): Promise<Project[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('projects')
    .select('*, shifts(count)')
    .order('created_at', { ascending: false })

  if (error || !data) return []

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (data ?? []).map((p: any) => ({
    ...p,
    btb_count: p.shifts?.[0]?.count ?? 0,
    shifts: undefined,
  }))
}

/**
 * Fetch a single project by ID.
 */
export async function fetchProject(projectId: string): Promise<Project | null> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('projects')
    .select('*')
    .eq('id', projectId)
    .single()

  if (error || !data) return null
  return data as Project
}

/**
 * Fetch all shifts for a project with workers and equipment.
 */
export async function fetchShiftsWithDetails(
  projectId: string
): Promise<ShiftWithDetails[]> {
  const supabase = createClient()
  const { data: shiftData, error: shiftError } = await supabase
    .from('shifts')
    .select('*')
    .eq('project_id', projectId)
    .order('datum', { ascending: true })

  if (shiftError || !shiftData) return []

  const shiftIds = shiftData.map((s: { id: string }) => s.id)

  let workers: { id: string; shift_id: string; beruf: string; anz: number; std: number }[] = []
  let equipment: { id: string; shift_id: string; typ: string; anz: number; std: number }[] = []

  if (shiftIds.length > 0) {
    const [workersRes, equipRes] = await Promise.all([
      supabase.from('shift_workers').select('*').in('shift_id', shiftIds),
      supabase.from('shift_equipment').select('*').in('shift_id', shiftIds),
    ])
    workers = workersRes.data ?? []
    equipment = equipRes.data ?? []
  }

  return shiftData.map((s: ShiftWithDetails) => ({
    ...s,
    shift_workers: workers.filter((w) => w.shift_id === s.id),
    shift_equipment: equipment.filter((e) => e.shift_id === s.id),
  }))
}

/**
 * Fetch project settings + company fallback data.
 * Returns firma/adr overrides and logo info.
 */
export async function fetchProjectSettingsWithFallback(projectId: string): Promise<{
  firma: string | null
  adr: string | null
  logo: { url: string; x: number; y: number; size: number } | null
  workerCategories: string[] | undefined
  equipmentCategories: string[] | undefined
}> {
  const supabase = createClient()

  // Fetch company data for fallback
  let company: { name: string | null; adr: string | null; logo_url: string | null; logo_x: number; logo_y: number } | null = null
  const { data: { user } } = await supabase.auth.getUser()
  if (user) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('company_id')
      .eq('user_id', user.id)
      .single()
    if (profile?.company_id) {
      const { data: companyRow } = await supabase
        .from('companies')
        .select('name, adr, logo_url, logo_x, logo_y')
        .eq('id', profile.company_id)
        .single()
      if (companyRow) company = companyRow
    }
  }

  // Fetch project_settings
  const { data: settingsData } = await supabase
    .from('project_settings')
    .select('firma, adr, logo_url, logo_x, logo_y, logo_size')
    .eq('project_id', projectId)
    .single()

  let firma: string | null = null
  let adr: string | null = null
  let logo: { url: string; x: number; y: number; size: number } | null = null

  if (settingsData) {
    firma = settingsData.firma ?? company?.name ?? null
    adr = settingsData.adr ?? company?.adr ?? null

    if (settingsData.logo_url) {
      logo = {
        url: settingsData.logo_url,
        x: settingsData.logo_x ?? 0.5,
        y: settingsData.logo_y ?? 0.5,
        size: settingsData.logo_size ?? 0.2,
      }
    } else if (company?.logo_url) {
      logo = {
        url: company.logo_url,
        x: settingsData.logo_x ?? company.logo_x ?? 0.5,
        y: settingsData.logo_y ?? company.logo_y ?? 0.5,
        size: settingsData.logo_size ?? 0.2,
      }
    }
  } else if (company) {
    firma = company.name ?? null
    adr = company.adr ?? null
    if (company.logo_url) {
      logo = {
        url: company.logo_url,
        x: company.logo_x ?? 0.5,
        y: company.logo_y ?? 0.5,
        size: 0.2,
      }
    }
  }

  // Fetch categories
  const { data: projCats } = await supabase
    .from('project_categories')
    .select('*')
    .eq('project_id', projectId)
    .order('sort_order', { ascending: true })

  let workerCategories: string[] | undefined
  let equipmentCategories: string[] | undefined

  if (projCats && projCats.length > 0) {
    const personal = projCats.filter((c: { typ: string }) => c.typ === 'personal').map((c: { label: string }) => c.label)
    const equip = projCats.filter((c: { typ: string }) => c.typ === 'equipment').map((c: { label: string }) => c.label)
    workerCategories = personal.length > 0 ? personal : undefined
    equipmentCategories = equip.length > 0 ? equip : undefined
  } else {
    // Fallback: user_categories
    const { data } = await supabase
      .from('user_categories')
      .select('*')
      .order('sort_order', { ascending: true })

    if (data && data.length > 0) {
      const personal = data.filter((c: { typ: string }) => c.typ === 'personal').map((c: { label: string }) => c.label)
      const equip = data.filter((c: { typ: string }) => c.typ === 'equipment').map((c: { label: string }) => c.label)
      workerCategories = personal.length > 0 ? personal : undefined
      equipmentCategories = equip.length > 0 ? equip : undefined
    }
  }

  return { firma, adr, logo, workerCategories, equipmentCategories }
}
