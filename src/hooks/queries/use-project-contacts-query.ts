import { useQuery } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase'
import { queryKeys } from '@/lib/query-keys'
import type { ProjectContact } from '@/lib/validations/project-settings'

async function fetchProjectContacts(projectId: string): Promise<ProjectContact[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('project_contacts')
    .select('*')
    .eq('project_id', projectId)
    .order('sort_order', { ascending: true })

  if (error) return []
  return (data ?? []) as ProjectContact[]
}

export function useProjectContactsQuery(projectId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.projectContacts(projectId ?? ''),
    queryFn: () => fetchProjectContacts(projectId!),
    enabled: !!projectId,
  })
}
