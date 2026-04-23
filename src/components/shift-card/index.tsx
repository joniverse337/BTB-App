'use client'

import { useState, useRef, useEffect } from 'react'
import type { ShiftWithDetails } from '@/lib/validations/shift'
import type { Project } from '@/lib/validations/project'
import {
  WITTERUNG_OPTIONS,
  BODENZUSTAND_OPTIONS,
  DEFAULT_WORKER_CATEGORIES,
  DEFAULT_EQUIPMENT_CATEGORIES,
} from '@/lib/validations/shift'
import { formatCardDate, formatNightShiftDate, calculateNetHours } from '@/lib/kw-utils'
import { inputStyle, labelStyle, sectionTitleStyle, sectionStyle } from '@/components/shift-card-styles'
import { TimeInput } from './time-input'
import { PlainTextArea } from './plain-text-area'
import { WorkerRow } from './worker-row'
import { EquipmentRow } from './equipment-row'

interface ShiftCardProps {
  shift: ShiftWithDetails
  date: Date
  project: Project | null
  logo?: { url: string; x: number; y: number; size: number } | null
  weatherLocation?: { lat: number; lon: number } | { address: string } | null
  workerCategories?: string[]
  equipmentCategories?: string[]
  onUpdateShift: (shiftId: string, field: string, value: string | number | null) => void
  onAddWorker: (shiftId: string, beruf: string) => void
  onUpdateWorker: (workerId: string, field: string, value: string | number) => void
  onDeleteWorker: (workerId: string) => void
  onAddEquipment: (shiftId: string, typ: string) => void
  onUpdateEquipment: (equipmentId: string, field: string, value: string | number) => void
  onDeleteEquipment: (equipmentId: string) => void
}

