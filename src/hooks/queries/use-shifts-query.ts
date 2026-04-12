import { useQuery } from '@tanstack/react-query'
import { fetchShiftsWithDetails } from '@/lib/services/project-service'
import { queryKeys } from '@/lib/query-keys'

export function useShiftsQuery(projectId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.shifts(projectId ?? ''),
    queryFn: () => fetchShiftsWithDetails(projectId!),
    enabled: !!projectId,
  })
}
