'use client'

import { useState, useRef, useEffect } from 'react'
import {
  WITTERUNG_OPTIONS,
  BODENZUSTAND_OPTIONS,
  DEFAULT_WORKER_CATEGORIES,
  DEFAULT_EQUIPMENT_CATEGORIES,
} from '@/lib/validations/shift'
import { calculateNetHours } from '@/lib/kw-utils'

// ── Shared inline styles (1:1 mit ShiftCard) ─────────────────────────────────

const inputStyle: React.CSSProperties = {
  width: '100%',
  border: 'none',
  borderBottom: '1px solid #e8e8e8',
  background: 'transparent',
  fontFamily: "var(--font-ibm-plex-sans), sans-serif",
  fontSize: '9pt',
  color: '#222',
  outline: 'none',
  padding: '1px 2px',
}

const labelStyle: React.CSSProperties = {
  fontSize: '9pt',
  color: '#999',
  display: 'block',
  marginBottom: '1px',
}

const sectionTitleStyle: React.CSSProperties = {
  fontSize: '9pt',
  fontWeight: 700,
  letterSpacing: '2px',
  textTransform: 'uppercase',
  color: '#888',
  borderBottom: '1px solid #ddd',
  paddingBottom: '2px',
  marginBottom: '5px',
}

const sectionStyle: React.CSSProperties = {
  marginBottom: '5px',
  flexShrink: 0,
}

const thStyle: React.CSSProperties = {
  background: '#1a2040',
  color: '#fff',
  padding: '2px 5px',
  textAlign: 'left',
  fontSize: '9pt',
  letterSpacing: '0.5px',
}

const chipStyle: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  padding: '2px 7px',
  background: '#f0f0f0',
  border: '1px solid #ddd',
  borderRadius: '10px',
  color: '#555',
  cursor: 'pointer',
  fontSize: '9pt',
  fontFamily: "var(--font-ibm-plex-sans), sans-serif",
}

// ── Hilfsfunktionen ───────────────────────────────────────────────────────────

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

// ── TimeInput (1:1 mit ShiftCard) ─────────────────────────────────────────────

