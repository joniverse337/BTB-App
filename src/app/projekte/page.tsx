'use client'

import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { Plus, LogOut, Settings, AlertCircle, RefreshCw } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogCancel,
} from '@/components/ui/alert-dialog'
import { ProjectCard } from '@/components/project-card'
import { ProjectFormDialog } from '@/components/project-form-dialog'
import { ProjectsEmptyState } from '@/components/projects-empty-state'
import { createClient } from '@/lib/supabase'
import type { Project, ProjectFormData } from '@/lib/validations/project'

export default function ProjektePage() {
  const router = useRouter()
  const [projects, setProjects] = useState<Project[]>([])
  const [isLoading, setIsLoading] = useState(true)

  // Dialog state
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingProject, setEditingProject] = useState<Project | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)

  // Leistungszeitraum warning state
  const [shiftWarning, setShiftWarning] = useState<{
    count: number
    pendingData: ProjectFormData
  } | null>(null)

  const fetchProjects = useCallback(async () => {
    setIsLoading(true)

    try {
      const supabase = createClient()
      const { data, error: fetchError } = await supabase
        .from('projects')
        .select('*, shifts(count)')
        .order('created_at', { ascending: false })

      if (fetchError) {
        setProjects([])
        return
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const projectsWithCounts: Project[] = (data ?? []).map((p: any) => ({
        ...p,
        btb_count: p.shifts?.[0]?.count ?? 0,
        shifts: undefined,
      }))

      setProjects(projectsWithCounts)
    } catch {
      setProjects([])
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchProjects()
  }, [fetchProjects])

  function handleCreateClick() {
    setEditingProject(null)
    setSaveError(null)
    setDialogOpen(true)
  }

  function handleEditClick(project: Project) {
    setEditingProject(project)
    setSaveError(null)
    setDialogOpen(true)
  }

  function handleProjectClick(project: Project) {
    router.push(`/projekte/${project.id}`)
  }

  async function handleDelete(project: Project) {
    try {
      const supabase = createClient()
      const { error: deleteError } = await supabase
        .from('projects')
        .delete()
        .eq('id', project.id)

      if (deleteError) throw deleteError

      setProjects((prev) => prev.filter((p) => p.id !== project.id))
      setSaveError(null)
    } catch (err) {
      void err
      setSaveError('Projekt konnte nicht gelöscht werden. Bitte versuche es erneut.')
    }
  }

  async function handleSubmit(data: ProjectFormData) {
    setIsSubmitting(true)
    setSaveError(null)

    try {
      const supabase = createClient()

      const cleanedData = {
        name: data.name,
        nr: data.nr || null,
        ag: data.ag || null,
        lz_von: data.lz_von || null,
        lz_bis: data.lz_bis || null,
      }

      if (editingProject) {
        // Check if new period would hide existing shifts
        const filters: string[] = []
        if (cleanedData.lz_von) filters.push(`datum.lt.${cleanedData.lz_von}`)
        if (cleanedData.lz_bis) filters.push(`datum.gt.${cleanedData.lz_bis}`)

        if (filters.length > 0) {
          const { count } = await supabase
            .from('shifts')
            .select('*', { count: 'exact', head: true })
            .eq('project_id', editingProject.id)
            .or(filters.join(','))

          if ((count ?? 0) > 0) {
            setShiftWarning({ count: count!, pendingData: data })
            setIsSubmitting(false)
            return
          }
        }

        const { error: updateError } = await supabase
          .from('projects')
          .update(cleanedData)
          .eq('id', editingProject.id)

        if (updateError) throw updateError
      } else {
        const { data: { user } } = await supabase.auth.getUser()

        const { data: profile } = await supabase
          .from('profiles')
          .select('company_id')
          .eq('user_id', user?.id)
          .single()

        const { error: insertError } = await supabase
          .from('projects')
          .insert({ ...cleanedData, created_by: user?.id, company_id: profile?.company_id ?? null })

        if (insertError) throw insertError
      }

      setDialogOpen(false)
      setEditingProject(null)
      await fetchProjects()
    } catch (err) {
      void err
      setSaveError('Projekt konnte nicht gespeichert werden. Bitte versuche es erneut.')
    } finally {
      setIsSubmitting(false)
    }
  }

  async function handleWarningSaveHide() {
    if (!shiftWarning || !editingProject) return
    setIsSubmitting(true)
    setSaveError(null)
    try {
      const supabase = createClient()
      const { name, nr, ag, lz_von, lz_bis } = shiftWarning.pendingData
      const { error } = await supabase
        .from('projects')
        .update({ name, nr: nr || null, ag: ag || null, lz_von: lz_von || null, lz_bis: lz_bis || null })
        .eq('id', editingProject.id)
      if (error) throw error
      setShiftWarning(null)
      setDialogOpen(false)
      setEditingProject(null)
      await fetchProjects()
      toast.info('Projekt gespeichert. Schichten außerhalb des Zeitraums sind ausgeblendet.')
    } catch (err) {
      void err
      setSaveError('Projekt konnte nicht gespeichert werden. Bitte versuche es erneut.')
    } finally {
      setIsSubmitting(false)
    }
  }

  async function handleWarningSaveDelete() {
    if (!shiftWarning || !editingProject) return
    setIsSubmitting(true)
    setSaveError(null)
    try {
      const supabase = createClient()
      const { name, nr, ag, lz_von, lz_bis } = shiftWarning.pendingData

      // Delete shifts outside new period
      const filters: string[] = []
      if (lz_von) filters.push(`datum.lt.${lz_von}`)
      if (lz_bis) filters.push(`datum.gt.${lz_bis}`)
      if (filters.length > 0) {
        await supabase
          .from('shifts')
          .delete()
          .eq('project_id', editingProject.id)
          .or(filters.join(','))
      }

      // Update project
      const { error } = await supabase
        .from('projects')
        .update({ name, nr: nr || null, ag: ag || null, lz_von: lz_von || null, lz_bis: lz_bis || null })
        .eq('id', editingProject.id)
      if (error) throw error

      setShiftWarning(null)
      setDialogOpen(false)
      setEditingProject(null)
      await fetchProjects()
      toast.success('Projekt gespeichert. Schichten außerhalb des Zeitraums wurden gelöscht.')
    } catch (err) {
      void err
      setSaveError('Projekt konnte nicht gespeichert werden. Bitte versuche es erneut.')
    } finally {
      setIsSubmitting(false)
    }
  }

  async function handleLogout() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  return (
    <div className="relative min-h-screen">
      {/* Background image */}
      <div className="fixed inset-0 -z-20" aria-hidden="true">
        <Image
          src="/images/hero-1.jpg"
          alt=""
          fill
          className="object-cover"
          priority
          sizes="100vw"
        />
      </div>

      {/* Dark overlay */}
      <div
        className="fixed inset-0 -z-10"
        aria-hidden="true"
        style={{ background: 'rgba(14, 17, 24, 0.65)' }}
      />

      {/* Header */}
      <header className="border-b border-white/10 bg-white/5 backdrop-blur-md">
        <div className="container mx-auto flex items-center justify-between px-4 py-4 md:px-6">
          <h1 className="text-xl font-bold">
            <span className="text-primary">BTB</span>{' '}
            <span className="text-white">Projekte</span>
          </h1>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => router.push('/einstellungen')}
              aria-label="Einstellungen"
              className="text-white/70 hover:text-white hover:bg-white/10"
            >
              <Settings className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleLogout}
              aria-label="Ausloggen"
              className="text-white/70 hover:text-white hover:bg-white/10"
            >
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="container mx-auto px-4 py-6 md:px-6 md:py-8">
        {/* Save error */}
        {saveError && (
          <div className="mb-6 flex items-center gap-3 rounded-md border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span className="flex-1">{saveError}</span>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSaveError(null)}
              className="shrink-0 text-red-300 hover:text-red-200 hover:bg-white/10"
            >
              <RefreshCw className="mr-1 h-3 w-3" />
              Schließen
            </Button>
          </div>
        )}

        {/* Loading state */}
        {isLoading && (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="rounded-xl border border-white/10 bg-white/5 p-6 space-y-3 backdrop-blur-md">
                <Skeleton className="h-6 w-3/4 bg-white/10" />
                <Skeleton className="h-4 w-1/2 bg-white/10" />
                <Skeleton className="h-4 w-2/3 bg-white/10" />
                <Skeleton className="h-4 w-1/3 bg-white/10" />
              </div>
            ))}
          </div>
        )}

        {/* Empty state */}
        {!isLoading && projects.length === 0 && (
          <ProjectsEmptyState onCreateClick={handleCreateClick} />
        )}

        {/* Project grid */}
        {!isLoading && projects.length > 0 && (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {projects.map((project) => (
              <ProjectCard
                key={project.id}
                project={project}
                onEdit={handleEditClick}
                onDelete={handleDelete}
                onClick={handleProjectClick}
              />
            ))}
            {/* New project card */}
            <button
              onClick={handleCreateClick}
              className="group flex min-h-[160px] cursor-pointer flex-col items-center justify-center gap-3 rounded-xl border border-white/10 bg-white/5 backdrop-blur-md transition-all hover:border-primary/50 hover:bg-white/10"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-full border border-white/20 text-white/40 transition-colors group-hover:border-primary/50 group-hover:text-primary">
                <Plus className="h-5 w-5" />
              </div>
              <span className="text-sm font-medium text-white/40 transition-colors group-hover:text-white/70">
                Neues Projekt
              </span>
            </button>
          </div>
        )}
      </main>

      {/* Create/Edit Dialog */}
      <ProjectFormDialog
        open={dialogOpen}
        onOpenChange={(open) => {
          setDialogOpen(open)
          if (!open) setEditingProject(null)
        }}
        onSubmit={handleSubmit}
        project={editingProject}
        isSubmitting={isSubmitting}
      />

      {/* Leistungszeitraum shift warning */}
      <AlertDialog open={!!shiftWarning} onOpenChange={(open) => { if (!open) setShiftWarning(null) }}>
        <AlertDialogContent className="text-white">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white">Leistungszeitraum kürzen</AlertDialogTitle>
            <AlertDialogDescription className="text-white/60">
              {shiftWarning?.count === 1
                ? '1 BTB liegt'
                : `${shiftWarning?.count} BTBs liegen`}{' '}
              außerhalb des neuen Leistungszeitraums und{' '}
              {shiftWarning?.count === 1 ? 'wird' : 'werden'} unwiderruflich gelöscht.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-col gap-2 sm:flex-row">
            <AlertDialogCancel disabled={isSubmitting} className="border-white/20 bg-white/10 text-white hover:bg-white/20 hover:text-white">Abbrechen</AlertDialogCancel>
            <Button variant="destructive" onClick={handleWarningSaveDelete} disabled={isSubmitting}>
              Kürzen & löschen
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
