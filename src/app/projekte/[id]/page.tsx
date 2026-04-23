'use client'

import { useEffect, useMemo, useState } from 'react'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import { useQueryClient } from '@tanstack/react-query'
import { AlertCircle } from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'
import { ProjectDetailHeader } from '@/components/project-detail-header'
import { KWNavigation } from '@/components/kw-navigation'
import { ShiftGrid } from '@/components/shift-grid'
import { DeleteShiftDialog } from '@/components/delete-shift-dialog'
import { createClient } from '@/lib/supabase'
import { updateShiftField, updateShiftWorker, updateShiftEquipment } from '@/lib/services/shifts-service'
import { getKWsForRange, getCurrentKWIndex, toDateString, formatCardDate, formatNightShiftDate, calculateNetHours } from '@/lib/kw-utils'
import type { KWInfo } from '@/lib/kw-utils'
import type { Project } from '@/lib/validations/project'
import type { ShiftWithDetails } from '@/lib/validations/shift'
import { DEFAULT_WORKER_CATEGORIES, DEFAULT_EQUIPMENT_CATEGORIES } from '@/lib/validations/shift'
import { formatShiftDate } from '@/lib/kw-utils'
import { toast } from 'sonner'

import { ZOOM_STORAGE_KEY, ZOOM_DEFAULT, ZOOM_MIN, ZOOM_MAX } from '@/lib/constants'
import { useProjectQuery } from '@/hooks/queries/use-project-query'
import { useProjectSettingsQuery } from '@/hooks/queries/use-project-settings-query'
import { useShiftsQuery } from '@/hooks/queries/use-shifts-query'
import { queryKeys } from '@/lib/query-keys'

const SHIFT_ALLOWED_FIELDS = new Set(['temp', 'wit', 'bod', 'beg', 'end', 'pau', 'gl', 'kv', 'kb', 'arb', 'vor'])
const WORKER_ALLOWED_FIELDS = new Set(['beruf', 'anz', 'std'])
const EQUIPMENT_ALLOWED_FIELDS = new Set(['typ', 'anz', 'std'])

function getStoredZoom(): number {
  if (typeof window === 'undefined') return ZOOM_DEFAULT
  const stored = localStorage.getItem(ZOOM_STORAGE_KEY)
  if (stored) {
    const num = parseInt(stored, 10)
    if (num >= ZOOM_MIN && num <= ZOOM_MAX) return num
  }
  return ZOOM_DEFAULT
}

