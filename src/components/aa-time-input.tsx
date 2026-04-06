'use client'

import { useState, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'

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

function AATimeInput({ value, onBlur }: { value: string; onBlur: (v: string) => void }) {
  const [localVal, setLocalVal] = useState(value ? value.slice(0, 5) : value)
  const [open, setOpen] = useState(false)
  const [dropdownPos, setDropdownPos] = useState({ top: 0, left: 0 })
  const activeHourRef = useRef<HTMLDivElement>(null)

  useEffect(() => { setLocalVal(value ? value.slice(0, 5) : value) }, [value])
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

  const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
    e.target.select()
    // getBoundingClientRect gibt Viewport-Koordinaten zurück — korrekt für Portal
    const rect = e.target.getBoundingClientRect()
    setDropdownPos({ top: rect.bottom + 4, left: rect.left })
    setOpen(true)
  }

  const handleTextBlur = () => {
    const normalized = parseTimeInput(localVal)
    setLocalVal(normalized)
    setOpen(false)
    onBlur(normalized)
  }

  const cellStyle = (active: boolean): React.CSSProperties => ({
    padding: '3px 0', textAlign: 'center', cursor: 'pointer',
    fontSize: '8pt', fontFamily: "var(--font-ibm-plex-sans), sans-serif",
    background: active ? '#1a2040' : 'transparent',
    color: active ? '#fff' : '#333',
    fontWeight: active ? 700 : 400,
    borderRadius: '2px',
  })

  const dropdown = open ? (
    <div
      onMouseDown={e => e.preventDefault()}
      style={{
        // Portal: renderiert in document.body, außerhalb aller transforms
        position: 'fixed',
        top: dropdownPos.top,
        left: dropdownPos.left,
        zIndex: 99999,
        background: '#fff', border: '1px solid #ddd', borderRadius: '5px',
        boxShadow: '0 4px 12px rgba(0,0,0,.18)',
        display: 'flex', overflow: 'hidden', minWidth: '80px',
      }}
    >
      <div style={{ width: '40px', height: '120px', overflowY: 'auto', padding: '4px' }}>
        {Array.from({ length: 24 }, (_, i) => (
          <div key={i} ref={i === curH ? activeHourRef : undefined}
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
          <div key={min} onMouseDown={() => commit(curH >= 0 ? curH : 0, min)} style={cellStyle(min === curM)}>
            :{min.toString().padStart(2, '0')}
          </div>
        ))}
      </div>
    </div>
  ) : null

  return (
    <div style={{ position: 'relative' }}>
      <input
        type="text"
        value={localVal}
        onChange={e => setLocalVal(e.target.value)}
        onFocus={handleFocus}
        onBlur={handleTextBlur}
        placeholder="--:--"
        style={{
          width: '38px', border: 'none', borderBottom: '1px solid #ccc',
          background: 'transparent', fontFamily: "var(--font-ibm-plex-sans), sans-serif",
          fontSize: '7.5pt', color: '#222', outline: 'none', padding: '1px 2px',
          textAlign: 'center',
        }}
      />
      {/* Portal rendert außerhalb von PaperEngine-transforms — korrekte Positionierung */}
      {typeof document !== 'undefined' && dropdown && createPortal(dropdown, document.body)}
    </div>
  )
}

interface ArbeitsZeitCellProps {
  dayStart: string | null
  dayEnd: string | null
  nightStart: string | null
  nightEnd: string | null
  disabled: boolean
  weekdayNr: number
  onFieldBlur: (weekdayNr: number, field: string, value: string | null) => void
  onClearShift: (weekdayNr: number, type: 'day' | 'night') => void
  /** Setzt Start- und Endzeit in einem einzigen DB-Write (verhindert Race Condition) */
  onSetShiftTimes?: (weekdayNr: number, fields: Record<string, string>) => void
}

