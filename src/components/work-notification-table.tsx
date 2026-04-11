'use client'

import { useEffect, useRef, useCallback, useState } from 'react'
import { createPortal } from 'react-dom'
import { Plus, X } from 'lucide-react'
import { ArbeitsZeitCell } from '@/components/aa-time-input'
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover'
import type { KWInfo } from '@/lib/kw-utils'
import type { Project } from '@/lib/validations/project'
import type { WorkNotificationRow } from '@/lib/validations/work-notification'
import type { ProjectContact } from '@/lib/validations/project-settings'

interface ContactSnapshot { id: string; funktion: string | null; name: string; phone: string | null }
function parseContacts(raw: string | null): ContactSnapshot[] {
  if (!raw) return []
  try { return JSON.parse(raw) } catch { return [] }
}

interface WorkNotificationTableProps {
  rows: WorkNotificationRow[]
  week: KWInfo | null
  project: Project | null
  logo: { url: string; x: number; y: number; size: number } | null
  companyInfo: { name: string | null; adr: string | null }
  onLogoPositionChange?: (x: number, y: number) => void
  onLogoPositionSave?: (x: number, y: number) => void
  disabledDays: Set<number>
  activeDays: Set<number>
  equipmentCategories?: string[]
  projectContacts?: ProjectContact[]
  onUpdateRow: (weekdayNr: number, field: string, value: string | boolean | null) => void
  onBlurSave: (weekdayNr: number) => void
  onFieldBlur: (weekdayNr: number, field: string, value: string | null) => void
  onClearShift: (weekdayNr: number, type: 'day' | 'night') => void
  onCheckboxChange: (weekdayNr: number, field: string, value: boolean) => void
  /** Batch-Update: Schichtzeiten in einem einzigen DB-Write setzen (verhindert Race Condition) */
  onSetShiftTimes?: (weekdayNr: number, fields: Record<string, string>) => void
  onAddDay: (weekdayNr: number, copyFromPrevious: boolean) => void
  onRemoveDay: (weekdayNr: number) => void
  /** @deprecated Print-Button ist jetzt Teil der PaperEngine */
  onPrint?: () => void
  /** @deprecated Delete-Button wird von der Page gesteuert */
  onDelete?: () => void
}

// --- Machine helpers ---
interface MachineEntry { name: string; anz: number }

function parseMachines(raw: string | null): MachineEntry[] {
  if (!raw) return []
  try {
    const parsed = JSON.parse(raw)
    if (Array.isArray(parsed)) return parsed as MachineEntry[]
  } catch {}
  if (raw.trim()) return [{ name: raw.trim(), anz: 1 }]
  return []
}


// Auto-resize textarea helper
function autoResize(el: HTMLTextAreaElement) {
  el.style.height = 'auto'
  el.style.height = el.scrollHeight + 'px'
}

