'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { AlertCircle } from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'
import { ProjectDetailHeader } from '@/components/project-detail-header'
import { GeraeteView } from '@/components/geraete-view'
import { createClient } from '@/lib/supabase'
import type { Project } from '@/lib/validations/project'

export default function GeraetePage() {
  const params = useParams()
  const projectId = params.id as string

  const [project, setProject] = useState<Project | null>(null)
  const [isLoadingProject, setIsLoadingProject] = useState(true)
  const [companyName, setCompanyName] = useState<string | null>(null)
  const [logoUrl, setLogoUrl] = useState<string | null>(null)
  const [printLagerplaetze, setPrintLagerplaetze] = useState(false)

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

  // Fetch company info
  useEffect(() => {
    async function fetchCompanyInfo() {
      try {
        const supabase = createClient()

        // Check project_settings first
        const { data: settingsData } = await supabase
          .from('project_settings')
          .select('firma, logo_url, print_lagerplaetze_with_geraete')
          .eq('project_id', projectId)
          .single()

        if (settingsData?.logo_url) setLogoUrl(settingsData.logo_url)
        if (settingsData?.print_lagerplaetze_with_geraete) setPrintLagerplaetze(true)

        if (settingsData?.firma) {
          setCompanyName(settingsData.firma)
          return
        }

        // Fallback: company from profile
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
              .select('name')
              .eq('id', profile.company_id)
              .single()
            if (companyRow?.name) {
              setCompanyName(companyRow.name)
              return
            }
          }
        }

        // Fallback: project firm field
        if (project?.firm) {
          setCompanyName(project.firm)
        }
      } catch {
        // Ignore errors -- company name is optional
      }
    }
    if (project) fetchCompanyInfo()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId, isLoadingProject])

  // Loading state
  if (isLoadingProject) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
        <ProjectDetailHeader project={null} isLoading={true} />
        <div className="container mx-auto px-4 py-8 md:px-6">
          <Skeleton className="h-12 w-full rounded-lg mb-4" />
          <div className="flex gap-6">
            <Skeleton className="h-96 w-1/3 rounded-lg" />
            <Skeleton className="h-96 w-1/3 rounded-lg" />
            <Skeleton className="h-96 w-1/3 rounded-lg" />
          </div>
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

  return (
    <div className="bg-background" style={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
      <ProjectDetailHeader project={project} isLoading={false} />
      <GeraeteView
        projectId={projectId}
        project={project}
        companyName={companyName ?? project?.firm ?? 'Firmenname'}
        printLagerplaetze={printLagerplaetze}
        logoUrl={logoUrl}
      />
    </div>
  )
}