function TimeInput({
  value,
  onChange,
}: {
  value: string
  onChange: (v: string) => void
}) {
  const [localVal, setLocalVal] = useState(value)
  const [open, setOpen] = useState(false)
  const wrapRef = useRef<HTMLDivElement>(null)
  const activeHourRef = useRef<HTMLDivElement>(null)

  useEffect(() => { setLocalVal(value) }, [value])

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
    onChange(result)
  }

  const handleTextBlur = () => {
    const normalized = parseTimeInput(localVal)
    setLocalVal(normalized)
    setOpen(false)
    onChange(normalized)
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
        style={inputStyle}
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
          <div style={{ width: '40px', height: '120px', overflowY: 'auto', padding: '4px' }}>
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
          <div style={{ width: '1px', background: '#eee', flexShrink: 0 }} />
          <div style={{ width: '40px', padding: '4px', display: 'flex', flexDirection: 'column', justifyContent: 'space-around' }}>
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

// ── RichTextArea (1:1 mit ShiftCard) ──────────────────────────────────────────

function RichTextArea({
  value,
  onChange,
  placeholder,
  minHeight,
}: {
  value: string
  onChange: (html: string) => void
  placeholder?: string
  minHeight: string
}) {
  const ref = useRef<HTMLDivElement>(null)
  const [underlineActive, setUnderlineActive] = useState(false)

  useEffect(() => {
    if (ref.current && ref.current.innerHTML === '') {
      ref.current.innerHTML = value
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const checkUnderline = () => {
    setUnderlineActive(document.queryCommandState('underline'))
  }

  return (
    <div style={{ position: 'relative' }}>
      <div
        ref={ref}
        contentEditable
        suppressContentEditableWarning
        data-placeholder={placeholder}
        onBlur={() => { if (ref.current) onChange(ref.current.innerHTML) }}
        onKeyUp={checkUnderline}
        onMouseUp={checkUnderline}
        onSelect={checkUnderline}
        style={{
          width: '100%',
          border: '1px solid #e8e8e8',
          borderRadius: '3px',
          background: '#fafafa',
          fontFamily: "var(--font-ibm-plex-sans), sans-serif",
          fontSize: '9pt',
          color: '#222',
          outline: 'none',
          padding: '4px 28px 4px 5px',
          minHeight,
          boxSizing: 'border-box',
          whiteSpace: 'pre-wrap',
          wordBreak: 'break-word',
        }}
      />
      <button
        onMouseDown={e => {
          e.preventDefault()
          document.execCommand('underline')
          setUnderlineActive(prev => !prev)
        }}
        title="Unterstreichen"
        style={{
          position: 'absolute', top: '3px', right: '3px',
          width: '18px', height: '18px',
          border: `1px solid ${underlineActive ? '#1a2040' : '#ddd'}`,
          borderRadius: '2px',
          background: underlineActive ? '#1a2040' : '#f0f0f0',
          cursor: 'pointer', fontSize: '9pt',
          fontFamily: "var(--font-ibm-plex-sans), sans-serif",
          fontWeight: 700, textDecoration: 'underline',
          color: underlineActive ? '#fff' : '#444',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: 0, lineHeight: 1,
        }}
      >
        U
      </button>
    </div>
  )
}

// ── Typen ─────────────────────────────────────────────────────────────────────

interface DemoWorker { id: string; beruf: string; anz: number; std: number }
interface DemoEquipment { id: string; typ: string; anz: number; std: number }

let _id = 0
const uid = () => `d${++_id}`

// ── BtbDemoCard ───────────────────────────────────────────────────────────────

export function BtbDemoCard() {
  // Wetter
  const [temp, setTemp] = useState('19')
  const [wit, setWit] = useState('')
  const [bod, setBod] = useState('Nass')

  // Arbeitszeit
  const [beg, setBeg] = useState('07:00')
  const [end, setEnd] = useState('18:00')
  const [pau, setPau] = useState<number>(60)

  // Örtlichkeit
  const [gl, setGl] = useState('Strecke 6233 - Stralsund - Rostock')
  const [kv, setKv] = useState('41,725')
  const [kb, setKb] = useState('46,750')

  // Personal & Maschinen
  const [workers, setWorkers] = useState<DemoWorker[]>([
    { id: uid(), beruf: 'Bauleiter',   anz: 1, std: 10 },
    { id: uid(), beruf: 'Polier',      anz: 1, std: 10 },
    { id: uid(), beruf: 'Vorarbeiter', anz: 2, std: 10 },
    { id: uid(), beruf: 'Facharbeiter',anz: 6, std: 10 },
    { id: uid(), beruf: 'Maschinist',  anz: 1, std: 10 },
  ])
  const [equipment, setEquipment] = useState<DemoEquipment[]>([
    { id: uid(), typ: 'ZWB',                      anz: 1, std: 10 },
    { id: uid(), typ: 'Gleisbauanhänger + Mulde',  anz: 1, std: 10 },
    { id: uid(), typ: 'Radlader',                  anz: 1, std: 10 },
  ])

  // Texte
  const [arb, setArb] = useState(
    '<u>BHF Gleis 2</u>:<br>Schwellen ausgelegt<br>Schienen verzogen<br>120m Gleis montiert<br>Schacht gesetzt am Bahnsteigenden<br><br>Annahme Schüttgüter auf Lagerplatz, Aufräumarbeiten<br>Suchschachtung'
  )
  const [vor, setVor] = useState('Unbekanntes Kabel bei Suchschachtung gefunden.')

  const netHours = calculateNetHours(beg || null, end || null, pau || null)

  const workerCats = [...DEFAULT_WORKER_CATEGORIES]
  const equipCats = [...DEFAULT_EQUIPMENT_CATEGORIES].slice(0, 5)

  const addWorker = (beruf: string) =>
    setWorkers(prev => [...prev, { id: uid(), beruf, anz: 1, std: netHours || 0 }])

  const updateWorker = (id: string, field: string, value: string | number) =>
    setWorkers(prev => prev.map(w => w.id === id ? { ...w, [field]: value } : w))

  const deleteWorker = (id: string) =>
    setWorkers(prev => prev.filter(w => w.id !== id))

  const addEquipment = (typ: string) =>
    setEquipment(prev => [...prev, { id: uid(), typ, anz: 1, std: netHours || 0 }])

  const updateEquipment = (id: string, field: string, value: string | number) =>
    setEquipment(prev => prev.map(e => e.id === id ? { ...e, [field]: value } : e))

  const deleteEquipment = (id: string) =>
    setEquipment(prev => prev.filter(e => e.id !== id))

  const dateLabel = new Date().toLocaleDateString('de-DE', {
    weekday: 'long', day: '2-digit', month: '2-digit', year: 'numeric',
  })

  const totMA = workers.reduce((s, w) => s + (w.std || 0) * (w.anz || 1), 0)
  const totGer = equipment.reduce((s, e) => s + (e.std || 0) * (e.anz || 1), 0)

  const tdInp: React.CSSProperties = {
    width: '100%', border: 'none', background: 'transparent',
    fontFamily: "var(--font-ibm-plex-sans), sans-serif", fontSize: '9pt', color: '#222',
    outline: 'none', padding: '1px 2px', borderBottom: '1px dashed #ddd',
  }

  return (
    <div
      style={{
        width: '210mm',
        height: '297mm',
        background: '#fff',
        color: '#222',
        fontFamily: "var(--font-ibm-plex-sans), sans-serif",
        fontSize: '9pt',
        borderRadius: '6px',
        overflow: 'hidden',
        position: 'relative',
        boxShadow: '0 4px 20px rgba(0,0,0,.4)',
        border: '2px solid transparent',
      }}
    >
      <div
        style={{
          padding: '7mm 9mm 22mm 9mm',
          height: '100%',
          position: 'relative',
          display: 'flex',
          flexDirection: 'column',
          boxSizing: 'border-box',
          overflow: 'hidden',
        }}
      >
        {/* ── Header ───────────────────────────────────────────────────── */}
        <div style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
          borderBottom: '2.5px solid #1a2040', paddingBottom: '6px', marginBottom: '6px', flexShrink: 0,
        }}>
          <div>
            <div style={{ fontFamily: "var(--font-inter), sans-serif", fontWeight: 800, fontSize: '15pt', color: '#1a2040' }}>
              Musterbau GmbH
            </div>
            <div style={{ fontSize: '9pt', color: '#666', marginTop: '2px' }}>
              Musterstraße 12 · 10115 Berlin
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <h2 style={{ fontSize: '12pt', fontWeight: 700, color: '#1a2040', textTransform: 'uppercase', letterSpacing: '0.5px', margin: 0 }}>
              Bautagesbericht
            </h2>
            <div style={{ fontSize: '9pt', color: '#888', marginTop: '2px' }} suppressHydrationWarning>
              {dateLabel}
            </div>
            <p style={{ fontSize: '9pt', color: '#e8a020', fontWeight: 600, marginTop: '2px', margin: 0 }}>
              Tagschicht
            </p>
          </div>
        </div>

        {/* ── 3-col: Projekt / Wetter / Arbeitszeit ─────────────────── */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '7px', marginBottom: '5px', flexShrink: 0 }}>
          {/* Projekt (gesperrt) */}
          <div style={sectionStyle}>
            <div style={sectionTitleStyle}>Projekt</div>
            <div style={{ marginBottom: '3px' }}>
              <label style={labelStyle}>Name</label>
              <div style={{ fontSize: '9pt', fontWeight: 600, padding: '1px 2px' }}>A1 Gleisbau</div>
            </div>
            <div style={{ marginBottom: '3px' }}>
              <label style={labelStyle}>Kostenstelle</label>
              <div style={{ fontSize: '9pt', padding: '1px 2px' }}>KST-2026-04</div>
            </div>
            <div>
              <label style={labelStyle}>Auftraggeber</label>
              <div style={{ fontSize: '9pt', padding: '1px 2px' }}>DB Netz AG</div>
            </div>
          </div>

          {/* Wetter */}
          <div style={sectionStyle}>
            <div style={sectionTitleStyle}>Wetter</div>
            <div style={{ marginBottom: '4px' }}>
              <label style={labelStyle}>Temperatur (C)</label>
              <input
                type="number"
                value={temp}
                onChange={e => setTemp(e.target.value)}
                placeholder="12"
                style={inputStyle}
              />
            </div>
            <div style={{ marginBottom: '4px' }}>
              <label style={labelStyle}>Witterung</label>
              <select
                value={wit}
                onChange={e => setWit(e.target.value)}
                style={{ ...inputStyle, cursor: 'pointer' }}
              >
                <option value="">-- wählen --</option>
                {WITTERUNG_OPTIONS.map(opt => <option key={opt} value={opt}>{opt}</option>)}
              </select>
            </div>
            <div>
              <label style={labelStyle}>Bodenzustand</label>
              <select
                value={bod}
                onChange={e => setBod(e.target.value)}
                style={{ ...inputStyle, cursor: 'pointer' }}
              >
                <option value="">-- wählen --</option>
                {BODENZUSTAND_OPTIONS.map(opt => <option key={opt} value={opt}>{opt}</option>)}
              </select>
            </div>
          </div>

          {/* Arbeitszeit */}
          <div style={sectionStyle}>
            <div style={sectionTitleStyle}>Arbeitszeit</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '5px', marginBottom: '4px' }}>
              <div>
                <label style={labelStyle}>Beginn</label>
                <TimeInput value={beg} onChange={setBeg} />
              </div>
              <div>
                <label style={labelStyle}>Ende</label>
                <TimeInput value={end} onChange={setEnd} />
              </div>
            </div>
            <div style={{ marginBottom: '4px' }}>
              <label style={labelStyle}>Pause (Min.)</label>
              <div style={{ display: 'flex', gap: '3px', alignItems: 'center' }}>
                <input
                  type="number"
                  className="btb-no-spin"
                  value={pau === 0 ? '' : pau}
                  onChange={e => setPau(parseInt(e.target.value, 10) || 0)}
                  style={{ ...inputStyle, width: '36px', flexShrink: 0 }}
                />
                {[{ label: '—', val: 0 }, { label: '30', val: 30 }, { label: '60', val: 60 }].map(({ label, val }) => {
                  const active = pau === val
                  return (
                    <button
                      key={val}
                      onClick={() => setPau(val)}
                      style={{
                        flex: 1, padding: '2px 0', border: '1px solid', borderRadius: '3px',
                        fontSize: '9pt', fontFamily: "var(--font-ibm-plex-sans), sans-serif", cursor: 'pointer',
                        background: active ? '#1a2040' : '#f5f5f5',
                        color: active ? '#fff' : '#555',
                        borderColor: active ? '#1a2040' : '#ddd',
                        fontWeight: active ? 700 : 400,
                      }}
                    >
                      {label}
                    </button>
                  )
                })}
              </div>
            </div>
            <div>
              <label style={labelStyle}>Nettostunden</label>
              <input
                type="text"
                value={netHours > 0 ? `${netHours} h` : ''}
                readOnly
                style={{ ...inputStyle, color: '#555', borderBottomColor: 'transparent' }}
              />
            </div>
          </div>
        </div>

        <div style={{ height: '2.5em', flexShrink: 0 }} />

        {/* ── Örtlichkeit ───────────────────────────────────────────── */}
        <div style={{ ...sectionStyle, display: 'flex', alignItems: 'baseline', gap: '4px', borderBottom: '1px solid #ddd', paddingBottom: '2px' }}>
          <span style={{ ...sectionTitleStyle, borderBottom: 'none', paddingBottom: 0, marginBottom: 0, whiteSpace: 'nowrap', flexShrink: 0 }}>
            Örtlichkeit:
          </span>
          <input
            type="text"
            value={gl}
            onChange={e => setGl(e.target.value)}
            placeholder="Strecke / Gleis / Bauteil…"
            style={{ ...inputStyle, borderBottom: 'none', flex: 1 }}
          />
          <span style={{ fontSize: '9pt', color: '#999', whiteSpace: 'nowrap', flexShrink: 0 }}>km</span>
          <input
            type="text"
            value={kv}
            onChange={e => setKv(e.target.value)}
            placeholder="von"
            style={{ ...inputStyle, borderBottom: 'none', width: '44px', flexShrink: 0 }}
          />
          <span style={{ fontSize: '9pt', color: '#bbb', flexShrink: 0 }}>–</span>
          <input
            type="text"
            value={kb}
            onChange={e => setKb(e.target.value)}
            placeholder="bis"
            style={{ ...inputStyle, borderBottom: 'none', width: '44px', flexShrink: 0 }}
          />
        </div>

        <div style={{ height: '0.5em', flexShrink: 0 }} />

        {/* ── 2-col: Personal + Maschinen ───────────────────────────── */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '7px', flexShrink: 0 }}>
          {/* Personal */}
          <div style={sectionStyle}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '9pt' }}>
              <thead>
                <tr>
                  <th style={thStyle}>Personal</th>
                  <th style={{ ...thStyle, width: '32px' }}>Anz</th>
                  <th style={{ ...thStyle, width: '36px' }}>Std</th>
                  <th style={{ ...thStyle, width: '20px' }}></th>
                </tr>
              </thead>
              <tbody>
                {workers.map(w => (
                  <tr key={w.id}>
                    <td style={{ padding: '2px 5px', borderBottom: '1px solid #eee' }}>
                      <input
                        type="text"
                        value={w.beruf}
                        onChange={e => updateWorker(w.id, 'beruf', e.target.value)}
                        placeholder="Beruf / Name..."
                        style={tdInp}
                      />
                    </td>
                    <td style={{ padding: '2px 5px', borderBottom: '1px solid #eee', width: '32px' }}>
                      <input
                        type="number"
                        value={w.anz}
                        onChange={e => updateWorker(w.id, 'anz', parseInt(e.target.value, 10) || 1)}
                        style={{ ...tdInp, width: '28px' }}
                      />
                    </td>
                    <td style={{ padding: '2px 5px', borderBottom: '1px solid #eee', width: '44px' }}>
                      <input
                        type="number"
                        step="0.5"
                        value={w.std}
                        onChange={e => updateWorker(w.id, 'std', parseFloat(e.target.value) || 0)}
                        style={{ ...tdInp, width: '40px' }}
                      />
                    </td>
                    <td style={{ padding: '2px 5px', borderBottom: '1px solid #eee', width: '20px' }}>
                      <button
                        onClick={() => deleteWorker(w.id)}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#cc5555', fontSize: '11px', padding: '1px 4px' }}
                      >
                        x
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '3px', marginTop: '4px' }}>
              {workerCats.map(cat => (
                <button key={cat} onClick={() => addWorker(cat)} style={chipStyle}>{cat}</button>
              ))}
              <button onClick={() => addWorker('')} style={{ ...chipStyle, border: '1px dashed #ddd', color: '#888' }}>
                + Individuell
              </button>
            </div>
            {totMA > 0 && (
              <div style={{ fontSize: '9pt', color: '#666', marginTop: '3px', textAlign: 'right' }}>
                Gesamt: <strong>{Math.round(totMA * 100) / 100} h</strong>
              </div>
            )}
          </div>

          {/* Maschinen & Gerät */}
          <div style={sectionStyle}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '9pt' }}>
              <thead>
                <tr>
                  <th style={thStyle}>Maschinen & Gerät</th>
                  <th style={{ ...thStyle, width: '32px' }}>Anz</th>
                  <th style={{ ...thStyle, width: '36px' }}>Std</th>
                  <th style={{ ...thStyle, width: '20px' }}></th>
                </tr>
              </thead>
              <tbody>
                {equipment.map(eq => (
                  <tr key={eq.id}>
                    <td style={{ padding: '2px 5px', borderBottom: '1px solid #eee' }}>
                      <input
                        type="text"
                        value={eq.typ}
                        onChange={e => updateEquipment(eq.id, 'typ', e.target.value)}
                        placeholder="Gerät..."
                        style={tdInp}
                      />
                    </td>
                    <td style={{ padding: '2px 5px', borderBottom: '1px solid #eee', width: '32px' }}>
                      <input
                        type="number"
                        value={eq.anz}
                        onChange={e => updateEquipment(eq.id, 'anz', parseInt(e.target.value, 10) || 1)}
                        style={{ ...tdInp, width: '28px' }}
                      />
                    </td>
                    <td style={{ padding: '2px 5px', borderBottom: '1px solid #eee', width: '44px' }}>
                      <input
                        type="number"
                        step="0.5"
                        value={eq.std}
                        onChange={e => updateEquipment(eq.id, 'std', parseFloat(e.target.value) || 0)}
                        style={{ ...tdInp, width: '40px' }}
                      />
                    </td>
                    <td style={{ padding: '2px 5px', borderBottom: '1px solid #eee', width: '20px' }}>
                      <button
                        onClick={() => deleteEquipment(eq.id)}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#cc5555', fontSize: '11px', padding: '1px 4px' }}
                      >
                        x
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '3px', marginTop: '4px' }}>
              {equipCats.map(cat => (
                <button key={cat} onClick={() => addEquipment(cat)} style={chipStyle}>{cat}</button>
              ))}
              <button onClick={() => addEquipment('')} style={{ ...chipStyle, border: '1px dashed #ddd', color: '#888' }}>
                + Individuell
              </button>
            </div>
            {totGer > 0 && (
              <div style={{ fontSize: '9pt', color: '#666', marginTop: '3px', textAlign: 'right' }}>
                Gesamt: <strong>{Math.round(totGer * 100) / 100} h</strong>
              </div>
            )}
          </div>
        </div>

        <div style={{ height: '1.2em', flexShrink: 0 }} />

        {/* ── Ausgeführte Arbeiten ──────────────────────────────────── */}
        <div style={{ ...sectionStyle, flexShrink: 0 }}>
          <div style={sectionTitleStyle}>Ausgeführte Arbeiten</div>
          <RichTextArea
            value={arb}
            onChange={setArb}
            placeholder="Beschreibung der durchgeführten Arbeiten..."
            minHeight="72px"
          />
        </div>

        <div style={{ height: '1.2em', flexShrink: 0 }} />

        {/* ── Vorkommnisse ──────────────────────────────────────────── */}
        <div style={{ ...sectionStyle, flexShrink: 0 }}>
          <div style={sectionTitleStyle}>Vorkommnisse / Behinderungen</div>
          <RichTextArea
            value={vor}
            onChange={setVor}
            placeholder="Behinderungen, Zwischenfälle..."
            minHeight="44px"
          />
        </div>

        {/* ── Unterschrift (absolute bottom, 1:1 ShiftCard) ────────── */}
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
