'use client'

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useState } from 'react'
import { StartupPrefetcher } from '@/components/startup-prefetcher'

export function Providers({ children }: { children: React.ReactNode }) {
  // useState stellt sicher: eine QueryClient-Instanz pro Browser-Session,
  // kein Modul-Level-Singleton, der bei SSR State zwischen Requests teilt.
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60 * 1000,              // 1 Minute — schnellere Cross-Device-Synchronisation
            refetchInterval: 5 * 60 * 1000,   // Background-Refresh alle 5 Minuten
            refetchOnWindowFocus: true,        // Refetch bei Tab-Focus — Cross-Device-Updates sichtbar
            retry: 1,
          },
        },
      })
  )

  return (
    <QueryClientProvider client={queryClient}>
      <StartupPrefetcher />
      {children}
    </QueryClientProvider>
  )
}
