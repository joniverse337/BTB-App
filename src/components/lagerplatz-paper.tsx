'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Plus, X } from 'lucide-react'
import type { StorageLocation } from '@/lib/validations/storage-location'
import type { ProjectContact } from '@/lib/validations/project-settings'
import type { ContactSnapshot } from '@/components/lagerplatz-card'

// ── Ansprechpartner-Picker ─────────────────────────────────

function ContactPicker({
  selected,
  available,
  onChange,
}: {
  selected: ContactSnapshot[]
  available: ProjectContact[]
  onChange: (c: ContactSnapshot[]) => void
}) {
  const [open, setOpen] = useState(false)
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null)
  const btnRef = useRef<HTMLButtonElement>(null)
  const dropRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const handle = (e: MouseEvent) => {
      if (
        dropRef.current && !dropRef.current.contains(e.target as Node) &&
        btnRef.current && !btnRef.current.contains(e.target as Node)
      ) setOpen(false)
    }
    document.addEventListener('mousedown', handle)
    return () => document.removeEventListener('mousedown', handle)
  }, [open])

  const openPicker = useCallback(() => {
    if (btnRef.current) {
      const rect = btnRef.current.getBoundingClientRect()
      setPos({ top: rect.bottom + window.scrollY + 4, left: rect.left + window.scrollX })
    }
    setOpen((v) => !v)
  }, [])

  const remaining = available.filter((c) => !selected.some((s) => s.id === c.id))

  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '3px' }}>
      {selected.map((c) => (
        <span
          key={c.id}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: '2px',
            background: '#f0f0f0', border: '1px solid #ddd',
            borderRadius: '3px', padding: '1px 4px', fontSize: '7pt',
          }}
        >
          {c.funktion ? `${c.funktion}: ` : ''}{c.name}{c.phone ? ` · ${c.phone}` : ''}
          <button
            data-no-print="true"
            onClick={() => onChange(selected.filter((s) => s.id !== c.id))}
            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, color: '#e05555', lineHeight: 1, display: 'flex', alignItems: 'center' }}
          >
            <X size={8} />
          </button>
        </span>
      ))}
      {remaining.length > 0 && (
        <button
          ref={btnRef}
          data-no-print="true"
          onClick={openPicker}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: '2px',
            fontSize: '7pt', padding: '1px 5px',
            background: '#1a2040', color: '#fff',
            border: 'none', borderRadius: '3px', cursor: 'pointer',
          }}
        >
          <Plus size={8} /> Auswählen
        </button>
      )}
      {selected.length === 0 && remaining.length === 0 && available.length === 0 && (
        <span style={{ fontSize: '7pt', color: '#bbb' }}>Keine Kontakte</span>
      )}
      {open && pos && typeof document !== 'undefined' && createPortal(
        <div
          ref={dropRef}
          data-no-print="true"
          style={{
            position: 'absolute', top: pos.top, left: pos.left,
            zIndex: 9999, background: '#fff', border: '1px solid #ddd',
            borderRadius: '8px', padding: '6px', boxShadow: '0 4px 16px rgba(0,0,0,0.15)',
            minWidth: '160px',
          }}
        >
          {remaining.map((c) => (
            <button
              key={c.id}
              onClick={() => {
                onChange([...selected, { id: c.id, funktion: c.funktion, name: c.name, phone: c.phone }])
                setOpen(false)
              }}
              style={{
                display: 'block', width: '100%', textAlign: 'left',
                padding: '5px 8px', background: 'none', border: 'none',
                cursor: 'pointer', fontSize: '8pt', borderRadius: '4px',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = '#f5f5f5')}
              onMouseLeave={(e) => (e.currentTarget.style.background = 'none')}
            >
              <span style={{ fontWeight: 500 }}>{c.name}</span>
              {c.funktion && <span style={{ color: '#888', marginLeft: '4px', fontSize: '7.5pt' }}>{c.funktion}</span>}
            </button>
          ))}
        </div>,
        document.body
      )}
    </div>
  )
}

