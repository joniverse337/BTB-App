'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'
import { PaperEngine } from '@/components/paper-engine'
import { GeraeteActionBar } from '@/components/geraete-action-bar'
import { GeraeteCard } from '@/components/geraete-card'
import { DeleteEquipmentDialog } from '@/components/delete-equipment-dialog'
import { Skeleton } from '@/components/ui/skeleton'
import {
  fetchEquipmentItems,
  createEquipmentItem,
  updateEquipmentItem,
  changeEquipmentStatus,
  deleteEquipmentItem,
} from '@/lib/services/equipment-service'
import type { EquipmentItem, EquipmentStatus } from '@/lib/validations/equipment'
import type { Project } from '@/lib/validations/project'
import type { ProjectContact } from '@/lib/validations/project-settings'
import { createClient } from '@/lib/supabase'
import { LagerplatzPaper } from '@/components/lagerplatz-paper'
import type { StorageLocation } from '@/lib/validations/storage-location'

interface ContactSnapshot { id: string; funktion: string | null; name: string; phone: string | null }
function parseSnapshots(raw: string | null): ContactSnapshot[] {
  if (!raw) return []
  try { return JSON.parse(raw) } catch { return [] }
}

interface GeraeteViewProps {
  projectId: string
  project: Project
  companyName: string
  printLagerplaetze?: boolean
  logoUrl?: string | null
}

