'use client'

import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react'
import 'mapbox-gl/dist/mapbox-gl.css'

interface LagerplatzMapProps {
  center?: { lat: number; lng: number }
  zoom?: number
  markerPosition?: { lat: number; lng: number } | null
  onMoveEnd: (center: { lat: number; lng: number }, zoom: number) => void
  onMapClick?: (lat: number, lng: number) => void
  isCapturing: boolean
  /** Changes whenever the active location switches — forces the flyTo effect to re-run */
  locationKey?: string
}

export interface LagerplatzMapRef {
  getCanvas: () => HTMLCanvasElement | null
  flyTo: (lat: number, lng: number) => void
  /** Returns the marker's position in CSS pixels (map-relative), or null if no marker. */
  getMarkerScreenPos: () => { x: number; y: number } | null
}

export const LagerplatzMap = forwardRef<LagerplatzMapRef, LagerplatzMapProps>(
  function LagerplatzMap({ center, zoom = 15, markerPosition, onMoveEnd, onMapClick, isCapturing, locationKey }, ref) {
    const containerRef = useRef<HTMLDivElement>(null)
    const mapInstanceRef = useRef<mapboxgl.Map | null>(null)
    const markerRef = useRef<mapboxgl.Marker | null>(null)
    const [mapLoaded, setMapLoaded] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const moveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

    const mapboxToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN

    useImperativeHandle(ref, () => ({
      getCanvas: () => {
        if (!mapInstanceRef.current) return null
        return mapInstanceRef.current.getCanvas()
      },
      flyTo: (lat: number, lng: number) => {
        if (!mapInstanceRef.current) return
        mapInstanceRef.current.flyTo({ center: [lng, lat], zoom: 16, duration: 1000 })
      },
      getMarkerScreenPos: () => {
        const map = mapInstanceRef.current
        const marker = markerRef.current
        if (!map || !marker) return null
        const point = map.project(marker.getLngLat())
        return { x: point.x, y: point.y }
      },
    }))

    // Initialize map
    useEffect(() => {
      if (!mapboxToken || mapboxToken === 'pk.ey...') {
        setError('Mapbox API-Key fehlt. Bitte NEXT_PUBLIC_MAPBOX_TOKEN in .env.local setzen.')
        return
      }
      if (!containerRef.current) return

      let map: mapboxgl.Map | null = null

      async function initMap() {
        const mapboxgl = (await import('mapbox-gl')).default
        if (!containerRef.current) return

        map = new mapboxgl.Map({
          container: containerRef.current,
          style: 'mapbox://styles/mapbox/satellite-streets-v12',
          center: center ? [center.lng, center.lat] : [10.0, 51.0],
          zoom: center ? zoom : 6,
          accessToken: mapboxToken,
          preserveDrawingBuffer: true,
        })

        map.addControl(new mapboxgl.NavigationControl(), 'top-right')

        map.on('load', () => {
          setMapLoaded(true)
        })

        map.on('click', (e) => {
          onMapClick?.(e.lngLat.lat, e.lngLat.lng)
        })

        map.on('moveend', () => {
          if (moveTimeoutRef.current) clearTimeout(moveTimeoutRef.current)
          moveTimeoutRef.current = setTimeout(() => {
            moveTimeoutRef.current = null
            if (!map) return
            const c = map.getCenter()
            onMoveEnd({ lat: c.lat, lng: c.lng }, map.getZoom())
          }, 1000)
        })

        mapInstanceRef.current = map
      }

      initMap()

      return () => {
        // Flush pending moveend: call onMoveEnd immediately before destroying the map
        // so the parent can persist the final position even if the user navigates away quickly.
        if (moveTimeoutRef.current && map) {
          clearTimeout(moveTimeoutRef.current)
          moveTimeoutRef.current = null
          const c = map.getCenter()
          onMoveEnd({ lat: c.lat, lng: c.lng }, map.getZoom())
        }
        if (markerRef.current) { markerRef.current.remove(); markerRef.current = null }
        if (map) { map.remove(); mapInstanceRef.current = null }
      }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [mapboxToken])

    // Update map center on location change
    // locationKey changes on every location switch → effect fires even if center lat/lng stayed undefined
    useEffect(() => {
      if (!mapInstanceRef.current || !mapLoaded) return
      if (center) {
        mapInstanceRef.current.flyTo({ center: [center.lng, center.lat], zoom, duration: 800 })
      } else {
        // No saved coordinates for this location → reset to Germany overview
        mapInstanceRef.current.flyTo({ center: [10.0, 51.0], zoom: 6, duration: 800 })
      }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [locationKey, mapLoaded])

    // Update DOM marker when markerPosition changes
    useEffect(() => {
      const map = mapInstanceRef.current
      if (!map || !mapLoaded) return

      async function updateMarker() {
        const mapboxgl = (await import('mapbox-gl')).default

        if (!markerPosition) {
          if (markerRef.current) {
            markerRef.current.remove()
            markerRef.current = null
          }
          return
        }

        if (markerRef.current) {
          markerRef.current.setLngLat([markerPosition.lng, markerPosition.lat])
        } else {
          markerRef.current = new mapboxgl.Marker({ color: '#e8c547' })
            .setLngLat([markerPosition.lng, markerPosition.lat])
            .addTo(map!)
        }
      }

      updateMarker()
    }, [markerPosition, mapLoaded])

    if (error) {
      return (
        <div className="flex items-center justify-center border border-border rounded-b-lg bg-card text-center p-6 w-full" style={{ height: '640px' }}>
          <div>
            <p className="text-sm font-semibold text-destructive mb-2">Karte nicht verfuegbar</p>
            <p className="text-xs text-muted-foreground max-w-[280px]">{error}</p>
          </div>
        </div>
      )
    }

    return (
      <div className="relative w-full" style={{ height: '640px' }}>
        <div ref={containerRef} className="w-full h-full rounded-b-lg overflow-hidden" />

        {!mapLoaded && (
          <div className="absolute inset-0 flex items-center justify-center bg-card/80 rounded-b-lg">
            <div className="flex flex-col items-center gap-2">
              <div className="w-6 h-6 border-2 border-[#e8c547] border-t-transparent rounded-full animate-spin" />
              <span className="text-xs text-muted-foreground">Karte wird geladen...</span>
            </div>
          </div>
        )}

        {isCapturing && (
          <div className="absolute inset-0 rounded-b-lg overflow-hidden pointer-events-none" style={{ zIndex: 20 }}>
            <div className="absolute inset-y-0 left-0 bg-[#e8c547]/30 animate-[curtainWipe_0.6s_ease-in-out_forwards]" />
          </div>
        )}
      </div>
    )
  }
)
