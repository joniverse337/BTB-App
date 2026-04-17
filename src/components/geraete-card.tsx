'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { ArrowRight, ArrowLeft, X, Plus } from 'lucide-react'
import type { EquipmentItem, EquipmentStatus } from '@/lib/validations/equipment'
import { STATUS_LABELS, VALID_TRANSITIONS } from '@/lib/validations/equipment'
import { fetchStorageLocations } from '@/lib/services/storage-location-service'
import type { StorageLocation } from '@/lib/validations/storage-location'
import type { ProjectContact } from '@/lib/validations/project-settings'

interface ContactSnapshot { id: string; funktion: string | null; name: string; phone: string | null }
function parseContactSnapshots(raw: string | null): ContactSnapshot[] {
  if (!raw) return []
  try { return JSON.parse(raw) } catch { return [] }
}

// ── Types ──────────────────────────────────────────────────

interface ProjectInfo {
  name: string
  kostenstelle: string
  ansprechpartner: string
}

interface GeraeteCardProps {
  status: EquipmentStatus
  items: EquipmentItem[]
  projectInfo: ProjectInfo
  companyName: string
  pageNumber: number
  editableFields: 'all' | 'nummer-only' | 'none'
  projectId?: string
  onAddEquipment?: () => void
  onUpdateField: (id: string, field: string, value: string | null) => void
  onStatusChange: (id: string, from: EquipmentStatus, to: EquipmentStatus) => void
  onDeleteRequest: (item: EquipmentItem) => void
  projectContacts?: ProjectContact[]
  selectedContacts?: ContactSnapshot[]
  onContactsChange?: (contacts: ContactSnapshot[]) => void
}

// ── Styles ─────────────────────────────────────────────────

const TH_STYLE: React.CSSProperties = {
  padding: '5px 4px',
  textAlign: 'left',
  fontSize: '6.5pt',
  letterSpacing: '0.3px',
  textTransform: 'uppercase',
  color: '#fff',
  fontWeight: 600,
  whiteSpace: 'nowrap',
  borderRight: '1px solid rgba(255,255,255,0.15)',
  fontFamily: 'var(--font-ibm-plex-sans), sans-serif',
}

const TD_STYLE: React.CSSProperties = {
  padding: '4px 4px',
  borderBottom: '1px solid #ddd',
  borderRight: '1px solid #eee',
  verticalAlign: 'top',
  fontSize: '7.5pt',
  fontFamily: 'var(--font-ibm-plex-sans), sans-serif',
  color: '#222',
}

const INPUT_STYLE: React.CSSProperties = {
  width: '100%',
  background: 'transparent',
  border: '1px solid #ddd',
  borderRadius: '3px',
  fontFamily: 'var(--font-ibm-plex-sans), sans-serif',
  fontSize: '7.5pt',
  color: '#222',
  padding: '2px 4px',
  outline: 'none',
  minHeight: '22px',
  boxSizing: 'border-box',
}

const READONLY_STYLE: React.CSSProperties = {
  ...INPUT_STYLE,
  border: 'none',
  padding: '2px 4px',
}

const STATUS_COLORS: Record<EquipmentStatus, string> = {
  bedarf: '#1a2040',
  baustelle: '#2d5016',
  frei: '#5a3a10',
}

// ── Helper: Lagerplatz-Adresse formatieren ─────────────────

function formatStorageAddress(loc: StorageLocation): string {
  const street = [loc.address_street, loc.address_number].filter(Boolean).join(' ')
  const city = [loc.address_zip, loc.address_city].filter(Boolean).join(' ')
  const parts = [street, city].filter(Boolean)
  if (parts.length > 0) return parts.join(', ')
  return loc.address ?? ''
}

// ── Lieferadresse Cell mit Lagerplatz-Picker ───────────────

