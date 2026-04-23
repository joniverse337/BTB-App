'use client'

import { useEffect } from 'react'

export function ActionChipPopover({ categories, onAdd, onClose, wrapRef }: {
  categories: string[]
  onAdd: (cat: string) => void
  onClose: () => void
  wrapRef: React.RefObject<HTMLDivElement | null>
}) {
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) onClose()
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [onClose, wrapRef])

  const chip: React.CSSProperties = {
    display: 'inline-flex', alignItems: 'center', padding: '2px 7px',
    background: '#f0f0f0', border: '1px solid #ddd', borderRadius: '10px',
    color: '#555', cursor: 'pointer', fontSize: '9pt',
    fontFamily: "var(--font-ibm-plex-sans), sans-serif",
  }

  return (
    <div style={{
      position: 'absolute', top: '100%', left: 0, zIndex: 50,
      background: '#fff', border: '1px solid #ddd', borderRadius: '6px',
      padding: '5px', display: 'flex', flexWrap: 'wrap', gap: '3px',
      minWidth: '140px', boxShadow: '0 3px 10px rgba(0,0,0,.15)',
    }}>
      {categories.map(cat => (
        <button key={cat} onClick={() => { onAdd(cat); onClose() }} style={chip}>{cat}</button>
      ))}
      <button onClick={() => { onAdd(''); onClose() }} style={{ ...chip, background: 'none', border: '1px dashed #ddd', color: '#888' }}>
        + Individuell
      </button>
    </div>
  )
}
