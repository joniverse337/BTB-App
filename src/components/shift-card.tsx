'use client'

import { useState, useRef, useEffect } from 'react'
import type { ShiftWithDetails, ShiftWorker, ShiftEquipment } from '@/lib/validations/shift'
import type { Project } from '@/lib/validations/project'
import {
  WITTERUNG_OPTIONS,
  BODENZUSTAND_OPTIONS,
  DEFAULT_WORKER_CATEGORIES,
  DEFAULT_EQUIPMENT_CATEGORIES,
} from '@/lib/validations/shift'
import { formatCardDate, formatNightShiftDate, calculateNetHours } from '@/lib/kw-utils'
import { inputStyle, labelStyle, sectionTitleStyle, sectionStyle } from '@/components/shift-card-styles'

function parseTimeInput(raw: string): string {
  const digits = raw.replace(/\D/g, '')
  if (!digits) return ''
  let h: number, m: number
  if (digits.length <= 2) {
    h = parseInt(digits, 10); m = 0
  } else if (digits.length === 3) {
    h = parseInt(digits[0], 10); m = parseInt(digits.slice(1), 10)
  } else {
    h = parseInt(digits.slice(0, 2), 10); m = parseInt(digits.slice(2, 4), 10)
  }
  h = Math.min(23, Math.max(0, isNaN(h) ? 0 : h))
  m = Math.min(59, Math.max(0, isNaN(m) ? 0 : m))
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`
}

function TimeInput({
  value,
  onBlur,
}: {
  value: string
  onChange: (v: string) => void
  onBlur: (v: string) => void
}) {
  const [localVal, setLocalVal] = useState(value ? value.slice(0, 5) : value)
  const [open, setOpen] = useState(false)
  const wrapRef = useRef<HTMLDivElement>(null)
  const activeHourRef = useRef<HTMLDivElement>(null)

  useEffect(() => { setLocalVal(value ? value.slice(0, 5) : value) }, [value])

  // scroll active hour into view when popup opens
  useEffect(() => {
    if (open && activeHourRef.current) {
      activeHourRef.current.scrollIntoView({ block: 'center' })
    }
  }, [open])

  const curH = localVal ? parseInt(localVal.split(':')[0], 10) : -1
  const curM = localVal ? parseInt(localVal.split(':')[1], 10) : -1

  const commit = (h: number, m: number) => {
    const result = `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`
    setLocalVal(result)
    setOpen(false)
    onBlur(result)
  }

  const handleTextBlur = () => {
    const normalized = parseTimeInput(localVal)
    setLocalVal(normalized)
    setOpen(false)
    onBlur(normalized)
  }

  const cellStyle = (active: boolean): React.CSSProperties => ({
    padding: '3px 0', textAlign: 'center', cursor: 'pointer',
    fontSize: '9pt', fontFamily: "var(--font-ibm-plex-sans), sans-serif",
    background: active ? '#1a2040' : 'transparent',
    color: active ? '#fff' : '#333',
    fontWeight: active ? 700 : 400,
    borderRadius: '2px',
  })

  return (
    <div ref={wrapRef} style={{ position: 'relative' }}>
      <input
        type="text"
        value={localVal}
        onChange={e => setLocalVal(e.target.value)}
        onFocus={e => { e.target.select(); setOpen(true) }}
        onBlur={handleTextBlur}
        placeholder="HH:MM"
        style={{
          width: '100%', border: 'none', borderBottom: '1px solid #e8e8e8',
          background: 'transparent', fontFamily: "var(--font-ibm-plex-sans), sans-serif",
          fontSize: '9pt', color: '#222', outline: 'none', padding: '1px 2px',
        }}
      />
      {open && (
        <div
          onMouseDown={e => e.preventDefault()}
          style={{
            position: 'absolute', top: 'calc(100% + 2px)', left: 0, zIndex: 200,
            background: '#fff', border: '1px solid #ddd', borderRadius: '5px',
            boxShadow: '0 4px 12px rgba(0,0,0,.18)',
            display: 'flex', overflow: 'hidden', minWidth: '80px',
          }}
        >
          {/* Hours */}
          <div style={{ width: '40px', height: '120px', overflowY: 'auto', padding: '4px 4px' }}>
            {Array.from({ length: 24 }, (_, i) => (
              <div
                key={i}
                ref={i === curH ? activeHourRef : undefined}
                onMouseDown={() => commit(i, curM >= 0 ? curM : 0)}
                style={cellStyle(i === curH)}
              >
                {i.toString().padStart(2, '0')}
              </div>
            ))}
          </div>
          {/* Divider */}
          <div style={{ width: '1px', background: '#eee', flexShrink: 0 }} />
          {/* Minutes */}
          <div style={{ width: '40px', padding: '4px 4px', display: 'flex', flexDirection: 'column', justifyContent: 'space-around' }}>
            {[0, 15, 30, 45].map(min => (
              <div
                key={min}
                onMouseDown={() => commit(curH >= 0 ? curH : 0, min)}
                style={cellStyle(min === curM)}
              >
                :{min.toString().padStart(2, '0')}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function PlainTextArea({
  value,
  onBlur,
  placeholder,
  minHeight,
}: {
  value: string
  onBlur: (text: string) => void
  placeholder?: string
  minHeight: string
}) {
  // Bestehende Werte können HTML-Tags enthalten (von der früheren PlainTextArea) – diese entfernen
  const stripHtml = (html: string) => html.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').trim()

  return (
    <textarea
      defaultValue={stripHtml(value)}
      placeholder={placeholder}
      onBlur={e => onBlur(e.target.value)}
      style={{
        width: '100%',
        border: '1px solid #e8e8e8',
        borderRadius: '3px',
        background: '#fafafa',
        fontFamily: "var(--font-ibm-plex-sans), sans-serif",
        fontSize: '9pt',
        color: '#222',
        outline: 'none',
        padding: '4px 5px',
        minHeight,
        boxSizing: 'border-box',
        whiteSpace: 'pre-wrap',
        wordBreak: 'break-word',
        resize: 'vertical',
      }}
    />
  )
}

function WorkerRow({ worker, onUpdate, onDelete }: {
  worker: ShiftWorker
  onUpdate: (id: string, field: string, value: string | number) => void
  onDelete: () => void
}) {
  const [localBeruf, setLocalBeruf] = useState<string | null>(null)
  const [localAnz, setLocalAnz] = useState<string | null>(null)
  const [localStd, setLocalStd] = useState<string | null>(null)
  const tdInp: React.CSSProperties = {
    width: '100%', border: 'none', background: 'transparent',
    fontFamily: "var(--font-ibm-plex-sans), sans-serif", fontSize: '9pt', color: '#222',
    outline: 'none', padding: '1px 2px', borderBottom: '1px dashed #ddd',
  }
  return (
    <tr>
      <td style={{ padding: '2px 5px', borderBottom: '1px solid #eee' }}>
        <input type="text" value={localBeruf ?? worker.beruf} onChange={e => setLocalBeruf(e.target.value)}
          onBlur={() => { if (localBeruf !== null) { onUpdate(worker.id, 'beruf', localBeruf); setLocalBeruf(null) } }}
          placeholder="Beruf / Name..." style={tdInp} />
      </td>
      <td style={{ padding: '2px 5px', borderBottom: '1px solid #eee', width: '32px' }}>
        <input type="number" value={localAnz ?? worker.anz.toString()} onChange={e => setLocalAnz(e.target.value)}
          onBlur={() => { if (localAnz !== null) { const v = parseInt(localAnz, 10); onUpdate(worker.id, 'anz', isNaN(v) ? 1 : v); setLocalAnz(null) } }}
          style={{ ...tdInp, width: '28px' }} />
      </td>
      <td style={{ padding: '2px 5px', borderBottom: '1px solid #eee', width: '44px' }}>
        <input type="number" step="0.5" value={localStd ?? worker.std.toString()} onChange={e => setLocalStd(e.target.value)}
          onBlur={() => { if (localStd !== null) { const v = parseFloat(localStd); onUpdate(worker.id, 'std', isNaN(v) ? 0 : v); setLocalStd(null) } }}
          style={{ ...tdInp, width: '40px' }} />
      </td>
      <td style={{ padding: '2px 5px', borderBottom: '1px solid #eee', width: '20px' }}>
        <button onClick={onDelete} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#cc5555', fontSize: '11px', padding: '1px 4px' }}>x</button>
      </td>
    </tr>
  )
}

function EquipmentRow({ equipment, onUpdate, onDelete }: {
  equipment: ShiftEquipment
  onUpdate: (id: string, field: string, value: string | number) => void
  onDelete: () => void
}) {
  const [localTyp, setLocalTyp] = useState<string | null>(null)
  const [localAnz, setLocalAnz] = useState<string | null>(null)
  const [localStd, setLocalStd] = useState<string | null>(null)
  const tdInp: React.CSSProperties = {
    width: '100%', border: 'none', background: 'transparent',
    fontFamily: "var(--font-ibm-plex-sans), sans-serif", fontSize: '9pt', color: '#222',
    outline: 'none', padding: '1px 2px', borderBottom: '1px dashed #ddd',
  }
  return (
    <tr>
      <td style={{ padding: '2px 5px', borderBottom: '1px solid #eee' }}>
        <input type="text" value={localTyp ?? equipment.typ} onChange={e => setLocalTyp(e.target.value)}
          onBlur={() => { if (localTyp !== null) { onUpdate(equipment.id, 'typ', localTyp); setLocalTyp(null) } }}
          placeholder="Geraet..." style={tdInp} />
      </td>
      <td style={{ padding: '2px 5px', borderBottom: '1px solid #eee', width: '32px' }}>
        <input type="number" value={localAnz ?? equipment.anz.toString()} onChange={e => setLocalAnz(e.target.value)}
          onBlur={() => { if (localAnz !== null) { const v = parseInt(localAnz, 10); onUpdate(equipment.id, 'anz', isNaN(v) ? 1 : v); setLocalAnz(null) } }}
          style={{ ...tdInp, width: '28px' }} />
      </td>
      <td style={{ padding: '2px 5px', borderBottom: '1px solid #eee', width: '44px' }}>
        <input type="number" step="0.5" value={localStd ?? equipment.std.toString()} onChange={e => setLocalStd(e.target.value)}
          onBlur={() => { if (localStd !== null) { const v = parseFloat(localStd); onUpdate(equipment.id, 'std', isNaN(v) ? 0 : v); setLocalStd(null) } }}
          style={{ ...tdInp, width: '40px' }} />
      </td>
      <td style={{ padding: '2px 5px', borderBottom: '1px solid #eee', width: '20px' }}>
        <button onClick={onDelete} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#cc5555', fontSize: '11px', padding: '1px 4px' }}>x</button>
      </td>
    </tr>
  )
}

interface ShiftCardProps {
  shift: ShiftWithDetails
  date: Date
  project: Project | null
  logo?: { url: string; x: number; y: number; size: number } | null
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
  shift, date, project, logo, workerCategories, equipmentCategories,
  onUpdateShift, onAddWorker, onUpdateWorker, onDeleteWorker,
  onAddEquipment, onUpdateEquipment, onDeleteEquipment,
}: ShiftCardProps) {
  const [localValues, setLocalValues] = useState<Record<string, string>>({})

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

  // val is passed directly — avoids stale-closure reads of localValues in setTimeout
  const handleTimeBlur = (field: 'beg' | 'end' | 'pau', val: string) => {
    // Compute net hours with the new value + current shift props for other fields
    const updBeg = field === 'beg' ? (val || null) : (shift.beg || null)
    const updEnd = field === 'end' ? (val || null) : (shift.end || null)
    const updPau = field === 'pau' ? (val === '' ? null : parseFloat(val)) : (shift.pau ?? null)
    const newNet = calculateNetHours(updBeg, updEnd, updPau)
    // Save to DB
    if (field === 'pau') {
      const num = val === '' ? null : parseFloat(val)
      onUpdateShift(shift.id, field, num !== null && !isNaN(num) ? num : null)
    } else {
      onUpdateShift(shift.id, field, val === '' ? null : val)
    }
    setLocalValues(prev => { const n = { ...prev }; delete n[field]; return n })
    // Sync workers and equipment to new net hours
    if (newNet > 0) {
      shift.shift_workers.forEach(w => onUpdateWorker(w.id, 'std', newNet))
      shift.shift_equipment.forEach(eq => onUpdateEquipment(eq.id, 'std', newNet))
    }
  }

  const totMA = shift.shift_workers.reduce((s, m) =>
    s + (parseFloat(m.std?.toString() ?? '0') || 0) * (m.anz || 1), 0)

  const totGer = shift.shift_equipment.reduce((s, eq) =>
    s + (parseFloat(eq.std?.toString() ?? '0') || 0) * (eq.anz || 1), 0)

  const chipStyle: React.CSSProperties = {
    display: 'inline-flex', alignItems: 'center', padding: '2px 7px',
    background: '#f0f0f0', border: '1px solid #ddd', borderRadius: '10px',
    color: '#555', cursor: 'pointer', fontSize: '9pt',
    fontFamily: "var(--font-ibm-plex-sans), sans-serif",
  }

  const thStyle: React.CSSProperties = {
    background: '#1a2040', color: '#fff', padding: '2px 5px',
    textAlign: 'left', fontSize: '9pt', letterSpacing: '0.5px',
  }

  return (
    <div style={{
      width: '210mm', height: '297mm',
      background: '#fff', color: '#222',
      fontFamily: "var(--font-ibm-plex-sans), sans-serif", fontSize: '9pt',
      borderRadius: '6px', overflow: 'hidden', position: 'relative',
      boxShadow: '0 4px 20px rgba(0,0,0,.4)',
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
            <div style={{ fontFamily: "var(--font-inter), sans-serif", fontWeight: 800, fontSize: '15pt', color: '#1a2040' }}>
              {project?.firm || 'Firmenname'}
            </div>
            {project?.adr && <div style={{ fontSize: '9pt', color: '#666', marginTop: '2px' }}>{project.adr}</div>}
          </div>
          <div style={{ textAlign: 'right' }}>
            <h2 style={{ fontSize: '12pt', fontWeight: 700, color: '#1a2040', textTransform: 'uppercase', letterSpacing: '0.5px', margin: 0 }}>
              Bautagesbericht &nbsp; {dateLabel}
            </h2>
            <p style={{ fontSize: '9pt', color: schichtColor, fontWeight: 600, marginTop: '2px', margin: 0 }}>{schichtLabel}</p>
          </div>
        </div>

        {/* 3-col: Projekt / Wetter / Arbeitszeit */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '7px', marginBottom: '5px', flexShrink: 0 }}>
          <div style={sectionStyle}>
            <div style={sectionTitleStyle}>Projekt</div>
            <div style={{ marginBottom: '3px' }}><label style={labelStyle}>Name</label>
              <div style={{ fontSize: '9pt', fontWeight: 600, padding: '1px 2px' }}>{project?.name || '\u2014'}</div></div>
            <div style={{ marginBottom: '3px' }}><label style={labelStyle}>Kostenstelle</label>
              <div style={{ fontSize: '9pt', padding: '1px 2px' }}>{project?.nr || '\u2014'}</div></div>
            <div><label style={labelStyle}>Auftraggeber</label>
              <div style={{ fontSize: '9pt', padding: '1px 2px' }}>{project?.ag || '\u2014'}</div></div>
          </div>
          <div style={sectionStyle}>
            <div style={sectionTitleStyle}>Wetter</div>
            <div style={{ marginBottom: '4px' }}><label style={labelStyle}>Temperatur (C)</label>
              <input type="number" value={get('temp', shift.temp)} onChange={e => handleChange('temp', e.target.value)} onBlur={() => handleNumberBlur('temp')} placeholder="12" style={inputStyle} /></div>
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
                    <button key={val} onClick={() => handleTimeBlur('pau', val.toString())} style={{
                      flex: 1, padding: '2px 0', border: '1px solid', borderRadius: '3px',
                      fontSize: '9pt', fontFamily: "var(--font-ibm-plex-sans), sans-serif", cursor: 'pointer',
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

        {/* Oertlichkeit */}
        <div style={{ ...sectionStyle, display: 'flex', alignItems: 'baseline', gap: '4px', borderBottom: '1px solid #ddd', paddingBottom: '2px' }}>
          <span style={{ ...sectionTitleStyle, borderBottom: 'none', paddingBottom: 0, marginBottom: 0, whiteSpace: 'nowrap', flexShrink: 0 }}>Örtlichkeit:</span>
          <input type="text" value={get('gl', shift.gl)} onChange={e => handleChange('gl', e.target.value)} onBlur={() => handleBlur('gl')} placeholder="Strecke / Gleis / Bauteil…" style={{ ...inputStyle, borderBottom: 'none', flex: 1 }} />
          <span style={{ fontSize: '9pt', color: '#999', whiteSpace: 'nowrap', flexShrink: 0 }}>km</span>
          <input type="text" value={get('kv', shift.kv)} onChange={e => handleChange('kv', e.target.value)} onBlur={() => handleBlur('kv')} placeholder="von" style={{ ...inputStyle, borderBottom: 'none', width: '44px', flexShrink: 0 }} />
          <span style={{ fontSize: '9pt', color: '#bbb', flexShrink: 0 }}>–</span>
          <input type="text" value={get('kb', shift.kb)} onChange={e => handleChange('kb', e.target.value)} onBlur={() => handleBlur('kb')} placeholder="bis" style={{ ...inputStyle, borderBottom: 'none', width: '44px', flexShrink: 0 }} />
        </div>

        <div style={{ height: '0.5em', flexShrink: 0 }} />

        {/* 2-col: Mitarbeiter + Geraete */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '7px', flexShrink: 0 }}>
          <div style={sectionStyle}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '9pt' }}>
              <thead><tr>
                <th style={thStyle}>Personal</th>
                <th style={{ ...thStyle, width: '32px' }}>Anz</th>
                <th style={{ ...thStyle, width: '36px' }}>Std</th>
                <th style={{ ...thStyle, width: '20px' }}></th>
              </tr></thead>
              <tbody>
                {shift.shift_workers.map(w => (
                  <WorkerRow key={w.id} worker={w} onUpdate={onUpdateWorker} onDelete={() => onDeleteWorker(w.id)} />
                ))}
              </tbody>
            </table>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '3px', marginTop: '4px' }}>
              {workerCats.map(cat => (
                <button key={cat} onClick={() => onAddWorker(shift.id, cat)} style={chipStyle}>{cat}</button>
              ))}
              <button onClick={() => onAddWorker(shift.id, '')} style={{ ...chipStyle, border: '1px dashed #ddd', color: '#888' }}>+ Individuell</button>
            </div>
            {totMA > 0 && <div style={{ fontSize: '9pt', color: '#666', marginTop: '3px', textAlign: 'right' }}>Gesamt: <strong>{Math.round(totMA * 100) / 100} h</strong></div>}
          </div>
          <div style={sectionStyle}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '9pt' }}>
              <thead><tr>
                <th style={thStyle}>Maschinen & Gerät</th>
                <th style={{ ...thStyle, width: '32px' }}>Anz</th>
                <th style={{ ...thStyle, width: '36px' }}>Std</th>
                <th style={{ ...thStyle, width: '20px' }}></th>
              </tr></thead>
              <tbody>
                {shift.shift_equipment.map(eq => (
                  <EquipmentRow key={eq.id} equipment={eq} onUpdate={onUpdateEquipment} onDelete={() => onDeleteEquipment(eq.id)} />
                ))}
              </tbody>
            </table>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '3px', marginTop: '4px' }}>
              {equipCats.map(cat => (
                <button key={cat} onClick={() => onAddEquipment(shift.id, cat)} style={chipStyle}>{cat}</button>
              ))}
              <button onClick={() => onAddEquipment(shift.id, '')} style={{ ...chipStyle, border: '1px dashed #ddd', color: '#888' }}>+ Individuell</button>
            </div>
            {totGer > 0 && <div style={{ fontSize: '9pt', color: '#666', marginTop: '3px', textAlign: 'right' }}>Gesamt: <strong>{Math.round(totGer * 100) / 100} h</strong></div>}
          </div>
        </div>

        <div style={{ height: '1.2em', flexShrink: 0 }} />

        {/* Ausgefuehrte Arbeiten */}
        <div style={{ ...sectionStyle, flexShrink: 0 }}>
          <div style={sectionTitleStyle}>Ausgeführte Arbeiten</div>
          <PlainTextArea value={shift.arb || ''} onBlur={html => onUpdateShift(shift.id, 'arb', html)} placeholder="Beschreibung der durchgeführten Arbeiten..." minHeight="72px" />
        </div>

        <div style={{ height: '1.2em', flexShrink: 0 }} />

        {/* Vorkommnisse */}
        <div style={{ ...sectionStyle, flexShrink: 0 }}>
          <div style={sectionTitleStyle}>Vorkommnisse / Behinderungen</div>
          <PlainTextArea value={shift.vor || ''} onBlur={html => onUpdateShift(shift.id, 'vor', html)} placeholder="Behinderungen, Zwischenfälle..." minHeight="44px" />
        </div>

        {/* Signature line (absolute bottom) */}
        <div style={{
          position: 'absolute', bottom: '7mm', left: '9mm', right: '9mm',
          display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '30px', background: '#fff',
        }}>
          <div style={{ paddingTop: '4px', fontSize: '9pt', color: '#666' }}>
            <div style={{ borderTop: '1px solid #999', marginBottom: '3px', height: '16px' }} />
            Auftragnehmer
          </div>
          <div style={{ paddingTop: '4px', fontSize: '9pt', color: '#666' }}>
            <div style={{ borderTop: '1px solid #999', marginBottom: '3px', height: '16px' }} />
            Auftraggeber
          </div>
        </div>
      </div>
    </div>
  )
}