export function ArbeitsZeitCell({
  dayStart, dayEnd, nightStart, nightEnd,
  disabled, weekdayNr, onFieldBlur, onClearShift, onSetShiftTimes,
}: ArbeitsZeitCellProps) {
  const [showDay, setShowDay] = useState(!!dayStart || !!dayEnd)
  const [showNight, setShowNight] = useState(!!nightStart || !!nightEnd)

  useEffect(() => {
    if (dayStart || dayEnd) setShowDay(true)
  }, [dayStart, dayEnd])

  useEffect(() => {
    if (nightStart || nightEnd) setShowNight(true)
  }, [nightStart, nightEnd])

  const chipStyle = (active: boolean): React.CSSProperties => ({
    padding: '1px 7px',
    borderRadius: '3px',
    fontSize: '6.5pt',
    cursor: disabled ? 'default' : 'pointer',
    fontFamily: "var(--font-ibm-plex-sans), sans-serif",
    border: active ? '1px solid #1a2040' : '1px solid #ccc',
    background: active ? '#1a2040' : 'transparent',
    color: active ? '#fff' : '#999',
    fontWeight: active ? 600 : 400,
    flexShrink: 0,
    textAlign: 'center' as const,
    whiteSpace: 'nowrap' as const,
  })

  const toggleDay = () => {
    if (disabled) return
    if (showDay) { onClearShift(weekdayNr, 'day'); setShowDay(false) }
    else {
      setShowDay(true)
      // Batch-Update: start + end in einem DB-Write, verhindert Race Condition
      if (onSetShiftTimes) {
        const fields: Record<string, string> = {}
        if (!dayStart) fields['day_start'] = '07:00'
        if (!dayEnd)   fields['day_end']   = '18:00'
        if (Object.keys(fields).length > 0) onSetShiftTimes(weekdayNr, fields)
      } else {
        if (!dayStart) onFieldBlur(weekdayNr, 'day_start', '07:00')
        if (!dayEnd)   onFieldBlur(weekdayNr, 'day_end', '18:00')
      }
    }
  }

  const toggleNight = () => {
    if (disabled) return
    if (showNight) { onClearShift(weekdayNr, 'night'); setShowNight(false) }
    else {
      setShowNight(true)
      if (onSetShiftTimes) {
        const fields: Record<string, string> = {}
        if (!nightStart) fields['night_start'] = '22:00'
        if (!nightEnd)   fields['night_end']   = '04:00'
        if (Object.keys(fields).length > 0) onSetShiftTimes(weekdayNr, fields)
      } else {
        if (!nightStart) onFieldBlur(weekdayNr, 'night_start', '22:00')
        if (!nightEnd)   onFieldBlur(weekdayNr, 'night_end', '04:00')
      }
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
      {/* Tagschicht */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
        <button style={{ ...chipStyle(showDay), width: '100%' }} onClick={toggleDay}>Tagschicht</button>
        {showDay && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '3px' }}>
            <AATimeInput value={dayStart ?? ''} onBlur={v => onFieldBlur(weekdayNr, 'day_start', v || null)} />
            <span style={{ color: '#bbb', fontSize: '7pt', flexShrink: 0 }}>–</span>
            <AATimeInput value={dayEnd ?? ''} onBlur={v => onFieldBlur(weekdayNr, 'day_end', v || null)} />
          </div>
        )}
      </div>

      {/* Nachtschicht */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
        <button style={{ ...chipStyle(showNight), width: '100%' }} onClick={toggleNight}>Nachtschicht</button>
        {showNight && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '3px' }}>
            <AATimeInput value={nightStart ?? ''} onBlur={v => onFieldBlur(weekdayNr, 'night_start', v || null)} />
            <span style={{ color: '#bbb', fontSize: '7pt', flexShrink: 0 }}>–</span>
            <AATimeInput value={nightEnd ?? ''} onBlur={v => onFieldBlur(weekdayNr, 'night_end', v || null)} />
          </div>
        )}
      </div>
    </div>
  )
}