// ── Props ──────────────────────────────────────────────────

interface LagerplatzPaperProps {
  location: StorageLocation | null
  companyName: string
  projectName: string
  kostenstelle: string
  logoUrl: string | null
  // Address parts (state managed by parent)
  addressStreet: string
  addressNumber: string
  addressZip: string
  addressCity: string
  onAddressPartChange: (field: 'street' | 'number' | 'zip' | 'city', value: string) => void
  onSearchAddress: () => void
  isGeocoding: boolean
  // Geocoded coordinates for display
  coordinates: { lat: number; lng: number } | null
  // Map or canvas node rendered in the map slot
  mapNode: React.ReactNode
  onUpdateField: (field: string, value: string | null) => void
  // Contacts
  projectContacts: ProjectContact[]
  selectedContacts: ContactSnapshot[]
  onContactsChange: (contacts: ContactSnapshot[]) => void
}

function formatCoord(value: number) {
  return value.toFixed(6)
}

export function LagerplatzPaper({
  location,
  companyName,
  projectName,
  kostenstelle,
  logoUrl,
  addressStreet,
  addressNumber,
  addressZip,
  addressCity,
  onAddressPartChange,
  onSearchAddress,
  isGeocoding,
  coordinates,
  mapNode,
  onUpdateField,
  projectContacts,
  selectedContacts,
  onContactsChange,
}: LagerplatzPaperProps) {
  const [name, setName] = useState(location?.name ?? '')
  const [description, setDescription] = useState(location?.description ?? '')

  // Sync from outside when location changes
  useEffect(() => {
    setName(location?.name ?? '')
    setDescription(location?.description ?? '')
  }, [location?.id, location?.name, location?.description])

  const handleBlur = (field: string, value: string) => {
    const trimmed = value.trim()
    const newVal = trimmed === '' ? null : trimmed
    const oldVal = field === 'name' ? location?.name : location?.description
    if (newVal !== (oldVal ?? null)) {
      onUpdateField(field, newVal)
    }
  }

  const today = new Date().toLocaleDateString('de-DE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })

  const fullAddress = [
    addressStreet && addressNumber ? `${addressStreet} ${addressNumber}` : addressStreet,
    addressZip && addressCity ? `${addressZip} ${addressCity}` : addressCity,
  ].filter(Boolean).join(', ')

  const googleMapsUrl = coordinates
    ? `https://www.google.com/maps?q=${coordinates.lat},${coordinates.lng}`
    : null
  const appleMapsUrl = coordinates
    ? `https://maps.apple.com/?ll=${coordinates.lat},${coordinates.lng}&q=Lagerplatz`
    : null

  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        padding: '8mm',
        fontFamily: 'var(--font-ibm-plex-sans), sans-serif',
        color: '#222',
        display: 'flex',
        flexDirection: 'column',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Header */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          borderBottom: '2.5px solid #1a2040',
          paddingBottom: '5px',
          marginBottom: '8px',
        }}
      >
        <div
          style={{
            fontSize: '7.5pt',
            color: '#555',
            display: 'flex',
            gap: '14px',
            flexWrap: 'wrap',
          }}
        >
          <span>
            <strong style={{ color: '#333' }}>Firma:</strong> {companyName}
          </span>
          <span>
            <strong style={{ color: '#333' }}>Bauvorhaben:</strong> {projectName}
          </span>
          {kostenstelle && (
            <span>
              <strong style={{ color: '#333' }}>Kostenstelle:</strong> {kostenstelle}
            </span>
          )}
        </div>
        {logoUrl && (
          <img
            src={logoUrl}
            alt="Firmenlogo"
            style={{ maxHeight: '28px', maxWidth: '100px', objectFit: 'contain' }}
          />
        )}
      </div>

      {/* Lagerplatz Name */}
      <input
        type="text"
        value={name}
        onChange={(e) => setName(e.target.value)}
        onBlur={() => handleBlur('name', name)}
        placeholder="Lagerplatz-Name..."
        style={{
          fontFamily: 'var(--font-inter), sans-serif',
          fontWeight: 700,
          fontSize: '14pt',
          color: '#1a2040',
          border: 'none',
          borderBottom: '1px solid #eee',
          background: 'transparent',
          outline: 'none',
          padding: '4px 0',
          marginBottom: '8px',
          width: '100%',
        }}
        aria-label="Lagerplatz-Name"
      />

      {/* Adresse (links) + Koordinaten/Links (rechts) */}
      <div style={{ display: 'flex', gap: '16px', marginBottom: '8px', alignItems: 'flex-start' }}>

        {/* Linke Spalte: 4 Adressfelder */}
        <div className="lagerplatz-address" style={{ display: 'flex', flexDirection: 'column', gap: '5px', flex: '1 1 0', minWidth: 0 }}>
          {/* Zeile 1: Straße */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
            <span style={{ fontSize: '6.5pt', color: '#1a2040', textTransform: 'uppercase', letterSpacing: '0.03em' }}>Straße</span>
            <input type="text" value={addressStreet} onChange={(e) => onAddressPartChange('street', e.target.value)} placeholder="Straße" aria-label="Straße"
              style={{ fontFamily: 'var(--font-ibm-plex-sans), sans-serif', fontSize: '8.5pt', color: '#333', background: '#f7f7f7', border: '1px solid #e0e0e0', borderRadius: '3px', outline: 'none', padding: '4px 8px', width: '100%', WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' } as React.CSSProperties} />
          </div>

          {/* Zeile 2: Hausnummer + PLZ nebeneinander */}
          <div style={{ display: 'flex', gap: '8px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', flex: 1 }}>
              <span style={{ fontSize: '6.5pt', color: '#1a2040', textTransform: 'uppercase', letterSpacing: '0.03em' }}>Hausnummer</span>
              <input type="text" value={addressNumber} onChange={(e) => onAddressPartChange('number', e.target.value)} placeholder="Nr." aria-label="Hausnummer"
                style={{ fontFamily: 'var(--font-ibm-plex-sans), sans-serif', fontSize: '8.5pt', color: '#333', background: '#f7f7f7', border: '1px solid #e0e0e0', borderRadius: '3px', outline: 'none', padding: '4px 8px', width: '100%', WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' } as React.CSSProperties} />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', flex: 1 }}>
              <span style={{ fontSize: '6.5pt', color: '#1a2040', textTransform: 'uppercase', letterSpacing: '0.03em' }}>Postleitzahl</span>
              <input type="text" value={addressZip} onChange={(e) => onAddressPartChange('zip', e.target.value)} placeholder="PLZ" aria-label="Postleitzahl"
                style={{ fontFamily: 'var(--font-ibm-plex-sans), sans-serif', fontSize: '8.5pt', color: '#333', background: '#f7f7f7', border: '1px solid #e0e0e0', borderRadius: '3px', outline: 'none', padding: '4px 8px', width: '100%', WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' } as React.CSSProperties} />
            </div>
          </div>

          {/* Zeile 3: Ort + Suchen-Button */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
            <span style={{ fontSize: '6.5pt', color: '#1a2040', textTransform: 'uppercase', letterSpacing: '0.03em' }}>Ort</span>
            <div style={{ display: 'flex', gap: '6px' }}>
              <input type="text" value={addressCity} onChange={(e) => onAddressPartChange('city', e.target.value)} placeholder="Ort" aria-label="Ort"
                style={{ fontFamily: 'var(--font-ibm-plex-sans), sans-serif', fontSize: '8.5pt', color: '#333', background: '#f7f7f7', border: '1px solid #e0e0e0', borderRadius: '3px', outline: 'none', padding: '4px 8px', flex: 1, WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' } as React.CSSProperties} />
              <button
                onClick={onSearchAddress}
                disabled={isGeocoding}
                style={{
                  fontSize: '7.5pt',
                  fontWeight: 600,
                  fontFamily: 'var(--font-ibm-plex-sans), sans-serif',
                  background: '#1a2040',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '3px',
                  padding: '4px 10px',
                  cursor: isGeocoding ? 'wait' : 'pointer',
                  whiteSpace: 'nowrap',
                  opacity: isGeocoding ? 0.6 : 1,
                }}
                aria-label="Adresse auf Karte suchen"
              >
                {isGeocoding ? '...' : 'Suchen'}
              </button>
            </div>
          </div>
        </div>

        {/* Rechte Spalte: Koordinaten + Navigation + Ansprechpartner */}
        <div style={{ display: 'flex', gap: '12px', flex: '1 1 0', minWidth: 0, paddingTop: '2px' }}>

          {/* Koordinaten + Navigation */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', flex: '0 0 auto' }}>
            {coordinates && (
              <div>
                <span style={{ fontSize: '6.5pt', color: '#1a2040', textTransform: 'uppercase', letterSpacing: '0.03em', display: 'block', marginBottom: '2px' }}>Koordinaten</span>
                <span style={{ fontSize: '7.5pt', color: '#555', fontFamily: 'monospace' }}>
                  {formatCoord(coordinates.lat)}, {formatCoord(coordinates.lng)}
                </span>
              </div>
            )}
            {(googleMapsUrl || appleMapsUrl) && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '3px', marginTop: '16px' }}>
                <span style={{ fontSize: '6.5pt', color: '#1a2040', textTransform: 'uppercase', letterSpacing: '0.03em' }}>Navigation <span style={{ textTransform: 'none', letterSpacing: 0 }}>(Link)</span></span>
                {googleMapsUrl && (
                  <a href={googleMapsUrl} target="_blank" rel="noopener noreferrer"
                    style={{ fontSize: '9.5pt', color: '#1a73e8', textDecoration: 'none' }}>
                    Google Maps
                  </a>
                )}
                {appleMapsUrl && (
                  <a href={appleMapsUrl} target="_blank" rel="noopener noreferrer"
                    style={{ fontSize: '9.5pt', color: '#1a73e8', textDecoration: 'none' }}>
                    Apple Maps
                  </a>
                )}
              </div>
            )}
          </div>

          {/* Ansprechpartner */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <span style={{ fontSize: '6.5pt', color: '#1a2040', textTransform: 'uppercase', letterSpacing: '0.03em', display: 'block', marginBottom: '4px' }}>Ansprechpartner</span>
            <ContactPicker
              selected={selectedContacts}
              available={projectContacts}
              onChange={onContactsChange}
            />
          </div>

        </div>

      </div>

      {/* Map slot — volle Breite, interaktiv */}
      <div
        style={{
          flex: '0 0 auto',
          marginBottom: '8px',
          overflow: 'hidden',
          borderRadius: '4px',
          border: '1px solid #e5e5e5',
        }}
      >
        {mapNode}
      </div>

      {/* Anmerkungen */}
      <textarea
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        onBlur={() => handleBlur('description', description)}
        placeholder="Anmerkungen..."
        style={{
          fontSize: '8.5pt',
          color: '#333',
          border: '1px solid #e0e0e0',
          borderRadius: '3px',
          background: '#f7f7f7',
          outline: 'none',
          padding: '6px 8px',
          resize: 'none',
          minHeight: '80px',
          maxHeight: '110px',
          width: '100%',
          marginTop: '8px',
          fontFamily: 'var(--font-ibm-plex-sans), sans-serif',
          lineHeight: 1.5,
          WebkitPrintColorAdjust: 'exact',
          printColorAdjust: 'exact',
        } as React.CSSProperties}
        aria-label="Anmerkungen"
      />

      {/* Footer — nur der Strich */}
      <div
        style={{
          borderTop: '1px solid #ddd',
          marginTop: 'auto',
          paddingTop: '4px',
        }}
      />
    </div>
  )
}
