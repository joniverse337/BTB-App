'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'
import { Plus } from 'lucide-react'
import { LagerplaetzeActionBar } from '@/components/lagerplaetze-action-bar'
import { LagerplatzCard, type LagerplatzCardRef, type LagerplatzCardState } from '@/components/lagerplatz-card'
import { Skeleton } from '@/components/ui/skeleton'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import {
  fetchStorageLocations,
  createStorageLocation,
  deleteStorageLocation,
  getNextSortOrder,
  getNextDefaultName,
} from '@/lib/services/storage-location-service'
import type { StorageLocation } from '@/lib/validations/storage-location'
import type { Project } from '@/lib/validations/project'
import type { ProjectContact } from '@/lib/validations/project-settings'
import { createClient } from '@/lib/supabase'

interface LagerplaetzeViewProps {
  projectId: string
  project: Project
  companyName: string
  logoUrl: string | null
}

// ── New Location placeholder card ─────────────────────────
// Renders at 100% (210mm × 297mm + 40px PaperEngine padding) — bundle handles scaling

function NewLocationCard({ onCreate }: { onCreate: () => void }) {
  return (
    <button
      onClick={onCreate}
      data-no-print="true"
      style={{
        flexShrink: 0,
        width: '210mm',
        height: 'calc(297mm + 40px)',
        border: '2px dashed rgba(232,197,71,0.45)',
        background: 'rgba(232,197,71,0.04)',
        borderRadius: '6px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '12px',
        cursor: 'pointer',
        color: 'rgba(232,197,71,0.7)',
        transition: 'background 0.15s, border-color 0.15s',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.background = 'rgba(232,197,71,0.09)'
        e.currentTarget.style.borderColor = 'rgba(232,197,71,0.7)'
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = 'rgba(232,197,71,0.04)'
        e.currentTarget.style.borderColor = 'rgba(232,197,71,0.45)'
      }}
      aria-label="Neuen Lagerplatz anlegen"
    >
      <Plus size={28} strokeWidth={1.5} />
      <span style={{ fontSize: '13px', fontWeight: 600, letterSpacing: '0.01em' }}>
        Neuen Lagerplatz anlegen
      </span>
    </button>
  )
}

// ── Main View ─────────────────────────────────────────────

