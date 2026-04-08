'use client'

import { useCallback, useEffect, useState } from 'react'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import { AlertCircle, Copy } from 'lucide-react'
import { addDays } from 'date-fns'
import { Skeleton } from '@/components/ui/skeleton'
import { PaperEngine } from '@/components/paper-engine'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { ProjectDetailHeader } from '@/components/project-detail-header'
import { KWNavigation } from '@/components/kw-navigation'
import { WorkNotificationTable } from '@/components/work-notification-table'
import { createClient } from '@/lib/supabase'
import { getKWsForRange, getCurrentKWIndex, toDateString } from '@/lib/kw-utils'
import type { KWInfo } from '@/lib/kw-utils'
import type { Project } from '@/lib/validations/project'
import { toast } from 'sonner'

import type { WorkNotificationRow } from '@/lib/validations/work-notification'
export type { WorkNotificationRow } from '@/lib/validations/work-notification'

const WEEKDAY_NAMES = ['Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag', 'Sonntag']


function buildEmptyRows(projectId: string, week: KWInfo): WorkNotificationRow[] {
  return Array.from({ length: 7 }, (_, i) => {
    const day = addDays(week.weekStart, i)
    return {
      project_id: projectId,
      calendar_week: week.kw,
      year: week.year,
      weekday_nr: i + 1,
      weekday_name: WEEKDAY_NAMES[i],
      date: toDateString(day),
      day_start: null,
      day_end: null,
      night_start: null,
      night_end: null,
      location: null,
      bauspitzen: '1',
      workers: '5',
      machines: null,
      work_description: null,
      site_manager: null,
      safety_plan_enabled: false,
      safety_plan_number: null,
      track_work_enabled: false,
      betra_number: null,
    }
  })
}

