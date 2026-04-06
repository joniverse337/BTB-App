'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import { ArrowLeft, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { SettingsSection } from '@/components/settings-section'
import { CategoryManager } from '@/components/category-manager'
import { BtbPreviewCard } from '@/components/btb-preview-card'
import { PaperEngine } from '@/components/paper-engine'
import { WorkNotificationTable } from '@/components/work-notification-table'
import { createClient } from '@/lib/supabase'
import type { Project } from '@/lib/validations/project'
import type { ProjectSettings, ProjectCategory } from '@/lib/validations/project-settings'
import { DEFAULT_PROJECT_SETTINGS } from '@/lib/validations/project-settings'
import type { WorkNotificationRow } from '@/lib/validations/work-notification'
import type { KWInfo } from '@/lib/kw-utils'
import { toast } from 'sonner'
import { PERSONAL_PRESETS, EQUIPMENT_PRESETS, WEEKDAY_NAMES } from '@/lib/constants'

const DEMO_WEEK: KWInfo = {
  kw: 15,
  year: 2026,
  weekStart: new Date(2026, 3, 6),
  weekEnd: new Date(2026, 3, 12),
  daysInRange: [],
  label: 'KW 15',
  dateRange: '06.–12. Apr',
}

const DEMO_ROWS: WorkNotificationRow[] = Array.from({ length: 7 }, (_, i) => ({
  project_id: '',
  calendar_week: 15,
  year: 2026,
  weekday_nr: i + 1,
  weekday_name: WEEKDAY_NAMES[i],
  date: `2026-04-${String(6 + i).padStart(2, '0')}`,
  day_start: null, day_end: null, night_start: null, night_end: null,
  location: null, bauspitzen: null, workers: null, machines: null,
  work_description: null, site_manager: null,
  safety_plan_enabled: false, safety_plan_number: null,
  track_work_enabled: false, betra_number: null,
}))

// ZoomSlider-style logo size control
function LogoSizeControl({
  value,
  onChange,
  onCommit,
}: {
  value: number
  onChange: (v: number) => void
  onCommit: (v: number) => void
}) {
  const ref = useRef<HTMLDivElement>(null)
  const MIN = 5
  const MAX = 50
  const pct = Math.round(value * 100)
  const ratio = (pct - MIN) / (MAX - MIN)

  const interact = useCallback((clientX: number) => {
    if (!ref.current) return
    const rect = ref.current.getBoundingClientRect()
    const r = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width))
    const newPct = Math.round(MIN + r * (MAX - MIN))
    onChange(newPct / 100)
    return newPct
  }, [onChange])

  const listenersRef = useRef<{ onMove: (ev: MouseEvent) => void; onUp: () => void } | null>(null)

  useEffect(() => {
    // Cleanup on unmount to prevent memory leaks
    return () => {
      if (listenersRef.current) {
        window.removeEventListener('mousemove', listenersRef.current.onMove)
        window.removeEventListener('mouseup', listenersRef.current.onUp)
        listenersRef.current = null
      }
    }
  }, [])

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault()
    const newPct = interact(e.clientX)
    const onMove = (ev: MouseEvent) => interact(ev.clientX)
    const onUp = () => {
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
      listenersRef.current = null
      if (newPct !== undefined) onCommit(newPct / 100)
    }
    listenersRef.current = { onMove, onUp }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
  }

  return (
    <div
      ref={ref}
      onMouseDown={handleMouseDown}
      className="relative w-fit rounded-md border border-[#e8c547]/50 bg-card cursor-pointer select-none overflow-hidden py-1.5 px-3 flex items-center gap-3"
    >
      {/* Gold fill */}
      <div
        style={{
          width: `${ratio * 100}%`,
          position: 'absolute',
          inset: 0,
          background: '#e8c547',
          opacity: 0.15,
          borderRadius: 'inherit',
        }}
      />
      <span className="relative text-[10px] font-semibold text-[#e8c547]">Logo-Größe</span>
      <span className="relative text-[10px] font-mono text-[#e8c547]">{pct}%</span>
    </div>
  )
}

