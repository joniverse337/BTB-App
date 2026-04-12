import { useQuery } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase'
import { queryKeys } from '@/lib/query-keys'
import type { WorkNotificationRow } from '@/lib/validations/work-notification'

async function fetchWorkNotifications(
  projectId: string,
  year: number,
  kw: number
): Promise<WorkNotificationRow[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('work_notifications')
    .select('*')
    .eq('project_id', projectId)
    .eq('year', year)
    .eq('calendar_week', kw)
    .order('weekday_nr', { ascending: true })

  if (error) return []
  return (data ?? []) as WorkNotificationRow[]
}

export function useWorkNotificationsQuery(
  projectId: string | undefined,
  year: number | undefined,
  kw: number | undefined
) {
  return useQuery({
    queryKey: queryKeys.workNotifications(
      projectId ?? '',
      year ?? 0,
      kw ?? 0
    ),
    queryFn: () => fetchWorkNotifications(projectId!, year!, kw!),
    enabled: !!projectId && year !== undefined && kw !== undefined,
  })
}