function LieferadresseCell({
  value,
  editable,
  projectId,
  onSave,
}: {
  value: string | null
  editable: boolean
  projectId?: string
  onSave: (v: string | null) => void
}) {
  const [localValue, setLocalValue] = useState(value ?? '')
  const [showPicker, setShowPicker] = useState(false)
  const [pickerPos, setPickerPos] = useState<{ top: number; left: number } | null>(null)
  const [locations, setLocations] = useState<StorageLocation[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const btnRef = useRef<HTMLButtonElement>(null)
  const pickerRef = useRef<HTMLDivElement>(null)

  useEffect(() => { setLocalValue(value ?? '') }, [value])

  // Picker schließen bei Klick außerhalb
  useEffect(() => {
    if (!showPicker) return
    const handle = (e: MouseEvent) => {
      if (
        pickerRef.current && !pickerRef.current.contains(e.target as Node) &&
        btnRef.current && !btnRef.current.contains(e.target as Node)
      ) setShowPicker(false)
    }
    document.addEventListener('mousedown', handle)
    return () => document.removeEventListener('mousedown', handle)
  }, [showPicker])

  const openPicker = useCallback(async () => {
    if (btnRef.current) {
      const rect = btnRef.current.getBoundingClientRect()
      setPickerPos({ top: rect.bottom + window.scrollY + 4, left: rect.left + window.scrollX })
    }
    if (!showPicker && locations.length === 0 && projectId) {
      setIsLoading(true)
      const data = await fetchStorageLocations(projectId)
      setLocations(data)
      setIsLoading(false)
    }
    setShowPicker((prev) => !prev)
  }, [showPicker, locations.length, projectId])

  const pickLocation = useCallback((loc: StorageLocation) => {
    const addr = formatStorageAddress(loc)
    const val = loc.name && addr ? `${loc.name}\n${addr}` : loc.name || addr
    setLocalValue(val)
    onSave(val)
    setShowPicker(false)
  }, [onSave])

  const handleBlur = () => {
    const trimmed = localValue.trim()
    const newVal = trimmed === '' ? null : trimmed
    if (newVal !== value) onSave(newVal)
  }

  if (!editable) {
    return <span style={{ ...READONLY_STYLE, whiteSpace: 'pre-wrap', display: 'block' }}>{value ?? ''}</span>
  }

  return (
    <div style={{ position: 'relative' }}>
      <AutoResizeTextarea
        value={localValue}
        placeholder="Adresse..."
        onChange={setLocalValue}
        onBlur={handleBlur}
        style={{ width: '100%' }}
        ariaLabel="Lieferadresse"
      />
      {projectId && (
        <button
          ref={btnRef}
          data-no-print="true"
          onClick={openPicker}
          title="Lagerplatz wählen"
          style={{
            position: 'absolute', top: '2px', right: '2px',
            width: '11px', height: '11px', borderRadius: '50%',
            border: `1px solid ${showPicker ? '#555' : '#aaa'}`,
            background: showPicker ? '#e0e0e0' : 'rgba(255,255,255,0.85)',
            cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '8pt', color: '#777', padding: 0, lineHeight: 1,
          }}
        >
          +
        </button>
      )}

      {showPicker && pickerPos && typeof document !== 'undefined' && createPortal(
        <div
          ref={pickerRef}
          data-no-print="true"
          style={{
            position: 'absolute',
            top: pickerPos.top,
            left: pickerPos.left,
            zIndex: 9999,
            background: '#fff',
            border: '1px solid #ddd',
            borderRadius: '8px',
            padding: '8px',
            boxShadow: '0 4px 16px rgba(0,0,0,0.15)',
            minWidth: '200px',
            maxWidth: '280px',
          }}
        >
          <p style={{ fontSize: '7pt', color: '#888', marginBottom: '6px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.3px' }}>
            Lagerplatz wählen
          </p>
          {isLoading ? (
            <p style={{ fontSize: '7pt', color: '#aaa' }}>Lädt…</p>
          ) : locations.length === 0 ? (
            <p style={{ fontSize: '7pt', color: '#aaa' }}>Keine Lagerplätze vorhanden</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
              {locations.map((loc) => {
                const addr = formatStorageAddress(loc)
                return (
                  <button
                    key={loc.id}
                    onClick={() => pickLocation(loc)}
                    style={{
                      textAlign: 'left',
                      padding: '5px 8px',
                      borderRadius: '5px',
                      border: '1px solid #eee',
                      background: '#fafafa',
                      cursor: 'pointer',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '1px',
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.background = '#f0f0f0' }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = '#fafafa' }}
                  >
                    <span style={{ fontSize: '7.5pt', fontWeight: 600, color: '#222' }}>{loc.name}</span>
                    {addr && <span style={{ fontSize: '6.5pt', color: '#888' }}>{addr}</span>}
                  </button>
                )
              })}
            </div>
          )}
        </div>,
        document.body
      )}
    </div>
  )
}