export default function ProjectDetailPage() {
  const params = useParams()
  const projectId = params.id as string
  const router = useRouter()
  const searchParams = useSearchParams()
  const queryClient = useQueryClient()

  // ── Remote Data ───────────────────────────────────────────────
  const { data: projectBase, isLoading: isLoadingProject } = useProjectQuery(projectId)
  const { data: settings } = useProjectSettingsQuery(projectId)
  const { data: allShifts = [], isLoading: isLoadingShifts } = useShiftsQuery(projectId)
  // Projekt mit Settings-Overrides (firma/adr aus project_settings haben Vorrang)
  const project = useMemo((): Project | null => {
    if (!projectBase) return null
    return {
      ...projectBase,
      firm: settings?.firma ?? projectBase.firm,
      adr: settings?.adr ?? projectBase.adr,
    }
  }, [projectBase, settings])

  const projectLogo = settings?.logo ?? null

  const workerCategories = settings?.workerCategories
  const equipmentCategories = settings?.equipmentCategories

  // ── UI State ──────────────────────────────────────────────────
  const [weeks, setWeeks] = useState<KWInfo[]>([])
  const [activeKWIndex, setActiveKWIndex] = useState(0)

  // UI state
  const [zoom, setZoom] = useState(75)
  const [deleteTarget, setDeleteTarget] = useState<ShiftWithDetails | null>(null)

  // Volltextsuche (PROJ-11)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchBlink, setSearchBlink] = useState(0)

  const displayedShifts = useMemo(() => {
    if (!searchQuery) return allShifts
    const q = searchQuery.toLowerCase()
    return allShifts.filter(s =>
      (s.arb ?? '').toLowerCase().includes(q) ||
      (s.vor ?? '').toLowerCase().includes(q)
    )
  }, [allShifts, searchQuery])

  const activeWeek = weeks[activeKWIndex]

  // Initialize zoom from localStorage
  useEffect(() => {
    setZoom(getStoredZoom())
  }, [])

  const handleZoomChange = (newZoom: number) => {
    setZoom(newZoom)
    localStorage.setItem(ZOOM_STORAGE_KEY, newZoom.toString())
  }

  // Compute weeks when project loads
  useEffect(() => {
    if (!project?.lz_von || !project?.lz_bis) {
      setWeeks([])
      return
    }
    const computedWeeks = getKWsForRange(project.lz_von, project.lz_bis)
    setWeeks(computedWeeks)
    const kwParam = searchParams.get('kw')
    if (kwParam) {
      const idx = computedWeeks.findIndex(w => String(w.kw) === kwParam)
      setActiveKWIndex(idx >= 0 ? idx : getCurrentKWIndex(computedWeeks))
    } else {
      setActiveKWIndex(getCurrentKWIndex(computedWeeks))
    }
  }, [project, searchParams])

  // Effects 3+4+5 wurden durch Query-Hooks (useProjectSettingsQuery, useShiftsQuery,
  // useWorkNotificationsQuery) ersetzt. Nur Effect 2 (KW-Berechnung) bleibt hier.

  // --- Shift CRUD ---

  const handleCreateShift = async (datum: string, typ: 'tag' | 'nacht') => {
    if (searchQuery) {
      setSearchBlink(n => n + 1)
      return
    }
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
      queryClient.setQueryData<ShiftWithDetails[]>(queryKeys.shifts(projectId), (prev) => [...(prev ?? []), newShift])
    } catch {
      toast.error('Schicht konnte nicht angelegt werden.')
    }
  }

  const handleCopyPreviousDay = async (datum: string, typ: 'tag' | 'nacht') => {
    // Find the most recent shift of same type before this date
    const prevShift = allShifts
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
      queryClient.setQueryData<ShiftWithDetails[]>(queryKeys.shifts(projectId), (prev) => [...(prev ?? []), newShift])
    } catch {
      toast.error('Schicht konnte nicht übernommen werden.')
    }
  }

  const handleUpdateShift = async (
    shiftId: string,
    field: string,
    value: string | number | null
  ) => {
    if (!SHIFT_ALLOWED_FIELDS.has(field)) return

    const previous = queryClient.getQueryData<ShiftWithDetails[]>(queryKeys.shifts(projectId))
    queryClient.setQueryData<ShiftWithDetails[]>(queryKeys.shifts(projectId), (prev) =>
      (prev ?? []).map((s) => (s.id === shiftId ? { ...s, [field]: value } : s))
    )

    // std-Sync bei Zeitänderung: Nettostunden berechnen und als syncStd mitgeben
    let stdSync: { workerIds: string[]; equipmentIds: string[]; value: number } | undefined
    if (['beg', 'end', 'pau'].includes(field)) {
      const shift = allShifts.find((s) => s.id === shiftId)
      if (shift) {
        const updated = { ...shift, [field]: value }
        if (updated.beg && updated.end) {
          const netHours = calculateNetHours(updated.beg, updated.end, updated.pau)
          if (netHours > 0) {
            const workerIds = shift.shift_workers.map((w) => w.id)
            const equipmentIds = shift.shift_equipment.map((e) => e.id)
            stdSync = { workerIds, equipmentIds, value: netHours }
            // Optimistisches Update für std
            queryClient.setQueryData<ShiftWithDetails[]>(queryKeys.shifts(projectId), (prev) =>
              (prev ?? []).map((s) =>
                s.id === shiftId ? {
                  ...s,
                  shift_workers: s.shift_workers.map((w) => ({ ...w, std: netHours })),
                  shift_equipment: s.shift_equipment.map((e) => ({ ...e, std: netHours })),
                } : s
              )
            )
          }
        }
      }
    }

    const result = await updateShiftField(shiftId, { [field]: value }, stdSync)
    if (!result.ok) {
      queryClient.setQueryData(queryKeys.shifts(projectId), previous)
      toast.error('Änderung konnte nicht gespeichert werden.')
    }
  }

  const handleDeleteShift = async () => {
    if (!deleteTarget) return

    const shiftId = deleteTarget.id
    queryClient.setQueryData<ShiftWithDetails[]>(queryKeys.shifts(projectId), (prev) =>
      (prev ?? []).filter((s) => s.id !== shiftId)
    )
    setDeleteTarget(null)

    try {
      const supabase = createClient()
      await supabase.from('shifts').delete().eq('id', shiftId)
      await queryClient.invalidateQueries({ queryKey: queryKeys.projects() })
    } catch {
      await queryClient.invalidateQueries({ queryKey: queryKeys.shifts(projectId) })
    }
  }

  // --- Worker CRUD ---

  const handleAddWorker = async (shiftId: string, beruf: string) => {
    try {
      const supabase = createClient()

      const shift = allShifts.find((s) => s.id === shiftId)
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

      queryClient.setQueryData<ShiftWithDetails[]>(queryKeys.shifts(projectId), (prev) =>
        (prev ?? []).map((s) =>
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
    if (!WORKER_ALLOWED_FIELDS.has(field)) return

    const previous = queryClient.getQueryData<ShiftWithDetails[]>(queryKeys.shifts(projectId))
    queryClient.setQueryData<ShiftWithDetails[]>(queryKeys.shifts(projectId), (prev) =>
      (prev ?? []).map((s) => ({
        ...s,
        shift_workers: s.shift_workers.map((w) =>
          w.id === workerId ? { ...w, [field]: value } : w
        ),
      }))
    )

    const result = await updateShiftWorker(workerId, { [field]: value })
    if (!result.ok) {
      queryClient.setQueryData(queryKeys.shifts(projectId), previous)
      toast.error('Änderung konnte nicht gespeichert werden.')
    }
  }

  const handleDeleteWorker = async (workerId: string) => {
    const previous = queryClient.getQueryData<ShiftWithDetails[]>(queryKeys.shifts(projectId))
    queryClient.setQueryData<ShiftWithDetails[]>(queryKeys.shifts(projectId), (prev) =>
      (prev ?? []).map((s) => ({
        ...s,
        shift_workers: s.shift_workers.filter((w) => w.id !== workerId),
      }))
    )

    try {
      const supabase = createClient()
      const { error } = await supabase.from('shift_workers').delete().eq('id', workerId)
      if (error) {
        queryClient.setQueryData(queryKeys.shifts(projectId), previous)
        toast.error('Mitarbeiter konnte nicht gelöscht werden.')
      }
    } catch {
      queryClient.setQueryData(queryKeys.shifts(projectId), previous)
      toast.error('Mitarbeiter konnte nicht gelöscht werden.')
    }
  }

  // --- Equipment CRUD ---

  const handleAddEquipment = async (shiftId: string, typ: string) => {
    try {
      const supabase = createClient()

      const shift = allShifts.find((s) => s.id === shiftId)
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

      queryClient.setQueryData<ShiftWithDetails[]>(queryKeys.shifts(projectId), (prev) =>
        (prev ?? []).map((s) =>
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
    if (!EQUIPMENT_ALLOWED_FIELDS.has(field)) return

    const previous = queryClient.getQueryData<ShiftWithDetails[]>(queryKeys.shifts(projectId))
    queryClient.setQueryData<ShiftWithDetails[]>(queryKeys.shifts(projectId), (prev) =>
      (prev ?? []).map((s) => ({
        ...s,
        shift_equipment: s.shift_equipment.map((e) =>
          e.id === equipmentId ? { ...e, [field]: value } : e
        ),
      }))
    )

    const result = await updateShiftEquipment(equipmentId, { [field]: value })
    if (!result.ok) {
      queryClient.setQueryData(queryKeys.shifts(projectId), previous)
      toast.error('Änderung konnte nicht gespeichert werden.')
    }
  }

  const handleDeleteEquipment = async (equipmentId: string) => {
    const previous = queryClient.getQueryData<ShiftWithDetails[]>(queryKeys.shifts(projectId))
    queryClient.setQueryData<ShiftWithDetails[]>(queryKeys.shifts(projectId), (prev) =>
      (prev ?? []).map((s) => ({
        ...s,
        shift_equipment: s.shift_equipment.filter((e) => e.id !== equipmentId),
      }))
    )

    try {
      const supabase = createClient()
      const { error } = await supabase.from('shift_equipment').delete().eq('id', equipmentId)
      if (error) {
        queryClient.setQueryData(queryKeys.shifts(projectId), previous)
        toast.error('Gerät konnte nicht gelöscht werden.')
      }
    } catch {
      queryClient.setQueryData(queryKeys.shifts(projectId), previous)
      toast.error('Gerät konnte nicht gelöscht werden.')
    }
  }

  // --- Print ---

  const handlePrintShift = (shift: ShiftWithDetails, date: Date) => {
    const el = document.querySelector<HTMLElement>(`[data-shift-id="${shift.id}"]`)
    if (!el) return

    const [y, m, d] = shift.datum.split('-')
    const prevTitle = document.title
    document.title = `BTB ${d}.${m}.${y}`

    el.classList.add('btb-print-active')
    window.print()

    window.addEventListener('afterprint', () => {
      document.title = prevTitle
      el.classList.remove('btb-print-active')
    }, { once: true })
  }

  const handlePrintKW = () => {
    if (!activeWeek) return

    const kwShifts: { shift: ShiftWithDetails; date: Date }[] = []
    for (const day of activeWeek.daysInRange) {
      const dateStr = toDateString(day)
      const tagShift = allShifts.find(s => s.datum === dateStr && s.typ === 'tag')
      if (tagShift) kwShifts.push({ shift: tagShift, date: day })
      const nachtShift = allShifts.find(s => s.datum === dateStr && s.typ === 'nacht')
      if (nachtShift) kwShifts.push({ shift: nachtShift, date: day })
    }

    if (kwShifts.length === 0) {
      toast.info('Keine Schichten in dieser Kalenderwoche zum Drucken.')
      return
    }

    const elements: HTMLElement[] = []
    kwShifts.forEach(({ shift }, i) => {
      const el = document.querySelector<HTMLElement>(`[data-shift-id="${shift.id}"]`)
      if (el) { el.dataset.kwPrintIndex = String(i); elements.push(el) }
    })

    const prevTitle = document.title
    document.title = `BTB KW ${activeWeek.kw}`
    document.body.classList.add('btb-kw-printing')
    window.print()

    window.addEventListener('afterprint', () => {
      document.title = prevTitle
      document.body.classList.remove('btb-kw-printing')
      elements.forEach(el => delete el.dataset.kwPrintIndex)
    }, { once: true })
  }

  // --- Render ---

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
          onSelectWeek={(idx) => {
            setActiveKWIndex(idx)
            const kw = weeks[idx]?.kw
            if (kw) router.replace(`/projekte/${projectId}?kw=${kw}`, { scroll: false })
          }}
          shifts={displayedShifts}
          zoom={zoom}
          onZoomChange={handleZoomChange}
          onPrintKW={handlePrintKW}
          lzVon={project.lz_von}
          lzBis={project.lz_bis}
          searchQuery={searchQuery}
          onSearch={(q) => setSearchQuery(q)}
          onClearSearch={() => setSearchQuery('')}
          searchResultCount={searchQuery ? displayedShifts.length : undefined}
          searchBlinkTrigger={searchBlink}
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
              shifts={displayedShifts}
              zoom={zoom}
              project={project}
              logo={projectLogo}
              weatherLocation={null}
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
