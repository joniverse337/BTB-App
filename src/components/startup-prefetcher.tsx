'use client'

import { useEffect } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { format, subWeeks, getISOWeek, getISOWeekYear } from 'date-fns'
import { createClient } from '@/lib/supabase'
import { fetchProjects, fetchShiftsWithDetails, fetchProjectSettingsWithFallback } from '@/lib/services/project-service'
import { fetchEquipmentItems } from '@/lib/services/equipment-service'
import { fetchStorageLocations } from '@/lib/services/storage-location-service'
import { queryKeys } from '@/lib/query-keys'
import type { Project } from '@/lib/validations/project'

const BATCH_SIZE = 3

function getSince8Weeks(): string {
  return format(subWeeks(new Date(), 8), 'yyyy-MM-dd')
}

function getCurrentYearKw(): { year: number; kw: number } {
  const now = new Date()
  return { year: getISOWeekYear(now), kw: getISOWeek(now) }
}

export function StartupPrefetcher() {
  const queryClient = useQueryClient()

  useEffect(() => {
    const supabase = createClient()

    async function prefetchProject(projectId: string, since: string, year: number, kw: number) {
      await Promise.all([
        queryClient.prefetchQuery({
          queryKey: queryKeys.shifts(projectId),
          queryFn: () => fetchShiftsWithDetails(projectId, since),
          staleTime: 5 * 60 * 1000,
        }),
        queryClient.prefetchQuery({
          queryKey: queryKeys.storageLocations(projectId),
          queryFn: () => fetchStorageLocations(projectId),
          staleTime: 5 * 60 * 1000,
        }),
        queryClient.prefetchQuery({
          queryKey: queryKeys.equipment(projectId),
          queryFn: () => fetchEquipmentItems(projectId),
          staleTime: 5 * 60 * 1000,
        }),
        queryClient.prefetchQuery({
          queryKey: queryKeys.projectSettings(projectId),
          queryFn: () => fetchProjectSettingsWithFallback(projectId),
          staleTime: 5 * 60 * 1000,
        }),
        queryClient.prefetchQuery({
          queryKey: queryKeys.workNotifications(projectId, year, kw),
          queryFn: async () => {
            const sb = createClient()
            const { data } = await sb
              .from('work_notifications')
              .select('*')
              .eq('project_id', projectId)
              .eq('year', year)
              .eq('calendar_week', kw)
              .order('weekday_nr', { ascending: true })
            return data ?? []
          },
          staleTime: 5 * 60 * 1000,
        }),
      ])
    }

    async function prefetchAll() {
      // 1. Alle Projekte laden
      await queryClient.prefetchQuery({
        queryKey: queryKeys.projects(),
        queryFn: fetchProjects,
        staleTime: 5 * 60 * 1000,
      })

      const projects = queryClient.getQueryData<Project[]>(queryKeys.projects()) ?? []
      if (projects.length === 0) return

      const since = getSince8Weeks()
      const { year, kw } = getCurrentYearKw()

      // 2. Pro Projekt prefetchen — in Batches à BATCH_SIZE, um Rate-Limits zu respektieren
      for (let i = 0; i < projects.length; i += BATCH_SIZE) {
        const batch = projects.slice(i, i + BATCH_SIZE)
        await Promise.all(batch.map((p) => prefetchProject(p.id, since, year, kw)))
      }
    }

    // Beim Mount: wenn bereits eingeloggt → sofort prefetchen
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) prefetchAll()
    })

    // Auth-State-Listener: bei Login prefetchen, bei Logout Cache leeren
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_IN') prefetchAll()
      if (event === 'SIGNED_OUT') queryClient.clear()
    })

    return () => subscription.unsubscribe()
  }, [queryClient])

  return null
}