export function GeraeteView({ projectId, project, companyName, printLagerplaetze, logoUrl }: GeraeteViewProps) {
  const [items, setItems] = useState<EquipmentItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [zoom, setZoom] = useState(60)
  const [deleteTarget, setDeleteTarget] = useState<EquipmentItem | null>(null)
  const [projectContacts, setProjectContacts] = useState<ProjectContact[]>([])
  const [contactsByStatus, setContactsByStatus] = useState<Record<EquipmentStatus, ContactSnapshot[]>>({
    bedarf: [], baustelle: [], frei: [],
  })

  const outerRef = useRef<HTMLDivElement>(null)
  const bedarfWrapperRef = useRef<HTMLDivElement>(null)
  const baustelleWrapperRef = useRef<HTMLDivElement>(null)
  const freiWrapperRef = useRef<HTMLDivElement>(null)
  const [storageLocations, setStorageLocations] = useState<StorageLocation[]>([])

  // Load equipment items
  const loadItems = useCallback(async () => {
    setIsLoading(true)
    try {
      const data = await fetchEquipmentItems(projectId)
      setItems(data)
    } catch {
      toast.error('Fehler beim Laden der Geräte.')
    } finally {
      setIsLoading(false)
    }
  }, [projectId])

  useEffect(() => {
    loadItems()
  }, [loadItems])

  // Fetch project contacts + saved contact selections
  useEffect(() => {
    const supabase = createClient()
    supabase.from('project_contacts').select('*').eq('project_id', projectId).order('sort_order')
      .then(({ data }) => { if (data) setProjectContacts(data as ProjectContact[]) })
    supabase.from('project_settings')
      .select('equipment_bedarf_contacts, equipment_baustelle_contacts, equipment_frei_contacts')
      .eq('project_id', projectId).single()
      .then(({ data }) => {
        if (data) setContactsByStatus({
          bedarf: parseSnapshots(data.equipment_bedarf_contacts),
          baustelle: parseSnapshots(data.equipment_baustelle_contacts),
          frei: parseSnapshots(data.equipment_frei_contacts),
        })
      })
  }, [projectId])

  // Lagerplatz-Daten für Print-Append laden
  useEffect(() => {
    if (!printLagerplaetze) return
    const supabase = createClient()
    supabase
      .from('storage_locations')
      .select('*')
      .eq('project_id', projectId)
      .order('sort_order', { ascending: true })
      .order('created_at', { ascending: true })
      .limit(10)
      .then(({ data }) => { if (data) setStorageLocations(data as StorageLocation[]) })
  }, [projectId, printLagerplaetze])

  const handleContactsChange = useCallback(async (status: EquipmentStatus, contacts: ContactSnapshot[]) => {
    setContactsByStatus((prev) => ({ ...prev, [status]: contacts }))
    const field = `equipment_${status}_contacts`
    const supabase = createClient()
    await supabase.from('project_settings').update({ [field]: contacts.length ? JSON.stringify(contacts) : null }).eq('project_id', projectId)
  }, [projectId])

  // Filter items by status
  const bedarfItems = items.filter((i) => i.status === 'bedarf')
  const baustelleItems = items.filter((i) => i.status === 'baustelle')
  const freiItems = items.filter((i) => i.status === 'frei')

  // Add new equipment for a given status
  const handleAddEquipment = useCallback(async (status: EquipmentStatus) => {
    const statusItems = items.filter((i) => i.status === status)
    const maxOrder = statusItems.reduce((max, i) => Math.max(max, i.sort_order), 0)
    const created = await createEquipmentItem({
      project_id: projectId,
      status,
      sort_order: maxOrder + 1,
    })
    if (created) {
      setItems((prev) => [...prev, created])
    } else {
      toast.error('Fehler beim Anlegen des Geräts.')
    }
  }, [projectId, items])

  // Update equipment field on blur
  const handleUpdateField = useCallback(
    async (id: string, field: string, value: string | null) => {
      // Optimistic update
      setItems((prev) =>
        prev.map((item) => (item.id === id ? { ...item, [field]: value } : item))
      )
      const updated = await updateEquipmentItem(id, { [field]: value })
      if (!updated) {
        toast.error('Speichern fehlgeschlagen.')
        // Reload to get correct state
        loadItems()
      }
    },
    [loadItems]
  )

  // Change status
  const handleStatusChange = useCallback(
    async (id: string, from: EquipmentStatus, to: EquipmentStatus) => {
      const result = await changeEquipmentStatus(id, from, to)
      if (result) {
        setItems((prev) =>
          prev.map((item) => (item.id === id ? result : item))
        )
      } else {
        toast.error('Statuswechsel fehlgeschlagen.')
      }
    },
    []
  )

  // Delete equipment
  const handleConfirmDelete = useCallback(async () => {
    if (!deleteTarget) return
    const success = await deleteEquipmentItem(deleteTarget.id)
    if (success) {
      setItems((prev) => prev.filter((i) => i.id !== deleteTarget.id))
      setDeleteTarget(null)
    } else {
      toast.error('Fehler beim Löschen des Geräts.')
    }
  }, [deleteTarget])

  // Print all 3 cards (+ Lagerplatz-Append wenn aktiviert)
  const handlePrint = useCallback(() => {
    ;[bedarfWrapperRef, baustelleWrapperRef, freiWrapperRef].forEach((ref) => {
      if (ref.current) delete ref.current.dataset.printOnly
    })
    if (outerRef.current) delete outerRef.current.dataset.singlePrint
    const prevTitle = document.title
    document.title = project.name ? `Gerätebedarf – ${project.name}` : 'Gerätebedarf'
    window.print()
    window.addEventListener('afterprint', () => { document.title = prevTitle }, { once: true })
  }, [project.name])

  // Print a single card — Lagerplatz-Append ausblenden via data-single-print
  const handlePrintSingle = useCallback((wrapperRef: React.RefObject<HTMLDivElement | null>) => {
    const el = wrapperRef.current
    if (!el) { window.print(); return }
    el.dataset.printOnly = 'true'
    if (outerRef.current) outerRef.current.dataset.singlePrint = 'true'
    const prevTitle = document.title
    document.title = project.name ? `Gerätebedarf – ${project.name}` : 'Gerätebedarf'
    window.print()
    window.addEventListener('afterprint', () => {
      document.title = prevTitle
      delete el.dataset.printOnly
      if (outerRef.current) delete outerRef.current.dataset.singlePrint
    }, { once: true })
  }, [project.name])

  // Project info for card headers
  const projectInfo = {
    name: project.name,
    kostenstelle: project.nr || '',
    ansprechpartner: project.ag || '',
  }

  if (isLoading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
        <div className="px-4 py-3 border-b border-border">
          <Skeleton className="h-8 w-64" />
        </div>
        <div className="flex gap-6 p-6 overflow-x-auto">
          <Skeleton className="h-96 w-80 shrink-0 rounded-lg" />
          <Skeleton className="h-96 w-80 shrink-0 rounded-lg" />
          <Skeleton className="h-96 w-80 shrink-0 rounded-lg" />
        </div>
      </div>
    )
  }

  return (
    <div ref={outerRef} style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
      <GeraeteActionBar
        zoom={zoom}
        onZoomChange={setZoom}
        onPrintAll={handlePrint}
      />

      <div
        className="geraete-board"
        style={{ flex: 1, overflow: 'auto', padding: '20px' }}
      >
        {/* Spacer: nimmt die visuellen (skalierten) Maße ein → Scrollbar korrekt */}
        <div
          className="geraete-zoom-spacer"
          style={{
            width: `calc((630mm + 260px) * ${zoom / 100})`,
            height: `calc((297mm + 40px) * ${zoom / 100})`,
            position: 'relative',
          }}
        >
          {/* Bundle: alle 3 Blätter + Pfeile als Einheit skaliert */}
          <div
            className="geraete-bundle"
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              transformOrigin: 'top left',
              transform: `scale(${zoom / 100})`,
              display: 'flex',
              flexDirection: 'row',
              alignItems: 'center',
              gap: '50px',
            }}
          >
            {/* Card 1: BEDARF */}
            <div ref={bedarfWrapperRef} className="geraete-paper-wrapper">
              <PaperEngine orientation="portrait" zoom={100} onPrint={() => handlePrintSingle(bedarfWrapperRef)}>
                <GeraeteCard
                  status="bedarf"
                  items={bedarfItems}
                  projectInfo={projectInfo}
                  companyName={companyName}
                  pageNumber={1}
                  editableFields="all"
                  projectId={projectId}
                  onAddEquipment={() => handleAddEquipment('bedarf')}
                  onUpdateField={handleUpdateField}
                  onStatusChange={handleStatusChange}
                  onDeleteRequest={setDeleteTarget}
                  projectContacts={projectContacts}
                  selectedContacts={contactsByStatus.bedarf}
                  onContactsChange={(c) => handleContactsChange('bedarf', c)}
                />
              </PaperEngine>
            </div>

            {/* Flow Arrow 1 */}
            <div
              data-no-print="true"
              style={{ color: '#8a90a8', fontSize: '28px', fontWeight: 300, flexShrink: 0 }}
              aria-hidden="true"
            >
              &rarr;
            </div>

            {/* Card 2: AUF DER BAUSTELLE */}
            <div ref={baustelleWrapperRef} className="geraete-paper-wrapper">
              <PaperEngine orientation="portrait" zoom={100} onPrint={() => handlePrintSingle(baustelleWrapperRef)}>
                <GeraeteCard
                  status="baustelle"
                  items={baustelleItems}
                  projectInfo={projectInfo}
                  companyName={companyName}
                  pageNumber={2}
                  editableFields="nummer-only"
                  projectId={projectId}
                  onAddEquipment={() => handleAddEquipment('baustelle')}
                  onUpdateField={handleUpdateField}
                  onStatusChange={handleStatusChange}
                  onDeleteRequest={setDeleteTarget}
                  projectContacts={projectContacts}
                  selectedContacts={contactsByStatus.baustelle}
                  onContactsChange={(c) => handleContactsChange('baustelle', c)}
                />
              </PaperEngine>
            </div>

            {/* Flow Arrow 2 */}
            <div
              data-no-print="true"
              style={{ color: '#8a90a8', fontSize: '28px', fontWeight: 300, flexShrink: 0 }}
              aria-hidden="true"
            >
              &rarr;
            </div>

            {/* Card 3: FREIGEMELDET */}
            <div ref={freiWrapperRef} className="geraete-paper-wrapper">
              <PaperEngine orientation="portrait" zoom={100} onPrint={() => handlePrintSingle(freiWrapperRef)}>
                <GeraeteCard
                  status="frei"
                  items={freiItems}
                  projectInfo={projectInfo}
                  companyName={companyName}
                  pageNumber={3}
                  editableFields="none"
                  projectId={projectId}
                  onAddEquipment={() => handleAddEquipment('frei')}
                  onUpdateField={handleUpdateField}
                  onStatusChange={handleStatusChange}
                  onDeleteRequest={setDeleteTarget}
                  projectContacts={projectContacts}
                  selectedContacts={contactsByStatus.frei}
                  onContactsChange={(c) => handleContactsChange('frei', c)}
                />
              </PaperEngine>
            </div>
          </div>
        </div>
      </div>

      {/* Lagerplatz-Append: nur in @media print sichtbar, nach den 3 Gerätekarten */}
      {printLagerplaetze && storageLocations.length > 0 && (
        <div className="geraete-lagerplatz-append" aria-hidden="true">
          {storageLocations.map((loc) => {
            const coords = loc.map_center_lat && loc.map_center_lng
              ? { lat: loc.map_center_lat, lng: loc.map_center_lng }
              : null

            const mapNode = loc.screenshot_url ? (
              <img
                src={loc.screenshot_url}
                alt=""
                style={{ width: '100%', height: '640px', objectFit: 'cover', display: 'block' }}
              />
            ) : (
              <div style={{
                width: '100%', height: '120px', background: '#f0f0f0',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: '#bbb', fontSize: '8pt',
              }}>
                Kein Screenshot
              </div>
            )

            return (
              <PaperEngine key={loc.id} orientation="portrait" zoom={100} onPrint={() => {}}>
                <LagerplatzPaper
                  location={loc}
                  companyName={companyName}
                  projectName={project.name}
                  kostenstelle={project.nr || ''}
                  logoUrl={logoUrl ?? null}
                  addressStreet={loc.address_street ?? ''}
                  addressNumber={loc.address_number ?? ''}
                  addressZip={loc.address_zip ?? ''}
                  addressCity={loc.address_city ?? ''}
                  onAddressPartChange={() => {}}
                  onSearchAddress={() => {}}
                  isGeocoding={false}
                  coordinates={coords}
                  mapNode={mapNode}
                  onUpdateField={() => {}}
                  projectContacts={[]}
                  selectedContacts={parseSnapshots(loc.contacts_json)}
                  onContactsChange={() => {}}
                />
              </PaperEngine>
            )
          })}
        </div>
      )}

      <DeleteEquipmentDialog
        item={deleteTarget}
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  )
}
