'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { ArrowLeft, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { SettingsSection } from '@/components/settings-section'
import { CategoryManager } from '@/components/category-manager'
import { BtbPreviewCard } from '@/components/btb-preview-card'
import { createClient } from '@/lib/supabase'
import type { Project } from '@/lib/validations/project'
import type { ProjectSettings, ProjectCategory } from '@/lib/validations/project-settings'
import { DEFAULT_PROJECT_SETTINGS } from '@/lib/validations/project-settings'
import { toast } from 'sonner'

const PERSONAL_PRESETS = ['Bauleiter', 'Polier', 'Vorarbeiter', 'Facharbeiter']
const EQUIPMENT_PRESETS = ['ZWB', 'Wanne + Wagen', 'Kettenbagger', 'Radlader']

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

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault()
    const newPct = interact(e.clientX)
    const onMove = (ev: MouseEvent) => interact(ev.clientX)
    const onUp = () => {
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
      if (newPct !== undefined) onCommit(newPct / 100)
    }
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
  const projectId = params.id as string
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
  const handleLogoPositionSave = useCallback(async () => {
    try {
      const supabase = createClient()
      await supabase
        .from('project_settings')
        .update({ logo_x: settings.logo_x, logo_y: settings.logo_y })
        .eq('project_id', projectId)
    } catch {
      toast.error('Speichern fehlgeschlagen.')
    }
  }, [projectId, settings.logo_x, settings.logo_y])

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
            onClick={() => router.push(`/projekte/${projectId}`)}
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
          </div>

          {/* Right column: Live preview (sticky) */}
          <div className="lg:col-span-2 lg:sticky lg:top-6">
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
          </div>
        </div>
      </main>
    </div>
  )
}
