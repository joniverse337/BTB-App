'use client'

import { useParams } from 'next/navigation'
import { AlertCircle } from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'
import { ProjectDetailHeader } from '@/components/project-detail-header'
import { LagerplaetzeView } from '@/components/lagerplaetze-view'
import { useProjectQuery } from '@/hooks/queries/use-project-query'
import { useProjectSettingsQuery } from '@/hooks/queries/use-project-settings-query'

export default function LagerplaetzePage() {
  const params = useParams()
  const projectId = params.id as string

  const { data: project, isLoading: isLoadingProject } = useProjectQuery(projectId)
  const { data: settings } = useProjectSettingsQuery(projectId)

  const companyName = settings?.firma ?? project?.firm ?? 'Firmenname'
  const logoUrl = settings?.logo?.url ?? null

  // Loading state
  if (isLoadingProject) {
    return (
      <div className="flex flex-col h-screen bg-background">
        <ProjectDetailHeader project={null} isLoading={true} />
        <div className="container mx-auto px-4 py-8 md:px-6">
          <Skeleton className="h-12 w-full rounded-lg mb-4" />
          <div className="flex gap-6">
            <Skeleton className="h-96 w-1/2 rounded-lg" />
            <Skeleton className="h-96 w-1/2 rounded-lg" />
          </div>
        </div>
      </div>
    )
  }

  // Error state
  if (!project) {
    return (
      <div className="flex flex-col h-screen bg-background">
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

  return (
    <div className="flex flex-col h-screen bg-background">
      <ProjectDetailHeader project={project} isLoading={false} />
      <LagerplaetzeView
        projectId={projectId}
        project={project}
        companyName={companyName}
        logoUrl={logoUrl}
      />
    </div>
  )
}
