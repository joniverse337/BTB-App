'use client'

import { useRef } from 'react'
import { Printer, X } from 'lucide-react'

// DIN A4 Abmessungen in mm
const A4 = {
  portrait:  { width: '210mm', height: '297mm' },
  landscape: { width: '297mm', height: '210mm' },
}

interface PaperEngineProps {
  orientation: 'portrait' | 'landscape'
  zoom?: number
  /** Wird aufgerufen wenn der Nutzer auf Drucken klickt — Standard: window.print() */
  onPrint?: () => void
  /** Wird aufgerufen wenn der Nutzer auf Löschen klickt — zeigt X-Button neben Druck-Button */
  onDelete?: () => void
  children: React.ReactNode
}

/**
 * PaperEngine — Layer 1 (Paper) + Layer 3 (Print)
 *
 * Rendert ein weißes DIN-A4-Blatt mit dem übergebenen Overlay als Inhalt.
 * Der Druck erfolgt über @media print in globals.css — kein window.open(),
 * kein separater HTML-String. Was du siehst = was du druckst.
 *
 * Verwendung:
 *   <PaperEngine orientation="landscape" zoom={zoom} onZoomChange={setZoom}>
 *     <MeinOverlay data={data} onChange={handleChange} />
 *   </PaperEngine>
 */
export function PaperEngine({
  orientation,
  zoom = 75,
  onPrint,
  onDelete,
  children,
}: PaperEngineProps) {
  const paperRef = useRef<HTMLDivElement>(null)
  const dims = A4[orientation]

  const handlePrint = () => {
    if (onPrint) {
      onPrint()
    } else {
      window.print()
    }
  }

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        width: '100%',
        paddingBottom: '40px',
      }}
    >
      {/* Äußerer Wrapper: zentriert das Blatt und skaliert via zoom.
          Klasse paper-engine-zoom-wrapper wird in @media print transform:none gesetzt,
          damit position:fixed auf dem Paper korrekt relativ zum Viewport funktioniert. */}
      <div
        className="paper-engine-zoom-wrapper"
        style={{
          transformOrigin: 'top center',
          transform: `scale(${zoom / 100})`,
          // Damit der Container bei kleinem Zoom nicht zu viel Platz einnimmt
          marginBottom: `calc((${zoom / 100} - 1) * ${dims.height})`,
        }}
      >
        {/* Das weiße DIN-A4-Blatt — Layer 1 */}
        <div
          ref={paperRef}
          className="paper-print-target"
          style={{
            width: dims.width,
            height: dims.height,
            background: '#fff',
            position: 'relative',
            boxShadow: '0 4px 24px rgba(0,0,0,0.45)',
            borderRadius: '4px',
            overflow: 'hidden',
            fontFamily: 'var(--font-ibm-plex-sans), sans-serif',
          }}
        >
          {/* Layer 2 — das Overlay (von außen übergeben) */}
          {children}

          {/* Schwebende Aktions-Buttons (Print + optional Delete) — verschwinden beim Drucken */}
          <div
            data-no-print="true"
            className="paper-engine-action-bar"
            style={{
              position: 'absolute',
              top: '8px',
              left: '50%',
              transform: 'translateX(-50%)',
              zIndex: 30,
              display: 'flex',
              gap: '6px',
              opacity: 0,
              transition: 'opacity 0.15s',
            }}
          >
            <button
              onClick={handlePrint}
              title="Drucken (Strg+P)"
              style={{
                background: 'rgba(23,28,40,0.92)',
                border: '1px solid rgba(255,255,255,0.12)',
                color: '#fff',
                borderRadius: '4px',
                width: '32px',
                height: '32px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Printer size={14} />
            </button>
            {onDelete && (
              <button
                onClick={onDelete}
                title="Löschen"
                style={{
                  background: 'rgba(23,28,40,0.92)',
                  border: '1px solid rgba(255,255,255,0.12)',
                  color: '#ff8080',
                  borderRadius: '4px',
                  width: '32px',
                  height: '32px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <X size={14} strokeWidth={2.5} />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Globaler Hover-Effekt: Print-Button erscheint wenn man über das Blatt fährt */}
      <style>{`
        @page { size: ${dims.width} ${dims.height}; margin: 0; }
        .paper-print-target:hover .paper-engine-action-bar {
          opacity: 1 !important;
        }
      `}</style>
    </div>
  )
}