// --- AutoTextarea ---
function AutoTextarea({
  value, placeholder, disabled, onChange, onBlur, style, ariaLabel, fillHeight,
}: {
  value: string
  placeholder?: string
  disabled?: boolean
  onChange: (val: string) => void
  onBlur: () => void
  style?: React.CSSProperties
  ariaLabel?: string
  fillHeight?: boolean
}) {
  const ref = useRef<HTMLTextAreaElement>(null)
  // Letzter Wert der noch in die Zelle gepasst hat
  const lastFittingValue = useRef(value)

  useEffect(() => {
    if (ref.current && !fillHeight) autoResize(ref.current)
  }, [value, fillHeight])

  // Wert von außen (z.B. Initialisierung) → lastFittingValue nachziehen
  useEffect(() => {
    lastFittingValue.current = value
  }, [value])

  const handleChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newVal = e.target.value
    if (!fillHeight) {
      onChange(newVal)
      autoResize(e.currentTarget)
      return
    }
    // fillHeight: Overflow synchron prüfen — DOM hat bereits den neuen Text,
    // scrollHeight ist deshalb schon korrekt. onChange erst aufrufen wenn Inhalt passt.
    const el = e.currentTarget
    if (el.scrollHeight > el.clientHeight + 2) {
      // Inhalt passt nicht → DOM zurücksetzen, kein State-Update
      el.value = lastFittingValue.current
      el.setSelectionRange(lastFittingValue.current.length, lastFittingValue.current.length)
      return
    }
    lastFittingValue.current = newVal
    onChange(newVal)
  }, [fillHeight, onChange])

  return (
    <textarea
      ref={ref}
      value={value}
      placeholder={placeholder}
      disabled={disabled}
      rows={1}
      onChange={handleChange}
      onBlur={onBlur}
      aria-label={ariaLabel}
      style={{
        resize: 'none',
        overflow: 'hidden',
        width: '100%',
        height: fillHeight ? '100%' : 'auto',
        background: 'transparent', border: '1px solid #ddd', borderRadius: '4px',
        fontFamily: "var(--font-ibm-plex-sans), sans-serif",
        fontSize: '8pt', color: '#222', padding: '3px 6px', outline: 'none',
        minHeight: '28px', boxSizing: 'border-box',
        ...style,
      }}
    />
  )
}

// --- MachineListCell ---
const MACHINE_SLOTS = 5

function slotsFromValue(raw: string | null): string[] {
  const entries = parseMachines(raw)
  const slots = Array<string>(MACHINE_SLOTS).fill('')
  entries.slice(0, MACHINE_SLOTS).forEach((e, i) => {
    slots[i] = e.anz > 1 ? `${e.name} ×${e.anz}` : e.name
  })
  return slots
}

function slotsToValue(slots: string[]): string | null {
  const filled = slots.map(s => s.trim()).filter(Boolean)
  if (filled.length === 0) return null
  return JSON.stringify(filled.map(s => {
    const m = s.match(/^(.+)\s×(\d+)$/)
    return m ? { name: m[1], anz: parseInt(m[2]) } : { name: s, anz: 1 }
  }))
}