export function LagerplaetzeView({ projectId, project, companyName, logoUrl }: LagerplaetzeViewProps) {
  const [locations, setLocations] = useState<StorageLocation[]>([])
  const [activeId, setActiveId] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [projectContacts, setProjectContacts] = useState<ProjectContact[]>([])
  const [zoom, setZoom] = useState(60)
  const [deleteTarget, setDeleteTarget] = useState<StorageLocation | null>(null)

  // Pen settings (shared across all cards — toolbar tool, not per-card)
  const [penColor, setPenColor] = useState('#e8c547')
  const [penWidth, setPenWidth] = useState(5)

  // Active card state (synced via onStateChange callback)
  const [activeCardState, setActiveCardState] = useState<LagerplatzCardState>({
    isDrawing: false,
    canUndo: false,
    hasScreenshot: false,
  })

  // Map of card refs keyed by location id
  const cardRefsMap = useRef<Map<string, LagerplatzCardRef>>(new Map())

  const getActiveRef = useCallback(
    () => (activeId ? cardRefsMap.current.get(activeId) ?? null : null),
    [activeId]
  )

  // When active card changes, query its current state immediately
  useEffect(() => {
    const ref = activeId ? cardRefsMap.current.get(activeId) : null
    if (ref) {
      setActiveCardState(ref.getState())
    } else {
      setActiveCardState({ isDrawing: false, canUndo: false, hasScreenshot: false })
    }
  }, [activeId])

  // Callback from any card when its state changes
  const handleCardStateChange = useCallback(
    (id: string, state: LagerplatzCardState) => {
      if (id === activeId) setActiveCardState(state)
    },
    [activeId]
  )

  // Load locations + project contacts in parallel
  useEffect(() => {
    let cancelled = false
    setIsLoading(true)
    const supabase = createClient()
    Promise.all([
      fetchStorageLocations(projectId),
      supabase.from('project_contacts').select('*').eq('project_id', projectId).order('sort_order'),
    ])
      .then(([locs, { data: contacts }]) => {
        if (cancelled) return
        setLocations(locs)
        if (locs.length > 0) setActiveId(locs[0].id)
        if (contacts) setProjectContacts(contacts as ProjectContact[])
      })
      .catch(() => toast.error('Fehler beim Laden der Lagerplaetze.'))
      .finally(() => { if (!cancelled) setIsLoading(false) })
    return () => { cancelled = true }
  }, [projectId])

  // Create
  const handleCreate = useCallback(async () => {
    try {
      const [name, sortOrder] = await Promise.all([
        getNextDefaultName(projectId),
        getNextSortOrder(projectId),
      ])
      const created = await createStorageLocation({ project_id: projectId, name, sort_order: sortOrder })
      if (created) {
        setLocations((prev) => [...prev, created])
        setActiveId(created.id)
        toast.success(`"${created.name}" erstellt.`)
      } else {
        toast.error('Fehler beim Erstellen des Lagerplatzes.')
      }
    } catch {
      toast.error('Fehler beim Erstellen des Lagerplatzes.')
    }
  }, [projectId])

  // Delete
  const handleDelete = useCallback(async () => {
    if (!deleteTarget) return
    const success = await deleteStorageLocation(deleteTarget.id)
    if (success) {
      setLocations((prev) => {
        const remaining = prev.filter((l) => l.id !== deleteTarget.id)
        if (activeId === deleteTarget.id) {
          setActiveId(remaining.length > 0 ? remaining[0].id : null)
        }
        return remaining
      })
      setDeleteTarget(null)
      toast.success('Lagerplatz geloescht.')
    } else {
      toast.error('Fehler beim Loeschen des Lagerplatzes.')
    }
  }, [deleteTarget, activeId])

  // Action bar delegates to active card
  const handleScreenshot = useCallback(() => getActiveRef()?.takeScreenshot(), [getActiveRef])
  const handleRetake = useCallback(() => getActiveRef()?.retake(), [getActiveRef])
  const handleToggleDraw = useCallback(() => getActiveRef()?.toggleDraw(), [getActiveRef])
  const handleUndo = useCallback(() => getActiveRef()?.undo(), [getActiveRef])

  const handlePrintAll = useCallback(() => {
    const prev = document.title
    document.title = `Lagerplätze – ${project.name}`
    window.print()
    window.addEventListener('afterprint', () => { document.title = prev }, { once: true })
  }, [project.name])

  // Loading
  if (isLoading) {
    return (
      <div className="flex flex-col flex-1 overflow-hidden">
        <div className="px-4 py-3 border-b border-border">
          <Skeleton className="h-8 w-32" />
        </div>
        <div className="flex gap-5 p-5 flex-1 overflow-auto">
          <Skeleton className="h-[700px] w-[476px] rounded-lg flex-shrink-0" />
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      <LagerplaetzeActionBar
        zoom={zoom}
        onZoomChange={setZoom}
        hasActiveCard={!!activeId}
        hasScreenshot={activeCardState.hasScreenshot}
        isDrawing={activeCardState.isDrawing}
        canUndo={activeCardState.canUndo}
        activeLocationName={locations.find((l) => l.id === activeId)?.name}
        penColor={penColor}
        onPenColorChange={setPenColor}
        penWidth={penWidth}
        onPenWidthChange={setPenWidth}
        onScreenshot={handleScreenshot}
        onRetake={handleRetake}
        onToggleDraw={handleToggleDraw}
        onUndo={handleUndo}
        onPrintAll={handlePrintAll}
      />

      {/* Horizontal paper grid — same Spacer+Bundle pattern as Gerätebedarf */}
      <div className="lagerplaetze-board" style={{ flex: 1, overflow: 'auto' }}>
        {/* Spacer: occupies the scaled visual dimensions so scrollbars are correct */}
        <div
          className="lagerplaetze-zoom-spacer"
          style={{
            width: `calc((${locations.length + 1} * 210mm + ${locations.length} * 50px + 40px) * ${zoom / 100})`,
            height: `calc((297mm + 40px + 40px) * ${zoom / 100})`,
            position: 'relative',
          }}
        >
          {/* Bundle: all cards scaled as one unit from top-left */}
          <div
            className="lagerplaetze-bundle"
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              transformOrigin: 'top left',
              transform: `scale(${zoom / 100})`,
              display: 'flex',
              flexDirection: 'row',
              alignItems: 'flex-start',
              gap: '50px',
              padding: '20px',
            }}
          >
            {locations.map((loc) => (
              <LagerplatzCard
                key={loc.id}
                ref={(el) => {
                  if (el) cardRefsMap.current.set(loc.id, el)
                  else cardRefsMap.current.delete(loc.id)
                }}
                location={loc}
                project={project}
                companyName={companyName}
                logoUrl={logoUrl}
                zoom={100}
                penColor={penColor}
                penWidth={penWidth}
                projectContacts={projectContacts}
                isActive={loc.id === activeId}
                onActivate={() => setActiveId(loc.id)}
                onDelete={() => setDeleteTarget(loc)}
                onStateChange={handleCardStateChange}
                projectId={projectId}
              />
            ))}

            <NewLocationCard onCreate={handleCreate} />
          </div>
        </div>
      </div>

      {/* Delete confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Lagerplatz loeschen?</AlertDialogTitle>
            <AlertDialogDescription>
              &ldquo;{deleteTarget?.name}&rdquo; wird unwiderruflich geloescht, inklusive
              Screenshot und Zeichnungen.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Abbrechen</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Loeschen
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
