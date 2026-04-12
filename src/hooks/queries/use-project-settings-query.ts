import { useQuery } from '@tanstack/react-query'
import { fetchProjectSettingsWithFallback } from '@/lib/services/project-service'
import { queryKeys } from '@/lib/query-keys'

export function useProjectSettingsQuery(projectId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.projectSettings(projectId ?? ''),
    queryFn: () => fetchProjectSettingsWithFallback(projectId!),
    enabled: !!projectId,
  })
}