function MachineListCell({
  value, equipmentCategories, disabled, onChange, onBlur,
}: {
  value: string | null
  equipmentCategories: string[]
  disabled: boolean
  onChange: (v: string | null) => void
  onBlur: () => void
}) {
  const [slots, setSlots] = useState<string[]>(() => slotsFromValue(value))
  const [pickerIndex, setPickerIndex] = useState<number | null>(null)
  const [pickerPos, setPickerPos] = useState<{ top: number; left: number } | null>(null)
  const btnRefs = useRef<(HTMLButtonElement | null)[]>([])
  const pickerRef = useRef<HTMLDivElement>(null)

  // Sync from outside (e.g. initial load / copy-from-previous)
  useEffect(() => { setSlots(slotsFromValue(value)) }, [value])

  // Close picker on outside click
  useEffect(() => {
    if (pickerIndex === null) return
    const handle = (e: MouseEvent) => {
      const btn = btnRefs.current[pickerIndex!]
      if (
        pickerRef.current && !pickerRef.current.contains(e.target as Node) &&
        btn && !btn.contains(e.target as Node)
      ) setPickerIndex(null)
    }
    document.addEventListener('mousedown', handle)
    return () => document.removeEventListener('mousedown', handle)
  }, [pickerIndex])

  const updateSlot = useCallback((i: number, text: string) => {
    const next = [...slots]
    next[i] = text
    setSlots(next)
    onChange(slotsToValue(next))
  }, [slots, onChange])

  const pickForSlot = useCallback((i: number, cat: string) => {
    updateSlot(i, cat)
    onBlur()
    setPickerIndex(null)
  }, [updateSlot, onBlur])

  const openPicker = (i: number) => {
    const btn = btnRefs.current[i]
    if (btn) {
      const rect = btn.getBoundingClientRect()
      setPickerPos({ top: rect.bottom + window.scrollY + 4, left: rect.left + window.scrollX })
    }
    setPickerIndex(prev => prev === i ? null : i)
  }

  return (
    <div style={{ height: '100%', padding: '2px 3px', boxSizing: 'border-box', display: 'flex', flexDirection: 'column', justifyContent: 'space-around', overflow: 'hidden' }}>
      {slots.map((slot, i) => (
        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '3px', minHeight: 0 }}>
          {/* Plus button per line */}
          {!disabled && (
            <button
              ref={el => { btnRefs.current[i] = el }}
              data-no-print="true"
              onClick={() => openPicker(i)}
              style={{
                width: '11px', height: '11px', borderRadius: '50%', flexShrink: 0,
                border: `1px solid ${pickerIndex === i ? '#555' : '#aaa'}`,
                background: pickerIndex === i ? '#e0e0e0' : 'transparent',
                cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '8pt', color: '#777', padding: 0, lineHeight: 1,
              }}
            >+</button>
          )}
          {/* Inline text input */}
          <input
            value={slot}
            placeholder=""
            disabled={disabled}
            onChange={e => updateSlot(i, e.target.value)}
            onBlur={onBlur}
            style={{
              flex: 1, minWidth: 0, border: 'none', borderBottom: '1px solid #ccc',
              background: 'transparent', outline: 'none',
              fontSize: '6pt', fontFamily: 'var(--font-ibm-plex-sans), sans-serif',
              color: '#222', padding: '0 2px', lineHeight: 1.4,
            }}
          />
        </div>
      ))}

      {/* Picker portal */}
      {pickerIndex !== null && pickerPos && typeof document !== 'undefined' && createPortal(
        <div
          ref={pickerRef}
          data-no-print="true"
          style={{
            position: 'absolute', top: pickerPos.top, left: pickerPos.left,
            zIndex: 9999, background: '#fff', border: '1px solid #ddd',
            borderRadius: '8px', padding: '8px', boxShadow: '0 4px 16px rgba(0,0,0,0.15)',
            minWidth: '160px', maxWidth: '220px',
            fontFamily: 'var(--font-ibm-plex-sans), sans-serif',
          }}
        >
          {equipmentCategories.length > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
              {equipmentCategories.map(cat => (
                <button key={cat} onClick={() => pickForSlot(pickerIndex!, cat)} style={{
                  padding: '3px 10px', borderRadius: '99px',
                  border: '1px solid #ddd', background: '#f5f5f5', color: '#333',
                  fontSize: '7pt', cursor: 'pointer', whiteSpace: 'nowrap',
                  fontFamily: 'var(--font-ibm-plex-sans), sans-serif',
                }}>
                  {cat}
                </button>
              ))}
            </div>
          )}
          {equipmentCategories.length === 0 && (
            <span style={{ fontSize: '7pt', color: '#aaa' }}>Keine Geräte in Projekteinstellungen hinterlegt.</span>
          )}
        </div>,
        document.body
      )}
    </div>
  )
}

// --- Styles ---
const COL_STYLES = {
  kw: { width: '38px', textAlign: 'center' as const, fontWeight: 700, fontSize: '11pt', verticalAlign: 'middle' as const },
  datum: { width: '44px', whiteSpace: 'nowrap' as const, textAlign: 'center' as const },
  tag: { width: '60px', fontWeight: 500, textAlign: 'center' as const, verticalAlign: 'middle' as const },
  arbeitszeit: { width: '108px' },
  ort: { width: '95px' },
  bauspitzen: { width: '32px', textAlign: 'center' as const },
  arbeitskraefte: { width: '32px', textAlign: 'center' as const },
  maschinen: { width: '70px' },
  arbeiten: { width: '196px' },
  sicherungsplan: { width: '46px', textAlign: 'center' as const },
  gleisbereich: { width: '48px', textAlign: 'center' as const },
  bauleiter: { width: '80px' },
}