export default function ArbeitsanmeldungPage() {
  const params = useParams()
  const projectId = params.id as string
  const router = useRouter()
  const searchParams = useSearchParams()

  const [project, setProject] = useState<Project | null>(null)
  const [isLoadingProject, setIsLoadingProject] = useState(true)
  const [weeks, setWeeks] = useState<KWInfo[]>([])
  const [activeKWIndex, setActiveKWIndex] = useState(0)
  const [rows, setRows] = useState<WorkNotificationRow[]>([])
  const [activeDays, setActiveDays] = useState<Set<number>>(new Set())
  const [isLoadingRows, setIsLoadingRows] = useState(false)
  const [aaExists, setAaExists] = useState(false)
  const [showOverwriteDialog, setShowOverwriteDialog] = useState(false)
  const [zoom, setZoom] = useState(75)
  const [printedWeeks, setPrintedWeeks] = useState<Set<string>>(new Set())

  // Load printed-weeks from DB (which KWs have existing work_notifications)
  useEffect(() => {
    if (!projectId) return
    const supabase = createClient()
    supabase
      .from('work_notifications')
      .select('year, calendar_week')
      .eq('project_id', projectId)
      .then(({ data }) => {
        if (!data) return
        const keys = new Set(data.map((r: { year: number; calendar_week: number }) => `${r.year}_${r.calendar_week}`))
        setPrintedWeeks(keys)
      })
  }, [projectId])

  // Logo state
  const [aaLogo, setAaLogo] = useState<{ url: string; x: number; y: number; size: number } | null>(null)
  const [companyInfo, setCompanyInfo] = useState<{ name: string | null; adr: string | null }>({ name: null, adr: null })
  const [equipmentCategories, setEquipmentCategories] = useState<string[]>([])

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
    const kwParam = searchParams.get('kw')
    if (kwParam) {
      const idx = computedWeeks.findIndex(w => String(w.kw) === kwParam)
      setActiveKWIndex(idx >= 0 ? idx : getCurrentKWIndex(computedWeeks))
    } else {
      setActiveKWIndex(getCurrentKWIndex(computedWeeks))
    }
  }, [project, searchParams])

  // Fetch company info + logo settings
  useEffect(() => {
    async function fetchSettings() {
      try {
        const supabase = createClient()

        // Fetch company data
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

        // Fetch project_settings for logo
        const { data: settingsData } = await supabase
          .from('project_settings')
          .select('firma, adr, logo_url, logo_x, logo_y, logo_size, aa_logo_x, aa_logo_y, aa_logo_size')
          .eq('project_id', projectId)
          .single()

        // Set company info (firma/adr)
        const firma = settingsData?.firma ?? company?.name ?? project?.firm ?? null
        const adr = settingsData?.adr ?? company?.adr ?? project?.adr ?? null
        setCompanyInfo({ name: firma, adr })

        // Override project firm/adr
        if (firma || adr) {
          setProject((prev) => prev ? { ...prev, firm: firma ?? prev.firm, adr: adr ?? prev.adr } : prev)
        }

        // Fetch equipment categories for Maschinen quick buttons
        const { data: catData } = await supabase
          .from('project_categories')
          .select('label')
          .eq('project_id', projectId)
          .eq('typ', 'equipment')
          .order('sort_order', { ascending: true })
        if (catData && catData.length > 0) {
          setEquipmentCategories(catData.map((c: { label: string }) => c.label))
        }

        // Logo fallback chain for AA
        if (settingsData?.logo_url) {
          setAaLogo({
            url: settingsData.logo_url,
            x: settingsData.aa_logo_x ?? settingsData.logo_x ?? 0.5,
            y: settingsData.aa_logo_y ?? settingsData.logo_y ?? 0.5,
            size: settingsData.aa_logo_size ?? settingsData.logo_size ?? 0.2,
          })
        } else if (company?.logo_url) {
          setAaLogo({
            url: company.logo_url,
            x: settingsData?.aa_logo_x ?? settingsData?.logo_x ?? company.logo_x ?? 0.5,
            y: settingsData?.aa_logo_y ?? settingsData?.logo_y ?? company.logo_y ?? 0.5,
            size: settingsData?.aa_logo_size ?? settingsData?.logo_size ?? 0.2,
          })
        }
      } catch {
        // Ignore errors — logo is optional
      }
    }
    if (project) fetchSettings()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId, isLoadingProject])

  // Fetch work notification rows for active KW
  const fetchRows = useCallback(async () => {
    const activeWeek = weeks[activeKWIndex]
    if (!activeWeek || !project) return

    setIsLoadingRows(true)
    try {
      const supabase = createClient()
      const { data, error } = await supabase
        .from('work_notifications')
        .select('*')
        .eq('project_id', projectId)
        .eq('year', activeWeek.year)
        .eq('calendar_week', activeWeek.kw)
        .order('weekday_nr', { ascending: true })

      if (error || !data || data.length === 0) {
        setRows(buildEmptyRows(projectId, activeWeek))
        setActiveDays(new Set())
        setAaExists(false)
        return
      }

      setAaExists(true)
      // Merge fetched data with empty template (ensure all 7 days)
      const template = buildEmptyRows(projectId, activeWeek)
      const merged = template.map((emptyRow) => {
        const found = data.find((d: WorkNotificationRow) => d.weekday_nr === emptyRow.weekday_nr)
        return found ? { ...emptyRow, ...found } : emptyRow
      })
      const existingNrs = new Set(
        (data as WorkNotificationRow[]).filter(d => d.id).map(d => d.weekday_nr)
      )
      setActiveDays(existingNrs.size > 0 ? existingNrs : new Set())
      setRows(merged)
    } catch {
      const activeWeek = weeks[activeKWIndex]
      if (activeWeek) {
        setRows(buildEmptyRows(projectId, activeWeek))
      }
    } finally {
      setIsLoadingRows(false)
    }
  }, [weeks, activeKWIndex, project, projectId])

  useEffect(() => {
    if (weeks.length > 0 && project) fetchRows()
  }, [weeks, activeKWIndex, project, fetchRows])

  // Create AA for current KW (no eager DB write — first field blur saves)
  const handleCreateAA = () => {
    const activeWeek = weeks[activeKWIndex]
    if (!activeWeek) return
    setRows(buildEmptyRows(projectId, activeWeek))
    setActiveDays(new Set())
    setAaExists(true)
  }

  // Save a single row on blur
  const handleSaveRow = async (row: WorkNotificationRow) => {
    try {
      const supabase = createClient()
      const { id, ...rowData } = row
      // Remove undefined id for new rows
      const upsertData = id ? { id, ...rowData } : rowData

      await supabase
        .from('work_notifications')
        .upsert(upsertData, { onConflict: 'project_id,year,calendar_week,weekday_nr' })
    } catch {
      toast.error('Speichern fehlgeschlagen.')
    }
  }

  // Save field immediately with the new value (avoids stale-state race condition)
  const handleFieldBlur = (weekdayNr: number, field: string, value: string | null) => {
    setRows((prev) => {
      const updated = prev.map((r) => r.weekday_nr === weekdayNr ? { ...r, [field]: value } : r)
      const row = updated.find((r) => r.weekday_nr === weekdayNr)
      if (row) handleSaveRow(row)
      return updated
    })
  }

  // Batch-Update: Schichtzeiten in einem einzigen DB-Write setzen (verhindert Race Condition)
  const handleSetShiftTimes = (weekdayNr: number, fields: Record<string, string>) => {
    setRows((prev) => {
      const updated = prev.map((r) => r.weekday_nr === weekdayNr ? { ...r, ...fields } : r)
      const row = updated.find((r) => r.weekday_nr === weekdayNr)
      if (row) handleSaveRow(row)
      return updated
    })
  }

  // Clear both time fields for a shift type atomically
  const handleClearShiftType = (weekdayNr: number, type: 'day' | 'night') => {
    const startField = type === 'day' ? 'day_start' : 'night_start'
    const endField = type === 'day' ? 'day_end' : 'night_end'
    setRows((prev) => {
      const updated = prev.map((r) =>
        r.weekday_nr === weekdayNr ? { ...r, [startField]: null, [endField]: null } : r
      )
      const row = updated.find((r) => r.weekday_nr === weekdayNr)
      if (row) handleSaveRow(row)
      return updated
    })
  }

  // Update a field in a row (local state + save)
  const handleUpdateRow = (weekdayNr: number, field: string, value: string | boolean | null) => {
    setRows((prev) =>
      prev.map((r) => {
        if (r.weekday_nr !== weekdayNr) return r
        const updated = { ...r, [field]: value }
        // Auto-save on blur is handled by the component calling handleSaveRow
        return updated
      })
    )
  }

  const handleBlurSave = (weekdayNr: number) => {
    const row = rows.find((r) => r.weekday_nr === weekdayNr)
    if (row) handleSaveRow(row)
  }

  // Remove a day: collapse it and delete from DB
  const handleRemoveDay = async (weekdayNr: number) => {
    setActiveDays((prev) => {
      const next = new Set(prev)
      next.delete(weekdayNr)
      return next
    })
    setRows((prev) => prev.map((r) =>
      r.weekday_nr === weekdayNr
        ? { ...r, id: undefined, day_start: null, day_end: null, night_start: null, night_end: null,
            location: null, bauspitzen: '1', workers: '5', machines: null,
            work_description: null, site_manager: null,
            safety_plan_enabled: false, safety_plan_number: null,
            track_work_enabled: false, betra_number: null }
        : r
    ))
    try {
      const activeWeek = weeks[activeKWIndex]
      if (!activeWeek) return
      const supabase = createClient()
      await supabase.from('work_notifications')
        .delete()
        .eq('project_id', projectId)
        .eq('year', activeWeek.year)
        .eq('calendar_week', activeWeek.kw)
        .eq('weekday_nr', weekdayNr)
    } catch {
      toast.error('Fehler beim Entfernen des Tages.')
    }
  }

  // Activate a day and optionally copy from the last active day before it
  const handleAddDay = (weekdayNr: number, copyFromPrevious: boolean) => {
    setActiveDays((prev) => new Set([...prev, weekdayNr]))
    if (copyFromPrevious) {
      setRows((prev) => {
        const prevRow = [...prev]
          .filter(r => activeDays.has(r.weekday_nr) && r.weekday_nr < weekdayNr)
          .sort((a, b) => b.weekday_nr - a.weekday_nr)[0]
        if (!prevRow) return prev
        const updated = prev.map((r) =>
          r.weekday_nr === weekdayNr
            ? {
                ...r,
                day_start: prevRow.day_start, day_end: prevRow.day_end,
                night_start: prevRow.night_start, night_end: prevRow.night_end,
                location: prevRow.location, bauspitzen: prevRow.bauspitzen,
                workers: prevRow.workers, machines: prevRow.machines,
                work_description: prevRow.work_description, site_manager: prevRow.site_manager,
                safety_plan_enabled: prevRow.safety_plan_enabled, safety_plan_number: prevRow.safety_plan_number,
                track_work_enabled: prevRow.track_work_enabled, betra_number: prevRow.betra_number,
              }
            : r
        )
        const newRow = updated.find((r) => r.weekday_nr === weekdayNr)
        if (newRow) handleSaveRow(newRow)
        return updated
      })
    }
  }

  const handleCheckboxChange = (weekdayNr: number, field: string, value: boolean) => {
    handleUpdateRow(weekdayNr, field, value)
    // Save immediately for checkbox
    setTimeout(() => {
      const row = rows.find((r) => r.weekday_nr === weekdayNr)
      if (row) {
        const updated = { ...row, [field]: value }
        handleSaveRow(updated)
      }
    }, 0)
  }

  // Copy previous week
  const handleCopyPreviousWeek = async () => {
    if (activeKWIndex <= 0) {
      toast.error('Keine vorherige Woche vorhanden.')
      return
    }

    const prevWeek = weeks[activeKWIndex - 1]
    const currentWeek = weeks[activeKWIndex]
    if (!prevWeek || !currentWeek) return

    try {
      const supabase = createClient()
      const { data: prevData, error: prevError } = await supabase
        .from('work_notifications')
        .select('*')
        .eq('project_id', projectId)
        .eq('year', prevWeek.year)
        .eq('calendar_week', prevWeek.kw)
        .order('weekday_nr', { ascending: true })

      if (prevError || !prevData || prevData.length === 0) {
        toast.error(`Keine Arbeitsanmeldung für KW ${prevWeek.kw} vorhanden.`)
        return
      }

      // Only ask for confirmation if AA already exists with data
      if (aaExists) {
        setShowOverwriteDialog(true)
        return
      }

      await doCopyPreviousWeek(prevData, currentWeek)
    } catch {
      toast.error('Fehler beim Laden der Vorwoche.')
    }
  }

  const doCopyPreviousWeek = async (prevData: WorkNotificationRow[], currentWeek: KWInfo) => {
    try {
      const supabase = createClient()
      const newRows = prevData.map((row) => {
        const day = addDays(currentWeek.weekStart, row.weekday_nr - 1)
        return {
          project_id: projectId,
          calendar_week: currentWeek.kw,
          year: currentWeek.year,
          weekday_nr: row.weekday_nr,
          weekday_name: row.weekday_name,
          date: toDateString(day),
          day_start: row.day_start,
          day_end: row.day_end,
          night_start: row.night_start,
          night_end: row.night_end,
          location: row.location,
          bauspitzen: row.bauspitzen,
          workers: row.workers,
          machines: row.machines,
          work_description: row.work_description,
          site_manager: row.site_manager,
          safety_plan_enabled: row.safety_plan_enabled,
          safety_plan_number: row.safety_plan_number,
          track_work_enabled: row.track_work_enabled,
          betra_number: row.betra_number,
        }
      })

      const { error } = await supabase
        .from('work_notifications')
        .upsert(newRows, { onConflict: 'project_id,year,calendar_week,weekday_nr' })

      if (error) {
        toast.error('Fehler beim Kopieren der Vorwoche.')
        return
      }

      toast.success(`Daten aus KW ${weeks[activeKWIndex - 1]?.kw} übernommen.`)
      fetchRows()
    } catch {
      toast.error('Fehler beim Kopieren der Vorwoche.')
    }
  }

  const handleConfirmOverwrite = async () => {
    setShowOverwriteDialog(false)
    const prevWeek = weeks[activeKWIndex - 1]
    const currentWeek = weeks[activeKWIndex]
    if (!prevWeek || !currentWeek) return

    try {
      const supabase = createClient()
      const { data: prevData } = await supabase
        .from('work_notifications')
        .select('*')
        .eq('project_id', projectId)
        .eq('year', prevWeek.year)
        .eq('calendar_week', prevWeek.kw)
        .order('weekday_nr', { ascending: true })

      if (prevData && prevData.length > 0) {
        await doCopyPreviousWeek(prevData, currentWeek)
      }
    } catch {
      toast.error('Fehler beim Kopieren der Vorwoche.')
    }
  }

  // Delete AA for current KW
  const handleDeleteAA = async () => {
    const activeWeek = weeks[activeKWIndex]
    if (!activeWeek) return
    try {
      const supabase = createClient()
      await supabase.from('work_notifications')
        .delete()
        .eq('project_id', projectId)
        .eq('year', activeWeek.year)
        .eq('calendar_week', activeWeek.kw)
      setAaExists(false)
      setActiveDays(new Set())
      setRows(buildEmptyRows(projectId, activeWeek))
      // Druckstatus zurücksetzen
      const key = `${activeWeek.year}_${activeWeek.kw}`
      setPrintedWeeks((prev) => {
        const next = new Set([...prev])
        next.delete(key)
        return next
      })
      toast.success('Arbeitsanmeldung gelöscht.')
    } catch {
      toast.error('Fehler beim Löschen.')
    }
  }

  // Print function — WYSIWYG via PaperEngine (@media print)
  const handlePrint = () => {
    if (activeDays.size === 0) {
      toast.warning('Keine aktiven Tage zum Drucken.')
      return
    }
    const activeWeek = weeks[activeKWIndex]
    const prevTitle = document.title
    if (activeWeek) {
      document.title = `Arbeitsanmeldung KW ${activeWeek.kw} ${project?.name || ''}`.trim()
    }
    window.print()
    // Restore title after print dialog closes
    window.addEventListener('afterprint', () => { document.title = prevTitle }, { once: true })
    if (activeWeek) {
      const key = `${activeWeek.year}_${activeWeek.kw}`
      setPrintedWeeks((prev) => new Set([...prev, key]))
    }
  }

  // Determine which days are out of range
  const activeWeek = weeks[activeKWIndex]
  const disabledDays = new Set<number>()
  if (activeWeek && project?.lz_von && project?.lz_bis) {
    for (let i = 0; i < 7; i++) {
      const day = addDays(activeWeek.weekStart, i)
      const dateStr = toDateString(day)
      if (dateStr < project.lz_von || dateStr > project.lz_bis) {
        disabledDays.add(i + 1)
      }
    }
  }

  // Status-Rechteck für KW-Chips: gelber Rahmen = nicht gedruckt, gefüllt = gedruckt
  const renderWeekStatus = (week: KWInfo) => {
    const key = `${week.year}_${week.kw}`
    const printed = printedWeeks.has(key)
    return (
      <div style={{
        marginTop: '4px',
        width: '52px', height: '12px',
        border: printed ? 'none' : '1px solid #555',
        background: printed ? '#e8c547' : 'transparent',
        borderRadius: '2px',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
          <polyline
            points="1,4 4,7 9,1"
            stroke={printed ? '#1a2040' : '#555'}
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>
    )
  }

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
          <Skeleton className="h-96 w-full rounded-lg" />
        </div>
      </div>
    )
  }

  // Error state
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

  // No Leistungszeitraum
  if (!project.lz_von || !project.lz_bis) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
        <ProjectDetailHeader project={project} isLoading={false} />
        <div className="container mx-auto px-4 py-16 md:px-6 text-center">
          <AlertCircle className="mx-auto h-12 w-12 text-primary mb-4" />
          <h2 className="text-lg font-semibold mb-2">Leistungszeitraum nicht festgelegt</h2>
          <p className="text-muted-foreground">
            Bitte lege den Leistungszeitraum in den Projekteinstellungen fest.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-background" style={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
      <ProjectDetailHeader project={project} isLoading={false} />

      <div style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
        <KWNavigation
          weeks={weeks}
          activeIndex={activeKWIndex}
          onSelectWeek={(idx) => {
            setActiveKWIndex(idx)
            const kw = weeks[idx]?.kw
            if (kw) router.replace(`/projekte/${projectId}/arbeitsanmeldung?kw=${kw}`, { scroll: false })
          }}
          shifts={[]}
          zoom={zoom}
          onZoomChange={setZoom}
          onPrintKW={handlePrint}
          lzVon={project.lz_von}
          lzBis={project.lz_bis}
          printLabel="AA drucken"
          compactPrint={false}
          onDeleteKW={undefined}
          renderWeekStatus={renderWeekStatus}
        />

        <div style={{ flex: 1, overflow: 'auto', padding: '20px' }}>
          {isLoadingRows ? (
            <Skeleton className="h-96 w-full rounded-lg" />
          ) : aaExists ? (
            <PaperEngine
              orientation="landscape"
              zoom={zoom}
              onPrint={handlePrint}
              onDelete={handleDeleteAA}
            >
              <WorkNotificationTable
                rows={rows}
                week={activeWeek ?? null}
                project={project}
                logo={aaLogo}
                companyInfo={companyInfo}
                disabledDays={disabledDays}
                activeDays={activeDays}
                equipmentCategories={equipmentCategories}
                onUpdateRow={handleUpdateRow}
                onBlurSave={handleBlurSave}
                onFieldBlur={handleFieldBlur}
                onClearShift={handleClearShiftType}
                onSetShiftTimes={handleSetShiftTimes}
                onCheckboxChange={handleCheckboxChange}
                onAddDay={handleAddDay}
                onRemoveDay={handleRemoveDay}
              />
            </PaperEngine>
          ) : (
            <div style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
              minHeight: '60vh', gap: '12px',
            }}>
              <div style={{ fontSize: '32px', marginBottom: '4px' }}>📋</div>
              <div style={{ fontSize: '15px', fontWeight: 600, color: 'hsl(var(--foreground))' }}>
                Keine Arbeitsanmeldung für KW {activeWeek?.kw}
              </div>
              <div style={{ fontSize: '13px', color: 'hsl(var(--muted-foreground))', marginBottom: '8px' }}>
                Lege eine neue Arbeitsanmeldung an oder übernimm die Vorwoche.
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'stretch', gap: '12px' }}>
                <button
                  onClick={handleCreateAA}
                  style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                    padding: '10px 20px', borderRadius: '6px',
                    border: '1px solid rgba(232,197,71,.4)', background: 'rgba(232,197,71,.12)',
                    color: '#e8c547', fontSize: '13px', fontWeight: 600, cursor: 'pointer',
                  }}
                >
                  Arbeitsanmeldung anlegen
                </button>
                {activeKWIndex > 0 && (
                  <button
                    onClick={handleCopyPreviousWeek}
                    style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                      padding: '10px 20px', borderRadius: '6px',
                      border: '1px solid hsl(var(--border))', background: 'hsl(var(--card))',
                      color: 'hsl(var(--foreground))', fontSize: '13px', fontWeight: 500, cursor: 'pointer',
                    }}
                  >
                    <Copy size={14} />
                    Aus Vorwoche übernehmen
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      <AlertDialog open={showOverwriteDialog} onOpenChange={setShowOverwriteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Vorhandene Daten überschreiben?</AlertDialogTitle>
            <AlertDialogDescription>
              KW {activeWeek?.kw} enthält bereits Daten. Sollen diese mit den Daten aus KW {weeks[activeKWIndex - 1]?.kw} überschrieben werden?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Abbrechen</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmOverwrite}>
              Überschreiben
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

