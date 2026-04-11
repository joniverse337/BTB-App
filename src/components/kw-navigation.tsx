'use client'

import { useRef, useEffect, useCallback, useState } from 'react'
import { addDays } from 'date-fns'
import { Printer, Trash2, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { toDateString } from '@/lib/kw-utils'
import type { KWInfo } from '@/lib/kw-utils'
import type { ShiftWithDetails } from '@/lib/validations/shift'

interface KWNavigationProps {
  weeks: KWInfo[]
  activeIndex: number
  onSelectWeek: (index: number) => void
  shifts: ShiftWithDetails[]
  zoom: number
  onZoomChange: (zoom: number) => void
  onPrintKW: () => void
  lzVon: string | null
  lzBis: string | null
  printLabel?: string
  compactPrint?: boolean
  /** Wenn gesetzt: Lösch-Button neben Druck-Button — löscht die aktive KW */
  onDeleteKW?: () => void
  /** Ersetzt DotRaster in KW-Chips — z.B. Status-Rechteck für AA */
  renderWeekStatus?: (week: KWInfo) => React.ReactNode
  /** Aktiver Suchbegriff (von außen gesteuert) */
  searchQuery?: string
  /** Callback wenn Suche ausgelöst wird */
  onSearch?: (query: string) => void
  /** Callback wenn Suche beendet wird */
  onClearSearch?: () => void
  /** Anzahl der gefundenen Schichten über alle KWs */
  searchResultCount?: number
  /** Inkrementiert von außen um Blink-Animation auszulösen */
  searchBlinkTrigger?: number
}

function DotRaster({ weekStart, shifts, lzVon, lzBis }: {
  weekStart: Date
  shifts: ShiftWithDetails[]
  lzVon: string | null
  lzBis: string | null
}) {
  const dots = Array.from({ length: 7 }, (_, i) => {
    const day = addDays(weekStart, i)
    const dateStr = toDateString(day)
    const inRange = !!(lzVon && lzBis && dateStr >= lzVon && dateStr <= lzBis)
    const hasTag = inRange && shifts.some(s => s.datum === dateStr && s.typ === 'tag')
    const hasNacht = inRange && shifts.some(s => s.datum === dateStr && s.typ === 'nacht')
    const isWeekend = i >= 5 // Sa=5, So=6
    return { dateStr, inRange, hasTag, hasNacht, isWeekend }
  })

  return (
    <div className="flex flex-col gap-[3px] mt-1">
      <div className="flex gap-[3px] items-center">
        {dots.map(d => (
          <div
            key={`t-${d.dateStr}`}
            className={cn(
              'w-[6px] h-[6px] rounded-full shrink-0',
              !d.inRange ? 'opacity-0' : d.hasTag ? 'bg-[#e8c547]' : d.isWeekend ? 'bg-muted border border-[#66CDAA]' : 'bg-muted border border-border'
            )}
          />
        ))}
      </div>
      <div className="flex gap-[3px] items-center">
        {dots.map(d => (
          <div
            key={`n-${d.dateStr}`}
            className={cn(
              'w-[6px] h-[6px] rounded-full shrink-0',
              !d.inRange ? 'opacity-0' : d.hasNacht ? 'bg-[#4a7cf7]' : d.isWeekend ? 'bg-muted border border-[#66CDAA]' : 'bg-muted border border-border'
            )}
          />
        ))}
      </div>
    </div>
  )
}

function ZoomSlider({ zoom, onZoomChange }: { zoom: number; onZoomChange: (z: number) => void }) {
  const ref = useRef<HTMLDivElement>(null)
  const ratio = (zoom - 40) / (100 - 40)

  const interact = useCallback((clientX: number) => {
    if (!ref.current) return
    const rect = ref.current.getBoundingClientRect()
    const r = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width))
    onZoomChange(Math.round(40 + r * 60))
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
      className="relative rounded-md border border-[#e8c547]/50 bg-card cursor-pointer select-none overflow-hidden py-[7px] px-3 flex items-center gap-3"
    >
      {/* Gold fill */}
      <div
        style={{ width: `${ratio * 100}%`, position: 'absolute', inset: 0, background: '#e8c547', opacity: 0.15, borderRadius: 'inherit' }}
      />
      <span className="relative text-[10px] font-semibold text-[#e8c547]">Zoom</span>
      <span className="relative text-[10px] font-mono text-[#e8c547]">{zoom}%</span>
    </div>
  )
}

