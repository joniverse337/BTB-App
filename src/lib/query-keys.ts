export const queryKeys = {
  projects: () => ['projects'] as const,
  project: (id: string) => ['projects', id] as const,
  shifts: (projectId: string) => ['shifts', projectId] as const,
  projectSettings: (projectId: string) => ['project-settings', projectId] as const,
  equipment: (projectId: string) => ['equipment', projectId] as const,
  storageLocations: (projectId: string) => ['storage-locations', projectId] as const,
  workNotifications: (projectId: string, year: number, kw: number) =>
    ['work-notifications', projectId, year, kw] as const,
  workNotificationsIndex: (projectId: string) =>
    ['work-notifications', projectId] as const,
  projectContacts: (projectId: string) => ['project-contacts', projectId] as const,
} as const
