'use client'

import { useRef, useCallback } from 'react'
import { Printer } from 'lucide-react'

interface GeraeteActionBarProps {
  zoom: number
  onZoomChange: (zoom: number) => void
  onPrintAll: () => void
  printLagerplaetze: boolean
  onPrintLagerplaetzeChange: (value: boolean) => void
}

function ZoomSlider({ zoom, onZoomChange }: { zoom: number; onZoomChange: (z: number) => void }) {
  const ref = useRef<HTMLDivElement>(null)
  const ratio = (zoom - 30) / (100 - 30)

  const interact = useCallback((clientX: number) => {
    if (!ref.current) return
    const rect = ref.current.getBoundingClientRect()
    const r = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width))
    onZoomChange(Math.round(30 + r * 70))
  }, [onZoomChange])

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault()
    interact(e.clientX)
    const onMove = (ev: MouseEvent) => interact(ev.clientX)
    const onUp = () => {
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
    }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
  }

  return (
    <div
      ref={ref}
      onMouseDown={handleMouseDown}
      className="relative rounded-md border border-[#e8c547]/50 bg-card cursor-pointer select-none overflow-hidden py-1.5 px-3 flex items-center gap-3"
    >
      <div
        style={{ width: `${ratio * 100}%`, position: 'absolute', inset: 0, background: '#e8c547', opacity: 0.15, borderRadius: 'inherit' }}
      />
      <span className="relative text-[10px] font-semibold text-[#e8c547]">Zoom</span>
      <span className="relative text-[10px] font-mono text-[#e8c547]">{zoom}%</span>
    </div>
  )
}

export function GeraeteActionBar({
  zoom,
  onZoomChange,
  onPrintAll,
  printLagerplaetze,
  onPrintLagerplaetzeChange,
}: GeraeteActionBarProps) {
  return (
    <div
      data-no-print="true"
      className="flex items-center shrink-0 border-b border-border bg-background px-4 py-3 gap-3"
    >
      <ZoomSlider zoom={zoom} onZoomChange={onZoomChange} />

      <button
        onClick={onPrintAll}
        className="flex items-center gap-1.5 text-[11px] font-semibold border border-border bg-card text-foreground rounded-md py-1.5 px-3 whitespace-nowrap hover:bg-accent/10 transition-colors"
        aria-label="Alle Blaetter drucken"
      >
        <Printer size={13} />
        Alle drucken
      </button>

      <button
        onClick={() => onPrintLagerplaetzeChange(!printLagerplaetze)}
        className="flex items-center gap-2 text-[11px] font-semibold border rounded-md py-1.5 px-3 whitespace-nowrap transition-colors"
        style={{
          borderColor: printLagerplaetze ? '#e8c547' : undefined,
          background: printLagerplaetze ? 'rgba(232,197,71,0.12)' : undefined,
          color: printLagerplaetze ? '#e8c547' : undefined,
        }}
        aria-label="Lagerplaetze beim Drucken mitdrucken"
        aria-pressed={printLagerplaetze}
      >
        <span
          style={{
            width: '13px',
            height: '13px',
            borderRadius: '3px',
            border: `1.5px solid ${printLagerplaetze ? '#e8c547' : 'currentColor'}`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
            background: printLagerplaetze ? '#e8c547' : 'transparent',
          }}
        >
          {printLagerplaetze && (
            <svg width="8" height="8" viewBox="0 0 8 8" fill="none">
              <path d="M1.5 4L3.2 5.8L6.5 2.2" stroke="#171c28" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          )}
        </span>
        Lagerplätze mitdrucken
      </button>
    </div>
  )
}