export function ShiftCard({
  shift, date, project, logo, weatherLocation, workerCategories, equipmentCategories,
  onUpdateShift, onAddWorker, onUpdateWorker, onDeleteWorker,
  onAddEquipment, onUpdateEquipment, onDeleteEquipment,
}: ShiftCardProps) {
  const [localValues, setLocalValues] = useState<Record<string, string>>({})
  const [weatherLoading, setWeatherLoading] = useState(false)
  const [weatherLoaded, setWeatherLoaded] = useState(() => shift.temp != null && shift.wit != null)
  const weatherFetchedRef = useRef(false)

  const dateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
  const todayStr = new Date().toISOString().slice(0, 10)
  const isFuture = dateStr > todayStr

  const fetchWeather = async () => {
    if (isFuture || weatherLoading || !weatherLocation) return
    setWeatherLoading(true)
    setWeatherLoaded(false)
    try {
      const params = new URLSearchParams({ date: dateStr })
      if ('lat' in weatherLocation) {
        params.set('lat', String(weatherLocation.lat))
        params.set('lon', String(weatherLocation.lon))
      } else {
        params.set('address', weatherLocation.address)
      }
      const res = await fetch(`/api/weather?${params}`)
      if (!res.ok) throw new Error('Fehler')
      const data = await res.json()
      onUpdateShift(shift.id, 'temp', data.temp)
      onUpdateShift(shift.id, 'wit', data.witterung)
      setWeatherLoaded(true)
    } catch {
      // Stille Fehlerbehandlung — Felder bleiben leer
    } finally {
      setWeatherLoading(false)
    }
  }

  useEffect(() => {
    if (!weatherFetchedRef.current && !isFuture && weatherLocation && shift.temp == null && shift.wit == null) {
      weatherFetchedRef.current = true
      fetchWeather()
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [weatherLocation])

  const isNight = shift.typ === 'nacht'
  const dateLabel = isNight ? formatNightShiftDate(date) : formatCardDate(date)
  const schichtLabel = isNight ? 'Nachtschicht' : 'Tagschicht'
  const schichtColor = isNight ? '#4a7cf7' : '#e8a020'

  const workerCats = [...new Set(workerCategories ?? [...DEFAULT_WORKER_CATEGORIES])]
  const equipCats = [...new Set(equipmentCategories ?? [...DEFAULT_EQUIPMENT_CATEGORIES])]

  const get = (field: string, dbValue: string | number | null) => {
    if (field in localValues) return localValues[field]
    return dbValue?.toString() ?? ''
  }
  const handleChange = (field: string, value: string) =>
    setLocalValues(prev => ({ ...prev, [field]: value }))
  const handleBlur = (field: string) => {
    if (field in localValues) {
      const val = localValues[field]
      onUpdateShift(shift.id, field, val === '' ? null : val)
      setLocalValues(prev => { const n = { ...prev }; delete n[field]; return n })
    }
  }
  const handleNumberBlur = (field: string) => {
    if (field in localValues) {
      const val = localValues[field]
      const num = val === '' ? null : parseFloat(val)
      onUpdateShift(shift.id, field, num !== null && !isNaN(num) ? num : null)
      setLocalValues(prev => { const n = { ...prev }; delete n[field]; return n })
    }
  }

  const pauVal = 'pau' in localValues ? (localValues['pau'] ? parseFloat(localValues['pau']) : null) : shift.pau
  const netHours = calculateNetHours(get('beg', shift.beg) || null, get('end', shift.end) || null, pauVal)

  const handleTimeBlur = (field: 'beg' | 'end' | 'pau', val: string) => {
    const updBeg = field === 'beg' ? (val || null) : (shift.beg || null)
    const updEnd = field === 'end' ? (val || null) : (shift.end || null)
    const updPau = field === 'pau' ? (val === '' ? null : parseFloat(val)) : (shift.pau ?? null)
    const newNet = calculateNetHours(updBeg, updEnd, updPau)
    if (field === 'pau') {
      const num = val === '' ? null : parseFloat(val)
      onUpdateShift(shift.id, field, num !== null && !isNaN(num) ? num : null)
    } else {
      onUpdateShift(shift.id, field, val === '' ? null : val)
    }
    setLocalValues(prev => { const n = { ...prev }; delete n[field]; return n })
    if (newNet > 0) {
      shift.shift_workers.forEach(w => onUpdateWorker(w.id, 'std', newNet))
      shift.shift_equipment.forEach(eq => onUpdateEquipment(eq.id, 'std', newNet))
    }
  }

  const totMA = shift.shift_workers.reduce((s, m) =>
    s + (parseFloat(m.std?.toString() ?? '0') || 0) * (m.anz || 1), 0)

  const totGer = shift.shift_equipment.reduce((s, eq) =>
    s + (parseFloat(eq.std?.toString() ?? '0') || 0) * (eq.anz || 1), 0)

  const thStyle: React.CSSProperties = {
    background: '#1a2040', color: '#fff', padding: '2px 5px',
    textAlign: 'left', fontSize: '10pt', letterSpacing: '0.5px',
  }

  return (
    <div style={{
      width: '100%', height: '100%',
      color: '#222',
      fontFamily: "var(--font-ibm-plex-sans), sans-serif", fontSize: '10pt',
      position: 'relative',
      border: isNight ? '2px solid rgba(74,124,247,.2)' : '2px solid transparent',
    }}>
      {logo && (
        <img
          src={logo.url}
          alt=""
          style={{
            position: 'absolute',
            left: `${logo.x * 100}%`,
            top: `${logo.y * 100}%`,
            width: `${logo.size * 100}%`,
            transform: 'translate(-50%, -50%)',
            opacity: 0.3,
            pointerEvents: 'none',
            zIndex: 1,
          }}
        />
      )}
      <div style={{
        padding: '7mm 9mm 22mm 9mm', height: '100%',
        position: 'relative', display: 'flex', flexDirection: 'column',
        boxSizing: 'border-box', overflow: 'hidden', zIndex: 2,
      }}>
        {/* Header */}
        <div style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
          borderBottom: '2.5px solid #1a2040', paddingBottom: '6px', marginBottom: '6px', flexShrink: 0,
        }}>
          <div>
            <div style={{ fontFamily: "var(--font-inter), sans-serif", fontWeight: 800, fontSize: '16pt', color: '#1a2040' }}>
              {project?.firm || 'Firmenname'}
            </div>
            {project?.adr && <div style={{ fontSize: '10pt', color: '#666', marginTop: '2px' }}>{project.adr}</div>}
          </div>
          <div style={{ textAlign: 'right' }}>
            <h2 style={{ fontSize: '13pt', fontWeight: 700, color: '#1a2040', textTransform: 'uppercase', letterSpacing: '0.5px', margin: 0 }}>
              Bautagesbericht &nbsp; {dateLabel}
            </h2>
            <p style={{ fontSize: '10pt', color: schichtColor, fontWeight: 600, marginTop: '2px', margin: 0 }}>{schichtLabel}</p>
          </div>
        </div>

        {/* 3-col: Projekt / Wetter / Arbeitszeit */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '7px', marginBottom: '5px', flexShrink: 0 }}>
          <div style={sectionStyle}>
            <div style={sectionTitleStyle}>Projekt</div>
            <div style={{ marginBottom: '3px' }}><label style={labelStyle}>Name</label>
              <div style={{ fontSize: '10pt', fontWeight: 600, padding: '1px 2px' }}>{project?.name || '—'}</div></div>
            <div style={{ marginBottom: '3px' }}><label style={labelStyle}>Kostenstelle</label>
              <div style={{ fontSize: '10pt', padding: '1px 2px' }}>{project?.nr || '—'}</div></div>
            <div><label style={labelStyle}>Auftraggeber</label>
              <div style={{ fontSize: '10pt', padding: '1px 2px' }}>{project?.ag || '—'}</div></div>
          </div>
          <div style={sectionStyle}>
            <div style={sectionTitleStyle}>Wetter</div>
            <div style={{ marginBottom: '4px' }}>
              <label style={labelStyle}>Temperatur (C)</label>
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <input
                  type="number"
                  value={get('temp', shift.temp)}
                  onChange={e => handleChange('temp', e.target.value)}
                  onBlur={() => handleNumberBlur('temp')}
                  placeholder="12"
                  style={{ ...inputStyle, flex: 1, minWidth: 0 }}
                />
                <div style={{ flexShrink: 0, width: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {weatherLoading && (
                    <svg width="12" height="12" viewBox="0 0 12 12" style={{ animation: 'spin 1s linear infinite' }}>
                      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
                      <circle cx="6" cy="6" r="5" fill="none" stroke="#aaa" strokeWidth="1.5" strokeDasharray="20 12" />
                    </svg>
                  )}
                  {!weatherLoading && weatherLoaded && (
                    <svg width="12" height="12" viewBox="0 0 12 12">
                      <path d="M2 6l3 3 5-5" stroke="#4caf50" strokeWidth="1.8" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  )}
                </div>
                {!isFuture && weatherLocation && (
                  <button
                    data-no-print="true"
                    onClick={fetchWeather}
                    disabled={weatherLoading}
                    style={{
                      flexShrink: 0, padding: '1px 5px', border: '1px solid #ddd',
                      borderRadius: '3px', background: '#f5f5f5', cursor: weatherLoading ? 'default' : 'pointer',
                      fontSize: '9pt', fontFamily: "var(--font-ibm-plex-sans), sans-serif",
                      color: '#555', whiteSpace: 'nowrap',
                    }}
                  >
                    Laden
                  </button>
                )}
              </div>
            </div>
            <div style={{ marginBottom: '4px' }}><label style={labelStyle}>Witterung</label>
              <select value={shift.wit ?? ''} onChange={e => onUpdateShift(shift.id, 'wit', e.target.value || null)} style={{ ...inputStyle, cursor: 'pointer' }}>
                <option value="">-- wählen --</option>
                {WITTERUNG_OPTIONS.map(opt => <option key={opt} value={opt}>{opt}</option>)}
              </select></div>
            <div><label style={labelStyle}>Bodenzustand</label>
              <select value={shift.bod ?? ''} onChange={e => onUpdateShift(shift.id, 'bod', e.target.value || null)} style={{ ...inputStyle, cursor: 'pointer' }}>
                <option value="">-- wählen --</option>
                {BODENZUSTAND_OPTIONS.map(opt => <option key={opt} value={opt}>{opt}</option>)}
              </select></div>
          </div>
          <div style={sectionStyle}>
            <div style={sectionTitleStyle}>Arbeitszeit</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '5px', marginBottom: '4px' }}>
              <div><label style={labelStyle}>Beginn</label>
                <TimeInput
                  value={get('beg', shift.beg)}
                  onChange={v => handleChange('beg', v)}
                  onBlur={v => handleTimeBlur('beg', v)}
                /></div>
              <div><label style={labelStyle}>Ende</label>
                <TimeInput
                  value={get('end', shift.end)}
                  onChange={v => handleChange('end', v)}
                  onBlur={v => handleTimeBlur('end', v)}
                /></div>
            </div>
            <div style={{ marginBottom: '4px' }}><label style={labelStyle}>Pause (Min.)</label>
              <div style={{ display: 'flex', gap: '3px', alignItems: 'center' }}>
                <input type="number" className="btb-no-spin" value={get('pau', shift.pau)} onChange={e => handleChange('pau', e.target.value)} onBlur={e => handleTimeBlur('pau', e.target.value)} style={{ ...inputStyle, width: '36px', flexShrink: 0 }} />
                {[{ label: '—', val: 0 }, { label: '30', val: 30 }, { label: '60', val: 60 }].map(({ label, val }) => {
                  const active = (shift.pau ?? 0) === val
                  return (
                    <button data-no-print="true" key={val} onClick={() => handleTimeBlur('pau', val.toString())} style={{
                      flex: 1, padding: '2px 0', border: '1px solid', borderRadius: '3px',
                      fontSize: '10pt', fontFamily: "var(--font-ibm-plex-sans), sans-serif", cursor: 'pointer',
                      background: active ? '#1a2040' : '#f5f5f5',
                      color: active ? '#fff' : '#555',
                      borderColor: active ? '#1a2040' : '#ddd',
                      fontWeight: active ? 700 : 400,
                    }}>{label}</button>
                  )
                })}
              </div>
            </div>
            <div><label style={labelStyle}>Nettostunden</label>
              <input type="text" value={netHours > 0 ? `${netHours} h` : ''} readOnly style={{ ...inputStyle, color: '#555', borderBottomColor: 'transparent' }} /></div>
          </div>
        </div>

        <div style={{ height: '2.5em', flexShrink: 0 }} />

        {/* Örtlichkeit */}
        <div style={{ ...sectionStyle, display: 'flex', alignItems: 'baseline', gap: '4px', borderBottom: '2px solid #1a2040', paddingBottom: '2px' }}>
          <span style={{ ...sectionTitleStyle, borderBottom: 'none', paddingBottom: 0, marginBottom: 0, whiteSpace: 'nowrap', flexShrink: 0, color: '#1a2040' }}>Örtlichkeit:</span>
          <input type="text" value={get('gl', shift.gl)} onChange={e => handleChange('gl', e.target.value)} onBlur={() => handleBlur('gl')} placeholder="Strecke / Gleis / Bauteil…" style={{ ...inputStyle, borderBottom: 'none', flex: 1 }} />
          <span style={{ fontSize: '10pt', color: '#999', whiteSpace: 'nowrap', flexShrink: 0 }}>km</span>
          <input type="text" value={get('kv', shift.kv)} onChange={e => handleChange('kv', e.target.value)} onBlur={() => handleBlur('kv')} placeholder="von" style={{ ...inputStyle, borderBottom: 'none', width: '88px', flexShrink: 0 }} />
          <span style={{ fontSize: '10pt', color: '#bbb', flexShrink: 0 }}>–</span>
          <input type="text" value={get('kb', shift.kb)} onChange={e => handleChange('kb', e.target.value)} onBlur={() => handleBlur('kb')} placeholder="bis" style={{ ...inputStyle, borderBottom: 'none', width: '88px', flexShrink: 0 }} />
        </div>

        <div style={{ height: '0.5em', flexShrink: 0 }} />

        {/* Personal & Geräte */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '7px', flexShrink: 0 }}>
          <div style={sectionStyle}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '10pt' }}>
              <thead><tr>
                <th data-no-print="true" style={{ ...thStyle, width: '22px' }}></th>
                <th style={thStyle}>Personal</th>
                <th style={{ ...thStyle, width: '42px' }}>Anz</th>
                <th style={{ ...thStyle, width: '50px' }}>Std</th>
                <th data-no-print="true" style={{ ...thStyle, width: '20px' }}></th>
              </tr></thead>
              <tbody>
                {shift.shift_workers.map(w => (
                  <WorkerRow key={w.id} worker={w} onUpdate={onUpdateWorker} onDelete={() => onDeleteWorker(w.id)} categories={workerCats} />
                ))}
              </tbody>
              <tfoot data-no-print="true">
                <tr><td colSpan={5} style={{ paddingTop: '3px' }}>
                  <button onClick={() => onAddWorker(shift.id, '')} style={{
                    width: '100%', background: 'none', border: '1px dashed #ddd', borderRadius: '4px',
                    padding: '2px 6px', cursor: 'pointer', color: '#888', fontSize: '9pt',
                    fontFamily: "var(--font-ibm-plex-sans), sans-serif", textAlign: 'left',
                  }}>+ Personal hinzufügen</button>
                </td></tr>
              </tfoot>
            </table>
            {totMA > 0 && <div style={{ fontSize: '10pt', color: '#666', marginTop: '3px', textAlign: 'right' }}>Gesamt: <strong>{Math.round(totMA * 100) / 100} h</strong></div>}
          </div>
          <div style={sectionStyle}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '10pt' }}>
              <thead><tr>
                <th data-no-print="true" style={{ ...thStyle, width: '22px' }}></th>
                <th style={thStyle}>Maschinen & Gerät</th>
                <th style={{ ...thStyle, width: '42px' }}>Anz</th>
                <th style={{ ...thStyle, width: '50px' }}>Std</th>
                <th data-no-print="true" style={{ ...thStyle, width: '20px' }}></th>
              </tr></thead>
              <tbody>
                {shift.shift_equipment.map(eq => (
                  <EquipmentRow key={eq.id} equipment={eq} onUpdate={onUpdateEquipment} onDelete={() => onDeleteEquipment(eq.id)} categories={equipCats} />
                ))}
              </tbody>
              <tfoot data-no-print="true">
                <tr><td colSpan={5} style={{ paddingTop: '3px' }}>
                  <button onClick={() => onAddEquipment(shift.id, '')} style={{
                    width: '100%', background: 'none', border: '1px dashed #ddd', borderRadius: '4px',
                    padding: '2px 6px', cursor: 'pointer', color: '#888', fontSize: '9pt',
                    fontFamily: "var(--font-ibm-plex-sans), sans-serif", textAlign: 'left',
                  }}>+ Gerät hinzufügen</button>
                </td></tr>
              </tfoot>
            </table>
            {totGer > 0 && <div style={{ fontSize: '10pt', color: '#666', marginTop: '3px', textAlign: 'right' }}>Gesamt: <strong>{Math.round(totGer * 100) / 100} h</strong></div>}
          </div>
        </div>

        <div style={{ height: '1.2em', flexShrink: 0 }} />

        {/* Ausgeführte Arbeiten */}
        <div style={{ ...sectionStyle, flexShrink: 0 }}>
          <div style={sectionTitleStyle}>Ausgeführte Arbeiten</div>
          <div style={{ position: 'relative' }}>
            <PlainTextArea value={shift.arb || ''} onBlur={html => onUpdateShift(shift.id, 'arb', html)} placeholder="Beschreibung der durchgeführten Arbeiten..." minHeight="72px" />
          </div>
        </div>

        <div style={{ height: '1.2em', flexShrink: 0 }} />

        {/* Vorkommnisse */}
        <div style={{ ...sectionStyle, flexShrink: 0 }}>
          <div style={sectionTitleStyle}>Sonstiges</div>
          <PlainTextArea value={shift.vor || ''} onBlur={html => onUpdateShift(shift.id, 'vor', html)} placeholder="/" minHeight="44px" />
        </div>

        {/* Unterschriftenzeile */}
        <div style={{
          position: 'absolute', bottom: '7mm', left: '9mm', right: '9mm',
          display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '30px', background: '#fff',
        }}>
          <div style={{ paddingTop: '4px', fontSize: '10pt', color: '#666' }}>
            <div style={{ borderTop: '1px solid #999', marginBottom: '3px', height: '16px' }} />
            Auftragnehmer
          </div>
          <div style={{ paddingTop: '4px', fontSize: '10pt', color: '#666' }}>
            <div style={{ borderTop: '1px solid #999', marginBottom: '3px', height: '16px' }} />
            Auftraggeber
          </div>
        </div>
      </div>
    </div>
  )
}
