'use client'

import { useRef, useState, useCallback } from 'react'
import type { ProjectSettings } from '@/lib/validations/project-settings'

interface CompanyFallback {
  firma: string | null
  adr: string | null
  logoUrl: string | null
}

interface BtbPreviewCardProps {
  settings: ProjectSettings
  projectName: string
  projectNr: string | null
  projectAg: string | null
  onLogoPositionChange: (x: number, y: number) => void
  onLogoPositionSave?: () => void
  companyFallback?: CompanyFallback
  workerCategories?: string[]
  equipmentCategories?: string[]
}

export function BtbPreviewCard({
  settings,
  projectName,
  projectNr,
  projectAg,
  onLogoPositionChange,
  onLogoPositionSave,
  companyFallback,
  workerCategories,
  equipmentCategories,
}: BtbPreviewCardProps) {
  const cardRef = useRef<HTMLDivElement>(null)
  const [isDragging, setIsDragging] = useState(false)

  const effectiveLogoUrl = settings.logo_url || companyFallback?.logoUrl || null

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (!effectiveLogoUrl) return
    e.preventDefault()
    setIsDragging(true)
  }, [effectiveLogoUrl])

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isDragging || !cardRef.current) return
    const rect = cardRef.current.getBoundingClientRect()
    const x = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width))
    const y = Math.max(0, Math.min(1, (e.clientY - rect.top) / rect.height))
    onLogoPositionChange(x, y)
  }, [isDragging, onLogoPositionChange])

  const handleMouseUp = useCallback(() => {
    if (isDragging) {
      setIsDragging(false)
      onLogoPositionSave?.()
    }
  }, [isDragging, onLogoPositionSave])

  const firma = settings.firma || companyFallback?.firma || 'Firmenname'
  const adr = settings.adr || companyFallback?.adr || ''

  const today = new Date()
  const dateLabel = today.toLocaleDateString('de-DE', {
    weekday: 'short',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })

  return (
    <div className="space-y-2">
      <p className="text-xs font-medium text-muted-foreground">Live-Vorschau</p>
      <div
        ref={cardRef}
        className="relative aspect-[210/297] w-full overflow-hidden rounded-md border bg-white shadow-lg"
        style={{ cursor: isDragging ? 'grabbing' : 'default' }}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        {/* Logo watermark */}
        {effectiveLogoUrl && (
          <div
            className="absolute z-20"
            style={{
              left: `${settings.logo_x * 100}%`,
              top: `${settings.logo_y * 100}%`,
              width: `${settings.logo_size * 100}%`,
              transform: 'translate(-50%, -50%)',
              opacity: 0.3,
              cursor: isDragging ? 'grabbing' : 'grab',
            }}
            onMouseDown={handleMouseDown}
            role="img"
            aria-label="Logo-Wasserzeichen, zum Verschieben ziehen"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={effectiveLogoUrl}
              alt="Logo"
              className="pointer-events-none select-none"
              style={{ width: '100%' }}
              draggable={false}
            />
          </div>
        )}

        {/* Card content (scaled down) */}
        <div className="relative z-10 p-[3%]" style={{ fontFamily: "var(--font-ibm-plex-sans), sans-serif" }}>
          {/* Header */}
          <div className="flex items-start justify-between border-b-2 border-[#1a2040] pb-1.5">
            <div>
              <div
                className="text-[clamp(8px,1.8vw,15pt)] font-extrabold text-[#1a2040]"
                style={{ fontFamily: "var(--font-inter), sans-serif" }}
              >
                {firma}
              </div>
              {adr && (
                <div className="text-[clamp(5px,1vw,7pt)] text-[#666]">{adr}</div>
              )}
            </div>
            <div className="text-right">
              <div className="text-[clamp(6px,1.4vw,11pt)] font-bold uppercase tracking-wide text-[#1a2040]">
                Bautagesbericht &nbsp; {dateLabel}
              </div>
              <div className="text-[clamp(5px,1vw,7pt)] font-semibold text-[#e8a020]">
                Tagschicht
              </div>
            </div>
          </div>

          {/* 3-col preview */}
          <div className="mt-1.5 grid grid-cols-3 gap-1">
            {/* Projekt */}
            <div>
              <div className="mb-0.5 border-b border-[#ddd] text-[clamp(4px,0.8vw,6.5pt)] font-bold uppercase tracking-widest text-[#888]">
                Projekt
              </div>
              <div className="text-[clamp(4px,0.8vw,6.5pt)] text-[#666]">Name</div>
              <div className="text-[clamp(5px,1vw,8pt)] font-semibold text-[#222]">
                {projectName || '--'}
              </div>
              <div className="mt-0.5 text-[clamp(4px,0.8vw,6.5pt)] text-[#666]">Kostenstelle</div>
              <div className="text-[clamp(5px,0.9vw,7pt)] text-[#222]">{projectNr || '--'}</div>
              <div className="mt-0.5 text-[clamp(4px,0.8vw,6.5pt)] text-[#666]">Auftraggeber</div>
              <div className="text-[clamp(5px,0.9vw,7pt)] text-[#222]">{projectAg || '--'}</div>
            </div>

            {/* Wetter */}
            <div>
              <div className="mb-0.5 border-b border-[#ddd] text-[clamp(4px,0.8vw,6.5pt)] font-bold uppercase tracking-widest text-[#888]">
                Wetter
              </div>
              <div className="text-[clamp(4px,0.8vw,6.5pt)] text-[#666]">Temperatur</div>
              <div className="text-[clamp(5px,0.9vw,7pt)] text-[#222]">12 C</div>
              <div className="mt-0.5 text-[clamp(4px,0.8vw,6.5pt)] text-[#666]">Witterung</div>
              <div className="text-[clamp(5px,0.9vw,7pt)] text-[#222]">Sonnig</div>
            </div>

            {/* Arbeitszeit */}
            <div>
              <div className="mb-0.5 border-b border-[#ddd] text-[clamp(4px,0.8vw,6.5pt)] font-bold uppercase tracking-widest text-[#888]">
                Arbeitszeit
              </div>
              <div className="grid grid-cols-2 gap-0.5">
                <div>
                  <div className="text-[clamp(4px,0.8vw,6.5pt)] text-[#666]">Beginn</div>
                  <div className="text-[clamp(5px,0.9vw,7pt)] text-[#222]">07:00</div>
                </div>
                <div>
                  <div className="text-[clamp(4px,0.8vw,6.5pt)] text-[#666]">Ende</div>
                  <div className="text-[clamp(5px,0.9vw,7pt)] text-[#222]">18:00</div>
                </div>
              </div>
            </div>
          </div>

          {/* Örtlichkeit */}
          <div className="mt-1.5 flex items-baseline gap-1 border-b border-[#ddd] pb-0.5">
            <span className="shrink-0 text-[clamp(4px,0.8vw,6.5pt)] font-bold uppercase tracking-widest text-[#888]">Örtlichkeit:</span>
            <div className="flex-1 border-b-0 text-[clamp(4px,0.7vw,6pt)] text-[#ccc]">Strecke / Gleis…</div>
          </div>

          {/* Tables preview */}
          <div className="mt-1.5 grid grid-cols-2 gap-1">
            <div>
              <div className="rounded-sm bg-[#1a2040] px-1 py-0.5 text-[clamp(4px,0.7vw,6pt)] font-medium text-white">
                Personal
              </div>
              <div className="border-b border-[#eee] px-1 py-0.5 text-[clamp(4px,0.7vw,6pt)] text-[#999]">
                Beispieleinträge...
              </div>
              {workerCategories && workerCategories.length > 0 && (
                <div className="mt-0.5 flex flex-wrap gap-0.5">
                  {[...new Set(workerCategories)].map(cat => (
                    <span key={cat} className="rounded-full border border-[#ddd] bg-[#f0f0f0] px-1 py-px text-[clamp(3px,0.6vw,5pt)] text-[#555]">{cat}</span>
                  ))}
                </div>
              )}
            </div>
            <div>
              <div className="rounded-sm bg-[#1a2040] px-1 py-0.5 text-[clamp(4px,0.7vw,6pt)] font-medium text-white">
                Maschinen & Gerät
              </div>
              <div className="border-b border-[#eee] px-1 py-0.5 text-[clamp(4px,0.7vw,6pt)] text-[#999]">
                Beispieleinträge...
              </div>
              {equipmentCategories && equipmentCategories.length > 0 && (
                <div className="mt-0.5 flex flex-wrap gap-0.5">
                  {[...new Set(equipmentCategories)].map(cat => (
                    <span key={cat} className="rounded-full border border-[#ddd] bg-[#f0f0f0] px-1 py-px text-[clamp(3px,0.6vw,5pt)] text-[#555]">{cat}</span>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Sections preview */}
          <div className="mt-2">
            <div className="mb-0.5 border-b border-[#ddd] text-[clamp(4px,0.8vw,6.5pt)] font-bold uppercase tracking-widest text-[#888]">
              Ausgeführte Arbeiten
            </div>
            <div className="rounded border border-[#e8e8e8] bg-[#fafafa] p-1 text-[clamp(4px,0.7vw,6pt)] text-[#999]">
              Beschreibung...
            </div>
          </div>

          <div className="mt-1.5">
            <div className="mb-0.5 border-b border-[#ddd] text-[clamp(4px,0.8vw,6.5pt)] font-bold uppercase tracking-widest text-[#888]">
              Vorkommnisse / Behinderungen
            </div>
            <div className="rounded border border-[#e8e8e8] bg-[#fafafa] p-1 text-[clamp(4px,0.7vw,6pt)] text-[#999]">
              Behinderungen...
            </div>
          </div>
        </div>

        {/* Signature line */}
        <div className="absolute bottom-[3%] left-[4%] right-[4%] grid grid-cols-2 gap-4">
          <div>
            <div className="mb-0.5 border-t border-[#999]" />
            <div className="text-[clamp(4px,0.7vw,6pt)] text-[#666]">Auftragnehmer</div>
          </div>
          <div>
            <div className="mb-0.5 border-t border-[#999]" />
            <div className="text-[clamp(4px,0.7vw,6pt)] text-[#666]">Auftraggeber</div>
          </div>
        </div>
      </div>

      {effectiveLogoUrl && (
        <p className="text-xs text-muted-foreground">
          Logo auf der Vorschau ziehen, um die Position zu ändern.
        </p>
      )}
    </div>
  )
}