const NUMBER_INPUT: React.CSSProperties = {
  background: 'transparent', border: 'none', outline: 'none',
  width: '32px', fontFamily: "var(--font-ibm-plex-sans), sans-serif",
  fontSize: '8pt', color: '#222', padding: '2px 2px', textAlign: 'center',
}

const TD_STYLE: React.CSSProperties = {
  padding: '10px 4px', borderBottom: '1px solid #ddd',
  borderRight: '1px solid #eee', verticalAlign: 'top',
  overflow: 'hidden',
}


const TH_STYLE: React.CSSProperties = {
  padding: '4px 4px', textAlign: 'center', fontSize: '6.5pt',
  letterSpacing: '0.3px', textTransform: 'uppercase', color: '#fff',
  fontWeight: 600, whiteSpace: 'nowrap', borderRight: '1px solid rgba(255,255,255,0.15)',
}

// --- Print-friendly checkbox (HTML input[type=checkbox] wird im Druck unsichtbar durch appearance:none) ---
function CheckOption({ label, checked, disabled, onSelect }: {
  label: string
  checked: boolean
  disabled: boolean
  onSelect: () => void
}) {
  return (
    <div
      style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px', cursor: disabled ? 'default' : 'pointer' }}
      onClick={() => !disabled && onSelect()}
    >
      <span style={{ fontSize: '5.5pt', color: '#888', fontFamily: "var(--font-ibm-plex-sans), sans-serif" }}>{label}</span>
      <div style={{
        width: '10px', height: '10px',
        border: `1px solid ${checked ? '#1a2040' : '#bbb'}`,
        borderRadius: '2px',
        background: checked ? '#1a2040' : 'transparent',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        flexShrink: 0,
      }}>
        {checked && <span style={{ color: '#fff', fontSize: '8pt', lineHeight: 1, fontWeight: 700, marginTop: '-1px' }}>✓</span>}
      </div>
    </div>
  )
}

// --- Main component ---
const ADD_BTN: React.CSSProperties = {
  padding: '2px 8px', borderRadius: '3px', border: '1px dashed #bbb',
  background: 'transparent', color: '#aaa', fontSize: '6.5pt',
  fontFamily: "var(--font-ibm-plex-sans), sans-serif", cursor: 'pointer', whiteSpace: 'nowrap',
}
const COPY_BTN: React.CSSProperties = {
  ...ADD_BTN, border: '1px dashed #c8b87a', color: '#b09040',
}

