'use client'

import { useRef, useCallback } from 'react'
import { Camera, Pencil, Printer, RotateCcw, Undo2 } from 'lucide-react'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'

const PEN_COLORS = [
  { value: '#ef4444', label: 'Rot' },
  { value: '#e8c547', label: 'Gelb' },
  { value: '#3b82f6', label: 'Blau' },
  { value: '#ffffff', label: 'Weiss' },
]

const PEN_WIDTHS = [
  { value: 2, label: 'Duenn' },
  { value: 5, label: 'Mittel' },
  { value: 10, label: 'Dick' },
]

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
        className="absolute inset-0 bg-[#e8c547] opacity-15 rounded-[inherit]"
        style={{ width: `${ratio * 100}%` }}
      />
      <span className="relative text-[10px] font-semibold text-[#e8c547]">Zoom</span>
      <span className="relative text-[10px] font-mono text-[#e8c547]">{zoom}%</span>
    </div>
  )
}

interface LagerplaetzeActionBarProps {
  zoom: number
  onZoomChange: (zoom: number) => void
  // Active card state
  hasActiveCard: boolean
  hasScreenshot: boolean
  isDrawing: boolean
  canUndo: boolean
  activeLocationName?: string
  penColor: string
  onPenColorChange: (color: string) => void
  penWidth: number
  onPenWidthChange: (width: number) => void
  // Active card actions
  onScreenshot: () => void
  onRetake: () => void
  onToggleDraw: () => void
  onUndo: () => void
  onPrintAll: () => void
}

export function LagerplaetzeActionBar({
  zoom,
  onZoomChange,
  hasActiveCard,
  hasScreenshot,
  isDrawing,
  canUndo,
  activeLocationName,
  penColor,
  onPenColorChange,
  penWidth,
  onPenWidthChange,
  onScreenshot,
  onRetake,
  onToggleDraw,
  onUndo,
  onPrintAll,
}: LagerplaetzeActionBarProps) {
  const disabled = !hasActiveCard

  return (
    <div
      data-no-print="true"
      className="flex items-center shrink-0 border-b border-border bg-background px-4 py-3 gap-3 flex-wrap"
    >
      <ZoomSlider zoom={zoom} onZoomChange={onZoomChange} />

      {/* Alle drucken */}
      <button
        onClick={onPrintAll}
        className="flex items-center gap-1.5 text-[11px] font-semibold border border-border bg-card text-foreground rounded-md py-1.5 px-3 whitespace-nowrap hover:bg-accent/10 transition-colors"
        aria-label="Alle Lagerplaetze drucken"
      >
        <Printer size={13} />
        Alle drucken
      </button>

      {/* Karte fixieren / Karte neu fixieren */}
      <button
        onClick={hasScreenshot ? onRetake : onScreenshot}
        disabled={disabled}
        className="flex items-center gap-1.5 text-[11px] font-semibold border border-border bg-card text-foreground rounded-md py-1.5 px-3 whitespace-nowrap hover:bg-accent/10 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        aria-label={hasScreenshot ? 'Karte neu fixieren' : 'Karte fixieren'}
      >
        {hasScreenshot ? <RotateCcw size={13} /> : <Camera size={13} />}
        {hasScreenshot ? 'Karte neu fixieren' : 'Karte fixieren'}
      </button>

      {/* Stift */}
      <button
        onClick={onToggleDraw}
        disabled={disabled || !hasScreenshot}
        className={`flex items-center gap-1.5 text-[11px] font-semibold border rounded-md py-1.5 px-3 whitespace-nowrap transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${
          isDrawing
            ? 'border-[#e8c547] bg-[#e8c547]/15 text-[#e8c547]'
            : 'border-border bg-card text-foreground hover:bg-accent/10'
        }`}
        aria-label="Zeichenmodus umschalten"
      >
        <Pencil size={13} />
        Stift
      </button>

      {/* Farbe + Stärke */}
      <Popover>
        <PopoverTrigger asChild>
          <button
            disabled={disabled || !hasScreenshot}
            className="flex items-center gap-1.5 text-[11px] font-semibold border border-border bg-card rounded-md py-1.5 px-3 whitespace-nowrap hover:bg-accent/10 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            aria-label="Stiftoptionen"
          >
            <div
              className="w-3 h-3 rounded-full border border-border"
              style={{ backgroundColor: penColor }}
            />
            Farbe
          </button>
        </PopoverTrigger>
        <PopoverContent className="w-48 p-3" align="start">
          <div className="space-y-3">
            <div>
              <p className="text-[10px] font-semibold text-muted-foreground uppercase mb-1.5">Farbe</p>
              <div className="flex gap-2">
                {PEN_COLORS.map((c) => (
                  <button
                    key={c.value}
                    onClick={() => onPenColorChange(c.value)}
                    className={`w-6 h-6 rounded-full border-2 transition-transform ${
                      penColor === c.value ? 'border-[#e8c547] scale-110' : 'border-border'
                    }`}
                    style={{ backgroundColor: c.value }}
                    aria-label={c.label}
                    title={c.label}
                  />
                ))}
              </div>
            </div>
            <div>
              <p className="text-[10px] font-semibold text-muted-foreground uppercase mb-1.5">Staerke</p>
              <div className="flex gap-2 items-center">
                {PEN_WIDTHS.map((w) => (
                  <button
                    key={w.value}
                    onClick={() => onPenWidthChange(w.value)}
                    className={`flex items-center justify-center w-8 h-8 rounded-md border transition-colors ${
                      penWidth === w.value
                        ? 'border-[#e8c547] bg-[#e8c547]/10'
                        : 'border-border hover:bg-accent/10'
                    }`}
                    aria-label={w.label}
                    title={w.label}
                  >
                    <div
                      className="rounded-full bg-foreground"
                      style={{ width: `${w.value + 2}px`, height: `${w.value + 2}px` }}
                    />
                  </button>
                ))}
              </div>
            </div>
          </div>
        </PopoverContent>
      </Popover>

      {/* Undo */}
      <button
        onClick={onUndo}
        disabled={disabled || !canUndo}
        className="flex items-center gap-1.5 text-[11px] font-semibold border border-border bg-card text-foreground rounded-md py-1.5 px-3 whitespace-nowrap hover:bg-accent/10 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        aria-label="Letzte Linie rueckgaengig"
      >
        <Undo2 size={13} />
      </button>

      {/* Active location name */}
      {activeLocationName && (
        <span className="text-[11px] text-muted-foreground whitespace-nowrap pl-1">
          auf <span className="font-semibold text-foreground">{activeLocationName}</span> anwenden
        </span>
      )}
    </div>
  )
}
