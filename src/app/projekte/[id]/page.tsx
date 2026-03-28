'use client'

import { useCallback, useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { AlertCircle } from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'
import { ProjectDetailHeader } from '@/components/project-detail-header'
import { KWNavigation } from '@/components/kw-navigation'
import { ShiftGrid } from '@/components/shift-grid'
import { DeleteShiftDialog } from '@/components/delete-shift-dialog'
import { createClient } from '@/lib/supabase'
import { getKWsForRange, getCurrentKWIndex, toDateString, formatCardDate, formatNightShiftDate, calculateNetHours } from '@/lib/kw-utils'
import type { KWInfo } from '@/lib/kw-utils'
import type { Project } from '@/lib/validations/project'
import type { ShiftWithDetails } from '@/lib/validations/shift'
import { DEFAULT_WORKER_CATEGORIES, DEFAULT_EQUIPMENT_CATEGORIES } from '@/lib/validations/shift'
import { formatShiftDate } from '@/lib/kw-utils'
import { toast } from 'sonner'

const ZOOM_STORAGE_KEY = 'btb-zoom'

function getStoredZoom(): number {
  if (typeof window === 'undefined') return 75
  const stored = localStorage.getItem(ZOOM_STORAGE_KEY)
  if (stored) {
    const num = parseInt(stored, 10)
    if (num >= 40 && num <= 100) return num
  }
  return 75
}

function escHtml(str: string | null | undefined): string {
  if (!str) return ''
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

const PRINT_STYLES = `
@page { size: A4 portrait; margin: 0; }
* { margin: 0; padding: 0; box-sizing: border-box; print-color-adjust: exact; -webkit-print-color-adjust: exact; }
body { font-family: 'IBM Plex Sans', sans-serif; font-size: 8.5pt; color: #222; }
.page { width: 210mm; height: 297mm; padding: 7mm 9mm 22mm 9mm; position: relative; }
.header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2.5px solid #1a2040; padding-bottom: 6px; margin-bottom: 6px; }
.firm { font-family: 'Inter', sans-serif; font-weight: 800; font-size: 14pt; color: #1a2040; }
.firm-adr { font-size: 7pt; color: #666; margin-top: 2px; }
.title { font-size: 11pt; font-weight: 700; color: #1a2040; text-transform: uppercase; letter-spacing: 0.5px; }
.st { font-size: 6.5pt; font-weight: 700; letter-spacing: 2px; text-transform: uppercase; color: #888; border-bottom: 1px solid #ddd; padding-bottom: 2px; margin-bottom: 5px; }
.lbl { font-size: 6.5pt; color: #666; display: block; margin-bottom: 1px; }
.val { font-size: 8pt; padding: 1px 2px; }
.val-name { font-size: 8.5pt; font-weight: 600; padding: 1px 2px; }
.grid3 { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 7px; margin-bottom: 5px; }
.grid2 { display: grid; grid-template-columns: 1fr 1fr; gap: 7px; }
table { width: 100%; border-collapse: collapse; font-size: 7.5pt; }
th { background: #1a2040; color: #fff; padding: 2px 5px; text-align: left; font-size: 6pt; letter-spacing: 0.5px; }
td { padding: 2px 5px; border-bottom: 1px solid #eee; }
.textarea { border: 1px solid #e8e8e8; border-radius: 3px; background: #fafafa; padding: 4px 5px; font-size: 8pt; min-height: 40px; white-space: pre-wrap; }
.sig { position: absolute; bottom: 7mm; left: 9mm; right: 9mm; display: grid; grid-template-columns: 1fr 1fr; gap: 30px; }
.sig-line { border-top: 1px solid #999; margin-bottom: 3px; height: 16px; }
.sig-label { font-size: 7pt; color: #666; }
.spacer { height: 1.2em; }
.section { margin-bottom: 5px; }
.watermark { position: absolute; pointer-events: none; opacity: 0.3; transform: translate(-50%, -50%); }
`

function buildShiftPageDiv(shift: ShiftWithDetails, date: Date, project: Project | null, pageBreakAfter = false, logo?: { url: string; x: number; y: number; size: number } | null): string {
  const isNight = shift.typ === 'nacht'
  const dateLabel = isNight ? formatNightShiftDate(date) : formatCardDate(date)
  const schichtLabel = isNight ? 'Nachtschicht' : 'Tagschicht'
  const schichtColor = isNight ? '#4a7cf7' : '#e8a020'
  const netHours = calculateNetHours(shift.beg, shift.end, shift.pau)

  const workersHtml = shift.shift_workers.map(w =>
    `<tr><td>${escHtml(w.beruf)}</td><td style="text-align:center">${w.anz}</td><td style="text-align:center">${w.std}</td></tr>`
  ).join('')
  const totWorkers = shift.shift_workers.reduce((s, w) => s + (parseFloat(String(w.std ?? 0)) || 0) * (w.anz || 1), 0)

  const equipHtml = shift.shift_equipment.map(e =>
    `<tr><td>${escHtml(e.typ)}</td><td style="text-align:center">${e.anz}</td><td style="text-align:center">${e.std}</td></tr>`
  ).join('')
  const totEquip = shift.shift_equipment.reduce((s, e) => s + (parseFloat(String(e.std ?? 0)) || 0) * (e.anz || 1), 0)

  const logoHtml = logo ? `<img class="watermark" src="${escHtml(logo.url)}" style="left:${logo.x * 100}%;top:${logo.y * 100}%;width:${logo.size * 100}%" alt="" />` : ''

  return `<div class="page"${pageBreakAfter ? ' style="page-break-after:always"' : ''}>${logoHtml}
  <div class="header">
    <div>
      <div class="firm">${escHtml(project?.firm) || 'Firmenname'}</div>
      ${project?.adr ? `<div class="firm-adr">${escHtml(project.adr)}</div>` : ''}
    </div>
    <div style="text-align:right">
      <div class="title">Bautagesbericht &nbsp; ${escHtml(dateLabel)}</div>
      <div style="font-size:6.5pt;color:${schichtColor};font-weight:600;margin-top:2px">${schichtLabel}</div>
    </div>
  </div>

  <div class="grid3">
    <div class="section">
      <div class="st">Projekt</div>
      <div><span class="lbl">Name</span><div class="val-name">${escHtml(project?.name) || '\u2014'}</div></div>
      <div><span class="lbl">Kostenstelle</span><div class="val">${escHtml(project?.nr) || '\u2014'}</div></div>
      <div><span class="lbl">Auftraggeber</span><div class="val">${escHtml(project?.ag) || '\u2014'}</div></div>
    </div>
    <div class="section">
      <div class="st">Wetter</div>
      <div><span class="lbl">Temperatur</span><div class="val">${shift.temp != null ? shift.temp + ' \u00B0C' : '\u2014'}</div></div>
      <div><span class="lbl">Witterung</span><div class="val">${escHtml(shift.wit) || '\u2014'}</div></div>
      <div><span class="lbl">Bodenzustand</span><div class="val">${escHtml(shift.bod) || '\u2014'}</div></div>
    </div>
    <div class="section">
      <div class="st">Arbeitszeit</div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:5px;margin-bottom:4px">
        <div><span class="lbl">Beginn</span><div class="val">${shift.beg || '\u2014'}</div></div>
        <div><span class="lbl">Ende</span><div class="val">${shift.end || '\u2014'}</div></div>
      </div>
      <div><span class="lbl">Pause</span><div class="val">${shift.pau != null ? shift.pau + ' Min.' : '\u2014'}</div></div>
      <div><span class="lbl">Nettostunden</span><div class="val">${netHours > 0 ? netHours + ' h' : '\u2014'}</div></div>
    </div>
  </div>

  <div class="spacer"></div>

  <div class="section" style="display:flex;align-items:baseline;gap:8px;border-bottom:1px solid #ddd;padding-bottom:2px;">
    <span class="st" style="border-bottom:none;padding-bottom:0;margin-bottom:0;white-space:nowrap;flex-shrink:0;">Örtlichkeit:</span>
    <span class="val">${escHtml(shift.gl) || ''}</span>
    ${shift.kv || shift.kb ? `<span class="val" style="color:#888;white-space:nowrap">km\u00a0${escHtml(shift.kv) || '\u2014'}\u2013${escHtml(shift.kb) || '\u2014'}</span>` : ''}
  </div>

  <div class="spacer"></div>

  <div class="grid2">
    <div class="section">
      <table>
        <thead><tr><th>Personal</th><th style="width:32px">Anz</th><th style="width:36px">Std</th></tr></thead>
        <tbody>${workersHtml || '<tr><td colspan="3" style="color:#999;font-style:italic">Keine Einträge</td></tr>'}</tbody>
        ${totWorkers > 0 ? `<tfoot><tr style="background:#f5f5f5"><td colspan="2" style="padding:2px 5px;font-size:7pt;font-weight:600">Gesamt</td><td style="padding:2px 5px;font-size:7pt;font-weight:700;text-align:right">${Math.round(totWorkers * 100) / 100} h</td></tr></tfoot>` : ''}
      </table>
    </div>
    <div class="section">
      <table>
        <thead><tr><th>Maschinen & Gerät</th><th style="width:32px">Anz</th><th style="width:36px">Std</th></tr></thead>
        <tbody>${equipHtml || '<tr><td colspan="3" style="color:#999;font-style:italic">Keine Einträge</td></tr>'}</tbody>
        ${totEquip > 0 ? `<tfoot><tr style="background:#f5f5f5"><td colspan="2" style="padding:2px 5px;font-size:7pt;font-weight:600">Gesamt</td><td style="padding:2px 5px;font-size:7pt;font-weight:700;text-align:right">${Math.round(totEquip * 100) / 100} h</td></tr></tfoot>` : ''}
      </table>
    </div>
  </div>

  <div class="spacer"></div>

  <div class="section">
    <div class="st">Ausgeführte Arbeiten</div>
    <div class="textarea">${shift.arb || ''}</div>
  </div>

  <div class="spacer"></div>

  <div class="section">
    <div class="st">Vorkommnisse / Behinderungen</div>
    <div class="textarea">${shift.vor || ''}</div>
  </div>

  <div class="sig">
    <div><div class="sig-line"></div><div class="sig-label">Auftragnehmer</div></div>
    <div><div class="sig-line"></div><div class="sig-label">Auftraggeber</div></div>
  </div>
</div>`
}

function buildShiftPrintHtml(shift: ShiftWithDetails, date: Date, project: Project | null, logo?: { url: string; x: number; y: number; size: number } | null): string {
  const isNight = shift.typ === 'nacht'
  const dateLabel = isNight ? formatNightShiftDate(date) : formatCardDate(date)
  return `<!DOCTYPE html>
<html lang="de">
<head>
<meta charset="UTF-8">
<title>BTB - ${escHtml(project?.name)} - ${dateLabel}</title>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;800&family=IBM+Plex+Sans:wght@300;400;500;600&display=swap" rel="stylesheet">
<style>${PRINT_STYLES}</style>
</head>
<body>
${buildShiftPageDiv(shift, date, project, false, logo)}
<script>window.onload = function() { window.print(); }<\/script>
</body>
</html>`
}

export default function ProjectDetailPage() {
  const params = useParams()
  const projectId = params.id as string

  // Project state
  const [project, setProject] = useState<Project | null>(null)
  const [isLoadingProject, setIsLoadingProject] = useState(true)

  // KW state
  const [weeks, setWeeks] = useState<KWInfo[]>([])
  const [activeKWIndex, setActiveKWIndex] = useState(0)

  // Shifts state
  const [shifts, setShifts] = useState<ShiftWithDetails[]>([])
  const [isLoadingShifts, setIsLoadingShifts] = useState(false)

  // UI state
  const [zoom, setZoom] = useState(75)
  const [deleteTarget, setDeleteTarget] = useState<ShiftWithDetails | null>(null)

  // User categories (from PROJ-5, with fallback)
  const [workerCategories, setWorkerCategories] = useState<string[] | undefined>(undefined)
  const [equipmentCategories, setEquipmentCategories] = useState<string[] | undefined>(undefined)

  // Project logo (from PROJ-6 project_settings, fallback to company logo)
  const [projectLogo, setProjectLogo] = useState<{ url: string; x: number; y: number; size: number } | null>(null)

  // Initialize zoom from localStorage
  useEffect(() => {
    setZoom(getStoredZoom())
  }, [])

  const handleZoomChange = (newZoom: number) => {
    setZoom(newZoom)
    localStorage.setItem(ZOOM_STORAGE_KEY, newZoom.toString())
  }

  // Fetch project
  useEffect(() => {
    async function fetchProject() {
      setIsLoadingProject(true)
      try {
        const supabase = createClient()
        const { data, error } = await supabase
          .from('projects')
          .select('*')
          .eq('id', projectId)
          .single()

        if (error || !data) {
          setProject(null)
          return
        }

        setProject(data as Project)
      } catch {
        setProject(null)
      } finally {
        setIsLoadingProject(false)
      }
    }
    fetchProject()
  }, [projectId])

  // Compute weeks when project loads
  useEffect(() => {
    if (!project?.lz_von || !project?.lz_bis) {
      setWeeks([])
      return
    }
    const computedWeeks = getKWsForRange(project.lz_von, project.lz_bis)
    setWeeks(computedWeeks)
    setActiveKWIndex(getCurrentKWIndex(computedWeeks))
  }, [project])

  // Fetch project settings (PROJ-6: firma/adr override) + categories
  useEffect(() => {
    async function fetchSettingsAndCategories() {
      try {
        const supabase = createClient()

        // Fetch company data for fallback (firma, adr, logo)
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
            if (companyRow) {
              company = companyRow
            }
          }
        }

        // Fetch project_settings for firma/adr override + logo
        const { data: settingsData } = await supabase
          .from('project_settings')
          .select('firma, adr, logo_url, logo_x, logo_y, logo_size')
          .eq('project_id', projectId)
          .single()

        if (settingsData) {
          setProject((prev) => prev ? {
            ...prev,
            firm: settingsData.firma ?? company?.name ?? prev.firm,
            adr: settingsData.adr ?? company?.adr ?? prev.adr,
          } : prev)

          if (settingsData.logo_url) {
            setProjectLogo({
              url: settingsData.logo_url,
              x: settingsData.logo_x ?? 0.5,
              y: settingsData.logo_y ?? 0.5,
              size: settingsData.logo_size ?? 0.2,
            })
          } else if (company?.logo_url) {
            // Fallback to company logo — use project_settings position (where the user configured it)
            setProjectLogo({
              url: company.logo_url,
              x: settingsData.logo_x ?? company.logo_x ?? 0.5,
              y: settingsData.logo_y ?? company.logo_y ?? 0.5,
              size: settingsData.logo_size ?? 0.2,
            })
          }
        } else if (company) {
          // No project_settings at all: use company data
          setProject((prev) => prev ? {
            ...prev,
            firm: company!.name ?? prev.firm,
            adr: company!.adr ?? prev.adr,
          } : prev)
          if (company.logo_url) {
            setProjectLogo({
              url: company.logo_url,
              x: company.logo_x ?? 0.5,
              y: company.logo_y ?? 0.5,
              size: 0.2,
            })
          }
        }

        // Fetch project_categories first (PROJ-6), fallback to user_categories (PROJ-5)
        const { data: projCats } = await supabase
          .from('project_categories')
          .select('*')
          .eq('project_id', projectId)
          .order('sort_order', { ascending: true })

        if (projCats && projCats.length > 0) {
          const personal = projCats.filter((c: { typ: string }) => c.typ === 'personal').map((c: { label: string }) => c.label)
          const equip = projCats.filter((c: { typ: string }) => c.typ === 'equipment').map((c: { label: string }) => c.label)

          // Project categories are the single source of truth (presets are seeded in DB via PROJ-6 settings)
          setWorkerCategories(personal.length > 0 ? personal : undefined)
          setEquipmentCategories(equip.length > 0 ? equip : undefined)
          return
        }

        // Fallback: user_categories (PROJ-5)
        const { data, error } = await supabase
          .from('user_categories')
          .select('*')
          .order('sort_order', { ascending: true })

        if (error || !data || data.length === 0) {
          setWorkerCategories(undefined)
          setEquipmentCategories(undefined)
          return
        }

        const personal = data.filter((c: { typ: string; label: string }) => c.typ === 'personal').map((c: { label: string }) => c.label)
        const equip = data.filter((c: { typ: string; label: string }) => c.typ === 'equipment').map((c: { label: string }) => c.label)

        setWorkerCategories(personal.length > 0 ? personal : undefined)
        setEquipmentCategories(equip.length > 0 ? equip : undefined)
      } catch {
        setWorkerCategories(undefined)
        setEquipmentCategories(undefined)
      }
    }
    if (project) fetchSettingsAndCategories()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId, isLoadingProject])

  // Fetch shifts for the entire project (all weeks, for dot raster)
  const fetchAllShifts = useCallback(async () => {
    if (!project) return

    setIsLoadingShifts(true)
    try {
      const supabase = createClient()
      const { data: shiftData, error: shiftError } = await supabase
        .from('shifts')
        .select('*')
        .eq('project_id', projectId)
        .order('datum', { ascending: true })

      if (shiftError || !shiftData) {
        setShifts([])
        return
      }

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

      const shiftsWithDetails: ShiftWithDetails[] = shiftData.map((s: ShiftWithDetails) => ({
        ...s,
        shift_workers: workers.filter((w) => w.shift_id === s.id),
        shift_equipment: equipment.filter((e) => e.shift_id === s.id),
      }))

      setShifts(shiftsWithDetails)
    } catch {
      setShifts([])
    } finally {
      setIsLoadingShifts(false)
    }
  }, [project, projectId])

  useEffect(() => {
    if (project) fetchAllShifts()
  }, [project, fetchAllShifts])

  // --- Shift CRUD ---

  const handleCreateShift = async (datum: string, typ: 'tag' | 'nacht') => {
    try {
      const supabase = createClient()
      const { data, error } = await supabase
        .from('shifts')
        .insert({
          project_id: projectId, datum, typ,
          beg: typ === 'tag' ? '07:00' : '21:00',
          end: typ === 'tag' ? '18:00' : '08:00',
          pau: 30,
        })
        .select()
        .single()

      if (error || !data) { toast.error('Schicht konnte nicht angelegt werden.'); return }

      const newShift: ShiftWithDetails = {
        ...data,
        shift_workers: [],
        shift_equipment: [],
      }
      setShifts((prev) => [...prev, newShift])
    } catch {
      toast.error('Schicht konnte nicht angelegt werden.')
    }
  }

  const handleCopyPreviousDay = async (datum: string, typ: 'tag' | 'nacht') => {
    // Find the most recent shift of same type before this date
    const prevShift = shifts
      .filter((s) => s.typ === typ && s.datum < datum)
      .sort((a, b) => b.datum.localeCompare(a.datum))[0] ?? null

    try {
      const supabase = createClient()

      const insertData: Record<string, string | number | null> = {
        project_id: projectId,
        datum,
        typ,
      }

      if (prevShift) {
        insertData.beg = prevShift.beg
        insertData.end = prevShift.end
        insertData.pau = prevShift.pau
        insertData.temp = prevShift.temp
        insertData.wit = prevShift.wit
        insertData.bod = prevShift.bod
        insertData.gl = prevShift.gl
        insertData.kv = prevShift.kv
        insertData.kb = prevShift.kb
        insertData.arb = prevShift.arb
        insertData.vor = prevShift.vor
      }

      const { data, error } = await supabase
        .from('shifts')
        .insert(insertData)
        .select()
        .single()

      if (error || !data) { toast.error('Schicht konnte nicht übernommen werden.'); return }

      let newWorkers: { id: string; shift_id: string; beruf: string; anz: number; std: number }[] = []
      let newEquipment: { id: string; shift_id: string; typ: string; anz: number; std: number }[] = []

      if (prevShift && prevShift.shift_workers.length > 0) {
        const workerInserts = prevShift.shift_workers.map((w) => ({
          shift_id: data.id,
          beruf: w.beruf,
          anz: w.anz,
          std: w.std,
        }))
        const { data: wData } = await supabase
          .from('shift_workers')
          .insert(workerInserts)
          .select()
        newWorkers = wData ?? []
      }

      if (prevShift && prevShift.shift_equipment.length > 0) {
        const equipInserts = prevShift.shift_equipment.map((e) => ({
          shift_id: data.id,
          typ: e.typ,
          anz: e.anz,
          std: e.std,
        }))
        const { data: eData } = await supabase
          .from('shift_equipment')
          .insert(equipInserts)
          .select()
        newEquipment = eData ?? []
      }

      const newShift: ShiftWithDetails = {
        ...data,
        shift_workers: newWorkers,
        shift_equipment: newEquipment,
      }
      setShifts((prev) => [...prev, newShift])
    } catch {
      toast.error('Schicht konnte nicht übernommen werden.')
    }
  }

  const handleUpdateShift = async (
    shiftId: string,
    field: string,
    value: string | number | null
  ) => {
    setShifts((prev) =>
      prev.map((s) => (s.id === shiftId ? { ...s, [field]: value } : s))
    )

    try {
      const supabase = createClient()
      await supabase
        .from('shifts')
        .update({ [field]: value })
        .eq('id', shiftId)

      // Sync worker/equipment hours when shift times change
      if (['beg', 'end', 'pau'].includes(field)) {
        const shift = shifts.find((s) => s.id === shiftId)
        if (!shift) return
        const updated = { ...shift, [field]: value }
        if (updated.beg && updated.end) {
          const [bH, bM] = updated.beg.split(':').map(Number)
          const [eH, eM] = updated.end.split(':').map(Number)
          let total = eH * 60 + eM - (bH * 60 + bM)
          if (total < 0) total += 24 * 60
          total -= (updated.pau ?? 0)
          const netHours = total > 0 ? Math.round((total / 60) * 100) / 100 : 0
          if (netHours > 0) {
            const workerIds = shift.shift_workers.map((w) => w.id)
            if (workerIds.length > 0) {
              await supabase.from('shift_workers').update({ std: netHours }).in('id', workerIds)
              setShifts((prev) =>
                prev.map((s) =>
                  s.id === shiftId
                    ? { ...s, shift_workers: s.shift_workers.map((w) => ({ ...w, std: netHours })) }
                    : s
                )
              )
            }
            const equipmentIds = shift.shift_equipment.map((e) => e.id)
            if (equipmentIds.length > 0) {
              await supabase.from('shift_equipment').update({ std: netHours }).in('id', equipmentIds)
              setShifts((prev) =>
                prev.map((s) =>
                  s.id === shiftId
                    ? { ...s, shift_equipment: s.shift_equipment.map((e) => ({ ...e, std: netHours })) }
                    : s
                )
              )
            }
          }
        }
      }
    } catch {
      toast.error('Änderung konnte nicht gespeichert werden.')
    }
  }

  const handleDeleteShift = async () => {
    if (!deleteTarget) return

    const shiftId = deleteTarget.id
    setShifts((prev) => prev.filter((s) => s.id !== shiftId))
    setDeleteTarget(null)

    try {
      const supabase = createClient()
      await supabase.from('shifts').delete().eq('id', shiftId)
    } catch {
      fetchAllShifts()
    }
  }

  // --- Worker CRUD ---

  const handleAddWorker = async (shiftId: string, beruf: string) => {
    try {
      const supabase = createClient()

      const shift = shifts.find((s) => s.id === shiftId)
      const netHours = shift?.beg && shift?.end
        ? (() => {
            const [bH, bM] = shift.beg!.split(':').map(Number)
            const [eH, eM] = shift.end!.split(':').map(Number)
            let total = eH * 60 + eM - (bH * 60 + bM)
            if (total < 0) total += 24 * 60
            total -= shift.pau ?? 0
            return total > 0 ? Math.round((total / 60) * 100) / 100 : 0
          })()
        : 0

      const { data, error } = await supabase
        .from('shift_workers')
        .insert({ shift_id: shiftId, beruf, anz: 1, std: netHours })
        .select()
        .single()

      if (error || !data) { toast.error('Mitarbeiter konnte nicht hinzugefügt werden.'); return }

      setShifts((prev) =>
        prev.map((s) =>
          s.id === shiftId
            ? { ...s, shift_workers: [...s.shift_workers, data] }
            : s
        )
      )
    } catch {
      toast.error('Mitarbeiter konnte nicht hinzugefügt werden.')
    }
  }

  const handleUpdateWorker = async (
    workerId: string,
    field: string,
    value: string | number
  ) => {
    setShifts((prev) =>
      prev.map((s) => ({
        ...s,
        shift_workers: s.shift_workers.map((w) =>
          w.id === workerId ? { ...w, [field]: value } : w
        ),
      }))
    )

    try {
      const supabase = createClient()
      await supabase
        .from('shift_workers')
        .update({ [field]: value })
        .eq('id', workerId)
    } catch {
      toast.error('Änderung konnte nicht gespeichert werden.')
    }
  }

  const handleDeleteWorker = async (workerId: string) => {
    setShifts((prev) =>
      prev.map((s) => ({
        ...s,
        shift_workers: s.shift_workers.filter((w) => w.id !== workerId),
      }))
    )

    try {
      const supabase = createClient()
      await supabase.from('shift_workers').delete().eq('id', workerId)
    } catch {
      toast.error('Mitarbeiter konnte nicht gelöscht werden.')
    }
  }

  // --- Equipment CRUD ---

  const handleAddEquipment = async (shiftId: string, typ: string) => {
    try {
      const supabase = createClient()

      const shift = shifts.find((s) => s.id === shiftId)
      const netHours = shift?.beg && shift?.end
        ? (() => {
            const [bH, bM] = shift.beg!.split(':').map(Number)
            const [eH, eM] = shift.end!.split(':').map(Number)
            let total = eH * 60 + eM - (bH * 60 + bM)
            if (total < 0) total += 24 * 60
            total -= shift.pau ?? 0
            return total > 0 ? Math.round((total / 60) * 100) / 100 : 0
          })()
        : 0

      const { data, error } = await supabase
        .from('shift_equipment')
        .insert({ shift_id: shiftId, typ, anz: 1, std: netHours })
        .select()
        .single()

      if (error || !data) { toast.error('Gerät konnte nicht hinzugefügt werden.'); return }

      setShifts((prev) =>
        prev.map((s) =>
          s.id === shiftId
            ? { ...s, shift_equipment: [...s.shift_equipment, data] }
            : s
        )
      )
    } catch {
      toast.error('Gerät konnte nicht hinzugefügt werden.')
    }
  }

  const handleUpdateEquipment = async (
    equipmentId: string,
    field: string,
    value: string | number
  ) => {
    setShifts((prev) =>
      prev.map((s) => ({
        ...s,
        shift_equipment: s.shift_equipment.map((e) =>
          e.id === equipmentId ? { ...e, [field]: value } : e
        ),
      }))
    )

    try {
      const supabase = createClient()
      await supabase
        .from('shift_equipment')
        .update({ [field]: value })
        .eq('id', equipmentId)
    } catch {
      toast.error('Änderung konnte nicht gespeichert werden.')
    }
  }

  const handleDeleteEquipment = async (equipmentId: string) => {
    setShifts((prev) =>
      prev.map((s) => ({
        ...s,
        shift_equipment: s.shift_equipment.filter((e) => e.id !== equipmentId),
      }))
    )

    try {
      const supabase = createClient()
      await supabase.from('shift_equipment').delete().eq('id', equipmentId)
    } catch {
      toast.error('Gerät konnte nicht gelöscht werden.')
    }
  }

  // --- Print ---

  const handlePrintShift = (shift: ShiftWithDetails, date: Date) => {
    const html = buildShiftPrintHtml(shift, date, project, projectLogo)
    const win = window.open('', '_blank')
    if (!win) {
      toast.warning('Pop-up-Blocker aktiv. Bitte erlaube Pop-ups für diese Seite.')
      return
    }
    win.document.write(html)
    win.document.close()
    win.onload = () => win.print()
  }

  const handlePrintKW = () => {
    const activeWeek = weeks[activeKWIndex]
    if (!activeWeek) return

    const kwShifts: { shift: ShiftWithDetails; date: Date }[] = []
    for (const day of activeWeek.daysInRange) {
      const dateStr = toDateString(day)
      const tagShift = shifts.find(s => s.datum === dateStr && s.typ === 'tag')
      if (tagShift) kwShifts.push({ shift: tagShift, date: day })
      const nachtShift = shifts.find(s => s.datum === dateStr && s.typ === 'nacht')
      if (nachtShift) kwShifts.push({ shift: nachtShift, date: day })
    }

    if (kwShifts.length === 0) {
      toast.info('Keine Schichten in dieser Kalenderwoche zum Drucken.')
      return
    }

    const pages = kwShifts.map(({ shift, date }, i) =>
      buildShiftPageDiv(shift, date, project, i < kwShifts.length - 1, projectLogo)
    ).join('\n')

    const fullHtml = `<!DOCTYPE html>
<html lang="de">
<head>
<meta charset="UTF-8">
<title>BTB - ${escHtml(project?.name)} - KW ${activeWeek.kw}</title>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;800&family=IBM+Plex+Sans:wght@300;400;500;600&display=swap" rel="stylesheet">
<style>${PRINT_STYLES}</style>
</head>
<body>
${pages}
<script>window.onload = function() { window.print(); }<\/script>
</body>
</html>`

    const win = window.open('', '_blank')
    if (!win) {
      toast.warning('Pop-up-Blocker aktiv. Bitte erlaube Pop-ups für diese Seite.')
      return
    }
    win.document.write(fullHtml)
    win.document.close()
  }

  // --- Render ---

  const activeWeek = weeks[activeKWIndex]
  const activeDays = activeWeek?.daysInRange ?? []

  const deleteShiftLabel = deleteTarget
    ? `${deleteTarget.typ === 'tag' ? 'Tagschicht' : 'Nachtschicht'} vom ${formatShiftDate(new Date(deleteTarget.datum))}`
    : ''

  // Loading state
  if (isLoadingProject) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
        <ProjectDetailHeader project={null} isLoading={true} />
        <div className="container mx-auto px-4 py-8 md:px-6">
          <div className="flex gap-2 mb-6">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-16 w-24 rounded-lg" />
            ))}
          </div>
          <div className="grid grid-cols-3 gap-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-48 rounded-lg" />
            ))}
          </div>
        </div>
      </div>
    )
  }

  // Error state: project not found
  if (!project) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
        <ProjectDetailHeader project={null} isLoading={false} />
        <div className="container mx-auto px-4 py-16 md:px-6 text-center">
          <AlertCircle className="mx-auto h-12 w-12 text-destructive mb-4" />
          <h2 className="text-lg font-semibold mb-2">Projekt nicht gefunden</h2>
          <p className="text-muted-foreground">
            Das angeforderte Projekt existiert nicht oder du hast keinen Zugriff darauf.
          </p>
        </div>
      </div>
    )
  }

  // No Leistungszeitraum set
  if (!project.lz_von || !project.lz_bis) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
        <ProjectDetailHeader project={project} isLoading={false} />
        <div className="container mx-auto px-4 py-16 md:px-6 text-center">
          <AlertCircle className="mx-auto h-12 w-12 text-primary mb-4" />
          <h2 className="text-lg font-semibold mb-2">Leistungszeitraum nicht festgelegt</h2>
          <p className="text-muted-foreground">
            Bitte lege den Leistungszeitraum in den Projekteinstellungen fest,
            um Schichten verwalten zu können.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
      <ProjectDetailHeader project={project} isLoading={false} />

      <div style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
        <KWNavigation
          weeks={weeks}
          activeIndex={activeKWIndex}
          onSelectWeek={setActiveKWIndex}
          shifts={shifts}
          zoom={zoom}
          onZoomChange={handleZoomChange}
          onPrintKW={handlePrintKW}
          lzVon={project.lz_von}
          lzBis={project.lz_bis}
        />

        <div style={{ flex: 1, overflow: 'auto', padding: '20px' }}>
          {isLoadingShifts ? (
            <div className="grid grid-cols-3 gap-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-48 rounded-lg" />
              ))}
            </div>
          ) : (
            <ShiftGrid
              days={activeDays}
              shifts={shifts}
              zoom={zoom}
              project={project}
              logo={projectLogo}
              workerCategories={workerCategories}
              equipmentCategories={equipmentCategories}
              onCreateShift={handleCreateShift}
              onCopyPreviousDay={handleCopyPreviousDay}
              onUpdateShift={handleUpdateShift}
              onDeleteShift={setDeleteTarget}
              onAddWorker={handleAddWorker}
              onUpdateWorker={handleUpdateWorker}
              onDeleteWorker={handleDeleteWorker}
              onAddEquipment={handleAddEquipment}
              onUpdateEquipment={handleUpdateEquipment}
              onDeleteEquipment={handleDeleteEquipment}
              onPrintShift={handlePrintShift}
            />
          )}
        </div>
      </div>

      <DeleteShiftDialog
        open={deleteTarget !== null}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null)
        }}
        onConfirm={handleDeleteShift}
        shiftLabel={deleteShiftLabel}
      />
    </div>
  )
}
