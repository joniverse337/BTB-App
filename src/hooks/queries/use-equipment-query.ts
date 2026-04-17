import { useQuery } from '@tanstack/react-query'
import { fetchEquipmentItems } from '@/lib/services/equipment-service'
import { queryKeys } from '@/lib/query-keys'

export function useEquipmentQuery(projectId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.equipment(projectId ?? ''),
    queryFn: () => fetchEquipmentItems(projectId!),
    enabled: !!projectId,
    staleTime: 30_000,
    refetchOnWindowFocus: false,
  })
}