// ── Auto-resize Textarea ───────────────────────────────────

const TEXTAREA_STYLE: React.CSSProperties = {
  ...INPUT_STYLE,
  resize: 'none',
  overflow: 'hidden',
  lineHeight: '1.4',
  display: 'block',
}

function AutoResizeTextarea({
  value,
  placeholder,
  onChange,
  onBlur,
  style,
  ariaLabel,
}: {
  value: string
  placeholder?: string
  onChange: (val: string) => void
  onBlur: () => void
  style?: React.CSSProperties
  ariaLabel?: string
}) {
  const ref = useRef<HTMLTextAreaElement>(null)

  const adjust = useCallback(() => {
    const el = ref.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = el.scrollHeight + 'px'
  }, [])

  useEffect(() => { adjust() }, [value, adjust])

  return (
    <textarea
      ref={ref}
      rows={1}
      value={value}
      placeholder={placeholder}
      onChange={(e) => { onChange(e.target.value); adjust() }}
      onBlur={onBlur}
      style={{ ...TEXTAREA_STYLE, ...style }}
      aria-label={ariaLabel}
    />
  )
}

// ── Inline Cell Input ──────────────────────────────────────

function CellInput({
  value,
  placeholder,
  editable,
  type,
  onSave,
  ariaLabel,
}: {
  value: string | null
  placeholder?: string
  editable: boolean
  type?: 'text' | 'date'
  onSave: (val: string | null) => void
  ariaLabel?: string
}) {
  const [localValue, setLocalValue] = useState(value ?? '')

  // Sync from outside when value changes (e.g. after status change or reload)
  useEffect(() => {
    setLocalValue(value ?? '')
  }, [value])

  const displayValue = editable ? localValue : (value ?? '')

  const handleBlur = () => {
    const trimmed = localValue.trim()
    const newVal = trimmed === '' ? null : trimmed
    if (newVal !== value) {
      onSave(newVal)
    }
  }

  if (!editable) {
    return (
      <span style={READONLY_STYLE} aria-label={ariaLabel}>
        {displayValue || ''}
      </span>
    )
  }

  // Datum: sofort onChange speichern — Datums-Picker lösen kein zuverlässiges
  // onBlur aus (bes. in Citrix), daher wird bei jeder Auswahl direkt gespeichert.
  if (type === 'date') {
    return (
      <input
        type="date"
        value={localValue}
        onChange={(e) => {
          const val = e.target.value
          setLocalValue(val)
          onSave(val === '' ? null : val)
        }}
        onBlur={handleBlur}
        style={INPUT_STYLE}
        aria-label={ariaLabel}
      />
    )
  }

  return (
    <AutoResizeTextarea
      value={localValue}
      placeholder={placeholder}
      onChange={setLocalValue}
      onBlur={handleBlur}
      ariaLabel={ariaLabel}
    />
  )
}

// ── Equipment Row ──────────────────────────────────────────

