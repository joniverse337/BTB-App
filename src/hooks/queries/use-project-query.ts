import { useQuery } from '@tanstack/react-query'
import { fetchProject } from '@/lib/services/project-service'
import { queryKeys } from '@/lib/query-keys'

export function useProjectQuery(projectId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.project(projectId ?? ''),
    queryFn: () => fetchProject(projectId!),
    enabled: !!projectId,
  })
}
