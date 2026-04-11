'use client'

import { forwardRef, useCallback, useEffect, useImperativeHandle, useRef, useState } from 'react'
import { toast } from 'sonner'
import { PaperEngine } from '@/components/paper-engine'
import { LagerplatzPaper } from '@/components/lagerplatz-paper'
import { LagerplatzMap, type LagerplatzMapRef } from '@/components/lagerplatz-map'
import { LagerplatzCanvas } from '@/components/lagerplatz-canvas'
import { updateStorageLocation, clearLocationScreenshot } from '@/lib/services/storage-location-service'
import type { StorageLocation, Stroke } from '@/lib/validations/storage-location'
import type { Project } from '@/lib/validations/project'
import type { ProjectContact } from '@/lib/validations/project-settings'

export interface ContactSnapshot { id: string; funktion: string | null; name: string; phone: string | null }

/**
 * Draws a Mapbox-style teardrop pin on a canvas context.
 * tipX/tipY are CSS pixel coordinates; dpr converts to physical pixels.
 */
function drawMapPin(ctx: CanvasRenderingContext2D, cssX: number, cssY: number, color: string, dpr: number) {
  // Physical size matching the Mapbox default marker (27×41 CSS px)
  const W = 27 * dpr
  const H = 41 * dpr
  const tipX = cssX * dpr
  const tipY = cssY * dpr
  const left = tipX - W / 2
  const top = tipY - H
  // Scale factors from SVG-unit to physical pixel
  const sx = W / 27
  const sy = H / 41

  ctx.save()
  ctx.shadowColor = 'rgba(0,0,0,0.55)'
  ctx.shadowBlur = 6
  ctx.shadowOffsetX = 1
  ctx.shadowOffsetY = 2

  // Teardrop body (matches Mapbox SVG path for viewBox 0 0 27 41)
  ctx.beginPath()
  ctx.moveTo(left + 13.5 * sx, top)
  ctx.bezierCurveTo(left + 6.04 * sx, top, left, top + 6.04 * sy, left, top + 13.5 * sy)
  ctx.bezierCurveTo(left, top + 23 * sy, left + 13.5 * sx, top + 40.5 * sy, left + 13.5 * sx, top + 40.5 * sy)
  ctx.bezierCurveTo(left + 13.5 * sx, top + 40.5 * sy, left + 27 * sx, top + 23 * sy, left + 27 * sx, top + 13.5 * sy)
  ctx.bezierCurveTo(left + 27 * sx, top + 6.04 * sy, left + 20.96 * sx, top, left + 13.5 * sx, top)
  ctx.closePath()
  ctx.fillStyle = color
  ctx.fill()

  // Inner white circle
  ctx.shadowColor = 'transparent'
  ctx.beginPath()
  ctx.arc(left + 13.5 * sx, top + 13.5 * sy, 5.5 * sx, 0, Math.PI * 2)
  ctx.fillStyle = 'rgba(255,255,255,0.7)'
  ctx.fill()

  ctx.restore()
}

function parseContactSnapshots(raw: string | null): ContactSnapshot[] {
  if (!raw) return []
  try { return JSON.parse(raw) } catch { return [] }
}

export interface LagerplatzCardState {
  isDrawing: boolean
  canUndo: boolean
  hasScreenshot: boolean
}

export interface LagerplatzCardRef {
  takeScreenshot: () => void
  toggleDraw: () => void
  undo: () => void
  retake: () => void
  getState: () => LagerplatzCardState
}

interface LagerplatzCardProps {
  location: StorageLocation
  project: Project
  companyName: string
  logoUrl: string | null
  zoom: number
  penColor: string
  penWidth: number
  projectContacts: ProjectContact[]
  isActive: boolean
  onActivate: () => void
  onDelete: () => void
  onStateChange: (id: string, state: LagerplatzCardState) => void
  projectId: string
}

