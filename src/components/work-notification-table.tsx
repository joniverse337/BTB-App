'use client'

import { useEffect, useRef } from 'react'
import { ArbeitsZeitCell } from '@/components/aa-time-input'
import type { KWInfo } from '@/lib/kw-utils'
import type { Project } from '@/lib/validations/project'
import type { WorkNotificationRow } from '@/app/projekte/[id]/arbeitsanmeldung/page'

interface WorkNotificationTableProps {
  rows: WorkNotificationRow[]
  week: KWInfo | null
  project: Project | null
  logo: { url: string; x: number; y: number; size: number } | null
  companyInfo: { name: string | null; adr: string | null }
  disabledDays: Set<number>
  activeDays: Set<number>
  equipmentCategories?: string[]
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

function machinesToText(raw: string | null): string {
  return parseMachines(raw).map(e => e.anz > 1 ? `${e.name} ×${e.anz}` : e.name).join('\n')
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

  useEffect(() => {
    if (ref.current && !fillHeight) autoResize(ref.current)
  }, [value, fillHeight])

  return (
    <textarea
      ref={ref}
      value={value}
      placeholder={placeholder}
      disabled={disabled}
      rows={1}
      onChange={e => { onChange(e.target.value); if (!fillHeight) autoResize(e.currentTarget) }}
      onBlur={onBlur}
      aria-label={ariaLabel}
      style={{
        resize: 'none',
        overflow: fillHeight ? 'auto' : 'hidden',
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
  rows, week, project, logo, companyInfo, disabledDays, activeDays, equipmentCategories,
  onUpdateRow, onBlurSave, onFieldBlur, onClearShift, onCheckboxChange, onAddDay, onRemoveDay, onSetShiftTimes,
}: WorkNotificationTableProps) {
  if (!week) {
    return <div style={{ padding: '40px', textAlign: 'center', color: '#7a85a8' }}>Keine Kalenderwoche ausgewählt.</div>
  }

  const firma = companyInfo.name || project?.firm || 'Firmenname'
  const adr = companyInfo.adr || project?.adr || ''
  const equipCats = equipmentCategories ?? []

  return (
    <div
      style={{
        width: '100%', height: '100%', color: '#222',
        padding: '7mm 8mm', position: 'relative',
        overflow: 'hidden', fontFamily: "var(--font-ibm-plex-sans), sans-serif",
      }}
    >

      {/* Logo */}
      {logo && (
        <img src={logo.url} alt="" style={{
          position: 'absolute', left: `${logo.x * 100}%`, top: `${logo.y * 100}%`,
          transform: 'translate(-50%, -50%)', width: `${logo.size * 100}%`,
          pointerEvents: 'none', opacity: 0.15,
        }} />
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
            <th style={{ ...TH_STYLE, ...COL_STYLES.bauleiter, borderRight: 'none' }}>Ansprechpartner</th>
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
                    <td style={{ ...TD_STYLE, ...COL_STYLES.arbeitszeit }}>
                      <ArbeitsZeitCell
                        dayStart={row.day_start} dayEnd={row.day_end}
                        nightStart={row.night_start} nightEnd={row.night_end}
                        disabled={isDisabled} weekdayNr={row.weekday_nr}
                        onFieldBlur={onFieldBlur} onClearShift={onClearShift}
                        onSetShiftTimes={onSetShiftTimes}
                      />
                    </td>
                    <td style={{ ...TD_STYLE, ...COL_STYLES.ort, height: '1px', padding: 0 }}>
                      <div style={{ height: '100%', padding: '10px 4px', boxSizing: 'border-box', display: 'flex', flexDirection: 'column' }}>
                        <AutoTextarea fillHeight value={row.location ?? ''} placeholder="Ort..."
                          disabled={isDisabled}
                          onChange={v => onUpdateRow(row.weekday_nr, 'location', v || null)}
                          onBlur={() => onBlurSave(row.weekday_nr)}
                          ariaLabel={`Ort ${row.weekday_name}`}
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
                      <div style={{ height: '100%', padding: '4px', boxSizing: 'border-box', display: 'flex', flexDirection: 'column' }}>
                        <AutoTextarea fillHeight value={machinesToText(row.machines)} placeholder="Maschinen..."
                          disabled={isDisabled}
                          onChange={v => onUpdateRow(row.weekday_nr, 'machines', v || null)}
                          onBlur={() => onBlurSave(row.weekday_nr)}
                          style={{ fontSize: '6pt' }}
                          ariaLabel={`Maschinen ${row.weekday_name}`}
                        />
                      </div>
                    </td>
                    <td style={{ ...TD_STYLE, ...COL_STYLES.arbeiten, height: '1px', padding: 0 }}>
                      <div style={{ height: '100%', padding: '10px 4px', boxSizing: 'border-box', display: 'flex', flexDirection: 'column' }}>
                        <AutoTextarea fillHeight value={row.work_description ?? ''} placeholder="Ausgeführte Arbeiten..."
                          disabled={isDisabled}
                          onChange={v => onUpdateRow(row.weekday_nr, 'work_description', v || null)}
                          onBlur={() => onBlurSave(row.weekday_nr)}
                          ariaLabel={`Arbeiten ${row.weekday_name}`}
                        />
                      </div>
                    </td>
                    <td style={{ ...TD_STYLE, ...COL_STYLES.sicherungsplan }}>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
                        <div style={{ display: 'flex', gap: '4px' }}>
                          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px' }}>
                            <span style={{ fontSize: '5.5pt', color: '#888', fontFamily: "var(--font-ibm-plex-sans), sans-serif" }}>Ja</span>
                            <input type="checkbox" checked={row.safety_plan_enabled}
                              onChange={e => { if (e.target.checked) onCheckboxChange(row.weekday_nr, 'safety_plan_enabled', true) }}
                              disabled={isDisabled} style={{ accentColor: '#1a2040', cursor: isDisabled ? 'not-allowed' : 'pointer' }}
                              aria-label={`SIPLA Ja ${row.weekday_name}`}
                            />
                          </div>
                          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px' }}>
                            <span style={{ fontSize: '5.5pt', color: '#888', fontFamily: "var(--font-ibm-plex-sans), sans-serif" }}>Nein</span>
                            <input type="checkbox" checked={!row.safety_plan_enabled}
                              onChange={e => { if (e.target.checked) onCheckboxChange(row.weekday_nr, 'safety_plan_enabled', false) }}
                              disabled={isDisabled} style={{ accentColor: '#1a2040', cursor: isDisabled ? 'not-allowed' : 'pointer' }}
                              aria-label={`SIPLA Nein ${row.weekday_name}`}
                            />
                          </div>
                        </div>
                        {row.safety_plan_enabled && (
                          <AutoTextarea value={row.safety_plan_number ?? ''} placeholder="Nr." disabled={isDisabled}
                            onChange={v => onUpdateRow(row.weekday_nr, 'safety_plan_number', v || null)}
                            onBlur={() => onBlurSave(row.weekday_nr)}
                            style={{ fontSize: '6.5pt', textAlign: 'center', width: '52px' }}
                            ariaLabel={`SIPLA-Nr. ${row.weekday_name}`}
                          />
                        )}
                      </div>
                    </td>
                    <td style={{ ...TD_STYLE, ...COL_STYLES.gleisbereich }}>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
                        <div style={{ display: 'flex', gap: '4px' }}>
                          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px' }}>
                            <span style={{ fontSize: '5.5pt', color: '#888', fontFamily: "var(--font-ibm-plex-sans), sans-serif" }}>Ja</span>
                            <input type="checkbox" checked={row.track_work_enabled}
                              onChange={e => { if (e.target.checked) onCheckboxChange(row.weekday_nr, 'track_work_enabled', true) }}
                              disabled={isDisabled} style={{ accentColor: '#1a2040', cursor: isDisabled ? 'not-allowed' : 'pointer' }}
                              aria-label={`Gleisbereich Ja ${row.weekday_name}`}
                            />
                          </div>
                          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px' }}>
                            <span style={{ fontSize: '5.5pt', color: '#888', fontFamily: "var(--font-ibm-plex-sans), sans-serif" }}>Nein</span>
                            <input type="checkbox" checked={!row.track_work_enabled}
                              onChange={e => { if (e.target.checked) onCheckboxChange(row.weekday_nr, 'track_work_enabled', false) }}
                              disabled={isDisabled} style={{ accentColor: '#1a2040', cursor: isDisabled ? 'not-allowed' : 'pointer' }}
                              aria-label={`Gleisbereich Nein ${row.weekday_name}`}
                            />
                          </div>
                        </div>
                        {row.track_work_enabled && (
                          <AutoTextarea value={row.betra_number ?? ''} placeholder="BETRA" disabled={isDisabled}
                            onChange={v => onUpdateRow(row.weekday_nr, 'betra_number', v || null)}
                            onBlur={() => onBlurSave(row.weekday_nr)}
                            style={{ fontSize: '6.5pt', textAlign: 'center', width: '62px' }}
                            ariaLabel={`BETRA-Nr. ${row.weekday_name}`}
                          />
                        )}
                      </div>
                    </td>
                    <td style={{ ...TD_STYLE, ...COL_STYLES.bauleiter, borderRight: 'none', height: '1px', padding: 0, position: 'relative', overflow: 'visible' }}>
                      <div style={{ height: '100%', padding: '10px 4px', boxSizing: 'border-box', display: 'flex', flexDirection: 'column' }}>
                        <AutoTextarea fillHeight value={row.site_manager ?? ''} placeholder="Name..."
                          disabled={isDisabled}
                          onChange={v => onUpdateRow(row.weekday_nr, 'site_manager', v || null)}
                          onBlur={() => onBlurSave(row.weekday_nr)}
                          ariaLabel={`Ansprechpartner ${row.weekday_name}`}
                        />
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
