'use client'

import { useEffect, useRef } from 'react'
import { getKWsForRange, getCurrentKWIndex } from '@/lib/kw-utils'

const WEEKS = getKWsForRange('2026-01-01', '2026-12-31')
const CURRENT_IDX = getCurrentKWIndex(WEEKS)

export function LandingKWNav() {
  const activeRef = useRef<HTMLButtonElement>(null)
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    activeRef.current?.scrollIntoView({ behavior: 'instant', block: 'nearest', inline: 'center' })
  }, [])

  return (
    <div
      ref={scrollRef}
      className="flex gap-2 overflow-x-auto pb-2 scrollbar-none"
      style={{ scrollbarWidth: 'none' }}
    >
      {WEEKS.map((week, i) => {
        const isActive = i === CURRENT_IDX
        return (
          <button
            key={`${week.year}-${week.kw}`}
            ref={isActive ? activeRef : undefined}
            className="flex-shrink-0 rounded-lg px-3 py-2 text-left transition-colors"
            style={
              isActive
                ? {
                    border: '1px solid #e8c547',
                    background: 'rgba(232,197,71,0.10)',
                    cursor: 'default',
                  }
                : {
                    border: '1px solid transparent',
                    background: 'rgba(255,255,255,0.04)',
                    cursor: 'default',
                  }
            }
          >
            <div
              className="text-xs font-semibold"
              style={{ color: isActive ? '#e8c547' : 'rgba(255,255,255,0.85)' }}
            >
              {week.label}
            </div>
            <div className="mt-0.5 text-xs" style={{ color: 'rgba(255,255,255,0.45)', whiteSpace: 'nowrap' }}>
              {week.dateRange}
            </div>
          </button>
        )
      })}
    </div>
  )
}