export const LagerplatzCard = forwardRef<LagerplatzCardRef, LagerplatzCardProps>(
  function LagerplatzCard(
    { location, project, companyName, logoUrl, zoom, penColor, penWidth, projectContacts, isActive, onActivate, onDelete, onStateChange, projectId },
    ref
  ) {
    const mapboxToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN
    const mapRef = useRef<LagerplatzMapRef | null>(null)
    const wrapperRef = useRef<HTMLDivElement>(null)

    // Address state
    const [addressStreet, setAddressStreet] = useState(location.address_street ?? '')
    const [addressNumber, setAddressNumber] = useState(location.address_number ?? '')
    const [addressZip, setAddressZip] = useState(location.address_zip ?? '')
    const [addressCity, setAddressCity] = useState(location.address_city ?? '')
    const addressSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
    const mapMoveSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

    // Map + marker
    const [markerPosition, setMarkerPosition] = useState<{ lat: number; lng: number } | null>(
      location.map_center_lat && location.map_center_lng
        ? { lat: location.map_center_lat, lng: location.map_center_lng }
        : null
    )
    const [isGeocoding, setIsGeocoding] = useState(false)

    // Contacts
    const [selectedContacts, setSelectedContacts] = useState<ContactSnapshot[]>(
      parseContactSnapshots(location.contacts_json)
    )

    // Screenshot + drawing
    const [screenshotDataUrl, setScreenshotDataUrl] = useState<string | null>(
      location.screenshot_url ?? null
    )
    const [strokes, setStrokes] = useState<Stroke[]>(location.drawing_data ?? [])
    const [isDrawing, setIsDrawing] = useState(false)
    const [isCapturing, setIsCapturing] = useState(false)

    // Notify parent of state changes
    const notifyState = useCallback(
      (drawing: boolean, strokeCount: number, hasShot: boolean) => {
        onStateChange(location.id, {
          isDrawing: drawing,
          canUndo: strokeCount > 0,
          hasScreenshot: hasShot,
        })
      },
      [location.id, onStateChange]
    )

    useEffect(() => {
      notifyState(isDrawing, strokes.length, !!screenshotDataUrl)
    }, [isDrawing, strokes.length, screenshotDataUrl, notifyState])

    // Cleanup map-move save timer on unmount
    useEffect(() => {
      return () => {
        if (mapMoveSaveTimerRef.current) clearTimeout(mapMoveSaveTimerRef.current)
      }
    }, [])

    // Sync when location.id changes
    useEffect(() => {
      setAddressStreet(location.address_street ?? '')
      setAddressNumber(location.address_number ?? '')
      setAddressZip(location.address_zip ?? '')
      setAddressCity(location.address_city ?? '')
      setScreenshotDataUrl(location.screenshot_url ?? null)
      setStrokes(location.drawing_data ?? [])
      setIsDrawing(false)
      setMarkerPosition(
        location.map_center_lat && location.map_center_lng
          ? { lat: location.map_center_lat, lng: location.map_center_lng }
          : null
      )
      setSelectedContacts(parseContactSnapshots(location.contacts_json))
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [location.id])

    // Imperative handle for action bar
    useImperativeHandle(ref, () => ({
      takeScreenshot: handleScreenshot,
      toggleDraw: () => setIsDrawing((p) => !p),
      undo: handleUndo,
      retake: handleRetake,
      getState: () => ({
        isDrawing,
        canUndo: strokes.length > 0,
        hasScreenshot: !!screenshotDataUrl,
      }),
    }))

    // Auto-save address (debounced 800ms)
    const scheduleAddressSave = useCallback(
      (street: string, number: string, zip: string, city: string) => {
        if (addressSaveTimerRef.current) clearTimeout(addressSaveTimerRef.current)
        addressSaveTimerRef.current = setTimeout(async () => {
          await updateStorageLocation(location.id, {
            address_street: street.trim() || null,
            address_number: number.trim() || null,
            address_zip: zip.trim() || null,
            address_city: city.trim() || null,
          })
        }, 800)
      },
      [location.id]
    )

    const handleAddressPartChange = useCallback(
      (field: 'street' | 'number' | 'zip' | 'city', value: string) => {
        let s = addressStreet, n = addressNumber, z = addressZip, c = addressCity
        if (field === 'street') { setAddressStreet(value); s = value }
        else if (field === 'number') { setAddressNumber(value); n = value }
        else if (field === 'zip') { setAddressZip(value); z = value }
        else if (field === 'city') { setAddressCity(value); c = value }
        scheduleAddressSave(s, n, z, c)
      },
      [addressStreet, addressNumber, addressZip, addressCity, scheduleAddressSave]
    )

    const handleSearchAddress = useCallback(async () => {
      const parts = [
        addressStreet.trim(),
        addressNumber.trim(),
        addressZip.trim(),
        addressCity.trim(),
      ].filter(Boolean)
      if (parts.length === 0) {
        toast.error('Bitte mindestens ein Adressfeld ausfullen.')
        return
      }
      if (!mapboxToken) return
      setIsGeocoding(true)
      const query = `${parts.join(' ')}, Deutschland`
      try {
        const res = await fetch(
          `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(query)}.json?access_token=${mapboxToken}&language=de&limit=1`
        )
        if (!res.ok) throw new Error()
        const data = await res.json()
        if (data.features?.[0]) {
          const [lng, lat] = data.features[0].center as [number, number]
          setMarkerPosition({ lat, lng })
          mapRef.current?.flyTo(lat, lng)
          await updateStorageLocation(location.id, { map_center_lat: lat, map_center_lng: lng })
        } else {
          toast.error('Adresse nicht gefunden.')
        }
      } catch {
        toast.error('Geocoding fehlgeschlagen.')
      } finally {
        setIsGeocoding(false)
      }
    }, [addressStreet, addressNumber, addressZip, addressCity, mapboxToken, location.id])

    // Reverse geocoding — map click → fill address fields
    const handleMapClick = useCallback(async (lat: number, lng: number) => {
      if (!mapboxToken) return
      setMarkerPosition({ lat, lng })
      await updateStorageLocation(location.id, { map_center_lat: lat, map_center_lng: lng })

      try {
        const res = await fetch(
          `https://api.mapbox.com/geocoding/v5/mapbox.places/${lng},${lat}.json?access_token=${mapboxToken}&language=de&types=address&limit=1`
        )
        if (!res.ok) return
        const data = await res.json()
        const feature = data.features?.[0]
        if (!feature) return

        const street = feature.text ?? ''
        const number = feature.address ?? ''
        let zip = '', city = ''
        for (const ctx of (feature.context ?? []) as { id: string; text: string }[]) {
          if (ctx.id.startsWith('postcode.')) zip = ctx.text
          if (ctx.id.startsWith('place.')) city = ctx.text
        }

        setAddressStreet(street)
        setAddressNumber(number)
        setAddressZip(zip)
        setAddressCity(city)
        scheduleAddressSave(street, number, zip, city)
      } catch {
        // Reverse geocoding ist best-effort — kein Toast bei Fehler
      }
    }, [mapboxToken, location.id, scheduleAddressSave])

    const handleMapMove = useCallback(
      (center: { lat: number; lng: number }, mapZoom: number) => {
        if (mapMoveSaveTimerRef.current) clearTimeout(mapMoveSaveTimerRef.current)
        mapMoveSaveTimerRef.current = setTimeout(() => {
          updateStorageLocation(location.id, {
            map_center_lat: center.lat,
            map_center_lng: center.lng,
            map_zoom: Math.round(mapZoom),
          })
        }, 3000)
      },
      [location.id]
    )

    const handleUpdateField = useCallback(
      async (field: string, value: string | null) => {
        const updated = await updateStorageLocation(location.id, { [field]: value })
        if (!updated) toast.error('Speichern fehlgeschlagen.')
      },
      [location.id]
    )

    const handleContactsChange = useCallback(
      async (contacts: ContactSnapshot[]) => {
        setSelectedContacts(contacts)
        await updateStorageLocation(location.id, {
          contacts_json: contacts.length > 0 ? JSON.stringify(contacts) : null,
        })
      },
      [location.id]
    )

    const handleScreenshot = useCallback(async () => {
      if (!mapRef.current) return
      setIsCapturing(true)

      await new Promise((r) => setTimeout(r, 100))

      const canvas = mapRef.current.getCanvas()
      if (!canvas) {
        toast.error('Karte nicht bereit fuer Screenshot.')
        setIsCapturing(false)
        return
      }

      let dataUrl: string
      try {
        const markerScreen = mapRef.current?.getMarkerScreenPos() ?? null
        if (markerScreen) {
          // Composite: map canvas + marker pin drawn on top
          const offscreen = document.createElement('canvas')
          offscreen.width = canvas.width
          offscreen.height = canvas.height
          const ctx = offscreen.getContext('2d')
          if (!ctx) throw new Error('no-ctx')
          ctx.drawImage(canvas, 0, 0)
          // DPR: physical canvas pixels ÷ CSS pixels
          const dpr = canvas.width / (canvas.clientWidth || canvas.width)
          drawMapPin(ctx, markerScreen.x, markerScreen.y, '#e8c547', dpr)
          dataUrl = offscreen.toDataURL('image/jpeg', 0.85)
        } else {
          dataUrl = canvas.toDataURL('image/jpeg', 0.85)
        }
      } catch {
        toast.error('Karte konnte nicht erfasst werden (Canvas-Sicherheitsfehler).')
        setIsCapturing(false)
        return
      }

      if (!dataUrl || dataUrl === 'data:,') {
        toast.error('Karte konnte nicht erfasst werden — bitte kurz warten und erneut versuchen.')
        setIsCapturing(false)
        return
      }

      setScreenshotDataUrl(dataUrl)
      setStrokes([])

      try {
        const base64 = dataUrl.replace(/^data:image\/\w+;base64,/, '')
        const res = await fetch('/api/storage-locations/screenshot', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            storage_location_id: location.id,
            project_id: projectId,
            image_base64: base64,
          }),
        })
        if (res.ok) {
          // Screenshot gespeichert — kein Toast
        } else {
          const body = await res.json().catch(() => ({}))
          toast.error(`Screenshot-Upload fehlgeschlagen: ${body.error ?? res.status}`)
          setScreenshotDataUrl(null)
          setIsDrawing(false)
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err)
        toast.error(`Upload-Fehler: ${msg}`)
        setScreenshotDataUrl(null)
        setIsDrawing(false)
      }

      setTimeout(() => setIsCapturing(false), 800)
    }, [location.id, projectId])

    const handleRetake = useCallback(() => {
      setScreenshotDataUrl(null)
      setStrokes([])
      setIsDrawing(false)
      clearLocationScreenshot(location.id)
    }, [location.id])

    const handleUndo = useCallback(() => {
      setStrokes((prev) => {
        const next = prev.slice(0, -1)
        updateStorageLocation(location.id, { drawing_data: next.length > 0 ? next : null })
        return next
      })
    }, [location.id])

    const handleStrokeComplete = useCallback(
      (stroke: Stroke) => {
        setStrokes((prev) => {
          const next = [...prev, stroke]
          updateStorageLocation(location.id, { drawing_data: next })
          return next
        })
      },
      [location.id]
    )

    const handlePrint = useCallback(() => {
      const prev = document.title
      document.title = `${location.name} – ${project.name}`
      wrapperRef.current?.setAttribute('data-print-only', 'true')
      window.print()
      window.addEventListener('afterprint', () => {
        wrapperRef.current?.removeAttribute('data-print-only')
        document.title = prev
      }, { once: true })
    }, [location.name, project.name])

    const mapNode = screenshotDataUrl ? (
      <LagerplatzCanvas
        screenshotDataUrl={screenshotDataUrl}
        strokes={strokes}
        isDrawing={isDrawing}
        penColor={penColor}
        penWidth={penWidth}
        onStrokeComplete={handleStrokeComplete}
        onCompositeUpdate={() => {}}
        onRetake={handleRetake}
      />
    ) : (
      <LagerplatzMap
        ref={mapRef}
        locationKey={location.id}
        center={
          location.map_center_lat && location.map_center_lng
            ? { lat: location.map_center_lat, lng: location.map_center_lng }
            : undefined
        }
        zoom={location.map_zoom ?? 15}
        markerPosition={markerPosition}
        onMoveEnd={handleMapMove}
        onMapClick={handleMapClick}
        isCapturing={isCapturing}
      />
    )

    return (
      // onFocus bubbles from any focused child → activates this card
      <div
        ref={wrapperRef}
        style={{ flexShrink: 0 }}
        onFocus={onActivate}
        onClick={onActivate}
        className={`rounded-[6px] transition-shadow duration-150 ${isActive ? 'ring-8 ring-[#e8c547]' : 'lagerplatz-card-hover'}`}
      >
        <PaperEngine
          orientation="portrait"
          zoom={zoom}
          onPrint={handlePrint}
          onDelete={onDelete}
        >
          <LagerplatzPaper
            location={location}
            companyName={companyName}
            projectName={project.name}
            kostenstelle={project.nr ?? ''}
            logoUrl={logoUrl}
            addressStreet={addressStreet}
            addressNumber={addressNumber}
            addressZip={addressZip}
            addressCity={addressCity}
            onAddressPartChange={handleAddressPartChange}
            onSearchAddress={handleSearchAddress}
            isGeocoding={isGeocoding}
            coordinates={markerPosition}
            mapNode={mapNode}
            onUpdateField={handleUpdateField}
            projectContacts={projectContacts}
            selectedContacts={selectedContacts}
            onContactsChange={handleContactsChange}
          />
        </PaperEngine>
      </div>
    )
  }
)
