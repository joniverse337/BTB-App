import { useQuery } from '@tanstack/react-query'
import { fetchProjects } from '@/lib/services/project-service'
import { queryKeys } from '@/lib/query-keys'

export function useProjectsQuery() {
  return useQuery({
    queryKey: queryKeys.projects(),
    queryFn: fetchProjects,
  })
}