export function KWNavigation({
  weeks, activeIndex, onSelectWeek, shifts,
  zoom, onZoomChange, onPrintKW, lzVon, lzBis, printLabel = 'KW drucken', compactPrint = false,
  onDeleteKW, renderWeekStatus,
  searchQuery, onSearch, onClearSearch, searchResultCount, searchBlinkTrigger,
}: KWNavigationProps) {
  const activeRef = useRef<HTMLButtonElement>(null)
  const [inputValue, setInputValue] = useState(searchQuery ?? '')
  const [blinkOff, setBlinkOff] = useState(false)

  // Sync inputValue wenn searchQuery von außen zurückgesetzt wird
  useEffect(() => {
    if (!searchQuery) setInputValue('')
  }, [searchQuery])

  // Blink-Animation: gelb aus → an → aus
  useEffect(() => {
    if (!searchBlinkTrigger) return
    setBlinkOff(true)
    const t1 = setTimeout(() => setBlinkOff(false), 250)
    const t2 = setTimeout(() => setBlinkOff(true), 500)
    const t3 = setTimeout(() => setBlinkOff(false), 750)
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3) }
  }, [searchBlinkTrigger])

  useEffect(() => {
    if (activeRef.current) {
      activeRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' })
    }
  }, [activeIndex])

  if (weeks.length === 0) return null

  const currentYear = new Date().getFullYear()
  const isSearchActive = !!searchQuery

  const handleSearch = () => {
    if (inputValue.trim()) onSearch?.(inputValue.trim())
  }

  const handleClear = () => {
    setInputValue('')
    onClearSearch?.()
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') handleSearch()
    if (e.key === 'Escape') handleClear()
  }

  return (
    <div className="flex items-start shrink-0 border-b bg-background px-3 pt-[13px] pb-[9px] gap-1.5">
      {/* Left: print + zoom (or compact icon-only print + placeholder chip) */}
      <div className="shrink-0 flex flex-col gap-1.5">
        {compactPrint ? (
          <div className="flex flex-col gap-0.5 rounded-md border border-border bg-card px-2 py-1.5 opacity-30" style={{ minWidth: '64px' }} />
        ) : (
          <>
            <div className="flex gap-1.5">
              <button
                onClick={onPrintKW}
                className="flex items-center gap-1.5 text-[10px] font-semibold border border-border bg-card text-muted-foreground rounded-md py-[7px] px-2 cursor-pointer hover:border-primary/40 hover:text-foreground transition-colors whitespace-nowrap"
              >
                <Printer size={11} />
                {printLabel}
              </button>
              {onDeleteKW && (
                <button
                  onClick={onDeleteKW}
                  title="Arbeitsanmeldung löschen"
                  className="flex items-center justify-center border border-border bg-card text-muted-foreground rounded-md py-1.5 px-2 cursor-pointer hover:border-destructive/60 hover:text-destructive transition-colors"
                >
                  <Trash2 size={11} />
                </button>
              )}
            </div>
            <ZoomSlider zoom={zoom} onZoomChange={onZoomChange} />
          </>
        )}
      </div>

      {/* Scrollable KW chips */}
      <div className="flex-1 overflow-x-auto flex gap-1.5 items-start min-w-0">

        {/* Such-Chip */}
        {onSearch && (
          <div
            className={cn(
              'flex flex-col gap-0.5 rounded-md border px-2 py-0 shrink-0 justify-center',
              'h-[69px]',
              isSearchActive && !blinkOff
                ? 'border-[#e8c547] bg-[#e8c547]/10'
                : 'border-border bg-card'
            )}
            style={{ minWidth: '180px', transition: blinkOff ? 'none' : 'border-color 0.08s, background-color 0.08s' }}
          >
            <div className="flex items-center justify-between">
              <span className={cn(
                'font-mono text-[11px] font-medium',
                isSearchActive && !blinkOff ? 'text-[#e8c547]' : 'text-muted-foreground'
              )}>
                Suchen
              </span>
              {isSearchActive && typeof searchResultCount === 'number' && (
                <span className="text-[10px] text-[#e8c547]/80">
                  {searchResultCount} Treffer
                </span>
              )}
            </div>
            <div className="flex items-center gap-1 mt-1 h-[25px]">
              <input
                type="text"
                value={inputValue}
                onChange={e => setInputValue(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Stichwort…"
                className="flex-1 min-w-0 h-full bg-background border border-border rounded px-1.5 py-0 text-[10px] leading-none text-foreground placeholder:text-muted-foreground/50 outline-none focus:border-[#e8c547]/60 transition-colors"
              />
              {isSearchActive ? (
                <button
                  onClick={handleClear}
                  title="Suche beenden"
                  className="shrink-0 flex items-center justify-center h-full aspect-square text-[#e8c547] hover:bg-[#e8c547]/20 rounded transition-colors cursor-pointer"
                >
                  <X size={10} />
                </button>
              ) : (
                <button
                  onClick={handleSearch}
                  disabled={!inputValue.trim()}
                  className="shrink-0 h-full text-[9px] font-semibold px-1.5 rounded border border-border bg-background text-muted-foreground hover:border-[#e8c547]/60 hover:text-[#e8c547] disabled:opacity-30 disabled:cursor-not-allowed transition-colors cursor-pointer whitespace-nowrap"
                >
                  Suchen
                </button>
              )}
            </div>
          </div>
        )}

        {weeks.map((week, index) => {
          const isActive = index === activeIndex
          const showActiveStyle = isActive && !isSearchActive
          return (
            <button
              key={`${week.year}-${week.kw}`}
              ref={index === activeIndex ? activeRef : null}
              onClick={() => onSelectWeek(index)}
              className={cn(
                'flex flex-col gap-0.5 rounded-md border px-2 py-1.5 shrink-0 cursor-pointer transition-colors text-left',
                showActiveStyle
                  ? 'border-[#e8c547] bg-[#e8c547]/10'
                  : 'border-border bg-card hover:border-primary/40'
              )}
            >
              <span className={cn(
                'font-mono text-[11px] font-medium',
                showActiveStyle ? 'text-[#e8c547]' : 'text-muted-foreground'
              )}>
                KW {week.kw}{week.year !== currentYear ? ` '${String(week.year).slice(2)}` : ''}
              </span>
              <span className="text-[10px] text-muted-foreground whitespace-nowrap">
                {week.dateRange}
              </span>
              {renderWeekStatus
                ? renderWeekStatus(week)
                : <DotRaster weekStart={week.weekStart} shifts={shifts} lzVon={lzVon} lzBis={lzBis} />
              }
            </button>
          )
        })}
      </div>

    </div>
  )
}
