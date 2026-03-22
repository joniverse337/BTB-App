'use client'

import { useRef, useCallback } from 'react'

const VW = 90  // SVG viewBox width (coordinate space)
const VH = 18  // SVG viewBox height

interface TriangleZoomProps {
  zoom: number
  onZoomChange: (zoom: number) => void
}

export function TriangleZoomContainer({ zoom, onZoomChange }: TriangleZoomProps) {
  const containerRef = useRef<HTMLDivElement>(null)

  const ratio = (zoom - 40) / (100 - 40)

  const interact = useCallback((clientX: number, rect: DOMRect) => {
    const r = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width))
    onZoomChange(Math.round(40 + r * 60))
  }, [onZoomChange])

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault()
    const rect = containerRef.current!.getBoundingClientRect()
    interact(e.clientX, rect)
    const onMove = (ev: MouseEvent) => interact(ev.clientX, rect)
    const onUp = () => {
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
    }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
  }

  return (
    <div
      ref={containerRef}
      style={{ position: 'relative', width: '100%', height: `${VH + 8}px`, cursor: 'pointer' }}
      onMouseDown={handleMouseDown}
    >
      {/* Triangle SVG — scales to fill width, preserveAspectRatio none */}
      <svg
        viewBox={`0 0 ${VW} ${VH}`}
        width="100%"
        height={VH}
        style={{ display: 'block', position: 'absolute', top: 4, left: 0 }}
        preserveAspectRatio="none"
      >
        <defs>
          <clipPath id="zoom-fill-clip" clipPathUnits="userSpaceOnUse">
            <rect x="0" y="0" width={(ratio * VW) + 1} height={VH + 4} />
          </clipPath>
        </defs>
        {/* Background triangle */}
        <polygon points={`0,${VH} ${VW},${VH} ${VW},0`} fill="#3a4258" />
        {/* Gold filled portion */}
        <polygon
          points={`0,${VH} ${VW},${VH} ${VW},0`}
          fill="#e8c547"
          opacity={0.7}
          clipPath="url(#zoom-fill-clip)"
        />
      </svg>
    </div>
  )
}