function EquipmentRow({
  item,
  status,
  editableFields,
  projectId,
  onUpdateField,
  onStatusChange,
  onDeleteRequest,
}: {
  item: EquipmentItem
  status: EquipmentStatus
  editableFields: 'all' | 'nummer-only' | 'none'
  projectId?: string
  onUpdateField: (id: string, field: string, value: string | null) => void
  onStatusChange: (id: string, from: EquipmentStatus, to: EquipmentStatus) => void
  onDeleteRequest: (item: EquipmentItem) => void
}) {
  const canEdit = (field: string) => {
    if (editableFields === 'all') return true
    if (editableFields === 'nummer-only') return field === 'nummer'
    return false
  }

  const transitions = VALID_TRANSITIONS[status]

  return (
    <tr>
      <td style={TD_STYLE}>
        <CellInput
          value={item.name}
          placeholder="Gerät..."
          editable={canEdit('name')}
          onSave={(v) => onUpdateField(item.id, 'name', v)}
          ariaLabel={`Geraetname ${item.name || ''}`}
        />
      </td>
      <td style={TD_STYLE}>
        <CellInput
          value={item.nummer}
          placeholder="Nr..."
          editable={canEdit('nummer')}
          onSave={(v) => onUpdateField(item.id, 'nummer', v)}
          ariaLabel={`Geraetenummer ${item.name || ''}`}
        />
      </td>
      <td style={TD_STYLE}>
        <LieferadresseCell
          value={item.lieferadresse}
          editable={canEdit('lieferadresse')}
          projectId={projectId}
          onSave={(v) => onUpdateField(item.id, 'lieferadresse', v)}
        />
      </td>
      {status !== 'baustelle' && (
        <td style={TD_STYLE}>
          <CellInput
            value={item.lieferdatum}
            placeholder=""
            editable={canEdit('lieferdatum')}
            type={canEdit('lieferdatum') ? 'date' : 'text'}
            onSave={(v) => onUpdateField(item.id, 'lieferdatum', v)}
            ariaLabel={`Lieferdatum ${item.name || ''}`}
          />
        </td>
      )}
      <td style={TD_STYLE}>
        <CellInput
          value={item.anmerkungen}
          placeholder="Anmerkung..."
          editable={canEdit('anmerkungen')}
          onSave={(v) => onUpdateField(item.id, 'anmerkungen', v)}
          ariaLabel={`Anmerkungen ${item.name || ''}`}
        />
      </td>
      <td style={{ ...TD_STYLE, borderRight: 'none', whiteSpace: 'nowrap' }} data-no-print="true">
        <div style={{ display: 'flex', alignItems: 'center', gap: '2px' }}>
          {/* Back arrow */}
          {transitions.includes(
            status === 'baustelle' ? 'bedarf' : status === 'frei' ? 'baustelle' : ('' as EquipmentStatus)
          ) && (
            <button
              onClick={() => {
                const target = status === 'baustelle' ? 'bedarf' : 'baustelle'
                onStatusChange(item.id, status, target as EquipmentStatus)
              }}
              title={status === 'baustelle' ? 'Zurueck zu Bedarf' : 'Zurueck zu Baustelle'}
              className="circle-btn-green"
              style={{
                borderRadius: '50%',
                cursor: 'pointer',
                padding: 0,
                width: '16px',
                height: '16px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
              aria-label={status === 'baustelle' ? 'Zurueck zu Bedarf' : 'Zurueck zu Baustelle'}
            >
              <ArrowLeft size={10} strokeWidth={2.5} />
            </button>
          )}
          {/* Forward arrow */}
          {transitions.includes(
            status === 'bedarf' ? 'baustelle' : status === 'baustelle' ? 'frei' : ('' as EquipmentStatus)
          ) && (
            <button
              onClick={() => {
                const target = status === 'bedarf' ? 'baustelle' : 'frei'
                onStatusChange(item.id, status, target as EquipmentStatus)
              }}
              title={status === 'bedarf' ? 'Zu Baustelle verschieben' : 'Freimelden'}
              className="circle-btn-green"
              style={{
                borderRadius: '50%',
                cursor: 'pointer',
                padding: 0,
                width: '16px',
                height: '16px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
              aria-label={status === 'bedarf' ? 'Zu Baustelle verschieben' : 'Freimelden'}
            >
              <ArrowRight size={10} strokeWidth={2.5} />
            </button>
          )}
          {/* Delete */}
          <button
            onClick={() => onDeleteRequest(item)}
            title="Geraet loeschen"
            className="circle-btn-red"
            style={{
              borderRadius: '50%',
              cursor: 'pointer',
              padding: 0,
              color: '#cc5555',
              width: '16px',
              height: '16px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginLeft: '15px',
              flexShrink: 0,
            }}
            aria-label="Geraet loeschen"
          >
            <X size={10} strokeWidth={2.5} />
          </button>
        </div>
      </td>
    </tr>
  )
}

// ── ContactPickerHeader ────────────────────────────────────

function ContactPickerHeader({
  selected,
  available,
  accentColor,
  onChange,
  readonly = false,
}: {
  selected: ContactSnapshot[]
  available: ProjectContact[]
  accentColor: string
  onChange: (c: ContactSnapshot[]) => void
  readonly?: boolean
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

  const openPicker = () => {
    if (btnRef.current) {
      const rect = btnRef.current.getBoundingClientRect()
      setPos({ top: rect.bottom + window.scrollY + 4, left: rect.left + window.scrollX })
    }
    setOpen((v) => !v)
  }

  const remaining = available.filter((c) => !selected.some((s) => s.id === c.id))

  return (
    <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '4px' }}>
      <span style={{ fontWeight: 600, color: '#333', fontSize: '7.5pt' }}>Ansprechpartner: </span>
      {selected.map((c) => (
        <span key={c.id} className="contact-badge" style={{ display: 'inline-flex', alignItems: 'center', gap: '2px', background: '#f0f0f0', border: '1px solid #ddd', borderRadius: '3px', padding: '1px 4px', fontSize: '7pt' }}>
          {c.funktion ? `${c.funktion}: ` : ''}{c.name}{c.phone ? ` · ${c.phone}` : ''}
          {!readonly && (
            <button
              data-no-print="true"
              onClick={() => onChange(selected.filter((s) => s.id !== c.id))}
              style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, color: '#e05555', lineHeight: 1, display: 'flex', alignItems: 'center' }}
            >
              <X size={8} />
            </button>
          )}
        </span>
      ))}
      {!readonly && remaining.length > 0 && (
        <button
          ref={btnRef}
          data-no-print="true"
          onClick={openPicker}
          style={{ display: 'inline-flex', alignItems: 'center', gap: '2px', fontSize: '7pt', padding: '1px 5px', background: accentColor, color: '#fff', border: 'none', borderRadius: '3px', cursor: 'pointer' }}
        >
          <Plus size={8} /> Auswählen
        </button>
      )}
      {open && pos && typeof document !== 'undefined' && createPortal(
        <div
          ref={dropRef}
          data-no-print="true"
          style={{ position: 'absolute', top: pos.top, left: pos.left, zIndex: 9999, background: '#fff', border: '1px solid #ddd', borderRadius: '8px', padding: '6px', boxShadow: '0 4px 16px rgba(0,0,0,0.15)', minWidth: '160px' }}
        >
          {remaining.map((c) => (
            <button
              key={c.id}
              onClick={() => {
                onChange([...selected, { id: c.id, funktion: c.funktion, name: c.name, phone: c.phone }])
                setOpen(false)
              }}
              style={{ display: 'block', width: '100%', textAlign: 'left', padding: '5px 8px', background: 'none', border: 'none', cursor: 'pointer', fontSize: '8pt', borderRadius: '4px' }}
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

// ── GeraeteCard ────────────────────────────────────────────

export function GeraeteCard({
  status,
  items,
  projectInfo,
  companyName,
  pageNumber,
  editableFields,
  projectId,
  onAddEquipment,
  onUpdateField,
  onStatusChange,
  onDeleteRequest,
  projectContacts,
  selectedContacts,
  onContactsChange,
}: GeraeteCardProps) {
  const headerBg = STATUS_COLORS[status]

  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        color: '#222',
        padding: '7mm 8mm',
        position: 'relative',
        overflow: 'hidden',
        fontFamily: 'var(--font-ibm-plex-sans), sans-serif',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* Card Header */}
      <div
        style={{
          borderBottom: '2.5px solid ' + headerBg,
          paddingBottom: '5px',
          marginBottom: '8px',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: '8px' }}>
          <div
            style={{
              fontFamily: 'var(--font-inter), sans-serif',
              fontWeight: 800,
              fontSize: '14pt',
              color: headerBg,
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
              flexShrink: 0,
            }}
          >
            {STATUS_LABELS[status]}
          </div>
          <div style={{ textAlign: 'right', minWidth: 0 }}>
            <span
              style={{
                fontFamily: 'var(--font-inter), sans-serif',
                fontWeight: 800,
                fontSize: '14pt',
                color: headerBg,
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
              }}
            >
              {projectInfo.name}
            </span>
            {projectInfo.kostenstelle && (
              <span
                style={{
                  fontFamily: 'var(--font-ibm-plex-sans), sans-serif',
                  fontSize: '8pt',
                  color: '#666',
                  marginLeft: '6px',
                  fontWeight: 500,
                }}
              >
                KST {projectInfo.kostenstelle}
              </span>
            )}
          </div>
        </div>
        {(projectContacts || (selectedContacts && selectedContacts.length > 0)) && (
          <div style={{ marginTop: '4px' }}>
            <ContactPickerHeader
              selected={selectedContacts ?? []}
              available={projectContacts ?? []}
              accentColor={headerBg}
              onChange={onContactsChange ?? (() => {})}
              readonly={!onContactsChange}
            />
          </div>
        )}
      </div>

      {/* Equipment Table */}
      <div
        className="geraete-table-scroll"
        style={{
          flex: 1,
          overflowY: 'auto',
          overflowX: 'hidden',
          minHeight: 0,
        }}
      >
        <table
          style={{
            width: '100%',
            tableLayout: 'fixed',
            borderCollapse: 'collapse',
            fontSize: '7.5pt',
          }}
        >
          <thead>
            <tr style={{ background: headerBg }}>
              <th style={{ ...TH_STYLE, width: status === 'baustelle' ? '26%' : '22%' }}>Gerät</th>
              <th style={{ ...TH_STYLE, width: '14%' }}>Nr.</th>
              <th style={{ ...TH_STYLE, width: status === 'baustelle' ? '26%' : '20%' }}>
                {status === 'baustelle' ? 'Standort' : status === 'frei' ? 'Abholort' : 'Lieferadresse'}
              </th>
              {status !== 'baustelle' && (
                <th style={{ ...TH_STYLE, width: '14%' }}>
                  {status === 'frei' ? 'Freigemeldet seit' : 'Lieferdatum'}
                </th>
              )}
              <th style={{ ...TH_STYLE, width: status === 'baustelle' ? '24%' : '20%' }}>Anmerkungen</th>
              <th style={{ ...TH_STYLE, width: '10%', borderRight: 'none' }} data-no-print="true">
                Aktionen
              </th>
            </tr>
          </thead>
          <tbody>
            {items.length === 0 ? (
              <tr>
                <td
                  colSpan={status === 'baustelle' ? 5 : 6}
                  style={{
                    ...TD_STYLE,
                    textAlign: 'center',
                    color: '#aaa',
                    padding: '20px 4px',
                    borderRight: 'none',
                  }}
                >
                  Keine Geräte
                </td>
              </tr>
            ) : (
              items.map((item) => (
                <EquipmentRow
                  key={item.id}
                  item={item}
                  status={status}
                  editableFields={editableFields}
                  projectId={projectId}
                  onUpdateField={onUpdateField}
                  onStatusChange={onStatusChange}
                  onDeleteRequest={onDeleteRequest}
                />
              ))
            )}
          </tbody>
        </table>

        {/* Add Equipment Button (only in Card 1 / Bedarf) */}
        {onAddEquipment && (
          <div data-no-print="true" style={{ marginTop: '6px', display: 'flex', justifyContent: 'center' }}>
            <button
              onClick={onAddEquipment}
              style={{
                padding: '3px 10px',
                borderRadius: '3px',
                border: `1px solid ${headerBg}`,
                background: 'transparent',
                color: headerBg,
                fontSize: '7pt',
                fontFamily: 'var(--font-ibm-plex-sans), sans-serif',
                cursor: 'pointer',
                whiteSpace: 'nowrap',
              }}
            >
              + Gerät hinzufügen
            </button>
          </div>
        )}
      </div>

      {/* Card Footer */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-end',
          borderTop: '1px solid #ddd',
          paddingTop: '4px',
          marginTop: 'auto',
          fontSize: '7pt',
          color: '#888',
        }}
      >
        <span style={{ fontWeight: 600 }}>{companyName}</span>
        <span>Seite {pageNumber}</span>
      </div>
    </div>
  )
}
