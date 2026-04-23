'use client'

import { useState, useRef, useEffect } from 'react'

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

export function TimeInput({
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
    fontSize: '10pt', fontFamily: "var(--font-ibm-plex-sans), sans-serif",
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
          fontSize: '10pt', color: '#222', outline: 'none', padding: '1px 2px',
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
          <div style={{ width: '1px', background: '#eee', flexShrink: 0 }} />
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
