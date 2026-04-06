'use client'

import { FolderPlus } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface ProjectsEmptyStateProps {
  onCreateClick: () => void
}

export function ProjectsEmptyState({ onCreateClick }: ProjectsEmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-24 px-4 text-center">
      <div className="rounded-full bg-white/10 p-6 mb-6">
        <FolderPlus className="h-12 w-12 text-white/50" />
      </div>
      <h2 className="text-xl font-semibold mb-2 text-white">Noch keine Projekte</h2>
      <p className="text-white/50 mb-6 max-w-md">
        Erstelle dein erstes Bauprojekt, um mit der Erfassung von Bautagesberichten zu beginnen.
      </p>
      <Button onClick={onCreateClick} className="font-semibold">
        <FolderPlus className="mr-2 h-4 w-4" />
        Erstes Projekt anlegen
      </Button>
    </div>
  )
}