export default function ProjectSettingsPage() {
  const params = useParams()
  const router = useRouter()
  const searchParams = useSearchParams()
  const projectId = params.id as string
  const fromAA = searchParams.get('from') === 'arbeitsanmeldung'
  const kwParam = searchParams.get('kw')
  const backHref = fromAA
    ? `/projekte/${projectId}/arbeitsanmeldung${kwParam ? `?kw=${kwParam}` : ''}`
    : `/projekte/${projectId}`
  const seededRef = useRef(false)

  // State
  const [project, setProject] = useState<Project | null>(null)
  const [settings, setSettings] = useState<ProjectSettings>({
    project_id: projectId,
    ...DEFAULT_PROJECT_SETTINGS,
  })
  const [categories, setCategories] = useState<ProjectCategory[]>([])
  const [companyFallback, setCompanyFallback] = useState<{ firma: string | null; adr: string | null; logoUrl: string | null } | undefined>(undefined)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [previewMode, setPreviewMode] = useState<'btb' | 'aa'>('btb')

  // Fetch project + settings + categories
  useEffect(() => {
    async function fetchData() {
      setIsLoading(true)
      setError(null)

      try {
        const supabase = createClient()

        // Fetch project
        const { data: projectData, error: projectError } = await supabase
          .from('projects')
          .select('*')
          .eq('id', projectId)
          .single()

        if (projectError || !projectData) {
          setError('Projekt nicht gefunden')
          setIsLoading(false)
          return
        }

        setProject(projectData as Project)

        // Fetch company data for preview fallback
        const { data: { user } } = await supabase.auth.getUser()
        if (user) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('company_id')
            .eq('user_id', user.id)
            .single()

          if (profile?.company_id) {
            const { data: company } = await supabase
              .from('companies')
              .select('name, adr, logo_url')
              .eq('id', profile.company_id)
              .single()

            if (company) {
              setCompanyFallback({
                firma: company.name ?? null,
                adr: company.adr ?? null,
                logoUrl: company.logo_url ?? null,
              })
            }
          }
        }

        // Fetch settings (lazy create: if not exists, use defaults)
        const { data: settingsData } = await supabase
          .from('project_settings')
          .select('*')
          .eq('project_id', projectId)
          .single()

        if (settingsData) {
          setSettings(settingsData as ProjectSettings)
        } else {
          const defaultSettings = {
            project_id: projectId,
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
          const { data: created } = await supabase
            .from('project_settings')
            .upsert(defaultSettings)
            .select()
            .single()

          if (created) {
            setSettings(created as ProjectSettings)
          } else {
            setSettings(defaultSettings)
          }
        }

        // Fetch categories
        const { data: catData } = await supabase
          .from('project_categories')
          .select('*')
          .eq('project_id', projectId)
          .order('sort_order', { ascending: true })

        const existingCats = (catData as ProjectCategory[]) ?? []

        // Seed presets if categories don't exist yet for a type (guard against StrictMode double-invoke)
        const needsPersonal = !existingCats.some((c) => c.typ === 'personal')
        const needsEquipment = !existingCats.some((c) => c.typ === 'equipment')

        if ((needsPersonal || needsEquipment) && !seededRef.current) {
          seededRef.current = true
          const seedInserts: { project_id: string; typ: 'personal' | 'equipment'; label: string; sort_order: number }[] = []

          if (needsPersonal) {
            PERSONAL_PRESETS.forEach((label, i) => seedInserts.push({ project_id: projectId, typ: 'personal', label, sort_order: i + 1 }))
          }
          if (needsEquipment) {
            EQUIPMENT_PRESETS.forEach((label, i) => seedInserts.push({ project_id: projectId, typ: 'equipment', label, sort_order: i + 1 }))
          }

          const { data: seeded } = await supabase
            .from('project_categories')
            .insert(seedInserts)
            .select()

          const seededCats = (seeded as ProjectCategory[]) ?? []
          const unseeded = existingCats.filter(c => !seedInserts.some(s => s.typ === c.typ))
          setCategories([...unseeded, ...seededCats])
        } else {
          setCategories(existingCats)
        }
      } catch {
        setError('Fehler beim Laden der Einstellungen')
      } finally {
        setIsLoading(false)
      }
    }

    fetchData()
  }, [projectId])

  // Save settings field on blur
  const saveField = useCallback(async (field: keyof ProjectSettings, value: string | number | null) => {
    setSettings((prev) => ({ ...prev, [field]: value }))

    try {
      const supabase = createClient()
      await supabase
        .from('project_settings')
        .update({ [field]: value })
        .eq('project_id', projectId)
    } catch {
      toast.error('Speichern fehlgeschlagen.')
    }
  }, [projectId])

  // Logo position change (from drag on preview)
  const handleLogoPositionChange = useCallback((x: number, y: number) => {
    setSettings((prev) => ({ ...prev, logo_x: x, logo_y: y }))
  }, [])

  // Save logo position on mouse up
  const handleLogoPositionSave = useCallback(async (x: number, y: number) => {
    try {
      const supabase = createClient()
      await supabase
        .from('project_settings')
        .update({ logo_x: x, logo_y: y })
        .eq('project_id', projectId)
    } catch {
      toast.error('Speichern fehlgeschlagen.')
    }
  }, [projectId])

  // AA logo position change (from drag on AA preview)
  const handleAaLogoPositionChange = useCallback((x: number, y: number) => {
    setSettings((prev) => ({ ...prev, aa_logo_x: x, aa_logo_y: y }))
  }, [])

  // Save AA logo position on mouse up
  const handleAaLogoPositionSave = useCallback(async (x: number, y: number) => {
    try {
      const supabase = createClient()
      await supabase
        .from('project_settings')
        .update({ aa_logo_x: x, aa_logo_y: y })
        .eq('project_id', projectId)
    } catch {
      toast.error('Speichern fehlgeschlagen.')
    }
  }, [projectId])

  // Category add
  const handleAddCategory = useCallback(async (typ: 'personal' | 'equipment', label: string) => {
    try {
      const supabase = createClient()
      const maxOrder = categories
        .filter((c) => c.typ === typ)
        .reduce((max, c) => Math.max(max, c.sort_order), 0)

      const { data, error: insertError } = await supabase
        .from('project_categories')
        .insert({
          project_id: projectId,
          typ,
          label,
          sort_order: maxOrder + 1,
        })
        .select()
        .single()

      if (insertError || !data) return

      setCategories((prev) => [...prev, data as ProjectCategory])
    } catch {
      toast.error('Speichern fehlgeschlagen.')
    }
  }, [projectId, categories])

  // Category delete
  const handleDeleteCategory = useCallback(async (id: string) => {
    setCategories((prev) => prev.filter((c) => c.id !== id))

    try {
      const supabase = createClient()
      await supabase.from('project_categories').delete().eq('id', id)
    } catch {
      toast.error('Speichern fehlgeschlagen.')
    }
  }, [])

  const hasLogo = !!(settings.logo_url || companyFallback?.logoUrl)
  const workerCategories = categories.filter((c) => c.typ === 'personal').map((c) => c.label)
  const equipmentCategories = categories.filter((c) => c.typ === 'equipment').map((c) => c.label)

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen">
        <header className="border-b">
          <div className="container mx-auto flex items-center gap-4 px-4 py-4 md:px-6">
            <Skeleton className="h-8 w-8 rounded" />
            <Skeleton className="h-6 w-48" />
          </div>
        </header>
        <main className="container mx-auto px-4 py-6 md:px-6 md:py-8">
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
            <div className="space-y-6 lg:col-span-3">
              <Skeleton className="h-64 rounded-lg" />
              <Skeleton className="h-48 rounded-lg" />
            </div>
            <div className="lg:col-span-2">
              <Skeleton className="aspect-[210/297] rounded-lg" />
            </div>
          </div>
        </main>
      </div>
    )
  }

  // Error state
  if (error || !project) {
    return (
      <div className="min-h-screen">
        <header className="border-b">
          <div className="container mx-auto flex items-center gap-4 px-4 py-4 md:px-6">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => router.push('/projekte')}
              aria-label="Zurück zu Projekte"
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <h1 className="text-xl font-bold">Projekteinstellungen</h1>
          </div>
        </header>
        <div className="container mx-auto px-4 py-16 text-center md:px-6">
          <AlertCircle className="mx-auto mb-4 h-12 w-12 text-destructive" />
          <h2 className="mb-2 text-lg font-semibold">
            {error || 'Projekt nicht gefunden'}
          </h2>
          <p className="text-muted-foreground">
            Das Projekt existiert nicht oder du hast keinen Zugriff.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="border-b">
        <div className="container mx-auto flex items-center gap-4 px-4 py-4 md:px-6">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.push(backHref)}
            aria-label="Zurück zum Projekt"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-xl font-bold">
              <span className="text-primary">BTB</span>{' '}
              {project.name} - Einstellungen
            </h1>
          </div>
        </div>
      </header>

      {/* Main content: 2-column layout */}
      <main className="container mx-auto px-4 py-6 md:px-6 md:py-8">
        <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-5">
          {/* Left column: Settings forms */}
          <div className="space-y-6 lg:col-span-3">

            {/* BTB-Vorlage */}
            <SettingsSection
              title="BTB-Vorlage"
              description="Diese Einstellungen gelten für alle BTBs dieses Projekts."
            >
              <div className="space-y-6">
                {/* Logo size */}
                <div className="space-y-3">
                  <p className="text-sm text-muted-foreground">
                    Firmenname, Adresse und Logo werden aus den{' '}
                    <a href="/einstellungen" className="underline underline-offset-2 hover:text-foreground">
                      Account-Einstellungen
                    </a>{' '}
                    übernommen.
                  </p>

                  {hasLogo && (
                    <div className="space-y-1.5">
                      <LogoSizeControl
                        value={settings.logo_size}
                        onChange={(v) => setSettings((prev) => ({ ...prev, logo_size: v }))}
                        onCommit={(v) => saveField('logo_size', v)}
                      />
                      <p className="text-xs text-muted-foreground">
                        Logo auf der Vorschau ziehen, um die Position zu ändern.
                      </p>
                    </div>
                  )}
                </div>

                {/* Separator */}
                <div className="border-t" />

                {/* Categories */}
                <CategoryManager
                  categories={categories}
                  onAdd={handleAddCategory}
                  onDelete={handleDeleteCategory}
                />
              </div>
            </SettingsSection>

            {/* Arbeitsanmeldung */}
            {/* eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-static-element-interactions */}
            <div onClick={() => setPreviewMode('aa')}>
            <SettingsSection
              title="Arbeitsanmeldung"
              description="Logo-Position und -Größe auf der Arbeitsanmeldung (A4 Querformat). Wenn nicht gesetzt, werden die BTB-Einstellungen übernommen."
            >
              {hasLogo ? (
                <div className="space-y-3">
                  <LogoSizeControl
                    value={settings.aa_logo_size ?? settings.logo_size}
                    onChange={(v) => setSettings((prev) => ({ ...prev, aa_logo_size: v }))}
                    onCommit={(v) => saveField('aa_logo_size', v)}
                  />
                  <p className="text-xs text-muted-foreground">
                    Logo auf der Vorschau ziehen, um die Position zu ändern.{' '}
                    {settings.aa_logo_x === null && (
                      <span className="text-muted-foreground/60">
                        Aktuell wird die BTB-Position übernommen.
                      </span>
                    )}
                  </p>
                  {settings.aa_logo_x !== null && (
                    <button
                      onClick={() => {
                        setSettings((prev) => ({ ...prev, aa_logo_x: null, aa_logo_y: null, aa_logo_size: null }))
                        const supabase = createClient()
                        supabase.from('project_settings').update({ aa_logo_x: null, aa_logo_y: null, aa_logo_size: null }).eq('project_id', projectId)
                      }}
                      className="text-xs text-muted-foreground underline underline-offset-2 hover:text-foreground"
                    >
                      Zurücksetzen (BTB-Einstellungen übernehmen)
                    </button>
                  )}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Kein Logo vorhanden. Logo in den{' '}
                  <a href="/einstellungen" className="underline underline-offset-2 hover:text-foreground">
                    Account-Einstellungen
                  </a>{' '}
                  hochladen.
                </p>
              )}
            </SettingsSection>
            </div>
          </div>

          {/* Right column: Live preview (sticky) */}
          <div className="lg:col-span-2 lg:sticky lg:top-6 space-y-3">
            {/* Preview toggle */}
            <div
              className="relative flex w-fit rounded-md border border-[#e8c547]/50 bg-card cursor-pointer select-none overflow-hidden"
            >
              {(['btb', 'aa'] as const).map((mode) => (
                <button
                  key={mode}
                  onClick={() => setPreviewMode(mode)}
                  className="relative z-10 px-3 py-1.5 text-[10px] font-semibold transition-colors"
                  style={{
                    color: previewMode === mode ? '#0e1118' : '#e8c547',
                    background: previewMode === mode ? '#e8c547' : 'transparent',
                  }}
                >
                  {mode === 'btb' ? 'BTB' : 'Arbeitsanmeldung'}
                </button>
              ))}
            </div>

            {previewMode === 'btb' ? (
              <BtbPreviewCard
                settings={settings}
                projectName={project.name}
                projectNr={project.nr}
                projectAg={project.ag}
                onLogoPositionChange={handleLogoPositionChange}
                onLogoPositionSave={handleLogoPositionSave}
                companyFallback={companyFallback}
                workerCategories={workerCategories}
                equipmentCategories={equipmentCategories}
              />
            ) : (
              <div style={{ width: '100%', overflow: 'hidden', borderRadius: '4px' }}>
                <PaperEngine orientation="landscape" zoom={38} onPrint={() => {}}>
                  <WorkNotificationTable
                    rows={DEMO_ROWS}
                    week={DEMO_WEEK}
                    project={project}
                    logo={
                      (settings.logo_url || companyFallback?.logoUrl)
                        ? {
                            url: (settings.logo_url || companyFallback?.logoUrl)!,
                            x: settings.aa_logo_x ?? settings.logo_x,
                            y: settings.aa_logo_y ?? settings.logo_y,
                            size: settings.aa_logo_size ?? settings.logo_size,
                          }
                        : null
                    }
                    companyInfo={{
                      name: settings.firma || companyFallback?.firma || null,
                      adr: settings.adr || companyFallback?.adr || null,
                    }}
                    disabledDays={new Set()}
                    activeDays={new Set()}
                    equipmentCategories={equipmentCategories}
                    onLogoPositionChange={handleAaLogoPositionChange}
                    onLogoPositionSave={handleAaLogoPositionSave}
                    onUpdateRow={() => {}}
                    onBlurSave={() => {}}
                    onFieldBlur={() => {}}
                    onClearShift={() => {}}
                    onCheckboxChange={() => {}}
                    onAddDay={() => {}}
                    onRemoveDay={() => {}}
                  />
                </PaperEngine>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}