export function WorkNotificationTable({
  rows, week, project, logo, companyInfo, disabledDays, activeDays, equipmentCategories, projectContacts,
  onUpdateRow, onBlurSave, onFieldBlur, onClearShift, onCheckboxChange, onAddDay, onRemoveDay, onSetShiftTimes,
  onLogoPositionChange, onLogoPositionSave,
}: WorkNotificationTableProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [isDraggingLogo, setIsDraggingLogo] = useState(false)

  const handleLogoMouseDown = useCallback((e: React.MouseEvent) => {
    if (!onLogoPositionChange || !containerRef.current) return
    e.preventDefault()
    setIsDraggingLogo(true)

    const rect = containerRef.current.getBoundingClientRect()

    let lastX = logo!.x
    let lastY = logo!.y
    const onMove = (ev: MouseEvent) => {
      lastX = Math.max(0, Math.min(1, (ev.clientX - rect.left) / rect.width))
      lastY = Math.max(0, Math.min(1, (ev.clientY - rect.top) / rect.height))
      onLogoPositionChange(lastX, lastY)
    }
    const onUp = () => {
      setIsDraggingLogo(false)
      onLogoPositionSave?.(lastX, lastY)
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
    }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
  }, [onLogoPositionChange, onLogoPositionSave])

  if (!week) {
    return <div style={{ padding: '40px', textAlign: 'center', color: '#7a85a8' }}>Keine Kalenderwoche ausgewählt.</div>
  }

  const firma = companyInfo.name || project?.firm || 'Firmenname'
  const adr = companyInfo.adr || project?.adr || ''
  const equipCats = equipmentCategories ?? []

  return (
    <div
      ref={containerRef}
      style={{
        width: '100%', height: '100%', color: '#222',
        padding: '7mm 8mm', position: 'relative',
        overflow: 'hidden', fontFamily: "var(--font-ibm-plex-sans), sans-serif",
        cursor: isDraggingLogo ? 'grabbing' : 'default',
      }}
    >

      {/* Logo */}
      {logo && (
        <img
          src={logo.url}
          alt=""
          draggable={false}
          onMouseDown={handleLogoMouseDown}
          style={{
            position: 'absolute', left: `${logo.x * 100}%`, top: `${logo.y * 100}%`,
            transform: 'translate(-50%, -50%)', width: `${logo.size * 100}%`,
            opacity: 0.15,
            cursor: onLogoPositionChange ? (isDraggingLogo ? 'grabbing' : 'grab') : 'default',
            pointerEvents: onLogoPositionChange ? 'auto' : 'none',
            userSelect: 'none',
            zIndex: onLogoPositionChange ? 10 : 0,
          }}
        />
      )}

      {/* Header */}
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
        borderBottom: '2.5px solid #1a2040', paddingBottom: '5px', marginBottom: '8px',
        position: 'relative', zIndex: 1,
      }}>
        <div>
          <div style={{ fontFamily: "var(--font-inter), sans-serif", fontWeight: 800, fontSize: '12pt', color: '#1a2040' }}>{firma}</div>
          {adr && <div style={{ fontSize: '6.5pt', color: '#666', marginTop: '1px' }}>{adr}</div>}
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: '10pt', fontWeight: 700, color: '#1a2040', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            Arbeitsanmeldung KW {week.kw} · {week.year}
          </div>
          <div style={{ fontSize: '8pt', color: '#666', marginTop: '2px' }}>BV {project?.name || ''}</div>
        </div>
      </div>

      {/* Table */}
      <table style={{ width: '100%', tableLayout: 'fixed', borderCollapse: 'collapse', fontSize: '7.5pt', position: 'relative', zIndex: 1 }}>
        <thead>
          <tr style={{ background: '#1a2040' }}>
            <th style={{ ...TH_STYLE, ...COL_STYLES.kw }}>KW</th>
            <th style={{ ...TH_STYLE, ...COL_STYLES.datum }}>Datum</th>
            <th style={{ ...TH_STYLE, ...COL_STYLES.tag }}>Tag</th>
            <th style={{ ...TH_STYLE, ...COL_STYLES.arbeitszeit }}>Arbeitszeit</th>
            <th style={{ ...TH_STYLE, ...COL_STYLES.ort }}>Ort</th>
            <th style={{ ...TH_STYLE, ...COL_STYLES.bauspitzen }}>Bausp.</th>
            <th style={{ ...TH_STYLE, ...COL_STYLES.arbeitskraefte }}>AK</th>
            <th style={{ ...TH_STYLE, ...COL_STYLES.maschinen }}>Maschinen</th>
            <th style={{ ...TH_STYLE, ...COL_STYLES.arbeiten }}>Arbeiten</th>
            <th style={{ ...TH_STYLE, ...COL_STYLES.sicherungsplan }}>SIPLA</th>
            <th style={{ ...TH_STYLE, ...COL_STYLES.gleisbereich, fontSize: '5.5pt', whiteSpace: 'normal' as const }}>Arbeiten im Gleisbereich</th>
            <th style={{ ...TH_STYLE, ...COL_STYLES.bauleiter }}>Ansprechpartner</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => {
            const isDisabled = disabledDays.has(row.weekday_nr)
            const isActive = activeDays.has(row.weekday_nr)
            const hasPrevious = rows.slice(0, i).some(r => activeDays.has(r.weekday_nr))
            const dateParts = row.date.split('-')
            const dateFormatted = `${dateParts[2]}.${dateParts[1]}.`

            return (
              <tr key={row.weekday_nr} style={{ height: '24mm' }} {...(!isActive ? { 'data-inactive': 'true' } : {})}>
                {i === 0 && (
                  <td rowSpan={7} style={{ ...TD_STYLE, ...COL_STYLES.kw, borderRight: '1px solid #ddd', background: '#f8f8f0', color: '#1a2040' }}>
                    {week.kw}
                  </td>
                )}
                <td style={{ ...TD_STYLE, ...COL_STYLES.datum, color: '#666', fontSize: '7.5pt', verticalAlign: 'middle' }}>{dateFormatted}</td>
                <td style={{ ...TD_STYLE, ...COL_STYLES.tag, color: '#222', fontSize: '7.5pt', verticalAlign: 'middle', textAlign: 'center' }}>{row.weekday_name}</td>

                {isActive ? (
                  <>
                    <td style={{ ...TD_STYLE, ...COL_STYLES.arbeitszeit, height: '1px', padding: 0, position: 'relative' }}>
                      <div style={{ position: 'absolute', top: 0, bottom: 0, left: 0, right: 0, overflow: 'hidden', padding: '10px 4px', boxSizing: 'border-box', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                        <ArbeitsZeitCell
                          dayStart={row.day_start} dayEnd={row.day_end}
                          nightStart={row.night_start} nightEnd={row.night_end}
                          disabled={isDisabled} weekdayNr={row.weekday_nr}
                          onFieldBlur={onFieldBlur} onClearShift={onClearShift}
                          onSetShiftTimes={onSetShiftTimes}
                        />
                      </div>
                    </td>
                    <td style={{ ...TD_STYLE, ...COL_STYLES.ort, height: '1px', padding: 0 }}>
                      <div style={{ height: '100%', padding: '10px 4px', boxSizing: 'border-box', display: 'flex', flexDirection: 'column' }}>
                        <AutoTextarea fillHeight value={row.location ?? ''} placeholder="Ort..."
                          disabled={isDisabled}
                          onChange={v => onUpdateRow(row.weekday_nr, 'location', v || null)}
                          onBlur={() => onBlurSave(row.weekday_nr)}
                          ariaLabel={`Ort ${row.weekday_name}`}
                          style={{ fontSize: '6pt' }}
                        />
                      </div>
                    </td>
                    <td style={{ ...TD_STYLE, ...COL_STYLES.bauspitzen, verticalAlign: 'middle' }}>
                      <input type="number" min={0} step={1} value={row.bauspitzen ?? ''} placeholder="1"
                        onChange={e => onUpdateRow(row.weekday_nr, 'bauspitzen', e.target.value || null)}
                        onBlur={() => onBlurSave(row.weekday_nr)} disabled={isDisabled}
                        style={NUMBER_INPUT} aria-label={`Bauspitzen ${row.weekday_name}`}
                      />
                    </td>
                    <td style={{ ...TD_STYLE, ...COL_STYLES.arbeitskraefte, verticalAlign: 'middle' }}>
                      <input type="number" min={0} step={1} value={row.workers ?? ''} placeholder="5"
                        onChange={e => onUpdateRow(row.weekday_nr, 'workers', e.target.value || null)}
                        onBlur={() => onBlurSave(row.weekday_nr)} disabled={isDisabled}
                        style={NUMBER_INPUT} aria-label={`Arbeitskräfte ${row.weekday_name}`}
                      />
                    </td>
                    <td style={{ ...TD_STYLE, ...COL_STYLES.maschinen, height: '1px', padding: 0 }}>
                      <MachineListCell
                        value={row.machines}
                        equipmentCategories={equipCats}
                        disabled={isDisabled}
                        onChange={v => onUpdateRow(row.weekday_nr, 'machines', v)}
                        onBlur={() => onBlurSave(row.weekday_nr)}
                      />
                    </td>
                    <td style={{ ...TD_STYLE, ...COL_STYLES.arbeiten, height: '1px', padding: 0 }}>
                      <div style={{ height: '100%', padding: '10px 4px', boxSizing: 'border-box', display: 'flex', flexDirection: 'column' }}>
                        <AutoTextarea fillHeight value={row.work_description ?? ''} placeholder="Ausgeführte Arbeiten..."
                          disabled={isDisabled}
                          onChange={v => onUpdateRow(row.weekday_nr, 'work_description', v || null)}
                          onBlur={() => onBlurSave(row.weekday_nr)}
                          ariaLabel={`Arbeiten ${row.weekday_name}`}
                          style={{ fontSize: '6pt' }}
                        />
                      </div>
                    </td>
                    <td style={{ ...TD_STYLE, ...COL_STYLES.sicherungsplan, height: '1px', padding: 0 }}>
                      <div style={{ height: '100%', padding: '4px', boxSizing: 'border-box', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', overflow: 'hidden' }}>
                        <div style={{ display: 'flex', gap: '4px', flexShrink: 0 }}>
                          <CheckOption label="Ja" checked={row.safety_plan_enabled} disabled={isDisabled}
                            onSelect={() => onCheckboxChange(row.weekday_nr, 'safety_plan_enabled', true)} />
                          <CheckOption label="Nein" checked={!row.safety_plan_enabled} disabled={isDisabled}
                            onSelect={() => onCheckboxChange(row.weekday_nr, 'safety_plan_enabled', false)} />
                        </div>
                        {row.safety_plan_enabled && (
                          <AutoTextarea fillHeight value={row.safety_plan_number ?? ''} placeholder="Nr." disabled={isDisabled}
                            onChange={v => onUpdateRow(row.weekday_nr, 'safety_plan_number', v || null)}
                            onBlur={() => onBlurSave(row.weekday_nr)}
                            style={{ fontSize: '6.5pt', textAlign: 'center', width: '52px', flex: 1, minHeight: 0 }}
                            ariaLabel={`SIPLA-Nr. ${row.weekday_name}`}
                          />
                        )}
                      </div>
                    </td>
                    <td style={{ ...TD_STYLE, ...COL_STYLES.gleisbereich, height: '1px', padding: 0 }}>
                      <div style={{ height: '100%', padding: '4px', boxSizing: 'border-box', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', overflow: 'hidden' }}>
                        <div style={{ display: 'flex', gap: '4px', flexShrink: 0 }}>
                          <CheckOption label="Ja" checked={row.track_work_enabled} disabled={isDisabled}
                            onSelect={() => onCheckboxChange(row.weekday_nr, 'track_work_enabled', true)} />
                          <CheckOption label="Nein" checked={!row.track_work_enabled} disabled={isDisabled}
                            onSelect={() => onCheckboxChange(row.weekday_nr, 'track_work_enabled', false)} />
                        </div>
                        {row.track_work_enabled && (
                          <AutoTextarea fillHeight value={row.betra_number ?? ''} placeholder="BETRA" disabled={isDisabled}
                            onChange={v => onUpdateRow(row.weekday_nr, 'betra_number', v || null)}
                            onBlur={() => onBlurSave(row.weekday_nr)}
                            style={{ fontSize: '6.5pt', textAlign: 'center', width: '62px', flex: 1, minHeight: 0 }}
                            ariaLabel={`BETRA-Nr. ${row.weekday_name}`}
                          />
                        )}
                      </div>
                    </td>
                    <td style={{ ...TD_STYLE, ...COL_STYLES.bauleiter, height: '1px', padding: 0, position: 'relative', overflow: 'visible' }}>
                      <div style={{ height: '100%', padding: '4px', boxSizing: 'border-box', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '3px' }}>
                        {parseContacts(row.contacts_json).map((c) => (
                          <div key={c.id} style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '2px', fontSize: '6.5pt', lineHeight: 1.3 }}>
                            <div style={{ flex: 1, wordBreak: 'break-word' }}>
                              {c.funktion && <div style={{ color: '#888' }}>{c.funktion}</div>}
                              <div>{c.name}</div>
                              {c.phone && <div style={{ color: '#555' }}>{c.phone}</div>}
                            </div>
                            {!isDisabled && (
                              <button
                                data-no-print="true"
                                onClick={() => {
                                  const updated = parseContacts(row.contacts_json).filter(x => x.id !== c.id)
                                  onUpdateRow(row.weekday_nr, 'contacts_json', updated.length ? JSON.stringify(updated) : null)
                                  onBlurSave(row.weekday_nr)
                                }}
                                style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, color: '#e05555', flexShrink: 0, lineHeight: 1, marginTop: '1px' }}
                              >
                                <X size={9} />
                              </button>
                            )}
                          </div>
                        ))}
                        {!isDisabled && projectContacts && projectContacts.filter(c => !parseContacts(row.contacts_json).some(s => s.id === c.id)).length > 0 && (
                          <Popover>
                            <PopoverTrigger asChild>
                              <button
                                data-no-print="true"
                                style={{ display: 'flex', alignItems: 'center', gap: '2px', fontSize: '6.5pt', color: '#fff', background: '#1a2040', border: 'none', borderRadius: '3px', padding: '2px 6px', cursor: 'pointer', marginTop: '2px', width: 'fit-content' }}
                              >
                                <Plus size={8} /> Hinzufügen
                              </button>
                            </PopoverTrigger>
                            <PopoverContent className="w-48 p-1" align="end" data-no-print="true">
                              {projectContacts
                                .filter(c => !parseContacts(row.contacts_json).some(s => s.id === c.id))
                                .map(c => (
                                  <button
                                    key={c.id}
                                    onClick={() => {
                                      const snapshot: ContactSnapshot = { id: c.id, funktion: c.funktion, name: c.name, phone: c.phone }
                                      const updated = [...parseContacts(row.contacts_json), snapshot]
                                      onUpdateRow(row.weekday_nr, 'contacts_json', JSON.stringify(updated))
                                      onBlurSave(row.weekday_nr)
                                    }}
                                    className="w-full text-left px-2 py-1.5 text-sm rounded hover:bg-accent"
                                  >
                                    <span className="font-medium">{c.name}</span>
                                    {c.funktion && <span className="text-muted-foreground ml-1 text-xs">{c.funktion}</span>}
                                  </button>
                                ))}
                            </PopoverContent>
                          </Popover>
                        )}
                      </div>
                      <button
                        data-no-print="true"
                        onClick={() => onRemoveDay(row.weekday_nr)}
                        title="Tag entfernen"
                        style={{ position: 'absolute', top: '50%', right: '-14px', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', padding: '2px', color: '#e05555', fontSize: '9pt', lineHeight: 1 }}
                      >×</button>
                    </td>
                  </>
                ) : (
                  <td data-no-print="true" colSpan={9} style={{ ...TD_STYLE, borderRight: 'none', opacity: isDisabled ? 0.35 : 1 }}>
                    <div style={{ minHeight: '52px', display: 'flex', alignItems: 'center' }}>
                      {!isDisabled && (
                        <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                          <button style={ADD_BTN} onClick={() => onAddDay(row.weekday_nr, false)}>
                            + Arbeit hinzufügen
                          </button>
                          {hasPrevious && (
                            <button style={COPY_BTN} onClick={() => onAddDay(row.weekday_nr, true)}>
                              Vom Vortag übernehmen
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  </td>
                )}
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
