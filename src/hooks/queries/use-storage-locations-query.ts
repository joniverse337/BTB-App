import { useQuery } from '@tanstack/react-query'
import { fetchStorageLocations } from '@/lib/services/storage-location-service'
import { queryKeys } from '@/lib/query-keys'

export function useStorageLocationsQuery(projectId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.storageLocations(projectId ?? ''),
    queryFn: () => fetchStorageLocations(projectId!),
    enabled: !!projectId,
  })
}
