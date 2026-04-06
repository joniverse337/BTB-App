'use client'

import { useEffect } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { DatePicker } from '@/components/ui/date-picker'
import { projectFormSchema, type ProjectFormData, type Project } from '@/lib/validations/project'

interface ProjectFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (data: ProjectFormData) => Promise<void>
  project?: Project | null
  isSubmitting: boolean
}

export function ProjectFormDialog({
  open,
  onOpenChange,
  onSubmit,
  project,
  isSubmitting,
}: ProjectFormDialogProps) {
  const isEditing = !!project

  const {
    register,
    handleSubmit,
    reset,
    control,
    formState: { errors },
  } = useForm<ProjectFormData>({
    resolver: zodResolver(projectFormSchema),
    defaultValues: {
      name: '',
      nr: '',
      ag: '',
      lz_von: '',
      lz_bis: '',
    },
  })

  useEffect(() => {
    if (open) {
      if (project) {
        reset({
          name: project.name,
          nr: project.nr ?? '',
          ag: project.ag ?? '',
          lz_von: project.lz_von ?? '',
          lz_bis: project.lz_bis ?? '',
        })
      } else {
        reset({
          name: '',
          nr: '',
          ag: '',
              lz_von: '',
          lz_bis: '',
        })
      }
    }
  }, [open, project, reset])

  async function handleFormSubmit(data: ProjectFormData) {
    await onSubmit(data)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md text-white">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? 'Projekt bearbeiten' : 'Neues Projekt anlegen'}
          </DialogTitle>
          <DialogDescription>
            {isEditing
              ? 'Passe die Projektdaten an und speichere die Aenderungen.'
              : 'Gib die Projektdaten ein, um ein neues Bauprojekt zu erstellen.'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="project-name" className="text-white/80">
              Projektname <span className="text-red-400">*</span>
            </Label>
            <Input
              id="project-name"
              placeholder="z.B. Gleisumbau Hauptbahnhof"
              autoFocus
              className="border-white/20 bg-white/10 text-white placeholder:text-white/30 focus-visible:border-primary focus-visible:ring-0 focus-visible:ring-offset-0"
              {...register('name')}
            />
            {errors.name && (
              <p className="text-xs text-red-400">{errors.name.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="project-nr" className="text-white/80">Kostenstelle / Projektnummer</Label>
            <Input
              id="project-nr"
              placeholder="z.B. KST-2024-001"
              className="border-white/20 bg-white/10 text-white placeholder:text-white/30 focus-visible:border-primary focus-visible:ring-0 focus-visible:ring-offset-0"
              {...register('nr')}
            />
            {errors.nr && (
              <p className="text-xs text-red-400">{errors.nr.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="project-ag" className="text-white/80">Auftraggeber</Label>
            <Input
              id="project-ag"
              placeholder="z.B. Deutsche Bahn AG"
              className="border-white/20 bg-white/10 text-white placeholder:text-white/30 focus-visible:border-primary focus-visible:ring-0 focus-visible:ring-offset-0"
              {...register('ag')}
            />
            {errors.ag && (
              <p className="text-xs text-red-400">{errors.ag.message}</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Leistungszeitraum Von</Label>
              <Controller
                name="lz_von"
                control={control}
                render={({ field }) => (
                  <DatePicker
                    value={field.value}
                    onChange={field.onChange}
                    placeholder="Von"
                    disabled={isSubmitting}
                  />
                )}
              />
              {errors.lz_von && (
                <p className="text-xs text-destructive">{errors.lz_von.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label>Leistungszeitraum Bis</Label>
              <Controller
                name="lz_bis"
                control={control}
                render={({ field }) => (
                  <DatePicker
                    value={field.value}
                    onChange={field.onChange}
                    placeholder="Bis"
                    disabled={isSubmitting}
                  />
                )}
              />
              {errors.lz_bis && (
                <p className="text-xs text-destructive">{errors.lz_bis.message}</p>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
              className="border-white/20 bg-white/10 text-white hover:bg-white/20 hover:text-white"
            >
              Abbrechen
            </Button>
            <Button type="submit" disabled={isSubmitting} className="font-semibold">
              {isSubmitting
                ? 'Wird gespeichert...'
                : isEditing
                  ? 'Speichern'
                  : 'Projekt anlegen'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
